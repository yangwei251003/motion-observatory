import * as THREE from 'three'
import type { Angle, Variant } from './catalog'

type Key = { label: string; width: number; shade: 'regular' | 'modifier' | 'accent' }
const letter = (label: string, width = 1): Key => ({ label, width, shade: 'regular' })
const modifier = (label: string, width = 1): Key => ({ label, width, shade: 'modifier' })
const accent = (label: string, width = 1): Key => ({ label, width, shade: 'accent' })
const rows: Key[][] = [
  [accent('ESC'), ...Array.from({ length: 12 }, (_, index) => modifier('F' + (index + 1))), modifier('DEL', 1.2)],
  [...'1234567890'.split('').map(key => letter(key)), letter('–'), letter('='), modifier('BACK', 1.8), modifier('HOME')],
  [modifier('TAB', 1.36), ...'QWERTYUIOP'.split('').map(key => letter(key)), letter('['), letter(']'), modifier('\\', .87), modifier('PG UP')],
  [modifier('CAPS', 1.55), ...'ASDFGHJKL'.split('').map(key => letter(key)), letter(';'), letter("'"), accent('ENTER', 1.68), modifier('PG DN')],
  [modifier('SHIFT', 1.96), ...'ZXCVBNM'.split('').map(key => letter(key)), letter(','), letter('.'), letter('/'), modifier('SHIFT', 1.27), accent('↑'), modifier('END')],
  [modifier('CTRL', 1.23), modifier('WIN', 1.23), modifier('ALT', 1.23), letter('', 5.72), modifier('ALT', 1.18), modifier('FN', 1.18), accent('←'), accent('↓'), accent('→')],
]
const pitch = .659

function plate(width: number, depth: number, height: number, radius: number, bevel: number) {
  const halfWidth = width / 2 - bevel
  const halfDepth = depth / 2 - bevel
  const outline = new THREE.Shape()
  outline.moveTo(-halfWidth + radius, -halfDepth)
  outline.lineTo(halfWidth - radius, -halfDepth)
  outline.quadraticCurveTo(halfWidth, -halfDepth, halfWidth, -halfDepth + radius)
  outline.lineTo(halfWidth, halfDepth - radius)
  outline.quadraticCurveTo(halfWidth, halfDepth, halfWidth - radius, halfDepth)
  outline.lineTo(-halfWidth + radius, halfDepth)
  outline.quadraticCurveTo(-halfWidth, halfDepth, -halfWidth, halfDepth - radius)
  outline.lineTo(-halfWidth, -halfDepth + radius)
  outline.quadraticCurveTo(-halfWidth, -halfDepth, -halfWidth + radius, -halfDepth)
  const geometry = new THREE.ExtrudeGeometry(outline, { depth: height - 2 * bevel, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, curveSegments: 6 })
  geometry.rotateX(-Math.PI / 2)
  geometry.translate(0, bevel, 0)
  return geometry
}

function capGeometry(width: number, height: number) {
  const depth = .615
  const levels = [[0, .97], [.03, 1], [height - .045, .82], [height, .72]]
  const points: number[] = []
  const faces: number[] = []
  const quarters = 4
  const ringSize = quarters * 4
  for (const [level, scale] of levels) {
    for (let corner = 0; corner < 4; corner++) {
      const angle = corner * Math.PI / 2
      const mid = angle + Math.PI / 4
      const centerX = (width * scale / 2 - .055) * Math.sign(Math.cos(mid))
      const centerZ = (depth * scale / 2 - .055) * Math.sign(Math.sin(mid))
      for (let part = 0; part < quarters; part++) {
        const theta = angle + part * Math.PI / 2 / (quarters - 1)
        points.push(centerX + Math.cos(theta) * .055, level, centerZ + Math.sin(theta) * .055)
      }
    }
  }
  for (let ring = 0; ring < levels.length - 1; ring++) {
    for (let point = 0; point < ringSize; point++) {
      const lower = ring * ringSize + point
      const next = ring * ringSize + (point + 1) % ringSize
      faces.push(lower, lower + ringSize, next, next, lower + ringSize, next + ringSize)
    }
  }
  const upper = (levels.length - 1) * ringSize
  const center = points.length / 3
  points.push(0, height, 0)
  for (let point = 0; point < ringSize; point++) faces.push(center, upper + (point + 1) % ringSize, upper + point)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
  geometry.setIndex(faces)
  geometry.computeVertexNormals()
  return geometry
}

function legends(keys: { label: string; x: number; y: number; z: number; bright: boolean }[]) {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 512
  const context = canvas.getContext('2d')!
  const columns = 16, tile = 64
  const vertices: number[] = [], uvs: number[] = [], faces: number[] = []
  keys.forEach(({ label, x, y, z, bright }, index) => {
    const col = index % columns
    const row = Math.floor(index / columns)
    const left = col * tile, top = row * tile
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillStyle = bright ? '#eff2f6' : '#282733'
    context.font = `${label.length > 3 ? 16 : 26}px Arial`
    context.fillText(label, left + tile / 2, top + tile / 2)
    const dx = .176, dz = .176
    const indexStart = index * 4
    vertices.push(x-dx,y,z+dz, x+dx,y,z+dz, x-dx,y,z-dz, x+dx,y,z-dz)
    const u0 = (left + 1) / canvas.width, u1 = (left + tile - 1) / canvas.width
    const v0 = 1 - (top + tile - 1) / canvas.height, v1 = 1 - (top + 1) / canvas.height
    uvs.push(u0,v0,u1,v0,u0,v1,u1,v1)
    faces.push(indexStart,indexStart+1,indexStart+2,indexStart+2,indexStart+1,indexStart+3)
  })
  const map = new THREE.CanvasTexture(canvas)
  map.colorSpace = THREE.SRGBColorSpace
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(faces)
  return new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map, transparent: true, alphaTest: .15, depthWrite: false, toneMapped: false }))
}

function material(color: string, roughness = .38, metalness = .12) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness })
}

function keyboard(variant: Variant) {
  const board = new THREE.Group()
  const dark = variant.id === 'eclipse'
  const shell = material(variant.shell, .25, .34)
  const trim = material(dark ? '#424c61' : variant.shell, .47, .22)
  const bed = material(dark ? '#171922' : '#3a3031', .72)
  const base = new THREE.Mesh(plate(10.62, 4.63, .42, .17, .09), shell)
  const upper = new THREE.Mesh(plate(10.64, 4.60, .16, .16, .055), trim)
  const recess = new THREE.Mesh(plate(10.26, 4.23, .085, .14, .024), bed)
  upper.position.y = .37
  recess.position.y = .46
  board.add(base, upper, recess)

  const paints = { regular: material(variant.key), modifier: material(variant.darkKey), accent: material(variant.accent, .28) }
  const batches = new Map<string, { geometry: THREE.BufferGeometry; paint: THREE.Material; transforms: THREE.Matrix4[] }>()
  const lettering: Parameters<typeof legends>[0] = []
  rows.forEach((row, rowIndex) => {
    let x = -4.97
    const z = -1.69 + rowIndex * .674
    const height = rowIndex < 2 ? .305 : rowIndex < 4 ? .28 : .262
    row.forEach(key => {
      const fromLeft = x + key.width * pitch / 2
      const style = `${key.shade}/${key.width}/${height}`
      let batch = batches.get(style)
      if (!batch) {
        batch = { geometry: capGeometry(key.width * pitch - .052, height), paint: paints[key.shade], transforms: [] }
        batches.set(style, batch)
      }
      batch.transforms.push(new THREE.Matrix4().makeTranslation(fromLeft, .535, z))
      if (key.label) lettering.push({ label: key.label, x: fromLeft - (key.width > 1.65 ? .2 : 0), y: .539 + height, z: z - .06, bright: key.shade === 'accent' ? !dark : dark })
      x += key.width * pitch
    })
  })
  for (const { geometry, paint, transforms } of batches.values()) {
    const keys = new THREE.InstancedMesh(geometry, paint, transforms.length)
    transforms.forEach((matrix, index) => keys.setMatrixAt(index, matrix))
    keys.instanceMatrix.needsUpdate = true
    board.add(keys)
  }
  board.add(legends(lettering))

  const knob = new THREE.Group()
  knob.position.set(4.69, .535, -1.70)
  const spindle = new THREE.Mesh(new THREE.CylinderGeometry(.29, .30, .105, 48), bed)
  const outerDial = new THREE.Mesh(new THREE.CylinderGeometry(.287, .315, .32, 48), paints.accent)
  outerDial.position.y = .20
  const dialTop = new THREE.Mesh(new THREE.CylinderGeometry(.264, .287, .036, 48), paints.accent)
  dialTop.position.y = .375
  const grooves = new THREE.InstancedMesh(new THREE.BoxGeometry(.022, .242, .021), material(dark ? '#9eb82a' : '#4a60af', .39), 44)
  const ridge = new THREE.Object3D()
  for (let index = 0; index < grooves.count; index++) {
    const angle = 2 * Math.PI * index / grooves.count
    ridge.position.set(Math.cos(angle) * .307, .196, Math.sin(angle) * .307)
    ridge.rotation.y = -angle
    ridge.updateMatrix()
    grooves.setMatrixAt(index, ridge.matrix)
  }
  const marker = new THREE.Mesh(new THREE.BoxGeometry(.033, .011, .112), material(dark ? '#586128' : '#d9e5ff'))
  marker.position.set(0, .398, -.151)
  knob.add(spindle, outerDial, dialTop, grooves, marker)
  board.add(knob)

  const socket = new THREE.Mesh(new THREE.BoxGeometry(.59, .148, .043), bed)
  socket.position.set(-3.66, .236, -2.314)
  const port = new THREE.Mesh(new THREE.BoxGeometry(.34, .045, .047), material('#a6b3c5', .31, .55))
  port.position.copy(socket.position)
  port.position.z -= .012
  const led = new THREE.Mesh(new THREE.BoxGeometry(.37, .029, .019), new THREE.MeshBasicMaterial({ color: variant.accent }))
  led.position.set(4.34, .30, 2.318)
  board.add(socket, port, led)
  return board
}

function contactShadow() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 128
  const graphics = canvas.getContext('2d')!
  const gradient = graphics.createRadialGradient(128, 64, 3, 128, 64, 63)
  gradient.addColorStop(0, 'rgba(12, 16, 29, .38)')
  gradient.addColorStop(.48, 'rgba(12, 16, 29, .25)')
  gradient.addColorStop(1, 'rgba(12, 16, 29, 0)')
  graphics.save()
  graphics.translate(128, 64)
  graphics.scale(2, 1)
  graphics.translate(-128, -64)
  graphics.fillStyle = gradient
  graphics.fillRect(64, 0, 128, 128)
  graphics.restore()
  const map = new THREE.CanvasTexture(canvas)
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(13.8, 6), new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, toneMapped: false }))
  shadow.rotation.x = -Math.PI / 2
  shadow.position.set(.32, -.045, .48)
  return shadow
}

const shots: Record<Angle, { camera: [number, number, number]; target: [number, number, number]; fov: number }> = {
  angle: { camera: [5.2, 7.1, 11.6], target: [0, .29, 0], fov: 37 },
  top: { camera: [0, 13.9, .008], target: [0, .28, 0], fov: 38 },
  dial: { camera: [6.4, 3.8, 4.4], target: [3.25, .48, -.82], fov: 43 },
  side: { camera: [2, 2, 13.9], target: [0, .26, 0], fov: 37 },
}

export function createKeyboardRenderer(canvas: HTMLCanvasElement, variant: Variant, view: Angle = 'angle') {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power', preserveDrawingBuffer: true })
  renderer.setClearColor(0x000000, 0)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.13
  const scene = new THREE.Scene()
  const pivot = new THREE.Group()
  const board = keyboard(variant)
  pivot.add(board)
  scene.add(contactShadow(), pivot)
  scene.add(new THREE.HemisphereLight('#fdf4e5', '#859acf', 2.32))
  const main = new THREE.DirectionalLight('#fff4e2', 3.2)
  main.position.set(-4.5, 8, 5)
  const rim = new THREE.DirectionalLight('#b5caff', 1.75)
  rim.position.set(4.5, 4, -6)
  scene.add(main, rim)
  const shot = shots[view]
  const camera = new THREE.PerspectiveCamera(shot.fov, 1.5, .1, 70)
  camera.position.set(...shot.camera)
  camera.lookAt(...shot.target)

  return {
    resize(width: number, height: number, ratio = 1) {
      renderer.setPixelRatio(ratio)
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.fov = Math.max(shot.fov, 2 * Math.atan(Math.tan(shot.fov * Math.PI / 360) * 1.48 / camera.aspect) * 180 / Math.PI)
      camera.updateProjectionMatrix()
    },
    draw(tiltX = 0, tiltY = 0) {
      pivot.rotation.set(tiltX, tiltY, 0)
      renderer.render(scene, camera)
    },
    dispose() {
      const geometries = new Set<THREE.BufferGeometry>()
      const materials = new Set<THREE.Material>()
      scene.traverse(object => {
        if (object instanceof THREE.InstancedMesh) object.dispose()
        if (object instanceof THREE.Mesh) {
          geometries.add(object.geometry)
          for (const paint of Array.isArray(object.material) ? object.material : [object.material]) materials.add(paint)
        }
      })
      geometries.forEach(geometry => geometry.dispose())
      materials.forEach(paint => {
        if ('map' in paint && paint.map instanceof THREE.Texture) paint.map.dispose()
        paint.dispose()
      })
      renderer.dispose()
      renderer.forceContextLoss()
    },
  }
}
