import type { Language } from './settings';

// Voice-over through the browser's built-in speech synthesis. Each speaker gets
// their own pitch and pace so characters are told apart without recorded audio.
type Delivery = { pitch: number; rate: number };

const deliveries: [RegExp, Delivery][] = [
  [/^THE SIGNAL$/, { pitch: .35, rate: .82 }],
  [/^UNKNOWN VOICE$/, { pitch: .55, rate: .9 }],
  [/^VOSS$/, { pitch: .85, rate: 1 }],
  [/^(MARA|CALLER)/, { pitch: 1.35, rate: 1.02 }],
  [/^(ILSE|COAST LOG · ILSE)/, { pitch: 1.2, rate: 1.05 }],
  [/^COAST STATION$/, { pitch: 1.05, rate: 1 }],
];
// Logs, cards and boards are read by a neutral narrator.
const narrator: Delivery = { pitch: 1, rate: 1.08 };

export class Voice {
  enabled = true;
  volume = .8;
  private voices: SpeechSynthesisVoice[] = [];

  constructor() {
    if (!this.available) return;
    const load = () => { this.voices = speechSynthesis.getVoices(); };
    load();
    speechSynthesis.addEventListener?.('voiceschanged', load);
  }

  get available() { return typeof window !== 'undefined' && 'speechSynthesis' in window; }

  /** Whether the browser has a voice for this language. */
  supports(language: Language) {
    return this.voices.some(voice => voice.lang.toLowerCase().startsWith(language));
  }

  private pick(language: Language) {
    const matching = this.voices.filter(voice => voice.lang.toLowerCase().startsWith(language));
    // Prefer natural-sounding network voices when the browser offers them.
    return matching.find(voice => /google|natural|online|siri|premium|enhanced/i.test(voice.name)) ?? matching[0];
  }

  /** `speaker` is the English source name, used to choose the delivery. */
  speak(speaker: string, text: string, language: Language) {
    if (!this.available || !this.enabled) return;
    this.stop();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = this.pick(language);
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang ?? (language === 'ru' ? 'ru-RU' : 'en-US');
    const delivery = deliveries.find(([pattern]) => pattern.test(speaker))?.[1] ?? narrator;
    utterance.pitch = delivery.pitch;
    utterance.rate = delivery.rate;
    utterance.volume = this.volume;
    speechSynthesis.speak(utterance);
  }

  /** Always cancels: some browsers report `speaking` late, which let a line run on. */
  stop() {
    if (this.available) speechSynthesis.cancel();
  }
}
