import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildStats, localDate } from '../src/core/insights';
import type { MinuteSample } from '../src/shared/types';

const sample = (ts: number, posture: number, fatigue: number | null, blinkRate: number | null, present = 1): MinuteSample => ({
  ts, present, posture, goodRatio: posture >= 80 ? 1 : 0, fatigue, blinkRate, perclos: null, longBlinks: null, yawns: 0, issues: {},
});

/** `n` minut od godziny `hour` danego dnia (0 = dziś, −1 = wczoraj). */
function minutes(now: number, dayOffset: number, hour: number, n: number, posture: number, fatigue: number | null, blink: number | null): MinuteSample[] {
  const start = new Date(now);
  start.setDate(start.getDate() + dayOffset);
  start.setHours(hour, 0, 0, 0);
  return Array.from({ length: n }, (_, i) => sample(start.getTime() + i * 60e3, posture, fatigue, blink));
}

const NOW = new Date(2026, 9, 3, 15, 0, 0).getTime();
const base = { now: NOW, garmin: [], garminConnected: false, breaksToday: 2, alertsToday: 1 };

test('wczoraj: średnie z wczorajszych minut, liczba przerw z wejścia', () => {
  const samples = [...minutes(NOW, -1, 9, 60, 70, 50, 12), ...minutes(NOW, 0, 9, 60, 90, 20, 16)];
  const st = buildStats({ ...base, samples, breaksYesterday: 4 });
  assert.ok(st.yesterday);
  assert.equal(st.yesterday.avgPosture, 70);
  assert.equal(st.yesterday.avgFatigue, 50);
  assert.equal(st.yesterday.avgBlinkRate, 12);
  assert.equal(st.yesterday.goodPercent, 0);
  assert.equal(st.yesterday.presentMinutes, 60);
  assert.equal(st.yesterday.breaksTaken, 4);
  // Dziś liczone jak dotąd.
  assert.equal(st.today.avgPosture, 90);
  assert.equal(st.today.presentMinutes, 60);
});

test('wczoraj bez pracy → null; minuty poza biurkiem się nie liczą', () => {
  assert.equal(buildStats({ ...base, samples: minutes(NOW, 0, 9, 30, 85, 25, 15) }).yesterday, null);
  const away = minutes(NOW, -1, 9, 30, 85, 25, 15).map((s) => ({ ...s, present: 0.2 }));
  assert.equal(buildStats({ ...base, samples: away }).yesterday, null);
});

test('ostatnie 7 dni: od najstarszego do dziś, dni bez pracy puste', () => {
  const samples = [...minutes(NOW, -6, 9, 30, 90, 30, 15), ...minutes(NOW, -1, 9, 30, 70, 60, 12), ...minutes(NOW, 0, 9, 30, 85, 20, 16)];
  const w = buildStats({ ...base, samples }).last7;
  assert.equal(w.length, 7);
  assert.equal(w[6].date, localDate(NOW));
  assert.deepEqual(w.map((d) => d.avgFatigue), [30, null, null, null, null, 60, 20]);
  assert.deepEqual(w.map((d) => d.goodPercent), [100, null, null, null, null, 0, 100]);
  assert.equal(w[0].presentMinutes, 30);
  assert.equal(w[2].presentMinutes, 0);
  assert.equal(w[6].weekday, (new Date(NOW).getDay() + 6) % 7); // dziś
});

test('znaczniki przerw i alertów trafiają do dzisiejszych statystyk', () => {
  const st = buildStats({ ...base, samples: minutes(NOW, 0, 9, 30, 85, 25, 15), breakTimes: [1, 2], alertTimes: [3] });
  assert.deepEqual(st.today.breakTimes, [1, 2]);
  assert.deepEqual(st.today.alertTimes, [3]);
  assert.deepEqual(buildStats({ ...base, samples: [] }).today.breakTimes, []);
});

test('ostatnie 30 dni: średnie dnia, przerwy i alerty policzone per dzień', () => {
  const samples = [...minutes(NOW, -29, 9, 30, 90, 30, 15), ...minutes(NOW, -1, 9, 30, 70, 60, 12), ...minutes(NOW, 0, 9, 30, 85, 20, 16)];
  const at = (dayOffset: number, hour: number) => { const d = new Date(NOW); d.setDate(d.getDate() + dayOffset); d.setHours(hour, 0, 0, 0); return d.getTime(); };
  const m = buildStats({ ...base, samples, breakHistory: [at(-1, 10), at(-1, 11), at(0, 9)], alertHistory: [at(-29, 9)] }).last30;
  assert.equal(m.length, 30);
  assert.equal(m[29].date, localDate(NOW));
  assert.equal(m[0].date, localDate(at(-29, 12)));
  assert.equal(m[0].avgPosture, 90);
  assert.equal(m[0].alerts, 1);
  assert.equal(m[28].avgFatigue, 60);
  assert.equal(m[28].breaks, 2);
  assert.equal(m[29].breaks, 1);
  assert.equal(m[29].day, new Date(NOW).getDate());
  assert.equal(m[15].presentMinutes, 0);
  assert.equal(m[15].goodPercent, null);
});
