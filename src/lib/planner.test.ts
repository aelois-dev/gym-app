import { describe, expect, it } from 'vitest'
import { EXERCISES, KITS_FOR_MODE, MUSCLES, getExercise, type EquipmentMode } from '../data/exercises'
import {
  addCandidates,
  estimateSeconds,
  formatClock,
  generatePlan,
  poolFor,
  swapCandidates,
  type PlanInput,
} from './planner'

function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 2 ** 32
    return seed / 2 ** 32
  }
}

const base: PlanInput = {
  muscles: ['chest', 'triceps'],
  minutes: 45,
  equipment: 'gym',
  goal: 'muscle',
  restSec: 75,
  warmup: true,
}

describe('exercise data', () => {
  it('has unique ids', () => {
    expect(new Set(EXERCISES.map((e) => e.id)).size).toBe(EXERCISES.length)
  })
  it('has at least 2 options per muscle for every equipment mode', () => {
    for (const m of MUSCLES) {
      for (const mode of ['gym', 'dumbbell', 'bodyweight'] as EquipmentMode[]) {
        expect(poolFor(m.id, mode).length, `${m.id}/${mode}`).toBeGreaterThanOrEqual(2)
      }
    }
  })
})

describe('generatePlan', () => {
  it('fits within the time budget across many inputs', () => {
    for (let s = 1; s < 60; s++) {
      const rand = seeded(s)
      const minutes = 20 + Math.floor(rand() * 100)
      const input: PlanInput = {
        ...base,
        minutes,
        muscles: MUSCLES.filter(() => rand() > 0.5).map((m) => m.id),
        restSec: 30 + Math.floor(rand() * 150),
        goal: (['strength', 'muscle', 'endurance'] as const)[s % 3],
        equipment: (['gym', 'dumbbell', 'bodyweight'] as const)[s % 3],
      }
      if (input.muscles.length === 0) input.muscles = ['back']
      const w = generatePlan(input, seeded(s))
      expect(w.items.length).toBeGreaterThan(0)
      if (w.items.length > 1) expect(estimateSeconds(w)).toBeLessThanOrEqual(minutes * 60)
    }
  })

  it('uses most of the available time', () => {
    const w = generatePlan({ ...base, minutes: 60 }, seeded(3))
    expect(estimateSeconds(w)).toBeGreaterThan(60 * 60 * 0.75)
  })

  it('respects equipment', () => {
    for (const mode of ['dumbbell', 'bodyweight'] as EquipmentMode[]) {
      const w = generatePlan({ ...base, equipment: mode, muscles: ['chest', 'back', 'legs'], minutes: 90 }, seeded(7))
      for (const it of w.items) expect(KITS_FOR_MODE[mode]).toContain(getExercise(it.exerciseId).kit)
    }
  })

  it('prefers the chosen equipment over bodyweight fallbacks', () => {
    for (let s = 1; s < 20; s++) {
      const w = generatePlan({ ...base, equipment: 'dumbbell', muscles: ['chest', 'triceps'], minutes: 45 }, seeded(s))
      const kits = w.items.map((i) => getExercise(i.exerciseId).kit)
      expect(kits.filter((k) => k === 'dumbbell').length).toBeGreaterThanOrEqual(Math.ceil(kits.length / 2))
    }
  })

  it('mixes compound and isolation work', () => {
    const w = generatePlan({ ...base, muscles: ['chest'], minutes: 60 }, seeded(8))
    const compounds = w.items.filter((i) => getExercise(i.exerciseId).compound).length
    expect(compounds).toBeGreaterThan(0)
    expect(compounds).toBeLessThan(w.items.length)
  })

  it('covers every selected muscle when time allows', () => {
    const muscles = ['chest', 'back', 'shoulders', 'legs'] as const
    const w = generatePlan({ ...base, muscles: [...muscles], minutes: 60 }, seeded(11))
    const hit = new Set(w.items.map((i) => getExercise(i.exerciseId).muscle))
    for (const m of muscles) expect(hit.has(m)).toBe(true)
  })

  it('more time gives more work', () => {
    const short = generatePlan({ ...base, minutes: 25 }, seeded(5))
    const long = generatePlan({ ...base, minutes: 90 }, seeded(5))
    expect(estimateSeconds(long)).toBeGreaterThan(estimateSeconds(short))
  })

  it('never repeats an exercise', () => {
    const w = generatePlan({ ...base, muscles: ['biceps'], minutes: 120 }, seeded(2))
    expect(new Set(w.items.map((i) => i.exerciseId)).size).toBe(w.items.length)
  })

  it('applies goal presets with compound bonus', () => {
    const w = generatePlan({ ...base, goal: 'strength', minutes: 30, muscles: ['legs'] }, seeded(1))
    const first = w.items[0]
    const ex = getExercise(first.exerciseId)
    expect(ex.compound).toBe(true)
    expect(first.reps).toBe(5)
    expect(first.sets).toBeGreaterThanOrEqual(5)
  })
})

describe('estimateSeconds', () => {
  it('reacts to sets, reps and rest edits', () => {
    const w = generatePlan(base, seeded(9))
    const t0 = estimateSeconds(w)
    const moreSets = { ...w, items: w.items.map((i, k) => (k === 0 ? { ...i, sets: i.sets + 1 } : i)) }
    const moreReps = { ...w, items: w.items.map((i, k) => (k === 0 ? { ...i, reps: i.reps + 5 } : i)) }
    expect(estimateSeconds(moreSets)).toBeGreaterThan(t0)
    expect(estimateSeconds(moreReps)).toBeGreaterThan(t0)
    expect(estimateSeconds({ ...w, restSec: w.restSec + 30 })).toBeGreaterThan(t0)
    expect(estimateSeconds({ ...w, warmup: false })).toBe(t0 - 300)
  })
})

describe('candidates', () => {
  it('swap candidates share muscle and equipment and are unused', () => {
    const w = generatePlan({ ...base, equipment: 'dumbbell' }, seeded(4))
    const target = w.items[0].exerciseId
    const muscle = getExercise(target).muscle
    const cands = swapCandidates(w, target)
    expect(cands.length).toBeGreaterThan(0)
    const used = new Set(w.items.map((i) => i.exerciseId))
    for (const c of cands) {
      expect(c.muscle).toBe(muscle)
      expect(KITS_FOR_MODE.dumbbell).toContain(c.kit)
      expect(used.has(c.id)).toBe(false)
    }
  })
  it('add candidates exclude exercises in the plan', () => {
    const w = generatePlan(base, seeded(4))
    const used = new Set(w.items.map((i) => i.exerciseId))
    expect(addCandidates(w).some((c) => used.has(c.id))).toBe(false)
  })
})

describe('formatClock', () => {
  it('formats', () => {
    expect(formatClock(0)).toBe('0:00')
    expect(formatClock(75)).toBe('1:15')
    expect(formatClock(3725)).toBe('1:02:05')
  })
})
