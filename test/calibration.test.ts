import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BaselineDrift, checkCalibrationPose, judgeCalibration, personalThreshold } from '../src/core/calibration';
import { evaluateIssues } from '../src/core/scoring';
import type { Calibration, PostureMetrics } from '../src/shared/types';

const m0: PostureMetrics = {
  neckRatio: 0.6, earRatio: 0.65, headRollDeg: 0, shoulderTiltDeg: 0, eyeDistPx: 60,
  shoulderToEye: 3.7, noseX: 320, noseY: 250, headPitchDeg: 2, headYawDeg: 0,
};
const cal: Calibration = {
  createdAt: 0, neckRatio: 0.6, earRatio: 0.65, headRollDeg: 0, shoulderTiltDeg: 0,
  eyeDistPx: 60, shoulderToEye: 3.7, earOpen: null, headPitchDeg: 2,
};
const ids = (m: PostureMetrics) => checkCalibrationPose(m).map((c) => c.id);

test('kontrola kalibracji: prosta pozycja przechodzi bez uwag', () => {
  assert.deepEqual(ids(m0), []);
});

test('kontrola kalibracji wyłapuje opuszczoną głowę, obrót, krzywe barki i przechył', () => {
  assert.deepEqual(ids({ ...m0, headPitchDeg: 20 }), ['headDown']);
  assert.deepEqual(ids({ ...m0, headYawDeg: -25 }), ['turned']);
  assert.deepEqual(ids({ ...m0, shoulderTiltDeg: 8 }), ['shoulders']);
  assert.deepEqual(ids({ ...m0, headRollDeg: -9 }), ['headTilt']);
});

test('bez modelu twarzy (brak pochylenia) kontrola działa na samych przechyłach', () => {
  assert.deepEqual(ids({ ...m0, headPitchDeg: null, headYawDeg: null }), []);
});

test('dwa kroki z wyraźną różnicą = kalibracja w porządku', () => {
  assert.equal(judgeCalibration(cal, { neckRatio: 0.48, earRatio: 0.55, headPitchDeg: 14 }).ok, true);
});

test('„prosta” pozycja taka sama jak zwykła = prośba o powtórkę', () => {
  const v = judgeCalibration(cal, { neckRatio: 0.59, earRatio: 0.645, headPitchDeg: 3 });
  assert.equal(v.ok, false);
  assert.match(v.warning!, /wyprostować/);
});

test('zamienione kroki (zwykła prościej niż prosta) = prośba o powtórkę', () => {
  const v = judgeCalibration(cal, { neckRatio: 0.68, earRatio: 0.72, headPitchDeg: 0 });
  assert.equal(v.ok, false);
  assert.match(v.warning!, /prościej/);
});

test('osobisty próg: 40% drogi od prostej do zwykłej, w granicach 8–20%', () => {
  assert.equal(personalThreshold(0.15, 0.6, undefined), 0.15);
  assert.ok(Math.abs(personalThreshold(0.15, 0.6, 0.45) - 0.1) < 1e-9); // zakres 25% → próg 10%
  assert.equal(personalThreshold(0.15, 0.6, 0.2), 0.2); // duży zakres → najwyżej 20%
  assert.equal(personalThreshold(0.15, 0.6, 0.59), 0.15); // brak zakresu → domyślny
});

test('z osobistym zakresem ostrzeżenie pojawia się wcześniej u kogoś, kto garbi się „mało”', () => {
  const drop = { ...m0, neckRatio: 0.54, headPitchDeg: 2 }; // 10% spadku szyi
  const sevDefault = evaluateIssues(drop, cal).find((i) => i.id === 'headForward')!.severity;
  const personal = { ...cal, slouch: { neckRatio: 0.51, earRatio: 0.6, headPitchDeg: 8 } }; // zakres 15% → próg 8%
  const sevPersonal = evaluateIssues(drop, personal).find((i) => i.id === 'headForward')!.severity;
  assert.ok(sevPersonal > sevDefault, `${sevPersonal} > ${sevDefault}`);
});

test('dryf wzorca: siedzisz prościej niż przy kalibracji przez dłuższy czas → propozycja', () => {
  const d = new BaselineDrift(0.6);
  // 40 minut, w tym 8 minut wyraźnie prościej (0.68 = +13%).
  for (let min = 0; min < 40; min++) {
    for (let k = 0; k < 30; k++) d.add(min * 60 + k * 2, { ...m0, neckRatio: min < 8 ? 0.68 : 0.58 });
  }
  d.add(40 * 60, m0); // domyka ostatnią minutę
  assert.equal(d.suggestsRecalibration(), true);
});

test('dryf wzorca: zwykły dzień bez prostszego siedzenia → brak propozycji', () => {
  const d = new BaselineDrift(0.6);
  for (let min = 0; min < 40; min++) for (let k = 0; k < 30; k++) d.add(min * 60 + k * 2, { ...m0, neckRatio: 0.58 });
  d.add(40 * 60, m0);
  assert.equal(d.suggestsRecalibration(), false);
});

test('dryf wzorca: chwile z obróconą lub opuszczoną głową nie są liczone', () => {
  const d = new BaselineDrift(0.6);
  for (let min = 0; min < 40; min++) for (let k = 0; k < 30; k++) d.add(min * 60 + k * 2, { ...m0, neckRatio: 0.7, headYawDeg: 30 });
  d.add(40 * 60, m0);
  assert.equal(d.suggestsRecalibration(), false);
});
