import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { getExercise, type Muscle } from '../data/exercises'
import { animationFor, type LoadKind, type Pattern } from './patterns'
import type { Pt } from './rig'
import { drawScene, frameFor, type Group, type Highlight } from './view34'

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

/** A tapered capsule from a (radius ra) to b (radius rb). */
export function capsule(a: Pt, b: Pt, ra: number, rb: number): string {
  const u = unit(sub(b, a))
  const n: Pt = [-u[1], u[0]]
  const a1 = add(a, mul(n, ra))
  const b1 = add(b, mul(n, rb))
  const b2 = add(b, mul(n, -rb))
  const a2 = add(a, mul(n, -ra))
  return `M${f(a1[0])} ${f(a1[1])}L${f(b1[0])} ${f(b1[1])}A${f(rb)} ${f(rb)} 0 0 0 ${f(b2[0])} ${f(b2[1])}L${f(a2[0])} ${f(a2[1])}A${f(ra)} ${f(ra)} 0 0 0 ${f(a1[0])} ${f(a1[1])}Z`
}

/** Ellipse whose long half-axis `along` points in direction `dir`. */
export function ellipse(c: Pt, dir: Pt, along: number, across: number, key?: string | number, cls?: string) {
  const deg = (Math.atan2(dir[1], dir[0]) * 180) / Math.PI
  return <ellipse key={key} className={cls} cx={f(c[0])} cy={f(c[1])} rx={f(along)} ry={f(across)} transform={`rotate(${f(deg)} ${f(c[0])} ${f(c[1])})`} />
}

/** Draws children twice: an outline pass (merging overlaps into one silhouette) and a fill pass. */
export function Part({ cls, children }: { cls: string; children: ReactNode }) {
  return (
    <g className={cls}>
      <g className="fig-edge">{children}</g>
      <g className="fig-fill">{children}</g>
    </g>
  )
}

// ---------- target-muscle highlight ----------
export type { Highlight }

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
const CALF_EXERCISES = new Set(['calf-raise', 'single-leg-calf', 'seated-calf-raise'])

export function highlightFor(exerciseId: string): Highlight {
  if (CALF_EXERCISES.has(exerciseId)) return 'calves'
  return MUSCLE_HIGHLIGHT[getExercise(exerciseId).muscle]
}

const GROUP_CLS: Record<Group['kind'], string> = {
  body: 'fig-body',
  far: 'fig-body fig-body--far',
  solid: 'fig-solid',
  thin: 'fig-solid fig-solid--thin',
  flat: 'fig-flat',
}

/** One frame of the rep, seen from a three-quarter angle, painted back to front. */
export function Figure({ pattern, load, k, hi }: { pattern: Pattern; load: LoadKind; k: number; hi: Highlight | null }) {
  const groups = drawScene(pattern, load, k, hi)
  return (
    <>
      {groups.map((g) => {
        const paths = g.prims.map((p, i) => <path key={i} className={p.cls} d={p.d} />)
        if (g.kind === 'flat') return <g key={g.key}>{paths}</g>
        return (
          <g key={g.key} className={GROUP_CLS[g.kind]}>
            <g className="fig-edge">{paths}</g>
            <g className="fig-fill">{paths}</g>
          </g>
        )
      })}
    </>
  )
}

/** A note about the camera angle for views that aren't a plain side or front view. */
export function animationCaption(exerciseId: string): string | undefined {
  return animationFor(exerciseId, getExercise(exerciseId).kit)?.pattern.caption
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
  const box = useMemo(() => (anim ? frameFor(anim.pattern, anim.load) : null), [anim])
  if (!anim || !box) return null
  const k = frame ?? (reduced && !anim.pattern.hold ? (p < 0.5 ? 0 : 1) : phase(p, anim.pattern.hold))
  return (
    <svg
      className={`fig ${className ?? ''}`}
      viewBox={`${box.x.toFixed(1)} ${box.y.toFixed(1)} ${box.w.toFixed(1)} ${box.h.toFixed(1)}`}
      role="img"
      aria-label={frame === undefined ? `Animated demonstration of ${ex.name}` : `${ex.name}`}
    >
      <Figure pattern={anim.pattern} load={anim.load} k={k} hi={highlight ? highlightFor(exerciseId) : null} />
    </svg>
  )
}
