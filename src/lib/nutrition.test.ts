import { describe, expect, it } from 'vitest'
import { activityFactor, bmr, metTarget, targets } from './nutrition'
import { DEFAULT_PROFILE } from './profile'

describe('targets', () => {
  it('needs bodyweight for protein and water', () => {
    expect(targets(DEFAULT_PROFILE)).toEqual({ steps: 8000, sleepH: 8 })
    const t = targets({ ...DEFAULT_PROFILE, bodyweightKg: 80 })
    expect(t.proteinG).toBe(160) // 2.0 g/kg for building muscle
    expect(t.waterMl).toBe(2750) // 35 ml/kg, to the nearest 250 ml
    expect(t.kcal).toBeUndefined()
  })
  it('scales protein by goal', () => {
    expect(targets({ ...DEFAULT_PROFILE, bodyweightKg: 80, goal: 'general' }).proteinG).toBe(130) // 128 → nearest 5
    expect(targets({ ...DEFAULT_PROFILE, bodyweightKg: 80, goal: 'strength' }).proteinG).toBe(145) // 144
  })
  it('estimates calories with Mifflin-St Jeor, activity and goal', () => {
    const p = { ...DEFAULT_PROFILE, bodyweightKg: 80, heightCm: 180, age: 30, sex: 'male' as const, daysPerWeek: 3, goal: 'fatloss' as const }
    expect(bmr({ bodyweightKg: 80, heightCm: 180, age: 30, sex: 'male' })).toBe(1780)
    expect(activityFactor(3)).toBe(1.55)
    expect(targets(p).kcal).toBe(2350) // 1780 × 1.55 × 0.85 = 2345 → nearest 50
    expect(bmr({ bodyweightKg: 60, heightCm: 165, age: 30, sex: 'female' })).toBeCloseTo(1320.25)
  })
  it('checks whether a day met a target', () => {
    const t = targets({ ...DEFAULT_PROFILE, bodyweightKg: 80 })
    expect(metTarget({ proteinG: 160, waterMl: 0, steps: 9000, sleepH: 7 }, 'proteinG', t)).toBe(true)
    expect(metTarget({ proteinG: 100, waterMl: 0, steps: 9000, sleepH: 7 }, 'proteinG', t)).toBe(false)
    expect(metTarget({ proteinG: 0, waterMl: 0, steps: 9000, sleepH: 7 }, 'sleepH', t)).toBe(true) // 7 h counts (target 8, at least 7)
    expect(metTarget(undefined, 'steps', t)).toBe(false)
  })
})
