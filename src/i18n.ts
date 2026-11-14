import type { Language } from './systems/settings';
import { ru } from './i18n/ru';

// English source strings are the keys; a missing translation falls back to English.
let language: Language = 'en';

export function setLanguage(next: Language) { language = next; }
export function currentLanguage() { return language; }

export function t(text: string) {
  return language === 'ru' ? ru[text] ?? text : text;
}

/** Translates a template with {0}, {1}… placeholders, then fills them in. */
export function tf(template: string, ...values: (string | number)[]) {
  return t(template).replace(/\{(\d+)\}/g, (_, index) => String(values[Number(index)] ?? ''));
}
