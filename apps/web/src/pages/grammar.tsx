import { useAsync } from '../components/hooks';
import type { PageProps } from '../components/lazy';
import { DraftBadge, JaSentence, JaText, MixedText, RichText, RubyContext } from '../components/text';
import { findGrammar } from '../lib/content';
import { href } from '../router';
import { T } from '../strings';

export default function GrammarPage({ params }: PageProps) {
  const id = params.id ?? '';
  const found = useAsync(() => findGrammar(id), [id]);
  if (found.loading) return <p class="loading">{T.loading}</p>;
  const f = found.data;
  if (!f) return <p class="card">{T.grammar.notFound}</p>;
  const { grammar: point, content: g, lesson } = f;

  return (
    <section class="page grammar-page">
      {lesson && (
        <p class="muted">
          <a href={href(`/lesson/${lesson.meta.id}`)}>
            {T.lessonLabel(lesson.meta.level, lesson.meta.order)} — <MixedText text={lesson.meta.titleVi} />
          </a>
        </p>
      )}
      {!g ? (
        <>
          <h1>
            <MixedText text={point.pattern} />
          </h1>
          <p class="card">{T.lesson.writing}</p>
        </>
      ) : (
        <RubyContext.Provider value={{ ruby: lesson?.content?.ruby ?? {} }}>
          <h1>
            <MixedText text={g.titleVi} />
          </h1>
          <p class="lead">
            <MixedText text={g.summaryVi} />
          </p>
          <p>
            <DraftBadge item={g} />{' '}
            <span class="muted">
              {T.grammar.pattern}: <MixedText text={point.pattern} />
              {point.extra ? ` · ${T.grammar.extra}` : ''}
            </span>
          </p>
          <div class="card explanation">
            {g.explanationVi.map((p, i) => (
              <p key={i}>
                <RichText text={p} />
              </p>
            ))}
            {g.patterns && g.patterns.length > 0 && (
              <>
                <h2>{T.grammar.patterns}</h2>
                <ul class="patterns">
                  {g.patterns.map((p) => (
                    <li key={p}>
                      <MixedText text={p} />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          <div class="card">
            <h2>{T.grammar.examples}</h2>
            <ul class="examples">
              {g.examples.map((s) => (
                <li key={s.ja}>
                  <div class="example-ja">
                    <JaSentence text={s.ja} />
                  </div>
                  <div class="example-vi">{s.vi}</div>
                </li>
              ))}
            </ul>
          </div>
          {g.mistakes && g.mistakes.length > 0 && (
            <div class="card">
              <h2>{T.grammar.mistakes}</h2>
              <ul class="mistakes">
                {g.mistakes.map((m) => (
                  <li key={m.wrong}>
                    <div>
                      <span class="tag bad">{T.grammar.wrong}</span>{' '}
                      <s>
                        <JaText text={m.wrong} />
                      </s>
                    </div>
                    <div>
                      <span class="tag good">{T.grammar.right}</span> <JaText text={m.right} />
                    </div>
                    <div class="muted">
                      <MixedText text={m.noteVi} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </RubyContext.Provider>
      )}
    </section>
  );
}
