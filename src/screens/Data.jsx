import { useEffect, useState } from 'react'
import { db } from '../lib/db'

// Każdy członek zespołu mierzy się na swoim laptopie. Tutaj eksportujemy dane do pliku
// i scalamy pliki od wszystkich na jednym komputerze, z którego robimy wykresy do pitchu.
export default function Data() {
  const [stats, setStats] = useState([])
  const [msg, setMsg] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)

  const refresh = async () => {
    const minutes = await db.all('minutes')
    const by = new Map()
    for (const m of minutes) {
      const s = by.get(m.person) || { person: m.person, n: 0, from: m.t, to: m.t }
      s.n++
      s.from = Math.min(s.from, m.t)
      s.to = Math.max(s.to, m.t)
      by.set(m.person, s)
    }
    setStats([...by.values()])
  }

  useEffect(() => {
    refresh()
  }, [])

  const exportAll = async () => {
    const data = { app: 'rytm', version: 1, exportedAt: Date.now(), minutes: await db.all('minutes'), events: await db.all('events') }
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `rytm-${new Date().toISOString().slice(0, 16).replace(':', '-')}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    setMsg('Zapisano plik z danymi.')
  }

  const importFiles = async (e) => {
    let mins = 0
    let evs = 0
    for (const file of e.target.files) {
      try {
        const data = JSON.parse(await file.text())
        if (data.app !== 'rytm') throw new Error('to nie jest plik z Rytmu')
        await db.putMany('minutes', data.minutes || [])
        await db.putMany('events', data.events || [])
        mins += data.minutes?.length || 0
        evs += data.events?.length || 0
      } catch (err) {
        setMsg(`Nie udało się wczytać ${file.name}: ${err.message}`)
        return
      }
    }
    e.target.value = ''
    setMsg(`Scalono ${mins} minut pomiarów i ${evs} zdarzeń. Duplikaty są pomijane automatycznie.`)
    refresh()
  }

  const clearAll = async () => {
    await db.clear('minutes')
    await db.clear('events')
    setConfirmClear(false)
    setMsg('Usunięto wszystkie pomiary z tego komputera.')
    refresh()
  }

  const fmt = (t) => new Date(t).toLocaleString('pl-PL', { weekday: 'short', hour: '2-digit', minute: '2-digit' })

  return (
    <section className="data">
      <p className="eyebrow">Dane zespołu</p>
      <h1>Pomiary na tym komputerze</h1>
      <p className="lede">Każda osoba mierzy się na swoim laptopie. Co kilka godzin wyeksportujcie dane i wczytajcie wszystkie pliki na jednym komputerze, żeby zobaczyć cały zespół.</p>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Osoba</th>
              <th>Minuty pomiaru</th>
              <th>Od</th>
              <th>Do</th>
            </tr>
          </thead>
          <tbody>
            {stats.length === 0 && (
              <tr>
                <td colSpan="4">Brak pomiarów.</td>
              </tr>
            )}
            {stats.map((s) => (
              <tr key={s.person}>
                <td>{s.person}</td>
                <td className="num">{s.n}</td>
                <td>{fmt(s.from)}</td>
                <td>{fmt(s.to)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="actions">
        <button className="btn primary" onClick={exportAll}>
          Eksportuj dane do pliku
        </button>
        <label className="btn" htmlFor="import">
          Wczytaj pliki od zespołu
        </label>
        <input id="import" type="file" accept="application/json,.json" multiple onChange={importFiles} hidden />
        {confirmClear ? (
          <span className="confirm">
            Usunąć wszystkie pomiary z tego komputera?
            <button className="btn danger" onClick={clearAll}>
              Tak, usuń
            </button>
            <button className="btn" onClick={() => setConfirmClear(false)}>
              Anuluj
            </button>
          </span>
        ) : (
          <button className="btn ghost" onClick={() => setConfirmClear(true)}>
            Usuń pomiary
          </button>
        )}
      </div>
      {msg && <p className="ok">{msg}</p>}
    </section>
  )
}
