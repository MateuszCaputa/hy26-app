// Kontrakt API wystawianego przez preload (window.postura).
import type { AppEvent, Calibration, LiveStatus, MinuteSample, Nudge, NudgeAction, Settings, StatsPayload } from './types';

export interface InitData {
  settings: Settings;
  calibration: Calibration | null;
  modelsReady: boolean;
  paused: boolean;
  platform: string;
}

export interface PosturaApi {
  init(): Promise<InitData>;
  saveSettings(s: Settings): Promise<void>;
  saveCalibration(c: Calibration): Promise<void>;
  ensureModels(): Promise<{ ok: boolean; error?: string }>;
  onModelsProgress(cb: (p: number, file: string) => void): void;
  sendMinute(s: MinuteSample): void;
  sendStatus(s: LiveStatus): void;
  notify(n: { title: string; body: string; kind: 'posture' | 'break' | 'info'; openBreak?: boolean; nudge?: Nudge }): void;
  logEvent(e: AppEvent): void;
  getStats(): Promise<StatsPayload>;
  setPaused(p: boolean): void;
  onPaused(cb: (p: boolean) => void): void;
  onNavigate(cb: (view: string) => void): void;
  onShowBreak(cb: () => void): void;
  onStatus(cb: (s: LiveStatus) => void): void;
  activityStatus(): Promise<{ running: boolean; error: string | null }>;
  wipeData(): Promise<void>;
  openExternal(url: string): void;
  /** Windows: ikona zasobnika z wynikiem postawy (PNG data URL); `null` = zwykła ikona. */
  setTrayBadge(png: string | null): void;
  /** Mini-widget: kliknięcie otwiera główne okno; przeciąganie przesuwa widget (x, y ekranu; `done` zapisuje). */
  openMain(view?: string): void;
  moveWidget(x: number, y: number, done: boolean): void;
  /** Okno podpowiedzi: nowa podpowiedź / akcja użytkownika (Start, Za 5 min, Pomiń, koniec odliczania). */
  onNudge(cb: (n: Nudge) => void): void;
  nudgeAction(a: NudgeAction): void;
  /** Podgląd powiadomień z Ustawień: pokazuje od razu, bez limitów (odstęp, „nie przeszkadzać”, godziny pracy). */
  testNotify(t: { target: 'corner' | 'system'; nudge: Nudge }): void;
  /** Główne okno: akcja z podpowiedzi do wykonania w analizatorze. */
  onNudgeAction(cb: (a: NudgeAction, exerciseId?: string) => void): void;
}

declare global {
  interface Window {
    postura: PosturaApi;
  }
}
