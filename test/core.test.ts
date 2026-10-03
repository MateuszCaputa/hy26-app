import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeMetrics, lineAngleDeg, type Landmark } from '../src/core/metrics';
import { followPositionRef } from '../src/core/calibration';
import { pickExercise } from '../src/core/coach';
import { evaluateIssues, PostureTracker, rankIssues, scoreFromIssues } from '../src/core/scoring';
import { EyeAnalyzer, FatigueEstimator, fatiguePercent } from '../src/core/fatigue';
import { BreakEngine } from '../src/core/breakEngine';
import { MinuteAggregator, postureSlope } from '../src/core/aggregate';
import { buildStats, hoursToRanges } from '../src/core/insights';
import type { Calibration, MinuteSample } from '../src/shared/types';

const W = 640, H = 480;

/** Syntetyczna sylwetka: dy przesuwa głowę w dół (garbienie), roll obraca linię oczu. */
function body(opts: { headDrop?: number; scale?: number; shoulderDy?: number; roll?: number } = {}): Landmark[] {
  const s = opts.scale ?? 1;
  const cx = 320, shY = 380;
  const lm: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0.1 }));
  const set = (i: number, x: number, y: number) => (lm[i] = { x: x / W, y: y / H, visibility: 0.99 });
  const headY = shY - 150 * s + (opts.headDrop ?? 0);
  const roll = ((opts.roll ?? 0) * Math.PI) / 180;
  const eyeHalf = 30 * s;
  set(0, cx, headY + 25 * s);
  set(2, cx + eyeHalf * Math.cos(roll), headY + eyeHalf * Math.sin(roll)); // lewe oko osoby (prawa strona obrazu)
  set(5, cx - eyeHalf * Math.cos(roll), headY - eyeHalf * Math.sin(roll));
  set(7, cx + 60 * s, headY + 10 * s);
  set(8, cx - 60 * s, headY + 10 * s);
  set(11, cx + 110 * s, shY + (opts.shoulderDy ?? 0));
  set(12, cx - 110 * s, shY - (opts.shoulderDy ?? 0));
  return lm;
}

function calFrom(lm: Landmark[]): Calibration {
  const m = computeMetrics(lm, W, H, 0).metrics!;
  return { createdAt: 0, ...m, earOpen: 0.3 } as Calibration;
}

test('kąt linii jest niezależny od kierunku', () => {
  assert.equal(Math.round(lineAngleDeg(0, 0, 10, 10)), 45);
  assert.equal(Math.round(lineAngleDeg(10, 10, 0, 0)), 45);
  assert.equal(Math.round(lineAngleDeg(0, 0, -10, 0)), 0);
});

test('metryki: brak barków = brak metryk', () => {
  const lm = body();
  lm[11].visibility = 0.1;
  assert.equal(computeMetrics(lm, W, H, 0).metrics, null);
});

test('prosta postawa = 100 pkt, garbienie obniża wynik i wskazuje głowę', () => {
  const cal = calFrom(body());
  const good = computeMetrics(body(), W, H, 0).metrics!;
  assert.equal(scoreFromIssues(evaluateIssues(good, cal)), 100);

  const bad = computeMetrics(body({ headDrop: 45 }), W, H, 0).metrics!;
  const issues = evaluateIssues(bad, cal);
  const score = scoreFromIssues(issues);
  assert.ok(score < 60, `wynik ${score}`);
  const worst = issues.reduce((a, b) => (b.severity > a.severity ? b : a));
  assert.ok(worst.id === 'headForward' || worst.id === 'slouch');
});

test('przechył barków i głowy oraz zbyt bliska twarz', () => {
  const cal = calFrom(body());
  const tilt = evaluateIssues(computeMetrics(body({ shoulderDy: 15 }), W, H, 0).metrics!, cal);
  assert.ok(tilt.find((i) => i.id === 'shoulderTilt')!.severity > 0.5);
  const roll = evaluateIssues(computeMetrics(body({ roll: 15 }), W, H, 0).metrics!, cal);
  assert.ok(roll.find((i) => i.id === 'headTilt')!.severity > 0.5);
  const close = evaluateIssues(computeMetrics(body({ scale: 1.3 }), W, H, 0).metrics!, cal);
  assert.ok(close.find((i) => i.id === 'tooClose')!.severity >= 1);
  // Zbliżenie się do kamery nie powinno udawać garbienia (metryki są względne).
  assert.ok(close.find((i) => i.id === 'headForward')!.severity < 0.2);
});

test('odchylenie tułowia w bok to przechył barków, nie wysunięta głowa', () => {
  const cal = calFrom(body());
  // Cała górna część ciała obrócona o 25° wokół bioder (ok. 200 px pod barkami).
  const lean = (deg: number): Landmark[] => {
    const a = (deg * Math.PI) / 180;
    const px = 320 / W, py = 580 / H;
    return body().map((l) => {
      const dx = (l.x - px) * W, dy = (l.y - py) * H;
      return { ...l, x: px + (dx * Math.cos(a) - dy * Math.sin(a)) / W, y: py + (dx * Math.sin(a) + dy * Math.cos(a)) / H };
    });
  };
  const issues = evaluateIssues(computeMetrics(lean(25), W, H, 0).metrics!, cal);
  const sev = (id: string) => issues.find((i) => i.id === id)!.severity;
  assert.equal(sev('headForward'), 0);
  assert.equal(sev('slouch'), 0);
  assert.ok(sev('shoulderTilt') > 0.5);
});

test('odchylenie głowy do tyłu (broda w górę) to osobny problem, nie wysunięcie', () => {
  const cal = { ...calFrom(body()), headPitchDeg: 0 };
  const m = { ...computeMetrics(body(), W, H, 0).metrics!, headPitchDeg: -22 };
  const issues = evaluateIssues(m, cal);
  const sev = (id: string) => issues.find((i) => i.id === id)!.severity;
  assert.ok(sev('headBack') > 0.5);
  assert.equal(sev('headForward'), 0);
  // Pochylenie w dół nie jest odchyleniem do tyłu.
  assert.equal(evaluateIssues({ ...m, headPitchDeg: 20 }, cal).find((i) => i.id === 'headBack')!.severity, 0);
});

test('uniesione barki to nie wysunięta głowa; oba problemy naraz są widoczne', () => {
  const cal = calFrom(body());
  // Barki w górę o 30 px, głowa w miejscu.
  const shrugLm = body();
  for (const i of [11, 12]) shrugLm[i] = { ...shrugLm[i], y: shrugLm[i].y - 30 / H };
  const shrug = evaluateIssues(computeMetrics(shrugLm, W, H, 0).metrics!, cal);
  const sev = (r: typeof shrug, id: string) => r.find((i) => i.id === id)!.severity;
  assert.ok(sev(shrug, 'shrug') > 0.5);
  assert.equal(sev(shrug, 'headForward'), 0);
  assert.equal(sev(shrug, 'slouch'), 0);

  // Głowa w dół o 45 px, barki w miejscu: wysunięta głowa, nie barki.
  const head = evaluateIssues(computeMetrics(body({ headDrop: 45 }), W, H, 0).metrics!, cal);
  assert.ok(sev(head, 'headForward') > 0.5);
  assert.equal(sev(head, 'shrug'), 0);

  // Barki w górę i głowa w dół jednocześnie: ranking zwraca oba problemy.
  const both = body({ headDrop: 40 });
  for (const i of [11, 12]) both[i] = { ...both[i], y: both[i].y - 30 / H };
  const r = evaluateIssues(computeMetrics(both, W, H, 0).metrics!, cal);
  const ranked = rankIssues(Object.fromEntries(r.map((i) => [i.id, i.severity])));
  assert.ok(ranked.includes('shrug') && ranked.includes('headForward'), ranked.join(','));
});

test('stara kalibracja bez położeń uzupełnia je sama przy prostej postawie i rozróżnia uniesione barki', () => {
  const { noseY: _n, shoulderY: _s, ...old } = calFrom(body());
  const cal: Calibration = old;
  const up = (lm: Landmark[], px: number) => lm.map((l, i) => (i === 11 || i === 12 ? { ...l, y: l.y - px / H } : l));
  // Uniesione barki nie mogą ustawić punktu odniesienia (szyja skrócona).
  followPositionRef(cal, computeMetrics(up(body(), 30), W, H, 0).metrics!, 0.1);
  assert.equal(cal.noseY, undefined);
  // Prosta postawa: uzupełnia.
  followPositionRef(cal, computeMetrics(body(), W, H, 0).metrics!, 0.1);
  assert.ok(cal.noseY != null && cal.shoulderY != null);
  const sev = evaluateIssues(computeMetrics(up(body(), 30), W, H, 0).metrics!, cal);
  assert.ok(sev.find((i) => i.id === 'shrug')!.severity > 0.5);
  assert.equal(sev.find((i) => i.id === 'headForward')!.severity, 0);
});

test('alert dopiero po 30 s złej postawy, z odstępem i histerezą', () => {
  const cal = calFrom(body());
  const tr = new PostureTracker(cal, { sensitivity: 1, alertDelaySec: 30, alertCooldownMin: 5 });
  const bad = computeMetrics(body({ headDrop: 50 }), W, H, 0).metrics!;
  const good = computeMetrics(body(), W, H, 0).metrics!;
  let alerts = 0;
  let t = 0;
  for (; t < 20; t += 0.2) tr.update(t, good);
  for (; t < 60; t += 0.2) if (tr.update(t, bad).alert) alerts++;
  assert.equal(alerts, 1);
  // Chwilowa poprawa i powrót: brak nowego alertu (odstęp 5 min).
  for (; t < 70; t += 0.2) tr.update(t, good);
  for (; t < 140; t += 0.2) if (tr.update(t, bad).alert) alerts++;
  assert.equal(alerts, 1);
  // Po 5 min i poprawie – może pojawić się kolejny.
  for (; t < 420; t += 0.2) tr.update(t, good);
  for (; t < 480; t += 0.2) if (tr.update(t, bad).alert) alerts++;
  assert.equal(alerts, 2);
});

test('krótkie sięgnięcie po kubek nie wywołuje alertu', () => {
  const cal = calFrom(body());
  const tr = new PostureTracker(cal, { sensitivity: 1, alertDelaySec: 30, alertCooldownMin: 5 });
  const bad = computeMetrics(body({ headDrop: 60 }), W, H, 0).metrics!;
  const good = computeMetrics(body(), W, H, 0).metrics!;
  let alerts = 0;
  for (let t = 0; t < 600; t += 0.2) {
    const m = t % 60 < 4 ? bad : good;
    if (tr.update(t, m).alert) alerts++;
  }
  assert.equal(alerts, 0);
});

test('nieobecność > 3 s = stan absent', () => {
  const cal = calFrom(body());
  const tr = new PostureTracker(cal, { sensitivity: 1, alertDelaySec: 30, alertCooldownMin: 5 });
  tr.update(0, computeMetrics(body(), W, H, 0).metrics!);
  assert.equal(tr.update(2, null).state, 'good');
  assert.equal(tr.update(5, null).state, 'absent');
});

test('wynik zawsze całkowity, także przy chwilowej utracie sylwetki', () => {
  const cal = calFrom(body());
  const tr = new PostureTracker(cal, { sensitivity: 1, alertDelaySec: 30, alertCooldownMin: 5 });
  let t = 0;
  for (; t < 5; t += 0.2) tr.update(t, computeMetrics(body(), W, H, t).metrics!);
  for (; t < 6.3; t += 0.1) tr.update(t, computeMetrics(body({ headDrop: 40 }), W, H, t).metrics!); // wygładzanie w połowie drogi
  const lost = tr.update(t + 0.5, null);
  assert.notEqual(lost.score, null);
  assert.ok(Number.isInteger(lost.score), `score ${lost.score}`);
});

/** Symulacja oczu: 30 kl./s, mrugnięcie co `every` s trwające `dur` s. */
function simulateEyes(sec: number, every: number, dur: number, extra?: (t: number) => number | null) {
  const eyes = new EyeAnalyzer(0.3);
  for (let t = 0; t < sec; t += 1 / 30) {
    const phase = t % every;
    let ear = phase < dur ? 0.06 : 0.3;
    const e = extra?.(t);
    if (e !== undefined && e !== null) ear = e;
    eyes.update(t, { ear, blinkBlend: null, jawOpen: 0.05 });
  }
  return eyes;
}

test('częstość mrugnięć ~15/min', () => {
  const eyes = simulateEyes(120, 4, 0.15);
  const rate = eyes.blinkRate(120)!;
  assert.ok(rate > 13 && rate < 17, `rate ${rate}`);
  const p = eyes.perclos(120)!;
  assert.ok(p > 0.01 && p < 0.06, `perclos ${p}`);
});

test('długie zamknięcia liczą się jako długie mrugnięcia i podnoszą PERCLOS', () => {
  const eyes = simulateEyes(120, 6, 0.8);
  assert.ok(eyes.longBlinksPerMin(120)! >= 1.5);
  assert.ok(eyes.perclos(120)! > 0.1);
});

test('patrzenie w dół > 3 s nie zawyża PERCLOS', () => {
  const eyes = simulateEyes(120, 4, 0.15, (t) => (t % 30 < 6 ? 0.07 : null));
  assert.ok(eyes.perclos(120)! < 0.06, `perclos ${eyes.perclos(120)}`);
});

test('wskaźnik zmęczenia: świeży vs zmęczony', () => {
  const fresh = fatiguePercent({ blinkRate: 16, perclos: 0.03, longBlinksPerMin: 0, yawns10m: 0, nods10m: 0, postureAvg15: 90, minutesSinceBreak: 10 });
  // 3/min = „gapienie się” (5–7/min przy ekranie to norma, nie senność – BADANIE-OCZU).
  const tired = fatiguePercent({ blinkRate: 3, perclos: 0.18, longBlinksPerMin: 2, yawns10m: 2, nods10m: 1, postureAvg15: 55, minutesSinceBreak: 80 });
  assert.ok(fresh < 10, `fresh ${fresh}`);
  assert.ok(tired > 70, `tired ${tired}`);
  // Bez danych z twarzy wagi rozkładają się na resztę.
  const noFace = fatiguePercent({ blinkRate: null, perclos: null, longBlinksPerMin: null, yawns10m: 0, nods10m: 0, postureAvg15: 60, minutesSinceBreak: 90 });
  assert.ok(noFace > 40);
});

test('estymator zmęczenia wygładza wynik', () => {
  const eyes = simulateEyes(90, 4, 0.15);
  const est = new FatigueEstimator();
  const a = est.update(90, eyes, { postureAvg15: 90, minutesSinceBreak: 5 });
  assert.ok(a);
  assert.equal(a.level, 'fresh');
  assert.ok(a.faceReliable);
});

test('przerwy: oczy po 20 min, mikro po 30, ruch po 55', () => {
  const be = new BreakEngine({ eyeBreakMin: 20, microBreakMin: 30, moveBreakMin: 55 }, 0);
  const inp = { present: true, absentSec: 0, fatiguePercent: 10, postureSlope: 0, recentIssue: null };
  const got: string[] = [];
  for (let t = 0; t <= 56 * 60; t += 1) {
    const s = be.update(t, inp);
    if (s) {
      got.push(`${s.kind}@${Math.round(t / 60)}`);
      be.done(s.kind, t);
    }
  }
  assert.deepEqual(got, ['eye@20', 'micro@30', 'eye@50', 'move@55']);
});

test('odejście od biurka na > 2 min liczy się jako przerwa', () => {
  const be = new BreakEngine({ eyeBreakMin: 20, microBreakMin: 30, moveBreakMin: 55 }, 0);
  const here = { present: true, absentSec: 0, fatiguePercent: 10, postureSlope: 0, recentIssue: null };
  for (let t = 0; t < 1100; t++) be.update(t, here);
  for (let t = 1100; t < 1300; t++) be.update(t, { ...here, present: false, absentSec: t - 1100 });
  assert.equal(be.update(1300, here), null);
  assert.ok(be.minutesSinceBreak(1300) < 0.1);
});

test('3 alerty w 15 min → mikroprzerwa; wysokie zmęczenie → ruch', () => {
  const be = new BreakEngine({ eyeBreakMin: 60, microBreakMin: 60, moveBreakMin: 90 }, 0);
  const here = { present: true, absentSec: 0, fatiguePercent: 10, postureSlope: 0, recentIssue: 'slouch' as const };
  for (let t = 0; t < 600; t++) be.update(t, here);
  be.registerAlert(400); be.registerAlert(500); be.registerAlert(590);
  const s = be.update(600, here)!;
  assert.equal(s.kind, 'micro');
  assert.equal(s.reason, 'alerts');
  be.done('micro', 600);
  for (let t = 601; t < 1600; t++) be.update(t, here);
  const f = be.update(1600, { ...here, fatiguePercent: 75 })!;
  assert.equal(f.kind, 'move');
  assert.equal(f.reason, 'fatigue');
});

test('agregacja minutowa i trend', () => {
  const agg = new MinuteAggregator();
  const out: MinuteSample[] = [];
  const t0 = Date.UTC(2026, 9, 5, 8, 0, 0);
  for (let ms = t0; ms < t0 + 20 * 60000; ms += 500) {
    const minute = Math.floor((ms - t0) / 60000);
    const score = 95 - minute * 2;
    const s = agg.add(ms, { present: true, score, state: score >= 80 ? 'good' : 'warn', severities: { slouch: minute > 10 ? 0.6 : 0.1 }, fatigue: null });
    if (s) out.push(s);
  }
  assert.equal(out.length, 19);
  assert.equal(out[0].posture, 95);
  assert.ok(out[15].issues.slouch! > 50);
  const slope = postureSlope(out)!;
  assert.ok(Math.abs(slope + 2) < 0.1, `slope ${slope}`);
});

test('zakresy godzin i statystyki', () => {
  assert.equal(hoursToRanges([9, 10, 15]), '9–11, 15–16');
  const samples: MinuteSample[] = [];
  const base = new Date(2026, 9, 1, 0, 0, 0).getTime();
  for (let d = 0; d < 5; d++) {
    for (let h = 8; h < 17; h++) {
      for (let m = 0; m < 60; m++) {
        const good = h >= 9 && h < 11;
        const dip = h === 13;
        samples.push({
          ts: base + d * 864e5 + h * 3600e3 + m * 60e3,
          present: 1,
          posture: good ? 92 : dip ? 60 : 78,
          goodRatio: good ? 1 : 0.4,
          fatigue: good ? 10 : dip ? 60 : 30,
          blinkRate: 14,
          perclos: 0.03,
          longBlinks: 0,
          yawns: 0,
          issues: dip ? { slouch: 40 } : {},
          kb: 50,
          mouse: 30,
        });
      }
    }
  }
  const st = buildStats({ now: base + 4 * 864e5 + 17 * 3600e3, samples, breaksToday: 3, alertsToday: 2 });
  assert.equal(st.bestHours, '9–11');
  assert.match(st.dipText!, /13:00/);
  assert.equal(st.daysOfData, 5);
  assert.equal(st.weekTopIssue, 'slouch');
  assert.ok(st.heatmap.length > 0);
  assert.equal(st.today.presentMinutes, 540);
});

test('pickExercise działa z ułamkowym ziarnem (ręczne „Zrób przerwę” bez propozycji)', () => {
  for (const kind of ['eye', 'micro', 'move'] as const) {
    for (const seed of [0, 1.5, 29812345.67, Date.now() / 6e4]) {
      assert.equal(typeof pickExercise(kind, null, seed), 'string');
      assert.equal(typeof pickExercise(kind, 'shrug', seed), 'string');
    }
  }
});

test('pickExercise z `avoid` nie powtarza ostatniego ćwiczenia', () => {
  for (const kind of ['micro', 'move'] as const) {
    let last: string | null = null;
    for (let i = 0; i < 50; i++) {
      const id = pickExercise(kind, 'shrug', Math.random() * 1e6, last);
      assert.notEqual(id, last);
      last = id;
    }
  }
});

test('pickExercise daje różne ćwiczenia, nie tylko te pasujące do problemu', () => {
  const seen = new Set<string>();
  let last: string | null = null;
  for (let i = 0; i < 200; i++) {
    last = pickExercise('micro', 'headForward', Math.random() * 1e6, last);
    seen.add(last);
  }
  // Wszystkie 6 mikroprzerw (bez 20-20-20 i „Przejdź się”).
  assert.deepEqual([...seen].sort(), ['blade-squeeze', 'chest-opener', 'chin-tuck', 'neck-side', 'seated-twist', 'shrugs']);
});

