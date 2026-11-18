import { loadKana, type KanaEntry, type KanaScript } from '@j-learn-write/course';
import { useState } from 'preact/hooks';
import { useAsync } from '../components/hooks';
import type { PageProps } from '../components/lazy';
import { SpeakButton } from '../components/speak';
import { MixedText } from '../components/text';
import { CharacterWriter } from '../components/writer';
import { recordWriting } from '../lib/writing';
import { href } from '../router';
import { T } from '../strings';

/** Columns used by the rows of the basic table: や and わ rows have gaps. */
const BASIC_ROWS: number[][] = [
  [0, 1, 2, 3, 4], // a
  [0, 1, 2, 3, 4], // ka
  [0, 1, 2, 3, 4], // sa
  [0, 1, 2, 3, 4], // ta
  [0, 1, 2, 3, 4], // na
  [0, 1, 2, 3, 4], // ha
  [0, 1, 2, 3, 4], // ma
  [0, 2, 4], // ya
  [0, 1, 2, 3, 4], // ra
  [0, 4], // wa
  [0], // n
];

/** Splits the 46 basic kana (Unicode order) into table rows of 5 cells (null = empty cell). */
export function basicTable(basic: readonly KanaEntry[]): (KanaEntry | null)[][] {
  const rows: (KanaEntry | null)[][] = [];
  let i = 0;
  for (const cols of BASIC_ROWS) {
    const row: (KanaEntry | null)[] = [null, null, null, null, null];
    for (const c of cols) row[c] = basic[i++] ?? null;
    rows.push(row);
  }
  return rows;
}

function Cell({ k }: { k: KanaEntry | null }) {
  if (!k) return <span class="kana-cell empty" aria-hidden="true" />;
  return (
    <a class="kana-cell" href={href(`/kana/${encodeURIComponent(k.kana)}`)}>
      <span class="kana-char" lang="ja">
        {k.kana}
      </span>
      <span class="kana-romaji">{k.romaji || '·'}</span>
    </a>
  );
}

function Grid({ items, columns }: { items: (KanaEntry | null)[]; columns: number }) {
  return (
    <div class="kana-grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {items.map((k, i) => (
        <Cell key={k?.kana ?? `gap${i}`} k={k} />
      ))}
    </div>
  );
}

function KanaDetail({ entry }: { entry: KanaEntry }) {
  const single = [...entry.kana].length === 1;
  return (
    <section class="page kana-page">
      <p class="muted">
        <a href={href('/kana')}>{T.kana.title}</a>
      </p>
      <h1 class="kana-big" lang="ja">
        {entry.kana}
      </h1>
      <p>
        {T.kana.romaji}: <strong>{entry.romaji || '—'}</strong> {entry.strokes ? <span class="muted">· {T.kana.strokes(entry.strokes)}</span> : null}{' '}
        <SpeakButton text={entry.kana} />
      </p>
      {entry.kana === 'っ' || entry.kana === 'ッ' ? (
        <p class="card">
          <MixedText text={T.kana.smallTsu} />
        </p>
      ) : null}
      {entry.kana === 'ー' ? (
        <p class="card">
          <MixedText text={T.kana.choon} />
        </p>
      ) : null}
      {single && (
        <div class="card">
          <CharacterWriter key={entry.kana} char={entry.kana} onQuizDone={(m) => void recordWriting(entry.kana, m, new Date())} />
        </div>
      )}
      <p class="muted small">{T.writing.license}</p>
    </section>
  );
}

export default function KanaPage({ params }: PageProps) {
  const kana = useAsync(loadKana, []);
  const [script, setScript] = useState<KanaScript>('hiragana');
  if (kana.loading || !kana.data) return <p class="loading">{T.loading}</p>;
  if (params.char) {
    const entry = kana.data.find((k) => k.kana === params.char);
    return entry ? <KanaDetail entry={entry} /> : <p class="card">{T.notFound}</p>;
  }
  const of = (kinds: KanaEntry['kind'][]) => kana.data!.filter((k) => k.script === script && kinds.includes(k.kind));
  return (
    <section class="page kana-page">
      <h1>{T.kana.title}</h1>
      <p class="lead">
        <MixedText text={T.kana.intro} />
      </p>
      <div class="tabs" role="tablist" aria-label={T.kana.title}>
        {(['hiragana', 'katakana'] as const).map((s) => (
          <button key={s} type="button" role="tab" aria-selected={s === script} class={s === script ? 'tab active' : 'tab'} onClick={() => setScript(s)}>
            {T.kana[s]}
          </button>
        ))}
      </div>
      <div class="card">
        <h2>
          <MixedText text={T.kana.basic} />
        </h2>
        <Grid items={basicTable(of(['basic'])).flat()} columns={5} />
      </div>
      <div class="card">
        <h2>
          <MixedText text={T.kana.voiced} />
        </h2>
        <Grid items={of(['voiced', 'semi-voiced'])} columns={5} />
      </div>
      <div class="card">
        <h2>
          <MixedText text={T.kana.combo} />
        </h2>
        <Grid items={of(['combo'])} columns={3} />
      </div>
      <div class="card">
        <h2>
          <MixedText text={T.kana.small} />
        </h2>
        <Grid items={of(['small', 'mark'])} columns={5} />
      </div>
      {script === 'katakana' && (
        <div class="card">
          <h2>
          <MixedText text={T.kana.extended} />
        </h2>
          <Grid items={of(['extended'])} columns={4} />
        </div>
      )}
    </section>
  );
}
