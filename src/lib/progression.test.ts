import { describe, expect, it } from 'vitest'
import { e1rm, exerciseSessions, personalRecords, suggestWeight, weeklySets, withSuggestedWeights } from './progression'
import { generatePlan } from './planner'
import type { HistoryEntry } from './storage'

const day = 86400e3
const t0 = new Date('2026-11-02T10:00:00').getTime() // a Monday
const bench = (at: number, kg: number, setsDone: number, sets = 3): HistoryEntry => ({
  id: String(at),
  finishedAt: at,
  name: 'Push',
  muscles: ['chest'],
  durationSec: 1,
  targetMin: 45,
  setsDone,
  totalSets: sets,
  exercises: [{ exerciseId: 'bench-press', name: 'Bench', setsDone, sets, reps: 10, weights: Array(setsDone).fill(kg) }],
})

describe('suggestWeight', () => {
  it('adds one step after a complete session', () => {
    expect(suggestWeight([bench(t0, 60, 3)], 'bench-press')).toEqual({ kg: 62.5, reason: '+2.5 kg: you finished every set last time' })
  })
  it('keeps the weight after missing sets once', () => {
    expect(suggestWeight([bench(t0, 60, 3), bench(t0 + day, 62.5, 2)], 'bench-press')?.kg).toBe(62.5)
  })
  it('drops 10% after missing sets twice at the same weight', () => {
    const s = suggestWeight([bench(t0, 62.5, 2), bench(t0 + day, 62.5, 2)], 'bench-press')
    expect(s?.kg).toBe(55) // 56.25 rounded to the 2.5 kg step
    expect(s?.reason).toMatch(/10% lighter/)
  })
  it('never goes up on a low day', () => {
    expect(suggestWeight([bench(t0, 60, 3)], 'bench-press', 'low')?.kg).toBe(60)
  })
  it('has nothing to say without history or for bodyweight moves', () => {
    expect(suggestWeight([], 'bench-press')).toBeNull()
    expect(suggestWeight([bench(t0, 60, 3)], 'push-up')).toBeNull()
  })
})

describe('withSuggestedWeights', () => {
  it('fills suggestions with their reason, then falls back to the last weight', () => {
    const w = generatePlan({ muscles: ['chest'], minutes: 90, equipment: 'gym', goal: 'muscle', restCompound: 180, restIsolation: 120, warmup: false })
    w.items[0] = { ...w.items[0], exerciseId: 'bench-press' }
    w.items[1] = { ...w.items[1], exerciseId: 'pec-deck' }
    const out = withSuggestedWeights(w, [bench(t0, 60, 3)], { 'pec-deck': 40 })
    expect(out.items[0].weightKg).toBe(62.5)
    expect(out.items[0].weightNote).toMatch(/\+2.5 kg/)
    expect(out.items[1].weightKg).toBe(40)
    expect(out.items[1].weightNote).toBeUndefined()
  })
})

describe('records and volume', () => {
  it('finds the best set by estimated 1RM', () => {
    const prs = personalRecords([bench(t0, 60, 3), bench(t0 + day, 70, 3)])
    expect(prs[0]).toMatchObject({ exerciseId: 'bench-press', bestKg: 70, sessions: 2 })
    expect(e1rm(100, 5)).toBeCloseTo(116.67, 1)
  })
  it('lists sessions oldest first', () => {
    expect(exerciseSessions([bench(t0 + day, 70, 3), bench(t0, 60, 3)], 'bench-press').map((s) => s.topKg)).toEqual([60, 70])
  })
  it('counts sets per muscle this week only', () => {
    const v = weeklySets([bench(t0, 60, 3), bench(t0 - 3 * day, 60, 3)], t0 + day)
    expect(v.chest).toBe(3)
    expect(v.legs).toBe(0)
  })
})
