// Kalibrator: pełny ekran z podglądem kamery, „duchem” sylwetki do dopasowania,
// poziomicami na barkach i głowie, listą, która się odhacza, i startem bez przycisku.
//
// Przebieg: kadr → postawa (krok 1, odlicza samo) → zwykła pozycja (krok 2) → porównanie.
// Logika (kadr, kontrola postawy, ocena kroków) jest w core/; tu tylko rysowanie i przepływ.
import type { AppCtx } from './app';
import type { Calibration, SlouchReference } from '../shared/types';
import type { Landmark } from '../core/metrics';
import { POSE } from '../core/metrics';
import { checkFraming, estimateDistanceCm, TARGET, type FramingHint } from '../core/framing';
import { CAL_LIMITS, checkCalibrationPose, judgeCalibration, type CalibrationCheck } from '../core/calibration';
import { $, clear, h } from './dom';
import { tr } from '../shared/i18n';

type Phase = 'align' | 'count' | 'capture' | 'intro2' | 'capture2' | 'result';

const ALIGN_HOLD_MS = 1000;
const COUNTDOWN_S = 3;
const STEP2_AUTOSTART_S = 5;

const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

interface Item {
  id: 'frame' | 'head' | 'shoulders' | 'facing';
  label: string;
  li?: HTMLElement;
}

const ITEMS: Item[] = [
  { id: 'frame', label: tr('W kadrze') },
  { id: 'head', label: tr('Głowa prosto') },
  { id: 'shoulders', label: tr('Barki poziomo') },
  { id: 'facing', label: tr('Twarz przodem') },
];

const itemOk = (id: Item['id'], framing: FramingHint[], checks: CalibrationCheck[]): boolean => {
  if (id === 'frame') return framing.length === 0;
  if (id === 'head') return !checks.some((c) => c.id === 'headDown' || c.id === 'headUp' || c.id === 'headTilt');
  if (id === 'shoulders') return !checks.some((c) => c.id === 'shoulders');
  return !checks.some((c) => c.id === 'turned');
};

/** Krótki sygnał na koniec kroku – żeby nie trzeba było patrzeć, czy już. */
function beep(freq = 880, ms = 140): void {
  try {
    const ac = new AudioContext();
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.15, ac.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + ms / 1000);
    o.connect(g).connect(ac.destination);
    o.start();
    o.stop(ac.currentTime + ms / 1000 + 0.05);
    o.onended = () => void ac.close();
  } catch {
    /* bez dźwięku */
  }
}

/** Mała figurka pokazująca krok 2: prosto → zwykle (zgarbiona), w pętli. */
const SLOUCH_FIGURE = `<svg viewBox="0 0 120 140" class="slouch-fig" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round">
  <g class="sf-upper"><circle cx="60" cy="30" r="15"/><path d="M60 45 V92"/><path d="M34 60 Q60 52 86 60"/></g>
  <path d="M60 92 L42 132 M60 92 L78 132" opacity=".5"/>
</svg>`;

export function openCalibrator(ctx: AppCtx, onDone: (c: Calibration) => void): void {
  const a = ctx.analyzer;
  const root = $('#overlay-root');
  clear(root);
  const prevFocus = document.activeElement as HTMLElement | null;

  // Podgląd: drugi element <video> na tym samym strumieniu (nie odpinamy wideo z widoku „Na żywo”).
  const video = h('video', { class: 'calib-video', autoplay: true, muted: true, playsInline: true }) as HTMLVideoElement;
  video.classList.toggle('mirror', ctx.settings.mirror);
  const canvas = h('canvas', { class: 'calib-canvas', 'aria-hidden': 'true' });
  const stage = h('div', { class: 'calib-stage' }, video, canvas);

  const stepLabel = h('p', { class: 'calib-step' }, tr('Krok 1 z 2'));
  const title = h('h1', null, tr('Usiądź najprościej, jak umiesz'));
  const lead = h('p', { class: 'fine' }, tr('Wejdź w zarys na obrazie. Gdy wszystko się zaświeci, kalibracja ruszy sama.'));
  const list = h('ul', { class: 'calib-list' }, ITEMS.map((it) => (it.li = h('li', null, h('span', { class: 'tick', 'aria-hidden': 'true' }), it.label))));
  const hint = h('p', { class: 'calib-hint', 'aria-live': 'polite' });
  const extra = h('div', { class: 'calib-extra' });
  const primary = h('button', { class: 'btn primary', hidden: true });
  const secondary = h('button', { class: 'btn ghost' }, tr('Później'));
  const panel = h('aside', { class: 'calib-panel' }, stepLabel, title, lead, list, hint, extra, h('div', { class: 'row' }, primary, secondary));
  const el = h('div', { class: 'calib', role: 'dialog', 'aria-modal': 'true', 'aria-label': tr('Kalibracja postawy') }, stage, panel);
  root.append(el);

  let phase: Phase = 'align';
  let okSince: number | null = null;
  let countStart = 0;
  let progress = 0; // 0–1: pierścień wokół głowy
  let tall: Calibration | null = null;
  let slouch: SlouchReference | null = null;
  let tallPose: Landmark[] | null = null;
  let slouchPose: Landmark[] | null = null;
  let intro2Start = 0;
  let brightness: number | null = null;
  let closed = false;
  let raf = 0;

  const attachStream = () => {
    if (!video.srcObject && a.video.srcObject) {
      video.srcObject = a.video.srcObject;
      void video.play().catch(() => undefined);
    }
  };
  if (!a.isRunning) void a.start();

  // Jasność: co sekundę próbka 32×24 piksele.
  const probe = document.createElement('canvas');
  probe.width = 32;
  probe.height = 24;
  const sampleBrightness = () => {
    if (video.readyState < 2) return;
    const c = probe.getContext('2d', { willReadFrequently: true })!;
    c.drawImage(video, 0, 0, 32, 24);
    const d = c.getImageData(0, 0, 32, 24).data;
    let sum = 0;
    for (let i = 0; i < d.length; i += 4) sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    brightness = sum / (d.length / 4);
  };
  const brightTimer = window.setInterval(sampleBrightness, 1000);

  const close = () => {
    closed = true;
    cancelAnimationFrame(raf);
    clearInterval(brightTimer);
    document.removeEventListener('keydown', onKey);
    video.srcObject = null;
    el.remove();
    prevFocus?.focus?.();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && phase !== 'capture' && phase !== 'capture2') close();
  };
  document.addEventListener('keydown', onKey);

  const save = (c: Calibration) => {
    a.setCalibration(c);
    onDone(c);
    close();
  };

  const setButtons = (p: string | null, s: string | null) => {
    primary.hidden = !p;
    if (p) primary.textContent = p;
    secondary.hidden = !s;
    if (s) secondary.textContent = s;
  };

  // ——— Przebieg ———

  const startCapture = async () => {
    phase = 'capture';
    progress = 0;
    hint.textContent = tr('Nie ruszaj się…');
    const cal = await a.calibrate(5, (f, checks) => {
      progress = f;
      if (checks.length) hint.textContent = checks[0].text;
      else hint.textContent = tr('Nie ruszaj się…');
    });
    if (closed) return;
    if (!cal) {
      phase = 'align';
      okSince = null;
      hint.textContent = tr('Nie udało się – sprawdź, czy głowa i barki są w kadrze, i spróbuj jeszcze raz.');
      return;
    }
    tall = cal;
    tallPose = a.currentPose ? a.currentPose.map((p) => ({ ...p })) : null;
    beep(880);
    startIntro2();
  };

  const startIntro2 = () => {
    phase = 'intro2';
    intro2Start = performance.now();
    progress = 0;
    stepLabel.textContent = tr('Krok 2 z 2');
    title.textContent = tr('Teraz usiądź tak, jak zwykle przy pracy');
    lead.textContent = tr('Nie poprawiaj się – nawet jeśli zwykle się garbisz. Z różnicy między krokami Upright dopasuje czułość do Ciebie.');
    list.hidden = true;
    extra.replaceChildren(h('div', { class: 'slouch-demo', html: SLOUCH_FIGURE }));
    setButtons(tr('Zacznij teraz'), tr('Pomiń'));
  };

  const startCapture2 = async () => {
    phase = 'capture2';
    progress = 0;
    setButtons(null, null);
    hint.textContent = tr('Siedź zwyczajnie…');
    slouch = await a.captureSlouch(4, (f) => (progress = f));
    if (closed) return;
    slouchPose = a.currentPose ? a.currentPose.map((p) => ({ ...p })) : null;
    beep(660);
    if (!slouch) {
      save(tall!);
      return;
    }
    showResult();
  };

  const showResult = () => {
    phase = 'result';
    const verdict = judgeCalibration(tall!, slouch!);
    const range = Math.max(0, Math.round(((tall!.neckRatio - slouch!.neckRatio) / tall!.neckRatio) * 100));
    const dist = estimateDistanceCm(tall!.eyeDistPx, a.video.videoWidth || 640);
    stepLabel.textContent = tr('Wynik');
    title.textContent = verdict.ok ? tr('Kalibracja gotowa') : tr('Sprawdźmy jeszcze raz');
    lead.textContent = verdict.ok ? tr('Twój zakres: {r}%. Czułość dopasowana do Ciebie.', { r: range }) : verdict.warning ?? '';
    hint.textContent = '';
    extra.replaceChildren(
      h('div', { class: 'compare' }, skeletonCard(tr('Prosto'), tallPose, tallPose, true), skeletonCard(tr('Zwykle'), slouchPose, tallPose, false)),
      h('ul', { class: 'calib-summary' },
        h('li', null, h('span', null, tr('Barki')), h('b', null, `${Math.abs(tall!.shoulderTiltDeg).toFixed(0)}°`)),
        h('li', null, h('span', null, tr('Głowa')), h('b', null, `${Math.abs(tall!.headRollDeg).toFixed(0)}°`)),
        dist ? h('li', null, h('span', null, tr('Odległość od ekranu')), h('b', null, tr('ok. {d} cm', { d: dist }))) : null,
      ),
    );
    setButtons(verdict.ok ? tr('Gotowe') : tr('Powtórz kalibrację'), verdict.ok ? tr('Powtórz') : tr('Zapisz mimo to'));
    primary.dataset.action = verdict.ok ? 'save' : 'restart';
    secondary.dataset.action = verdict.ok ? 'restart' : 'save';
    primary.focus();
  };

  const restart = () => {
    phase = 'align';
    okSince = null;
    tall = slouch = null;
    tallPose = slouchPose = null;
    stepLabel.textContent = tr('Krok 1 z 2');
    title.textContent = tr('Usiądź najprościej, jak umiesz');
    lead.textContent = tr('Usiądź głęboko, unieś mostek, cofnij brodę. Gdy wszystko się zaświeci, kalibracja ruszy sama.');
    list.hidden = false;
    extra.replaceChildren();
    setButtons(null, tr('Później'));
    delete primary.dataset.action;
    delete secondary.dataset.action;
  };

  primary.addEventListener('click', () => {
    if (phase === 'intro2') void startCapture2();
    else if (phase === 'result') primary.dataset.action === 'save' ? save({ ...tall!, slouch: slouch! }) : restart();
  });
  secondary.addEventListener('click', () => {
    if (phase === 'align' || phase === 'count') close();
    else if (phase === 'intro2') save(tall!);
    else if (phase === 'result') secondary.dataset.action === 'save' ? save({ ...tall!, slouch: slouch! }) : restart();
  });

  // ——— Pętla: kontrola kadru i postawy + rysowanie ———

  let lastLoopWarn = 0;
  const loop = () => {
    if (closed) return;
    // Jeden wyjątek w klatce (np. chwilowo brak wymiarów wideo) nie może zamrozić kalibracji:
    // logujemy go, pokazujemy spokojny komunikat i i tak planujemy następną klatkę.
    try {
      loopFrame();
    } catch (err) {
      const t = performance.now();
      if (t - lastLoopWarn > 2000) {
        lastLoopWarn = t;
        console.warn('[calibrator] błąd klatki, próbuję dalej', err);
      }
      if (phase === 'align' || phase === 'count') hint.textContent = tr('Chwilka… próbuję ponownie.');
    }
    raf = requestAnimationFrame(loop);
  };

  const loopFrame = () => {
    attachStream();
    const now = performance.now();
    const m = a.currentMetrics;
    const pose = a.currentPose;
    const framing = checkFraming({ pose, headPitchDeg: a.currentHeadPose?.pitchDeg ?? null, brightness, mirror: ctx.settings.mirror });
    const checks = m ? checkCalibrationPose(m) : [];
    const allOk = !!m && framing.length === 0 && checks.length === 0;

    if (phase === 'align' || phase === 'count') {
      for (const it of ITEMS) it.li!.classList.toggle('ok', !!m && itemOk(it.id, framing, checks));
      hint.textContent = framing[0]?.text ?? checks[0]?.text ?? (m ? tr('Świetnie – nie ruszaj się.') : tr('Szukam Cię w kadrze…'));
    }
    if (phase === 'align') {
      progress = 0;
      if (allOk) {
        okSince ??= now;
        if (now - okSince >= ALIGN_HOLD_MS) {
          phase = 'count';
          countStart = now;
        }
      } else okSince = null;
    } else if (phase === 'count') {
      const left = COUNTDOWN_S - (now - countStart) / 1000;
      if (!allOk) {
        phase = 'align';
        okSince = null;
      } else if (left <= 0) {
        void startCapture();
      } else {
        hint.textContent = tr('Start za {n}…', { n: Math.ceil(left) });
      }
    } else if (phase === 'intro2') {
      const left = STEP2_AUTOSTART_S - (now - intro2Start) / 1000;
      if (left <= 0) void startCapture2();
      else hint.textContent = tr('Zaczynam za {n} s…', { n: Math.ceil(left) });
    }

    draw(canvas, video.videoWidth ? video : a.video, pose, {
      mirror: ctx.settings.mirror,
      aligned: phase === 'align' ? allOk : phase !== 'result',
      phase,
      progress,
      countLeft: phase === 'count' ? COUNTDOWN_S - (now - countStart) / 1000 : null,
      shoulderOk: Math.abs(m?.shoulderTiltDeg ?? 0) <= CAL_LIMITS.shoulderTiltDeg,
      headOk: Math.abs(m?.headRollDeg ?? 0) <= CAL_LIMITS.headRollDeg,
    });
  };
  setButtons(null, tr('Później'));
  raf = requestAnimationFrame(loop);
}

// ——— Rysowanie ———

interface DrawState {
  mirror: boolean;
  aligned: boolean;
  phase: Phase;
  progress: number;
  countLeft: number | null;
  shoulderOk: boolean;
  headOk: boolean;
}

function draw(canvas: HTMLCanvasElement, video: { videoWidth: number; videoHeight: number }, lm: Landmark[] | null, s: DrawState): void {
  const dpr = window.devicePixelRatio || 1;
  const cw = canvas.clientWidth;
  const ch = canvas.clientHeight;
  if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
  }
  const g = canvas.getContext('2d')!;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cw, ch);

  // Ten sam kadr co wideo (object-fit: cover).
  const vw = video.videoWidth || 640;
  const vh = video.videoHeight || 480;
  const scale = Math.max(cw / vw, ch / vh);
  const ox = (cw - vw * scale) / 2;
  const oy = (ch - vh * scale) / 2;
  const P = (x: number, y: number, mirrorIt = true): [number, number] => {
    let px = ox + x * vw * scale;
    if (mirrorIt && s.mirror) px = cw - px;
    return [px, oy + y * vh * scale];
  };

  const good = css('--good');
  const warn = css('--warn');
  const spine = css('--spine');
  g.lineCap = 'round';
  g.lineJoin = 'round';

  // Duch sylwetki: głowa + barki, w docelowym miejscu kadru (symetryczny, lustro bez znaczenia).
  if (s.phase !== 'result') {
    const [hx, hy] = P(TARGET.headX, TARGET.headY, false);
    const r = TARGET.headRadius * vw * scale;
    const [sl] = P(TARGET.headX - TARGET.shoulderHalfWidth, TARGET.shouldersY, false);
    const [sr, sy] = P(TARGET.headX + TARGET.shoulderHalfWidth, TARGET.shouldersY, false);
    const ghost = s.aligned ? good : 'rgba(255,255,255,0.85)';
    g.save();
    g.fillStyle = 'rgba(10, 18, 20, 0.35)';
    g.fillRect(0, 0, cw, ch);
    g.globalCompositeOperation = 'destination-out';
    g.beginPath();
    g.ellipse(hx, hy, r * 1.05, r * 1.3, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.moveTo(sl - r * 0.4, ch);
    g.quadraticCurveTo(sl - r * 0.2, sy - r * 0.1, (sl + hx) / 2, sy - r * 0.35);
    g.lineTo(hx - r * 0.5, hy + r * 1.45);
    g.lineTo(hx + r * 0.5, hy + r * 1.45);
    g.lineTo((sr + hx) / 2, sy - r * 0.35);
    g.quadraticCurveTo(sr + r * 0.2, sy - r * 0.1, sr + r * 0.4, ch);
    g.closePath();
    g.fill();
    g.restore();

    g.strokeStyle = ghost;
    g.lineWidth = 3;
    g.setLineDash(s.aligned ? [] : [10, 9]);
    g.beginPath();
    g.ellipse(hx, hy, r * 1.05, r * 1.3, 0, 0, Math.PI * 2);
    g.stroke();
    g.beginPath();
    g.moveTo(sl - r * 0.4, ch);
    g.quadraticCurveTo(sl - r * 0.2, sy - r * 0.1, (sl + hx) / 2, sy - r * 0.35);
    g.lineTo(hx - r * 0.5, hy + r * 1.45);
    g.moveTo(hx + r * 0.5, hy + r * 1.45);
    g.lineTo((sr + hx) / 2, sy - r * 0.35);
    g.quadraticCurveTo(sr + r * 0.2, sy - r * 0.1, sr + r * 0.4, ch);
    g.stroke();
    g.setLineDash([]);

    // Pierścień postępu / odliczania wokół głowy.
    if (s.phase === 'capture' || s.phase === 'capture2' || s.phase === 'count') {
      const frac = s.phase === 'count' ? 1 - Math.max(0, s.countLeft ?? 0) / COUNTDOWN_S : s.progress;
      g.strokeStyle = s.phase === 'count' ? 'rgba(255,255,255,0.9)' : spine;
      g.lineWidth = 8;
      g.beginPath();
      g.ellipse(hx, hy, r * 1.25, r * 1.5, 0, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
      g.stroke();
      if (s.phase === 'count' && s.countLeft !== null) {
        g.fillStyle = '#fff';
        g.font = `600 ${Math.round(r * 0.9)}px system-ui, sans-serif`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(String(Math.max(1, Math.ceil(s.countLeft))), hx, hy);
      }
    }
  }

  // Poziomice na barkach i oczach (linie z punktów użytkownika).
  if (lm && s.phase !== 'result') {
    const vis = (i: number) => (lm[i]?.visibility ?? 1) >= 0.5;
    const level = (i1: number, i2: number, ok: boolean, width: number) => {
      if (!vis(i1) || !vis(i2)) return;
      const a = P(lm[i1].x, lm[i1].y);
      const b = P(lm[i2].x, lm[i2].y);
      const color = ok ? good : warn;
      g.strokeStyle = color;
      g.lineWidth = width;
      g.beginPath();
      g.moveTo(a[0], a[1]);
      g.lineTo(b[0], b[1]);
      g.stroke();
      // Bańka jak w poziomicy: ucieka w stronę wyższego końca.
      const mx = (a[0] + b[0]) / 2;
      const my = (a[1] + b[1]) / 2;
      const left = a[0] < b[0] ? a : b;
      const right = a[0] < b[0] ? b : a;
      const tilt = Math.min(1, Math.abs(Math.atan2(right[1] - left[1], right[0] - left[0])) / 0.2);
      const dir = right[1] < left[1] ? 1 : -1;
      const tube = 34;
      g.save();
      g.translate(mx, my - 22);
      g.fillStyle = 'rgba(14, 22, 24, 0.7)';
      g.beginPath();
      g.roundRect(-tube, -9, tube * 2, 18, 9);
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.6)';
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(-6, -9);
      g.lineTo(-6, 9);
      g.moveTo(6, -9);
      g.lineTo(6, 9);
      g.stroke();
      g.fillStyle = color;
      g.beginPath();
      g.arc(dir * tilt * (tube - 9), 0, 6.5, 0, Math.PI * 2);
      g.fill();
      g.restore();
    };
    level(POSE.leftShoulder, POSE.rightShoulder, s.shoulderOk, 5);
    level(POSE.leftEye, POSE.rightEye, s.headOk, 3);
  }
}

/** Szkic sylwetki z punktów (bez obrazu): do porównania „prosto” i „zwykle”. */
function skeletonCard(label: string, lm: Landmark[] | null, ref: Landmark[] | null, accent: boolean): HTMLElement {
  const W = 200, H = 170;
  const c = h('canvas', { width: W * 2, height: H * 2, class: 'skel' }) as HTMLCanvasElement;
  const g = c.getContext('2d')!;
  g.scale(2, 2);
  if (lm && ref) {
    // Wspólna skala i punkt odniesienia (barki z kroku 1), żeby różnica była widoczna, a całość mieściła się w karcie.
    const mid = (p: Landmark[]) => ({ x: (p[POSE.leftShoulder].x + p[POSE.rightShoulder].x) / 2, y: (p[POSE.leftShoulder].y + p[POSE.rightShoulder].y) / 2 });
    const eyeD = (p: Landmark[]) => Math.hypot(p[POSE.leftEye].x - p[POSE.rightEye].x, p[POSE.leftEye].y - p[POSE.rightEye].y);
    const rm = mid(ref);
    const sw = Math.abs(ref[POSE.leftShoulder].x - ref[POSE.rightShoulder].x) || 0.4;
    const headTop = Math.min(ref[POSE.nose].y, lm[POSE.nose].y) - eyeD(ref) * 2.2;
    const k = Math.min((W * 0.6) / sw, (H * 0.72) / Math.max(0.05, rm.y - headTop));
    const base = H * 0.86;
    const figure = (p: Landmark[], color: string, width: number) => {
      const m = mid(p);
      const X = (x: number) => W / 2 - (x - m.x) * k; // lustrzanie, wyśrodkowane na własnych barkach
      const Y = (y: number) => base + (y - rm.y) * k;
      const er = eyeD(p) * k;
      const ex = (X(p[POSE.leftEye].x) + X(p[POSE.rightEye].x)) / 2;
      const ey = (Y(p[POSE.leftEye].y) + Y(p[POSE.rightEye].y)) / 2;
      g.strokeStyle = color;
      g.lineWidth = width;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(X(p[POSE.leftShoulder].x), Y(p[POSE.leftShoulder].y));
      g.lineTo(X(p[POSE.rightShoulder].x), Y(p[POSE.rightShoulder].y));
      g.moveTo(W / 2, Y(m.y));
      g.lineTo(X(p[POSE.nose].x), Y(p[POSE.nose].y));
      g.stroke();
      g.beginPath();
      g.arc(ex, ey + er * 0.3, er * 1.35, 0, Math.PI * 2);
      g.stroke();
    };
    // Na karcie „Zwykle” prosta postawa zostaje jako blady cień – widać, o ile opada głowa.
    if (!accent) {
      g.globalAlpha = 0.3;
      figure(ref, css('--good'), 4);
      g.globalAlpha = 1;
    }
    figure(lm, accent ? css('--good') : css('--warn'), 5);
  }
  return h('figure', { class: 'skel-card' }, c, h('figcaption', null, label));
}
