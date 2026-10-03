// Silnik przerw: reguła 20-20-20, mikroprzerwy, przerwy ruchowe i przerwy adaptacyjne.
import type { BreakKind, BreakSuggestion, IssueId } from '../shared/types';
import { pickExercise } from './coach';

export interface BreakConfig {
  eyeBreakMin: number;
  microBreakMin: number;
  moveBreakMin: number;
}

export interface BreakInputs {
  present: boolean;
  absentSec: number;
  fatiguePercent: number | null;
  /** Nachylenie średniego wyniku postawy (pkt/min) z ostatnich 15 min. */
  postureSlope: number | null;
  /** Najczęstszy problem ostatnich minut (dobór ćwiczenia). */
  recentIssue: IssueId | null;
}

const SNOOZE_SEC = 300;
const AWAY_IS_BREAK_SEC = 120;
const AWAY_IS_EYE_BREAK_SEC = 20;
const ALERTS_FOR_MICRO = 3;
const ALERT_WINDOW_SEC = 900;
const MIN_GAP_ADAPTIVE_SEC = 900;

export class BreakEngine {
  private lastEye: number;
  private lastMicro: number;
  private lastMove: number;
  private alerts: number[] = [];
  private snoozedUntil = -Infinity;
  private pending: BreakSuggestion | null = null;
  private awaySince: number | null = null;
  private awayBreak: { kind: BreakKind; awaySec: number } | null = null;

  constructor(private cfg: BreakConfig, t: number) {
    this.lastEye = this.lastMicro = this.lastMove = t;
  }

  setConfig(cfg: BreakConfig): void {
    this.cfg = cfg;
  }

  registerAlert(t: number): void {
    this.alerts.push(t);
  }

  /** Minuty od ostatniej prawdziwej przerwy (mikro, ruchowej albo odejścia od biurka). */
  minutesSinceBreak(t: number): number {
    return (t - Math.max(this.lastMicro, this.lastMove)) / 60;
  }

  /** Zwraca nową propozycję przerwy (raz), albo null. Czas w sekundach. */
  update(t: number, i: BreakInputs): BreakSuggestion | null {
    while (this.alerts.length && t - this.alerts[0] > ALERT_WINDOW_SEC) this.alerts.shift();

    if (!i.present) {
      if (this.awaySince === null) this.awaySince = t - i.absentSec;
      return null;
    }
    if (this.awaySince !== null) {
      const away = t - this.awaySince;
      this.awaySince = null;
      if (away >= AWAY_IS_BREAK_SEC) {
        this.done('move', t, false);
        this.awayBreak = { kind: 'move', awaySec: away };
      } else if (away >= AWAY_IS_EYE_BREAK_SEC) {
        this.lastEye = t;
        this.awayBreak = { kind: 'eye', awaySec: away };
      }
    }

    if (this.pending || t < this.snoozedUntil) return null;

    const s = this.decide(t, i);
    if (s) {
      this.pending = s;
    }
    return s;
  }

  private decide(t: number, i: BreakInputs): BreakSuggestion | null {
    const mk = (kind: BreakKind, reason: BreakSuggestion['reason']): BreakSuggestion => ({
      kind,
      reason,
      // Losowe ćwiczenie z listy (najpierw pasujące do ostatniego problemu z postawą).
      exerciseId: pickExercise(kind, i.recentIssue, Math.random() * 1e6),
    });
    const sinceAny = t - Math.max(this.lastMicro, this.lastMove);

    if (t - this.lastMove >= this.cfg.moveBreakMin * 60) return mk('move', 'timer');
    if (i.fatiguePercent !== null && i.fatiguePercent >= 70 && sinceAny >= MIN_GAP_ADAPTIVE_SEC) return mk('move', 'fatigue');
    if (t - this.lastMicro >= this.cfg.microBreakMin * 60) return mk('micro', 'timer');
    if (this.alerts.length >= ALERTS_FOR_MICRO && sinceAny >= 300) return mk('micro', 'alerts');
    if (sinceAny >= MIN_GAP_ADAPTIVE_SEC) {
      if (i.fatiguePercent !== null && i.fatiguePercent >= 55) return mk('micro', 'fatigue');
      if (i.postureSlope !== null && i.postureSlope <= -1) return mk('micro', 'posture-trend');
    }
    if (t - this.lastEye >= this.cfg.eyeBreakMin * 60) return mk('eye', 'timer');
    return null;
  }

  /** Przerwa zrobiona: większa przerwa zeruje też mniejsze liczniki. */
  done(kind: BreakKind, t: number, fromPending = true): void {
    if (kind === 'move') this.lastMove = this.lastMicro = this.lastEye = t;
    else if (kind === 'micro') this.lastMicro = this.lastEye = t;
    else this.lastEye = t;
    if (kind !== 'eye') this.alerts = [];
    if (fromPending || this.pending?.kind === kind || kind === 'move') this.pending = null;
  }

  snooze(t: number): void {
    this.snoozedUntil = t + SNOOZE_SEC;
    this.pending = null;
  }

  /** Zamknięcie okna przerwy bez wyboru = odłożenie. */
  dismiss(t: number): void {
    this.snooze(t);
  }

  /** Przerwa zaliczona przez odejście od biurka (raz, potem null): ≥ 2 min = ruchowa, 20 s – 2 min = dla oczu. */
  takeAwayBreak(): { kind: BreakKind; awaySec: number } | null {
    const b = this.awayBreak;
    this.awayBreak = null;
    return b;
  }

  get pendingSuggestion(): BreakSuggestion | null {
    return this.pending;
  }

  nextDueInMin(t: number): { kind: BreakKind; min: number } {
    const opts: { kind: BreakKind; min: number }[] = [
      { kind: 'eye', min: this.cfg.eyeBreakMin - (t - this.lastEye) / 60 },
      { kind: 'micro', min: this.cfg.microBreakMin - (t - this.lastMicro) / 60 },
      { kind: 'move', min: this.cfg.moveBreakMin - (t - this.lastMove) / 60 },
    ];
    return opts.reduce((a, b) => (b.min < a.min ? b : a));
  }
}
