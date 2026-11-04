import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { getExercise, type Muscle } from '../data/exercises'
import { FLOOR, animationFor, type LoadKind, type Pattern, type Prop } from './patterns'
import { lerpPose, pointOf, solve, type Pt, type Skeleton } from './rig'

const ease = (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * x)

/** Map loop progress (0..1) to blend between pose A (0) and pose B (1). */
export function phase(p: number, hold?: boolean): number {
  if (hold) return 0.5 - 0.5 * Math.cos(2 * Math.PI * p)
  if (p < 0.4) return ease(p / 0.4)
  if (p < 0.5) return 1
  if (p < 0.9) return 1 - ease((p - 0.5) / 0.4)
  return 0
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    if (typeof matchMedia === 'undefined') return
    const mq = matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => setReduced(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return reduced
}

function useLoop(durMs: number, active: boolean, stepped: boolean) {
  const [p, setP] = useState(0)
  useEffect(() => {
    if (!active) return
    let raf = 0
    let last = 0
    const start = performance.now()
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      if (stepped && now - last < 800) return
      last = now
      setP(((now - start) % durMs) / durMs)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [durMs, active, stepped])
  return p
}

// ---------- geometry helpers ----------
const f = (n: number) => n.toFixed(2)
const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]]
const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]]
const mul = (a: Pt, s: number): Pt => [a[0] * s, a[1] * s]
const unit = (v: Pt): Pt => {
  const l = Math.hypot(v[0], v[1]) || 1
  return [v[0] / l, v[1] / l]
}
const seg = (a: Pt, b: Pt) => `M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}`

/** A tapered capsule from a (radius ra) to b (radius rb). */
function capsule(a: Pt, b: Pt, ra: number, rb: number): string {
  const u = unit(sub(b, a))
  const n: Pt = [-u[1], u[0]]
  const a1 = add(a, mul(n, ra))
  const b1 = add(b, mul(n, rb))
  const b2 = add(b, mul(n, -rb))
  const a2 = add(a, mul(n, -ra))
  return `M${f(a1[0])} ${f(a1[1])}L${f(b1[0])} ${f(b1[1])}A${f(rb)} ${f(rb)} 0 0 0 ${f(b2[0])} ${f(b2[1])}L${f(a2[0])} ${f(a2[1])}A${f(ra)} ${f(ra)} 0 0 0 ${f(a1[0])} ${f(a1[1])}Z`
}

/** Ellipse whose long half-axis `along` points in direction `dir`. */
function ellipse(c: Pt, dir: Pt, along: number, across: number, key?: string | number, cls?: string) {
  const deg = (Math.atan2(dir[1], dir[0]) * 180) / Math.PI
  return <ellipse key={key} className={cls} cx={f(c[0])} cy={f(c[1])} rx={f(along)} ry={f(across)} transform={`rotate(${f(deg)} ${f(c[0])} ${f(c[1])})`} />
}

/** Draws children twice: an outline pass (merging overlaps into one silhouette) and a fill pass. */
function Part({ cls, children }: { cls: string; children: ReactNode }) {
  return (
    <g className={cls}>
      <g className="fig-edge">{children}</g>
      <g className="fig-fill">{children}</g>
    </g>
  )
}

// ---------- target-muscle highlight ----------
export type Highlight = 'chest' | 'back' | 'shoulders' | 'upperArm' | 'thighs' | 'calves' | 'glutes' | 'core'

const MUSCLE_HIGHLIGHT: Record<Muscle, Highlight> = {
  chest: 'chest',
  back: 'back',
  shoulders: 'shoulders',
  biceps: 'upperArm',
  triceps: 'upperArm',
  legs: 'thighs',
  glutes: 'glutes',
  core: 'core',
}
const CALF_EXERCISES = new Set(['calf-raise', 'single-leg-calf'])

export function highlightFor(exerciseId: string): Highlight {
  if (CALF_EXERCISES.has(exerciseId)) return 'calves'
  return MUSCLE_HIGHLIGHT[getExercise(exerciseId).muscle]
}

// ---------- body ----------
function Arm({ sk, far, hi }: { sk: Skeleton; far?: boolean; hi: Highlight | null }) {
  const l = far ? sk.arm2 : sk.arm
  const muscle = hi === 'upperArm'
  return (
    <>
      <path className={muscle ? 'fig-muscle' : undefined} d={capsule(l.root, l.mid, 4.7, 3.7)} />
      <path d={capsule(l.mid, l.end, 3.7, 2.7)} />
      <circle cx={f(l.end[0])} cy={f(l.end[1])} r={3.3} />
      <circle className={hi === 'shoulders' ? 'fig-muscle' : undefined} cx={f(l.root[0])} cy={f(l.root[1])} r={5.6} />
    </>
  )
}

function Leg({ sk, far, hi }: { sk: Skeleton; far?: boolean; hi: Highlight | null }) {
  const l = far ? sk.leg2 : sk.leg
  const toe = l.toe ?? l.end
  const footDir = unit(sub(toe, l.end))
  const heel = add(l.end, mul(footDir, -2.6))
  return (
    <>
      <path className={hi === 'thighs' ? 'fig-muscle' : undefined} d={capsule(l.root, l.mid, 7.4, 4.9)} />
      <path className={hi === 'calves' ? 'fig-muscle' : undefined} d={capsule(l.mid, l.end, 5, 3)} />
      <path d={capsule(heel, add(toe, mul(footDir, 1.5)), 3.2, 2.1)} />
    </>
  )
}

function Torso({ sk, front, hi }: { sk: Skeleton; front: boolean; hi: Highlight | null }) {
  const up = unit(sub(sk.shoulder, sk.hip))
  // Perpendicular to the spine, pointing out of the chest (the figure faces +x in side view).
  const chestSide: Pt = [-up[1], up[0]]
  const ribC = add(add(sk.shoulder, mul(up, -11)), mul(chestSide, front ? 0 : 1.5))
  const pelC = add(add(sk.hip, mul(up, 2)), mul(chestSide, front ? 0 : -0.5))
  const ribW = front ? 15 : 10.5
  const pelW = front ? 11.5 : 9.5
  const waist = front ? 9 : 8
  return (
    <>
      {ellipse(ribC, up, 14, ribW, 'rib')}
      <path d={capsule(ribC, pelC, waist, waist)} />
      {ellipse(pelC, up, 9, pelW, 'pel')}
      <path d={capsule(add(sk.shoulder, mul(up, -1)), sk.head, 3.4, 3.4)} />
      {ellipse(sk.head, up, 8.6, 7.4, 'head')}
      {!front && <circle cx={f(sk.head[0] + chestSide[0] * 7 - up[0] * 1.2)} cy={f(sk.head[1] + chestSide[1] * 7 - up[1] * 1.2)} r={2.4} />}
      {hi === 'chest' && ellipse(add(add(sk.shoulder, mul(up, -9)), mul(chestSide, front ? 0 : 4.5)), up, front ? 6.5 : 8.5, front ? 11 : 5.2, 'hi-chest', 'fig-muscle')}
      {hi === 'back' && ellipse(add(add(sk.shoulder, mul(up, -13)), mul(chestSide, front ? 0 : -3)), up, 11, front ? 12.5 : 5.2, 'hi-back', 'fig-muscle')}
      {hi === 'core' && ellipse(add(add(ribC, mul(sub(pelC, ribC), 0.55)), mul(chestSide, front ? 0 : 3.4)), up, 9, front ? 6 : 4.2, 'hi-core', 'fig-muscle')}
      {hi === 'glutes' && ellipse(add(pelC, mul(chestSide, front ? 0 : -3.4)), up, 7, front ? 10 : 5.8, 'hi-glutes', 'fig-muscle')}
    </>
  )
}

// ---------- equipment ----------
function PropShape({ prop }: { prop: Prop }) {
  switch (prop.kind) {
    case 'bench':
      return (
        <g>
          <path className="fig-steel" d={`M${prop.x + 8} ${prop.y + 5}V${FLOOR}M${prop.x + prop.w - 8} ${prop.y + 5}V${FLOOR}`} strokeWidth={3} />
          <rect className="fig-pad" x={prop.x} y={prop.y - 1} width={prop.w} height={7} rx={3.5} />
        </g>
      )
    case 'box':
      return <rect className="fig-block" x={prop.x} y={prop.y} width={prop.w} height={FLOOR - prop.y} rx={2} />
    case 'bar':
      return (
        <g>
          <path className="fig-steel fig-steel--soft" d={`M${prop.x1} ${prop.y}V${FLOOR}M${prop.x2} ${prop.y}V${FLOOR}`} strokeWidth={3} />
          <path className="fig-steel" d={`M${prop.x1 - 4} ${prop.y}H${prop.x2 + 4}`} strokeWidth={3.5} />
        </g>
      )
    case 'dipBars':
      return (
        <g>
          <path className="fig-steel fig-steel--soft" d={`M${prop.x2 - 4} ${prop.y}V${FLOOR}`} strokeWidth={3} />
          <path className="fig-steel" d={`M${prop.x1} ${prop.y}H${prop.x2}`} strokeWidth={4} />
        </g>
      )
    case 'wall':
      return <rect className="fig-block" x={prop.x - 9} y={-40} width={9} height={FLOOR + 40} />
    case 'pad':
      return <path className="fig-pad-line" d={seg(prop.from, prop.to)} strokeWidth={prop.w ?? 7} />
  }
}

function hexagon(c: Pt, r: number) {
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i + Math.PI / 6
    return `${f(c[0] + r * Math.cos(a))},${f(c[1] + r * Math.sin(a))}`
  })
  return <polygon className="fig-iron" points={pts.join(' ')} />
}

function Load({ kind, sk, pattern, t, far }: { kind: LoadKind; sk: Skeleton; pattern: Pattern; t: number; far?: boolean }) {
  if (kind === 'none') return null
  if (far) {
    // Only dumbbells show in the far hand.
    if (kind !== 'dumbbell' || pattern.loadAt) return null
    return <g className="fig-far-load">{hexagon(sk.arm2.end, 5.6)}</g>
  }
  const at = pattern.loadAt ? pointOf(sk, pattern.loadAt, t) : sk.arm.end
  if (kind === 'barbell') {
    return (
      <g>
        <circle className="fig-iron" cx={f(at[0])} cy={f(at[1])} r={12} />
        <circle className="fig-iron-ring" cx={f(at[0])} cy={f(at[1])} r={7.5} />
        <circle className="fig-steel-fill" cx={f(at[0])} cy={f(at[1])} r={2.4} />
      </g>
    )
  }
  if (kind === 'dumbbell') return hexagon(at, 5.6)
  const anchor = pattern.anchor
  return (
    <g>
      {anchor && (
        <>
          <path className="fig-steel" d={seg(at, anchor)} strokeWidth={kind === 'cable' ? 1.3 : 4.5} />
          <circle className="fig-pulley" cx={f(anchor[0])} cy={f(anchor[1])} r={kind === 'cable' ? 4.8 : 5.4} />
        </>
      )}
      <rect className="fig-steel-fill" x={f(at[0] - 3.6)} y={f(at[1] - 3.6)} width={7.2} height={7.2} rx={2} />
    </g>
  )
}

// ---------- framing ----------
type Box = { x: number; y: number; w: number; h: number }

/** Bounding box of a pattern across its whole rep, padded and widened to a 5:4 frame. */
export function fitBox(pattern: Pattern): Box {
  const xs: number[] = []
  const ys: number[] = []
  const pt = (p: Pt, r = 0) => {
    xs.push(p[0] - r, p[0] + r)
    ys.push(p[1] - r, p[1] + r)
  }
  for (const k of [0, 0.25, 0.5, 0.75, 1]) {
    const pose = lerpPose(pattern.a, pattern.b, k)
    const sk = solve(pose, pattern.view)
    pt(sk.hip, 10)
    pt(sk.shoulder, 10)
    pt(sk.head, 9)
    for (const l of [sk.arm, sk.arm2, sk.leg, sk.leg2]) {
      pt(l.mid, 6)
      pt(l.end, 12)
      if (l.toe) pt(l.toe, 4)
    }
  }
  if (pattern.anchor) pt(pattern.anchor, 6)
  for (const p of pattern.props ?? []) {
    if (p.kind === 'bench' || p.kind === 'box') pt([p.x, p.y]), pt([p.x + p.w, p.y])
    else if (p.kind === 'bar' || p.kind === 'dipBars') pt([p.x1 - 4, p.y - 3]), pt([p.x2 + 4, p.y])
    else if (p.kind === 'pad') pt(p.from, 4), pt(p.to, 4)
    else if (p.kind === 'wall') xs.push(p.x - 9)
  }
  ys.push(FLOOR + 3)
  const pad = 10
  let x = Math.min(...xs) - pad
  let w = Math.max(...xs) + pad - x
  let y = Math.min(...ys) - pad
  const bottom = Math.max(...ys) + 5
  let h = bottom - y
  const ratio = 1.25
  if (w / h < ratio) {
    const nw = h * ratio
    x -= (nw - w) / 2
    w = nw
  } else {
    const nh = w / ratio
    y = bottom - nh
    h = nh
  }
  return { x, y, w, h }
}

export function Figure({ pattern, load, k, box, hi }: { pattern: Pattern; load: LoadKind; k: number; box: Box; hi: Highlight | null }) {
  const pose = lerpPose(pattern.a, pattern.b, k)
  const sk = solve(pose, pattern.view)
  const front = pattern.view === 'front'
  const backProps = (pattern.props ?? []).filter((p) => p.kind !== 'bar' && p.kind !== 'dipBars')
  const frontProps = (pattern.props ?? []).filter((p) => p.kind === 'bar' || p.kind === 'dipBars')
  const farCls = front ? 'fig-body' : 'fig-body fig-body--far'
  return (
    <>
      <rect className="fig-ground" x={f(box.x)} y={FLOOR + 1} width={f(box.w)} height={f(box.y + box.h - FLOOR)} />
      <ellipse className="fig-shadow" cx={f((sk.leg.end[0] + sk.leg2.end[0] + sk.hip[0]) / 3)} cy={FLOOR + 1.5} rx={28} ry={2.6} />
      {backProps.map((p, i) => (
        <PropShape key={i} prop={p} />
      ))}
      <Part cls={farCls}>
        <Leg sk={sk} far hi={hi} />
      </Part>
      <Part cls={farCls}>
        <Arm sk={sk} far hi={hi} />
      </Part>
      <Load kind={load} sk={sk} pattern={pattern} t={pose.t} far />
      {front && (
        <Part cls="fig-body">
          <Leg sk={sk} hi={hi} />
        </Part>
      )}
      <Part cls="fig-body">
        <Torso sk={sk} front={front} hi={hi} />
      </Part>
      {!front && (
        <Part cls="fig-body">
          <Leg sk={sk} hi={hi} />
        </Part>
      )}
      {frontProps.map((p, i) => (
        <PropShape key={i} prop={p} />
      ))}
      {(pattern.pads ?? []).map((ref, i) => {
        const at = pointOf(sk, ref, pose.t)
        return <circle key={i} className="fig-roller" cx={f(at[0])} cy={f(at[1])} r={6.5} />
      })}
      {load === 'barbell' && <Load kind={load} sk={sk} pattern={pattern} t={pose.t} />}
      <Part cls="fig-body">
        <Arm sk={sk} hi={hi} />
      </Part>
      {load !== 'barbell' && <Load kind={load} sk={sk} pattern={pattern} t={pose.t} />}
    </>
  )
}

export function ExerciseAnimation({
  exerciseId,
  frame,
  paused,
  className,
  highlight = true,
}: {
  exerciseId: string
  /** Fixed blend between start (0) and end (1) pose; renders a still image. */
  frame?: number
  paused?: boolean
  className?: string
  highlight?: boolean
}) {
  const ex = getExercise(exerciseId)
  const anim = useMemo(() => animationFor(exerciseId, ex.kit), [exerciseId, ex.kit])
  const reduced = useReducedMotion()
  const dur = (anim?.pattern.dur ?? (anim?.pattern.hold ? 3.2 : 2.4)) * 1000
  const p = useLoop(dur, frame === undefined && !paused && !!anim, reduced)
  const box = useMemo(() => (anim ? fitBox(anim.pattern) : null), [anim])
  if (!anim || !box) return null
  const k = frame ?? (reduced && !anim.pattern.hold ? (p < 0.5 ? 0 : 1) : phase(p, anim.pattern.hold))
  return (
    <svg
      className={`fig ${className ?? ''}`}
      viewBox={`${box.x.toFixed(1)} ${box.y.toFixed(1)} ${box.w.toFixed(1)} ${box.h.toFixed(1)}`}
      role="img"
      aria-label={frame === undefined ? `Animated demonstration of ${ex.name}` : `${ex.name}`}
    >
      <Figure pattern={anim.pattern} load={anim.load} k={k} box={box} hi={highlight ? highlightFor(exerciseId) : null} />
    </svg>
  )
}
