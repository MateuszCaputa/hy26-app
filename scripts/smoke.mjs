// Test dymny: uruchamia Chrome z wirtualną kamerą i przechodzi przez ekran Start.
// Użycie: node scripts/smoke.mjs (serwer `npm run dev` musi działać)
import { chromium } from 'playwright-core'

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
})
const page = await browser.newPage()
const logs = []
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`))
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))

await page.goto('http://localhost:5173/')
await page.fill('#name', 'Test')
await page.check('#consent')
await page.click('button[type=submit]')
await page.waitForTimeout(16000)

console.log('Status bar:', await page.textContent('.rec'))
console.log('Form message:', (await page.locator('.start-form .err, .start-form .ok').allTextContents()).join(' | '))
await page.click('text=Na żywo')
await page.waitForTimeout(2000)
await page.screenshot({ path: 'scripts/smoke-live.png' })
console.log('Live gauge:', await page.textContent('.gauge'))
console.log(logs.filter((l) => !l.includes('[debug]')).slice(0, 25).join('\n'))
await browser.close()
