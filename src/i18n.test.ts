import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { storyStrings } from '../scripts/strings';
import { ru } from './i18n/ru';
import { setLanguage, t, tf } from './i18n';

// Frequencies, digits and NATO call signs read the same in every language.
const neutral = /^([−+]?\d+(\.\d+)?( MHz)?|ALPHA|BRAVO|CHARLIE|DELTA)$/;

test('every story string has a Russian translation', () => {
  const missing = storyStrings().filter(text => !neutral.test(text) && !(text in ru));
  assert.deepEqual(missing, []);
});

test('translations keep their placeholders', () => {
  for (const [source, target] of Object.entries(ru)) {
    const placeholders = (text: string) => (text.match(/\{\d\}/g) ?? []).sort().join();
    assert.equal(placeholders(target), placeholders(source), source);
  }
});

test('templates fall back to English and fill values', () => {
  setLanguage('en');
  assert.equal(tf('EVIDENCE {0}/{1}', 3, 13), 'EVIDENCE 3/13');
  setLanguage('ru');
  assert.equal(tf('EVIDENCE {0}/{1}', 3, 13), 'УЛИКИ 3/13');
  assert.equal(t('An untranslated line'), 'An untranslated line');
  setLanguage('en');
});
