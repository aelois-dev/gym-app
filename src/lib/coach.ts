import { muscleLabel, type Muscle } from '../data/exercises'
import type { ProgramDay } from './program'
import type { Readiness } from './readiness'
import { recovering } from './recovery'
import type { HistoryEntry } from './storage'
import { capitalize, listJoin } from './text'

export interface CoachContext {
  now: number
  day: ProgramDay
  history: HistoryEntry[]
  sessionsThisWeek: number
  targetPerWeek: number
  /** The next day in the rotation (offered when today's muscles are still recovering). */
  nextDay?: ProgramDay
  /** Muscle fatigue, 0 fresh to 1 just trained. */
  fatigue?: Record<Muscle, number>
  readiness?: Readiness
}

export interface CoachNote {
  /** Which rule produced the note (for tests and analytics-free debugging). */
  rule: string
  text: string
  /** Something the Today screen can offer as a one-tap fix. */
  action?: 'skip-day'
}

const sameDay = (a: number, b: number) => new Date(a).toDateString() === new Date(b).toDateString()
const lower = (ms: string[]) => listJoin(ms.map((m) => muscleLabel(m as never).toLowerCase()))

/** One line of advice, picked by priority. Every note says why, in plain words. */
export function coachNote(ctx: CoachContext): CoachNote {
  const { now, day, history } = ctx
  if (history.some((h) => sameDay(h.finishedAt, now))) {
    return { rule: 'trained-today', text: `Good work today. Rest is part of the plan; ${day.name.toLowerCase()} is next.` }
  }
  if (ctx.fatigue && ctx.nextDay && ctx.nextDay.id !== day.id) {
    const sore = recovering(ctx.fatigue, day.muscles)
    const soreNext = recovering(ctx.fatigue, ctx.nextDay.muscles)
    if (sore.length * 2 >= day.muscles.length && soreNext.length < sore.length) {
      return {
        rule: 'recovering',
        text: `${capitalize(lower(sore))} ${sore.length === 1 ? 'is' : 'are'} still recovering, so ${ctx.nextDay.name.toLowerCase()} is the better choice today.`,
        action: 'skip-day',
      }
    }
  }
  if (ctx.readiness === 'low') {
    return { rule: 'low-readiness', text: `You're running low today, so ${day.name.toLowerCase()} is lighter: one set fewer and longer rests.` }
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
  if (ctx.readiness === 'high') {
    return { rule: 'high-readiness', text: `You're feeling good. ${day.name} today; aim for the top of your reps.` }
  }
  return { rule: 'program-day', text: `${day.name} today: ${lower(day.muscles)}.` }
}
