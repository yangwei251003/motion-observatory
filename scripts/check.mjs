import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium, webkit } from 'playwright'

const url = process.env.OBSERVATORY_URL ?? 'http://127.0.0.1:4239/'
const engine = process.env.OBSERVATORY_ENGINE ?? 'chrome'
const destination = process.env.OBSERVATORY_RESULTS ?? '.work/results'
const browser = engine === 'webkit' ? await webkit.launch() :
  await chromium.launch({ channel: engine === 'edge' ? 'msedge' : 'chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const context = await browser.newContext({ viewport: { width: 1440, height: 920 }, deviceScaleFactor: 1, reducedMotion: 'no-preference' })
const page = await context.newPage()
page.setDefaultTimeout(engine === 'webkit' ? 14000 : 6400)
const record = []
const selectedTests = process.env.OBSERVATORY_CASES?.split(',')
const errors = []
const from = (id = '') => url + (id ? '#' + id : '')
const get = selector => page.locator(selector).first()
const visible = selector => get(selector).waitFor({ state: 'visible' })
const hidden = selector => get(selector).waitFor({ state: 'hidden' })
const fullySettled = selector => get(selector).evaluate(element => Promise.allSettled(element.getAnimations().map(animation => animation.finished)))
page.on('pageerror', error => errors.push(String(error)))
page.on('crash', () => errors.push('Page crashed'))

async function check(id, action) {
  if (selectedTests && !selectedTests.some(number => id.startsWith(number + ' '))) return
  try {
    await action()
    record.push({ id, passed: true })
    console.log('PASS', id)
  } catch (error) {
    record.push({ id, passed: false, error: String(error) })
    console.error('FAIL', id, String(error))
  }
}

async function start(id) {
  await page.goto('about:blank')
  await page.goto(from('effect-' + id), { waitUntil: 'domcontentloaded' })
  await visible('[data-cue="' + id + '"]')
}
async function center(selector) {
  await get(selector).scrollIntoViewIfNeeded()
  const box = await get(selector).boundingBox()
  assert(box, 'control must have nonzero geometry')
  return box
}
async function pointer(selector, x, y, steps = 1) {
  const box = await center(selector)
  const coordinates = [box.x + box.width * x, box.y + box.height * y]
  await page.mouse.move(...coordinates, { steps })
  return coordinates
}
async function style(selector, key, pseudo) {
  return get(selector).evaluate((node, args) => getComputedStyle(node, args.pseudo).getPropertyValue(args.key), { key, pseudo })
}
async function samples(selector) {
  return get(selector).evaluate(async canvas => {
    await new Promise(requestAnimationFrame)
    const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data
    let active = 0, color = 0
    for (let offset = 0; offset < pixels.length; offset += 4) {
      if (pixels[offset + 3] > 16) active++
      if (pixels[offset + 2] > pixels[offset] * 1.4 && pixels[offset + 3] > 94) color++
    }
    return { active, color }
  })
}
async function travel(callback, milliseconds = 570) {
  await new Promise(resolve => setTimeout(resolve, milliseconds))
  await callback()
}

try {
  await check('01 悬停：下划线左右锚点和参数换字', async () => {
    await start(1)
    await get('#nav-keyboard').hover()
    await page.waitForFunction(() => getComputedStyle(document.getElementById('nav-keyboard'), '::after').transform === 'matrix(1, 0, 0, 1, 0, 0)')
    assert.match(await style('#nav-keyboard', 'transform-origin', '::after'), /^0px/)
    await page.mouse.move(100, 145)
    assert(parseFloat(await style('#nav-keyboard', 'transform-origin', '::after')) > 15)
    await get('#view-specs').hover()
    await page.waitForFunction(() => Math.abs(new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.rolling-link svg')).transform).m41) > 3)
    assert.notEqual(await style('.rolling-link > span > span', 'transform'), 'none')
  })
  await check('02 下拉菜单：分批入场、选择、Esc', async () => {
    await start(2)
    await get('#caps-trigger').hover()
    await visible('#caps-pop[data-open="true"]')
    const delays = await get('#caps-pop').locator('a').evaluateAll(nodes => nodes.map(node => parseFloat(getComputedStyle(node).animationDelay)))
    assert(delays[2] > delays[1] && delays[1] > delays[0])
    await page.keyboard.press('Escape')
    await visible('#caps-trigger[aria-expanded="false"]')
    await get('#caps-trigger').press('ArrowDown')
    await page.waitForFunction(() => document.activeElement?.matches('#caps-pop a'))
    await page.keyboard.press('Enter')
    await page.waitForURL('**/#edition-apricot')
  })
  await check('03 磁吸：未碰按钮就动，文字更远，松开回位', async () => {
    await start(3)
    const button = await center('.magnetic')
    const position = await pointer('#magnetic', .04, .13)
    assert(position[0] < button.x || position[1] < button.y)
    await page.waitForFunction(() => Math.abs(parseFloat(document.querySelector('.magnetic').style.translate)) > 5)
    const [outer, inner] = await get('.magnetic').evaluate(node => [parseFloat(node.style.translate), parseFloat(node.firstElementChild.style.translate)])
    assert(Math.abs(outer + inner) > Math.abs(outer) * 1.4)
    await page.mouse.move(40, 35)
    await page.waitForFunction(() => document.querySelector('.magnetic').style.translate.split(' ').every(value => Math.abs(parseFloat(value)) < .15))
  })
  await check('04 跟随转动：产品两侧姿态反向并回正', async () => {
    await start(4)
    if (engine !== 'webkit') await visible('#hero-product[data-renderer="3d"]')
    await pointer('#hero-product', .16, .4)
    await page.waitForFunction(() => Number(document.getElementById('hero-product').dataset.pose?.split(',')[1]) < -.12)
    const first = await get('#hero-product').screenshot()
    await pointer('#hero-product', .82, .4, 5)
    await page.waitForFunction(() => Number(document.getElementById('hero-product').dataset.pose?.split(',')[1]) > .12)
    assert.notDeepEqual(first, await get('#hero-product').screenshot())
    await page.mouse.move(30, 30)
    await page.waitForFunction(() => document.getElementById('hero-product').dataset.pose === '0.000,0.000')
  })
  await check('05 自定义光标：即时点、滞后圆、放大和实心圆', async () => {
    await start(5)
    await pointer('.feature-section .section-heading', .28, .45)
    const next = await pointer('.feature-card', .66, .37)
    const lag = await get('.custom-cursor').evaluate((cursor, target) => {
      const dot = new DOMMatrix(cursor.firstElementChild.style.transform)
      const ring = new DOMMatrix(cursor.lastElementChild.style.transform)
      return [Math.abs(dot.m41 - target[0]), Math.hypot(dot.m41 - ring.m41, dot.m42 - ring.m42)]
    }, next)
    assert(lag[0] < 2 && lag[1] > 0)
    await visible('.custom-cursor[data-state="feature"] b')
    await get('.brand').hover()
    await page.waitForFunction(() => document.querySelector('.custom-cursor').dataset.state === 'button')
  })
  await check('06 点阵：局部变蓝并在退出后复原', async () => {
    await start(6)
    const canvas = '[data-painter="dots"]'
    const before = await samples(canvas)
    await pointer('#paper-field', .55, .15, 5)
    await page.waitForFunction(() => {
      const canvas = document.querySelector('[data-painter="dots"]')
      const rgba = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data
      return rgba.some((value, index) => index % 4 === 2 && value > 160 && rgba[index - 2] < 100 && rgba[index + 1] > 112)
    })
    assert((await samples(canvas)).color > before.color + 6)
    await page.mouse.move(120, 18)
    await travel(async () => assert((await samples(canvas)).color <= before.color + 2), 1100)
  })
  await check('07 光标拖尾：沿划动亮起并完全消失', async () => {
    await start(7)
    const canvas = '[data-painter="trail"]'
    const before = await samples(canvas)
    await pointer('#afterglow', .2, .64, 4)
    await pointer('#afterglow', .68, .31, 21)
    assert((await samples(canvas)).active > before.active + 55)
    await travel(async () => assert.equal((await samples(canvas)).active, 0), 580)
  })
  await check('08 倾斜：两个对角反向起伏，反光跟随', async () => {
    await start(8)
    await pointer('.feature-card', .89, .17)
    const from = await get('.feature-card').evaluate(element => [element.style.getPropertyValue('--tilt-x'), element.style.getPropertyValue('--tilt-y')].map(parseFloat))
    await pointer('.feature-card', .14, .84)
    const to = await get('.feature-card').evaluate(element => [element.style.getPropertyValue('--tilt-x'), element.style.getPropertyValue('--tilt-y')].map(parseFloat))
    assert(from[0] > 5 && from[1] > 5 && to[0] < -5 && to[1] < -5)
    assert.match(await style('.feature-shine', 'background-image'), /radial-gradient/)
    await page.mouse.move(4, 125)
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.feature-panel')).transform === 'matrix(1, 0, 0, 1, 0, 0)')
  })
  await check('09 悬停显现：从入场边缘扩散并显现原本隐藏的图标', async () => {
    await start(9)
    assert.equal(await style('.feature-icon', 'opacity'), '0')
    const bounds = await center('.feature-card')
    await page.mouse.move(bounds.x - 8, bounds.y + 85)
    await page.mouse.move(bounds.x + 11, bounds.y + 85)
    const begin = await style('.feature-color', 'clip-path')
    await page.waitForFunction(() => parseFloat(getComputedStyle(document.querySelector('.feature-color')).getPropertyValue('--reveal-radius')) > 145)
    const finish = await style('.feature-color', 'clip-path')
    assert.notEqual(begin, finish)
    assert.match(finish, /at (1[01]|12)px/)
    await page.mouse.move(bounds.x + bounds.width - 14, bounds.y - 24)
    await page.waitForFunction(() => document.querySelector('.feature-card').dataset.inside === 'false')
    await page.mouse.move(bounds.x + bounds.width - 14, bounds.y + 38)
    await page.waitForFunction(() => document.querySelector('.feature-card').dataset.inside === 'true')
    const origin = await get('.feature-card').evaluate(element => parseFloat(element.style.getPropertyValue('--reveal-x')))
    assert(origin > bounds.width * .8)
  })
  await check('10 提示气泡：可读内容、上方定位和箭头', async () => {
    await start(10)
    await get('#travel-tip').hover()
    const tooltip = get('#tip-travel')
    await tooltip.waitFor()
    assert.match(await tooltip.innerText(), /按到底/)
    assert((await tooltip.boundingBox()).y < (await get('#travel-tip').boundingBox()).y)
    assert.equal(await style('#tip-travel', 'border-top-width', '::after'), '7px')
    await get('#travel-tip').press('Escape')
    await hidden('#tip-travel')
  })
  await check('11 光标聚光灯：柔光、点阵遮罩和亮边同时跟随', async () => {
    await start(11)
    await pointer('#edition-eclipse', .91, .13)
    const selector = '[data-edition="eclipse"] + .spot-dots'
    const first = await style(selector, 'mask-image')
    assert.match(first, /radial-gradient/)
    await pointer('#edition-eclipse', .17, .47, 4)
    assert.notEqual(await style(selector, 'mask-image'), first)
    assert.match(await style('[data-edition="eclipse"] ~ .spot-edge', 'mask-image'), /radial-gradient/)
    await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-edition="eclipse"] ~ .spot-edge')).opacity > .9)
  })
  await check('12 共享元素：卡片、图、名称全屏扩展并原路返回', async () => {
    await start(12)
    const tile = await center('#edition-eclipse')
    await get('#edition-eclipse').click()
    await visible('[data-flight="enter"] .flight-ghost')
    const first = await get('.flight-panel').boundingBox()
    await page.waitForTimeout(270)
    const middle = await get('.flight-panel').boundingBox()
    assert(first.width < middle.width && middle.width > tile.width)
    assert.equal(await page.locator('.flight-ghost img').count(), 2)
    assert.match(await get('.flight-title').innerText(), /夜影/)
    await hidden('.flight-ghost')
    assert((await get('.layer-detail').boundingBox()).width >= 1420)
    await page.getByRole('button', { name: '俯视', exact: true }).click()
    await page.waitForTimeout(530)
    await page.getByRole('button', { name: '关闭详情' }).click()
    await visible('[data-flight="exit"] .flight-ghost')
    assert.match(await get('.flight-ghost img').getAttribute('src'), /eclipse-top/)
    await page.waitForTimeout(310)
    assert((await get('.flight-panel').boundingBox()).width < 1300)
    await hidden('.layer-detail')
    assert(await get('#edition-eclipse').evaluate(element => document.activeElement === element))
  })
  await check('13 轮播：拖动跟手、吸附、四张图、箭头和圆点', async () => {
    await start(13)
    await page.getByRole('button', { name: '下一张' }).click()
    await visible('#gallery[data-angle="1"]')
    const box = await center('.gallery-window')
    await page.mouse.move(box.x + box.width * .76, box.y + box.height * .45)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width * .42, box.y + box.height * .45, { steps: 10 })
    assert(parseFloat(await style('.gallery-track', '--drag-offset')) < -80)
    await page.mouse.up()
    await visible('#gallery[data-angle="2"]')
    await page.getByRole('button', { name: '侧面', exact: true }).click()
    await visible('#gallery[data-angle="3"]')
    assert(await page.getByRole('button', { name: '下一张' }).isDisabled())
    assert.equal(await page.locator('.gallery-slide img').evaluateAll(images => new Set(images.map(img => img.src)).size), 4)
    await page.getByRole('button', { name: '整机', exact: true }).click()
    await visible('#gallery[data-angle="0"]')
  })
  await check('14 标签：下划线和内容真的滑动，方向键切换', async () => {
    await start(14)
    const baseline = await style('.tab-indicator', 'translate')
    await page.getByRole('tab', { name: '手感' }).click()
    await page.waitForFunction(() => parseFloat(getComputedStyle(document.querySelector('.tab-indicator')).translate) > 18)
    assert.notEqual(await style('.tab-indicator', 'translate'), baseline)
    await page.getByRole('tab', { name: '手感' }).press('ArrowRight')
    assert.equal(await page.getByRole('tab', { name: '包装清单' }).getAttribute('aria-selected'), 'true')
    assert.match(await page.getByRole('tabpanel', { name: '包装清单' }).innerText(), /USB-C 线材/)
  })
  await check('15 图标：真实播放、顶点逐帧形变、收藏填色与粒子', async () => {
    await start(15)
    const old = await get('#sound-button polygon').getAttribute('points')
    await get('#sound-button').click()
    const paused = '6 5 10 5 10 19 6 19'
    await page.waitForFunction(([previous, final]) => {
      const icon = document.querySelector('#sound-button polygon')
      const current = icon.getAttribute('points')
      return document.getElementById('sound-button').ariaPressed === 'true' && current !== previous && current !== final
    }, [old, paused])
    await page.waitForTimeout(340)
    assert.equal(await get('#sound-button polygon').getAttribute('points'), paused)
    await get('#sound-button').click()
    await page.waitForFunction(initial => document.querySelector('#sound-button polygon').getAttribute('points') === initial, old)
    await page.getByRole('button', { name: '收藏', exact: true }).click()
    assert.equal(await page.locator('.heart-sparks i').count(), 9)
    assert.equal(await page.getByRole('button', { name: '取消收藏' }).getAttribute('aria-pressed'), 'true')
  })
  await check('16 点击涟漪：左右点击有不同波源与扩散', async () => {
    await start(16)
    const button = await center('#add-product')
    const press = async fraction => {
      await page.mouse.move(button.x + button.width * fraction, button.y + button.height * .5)
      await page.mouse.down()
      try {
        await visible('.press-ripple')
        assert((await get('.press-ripple').evaluate(element => element.getAnimations().length)) > 0)
        return parseFloat(await style('.press-ripple', 'left'))
      } finally {
        await page.mouse.up()
      }
    }
    const left = await press(.13)
    await hidden('.press-ripple')
    await visible('#add-product[data-state="done"]')
    const right = await press(.82)
    assert(right - left > button.width * .5)
  })
  await check('17 成功反馈：转圈后更新购物袋并绘制勾', async () => {
    await start(17)
    const before = await get('#detail-bag').getAttribute('aria-label')
    await get('#add-product').click()
    await visible('#add-product[data-state="busy"] .spin')
    assert.equal(await get('#detail-bag').getAttribute('aria-label'), before)
    await visible('#add-product[data-state="done"] .draw-tick')
    assert.notEqual(await get('#detail-bag').getAttribute('aria-label'), before)
    assert.match(await style('#add-product .draw-tick path', 'animation-name'), /draw-check/)
  })
  await check('18 数字滚动：逐位旋转的滚轮', async () => {
    await start(18)
    await get('#add-product').click()
    await visible('#add-product[data-state="done"]')
    const count = get('#detail-bag .digit-reel')
    assert.equal(await count.locator('span').count(), 30)
    assert((await count.evaluate(node => node.getAnimations().length)) > 0)
    assert.match(await get('#detail-bag').getAttribute('aria-label'), /1 件/)
  })
  await check('19 轻提示：缩略图、倒计时进度、自动退出', async () => {
    await start(19)
    await get('#add-product').click()
    await visible('.added-toast .product-thumb')
    const beginning = await style('.toast-clock', 'transform')
    await travel(async () => assert.notEqual(await style('.toast-clock', 'transform'), beginning), 600)
    await hidden('.added-toast')
  })
  await check('20 抽屉：右侧进出、背景遮罩、回到入口焦点', async () => {
    await start(20)
    await get('#shop-bag').click()
    await visible('.layer-drawer[open]')
    const entering = await style('.layer-drawer', 'transform')
    assert.notEqual(entering, 'none')
    assert.match(await style('.layer-drawer', 'background-color', '::backdrop'), /rgba/)
    await fullySettled('.layer-drawer')
    assert(await get('.layer-drawer').evaluate(element => new DOMMatrixReadOnly(getComputedStyle(element).transform).isIdentity))
    await page.keyboard.press('Escape')
    await visible('.layer-drawer[data-exit="true"]')
    await hidden('.layer-drawer')
    assert(await get('#shop-bag').evaluate(element => document.activeElement === element))
  })
  await check('21 布局过渡：产品移动、结算量更新、添加和删除', async () => {
    await start(21)
    await fullySettled('.layer-drawer')
    const rest = get('[data-cart-key="rest"]')
    const before = (await rest.boundingBox()).y
    await page.getByRole('button', { name: '移除 PBT 键帽套装' }).click()
    await hidden('[data-cart-key="caps"]')
    await visible('.cart-ghost')
    assert((await rest.evaluate(element => element.getAnimations().length)) > 0)
    await fullySettled('[data-cart-key="rest"]')
    assert(before - (await rest.boundingBox()).y > 35)
    await page.getByRole('button', { name: '添加 PBT 键帽套装' }).click()
    await visible('[data-cart-key="caps"]')
    await page.getByRole('button', { name: /增加 K75/ }).click()
    assert.equal(await get('#cart-total .odometer').getAttribute('aria-label'), '¥2306')
  })
  await check('22 折叠展开：展开行变化、加号翻转、前条自动关闭', async () => {
    await start(22)
    const first = page.locator('.faq-item').nth(0)
    const second = page.locator('.faq-item').nth(1)
    await first.getByRole('button').click()
    await page.waitForFunction(() => document.getElementById('answer-0').getBoundingClientRect().height > 25)
    await fullySettled('.faq-item:first-child .faq-mark i:nth-child(2)')
    const openMark = await first.locator('.faq-mark i').last().evaluate(element => getComputedStyle(element).transform)
    await second.getByRole('button').click()
    assert.equal(await first.getByRole('button').getAttribute('aria-expanded'), 'false')
    await page.waitForFunction(() => document.getElementById('answer-0').getBoundingClientRect().height === 0)
    assert.notEqual(await first.locator('.faq-mark i').last().evaluate(element => getComputedStyle(element).transform), openMark)
    assert.equal(await second.getByRole('button').getAttribute('aria-expanded'), 'true')
  })
  await check('23 骨架屏：真实请求、光带及数据替换', async () => {
    await start(23)
    const request = page.waitForResponse(response => response.url().endsWith('/notes.json') && response.ok())
    await get('#load-reviews').click()
    await visible('.skeleton-card')
    assert.equal(await page.locator('.skeleton-card').count(), 3)
    assert.equal(await style('.skeleton-card', 'animation-name', '::after'), 'sweep')
    const response = await request
    assert.equal((await response.json()).length, 3)
    await hidden('.skeleton-card')
    assert.equal(await page.locator('.note-card').count(), 6)
  })
  await check('24 弹窗：背景模糊、Esc 和焦点恢复', async () => {
    await start(24)
    await get('#switch-compare').click()
    await visible('.layer-modal[open] table')
    assert.match(await style('.layer-modal', 'backdrop-filter', '::backdrop'), /blur/)
    assert(await get('.layer-modal').evaluate(dialog => dialog.contains(document.activeElement)))
    await page.keyboard.press('Escape')
    await hidden('.layer-modal')
    assert(await get('#switch-compare').evaluate(element => document.activeElement === element))
  })
  await check('25 错误反馈：横向抖动与可读错误，改正后成功', async () => {
    await start(25)
    const input = page.getByRole('textbox', { name: '邮箱地址' })
    await input.fill('demo@')
    await page.getByRole('button', { name: '订阅', exact: true }).click()
    assert.equal(await input.getAttribute('aria-invalid'), 'true')
    assert.match(await page.getByRole('alert').innerText(), /邮箱格式/)
    const frames = await get('.newsletter-field').evaluate(element => element.getAnimations().flatMap(animation => animation.effect.getKeyframes().map(frame => frame.transform)))
    assert(frames.includes('translateX(-12px)') && frames.includes('translateX(10px)'))
    await input.fill('demo@example.com')
    await input.press('Enter')
    await visible('.newsletter-field[data-validation="done"] .draw-tick')
    await hidden('[role="alert"]')
  })
  await check('26 页面转场：升幕、错时字、换页、向上退幕及返回', async () => {
    await start(26)
    await fullySettled('.layer-drawer')
    await get('#checkout-start').click()
    await visible('.layer-curtain[data-curtain-phase="covering"]')
    assert.match(await style('.curtain-cover', 'background-color'), /39, 71, 211/)
    const delays = await page.locator('.curtain-letter').evaluateAll(nodes => nodes.map(node => node.getAnimations()[0].effect.getTiming().delay))
    assert(delays[1] > delays[0] && delays.at(-1) > delays[1])
    await visible('.layer-curtain[data-curtain-phase="uncovering"]')
    await page.waitForURL('**/#checkout')
    await hidden('.layer-curtain')
    await visible('.checkout-summary')
    await page.getByText('优先配送', { exact: false }).click()
    await page.getByRole('button', { name: '确认演示订单' }).click()
    await visible('.receipt')
    assert.match(await get('.receipt').innerText(), /演示订单已生成/)
    await get('.checkout-top .text-link').click()
    await visible('.layer-curtain[data-curtain-phase="covering"]')
    await page.waitForURL('**/#home')
    await hidden('.layer-curtain')
    await visible('.hero h1')
  })
  await check('索引搜索、26 个直达入口和复制描述', async () => {
    await page.goto(from())
    await page.getByRole('button', { name: '动效索引', exact: true }).click()
    assert.equal(await page.locator('.index-grid [data-effect]').count(), 26)
    await page.getByPlaceholder('搜名称或编号').fill('spotlight')
    assert.equal(await page.locator('.index-grid [data-effect]').count(), 1)
    await get('[data-effect="11"]').click()
    await page.waitForURL('**/#effect-11')
    await visible('[data-cue="11"]')
    await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined }))
    await page.getByRole('button', { name: '复制描述' }).click()
    assert.match(await get('.cue-copy-field').inputValue(), /Cursor spotlight/)
    assert(await get('.cue-copy-field').evaluate(field => field.selectionEnd === field.value.length))
  })
  await check('390 px 触控、减少动画和完整结算', async () => {
    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' })
    try {
      const phone = await mobile.newPage()
      phone.on('pageerror', error => errors.push(String(error)))
      await phone.goto(from())
      assert(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      await phone.locator('#caps-trigger').tap()
      assert.equal(await phone.locator('#caps-trigger').getAttribute('aria-expanded'), 'true')
      await phone.locator('#caps-pop a').nth(2).tap()
      await phone.locator('#edition-eclipse').tap()
      await phone.locator('.layer-detail[open]').waitFor()
      assert.equal(await phone.locator('.flight-ghost').count(), 0)
      await phone.getByRole('button', { name: '旋钮近景' }).tap()
      assert.equal(await phone.locator('#gallery').getAttribute('data-angle'), '2')
      await phone.locator('#add-product').tap()
      await phone.locator('#add-product[data-state="done"]').waitFor()
      await phone.locator('#detail-bag').tap()
      await phone.locator('#checkout-start').tap()
      await phone.waitForURL('**/#checkout')
      assert.equal(await phone.locator('.layer-curtain').count(), 0)
      assert(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    } finally {
      await mobile.close()
    }
  })
} finally {
  const version = browser.version()
  await browser.close()
  await mkdir(destination, { recursive: true })
  await writeFile(destination + '/check-' + engine + '.json', JSON.stringify({ url, engine, version, checkedAt: new Date().toISOString(), record, errors }, null, 2) + '\n')
}
if (record.some(test => !test.passed) || errors.length) {
  console.error(errors)
  process.exitCode = 1
}
