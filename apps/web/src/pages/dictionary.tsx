import { LEVELS, type JlptLevel, type WordContent } from '@j-learn-write/course';
import { isKanji } from '@j-learn-write/grader';
import { useMemo, useState } from 'preact/hooks';
import { useAsync } from '../components/hooks';
import type { PageProps } from '../components/lazy';
import { MixedText } from '../components/text';
import { kanjiList, lessonsOf, listWords } from '../lib/content';
import { searchWords, type DictEntry } from '../lib/search';
import { href } from '../router';
import { T } from '../strings';

const MAX_SHOWN = 100;
const JLPT_LEVELS: readonly JlptLevel[] = ['n5', 'n4'];

async function loadEntries(): Promise<DictEntry[]> {
  const words = await listWords();
  const contents = new Map<number, WordContent>();
  for (const level of LEVELS) for (const l of await lessonsOf(level)) for (const w of l.content?.words ?? []) contents.set(w.no, w);
  return [...words.values()].map((word) => ({ word, content: contents.get(word.no) ?? null }));
}

export default function DictionaryPage(_props: PageProps) {
  const data = useAsync(async () => ({ entries: await loadEntries(), kanji: await kanjiList() }), []);
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState<JlptLevel | null>(null);
  const results = useMemo(
    () => searchWords((data.data?.entries ?? []).filter((e) => level === null || e.word.level === level), query),
    [data.data, query, level],
  );
  const kanjiHits = [...new Set([...query].filter(isKanji))].filter((c) => data.data?.kanji.has(c));

  return (
    <section class="page dict-page">
      <h1>{T.dict.title}</h1>
      <label class="visually-hidden" for="dict-search">
        {T.dict.search}
      </label>
      <input
        id="dict-search"
        class="search"
        type="search"
        placeholder={T.dict.search}
        value={query}
        onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
      />
      <p class="muted small">
        <MixedText text={T.dict.hint} />
      </p>
      <div class="chips" role="group">
        {[null, ...JLPT_LEVELS].map((l) => (
          <button key={l ?? 'all'} type="button" class={l === level ? 'chip active' : 'chip'} aria-pressed={l === level} onClick={() => setLevel(l)}>
            {l === null ? T.dict.all : T.levelName(l)}
          </button>
        ))}
      </div>
      {kanjiHits.length > 0 && (
        <p>
          {T.dict.kanji}:{' '}
          {kanjiHits.map((c) => (
            <a key={c} class="kanji-link" lang="ja" href={href(`/kanji/${encodeURIComponent(c)}`)}>
              {c}
            </a>
          ))}
        </p>
      )}
      {data.loading ? (
        <p class="loading">{T.loading}</p>
      ) : (
        <>
          <p class="muted">{T.dict.count(Math.min(results.length, MAX_SHOWN), results.length)}</p>
          {results.length === 0 && <p>{T.dict.noResult}</p>}
          <ul class="dict-list">
            {results.slice(0, MAX_SHOWN).map(({ word, content }) => (
              <li key={word.no}>
                <a href={href(`/word/${word.no}`)}>
                  <span class="ja-word" lang="ja">
                    {word.word}
                  </span>
                  <span class="reading" lang="ja">
                    {word.word !== word.reading ? word.reading : ''}
                  </span>
                  <span class="meaning">
                    <MixedText text={content?.meaningsVi.join('; ') ?? word.hanViet ?? ''} />
                  </span>
                  <span class="badge">{T.levelName(word.level)}</span>
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
