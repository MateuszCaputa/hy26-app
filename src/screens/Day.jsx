import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/db'

const RANGES = [
  { id: '24h', label: 'Ostatnie 24 h', ms: 24 * 3600_000 },
  { id: '6h', label: 'Ostatnie 6 h', ms: 6 * 3600_000 },
  { id: '1h', label: 'Ostatnia godzina', ms: 3600_000 },
]

const hhmm = (t) => new Date(t).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })

// Średnia krocząca, żeby linia nie skakała z minuty na minutę
function smooth(points, key, win = 5) {
  return points.map((p, i) => {
    const slice = points.slice(Math.max(0, i - win + 1), i + 1).map((q) => q[key]).filter((v) => v != null)
    return { t: p.t, v: slice.length ? slice.reduce((a, b) => a + b, 0) / slice.length : null }
  })
}

function hourly(minutes) {
  const map = new Map()
  for (const m of minutes) {
    if (m.presence < 0.5) continue
    const h = new Date(m.t)
    h.setMinutes(0, 0, 0)
    const k = h.getTime()
    const e = map.get(k) || { t: k, posture: [], fatigue: [], n: 0 }
    if (m.posture != null) e.posture.push(m.posture)
    if (m.fatigue != null) e.fatigue.push(m.fatigue)
    e.n++
    map.set(k, e)
  }
  const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null)
  return [...map.values()]
    .sort((a, b) => a.t - b.t)
    .map((e) => ({ t: e.t, posture: avg(e.posture), fatigue: avg(e.fatigue), energy: e.fatigue.length ? 100 - avg(e.fatigue) : null, n: e.n }))
}

function Chart({ minutes, events, from, to }) {
  const W = 900
  const H = 260
  const pad = { l: 36, r: 12, t: 22, b: 28 }
  const x = (t) => pad.l + ((t - from) / (to - from)) * (W - pad.l - pad.r)
  const y = (v) => pad.t + (1 - v / 100) * (H - pad.t - pad.b)

  const path = (pts) => {
    let d = ''
    let prev = null
    for (const p of pts) {
      if (p.v == null) {
        prev = null
        continue
      }
      // przerwa w danych dłuższa niż 3 min = przerwa w linii
      d += `${prev && p.t - prev.t <= 180_000 ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`
      prev = p
    }
    return d
  }

  const present = minutes.filter((m) => m.presence >= 0.5)
  const posture = smooth(present, 'posture')
  const fatigue = smooth(present, 'fatigue')

  const span = to - from
  const step = span > 12 * 3600_000 ? 3 * 3600_000 : span > 3 * 3600_000 ? 3600_000 : 15 * 60_000
  const ticks = []
  for (let t = Math.ceil(from / step) * step; t <= to; t += step) ticks.push(t)

  const nudges = events.filter((e) => e.type === 'nudge')
  const moods = events.filter((e) => e.type === 'mood')

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Postawa i zmęczenie w czasie">
        {[0, 50, 100].map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} className="grid" />
            <text x={pad.l - 8} y={y(v) + 4} className="axis" textAnchor="end">
              {v}
            </text>
          </g>
        ))}
        {ticks.map((t) => (
          <text key={t} x={x(t)} y={H - 8} className="axis" textAnchor="middle">
            {hhmm(t)}
          </text>
        ))}
        {minutes
          .filter((m) => m.presence < 0.5)
          .map((m) => (
            <rect key={m.id} x={x(m.t)} y={pad.t} width={Math.max(1, x(m.t + 60_000) - x(m.t))} height={H - pad.t - pad.b} className="away" />
          ))}
        <path d={path(posture)} className="line-posture" />
        <path d={path(fatigue)} className="line-fatigue" />
        {nudges.map((e) => (
          <g key={e.id}>
            <line x1={x(e.t)} x2={x(e.t)} y1={pad.t - 6} y2={H - pad.b} className="nudge-line" />
            <circle cx={x(e.t)} cy={pad.t - 8} r="5" className={e.kind === 'break' ? 'nudge-dot break' : 'nudge-dot'}>
              <title>{`${hhmm(e.t)} · ${e.text}`}</title>
            </circle>
          </g>
        ))}
        {moods.map((e) => (
          <text key={e.id} x={x(e.t)} y={H - pad.b - 6} textAnchor="middle" fontSize="14">
            {['', '😫', '😐', '🙂'][e.value]}
          </text>
        ))}
      </svg>
      <div className="legend">
        <span>
          <i className="sw posture" /> Postawa (0–100)
        </span>
        <span>
          <i className="sw fatigue" /> Zmęczenie (0–100)
        </span>
        <span>
          <i className="sw away" /> Poza biurkiem
        </span>
        <span>
          <i className="sw nudge" /> Przypomnienie Rytmu
        </span>
      </div>
    </div>
  )
}

export default function Day({ person }) {
  const [minutes, setMinutes] = useState([])
  const [events, setEvents] = useState([])
  const [who, setWho] = useState(person?.name || '')
  const [range, setRange] = useState('24h')
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const load = async () => {
      setMinutes(await db.all('minutes'))
      setEvents(await db.all('events'))
      setNow(Date.now())
    }
    load()
    const id = setInterval(load, 30_000)
    return () => clearInterval(id)
  }, [])

  const people = useMemo(() => [...new Set(minutes.map((m) => m.person))].sort(), [minutes])
  const active = who || people[0] || ''
  const from = now - RANGES.find((r) => r.id === range).ms

  const mine = useMemo(() => minutes.filter((m) => m.person === active && m.t >= from).sort((a, b) => a.t - b.t), [minutes, active, from])
  const myEvents = useMemo(() => events.filter((e) => e.person === active && e.t >= from), [events, active, from])
  const hours = useMemo(() => hourly(mine), [mine])

  const atDesk = mine.filter((m) => m.presence >= 0.5)
  const avgPosture = atDesk.filter((m) => m.posture != null)
  const postureAvg = avgPosture.length ? Math.round(avgPosture.reduce((s, m) => s + m.posture, 0) / avgPosture.length) : null
  const badMinutes = atDesk.filter((m) => m.badFrac > 0.5).length
  const withEnergy = hours.filter((h) => h.energy != null && h.n >= 10)
  const best = withEnergy.length ? withEnergy.reduce((a, b) => (b.energy > a.energy ? b : a)) : null
  const worst = withEnergy.length ? withEnergy.reduce((a, b) => (b.energy < a.energy ? b : a)) : null
  const nudgeCount = myEvents.filter((e) => e.type === 'nudge').length

  return (
    <section className="day">
      <div className="day-head">
        <div>
          <p className="eyebrow">Rytm dnia</p>
          <h1>{active ? `Jak mija dzień: ${active}` : 'Brak danych'}</h1>
        </div>
        <div className="controls">
          <label htmlFor="who" className="sr">
            Osoba
          </label>
          <select id="who" value={active} onChange={(e) => setWho(e.target.value)}>
            {people.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <div className="seg" role="group" aria-label="Zakres czasu">
            {RANGES.map((r) => (
              <button key={r.id} className={range === r.id ? 'on' : ''} onClick={() => setRange(r.id)}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {mine.length === 0 ? (
        <div className="empty card">
          <h2>Jeszcze nie ma czego pokazać</h2>
          <p>Rytm zapisuje dane co minutę. Pierwsze punkty pojawią się po minucie pomiaru, a wykres zacznie mieć sens po kilkunastu minutach.</p>
        </div>
      ) : (
        <>
          <div className="summary">
            <div className="stat card">
              <span className="label">Przy biurku</span>
              <span className="stat-num">{Math.floor(atDesk.length / 60)} h {atDesk.length % 60} min</span>
            </div>
            <div className="stat card">
              <span className="label">Średnia postawa</span>
              <span className="stat-num">{postureAvg ?? '–'}</span>
              <span className="hint">{badMinutes} min w złej pozycji</span>
            </div>
            <div className="stat card">
              <span className="label">Najwięcej energii</span>
              <span className="stat-num">{best ? hhmm(best.t) : '–'}</span>
              <span className="hint">{worst ? `najmniej: ${hhmm(worst.t)}` : 'potrzeba min. godziny danych'}</span>
            </div>
            <div className="stat card">
              <span className="label">Przypomnienia</span>
              <span className="stat-num">{nudgeCount}</span>
            </div>
          </div>

          <div className="card">
            <Chart minutes={mine} events={myEvents} from={from} to={now} />
          </div>

          {hours.length > 0 && (
            <div className="card">
              <h2 className="h-small">Mapa energii godzina po godzinie</h2>
              <div className="heat">
                {hours.map((h) => (
                  <div key={h.t} className="heat-cell" style={{ '--e': h.energy == null ? 0 : h.energy / 100 }} title={`${hhmm(h.t)}: energia ${h.energy == null ? '–' : Math.round(h.energy)}/100, postawa ${h.posture == null ? '–' : Math.round(h.posture)}`}>
                    <span className="heat-v">{h.energy == null ? '–' : Math.round(h.energy)}</span>
                    <span className="heat-h">{new Date(h.t).getHours()}:00</span>
                  </div>
                ))}
              </div>
              <p className="hint">Energia = 100 minus średni wskaźnik zmęczenia z kamery. Heurystyka, nie pomiar medyczny.</p>
            </div>
          )}
        </>
      )}
    </section>
  )
}
