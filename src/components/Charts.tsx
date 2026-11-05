import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { MUSCLES, type Muscle } from '../data/exercises'
import type { ExerciseSession } from '../lib/progression'
import { formatKg } from '../lib/weights'

/**
 * Sets per muscle this week, as thin horizontal bars over the goal's target range (a shaded band).
 * Single series, so no legend; values sit at the bar tips in text colour.
 */
export function WeeklyVolume({ sets, target }: { sets: Record<Muscle, number>; target: [number, number] }) {
  const max = Math.max(target[1] * 1.25, ...Object.values(sets))
  const pct = (n: number) => `${(Math.min(n, max) / max) * 100}%`
  return (
    <ul className="vol">
      {MUSCLES.map((m) => {
        const n = Math.round(sets[m.id] * 10) / 10
        const state = n < target[0] ? 'under' : n > target[1] ? 'over' : 'in'
        return (
          <li key={m.id} className="vol__row" title={`${m.label}: ${n} sets this week, target ${target[0]}–${target[1]}`}>
            <span className="vol__label">{m.label}</span>
            <span className="vol__track">
              <span className="vol__band" style={{ left: pct(target[0]), width: `calc(${pct(target[1])} - ${pct(target[0])})` }} />
              {n > 0 && <span className="vol__bar" style={{ width: pct(n) }} />}
              <span className="vol__value" style={{ left: `calc(${pct(n)} + 6px)` }}>
                {n}
                <span className="sr-only"> sets, {state === 'in' ? 'in the target range' : state === 'under' ? 'under the target range' : 'over the target range'}</span>
              </span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}

const W = 320
const H = 150
const PAD = { l: 34, r: 44, t: 12, b: 24 }

function niceTicks(lo: number, hi: number): number[] {
  if (hi - lo < 1e-6) return [lo]
  const raw = (hi - lo) / 3
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((s) => s * mag).find((s) => s >= raw)!
  const start = Math.ceil(lo / step) * step
  const out: number[] = []
  for (let v = start; v <= hi + 1e-9; v += step) out.push(Math.round(v * 100) / 100)
  return out
}

const short = (t: number) => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

/** Heaviest weight per session over time: 2px line, end dot with its value, crosshair + tooltip on touch. */
export function WeightChart({ sessions, name }: { sessions: ExerciseSession[]; name: string }) {
  const pts = sessions.filter((s) => s.topKg !== null) as (ExerciseSession & { topKg: number })[]
  const [active, setActive] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  if (pts.length === 0) return <p className="empty-note">No weights logged for {name} yet.</p>

  const kgs = pts.map((p) => p.topKg)
  const lo0 = Math.min(...kgs)
  const hi0 = Math.max(...kgs)
  const span = Math.max(5, hi0 - lo0)
  const lo = Math.max(0, lo0 - span * 0.25)
  const hi = hi0 + span * 0.25
  const t0 = pts[0].at
  const t1 = pts.at(-1)!.at
  const x = (t: number) => (pts.length === 1 || t1 === t0 ? (PAD.l + W - PAD.r) / 2 : PAD.l + ((t - t0) / (t1 - t0)) * (W - PAD.l - PAD.r))
  const y = (kg: number) => PAD.t + (1 - (kg - lo) / (hi - lo)) * (H - PAD.t - PAD.b)
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.at).toFixed(1)} ${y(p.topKg).toFixed(1)}`).join('')
  const ticks = niceTicks(lo, hi)
  const last = pts.at(-1)!
  const shown = active !== null ? pts[active] : null

  const pick = (e: PointerEvent<SVGSVGElement>) => {
    const box = svgRef.current!.getBoundingClientRect()
    const px = ((e.clientX - box.left) / box.width) * W
    let best = 0
    pts.forEach((p, i) => {
      if (Math.abs(x(p.at) - px) < Math.abs(x(pts[best].at) - px)) best = i
    })
    setActive(best)
  }
  const keys = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') setActive((a) => Math.min(pts.length - 1, (a ?? -1) + 1))
    if (e.key === 'ArrowLeft') setActive((a) => Math.max(0, (a ?? pts.length) - 1))
    if (e.key === 'Escape') setActive(null)
  }

  return (
    <div className="wchart">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="wchart__svg"
        role="img"
        tabIndex={0}
        aria-label={`${name}: heaviest weight per session, from ${formatKg(pts[0].topKg)} kg to ${formatKg(last.topKg)} kg over ${pts.length} sessions. Use the arrow keys to read each session.`}
        onPointerMove={pick}
        onPointerDown={pick}
        onPointerLeave={() => setActive(null)}
        onKeyDown={keys}
        onBlur={() => setActive(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line className="wchart__grid" x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} />
            <text className="wchart__tick" x={PAD.l - 6} y={y(t) + 3.5} textAnchor="end">
              {formatKg(t)}
            </text>
          </g>
        ))}
        <text className="wchart__tick" x={x(t0)} y={H - 6} textAnchor={pts.length === 1 ? 'middle' : 'start'}>
          {short(t0)}
        </text>
        {pts.length > 1 && (
          <text className="wchart__tick" x={x(t1)} y={H - 6} textAnchor="end">
            {short(t1)}
          </text>
        )}
        <path className="wchart__line" d={d} />
        {shown && <line className="wchart__cross" x1={x(shown.at)} x2={x(shown.at)} y1={PAD.t} y2={H - PAD.b} />}
        {pts.map((p, i) => (
          <circle key={i} className={`wchart__dot ${i === pts.length - 1 || i === active ? 'is-on' : ''}`} cx={x(p.at)} cy={y(p.topKg)} r={i === pts.length - 1 || i === active ? 4.5 : 2.5} />
        ))}
        <text className="wchart__end" x={x(last.at) + 9} y={y(last.topKg) + 4}>
          {formatKg(last.topKg)} kg
        </text>
      </svg>
      {shown && (
        <div className="wchart__tip" style={{ left: `${Math.min(80, Math.max(20, (x(shown.at) / W) * 100))}%` }} role="status">
          <span className="wchart__tip-main">
            <strong>{formatKg(shown.topKg)} kg</strong> × {shown.reps}
          </span>
          <span>
            {short(shown.at)}, {shown.setsDone} of {shown.sets} sets
          </span>
        </div>
      )}
      <details className="wchart__table">
        <summary>{pts.length === 1 ? '1 session' : `All ${pts.length} sessions`}</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Heaviest</th>
              <th scope="col">Sets</th>
            </tr>
          </thead>
          <tbody>
            {[...pts].reverse().map((p, i) => (
              <tr key={i}>
                <td>{short(p.at)}</td>
                <td>
                  {formatKg(p.topKg)} kg × {p.reps}
                </td>
                <td>
                  {p.setsDone} of {p.sets}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}
