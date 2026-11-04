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
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <main className="screen">
      <header className="page-head">
        <h1 className="display">Plan a session</h1>
        <p className="page-head__sub">{today}</p>
      </header>

      {activeSession && (
        <div className="notice">
          <span className="notice__pulse" aria-hidden="true" />
          <div className="notice__text">
            <strong>{activeSession.workout.name}</strong>
            <span>In progress for {formatClock((Date.now() - activeSession.startedAt) / 1000)}</span>
          </div>
          <button className="btn btn--sm btn--quiet" onClick={onDiscardSession}>
            End
          </button>
          <button className="btn btn--sm btn--primary" onClick={onResume}>
            Resume
          </button>
        </div>
      )}

      {!activeSession && draft && (
        <button className="notice notice--link" onClick={onOpenDraft}>
          <div className="notice__text">
            <strong>Back to {draft.name}</strong>
            <span>
              {draft.items.length} exercises, about {formatDuration(estimateSeconds(draft))}
            </span>
          </div>
          <Icon name="back" className="flip" />
        </button>
      )}

      <section className="block">
        <div className="block__head">
          <h2>What are you training?</h2>
          {prefs.muscles.length > 0 && (
            <button className="link" onClick={() => onChange({ ...prefs, muscles: [] })}>
              Clear
            </button>
          )}
        </div>
        <div className="pills">
          {MUSCLES.map((m) => {
            const on = prefs.muscles.includes(m.id)
            return (
              <button key={m.id} className={`pill ${on ? 'is-on' : ''}`} aria-pressed={on} onClick={() => toggle(m.id)}>
                {on && <Icon name="check" size={16} />}
                {m.label}
              </button>
            )
          })}
        </div>
      </section>

      <section className="block">
        <div className="block__head">
          <h2>How long do you have?</h2>
          <span className="readout">
            <span className="num">{prefs.minutes}</span> min
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
        <div className="presets" role="group" aria-label="Quick times">
          {TIME_PRESETS.map((t) => (
            <button key={t} className={`preset ${prefs.minutes === t ? 'is-on' : ''}`} aria-pressed={prefs.minutes === t} onClick={() => onChange({ ...prefs, minutes: t })}>
              {t}
            </button>
          ))}
        </div>
      </section>

      <section className="block">
        <h2>Equipment</h2>
        <Segmented label="Equipment" value={prefs.equipment} onChange={(equipment) => onChange({ ...prefs, equipment })} options={EQUIPMENT.map((e) => ({ id: e.id, label: e.label }))} />
      </section>

      <section className="block">
        <h2>Goal</h2>
        <Segmented
          label="Goal"
          value={prefs.goal}
          onChange={(g) => onChange({ ...prefs, goal: g, restSec: GOALS.find((x) => x.id === g)!.rest })}
          options={GOALS.map((g) => ({ id: g.id, label: g.label, sub: g.scheme }))}
        />
      </section>

      <div className="rows">
        <div className="row">
          <div className="row__text">
            <h2>Rest between sets</h2>
            <p>{formatClock(goal.rest)} suits {goal.label.toLowerCase()} work</p>
          </div>
          <Stepper label="Rest time" value={prefs.restSec} min={15} max={300} step={15} onChange={(restSec) => onChange({ ...prefs, restSec })} format={formatClock} />
        </div>
        <label className="row">
          <div className="row__text">
            <h2>Warm up first</h2>
            <p>5 minutes of easy cardio and mobility</p>
          </div>
          <span className="switch">
            <input type="checkbox" checked={prefs.warmup} onChange={(e) => onChange({ ...prefs, warmup: e.target.checked })} />
            <span className="switch__track" />
          </span>
        </label>
      </div>

      <div className="cta-bar">
        <button className="btn btn--primary btn--block btn--lg" disabled={!ready} onClick={onBuild}>
          {ready ? `Build a ${prefs.minutes}-minute workout` : 'Choose a muscle to start'}
        </button>
      </div>
    </main>
  )
}
