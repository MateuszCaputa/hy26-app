// Lokalna baza SQLite (wbudowany moduł node:sqlite – bez natywnych zależności).
import { DatabaseSync } from 'node:sqlite';
import type { Calibration, GarminDay, MinuteSample, Settings } from '../shared/types';
import { DEFAULT_SETTINGS } from '../shared/types';

export class Store {
  private db: DatabaseSync;

  constructor(file: string) {
    this.db = new DatabaseSync(file);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS minutes (
        ts INTEGER PRIMARY KEY,
        present REAL, posture REAL, good_ratio REAL, fatigue REAL,
        blink_rate REAL, perclos REAL, long_blinks REAL, yawns INTEGER,
        kb INTEGER, mouse INTEGER, issues TEXT
      );
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts INTEGER NOT NULL, type TEXT NOT NULL, detail TEXT
      );
      CREATE INDEX IF NOT EXISTS events_ts ON events(ts);
      CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS garmin_daily (
        date TEXT PRIMARY KEY,
        sleep_hours REAL, sleep_score REAL, stress_avg REAL,
        bb_high REAL, bb_low REAL, resting_hr REAL, hrv REAL
      );
    `);
  }

  private getKv<T>(key: string): T | null {
    const row = this.db.prepare('SELECT value FROM kv WHERE key = ?').get(key) as { value: string } | undefined;
    return row ? (JSON.parse(row.value) as T) : null;
  }

  private setKv(key: string, value: unknown): void {
    this.db.prepare('INSERT INTO kv(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, JSON.stringify(value));
  }

  getSettings(): Settings {
    return { ...DEFAULT_SETTINGS, ...(this.getKv<Partial<Settings>>('settings') ?? {}) };
  }

  saveSettings(s: Settings): void {
    this.setKv('settings', s);
  }

  getCalibration(): Calibration | null {
    return this.getKv<Calibration>('calibration');
  }

  saveCalibration(c: Calibration): void {
    this.setKv('calibration', c);
  }

  getSecret(key: string): string | null {
    return this.getKv<string>(`secret:${key}`);
  }

  setSecret(key: string, value: string | null): void {
    if (value === null) this.db.prepare('DELETE FROM kv WHERE key = ?').run(`secret:${key}`);
    else this.setKv(`secret:${key}`, value);
  }

  getMeta<T>(key: string): T | null {
    return this.getKv<T>(`meta:${key}`);
  }

  setMeta(key: string, value: unknown): void {
    this.setKv(`meta:${key}`, value);
  }

  saveMinute(s: MinuteSample): void {
    this.db
      .prepare(
        `INSERT INTO minutes(ts, present, posture, good_ratio, fatigue, blink_rate, perclos, long_blinks, yawns, kb, mouse, issues)
         VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(ts) DO UPDATE SET present = excluded.present, posture = excluded.posture, good_ratio = excluded.good_ratio,
           fatigue = excluded.fatigue, blink_rate = excluded.blink_rate, perclos = excluded.perclos, long_blinks = excluded.long_blinks,
           yawns = excluded.yawns, kb = excluded.kb, mouse = excluded.mouse, issues = excluded.issues`,
      )
      .run(
        s.ts, s.present, s.posture, s.goodRatio, s.fatigue, s.blinkRate, s.perclos, s.longBlinks, s.yawns,
        s.kb ?? null, s.mouse ?? null, JSON.stringify(s.issues),
      );
  }

  minutesSince(ts: number): MinuteSample[] {
    const rows = this.db.prepare('SELECT * FROM minutes WHERE ts >= ? ORDER BY ts').all(ts) as Record<string, unknown>[];
    return rows.map((r) => ({
      ts: r.ts as number,
      present: r.present as number,
      posture: r.posture as number | null,
      goodRatio: r.good_ratio as number | null,
      fatigue: r.fatigue as number | null,
      blinkRate: r.blink_rate as number | null,
      perclos: r.perclos as number | null,
      longBlinks: r.long_blinks as number | null,
      yawns: (r.yawns as number) ?? 0,
      kb: r.kb === null ? undefined : (r.kb as number),
      mouse: r.mouse === null ? undefined : (r.mouse as number),
      issues: JSON.parse((r.issues as string) || '{}'),
    }));
  }

  addEvent(type: string, detail?: string, ts = Date.now()): void {
    this.db.prepare('INSERT INTO events(ts, type, detail) VALUES(?, ?, ?)').run(ts, type, detail ?? null);
  }

  countEvents(type: string, since: number, until = Number.MAX_SAFE_INTEGER): number {
    const r = this.db.prepare('SELECT COUNT(*) AS n FROM events WHERE type = ? AND ts >= ? AND ts < ?').get(type, since, until) as { n: number };
    return r.n;
  }

  /** Czasy zdarzeń danego typu od `since` (np. przerwy i alerty na wykres dnia). */
  eventTimes(type: string, since: number): number[] {
    return (this.db.prepare('SELECT ts FROM events WHERE type = ? AND ts >= ? ORDER BY ts').all(type, since) as { ts: number }[]).map((r) => r.ts);
  }

  saveGarminDay(g: GarminDay): void {
    this.db
      .prepare(
        `INSERT INTO garmin_daily(date, sleep_hours, sleep_score, stress_avg, bb_high, bb_low, resting_hr, hrv)
         VALUES(?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(date) DO UPDATE SET sleep_hours = excluded.sleep_hours, sleep_score = excluded.sleep_score,
           stress_avg = excluded.stress_avg, bb_high = excluded.bb_high, bb_low = excluded.bb_low,
           resting_hr = excluded.resting_hr, hrv = excluded.hrv`,
      )
      .run(g.date, g.sleepHours, g.sleepScore, g.stressAvg, g.bodyBatteryHigh, g.bodyBatteryLow, g.restingHr, g.hrv);
  }

  garminDays(sinceDate: string): GarminDay[] {
    const rows = this.db.prepare('SELECT * FROM garmin_daily WHERE date >= ? ORDER BY date').all(sinceDate) as Record<string, unknown>[];
    return rows.map((r) => ({
      date: r.date as string,
      sleepHours: r.sleep_hours as number | null,
      sleepScore: r.sleep_score as number | null,
      stressAvg: r.stress_avg as number | null,
      bodyBatteryHigh: r.bb_high as number | null,
      bodyBatteryLow: r.bb_low as number | null,
      restingHr: r.resting_hr as number | null,
      hrv: r.hrv as number | null,
    }));
  }

  /** „Usuń moje dane”: historia, zdarzenia, kalibracja i dane Garmina. Ustawienia zostają. */
  wipe(): void {
    this.db.exec(`DELETE FROM minutes; DELETE FROM events; DELETE FROM garmin_daily; DELETE FROM kv WHERE key <> 'settings';`);
  }

  close(): void {
    this.db.close();
  }
}
