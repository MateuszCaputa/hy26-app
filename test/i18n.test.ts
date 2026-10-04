import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setLang, tr } from '../src/shared/i18n';
import { EN } from '../src/shared/i18n-en';
import { ISSUE_LABEL, exerciseById } from '../src/core/coach';

test('przełącznik języka: etykiety i ćwiczenia po angielsku, powrót do polskiego', () => {
  setLang('en');
  assert.equal(ISSUE_LABEL.slouch, 'Slouching');
  assert.equal(exerciseById('chin-tuck').name, 'Chin tuck');
  assert.equal(exerciseById('chin-tuck').steps[0], 'Sit up straight, look ahead.');
  assert.equal(tr('Przerwa za {m}', { m: 5 }), 'Przerwa za 5'); // brak tłumaczenia = polski, zmienne działają
  setLang('pl');
  assert.equal(ISSUE_LABEL.slouch, 'Garbienie');
  assert.equal(exerciseById('chin-tuck').name, 'Cofanie brody');
});

test('każde tłumaczenie ma te same zmienne {x} co polski klucz', () => {
  const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
  for (const [pl, en] of Object.entries(EN)) assert.equal(vars(en), vars(pl), `${pl} → ${en}`);
});
