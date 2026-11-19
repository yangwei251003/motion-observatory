import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode, type RefObject } from 'react'
import { ArrowDown, ChevronLeft, ChevronRight, Heart, LoaderCircle, X } from 'lucide-react'
import { angles, asset, type Variant } from './catalog'
import { Layer } from './Layer'
import { clamp, easeInOut, noMotion, play, point, pressRipple, settle } from './motion'

type Rect = Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>
export type FlightOrigin = { host: DOMRect; image: DOMRect; imageSource: string; name: DOMRect; font: string; englishFont: string }

export function flightOrigin(source: Element): FlightOrigin {
  const name = source.querySelector<HTMLElement>('[data-shared-name]')!
  const image = source.querySelector<HTMLImageElement>('[data-active-image], [data-shared-image]')!
  return {
    host: source.getBoundingClientRect(),
    image: image.getBoundingClientRect(),
    imageSource: image.src,
    name: name.getBoundingClientRect(),
    font: getComputedStyle(name).fontSize,
    englishFont: getComputedStyle(name.lastElementChild!).fontSize,
  }
}

function dimensions(rect: Rect) {
  return { left: rect.left + 'px', top: rect.top + 'px', width: rect.width + 'px', height: rect.height + 'px' }
}

async function animateFlight(dialog: HTMLDialogElement, variant: Variant, from: FlightOrigin, to: FlightOrigin, opening: boolean, signal: AbortSignal) {
  if (noMotion()) return
  const isDark = variant.id === 'eclipse'
  dialog.dataset.flight = opening ? 'enter' : 'exit'
  const ghost = document.createElement('div')
  ghost.className = 'flight-ghost'
  ghost.setAttribute('aria-hidden', 'true')
  const plate = document.createElement('div')
  plate.className = 'flight-panel'
  plate.style.background = variant.paper
  const picture = document.createElement('img')
  picture.src = from.imageSource
  picture.alt = ''
  const destinationPicture = picture.cloneNode() as HTMLImageElement
  destinationPicture.src = to.imageSource
  const title = document.createElement('div')
  title.className = 'flight-title'
  title.style.color = isDark ? '#f7f6f0' : '#191921'
  title.append(variant.title)
  const english = document.createElement('span')
  english.textContent = variant.english
  title.append(english)
  ghost.append(plate, picture, destinationPicture, title)
  const shell = dialog.querySelector<HTMLElement>('.detail-shell')!
  dialog.append(ghost)
  const duration = 650
  const corner = opening ? ['22px', '0px'] : ['0px', '22px']
  const flights = [
    play(plate, [{ ...dimensions(from.host), borderRadius: corner[0] }, { ...dimensions(to.host), borderRadius: corner[1] }], duration, easeInOut, 'both'),
    play(picture, [{ ...dimensions(from.image), opacity: from.imageSource === to.imageSource ? 0 : 1 }, { ...dimensions(to.image), opacity: 0 }], duration, easeInOut, 'both'),
    play(destinationPicture, [{ ...dimensions(from.image), opacity: from.imageSource === to.imageSource ? 1 : 0 }, { ...dimensions(to.image), opacity: 1 }], duration, easeInOut, 'both'),
    play(title, [{ ...dimensions(from.name), fontSize: from.font }, { ...dimensions(to.name), fontSize: to.font }], duration, easeInOut, 'both'),
    play(english, [{ fontSize: from.englishFont }, { fontSize: to.englishFont }], duration, easeInOut, 'both'),
    play(shell, opening ?
      [{ opacity: 0 }, { opacity: 0, offset: .77 }, { opacity: 1 }] :
      [{ opacity: 1 }, { opacity: 0, offset: .22 }, { opacity: 0 }], duration, 'linear', 'both'),
  ]
  function stop() { flights.forEach(motion => motion.cancel()) }
  signal.addEventListener('abort', stop, { once: true })
  await Promise.all(flights.map(settle))
  signal.removeEventListener('abort', stop)
  ghost.remove()
  stop()
  delete dialog.dataset.flight
}

export function useProductFlight(ref: RefObject<HTMLDialogElement | null>, variant: Variant, origin: FlightOrigin | null, onClose: () => void) {
  const pending = useRef<AbortController | null>(null)
  const exiting = useRef(false)
  useLayoutEffect(() => {
    const dialog = ref.current
    if (!dialog || !origin) return
    const session = new AbortController()
    pending.current = session
    const destination = flightOrigin(dialog)
    destination.host = dialog.getBoundingClientRect()
    void animateFlight(dialog, variant, origin, destination, true, session.signal)
    return () => pending.current?.abort()
  }, [ref, variant, origin])

  return async () => {
    const dialog = ref.current
    if (exiting.current || !dialog) return
    exiting.current = true
    pending.current?.abort()
    const visible = document.querySelector('[data-edition="' + variant.id + '"]')
    if (visible && origin && origin.host.bottom > 0 && origin.host.top < innerHeight && document.getElementById('editions')) {
      const session = new AbortController()
      pending.current = session
      const destination = flightOrigin(dialog)
      destination.host = dialog.getBoundingClientRect()
      await animateFlight(dialog, variant, destination, flightOrigin(visible), false, session.signal)
      if (session.signal.aborted) return
    }
    onClose()
  }
}

function Gallery({ variant }: { variant: Variant }) {
  const [index, setIndex] = useState(0)
  const slides = useRef<HTMLDivElement>(null)
  const active = useRef<{ id: number; x: number; delta: number } | null>(null)
  const [drag, setDrag] = useState(false)

  function change(next: number) { setIndex(clamp(next, 0, angles.length - 1)) }
  function grab(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    active.current = { id: event.pointerId, x: event.clientX, delta: 0 }
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrag(true)
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    const current = active.current
    if (!current || current.id !== event.pointerId) return
    const delta = event.clientX - current.x
    current.delta = delta
    const edge = (index === 0 && delta > 0) || (index === angles.length - 1 && delta < 0)
    slides.current!.style.setProperty('--drag-offset', (edge ? delta * .25 : delta) + 'px')
  }
  function release(event: PointerEvent<HTMLDivElement>) {
    const current = active.current
    if (!current || current.id !== event.pointerId) return
    if (event.type !== 'pointercancel' && Math.abs(current.delta) > Math.min(78, event.currentTarget.clientWidth * .14)) change(index + (current.delta < 0 ? 1 : -1))
    setDrag(false)
    slides.current!.style.setProperty('--drag-offset', '0px')
    active.current = null
  }
  function key(event: KeyboardEvent) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    change(index + (event.key === 'ArrowLeft' ? -1 : 1))
  }

  return <section className="gallery" id="gallery" tabIndex={-1} data-angle={index} aria-label="键盘图片轮播">
    <span className="gallery-index" aria-hidden="true"><b>{String(index + 1).padStart(2, '0')}</b><span>{angles[index].name}</span></span>
    <div className="gallery-window" tabIndex={0} aria-label="拖动图片或按方向键切换角度" onKeyDown={key}
      onPointerDown={grab} onPointerMove={move} onPointerUp={release} onPointerCancel={release}>
      <div className="gallery-track" ref={slides} data-dragging={drag} style={{ '--slide': index * -100 + '%' } as React.CSSProperties}>
        {angles.map((angle, slot) => <div className="gallery-slide" key={angle.id} aria-hidden={slot !== index}>
          <img src={asset(variant.id, angle.id)} alt={variant.title + ' K75 · ' + angle.name} width={1020} height={680} draggable={false}
            data-active-image={slot === index ? true : undefined}/>
        </div>)}
      </div>
    </div>
    <div className="gallery-controls">
      <button type="button" className="icon-button" aria-label="上一张" disabled={!index} onClick={() => change(index - 1)}><ChevronLeft size={19}/></button>
      <div className="gallery-dots">{angles.map((angle, slot) => <button type="button" key={angle.id} aria-label={angle.name} aria-pressed={slot === index} onClick={() => change(slot)}/>)}</div>
      <button type="button" className="icon-button" aria-label="下一张" disabled={index === angles.length - 1} onClick={() => change(index + 1)}><ChevronRight size={19}/></button>
      <span className="sr-only" aria-live="polite">{angles[index].name}，第 {index + 1} 张，共 4 张</span>
    </div>
  </section>
}

const panels: [string, string[][]][] = [
  ['规格', [['布局', '紧凑 75%'], ['外壳', '阳极氧化铝'], ['键程', '3.6 mm'], ['连接', 'USB-C / 无线 / 蓝牙']]],
  ['手感', [['结构', '弹性垫片悬挂'], ['静音', '底部阻尼垫'], ['键帽', '磨砂 PBT'], ['旋钮', '细密滚花触感']]],
  ['包装清单', [['K75 键盘', '× 1'], ['USB-C 线材', '× 1'], ['无线接收器', '× 1'], ['拔键与拔轴器', '× 1']]],
]

function ProductTabs() {
  const [index, setIndex] = useState(0)
  const tabs = useRef<HTMLDivElement>(null)
  const indicator = useRef<HTMLSpanElement>(null)
  useLayoutEffect(() => {
    const line = indicator.current!, root = tabs.current!
    const resize = () => {
      const tab = root.querySelectorAll('button')[index]
      line.style.translate = tab.offsetLeft + 'px 0'
      line.style.width = tab.offsetWidth + 'px'
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(root)
    return () => observer.disconnect()
  }, [index])
  function key(event: KeyboardEvent) {
    const buttons = tabs.current!.querySelectorAll('button')
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? panels.length - 1 :
      event.key === 'ArrowLeft' ? (index + panels.length - 1) % panels.length : event.key === 'ArrowRight' ? (index + 1) % panels.length : -1
    if (next < 0) return
    event.preventDefault()
    setIndex(next)
    buttons[next].focus()
  }
  return <div className="product-tabs" id="product-tabs" tabIndex={-1}>
    <div className="tab-bar" ref={tabs} role="tablist" aria-label="产品资料" onKeyDown={key}>
      {panels.map(([label], slot) => <button type="button" key={label} role="tab" id={'tab-' + slot} aria-controls={'panel-' + slot} tabIndex={slot === index ? 0 : -1} aria-selected={slot === index}
        onClick={() => setIndex(slot)}>{label}</button>)}
      <span ref={indicator} className="tab-indicator"/>
    </div>
    <div className="tab-window"><div className="tab-track" style={{ '--tab-slide': index * -100 + '%' } as React.CSSProperties}>
      {panels.map(([label, rows], slot) => <dl key={label} role="tabpanel" id={'panel-' + slot} aria-labelledby={'tab-' + slot} aria-hidden={slot !== index}>
        {rows.map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}
      </dl>)}
    </div></div>
  </div>
}

const triangle = [[7, 4, 12, 7, 12, 17, 7, 20], [12, 7, 20, 12, 20, 12, 12, 17]]
const pause = [[6, 5, 10, 5, 10, 19, 6, 19], [14, 5, 18, 5, 18, 19, 14, 19]]

function PlaybackIcon({ playing }: { playing: boolean }) {
  const paths = useRef<SVGPolygonElement[]>([])
  const position = useRef(0)
  useEffect(() => {
    let frame = 0
    const start = performance.now(), origin = position.current, target = playing ? 1 : 0
    function render(now: number) {
      const progress = noMotion() ? 1 : clamp((now - start) / 300)
      position.current = origin + (target - origin) * (1 - (1 - progress) ** 3)
      paths.current.forEach((path, index) => path.setAttribute('points', triangle[index].map((number, slot) => number + (pause[index][slot] - number) * position.current).join(' ')))
      if (progress < 1) frame = requestAnimationFrame(render)
    }
    render(start)
    return () => cancelAnimationFrame(frame)
  }, [playing])
  return <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">{triangle.map((points, index) =>
    <polygon key={index} points={points.join(' ')} ref={node => { if (node) paths.current[index] = node }}/>)}</svg>
}

function SoundButton() {
  const [playing, setPlaying] = useState(false)
  const [message, setMessage] = useState('')
  const player = useRef<HTMLAudioElement>(null)
  useEffect(() => {
    const audio = player.current
    return () => audio?.pause()
  }, [])
  async function toggle() {
    const audio = player.current!
    if (!audio.paused) {
      audio.pause()
      return
    }
    try {
      await audio.play()
    } catch { if (player.current === audio) setMessage('浏览器未能播放声音，可再次尝试。') }
  }
  return <span className="sound-control">
    <audio ref={player} src={import.meta.env.BASE_URL + 'keys.wav'} preload="metadata"
      onPlaying={() => { setPlaying(true); setMessage('') }} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}/>
    <button type="button" className="sound-button" id="sound-button" onClick={() => void toggle()} aria-pressed={playing}
    title="试听本页合成的示例按键声">
    <span className="play-symbol"><PlaybackIcon playing={playing}/></span>{playing ? '暂停' : '试听按键声'}
    <span className="sound-bars" aria-hidden="true" data-playing={playing}>{Array.from({ length: 7 }, (_, index) => <i key={index} style={{ '--beat': index } as React.CSSProperties}/>)}</span>
  </button>{message && <small role="status">{message}</small>}</span>
}

function Favorite({ saved, onChange }: { saved: boolean; onChange: () => void }) {
  const [burst, setBurst] = useState(0)
  const icon = useRef<SVGSVGElement>(null)
  function toggle() {
    onChange()
    if (!saved && !noMotion()) {
      setBurst(value => value + 1)
      play(icon.current!, [{ scale: '1' }, { scale: '.39', offset: .23 }, { scale: '1.38', offset: .66 }, { scale: '1' }], 460)
    } else {
      setBurst(0)
      play(icon.current!, [{ scale: '.74' }, { scale: '1' }], 210)
    }
  }
  return <button className="icon-button favorite" type="button" aria-label={saved ? '取消收藏' : '收藏'} aria-pressed={saved} onClick={toggle}>
    <Heart ref={icon} size={21}/>{saved && burst > 0 && <span className="heart-sparks" key={burst} aria-hidden="true">
      {Array.from({ length: 9 }, (_, index) => <i key={index} style={{ '--ray': index * 40 + 'deg', '--particle': index } as React.CSSProperties}/>)}</span>}
  </button>
}

export function Tick({ size = 19 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="draw-tick">
    <path d="M4 12.5l5.2 5.1L20 6.9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" pathLength="1"/>
  </svg>
}

function AddButton({ onAdd, full }: { onAdd: () => void; full: boolean }) {
  const timer = useRef<number | undefined>(undefined)
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle')
  useEffect(() => () => window.clearTimeout(timer.current), [])
  function add(event: React.MouseEvent<HTMLButtonElement>) {
    if (state === 'busy' || full) return
    window.clearTimeout(timer.current)
    if (!event.detail) pressRipple(event.currentTarget, 0, 0, true)
    setState('busy')
    timer.current = window.setTimeout(() => {
      onAdd()
      setState('done')
      timer.current = window.setTimeout(() => setState('idle'), 2100)
    }, noMotion() ? 0 : 560)
  }
  return <button type="button" className="pill add-product" id="add-product" data-state={state} aria-busy={state === 'busy'} aria-disabled={state === 'busy' || full}
    onPointerDown={event => { if (!full && state !== 'busy' && event.button === 0) pressRipple(event.currentTarget, event.clientX, event.clientY) }} onClick={add}>
    {state === 'busy' ? <><LoaderCircle className="spin" size={19}/> 加入中</> : state === 'done' ? <><Tick/> 已加入</> :
      full ? '已达演示数量上限' : <>加入购物袋 <ArrowDown className="add-arrow" size={18}/></>}
  </button>
}

export function ProductDetails({ variant, origin, onClose, onAdd, full, saved, setSaved, bag, cue }: {
  variant: Variant; origin: FlightOrigin | null; onClose: () => void; onAdd: () => void; full: boolean; saved: boolean; setSaved: () => void; bag: ReactNode; cue: ReactNode
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const dismiss = useProductFlight(dialog, variant, origin, onClose)
  return <Layer open kind="detail" label={variant.title + ' K75 详情'} element={dialog} onClose={() => void dismiss()}>
    <div className="detail-shell" data-edition-tone={variant.id} style={{ '--variant-paper': variant.paper } as React.CSSProperties}>
      <header className="detail-bar">
        <span className="detail-family">KEYFORM <b>K75</b></span>
        <div>{bag}<SoundButton/><Favorite saved={saved} onChange={setSaved}/>
          <button className="icon-button" type="button" data-focus aria-label="关闭详情" onClick={() => void dismiss()}><X size={22}/></button>
        </div>
      </header>
      <main className="detail-main">
        <div className="detail-copy">
          <p className="eyebrow">机械键盘 / K75</p><h2 data-shared-name>{variant.title}<span>{variant.english}</span></h2>
          <p className="detail-intro">{variant.intro}</p>
          <ProductTabs/>
        </div>
        <Gallery variant={variant}/>
        <footer className="detail-purchase"><strong>¥{variant.price}</strong><AddButton onAdd={onAdd} full={full}/></footer>
      </main>
      {cue}
    </div>
  </Layer>
}
