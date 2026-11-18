/**
 * Downloads the source data and keeps the part the course uses in sources/.
 * Run: npm run sources:fetch -w @j-learn-write/course
 *
 * Pinned sources (git commit or release tag) give the same files every time.
 * The EDRDG files (KANJIDIC2, JMdict) have no versions: the latest file is
 * downloaded, its date and SHA-256 are recorded, and the script prints what
 * changed in the subset we keep. The EDRDG licence requires a regular update
 * procedure: run this script before every release (docs/plan.md, 3.8).
 *
 * Large downloads are cached in node_modules/.cache/j-learn-write-sources;
 * pass --refresh to download them again.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

const PKG = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCES = join(PKG, 'sources');
const CACHE = join(PKG, '..', '..', 'node_modules', '.cache', 'j-learn-write-sources');
const REFRESH = process.argv.includes('--refresh');

const OPENJLPT = { repo: 'evanclan/OpenJLPT', commit: '0d1d3410bec90bd4098a7c72de820543cb4f707c' };
const HANVIET = { repo: 'ph0ngp/hanviet-pinyin-wordlist', commit: 'b9923df92c8b55f013001390e37cddd35e986dc1' };
const OPENCC = { repo: 'BYVoid/OpenCC', commit: 'fae2a0a911c30764e669a7d8b0591cd8e852934a' };
const ANIMCJK = { repo: 'parsimonhi/animCJK', commit: 'c63765b150cbd567c71d05cf4a4f8d00b57045c9' };
const KANJIVG = { repo: 'KanjiVG/kanjivg', commit: '610091ce618cf757ed1357a8954cd65283e015d6' };
const FURIGANA = { repo: 'Doublevil/JmdictFurigana', tag: '2.3.1+2026-10-25' };
const KANJIDIC2_URL = 'https://www.edrdg.org/kanjidic/kanjidic2.xml.gz';
const JMDICT_URL = 'https://www.edrdg.org/pub/Nihongo/JMdict_e.gz';
const EDRDG_LICENCE_URL = 'https://www.edrdg.org/edrdg/licence.html';
/** Kanji added to the N5 kanji to learn (docs/plan.md, 3.2). */
const EXTRA_N5_KANJI = ['分'];

const sha256 = (data: Buffer | string) => createHash('sha256').update(data).digest('hex');

async function fetchBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Downloads once into the cache (unless --refresh). */
async function cached(name: string, url: string): Promise<Buffer> {
  const path = join(CACHE, name);
  if (!REFRESH && existsSync(path)) return readFileSync(path);
  const data = await fetchBuffer(url);
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(path, data);
  console.log('downloaded', url, `(${data.length} bytes)`);
  return data;
}

const raw = (repo: string, commit: string, file: string) => `https://raw.githubusercontent.com/${repo}/${commit}/${file}`;
const gitFile = async (repo: string, commit: string, file: string) =>
  cached(`${repo.replace('/', '__')}__${commit.slice(0, 7)}__${file.replace(/\//g, '__')}`, raw(repo, commit, file));

function write(path: string, text: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const before = existsSync(path) ? readFileSync(path, 'utf8') : null;
  writeFileSync(path, text, 'utf8');
  console.log(before === text ? 'unchanged' : 'wrote', path.slice(PKG.length + 1));
}

/** JSON with one array item per line: small diffs when a source changes. */
function jsonLines(items: readonly unknown[]): string {
  return `[\n${items.map((x) => JSON.stringify(x)).join(',\n')}\n]\n`;
}

/** Items of an existing subset file, keyed, to report what changed. */
function reportChanges<T>(path: string, items: readonly T[], key: (x: T) => string): void {
  if (!existsSync(path)) return;
  const before = new Map((JSON.parse(readFileSync(path, 'utf8')) as T[]).map((x) => [key(x), JSON.stringify(x)]));
  const after = new Map(items.map((x) => [key(x), JSON.stringify(x)]));
  const changed = [...after].filter(([k, v]) => before.has(k) && before.get(k) !== v).map(([k]) => k);
  const added = [...after.keys()].filter((k) => !before.has(k));
  const removed = [...before.keys()].filter((k) => !after.has(k));
  if (changed.length + added.length + removed.length === 0) return;
  console.log(`CHANGES in ${path.slice(PKG.length + 1)}: changed ${changed.join(' ') || '-'}; added ${added.join(' ') || '-'}; removed ${removed.join(' ') || '-'}`);
}

const today = new Date().toISOString().slice(0, 10);
const HAN = /\p{Script=Han}/u;
const kanjiOf = (text: string) => [...text].filter((c) => HAN.test(c));

// ---------------------------------------------------------------- OpenJLPT
interface OjWord {
  id: string;
  word: string;
  reading: string;
  meanings: string[];
  level: string;
  pos: string[];
  jmdict_id: number;
}
interface OjKanji {
  character: string;
  level: string;
  supplementary?: boolean;
}
interface OjGrammar {
  id: string;
  pattern: string;
  level: string;
  meaning: string;
}

const LEVELS = ['n5', 'n4'] as const;
const words: OjWord[] = [];
/** Words the course adds (data/vocabulary-extra.json): their JMdict entries, furigana and kanji are kept too. */
const extraWords = (JSON.parse(readFileSync(join(PKG, 'data', 'vocabulary-extra.json'), 'utf8')) as { words: { word: string; reading: string; jmdictId: number }[] }).words;
/** Corrections to OpenJLPT words (data/vocabulary-fixes.json): the corrected JMdict entries, furigana and kanji are kept too. */
const wordFixes = Object.values(
  (JSON.parse(readFileSync(join(PKG, 'data', 'vocabulary-fixes.json'), 'utf8')) as { fixes: Record<string, { word?: string; jmdictId?: number }> }).fixes,
);
const kanjiList: { char: string; level: string; supplementary: boolean }[] = [];
const grammar: { id: string; level: string; pattern: string; meaning: string }[] = [];
const ojHashes: string[] = [];
for (const level of LEVELS) {
  for (const kind of ['vocab', 'kanji', 'grammar'] as const) {
    const file = `data/json/${kind}/${level}.json`;
    const buf = await gitFile(OPENJLPT.repo, OPENJLPT.commit, file);
    ojHashes.push(`| \`${file}\` | \`${sha256(buf)}\` |`);
    const data = JSON.parse(buf.toString('utf8')) as unknown[];
    if (kind === 'vocab') {
      for (const w of data as OjWord[]) {
        words.push({ id: w.id, word: w.word, reading: w.reading, meanings: w.meanings, level, pos: w.pos, jmdict_id: w.jmdict_id });
      }
    } else if (kind === 'kanji') {
      for (const k of data as OjKanji[]) kanjiList.push({ char: k.character, level, supplementary: k.supplementary === true });
    } else {
      for (const g of data as OjGrammar[]) grammar.push({ id: g.id, level, pattern: g.pattern, meaning: g.meaning });
    }
  }
}
const ojDir = join(SOURCES, 'openjlpt');
const ojVocabRows = words.map((w) => ({ id: w.id, level: w.level, word: w.word, reading: w.reading, pos: w.pos, jmdictId: w.jmdict_id, meaningsEn: w.meanings }));
reportChanges(join(ojDir, 'vocabulary.json'), ojVocabRows, (x) => x.id);
write(join(ojDir, 'vocabulary.json'), jsonLines(ojVocabRows));
write(join(ojDir, 'kanji.json'), jsonLines(kanjiList));
write(join(ojDir, 'grammar.json'), jsonLines(grammar));
write(join(ojDir, 'LICENSE'), (await gitFile(OPENJLPT.repo, OPENJLPT.commit, 'LICENSE')).toString('utf8'));
write(join(ojDir, 'NOTICE.md'), (await gitFile(OPENJLPT.repo, OPENJLPT.commit, 'NOTICE.md')).toString('utf8'));
write(
  join(ojDir, 'SOURCE.md'),
  `# Nguồn: OpenJLPT (danh sách N5–N4)

- <https://github.com/${OPENJLPT.repo}> tại commit \`${OPENJLPT.commit}\`, giấy phép **CC BY-SA 4.0** (file \`LICENSE\`), ghi công theo \`NOTICE.md\` (bên cạnh).
- OpenJLPT lấy cấp N5–N1 của từ và kanji từ danh sách JLPT của Jonathan Waller (tanos.co.uk, "Creative Commons BY"); cách đọc, từ loại và id được nối với JMdict (EDRDG). Danh sách ngữ pháp do OpenJLPT tự lập theo các sách luyện thi.
- JLPT **không** công bố danh sách chính thức (FAQ của jlpt.jp): các cấp này chỉ là ước lượng.
- Ở đây chỉ giữ cấp N5 và N4. Từ: id, cấp, từ, cách đọc, từ loại, id JMdict, nghĩa tiếng Anh (chỉ để tham khảo khi soạn, không hiện trong app). Kanji: chữ, cấp, cờ "bổ sung". Ngữ pháp: id, cấp, mẫu, nghĩa tiếng Anh. **Không** giữ câu ví dụ (lấy từ Tatoeba) và phần giải thích ngữ pháp.
- Tạo lại bằng \`npm run sources:fetch -w @j-learn-write/course\`.

SHA-256 của các file gốc:

| File | SHA-256 |
|---|---|
${ojHashes.join('\n')}
`,
);

// ---------------------------------------------------------------- JMdict
interface JmEntry {
  seq: number;
  kanji: { text: string; pri: string[]; inf: string[] }[];
  readings: { text: string; pri: string[]; restr: string[]; inf: string[]; nokanji: boolean }[];
  senses: { pos: string[]; misc: string[]; gloss: string[]; stagk: string[]; stagr: string[] }[];
}
const all = (block: string, tag: string) => [...block.matchAll(new RegExp(`<${tag}>([^<]*)</${tag}>`, 'g'))].map((m) => m[1]!);
const entity = (s: string) => s.replace(/^&(.*);$/, '$1');
const jmGz = await cached('JMdict_e.gz', JMDICT_URL);
const jmText = gunzipSync(jmGz).toString('utf8');
const jmCreated = /<!-- JMdict created: (\d{4}-\d{2}-\d{2}) -->/.exec(jmText)?.[1] ?? '?';
const wantedSeq = new Set([...words.map((w) => w.jmdict_id), ...extraWords.map((w) => w.jmdictId), ...wordFixes.flatMap((w) => (w.jmdictId ? [w.jmdictId] : []))]);
const jmEntries: JmEntry[] = [];
for (const m of jmText.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
  const block = m[1]!;
  const seq = Number(/<ent_seq>(\d+)<\/ent_seq>/.exec(block)?.[1]);
  if (!wantedSeq.has(seq)) continue;
  jmEntries.push({
    seq,
    kanji: [...block.matchAll(/<k_ele>([\s\S]*?)<\/k_ele>/g)].map((k) => ({
      text: all(k[1]!, 'keb')[0]!,
      pri: all(k[1]!, 'ke_pri'),
      inf: all(k[1]!, 'ke_inf').map(entity),
    })),
    readings: [...block.matchAll(/<r_ele>([\s\S]*?)<\/r_ele>/g)].map((r) => ({
      text: all(r[1]!, 'reb')[0]!,
      pri: all(r[1]!, 're_pri'),
      restr: all(r[1]!, 're_restr'),
      inf: all(r[1]!, 're_inf').map(entity),
      nokanji: r[1]!.includes('<re_nokanji'),
    })),
    senses: [...block.matchAll(/<sense>([\s\S]*?)<\/sense>/g)].map((s) => ({
      pos: all(s[1]!, 'pos').map(entity),
      misc: all(s[1]!, 'misc').map(entity),
      gloss: all(s[1]!, 'gloss').slice(0, 4),
      stagk: all(s[1]!, 'stagk'),
      stagr: all(s[1]!, 'stagr'),
    })),
  });
}
const missingSeq = [...wantedSeq].filter((s) => !jmEntries.some((e) => e.seq === s));
if (missingSeq.length > 0) throw new Error(`JMdict entries not found: ${missingSeq.join(', ')}`);
jmEntries.sort((a, b) => a.seq - b.seq);
const jmDir = join(SOURCES, 'jmdict');
reportChanges(join(jmDir, 'entries.json'), jmEntries, (x) => String(x.seq));
write(join(jmDir, 'entries.json'), jsonLines(jmEntries));

// ---------------------------------------------------------------- characters needed
const wordKanji = new Set<string>();
for (const e of jmEntries) for (const k of e.kanji) for (const c of kanjiOf(k.text)) wordKanji.add(c);
for (const w of [...words, ...extraWords, ...wordFixes]) for (const c of kanjiOf(w.word ?? '')) wordKanji.add(c);
const learnKanji = kanjiList.filter((k) => !k.supplementary || (k.level === 'n5' && EXTRA_N5_KANJI.includes(k.char))).map((k) => k.char);
for (const c of EXTRA_N5_KANJI) if (!learnKanji.includes(c)) learnKanji.push(c);
for (const c of learnKanji) wordKanji.add(c);

// ---------------------------------------------------------------- KANJIDIC2
interface KdChar {
  char: string;
  grade: number | null;
  jlptOld: number | null;
  strokes: number;
  on: string[];
  kun: string[];
  vi: string[];
  meaningsEn: string[];
}
const kdGz = await cached('kanjidic2.xml.gz', KANJIDIC2_URL);
const kdText = gunzipSync(kdGz).toString('utf8');
const kdVersion = /<database_version>([^<]*)<\/database_version>/.exec(kdText)?.[1] ?? '?';
const kdCreated = /<date_of_creation>([^<]*)<\/date_of_creation>/.exec(kdText)?.[1] ?? '?';
const kdChars: KdChar[] = [];
for (const m of kdText.matchAll(/<character>([\s\S]*?)<\/character>/g)) {
  const block = m[1]!;
  const char = all(block, 'literal')[0]!;
  if (!wordKanji.has(char)) continue;
  const reading = (type: string) => [...block.matchAll(new RegExp(`<reading r_type="${type}">([^<]*)</reading>`, 'g'))].map((r) => r[1]!);
  kdChars.push({
    char,
    grade: Number(all(block, 'grade')[0]) || null,
    jlptOld: Number(all(block, 'jlpt')[0]) || null,
    strokes: Number(all(block, 'stroke_count')[0]),
    on: reading('ja_on'),
    kun: reading('ja_kun'),
    vi: reading('vietnam'),
    meaningsEn: [...block.matchAll(/<meaning>([^<]*)<\/meaning>/g)].map((r) => r[1]!).slice(0, 5),
  });
}
const kdMissing = [...wordKanji].filter((c) => !kdChars.some((k) => k.char === c));
kdChars.sort((a, b) => (a.char < b.char ? -1 : 1));
const kdDir = join(SOURCES, 'kanjidic2');
reportChanges(join(kdDir, 'kanji.json'), kdChars, (x) => x.char);
write(join(kdDir, 'kanji.json'), jsonLines(kdChars));

// EDRDG licence statement (the licence asks to ship or link the documentation and licence files).
const licenceHtml = (await fetchBuffer(EDRDG_LICENCE_URL)).toString('utf8');
const licenceText = licenceHtml
  .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '')
  .replace(/<(br|p|li|h\d)[^>]*>/gi, '\n')
  .replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/[ \t]+/g, ' ')
  .replace(/\n\s*\n\s*/g, '\n\n')
  .trim();
for (const dir of [jmDir, kdDir]) write(join(dir, 'EDRDG-LICENCE.txt'), `Source: ${EDRDG_LICENCE_URL}\n\n${licenceText}\n`);
const edrdgNote = `- Giấy phép: **CC BY-SA 4.0** kèm điều kiện của EDRDG (bản chép \`EDRDG-LICENCE.txt\` bên cạnh, nguồn <${EDRDG_LICENCE_URL}>). App ghi công trên trang "Giới thiệu và giấy phép". Mục 4 của giấy phép: phải có quy trình cập nhật dữ liệu định kỳ, nên chạy lại script này trước mỗi lần phát hành.`;
write(
  join(kdDir, 'SOURCE.md'),
  `# Nguồn: KANJIDIC2 (EDRDG)

- <${KANJIDIC2_URL}>, database_version \`${kdVersion}\`, date_of_creation \`${kdCreated}\`, tải ngày ${today}. SHA-256 của file gz: \`${sha256(kdGz)}\`.
${edrdgNote}
- Ở đây chỉ giữ ${kdChars.length} chữ: các kanji xuất hiện trong mọi dạng viết (JMdict) của từ N5–N4 và các kanji cần học. Trường: cấp Jōyō (grade), cấp JLPT cũ (trước 2010), số nét, âm on, âm kun, âm tiếng Việt (\`vietnam\`), nghĩa tiếng Anh (chỉ để tham khảo khi soạn).
- Âm tiếng Việt của KANJIDIC2 có chỗ nghi sai ở chữ dạng Nhật (着, 桜, 晩, 仮, 択, 県…): chỉ dùng để đối chiếu, xem docs/plan.md mục 3.3.
${kdMissing.length > 0 ? `- Không có trong KANJIDIC2: ${kdMissing.join(' ')}\n` : ''}- Tạo lại bằng \`npm run sources:fetch -w @j-learn-write/course -- --refresh\`.
`,
);
write(
  join(jmDir, 'SOURCE.md'),
  `# Nguồn: JMdict (EDRDG)

- <${JMDICT_URL}> (bản chỉ có nghĩa tiếng Anh), "JMdict created: ${jmCreated}", tải ngày ${today}. SHA-256 của file gz: \`${sha256(jmGz)}\`.
${edrdgNote}
- Ở đây chỉ giữ ${jmEntries.length} mục của các từ N5–N4 (theo id JMdict của OpenJLPT): dạng kanji (kèm độ phổ biến, ghi chú), cách đọc (kèm giới hạn theo dạng kanji), nghĩa (từ loại, ghi chú như \`uk\` = thường viết bằng kana, tối đa 4 nghĩa tiếng Anh để tham khảo khi soạn).
- JMdict **không có** nghĩa tiếng Việt: nghĩa tiếng Việt của khóa học do dự án tự soạn.
- Tạo lại bằng \`npm run sources:fetch -w @j-learn-write/course -- --refresh\`.
`,
);

// ---------------------------------------------------------------- JmdictFurigana
interface FuriEntry {
  text: string;
  reading: string;
  furigana: { ruby: string; rt?: string }[];
}
const furiBuf = await cached(`JmdictFurigana-${FURIGANA.tag}.json`, `https://github.com/${FURIGANA.repo}/releases/download/${encodeURIComponent(FURIGANA.tag)}/JmdictFurigana.json`);
const BOM = String.fromCharCode(0xfeff);
const furiText = furiBuf.toString('utf8');
const furiAll = JSON.parse(furiText.startsWith(BOM) ? furiText.slice(1) : furiText) as FuriEntry[];
const wantedPairs = new Set<string>();
for (const e of jmEntries) {
  for (const k of e.kanji) {
    for (const r of e.readings) if (!r.nokanji && (r.restr.length === 0 || r.restr.includes(k.text))) wantedPairs.add(`${k.text}|${r.text}`);
  }
}
for (const w of [...words, ...extraWords]) wantedPairs.add(`${w.word}|${w.reading}`);
const furi = furiAll.filter((f) => wantedPairs.has(`${f.text}|${f.reading}`)).sort((a, b) => (a.text + a.reading < b.text + b.reading ? -1 : 1));
const furiDir = join(SOURCES, 'jmdict-furigana');
reportChanges(join(furiDir, 'furigana.json'), furi, (x) => `${x.text}|${x.reading}`);
write(join(furiDir, 'furigana.json'), jsonLines(furi));
write(
  join(furiDir, 'SOURCE.md'),
  `# Nguồn: JmdictFurigana

- <https://github.com/${FURIGANA.repo}>, bản phát hành \`${FURIGANA.tag}\` (file \`JmdictFurigana.json\`, SHA-256 \`${sha256(furiBuf)}\`). Giấy phép: như JMdict (CC BY-SA, theo README của dự án).
- Ở đây chỉ giữ ${furi.length} mục: các cặp (dạng kanji, cách đọc) của từ N5–N4. Mỗi mục chia cách đọc theo từng kanji (ví dụ 大人 = おとな cho cả cụm).
- Tạo lại bằng \`npm run sources:fetch -w @j-learn-write/course\`.
`,
);

// ---------------------------------------------------------------- OpenCC (shinjitai -> traditional)
const shinjitaiText = (await gitFile(OPENCC.repo, OPENCC.commit, 'data/dictionary/JPShinjitaiCharacters.txt')).toString('utf8');
const occDir = join(SOURCES, 'opencc-jp');
write(join(occDir, 'JPShinjitaiCharacters.txt'), shinjitaiText);
write(join(occDir, 'LICENSE'), (await gitFile(OPENCC.repo, OPENCC.commit, 'LICENSE')).toString('utf8'));
write(
  join(occDir, 'SOURCE.md'),
  `# Nguồn: OpenCC, bảng chữ Nhật dạng mới → dạng cũ

- \`data/dictionary/JPShinjitaiCharacters.txt\` của <https://github.com/${OPENCC.repo}> tại commit \`${OPENCC.commit}\`, giấy phép Apache-2.0 (file \`LICENSE\`). SHA-256: \`${sha256(shinjitaiText)}\`.
- Chỉ dùng lúc soạn: quy đổi kanji dạng Nhật (図, 駅, 売…) sang dạng phồn thể (圖, 驛, 賣…) để tra âm Hán Việt trong danh sách xếp theo chữ phồn thể. Không đóng gói vào app.
`,
);
const shinjitai = new Map<string, string[]>();
for (const line of shinjitaiText.split('\n')) {
  if (line.startsWith('#') || !line.includes('\t')) continue;
  const [from, to] = line.split('\t');
  shinjitai.set(from!, to!.split(' ').filter(Boolean));
}

// ---------------------------------------------------------------- Hán Việt (ph0ngp)
const hvText = (await gitFile(HANVIET.repo, HANVIET.commit, 'hanviet.csv')).toString('utf8');
const hvWanted = new Set<string>();
for (const c of wordKanji) {
  hvWanted.add(c);
  for (const t of shinjitai.get(c) ?? []) hvWanted.add(t);
}
const hvLines = hvText.split('\n');
const hvKept = [hvLines[0]!, ...hvLines.slice(1).filter((l) => hvWanted.has(l.split(',')[0] ?? ''))];
const hvDir = join(SOURCES, 'hanviet');
write(join(hvDir, 'hanviet.csv'), `${hvKept.join('\n')}\n`);
write(join(hvDir, 'LICENSE'), (await gitFile(HANVIET.repo, HANVIET.commit, 'LICENSE')).toString('utf8'));
write(
  join(hvDir, 'SOURCE.md'),
  `# Nguồn: âm Hán Việt

- <https://github.com/${HANVIET.repo}> tại commit \`${HANVIET.commit}\`, giấy phép MIT (file \`LICENSE\` bên cạnh), tác giả Phong Phan.
- Mỗi dòng: chữ phồn thể, các âm Hán Việt, pinyin có số thanh. Ở đây chỉ giữ ${hvKept.length - 1} dòng của các kanji trong từ N5–N4 và dạng phồn thể của chúng (quy đổi bằng OpenCC, xem \`../opencc-jp\`).
- SHA-256 của \`hanviet.csv\` gốc: \`${sha256(hvText)}\`.
`,
);

// ---------------------------------------------------------------- AnimCJK (stroke data)
const acjkDir = join(SOURCES, 'animcjk');
const kanaText = (await gitFile(ANIMCJK.repo, ANIMCJK.commit, 'graphicsJaKana.txt')).toString('utf8');
const jaText = (await gitFile(ANIMCJK.repo, ANIMCJK.commit, 'graphicsJa.txt')).toString('utf8');
const learnSet = new Set(learnKanji);
const jaKept = jaText.split('\n').filter((l) => l && learnSet.has((JSON.parse(l) as { character: string }).character));
const acjkMissing = learnKanji.filter((c) => !jaKept.some((l) => l.includes(`"character":"${c}"`)));
if (acjkMissing.length > 0) throw new Error(`AnimCJK has no stroke data for ${acjkMissing.join(' ')}`);
write(join(acjkDir, 'graphicsJaKana.txt'), kanaText.endsWith('\n') ? kanaText : `${kanaText}\n`);
write(join(acjkDir, 'graphicsJa.txt'), `${jaKept.join('\n')}\n`);
write(join(acjkDir, 'ARPHICPL.TXT'), (await gitFile(ANIMCJK.repo, ANIMCJK.commit, 'licenses/APL/english/ARPHICPL.TXT')).toString('utf8'));
write(join(acjkDir, 'COPYING.txt'), (await gitFile(ANIMCJK.repo, ANIMCJK.commit, 'licenses/COPYING.txt')).toString('utf8'));
write(
  join(acjkDir, 'SOURCE.md'),
  `# Nguồn: AnimCJK (dữ liệu nét chữ)

- <https://github.com/${ANIMCJK.repo}> tại commit \`${ANIMCJK.commit}\`. Các file \`graphics*\` theo **Arphic Public License** (\`ARPHICPL.TXT\`), xem \`COPYING.txt\`.
- \`graphicsJaKana.txt\`: nguyên vẹn (177 kana; SHA-256 \`${sha256(kanaText)}\`).
- \`graphicsJa.txt\`: chỉ giữ ${jaKept.length} dòng của các kanji cần học, dòng giữ nguyên (SHA-256 file gốc \`${sha256(jaText)}\`).
- Định dạng giống \`graphics.txt\` của Make Me a Hanzi (strokes + medians), dùng được với hanzi-writer.
- Khi build app, các đoạn nét kana bị tách (nét tự cắt) được ghép lại; file trong app ghi rõ đã sửa (yêu cầu của Arphic Public License).
`,
);

// ---------------------------------------------------------------- KanjiVG (stroke counts, for checks)
const kvgDir = join(SOURCES, 'kanjivg');
const kanaChars = kanaText
  .split('\n')
  .filter(Boolean)
  .map((l) => (JSON.parse(l) as { character: string }).character);
const counts: Record<string, number> = {};
const kanaPaths: Record<string, string[]> = {};
for (const ch of [...kanaChars, ...learnKanji]) {
  const file = `kanji/${ch.codePointAt(0)!.toString(16).padStart(5, '0')}.svg`;
  const svg = (await gitFile(KANJIVG.repo, KANJIVG.commit, file)).toString('utf8');
  const paths = [...svg.matchAll(/<path [^>]*\bd="([^"]+)"/g)].map((m) => m[1]!);
  counts[ch] = paths.length;
  if (kanaChars.includes(ch)) kanaPaths[ch] = paths;
}
write(join(kvgDir, 'stroke-counts.json'), `${JSON.stringify(counts, null, 0).replace(/,/g, ',\n')}\n`);
write(join(kvgDir, 'kana-paths.json'), `{\n${Object.entries(kanaPaths).map(([k, v]) => `${JSON.stringify(k)}:${JSON.stringify(v)}`).join(',\n')}\n}\n`);
write(join(kvgDir, 'COPYING'), (await gitFile(KANJIVG.repo, KANJIVG.commit, 'COPYING')).toString('utf8'));
write(
  join(kvgDir, 'SOURCE.md'),
  `# Nguồn: KanjiVG (số nét)

- <https://github.com/${KANJIVG.repo}> tại commit \`${KANJIVG.commit}\`, giấy phép CC BY-SA 3.0, tác giả Ulrich Apel (file \`COPYING\`).
- \`stroke-counts.json\`: **số nét** (số thẻ \`<path>\` trong file SVG) của 177 kana và các kanji cần học, để kiểm tra dữ liệu nét của AnimCJK.
- \`kana-paths.json\`: **đường trục từng nét** (thuộc tính \`d\` của các \`<path>\`) của 177 kana. App dùng chúng (đổi sang hệ tọa độ của hanzi-writer) làm đường trục để chấm nét khi luyện viết kana, vì đường trục của các đoạn tách trong AnimCJK chỉ dành cho hoạt hình. Đây là dữ liệu phái sinh của KanjiVG: ghi công và theo giấy phép CC BY-SA 3.0.
`,
);

console.log(`words ${words.length}, kanji to learn ${learnKanji.length}, grammar ${grammar.length}, KANJIDIC2 chars ${kdChars.length}, JMdict entries ${jmEntries.length}, furigana ${furi.length}`);
