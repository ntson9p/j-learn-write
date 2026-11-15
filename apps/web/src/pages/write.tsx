import { loadKana, loadKanjiList } from '@j-learn-write/course';
import { useAsync } from '../components/hooks';
import type { PageProps } from '../components/lazy';
import { CharacterWriter } from '../components/writer';
import { recordWriting, writingRecords } from '../lib/writing';
import { href } from '../router';
import { T } from '../strings';

interface CharGroup {
  title: string;
  chars: string[];
}

/** Characters with writing practice: single kana by script, then the kanji to learn by level. */
async function groups(): Promise<CharGroup[]> {
  const [kana, kanji] = await Promise.all([loadKana(), loadKanjiList()]);
  const single = (script: string) => kana.filter((k) => k.script === script && [...k.kana].length === 1).map((k) => k.kana);
  return [
    { title: T.writing.kanaGroup(T.kana.hiragana, single('hiragana').length), chars: single('hiragana') },
    { title: T.writing.kanaGroup(T.kana.katakana, single('katakana').length), chars: single('katakana') },
    ...(['n5', 'n4'] as const).map((level) => {
      const chars = kanji.filter((k) => k.level === level).map((k) => k.char);
      return { title: T.writing.kanjiGroup(T.levelName(level), chars.length), chars };
    }),
  ];
}

export default function WritePage({ params }: PageProps) {
  const lists = useAsync(groups, []);
  const records = useAsync(writingRecords, [params.char]);
  if (lists.loading || !lists.data) return <p class="loading">{T.loading}</p>;
  const all = lists.data.flatMap((l) => l.chars);
  const char = params.char;

  if (char) {
    const i = all.indexOf(char);
    const next = all[i + 1];
    return (
      <section class="page write-page">
        <p class="muted">
          <a href={href('/write')}>{T.writing.title}</a>
        </p>
        <h1 class="kana-big" lang="ja">
          {char}
        </h1>
        {i < 0 ? (
          <p class="card">{T.notFound}</p>
        ) : (
          <div class="card">
            <CharacterWriter key={char} char={char} onQuizDone={(m) => void recordWriting(char, m, new Date()).then(records.reload)} />
            {next && (
              <a class="button" href={href(`/write/${encodeURIComponent(next)}`)}>
                {T.writing.next}
              </a>
            )}
          </div>
        )}
        <p class="muted small">{T.writing.license}</p>
      </section>
    );
  }

  const done = records.data ?? {};
  return (
    <section class="page write-page">
      <h1>{T.writing.title}</h1>
      <p class="lead">{T.writing.intro}</p>
      <p class="muted">{T.writing.practiced(Object.keys(done).length)}</p>
      {lists.data.map((l) => (
        <div class="card" key={l.title}>
          <h2>{l.title}</h2>
          <ul class="char-grid">
            {l.chars.map((ch) => (
              <li key={ch}>
                <a class={`char-cell${done[ch] ? ' done' : ''}`} lang="ja" href={href(`/write/${encodeURIComponent(ch)}`)}>
                  {ch}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <p class="muted small">{T.writing.license}</p>
    </section>
  );
}
