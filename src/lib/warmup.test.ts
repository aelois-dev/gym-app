import { describe, expect, it } from 'vitest'
import { warmupMinutes, warmupParts } from './warmup'

describe('warmupParts', () => {
  it.each([5, 10, 15])('adds up to %i minutes in four parts', (min) => {
    const parts = warmupParts(min, ['chest', 'legs'])
    expect(parts).toHaveLength(4)
    expect(parts.reduce((n, p) => n + p.sec, 0)).toBe(min * 60)
    for (const p of parts) expect(p.sec % 15).toBe(0)
    // Cardio gets the biggest share.
    expect(parts[0].sec).toBeGreaterThan(parts[1].sec)
  })

  it('matches mobility to the day', () => {
    const lower = warmupParts(10, ['legs', 'glutes', 'core']).map((p) => p.title)
    expect(lower).toContain('Hip and ankle mobility')
    expect(lower).not.toContain('Upper-body mobility')
    const upper = warmupParts(10, ['chest', 'triceps']).map((p) => p.title)
    expect(upper).toContain('Shoulder and upper-back mobility')
    expect(upper).not.toContain('Lower-body mobility')
  })

  it('names the first lift for the ramp-up sets', () => {
    expect(warmupParts(10, ['chest'], 'Barbell Bench Press').at(-1)!.detail).toContain('Barbell Bench Press')
  })

  it('defaults older workouts to 10 minutes', () => {
    expect(warmupMinutes({ warmup: true })).toBe(10)
    expect(warmupMinutes({ warmup: true, warmupMin: 15 })).toBe(15)
    expect(warmupMinutes({ warmup: false, warmupMin: 15 })).toBe(0)
  })
})
