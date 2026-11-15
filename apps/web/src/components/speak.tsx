import { settings } from '../lib/settings';
import { speak, voices } from '../lib/speech';
import { T } from '../strings';
import { IconSpeaker } from './icons';

/** Speaker button; hidden when the device has no Mandarin voice. */
export function SpeakButton({ text, label }: { text: string; label?: string }) {
  if (voices.value.length === 0) return null;
  return (
    <button
      type="button"
      class="icon-button"
      aria-label={label ?? T.speak(text)}
      title={label ?? T.speak(text)}
      onClick={() => speak(text, { rate: settings.value.speechRate, voiceURI: settings.value.voiceURI })}
    >
      <IconSpeaker />
    </button>
  );
}
