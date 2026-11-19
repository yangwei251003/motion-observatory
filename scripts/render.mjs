import { mkdir, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'

const port = 4226
const url = 'http://127.0.0.1:' + port
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore', windowsHide: true })
try {
  for (let attempt = 0; attempt < 35; attempt++) {
    if ((await fetch(url + '/tools/render.html').catch(() => null))?.ok) break
    if (attempt === 34) throw new Error('Product renderer failed to start')
    await new Promise(resolve => setTimeout(resolve, 240))
  }
  await mkdir('public/products', { recursive: true })
  const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
  try {
    const page = await browser.newPage()
    await page.goto(url + '/tools/render.html')
    await page.waitForFunction(() => typeof window.renderProduct === 'function')
    for (const variant of ['apricot', 'mist', 'eclipse']) {
      for (const view of ['angle', 'top', 'dial', 'side']) {
        const data = await page.evaluate(([variant, view]) => window.renderProduct(variant, view, 1020, 680), [variant, view])
        const path = `public/products/${variant}-${view}.webp`
        await writeFile(path, Buffer.from(data, 'base64'))
        console.log(path)
      }
    }
  } finally {
    await browser.close()
  }
} finally {
  server.kill()
}
