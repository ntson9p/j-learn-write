import { useEffect, useState } from 'preact/hooks';
import type { PageProps } from '../components/lazy';
import { BackupError, backupFileName, exportBackup, importBackup } from '../lib/backup';
import { clearAll, requestPersistence } from '../lib/db';
import { DEFAULT_SETTINGS, loadSettings, settings, updateSettings, type FuriganaMode, type Theme } from '../lib/settings';
import { speak, voices } from '../lib/speech';
import { href } from '../router';
import { T } from '../strings';

/** Saves a text file through a temporary download link. */
function download(name: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function SettingsPage(_props: PageProps) {
  const s = settings.value;
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [persistent, setPersistent] = useState<boolean | null>(null);

  useEffect(() => {
    void navigator.storage?.persisted?.().then(setPersistent, () => setPersistent(false));
  }, []);

  const themes: [Theme, string][] = [
    ['auto', T.settings.themeAuto],
    ['light', T.settings.themeLight],
    ['dark', T.settings.themeDark],
  ];

  const furiganaModes: [FuriganaMode, string][] = [
    ['auto', T.settings.furiganaAuto],
    ['always', T.settings.furiganaAlways],
    ['never', T.settings.furiganaNever],
  ];

  const onExport = async () => {
    const now = new Date();
    download(backupFileName(now), JSON.stringify(await exportBackup(now), null, 1));
    await updateSettings({ lastBackup: now.toISOString().slice(0, 10) });
  };

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    if (!confirm(T.settings.importConfirm)) return;
    try {
      await importBackup(JSON.parse(await file.text()));
      await loadSettings();
      setMessage({ kind: 'ok', text: T.settings.importDone });
    } catch (e) {
      const detail = e instanceof BackupError ? e.problems.join(' ') : e instanceof SyntaxError ? T.settings.notJson : String(e);
      setMessage({ kind: 'error', text: `${T.settings.importFailed} ${detail}` });
    }
  };

  const onClear = async () => {
    if (!confirm(T.settings.clearConfirm)) return;
    await clearAll();
    await updateSettings({ ...DEFAULT_SETTINGS });
    setMessage({ kind: 'ok', text: T.settings.cleared });
  };

  return (
    <section class="page settings-page">
      <h1>{T.settings.title}</h1>
      {message && (
        <p class={`notice ${message.kind}`} role={message.kind === 'error' ? 'alert' : 'status'}>
          {message.text}
        </p>
      )}

      <div class="card">
        <h2>{T.settings.display}</h2>
        <fieldset class="radio-row">
          <legend>{T.settings.theme}</legend>
          {themes.map(([value, label]) => (
            <label key={value}>
              <input type="radio" name="theme" value={value} checked={s.theme === value} onChange={() => updateSettings({ theme: value })} />
              {label}
            </label>
          ))}
        </fieldset>
        <fieldset class="radio-row">
          <legend>{T.settings.furigana}</legend>
          {furiganaModes.map(([value, label]) => (
            <label key={value}>
              <input type="radio" name="furigana" value={value} checked={s.furigana === value} onChange={() => updateSettings({ furigana: value })} />
              {label}
            </label>
          ))}
        </fieldset>
        <label class="check">
          <input type="checkbox" checked={s.showHanViet} onChange={(e) => updateSettings({ showHanViet: (e.target as HTMLInputElement).checked })} />
          {T.settings.showHanViet}
        </label>
      </div>

      <div class="card">
        <h2>{T.settings.voice}</h2>
        {voices.value.length === 0 ? (
          <p class="muted">{T.settings.voiceNone}</p>
        ) : (
          <>
            <label class="field">
              <span>{T.settings.voice}</span>
              <select value={s.voiceURI ?? ''} onChange={(e) => void updateSettings({ voiceURI: (e.target as HTMLSelectElement).value || null })}>
                <option value="">{T.settings.voiceAuto}</option>
                {voices.value.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </label>
            <label class="field">
              <span>
                {T.settings.speechRate}: {s.speechRate.toFixed(1)}
              </span>
              <input
                type="range"
                min={0.5}
                max={1.2}
                step={0.1}
                value={s.speechRate}
                onChange={(e) => void updateSettings({ speechRate: Number((e.target as HTMLInputElement).value) })}
              />
            </label>
            <button type="button" class="button" onClick={() => speak(T.settings.testSentence, { rate: s.speechRate, voiceURI: s.voiceURI })}>
              {T.settings.testVoice}
            </button>
          </>
        )}
        <p>
          <a href={href('/guide')}>{T.settings.guideLink}</a>
        </p>
      </div>

      <div class="card">
        <h2>{T.settings.study}</h2>
        <label class="field">
          <span>{T.settings.newWordsPerDay}</span>
          <input
            type="number"
            min={0}
            max={50}
            step={1}
            value={s.newWordsPerDay}
            onChange={(e) => {
              const n = Number((e.target as HTMLInputElement).value);
              if (Number.isInteger(n) && n >= 0 && n <= 50) void updateSettings({ newWordsPerDay: n });
            }}
          />
        </label>
      </div>

      <div class="card">
        <h2>{T.settings.data}</h2>
        <p>{T.settings.dataIntro}</p>
        <p class="muted">{T.settings.lastBackup(s.lastBackup)}</p>
        <div class="button-row">
          <button type="button" class="button primary" onClick={onExport}>
            {T.settings.exportBackup}
          </button>
          <label class="button">
            {T.settings.importBackup}
            <input
              type="file"
              accept="application/json,.json"
              class="visually-hidden"
              onChange={(e) => {
                const input = e.target as HTMLInputElement;
                void onImport(input.files?.[0]).finally(() => (input.value = ''));
              }}
            />
          </label>
        </div>
        <p class="muted">{persistent ? T.settings.persistent : T.settings.notPersistent}</p>
        {!persistent && (
          <button type="button" class="button" onClick={async () => setPersistent(await requestPersistence())}>
            {T.settings.askPersistent}
          </button>
        )}
        <p class="muted">{T.settings.iosHint}</p>
        <button type="button" class="button danger" onClick={onClear}>
          {T.settings.clearAll}
        </button>
      </div>

      <div class="card">
        <h2>{T.settings.tools}</h2>
        <ul class="link-list">
          <li>
            <a href={href('/about')}>{T.settings.aboutLink}</a>
          </li>
        </ul>
      </div>
    </section>
  );
}
