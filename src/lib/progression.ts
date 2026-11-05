import { getExercise, type Muscle } from '../data/exercises'
import type { Workout } from './planner'
import type { FitnessGoal } from './profile'
import { startOfWeek } from './program'
import type { Readiness } from './readiness'
import { setsByMuscle } from './recovery'
import type { HistoryEntry } from './storage'
import { formatKg, tracksWeight, weightStep } from './weights'

export interface ExerciseSession {
  at: number
  /** Heaviest weight logged that session, if any. */
  topKg: number | null
  setsDone: number
  sets: number
  reps: number
}

/** Every session where this exercise got at least one set, oldest first. */
export function exerciseSessions(history: HistoryEntry[], exerciseId: string): ExerciseSession[] {
  const out: ExerciseSession[] = []
  for (const h of history) {
    for (const e of h.exercises) {
      if (e.exerciseId !== exerciseId || e.setsDone <= 0) continue
      const used = (e.weights ?? []).filter((w): w is number => typeof w === 'number')
      out.push({ at: h.finishedAt, topKg: used.length ? Math.max(...used) : null, setsDone: e.setsDone, sets: e.sets, reps: e.reps })
    }
  }
  return out.sort((a, b) => a.at - b.at)
}

export interface Suggestion {
  kg: number
  reason: string
}

const complete = (s: ExerciseSession) => s.setsDone >= s.sets
const roundTo = (kg: number, step: number) => Math.max(0, Math.round(kg / step) * step)

/**
 * Double progression: finished every set last time → one step heavier; missed sets → same weight;
 * missed sets twice running at the same weight → 10% lighter. Low-readiness days never go up.
 */
export function suggestWeight(history: HistoryEntry[], exerciseId: string, readiness: Readiness = 'normal'): Suggestion | null {
  const kit = getExercise(exerciseId).kit
  if (!tracksWeight(kit)) return null
  const sessions = exerciseSessions(history, exerciseId).filter((s) => s.topKg !== null)
  const last = sessions.at(-1)
  if (!last || last.topKg === null) return null
  const step = weightStep(kit)
  const prev = sessions.at(-2)
  if (complete(last)) {
    if (readiness === 'low') return { kg: last.topKg, reason: 'Same as last time: an easier day' }
    return { kg: roundTo(last.topKg + step, step), reason: `+${formatKg(step)} kg: you finished every set last time` }
  }
  if (prev && !complete(prev) && prev.topKg === last.topKg) {
    // Round down so the drop is at least 10%.
    return { kg: Math.max(0, Math.floor((last.topKg * 0.9) / step) * step), reason: '10% lighter: two sessions short of your sets' }
  }
  return { kg: last.topKg, reason: 'Same weight: finish every set, then go up' }
}

/** Fill each weighted exercise with the coach's suggestion (falling back to the last weight used). */
export function withSuggestedWeights(w: Workout, history: HistoryEntry[], last: Record<string, number>, readiness: Readiness = 'normal'): Workout {
  return {
    ...w,
    items: w.items.map((it) => {
      if (it.weightKg !== undefined) return it
      const ex = getExercise(it.exerciseId)
      if (!tracksWeight(ex.kit)) return it
      const s = suggestWeight(history, it.exerciseId, readiness)
      if (s) return { ...it, weightKg: s.kg, weightNote: s.reason }
      return last[it.exerciseId] !== undefined ? { ...it, weightKg: last[it.exerciseId] } : it
    }),
  }
}

/** Estimated one-rep max (Epley). */
export function e1rm(kg: number, reps: number): number {
  return reps <= 1 ? kg : kg * (1 + reps / 30)
}

export interface PersonalRecord {
  exerciseId: string
  bestKg: number
  reps: number
  at: number
  e1rm: number
  sessions: number
}

/** Best logged weight per exercise, heaviest estimated 1RM first. */
export function personalRecords(history: HistoryEntry[]): PersonalRecord[] {
  const ids = new Set(history.flatMap((h) => h.exercises.map((e) => e.exerciseId).filter((x): x is string => !!x)))
  const out: PersonalRecord[] = []
  for (const id of ids) {
    const sessions = exerciseSessions(history, id).filter((s) => s.topKg !== null)
    if (!sessions.length) continue
    const best = sessions.reduce((a, b) => (e1rm(b.topKg!, b.reps) > e1rm(a.topKg!, a.reps) ? b : a))
    out.push({ exerciseId: id, bestKg: best.topKg!, reps: best.reps, at: best.at, e1rm: e1rm(best.topKg!, best.reps), sessions: sessions.length })
  }
  return out.sort((a, b) => b.e1rm - a.e1rm)
}

/** Weekly hard sets per muscle that research suggests for each goal (low end to high end). */
export const WEEKLY_SETS: Record<FitnessGoal, [number, number]> = {
  muscle: [10, 20],
  strength: [6, 12],
  fatloss: [8, 16],
  general: [6, 12],
}

export function weeklySets(history: HistoryEntry[], now = Date.now()): Record<Muscle, number> {
  const out = { chest: 0, back: 0, shoulders: 0, biceps: 0, triceps: 0, legs: 0, glutes: 0, core: 0 } as Record<Muscle, number>
  const from = startOfWeek(now)
  for (const h of history) {
    if (h.finishedAt < from) continue
    for (const [m, n] of Object.entries(setsByMuscle(h)) as [Muscle, number][]) out[m] += n
  }
  return out
}
