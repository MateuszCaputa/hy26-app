import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LandmarkFollower } from '../src/core/landmarkFollower';

const pt = (x: number, y: number) => ({ x, y, visibility: 0.9 });

test('pierwszy pomiar: od razu w punkcie docelowym', () => {
  const f = new LandmarkFollower(70);
  f.setTarget([pt(0.5, 0.5)]);
  assert.deepEqual(f.step(16)![0], { x: 0.5, y: 0.5, visibility: 0.9 });
});

test('kolejny pomiar: płynne dojście, bez skoku i bez przestrzelenia', () => {
  const f = new LandmarkFollower(70);
  f.setTarget([pt(0, 0)]);
  f.step(16);
  f.setTarget([pt(1, 0)]);
  const a = f.step(16)![0].x;
  assert.ok(a > 0 && a < 0.5, `po 1 klatce część drogi, było ${a}`);
  let x = a;
  for (let i = 0; i < 30; i++) x = f.step(16)![0].x; // ~0,5 s
  assert.ok(x > 0.99 && x <= 1, `po 0,5 s prawie u celu, było ${x}`);
});

test('brak osoby: nakładka znika od razu', () => {
  const f = new LandmarkFollower(70);
  f.setTarget([pt(0.2, 0.2)]);
  f.step(16);
  f.setTarget(null);
  assert.equal(f.step(16), null);
});

test('widoczność bierzemy z pomiaru (bez wygładzania)', () => {
  const f = new LandmarkFollower(70);
  f.setTarget([pt(0, 0)]);
  f.setTarget([{ x: 0, y: 0, visibility: 0.1 }]);
  assert.equal(f.step(16)![0].visibility, 0.1);
});
