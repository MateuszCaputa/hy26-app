// Poprawki z docs/BADANIE-OCZU.md: patrzenie w dół, norma eyeBlink, krótkie mrugnięcia, mówienie, ziewanie, skinienia.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EyeAnalyzer, fatiguePercent, type FaceFrame } from '../src/core/fatigue';

const FPS = 25;
const OPEN = 0.3;
const CLOSED = 0.06;

/** Klatki 25/s od `from` do `to`; `frame(t)` zwraca stan twarzy w chwili t. */
function run(eyes: EyeAnalyzer, from: number, to: number, frame: (t: number) => Partial<FaceFrame>): void {
  for (let t = from; t < to; t += 1 / FPS) {
    eyes.update(t, { ear: OPEN, blinkBlend: null, jawOpen: 0.05, pitchDeg: 0, ...frame(t) });
  }
}

/** Mrugnięcie co `every` s trwające `dur` s. */
const blinkEvery = (every: number, dur: number) => (t: number) => ({ ear: t % every < dur ? CLOSED : OPEN });

test('mrugnięcie widziane w jednej klatce (0,04 s przy 25 kl./s) jest liczone', () => {
  const eyes = new EyeAnalyzer(OPEN);
  // dokładnie jedna zamknięta klatka co 100 klatek (4 s)
  for (let i = 0; i < 120 * FPS; i++) {
    eyes.update(i / FPS, { ear: i % 100 === 0 ? CLOSED : OPEN, blinkBlend: null, jawOpen: 0.05, pitchDeg: 0 });
  }
  const r = eyes.blinkRate(120)!;
  assert.ok(r > 13 && r < 17, `rate ${r}`);
});

test('patrzenie w dół (klawiatura): zamknięta powieka nie jest mrugnięciem, długim mrugnięciem ani PERCLOS', () => {
  const eyes = new EyeAnalyzer(OPEN);
  eyes.setCalibratedPitch(0);
  // co 5 s zerknięcie na klawiaturę: głowa 20° w dół i powieka opada na 1 s
  run(eyes, 0, 120, (t) => (t % 5 < 1 ? { ear: CLOSED, pitchDeg: 20 } : {}));
  assert.equal(eyes.longBlinksPerMin(120), 0);
  assert.ok((eyes.perclos(120) ?? 0) < 0.05, `perclos ${eyes.perclos(120)}`);
});

test('to samo zamknięcie przy głowie prosto JEST długim mrugnięciem (bramka działa tylko w dół)', () => {
  const eyes = new EyeAnalyzer(OPEN);
  eyes.setCalibratedPitch(0);
  run(eyes, 0, 120, (t) => (t % 5 < 1 ? { ear: CLOSED } : {}));
  assert.ok(eyes.longBlinksPerMin(120)! > 0);
});

test('eyeBlink 0,5 przy otwartych oczach (wąskie oczy / okulary) nie tworzy fałszywych zamknięć', () => {
  const eyes = new EyeAnalyzer(OPEN);
  run(eyes, 0, 120, (t) => ({ ...blinkEvery(4, 0.15)(t), blinkBlend: t % 4 < 0.15 ? 0.95 : 0.5 }));
  const r = eyes.blinkRate(120)!;
  assert.ok(r > 13 && r < 17, `rate ${r}`);
  assert.ok(eyes.perclos(120)! < 0.06, `perclos ${eyes.perclos(120)}`);
});

test('mówienie nie zawyża liczby mrugnięć', () => {
  const eyes = new EyeAnalyzer(OPEN);
  // 120 s w ciszy (mrugnięcie co 4 s), potem 60 s mówienia z mruganiem co 2 s
  run(eyes, 0, 120, blinkEvery(4, 0.15));
  run(eyes, 120, 180, (t) => ({ ...blinkEvery(2, 0.15)(t), jawOpen: 0.15 + 0.15 * Math.sin(t * 9) }));
  const r = eyes.blinkRate(180)!;
  assert.ok(r > 13 && r < 17, `rate ${r} (mówienie powinno być pominięte)`);
});

test('ziewnięcie 2 s jest liczone, usta otwarte 10 s (jedzenie, picie) – nie', () => {
  const eyes = new EyeAnalyzer(OPEN);
  run(eyes, 0, 30, (t) => ({ jawOpen: t >= 10 && t < 12 ? 0.8 : 0.05 }));
  assert.equal(eyes.yawns10m(30), 1);
  run(eyes, 30, 60, (t) => ({ jawOpen: t >= 40 && t < 50 ? 0.8 : 0.05 }));
  assert.equal(eyes.yawns10m(60), 1);
});

test('praca przy ekranie (7 mrugnięć/min) to zmęczenie oczu, nie senność', () => {
  const base = { perclos: 0.03, longBlinksPerMin: 0, yawns10m: 0, nods10m: 0, postureAvg15: 90, minutesSinceBreak: 10 };
  assert.ok(fatiguePercent({ ...base, blinkRate: 7 }) < 10);
  const eyes = new EyeAnalyzer(OPEN);
  run(eyes, 0, 120, blinkEvery(60 / 7, 0.15));
  assert.equal(eyes.eyeStrain(120), true);
});

test('skinienia (zerknięcia) nie podnoszą wskaźnika zmęczenia', () => {
  const base = { blinkRate: 16, perclos: 0.03, longBlinksPerMin: 0, yawns10m: 0, postureAvg15: 90, minutesSinceBreak: 10 };
  assert.equal(fatiguePercent({ ...base, nods10m: 0 }), fatiguePercent({ ...base, nods10m: 5 }));
});
