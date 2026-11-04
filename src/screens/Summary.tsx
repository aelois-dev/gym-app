import { useState } from 'react'
import { Icon } from '../components/Icon'
import { formatClock, type Workout } from '../lib/planner'
import { store, type HistoryEntry } from '../lib/storage'

export function Summary({ entry, workout, onDone, notify }: { entry: HistoryEntry; workout: Workout | null; onDone: () => void; notify: (m: string) => void }) {
  const [saved, setSaved] = useState(() => (workout ? store.isSaved(workout.id) : true))
  const pct = Math.round((entry.setsDone / entry.totalSets) * 100)

  return (
    <main className="screen summary">
      <div className="summary__hero">
        <div className="summary__badge">
          <Icon name="check" size={40} />
        </div>
        <p className="eyebrow">Workout complete</p>
        <h1>{entry.name}</h1>
      </div>

      <section className="summary-card">
        <div className="stats">
          <div className="stat">
            <span className="stat__value">{formatClock(entry.durationSec)}</span>
            <span className="stat__label">duration</span>
          </div>
          <div className="stat">
            <span className="stat__value">
              {entry.setsDone}
              <small>/{entry.totalSets}</small>
            </span>
            <span className="stat__label">sets</span>
          </div>
          <div className="stat">
            <span className="stat__value">{pct}%</span>
            <span className="stat__label">completed</span>
          </div>
        </div>
      </section>

      <ul className="result-list">
        {entry.exercises.map((e, i) => (
          <li key={i} className={e.setsDone === 0 ? 'is-skipped' : ''}>
            <span className={`result-list__mark ${e.setsDone >= e.sets ? 'is-full' : ''}`}>
              <Icon name={e.setsDone === 0 ? 'minus' : 'check'} size={14} />
            </span>
            <span className="result-list__name">{e.name}</span>
            <span className="muted">
              {e.setsDone}/{e.sets} × {e.reps}
              {e.timed ? 's' : ''}
            </span>
          </li>
        ))}
      </ul>

      <div className="cta-bar">
        {workout && !saved && (
          <button
            className="btn btn--ghost btn--block"
            onClick={() => {
              store.saveWorkout(workout)
              setSaved(true)
              notify('Saved to Library')
            }}
          >
            <Icon name="bookmark" size={18} /> Save this workout
          </button>
        )}
        <button className="btn btn--primary btn--block btn--lg" onClick={onDone}>
          Done
        </button>
      </div>
    </main>
  )
}
