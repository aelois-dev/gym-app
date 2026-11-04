import { useEffect, useMemo, useState } from 'react'
import { getExercise } from '../data/exercises'
import { FLOOR, animationFor, type LoadKind, type Pattern, type Prop } from './patterns'
import { lerpPose, pointOf, solve, type Limb, type Pt, type Skeleton } from './rig'

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

const seg = (a: Pt, b: Pt) => `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`

function LimbPath({ limb, leg, cls }: { limb: Limb; leg?: boolean; cls: string }) {
  return (
    <g className={cls}>
      <path d={seg(limb.root, limb.mid)} strokeWidth={leg ? 10 : 8} />
      <path d={seg(limb.mid, limb.end)} strokeWidth={leg ? 8.5 : 7} />
      {limb.toe && <path d={seg(limb.end, limb.toe)} strokeWidth={6} />}
    </g>
  )
}

function PropShape({ prop }: { prop: Prop }) {
  switch (prop.kind) {
    case 'bench':
      return (
        <g className="fig-prop">
          <rect x={prop.x} y={prop.y} width={prop.w} height={6} rx={3} />
          <path d={`M${prop.x + 7} ${prop.y + 6}V${FLOOR}M${prop.x + prop.w - 7} ${prop.y + 6}V${FLOOR}`} className="fig-prop-line" strokeWidth={3.5} />
        </g>
      )
    case 'box':
      return <rect className="fig-prop" x={prop.x} y={prop.y} width={prop.w} height={FLOOR - prop.y} rx={3} />
    case 'bar':
      return (
        <g>
          <path className="fig-prop-line" d={`M${prop.x1} ${prop.y}V${FLOOR}M${prop.x2} ${prop.y}V${FLOOR}`} strokeWidth={2.5} opacity={0.6} />
          <path className="fig-prop-line" d={`M${prop.x1 - 4} ${prop.y}H${prop.x2 + 4}`} strokeWidth={4} />
        </g>
      )
    case 'dipBars':
      return (
        <g>
          <path className="fig-prop-line" d={`M${prop.x2 - 4} ${prop.y}V${FLOOR}`} strokeWidth={3} opacity={0.7} />
          <path className="fig-prop-line" d={`M${prop.x1} ${prop.y}H${prop.x2}`} strokeWidth={4.5} />
        </g>
      )
    case 'wall':
      return <rect className="fig-prop" x={prop.x - 8} y={-22} width={8} height={FLOOR + 22} />
    case 'pad':
      return <path className="fig-prop-line" d={seg(prop.from, prop.to)} strokeWidth={prop.w ?? 7} />
  }
}

function Load({ kind, sk, pattern, t }: { kind: LoadKind; sk: Skeleton; pattern: Pattern; t: number }) {
  if (kind === 'none') return null
  const at = pattern.loadAt ? pointOf(sk, pattern.loadAt, t) : sk.arm.end
  if (kind === 'barbell') {
    return (
      <g className="fig-load">
        <circle cx={at[0]} cy={at[1]} r={10.5} />
        <circle cx={at[0]} cy={at[1]} r={2.6} className="fig-load-hub" />
      </g>
    )
  }
  if (kind === 'dumbbell') {
    const second = !pattern.loadAt
    return (
      <g className="fig-load">
        {second && pattern.view === 'front' && <circle cx={sk.arm2.end[0]} cy={sk.arm2.end[1]} r={5.2} />}
        <circle cx={at[0]} cy={at[1]} r={5.2} />
      </g>
    )
  }
  // cable / machine
  const anchor = pattern.anchor
  return (
    <g>
      {anchor && (
        <>
          <path className={kind === 'cable' ? 'fig-cable' : 'fig-prop-line'} d={seg(at, anchor)} strokeWidth={kind === 'cable' ? 1.6 : 4} />
          <circle className="fig-pulley" cx={anchor[0]} cy={anchor[1]} r={kind === 'cable' ? 4.5 : 5} />
        </>
      )}
      <circle className="fig-load" cx={at[0]} cy={at[1]} r={3.6} />
    </g>
  )
}

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
    pt(sk.hip, 8)
    pt(sk.shoulder, 8)
    pt(sk.head, 9)
    for (const l of [sk.arm, sk.arm2, sk.leg, sk.leg2]) {
      pt(l.mid, 5)
      pt(l.end, 11)
      if (l.toe) pt(l.toe, 3)
    }
  }
  if (pattern.anchor) pt(pattern.anchor, 5)
  for (const p of pattern.props ?? []) {
    if (p.kind === 'bench' || p.kind === 'box') pt([p.x, p.y]), pt([p.x + p.w, p.y])
    else if (p.kind === 'bar' || p.kind === 'dipBars') pt([p.x1 - 4, p.y - 3]), pt([p.x2 + 4, p.y])
    else if (p.kind === 'pad') pt(p.from, 4), pt(p.to, 4)
    else if (p.kind === 'wall') xs.push(p.x - 8)
  }
  ys.push(FLOOR + 3)
  const pad = 10
  let x = Math.min(...xs) - pad
  let w = Math.max(...xs) + pad - x
  let y = Math.min(...ys) - pad
  const bottom = Math.max(...ys) + 4
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

export function Figure({ pattern, load, k, box }: { pattern: Pattern; load: LoadKind; k: number; box: Box }) {
  const pose = lerpPose(pattern.a, pattern.b, k)
  const sk = solve(pose, pattern.view)
  const front = pattern.view === 'front'
  const farCls = front ? 'fig-near' : 'fig-far'
  const backProps = (pattern.props ?? []).filter((p) => p.kind !== 'bar' && p.kind !== 'dipBars')
  const frontProps = (pattern.props ?? []).filter((p) => p.kind === 'bar' || p.kind === 'dipBars')
  const showFarDumbbell = load === 'dumbbell' && !pattern.loadAt && !front
  return (
    <>
      <path className="fig-floor" d={`M${box.x + 4} ${FLOOR + 1.5}H${box.x + box.w - 4}`} />
      {backProps.map((p, i) => (
        <PropShape key={i} prop={p} />
      ))}
      <LimbPath limb={sk.leg2} leg cls={farCls} />
      <LimbPath limb={sk.arm2} cls={farCls} />
      {showFarDumbbell && <circle className="fig-load fig-load--far" cx={sk.arm2.end[0]} cy={sk.arm2.end[1]} r={5.2} />}
      <g className="fig-near">
        <path d={seg(sk.hip, sk.shoulder)} strokeWidth={15} />
        <path d={seg(sk.shoulder, sk.neck)} strokeWidth={6} />
      </g>
      <circle className="fig-head" cx={sk.head[0]} cy={sk.head[1]} r={8.5} />
      <LimbPath limb={sk.leg} leg cls="fig-near" />
      {frontProps.map((p, i) => (
        <PropShape key={i} prop={p} />
      ))}
      {(pattern.pads ?? []).map((ref, i) => {
        const at = pointOf(sk, ref, pose.t)
        return <circle key={i} className="fig-pad" cx={at[0]} cy={at[1]} r={6} />
      })}
      <LimbPath limb={sk.arm} cls="fig-near" />
      <Load kind={load} sk={sk} pattern={pattern} t={pose.t} />
    </>
  )
}

export function ExerciseAnimation({ exerciseId, frame, paused, className }: { exerciseId: string; frame?: number; paused?: boolean; className?: string }) {
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
      aria-label={`Animated demonstration of ${ex.name}`}
    >
      <Figure pattern={anim.pattern} load={anim.load} k={k} box={box} />
    </svg>
  )
}
