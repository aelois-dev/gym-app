import { getExercise } from '../data/exercises'
import { uid } from './planner'
import type { ActiveSession, HistoryEntry } from './storage'

export const setsDoneIn = (done: Record<string, number>) => Object.values(done).reduce((n, v) => n + v, 0)

/** A history entry for a session as it stands (finished, or ended early). */
export function sessionEntry(session: ActiveSession, now = Date.now()): HistoryEntry {
  const { workout, done } = session
  const weights = session.weights ?? {}
  return {
    id: uid(),
    finishedAt: now,
    name: workout.name,
    ...(workout.programDay ? { programDay: workout.programDay } : {}),
    ...(workout.presetId ? { presetId: workout.presetId } : {}),
    muscles: workout.muscles,
    durationSec: Math.round((now - session.startedAt) / 1000),
    targetMin: workout.targetMin,
    setsDone: setsDoneIn(done),
    totalSets: workout.items.reduce((n, i) => n + i.sets, 0),
    exercises: workout.items.map((it) => {
      const ex = getExercise(it.exerciseId)
      return {
        exerciseId: ex.id,
        name: ex.name,
        setsDone: done[it.uid] ?? 0,
        sets: it.sets,
        reps: it.reps,
        ...(ex.timed ? { timed: true } : {}),
        ...(weights[it.uid]?.some((w) => w !== null) ? { weights: weights[it.uid] } : {}),
      }
    }),
  }
}
