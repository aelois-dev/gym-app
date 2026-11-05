import type { Muscle } from '../data/exercises'

export interface WarmupPart {
  title: string
  detail: string
  sec: number
}

export const WARMUP_OPTIONS = [5, 10, 15] as const
export const DEFAULT_WARMUP_MIN = 10

const UPPER: Muscle[] = ['chest', 'back', 'shoulders', 'biceps', 'triceps']
const LOWER: Muscle[] = ['legs', 'glutes']

/** Warm-up length in minutes for a workout, or 0 when it's off. Older workouts without a length use the default. */
export function warmupMinutes(w: { warmup: boolean; warmupMin?: number }): number {
  return w.warmup ? (w.warmupMin ?? DEFAULT_WARMUP_MIN) : 0
}

/**
 * The guided warm-up: easy cardio, two mobility blocks matched to the day's muscles,
 * then ramp-up sets of the first lift. Split 40/20/20/20, rounded to 15 s, summing to `minutes`.
 */
export function warmupParts(minutes: number, muscles: Muscle[], firstExercise?: string): WarmupPart[] {
  const total = Math.max(1, Math.round(minutes)) * 60
  const hasUpper = muscles.some((m) => UPPER.includes(m))
  const hasLower = muscles.some((m) => LOWER.includes(m))

  const upper = { title: 'Upper-body mobility', detail: 'Arm circles, band pull-aparts and slow push-ups' }
  const hips = { title: 'Hip and ankle mobility', detail: 'Leg swings, deep squat hold and ankle rocks' }
  const lower = { title: 'Lower-body mobility', detail: 'Bodyweight squats, leg swings and hip openers' }
  const thoracic = { title: 'Shoulder and upper-back mobility', detail: 'Wall slides, thoracic rotations and band dislocates' }

  const blocks = [
    { title: 'Easy cardio', detail: 'Bike, rower or brisk walk. Breathing up a little, still able to talk.' },
    hasUpper || !hasLower ? upper : hips,
    hasLower || !hasUpper ? lower : thoracic,
    { title: 'Ramp-up sets', detail: firstExercise ? `1–2 light sets of ${firstExercise}, building towards your first set` : '1–2 light sets of your first lift' },
  ]
  const share = [0.4, 0.2, 0.2]
  const secs = share.map((s) => Math.max(15, Math.round((total * s) / 15) * 15))
  secs.push(Math.max(15, total - secs.reduce((a, b) => a + b, 0)))
  return blocks.map((b, i) => ({ ...b, sec: secs[i] }))
}
