import { MUSCLES, getExercise, type Muscle } from '../data/exercises'
import type { HistoryEntry } from './storage'

/** Hours a muscle needs after a full session (6+ hard sets). Bigger muscles take longer. */
export const RECOVERY_HOURS: Record<Muscle, number> = {
  legs: 48,
  back: 48,
  chest: 48,
  glutes: 48,
  shoulders: 36,
  biceps: 36,
  triceps: 36,
  core: 36,
}

const FULL_SETS = 6
const HOUR = 3600e3

/** Sets completed per muscle in one workout. Older entries without exercise ids spread sets over the planned muscles. */
export function setsByMuscle(entry: HistoryEntry): Partial<Record<Muscle, number>> {
  const out: Partial<Record<Muscle, number>> = {}
  const known = entry.exercises.filter((e) => e.exerciseId)
  if (known.length === 0) {
    const each = entry.muscles.length ? entry.setsDone / entry.muscles.length : 0
    for (const m of entry.muscles) out[m] = each
    return out
  }
  for (const e of known) {
    if (e.setsDone <= 0) continue
    const m = getExercise(e.exerciseId!).muscle
    out[m] = (out[m] ?? 0) + e.setsDone
  }
  return out
}

/**
 * How fatigued each muscle still is, from 0 (fresh) to 1 (just trained hard).
 * Fatigue starts at the share of a full session's sets and fades over the recovery window,
 * which is shorter after fewer sets.
 */
export function fatigue(history: HistoryEntry[], now = Date.now()): Record<Muscle, number> {
  const out = Object.fromEntries(MUSCLES.map((m) => [m.id, 0])) as Record<Muscle, number>
  for (const h of history) {
    const hours = (now - h.finishedAt) / HOUR
    if (hours < 0 || hours > 72) continue
    for (const [m, sets] of Object.entries(setsByMuscle(h)) as [Muscle, number][]) {
      const load = Math.min(1, sets / FULL_SETS)
      const window = RECOVERY_HOURS[m] * (0.5 + 0.5 * load)
      const left = Math.max(0, 1 - hours / window)
      out[m] = Math.max(out[m], load * left)
    }
  }
  return out
}

export const RECOVERING = 0.35

export function recovering(f: Record<Muscle, number>, muscles: Muscle[]): Muscle[] {
  return muscles.filter((m) => f[m] >= RECOVERING)
}

/** When a muscle was last worked, if within the last 3 days. */
export function lastTrained(history: HistoryEntry[], muscle: Muscle, now = Date.now()): number | null {
  const hit = history
    .filter((h) => now - h.finishedAt < 72 * HOUR && (setsByMuscle(h)[muscle] ?? 0) > 0)
    .sort((a, b) => b.finishedAt - a.finishedAt)[0]
  return hit ? hit.finishedAt : null
}
