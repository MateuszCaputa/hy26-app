// Analizator: kamera → MediaPipe (sylwetka + twarz) → metryki → ocena, zmęczenie, przerwy.
import { FaceLandmarker, FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import type { Calibration, FatigueSnapshot, IssueId, LiveStatus, MinuteSample, PostureMetrics, Settings, BreakSuggestion } from '../shared/types';
import { computeMetrics, median, type Landmark } from '../core/metrics';
import { PointSmoother } from '../core/oneEuro';
import { PostureTracker, type TrackerOutput } from '../core/scoring';
import { EyeAnalyzer, FatigueEstimator, LEFT_EYE, RIGHT_EYE, eyeAspectRatio, mouthAspectRatio, type FaceFrame } from '../core/fatigue';
import { BreakEngine } from '../core/breakEngine';
import { MinuteAggregator, postureAvg, postureSlope, topIssueOf } from '../core/aggregate';
import { FrameGate } from '../core/frameGate';
import { headPoseFromMatrix, type HeadPose } from '../core/headPose';
import { ShoulderGate } from '../core/shoulderGate';

export interface Frame {
  t: number;
  pose: Landmark[] | null;
  face: Landmark[] | null;
  metrics: PostureMetrics | null;
  tracker: TrackerOutput | null;
  fatigue: FatigueSnapshot | null;
  reason?: string;
}

export interface AnalyzerCallbacks {
  onFrame(f: Frame): void;
  onStatus(s: LiveStatus): void;
  onAlert(issue: IssueId): void;
  onBreak(s: BreakSuggestion): void;
  onMinute(s: MinuteSample): void;
  onCameraState(state: 'starting' | 'running' | 'busy' | 'denied' | 'missing' | 'stopped', detail?: string): void;
  onRecalibrateHint(): void;
}

const POSE_INTERVAL_MS = 125; // ~8 analiz sylwetki na sekundę

export class Analyzer {
  video: HTMLVideoElement;
  private pose: PoseLandmarker | null = null;
  private face: FaceLandmarker | null = null;
  private stream: MediaStream | null = null;
  private timer: number | null = null;
  private running = false;
  private lastPoseMs = 0;
  private lastTs = 0;
  private lastPose: Landmark[] | null = null;
  private lastMetrics: PostureMetrics | null = null;
  private lastTracker: TrackerOutput | null = null;
  private lastFatigue: FatigueSnapshot | null = null;
  private lastStatusMs = 0;
  private smoother = new PointSmoother();
  private shoulderGate = new ShoulderGate();
  /** Ostatnia twarz i ustawienie głowy (twarz liczymy co klatkę, sylwetkę rzadziej). */
  private lastFace: Landmark[] | null = null;
  private lastHeadPose: HeadPose | null = null;
  private tracker: PostureTracker | null = null;
  private eyes = new EyeAnalyzer();
  private fatigue = new FatigueEstimator();
  private breaks: BreakEngine;
  private agg = new MinuteAggregator();
  private recent: MinuteSample[] = [];
  private faceScaleHist: number[] = [];
  private recalHintDay = '';
  private onBattery = false;
  private retryTimer: number | null = null;
  private calibrating: { until: number; samples: PostureMetrics[]; ears: number[]; resolve: (c: Calibration | null) => void } | null = null;
  demo = false;
  /** Bez WebGL MediaPipe nie przyjmuje <video>: wtedy podajemy klatki jako ImageData. */
  private cpuFrames = false;
  private frameCanvas: OffscreenCanvas | null = null;
  /** Analizujemy tylko nowe klatki – zatrzymane wideo nie może podbijać oceny starym obrazem. */
  private gate = new FrameGate();

  constructor(
    private settings: Settings,
    private calibration: Calibration | null,
    private cb: AnalyzerCallbacks,
  ) {
    this.video = document.createElement('video');
    this.video.muted = true;
    this.video.playsInline = true;
    this.breaks = new BreakEngine(settings, this.now());
    if (calibration) this.setCalibration(calibration);
    const nav = navigator as Navigator & { getBattery?: () => Promise<{ charging: boolean; addEventListener(e: string, f: () => void): void }> };
    nav.getBattery?.().then((b) => {
      this.onBattery = !b.charging;
      b.addEventListener('chargingchange', () => (this.onBattery = !b.charging));
    }).catch(() => undefined);
  }

  private now(): number {
    return performance.now() / 1000;
  }

  async loadModels(): Promise<void> {
    if (this.demo) return;
    const fileset = await FilesetResolver.forVisionTasks('app://local/wasm');
    const makePose = (delegate: 'GPU' | 'CPU', file: string) =>
      PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: `app://local/models/${file}`, delegate },
        runningMode: 'VIDEO',
        numPoses: 1,
        // Wyższe progi: lepiej chwilę nie mieć barków niż wliczać zgadywane.
        minPoseDetectionConfidence: 0.6,
        minPosePresenceConfidence: 0.6,
        minTrackingConfidence: 0.6,
      });
    const make = async (delegate: 'GPU' | 'CPU') => {
      try {
        // Model „full” trzyma barki i uszy stabilniej niż „lite” (MP5).
        this.pose = await makePose(delegate, 'pose_landmarker_full.task');
      } catch (e) {
        if (delegate === 'GPU' && /kGpuService|webgl/i.test((e as Error).message)) throw e;
        console.warn('Brak modelu full, używam lite:', (e as Error).message);
        this.pose = await makePose(delegate, 'pose_landmarker_lite.task');
      }
      this.face = await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: 'app://local/models/face_landmarker.task', delegate },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFaceBlendshapes: true,
        // Macierz ustawienia głowy: prawdziwe pochylenie/obrót/przechył w stopniach (MP3).
        outputFacialTransformationMatrixes: true,
      });
    };
    try {
      await make('GPU');
      console.info('Modele wczytane (GPU)');
    } catch (e) {
      console.warn('GPU niedostępne, przełączam na CPU:', (e as Error).message);
      await make('CPU'); // brak WebGL – wolniej, ale działa
      this.cpuFrames = true;
      console.info('Modele wczytane (CPU)');
    }
  }

  setSettings(s: Settings): void {
    const cameraChanged = s.cameraId !== this.settings.cameraId;
    this.settings = s;
    this.tracker?.setConfig(s);
    this.breaks.setConfig(s);
    if (cameraChanged && this.running) {
      this.stop();
      void this.start();
    }
  }

  setCalibration(c: Calibration): void {
    this.calibration = c;
    if (this.tracker) this.tracker.setCalibration(c);
    else this.tracker = new PostureTracker(c, this.settings);
    this.eyes.setCalibratedEarOpen(c.earOpen);
    this.faceScaleHist = [];
  }

  get hasCalibration(): boolean {
    return this.calibration !== null;
  }

  get breakEngine(): BreakEngine {
    return this.breaks;
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.cb.onCameraState('starting');
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    if (!this.demo) {
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: this.settings.cameraId ? { exact: this.settings.cameraId } : undefined,
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 30 },
          },
          audio: false,
        });
      } catch (e) {
        const name = (e as DOMException).name;
        if (name === 'NotReadableError' || name === 'AbortError') {
          // Kamera zajęta (np. Teams, Zoom): pauza i ponowna próba co 30 s.
          this.cb.onCameraState('busy');
          this.retryTimer = window.setTimeout(() => void this.start(), 30000);
        } else if (name === 'NotAllowedError') this.cb.onCameraState('denied');
        else this.cb.onCameraState('missing', (e as Error).message);
        return;
      }
      this.video.srcObject = this.stream;
      this.gate.reset();
      await this.video.play().catch((e) => console.warn('Kamera: play() odrzucone:', (e as Error).name, (e as Error).message));
      this.stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        this.stop();
        this.cb.onCameraState('busy');
        this.retryTimer = window.setTimeout(() => void this.start(), 30000);
      });
    }
    this.running = true;
    this.cb.onCameraState('running');
    this.loop();
  }

  /** Zatrzymuje analizę i zwalnia kamerę (np. pauza albo spotkanie). */
  stop(): void {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.video.srcObject = null;
    const s = this.agg.flush();
    if (s) this.emitMinute(s);
    this.cb.onCameraState('stopped');
  }

  stopRetry(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
  }

  get isRunning(): boolean {
    return this.running;
  }

  /** Zbiera pomiary przez `sec` sekund i zwraca medianę jako wzorzec prostej postawy. */
  calibrate(sec = 5): Promise<Calibration | null> {
    return new Promise((resolve) => {
      this.calibrating = { until: this.now() + sec, samples: [], ears: [], resolve };
    });
  }

  private loop = (): void => {
    if (!this.running) return;
    const started = performance.now();
    try {
      this.tick();
    } catch (e) {
      console.error((e as Error).stack ?? e);
    }
    const faceFps = !this.settings.faceAnalysis ? 8 : this.onBattery ? 15 : 25;
    const wait = Math.max(5, 1000 / faceFps - (performance.now() - started));
    this.timer = window.setTimeout(this.loop, wait);
  };

  private tick(): void {
    const t = this.now();
    let ms = Math.round(performance.now());
    if (ms <= this.lastTs) ms = this.lastTs + 1;
    this.lastTs = ms;
    const w = this.video.videoWidth || 640;
    const h = this.video.videoHeight || 480;
    if (!this.demo && (this.video.readyState < 2 || !this.pose)) return;
    if (!this.demo && !this.gate.isFresh(this.video)) {
      // Brak nowej klatki (wideo wstrzymane, np. po odpięciu od DOM): nie analizujemy, wznawiamy odtwarzanie.
      this.resumeVideoIfPaused();
      if (ms - this.lastStatusMs > 500) {
        this.lastStatusMs = ms;
        this.cb.onStatus(this.status(t));
      }
      return;
    }
    const input = this.demo ? null : this.frameInput(w, h);

    // Twarz: każda klatka (mrugnięcia trwają 100–400 ms).
    let faceLm: Landmark[] | null = null;
    if (this.settings.faceAnalysis) {
      let ff: FaceFrame = { ear: null, blinkBlend: null, jawOpen: null };
      if (this.demo) {
        ff = demoFace(t);
      } else if (this.face) {
        const r = this.face.detectForVideo(input!, ms);
        faceLm = (r.faceLandmarks?.[0] as Landmark[] | undefined) ?? null;
        this.lastFace = faceLm;
        this.lastHeadPose = faceLm ? headPoseFromMatrix(r.facialTransformationMatrixes?.[0]?.data) : null;
        if (faceLm) {
          const cats = r.faceBlendshapes?.[0]?.categories ?? [];
          const bs = (n: string) => cats.find((c) => c.categoryName === n)?.score ?? null;
          const bl = bs('eyeBlinkLeft');
          const br = bs('eyeBlinkRight');
          const jaw = bs('jawOpen');
          ff = {
            ear: (eyeAspectRatio(faceLm, LEFT_EYE, w, h) + eyeAspectRatio(faceLm, RIGHT_EYE, w, h)) / 2,
            blinkBlend: bl !== null && br !== null ? (bl + br) / 2 : null,
            jawOpen: jaw ?? Math.min(1, mouthAspectRatio(faceLm, w, h) * 1.2),
          };
        }
      }
      this.eyes.update(t, ff);
      if (this.calibrating && ff.ear !== null) this.calibrating.ears.push(ff.ear);
    }

    // Sylwetka: ~8 razy na sekundę.
    if (ms - this.lastPoseMs >= POSE_INTERVAL_MS || !this.settings.faceAnalysis) {
      this.lastPoseMs = ms;
      let lm: Landmark[] | undefined;
      if (this.demo) lm = demoPose(t);
      else lm = this.pose!.detectForVideo(input!, ms).landmarks?.[0] as Landmark[] | undefined;
      this.lastPose = lm ?? null;
      const res = computeMetrics(lm, w, h, t, {
        smoother: this.smoother,
        face: this.settings.faceAnalysis && !this.demo ? this.lastFace : null,
        headPose: this.settings.faceAnalysis && !this.demo ? this.lastHeadPose : null,
        shoulderGate: this.shoulderGate,
      });
      this.lastMetrics = res.metrics;
      if (!res.metrics && res.reason === 'no-person') {
        this.smoother.reset();
        this.shoulderGate.reset();
      }

      if (this.calibrating) {
        if (res.metrics) this.calibrating.samples.push(res.metrics);
        // Na wolnym komputerze zbieramy dłużej (do +10 s), aż będzie min. 15 próbek.
        const c = this.calibrating;
        if (t >= c.until && (c.samples.length >= 15 || t >= c.until + 10)) this.finishCalibration();
      }

      if (this.tracker) {
        const out = this.tracker.update(t, res.metrics);
        this.lastTracker = out;
        if (res.metrics && this.calibration) {
          this.eyes.updateHead(t, res.metrics.neckRatio / this.calibration.neckRatio);
          this.trackFaceScale(res.metrics.eyeDistPx / this.calibration.eyeDistPx);
        }
        if (out.alert) {
          this.breaks.registerAlert(t);
          this.cb.onAlert(out.alert);
        }
        const avg15 = postureAvg(this.recent.slice(-15));
        this.lastFatigue = this.fatigue.update(t, this.eyes, {
          postureAvg15: avg15,
          minutesSinceBreak: this.breaks.minutesSinceBreak(t),
        });
        const fat = this.lastFatigue;

        const sug = this.breaks.update(t, {
          present: out.present,
          absentSec: out.absentSec,
          fatiguePercent: fat?.percent ?? null,
          postureSlope: postureSlope(this.recent.slice(-15)),
          recentIssue: topIssueOf(this.recent.slice(-10)) ?? out.topIssue,
        });
        if (sug) this.cb.onBreak(sug);

        const sample = this.agg.add(Date.now(), {
          present: out.present,
          score: out.score,
          state: out.state,
          severities: out.severities,
          fatigue: fat,
        });
        if (sample) this.emitMinute(sample);
      }
      this.cb.onFrame({
        t,
        pose: this.lastPose,
        face: faceLm,
        metrics: this.lastMetrics,
        tracker: this.lastTracker,
        fatigue: this.lastFatigue,
        reason: res.reason,
      });
    }

    if (ms - this.lastStatusMs > 500) {
      this.lastStatusMs = ms;
      this.cb.onStatus(this.status(t));
    }
  }

  /** Przeglądarka wstrzymuje <video> odpięte od dokumentu; dopóki analiza działa, wznawiamy je (co ~1 s). */
  private resumeVideoIfPaused(): void {
    if (!this.running || !this.video.paused || !this.video.srcObject) return;
    if (this.gate.staleCount % 25 !== 1) return;
    this.video.play().catch((e) => console.warn('Kamera: wznowienie play() nieudane:', (e as Error).name));
  }

  private frameInput(w: number, h: number): HTMLVideoElement | ImageData {
    if (!this.cpuFrames) return this.video;
    if (!this.frameCanvas || this.frameCanvas.width !== w || this.frameCanvas.height !== h) this.frameCanvas = new OffscreenCanvas(w, h);
    const c = this.frameCanvas.getContext('2d', { willReadFrequently: true })!;
    c.drawImage(this.video, 0, 0, w, h);
    return c.getImageData(0, 0, w, h);
  }

  status(t = this.now()): LiveStatus {
    const tr = this.lastTracker;
    return {
      state: !this.calibration ? 'paused' : tr?.state ?? 'absent',
      score: tr?.score ?? null,
      fatigue: tr?.present ? this.lastFatigue : null,
      topIssue: tr?.topIssue ?? null,
      minutesSinceBreak: Math.round(this.breaks.minutesSinceBreak(t)),
      note: !this.calibration ? 'Wymagana kalibracja' : undefined,
    };
  }

  /** Przerwa zakończona przez użytkownika. */
  breakDone(kind: BreakSuggestion['kind']): void {
    const t = this.now();
    this.breaks.done(kind, t);
    if (kind !== 'eye') {
      this.fatigue.reset();
      this.tracker?.resetStillness();
    }
  }

  breakSnoozed(): void {
    this.breaks.snooze(this.now());
  }

  private emitMinute(s: MinuteSample): void {
    this.recent.push(s);
    if (this.recent.length > 30) this.recent.shift();
    this.cb.onMinute(s);
  }

  private trackFaceScale(scale: number): void {
    this.faceScaleHist.push(scale);
    if (this.faceScaleHist.length > 8 * 60 * 30) this.faceScaleHist.shift();
    if (this.faceScaleHist.length < 8 * 60 * 30) return; // ~30 min danych
    const med = median(this.faceScaleHist);
    const day = new Date().toDateString();
    if ((med > 1.3 || med < 0.75) && this.recalHintDay !== day) {
      this.recalHintDay = day;
      this.cb.onRecalibrateHint();
    }
  }

  private finishCalibration(): void {
    const c = this.calibrating!;
    this.calibrating = null;
    if (c.samples.length < 15) {
      c.resolve(null);
      return;
    }
    const pick = (k: 'neckRatio' | 'earRatio' | 'headRollDeg' | 'shoulderTiltDeg' | 'eyeDistPx' | 'shoulderToEye') =>
      median(c.samples.map((s) => s[k]));
    const cal: Calibration = {
      createdAt: Date.now(),
      neckRatio: pick('neckRatio'),
      earRatio: pick('earRatio'),
      headRollDeg: pick('headRollDeg'),
      shoulderTiltDeg: pick('shoulderTiltDeg'),
      eyeDistPx: pick('eyeDistPx'),
      shoulderToEye: pick('shoulderToEye'),
      earOpen: c.ears.length >= 30 ? median(c.ears) : null,
      headPitchDeg: (() => {
        const v = c.samples.map((m) => m.headPitchDeg).filter((x): x is number => x != null);
        return v.length >= c.samples.length / 2 ? median(v) : null;
      })(),
    };
    this.setCalibration(cal);
    c.resolve(cal);
  }
}

// ——— Tryb demonstracyjny (bez kamery): syntetyczna sylwetka, przydatna do testów UI ———

function demoPose(t: number): Landmark[] {
  const lm: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0.05 }));
  const slouch = Math.max(0, Math.sin(t / 9)) * 0.07; // co jakiś czas się garbi
  const sway = Math.sin(t / 2.3) * 0.004;
  const set = (i: number, x: number, y: number) => (lm[i] = { x: x + sway, y, visibility: 0.98 });
  const headY = 0.36 + slouch;
  set(0, 0.5, headY + 0.06);
  set(2, 0.545, headY);
  set(5, 0.455, headY + slouch * 0.15);
  set(7, 0.59, headY + 0.02);
  set(8, 0.41, headY + 0.02);
  set(11, 0.68, 0.74);
  set(12, 0.32, 0.745 + slouch * 0.2);
  set(23, 0.62, 1.05);
  set(24, 0.38, 1.05);
  return lm;
}

function demoFace(t: number): FaceFrame {
  const phase = t % 3.7;
  return { ear: phase < 0.15 ? 0.07 : 0.29, blinkBlend: null, jawOpen: 0.05 };
}
