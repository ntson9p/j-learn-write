import { href } from '../router';
import { T } from '../strings';
import { IconDict, IconLearn, IconProgress, IconReview, IconSettings } from './icons';

export type Tab = 'learn' | 'review' | 'dict' | 'progress' | 'settings';

const TABS: { tab: Tab; path: string; label: string; Icon: () => preact.JSX.Element }[] = [
  { tab: 'learn', path: '/', label: T.nav.learn, Icon: IconLearn },
  { tab: 'review', path: '/review', label: T.nav.review, Icon: IconReview },
  { tab: 'dict', path: '/dict', label: T.nav.dict, Icon: IconDict },
  { tab: 'progress', path: '/progress', label: T.nav.progress, Icon: IconProgress },
  { tab: 'settings', path: '/settings', label: T.nav.settings, Icon: IconSettings },
];

/** Bottom navigation (thumb-friendly on phones). */
export function BottomNav({ active }: { active: Tab | null }) {
  return (
    <nav class="bottom-nav" aria-label={T.nav.label}>
      {TABS.map(({ tab, path, label, Icon }) => (
        <a key={tab} href={href(path)} class={tab === active ? 'active' : undefined} aria-current={tab === active ? 'page' : undefined}>
          <Icon />
          <span>{label}</span>
        </a>
      ))}
    </nav>
  );
}
