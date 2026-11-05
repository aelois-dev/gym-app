import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Segmented } from '../components/ui'
import { muscleLabel } from '../data/exercises'
import { ExerciseAnimation } from '../figure/ExerciseAnimation'
import { estimateSeconds, formatClock, formatDuration, type Workout } from '../lib/planner'
import { store } from '../lib/storage'
import { formatWeights } from '../lib/weights'
import { BodyMap } from '../components/BodyMap'
import { listJoin } from '../lib/text'
import { workedMuscles } from '../lib/worked'

type Tab = 'history' | 'saved'

function startOfWeek(d = new Date()) {
  const x = new Date(d)
  const day = (x.getDay() + 6) % 7 // Monday = 0
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - day)
  return x.getTime()
}


export function Library({ onOpen, notify }: { onOpen: (w: Workout) => void; notify: (m: string) => void }) {
  const [tab, setTab] = useState<Tab>('history')
  const [history, setHistory] = useState(store.history)
  const [saved, setSaved] = useState(store.saved)

  const week = history.filter((h) => h.finishedAt >= startOfWeek())
  const weekMin = Math.round(week.reduce((n, h) => n + h.durationSec, 0) / 60)
  const weekSets = week.reduce((n, h) => n + h.setsDone, 0)

  return (
    <main className="screen">
      <header className="page-head">
        <h1 className="display">Training log</h1>
        <p className="page-head__sub">Since Monday</p>
      </header>

      <dl className="tally">
        <div>
          <dt>Workouts</dt>
          <dd className="num">{week.length}</dd>
        </div>
        <div>
          <dt>Minutes</dt>
          <dd className="num">{weekMin}</dd>
        </div>
        <div>
          <dt>Sets</dt>
          <dd className="num">{weekSets}</dd>
        </div>
      </dl>

      <Segmented
        label="Show"
        value={tab}
        onChange={setTab}
        options={[
          { id: 'history', label: 'History' },
          { id: 'saved', label: `Saved workouts` },
        ]}
      />

      {tab === 'history' &&
        (history.length === 0 ? (
          <p className="empty-note">Finish a workout and it will be logged here.</p>
        ) : (
          <ul className="log">
            {history.map((h) => {
              const d = new Date(h.finishedAt)
              return (
                <li key={h.id} className="log__row">
                  <span className="log__date">
                    <span className="num">{d.getDate()}</span>
                    <span>{d.toLocaleDateString(undefined, { month: 'short' })}</span>
                  </span>
                  <BodyMap selected={workedMuscles(h)} size="sm" />
                  <span className="log__text">
                    <strong>{h.name}</strong>
                    <span className="muted">
                      {formatClock(h.durationSec)}, {h.setsDone} of {h.totalSets} sets
                    </span>
                    {h.exercises.some((e) => formatWeights(e.weights)) && (
                      <span className="log__lifts">
                        {h.exercises
                          .filter((e) => formatWeights(e.weights))
                          .map((e) => `${e.name} ${formatWeights(e.weights)}`)
                          .join(', ')}
                      </span>
                    )}
                  </span>
                  <button
                    className="icon-btn icon-btn--sm"
                    aria-label={`Delete ${h.name} from history`}
                    onClick={() => {
                      store.removeHistory(h.id)
                      setHistory(store.history())
                      notify('Deleted from history')
                    }}
                  >
                    <Icon name="trash" size={18} />
                  </button>
                </li>
              )
            })}
          </ul>
        ))}

      {tab === 'saved' &&
        (saved.length === 0 ? (
          <p className="empty-note">Save a plan from its plan screen to reuse it later.</p>
        ) : (
          <ul className="log">
            {saved.map(({ workout: w }) => (
              <li key={w.id} className="log__row">
                <button className="log__open" onClick={() => onOpen(w)}>
                  <span className="thumb">{w.items[0] && <ExerciseAnimation exerciseId={w.items[0].exerciseId} frame={1} />}</span>
                  <span className="log__text">
                    <strong>{w.name}</strong>
                    <span className="muted">
                      {w.items.length} exercises for {listJoin(w.muscles.map((m) => muscleLabel(m).toLowerCase()))}, about {formatDuration(estimateSeconds(w))}
                    </span>
                  </span>
                </button>
                <button
                  className="icon-btn icon-btn--sm"
                  aria-label={`Delete saved workout ${w.name}`}
                  onClick={() => {
                    store.removeSaved(w.id)
                    setSaved(store.saved())
                    notify('Removed from saved workouts')
                  }}
                >
                  <Icon name="trash" size={18} />
                </button>
              </li>
            ))}
          </ul>
        ))}
    </main>
  )
}
