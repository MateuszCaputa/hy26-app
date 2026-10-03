// Minimalny wrapper na IndexedDB. Wszystkie dane zostają w przeglądarce użytkownika.
const DB_NAME = 'rytm'
const DB_VERSION = 1

let dbPromise = null

function open() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      // minutes: agregaty minutowe z kamerki, klucz `${person}|${t}`
      if (!db.objectStoreNames.contains('minutes')) {
        const s = db.createObjectStore('minutes', { keyPath: 'id' })
        s.createIndex('t', 't')
      }
      // events: przypomnienia, kliknięcia samopoczucia, przerwy
      if (!db.objectStoreNames.contains('events')) {
        const s = db.createObjectStore('events', { keyPath: 'id' })
        s.createIndex('t', 't')
      }
      // kv: profil, kalibracja, ustawienia
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv')
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function tx(store, mode, fn) {
  return open().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(store, mode)
        const s = t.objectStore(store)
        let result
        Promise.resolve(fn(s)).then((r) => (result = r))
        t.oncomplete = () => resolve(result)
        t.onerror = () => reject(t.error)
      }),
  )
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export const db = {
  put: (store, value) => tx(store, 'readwrite', (s) => s.put(value)),
  putMany: (store, values) => tx(store, 'readwrite', (s) => values.forEach((v) => s.put(v))),
  all: (store) => tx(store, 'readonly', (s) => reqToPromise(s.getAll())),
  clear: (store) => tx(store, 'readwrite', (s) => s.clear()),
  get: (key) => tx('kv', 'readonly', (s) => reqToPromise(s.get(key))),
  set: (key, value) => tx('kv', 'readwrite', (s) => s.put(value, key)),
}

// Pełny zrzut pomiarów: ten sam format dla ręcznego eksportu, kopii zapasowej i scalania danych zespołu
export async function exportAll() {
  return { app: 'rytm', version: 1, exportedAt: Date.now(), minutes: await db.all('minutes'), events: await db.all('events') }
}

// Kopia do pliku w Dokumentach/Rytm (tylko w wersji desktopowej)
export async function backupNow() {
  if (!window.rytmDesktop) return null
  return window.rytmDesktop.saveBackup(JSON.stringify(await exportAll()))
}

export async function logEvent(person, type, data = {}) {
  const t = Date.now()
  const ev = { id: `${person}|${t}|${type}`, person, t, type, ...data }
  await db.put('events', ev)
  return ev
}
