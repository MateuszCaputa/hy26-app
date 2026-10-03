import { FaceLandmarker, PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import { extractFeatures, assessPosture, buildBaseline, MinuteAggregator } from './metrics'
import { db, logEvent } from './db'

const TICK_MS = 66 // ok. 15 klatek/s: wystarcza do wykrycia mrugnięcia
const POSE_EVERY = 3 // model sylwetki co 3. klatkę, żeby oszczędzać procesor

// Progi przypomnień
const BAD_POSTURE_MS = 45_000
const POSTURE_COOLDOWN_MS = 15 * 60_000
const DESK_BREAK_MIN = 55 // przepisy BHP: 5 min przerwy po każdej godzinie pracy przy monitorze
const BREAK_COOLDOWN_MS = 30 * 60_000
const AWAY_BREAK_MIN = 3 // tyle minut bez twarzy w kadrze liczymy jako przerwę

async function createTask(Task, fileset, options) {
  try {
    return await Task.createFromOptions(fileset, { ...options, baseOptions: { ...options.baseOptions, delegate: 'GPU' } })
  } catch {
    return await Task.createFromOptions(fileset, { ...options, baseOptions: { ...options.baseOptions, delegate: 'CPU' } })
  }
}

class Monitor {
  constructor() {
    this.listeners = new Set()
    this.state = { status: 'idle', error: null, fps: 0, features: null, posture: null, lastMinute: null, deskMinutes: 0 }
    this.video = null
    this.stream = null
    this.face = null
    this.pose = null
    this.worker = null
    this.person = null
    this.baseline = null
    this.calib = null
    this.frame = 0
    this.lastPose = null
    this.badSince = 0
    this.lastPostureNudge = 0
    this.lastBreakNudge = 0
    this.recentMinutes = []
    this.fpsCount = 0
    this.fpsAt = 0
    this.lastEmit = 0
    this.agg = new MinuteAggregator((m) => this.onMinute(m))
  }

  subscribe(fn) {
    this.listeners.add(fn)
    fn(this.state)
    return () => this.listeners.delete(fn)
  }

  set(patch) {
    this.state = { ...this.state, ...patch }
    for (const fn of this.listeners) fn(this.state)
  }

  async init() {
    if (this.face) return
    this.set({ status: 'loading', error: null })
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' }, audio: false })
      this.video = document.createElement('video')
      this.video.muted = true
      this.video.playsInline = true
      this.video.srcObject = this.stream
      await this.video.play()

      const base = new URL(import.meta.env.BASE_URL, window.location.href).href
      const fileset = await FilesetResolver.forVisionTasks(`${base}wasm`)
      this.face = await createTask(FaceLandmarker, fileset, {
        baseOptions: { modelAssetPath: `${base}models/face_landmarker.task` },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFaceBlendshapes: true,
      })
      this.pose = await createTask(PoseLandmarker, fileset, {
        baseOptions: { modelAssetPath: `${base}models/pose_landmarker_lite.task` },
        runningMode: 'VIDEO',
        numPoses: 1,
      })
      this.set({ status: 'ready' })
    } catch (e) {
      console.error(e)
      const msg = e?.name === 'NotAllowedError' ? 'Brak zgody na kamerę. Zezwól na dostęp w pasku adresu przeglądarki.' : `Nie udało się uruchomić kamery lub modeli: ${e?.message || e}`
      this.set({ status: 'error', error: msg })
      throw e
    }
  }

  async start(person) {
    await this.init()
    this.person = person
    this.baseline = (await db.get(`baseline:${person}`)) || null
    if (!this.worker) {
      this.worker = new Worker(new URL('./ticker.worker.js', import.meta.url))
      this.worker.onmessage = () => this.tick()
    }
    this.worker.postMessage({ cmd: 'start', interval: TICK_MS })
    this.set({ status: 'running', person, hasBaseline: !!this.baseline })
  }

  stop() {
    this.worker?.postMessage({ cmd: 'stop' })
    this.agg.flush(null)
    this.set({ status: 'ready' })
  }

  // Kalibracja: przez `ms` milisekund zbieramy próbki pozycji wyprostowanej
  calibrate(ms = 10_000) {
    return new Promise((resolve) => {
      this.calib = { samples: [], until: performance.now() + ms, resolve }
    })
  }

  tick() {
    const v = this.video
    if (!v || v.readyState < 2) return
    const ts = performance.now()
    // Twardy limit częstotliwości, niezależnie od tego, ile ticków przyśle worker
    if (ts - (this.lastTick || 0) < TICK_MS * 0.8) return
    this.lastTick = ts
    let faceRes = null
    try {
      faceRes = this.face.detectForVideo(v, ts)
      if (this.frame % POSE_EVERY === 0) this.lastPose = this.pose.detectForVideo(v, ts)
    } catch (e) {
      console.warn(e)
      return
    }
    this.frame++
    const f = extractFeatures(faceRes, this.lastPose, v.videoWidth, v.videoHeight)
    f.faceLandmarks = faceRes?.faceLandmarks?.[0] || null
    f.poseLandmarks = this.lastPose?.landmarks?.[0] || null

    if (this.calib) {
      if (f.face) this.calib.samples.push(f)
      if (ts >= this.calib.until) {
        const { samples, resolve } = this.calib
        this.calib = null
        const base = samples.length > 20 ? buildBaseline(samples) : null
        if (base) {
          this.baseline = base
          db.set(`baseline:${this.person}`, base)
          logEvent(this.person, 'calibration')
        }
        this.set({ hasBaseline: !!this.baseline })
        resolve(base)
      }
    }

    const now = Date.now()
    const posture = assessPosture(f, this.baseline)
    this.agg.push(f, posture, now)
    this.checkPostureNudge(posture, now)

    this.fpsCount++
    if (ts - this.fpsAt > 1000) {
      this.set({ fps: this.fpsCount })
      this.fpsCount = 0
      this.fpsAt = ts
    }
    // Stan na żywo odświeżamy ok. 10 razy na sekundę, a tylko gdy karta jest widoczna
    if (!document.hidden && ts - this.lastEmit > 90) {
      this.lastEmit = ts
      this.set({ features: f, posture, live: this.agg.snapshot(), calibrating: !!this.calib })
    }
  }

  async onMinute(m) {
    if (!this.person) return
    const rec = { ...m, id: `${this.person}|${m.t}`, person: this.person }
    await db.put('minutes', rec)
    this.recentMinutes = [...this.recentMinutes.slice(-89), rec]
    const deskMinutes = this.continuousDeskMinutes()
    this.set({ lastMinute: rec, deskMinutes })
    this.checkBreakNudge(deskMinutes, Date.now())
  }

  // Ile minut z rzędu użytkownik siedzi przy biurku (przerwa = co najmniej 3 min poza kadrem)
  continuousDeskMinutes() {
    let count = 0
    let away = 0
    for (let i = this.recentMinutes.length - 1; i >= 0; i--) {
      const m = this.recentMinutes[i]
      if (m.presence >= 0.5) {
        count++
        away = 0
      } else if (++away >= AWAY_BREAK_MIN) break
    }
    return count
  }

  checkPostureNudge(posture, now) {
    if (!posture || posture.score >= 70) {
      this.badSince = 0
      return
    }
    if (!this.badSince) this.badSince = now
    if (now - this.badSince > BAD_POSTURE_MS && now - this.lastPostureNudge > POSTURE_COOLDOWN_MS) {
      this.lastPostureNudge = now
      this.badSince = 0
      this.nudge('posture', 'Od dłuższej chwili siedzisz pochylony. Wyprostuj plecy i odsuń się od ekranu.', { issues: posture.issues })
    }
  }

  checkBreakNudge(deskMinutes, now) {
    if (now - this.lastBreakNudge < BREAK_COOLDOWN_MS) return
    const last10 = this.recentMinutes.slice(-10).filter((m) => m.fatigue != null)
    const fatigue10 = last10.length >= 5 ? last10.reduce((s, m) => s + m.fatigue, 0) / last10.length : 0
    if (fatigue10 >= 45) {
      this.lastBreakNudge = now
      this.nudge('break', `Twoje oczy i postawa pokazują zmęczenie (wskaźnik ${Math.round(fatigue10)}/100 przez ostatnie 10 minut). Zrób 5 minut przerwy z dala od ekranu.`, { fatigue: Math.round(fatigue10) })
    } else if (deskMinutes >= DESK_BREAK_MIN) {
      this.lastBreakNudge = now
      this.nudge('break', `Siedzisz przy komputerze od ${deskMinutes} minut. Przepisy BHP dają Ci 5 minut przerwy po każdej godzinie pracy przy monitorze. Wstań i się rozciągnij.`, { deskMinutes })
    }
  }

  async nudge(kind, text, data) {
    const ev = await logEvent(this.person, 'nudge', { kind, text, ...data })
    this.set({ nudge: ev })
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(kind === 'break' ? 'Rytm: czas na przerwę' : 'Rytm: postawa', { body: text, tag: `rytm-${kind}` })
      } catch {
        /* powiadomienia systemowe są tylko dodatkiem */
      }
    }
  }

  dismissNudge() {
    this.set({ nudge: null })
  }

  getVideo() {
    return this.video
  }
}

export const monitor = new Monitor()
if (import.meta.env.DEV) window.__rytm = monitor // podgląd stanu w konsoli przy testach
