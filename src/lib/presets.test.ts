import { describe, expect, it } from 'vitest'
import { getExercise } from '../data/exercises'
import { adjustForReadiness } from './readiness'
import type { PlanInput } from './planner'
import { dayPresets, defaultPreset, lineupToSave, presetUsage, quickPresets, seededRandom, usageLabel } from './presets'
import type { ProgramDay } from './program'
import type { HistoryEntry } from './storage'

const input: PlanInput = { muscles: [], minutes: 60, equipment: 'gym', goal: 'muscle', restCompound: 180, restIsolation: 120, warmup: true, warmupMin: 10 }
const push: ProgramDay = { id: 'push', name: 'Push', muscles: ['chest', 'shoulders', 'triceps'] }
const ids = (w: { items: { exerciseId: string }[] }) => w.items.map((i) => i.exerciseId)

const entry = (presetId: string | undefined, finishedAt: number, programDay = 'push'): HistoryEntry => ({
  id: String(finishedAt),
  finishedAt,
  name: 'x',
  programDay,
  ...(presetId ? { presetId } : {}),
  muscles: [],
  durationSec: 1,
  targetMin: 1,
  setsDone: 1,
  totalSets: 1,
  exercises: [],
})

describe('seededRandom', () => {
  it('repeats for the same seed and differs between seeds', () => {
    const a = seededRandom('push:barbell')
    const b = seededRandom('push:barbell')
    const c = seededRandom('push:dumbbell')
    const xs = [a(), a(), a()]
    expect([b(), b(), b()]).toEqual(xs)
    expect(c()).not.toBe(xs[0])
    for (const x of xs) expect(x).toBeGreaterThanOrEqual(0)
  })
})

describe('dayPresets', () => {
  it('gives the same three workouts every time', () => {
    const one = dayPresets(input, push, {})
    const two = dayPresets(input, push, {})
    expect(one.map((p) => p.id)).toEqual(['push:barbell', 'push:dumbbell', 'push:machine'])
    expect(one.map((p) => ids(p.workout))).toEqual(two.map((p) => ids(p.workout)))
    expect(one[0].workout.presetId).toBe('push:barbell')
    expect(one[0].workout.name).toBe('Push (barbell focus)')
  })

  it('makes the versions different and true to their kit', () => {
    const [bar, db, mach] = dayPresets(input, push, {})
    expect(ids(bar.workout)).not.toEqual(ids(db.workout))
    expect(ids(db.workout)).not.toEqual(ids(mach.workout))
    const share = (w: typeof bar.workout, kits: string[]) => w.items.filter((i) => kits.includes(getExercise(i.exerciseId).kit)).length / w.items.length
    expect(share(bar.workout, ['barbell'])).toBeGreaterThanOrEqual(0.5)
    expect(share(db.workout, ['dumbbell'])).toBeGreaterThanOrEqual(0.5)
    expect(share(mach.workout, ['machine', 'cable'])).toBeGreaterThanOrEqual(0.5)
  })

  it('covers every muscle of the day in every version, for every equipment mode', () => {
    for (const equipment of ['gym', 'dumbbell', 'bodyweight'] as const) {
      for (const p of dayPresets({ ...input, equipment }, push, {})) {
        const worked = new Set(p.workout.items.map((i) => getExercise(i.exerciseId).muscle))
        for (const m of push.muscles) expect(worked.has(m), `${p.id} ${m}`).toBe(true)
      }
    }
  })

  it('shares presets between repeated days and uses a saved line-up when there is one', () => {
    const again = dayPresets(input, { ...push, id: 'push-2' }, {})
    expect(again[0].id).toBe('push:barbell')
    const saved = { 'push:barbell': [{ exerciseId: 'push-up', sets: 4, reps: 12, restSec: 90 }, { exerciseId: 'gone-from-db', sets: 3, reps: 10 }] }
    const w = dayPresets(input, push, saved)[0].workout
    expect(w.items.map((i) => [i.exerciseId, i.sets, i.reps, i.restSec])).toEqual([['push-up', 4, 12, 90]])
  })
})

describe('quickPresets', () => {
  it('is stable and keyed by equipment', () => {
    const a = quickPresets(input, {})
    expect(a.map((p) => p.name)).toEqual(['Upper body', 'Lower body', 'Full body', 'Push', 'Pull', 'Arms'])
    expect(a.map((p) => ids(p.workout))).toEqual(quickPresets(input, {}).map((p) => ids(p.workout)))
    expect(quickPresets({ ...input, equipment: 'dumbbell' }, {})[0].id).toBe('quick:upper:dumbbell')
  })
})

describe('usage', () => {
  const day = new Date(2026, 10, 2, 18).getTime()
  const history = [entry('push:dumbbell', day + 2e5), entry('push:barbell', day + 1e5), entry('push:barbell', day), entry(undefined, day - 1e5)]

  it('counts and dates past sessions', () => {
    expect(presetUsage(history, 'push:barbell')).toEqual({ count: 2, lastAt: day + 1e5 })
    expect(presetUsage(history, 'push:machine')).toEqual({ count: 0, lastAt: null })
    expect(usageLabel({ count: 0, lastAt: null })).toBe('Not done yet')
    expect(usageLabel({ count: 1, lastAt: day })).toMatch(/^Done once, on 2 Nov|^Done once, on Nov 2/)
    expect(usageLabel({ count: 3, lastAt: day })).toMatch(/^Done 3 times, last on /)
  })

  it('picks the one last done for the day by default', () => {
    const presets = dayPresets(input, push, {})
    expect(defaultPreset(presets, history, 'push').id).toBe('push:dumbbell')
    expect(defaultPreset(presets, history, 'push-2').id).toBe('push:barbell')
    expect(defaultPreset(presets, [], 'push').id).toBe('push:barbell')
  })
})

describe('lineupToSave', () => {
  it('stores exercises, sets, reps and rest but not weights', () => {
    const w = dayPresets(input, push, {})[0].workout
    const withKg = { ...w, items: w.items.map((i) => ({ ...i, weightKg: 50, weightNote: 'x' })) }
    const saved = lineupToSave(withKg)
    expect(saved).toHaveLength(w.items.length)
    expect(Object.keys(saved[0]).sort()).toEqual(['exerciseId', 'reps', 'restSec', 'sets'])
  })

  it('does not store the lighter sets of a low day', () => {
    const w = dayPresets(input, push, {})[0].workout
    const stored = lineupToSave(w)
    // Including exercises already at the 2-set floor, which a low day leaves alone.
    expect(lineupToSave(adjustForReadiness(w, 'low'))).toEqual(stored)
    const lowTwice = adjustForReadiness(adjustForReadiness(w, 'low'), 'low')
    expect(lineupToSave(lowTwice)).toEqual(stored)
  })
})
