import type { EquipmentMode } from '../data/exercises'
import type { Goal } from './planner'

export type FitnessGoal = 'muscle' | 'strength' | 'fatloss' | 'general'
export type Experience = 'new' | 'some' | 'experienced'
export type Sex = 'female' | 'male'

export interface Profile {
  goal: FitnessGoal
  experience: Experience
  /** Training days per week, 2–6. */
  daysPerWeek: number
  sessionMin: number
  equipment: EquipmentMode
  bodyweightKg?: number
  heightCm?: number
  age?: number
  sex?: Sex
}

export const DEFAULT_PROFILE: Profile = {
  goal: 'muscle',
  experience: 'some',
  daysPerWeek: 3,
  sessionMin: 45,
  equipment: 'gym',
}

export const GOAL_OPTIONS: { id: FitnessGoal; label: string; sub: string }[] = [
  { id: 'muscle', label: 'Build muscle', sub: 'Moderate weights, 8–12 reps, enough food' },
  { id: 'strength', label: 'Get stronger', sub: 'Heavier weights, fewer reps, longer rest' },
  { id: 'fatloss', label: 'Lose fat', sub: 'Keep lifting, eat a little less, move more' },
  { id: 'general', label: 'General fitness', sub: 'A bit of everything, feel better' },
]

export const EXPERIENCE_OPTIONS: { id: Experience; label: string; sub: string }[] = [
  { id: 'new', label: 'New to lifting', sub: 'Less than 6 months of regular training' },
  { id: 'some', label: 'Some experience', sub: '6 months to 2 years' },
  { id: 'experienced', label: 'Experienced', sub: 'More than 2 years' },
]

/** The rep scheme the planner should use for a fitness goal. */
export function planGoal(goal: FitnessGoal): Goal {
  return goal === 'strength' ? 'strength' : 'muscle'
}

export function goalLabel(goal: FitnessGoal): string {
  return GOAL_OPTIONS.find((g) => g.id === goal)!.label
}
