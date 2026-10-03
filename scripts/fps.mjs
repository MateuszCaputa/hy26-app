import { chromium } from 'playwright-core'
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] })
const page = await browser.newPage()
await page.goto('http://localhost:5173/')
await page.evaluate(() => window.__rytm.start('Test'))
await page.waitForTimeout(3000)
const r = await page.evaluate(async () => { const m = window.__rytm; const f0 = m.frame; const t0 = performance.now(); await new Promise(r => setTimeout(r, 3000)); return { framesPerSec: (m.frame - f0) / ((performance.now() - t0) / 1000), fpsState: m.state.fps, workers: !!m.worker } })
console.log(r)
await browser.close()
