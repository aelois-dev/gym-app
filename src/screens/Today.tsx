import { BodyMap } from '../components/BodyMap'
import { CheckInCard } from '../components/CheckInCard'
import { MUSCLES, type Muscle } from '../data/exercises'
import { dateKey, type CheckIn } from '../lib/readiness'
import { RECOVERING } from '../lib/recovery'
import { Icon } from '../components/Icon'
import { getExercise, muscleLabel } from '../data/exercises'
import { ExerciseAnimation } from '../figure/ExerciseAnimation'
import type { CoachNote } from '../lib/coach'
import { estimateSeconds, formatClock, formatDuration, type Workout } from '../lib/planner'
import type { ProgramDay } from '../lib/program'
import type { ActiveSession } from '../lib/storage'
import { capitalize, listJoin } from '../lib/text'
import { formatKg } from '../lib/weights'
import { PresetCard, type PresetCardData } from '../components/PresetCard'

export function Today({
  note,
  day,
  nextDay,
  plan,
  presets,
  chosenPreset,
  onChoosePreset,
  sessionsThisWeek,
  targetPerWeek,
  activeSession,
  onResume,
  onStart,
  onEditPlan,
  onSkipDay,
  onSettings,
  checkIn,
  onCheckIn,
  fatigue,
}: {
  note: CoachNote
  day: ProgramDay
  nextDay: ProgramDay
  plan: Workout
  presets: PresetCardData[]
  chosenPreset: string
  onChoosePreset: (id: string) => void
  sessionsThisWeek: number
  targetPerWeek: number
  activeSession: ActiveSession | null
  onResume: () => void
  onStart: () => void
  onEditPlan: () => void
  onSkipDay: () => void
  onSettings: () => void
  checkIn: CheckIn | null
  onCheckIn: (c: CheckIn) => void
  fatigue: Record<Muscle, number>
}) {
  const fatigued = MUSCLES.filter((m) => fatigue[m.id] >= RECOVERING).map((m) => m.label.toLowerCase())
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

      <div className="coach">
        <p className="coach-note">{note.text}</p>
        {note.action === 'skip-day' && (
          <button className="btn btn--primary btn--sm" onClick={onSkipDay}>
            Switch to {nextDay.name.toLowerCase()}
          </button>
        )}
      </div>

      <CheckInCard date={dateKey()} value={checkIn} onSave={onCheckIn} />

      <section className="today-day" aria-labelledby="today-day-name">
        <div className="block__head">
          <h2 id="today-day-name" className="display display--sm">
            {day.name}
          </h2>
          <span className="muted">about {formatDuration(estimateSeconds(plan))}</span>
        </div>
        <p className="muted">{muscles}</p>
        <div className="preset-cards" role="radiogroup" aria-label={`Which ${day.name.toLowerCase()} workout`}>
          {presets.map((p) => (
            <PresetCard key={p.id} preset={p} mode="radio" selected={p.id === chosenPreset} onSelect={() => onChoosePreset(p.id)} />
          ))}
        </div>
        <p className="hint">Each version keeps the same exercises every time, so you can see your weights go up.</p>
        <ol className="today-list" aria-label="Exercises">
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
          <button className="btn btn--quiet btn--sm" onClick={onSkipDay}>
            Do {nextDay.name.toLowerCase()} instead
          </button>
        </div>
      </section>

      <section className="block recovery" aria-labelledby="recovery-head">
        <div className="block__head">
          <h2 id="recovery-head">Recovery</h2>
          <span className="muted">{fatigued.length ? 'Redder means more tired' : 'Everything is fresh'}</span>
        </div>
        <BodyMap
          size="md"
          levels={fatigue}
          label={fatigued.length ? `Still recovering: ${listJoin(fatigued)}` : 'All muscles recovered'}
        />
        {fatigued.length > 0 && <p className="muted recovery__note">Still recovering: {listJoin(fatigued)}.</p>}
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
        <button className="btn btn--primary btn--block btn--lg" onClick={onStart}>
          Start {plan.name.charAt(0).toLowerCase() + plan.name.slice(1)}
        </button>
      </div>
    </main>
  )
}
