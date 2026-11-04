import { getExercise, type Kit } from '../data/exercises'
import type { Workout } from './planner'

/** What the logged number means for each kind of equipment. Bodyweight moves have no load. */
const WEIGHT_INFO: Record<Kit, { label: string; step: number } | null> = {
  dumbbell: { label: 'kg per dumbbell', step: 1 },
  barbell: { label: 'kg total, bar and plates', step: 2.5 },
  machine: { label: 'kg on the stack', step: 5 },
  cable: { label: 'kg on the stack', step: 2.5 },
  bodyweight: null,
}

export function tracksWeight(kit: Kit): boolean {
  return WEIGHT_INFO[kit] !== null
}

export function weightLabel(kit: Kit): string {
  return WEIGHT_INFO[kit]?.label ?? ''
}

export function weightStep(kit: Kit): number {
  return WEIGHT_INFO[kit]?.step ?? 1
}

/** "22.5", "20" — no trailing zeros, at most two decimals. */
export function formatKg(kg: number): string {
  return String(Math.round(kg * 100) / 100)
}

/** Summarise the weights used across sets: "22.5 kg" or "20–25 kg". */
export function formatWeights(weights: (number | null | undefined)[] | undefined): string | null {
  const used = (weights ?? []).filter((w): w is number => typeof w === 'number')
  if (used.length === 0) return null
  const lo = Math.min(...used)
  const hi = Math.max(...used)
  return lo === hi ? `${formatKg(lo)} kg` : `${formatKg(lo)}–${formatKg(hi)} kg`
}

/** Parse what the user typed; blank or invalid means "not recorded". */
export function parseKg(text: string): number | undefined {
  const n = Number(text.replace(',', '.').trim())
  return text.trim() === '' || !Number.isFinite(n) || n < 0 ? undefined : Math.round(n * 100) / 100
}

/** Fill in each exercise's weight from what the user last lifted, unless the plan already has one. */
export function withLastWeights(workout: Workout, last: Record<string, number>): Workout {
  return {
    ...workout,
    items: workout.items.map((it) => {
      if (it.weightKg !== undefined || !tracksWeight(getExercise(it.exerciseId).kit)) return it
      const kg = last[it.exerciseId]
      return kg === undefined ? it : { ...it, weightKg: kg }
    }),
  }
}
