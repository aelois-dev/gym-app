/**
 * three.js renderer for the exercise figures. One WebGL context is shared by everything:
 * still thumbnails are rendered once and cached as images, animated views copy each frame
 * into their own 2D canvas.
 */
import {
  BoxGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  Quaternion,
  Scene,
  SphereGeometry,
  Vector3,
  WebGLRenderer,
  type BufferGeometry,
  type Material as ThreeMaterial,
} from 'three'
import type { Highlight } from '../figure/ExerciseAnimation'
import type { LoadKind, Pattern } from '../figure/patterns'
import { framePoints, modeOf, scene3, v, type Body3, type Material, type Solid, type V3 } from './pose3d'

// ---------- palette ----------
interface Palette {
  skin: string
  shirt: string
  shorts: string
  shoe: string
  sole: string
  hair: string
  muscle: string
  steel: string
  iron: string
  pad: string
  block: string
  ground: string
  dark: boolean
}

function cssVar(name: string, fallback: string) {
  if (typeof document === 'undefined') return fallback
  const s = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return s || fallback
}

export function isDark() {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches && document.documentElement.dataset.theme !== 'light'
}

function palette(): Palette {
  const dark = isDark()
  return {
    dark,
    skin: '#c69c84',
    shirt: dark ? '#b9c0c6' : '#3d444b',
    shorts: dark ? '#4a5057' : '#22262a',
    shoe: dark ? '#3b4046' : '#2b2f34',
    sole: '#e6e9ec',
    hair: '#2c2623',
    muscle: cssVar('--fig-muscle', '#d3242c'),
    steel: dark ? '#8a9198' : '#7d848b',
    iron: dark ? '#565c63' : '#2a2e33',
    pad: dark ? '#40454b' : '#30353a',
    block: dark ? '#353a40' : '#c3c9ce',
    ground: cssVar('--fig-ground', '#d6dade'),
  }
}

// ---------- shared geometry ----------
const SPHERE = new SphereGeometry(1, 28, 18)
const BOX = new BoxGeometry(1, 1, 1)
const cylinders = new Map<number, BufferGeometry>()
const cyl = (sides: number) => {
  let g = cylinders.get(sides)
  if (!g) {
    g = new CylinderGeometry(1, 1, 1, sides, 1)
    cylinders.set(sides, g)
  }
  return g
}
const tapered = new Map<string, BufferGeometry>()
/** A cylinder of height 1 along +y, radius ra at the bottom and rb at the top. */
const taper = (ra: number, rb: number) => {
  const key = `${ra}|${rb}`
  let g = tapered.get(key)
  if (!g) {
    g = new CylinderGeometry(rb, ra, 1, 22, 1, true)
    tapered.set(key, g)
  }
  return g
}

const Y = new Vector3(0, 1, 0)
const tmpV = new Vector3()
const tmpM = new Matrix4()

function placeTube(m: Mesh, a: V3, b: V3) {
  const d = v.sub(b, a)
  const len = v.len(d) || 0.001
  m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2)
  m.quaternion.setFromUnitVectors(Y, tmpV.set(d[0] / len, d[1] / len, d[2] / len))
  m.scale.set(1, len, 1)
}

function placeRod(m: Mesh, a: V3, b: V3, r: number) {
  placeTube(m, a, b)
  m.scale.set(r, m.scale.y, r)
}

function placeSphere(m: Mesh, c: V3, r: number) {
  m.position.set(c[0], c[1], c[2])
  m.quaternion.identity()
  m.scale.setScalar(r)
}

/** Ellipsoid in the torso frame: radii along forward, up and lateral. */
function placeEllipsoid(m: Mesh, c: V3, b: Body3, rFwd: number, rUp: number, rLat: number) {
  m.position.set(c[0], c[1], c[2])
  tmpM.makeBasis(new Vector3(...b.forward), new Vector3(...b.up), new Vector3(...b.lateral))
  m.quaternion.setFromRotationMatrix(tmpM)
  m.scale.set(rFwd, rUp, rLat)
}

const at = (b: Body3, base: V3, up: number, fwd: number, lat = 0): V3 =>
  v.add(v.add(v.add(base, v.mul(b.up, up)), v.mul(b.forward, fwd)), v.mul(b.lateral, lat))

// ---------- the body ----------
type Mats = Record<'skin' | 'shirt' | 'shorts' | 'shoe' | 'sole' | 'hair' | 'muscle' | Material | 'shadow' | 'ground', ThreeMaterial>

function makeMats(p: Palette): Mats {
  const std = (color: string, roughness = 0.82, metalness = 0) => new MeshStandardMaterial({ color: new Color(color), roughness, metalness })
  const shadowTex = radialTexture('rgba(0,0,0,0.34)', 'rgba(0,0,0,0)')
  const groundTex = radialTexture(p.ground, 'rgba(0,0,0,0)', 0.15)
  return {
    skin: std(p.skin, 0.7),
    shirt: std(p.shirt, 0.9),
    shorts: std(p.shorts, 0.9),
    shoe: std(p.shoe, 0.6),
    sole: std(p.sole, 0.8),
    hair: std(p.hair, 0.95),
    muscle: std(p.muscle, 0.75),
    steel: std(p.steel, 0.35, 0.55),
    grip: std(p.iron, 0.6, 0.2),
    iron: std(p.iron, 0.55, 0.25),
    pad: std(p.pad, 0.85),
    block: std(p.block, 0.9),
    shadow: new MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }),
    ground: new MeshBasicMaterial({ map: groundTex, transparent: true, depthWrite: false }),
  }
}

function radialTexture(inner: string, outer: string, stop = 0) {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, inner)
  if (stop) grad.addColorStop(stop, inner)
  grad.addColorStop(1, outer)
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  const t = new CanvasTexture(c)
  return t
}

interface LimbMeshes {
  upper: Mesh
  cover: Mesh
  joint: Mesh
  lower: Mesh
  end: Mesh
  root: Mesh
  shoe?: Mesh
  soleMesh?: Mesh
  toeCap?: Mesh
  heelCap?: Mesh
}

class FigureModel {
  group = new Group()
  private mats: Mats
  private pelvis: Mesh
  private belly: Mesh
  private ribs: Mesh
  private yoke: Mesh
  private neck: Mesh
  private head: Mesh
  private hair: Mesh
  private nose: Mesh
  private arms: LimbMeshes[]
  private legs: LimbMeshes[]
  private hi: Record<string, Mesh[]> = {}
  private solidPool: Mesh[] = []
  private shadow: Mesh
  private ground: Mesh

  constructor(mats: Mats, highlight: Highlight | null) {
    this.mats = mats
    const mesh = (g: BufferGeometry, mat: ThreeMaterial) => {
      const m = new Mesh(g, mat)
      this.group.add(m)
      return m
    }
    const hi = highlight
    this.ground = mesh(new CircleGeometry(1, 48), mats.ground)
    this.ground.rotation.x = -Math.PI / 2
    this.ground.renderOrder = -2
    this.shadow = mesh(new CircleGeometry(1, 32), mats.shadow)
    this.shadow.rotation.x = -Math.PI / 2
    this.shadow.renderOrder = -1

    this.pelvis = mesh(SPHERE, mats.shorts)
    this.belly = mesh(SPHERE, mats.shirt)
    this.ribs = mesh(SPHERE, mats.shirt)
    this.yoke = mesh(SPHERE, mats.shirt)
    this.neck = mesh(taper(3.7, 3.4), mats.skin)
    this.head = mesh(SPHERE, mats.skin)
    this.hair = mesh(SPHERE, mats.hair)
    this.nose = mesh(SPHERE, mats.skin)

    const arm = (): LimbMeshes => ({
      root: mesh(SPHERE, hi === 'shoulders' ? mats.muscle : mats.shirt),
      upper: mesh(taper(4.4, 3.5), hi === 'upperArm' ? mats.muscle : mats.skin),
      cover: mesh(taper(5.3, 4.7), mats.shirt),
      joint: mesh(SPHERE, mats.skin),
      lower: mesh(taper(3.5, 2.6), mats.skin),
      end: mesh(SPHERE, mats.skin),
    })
    const leg = (): LimbMeshes => ({
      root: mesh(SPHERE, mats.shorts),
      upper: mesh(taper(7.1, 4.9), hi === 'thighs' ? mats.muscle : mats.skin),
      cover: mesh(taper(7.9, 7.0), mats.shorts),
      joint: mesh(SPHERE, mats.skin),
      lower: mesh(taper(4.9, 3.0), hi === 'calves' ? mats.muscle : mats.skin),
      end: mesh(SPHERE, mats.skin),
      shoe: mesh(taper(3.3, 2.9), mats.shoe),
      soleMesh: mesh(BOX, mats.sole),
      toeCap: mesh(SPHERE, mats.shoe),
      heelCap: mesh(SPHERE, mats.shoe),
    })
    this.arms = [arm(), arm()]
    this.legs = [leg(), leg()]

    const overlay = (n: number) => Array.from({ length: n }, () => mesh(SPHERE, mats.muscle))
    if (hi === 'chest') this.hi.chest = overlay(2)
    if (hi === 'back') this.hi.back = overlay(1)
    if (hi === 'core') this.hi.core = overlay(1)
    if (hi === 'glutes') this.hi.glutes = overlay(2)
    if (hi === 'calves') this.hi.calves = overlay(2)
  }

  update(b: Body3, solids: Solid[], groundY = 0) {
    // Torso
    placeEllipsoid(this.pelvis, at(b, b.hip, 1.5, -0.5), b, 9.2, 9.5, 12)
    placeEllipsoid(this.belly, at(b, b.hip, 14, -0.3), b, 7.6, 11, 11)
    placeEllipsoid(this.ribs, at(b, b.shoulder, -11, 0.6), b, 9.2, 13.5, 14)
    placeEllipsoid(this.yoke, at(b, b.shoulder, -1.5, -0.6), b, 7, 5.2, 13)
    placeTube(this.neck, at(b, b.shoulder, -2, 0), at(b, b.head, -5.5, 0.6))
    placeEllipsoid(this.head, b.head, b, 8.1, 8.8, 7.2)
    placeEllipsoid(this.hair, at(b, b.head, 1.3, -1.7), b, 7.9, 8.2, 7.5)
    placeSphere(this.nose, at(b, b.head, -0.6, 7.9), 1.4)

    const hi = this.hi
    if (hi.chest) hi.chest.forEach((m, i) => placeEllipsoid(m, at(b, b.shoulder, -8, 7.3, i ? -5.6 : 5.6), b, 3.2, 5.6, 7.4))
    if (hi.back) placeEllipsoid(hi.back[0], at(b, b.shoulder, -12, -6.4), b, 5, 11, 12)
    if (hi.core) placeEllipsoid(hi.core[0], at(b, b.hip, 14, 5.6), b, 4.4, 8.6, 6.4)
    if (hi.glutes) hi.glutes.forEach((m, i) => placeEllipsoid(m, at(b, b.hip, -0.8, -5.4, i ? -5.2 : 5.2), b, 5.4, 6.6, 5.8))

    b.arms.forEach((l, i) => {
      const m = this.arms[i]
      placeSphere(m.root, l.root, 5.5)
      placeTube(m.upper, l.root, l.mid)
      placeTube(m.cover, l.root, v.add(l.root, v.mul(v.sub(l.mid, l.root), 0.45)))
      placeSphere(m.joint, l.mid, 3.5)
      placeTube(m.lower, l.mid, l.end)
      const dir = v.norm(v.sub(l.end, l.mid))
      placeSphere(m.end, v.add(l.end, v.mul(dir, 1.2)), 3.1)
    })
    b.legs.forEach((l, i) => {
      const m = this.legs[i]
      placeSphere(m.root, l.root, 7.6)
      placeTube(m.upper, l.root, l.mid)
      placeTube(m.cover, v.add(l.root, v.mul(v.sub(l.mid, l.root), -0.05)), v.add(l.root, v.mul(v.sub(l.mid, l.root), 0.52)))
      placeSphere(m.joint, l.mid, 4.9)
      placeTube(m.lower, l.mid, l.end)
      placeSphere(m.end, l.end, 3.1)
      const toe = l.toe ?? v.add(l.end, [8, 0, 0])
      const fd = v.norm(v.sub(toe, l.end))
      const heel = v.add(l.end, v.mul(fd, -2.6))
      const tip = v.add(toe, v.mul(fd, 1.2))
      placeTube(m.shoe!, heel, tip)
      placeSphere(m.heelCap!, heel, 3.3)
      placeSphere(m.toeCap!, tip, 2.9)
      // Sole: a thin slab under the shoe, along the foot.
      const sideways = v.norm(v.cross(fd, b.up))
      const down = v.norm(v.cross(sideways, fd))
      const c = v.add(v.mid(heel, tip), v.mul(down, -2.9))
      m.soleMesh!.position.set(...c)
      tmpM.makeBasis(new Vector3(...fd), new Vector3(...v.mul(down, -1)), new Vector3(...sideways))
      m.soleMesh!.quaternion.setFromRotationMatrix(tmpM)
      m.soleMesh!.scale.set(v.len(v.sub(tip, heel)) + 5.4, 1.3, 6)
    })
    if (hi.calves) {
      b.legs.forEach((l, i) => {
        const c = v.add(l.mid, v.mul(v.sub(l.end, l.mid), 0.3))
        const back = v.mul(b.forward, -2.2)
        placeSphere(hi.calves[i], v.add(c, back), 4.6)
      })
    }

    // Equipment: reuse a pool of unit meshes.
    solids.forEach((s, i) => {
      let m = this.solidPool[i]
      if (!m) {
        m = new Mesh(BOX, this.mats.steel)
        this.group.add(m)
        this.solidPool[i] = m
      }
      m.visible = true
      m.material = this.mats[s.mat]
      if (s.t === 'rod') {
        m.geometry = cyl(s.sides ?? 14)
        placeRod(m, s.a, s.b, s.r)
      } else {
        m.geometry = BOX
        m.position.set(...s.c)
        m.quaternion.identity()
        if (s.rz) m.quaternion.setFromAxisAngle(new Vector3(0, 0, 1), s.rz)
        if (s.rx) m.quaternion.multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), s.rx))
        m.scale.set(...s.size)
      }
    })
    for (let i = solids.length; i < this.solidPool.length; i++) this.solidPool[i].visible = false

    // Soft contact shadow under the body, and a fading floor.
    const lowest = [...b.legs.map((l) => l.end), b.hip]
    const cx = lowest.reduce((n, p) => n + p[0], 0) / lowest.length
    const cz = lowest.reduce((n, p) => n + p[2], 0) / lowest.length
    this.shadow.position.set(cx, groundY + 0.15, cz)
    this.shadow.scale.set(30, 22, 1)
    this.ground.position.set(cx, groundY, cz)
    this.ground.scale.setScalar(120)
  }
}

// ---------- camera ----------
export interface Framing {
  target: V3
  dir: V3
  dist: number
}

const FOV = 24
const ASPECT = 1.25

/** Default camera direction (from the subject toward the camera) for each kind of pattern. */
export function cameraDir(pattern: Pattern, yaw = 0): V3 {
  const mode = modeOf(pattern)
  const deg = Math.PI / 180
  let d: V3
  if (mode === 'side') d = [Math.sin(34 * deg), 0.24, Math.cos(34 * deg)]
  else if (mode === 'front') d = [Math.cos(30 * deg), 0.2, Math.sin(30 * deg)]
  else d = [0.3, 1.25, 0.72]
  if (yaw) {
    const c = Math.cos(yaw)
    const s = Math.sin(yaw)
    d = [d[0] * c + d[2] * s, d[1], -d[0] * s + d[2] * c]
  }
  return v.norm(d)
}

export function fitCamera(points: V3[], dir: V3): Framing {
  const tanV = Math.tan((FOV * Math.PI) / 360)
  const tanH = tanV * ASPECT
  const right = v.norm(v.cross([0, 1, 0], dir))
  const upc = v.cross(dir, right)
  let target: V3 = v.mul(
    points.reduce((s, p) => v.add(s, p), [0, 0, 0] as V3),
    1 / points.length,
  )
  let dist = 100
  for (let iter = 0; iter < 3; iter++) {
    dist = 0
    for (const p of points) {
      const r = v.sub(p, target)
      const x = v.dot(r, right)
      const y = v.dot(r, upc)
      const z = v.dot(r, dir)
      dist = Math.max(dist, z + Math.abs(x) / tanH, z + Math.abs(y) / tanV)
    }
    dist *= 1.08
    // Re-centre on the projected extents.
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    for (const p of points) {
      const r = v.sub(p, target)
      const depth = dist - v.dot(r, dir)
      const x = v.dot(r, right) / depth
      const y = v.dot(r, upc) / depth
      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x)
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y)
    }
    target = v.add(target, v.add(v.mul(right, ((minX + maxX) / 2) * dist), v.mul(upc, ((minY + maxY) / 2) * dist)))
  }
  return { target, dir, dist: dist * 1.04 }
}

// ---------- renderer ----------
let renderer: WebGLRenderer | null = null
let glFailed = false

export function webglAvailable(): boolean {
  if (glFailed) return false
  try {
    getRenderer()
    return true
  } catch {
    glFailed = true
    return false
  }
}

function getRenderer(): WebGLRenderer {
  if (renderer) return renderer
  const r = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' })
  r.setPixelRatio(1)
  r.setClearColor(0x000000, 0)
  r.setSize(2, 2, false)
  renderer = r
  return r
}

function ensureSize(w: number, h: number) {
  const r = getRenderer()
  const c = r.domElement
  if (c.width < w || c.height < h) r.setSize(Math.max(c.width, w), Math.max(c.height, h), false)
}

/** Render into the bottom-left w×h of the shared canvas; returns the source rect for drawImage. */
function draw(scene: Scene, camera: PerspectiveCamera, w: number, h: number) {
  ensureSize(w, h)
  const r = getRenderer()
  const ch = r.domElement.height
  r.setViewport(0, 0, w, h)
  r.setScissor(0, 0, w, h)
  r.setScissorTest(true)
  r.clear()
  r.render(scene, camera)
  return { sx: 0, sy: ch - h, sw: w, sh: h }
}

let mats: Mats | null = null
let matsDark: boolean | null = null
function getMats() {
  const dark = isDark()
  if (!mats || matsDark !== dark) {
    mats = makeMats(palette())
    matsDark = dark
  }
  return mats
}

function makeScene() {
  const scene = new Scene()
  const hemi = new HemisphereLight(0xffffff, 0x7d858c, 2.1)
  const key = new DirectionalLight(0xffffff, 2.3)
  key.position.set(60, 140, 110)
  const rim = new DirectionalLight(0xffffff, 0.8)
  rim.position.set(-90, 60, -80)
  scene.add(hemi, key, rim)
  return scene
}

/** A figure for one exercise: call `frame(k)` then `drawTo(ctx)` per animation frame. */
const pointCache = new WeakMap<Pattern, Partial<Record<LoadKind, V3[]>>>()
function pointsFor(pattern: Pattern, load: LoadKind): V3[] {
  let m = pointCache.get(pattern)
  if (!m) pointCache.set(pattern, (m = {}))
  return (m[load] ??= framePoints(pattern, load))
}
const framingCache = new WeakMap<Pattern, Map<string, Framing>>()
function framingFor(pattern: Pattern, load: LoadKind, yaw: number): Framing {
  let m = framingCache.get(pattern)
  if (!m) framingCache.set(pattern, (m = new Map()))
  const key = `${load}|${yaw.toFixed(3)}`
  let f = m.get(key)
  if (!f) {
    f = fitCamera(pointsFor(pattern, load), cameraDir(pattern, yaw))
    if (m.size > 40) m.clear()
    m.set(key, f)
  }
  return f
}

/** A figure for one exercise: call `frame(k)` then `drawTo(ctx)` per animation frame. */
export class FigureView {
  private scene = makeScene()
  private camera = new PerspectiveCamera(FOV, ASPECT, 1, 2000)
  private model: FigureModel
  private yaw = 0
  private framing: Framing
  private pattern: Pattern
  private load: LoadKind

  constructor(pattern: Pattern, load: LoadKind, highlight: Highlight | null) {
    this.pattern = pattern
    this.load = load
    this.model = new FigureModel(getMats(), highlight)
    this.scene.add(this.model.group)
    this.framing = framingFor(pattern, load, 0)
    this.applyCamera()
  }

  /** Reuse this view (and its meshes) for another exercise with the same highlight. */
  setPattern(pattern: Pattern, load: LoadKind) {
    if (pattern === this.pattern && load === this.load) return
    this.pattern = pattern
    this.load = load
    this.framing = framingFor(pattern, load, this.yaw)
    this.applyCamera()
  }

  setYaw(yaw: number) {
    if (yaw === this.yaw) return
    this.yaw = yaw
    this.framing = framingFor(this.pattern, this.load, yaw)
    this.applyCamera()
  }

  private applyCamera() {
    const { target, dir, dist } = this.framing
    this.camera.position.set(...v.add(target, v.mul(dir, dist)))
    this.camera.up.set(0, 1, 0)
    this.camera.lookAt(...target)
    this.camera.updateProjectionMatrix()
  }

  frame(k: number) {
    const s = scene3(this.pattern, this.load, k)
    this.model.update(s.body, s.solids)
  }

  drawTo(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const src = draw(this.scene, this.camera, w, h)
    ctx.clearRect(0, 0, w, h)
    ctx.drawImage(getRenderer().domElement, src.sx, src.sy, src.sw, src.sh, 0, 0, w, h)
  }

}

// ---------- still cache ----------
const MAX_STILLS = 160
const stills = new Map<string, HTMLCanvasElement>()
const stillViews = new Map<string, FigureView>()

/** A rendered still, cached: draw it with drawImage. */
export function still(key: string, pattern: Pattern, load: LoadKind, hi: Highlight | null, k: number, w: number, h: number): HTMLCanvasElement {
  const theme = isDark() ? 'd' : 'l'
  const full = `${key}|${k}|${w}x${h}|${theme}|${hi ?? '-'}`
  const hit = stills.get(full)
  if (hit) {
    // Most recently used goes to the back.
    stills.delete(full)
    stills.set(full, hit)
    return hit
  }
  const vk = `${hi ?? '-'}|${theme}`
  let view = stillViews.get(vk)
  if (!view) {
    view = new FigureView(pattern, load, hi)
    stillViews.set(vk, view)
  }
  view.setPattern(pattern, load)
  view.frame(k)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  view.drawTo(c.getContext('2d')!, w, h)
  stills.set(full, c)
  if (stills.size > MAX_STILLS) stills.delete(stills.keys().next().value!)
  return c
}

/** Forget cached images (theme change). */
export function resetCache() {
  stills.clear()
  stillViews.clear()
  mats = null
}
