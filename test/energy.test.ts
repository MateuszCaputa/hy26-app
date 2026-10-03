import { test } from 'node:test';
import assert from 'node:assert/strict';
import { energyPercent, minutesUntilLow, type EnergyPoint } from '../src/core/energy';

test('świeża osoba w dobrej postawie, tuż po przerwie = pełna bateria', () => {
  assert.equal(energyPercent({ fatiguePercent: 0, postureAvg15: 95, minutesSinceBreak: 5, morningBodyBattery: null }), 100);
});

test('zmęczenie, słaba postawa i długo bez przerwy = niska bateria', () => {
  const e = energyPercent({ fatiguePercent: 80, postureAvg15: 50, minutesSinceBreak: 90, morningBodyBattery: 20 });
  assert.ok(e < 30, `bateria ${e}`);
});

test('każda składowa obniża baterię, a brak zegarka nie zaniża wyniku', () => {
  const base = { fatiguePercent: 20, postureAvg15: 85, minutesSinceBreak: 10, morningBodyBattery: null };
  const b = energyPercent(base);
  assert.ok(energyPercent({ ...base, fatiguePercent: 60 }) < b);
  assert.ok(energyPercent({ ...base, postureAvg15: 60 }) < b);
  assert.ok(energyPercent({ ...base, minutesSinceBreak: 70 }) < b);
  assert.ok(energyPercent({ ...base, morningBodyBattery: 100 }) >= b - 1);
  assert.ok(energyPercent({ ...base, morningBodyBattery: 10 }) < b);
});

test('bez danych z twarzy bateria liczy się z postawy i czasu', () => {
  const e = energyPercent({ fatiguePercent: null, postureAvg15: 90, minutesSinceBreak: 0, morningBodyBattery: null });
  assert.equal(e, 100);
});

const line = (start: number, slope: number, n = 20): EnergyPoint[] => Array.from({ length: n }, (_, i) => ({ min: i, energy: start + slope * i }));

test('prognoza: spadek 1 pkt/min z 70% → ok. 21 min do 30% (licząc od ostatniego pomiaru)', () => {
  const m = minutesUntilLow(line(70, -1));
  assert.ok(m !== null && Math.abs(m - 21) <= 1, `minuty ${m}`);
});

test('prognoza: stabilnie, rośnie, za mało danych albo zbyt daleko = brak prognozy', () => {
  assert.equal(minutesUntilLow(line(70, 0)), null);
  assert.equal(minutesUntilLow(line(50, 0.5)), null);
  assert.equal(minutesUntilLow(line(70, -1, 5)), null);
  assert.equal(minutesUntilLow(line(95, -0.15)), null); // > 3 h
});

test('prognoza: już poniżej 30% = brak prognozy (komunikat o niskim poziomie wystarcza)', () => {
  assert.equal(minutesUntilLow(line(40, -1)), null);
});
