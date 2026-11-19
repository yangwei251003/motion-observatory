import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { asset, type Variant } from './catalog'
import { clamp, noMotion, point, spring } from './motion'

export function Magnetic({ onClick }: { onClick: () => void }) {
  const zone = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const content = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const area = zone.current!, control = button.current!, label = content.current!
    const motion = spring((x, y) => {
      control.style.translate = `${x}px ${y}px`
      label.style.translate = `${x * .52}px ${y * .52}px`
    }, 225, 16)
    function attract(event: PointerEvent) {
      if (event.pointerType !== 'mouse' || noMotion()) return
      const { x, y, width, height } = point(event, area)
      const dx = x - width / 2, dy = y - height / 2
      const reach = Math.hypot(dx / (width / 2), dy / (height / 2))
      const weight = 1 - .5 * clamp(reach)
      motion.move(dx * .34 * weight, dy * .48 * weight)
    }
    const release = () => motion.move(0, 0)
    area.addEventListener('pointermove', attract)
    area.addEventListener('pointerleave', release)
    return () => {
      motion.stop()
      area.removeEventListener('pointermove', attract)
      area.removeEventListener('pointerleave', release)
    }
  }, [])
  return <div ref={zone} id="magnetic" className="magnetic-zone" tabIndex={-1}>
    <button ref={button} className="pill primary magnetic" data-cursor="button" type="button" onClick={onClick}>
      <span ref={content}>探索 K75 <ArrowUpRight size={17}/></span>
    </button>
  </div>
}

export function LiveKeyboard({ variant }: { variant: Variant }) {
  const area = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const host = area.current!, canvas = stage.current!
    let mounted = true
    let renderer: ReturnType<typeof import('./keyboard')['createKeyboardRenderer']> | undefined
    let viewport: ResizeObserver | undefined
    let lastX = 0, lastY = 0, drag: number | null = null, loading = false
    const motion = spring((x, y) => {
      lastX = x
      lastY = y
      host.dataset.pose = `${x.toFixed(3)},${y.toFixed(3)}`
      host.style.setProperty('--board-x', x * 56 + 'deg')
      host.style.setProperty('--board-y', y * 56 + 'deg')
      renderer?.draw(x, y)
    }, 200, 23)

    async function enable() {
      if (renderer || loading) return
      loading = true
      try {
        const { createKeyboardRenderer } = await import('./keyboard')
        if (!mounted) return
        renderer = createKeyboardRenderer(canvas, variant)
        const resize = () => {
          if (!renderer || !host.clientWidth || !host.clientHeight) return
          renderer.resize(host.clientWidth, host.clientHeight, Math.min(devicePixelRatio, 1.65))
          renderer.draw(lastX, lastY)
        }
        viewport = new ResizeObserver(resize)
        viewport.observe(host)
        resize()
        setReady(true)
      } catch {
        if (mounted) setReady(false)
      }
    }
    const visibility = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        visibility.disconnect()
        void enable()
      }
    }, { rootMargin: '100px' })
    visibility.observe(host)
    function rotate(event: PointerEvent) {
      if (event.pointerType !== 'mouse' && event.pointerId !== drag) return
      const { x, y, width, height } = point(event, host)
      motion.move((.5 - y / height) * .46, (x / width - .5) * .64)
    }
    const recenter = () => motion.move(0, 0)
    function grab(event: PointerEvent) {
      if (event.pointerType === 'mouse') return
      drag = event.pointerId
      host.setPointerCapture(event.pointerId)
      rotate(event)
    }
    function release(event: PointerEvent) {
      if (event.pointerId === drag) drag = null
      recenter()
    }
    function key(event: KeyboardEvent) {
      const rotations: Record<string, [number, number]> = { ArrowUp: [.22, 0], ArrowDown: [-.22, 0], ArrowLeft: [0, -.3], ArrowRight: [0, .3], Escape: [0, 0] }
      if (!rotations[event.key]) return
      event.preventDefault()
      motion.move(...rotations[event.key])
    }
    function contextLost(event: Event) {
      event.preventDefault()
      setReady(false)
    }
    host.addEventListener('pointermove', rotate)
    host.addEventListener('pointerleave', recenter)
    host.addEventListener('pointerdown', grab)
    host.addEventListener('pointerup', release)
    host.addEventListener('pointercancel', release)
    host.addEventListener('keydown', key)
    host.addEventListener('blur', recenter)
    canvas.addEventListener('webglcontextlost', contextLost)
    return () => {
      mounted = false
      viewport?.disconnect()
      visibility.disconnect()
      motion.stop()
      host.removeEventListener('pointermove', rotate)
      host.removeEventListener('pointerleave', recenter)
      host.removeEventListener('pointerdown', grab)
      host.removeEventListener('pointerup', release)
      host.removeEventListener('pointercancel', release)
      host.removeEventListener('keydown', key)
      host.removeEventListener('blur', recenter)
      canvas.removeEventListener('webglcontextlost', contextLost)
      renderer?.dispose()
    }
  }, [variant])
  return <div ref={area} className="hero-product" id="hero-product" tabIndex={0} role="img"
    aria-label="陶橘 K75 键盘。移动指针、拖动或用方向键改变视角" data-renderer={ready ? '3d' : 'image'}>
    <img aria-hidden={true} className="hero-render" src={asset(variant.id)} alt="" width={1020} height={680} fetchPriority="high"/>
    <canvas ref={stage} aria-hidden={true}/>
    <span className="angle-note"><span>↔</span> {ready ? '移动指针旋转键盘' : '拖动查看键盘'}</span>
  </div>
}

type Painter = { resize: (width: number, height: number) => void; draw: (now: number, graphics: CanvasRenderingContext2D, width: number, height: number) => boolean; pointer: (event: PointerEvent, canvas: HTMLCanvasElement) => void; leave: () => void }

function DotPainter(): Painter {
  const spacing = 19
  const dots: { x: number; y: number; dx: number; dy: number; vx: number; vy: number; color: number }[] = []
  let pointerX = Infinity, pointerY = Infinity, prior = 0
  return {
    resize(width, height) {
      dots.length = 0
      for (let y = spacing / 2; y < height; y += spacing) {
        for (let x = spacing / 2; x < width; x += spacing) dots.push({ x, y, dx: 0, dy: 0, vx: 0, vy: 0, color: 0 })
      }
    },
    pointer(event, canvas) {
      const position = point(event, canvas)
      pointerX = position.x
      pointerY = position.y
    },
    leave() { pointerX = pointerY = Infinity },
    draw(now, graphics, width, height) {
      const time = prior ? clamp((now - prior) / 1000, .001, .023) : .016
      prior = now
      let active = false
      graphics.clearRect(0, 0, width, height)
      for (const dot of dots) {
        const near = Math.hypot(dot.x - pointerX, dot.y - pointerY)
        const force = Math.pow(1 - clamp(near / 120), 1.8)
        const tx = near > .1 && force ? (dot.x - pointerX) / near * force * 60 : 0
        const ty = near > .1 && force ? (dot.y - pointerY) / near * force * 60 : 0
        dot.vx += ((tx - dot.dx) * 145 - dot.vx * 13) * time
        dot.vy += ((ty - dot.dy) * 145 - dot.vy * 13) * time
        dot.dx += dot.vx * time
        dot.dy += dot.vy * time
        dot.color += (force - dot.color) * .24
        if (Math.abs(tx - dot.dx) + Math.abs(ty - dot.dy) + Math.abs(dot.vx) + Math.abs(dot.vy) + Math.abs(force - dot.color) > .06) active = true
        graphics.fillStyle = dot.color > .014 ? `rgba(53,77,227,${.22 + dot.color * .78})` : 'rgba(70,65,99,.21)'
        graphics.beginPath()
        graphics.arc(dot.x + dot.dx, dot.y + dot.dy, .82 + dot.color * 1.9, 0, 2 * Math.PI)
        graphics.fill()
      }
      return active
    },
  }
}

function TrailPainter(): Painter {
  const points: { x: number; y: number; age: number }[] = []
  return {
    resize() { points.length = 0 },
    pointer(event, canvas) {
      const next = point(event, canvas)
      const last = points.at(-1)
      const age = performance.now()
      if (last && Math.hypot(next.x - last.x, next.y - last.y) < 1.4) return
      if (last && age - last.age > 300) points.length = 0
      points.push({ x: next.x, y: next.y, age })
      if (points.length > 34) points.shift()
    },
    leave() {},
    draw(now, graphics, width, height) {
      while (points.length && now - points[0].age > 435) points.shift()
      graphics.clearRect(0, 0, width, height)
      graphics.lineCap = 'round'
      for (let index = 1; index < points.length; index++) {
        const head = points[index], tail = points[index - 1]
        const power = clamp(1 - (now - head.age) / 435) * (index / (points.length - 1))
        const next = points[index + 1]
        graphics.beginPath()
        graphics.moveTo(index > 1 ? (tail.x + head.x) / 2 : tail.x, index > 1 ? (tail.y + head.y) / 2 : tail.y)
        if (next) graphics.quadraticCurveTo(head.x, head.y, (head.x + next.x) / 2, (head.y + next.y) / 2)
        else graphics.lineTo(head.x, head.y)
        graphics.shadowColor = '#ddff48'
        graphics.shadowBlur = 18 * power
        graphics.lineWidth = .65 + 9 * power
        graphics.strokeStyle = `rgba(195,255,47,${.64 * power})`
        graphics.stroke()
        graphics.shadowBlur = 2 + 5 * power
        graphics.lineWidth = .35 + 3 * power
        graphics.strokeStyle = `rgba(246,255,178,${.96 * power})`
        graphics.stroke()
      }
      graphics.shadowBlur = 0
      return points.length > 0
    },
  }
}

export function PointerCanvas({ kind }: { kind: 'dots' | 'trail' }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current!, host = canvas.parentElement!
    const graphics = canvas.getContext('2d')
    if (!graphics) return
    const painter = kind === 'dots' ? DotPainter() : TrailPainter()
    let frame = 0, width = 1, height = 1
    function draw(now: number) {
      frame = 0
      if (painter.draw(now, graphics!, width, height) && !noMotion()) frame = requestAnimationFrame(draw)
    }
    const wake = () => { if (!frame) frame = requestAnimationFrame(draw) }
    const resize = new ResizeObserver(() => {
      width = canvas.clientWidth
      height = canvas.clientHeight
      const ratio = Math.min(devicePixelRatio, 1.6)
      canvas.width = Math.max(1, Math.round(width * ratio))
      canvas.height = Math.max(1, Math.round(height * ratio))
      graphics.setTransform(ratio, 0, 0, ratio, 0, 0)
      painter.resize(width, height)
      wake()
    })
    function interact(event: PointerEvent) {
      if (noMotion() || (event.pointerType !== 'mouse' && !event.buttons)) return
      if (kind === 'dots' && event.target instanceof Element && event.target.closest('button,a,input')) return
      const samples = event.getCoalescedEvents?.()
      for (const sample of samples?.length ? samples : [event]) painter.pointer(sample, canvas)
      wake()
    }
    const deactivate = () => {
      painter.leave()
      wake()
    }
    resize.observe(canvas)
    host.addEventListener('pointermove', interact)
    host.addEventListener('pointerleave', deactivate)
    host.addEventListener('pointerup', deactivate)
    return () => {
      resize.disconnect()
      cancelAnimationFrame(frame)
      host.removeEventListener('pointermove', interact)
      host.removeEventListener('pointerleave', deactivate)
      host.removeEventListener('pointerup', deactivate)
    }
  }, [kind])
  return <canvas ref={ref} aria-hidden="true" data-painter={kind} className={'pointer-canvas ' + kind}/>
}

export function CustomCursor({ asleep }: { asleep: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const cursor = ref.current!, dot = cursor.firstElementChild as HTMLDivElement, ring = cursor.lastElementChild as HTMLDivElement
    const mouseOnly = matchMedia('(hover: hover) and (pointer: fine)')
    let rx = 0, ry = 0, targetX = 0, targetY = 0, active = false, frame = 0
    function locate(now: boolean) {
      rx += (targetX - rx) * (now ? 1 : .235)
      ry += (targetY - ry) * (now ? 1 : .235)
      ring.style.transform = `translate3d(${rx}px,${ry}px,0)`
    }
    function follow() {
      frame = 0
      locate(false)
      if (active && Math.hypot(rx - targetX, ry - targetY) > .28) frame = requestAnimationFrame(follow)
    }
    function hide() {
      active = false
      document.documentElement.classList.remove('custom-pointer')
      delete cursor.dataset.state
      cancelAnimationFrame(frame)
      frame = 0
    }
    function move(event: PointerEvent) {
      if (asleep || noMotion() || !mouseOnly.matches || event.pointerType !== 'mouse' || !(event.target instanceof Element) ||
          event.target.closest('input, textarea, select, dialog, .demo-dock, [data-stock-cursor]')) {
        hide()
        return
      }
      const target = event.target.closest<HTMLElement>('[data-cursor],button,a')
      targetX = event.clientX
      targetY = event.clientY
      dot.style.transform = `translate3d(${targetX}px,${targetY}px,0)`
      if (!active) locate(true)
      active = true
      document.documentElement.classList.add('custom-pointer')
      cursor.dataset.state = target?.dataset.cursor ?? (target ? 'button' : event.target.closest('#afterglow') ? 'trail' : 'plain')
      if (!frame) frame = requestAnimationFrame(follow)
    }
    document.addEventListener('pointermove', move, { passive: true })
    document.documentElement.addEventListener('pointerleave', hide)
    window.addEventListener('blur', hide)
    mouseOnly.addEventListener('change', hide)
    return () => {
      hide()
      document.removeEventListener('pointermove', move)
      document.documentElement.removeEventListener('pointerleave', hide)
      window.removeEventListener('blur', hide)
      mouseOnly.removeEventListener('change', hide)
    }
  }, [asleep])
  return <div className="custom-cursor" ref={ref} aria-hidden="true"><div><i/></div><div><span><b>了解</b></span></div></div>
}

export function Spotlight({ children }: { children: ReactNode }) {
  function follow(event: React.PointerEvent<HTMLDivElement>) {
    const { x, y } = point(event, event.currentTarget)
    event.currentTarget.style.setProperty('--spot-x', x + 'px')
    event.currentTarget.style.setProperty('--spot-y', y + 'px')
  }
  return <div className="spotlight" onPointerMove={follow}>{children}<i className="spot-dots"/><i className="spot-edge"/></div>
}
