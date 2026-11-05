import type { Workout } from './planner'
import { restFor } from './planner'

export type Rating = 1 | 2 | 3
export type Readiness = 'low' | 'normal' | 'high'

export interface CheckIn {
  /** Local date, YYYY-MM-DD. */
  date: string
  /** 1 = poor, 3 = good. */
  sleep: Rating
  /** 1 = none, 3 = a lot. */
  soreness: Rating
  /** 1 = low, 3 = high. */
  energy: Rating
}

export function dateKey(t = Date.now()): string {
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function readiness(c: CheckIn | null | undefined): Readiness {
  if (!c) return 'normal'
  const score = c.sleep + c.energy + (4 - c.soreness) // 3..9
  if (score <= 5) return 'low'
  if (score >= 8) return 'high'
  return 'normal'
}

/** On a low day: one set fewer per exercise (never below 2) and 30 s more rest. Other days are unchanged. */
export function adjustForReadiness(w: Workout, r: Readiness): Workout {
  const tagged = { ...w, readiness: r }
  if (r !== 'low') return tagged
  return {
    ...tagged,
    items: w.items.map((it) => ({ ...it, sets: Math.max(2, it.sets - 1), restSec: restFor(it, w) + 30 })),
  }
}
