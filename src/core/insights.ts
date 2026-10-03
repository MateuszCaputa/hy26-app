// Statystyki i wnioski: wskaźnik formy, mapa godzin, najlepsze godziny, wpływ snu (Garmin).
import type { GarminDay, IssueId, MinuteSample, StatsPayload } from '../shared/types';
import { topIssueOf } from './aggregate';

const FORM_W = { fatigue: 0.45, posture: 0.35, activity: 0.2 };

export const localDate = (ms: number): string => {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** Poniedziałek = 0 … niedziela = 6. */
export const weekdayMon0 = (ms: number): number => (new Date(ms).getDay() + 6) % 7;

function percentile(values: number[], q: number): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
}

/** Próg „pełnej” aktywności: 90. percentyl zdarzeń klawiatury i myszy na minutę. */
export function activityReference(samples: MinuteSample[]): number | null {
  const v = samples.filter((s) => s.kb !== undefined && s.present >= 0.5).map((s) => (s.kb ?? 0) + (s.mouse ?? 0));
  const p = percentile(v.filter((x) => x > 0), 0.9);
  return p && p > 0 ? p : null;
}

/** Wskaźnik formy jednej minuty 0–100 (null, gdy osoby nie było przy biurku). */
export function formScore(s: MinuteSample, actRef: number | null): number | null {
  if (s.present < 0.5 || s.posture === null) return null;
  let sum = FORM_W.posture * s.posture;
  let w = FORM_W.posture;
  if (s.fatigue !== null) {
    sum += FORM_W.fatigue * (100 - s.fatigue);
    w += FORM_W.fatigue;
  }
  if (actRef && s.kb !== undefined) {
    sum += FORM_W.activity * Math.min(100, (100 * ((s.kb ?? 0) + (s.mouse ?? 0))) / actRef);
    w += FORM_W.activity;
  }
  return sum / w;
}

const avg = (xs: number[]): number | null => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** Łączy sąsiednie godziny w zakresy: [9,10,15] → "9–11, 15–16". */
export function hoursToRanges(hours: number[]): string {
  const s = [...new Set(hours)].sort((a, b) => a - b);
  const out: string[] = [];
  let start = s[0];
  let prev = s[0];
  for (let i = 1; i <= s.length; i++) {
    if (i < s.length && s[i] === prev + 1) {
      prev = s[i];
      continue;
    }
    out.push(`${start}–${prev + 1}`);
    start = s[i];
    prev = s[i];
  }
  return out.join(', ');
}

export interface HourProfile {
  hour: number;
  form: number;
  minutes: number;
}

export function hourProfile(samples: MinuteSample[], actRef: number | null, minMinutes = 20): HourProfile[] {
  const by = new Map<number, number[]>();
  for (const s of samples) {
    const f = formScore(s, actRef);
    if (f === null) continue;
    const h = new Date(s.ts).getHours();
    if (!by.has(h)) by.set(h, []);
    by.get(h)!.push(f);
  }
  return [...by.entries()]
    .filter(([, v]) => v.length >= minMinutes)
    .map(([hour, v]) => ({ hour, form: avg(v)!, minutes: v.length }))
    .sort((a, b) => a.hour - b.hour);
}

export function bestHoursText(profile: HourProfile[]): { best: string | null; dip: string | null } {
  if (profile.length < 3) return { best: null, dip: null };
  const max = Math.max(...profile.map((p) => p.form));
  const min = Math.min(...profile.map((p) => p.form));
  const best = profile.filter((p) => p.form >= max - 4).map((p) => p.hour);
  let dip: string | null = null;
  if (max - min >= 8) {
    const low = profile.find((p) => p.form === min)!;
    dip = `spadek formy ok. ${low.hour}:00–${low.hour + 1}:00 (o ${Math.round(max - min)} pkt niżej niż w najlepszej godzinie)`;
  }
  return { best: hoursToRanges(best), dip };
}

/** Wpływ snu na formę: dni po krótkiej vs długiej nocy (min. 5 dni z danymi). */
export function sleepInsight(samples: MinuteSample[], garmin: GarminDay[], actRef: number | null): string | null {
  const daily = new Map<string, number[]>();
  for (const s of samples) {
    const f = formScore(s, actRef);
    if (f === null) continue;
    const d = localDate(s.ts);
    if (!daily.has(d)) daily.set(d, []);
    daily.get(d)!.push(f);
  }
  const pairs = garmin
    .filter((g) => g.sleepHours !== null && (daily.get(g.date)?.length ?? 0) >= 60)
    .map((g) => ({ sleep: g.sleepHours as number, bb: g.bodyBatteryHigh, form: avg(daily.get(g.date)!)! }));
  if (pairs.length < 5) return null;
  const short = pairs.filter((p) => p.sleep < 6.5).map((p) => p.form);
  const long = pairs.filter((p) => p.sleep >= 7).map((p) => p.form);
  if (short.length >= 2 && long.length >= 2) {
    const a = avg(short)!;
    const b = avg(long)!;
    const diff = Math.round(((b - a) / b) * 100);
    if (Math.abs(diff) >= 3) {
      return diff > 0
        ? `Po nocach krótszych niż 6,5 h Twoja forma przy biurku była średnio o ${diff}% niższa niż po co najmniej 7 h snu.`
        : `Długość snu nie obniża wyraźnie Twojej formy (różnica ${Math.abs(diff)}%).`;
    }
  }
  const withBB = pairs.filter((p) => p.bb !== null);
  if (withBB.length >= 5) {
    const sorted = [...withBB].sort((x, y) => (x.bb as number) - (y.bb as number));
    const half = Math.floor(sorted.length / 2);
    const lo = avg(sorted.slice(0, half).map((p) => p.form))!;
    const hi = avg(sorted.slice(half).map((p) => p.form))!;
    const diff = Math.round(((hi - lo) / hi) * 100);
    if (diff >= 3) return `W dni z niższym Body Battery rano forma była średnio o ${diff}% niższa.`;
  }
  return 'Na razie sen nie wpływa wyraźnie na Twoją formę przy biurku.';
}

export interface InsightInput {
  now: number;
  samples: MinuteSample[]; // np. ostatnie 28 dni
  garmin: GarminDay[];
  garminConnected: boolean;
  breaksToday: number;
  alertsToday: number;
}

export function buildStats(i: InsightInput): StatsPayload {
  const today = localDate(i.now);
  const todays = i.samples.filter((s) => localDate(s.ts) === today);
  const present = todays.filter((s) => s.present >= 0.5);
  const actRef = activityReference(i.samples);

  const goodVals = present.filter((s) => s.goodRatio !== null).map((s) => s.goodRatio as number);
  const goodPercent = goodVals.length ? Math.round(avg(goodVals)! * 100) : null;
  const r = (v: number | null) => (v === null ? null : Math.round(v));

  // Mapa: dzień tygodnia × godzina.
  const cells = new Map<string, number[]>();
  for (const s of i.samples) {
    const f = formScore(s, actRef);
    if (f === null) continue;
    const key = `${weekdayMon0(s.ts)}-${new Date(s.ts).getHours()}`;
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key)!.push(f);
  }
  const heatmap = [...cells.entries()]
    .filter(([, v]) => v.length >= 10)
    .map(([k, v]) => {
      const [weekday, hour] = k.split('-').map(Number);
      return { weekday, hour, form: Math.round(avg(v)!), minutes: v.length };
    });

  const days = new Set(i.samples.filter((s) => s.present >= 0.5).map((s) => localDate(s.ts)));
  const { best, dip } = bestHoursText(hourProfile(i.samples, actRef));

  const weekAgo = i.now - 7 * 864e5;
  const week = i.samples.filter((s) => s.ts >= weekAgo);
  const sums: Partial<Record<IssueId, number>> = {};
  let total = 0;
  for (const s of week) for (const [k, v] of Object.entries(s.issues) as [IssueId, number][]) {
    sums[k] = (sums[k] ?? 0) + v;
    total += v;
  }
  const weekIssueShare: Partial<Record<IssueId, number>> = {};
  if (total > 0) for (const [k, v] of Object.entries(sums) as [IssueId, number][]) weekIssueShare[k] = Math.round((v / total) * 100);

  const sortedG = [...i.garmin].sort((a, b) => b.date.localeCompare(a.date));

  return {
    today: {
      minutes: todays,
      goodPercent,
      avgPosture: r(avg(present.filter((s) => s.posture !== null).map((s) => s.posture as number))),
      avgFatigue: r(avg(present.filter((s) => s.fatigue !== null).map((s) => s.fatigue as number))),
      avgBlinkRate: (() => {
        const v = avg(present.filter((s) => s.blinkRate !== null).map((s) => s.blinkRate as number));
        return v === null ? null : Math.round(v * 10) / 10;
      })(),
      breaksTaken: i.breaksToday,
      alerts: i.alertsToday,
      presentMinutes: present.length,
      topIssue: topIssueOf(todays),
    },
    heatmap,
    bestHours: best,
    dipText: dip,
    daysOfData: days.size,
    weekTopIssue: topIssueOf(week),
    weekIssueShare,
    garmin: {
      connected: i.garminConnected,
      lastNight: sortedG.find((g) => g.date === today) ?? sortedG[0] ?? null,
      insight: i.garminConnected ? sleepInsight(i.samples, i.garmin, actRef) : null,
    },
  };
}
