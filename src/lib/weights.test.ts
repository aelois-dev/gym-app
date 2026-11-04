import { describe, expect, it } from 'vitest'
import { getExercise } from '../data/exercises'
import { generatePlan } from './planner'
import { formatWeights, parseKg, tracksWeight, weightLabel, weightStep, withLastWeights } from './weights'

describe('weight labels', () => {
  it('describes the load for each kind of equipment', () => {
    expect(weightLabel('dumbbell')).toBe('kg per dumbbell')
    expect(weightLabel('barbell')).toBe('kg total, bar and plates')
    expect(weightLabel('machine')).toBe('kg on the stack')
    expect(weightLabel('cable')).toBe('kg on the stack')
    expect(tracksWeight('bodyweight')).toBe(false)
    expect(weightStep('barbell')).toBe(2.5)
    expect(weightStep('dumbbell')).toBe(1)
    expect(weightStep('machine')).toBe(5)
  })
})

describe('parsing and formatting', () => {
  it('parses typed weights', () => {
    expect(parseKg('22.5')).toBe(22.5)
    expect(parseKg('22,5')).toBe(22.5)
    expect(parseKg('')).toBeUndefined()
    expect(parseKg('abc')).toBeUndefined()
  })
  it('summarises the weights across sets', () => {
    expect(formatWeights([20, 20, 20])).toBe('20 kg')
    expect(formatWeights([20, null, 25])).toBe('20–25 kg')
    expect(formatWeights([null])).toBeNull()
    expect(formatWeights(undefined)).toBeNull()
  })
})

describe('withLastWeights', () => {
  it('fills remembered weights for weighted exercises only, keeping ones already set', () => {
    const w = generatePlan({ muscles: ['chest', 'core'], minutes: 90, equipment: 'gym', goal: 'muscle', restCompound: 180, restIsolation: 120, warmup: false })
    const last = Object.fromEntries(w.items.map((i) => [i.exerciseId, 40]))
    const preset = { ...w, items: w.items.map((i, k) => (k === 0 ? { ...i, weightKg: 10 } : i)) }
    const filled = withLastWeights(preset, last)
    filled.items.forEach((it, k) => {
      const kit = getExercise(it.exerciseId).kit
      if (k === 0) expect(it.weightKg).toBe(10)
      else expect(it.weightKg).toBe(tracksWeight(kit) ? 40 : undefined)
    })
  })
})
