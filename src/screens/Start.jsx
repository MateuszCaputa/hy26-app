import { useState } from 'react'
import { monitor } from '../lib/monitor'
import { db } from '../lib/db'

export default function Start({ person, onReady }) {
  const [name, setName] = useState(person?.name || '')
  const [consent, setConsent] = useState(!!person?.consent)
  const [phase, setPhase] = useState('form') // form | calibrating | done | error
  const [msg, setMsg] = useState('')
  const [left, setLeft] = useState(10)

  const begin = async (e) => {
    e.preventDefault()
    const clean = name.trim()
    if (!clean || !consent) return
    try {
      if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission()
      await db.set(`profile:${clean}`, { name: clean, consent: true, consentAt: Date.now() })
      await monitor.start(clean)
      setPhase('calibrating')
      setLeft(10)
      const timer = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000)
      const base = await monitor.calibrate(10_000)
      clearInterval(timer)
      if (!base) {
        setPhase('error')
        setMsg('Kamera nie widziała twarzy podczas kalibracji. Usiądź przodem do ekranu, w dobrym świetle, i spróbuj ponownie.')
        return
      }
      setPhase('done')
      setTimeout(() => onReady({ name: clean, consent: true }), 700)
    } catch {
      setPhase('error')
      setMsg(monitor.state.error || 'Nie udało się uruchomić pomiaru.')
    }
  }

  return (
    <section className="start">
      <div className="start-copy">
        <p className="eyebrow">Krok 1 z 1 · ok. 30 sekund</p>
        <h1>Ustaw swój punkt odniesienia</h1>
        <p className="lede">
          Rytm porównuje Twoją postawę z tą, którą teraz zapamięta. Usiądź wygodnie i prosto, plecy oparte, ekran na wysokości oczu. Przez 10 sekund patrz na ekran.
        </p>
        <ul className="facts">
          <li>Obraz z kamery jest analizowany na tym komputerze. Nie nagrywamy go i nigdzie nie wysyłamy.</li>
          <li>Zapisujemy tylko liczby z każdej minuty: postawę, mruganie, ziewanie i obecność przy biurku.</li>
          <li>Rytm nie rozpoznaje emocji i nie stawia diagnoz.</li>
        </ul>
      </div>

      <form className="card start-form" onSubmit={begin}>
        <label htmlFor="name">Imię lub pseudonim</label>
        <input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="np. Marcin" autoComplete="off" disabled={phase === 'calibrating'} />

        <label className="check" htmlFor="consent">
          <input id="consent" type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} disabled={phase === 'calibrating'} />
          <span>Zgadzam się na pomiar przez kamerę i na pokazanie moich danych zespołowi oraz jury pod tym imieniem lub pseudonimem.</span>
        </label>

        {phase === 'calibrating' ? (
          <div className="calib" aria-live="polite">
            <div className="calib-count">{left}</div>
            <p>Siedź prosto i patrz na ekran…</p>
          </div>
        ) : (
          <button className="btn primary" type="submit" disabled={!name.trim() || !consent}>
            {person ? 'Skalibruj ponownie' : 'Włącz kamerę i skalibruj'}
          </button>
        )}

        {phase === 'done' && <p className="ok">Gotowe. Pomiar działa.</p>}
        {phase === 'error' && <p className="err">{msg}</p>}
      </form>
    </section>
  )
}
