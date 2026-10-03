import { useEffect, useRef } from 'react'
import { monitor } from '../lib/monitor'
import { ISSUE_TEXT } from '../lib/metrics'

const pct = (v) => `${Math.round(v * 100)}%`

function scoreTone(s) {
  if (s == null) return 'muted'
  if (s >= 80) return 'good'
  if (s >= 60) return 'warn'
  return 'bad'
}

function drawOverlay(canvas, video, features, posture) {
  if (!canvas || !video || !video.videoWidth) return
  const w = video.videoWidth
  const h = video.videoHeight
  if (canvas.width !== w) {
    canvas.width = w
    canvas.height = h
  }
  const ctx = canvas.getContext('2d')
  ctx.save()
  // Lustrzane odbicie, żeby obraz zachowywał się jak lustro
  ctx.translate(w, 0)
  ctx.scale(-1, 1)
  ctx.drawImage(video, 0, 0, w, h)

  const css = getComputedStyle(document.documentElement)
  const tone = scoreTone(posture?.score)
  const color = css.getPropertyValue(`--${tone === 'muted' ? 'accent' : tone}`).trim() || '#2a7'

  const p = features?.poseLandmarks
  if (p) {
    const pt = (i) => [p[i].x * w, p[i].y * h]
    const earMid = [(pt(7)[0] + pt(8)[0]) / 2, (pt(7)[1] + pt(8)[1]) / 2]
    const shMid = [(pt(11)[0] + pt(12)[0]) / 2, (pt(11)[1] + pt(12)[1]) / 2]
    ctx.lineWidth = 4
    ctx.strokeStyle = color
    ctx.beginPath()
    ctx.moveTo(...pt(11))
    ctx.lineTo(...pt(12))
    ctx.moveTo(...shMid)
    ctx.lineTo(...earMid)
    ctx.stroke()
    for (const i of [7, 8, 11, 12]) {
      const [x, y] = pt(i)
      ctx.beginPath()
      ctx.arc(x, y, 7, 0, Math.PI * 2)
      ctx.fillStyle = '#fff'
      ctx.fill()
      ctx.lineWidth = 3
      ctx.stroke()
    }
  }
  const f = features?.faceLandmarks
  if (f) {
    ctx.fillStyle = color
    for (const i of [33, 263, 1, 13, 14]) {
      ctx.beginPath()
      ctx.arc(f[i].x * w, f[i].y * h, 3.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()
}

export default function Live({ person, state, goStart }) {
  const canvasRef = useRef(null)
  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    let raf
    const loop = () => {
      const s = stateRef.current
      drawOverlay(canvasRef.current, monitor.getVideo(), s.features, s.posture)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  if (!person) {
    return (
      <section className="empty">
        <h2>Najpierw ustaw punkt odniesienia</h2>
        <p>Rytm potrzebuje 10 sekund kalibracji, żeby wiedzieć, jak wygląda Twoja prosta postawa.</p>
        <button className="btn primary" onClick={goStart}>
          Przejdź do kalibracji
        </button>
      </section>
    )
  }

  const live = state.live
  const posture = state.posture
  const tone = scoreTone(posture?.score)
  const minuteSec = live ? Math.max(1, (Date.now() - live.t) / 1000) : 1

  return (
    <section className="live">
      <div className="cam card">
        <canvas ref={canvasRef} className="cam-canvas" aria-label="Podgląd z kamery z zaznaczonymi punktami uszu, barków i oczu" />
        {state.status !== 'running' && <div className="cam-overlay">{state.status === 'error' ? state.error : 'Uruchamiam kamerę i modele…'}</div>}
        {state.calibrating && <div className="cam-overlay">Kalibracja… siedź prosto</div>}
        <p className="cam-note">Obraz jest analizowany na tym komputerze i nie jest zapisywany.</p>
      </div>

      <div className="panel">
        <div className={`gauge card tone-${tone}`}>
          <span className="label">Postawa teraz</span>
          <span className="gauge-num">{posture ? posture.score : '–'}</span>
          <span className="gauge-unit">/ 100</span>
          <div className="meter">
            <span style={{ width: `${posture?.score ?? 0}%` }} />
          </div>
          <ul className="issues">
            {!state.hasBaseline && <li>Brak kalibracji. Przejdź do ekranu Start.</li>}
            {posture && posture.issues.length === 0 && <li className="fine">Siedzisz prosto.</li>}
            {posture?.issues.map((i) => (
              <li key={i}>{ISSUE_TEXT[i]}</li>
            ))}
            {state.features && !state.features.face && <li>Nie widzę twarzy w kadrze.</li>}
          </ul>
        </div>

        <div className="stats">
          <div className="stat card">
            <span className="label">Mrugnięcia w tej minucie</span>
            <span className="stat-num">{live?.blinks ?? 0}</span>
            <span className="hint">≈ {live ? Math.round((live.blinks / minuteSec) * 60) : 0}/min · norma przy ekranie 10–20</span>
          </div>
          <div className="stat card">
            <span className="label">Oczy zamknięte (PERCLOS)</span>
            <span className="stat-num">{live ? pct(live.perclos) : '0%'}</span>
            <span className="hint">powyżej 15% to sygnał senności</span>
          </div>
          <div className="stat card">
            <span className="label">Ziewnięcia w tej minucie</span>
            <span className="stat-num">{live?.yawns ?? 0}</span>
            <span className="hint">długie zamknięcia oczu: {live?.longClosures ?? 0}</span>
          </div>
          <div className="stat card">
            <span className="label">Przy biurku bez przerwy</span>
            <span className="stat-num">{state.deskMinutes} min</span>
            <span className="hint">przerwa wg BHP po 60 min</span>
          </div>
        </div>

        {state.lastMinute && (
          <p className="minute-line">
            Ostatnia pełna minuta: postawa {state.lastMinute.posture ?? '–'}, zmęczenie {state.lastMinute.fatigue ?? '–'}/100, obecność {pct(state.lastMinute.presence)}.
          </p>
        )}
      </div>
    </section>
  )
}
