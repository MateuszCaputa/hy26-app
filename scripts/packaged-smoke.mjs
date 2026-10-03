import { _electron as electron } from 'playwright-core'
const app = await electron.launch({ executablePath: 'release/win-unpacked/Rytm.exe', args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] })
const page = await app.firstWindow()
const errs = []
page.on('pageerror', (e) => errs.push(e.message))
await page.waitForLoadState('domcontentloaded')
await page.fill('#name', 'Test')
await page.check('#consent')
await page.click('button[type=submit]')
await page.waitForTimeout(8000)
console.log('URL:', page.url(), '| status:', await page.textContent('.rec'), '| errors:', errs.length ? errs : 'none')
await app.evaluate(({ app }) => app.exit(0))
