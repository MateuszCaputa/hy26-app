// Zamiana punktów z MediaPipe na wskaźniki postawy i zmęczenia.
// Kamera stoi z przodu, więc postawę oceniamy względem kalibracji (siedzisz prosto = punkt odniesienia).

const median = (arr) => {
  const a = arr.filter((v) => Number.isFinite(v)).sort((x, y) => x - y)
  if (!a.length) return null
  const m = Math.floor(a.length / 2)
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const deg = (rad) => (rad * 180) / Math.PI

// Indeksy punktów
const FACE = { eyeL: 33, eyeR: 263, nose: 1 }
const POSE = { earL: 7, earR: 8, shL: 11, shR: 12 }

export function extractFeatures(face, pose, w, h) {
  const f = { face: false, pose: false }

  const lm = face?.faceLandmarks?.[0]
  if (lm) {
    f.face = true
    const ex = (lm[FACE.eyeR].x - lm[FACE.eyeL].x) * w
    const ey = (lm[FACE.eyeR].y - lm[FACE.eyeL].y) * h
    f.eyeDist = Math.hypot(ex, ey) / w // względna wielkość twarzy: rośnie, gdy przysuwasz się do ekranu
    f.headRoll = deg(Math.atan2(ey, ex))
    f.noseY = lm[FACE.nose].y
    const cats = face.faceBlendshapes?.[0]?.categories || []
    const bs = {}
    for (const c of cats) bs[c.categoryName] = c.score
    f.blink = ((bs.eyeBlinkLeft ?? 0) + (bs.eyeBlinkRight ?? 0)) / 2
    f.jawOpen = bs.jawOpen ?? 0
  }

  const p = pose?.landmarks?.[0]
  if (p) {
    const vis = (i) => (p[i].visibility ?? 1) > 0.5
    if (vis(POSE.shL) && vis(POSE.shR) && (vis(POSE.earL) || vis(POSE.earR))) {
      f.pose = true
      const sx = (p[POSE.shR].x - p[POSE.shL].x) * w
      const sy = (p[POSE.shR].y - p[POSE.shL].y) * h
      const shoulderW = Math.hypot(sx, sy)
      const shMidY = ((p[POSE.shL].y + p[POSE.shR].y) / 2) * h
      const ears = [POSE.earL, POSE.earR].filter(vis)
      const earMidY = (ears.reduce((s, i) => s + p[i].y, 0) / ears.length) * h
      // Odległość uszu od linii barków względem szerokości barków. Maleje, gdy głowa opada / garbisz się.
      f.neckRatio = (shMidY - earMidY) / shoulderW
      f.shoulderTilt = deg(Math.atan2(sy, sx))
      f.shoulderW = shoulderW / w
    }
  }
  return f
}

export function buildBaseline(samples) {
  return {
    eyeDist: median(samples.map((s) => s.eyeDist)),
    headRoll: median(samples.map((s) => s.headRoll)),
    noseY: median(samples.map((s) => s.noseY)),
    neckRatio: median(samples.map((s) => s.neckRatio)),
    shoulderTilt: median(samples.map((s) => s.shoulderTilt)),
    shoulderW: median(samples.map((s) => s.shoulderW)),
    blinkClosed: median(samples.map((s) => s.blink)),
    createdAt: Date.now(),
  }
}

// Ocena postawy 0–100 dla jednej klatki, z listą problemów do pokazania na żywo.
export function assessPosture(f, base) {
  if (!base || !f.face) return null
  const issues = []
  let penalty = 0

  if (f.pose && base.neckRatio) {
    const neckDrop = 1 - f.neckRatio / base.neckRatio
    const p = clamp((neckDrop - 0.06) * 300, 0, 50)
    if (p > 12) issues.push('neck')
    penalty += p
  } else if (base.noseY && base.eyeDist) {
    // Bez barków w kadrze: patrzymy, o ile opadł nos względem kalibracji
    const drop = (f.noseY - base.noseY) / (base.eyeDist * 2)
    const p = clamp((drop - 0.1) * 120, 0, 40)
    if (p > 12) issues.push('neck')
    penalty += p
  }

  if (base.eyeDist) {
    const closer = f.eyeDist / base.eyeDist - 1
    const p = clamp((closer - 0.06) * 250, 0, 30)
    if (p > 10) issues.push('close')
    penalty += p
  }

  if (f.pose && Number.isFinite(base.shoulderTilt)) {
    const d = Math.abs(f.shoulderTilt - base.shoulderTilt)
    const p = clamp((d - 3) * 3, 0, 15)
    if (p > 6) issues.push('shoulders')
    penalty += p
  }

  if (Number.isFinite(base.headRoll)) {
    const d = Math.abs(f.headRoll - base.headRoll)
    const p = clamp((d - 6) * 2, 0, 15)
    if (p > 6) issues.push('roll')
    penalty += p
  }

  return { score: Math.round(100 - clamp(penalty, 0, 100)), issues }
}

export const ISSUE_TEXT = {
  neck: 'Głowa opada w stronę barków. Wyprostuj plecy.',
  close: 'Pochylasz się do ekranu. Odsuń się.',
  shoulders: 'Barki są nierówno. Rozluźnij je.',
  roll: 'Głowa jest przechylona na bok.',
}

// Wskaźnik zmęczenia 0–100 dla jednej minuty. Heurystyka oparta na wskaźnikach z badań nad kierowcami
// (PERCLOS, częstość mrugania, ziewanie) i na pogorszeniu postawy. Nie jest to pomiar medyczny.
export function fatigueScore(m) {
  if (!m.faceFrames) return null
  let s = 0
  s += clamp((m.perclos - 0.05) * 250, 0, 40) // odsetek czasu z zamkniętymi oczami
  if (m.blinks < 8) s += clamp((8 - m.blinks) * 2.5, 0, 15) // wpatrywanie się w ekran
  if (m.blinks > 26) s += clamp((m.blinks - 26) * 1.5, 0, 15) // częste mruganie przy zmęczeniu oczu
  s += clamp(m.yawns * 15, 0, 30)
  s += clamp(m.longClosures * 8, 0, 20)
  if (m.posture != null) s += clamp((80 - m.posture) * 0.3, 0, 15)
  return Math.round(clamp(s, 0, 100))
}

// Liczy mrugnięcia, PERCLOS i ziewnięcia klatka po klatce oraz składa agregaty minutowe.
export class MinuteAggregator {
  constructor(onMinute) {
    this.onMinute = onMinute
    this.eyeClosed = false
    this.closedSince = 0
    this.jawOpenSince = 0
    this.yawnActive = false
    this.reset(null)
  }

  reset(minute) {
    this.minute = minute
    this.frames = 0
    this.faceFrames = 0
    this.closedFrames = 0
    this.blinks = 0
    this.longClosures = 0
    this.yawns = 0
    this.postureSum = 0
    this.postureN = 0
    this.badFrames = 0
    this.issueCounts = { neck: 0, close: 0, shoulders: 0, roll: 0 }
  }

  push(f, posture, now) {
    const minute = Math.floor(now / 60000) * 60000
    if (this.minute === null) this.minute = minute
    if (minute !== this.minute) this.flush(minute)

    this.frames++
    if (!f.face) return
    this.faceFrames++

    // Mruganie z histerezą: zamknięte > 0.5, otwarte < 0.35
    if (!this.eyeClosed && f.blink > 0.5) {
      this.eyeClosed = true
      this.closedSince = now
    } else if (this.eyeClosed && f.blink < 0.35) {
      this.eyeClosed = false
      const dur = now - this.closedSince
      if (dur < 500) this.blinks++
      else this.longClosures++
    }
    if (this.eyeClosed) this.closedFrames++

    // Ziewnięcie: szeroko otwarte usta przez co najmniej 1,2 s
    if (f.jawOpen > 0.55) {
      if (!this.jawOpenSince) this.jawOpenSince = now
      if (!this.yawnActive && now - this.jawOpenSince > 1200) {
        this.yawnActive = true
        this.yawns++
      }
    } else if (f.jawOpen < 0.3) {
      this.jawOpenSince = 0
      this.yawnActive = false
    }

    if (posture) {
      this.postureSum += posture.score
      this.postureN++
      if (posture.score < 70) this.badFrames++
      for (const i of posture.issues) this.issueCounts[i]++
    }
  }

  snapshot() {
    const m = {
      t: this.minute,
      frames: this.frames,
      faceFrames: this.faceFrames,
      presence: this.frames ? this.faceFrames / this.frames : 0,
      perclos: this.faceFrames ? this.closedFrames / this.faceFrames : 0,
      blinks: this.blinks,
      longClosures: this.longClosures,
      yawns: this.yawns,
      posture: this.postureN ? Math.round(this.postureSum / this.postureN) : null,
      badFrac: this.postureN ? this.badFrames / this.postureN : 0,
      issues: { ...this.issueCounts },
    }
    m.fatigue = fatigueScore(m)
    return m
  }

  flush(nextMinute) {
    if (this.frames > 0) this.onMinute(this.snapshot())
    this.reset(nextMinute)
  }
}
