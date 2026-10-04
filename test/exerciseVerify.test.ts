import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ExerciseVerifier, VERIFY_SPECS, canVerify } from '../src/core/exerciseVerify';
import type { PostureMetrics } from '../src/shared/types';

// Pozycja wyjściowa: rozstaw oczu 60 px, barki 150 px (2,5 × oczy), linia barków na y = 300.
const REST: PostureMetrics = {
  neckRatio: 0.6, earRatio: 0.4, headRollDeg: 0, shoulderTiltDeg: 0,
  eyeDistPx: 60, shoulderToEye: 2.5, noseX: 320, noseY: 200, shoulderY: 300,
};

/** Klatki co 125 ms (8 Hz, jak sylwetka w analizatorze). */
const STEP = 125;

class Clip {
  t = 0;
  constructor(readonly v: ExerciseVerifier) {}
  hold(ms: number, m: PostureMetrics | null) {
    let p = this.v.update(this.t, m);
    for (let e = STEP; e <= ms; e += STEP) {
      this.t += STEP;
      p = this.v.update(this.t, m);
    }
    this.t += STEP;
    return p;
  }
}

/** Cofnięta głowa: twarz mniejsza o `k`, barki bez zmian (szerokość barków w px stała). */
const chinBack = (k: number): PostureMetrics => {
  const eye = REST.eyeDistPx * (1 - k);
  return { ...REST, eyeDistPx: eye, shoulderToEye: (REST.shoulderToEye * REST.eyeDistPx) / eye };
};
/** Odchylenie całym ciałem: twarz i barki maleją razem. */
const leanBack = (k: number): PostureMetrics => ({ ...REST, eyeDistPx: REST.eyeDistPx * (1 - k) });
const shouldersUp = (px: number): PostureMetrics => ({ ...REST, shoulderY: REST.shoulderY! - px });
const roll = (deg: number): PostureMetrics => ({ ...REST, headRollDeg: deg });

test('weryfikowane są tylko ćwiczenia z pewnym sygnałem', () => {
  assert.ok(canVerify('chin-tuck'));
  assert.ok(canVerify('shrugs'));
  assert.ok(canVerify('neck-side'));
  assert.ok(!canVerify('blade-squeeze'));
  assert.ok(!canVerify('walk'));
});

test('pierwsza sekunda to pozycja wyjściowa, potem zaczyna się liczenie', () => {
  const c = new Clip(new ExerciseVerifier(VERIFY_SPECS['chin-tuck']));
  assert.equal(c.v.update(0, REST).phase, 'baseline');
  assert.equal(c.hold(1100, REST).phase, 'active');
});

test('cofanie brody: utrzymane 2 s i powrót = powtórzenie; za krótko się nie liczy', () => {
  const c = new Clip(new ExerciseVerifier(VERIFY_SPECS['chin-tuck']));
  c.hold(1100, REST);
  c.hold(2000, chinBack(0.06));
  let p = c.hold(500, REST);
  assert.equal(p.count, 1);
  c.hold(600, chinBack(0.06)); // 0,6 s < 0,8 s
  p = c.hold(500, REST);
  assert.equal(p.count, 1);
  assert.ok(p.peak >= 0.05);
});

test('cofanie brody: odchylenie się całym ciałem nie jest powtórzeniem', () => {
  const c = new Clip(new ExerciseVerifier(VERIFY_SPECS['chin-tuck']));
  c.hold(1100, REST);
  c.hold(2500, leanBack(0.1));
  const p = c.hold(500, REST);
  assert.equal(p.count, 0);
});

test('cofanie brody: 10 powtórzeń kończy ćwiczenie', () => {
  const c = new Clip(new ExerciseVerifier(VERIFY_SPECS['chin-tuck']));
  c.hold(1100, REST);
  let p = c.hold(0, REST);
  for (let i = 0; i < 10; i++) {
    c.hold(1800, chinBack(0.05));
    p = c.hold(600, REST);
  }
  assert.equal(p.count, 10);
  assert.equal(p.phase, 'done');
  assert.equal(p.fraction, 1);
});

test('unoszenie barków: ruch powyżej progu i powrót; drżenie poniżej progu nie liczy się', () => {
  const c = new Clip(new ExerciseVerifier(VERIFY_SPECS.shrugs));
  c.hold(1100, REST);
  for (let i = 0; i < 3; i++) {
    c.hold(400, shouldersUp(15)); // 15 px / 150 px = 0,1
    c.hold(400, REST);
  }
  c.hold(400, shouldersUp(5)); // 0,033 < 0,06
  const p = c.hold(400, REST);
  assert.equal(p.count, 3);
});

test('boczne rozciąganie szyi: sekundy liczone osobno na każdą stronę', () => {
  const c = new Clip(new ExerciseVerifier(VERIFY_SPECS['neck-side']));
  c.hold(1100, REST);
  let p = c.hold(5000, roll(18));
  assert.ok(p.inMove);
  assert.ok(p.sides!.left >= 4 && p.sides!.left <= 5, `left=${p.sides!.left}`);
  assert.equal(p.sides!.right, 0);
  p = c.hold(16000, roll(-18));
  assert.equal(p.sides!.right, 15); // limit na stronę
  p = c.hold(11000, roll(16));
  assert.equal(p.sides!.left, 15);
  assert.equal(p.phase, 'done');
});

test('brak osoby: licznik stoi, flaga „lost”, po powrocie liczy dalej', () => {
  const c = new Clip(new ExerciseVerifier(VERIFY_SPECS.shrugs));
  c.hold(1100, REST);
  c.hold(400, shouldersUp(15));
  c.hold(400, REST);
  let p = c.hold(2000, null);
  assert.equal(p.count, 1);
  assert.ok(p.lost);
  c.hold(400, shouldersUp(15));
  p = c.hold(400, REST);
  assert.equal(p.count, 2);
  assert.ok(!p.lost);
});

test('cofanie brody: krótkie drgnięcie sygnału w trakcie utrzymania nie gubi powtórzenia (test na żywo)', () => {
  const c = new Clip(new ExerciseVerifier(VERIFY_SPECS['chin-tuck']));
  c.hold(1100, REST);
  c.hold(500, chinBack(0.05));
  c.hold(100, chinBack(0.012)); // chwilowy spadek poniżej starego progu wyjścia 0,015
  c.hold(500, chinBack(0.05));
  const p = c.hold(500, REST);
  assert.equal(p.count, 1);
});
