import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkFraming, estimateDistanceCm, type FramingInput } from '../src/core/framing';
import type { Landmark } from '../src/core/metrics';

/** Sylwetka w kadrze: cx = środek twarzy, eye = rozstaw oczu (ułamek szerokości). */
function pose(o: { cx?: number; eye?: number; noseY?: number; shoulders?: boolean } = {}): Landmark[] {
  const cx = o.cx ?? 0.5, e = o.eye ?? 0.1, ny = o.noseY ?? 0.4;
  const lm: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0.1 }));
  const set = (i: number, x: number, y: number, v = 0.99) => (lm[i] = { x, y, visibility: v });
  set(0, cx, ny);
  set(2, cx + e / 2, ny - 0.04);
  set(5, cx - e / 2, ny - 0.04);
  const sv = o.shoulders === false ? 0.2 : 0.99;
  set(11, cx + 0.22, 0.75, sv);
  set(12, cx - 0.22, 0.75, sv);
  return lm;
}
const input = (p: Partial<FramingInput>): FramingInput => ({ pose: pose(), headPitchDeg: 0, brightness: 120, mirror: true, ...p });
const ids = (p: Partial<FramingInput>) => checkFraming(input(p)).map((h) => h.id);

test('dobry kadr: brak wskazówek', () => {
  assert.deepEqual(ids({}), []);
});

test('brak osoby: jedna wskazówka „usiądź przed kamerą”', () => {
  assert.deepEqual(ids({ pose: null }), ['noPerson']);
});

test('odległość: za blisko, za daleko, barki poza kadrem', () => {
  assert.deepEqual(ids({ pose: pose({ eye: 0.2 }) }), ['tooClose']);
  assert.deepEqual(ids({ pose: pose({ eye: 0.04 }) }), ['tooFar']);
  assert.deepEqual(ids({ pose: pose({ shoulders: false }) }), ['shoulders']);
});

test('lewo/prawo z perspektywy użytkownika w podglądzie lustrzanym i zwykłym', () => {
  // Twarz po lewej stronie obrazu z kamery = po prawej w lustrze = użytkownik ma się przesunąć w lewo.
  assert.deepEqual(ids({ pose: pose({ cx: 0.3 }), mirror: true }), ['moveLeft']);
  assert.deepEqual(ids({ pose: pose({ cx: 0.3 }), mirror: false }), ['moveRight']);
});

test('ucięta głowa, kamera od dołu i ciemność', () => {
  assert.deepEqual(ids({ pose: pose({ noseY: 0.12 }) }), ['headCut']);
  assert.deepEqual(ids({ headPitchDeg: -22 }), ['cameraLow']);
  assert.deepEqual(ids({ brightness: 30 }), ['dark']);
  assert.deepEqual(ids({ brightness: 30, pose: null }), ['noPerson', 'dark']);
});

test('odległość od ekranu: rozsądne wartości dla typowej kamery', () => {
  const d = estimateDistanceCm(64, 640)!;
  assert.ok(d >= 45 && d <= 60, `odległość ${d} cm`);
  assert.ok(estimateDistanceCm(32, 640)! > d);
  assert.equal(estimateDistanceCm(0, 640), null);
});
