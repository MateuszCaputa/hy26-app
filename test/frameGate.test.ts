import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FrameGate } from '../src/core/frameGate';

test('pierwsza grająca klatka jest analizowana', () => {
  const g = new FrameGate();
  assert.equal(g.isFresh({ paused: false, currentTime: 0.033 }), true);
});

test('ta sama klatka drugi raz nie jest analizowana (zatrzymane wideo)', () => {
  const g = new FrameGate();
  assert.equal(g.isFresh({ paused: false, currentTime: 1.0 }), true);
  assert.equal(g.isFresh({ paused: false, currentTime: 1.0 }), false);
  assert.equal(g.isFresh({ paused: false, currentTime: 1.033 }), true);
});

test('wstrzymane wideo nigdy nie daje świeżej klatki', () => {
  const g = new FrameGate();
  assert.equal(g.isFresh({ paused: true, currentTime: 5 }), false);
  assert.equal(g.isFresh({ paused: true, currentTime: 6 }), false);
});

test('reset po ponownym starcie kamery (czas wideo zaczyna od zera)', () => {
  const g = new FrameGate();
  assert.equal(g.isFresh({ paused: false, currentTime: 10 }), true);
  g.reset();
  assert.equal(g.isFresh({ paused: false, currentTime: 0.033 }), true);
});

test('liczy kolejne nieświeże klatki (do wykrycia zamrożenia)', () => {
  const g = new FrameGate();
  g.isFresh({ paused: false, currentTime: 2 });
  for (let i = 0; i < 5; i++) g.isFresh({ paused: false, currentTime: 2 });
  assert.equal(g.staleCount, 5);
  g.isFresh({ paused: false, currentTime: 2.05 });
  assert.equal(g.staleCount, 0);
});
