import { useState } from 'react'
import { Icon } from '../components/Icon'
import { formatClock, type Workout } from '../lib/planner'
import { store, type HistoryEntry } from '../lib/storage'

export function Summary({ entry, workout, onDone, notify }: { entry: HistoryEntry; workout: Workout | null; onDone: () => void; notify: (m: string) => void }) {
  const [saved, setSaved] = useState(() => (workout ? store.isSaved(workout.id) : true))
  const complete = entry.setsDone >= entry.totalSets

  return (
    <main className="screen summary">
      <header className="page-head">
        <h1 className="display">{complete ? 'Workout done' : 'Workout saved'}</h1>
        <p className="page-head__sub">{entry.name}</p>
      </header>

      <dl className="tally">
        <div>
          <dt>Time</dt>
          <dd className="num">{formatClock(entry.durationSec)}</dd>
        </div>
        <div>
          <dt>Sets</dt>
          <dd className="num">
            {entry.setsDone}
            <small>/{entry.totalSets}</small>
          </dd>
        </div>
        <div>
          <dt>Target</dt>
          <dd className="num">
            {entry.targetMin}
            <small> min</small>
          </dd>
        </div>
      </dl>

      <ul className="log">
        {entry.exercises.map((e, i) => (
          <li key={i} className={`log__row ${e.setsDone === 0 ? 'is-skipped' : ''}`}>
            <span className={`result-mark ${e.setsDone >= e.sets ? 'is-full' : ''}`}>
              <Icon name={e.setsDone === 0 ? 'minus' : 'check'} size={14} />
            </span>
            <span className="log__text">
              <strong>{e.name}</strong>
              <span className="muted">{e.setsDone === 0 ? 'Skipped' : `${e.setsDone} of ${e.sets} sets of ${e.reps}${e.timed ? ' s' : ''}`}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="cta-bar">
        {workout && !saved && (
          <button
            className="btn btn--quiet btn--block"
            onClick={() => {
              store.saveWorkout(workout)
              setSaved(true)
              notify('Saved to your library')
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
