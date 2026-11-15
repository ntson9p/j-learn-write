/**
 * Teacher review through a spreadsheet: lesson content is exported as CSV
 * rows (one per word, grammar point and exercise); the teacher fills the
 * "Kết quả duyệt" (đạt / cần sửa), "Người duyệt" and "Góp ý" columns; the
 * import writes the review records back into the lesson files.
 *
 * The export stores each item's content hash: a row whose item changed
 * after the export is refused, because the teacher reviewed older content.
 */
import { rubyReading } from './furigana.ts';
import { contentHash } from './hash.ts';
import type { CurriculumLesson, Exercise, GrammarContent, KanjiContent, LessonContent, ListGrammar, ListKanji, ListWord, Review, Sentence, WordContent } from './types.ts';

export const REVIEW_HEADER = [
  'Mã',
  'Bài',
  'Loại',
  'Tiếng Nhật',
  'Cách đọc',
  'Âm Hán Việt',
  'Nội dung',
  'Ví dụ',
  'Trạng thái hiện tại',
  'Kết quả duyệt',
  'Người duyệt',
  'Góp ý',
  'Mã nội dung',
] as const;

const STATUS_VI: Record<Review['status'], string> = {
  draft: 'chưa duyệt',
  approved: 'đã duyệt',
  changes_requested: 'cần sửa',
};

type Item =
  | { kind: 'word'; item: WordContent }
  | { kind: 'kanji'; item: KanjiContent }
  | { kind: 'grammar'; item: GrammarContent }
  | { kind: 'exercise'; item: Exercise };

function itemsOf(content: LessonContent): Item[] {
  return [
    ...(content.words ?? []).map((item) => ({ kind: 'word' as const, item })),
    ...(content.kanji ?? []).map((item) => ({ kind: 'kanji' as const, item })),
    ...(content.grammar ?? []).map((item) => ({ kind: 'grammar' as const, item })),
    ...content.exercises.map((item) => ({ kind: 'exercise' as const, item })),
  ];
}

function keyOf(lessonId: string, it: Item): string {
  if (it.kind === 'word') return `${lessonId}/tu/${it.item.no}`;
  if (it.kind === 'kanji') return `${lessonId}/kanji/${it.item.char}`;
  if (it.kind === 'grammar') return `${lessonId}/ngu-phap/${it.item.id}`;
  return `${lessonId}/bai-tap/${it.item.id}`;
}

/** "Japanese — reading — Vietnamese", one sentence per line; the reading comes from the lesson's furigana. */
function sentences(list: readonly Sentence[], ruby: Readonly<Record<string, string>>): string {
  return list.map((s) => `${s.ja} — ${ruby[s.ja] ? rubyReading(ruby[s.ja]!) : ''} — ${s.vi}`).join('\n');
}

function describeExercise(ex: Exercise): { ja: string; text: string } {
  switch (ex.type) {
    case 'choice':
      return { ja: ex.ja ?? '', text: `${ex.promptVi}\nLựa chọn: ${ex.options.map((o, i) => (i === ex.answer ? `[${o}]` : o)).join(' / ')}${ex.explainVi ? `\nGiải thích: ${ex.explainVi}` : ''}` };
    case 'fill':
      return { ja: `${ex.before}＿${ex.after}`, text: `${ex.promptVi ?? 'Điền vào chỗ trống'}${ex.vi ? ` (${ex.vi})` : ''}\nĐáp án: ${ex.answers.join(' / ')}${ex.options ? `\nLựa chọn: ${ex.options.join(' / ')}` : ''}` };
    case 'order':
      return { ja: ex.tiles.join(' · '), text: `Sắp xếp: ${ex.vi}\nĐáp án: ${ex.answers.join(' / ')}` };
    case 'translate':
      return { ja: '', text: `Dịch: ${ex.vi}\nĐáp án: ${ex.answers.map((a) => (typeof a === 'string' ? a : `${a.text} (${a.score ?? 100})`)).join(' / ')}` };
    case 'question':
      return { ja: ex.question.prompt, text: `${ex.question.promptVi ?? ''}\nLoại: ${ex.question.type}` };
    case 'match':
      return { ja: '', text: `${ex.promptVi}\n${ex.pairs.map((p) => `${p[0]} = ${p[1]}`).join('\n')}` };
  }
}

export interface ReviewSources {
  curriculum: readonly CurriculumLesson[];
  vocabulary: readonly ListWord[];
  kanji: readonly ListKanji[];
  grammar: readonly ListGrammar[];
}

/** One CSV row per item of the given lessons (header first). */
export function buildReviewRows(contents: readonly LessonContent[], src: ReviewSources): string[][] {
  const lessonById = new Map(src.curriculum.map((l) => [l.id, l]));
  const wordByNo = new Map(src.vocabulary.map((w) => [w.no, w]));
  const kanjiByChar = new Map(src.kanji.map((k) => [k.char, k]));
  const grammarById = new Map(src.grammar.map((g) => [g.id, g]));
  const rows: string[][] = [[...REVIEW_HEADER]];
  for (const content of contents) {
    const lesson = lessonById.get(content.id);
    const lessonName = lesson ? `${content.id} ${lesson.titleVi}` : content.id;
    const ruby = content.ruby ?? {};
    for (const it of itemsOf(content)) {
      const status = STATUS_VI[it.item.review?.status ?? 'draft'];
      const hash = contentHash(it.item);
      if (it.kind === 'word') {
        const w = it.item;
        const listed = wordByNo.get(w.no);
        rows.push([
          keyOf(content.id, it), lessonName, 'Từ', w.word, listed?.reading ?? '',
          listed?.hanViet ? `${listed.hanViet}${listed.hanVietAmbiguous ? ' (*)' : ''}` : '',
          `${w.meaningsVi.join('; ')}${w.noteVi ? `\nGhi chú: ${w.noteVi}` : ''}`,
          sentences(w.examples, ruby), status, '', '', '', hash,
        ]);
      } else if (it.kind === 'kanji') {
        const k = it.item;
        const listed = kanjiByChar.get(k.char);
        rows.push([
          keyOf(content.id, it), lessonName, 'Kanji', k.char,
          listed ? `on: ${listed.on.join('、')} · kun: ${listed.kun.join('、')}` : '',
          listed ? `${listed.hanViet}${listed.hanVietAmbiguous ? ' (*)' : ''}${listed.hanVietOthers.length ? ` (khác: ${listed.hanVietOthers.join(', ')})` : ''}` : '',
          `${k.meaningVi}${k.noteVi ? `\nGhi chú: ${k.noteVi}` : ''}`, '', status, '', '', '', hash,
        ]);
      } else if (it.kind === 'grammar') {
        const g = it.item;
        const listed = grammarById.get(g.id);
        const mistakes = (g.mistakes ?? []).map((m) => `Sai: ${m.wrong} → Đúng: ${m.right} (${m.noteVi})`).join('\n');
        rows.push([
          keyOf(content.id, it), lessonName, 'Ngữ pháp', listed?.pattern ?? g.id, '', '',
          `${g.titleVi}\n${g.summaryVi}\n\n${g.explanationVi.join('\n')}${g.patterns ? `\nMẫu câu: ${g.patterns.join(' | ')}` : ''}${mistakes ? `\n\n${mistakes}` : ''}`,
          sentences(g.examples, ruby), status, '', '', '', hash,
        ]);
      } else {
        const d = describeExercise(it.item);
        rows.push([keyOf(content.id, it), lessonName, `Bài tập (${it.item.type})`, d.ja, d.ja && ruby[d.ja] ? rubyReading(ruby[d.ja]!) : '', '', d.text, '', status, '', '', '', hash]);
      }
    }
  }
  return rows;
}

export interface ApplyResult {
  /** Items whose review changed. */
  updated: number;
  /** Problems; when not empty, nothing should be written. */
  errors: string[];
}

const norm = (s: string) => s.trim().toLowerCase().normalize('NFC');
const APPROVED = new Set(['đạt', 'dat', 'ok', 'approved', 'đã duyệt']);
const CHANGES = new Set(['cần sửa', 'can sua', 'sửa', 'sua', 'changes_requested']);

/**
 * Applies review rows (as parsed objects keyed by REVIEW_HEADER) to the
 * lesson contents, in place. `date` is the review date (YYYY-MM-DD).
 */
export function applyReviewRows(contents: LessonContent[], rows: readonly Record<string, string>[], date: string): ApplyResult {
  const index = new Map<string, Item>();
  for (const content of contents) for (const it of itemsOf(content)) index.set(keyOf(content.id, it), it);
  const errors: string[] = [];
  const changes: [Item, Review][] = [];
  rows.forEach((row, i) => {
    const line = i + 2; // header is line 1
    const verdict = norm(row['Kết quả duyệt'] ?? '');
    if (!verdict) return;
    const key = row['Mã'] ?? '';
    const it = index.get(key);
    if (!it) {
      errors.push(`dòng ${line}: không tìm thấy mục "${key}"`);
      return;
    }
    if ((row['Mã nội dung'] ?? '') !== contentHash(it.item)) {
      errors.push(`dòng ${line}: nội dung của "${key}" đã thay đổi sau khi xuất bảng tính; hãy xuất lại và duyệt lại mục này`);
      return;
    }
    const by = (row['Người duyệt'] ?? '').trim();
    const note = (row['Góp ý'] ?? '').trim();
    let review: Review;
    if (APPROVED.has(verdict)) review = { status: 'approved', date, hash: contentHash(it.item) };
    else if (CHANGES.has(verdict)) review = { status: 'changes_requested', date };
    else {
      errors.push(`dòng ${line}: "Kết quả duyệt" phải là "đạt" hoặc "cần sửa", không phải "${row['Kết quả duyệt']}"`);
      return;
    }
    if (by) review.by = by;
    if (note) review.note = note;
    if (review.status === 'changes_requested' && !note) errors.push(`dòng ${line}: "cần sửa" cần có góp ý`);
    changes.push([it, review]);
  });
  if (errors.length > 0) return { updated: 0, errors };
  for (const [it, review] of changes) (it.item as { review?: Review }).review = review;
  return { updated: changes.length, errors };
}
