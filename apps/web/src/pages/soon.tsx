import type { PageProps } from '../components/lazy';
import { href } from '../router';
import { T } from '../strings';

/** Placeholder for a section that a later phase of the plan builds. */
export default function SoonPage(_props: PageProps) {
  return (
    <section class="page">
      <h1>{T.soon}</h1>
      <p>
        <a href={href('/')}>{T.backHome}</a>
      </p>
    </section>
  );
}
