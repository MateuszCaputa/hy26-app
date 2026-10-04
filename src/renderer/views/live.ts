// Widok „Na żywo”: podgląd z nakładką; na wierzchu stan postawy, zmęczenie i przerwy, reszta w „Szczegółach”.
import type { AppCtx } from '../app';
import type { Frame } from '../analyzer';
import type { IssueId, LiveStatus, Settings } from '../../shared/types';
import { drawOverlay } from '../draw';
import { h, fmtMin } from '../dom';
import { fatigueWhy } from '../fatigueWhy';
import { BREAK_TITLE, ISSUE_LABEL, ISSUE_TIP } from '../../core/coach';
import { ISSUE_DEFS } from '../../core/scoring';
import { LandmarkFollower } from '../../core/landmarkFollower';
import { PostureFigure } from '../postureFigure';
import { tr } from '../../shared/i18n';

const STATE_WORD: Record<string, string> = {
  good: tr('Siedzisz prosto'),
  warn: tr('Postawa się psuje'),
  bad: tr('Zła postawa'),
  absent: tr('Nie widzę Cię w kadrze'),
  paused: tr('Analiza wstrzymana'),
};

/** Dymek przy wartości: prostymi słowami, co znaczy liczba (kiedy się poprawić, mówią komunikaty o postawie). */
const ISSUE_HELP: Record<Exclude<IssueId, 'stillness'>, string> = {
  headForward: tr('0% = głowa tak jak przy kalibracji. Im więcej, tym bardziej wysunięta.'),
  headBack: tr('O ile stopni broda jest wyżej niż przy kalibracji. 0° = tak jak wtedy.'),
  slouch: tr('0% = plecy tak proste jak przy kalibracji. Im więcej, tym mocniej się garbisz.'),
  shrug: tr('0% = barki rozluźnione. Im więcej, tym wyżej je unosisz.'),
  shoulderTilt: tr('O ile stopni jeden bark jest niżej od drugiego. 0° = równo.'),
  tooClose: tr('0% = ta sama odległość od ekranu co przy kalibracji. Im więcej, tym bliżej siedzisz.'),
  headTilt: tr('O ile stopni głowa jest przechylona na bok. 0° = prosto.'),
  twist: tr('0% = siedzisz przodem do ekranu. Im więcej, tym bardziej obrócony tułów.'),
};

const CAMERA_MSG: Record<string, string> = {
  starting: tr('Włączam kamerę…'),
  busy: tr('Kamerę używa inna aplikacja (np. Teams lub Zoom). Analiza wróci sama, gdy kamera się zwolni.'),
  denied: tr('Brak zgody na kamerę. Zezwól aplikacji Upright na dostęp w ustawieniach systemu i uruchom ją ponownie.'),
  missing: tr('Nie znalazłem kamery. Podłącz kamerę i wybierz ją w ustawieniach.'),
  stopped: tr('Analiza wstrzymana. Kamera jest wyłączona.'),
};

// Odchylenie bez „−0”: co zaokrągla się do zera, pokazujemy jako 0; minus zawsze typograficzny „−”.
function fmtDev(v: number, unit: string): string {
  const r = Math.round(v);
  return `${r < 0 ? '−' : ''}${Math.abs(r)}${unit}`;
}

export class LiveView {
  private root: HTMLElement;
  // MP9: rysowanie w tempie ekranu (rAF), sylwetka wygładzana między pomiarami.
  private follower = new LandmarkFollower(70);
  private lastFrame: Frame | null = null;
  /** Klawisz D: podgląd diagnostyczny oczu na kamerze (do testów mrugania). */
  private eyeDebug = false;
  private keyBound = false;
  private raf = 0;
  private lastDraw = 0;
  private stage: HTMLElement;
  private canvas: HTMLCanvasElement;
  private camMsg: HTMLElement;
  private scoreState: HTMLElement;
  private tip: HTMLElement;
  private fatNum: HTMLElement;
  private fatBar: HTMLElement;
  private why = fatigueWhy();
  private simBadge = h('span', { class: 'sim-badge', hidden: true, 'data-tip': tr('Tryb prezentacji: sygnały oczu są symulowane (Ustawienia → Prezentacja).') }, tr('SYMULACJA'));
  private blinkVal: HTMLElement;
  private yawnVal: HTMLElement;
  private breakText: HTMLElement;
  private breakBtn: HTMLButtonElement;
  private metricRows = new Map<IssueId, { val: HTMLElement; bar: HTMLElement; row: HTMLElement }>();
  // C16: mały ludzik obok zdania o stanie – kolor = stan, strzałka = jak poprawić.
  private figure = new PostureFigure();
  private calibrateCta: HTMLElement;
  private hint: HTMLElement;
  private recalBtn: HTMLButtonElement;
  private mounted = false;

  constructor(private ctx: AppCtx) {
    const a = ctx.analyzer;
    a.video.className = 'stage-video';
    this.canvas = h('canvas', { class: 'stage-canvas', 'aria-hidden': 'true' });
    this.camMsg = h('div', { class: 'stage-msg', hidden: true });
    this.calibrateCta = h('div', { class: 'stage-cta', hidden: true },
      h('p', null, tr('Najpierw pokaż mi, jak wygląda Twoja prosta postawa.')),
      h('button', { class: 'btn primary', onclick: () => ctx.startCalibration() }, tr('Skalibruj postawę')),
    );
    this.hint = h('p', { class: 'stage-hint', hidden: true });
    this.stage = h('section', { class: 'stage', 'aria-label': tr('Podgląd z kamery') }, a.video, this.canvas, this.hint, this.camMsg, this.calibrateCta,
      h('p', { class: 'stage-legend' }, h('span', { class: 'legend-ring' }), tr('przerywane kółko: gdzie powinna być głowa')),
    );

    this.fatNum = h('span', { class: 'energy-pct', 'data-tip': tr('0% = wypoczęty, 100% = bardzo zmęczony. Liczę z mrugania, przymykania oczu i ziewania.') }, '–');
    this.fatBar = h('span', { class: 'meter-fill' });
    this.blinkVal = h('span', { class: 'metric-val' }, '–');
    this.yawnVal = h('span', { class: 'metric-val' }, '–');

    this.scoreState = h('span', { class: 'score-state' }, tr('Uruchamiam…'));
    this.tip = h('p', { class: 'tip' });


    this.breakText = h('p', { class: 'break-text' }, '–');
    this.breakBtn = h('button', { class: 'btn small', onclick: () => ctx.startBreak() }, tr('Zrób przerwę'));

    const metrics = h('ul', { class: 'metric-list' },
      ISSUE_DEFS.map((d) => {
        // Opis po najechaniu na samą wartość (procent / stopnie).
        const val = h('span', { class: 'metric-val', 'data-tip': ISSUE_HELP[d.id] }, '–');
        const bar = h('span', { class: 'metric-bar-fill' });
        const row = h('li', { class: 'metric' },
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
      h('section', { class: 'r-block energy-row' },
        h('div', { class: 'energy-head' }, h('span', null, tr('Zmęczenie'), this.simBadge), this.fatNum),
        h('span', { class: 'meter', role: 'presentation' }, this.fatBar),
        this.why.el,
      ),
      // Przerwy w jednej linii: ile zostało i przycisk.
      h('section', { class: 'r-block break-line' }, this.breakText, this.breakBtn),
      h('details', {
        class: 'r-block details',
        // Po rozwinięciu przewijamy panel tylko tyle, by ostatni wiersz (np. „Skręt tułowia”) był widoczny nad przyciskiem
        // kalibracji – i nigdy dalej niż do nagłówka „Szczegóły pomiaru”, żeby nie ucinać go u góry.
        ontoggle: (e: Event) => {
          const d = e.currentTarget as HTMLDetailsElement;
          const panel = d.closest('.readout') as HTMLElement | null;
          if (!d.open || !panel) return;
          requestAnimationFrame(() => {
            const toEnd = panel.scrollHeight - panel.clientHeight;
            const toSummary = d.offsetTop - panel.offsetTop - 8;
            const top = Math.max(0, Math.min(toEnd, toSummary));
            if (top > panel.scrollTop) panel.scrollTo({ top, behavior: 'smooth' });
          });
        },
      },
        h('summary', null, tr('Szczegóły pomiaru')),
        h('div', { class: 'details-body' },
          h('h2', null, tr('Oczy')),
          // Te same wiersze co odchylenia niżej (nazwa po lewej, liczba po prawej), żeby panel czytał się jak jedna lista.
          h('ul', { class: 'metric-list' },
            h('li', { class: 'metric plain' }, h('span', { class: 'metric-name', 'data-tip': tr('Średnio z ostatnich 3 minut, bez chwil, gdy mówisz. Przy pracy przy ekranie 5–10/min to norma (w spoczynku ok. 15–20).') }, tr('Mrugnięcia (śr. 3 min)')), this.blinkVal),
            h('li', { class: 'metric plain' }, h('span', { class: 'metric-name' }, tr('Ziewnięcia')), this.yawnVal),
          ),
          h('h2', null, tr('Jak daleko jesteś od swojej prostej postawy')),
          metrics,
          h('div', { class: 'details-foot' },
            this.recalBtn = h('button', { class: 'btn ghost small', onclick: () => ctx.startCalibration() }, ctx.calibration ? tr('Skalibruj ponownie') : tr('Skalibruj')),
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
    if (!this.keyBound) {
      this.keyBound = true;
      document.addEventListener('keydown', (e) => {
        if (!this.mounted || e.repeat || (e.target as HTMLElement)?.closest?.('input, textarea, select')) return;
        if (e.key === 'd' || e.key === 'D') this.eyeDebug = !this.eyeDebug;
      });
    }
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
          if (this.eyeDebug) drawEyeDebug(this.canvas, f.eyes);
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
    // Legenda kółka ma sens tylko przy działającej analizie.
    this.stage.querySelector<HTMLElement>('.stage-legend')?.toggleAttribute('hidden', state !== 'running' && !!msg);
    if (state === 'running' || !msg) {
      this.camMsg.hidden = true;
      return;
    }
    this.camMsg.hidden = false;
    this.camMsg.textContent = detail && state === 'missing' ? `${msg} (${detail})` : msg;
    // Kamera nie działa (pauza, zajęta, brak zgody): bez śladów ostatniej analizy. Samo czyszczenie płótna nie wystarczało –
    // pętla rysowania w następnej klatce rysowała zapamiętaną klatkę od nowa.
    this.lastFrame = null;
    this.follower.setTarget(null);
    this.canvas.getContext('2d')?.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.hint.hidden = true;
    this.calibrateCta.hidden = true; // nie nakłada się na komunikat o kamerze; po wznowieniu wróci przy następnym statusie
    this.figure.update({ state: 'paused', topIssue: null, severities: {}, headRollDeg: 0, shoulderRollDeg: 0 });
  }

  frame(f: Frame): void {
    if (!this.mounted) return;
    // Rysuje pętla rAF (startDrawLoop); tu tylko nowy cel dla wygładzania sylwetki.
    if (f.pose !== this.lastFrame?.pose) this.follower.setTarget(f.pose);
    this.lastFrame = f;
    const hints: Record<string, string> = {
      'shoulders-hidden': tr('Nie widzę barków – odsuń się trochę albo obniż kamerę.'),
      'face-hidden': tr('Twarz jest zasłonięta – wyniki chwilowo wstrzymane.'),
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
        r.val.textContent = fmtDev(d.unit === '%' ? dev * 100 : dev, d.unit);
      } else r.val.textContent = '–';
    }
  }

  status(s: LiveStatus): void {
    if (!this.mounted) return;
    const ctx = this.ctx;
    const noCal = !ctx.calibration;
    this.calibrateCta.hidden = !noCal || ctx.paused;
    // „ponownie” dopiero, gdy jest już jakaś kalibracja (jak w Ustawieniach).
    this.recalBtn.textContent = noCal ? tr('Skalibruj') : tr('Skalibruj ponownie');
    this.root.dataset.state = ctx.paused ? 'paused' : s.state;
    this.scoreState.textContent = noCal ? tr('Czekam na kalibrację') : STATE_WORD[ctx.paused ? 'paused' : s.state] ?? '';
    this.tip.textContent = noCal ? tr('Pokaż mi raz prostą postawę – od niej liczę resztę.')
      : s.issues?.length && s.state !== 'absent' ? s.issues.map((id) => ISSUE_TIP[id]).join(' ') // do dwóch wskazówek naraz
      : s.topIssue && s.state !== 'absent' ? ISSUE_TIP[s.topIssue]
      : s.state === 'absent' ? tr('Usiądź przed kamerą, a pomiar wróci sam.') : '';

    const f = s.fatigue;
    const fatOn = !!f && !noCal && !ctx.paused;
    this.fatNum.textContent = fatOn ? `${f!.percent}%` : '–';
    this.fatBar.style.width = fatOn ? `${f!.percent}%` : '0';
    if (fatOn) this.fatBar.dataset.level = f!.level;
    this.why.update(fatOn ? f : null);
    this.simBadge.hidden = !(fatOn && f!.simulated);
    // W „Szczegółach” tylko surowe liczby z oczu.
    // Zanim zbierze się średnia (30 s spokoju): liczba mrugnięć na żywo, żeby było widać, że licznik działa.
    const eyes = this.lastFrame?.eyes;
    const blinks = f?.blinkRate != null ? `${Math.round(f.blinkRate)}/min` : eyes && eyes.blinksTotal > 0 ? tr('{n} · liczę średnią', { n: eyes.blinksTotal }) : '–';
    const yawns = f ? tr('{n} w 10 min', { n: f.yawns10m }) : '–';
    this.blinkVal.textContent = blinks;
    this.yawnVal.textContent = yawns;

    const be = ctx.analyzer.breakEngine;
    const pending = be.pendingSuggestion;
    const t = performance.now() / 1000;
    const next = be.nextDueInMin(t);
    const dueKind = pending ? pending.kind : next.min <= 0 ? next.kind : null;
    this.breakText.textContent = dueKind ? tr('Pora na przerwę') : tr('Przerwa za {t}', { t: fmtMin(next.min) });
    this.breakText.dataset.tip = `${BREAK_TITLE[dueKind ?? next.kind]}. ${tr('Pracujesz bez przerwy od {t}.', { t: fmtMin(s.minutesSinceBreak) })}`;
    // Gdy jest pora na przerwę, przycisk wyróżnia się – na co dzień jest spokojny.
    this.breakBtn.className = dueKind ? 'btn primary small' : 'btn small';
  }
}

/** Podgląd diagnostyczny oczu w lewym dolnym rogu kamery (klawisz D). Tylko liczby, bez obrazu. */
function drawEyeDebug(canvas: HTMLCanvasElement, e: Frame['eyes']): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const n = (v: number | null | undefined, d = 2) => (v == null ? '–' : v.toFixed(d));
  const lines = !e
    ? ['Oczy: analiza twarzy wyłączona']
    : [
        `LICZNIK MRUGNIĘĆ: ${e.blinksTotal}    długie: ${e.longTotal}`,
        `śr. 3 min: ${e.rate == null ? '– (zbieram dane, min. 60 s)' : `${e.rate.toFixed(0)}/min`}`,
        `zamknięcie ${n(e.closed)} (próg ${n(e.closeOn)})   EAR ${n(e.ear, 3)} / wzorzec ${n(e.earRef, 3)}`,
        `eyeBlink surowy ${n(e.blend)} → względny ${n(e.blendRel)}`,
        `${e.reliable ? 'dane OK' : 'DANE NIEPEWNE'} · ${e.fps.toFixed(0)} kl./s${e.gazeDown ? ' · PATRZYSZ W DÓŁ' : ''}${e.talking ? ' · MÓWISZ' : ''}`,
      ];
  const dpr = window.devicePixelRatio || 1;
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.font = '600 12px ui-monospace, Menlo, Consolas, monospace';
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 20;
  const h = lines.length * 18 + 12;
  // Na środku kadru: przy object-fit: cover brzegi płótna bywają poza widocznym obszarem.
  const x0 = Math.max(12, (canvas.clientWidth - w) / 2);
  const y0 = canvas.clientHeight - h - 40;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.fillRect(x0, y0, w, h);
  ctx.fillStyle = '#e8f0ec';
  lines.forEach((l, i) => {
    ctx.font = i === 0 ? '700 15px ui-monospace, Menlo, Consolas, monospace' : '600 12px ui-monospace, Menlo, Consolas, monospace';
    ctx.fillText(l, x0 + 10, y0 + 20 + i * 18);
  });
  // pasek zamknięcia oka: od razu widać każde mrugnięcie
  if (e?.closed != null) {
    ctx.fillStyle = e.closed >= 0.6 ? '#ff6b6b' : '#7fd3a5';
    ctx.fillRect(x0, y0 - 8, w * Math.min(1, e.closed), 5);
  }
  ctx.restore();
}
