import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OneEuroFilter, PointSmoother } from '../src/core/oneEuro';

const DT = 1 / 30; // klatki co ~33 ms

test('pierwsza próbka przechodzi bez zmian, stała wartość zostaje stała', () => {
  const f = new OneEuroFilter();
  assert.equal(f.filter(42, 0), 42);
  for (let i = 1; i <= 30; i++) assert.ok(Math.abs(f.filter(42, i * DT) - 42) < 1e-9);
});

test('drgania wokół stałej wartości są wyraźnie stłumione', () => {
  const f = new OneEuroFilter();
  let maxOut = 0;
  for (let i = 0; i < 120; i++) {
    const out = f.filter(i % 2 ? 1 : -1, i * DT);
    if (i > 30) maxOut = Math.max(maxOut, Math.abs(out));
  }
  assert.ok(maxOut < 0.5, `amplituda po filtrze ${maxOut}`);
});

test('skok: wynik zbliża się do nowej wartości monotonicznie, bez przestrzelenia', () => {
  const f = new OneEuroFilter();
  for (let i = 0; i < 10; i++) f.filter(0, i * DT);
  let prev = 0;
  for (let i = 10; i < 200; i++) {
    const out = f.filter(100, i * DT);
    assert.ok(out >= prev - 1e-9 && out <= 100 + 1e-9, `klatka ${i}: ${out}`);
    prev = out;
  }
  assert.ok(prev > 99);
});

test('większe beta = mniejsze opóźnienie przy szybkim ruchu', () => {
  const slow = new OneEuroFilter(1, 0);
  const fast = new OneEuroFilter(1, 1);
  let s = 0;
  let q = 0;
  for (let i = 0; i < 15; i++) {
    const v = i * 10; // szybki, jednostajny ruch
    s = slow.filter(v, i * DT);
    q = fast.filter(v, i * DT);
  }
  const target = 14 * 10;
  assert.ok(target - q < target - s, `beta 1: ${q}, beta 0: ${s}`);
});

test('ten sam lub cofnięty czas: zwraca surową wartość zamiast dzielić przez zero', () => {
  const f = new OneEuroFilter();
  f.filter(0, 1);
  const same = f.filter(10, 1);
  assert.equal(same, 10);
  assert.ok(Number.isFinite(f.filter(20, 0.5)));
});

test('reset: następna próbka znów przechodzi bez zmian', () => {
  const f = new OneEuroFilter();
  for (let i = 0; i < 10; i++) f.filter(0, i * DT);
  f.reset();
  assert.equal(f.filter(50, 10 * DT), 50);
});

test('PointSmoother: osobny filtr dla każdego punktu i osi, reset czyści stan', () => {
  const sm = new PointSmoother();
  assert.deepEqual(sm.smooth(0, 10, 20, 0), [10, 20]);
  assert.deepEqual(sm.smooth(1, 500, 600, 0), [500, 600]); // nowy punkt nie dziedziczy stanu punktu 0
  const [x, y] = sm.smooth(0, 30, 40, DT);
  assert.ok(x > 10 && x < 30 && y > 20 && y < 40);
  sm.reset();
  assert.deepEqual(sm.smooth(0, 30, 40, 2 * DT), [30, 40]);
});
