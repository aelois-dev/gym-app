import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Segmented } from '../components/ui'
import { muscleLabel } from '../data/exercises'
import { estimateSeconds, formatClock, formatDuration, type Workout } from '../lib/planner'
import { store } from '../lib/storage'

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
        <p className="eyebrow">Library</p>
        <h1>Your training</h1>
      </header>

      <section className="summary-card">
        <p className="eyebrow">This week</p>
        <div className="stats">
          <div className="stat">
            <span className="stat__value">{week.length}</span>
            <span className="stat__label">workouts</span>
          </div>
          <div className="stat">
            <span className="stat__value">{weekMin}</span>
            <span className="stat__label">minutes</span>
          </div>
          <div className="stat">
            <span className="stat__value">{weekSets}</span>
            <span className="stat__label">sets</span>
          </div>
        </div>
      </section>

      <Segmented
        label="Library section"
        value={tab}
        onChange={setTab}
        options={[
          { id: 'history', label: `History${history.length ? ` · ${history.length}` : ''}` },
          { id: 'saved', label: `Saved${saved.length ? ` · ${saved.length}` : ''}` },
        ]}
      />

      {tab === 'history' &&
        (history.length === 0 ? (
          <div className="empty">
            <Icon name="history" size={28} />
            <p>Finished workouts will show up here.</p>
          </div>
        ) : (
          <ul className="card-list">
            {history.map((h) => (
              <li key={h.id} className="list-card">
                <div className="list-card__main">
                  <span className="eyebrow">
                    {new Date(h.finishedAt).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })} ·{' '}
                    {new Date(h.finishedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                  </span>
                  <strong>{h.name}</strong>
                  <span className="muted">
                    {formatClock(h.durationSec)} · {h.setsDone}/{h.totalSets} sets · {h.exercises.length} exercises
                  </span>
                </div>
                <button
                  className="icon-btn icon-btn--sm"
                  aria-label={`Delete ${h.name} from history`}
                  onClick={() => {
                    store.removeHistory(h.id)
                    setHistory(store.history())
                    notify('Removed from history')
                  }}
                >
                  <Icon name="trash" size={18} />
                </button>
              </li>
            ))}
          </ul>
        ))}

      {tab === 'saved' &&
        (saved.length === 0 ? (
          <div className="empty">
            <Icon name="bookmark" size={28} />
            <p>Tap the bookmark on a plan to save it for later.</p>
          </div>
        ) : (
          <ul className="card-list">
            {saved.map(({ workout: w }) => (
              <li key={w.id} className="list-card">
                <button className="list-card__main list-card__main--btn" onClick={() => onOpen(w)}>
                  <span className="eyebrow">{w.muscles.map(muscleLabel).join(' · ')}</span>
                  <strong>{w.name}</strong>
                  <span className="muted">
                    {w.items.length} exercises · {formatDuration(estimateSeconds(w))}
                  </span>
                </button>
                <button
                  className="icon-btn icon-btn--sm"
                  aria-label={`Delete saved ${w.name}`}
                  onClick={() => {
                    store.removeSaved(w.id)
                    setSaved(store.saved())
                    notify('Removed from saved')
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
