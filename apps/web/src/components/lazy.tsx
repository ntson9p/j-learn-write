import type { ComponentType } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import type { Params } from '../router';
import { T } from '../strings';

export interface PageProps {
  params: Params;
}
export type PageModule = { default: ComponentType<PageProps> };
export type PageLoader = () => Promise<PageModule>;

const loaded = new Map<PageLoader, ComponentType<PageProps>>();

/**
 * Loads a page module on demand (one chunk per page, so the first screen
 * stays small). Remount with a different `key` when the route changes.
 */
export function LazyPage({ load, params }: { load: PageLoader; params: Params }) {
  const [Page, setPage] = useState<ComponentType<PageProps> | undefined>(() => loaded.get(load));
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (Page) return;
    let alive = true;
    setFailed(false);
    load().then(
      (m) => {
        loaded.set(load, m.default);
        if (alive) setPage(() => m.default);
      },
      () => alive && setFailed(true),
    );
    return () => {
      alive = false;
    };
  }, [load, attempt]);

  if (Page) return <Page params={params} />;
  if (failed) {
    return (
      <div class="card notice" role="alert">
        <p>{T.loadFailed}</p>
        <button type="button" class="button" onClick={() => setAttempt((n) => n + 1)}>
          {T.retry}
        </button>
      </div>
    );
  }
  return (
    <p class="loading" role="status">
      {T.loading}
    </p>
  );
}
