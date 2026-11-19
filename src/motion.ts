export const easeOut = 'cubic-bezier(.18,.76,.23,1)'
export const easeInOut = 'cubic-bezier(.68,0,.25,1)'
export const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value))
export const noMotion = () => document.documentElement.dataset.motion === 'off' || matchMedia('(prefers-reduced-motion: reduce)').matches
export const settle = (animation: Animation) => animation.finished.catch(() => undefined)

export function play(node: Element, frames: Keyframe[], duration: number, easing = easeOut, fill: FillMode = 'none') {
  return node.animate(frames, { duration: noMotion() ? 0 : duration, easing, fill })
}

export function point(event: { clientX: number; clientY: number }, node: Element) {
  const box = node.getBoundingClientRect()
  return { x: event.clientX - box.left, y: event.clientY - box.top, width: box.width, height: box.height }
}

export function spring(update: (x: number, y: number) => void, stiffness = 190, damping = 18) {
  let x = 0, y = 0, vx = 0, vy = 0, goalX = 0, goalY = 0, frame = 0, clock = 0
  function tick(timestamp: number) {
    frame = 0
    const seconds = clamp((timestamp - clock) / 1000, .001, .095)
    clock = timestamp
    if (noMotion()) {
      x = goalX = y = goalY = vx = vy = 0
      update(x, y)
      return
    }
    const count = Math.ceil(seconds / .011)
    const dt = seconds / count
    for (let iteration = 0; iteration < count; iteration++) {
      vx += ((goalX - x) * stiffness - vx * damping) * dt
      vy += ((goalY - y) * stiffness - vy * damping) * dt
      x += vx * dt
      y += vy * dt
    }
    if (Math.abs(goalX - x) + Math.abs(goalY - y) < .011 && Math.abs(vx) + Math.abs(vy) < .05) {
      x = goalX
      y = goalY
    } else {
      frame = requestAnimationFrame(tick)
    }
    update(x, y)
  }
  return {
    move(nextX: number, nextY: number) {
      goalX = nextX
      goalY = nextY
      if (!frame) {
        clock = performance.now()
        frame = requestAnimationFrame(tick)
      }
    },
    stop() { cancelAnimationFrame(frame) },
  }
}

export function pressRipple(button: HTMLButtonElement, clientX: number, clientY: number, centered = false) {
  if (noMotion()) return
  const { x, y, width, height } = centered ? { x: button.clientWidth / 2, y: button.clientHeight / 2, width: button.clientWidth, height: button.clientHeight } : point({ clientX, clientY }, button)
  const ripple = document.createElement('span')
  ripple.className = 'press-ripple'
  const diameter = 2 * Math.hypot(Math.max(x, width - x), Math.max(y, height - y))
  Object.assign(ripple.style, { left: x + 'px', top: y + 'px', width: diameter + 'px', height: diameter + 'px' })
  button.append(ripple)
  const expansion = play(ripple, [
    { transform: 'translate(-50%, -50%) scale(.015)', opacity: .78 },
    { transform: 'translate(-50%, -50%) scale(1)', opacity: 0 },
  ], 600)
  void settle(expansion).then(() => ripple.remove())
}
