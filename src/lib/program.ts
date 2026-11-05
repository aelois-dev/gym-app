import type { Muscle } from '../data/exercises'
import type { PlanInput, RestDefaults } from './planner'
import { planGoal, type Profile } from './profile'

export interface ProgramDay {
  id: string
  name: string
  muscles: Muscle[]
}

const DAY = {
  fullA: { name: 'Full body A', muscles: ['legs', 'chest', 'back', 'core'] },
  fullB: { name: 'Full body B', muscles: ['glutes', 'shoulders', 'back', 'triceps', 'biceps'] },
  fullC: { name: 'Full body C', muscles: ['legs', 'chest', 'shoulders', 'core'] },
  push: { name: 'Push', muscles: ['chest', 'shoulders', 'triceps'] },
  pull: { name: 'Pull', muscles: ['back', 'biceps', 'core'] },
  legs: { name: 'Legs', muscles: ['legs', 'glutes', 'core'] },
  upper: { name: 'Upper body', muscles: ['chest', 'back', 'shoulders', 'biceps', 'triceps'] },
  lower: { name: 'Lower body', muscles: ['legs', 'glutes', 'core'] },
} satisfies Record<string, { name: string; muscles: Muscle[] }>

type DayKey = keyof typeof DAY

function days(keys: DayKey[]): ProgramDay[] {
  const seen = new Map<DayKey, number>()
  return keys.map((k) => {
    const n = (seen.get(k) ?? 0) + 1
    seen.set(k, n)
    const repeats = keys.filter((x) => x === k).length > 1
    return { id: repeats ? `${k}-${n}` : k, name: DAY[k].name, muscles: [...DAY[k].muscles] }
  })
}

/** A weekly split for the number of days and experience level. Days run in rotation. */
export function buildProgram(p: Pick<Profile, 'daysPerWeek' | 'experience'>): ProgramDay[] {
  const d = Math.min(6, Math.max(2, Math.round(p.daysPerWeek)))
  switch (d) {
    case 2:
      return days(['fullA', 'fullB'])
    case 3:
      return p.experience === 'new' ? days(['fullA', 'fullB', 'fullC']) : days(['push', 'pull', 'legs'])
    case 4:
      return days(['upper', 'lower', 'upper', 'lower'])
    case 5:
      return days(['push', 'pull', 'legs', 'upper', 'lower'])
    default:
      return days(['push', 'pull', 'legs', 'push', 'pull', 'legs'])
  }
}

/** A short description of the split: "Push, pull and legs". */
export function programSummary(program: ProgramDay[]): string {
  const names = [...new Set(program.map((d) => d.name.replace(/ [ABC]$/, '')))]
  if (names.length === 1) return `${names[0]}, ${program.length} different days`
  const lower = names.map((n, i) => (i === 0 ? n : n.toLowerCase()))
  return lower.length === 2 ? lower.join(' and ') : `${lower.slice(0, -1).join(', ')} and ${lower.at(-1)}`
}

export function dayAt(program: ProgramDay[], index: number): ProgramDay {
  return program[((index % program.length) + program.length) % program.length]
}

/** Planner input for a program day using the profile's time, equipment and goal. */
export function programInput(profile: Profile, day: ProgramDay, rest: RestDefaults & { warmup: boolean; warmupMin?: number }): PlanInput {
  return {
    muscles: day.muscles,
    minutes: profile.sessionMin,
    equipment: profile.equipment,
    goal: planGoal(profile.goal),
    warmup: rest.warmup,
    warmupMin: rest.warmupMin,
    restCompound: profile.goal === 'strength' ? Math.max(rest.restCompound, 180) : rest.restCompound,
    restIsolation: rest.restIsolation,
    count: null,
  }
}

/** Monday 00:00 of the week containing `now`. */
export function startOfWeek(now = Date.now()): number {
  const x = new Date(now)
  const day = (x.getDay() + 6) % 7
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - day)
  return x.getTime()
}
