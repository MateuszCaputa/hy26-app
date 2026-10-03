// Garmin Connect (nieoficjalna biblioteka garmin-connect): sen, stres, Body Battery.
// Hasło i tokeny są szyfrowane przez systemowy pęk kluczy (Electron safeStorage).
import { safeStorage } from 'electron';
import type { GarminDay } from '../shared/types';
import type { Store } from './db';
import { localDate } from '../core/insights';

interface GcClient {
  login(u?: string, p?: string): Promise<unknown>;
  exportToken(): unknown;
  loadToken(o1: unknown, o2: unknown): void;
  getUserProfile(): Promise<{ displayName: string }>;
  getSleepData(d?: Date): Promise<unknown>;
  get<T>(url: string, data?: unknown): Promise<T>;
}

const enc = (s: string): string =>
  safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(s).toString('base64') : `plain:${Buffer.from(s).toString('base64')}`;
const dec = (s: string): string =>
  s.startsWith('plain:') ? Buffer.from(s.slice(6), 'base64').toString() : safeStorage.decryptString(Buffer.from(s, 'base64'));

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export class GarminSync {
  private client: GcClient | null = null;
  private displayName: string | null = null;
  lastError: string | null = null;

  constructor(private store: Store) {}

  get connected(): boolean {
    return this.store.getSecret('garmin') !== null;
  }

  get email(): string | null {
    const raw = this.store.getSecret('garmin');
    if (!raw) return null;
    try {
      return (JSON.parse(dec(raw)) as { email: string }).email;
    } catch {
      return null;
    }
  }

  private newClient(email: string, password: string): GcClient {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GarminConnect } = require('garmin-connect') as { GarminConnect: new (c: { username: string; password: string }) => GcClient };
    return new GarminConnect({ username: email, password });
  }

  async connect(email: string, password: string): Promise<void> {
    const c = this.newClient(email, password);
    await c.login(email, password);
    this.client = c;
    this.store.setSecret('garmin', enc(JSON.stringify({ email, password })));
    this.saveToken();
    this.lastError = null;
  }

  disconnect(): void {
    this.client = null;
    this.displayName = null;
    this.store.setSecret('garmin', null);
    this.store.setSecret('garmin-token', null);
  }

  private saveToken(): void {
    try {
      if (this.client) this.store.setSecret('garmin-token', enc(JSON.stringify(this.client.exportToken())));
    } catch {
      /* token opcjonalny */
    }
  }

  private async ensureClient(): Promise<GcClient> {
    if (this.client) return this.client;
    const raw = this.store.getSecret('garmin');
    if (!raw) throw new Error('Garmin nie jest połączony');
    const { email, password } = JSON.parse(dec(raw)) as { email: string; password: string };
    const c = this.newClient(email, password);
    const tok = this.store.getSecret('garmin-token');
    let ok = false;
    if (tok) {
      try {
        const t = JSON.parse(dec(tok)) as { oauth1: unknown; oauth2: unknown };
        c.loadToken(t.oauth1, t.oauth2);
        await c.getUserProfile();
        ok = true;
      } catch {
        ok = false;
      }
    }
    if (!ok) await c.login(email, password);
    this.client = c;
    this.saveToken();
    return c;
  }

  /** Pobiera dane z ostatnich `days` dni (domyślnie dziś i wczoraj). */
  async sync(days = 2): Promise<GarminDay[]> {
    const out: GarminDay[] = [];
    try {
      const c = await this.ensureClient();
      if (!this.displayName) this.displayName = (await c.getUserProfile()).displayName;
      for (let i = 0; i < days; i++) {
        const d = new Date(Date.now() - i * 864e5);
        const date = localDate(d.getTime());
        const day: GarminDay = { date, sleepHours: null, sleepScore: null, stressAvg: null, bodyBatteryHigh: null, bodyBatteryLow: null, restingHr: null, hrv: null };
        try {
          const sleep = (await c.getSleepData(d)) as {
            dailySleepDTO?: { sleepTimeSeconds?: number; sleepScores?: { overall?: { value?: number } } };
            avgOvernightHrv?: number;
            restingHeartRate?: number;
          };
          const secs = num(sleep?.dailySleepDTO?.sleepTimeSeconds);
          day.sleepHours = secs === null ? null : Math.round((secs / 3600) * 10) / 10;
          day.sleepScore = num(sleep?.dailySleepDTO?.sleepScores?.overall?.value);
          day.hrv = num(sleep?.avgOvernightHrv);
          day.restingHr = num(sleep?.restingHeartRate);
        } catch {
          /* brak snu w tym dniu */
        }
        try {
          const sum = await c.get<Record<string, unknown>>(
            `https://connectapi.garmin.com/usersummary-service/usersummary/daily/${encodeURIComponent(this.displayName)}`,
            { params: { calendarDate: date } },
          );
          day.stressAvg = num(sum?.averageStressLevel);
          day.bodyBatteryHigh = num(sum?.bodyBatteryHighestValue);
          day.bodyBatteryLow = num(sum?.bodyBatteryLowestValue);
          day.restingHr = day.restingHr ?? num(sum?.restingHeartRate);
        } catch {
          /* podsumowanie dnia opcjonalne */
        }
        this.store.saveGarminDay(day);
        out.push(day);
      }
      this.store.setMeta('garminLastSync', Date.now());
      this.lastError = null;
    } catch (e) {
      this.lastError = e instanceof Error ? e.message : String(e);
      throw e;
    }
    return out;
  }
}
