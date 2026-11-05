import { describe, expect, it } from 'vitest'
import { generatePlan } from './planner'
import { sessionEntry } from './session'
import { buildSteps } from '../screens/Session'

const w = { ...generatePlan({ muscles: ['chest'], minutes: 45, equipment: 'gym', goal: 'muscle', restCompound: 180, restIsolation: 120, warmup: true, warmupMin: 10 }), presetId: 'quick:push:gym', programDay: 'push' }

describe('sessionEntry', () => {
  it('records sets done, weights and the preset', () => {
    const [a, b] = w.items
    const e = sessionEntry({ workout: w, stepIndex: 3, startedAt: 1000, endAt: null, done: { [a.uid]: 2 }, weights: { [a.uid]: [40, 42.5], [b.uid]: [null] } }, 61000)
    expect(e.presetId).toBe('quick:push:gym')
    expect(e.programDay).toBe('push')
    expect(e.durationSec).toBe(60)
    expect(e.setsDone).toBe(2)
    expect(e.totalSets).toBe(w.items.reduce((n, i) => n + i.sets, 0))
    expect(e.exercises[0]).toMatchObject({ exerciseId: a.exerciseId, setsDone: 2, weights: [40, 42.5] })
    expect(e.exercises[1].weights).toBeUndefined()
  })
})

describe('buildSteps', () => {
  it('has one step per warm-up part, then the sets', () => {
    const steps = buildSteps(w)
    expect(steps.slice(0, 4).map((s) => s.kind)).toEqual(['warmup', 'warmup', 'warmup', 'warmup'])
    expect(steps[4]).toEqual({ kind: 'work', item: 0, set: 1 })
    expect(buildSteps({ ...w, warmup: false })[0].kind).toBe('work')
  })
})
