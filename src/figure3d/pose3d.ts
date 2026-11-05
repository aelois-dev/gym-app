/**
 * Lifts the 2D mannequin rig into 3D. Pure geometry, no three.js, so it can be unit tested.
 *
 * World frame (rig units): x = the figure's forward, y = up (floor at 0), z = lateral.
 * Side-view patterns keep their x/y and gain a lateral offset per side; front-view patterns map
 * screen x to lateral and their "toward the viewer" depth to forward; bird's-eye patterns lie the
 * figure on its back, so screen up runs along the bench and depth points at the ceiling.
 */
import { FLOOR, type LoadKind, type Pattern, type Prop } from '../figure/patterns'
import { LEN, lerpPose, pointOf, solve, type AttachRef, type Limb, type Pose, type Pt } from '../figure/rig'

export type V3 = [number, number, number]

export interface Limb3 {
  root: V3
  mid: V3
  end: V3
  toe?: V3
}

export interface Body3 {
  hip: V3
  /** Centre between the shoulders. */
  shoulder: V3
  neck: V3
  head: V3
  /** Unit axes of the torso: up the spine, out of the chest, and toward the near side. */
  up: V3
  forward: V3
  lateral: V3
  /** Near side first. */
  arms: [Limb3, Limb3]
  legs: [Limb3, Limb3]
}

export type Material = 'steel' | 'iron' | 'pad' | 'block' | 'grip'

/** Simple solids for equipment. `rod`/`disc` run from a to b; `box` is centred with sizes along its axes. */
export type Solid =
  | { t: 'rod'; a: V3; b: V3; r: number; mat: Material; sides?: number }
  | { t: 'box'; c: V3; size: V3; mat: Material; /** Rotation about z (radians), for pads in the side plane. */ rz?: number; /** Rotation about x. */ rx?: number }

export interface Scene3 {
  body: Body3
  solids: Solid[]
}

// ---------- vector helpers ----------
export const v = {
  add: (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: (a: V3) => Math.hypot(a[0], a[1], a[2]),
  norm: (a: V3): V3 => {
    const l = Math.hypot(a[0], a[1], a[2]) || 1
    return [a[0] / l, a[1] / l, a[2] / l]
  },
  mid: (a: V3, b: V3): V3 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2],
}

const SHOULDER_HALF = 10
const HIP_HALF = 7.5
/** Height of the spine line above the floor when lying on a bench seen from above. */
const BENCH_SPINE = 47
const SIDE_DEPTH: Pt = [-3, -2]

type Mode = 'side' | 'front' | 'overhead'

/**
 * Hanging and dipping moves are drawn with their bars low in 2D, which in 3D reads as kneeling.
 * Raise the figure and the bars so the feet clear the floor.
 */
function liftOf(p: Pattern): number {
  const props = p.props ?? []
  // Upright hangs only: an inverted row also uses a bar, but its heels stay on the floor.
  const hanging = props.some((x) => x.kind === 'bar') && Math.abs(p.a.t) < 45
  if (props.some((x) => x.kind === 'dipBars')) return 50
  return hanging ? 34 : 0
}
const modeOf = (p: Pattern): Mode => (p.view === 'front' ? (p.overhead ? 'overhead' : 'front') : 'side')

/** Map a 2D rig point plus a depth (toward the 2D viewer) into the world. */
function mapper(mode: Mode, cx: number, cy: number, lift = 0) {
  return (p: Pt, depth = 0): V3 => {
    if (mode === 'side') return [p[0], FLOOR - p[1] + lift, depth]
    if (mode === 'front') return [depth, FLOOR - p[1] + lift, p[0] - cx]
    return [cy - p[1], BENCH_SPINE + depth, -(p[0] - cx)]
  }
}

function solveBody(pose: Pose, pattern: Pattern): Body3 {
  const mode = modeOf(pattern)
  const view = pattern.view ?? 'side'
  const sk = solve(pose, view)
  const cx = pattern.a.hip[0]
  const cy = pattern.a.hip[1]
  const P = mapper(mode, cx, cy, liftOf(pattern))
  const side = mode === 'side'

  // Torso tipped toward the 2D viewer (front view): shoulders come forward.
  const pitch = !side && pose.pitch ? (pose.pitch * Math.PI) / 180 : 0
  const shoulderDepth = LEN.torso * Math.sin(pitch)

  const hip = P(sk.hip)
  const shoulder = P(sk.shoulder, shoulderDepth)

  const limb = (l: Limb, kind: 'arm' | 'leg', far: boolean): Limb3 => {
    const undo = (p: Pt): Pt => (side && far ? [p[0] - SIDE_DEPTH[0], p[1] - SIDE_DEPTH[1]] : p)
    if (side) {
      const half = kind === 'arm' ? SHOULDER_HALF : HIP_HALF
      const s = far ? -1 : 1
      // 3D limb depth points toward the viewer for the near side; the far side mirrors it outward.
      const z0 = s * half
      const zm = z0 + s * (l.zMid ?? 0)
      const ze = z0 + s * (l.zEnd ?? 0)
      return { root: P(undo(l.root), z0), mid: P(undo(l.mid), zm), end: P(undo(l.end), ze), toe: l.toe ? P(undo(l.toe), ze) : undefined }
    }
    const d0 = kind === 'arm' ? shoulderDepth : 0
    const end = P(l.end, d0 + (l.zEnd ?? 0))
    // Feet point forward in front view; the 2D toe is only a stub.
    const toe = mode === 'front' ? v.add(end, [8.5, -1.5, 0]) : l.toe ? P(l.toe, d0 + (l.zEnd ?? 0)) : undefined
    return { root: P(l.root, d0), mid: P(l.mid, d0 + (l.zMid ?? 0)), end, toe }
  }

  const arms: [Limb3, Limb3] = [limb(sk.arm, 'arm', false), limb(sk.arm2, 'arm', true)]
  const legs: [Limb3, Limb3] = [limb(sk.leg, 'leg', false), limb(sk.leg2, 'leg', true)]

  const shoulderC = side ? shoulder : v.mid(arms[0].root, arms[1].root)
  const up = v.norm(v.sub(shoulderC, hip))
  let lateral = v.norm(v.sub(arms[0].root, arms[1].root))
  const forward = v.norm(v.cross(up, lateral))
  lateral = v.norm(v.cross(forward, up))
  const neck = v.add(shoulderC, v.mul(up, 5))
  const head = v.add(shoulderC, v.mul(up, 13.5))
  return { hip, shoulder: shoulderC, neck, head, up, forward, lateral, arms, legs }
}

// ---------- equipment ----------

function propSolids(prop: Prop, mode: Mode, P: (p: Pt, d?: number) => V3, handX: number, lift: number): Solid[] {
  const top = (y: number) => FLOOR - y + lift
  if (mode === 'overhead') {
    if (prop.kind !== 'rect') return []
    // A bench seen from above: rects are its frame and pad.
    const a = P([prop.x, prop.y])
    const b = P([prop.x + prop.w, prop.y + prop.h])
    const c: V3 = [(a[0] + b[0]) / 2, 0, (a[2] + b[2]) / 2]
    const sx = Math.abs(a[0] - b[0])
    const sz = Math.abs(a[2] - b[2])
    const padTop = BENCH_SPINE - 7
    if (prop.tone === 'steel') {
      return [
        { t: 'box', c: [c[0], padTop - 9, c[2]], size: [sx, 3, sz * 0.6], mat: 'steel' },
        { t: 'rod', a: [c[0] + sx * 0.38, 0, c[2]], b: [c[0] + sx * 0.38, padTop - 9, c[2]], r: 1.8, mat: 'steel' },
        { t: 'rod', a: [c[0] - sx * 0.38, 0, c[2]], b: [c[0] - sx * 0.38, padTop - 9, c[2]], r: 1.8, mat: 'steel' },
      ]
    }
    return [{ t: 'box', c: [c[0], padTop - 3.5, c[2]], size: [sx, 7, sz], mat: 'pad' }]
  }

  if (mode === 'front') {
    if (prop.kind === 'rect') {
      const y0 = top(prop.y + prop.h)
      const y1 = top(prop.y)
      const zc = P([prop.x + prop.w / 2, 0])[2]
      const depth: [number, number] = prop.tone === 'pad' ? [-13, 15] : prop.tone === 'block' ? [-18, -9] : [-3, 3]
      return [{ t: 'box', c: [(depth[0] + depth[1]) / 2, (y0 + y1) / 2, zc], size: [depth[1] - depth[0], y1 - y0, prop.w], mat: prop.tone === 'steel' ? 'steel' : prop.tone === 'pad' ? 'pad' : 'block' }]
    }
    if (prop.kind === 'bar') {
      const a = P([prop.x1 - 4, prop.y])
      const b = P([prop.x2 + 4, prop.y])
      return [
        { t: 'rod', a, b, r: 1.6, mat: 'steel' },
        { t: 'rod', a: [0, 0, a[2]], b: [0, a[1], a[2]], r: 1.8, mat: 'steel' },
        { t: 'rod', a: [0, 0, b[2]], b: [0, b[1], b[2]], r: 1.8, mat: 'steel' },
      ]
    }
    return []
  }

  // Side view
  switch (prop.kind) {
    case 'bench': {
      const y = top(prop.y) + 1
      const cxp = prop.x + prop.w / 2
      return [
        { t: 'box', c: [cxp, y - 3.5, 0], size: [prop.w, 7, 22], mat: 'pad' },
        { t: 'rod', a: [prop.x + 8, 0, 0], b: [prop.x + 8, y - 7, 0], r: 1.8, mat: 'steel' },
        { t: 'rod', a: [prop.x + prop.w - 8, 0, 0], b: [prop.x + prop.w - 8, y - 7, 0], r: 1.8, mat: 'steel' },
        { t: 'box', c: [prop.x + 8, 1, 0], size: [3, 2, 20], mat: 'steel' },
        { t: 'box', c: [prop.x + prop.w - 8, 1, 0], size: [3, 2, 20], mat: 'steel' },
      ]
    }
    case 'box': {
      const h = top(prop.y)
      return [{ t: 'box', c: [prop.x + prop.w / 2, h / 2, 0], size: [prop.w, h, 34], mat: 'block' }]
    }
    case 'bar': {
      // A pull-up rack: uprights either side, and the bar across where the hands are.
      const y = top(prop.y)
      const zs = 30
      const out: Solid[] = [{ t: 'rod', a: [handX, y, -zs - 3], b: [handX, y, zs + 3], r: 1.5, mat: 'steel' }]
      for (const z of [-zs, zs]) {
        out.push({ t: 'rod', a: [prop.x1, 0, z], b: [prop.x1, y + 2, z], r: 1.9, mat: 'steel' })
        out.push({ t: 'rod', a: [prop.x2, 0, z], b: [prop.x2, y + 2, z], r: 1.9, mat: 'steel' })
        out.push({ t: 'rod', a: [prop.x1, y + 2, z], b: [prop.x2, y + 2, z], r: 1.9, mat: 'steel' })
      }
      return out
    }
    case 'dipBars': {
      const y = top(prop.y)
      const out: Solid[] = []
      for (const z of [-15, 15]) {
        out.push({ t: 'rod', a: [prop.x1, y, z], b: [prop.x2, y, z], r: 2, mat: 'grip' })
        out.push({ t: 'rod', a: [prop.x2 - 4, 0, z], b: [prop.x2 - 4, y, z], r: 1.9, mat: 'steel' })
        out.push({ t: 'rod', a: [prop.x1 + 4, 0, z], b: [prop.x1 + 4, y, z], r: 1.9, mat: 'steel' })
      }
      return out
    }
    case 'wall':
      return [{ t: 'box', c: [prop.x - 4.5, 85, 0], size: [9, 170, 90], mat: 'block' }]
    case 'pad': {
      const a = P(prop.from)
      const b = P(prop.to)
      const len = Math.hypot(b[0] - a[0], b[1] - a[1])
      const out: Solid[] = [{ t: 'box', c: v.mid(a, b), size: [len, prop.w ?? 7, 20], mat: 'pad', rz: Math.atan2(b[1] - a[1], b[0] - a[0]) }]
      // A pad that doesn't reach the floor gets a post under its lower end.
      const low = a[1] < b[1] ? a : b
      if (low[1] > 10) out.push({ t: 'rod', a: [low[0], 0, 0], b: [low[0], low[1] - (prop.w ?? 7) / 2, 0], r: 2, mat: 'steel' })
      return out
    }
    case 'rect': {
      const y0 = top(prop.y + prop.h)
      const y1 = top(prop.y)
      return [{ t: 'box', c: [prop.x + prop.w / 2, (y0 + y1) / 2, 0], size: [prop.w, y1 - y0, 24], mat: prop.tone === 'steel' ? 'steel' : prop.tone === 'pad' ? 'pad' : 'block' }]
    }
  }
}

function barbell(c: V3): Solid[] {
  const out: Solid[] = [{ t: 'rod', a: [c[0], c[1], c[2] - 48], b: [c[0], c[1], c[2] + 48], r: 1.1, mat: 'steel' }]
  for (const s of [-1, 1]) {
    const z = c[2] + s * 31
    out.push({ t: 'rod', a: [c[0], c[1], z - s * 2.5], b: [c[0], c[1], z + s * 2.5], r: 12, mat: 'iron', sides: 32 })
    out.push({ t: 'rod', a: [c[0], c[1], z + s * 2.5], b: [c[0], c[1], z + s * 5], r: 8, mat: 'iron', sides: 28 })
    out.push({ t: 'rod', a: [c[0], c[1], z - s * 4.5], b: [c[0], c[1], z - s * 2.5], r: 2.2, mat: 'steel' })
  }
  return out
}

function dumbbell(c: V3, axis: V3): Solid[] {
  const a = v.norm(axis)
  const at = (d: number) => v.add(c, v.mul(a, d))
  return [
    { t: 'rod', a: at(-4.5), b: at(4.5), r: 1.2, mat: 'steel' },
    { t: 'rod', a: at(-8.5), b: at(-3.6), r: 4.6, mat: 'iron', sides: 6 },
    { t: 'rod', a: at(3.6), b: at(8.5), r: 4.6, mat: 'iron', sides: 6 },
  ]
}

function handle(a: V3, b: V3): Solid[] {
  return [{ t: 'rod', a, b, r: 1.4, mat: 'steel' }]
}

function cableTo(from: V3, anchor: V3, kind: LoadKind): Solid[] {
  const pulley: Solid = { t: 'rod', a: v.add(anchor, [0, 0, -1.8]), b: v.add(anchor, [0, 0, 1.8]), r: kind === 'cable' ? 4.8 : 5.4, mat: 'iron', sides: 24 }
  return [{ t: 'rod', a: from, b: anchor, r: kind === 'cable' ? 0.55 : 2.2, mat: 'steel' }, pulley]
}

function loadSolids(kind: LoadKind, pattern: Pattern, body: Body3, mode: Mode, P: (p: Pt, d?: number) => V3, at2d: Pt | null): Solid[] {
  if (kind === 'none') return []
  const [near, far] = body.arms
  const handsMid = v.mid(near.end, far.end)
  const side = mode === 'side'

  // A weight held somewhere other than the hands (back squat bar, ankle cable, goblet).
  if (pattern.loadAt && at2d) {
    const ref = pattern.loadAt.on
    const onLimb = ref === 'hand' || ref === 'ankle' || ref === 'knee'
    const limbZ = ref === 'ankle' || ref === 'knee' ? body.legs[0].end[2] : near.end[2]
    let c = P(at2d, 0)
    if (side) c = [c[0], c[1], onLimb ? limbZ : 0]
    else if (ref === 'ankle') c = body.legs[0].end
    else if (ref === 'hand') c = near.end
    if (kind === 'barbell') return barbell(side ? [c[0], c[1], 0] : c)
    if (kind === 'dumbbell') return dumbbell(c, side ? [0, 0, 1] : [1, 0, 0])
    if (pattern.anchor) return cableTo(c, side ? [P(pattern.anchor)[0], P(pattern.anchor)[1], c[2]] : P(pattern.anchor, 0), kind)
    return []
  }

  if (kind === 'barbell') return barbell(side ? [near.end[0], near.end[1], 0] : handsMid)
  if (kind === 'dumbbell') {
    const axis: V3 = side ? [0, 0, 1] : [1, 0, 0]
    return [...dumbbell(near.end, axis), ...dumbbell(far.end, axis)]
  }

  // Cable or machine
  const anchor = pattern.anchor
  if (side) {
    const grip: V3 = [near.end[0], near.end[1], 0]
    const out: Solid[] = handle([near.end[0], near.end[1], far.end[2] - 2], [near.end[0], near.end[1], near.end[2] + 2])
    if (anchor) {
      const a = P(anchor)
      out.push(...cableTo(grip, [a[0], a[1], 0], kind))
    }
    return out
  }
  if (!anchor) return handle(near.end, far.end)
  const a1 = P(anchor, 0)
  if (pattern.singleCable) return [...handle(near.end, far.end), ...cableTo(handsMid, a1, kind)]
  const a2 = P([2 * pattern.a.hip[0] - anchor[0], anchor[1]], 0)
  const box = (c: V3): Solid => ({ t: 'box', c, size: [3.5, 3.5, 3.5], mat: 'steel' })
  return [...cableTo(near.end, a1, kind), ...cableTo(far.end, a2, kind), box(near.end), box(far.end)]
}

/** The whole 3D scene for a pattern at blend k (0 = pose A, 1 = pose B). */
export function scene3(pattern: Pattern, load: LoadKind, k: number): Scene3 {
  const pose = lerpPose(pattern.a, pattern.b, k)
  const body = solveBody(pose, pattern)
  const mode = modeOf(pattern)
  const lift = liftOf(pattern)
  const P = mapper(mode, pattern.a.hip[0], pattern.a.hip[1], lift)
  const sk = solve(pose, pattern.view ?? 'side')
  const handX = (body.arms[0].end[0] + body.arms[1].end[0]) / 2
  const solids: Solid[] = []
  for (const p of pattern.props ?? []) solids.push(...propSolids(p, mode, P, handX, lift))
  const at2d = pattern.loadAt ? pointOf(sk, pattern.loadAt as AttachRef, pose.t) : null
  solids.push(...loadSolids(load, pattern, body, mode, P, at2d))

  // Rollers on the shins or thighs (leg extension, leg curl, sled).
  for (const ref of pattern.pads ?? []) {
    const p = pointOf(sk, ref, pose.t)
    const c = P(p, 0)
    // Leg press: the feet push a sled plate, square to the legs.
    if (ref.on === 'ankle' && pose.t < -30 && mode === 'side') {
      const d = v.norm(v.sub(c, body.hip))
      const plate = v.add(c, v.mul(d, 4))
      solids.push({ t: 'box', c: plate, size: [3, 30, 34], mat: 'block', rz: Math.atan2(d[1], d[0]) })
      solids.push({ t: 'rod', a: v.add(plate, v.mul(d, 1.5)), b: v.add(plate, v.mul(d, 40)), r: 2.4, mat: 'steel' })
      continue
    }
    const legZ = body.legs[0].mid
    const x = mode === 'side' ? c : [legZ[0], c[1], c[2]]
    solids.push({ t: 'rod', a: [x[0], x[1], -13], b: [x[0], x[1], 13], r: 6.2, mat: 'pad', sides: 24 })
  }
  // Leg press and hack squat: a backrest behind the torso, so the body doesn't float.
  const sled = (pattern.pads ?? []).some((r) => r.on === 'shoulder' || (r.on === 'ankle' && pose.t < -30))
  if (sled && mode === 'side') {
    const pad = (bd: Body3) => {
      const len = v.len(v.sub(bd.shoulder, bd.hip)) + 14
      const c = v.add(v.mid(bd.hip, bd.shoulder), v.mul(bd.forward, -8.5))
      return { c, len, rz: Math.atan2(bd.up[1], bd.up[0]) }
    }
    const now = pad(body)
    solids.push({ t: 'box', c: now.c, size: [now.len, 3.5, 28], mat: 'pad', rz: now.rz })
    // Fixed frame: rails through both ends of the rep (hack squat), or a post (leg press).
    const ba = solveBody(pattern.a, pattern)
    const bb = solveBody(pattern.b, pattern)
    const back = (bd: Body3, s: number) => v.add(v.add(bd.hip, v.mul(bd.forward, -11)), v.mul(bd.up, s))
    if (pattern.pads?.some((r) => r.on === 'shoulder')) {
      const top = back(ba, 34)
      const dir = v.norm(v.sub(top, back(bb, 0)))
      const bottom = v.add(top, v.mul(dir, -top[1] / dir[1]))
      for (const z of [-12, 12]) solids.push({ t: 'rod', a: [bottom[0], 0, z], b: [top[0], top[1], z], r: 1.8, mat: 'steel' })
    } else {
      const low = v.add(now.c, v.mul(body.forward, -2))
      solids.push({ t: 'rod', a: [low[0], 0, 0], b: low, r: 2.4, mat: 'steel' })
    }
  }
  // Pec deck pads along the forearms.
  if (pattern.armPads) {
    for (const arm of body.arms) {
      const d = v.norm(v.sub(arm.end, arm.mid))
      solids.push({ t: 'rod', a: v.add(arm.mid, v.mul(d, -2)), b: v.add(arm.end, v.mul(d, 6)), r: 5.4, mat: 'pad', sides: 20 })
    }
  }
  return { body, solids }
}

/** Every point the camera must keep in view across the whole rep. */
export function framePoints(pattern: Pattern, load: LoadKind): V3[] {
  const pts: V3[] = []
  for (const k of [0, 0.25, 0.5, 0.75, 1]) {
    const { body, solids } = scene3(pattern, load, k)
    // Head and joints are round: keep their surface in view, not just their centres.
    const ball = (c: V3, r: number) => pts.push(v.add(c, [r, 0, 0]), v.add(c, [-r, 0, 0]), v.add(c, [0, r, 0]), v.add(c, [0, -r, 0]), v.add(c, [0, 0, r]), v.add(c, [0, 0, -r]))
    ball(body.head, 10)
    ball(body.hip, 11)
    ball(body.shoulder, 13)
    for (const l of [...body.arms, ...body.legs]) {
      ball(l.mid, 5)
      ball(l.end, 4.5)
      if (l.toe) ball(l.toe, 3.5)
    }
    for (const s of solids) {
      if (s.t === 'rod') {
        // Long uprights and walls shouldn't push the figure into a corner of the frame.
        if (v.len(v.sub(s.a, s.b)) < 80) {
          ball(s.a, s.r)
          ball(s.b, s.r)
        }
      } else if (Math.max(...s.size) < 120) {
        pts.push(v.add(s.c, v.mul(s.size, 0.5)), v.sub(s.c, v.mul(s.size, 0.5)))
      }
    }
  }
  return pts
}

export type ViewMode = Mode
export { modeOf }
