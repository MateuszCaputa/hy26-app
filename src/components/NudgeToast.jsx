import { useState } from 'react'
import { monitor } from '../lib/monitor'
import { logEvent } from '../lib/db'

const MOODS = [
  { value: 1, emoji: '😫', label: 'Kiepsko' },
  { value: 2, emoji: '😐', label: 'Tak sobie' },
  { value: 3, emoji: '🙂', label: 'Dobrze' },
]

// Przypomnienie z opcjonalnym kliknięciem samopoczucia (jedno kliknięcie, bez formularza)
export default function NudgeToast({ nudge, person }) {
  const [picked, setPicked] = useState(null)

  const pick = async (m) => {
    setPicked(m.value)
    await logEvent(person, 'mood', { value: m.value, nudgeId: nudge.id })
    setTimeout(() => monitor.dismissNudge(), 900)
  }

  return (
    <aside className={`toast toast-${nudge.kind}`} role="status">
      <div className="toast-head">
        <strong>{nudge.kind === 'break' ? 'Czas na przerwę' : 'Postawa'}</strong>
        <button className="icon-btn" onClick={() => monitor.dismissNudge()} aria-label="Zamknij">
          ×
        </button>
      </div>
      <p>{nudge.text}</p>
      <div className="mood">
        <span className="mood-q">Jak się czujesz?</span>
        <div className="mood-row">
          {MOODS.map((m) => (
            <button key={m.value} className={picked === m.value ? 'mood-btn picked' : 'mood-btn'} onClick={() => pick(m)} aria-label={m.label} title={m.label}>
              {m.emoji}
            </button>
          ))}
        </div>
      </div>
    </aside>
  )
}
