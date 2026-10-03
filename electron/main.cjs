// Rytm jako aplikacja desktopowa. Ładuje ten sam frontend co wersja webowa.
// Zamknięcie okna chowa je do zasobnika, a pomiar trwa dalej.
const { app, BrowserWindow, Tray, Menu, nativeImage, protocol, net, session, shell, systemPreferences, ipcMain, powerSaveBlocker } = require('electron')
const fs = require('node:fs/promises')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

const DEV = process.argv.includes('--dev')
const DEV_URL = 'http://localhost:5173'
const DIST = path.join(__dirname, '..', 'dist')

// Własny protokół app:// zamiast file://, żeby działały fetch modeli MediaPipe, WASM i dostęp do kamery
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }])

let win = null
let tray = null
let quitting = false

// Testy dymne używają własnego folderu, żeby nigdy nie dotknąć prawdziwych pomiarów zespołu
if (process.env.RYTM_TEST_DIR) app.setPath('userData', path.join(process.env.RYTM_TEST_DIR, 'userData'))

// Kopie zapasowe pomiarów jako zwykłe pliki JSON w Dokumentach: przetrwają reinstalację i łatwo je przenieść
const backupDir = () => (process.env.RYTM_TEST_DIR ? path.join(process.env.RYTM_TEST_DIR, 'backups') : path.join(app.getPath('documents'), 'Rytm'))

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => showWindow())
}

if (process.platform === 'win32') app.setAppUserModelId('pl.hackyeah.rytm') // wymagane przez powiadomienia systemowe w Windows

// Ikona: zielony pierścień z kropką, rysowana w pamięci (bez pliku graficznego)
function makeIcon(size = 32) {
  const buf = Buffer.alloc(size * size * 4)
  const c = (size - 1) / 2
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - c, y - c) / (size / 2)
      const on = (d > 0.72 && d <= 0.98) || d < 0.42
      const i = (y * size + x) * 4
      // BGRA
      buf[i] = 0x67
      buf[i + 1] = 0x7d
      buf[i + 2] = 0x2e
      buf[i + 3] = on ? 255 : 0
    }
  }
  return nativeImage.createFromBitmap(buf, { width: size, height: size })
}

function showWindow() {
  if (!win) return createWindow()
  if (win.isMinimized()) win.restore()
  win.show()
  win.focus()
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 420,
    minHeight: 500,
    title: 'Rytm',
    icon: makeIcon(64),
    autoHideMenuBar: true,
    backgroundColor: '#f2f4f1',
    webPreferences: {
      // Najważniejsze: nie dławimy timerów ani renderowania, gdy okno jest w tle lub schowane
      backgroundThrottling: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })

  win.loadURL(DEV ? DEV_URL : 'app://rytm/index.html')

  // Linki zewnętrzne (np. źródła) otwieramy w zwykłej przeglądarce
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  win.on('close', (e) => {
    if (!quitting) {
      e.preventDefault()
      win.hide()
      if (!app.rytmHintShown && tray) {
        app.rytmHintShown = true
        tray.displayBalloon?.({ title: 'Rytm działa w tle', content: 'Pomiar trwa. Kliknij ikonę w zasobniku, żeby wrócić do okna.' })
      }
    }
  })
  win.on('closed', () => (win = null))
}

function createTray() {
  tray = new Tray(makeIcon(16))
  tray.setToolTip('Rytm: pomiar trwa')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Pokaż Rytm', click: showWindow },
      { label: 'Otwórz folder kopii zapasowych', click: () => shell.openPath(backupDir()) },
      {
        label: 'Uruchamiaj razem z Windows',
        type: 'checkbox',
        checked: app.getLoginItemSettings().openAtLogin,
        click: (item) => app.setLoginItemSettings({ openAtLogin: item.checked }),
      },
      { type: 'separator' },
      {
        label: 'Zakończ (zatrzymuje pomiar)',
        click: () => {
          quitting = true
          app.quit()
        },
      },
    ]),
  )
  tray.on('click', showWindow)
}

app.whenReady().then(async () => {
  // macOS pyta o zgodę na kamerę na poziomie systemu (Ustawienia → Prywatność → Kamera)
  if (process.platform === 'darwin') await systemPreferences.askForMediaAccess('camera').catch(() => false)

  // Pliki aplikacji z folderu dist pod adresem app://rytm/...
  protocol.handle('app', (req) => {
    const { pathname } = new URL(req.url)
    const file = path.normalize(path.join(DIST, decodeURIComponent(pathname)))
    if (!file.startsWith(DIST)) return new Response('Not found', { status: 404 })
    return net.fetch(pathToFileURL(file).toString())
  })

  // Zgoda na kamerę i powiadomienia tylko dla naszej aplikacji
  const allowed = new Set(['media', 'notifications'])
  const ours = (url) => url.startsWith('app://rytm') || (DEV && url.startsWith(DEV_URL))
  session.defaultSession.setPermissionRequestHandler((wc, permission, cb) => cb(allowed.has(permission) && ours(wc.getURL())))
  session.defaultSession.setPermissionCheckHandler((wc, permission, origin) => allowed.has(permission) && ours(origin || ''))

  // Najnowsza kopia nadpisuje rytm-latest.json, a co godzinę zostaje osobny plik (historia na wypadek błędu)
  ipcMain.handle('rytm:backup', async (_e, json) => {
    const dir = backupDir()
    await fs.mkdir(dir, { recursive: true })
    const d = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    const hourly = `rytm-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}.json`
    const latest = path.join(dir, 'rytm-latest.json')
    await fs.writeFile(latest + '.tmp', json)
    await fs.rename(latest + '.tmp', latest)
    await fs.writeFile(path.join(dir, hourly), json)
    return { dir, file: latest, at: d.getTime() }
  })
  ipcMain.handle('rytm:open-backups', async () => {
    await fs.mkdir(backupDir(), { recursive: true })
    return shell.openPath(backupDir())
  })
  ipcMain.handle('rytm:backup-folder', () => backupDir())

  // Komputer nie zaśnie, dopóki Rytm działa (zamknięcie klapy laptopa nadal go usypia)
  powerSaveBlocker.start('prevent-app-suspension')

  createTray()
  createWindow()
})

app.on('before-quit', () => (quitting = true))
// Nie zamykamy aplikacji po zamknięciu okna: działa w zasobniku
app.on('window-all-closed', (e) => e?.preventDefault?.())
