import { getExercise, type Muscle } from '../data/exercises'
import type { HistoryEntry } from './storage'

/** Muscles that got at least one completed set. Older entries without exercise ids fall back to the plan's muscles. */
export function workedMuscles(entry: HistoryEntry): Muscle[] {
  const known = entry.exercises.filter((e) => e.exerciseId)
  if (known.length === 0) return entry.setsDone > 0 ? entry.muscles : []
  const set = new Set<Muscle>()
  for (const e of known) if (e.setsDone > 0) set.add(getExercise(e.exerciseId!).muscle)
  return [...set]
}
