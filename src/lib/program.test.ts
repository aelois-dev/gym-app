import { describe, expect, it } from 'vitest'
import { coachNote } from './coach'
import { buildProgram, dayAt, programInput, programSummary } from './program'
import { DEFAULT_PROFILE, planGoal } from './profile'

describe('buildProgram', () => {
  it('makes one day per training day, with unique ids', () => {
    for (const daysPerWeek of [2, 3, 4, 5, 6]) {
      const p = buildProgram({ daysPerWeek, experience: 'some' })
      expect(p).toHaveLength(daysPerWeek)
      expect(new Set(p.map((d) => d.id)).size).toBe(daysPerWeek)
      for (const d of p) expect(d.muscles.length).toBeGreaterThan(0)
    }
  })
  it('gives new lifters full-body days at 3 a week, others push/pull/legs', () => {
    expect(buildProgram({ daysPerWeek: 3, experience: 'new' }).map((d) => d.name)).toEqual(['Full body A', 'Full body B', 'Full body C'])
    expect(buildProgram({ daysPerWeek: 3, experience: 'some' }).map((d) => d.name)).toEqual(['Push', 'Pull', 'Legs'])
    expect(programSummary(buildProgram({ daysPerWeek: 3, experience: 'some' }))).toBe('Push, pull and legs')
    expect(programSummary(buildProgram({ daysPerWeek: 4, experience: 'some' }))).toBe('Upper body and lower body')
  })
  it('covers every muscle across the week', () => {
    for (const daysPerWeek of [2, 3, 4, 5, 6]) {
      const hit = new Set(buildProgram({ daysPerWeek, experience: 'new' }).flatMap((d) => d.muscles))
      expect(hit.size, `${daysPerWeek} days`).toBe(8)
    }
  })
  it('rotates through the days', () => {
    const p = buildProgram({ daysPerWeek: 3, experience: 'some' })
    expect(dayAt(p, 0).name).toBe('Push')
    expect(dayAt(p, 4).name).toBe('Pull')
  })
})

describe('programInput', () => {
  it('uses the profile time, equipment and goal', () => {
    const p = { ...DEFAULT_PROFILE, sessionMin: 60, equipment: 'dumbbell' as const, goal: 'strength' as const }
    const input = programInput(p, buildProgram(p)[0], { restCompound: 150, restIsolation: 120, warmup: true })
    expect(input.minutes).toBe(60)
    expect(input.equipment).toBe('dumbbell')
    expect(input.goal).toBe('strength')
    expect(input.restCompound).toBe(180) // strength work gets at least 3:00
    expect(planGoal('fatloss')).toBe('muscle')
  })
})

describe('coachNote', () => {
  const day = buildProgram({ daysPerWeek: 3, experience: 'some' })[0]
  const now = new Date('2026-11-05T12:00:00').getTime()
  const entry = (finishedAt: number) => ({ id: 'h', finishedAt, name: 'Push', muscles: [], durationSec: 1, targetMin: 45, setsDone: 1, totalSets: 1, exercises: [] })
  it('welcomes a first session', () => {
    expect(coachNote({ now, day, history: [], sessionsThisWeek: 0, targetPerWeek: 3 }).rule).toBe('first-session')
  })
  it('says rest after training today', () => {
    expect(coachNote({ now, day, history: [entry(now - 3600e3)], sessionsThisWeek: 1, targetPerWeek: 3 }).rule).toBe('trained-today')
  })
  it('notes when the weekly target is met', () => {
    expect(coachNote({ now, day, history: [entry(now - 3 * 86400e3)], sessionsThisWeek: 3, targetPerWeek: 3 }).rule).toBe('week-done')
  })
  it('otherwise names the day', () => {
    const n = coachNote({ now, day, history: [entry(now - 2 * 86400e3)], sessionsThisWeek: 1, targetPerWeek: 3 })
    expect(n.text).toBe('Push today: chest, shoulders and triceps.')
  })
})
