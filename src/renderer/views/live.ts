// Widok „Na żywo”: podgląd z nakładką; na wierzchu stan postawy, zmęczenie i przerwy, reszta w „Szczegółach”.
import type { AppCtx } from '../app';
import type { Frame } from '../analyzer';
import type { IssueId, LiveStatus, Settings } from '../../shared/types';
import { drawOverlay } from '../draw';
import { h, fmtMin } from '../dom';
import { BREAK_TITLE, ISSUE_LABEL, ISSUE_TIP } from '../../core/coach';
import { ISSUE_DEFS } from '../../core/scoring';
import { LandmarkFollower } from '../../core/landmarkFollower';
import { PostureFigure } from '../postureFigure';

const STATE_WORD: Record<string, string> = {
  good: 'Siedzisz prosto',
  warn: 'Postawa się psuje',
  bad: 'Zła postawa',
  absent: 'Nie widzę Cię w kadrze',
  paused: 'Analiza wstrzymana',
};

/** Co znaczy liczba przy każdym odchyleniu – pokazywane po najechaniu na wiersz w „Szczegółach”. */
const ISSUE_HELP: Record<Exclude<IssueId, 'stillness'>, string> = {
  headForward: 'O ile krótszy niż przy kalibracji jest odcinek od barków do nosa (albo o ile mocniej pochylasz głowę). 0% = tak jak przy kalibracji.',
  headBack: 'O ile stopni broda jest uniesiona wyżej niż przy kalibracji. 0° = tak jak przy kalibracji.',
  slouch: 'O ile krótszy niż przy kalibracji jest odcinek od barków do uszu – tak z przodu widać zgarbione plecy.',
  shrug: 'Ta część skrócenia szyi, którą zrobiły barki uniesione w stronę uszu.',
  shoulderTilt: 'Kąt linii barków względem poziomu. 0° = barki równo.',
  tooClose: 'O ile większa jest Twoja twarz w kadrze niż przy kalibracji, czyli o ile bliżej ekranu siedzisz.',
  headTilt: 'Kąt przechyłu głowy na bok względem poziomu. 0° = głowa prosto.',
  twist: 'O ile węższe są barki w kadrze niż przy kalibracji – tak widać obrót tułowia w bok.',
};

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
  private scoreState: HTMLElement;
  private tip: HTMLElement;
  private fatNum: HTMLElement;
  private fatBar: HTMLElement;
  private blinkVal: HTMLElement;
  private yawnVal: HTMLElement;
  private breakText: HTMLElement;
  private breakBtn: HTMLButtonElement;
  private metricRows = new Map<IssueId, { val: HTMLElement; bar: HTMLElement; row: HTMLElement }>();
  // C16: mały ludzik obok zdania o stanie – kolor = stan, strzałka = jak poprawić.
  private figure = new PostureFigure();
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

    this.fatNum = h('span', { class: 'energy-pct' }, '–');
    this.fatBar = h('span', { class: 'meter-fill' });
    this.blinkVal = h('span', { class: 'metric-val' }, '–');
    this.yawnVal = h('span', { class: 'metric-val' }, '–');

    this.scoreState = h('span', { class: 'score-state' }, 'Uruchamiam…');
    this.tip = h('p', { class: 'tip' });


    this.breakText = h('p', { class: 'break-text' }, '–');
    this.breakBtn = h('button', { class: 'btn small', onclick: () => ctx.startBreak() }, 'Zrób przerwę');

    const metrics = h('ul', { class: 'metric-list' },
      ISSUE_DEFS.map((d) => {
        const val = h('span', { class: 'metric-val' }, '–');
        const bar = h('span', { class: 'metric-bar-fill' });
        const warnAt = d.unit === '%' ? `${Math.round(d.threshold * 100)}%` : `${d.threshold}°`;
        const row = h('li', { class: 'metric', title: `${ISSUE_HELP[d.id]} Ostrzegam od ok. ${warnAt}.` },
          h('span', { class: 'metric-name' }, ISSUE_LABEL[d.id]), val, h('span', { class: 'metric-bar' }, bar));
        this.metricRows.set(d.id, { val, bar, row });
        return row;
      }),
    );

    // Na wierzchu tylko to, co ważne teraz: jak siedzę (i co poprawić, gdy coś jest nie tak), ile mam energii i kiedy przerwa.
    // Ocena, przerwy, zmęczenie i odchylenia są jedno kliknięcie dalej (FEEDBACK F1).
    const panel = h('aside', { class: 'readout' },
      h('section', { class: 'r-block hero', 'aria-live': 'polite' },
        h('div', { class: 'hero-row' }, this.figure.el, h('div', { class: 'hero-text' }, this.scoreState, this.tip)),
      ),
      h('section', { class: 'r-block energy-row', title: 'Z mrugania, przymykania oczu, ziewania i czasu od przerwy. Im mniej, tym lepiej.' },
        h('div', { class: 'energy-head' }, h('span', null, 'Zmęczenie'), this.fatNum),
        h('span', { class: 'meter', role: 'presentation' }, this.fatBar),
      ),
      // Przerwy w jednej linii: ile zostało i przycisk.
      h('section', { class: 'r-block break-line' }, this.breakText, this.breakBtn),
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
          h('h2', null, 'Oczy'),
          // Te same wiersze co odchylenia niżej (nazwa po lewej, liczba po prawej), żeby panel czytał się jak jedna lista.
          h('ul', { class: 'metric-list' },
            h('li', { class: 'metric plain' }, h('span', { class: 'metric-name' }, 'Mrugnięcia'), this.blinkVal),
            h('li', { class: 'metric plain' }, h('span', { class: 'metric-name' }, 'Ziewnięcia'), this.yawnVal),
          ),
          h('h2', null, 'Jak daleko jesteś od swojej prostej postawy'),
          metrics,
          h('div', { class: 'details-foot' },
            h('button', { class: 'btn ghost small', onclick: () => ctx.startCalibration() }, 'Skalibruj ponownie'),
          ),
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
      this.figure.tick(dt);
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
    // Przechyły ze znakiem względem kalibracji; w lustrzanym podglądzie odwracamy, żeby ludzik był jak odbicie.
    const flip = this.ctx.settings.mirror ? -1 : 1;
    this.figure.update({
      state: !cal ? 'paused' : f.tracker?.state ?? 'absent',
      topIssue: f.tracker?.topIssue ?? null,
      severities: sev,
      headRollDeg: m && cal ? flip * (m.headRollDeg - cal.headRollDeg) : 0,
      shoulderRollDeg: m && cal ? flip * (m.shoulderTiltDeg - cal.shoulderTiltDeg) : 0,
    });
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
    this.scoreState.textContent = noCal ? 'Czekam na kalibrację' : STATE_WORD[ctx.paused ? 'paused' : s.state] ?? '';
    this.tip.textContent = noCal ? 'Pokaż mi raz prostą postawę – od niej liczę resztę.'
      : s.issues?.length && s.state !== 'absent' ? s.issues.map((id) => ISSUE_TIP[id]).join(' ') // do dwóch wskazówek naraz
      : s.topIssue && s.state !== 'absent' ? ISSUE_TIP[s.topIssue]
      : s.state === 'absent' ? 'Usiądź przed kamerą, a pomiar wróci sam.' : '';

    const f = s.fatigue;
    const fatOn = !!f && !noCal && !ctx.paused;
    this.fatNum.textContent = fatOn ? `${f!.percent}%` : '–';
    this.fatBar.style.width = fatOn ? `${f!.percent}%` : '0';
    if (fatOn) this.fatBar.dataset.level = f!.level;
    // W „Szczegółach” tylko surowe liczby z oczu.
    const blinks = f?.blinkRate != null ? `${Math.round(f.blinkRate)}/min` : '–';
    const yawns = f ? `${f.yawns10m} w 10 min` : '–';
    this.blinkVal.textContent = blinks;
    this.yawnVal.textContent = yawns;

    const be = ctx.analyzer.breakEngine;
    const pending = be.pendingSuggestion;
    const t = performance.now() / 1000;
    const next = be.nextDueInMin(t);
    const dueKind = pending ? pending.kind : next.min <= 0 ? next.kind : null;
    this.breakText.textContent = dueKind ? 'Pora na przerwę' : `Przerwa za ${fmtMin(next.min)}`;
    this.breakText.title = `${BREAK_TITLE[dueKind ?? next.kind]}. Pracujesz bez przerwy od ${fmtMin(s.minutesSinceBreak)}.`;
    // Gdy jest pora na przerwę, przycisk wyróżnia się – na co dzień jest spokojny.
    this.breakBtn.className = dueKind ? 'btn primary small' : 'btn small';
  }
}
