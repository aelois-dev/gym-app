import { describe, expect, it } from 'vitest'
import { coachNote } from './coach'
import { generatePlan } from './planner'
import { buildProgram } from './program'
import { adjustForReadiness, readiness } from './readiness'
import { RECOVERING, fatigue, lastTrained, recovering } from './recovery'
import type { HistoryEntry } from './storage'

const H = 3600e3
const now = new Date('2026-11-05T12:00:00').getTime()
const legDay = (hoursAgo: number, sets = 9): HistoryEntry => ({
  id: 'x',
  finishedAt: now - hoursAgo * H,
  name: 'Legs',
  muscles: ['legs'],
  durationSec: 1,
  targetMin: 45,
  setsDone: sets,
  totalSets: sets,
  exercises: [{ exerciseId: 'back-squat', name: 'Back Squat', setsDone: sets, sets, reps: 5 }],
})

describe('fatigue', () => {
  it('is high right after training and fades to zero over the window', () => {
    expect(fatigue([legDay(1)], now).legs).toBeGreaterThan(0.9)
    expect(fatigue([legDay(24)], now).legs).toBeCloseTo(0.5, 1)
    expect(fatigue([legDay(49)], now).legs).toBe(0)
    expect(fatigue([legDay(1)], now).chest).toBe(0)
  })
  it('recovers faster after fewer sets', () => {
    expect(fatigue([legDay(12, 2)], now).legs).toBeLessThan(fatigue([legDay(12, 9)], now).legs)
  })
  it('lists still-recovering muscles and when they were trained', () => {
    const f = fatigue([legDay(10)], now)
    expect(recovering(f, ['legs', 'chest'])).toEqual(['legs'])
    expect(f.legs).toBeGreaterThanOrEqual(RECOVERING)
    expect(lastTrained([legDay(10)], 'legs', now)).toBe(now - 10 * H)
  })
})

describe('readiness', () => {
  it('scores the check-in', () => {
    expect(readiness({ date: '', sleep: 1, soreness: 3, energy: 1 })).toBe('low')
    expect(readiness({ date: '', sleep: 3, soreness: 1, energy: 3 })).toBe('high')
    expect(readiness({ date: '', sleep: 2, soreness: 2, energy: 2 })).toBe('normal')
    expect(readiness(null)).toBe('normal')
  })
  it('makes low days lighter: a set fewer (min 2) and 30 s more rest', () => {
    const w = generatePlan({ muscles: ['chest'], minutes: 60, equipment: 'gym', goal: 'muscle', restCompound: 180, restIsolation: 120, warmup: false })
    const low = adjustForReadiness(w, 'low')
    low.items.forEach((it, i) => {
      expect(it.sets).toBe(Math.max(2, w.items[i].sets - 1))
      expect(it.restSec).toBe((w.items[i].restSec ?? 0) + 30)
    })
    expect(adjustForReadiness(w, 'normal').items).toEqual(w.items)
    expect(low.readiness).toBe('low')
  })
})

describe('coach with recovery and readiness', () => {
  const [push, pull, legs] = buildProgram({ daysPerWeek: 3, experience: 'some' })
  const base = { now, sessionsThisWeek: 1, targetPerWeek: 3 }
  it('suggests the next day when today’s muscles are still recovering', () => {
    const yesterday = legDay(20)
    yesterday.exercises.push({ exerciseId: 'hip-thrust', name: 'Hip Thrust', setsDone: 6, sets: 6, reps: 10 })
    const history = [yesterday]
    const n = coachNote({ ...base, day: legs, nextDay: push, history, fatigue: fatigue(history, now) })
    expect(n.rule).toBe('recovering')
    expect(n.action).toBe('skip-day')
    expect(n.text).toMatch(/push is the better choice/)
  })
  it('does not switch if the next day is just as tired', () => {
    const history = [legDay(30)]
    const n = coachNote({ ...base, day: pull, nextDay: push, history, fatigue: fatigue(history, now) })
    expect(n.rule).not.toBe('recovering')
  })
  it('explains a lighter day', () => {
    const n = coachNote({ ...base, day: push, nextDay: pull, history: [legDay(40)], readiness: 'low' })
    expect(n.rule).toBe('low-readiness')
  })
})
