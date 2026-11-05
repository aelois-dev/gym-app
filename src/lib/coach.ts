import { muscleLabel } from '../data/exercises'
import type { ProgramDay } from './program'
import type { HistoryEntry } from './storage'
import { listJoin } from './text'

export interface CoachContext {
  now: number
  day: ProgramDay
  history: HistoryEntry[]
  sessionsThisWeek: number
  targetPerWeek: number
}

export interface CoachNote {
  /** Which rule produced the note (for tests and analytics-free debugging). */
  rule: string
  text: string
}

const sameDay = (a: number, b: number) => new Date(a).toDateString() === new Date(b).toDateString()
const lower = (ms: string[]) => listJoin(ms.map((m) => muscleLabel(m as never).toLowerCase()))

/** One line of advice, picked by priority. Every note says why, in plain words. */
export function coachNote(ctx: CoachContext): CoachNote {
  const { now, day, history } = ctx
  if (history.some((h) => sameDay(h.finishedAt, now))) {
    return { rule: 'trained-today', text: `Good work today. Rest is part of the plan; ${day.name.toLowerCase()} is next.` }
  }
  if (history.length === 0) {
    return { rule: 'first-session', text: `Your first session is ${day.name.toLowerCase()}. Pick weights you could lift a few more times than asked.` }
  }
  if (ctx.sessionsThisWeek >= ctx.targetPerWeek) {
    return {
      rule: 'week-done',
      text: `That's ${ctx.sessionsThisWeek} of ${ctx.targetPerWeek} sessions this week. Anything more is a bonus.`,
    }
  }
  return { rule: 'program-day', text: `${day.name} today: ${lower(day.muscles)}.` }
}
