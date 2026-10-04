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

test('trzepotanie / mrużenie 0,6 s bez pełnego zamknięcia to mrugnięcie, nie „długie”', () => {
  const eyes = new EyeAnalyzer(OPEN);
  // EAR 0,17 przy wzorcu 0,3 → zamknięcie ok. 0,67: ponad progiem mrugnięcia, ale oko nie jest zamknięte
  run(eyes, 0, 120, (t) => ({ ear: t % 6 < 0.6 ? 0.17 : OPEN }));
  const d = eyes.debug(120);
  assert.equal(d.longTotal, 0, `długie ${d.longTotal}`);
  assert.ok(d.blinksTotal >= 18, `mrugnięcia ${d.blinksTotal}`);
});

test('płytkie mrugnięcie w okularach (zamknięcie ok. 0,59) jest liczone', () => {
  const eyes = new EyeAnalyzer(0.342);
  // EAR 0,211 przy wzorcu 0,342 → zamknięcie ≈ 0,59 (zrzut z testu na żywo)
  run(eyes, 0, 120, (t) => ({ ear: t % 4 < 0.12 ? 0.211 : 0.342 }));
  const r = eyes.blinkRate(120)!;
  assert.ok(r > 13 && r < 17, `rate ${r}`);
});

test('prawdziwie zamknięte oczy przez 1 s to nadal długie mrugnięcie', () => {
  const eyes = new EyeAnalyzer(OPEN);
  run(eyes, 0, 120, (t) => (t % 10 < 1 ? { ear: CLOSED } : {}));
  assert.ok(eyes.debug(120).longTotal >= 10);
});

test('zawyżona kalibracja (EAR 0,56 przy prawdziwym 0,29) sama się koryguje – licznik nie stoi na zerze', () => {
  const eyes = new EyeAnalyzer(0.56); // zrzut z 23:04: wzorzec 0,479 = 0,56 × 0,85
  run(eyes, 0, 120, (t) => ({ ear: t % 4 < 0.15 ? 0.06 : 0.29 }));
  const d = eyes.debug(120);
  assert.ok(Math.abs(d.earRef! - 0.29) < 0.02, `wzorzec ${d.earRef}`);
  const r = eyes.blinkRate(120)!;
  assert.ok(r > 13 && r < 17, `rate ${r}`);
});

test('mruganie raz na sekundę daje ok. 60/min', () => {
  const eyes = new EyeAnalyzer(OPEN);
  run(eyes, 0, 180, blinkEvery(1, 0.12));
  const r = eyes.blinkRate(180)!;
  assert.ok(r > 55 && r < 65, `rate ${r}`);
});

test('dłuższe pochylenie głowy (garbienie) nie wyłącza liczenia mrugnięć – tylko krótkie zerknięcia', () => {
  const eyes = new EyeAnalyzer(OPEN);
  eyes.setCalibratedPitch(0);
  run(eyes, 0, 60, blinkEvery(4, 0.15));
  const before = eyes.debug(60).blinksTotal;
  // potem 120 s z głową stale 20° niżej (garbienie / laptop niżej)
  run(eyes, 60, 180, (t) => ({ ...blinkEvery(4, 0.15)(t), pitchDeg: 20 }));
  const counted = eyes.debug(180).blinksTotal - before;
  assert.ok(counted >= 25, `zliczone ${counted}/30`);
});

test('płytkie mrugnięcia (punkty powiek domykają się tylko do ok. 0,45) są liczone dzięki progowi dopasowanemu do osoby', () => {
  const eyes = new EyeAnalyzer(OPEN);
  // EAR 0,19 przy wzorcu 0,3 → zamknięcie ok. 0,56 na starcie, ale realnie model „domyka” mniej: 0,21 → ok. 0,46
  run(eyes, 0, 180, (t) => ({ ear: t % 3 < 0.15 ? 0.21 : OPEN }));
  const d = eyes.debug(180);
  assert.ok(d.closeOn < 0.46, `próg ${d.closeOn}`);
  const r = eyes.blinkRate(180)!;
  assert.ok(r > 17 && r < 23, `rate ${r}`);
});

test('ziewanie z nagrania na żywo: długie z przymknięciem w środku liczy się raz, w sumie 3', () => {
  // Profil otwarcia szczęki jak w teście na żywo (30 kl./s): ziewnięcie 6,3 s z przymknięciem do 0,41 w połowie,
  // potem dwa ziewnięcia po ~4 s z pełnym zamknięciem ust między nimi.
  const e = new EyeAnalyzer(0.3);
  const segs: [number, number][] = [
    [2, 0.05], [2.5, 0.8], [0.3, 0.41], [3.5, 0.62], [0.8, 0.02], // ziewnięcie 1 (6,3 s otwarcia)
    [4, 0.6], [1.3, 0.0], // ziewnięcie 2
    [4, 0.67], [2, 0.01], // ziewnięcie 3
  ];
  let t = 0;
  for (const [sec, jaw] of segs) {
    for (let i = 0; i < sec * 30; i++, t += 1 / 30) e.update(t, { ear: 0.28, blinkBlend: 0.1, jawOpen: jaw });
  }
  assert.equal(e.yawns10m(t), 3);
});

test('mówienie (szczęka w ruchu, ale nisko) to nie ziewnięcie', () => {
  const e = new EyeAnalyzer(0.3);
  let t = 0;
  for (let i = 0; i < 30 * 20; i++, t += 1 / 30) e.update(t, { ear: 0.28, blinkBlend: 0.1, jawOpen: 0.1 + 0.25 * Math.abs(Math.sin(i / 3)) });
  assert.equal(e.yawns10m(t), 0);
});
