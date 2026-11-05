import { describe, expect, it } from 'vitest'
import { MUSCLES } from '../data/exercises'
import { workedMuscles } from '../lib/worked'
import { BODY_MAP_MUSCLES } from './BodyMap'

describe('body map', () => {
  it('lets you tap every muscle group on at least one side', () => {
    const tappable = new Set([...BODY_MAP_MUSCLES.front, ...BODY_MAP_MUSCLES.back])
    for (const m of MUSCLES) expect(tappable.has(m.id), m.id).toBe(true)
  })
  it('shows front muscles on the front and back muscles on the back', () => {
    expect(BODY_MAP_MUSCLES.front).toEqual(expect.arrayContaining(['chest', 'biceps', 'core']))
    expect(BODY_MAP_MUSCLES.back).toEqual(expect.arrayContaining(['back', 'triceps', 'glutes']))
    expect(BODY_MAP_MUSCLES.front).not.toContain('back')
  })
})

describe('workedMuscles', () => {
  const base = { id: 'x', finishedAt: 0, name: 'W', durationSec: 60, targetMin: 45, totalSets: 6 }
  it('lights only muscles with a completed set', () => {
    const entry = {
      ...base,
      muscles: ['chest', 'triceps'] as const,
      setsDone: 3,
      exercises: [
        { exerciseId: 'bench-press', name: 'Bench', setsDone: 3, sets: 3, reps: 10 },
        { exerciseId: 'cable-pushdown', name: 'Pushdown', setsDone: 0, sets: 3, reps: 10 },
      ],
    }
    expect(workedMuscles({ ...entry, muscles: [...entry.muscles] })).toEqual(['chest'])
  })
  it('falls back to the planned muscles for entries saved before exercise ids', () => {
    const entry = { ...base, muscles: ['legs' as const], setsDone: 2, exercises: [{ name: 'Squat', setsDone: 2, sets: 3, reps: 5 }] }
    expect(workedMuscles(entry)).toEqual(['legs'])
  })
})
