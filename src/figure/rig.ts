/**
 * A tiny 2D mannequin rig.
 *
 * Coordinates are SVG units (y grows downward). The figure faces +x in side view.
 * Limb angles are world angles in degrees: 0 = pointing down, 90 = forward (+x), 180 = up, -90 = back.
 * Torso angle `t`: 0 = upright, +90 = leaning fully forward (shoulder ahead of hip), -90 = lying back.
 * A limb is either forward kinematics (`a`: [upper, lower] angles) or a 2-bone IK target (`at`).
 */

export type Pt = [number, number]

export interface LimbSpec {
  /** FK: [upper segment angle, lower segment angle] in world degrees. */
  a?: [number, number]
  /** IK: target for the hand/ankle. */
  at?: Pt
  /** Frame for `at`: world coords, or an offset from the shoulder/hip rotated with the torso. */
  from?: 'world' | 'shoulder' | 'hip'
  /** Which way the middle joint bends for IK (+1 / -1). */
  bend?: number
}

export interface Pose {
  hip: Pt
  t: number
  arm: LimbSpec
  leg: LimbSpec
  /** Far-side limbs; default mirrors (front view) or copies (side view) the near side. */
  arm2?: LimbSpec
  leg2?: LimbSpec
  /** Foot angles (world degrees). Default: flat, pointing forward. */
  foot?: number
  foot2?: number
}

export const LEN = { torso: 40, upperArm: 24, foreArm: 22, thigh: 31, shin: 30, foot: 9, head: 8.5 }

export interface Limb {
  root: Pt
  mid: Pt
  end: Pt
  toe?: Pt
}

export interface Skeleton {
  hip: Pt
  shoulder: Pt
  neck: Pt
  head: Pt
  arm: Limb
  arm2: Limb
  leg: Limb
  leg2: Limb
}

const rad = (d: number) => (d * Math.PI) / 180
const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]]
const scale = (a: Pt, s: number): Pt => [a[0] * s, a[1] * s]
const dirOf = (deg: number): Pt => [Math.sin(rad(deg)), Math.cos(rad(deg))]
const rot = (v: Pt, deg: number): Pt => {
  const c = Math.cos(rad(deg))
  const s = Math.sin(rad(deg))
  return [v[0] * c - v[1] * s, v[0] * s + v[1] * c]
}
const lerp = (a: number, b: number, k: number) => a + (b - a) * k
const lerpPt = (a: Pt, b: Pt, k: number): Pt => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)]

function ik(root: Pt, target: Pt, l1: number, l2: number, bend: number): { mid: Pt; end: Pt } {
  const dx = target[0] - root[0]
  const dy = target[1] - root[1]
  const raw = Math.hypot(dx, dy) || 0.001
  const d = Math.min(l1 + l2 - 0.01, Math.max(Math.abs(l1 - l2) + 0.01, raw))
  const phi = Math.atan2(dy, dx)
  const cosA = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)
  const a = Math.acos(Math.max(-1, Math.min(1, cosA)))
  const mid: Pt = [root[0] + l1 * Math.cos(phi + bend * a), root[1] + l1 * Math.sin(phi + bend * a)]
  const end: Pt = [root[0] + (dx / raw) * d, root[1] + (dy / raw) * d]
  return { mid, end }
}

function lerpLimb(a: LimbSpec, b: LimbSpec, k: number): LimbSpec {
  return {
    from: a.from,
    bend: a.bend,
    a: a.a && b.a ? [lerp(a.a[0], b.a[0], k), lerp(a.a[1], b.a[1], k)] : a.a,
    at: a.at && b.at ? lerpPt(a.at, b.at, k) : a.at,
  }
}

export function lerpPose(a: Pose, b: Pose, k: number): Pose {
  const opt = (x?: LimbSpec, y?: LimbSpec) => (x && y ? lerpLimb(x, y, k) : x)
  return {
    hip: lerpPt(a.hip, b.hip, k),
    t: lerp(a.t, b.t, k),
    arm: lerpLimb(a.arm, b.arm, k),
    leg: lerpLimb(a.leg, b.leg, k),
    arm2: opt(a.arm2, b.arm2),
    leg2: opt(a.leg2, b.leg2),
    foot: a.foot !== undefined && b.foot !== undefined ? lerp(a.foot, b.foot, k) : a.foot,
    foot2: a.foot2 !== undefined && b.foot2 !== undefined ? lerp(a.foot2, b.foot2, k) : a.foot2,
  }
}

export type View = 'side' | 'front'

/** Offset of the far-side limbs in side view, giving a hint of depth. */
const DEPTH: Pt = [-3, -2]

export function solve(pose: Pose, view: View = 'side'): Skeleton {
  const tDir: Pt = [Math.sin(rad(pose.t)), -Math.cos(rad(pose.t))]
  const hip = pose.hip
  const shoulder = add(hip, scale(tDir, LEN.torso))
  const neck = add(shoulder, scale(tDir, 5))
  const head = add(shoulder, scale(tDir, 13))
  const perp: Pt = [Math.cos(rad(pose.t)), Math.sin(rad(pose.t))]

  const front = view === 'front'
  const sNear = front ? add(shoulder, scale(perp, 10)) : shoulder
  const sFar = front ? add(shoulder, scale(perp, -10)) : add(shoulder, DEPTH)
  const hNear = front ? add(hip, scale(perp, 6)) : hip
  const hFar = front ? add(hip, scale(perp, -6)) : add(hip, DEPTH)

  const mirror = (s: LimbSpec): LimbSpec => {
    if (!front) {
      return s.at && (s.from ?? 'world') === 'world' ? { ...s, at: add(s.at, DEPTH) } : s
    }
    if (s.a) return { ...s, a: [-s.a[0], -s.a[1]] }
    if (s.at) {
      const from = s.from ?? 'world'
      return { ...s, bend: -(s.bend ?? 1), at: from === 'world' ? [2 * hip[0] - s.at[0], s.at[1]] : [-s.at[0], s.at[1]] }
    }
    return s
  }

  const limb = (root: Pt, spec: LimbSpec, l1: number, l2: number, defBend: number, base: { shoulder: Pt; hip: Pt }): Limb => {
    if (spec.a) {
      const mid = add(root, scale(dirOf(spec.a[0]), l1))
      return { root, mid, end: add(mid, scale(dirOf(spec.a[1]), l2)) }
    }
    const from = spec.from ?? 'world'
    const target = from === 'world' ? spec.at! : add(from === 'shoulder' ? base.shoulder : base.hip, rot(spec.at!, pose.t))
    const { mid, end } = ik(root, target, l1, l2, spec.bend ?? defBend)
    return { root, mid, end }
  }

  const baseNear = { shoulder: sNear, hip: hNear }
  const baseFar = { shoulder: sFar, hip: hFar }
  const arm = limb(sNear, pose.arm, LEN.upperArm, LEN.foreArm, 1, baseNear)
  const arm2 = limb(sFar, pose.arm2 ?? mirror(pose.arm), LEN.upperArm, LEN.foreArm, front ? -1 : 1, baseFar)
  const leg = limb(hNear, pose.leg, LEN.thigh, LEN.shin, -1, baseNear)
  const leg2 = limb(hFar, pose.leg2 ?? mirror(pose.leg), LEN.thigh, LEN.shin, front ? 1 : -1, baseFar)

  const footLen = front ? 5 : LEN.foot
  const f1 = pose.foot ?? (front ? 60 : 90)
  const f2 = pose.foot2 ?? (front ? -(pose.foot ?? 60) : (pose.foot ?? 90))
  leg.toe = add(leg.end, scale(dirOf(f1), footLen))
  leg2.toe = add(leg2.end, scale(dirOf(f2), footLen))

  return { hip, shoulder, neck, head, arm, arm2, leg, leg2 }
}

/** Resolve a point relative to the skeleton. */
export function pointOf(sk: Skeleton, ref: AttachRef, t: number): Pt {
  switch (ref.on) {
    case 'hand':
      return sk.arm.end
    case 'hand2':
      return sk.arm2.end
    case 'ankle':
      return sk.leg.end
    case 'shoulder':
      return add(sk.shoulder, rot(ref.offset ?? [0, 0], t))
    case 'hip':
      return add(sk.hip, rot(ref.offset ?? [0, 0], t))
  }
}

export interface AttachRef {
  on: 'hand' | 'hand2' | 'ankle' | 'shoulder' | 'hip'
  offset?: Pt
}
