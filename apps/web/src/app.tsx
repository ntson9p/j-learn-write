import { useEffect } from 'preact/hooks';
import { LazyPage } from './components/lazy';
import { BottomNav } from './components/nav';
import { applyTheme, loadSettings, settings } from './lib/settings';
import { initSpeech } from './lib/speech';
import { currentPath, href } from './router';
import { resolveRoute } from './routes';
import { T } from './strings';

export function App() {
  useEffect(() => {
    void loadSettings().catch(() => undefined);
    initSpeech();
  }, []);
  const theme = settings.value.theme;
  useEffect(() => applyTheme(theme), [theme]);

  const path = currentPath.value;
  const resolved = resolveRoute(path);

  return (
    <div class="shell">
      <a class="skip-link" href="#main">
        {T.skipToContent}
      </a>
      <header class="top-bar">
        <a class="brand" href={href('/')}>
          <span class="brand-mark" lang="ja" aria-hidden="true">
            あ
          </span>
          <span>{T.appName}</span>
        </a>
      </header>
      <main id="main" tabIndex={-1}>
        {resolved ? (
          <LazyPage key={resolved.route.pattern} load={resolved.route.load} params={resolved.params} />
        ) : (
          <section class="page">
            <h1>{T.notFound}</h1>
            <p>
              <a href={href('/')}>{T.backHome}</a>
            </p>
          </section>
        )}
      </main>
      <BottomNav active={resolved?.route.tab ?? null} />
    </div>
  );
}
