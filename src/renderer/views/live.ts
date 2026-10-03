// Widok „Na żywo”: podgląd z nakładką; na wierzchu stan postawy, energia do pracy i przerwy, reszta w „Szczegółach”.
import type { AppCtx } from '../app';
import type { Frame } from '../analyzer';
import type { IssueId, LiveStatus, Settings } from '../../shared/types';
import { drawOverlay } from '../draw';
import { h, fmtMin, plural } from '../dom';
import { BREAK_TITLE, FATIGUE_LABEL, ISSUE_LABEL, ISSUE_TIP, fatigueAdvice } from '../../core/coach';
import { ISSUE_DEFS } from '../../core/scoring';
import { LandmarkFollower } from '../../core/landmarkFollower';

const STATE_WORD: Record<string, string> = {
  good: 'Siedzisz prosto',
  warn: 'Postawa się psuje',
  bad: 'Zła postawa',
  absent: 'Nie widzę Cię w kadrze',
  paused: 'Analiza wstrzymana',
};

/** Ocena postawy słowami, żeby „68/100” coś znaczyło. */
const scoreWord = (score: number): string => (score >= 85 ? 'dobra' : score >= 65 ? 'do poprawy' : 'słaba');

/** Bateria słowami: co ta liczba znaczy dla pracy teraz. */
function energyMeaning(percent: number): { word: string; hint: string } {
  if (percent >= 60) return { word: 'Dużo energii', hint: 'Dobry moment na zadania wymagające skupienia.' };
  if (percent >= 30) return { word: 'Energia spada', hint: 'Lżejsze zadania pójdą dobrze; przerwa wkrótce pomoże.' };
  return { word: 'Mało energii', hint: 'Zrób przerwę ruchową – wstań, napij się wody.' };
}

const CAMERA_MSG: Record<string, string> = {
  starting: 'Włączam kamerę…',
  busy: 'Kamerę używa inna aplikacja (np. Teams lub Zoom). Analiza wróci sama, gdy kamera się zwolni.',
  denied: 'Brak zgody na kamerę. Zezwól Posturze na dostęp w ustawieniach systemu i uruchom ją ponownie.',
  missing: 'Nie znalazłem kamery. Podłącz kamerę i wybierz ją w ustawieniach.',
  stopped: 'Analiza wstrzymana. Kamera jest wyłączona.',
};

export class LiveView {
  private root: HTMLElement;
  // MP9: rysowanie w tempie ekranu (rAF), sylwetka wygładzana między pomiarami.
  private follower = new LandmarkFollower(70);
  private lastFrame: Frame | null = null;
  private raf = 0;
  private lastDraw = 0;
  private stage: HTMLElement;
  private canvas: HTMLCanvasElement;
  private camMsg: HTMLElement;
  private scoreNum: HTMLElement;
  private scoreState: HTMLElement;
  private tip: HTMLElement;
  private fatNum: HTMLElement;
  private fatBar: HTMLElement;
  private fatWord: HTMLElement;
  private fatDetail: HTMLElement;
  private fatAdvice: HTMLElement;
  private energyNum: HTMLElement;
  private energyBar: HTMLElement;
  private energyNote: HTMLElement;
  private energyWord: HTMLElement;
  private breakText: HTMLElement;
  private breakSub: HTMLElement;
  private breakBtn: HTMLButtonElement;
  private metricRows = new Map<IssueId, { val: HTMLElement; bar: HTMLElement; row: HTMLElement }>();
  private calibrateCta: HTMLElement;
  private hint: HTMLElement;
  private mounted = false;

  constructor(private ctx: AppCtx) {
    const a = ctx.analyzer;
    a.video.className = 'stage-video';
    this.canvas = h('canvas', { class: 'stage-canvas', 'aria-hidden': 'true' });
    this.camMsg = h('div', { class: 'stage-msg', hidden: true });
    this.calibrateCta = h('div', { class: 'stage-cta', hidden: true },
      h('p', null, 'Najpierw pokaż mi, jak wygląda Twoja prosta postawa.'),
      h('button', { class: 'btn primary', onclick: () => ctx.startCalibration() }, 'Skalibruj postawę'),
    );
    this.hint = h('p', { class: 'stage-hint', hidden: true });
    this.stage = h('section', { class: 'stage', 'aria-label': 'Podgląd z kamery' }, a.video, this.canvas, this.hint, this.camMsg, this.calibrateCta,
      h('p', { class: 'stage-legend' }, h('span', { class: 'legend-ring' }), 'przerywane kółko: gdzie powinna być głowa'),
    );

    this.energyNum = h('span', { class: 'energy-pct' }, '–');
    this.energyBar = h('span', { class: 'meter-fill' });
    this.energyNote = h('p', { class: 'fine', hidden: true });
    this.energyWord = h('p', { class: 'fine' });

    this.scoreNum = h('span', { class: 'score-small' }, '');
    this.scoreState = h('span', { class: 'score-state' }, 'Uruchamiam…');
    this.tip = h('p', { class: 'tip' });

    this.fatNum = h('span', { class: 'fat-num' }, '–');
    this.fatBar = h('span', { class: 'meter-fill' });
    this.fatWord = h('span', { class: 'fat-word' });
    this.fatDetail = h('p', { class: 'fine' });
    this.fatAdvice = h('p', { class: 'fine advice' });

    this.breakText = h('p', { class: 'break-text' }, '–');
    this.breakSub = h('p', { class: 'fine' });
    this.breakBtn = h('button', { class: 'btn small', onclick: () => ctx.startBreak() }, 'Zrób przerwę teraz');

    const metrics = h('ul', { class: 'metric-list' },
      ISSUE_DEFS.map((d) => {
        const val = h('span', { class: 'metric-val' }, '–');
        const bar = h('span', { class: 'metric-bar-fill' });
        const row = h('li', { class: 'metric' }, h('span', { class: 'metric-name' }, ISSUE_LABEL[d.id]), val, h('span', { class: 'metric-bar' }, bar));
        this.metricRows.set(d.id, { val, bar, row });
        return row;
      }),
    );

    // Na wierzchu tylko to, co ważne teraz: jak siedzę (i co poprawić, gdy coś jest nie tak), ile mam energii i kiedy przerwa.
    // Ocena, przerwy, zmęczenie i odchylenia są jedno kliknięcie dalej (FEEDBACK F1).
    const panel = h('aside', { class: 'readout' },
      h('section', { class: 'r-block hero', 'aria-live': 'polite' },
        this.scoreState,
        this.tip,
      ),
      h('section', { class: 'r-block energy-row' },
        h('div', { class: 'energy-head' }, h('span', null, 'Energia do pracy'), this.energyNum),
        h('span', { class: 'meter', role: 'presentation' }, this.energyBar),
        this.energyNote,
      ),
      h('section', { class: 'r-block break-block' },
        h('h2', null, 'Przerwy'),
        this.breakText,
        this.breakSub,
        this.breakBtn,
      ),
      h('details', {
        class: 'r-block details',
        // Po rozwinięciu przewiń sam panel do szczegółów – kamera zostaje na miejscu.
        ontoggle: (e: Event) => {
          const d = e.currentTarget as HTMLDetailsElement;
          if (d.open) requestAnimationFrame(() => d.scrollIntoView({ behavior: 'smooth', block: 'start' }));
        },
      },
        h('summary', null, 'Szczegóły pomiaru'),
        h('div', { class: 'details-body' },
          h('h2', null, 'Ocena postawy'),
          this.scoreNum,
          h('h2', null, 'Energia do pracy'),
          this.energyWord,
          h('h2', null, 'Zmęczenie oczu'),
          h('p', { class: 'fine' }, 'Z mrugania, przymykania oczu i ziewania. Im mniej, tym lepiej.'),
          h('div', { class: 'fat-line' }, this.fatNum, this.fatWord),
          h('span', { class: 'meter', role: 'presentation' }, this.fatBar, h('span', { class: 'meter-tick t40' }), h('span', { class: 'meter-tick t70' })),
          this.fatDetail,
          this.fatAdvice,
          h('h2', null, 'Jak daleko jesteś od swojej prostej postawy'),
          h('p', { class: 'fine' }, 'Porównanie z kalibracją. Pusty pasek = tak jak wtedy, pełny = wyraźne odchylenie.'),
          metrics,
          h('button', { class: 'btn ghost small', onclick: () => ctx.startCalibration() }, 'Skalibruj ponownie'),
        ),
      ),
    );

    this.root = h('div', { class: 'live' }, this.stage, panel);
    this.applySettings(ctx.settings);
  }

  mount(container: HTMLElement): void {
    container.append(this.root);
    this.mounted = true;
    this.startDrawLoop();
    // Odpięcie od DOM wstrzymało <video>; po powrocie na „Na żywo” wznawiamy podgląd od razu.
    const v = this.ctx.analyzer.video;
    if (this.ctx.analyzer.isRunning && v.paused && v.srcObject) void v.play().catch(() => undefined);
    if (this.ctx.status) this.status(this.ctx.status);
    if (this.ctx.paused) this.camera('stopped');
  }

  detach(): void {
    if (this.mounted) this.root.remove();
    this.mounted = false;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private startDrawLoop(): void {
    cancelAnimationFrame(this.raf);
    this.lastDraw = performance.now();
    const loop = (now: number) => {
      if (!this.mounted) return;
      const dt = Math.min(100, now - this.lastDraw);
      this.lastDraw = now;
      const f = this.lastFrame;
      if (f) {
        try {
          const pose = this.follower.step(dt);
          drawOverlay(this.canvas, this.ctx.analyzer.video.videoWidth ? this.ctx.analyzer.video : { videoWidth: 640, videoHeight: 480 }, pose === f.pose ? f : { ...f, pose }, {
            mirror: this.ctx.settings.mirror,
            calibration: this.ctx.calibration,
          });
        } catch (e) {
          console.warn('Nakładka:', e); // nigdy nie zatrzymujemy podglądu przez błąd rysowania
        }
      }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  applySettings(s: Settings): void {
    this.ctx.analyzer.video.classList.toggle('mirror', s.mirror);
  }

  paused(p: boolean): void {
    if (p) this.camera('stopped');
  }

  camera(state: string, detail?: string): void {
    const msg = CAMERA_MSG[state];
    if (state === 'running' || !msg) {
      this.camMsg.hidden = true;
      return;
    }
    this.camMsg.hidden = false;
    this.camMsg.textContent = detail && state === 'missing' ? `${msg} (${detail})` : msg;
    if (state === 'stopped') {
      const ctx = this.canvas.getContext('2d');
      ctx?.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  frame(f: Frame): void {
    if (!this.mounted) return;
    // Rysuje pętla rAF (startDrawLoop); tu tylko nowy cel dla wygładzania sylwetki.
    if (f.pose !== this.lastFrame?.pose) this.follower.setTarget(f.pose);
    this.lastFrame = f;
    const hints: Record<string, string> = {
      'shoulders-hidden': 'Nie widzę barków – odsuń się trochę albo obniż kamerę.',
      'face-hidden': 'Twarz jest zasłonięta – wyniki chwilowo wstrzymane.',
    };
    const hint = f.reason ? hints[f.reason] : undefined;
    this.hint.hidden = !hint;
    if (hint) this.hint.textContent = hint;
    const sev = f.tracker?.severities ?? {};
    const m = f.metrics;
    const cal = this.ctx.calibration;
    for (const d of ISSUE_DEFS) {
      const r = this.metricRows.get(d.id)!;
      const s = sev[d.id] ?? 0;
      r.bar.style.width = `${Math.round(s * 100)}%`;
      r.row.dataset.level = s >= 0.66 ? 'bad' : s >= 0.33 ? 'warn' : 'ok';
      if (m && cal) {
        const dev = d.deviation(m, cal);
        r.val.textContent = d.unit === '%' ? `${dev >= 0 ? '' : '−'}${Math.abs(dev * 100).toFixed(0)}%` : `${dev.toFixed(0)}°`;
      } else r.val.textContent = '–';
    }
  }

  status(s: LiveStatus): void {
    if (!this.mounted) return;
    const ctx = this.ctx;
    const noCal = !ctx.calibration;
    this.calibrateCta.hidden = !noCal || ctx.paused;
    this.root.dataset.state = ctx.paused ? 'paused' : s.state;
    const showScore = s.score !== null && !noCal && !ctx.paused && s.state !== 'absent';
    this.scoreNum.textContent = showScore ? `${s.score}/100 – ${scoreWord(s.score!)}. 100 = tak prosto jak przy kalibracji.` : 'Pojawi się, gdy będziesz w kadrze.';
    this.scoreState.textContent = noCal ? 'Czekam na kalibrację' : STATE_WORD[ctx.paused ? 'paused' : s.state] ?? '';
    this.tip.textContent = noCal ? 'Pokaż mi raz prostą postawę – od niej liczę resztę.'
      : s.issues?.length && s.state !== 'absent' ? s.issues.map((id) => ISSUE_TIP[id]).join(' ') // do dwóch wskazówek naraz
      : s.topIssue && s.state !== 'absent' ? ISSUE_TIP[s.topIssue]
      : s.state === 'absent' ? 'Usiądź przed kamerą, a pomiar wróci sam.' : '';

    const e = s.energy;
    if (e && !noCal && !ctx.paused) {
      this.energyBar.style.width = `${e.percent}%`;
      this.energyBar.dataset.level = e.percent < 30 ? 'veryTired' : e.percent < 60 ? 'tired' : 'fresh';
      this.energyNum.textContent = `${e.percent}%`;
      const meaning = energyMeaning(e.percent);
      this.energyWord.textContent = `${meaning.word}. ${meaning.hint} Liczę ją ze zmęczenia oczu, postawy i czasu od ostatniej przerwy.`;
      // Pod paskiem tylko ostrzeżenie: spada albo już jest nisko. Gdy wszystko w porządku – cisza.
      const note = e.minutesToLow !== null ? `Za ok. ${fmtMin(e.minutesToLow)} spadnie poniżej 30% – zaplanuj przerwę.`
        : e.percent < 30 ? meaning.hint : '';
      this.energyNote.textContent = note;
      this.energyNote.hidden = !note;
    } else {
      this.energyWord.textContent = noCal ? 'Pojawi się po kalibracji.' : 'Pojawi się, gdy będziesz w kadrze.';
      this.energyNum.textContent = '–';
      this.energyBar.style.width = '0';
      this.energyNote.hidden = true;
    }

    const f = s.fatigue;
    if (f) {
      this.fatNum.textContent = `${f.percent}%`;
      this.fatWord.textContent = FATIGUE_LABEL[f.level];
      this.fatBar.style.width = `${f.percent}%`;
      this.fatBar.dataset.level = f.level;
      const parts: string[] = [];
      if (f.blinkRate !== null) {
        const n = Math.round(f.blinkRate);
        parts.push(`${n} ${plural(n, 'mrugnięcie', 'mrugnięcia', 'mrugnięć')}/min`);
      } else parts.push(ctx.settings.faceAnalysis ? 'mrugnięcia: zbieram dane' : 'analiza twarzy wyłączona');
      if (f.perclos !== null) parts.push(`oczy zamknięte ${(f.perclos * 100).toFixed(0)}% czasu`);
      if (f.yawns10m) parts.push(`${f.yawns10m} ${plural(f.yawns10m, 'ziewnięcie', 'ziewnięcia', 'ziewnięć')} w 10 min`);
      this.fatDetail.textContent = parts.join(', ');
      this.fatAdvice.textContent = fatigueAdvice(f.level, f.blinkRate);
    } else {
      this.fatNum.textContent = '–';
      this.fatWord.textContent = '';
      this.fatBar.style.width = '0';
      const inFrame = !noCal && s.state !== 'absent' && s.state !== 'paused';
      this.fatDetail.textContent = !inFrame ? 'Pojawi się, gdy będziesz w kadrze.'
        : ctx.settings.faceAnalysis ? 'Za mało danych z oczu – nie zgadujemy.'
        : 'Analiza twarzy wyłączona – zmęczenie nie jest liczone.';
      this.fatAdvice.textContent = inFrame && ctx.settings.faceAnalysis ? 'Sprawdź światło na twarzy i odblaski okularów.' : '';
    }

    const be = ctx.analyzer.breakEngine;
    const pending = be.pendingSuggestion;
    const t = performance.now() / 1000;
    const next = be.nextDueInMin(t);
    const dueKind = pending ? pending.kind : next.min <= 0 ? next.kind : null;
    this.breakText.textContent = dueKind ? `${BREAK_TITLE[dueKind]} – teraz` : `${BREAK_TITLE[next.kind]} za ${fmtMin(next.min)}`;
    // Gdy jest pora na przerwę, przycisk wyróżnia się – na co dzień jest spokojny.
    this.breakBtn.className = dueKind ? 'btn primary small' : 'btn small';
    this.breakSub.textContent = `Pracujesz bez przerwy od ${fmtMin(s.minutesSinceBreak)}.`;
  }
}
