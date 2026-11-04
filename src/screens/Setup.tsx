import { Icon } from '../components/Icon'
import { Segmented, Stepper } from '../components/ui'
import { EQUIPMENT, MUSCLES, type Muscle } from '../data/exercises'
import { GOALS, formatClock, formatDuration, estimateSeconds, type Workout } from '../lib/planner'
import type { ActiveSession, Prefs } from '../lib/storage'

const TIME_PRESETS = [20, 30, 45, 60, 90]

export function Setup({
  prefs,
  onChange,
  onBuild,
  activeSession,
  onResume,
  onDiscardSession,
  draft,
  onOpenDraft,
}: {
  prefs: Prefs
  onChange: (p: Prefs) => void
  onBuild: () => void
  activeSession: ActiveSession | null
  onResume: () => void
  onDiscardSession: () => void
  draft: Workout | null
  onOpenDraft: () => void
}) {
  const toggle = (m: Muscle) =>
    onChange({ ...prefs, muscles: prefs.muscles.includes(m) ? prefs.muscles.filter((x) => x !== m) : [...prefs.muscles, m] })

  const goal = GOALS.find((g) => g.id === prefs.goal)!
  const ready = prefs.muscles.length > 0
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })

  return (
    <main className="screen">
      <header className="page-head">
        <p className="eyebrow">{today}</p>
        <h1>Plan your session</h1>
      </header>

      {activeSession && (
        <div className="banner">
          <div className="banner__dot" />
          <div className="banner__text">
            <strong>{activeSession.workout.name}</strong>
            <span>Workout in progress · {formatClock((Date.now() - activeSession.startedAt) / 1000)} elapsed</span>
          </div>
          <button className="btn btn--sm btn--ghost" onClick={onDiscardSession}>
            End
          </button>
          <button className="btn btn--sm btn--primary" onClick={onResume}>
            Resume
          </button>
        </div>
      )}

      {!activeSession && draft && (
        <button className="banner banner--link" onClick={onOpenDraft}>
          <div className="banner__text">
            <strong>{draft.name}</strong>
            <span>
              Last plan · {draft.items.length} exercises · {formatDuration(estimateSeconds(draft))}
            </span>
          </div>
          <Icon name="back" className="flip" />
        </button>
      )}

      <section className="field">
        <div className="field__head">
          <h2>Target muscles</h2>
          {prefs.muscles.length > 0 && (
            <button className="link" onClick={() => onChange({ ...prefs, muscles: [] })}>
              Clear
            </button>
          )}
        </div>
        <div className="chips">
          {MUSCLES.map((m) => {
            const on = prefs.muscles.includes(m.id)
            return (
              <button key={m.id} className={`chip ${on ? 'is-on' : ''}`} aria-pressed={on} onClick={() => toggle(m.id)}>
                <span>{m.label}</span>
                <span className="chip__check">
                  <Icon name="check" size={14} />
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="field">
        <div className="field__head">
          <h2>Time available</h2>
          <span className="big-value">
            {prefs.minutes}
            <small> min</small>
          </span>
        </div>
        <input
          className="range"
          type="range"
          min={15}
          max={120}
          step={5}
          value={prefs.minutes}
          onChange={(e) => onChange({ ...prefs, minutes: Number(e.target.value) })}
          aria-label="Minutes available"
          style={{ ['--fill' as string]: `${((prefs.minutes - 15) / 105) * 100}%` }}
        />
        <div className="presets">
          {TIME_PRESETS.map((t) => (
            <button key={t} className={`preset ${prefs.minutes === t ? 'is-on' : ''}`} onClick={() => onChange({ ...prefs, minutes: t })}>
              {t}
            </button>
          ))}
        </div>
      </section>

      <section className="field">
        <h2>Equipment</h2>
        <Segmented
          label="Equipment"
          value={prefs.equipment}
          onChange={(equipment) => onChange({ ...prefs, equipment })}
          options={EQUIPMENT.map((e) => ({ id: e.id, label: e.label, sub: e.hint }))}
        />
      </section>

      <section className="field">
        <h2>Goal</h2>
        <Segmented
          label="Goal"
          value={prefs.goal}
          onChange={(g) => onChange({ ...prefs, goal: g, restSec: GOALS.find((x) => x.id === g)!.rest })}
          options={GOALS.map((g) => ({ id: g.id, label: g.label, sub: g.scheme }))}
        />
      </section>

      <section className="field field--row">
        <div>
          <h2>Rest between sets</h2>
          <p className="hint">Suggested for {goal.label.toLowerCase()}: {formatClock(goal.rest)}</p>
        </div>
        <Stepper label="Rest time" value={prefs.restSec} min={15} max={300} step={15} onChange={(restSec) => onChange({ ...prefs, restSec })} format={formatClock} />
      </section>

      <section className="field field--row">
        <div>
          <h2>Warm-up</h2>
          <p className="hint">5 min of light cardio and mobility work</p>
        </div>
        <label className="switch">
          <input type="checkbox" checked={prefs.warmup} onChange={(e) => onChange({ ...prefs, warmup: e.target.checked })} />
          <span className="switch__track" />
          <span className="sr-only">Include warm-up</span>
        </label>
      </section>

      <div className="cta-bar">
        <button className="btn btn--primary btn--block btn--lg" disabled={!ready} onClick={onBuild}>
          {ready ? (
            <>
              Build workout
              <span className="btn__meta">{prefs.minutes} min</span>
            </>
          ) : (
            'Pick at least one muscle'
          )}
        </button>
      </div>
    </main>
  )
}
