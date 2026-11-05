import type { ReactNode } from 'react'
import { Icon } from '../components/Icon'
import { getExercise, muscleLabel } from '../data/exercises'
import { ExerciseAnimation } from '../figure/ExerciseAnimation'
import type { CoachNote } from '../lib/coach'
import { estimateSeconds, formatClock, formatDuration, type Workout } from '../lib/planner'
import type { ProgramDay } from '../lib/program'
import type { ActiveSession } from '../lib/storage'
import { capitalize, listJoin } from '../lib/text'
import { formatKg } from '../lib/weights'

export function Today({
  note,
  day,
  nextDay,
  plan,
  sessionsThisWeek,
  targetPerWeek,
  activeSession,
  onResume,
  onStart,
  onEditPlan,
  onShuffle,
  onSkipDay,
  onSettings,
  children,
}: {
  note: CoachNote
  day: ProgramDay
  nextDay: ProgramDay
  plan: Workout
  sessionsThisWeek: number
  targetPerWeek: number
  activeSession: ActiveSession | null
  onResume: () => void
  onStart: () => void
  onEditPlan: () => void
  onShuffle: () => void
  onSkipDay: () => void
  onSettings: () => void
  /** Extra coach sections (recovery, check-in) slot in under the note. */
  children?: ReactNode
}) {
  const muscles = capitalize(listJoin(day.muscles.map((m) => muscleLabel(m).toLowerCase())))
  return (
    <main className="screen today">
      <header className="page-head page-head--row">
        <h1 className="display">Today</h1>
        <button className="btn btn--sm btn--quiet" onClick={onSettings}>
          <Icon name="settings" size={16} /> Coach settings
        </button>
      </header>

      {activeSession && (
        <div className="notice">
          <span className="notice__pulse" aria-hidden="true" />
          <div className="notice__text">
            <strong>{activeSession.workout.name}</strong>
            <span>In progress for {formatClock((Date.now() - activeSession.startedAt) / 1000)}</span>
          </div>
          <button className="btn btn--sm btn--primary" onClick={onResume}>
            Resume
          </button>
        </div>
      )}

      <p className="coach-note">{note.text}</p>

      {children}

      <section className="today-day" aria-labelledby="today-day-name">
        <div className="block__head">
          <h2 id="today-day-name" className="display display--sm">
            {day.name}
          </h2>
          <span className="muted">about {formatDuration(estimateSeconds(plan))}</span>
        </div>
        <p className="muted">{muscles}</p>
        <ol className="today-list">
          {plan.items.map((it) => {
            const ex = getExercise(it.exerciseId)
            return (
              <li key={it.uid} className="today-list__row">
                <span className="thumb">
                  <ExerciseAnimation exerciseId={ex.id} frame={1} />
                </span>
                <span className="today-list__text">
                  <strong>{ex.name}</strong>
                  <span className="muted">
                    {it.sets} × {it.reps}
                    {ex.timed ? ' s' : ''}
                    {it.weightKg !== undefined ? ` at ${formatKg(it.weightKg)} kg` : ''}
                  </span>
                </span>
              </li>
            )
          })}
        </ol>
        <div className="today-actions">
          <button className="btn btn--quiet btn--sm" onClick={onEditPlan}>
            <Icon name="swap" size={16} /> Edit plan
          </button>
          <button className="btn btn--quiet btn--sm" onClick={onShuffle}>
            <Icon name="refresh" size={16} /> Different exercises
          </button>
          <button className="btn btn--quiet btn--sm" onClick={onSkipDay}>
            Do {nextDay.name.toLowerCase()} instead
          </button>
        </div>
      </section>

      <section className="block" aria-labelledby="week-head">
        <div className="block__head">
          <h2 id="week-head">This week</h2>
          <span className="muted">
            {sessionsThisWeek} of {targetPerWeek} sessions
          </span>
        </div>
        <div className="week-ticks" aria-hidden="true">
          {Array.from({ length: Math.max(targetPerWeek, sessionsThisWeek) }, (_, i) => (
            <span key={i} className={`week-tick ${i < sessionsThisWeek ? 'is-done' : ''} ${i >= targetPerWeek ? 'is-extra' : ''}`} />
          ))}
        </div>
      </section>

      <div className="cta-bar">
        <button className="btn btn--primary btn--block btn--lg" onClick={onStart} disabled={!!activeSession}>
          {activeSession ? 'Finish your current workout first' : `Start ${day.name.toLowerCase()}`}
        </button>
      </div>
    </main>
  )
}
