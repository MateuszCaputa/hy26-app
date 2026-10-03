import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BreakEngine } from '../src/core/breakEngine';

const cfg = { eyeBreakMin: 20, microBreakMin: 30, moveBreakMin: 55 };
const here = { present: true, absentSec: 0, fatiguePercent: 10, postureSlope: 0, recentIssue: null };

/** Siedzi od 0 do `leave`, nie ma go przez `awaySec`, wraca. Zwraca silnik i czas powrotu. */
function leaveFor(leave: number, awaySec: number): { be: BreakEngine; back: number } {
  const be = new BreakEngine(cfg, 0);
  for (let t = 0; t < leave; t++) be.update(t, here);
  for (let t = leave; t < leave + awaySec; t++) be.update(t, { ...here, present: false, absentSec: t - leave });
  const back = leave + awaySec;
  be.update(back, here);
  return { be, back };
}

test('odejście ≥ 2 min → przerwa ruchowa do zaliczenia, raz', () => {
  const { be } = leaveFor(600, 300);
  const b = be.takeAwayBreak();
  assert.ok(b);
  assert.equal(b.kind, 'move');
  assert.ok(b.awaySec >= 299 && b.awaySec <= 301, `awaySec ${b.awaySec}`);
  assert.equal(be.takeAwayBreak(), null, 'zgłaszana tylko raz');
});

test('odejście 20 s – 2 min → przerwa dla oczu; < 20 s → nic', () => {
  assert.equal(leaveFor(600, 60).be.takeAwayBreak()?.kind, 'eye');
  assert.equal(leaveFor(600, 10).be.takeAwayBreak(), null);
});

test('po przerwie z odejścia czas od przerwy liczy się od powrotu', () => {
  const { be, back } = leaveFor(40 * 60, 180);
  assert.ok(be.minutesSinceBreak(back) < 0.1);
});

test('przerwa z odejścia kasuje wiszącą propozycję przerwy', () => {
  const be = new BreakEngine(cfg, 0);
  let t = 0;
  for (; t <= 20 * 60; t++) be.update(t, here); // o 20. minucie: propozycja przerwy dla oczu
  assert.ok(be.pendingSuggestion);
  const leave = t;
  for (; t < leave + 150; t++) be.update(t, { ...here, present: false, absentSec: t - leave });
  be.update(t, here);
  assert.equal(be.takeAwayBreak()?.kind, 'move');
  assert.equal(be.pendingSuggestion, null);
});
