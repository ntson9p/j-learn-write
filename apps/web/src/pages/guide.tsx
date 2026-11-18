import type { PageProps } from '../components/lazy';
import { MixedText } from '../components/text';
import { voices } from '../lib/speech';
import { T } from '../strings';

export default function GuidePage(_props: PageProps) {
  return (
    <section class="page guide-page">
      <h1>{T.guide.title}</h1>
      <div class="card">
        <h2>{T.guide.imeTitle}</h2>
        <p>
          <MixedText text={T.guide.imeIntro} />
        </p>
        <dl>
          {T.guide.platforms.map((p) => (
            <div key={p.name}>
              <dt>{p.name}</dt>
              <dd>
                <MixedText text={p.ime} />
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <div class="card">
        <h2>{T.guide.voiceTitle}</h2>
        <p>{T.guide.voiceIntro}</p>
        <p class="notice">{T.guide.voiceNow(voices.value.length)}</p>
        <dl>
          {T.guide.platforms.map((p) => (
            <div key={p.name}>
              <dt>{p.name}</dt>
              <dd>{p.voice}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
