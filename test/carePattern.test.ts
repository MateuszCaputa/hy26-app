import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carePattern } from '../src/core/carePattern';
import type { IssueId, MinuteSample } from '../src/shared/types';

const NOW = new Date(2026, 9, 4, 15, 0, 0).getTime();

interface DayOpts {
  minutes?: number; // minut przy biurku
  issues?: Partial<Record<IssueId, number>>; // sekundy na minutę
  blinkRate?: number | null;
  fatigue?: number | null;
  present?: number;
}

/** Jeden dzień pracy (`dayOffset` 0 = dziś, −1 = wczoraj) od 9:00, każda minuta taka sama. */
function day(dayOffset: number, o: DayOpts = {}): MinuteSample[] {
  const start = new Date(NOW);
  start.setDate(start.getDate() + dayOffset);
  start.setHours(9, 0, 0, 0);
  return Array.from({ length: o.minutes ?? 60 }, (_, i) => ({
    ts: start.getTime() + i * 60e3,
    present: o.present ?? 1,
    posture: 70,
    goodRatio: 0.5,
    fatigue: o.fatigue === undefined ? 20 : o.fatigue,
    blinkRate: o.blinkRate === undefined ? 15 : o.blinkRate,
    perclos: null,
    longBlinks: null,
    yawns: 0,
    issues: o.issues ?? {},
  }));
}

/** `n` dni wstecz od dziś (0, −1, …) z tymi samymi ustawieniami. */
const days = (n: number, o: DayOpts, from = 0) => Array.from({ length: n }, (_, k) => day(-(from + k), o)).flat();

// 60 minut × 30 s = 30 min dziennie: dokładnie na progu.
const NECK_30 = { minutes: 60, issues: { headForward: 30 } };

test('brak danych → brak wzorca', () => {
  assert.deepEqual(carePattern([], NOW), { kind: null, days: 0, evidence: [] });
});

test('szyja: 7 dni po 30 min → karta; 6 dni → nie', () => {
  const r = carePattern(days(7, NECK_30), NOW);
  assert.equal(r.kind, 'neck');
  assert.equal(r.days, 7);
  assert.match(r.evidence[0], /7 z 14 dni, średnio 30 min/);
  assert.equal(carePattern(days(6, NECK_30), NOW).kind, null);
});

test('próg minut: 29 min dziennie się nie liczy', () => {
  const r = carePattern(days(10, { minutes: 58, issues: { headForward: 30 } }), NOW);
  assert.equal(r.kind, null);
});

test('okno 14 dni: dni starsze niż 13 dni wstecz się nie liczą', () => {
  // 4 dni w oknie (dziś … −3) + 5 dni poza nim (−14 … −18).
  const samples = [...days(4, NECK_30), ...days(5, NECK_30, 14)];
  assert.equal(carePattern(samples, NOW).kind, null);
  // Dzień −13 jeszcze w oknie: 6 + 1 = 7.
  assert.equal(carePattern([...days(6, NECK_30), ...day(-13, NECK_30)], NOW).kind, 'neck');
});

test('dominujący problem: plecy, gdy garbienia więcej niż szyi', () => {
  const r = carePattern(days(8, { minutes: 60, issues: { slouch: 40, headForward: 35 } }), NOW);
  assert.equal(r.kind, 'back');
  assert.equal(r.days, 8);
});

test('nieobecność przy biurku się nie liczy', () => {
  assert.equal(carePattern(days(10, { ...NECK_30, present: 0.2 }), NOW).kind, null);
});

test('oczy: rzadkie mruganie albo wysokie zmęczenie ≥ 30 min w 7 dniach', () => {
  assert.equal(carePattern(days(7, { minutes: 30, blinkRate: 7 }), NOW).kind, 'eyes');
  assert.equal(carePattern(days(7, { minutes: 30, blinkRate: null, fatigue: 70 }), NOW).kind, 'eyes');
  // Na granicy, ale po złej stronie: mruganie 8/min i zmęczenie 69%.
  assert.equal(carePattern(days(14, { minutes: 120, blinkRate: 8, fatigue: 69 }), NOW).kind, null);
});

test('kilka wzorców: wygrywa ten z większą liczbą dni, dowody dla wszystkich', () => {
  const samples = [
    ...days(8, { minutes: 60, issues: { headForward: 30 }, blinkRate: 6 }),
    ...days(3, { minutes: 60, blinkRate: 6 }, 8),
  ];
  const r = carePattern(samples, NOW);
  assert.equal(r.kind, 'eyes');
  assert.equal(r.days, 11);
  assert.equal(r.evidence.length, 2);
  assert.match(r.evidence[0], /^Oczy/);
  assert.match(r.evidence[1], /^Szyja/);
});
