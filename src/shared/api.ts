// Kontrakt API wystawianego przez preload (window.postura).
import type { AppEvent, Calibration, LiveStatus, MinuteSample, Settings, StatsPayload } from './types';

export interface InitData {
  settings: Settings;
  calibration: Calibration | null;
  modelsReady: boolean;
  paused: boolean;
  platform: string;
  garmin: { connected: boolean; email: string | null };
}

export interface PosturaApi {
  init(): Promise<InitData>;
  saveSettings(s: Settings): Promise<void>;
  saveCalibration(c: Calibration): Promise<void>;
  ensureModels(): Promise<{ ok: boolean; error?: string }>;
  onModelsProgress(cb: (p: number, file: string) => void): void;
  sendMinute(s: MinuteSample): void;
  sendStatus(s: LiveStatus): void;
  notify(n: { title: string; body: string; kind: 'posture' | 'break' | 'info'; openBreak?: boolean }): void;
  logEvent(e: AppEvent): void;
  getStats(): Promise<StatsPayload>;
  setPaused(p: boolean): void;
  onPaused(cb: (p: boolean) => void): void;
  onNavigate(cb: (view: string) => void): void;
  onShowBreak(cb: () => void): void;
  onStatus(cb: (s: LiveStatus) => void): void;
  garminConnect(email: string, password: string): Promise<{ ok: boolean; error?: string }>;
  garminDisconnect(): Promise<void>;
  garminSync(): Promise<{ ok: boolean; error?: string; days?: number }>;
  activityStatus(): Promise<{ running: boolean; error: string | null }>;
  wipeData(): Promise<void>;
  openExternal(url: string): void;
  /** Mini-widget: pokaż główne okno (opcjonalnie na danym widoku). */
  openMain(view?: string): void;
  /** Mini-widget: przesuń okno widgetu (x, y w px ekranu); `done` zapisuje pozycję. */
  moveWidget(x: number, y: number, done: boolean): void;
}

declare global {
  interface Window {
    postura: PosturaApi;
  }
}
