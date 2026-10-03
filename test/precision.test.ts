import { test } from 'node:test';
import assert from 'node:assert/strict';
import { headPoseFromMatrix, matrixFromHeadPose } from '../src/core/headPose';
import { ShoulderGate, type ShoulderInput } from '../src/core/shoulderGate';
import { computeMetrics, FACE, type Landmark } from '../src/core/metrics';
import { evaluateIssues } from '../src/core/scoring';
import type { Calibration, PostureMetrics } from '../src/shared/types';

const near = (a: number, b: number, eps = 0.5) => assert.ok(Math.abs(a - b) <= eps, `${a} ≉ ${b}`);

// ——— Ustawienie głowy z macierzy ———

test('macierz jednostkowa = głowa prosto (0°, 0°, 0°)', () => {
  const p = headPoseFromMatrix([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])!;
  near(p.pitchDeg, 0);
  near(p.yawDeg, 0);
  near(p.rollDeg, 0);
});

test('pojedyncze obroty wracają z macierzy jako te same kąty', () => {
  near(headPoseFromMatrix(matrixFromHeadPose(20, 0, 0))!.pitchDeg, 20);
  near(headPoseFromMatrix(matrixFromHeadPose(-10, 0, 0))!.pitchDeg, -10);
  near(headPoseFromMatrix(matrixFromHeadPose(0, 30, 0))!.yawDeg, 30);
  near(headPoseFromMatrix(matrixFromHeadPose(0, 0, 12))!.rollDeg, 12);
});

test('pochylenie i obrót razem: oba odczytywane osobno, skala macierzy nie ma znaczenia', () => {
  const m = matrixFromHeadPose(15, 20, 0).map((v, i) => (i % 4 === 3 || i >= 12 ? v : v * 37));
  const p = headPoseFromMatrix(m)!;
  near(p.pitchDeg, 15, 1);
  near(p.yawDeg, 20, 1.5);
});

test('brak macierzy = brak ustawienia głowy', () => {
  assert.equal(headPoseFromMatrix(null), null);
  assert.equal(headPoseFromMatrix([1, 2, 3]), null);
});

// ——— Bramka barków ———

const shoulders = (o: Partial<ShoulderInput> = {}): ShoulderInput => ({
  lx: 430, ly: 380, rx: 210, ry: 380, visibility: 0.95, eyeDist: 60, ...o,
});

test('nagły „skok” szerokości barków jest odrzucany, a ostatnie dobre barki trzymane', () => {
  const g = new ShoulderGate();
  for (let t = 0; t < 2; t += 0.125) assert.equal(g.update(t, shoulders())!.held, false);
  const r = g.update(2, shoulders({ lx: 520 }))!; // barki „rozjechały się” o 40%
  assert.equal(r.held, true);
  assert.equal(r.lx, 430);
});

test('nagłe przekrzywienie barków o > 10° jest odrzucane', () => {
  const g = new ShoulderGate();
  for (let t = 0; t < 2; t += 0.125) g.update(t, shoulders());
  assert.equal(g.update(2, shoulders({ ly: 430 }))!.held, true); // ~13°
});

test('niska pewność modelu = barki odrzucone; po 2 s bez dobrych barków brak wyniku', () => {
  const g = new ShoulderGate();
  for (let t = 0; t < 1; t += 0.125) g.update(t, shoulders());
  assert.equal(g.update(1.5, shoulders({ visibility: 0.4 }))!.held, true);
  assert.equal(g.update(4, shoulders({ visibility: 0.4 })), null);
});

test('stabilna nowa pozycja jest przyjmowana po ok. 1,5 s (prawdziwa zmiana, nie błąd)', () => {
  const g = new ShoulderGate();
  for (let t = 0; t < 2; t += 0.125) g.update(t, shoulders());
  let last = g.update(2, shoulders({ lx: 520, rx: 180 }))!;
  for (let t = 2.125; t < 4; t += 0.125) last = g.update(t, shoulders({ lx: 520, rx: 180 }))!;
  assert.equal(last.held, false);
  assert.equal(last.lx, 520);
});

// ——— Metryki z punktów twarzy i ustawienia głowy ———

const W = 640, H = 480;
function pose(): Landmark[] {
  const lm: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0.1 }));
  const set = (i: number, x: number, y: number) => (lm[i] = { x: x / W, y: y / H, visibility: 0.99 });
  set(0, 320, 255); set(2, 350, 230); set(5, 290, 230); set(7, 380, 240); set(8, 260, 240);
  set(11, 430, 380); set(12, 210, 380);
  return lm;
}
function face(dy = 0): Landmark[] {
  const f: Landmark[] = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5 }));
  f[FACE.noseTip] = { x: 320 / W, y: (250 + dy) / H };
  f[FACE.leftIris] = { x: 352 / W, y: (228 + dy) / H };
  f[FACE.rightIris] = { x: 288 / W, y: (228 + dy) / H };
  return f;
}

test('nos i oczy brane z siatki twarzy, gdy jest dostępna', () => {
  const withFace = computeMetrics(pose(), W, H, 0, { face: face() }).metrics!;
  const noFace = computeMetrics(pose(), W, H, 0).metrics!;
  near(withFace.noseY, 250);
  near(noFace.noseY, 255);
  near(withFace.eyeDistPx, 64);
});

test('obrót głowy nie udaje oddalenia od ekranu (korekta rozstawu oczu)', () => {
  const straight = computeMetrics(pose(), W, H, 0, { face: face(), headPose: { pitchDeg: 0, yawDeg: 0, rollDeg: 0 } }).metrics!;
  // Przy obrocie o 30° widoczny rozstaw oczu maleje o cos(30°).
  const f = face();
  f[FACE.leftIris] = { x: (320 + 32 * Math.cos(Math.PI / 6)) / W, y: 228 / H };
  f[FACE.rightIris] = { x: (320 - 32 * Math.cos(Math.PI / 6)) / W, y: 228 / H };
  const turned = computeMetrics(pose(), W, H, 0, { face: f, headPose: { pitchDeg: 0, yawDeg: 30, rollDeg: 0 } }).metrics!;
  near(turned.eyeDistPx, straight.eyeDistPx, 0.5);
});

// ——— Ocena: kąty bezwzględne, pochylenie, obrót ———

const base: PostureMetrics = {
  neckRatio: 0.6, earRatio: 0.65, headRollDeg: 0, shoulderTiltDeg: 0, eyeDistPx: 60,
  shoulderToEye: 3.7, noseX: 320, noseY: 250, headPitchDeg: 5, headYawDeg: 0,
};
const calOf = (m: PostureMetrics, extra: Partial<Calibration> = {}): Calibration => ({
  createdAt: 0, neckRatio: m.neckRatio, earRatio: m.earRatio, headRollDeg: m.headRollDeg,
  shoulderTiltDeg: m.shoulderTiltDeg, eyeDistPx: m.eyeDistPx, shoulderToEye: m.shoulderToEye,
  earOpen: null, headPitchDeg: m.headPitchDeg ?? null, ...extra,
});
const sev = (m: PostureMetrics, c: Calibration, id: string) => evaluateIssues(m, c).find((i) => i.id === id)!.severity;

test('krzywe barki przy kalibracji nie stają się normą (ocena względem poziomu)', () => {
  const crooked = { ...base, shoulderTiltDeg: 9 };
  const cal = calOf(crooked); // ktoś skalibrował się z barkami przekrzywionymi o 9°
  // Dawniej: 0 (krzywo = „norma”). Teraz zero może przesunąć się najwyżej o 3°, więc 9° nadal ostrzega.
  assert.ok(sev(crooked, cal, 'shoulderTilt') > 0.5, 'nadal przekrzywione po kalibracji');
  assert.ok(sev({ ...base, shoulderTiltDeg: 0 }, cal, 'shoulderTilt') < 0.2, 'prosto = prawie bez kary');
});

test('lekko krzywa kamera (≤ 3°) jest tolerowana przez kalibrację', () => {
  const cal = calOf({ ...base, headRollDeg: 3 });
  assert.equal(sev({ ...base, headRollDeg: 3 }, cal, 'headTilt'), 0);
});

test('pochylenie głowy o 20° wykrywane, nawet gdy proporcja szyi prawie się nie zmienia', () => {
  const cal = calOf(base);
  const nod = { ...base, neckRatio: 0.59, headPitchDeg: 25 };
  assert.ok(sev(nod, cal, 'headForward') > 0.7);
  assert.equal(sev({ ...base, neckRatio: 0.59 }, cal, 'headForward'), 0);
});

test('stara kalibracja bez pochylenia głowy działa jak wcześniej', () => {
  const cal = calOf(base, { headPitchDeg: null });
  assert.equal(sev({ ...base, headPitchDeg: 40 }, cal, 'headForward'), 0);
});

test('mocno obrócona głowa nie daje fałszywego „za blisko” ani „skrętu tułowia”', () => {
  const cal = calOf(base);
  const turned = { ...base, eyeDistPx: 80, shoulderToEye: 2.5, headYawDeg: 35 };
  assert.equal(sev(turned, cal, 'tooClose'), 0);
  assert.equal(sev(turned, cal, 'twist'), 0);
  assert.ok(sev({ ...turned, headYawDeg: 5 }, cal, 'tooClose') > 0.5);
});
