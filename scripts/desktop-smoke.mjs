// Test dymny wersji desktopowej: ładowanie modeli, pomiar przy schowanym oknie, kopia zapasowa.
// Dane i kopie trafiają do folderu tymczasowego (RYTM_TEST_DIR), nigdy do prawdziwych pomiarów.
// Użycie: npx vite build && node scripts/desktop-smoke.mjs
import { _electron as electron } from 'playwright-core'
import { mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const testDir = mkdtempSync(join(tmpdir(), 'rytm-test-'))
const app = await electron.launch({
  args: ['.', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
  env: { ...process.env, RYTM_TEST_DIR: testDir },
})
const page = await app.firstWindow()
const errs = []
page.on('pageerror', (e) => errs.push(e.message))
await page.waitForLoadState('domcontentloaded')
console.log('URL:', page.url())
await page.fill('#name', 'Test')
await page.check('#consent')
await page.click('button[type=submit]')
await page.waitForTimeout(6000)
console.log('Visible:', await page.textContent('.rec'))
await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].hide())
await page.waitForTimeout(4000)
console.log('Hidden:', await page.textContent('.rec'))
const backup = await page.evaluate(() => window.rytmDesktop.saveBackup(JSON.stringify({ app: 'rytm', test: true })))
console.log('Backup dir is test dir:', backup.dir.startsWith(testDir), '| files:', readdirSync(join(testDir, 'backups')).join(', '))
console.log('Page errors:', errs.length ? errs : 'none')
await app.evaluate(({ app }) => app.exit(0))
await new Promise((r) => setTimeout(r, 1500)) // Electron zwalnia pliki chwilę po wyjściu
try { rmSync(testDir, { recursive: true, force: true }) } catch { console.log("Folder testowy do ręcznego usunięcia:", testDir) }
