/**
 * Draws the 3D scene from pose3d as flat, outlined SVG shapes seen from a three-quarter angle.
 *
 * Orthographic camera; every body part and piece of equipment becomes a group of 2D paths, and
 * groups are painted back to front. Pure: returns path data and class names, no React.
 */
import type { LoadKind, Pattern } from './patterns'
import { framePoints, modeOf, scene3, v, type Body3, type Material, type Solid, type V3 } from './pose3d'
import type { Pt } from './rig'

export type Highlight = 'chest' | 'back' | 'shoulders' | 'upperArm' | 'thighs' | 'calves' | 'glutes' | 'core'

export interface Prim {
  d: string
  cls?: string
}

export interface Group {
  key: string
  /** Larger is closer to the camera. */
  depth: number
  /** body: clothed figure part; far: a limb on the far side; solid / thin: equipment; flat: no outline. */
  kind: 'body' | 'far' | 'solid' | 'thin' | 'flat'
  prims: Prim[]
}

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

// ---------- camera ----------
export interface Camera {
  /** Unit vector from the scene toward the camera. */
  d: V3
  right: V3
  up: V3
}

const DEG = Math.PI / 180

export function cameraFor(pattern: Pattern): Camera {
  const mode = modeOf(pattern)
  // Side-view moves turn the figure 40° toward the viewer; front views turn it 35° away.
  let d: V3
  if (mode === 'side') d = [Math.sin(40 * DEG), 0.22, Math.cos(40 * DEG)]
  else if (mode === 'front') d = [Math.cos(35 * DEG), 0.2, Math.sin(35 * DEG)]
  else d = [0.3, 1.25, 0.72]
  d = v.norm(d)
  const right = v.norm(v.cross([0, 1, 0], d))
  const up = v.cross(d, right)
  return { d, right, up }
}

const proj = (cam: Camera, p: V3): Pt => [v.dot(p, cam.right), -v.dot(p, cam.up)]
const projVec = proj
const depthOf = (cam: Camera, p: V3) => v.dot(p, cam.d)

// ---------- 2D path helpers ----------
const f = (n: number) => n.toFixed(2)
const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]]
const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]]
const mul = (a: Pt, s: number): Pt => [a[0] * s, a[1] * s]
const unit = (p: Pt): Pt => {
  const l = Math.hypot(p[0], p[1]) || 1
  return [p[0] / l, p[1] / l]
}
const perp = (p: Pt): Pt => [-p[1], p[0]]

function capsulePath(a: Pt, b: Pt, ra: number, rb: number): string {
  const u = unit(sub(b, a))
  const n: Pt = [-u[1], u[0]]
  const a1 = add(a, mul(n, ra))
  const b1 = add(b, mul(n, rb))
  const b2 = add(b, mul(n, -rb))
  const a2 = add(a, mul(n, -ra))
  return `M${f(a1[0])} ${f(a1[1])}L${f(b1[0])} ${f(b1[1])}A${f(rb)} ${f(rb)} 0 0 0 ${f(b2[0])} ${f(b2[1])}L${f(a2[0])} ${f(a2[1])}A${f(ra)} ${f(ra)} 0 0 0 ${f(a1[0])} ${f(a1[1])}Z`
}

function ellipsePath(c: Pt, rx: number, ry: number, angle: number): string {
  rx = Math.max(rx, 0.05)
  ry = Math.max(ry, 0.05)
  const ca = Math.cos(angle)
  const sa = Math.sin(angle)
  const p1: Pt = [c[0] + rx * ca, c[1] + rx * sa]
  const p2: Pt = [c[0] - rx * ca, c[1] - rx * sa]
  const deg = f(angle / DEG)
  return `M${f(p1[0])} ${f(p1[1])}A${f(rx)} ${f(ry)} ${deg} 1 0 ${f(p2[0])} ${f(p2[1])}A${f(rx)} ${f(ry)} ${deg} 1 0 ${f(p1[0])} ${f(p1[1])}Z`
}

const linePath = (a: Pt, b: Pt) => `M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}`
const polyPath = (pts: Pt[]) => `M${pts.map((p) => `${f(p[0])} ${f(p[1])}`).join('L')}Z`

/** 2x2 shape matrix of the screen ellipse traced by c + Σ axes_i·u_i (|u| = 1). */
function shapeOf(cam: Camera, axes: V3[]): [number, number, number] {
  let a = 0
  let b = 0
  let c = 0
  for (const ax of axes) {
    const p = projVec(cam, ax)
    a += p[0] * p[0]
    b += p[0] * p[1]
    c += p[1] * p[1]
  }
  return [a, b, c]
}

function ellipseFromShape(center: Pt, [a, b, c]: [number, number, number]): string {
  const m = (a + c) / 2
  const r = Math.sqrt(((a - c) / 2) ** 2 + b * b)
  const angle = 0.5 * Math.atan2(2 * b, a - c)
  return ellipsePath(center, Math.sqrt(Math.max(m + r, 0)), Math.sqrt(Math.max(m - r, 0)), angle)
}

/** The screen outline of an ellipsoid with the given (scaled) axes. */
function ellipsoid(cam: Camera, c: V3, axes: V3[]): string {
  return ellipseFromShape(proj(cam, c), shapeOf(cam, axes))
}

/** Unit vectors perpendicular to w. */
function basisAround(w: V3): [V3, V3] {
  const helper: V3 = Math.abs(w[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]
  const u1 = v.norm(v.cross(w, helper))
  return [u1, v.cross(w, u1)]
}

// ---------- equipment ----------
const MAT: Record<Material, string> = { steel: 'm-steel', iron: 'm-iron', pad: 'm-pad', block: 'm-block', grip: 'm-pad' }

function rodPrims(cam: Camera, s: Extract<Solid, { t: 'rod' }>): Prim[] {
  const w = v.sub(s.b, s.a)
  if (v.len(w) < 1e-6) return []
  const wn = v.norm(w)
  const [u1, u2] = basisAround(wn)
  const shape = shapeOf(cam, [v.mul(u1, s.r), v.mul(u2, s.r)])
  const a = proj(cam, s.a)
  const b = proj(cam, s.b)
  const cls = MAT[s.mat]
  const out: Prim[] = []
  const t = sub(b, a)
  const tl = Math.hypot(t[0], t[1])
  // The cap facing the camera is drawn last, with a rim line on wide discs (plates, pulleys).
  const nearB = v.dot(wn, cam.d) > 0
  const [far, near] = nearB ? [a, b] : [b, a]
  out.push({ d: ellipseFromShape(far, shape), cls })
  if (tl > 1e-3) {
    const n: Pt = [-t[1] / tl, t[0] / tl]
    const en: Pt = [shape[0] * n[0] + shape[1] * n[1], shape[1] * n[0] + shape[2] * n[1]]
    const k = Math.sqrt(Math.max(n[0] * en[0] + n[1] * en[1], 1e-9))
    const off: Pt = [en[0] / k, en[1] / k]
    out.push({ d: polyPath([add(a, off), add(b, off), sub(b, off), sub(a, off)]), cls })
  }
  out.push({ d: ellipseFromShape(near, shape), cls: s.r > 3 ? `${cls} face` : cls })
  if (s.r > 6) {
    // A raised hub on plates and pulleys.
    out.push({ d: ellipseFromShape(near, shapeOf(cam, [v.mul(u1, s.r * 0.32), v.mul(u2, s.r * 0.32)])), cls: `${cls} hub` })
  }
  return out
}

function boxPrims(cam: Camera, s: Extract<Solid, { t: 'box' }>): Prim[] {
  const rz = s.rz ?? 0
  const rx = s.rx ?? 0
  const rot = (p: V3): V3 => {
    const x = p[0] * Math.cos(rz) - p[1] * Math.sin(rz)
    const y = p[0] * Math.sin(rz) + p[1] * Math.cos(rz)
    return [x, y * Math.cos(rx) - p[2] * Math.sin(rx), y * Math.sin(rx) + p[2] * Math.cos(rx)]
  }
  const axes: V3[] = [rot([1, 0, 0]), rot([0, 1, 0]), rot([0, 0, 1])]
  const half = s.size.map((x) => x / 2)
  const out: Prim[] = []
  for (let i = 0; i < 3; i++) {
    for (const sign of [-1, 1]) {
      const n = v.mul(axes[i], sign)
      if (v.dot(n, cam.d) <= 1e-3) continue
      const j = (i + 1) % 3
      const k = (i + 2) % 3
      const c = v.add(s.c, v.mul(n, half[i]))
      const corner = (sj: number, sk: number) => proj(cam, v.add(v.add(c, v.mul(axes[j], sj * half[j])), v.mul(axes[k], sk * half[k])))
      const shade = n[1] > 0.6 ? ' top' : v.dot(n, [0.6, 0, -0.8]) > 0.2 ? ' dark' : ''
      out.push({ d: polyPath([corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)]), cls: `${MAT[s.mat]} face${shade}` })
    }
  }
  return out
}

function solidCorners(s: Solid): V3[] {
  if (s.t === 'rod') return [s.a, s.b]
  const h = v.mul(s.size, 0.5)
  const pts: V3[] = []
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) pts.push(v.add(s.c, [x * h[0], y * h[1], z * h[2]]))
  return pts
}

function solidGroup(cam: Camera, s: Solid, i: number): Group {
  const pts = solidCorners(s)
  const depths = pts.map((p) => depthOf(cam, p))
  // Supports sit behind whatever rests on them; loose kit sorts by its middle.
  const depth = s.support ? Math.min(...depths) - 2 : depths.reduce((a, b) => a + b, 0) / depths.length
  const prims = s.t === 'rod' ? rodPrims(cam, s) : boxPrims(cam, s)
  return { key: `s${i}`, depth, kind: s.t === 'rod' && s.r < 1.5 ? 'thin' : 'solid', prims }
}

// ---------- body ----------
/** A point offset from p along the torso axes: up the spine, out of the chest, toward the near side. */
const at = (b: Body3, p: V3, up: number, fwd: number, lat = 0): V3 => v.add(v.add(v.add(p, v.mul(b.up, up)), v.mul(b.forward, fwd)), v.mul(b.lateral, lat))
const axesOf = (b: Body3, fwd: number, up: number, lat: number): V3[] => [v.mul(b.forward, fwd), v.mul(b.up, up), v.mul(b.lateral, lat)]
const lerp3 = (a: V3, b: V3, k: number): V3 => v.add(a, v.mul(v.sub(b, a), k))

/** An ellipsoid stretched along a limb segment. */
function along(cam: Camera, a: V3, b: V3, k: number, halfLen: number, r: number): string {
  const w = v.norm(v.sub(b, a))
  const [u1, u2] = basisAround(w)
  return ellipsoid(cam, lerp3(a, b, k), [v.mul(w, halfLen), v.mul(u1, r), v.mul(u2, r)])
}

function torsoGroup(cam: Camera, b: Body3, hi: Highlight | null): Group {
  const P = (p: V3) => proj(cam, p)
  const facing = v.dot(b.forward, cam.d)
  // Which side of the body the camera sees: +1 the near (lateral) side, -1 the other.
  const side = v.dot(b.lateral, cam.d) >= 0 ? 1 : -1
  const head = b.head
  const hair = { d: ellipsoid(cam, at(b, head, 2.2, -2.6), axesOf(b, 8.2, 8.4, 7.9)), cls: 'p-hair' }
  const face = { d: ellipsoid(cam, head, axesOf(b, 8.1, 8.8, 7.2)), cls: 'p-skin' }
  const prims: Prim[] = [
    { d: ellipsoid(cam, at(b, b.hip, 1.5, -0.5), axesOf(b, 8.8, 9.5, 11)), cls: 'p-shorts' },
    { d: ellipsoid(cam, at(b, b.hip, 13, -0.3), axesOf(b, 6.9, 10.5, 9.6)), cls: 'p-shirt hem' },
    { d: ellipsoid(cam, at(b, b.shoulder, -11, 0.6), axesOf(b, 9.2, 13.5, 14)), cls: 'p-shirt' },
    { d: capsulePath(P(at(b, b.shoulder, -2, 0)), P(at(b, head, -5.5, 0.6)), 3.4, 3.2), cls: 'p-skin' },
    { d: ellipsoid(cam, at(b, b.shoulder, -1.5, -0.6), axesOf(b, 7, 5.2, 13)), cls: 'p-shirt' },
    // Seen from in front the face sits over the hair; from behind the hair covers the head.
    ...(facing > -0.15 ? [hair, face] : [face, hair]),
  ]
  if (facing > 0.05) prims.push({ d: ellipsoid(cam, at(b, head, -0.8, 7.9), axesOf(b, 1.4, 1.5, 1.3)), cls: 'p-skin' })

  if (hi === 'chest') for (const s of [-1, 1]) prims.push({ d: ellipsoid(cam, at(b, b.shoulder, -8, 6.4, s * 5.4), axesOf(b, 2.6, 5.4, 5.2)), cls: 'fig-muscle' })
  if (hi === 'back') prims.push({ d: ellipsoid(cam, at(b, b.shoulder, -12.5, -3.2, side * 8.6), axesOf(b, 5, 9.5, 4.2)), cls: 'fig-muscle' })
  if (hi === 'core') prims.push({ d: ellipsoid(cam, at(b, b.hip, 13.5, 4.6), axesOf(b, 3, 8.4, 6)), cls: 'fig-muscle' })
  if (hi === 'glutes') prims.push({ d: ellipsoid(cam, at(b, b.hip, -0.5, -4.6, side * 5.2), axesOf(b, 4.6, 6, 5)), cls: 'fig-muscle' })
  return { key: 'torso', depth: depthOf(cam, v.mid(b.hip, b.shoulder)), kind: 'body', prims }
}

function armGroup(cam: Camera, b: Body3, i: 0 | 1, hi: Highlight | null): Group {
  const l = b.arms[i]
  const P = (p: V3) => proj(cam, p)
  const [root, mid, end] = [P(l.root), P(l.mid), P(l.end)]
  const sleeveEnd = lerp3(l.root, l.mid, 0.46)
  const upper: Prim[] = [
    { d: capsulePath(root, mid, 4.4, 3.6), cls: 'p-skin' },
    { d: capsulePath(root, root, 5.9, 5.9), cls: 'p-shirt' },
    { d: capsulePath(root, P(sleeveEnd), 5.9, 5.1), cls: 'p-shirt hem' },
  ]
  if (hi === 'upperArm') upper.push({ d: along(cam, l.root, l.mid, 0.74, 5, 3), cls: 'fig-muscle' })
  if (hi === 'shoulders') upper.push({ d: capsulePath(root, root, 4.6, 4.6), cls: 'fig-muscle' })
  const fn = perp(unit(sub(end, mid)))
  const lower: Prim[] = [
    { d: capsulePath(mid, end, 3.6, 2.6), cls: 'p-skin' },
    { d: capsulePath(end, end, 3.1, 3.1), cls: 'p-skin' },
    { d: linePath(add(lerp2(mid, end, 0.18), mul(fn, 1.3)), add(lerp2(mid, end, 0.55), mul(fn, 0.7))), cls: 'fig-line' },
  ]
  // A forearm swinging toward the camera covers the upper arm, and the other way round.
  const lowerFirst = depthOf(cam, v.mid(l.mid, l.end)) < depthOf(cam, v.mid(l.root, l.mid))
  const prims = lowerFirst ? [...lower, ...upper] : [...upper, ...lower]
  return { key: `arm${i}`, depth: limbDepth(cam, l.root, l.mid, l.end), kind: i ? 'far' : 'body', prims }
}

function legGroup(cam: Camera, b: Body3, i: 0 | 1, hi: Highlight | null): Group {
  const l = b.legs[i]
  const P = (p: V3) => proj(cam, p)
  const [root, mid, end] = [P(l.root), P(l.mid), P(l.end)]
  const toe3 = l.toe ?? v.add(l.end, [8, 0, 0])
  const fd = v.norm(v.sub(toe3, l.end))
  const heel = P(v.add(l.end, v.mul(fd, -2.6)))
  const tip = P(v.add(toe3, v.mul(fd, 1.2)))
  const thigh: Prim[] = [
    { d: capsulePath(root, mid, 7.1, 4.7), cls: 'p-skin' },
    { d: capsulePath(P(lerp3(l.root, l.mid, -0.06)), P(lerp3(l.root, l.mid, 0.56)), 8.3, 7.2), cls: 'p-shorts hem' },
  ]
  if (hi === 'thighs') thigh.push({ d: along(cam, l.root, l.mid, 0.62, 11, 4), cls: 'fig-muscle' })
  // The calf sits on the side of the shin away from the toes.
  const shinDir = v.norm(v.sub(l.end, l.mid))
  const back3 = v.norm(v.sub(v.mul(shinDir, v.dot(fd, shinDir)), fd))
  const sn = perp(unit(sub(end, mid)))
  const toeSide = sub(tip, end)
  const back2 = sn[0] * toeSide[0] + sn[1] * toeSide[1] > 0 ? mul(sn, -1) : sn
  const shin: Prim[] = [
    { d: capsulePath(mid, end, 4.8, 2.9), cls: 'p-skin' },
    { d: linePath(add(lerp2(mid, end, 0.14), mul(back2, 2.6)), add(lerp2(mid, end, 0.55), mul(back2, 1.3))), cls: 'fig-line' },
  ]
  if (hi === 'calves') shin.push({ d: ellipsoid(cam, v.add(lerp3(l.mid, l.end, 0.34), v.mul(back3, 1.6)), [v.mul(shinDir, 6.5), ...basisAround(shinDir).map((u) => v.mul(u, 3.1))]), cls: 'fig-muscle' })
  const shoe: Prim = { d: capsulePath(heel, tip, 3.3, 2.3), cls: 'p-shoe' }
  const shinFirst = depthOf(cam, v.mid(l.mid, l.end)) < depthOf(cam, v.mid(l.root, l.mid))
  const prims = shinFirst ? [shoe, ...shin, ...thigh] : [...thigh, ...shin, shoe]
  return { key: `leg${i}`, depth: limbDepth(cam, l.root, l.mid, l.end), kind: i ? 'far' : 'body', prims }
}

const lerp2 = (a: Pt, b: Pt, k: number): Pt => add(a, mul(sub(b, a), k))
const limbDepth = (cam: Camera, a: V3, b: V3, c: V3) => (depthOf(cam, a) + depthOf(cam, b) + depthOf(cam, c)) / 3

// ---------- scene ----------
export function drawScene(pattern: Pattern, load: LoadKind, k: number, hi: Highlight | null, cam = cameraFor(pattern)): Group[] {
  const { body, solids } = scene3(pattern, load, k)
  const groups: Group[] = [
    torsoGroup(cam, body, hi),
    armGroup(cam, body, 0, hi),
    armGroup(cam, body, 1, hi),
    legGroup(cam, body, 0, hi),
    legGroup(cam, body, 1, hi),
    ...solids.map((s, i) => solidGroup(cam, s, i)),
  ]
  groups.sort((a, b) => a.depth - b.depth)
  if (!pattern.overhead) {
    const feet = v.mid(body.legs[0].end, body.legs[1].end)
    const c: V3 = [(feet[0] + body.hip[0]) / 2, 0, (feet[2] + body.hip[2]) / 2]
    groups.unshift({ key: 'shadow', depth: -Infinity, kind: 'flat', prims: [{ d: ellipsoid(cam, c, [[24, 0, 0], [0, 0, 15], [0, 0.01, 0]]), cls: 'fig-shadow' }] })
  }
  return groups
}

/** The 5:4 frame that keeps the whole rep in view. */
export function frameFor(pattern: Pattern, load: LoadKind, cam = cameraFor(pattern)): Box {
  const pts = framePoints(pattern, load).map((p) => proj(cam, p))
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const pad = 6
  let x = Math.min(...xs) - pad
  let w = Math.max(...xs) + pad - x
  let y = Math.min(...ys) - pad
  let h = Math.max(...ys) + pad - y
  const ratio = 1.25
  if (w / h < ratio) {
    const nw = h * ratio
    x -= (nw - w) / 2
    w = nw
  } else {
    const nh = w / ratio
    y -= (nh - h) / 2
    h = nh
  }
  return { x, y, w, h }
}
