// Test dymny wersji desktopowej: ładowanie modeli i pomiar przy schowanym oknie.
// Użycie: npx vite build && node scripts/desktop-smoke.mjs
import { _electron as electron } from 'playwright-core'
const app = await electron.launch({ args: ['.', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] })
const page = await app.firstWindow()
const logs = []
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`))
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))
await page.waitForLoadState('domcontentloaded')
console.log('URL:', page.url())
await page.evaluate(async () => {
  const { monitor } = await import('./assets/' + [...document.scripts].map(s => s.src.split('/').pop()).find(n => n.startsWith('index')))
}).catch(() => {})
await page.fill('#name', 'Test')
await page.check('#consent')
await page.click('button[type=submit]')
await page.waitForTimeout(6000)
console.log('Visible:', await page.textContent('.rec'))
await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].hide())
await page.waitForTimeout(1500)
const hidden1 = await page.textContent('.rec')
await page.waitForTimeout(4000)
console.log('Hidden (document.hidden=%s):', await page.evaluate(() => document.hidden), hidden1, '->', await page.textContent('.rec'))
console.log(logs.filter(l => /error|warn/i.test(l)).slice(0, 15).join('\n'))
await app.evaluate(({ app }) => { app.exit(0) })
