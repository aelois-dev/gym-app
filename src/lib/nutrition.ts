import type { FitnessGoal, Profile } from './profile'

/** Grams of protein per kg of bodyweight per day, by goal. */
export const PROTEIN_PER_KG: Record<FitnessGoal, number> = { muscle: 2.0, fatloss: 2.0, strength: 1.8, general: 1.6 }
const CALORIE_GOAL: Record<FitnessGoal, number> = { muscle: 1.1, fatloss: 0.85, strength: 1.05, general: 1 }

export interface Targets {
  /** Missing when bodyweight is unknown. */
  proteinG?: number
  /** Missing unless bodyweight, height, age and sex are all known. */
  kcal?: number
  waterMl?: number
  steps: number
  sleepH: number
}

const roundTo = (n: number, step: number) => Math.round(n / step) * step

/** Activity multiplier from training days per week (light, moderate, very active). */
export function activityFactor(daysPerWeek: number): number {
  if (daysPerWeek <= 2) return 1.375
  if (daysPerWeek <= 4) return 1.55
  return 1.725
}

/** Resting energy use (Mifflin-St Jeor), kcal per day. */
export function bmr(p: Required<Pick<Profile, 'bodyweightKg' | 'heightCm' | 'age' | 'sex'>>): number {
  return 10 * p.bodyweightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === 'male' ? 5 : -161)
}

export function targets(p: Profile): Targets {
  const out: Targets = { steps: 8000, sleepH: 8 }
  if (p.bodyweightKg) {
    out.proteinG = roundTo(p.bodyweightKg * PROTEIN_PER_KG[p.goal], 5)
    out.waterMl = roundTo(p.bodyweightKg * 35, 250)
    if (p.heightCm && p.age && p.sex) {
      const tdee = bmr({ bodyweightKg: p.bodyweightKg, heightCm: p.heightCm, age: p.age, sex: p.sex }) * activityFactor(p.daysPerWeek)
      out.kcal = roundTo(tdee * CALORIE_GOAL[p.goal], 50)
    }
  }
  return out
}

export interface HabitDay {
  proteinG: number
  waterMl: number
  steps: number
  sleepH: number
}

export const EMPTY_DAY: HabitDay = { proteinG: 0, waterMl: 0, steps: 0, sleepH: 0 }

export type HabitKey = keyof HabitDay

/** Whether a day met the target for a habit (false when there is no target). */
export function metTarget(day: HabitDay | undefined, key: HabitKey, t: Targets): boolean {
  if (!day) return false
  const goal = { proteinG: t.proteinG, waterMl: t.waterMl, steps: t.steps, sleepH: t.sleepH ? t.sleepH - 1 : undefined }[key]
  return goal !== undefined && day[key] >= goal
}
