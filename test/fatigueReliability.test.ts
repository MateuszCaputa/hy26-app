import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EyeAnalyzer, FatigueEstimator, eyesUsable } from '../src/core/fatigue';

const tired = { postureAvg15: 15, minutesSinceBreak: 100 };

/** Oczy otwarte z mrugnięciem co 4 s, 30 kl./s; face=false → klatki bez twarzy. */
function feed(eyes: EyeAnalyzer, from: number, to: number, face: boolean): void {
  for (let t = from; t < to; t += 1 / 30) {
    if (!face) eyes.update(t, { ear: null, blinkBlend: null, jawOpen: null });
    else eyes.update(t, { ear: t % 4 < 0.15 ? 0.06 : 0.3, blinkBlend: null, jawOpen: 0.05 });
  }
}

test('eyesUsable: wymaga wiarygodnej twarzy i mrugania albo PERCLOS', () => {
  assert.equal(eyesUsable(true, 15, null), true);
  assert.equal(eyesUsable(true, null, 0.04), true);
  assert.equal(eyesUsable(true, null, null), false);
  assert.equal(eyesUsable(false, 15, 0.04), false);
});

test('brak twarzy → brak zmęczenia, nawet przy złej postawie i długiej pracy bez przerwy', () => {
  const eyes = new EyeAnalyzer(0.3);
  feed(eyes, 0, 60, false);
  assert.equal(new FatigueEstimator().update(60, eyes, tired), null);
});

test('pierwsze sekundy z twarzą (mruganie jeszcze niepoliczone) → brak zmęczenia', () => {
  const eyes = new EyeAnalyzer(0.3);
  feed(eyes, 0, 12, true);
  assert.equal(new FatigueEstimator().update(12, eyes, tired), null);
});

test('oczy wiarygodne → zmęczenie liczone z oczami', () => {
  const eyes = new EyeAnalyzer(0.3);
  feed(eyes, 0, 90, true);
  const s = new FatigueEstimator().update(90, eyes, tired);
  assert.ok(s);
  assert.ok(s.faceReliable);
  assert.notEqual(s.blinkRate, null);
});

test('utrata oczu zeruje wygładzanie: stara wartość nie wraca po powrocie twarzy', () => {
  const eyes = new EyeAnalyzer(0.3);
  const est = new FatigueEstimator();
  feed(eyes, 0, 90, true);
  const before = est.update(90, eyes, tired);
  assert.ok(before);
  feed(eyes, 90, 110, false);
  assert.equal(est.update(110, eyes, tired), null);
  feed(eyes, 110, 200, true);
  const after = est.update(200, eyes, { postureAvg15: 95, minutesSinceBreak: 0 });
  assert.ok(after);
  // Po resecie wynik startuje od bieżących (dobrych) danych, a nie od wartości sprzed utraty oczu.
  assert.ok(after.percent < before.percent, `po ${after.percent} vs przed ${before.percent}`);
});
