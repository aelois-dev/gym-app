import type { KeyboardEvent, ReactNode } from 'react'
import { MUSCLES, type Muscle } from '../data/exercises'
import { Part, capsule, ellipse } from '../figure/ExerciseAnimation'
import type { Pt } from '../figure/rig'
import { listJoin } from '../lib/text'

/**
 * Front and back mannequins, drawn in the same style as the exercise animations.
 * Interactive (with `onToggle`): each muscle is a checkbox you tap to train it.
 * Display only (no `onToggle`): lights the muscles that were worked.
 */

const UP: Pt = [0, -1]
const ACROSS: Pt = [1, 0]

type Side = 'front' | 'back'
type RegionShapes = (cx: number) => ReactNode

/** Muscle regions per side. Legs and shoulders appear on both sides and toggle together. */
const REGIONS: Record<Side, { muscle: Muscle; draw: RegionShapes }[]> = {
  front: [
    {
      muscle: 'shoulders',
      draw: (cx) => (
        <>
          <circle cx={cx - 21} cy={41} r={7.4} />
          <circle cx={cx + 21} cy={41} r={7.4} />
        </>
      ),
    },
    {
      muscle: 'chest',
      draw: (cx) => (
        <>
          {ellipse([cx - 8.6, 48], [1, 0.12], 9.4, 7.2, 'l')}
          {ellipse([cx + 8.6, 48], [1, -0.12], 9.4, 7.2, 'r')}
        </>
      ),
    },
    {
      muscle: 'biceps',
      draw: (cx) => (
        <>
          <path d={capsule([cx - 24.5, 47], [cx - 29.5, 68], 5.4, 4.6)} />
          <path d={capsule([cx + 24.5, 47], [cx + 29.5, 68], 5.4, 4.6)} />
        </>
      ),
    },
    { muscle: 'core', draw: (cx) => <path d={capsule([cx, 62], [cx, 84], 8.2, 7.4)} /> },
    {
      muscle: 'legs',
      draw: (cx) => (
        <>
          <path d={capsule([cx - 9.5, 101], [cx - 11, 134], 8.2, 6)} />
          <path d={capsule([cx + 9.5, 101], [cx + 11, 134], 8.2, 6)} />
        </>
      ),
    },
  ],
  back: [
    {
      muscle: 'shoulders',
      draw: (cx) => (
        <>
          <circle cx={cx - 21} cy={41} r={7.4} />
          <circle cx={cx + 21} cy={41} r={7.4} />
        </>
      ),
    },
    {
      muscle: 'back',
      draw: (cx) => (
        <>
          {ellipse([cx, 39], ACROSS, 12.5, 5.6, 'traps')}
          {ellipse([cx - 9.5, 58], [0.22, -1], 15, 8, 'll')}
          {ellipse([cx + 9.5, 58], [-0.22, -1], 15, 8, 'lr')}
        </>
      ),
    },
    {
      muscle: 'triceps',
      draw: (cx) => (
        <>
          <path d={capsule([cx - 24.5, 47], [cx - 29.5, 68], 5.4, 4.6)} />
          <path d={capsule([cx + 24.5, 47], [cx + 29.5, 68], 5.4, 4.6)} />
        </>
      ),
    },
    {
      muscle: 'glutes',
      draw: (cx) => (
        <>
          {ellipse([cx - 7.8, 94], UP, 8.4, 8.6, 'gl')}
          {ellipse([cx + 7.8, 94], UP, 8.4, 8.6, 'gr')}
        </>
      ),
    },
    {
      muscle: 'legs',
      draw: (cx) => (
        <>
          <path d={capsule([cx - 9.5, 106], [cx - 11, 134], 7.6, 6)} />
          <path d={capsule([cx + 9.5, 106], [cx + 11, 134], 7.6, 6)} />
          <path d={capsule([cx - 11, 145], [cx - 11.6, 162], 6, 4.4)} />
          <path d={capsule([cx + 11, 145], [cx + 11.6, 162], 6, 4.4)} />
        </>
      ),
    },
  ],
}

/** Which muscles can be tapped on each side (used by tests and the accessible names). */
export const BODY_MAP_MUSCLES: Record<Side, Muscle[]> = {
  front: REGIONS.front.map((r) => r.muscle),
  back: REGIONS.back.map((r) => r.muscle),
}

/** The plain mannequin silhouette both regions sit on. */
function Body({ cx }: { cx: number }) {
  const limbs = (sx: number) => (
    <>
      <circle cx={cx + sx * 21} cy={41} r={7.6} />
      <path d={capsule([cx + sx * 24.5, 46], [cx + sx * 29.5, 70], 5.8, 4.8)} />
      <path d={capsule([cx + sx * 29.5, 70], [cx + sx * 34, 96], 4.6, 3.4)} />
      <circle cx={cx + sx * 35} cy={101} r={4.1} />
      <path d={capsule([cx + sx * 9.5, 98], [cx + sx * 11, 138], 9.2, 6.6)} />
      <path d={capsule([cx + sx * 11, 138], [cx + sx * 12, 175], 6.4, 4)} />
      {ellipse([cx + sx * 13.5, 179], ACROSS, 5.6, 3.2, `foot${sx}`)}
    </>
  )
  return (
    <>
      {limbs(-1)}
      {limbs(1)}
      {ellipse([cx, 53], UP, 17, 20, 'rib')}
      <path d={capsule([cx, 60], [cx, 86], 13.5, 13.5)} />
      {ellipse([cx, 93], UP, 11, 17, 'pelvis')}
      <path d={capsule([cx, 26], [cx, 36], 4.4, 4.4)} />
      {ellipse([cx, 17], UP, 10.4, 8.6, 'head')}
    </>
  )
}

function Figure({ side, cx, selected, onToggle }: { side: Side; cx: number; selected: Set<Muscle>; onToggle?: (m: Muscle) => void }) {
  const interactive = !!onToggle
  return (
    <g>
      <Part cls="fig-body bm-body">
        <Body cx={cx} />
      </Part>
      {REGIONS[side].map(({ muscle, draw }) => {
        const on = selected.has(muscle)
        const label = MUSCLES.find((m) => m.id === muscle)!.label
        const keys = (e: KeyboardEvent) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault()
            onToggle?.(muscle)
          }
        }
        // Legs and shoulders show on both figures; only the front copy is announced and focusable.
        const duplicate = side === 'back' && BODY_MAP_MUSCLES.front.includes(muscle)
        return (
          <g
            key={muscle}
            className={`bm-region ${on ? 'is-on' : ''} ${interactive ? 'is-interactive' : ''}`}
            {...(interactive
              ? {
                  onClick: () => onToggle(muscle),
                  ...(duplicate
                    ? { 'aria-hidden': true }
                    : { role: 'checkbox', 'aria-checked': on, 'aria-label': label, tabIndex: 0, onKeyDown: keys }),
                }
              : {})}
          >
            {/* A wider invisible copy makes small muscles easy to tap. */}
            {interactive && <g className="bm-hit">{draw(cx)}</g>}
            <g className="bm-shape">{draw(cx)}</g>
          </g>
        )
      })}
    </g>
  )
}

export function BodyMap({
  selected,
  onToggle,
  size = 'lg',
  className,
}: {
  selected: Muscle[]
  onToggle?: (m: Muscle) => void
  size?: 'lg' | 'sm'
  className?: string
}) {
  const set = new Set(selected)
  const worked = listJoin(MUSCLES.filter((m) => set.has(m.id)).map((m) => m.label.toLowerCase()))
  return (
    <svg
      className={`bodymap bodymap--${size} ${className ?? ''}`}
      viewBox="0 0 200 196"
      {...(onToggle ? { role: 'group', 'aria-label': 'Muscles to train' } : { role: 'img', 'aria-label': worked ? `Worked: ${worked}` : 'No muscles worked' })}
    >
      <Figure side="front" cx={52} selected={set} onToggle={onToggle} />
      <Figure side="back" cx={148} selected={set} onToggle={onToggle} />
      {size === 'lg' && (
        <g className="bm-caption" aria-hidden="true">
          <text x={52} y={194} textAnchor="middle">
            Front
          </text>
          <text x={148} y={194} textAnchor="middle">
            Back
          </text>
        </g>
      )}
    </svg>
  )
}
