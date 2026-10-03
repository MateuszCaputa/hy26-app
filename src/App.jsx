import { useEffect, useState } from 'react'
import { monitor } from './lib/monitor'
import { useMonitor } from './lib/useMonitor'
import Start from './screens/Start'
import Live from './screens/Live'
import Day from './screens/Day'
import Data from './screens/Data'
import NudgeToast from './components/NudgeToast'

const TABS = [
  { id: 'start', label: 'Start' },
  { id: 'live', label: 'Na żywo' },
  { id: 'day', label: 'Rytm dnia' },
  { id: 'data', label: 'Dane zespołu' },
]

function loadPerson() {
  try {
    return JSON.parse(localStorage.getItem('rytm:person') || 'null')
  } catch {
    return null
  }
}

export default function App() {
  const [person, setPerson] = useState(loadPerson)
  const [tab, setTab] = useState(person ? 'live' : 'start')
  const state = useMonitor()

  // Po odświeżeniu strony wznawiamy pomiar dla zapisanej osoby
  useEffect(() => {
    if (person && monitor.state.status === 'idle') monitor.start(person.name).catch(() => {})
  }, [person])

  const onReady = (p) => {
    localStorage.setItem('rytm:person', JSON.stringify(p))
    setPerson(p)
    setTab('live')
  }

  const running = state.status === 'running'

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          Rytm
        </div>
        <nav className="tabs" aria-label="Ekrany">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? 'tab active' : 'tab'} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
        <div className={running ? 'rec on' : 'rec'} title="Obraz z kamery jest analizowany na tym komputerze i nigdzie nie jest zapisywany ani wysyłany">
          <span className="rec-dot" />
          {running ? `Pomiar: ${state.person} · ${state.fps} kl./s` : 'Pomiar wyłączony'}
        </div>
      </header>

      <main className="content">
        {tab === 'start' && <Start person={person} onReady={onReady} />}
        {tab === 'live' && <Live person={person} state={state} goStart={() => setTab('start')} />}
        {tab === 'day' && <Day person={person} />}
        {tab === 'data' && <Data person={person} />}
      </main>

      {state.nudge && <NudgeToast nudge={state.nudge} person={person?.name} />}
    </div>
  )
}
