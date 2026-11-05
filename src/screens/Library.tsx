import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Sheet } from '../components/ui'
import { WeeklyVolume, WeightChart } from '../components/Charts'
import { WEEKLY_SETS, exerciseSessions, personalRecords, weeklySets } from '../lib/progression'
import { goalLabel, type FitnessGoal } from '../lib/profile'
import { getExercise } from '../data/exercises'
import { ExerciseAnimation } from '../figure/ExerciseAnimation'
import { formatClock } from '../lib/planner'
import { store } from '../lib/storage'
import { formatKg, formatWeights } from '../lib/weights'
import { BodyMap } from '../components/BodyMap'
import { workedMuscles } from '../lib/worked'

function startOfWeek(d = new Date()) {
  const x = new Date(d)
  const day = (x.getDay() + 6) % 7 // Monday = 0
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - day)
  return x.getTime()
}


export function Library({ notify, goal }: { notify: (m: string) => void; goal: FitnessGoal }) {
  const [record, setRecord] = useState<string | null>(null)
  const [history, setHistory] = useState(store.history)

  const week = history.filter((h) => h.finishedAt >= startOfWeek())
  const weekMin = Math.round(week.reduce((n, h) => n + h.durationSec, 0) / 60)
  const weekSets = week.reduce((n, h) => n + h.setsDone, 0)
  const volume = weeklySets(history)
  const target = WEEKLY_SETS[goal]
  const records = personalRecords(history)
  const recordEx = record ? getExercise(record) : null

  return (
    <main className="screen">
      <header className="page-head">
        <h1 className="display">Progress</h1>
        <p className="page-head__sub">This week, since Monday</p>
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

      <section className="block" aria-labelledby="vol-head">
        <div className="block__head">
          <h2 id="vol-head">Sets per muscle this week</h2>
        </div>
        <WeeklyVolume sets={volume} target={target} />
        <p className="hint">
          Shaded: {target[0]} to {target[1]} sets a week, the range that suits {goalLabel(goal).toLowerCase()}.
        </p>
      </section>

      <section className="block" aria-labelledby="pr-head">
        <h2 id="pr-head">Personal records</h2>
        {records.length === 0 ? (
          <p className="empty-note">Log a weight on any set and your best lifts show up here.</p>
        ) : (
          <ul className="log">
            {records.slice(0, 8).map((r) => {
              const ex = getExercise(r.exerciseId)
              return (
                <li key={r.exerciseId} className="log__row">
                  <button className="log__open" onClick={() => setRecord(r.exerciseId)}>
                    <span className="thumb">
                      <ExerciseAnimation exerciseId={ex.id} frame={1} />
                    </span>
                    <span className="log__text">
                      <strong>{ex.name}</strong>
                      <span className="muted">
                        Best {formatKg(r.bestKg)} kg × {r.reps}, about {Math.round(r.e1rm)} kg for one rep
                      </span>
                    </span>
                    <Icon name="chart" size={18} className="pick__chev" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <Sheet open={!!recordEx} title={recordEx?.name ?? ''} onClose={() => setRecord(null)}>
        {recordEx && (
          <div className="picker-preview">
            <p className="muted">Heaviest weight each session</p>
            <WeightChart sessions={exerciseSessions(history, recordEx.id)} name={recordEx.name} />
          </div>
        )}
      </Sheet>

      <section className="block" aria-labelledby="hist-head">
      <h2 id="hist-head">History</h2>
      {history.length === 0 ? (
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
        )}
      </section>
    </main>
  )
}
