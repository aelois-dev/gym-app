import { useState } from 'react'
import { BodyMap } from '../components/BodyMap'
import { Icon } from '../components/Icon'
import { Segmented, Sheet, Stepper } from '../components/ui'
import { EQUIPMENT, MUSCLES, type Muscle } from '../data/exercises'
import { GOALS, MAX_EXERCISES, formatClock, formatDuration, estimateSeconds, type Workout } from '../lib/planner'
import type { ActiveSession, Prefs } from '../lib/storage'
import { capitalize, listJoin } from '../lib/text'

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
  const [restSheet, setRestSheet] = useState(false)
  const toggle = (m: Muscle) =>
    onChange({ ...prefs, muscles: prefs.muscles.includes(m) ? prefs.muscles.filter((x) => x !== m) : [...prefs.muscles, m] })

  const ready = prefs.muscles.length > 0
  const chosen = MUSCLES.filter((m) => prefs.muscles.includes(m.id)).map((m) => m.label.toLowerCase())

  return (
    <main className="screen">
      <header className="page-head">
        <h1 className="display">Plan a session</h1>
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

      <section className="block block--map">
        <BodyMap selected={prefs.muscles} onToggle={toggle} />
        <div className="selection" aria-live="polite">
          <p className={`selection__text ${ready ? '' : 'is-empty'}`}>{ready ? capitalize(listJoin(chosen)) : 'Tap the muscles you want to train.'}</p>
          {ready && (
            <button className="link" onClick={() => onChange({ ...prefs, muscles: [] })}>
              Clear
            </button>
          )}
        </div>
      </section>

      <section className="block">
        <div className="block__head">
          <h2>How long do you have?</h2>
          <Stepper label="Minutes available" value={prefs.minutes} min={15} max={120} step={5} onChange={(minutes) => onChange({ ...prefs, minutes })} format={(m) => `${m} min`} />
        </div>
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
          onChange={(goal) => onChange({ ...prefs, goal })}
          options={GOALS.map((g) => ({ id: g.id, label: g.label, sub: g.scheme }))}
        />
      </section>

      <div className="rows">
        <div className="row">
          <div className="row__text">
            <h2>Number of exercises</h2>
            <p>{prefs.exerciseCount ? `Exactly ${prefs.exerciseCount}; sets adjust to fit your time` : 'Auto fits as many as your time allows'}</p>
          </div>
          <Stepper
            label="Number of exercises"
            value={prefs.exerciseCount ?? 0}
            min={0}
            max={MAX_EXERCISES}
            onChange={(n) => onChange({ ...prefs, exerciseCount: n === 0 ? null : n })}
            format={(n) => (n === 0 ? 'Auto' : String(n))}
          />
        </div>
        <div className="row">
          <div className="row__text">
            <h2>Rest and warm-up</h2>
            <p>
              {formatClock(prefs.restCompound)} after compound lifts, {formatClock(prefs.restIsolation)} after others, {prefs.warmup ? 'warm-up on' : 'no warm-up'}
            </p>
          </div>
          <button className="btn btn--sm btn--quiet" onClick={() => setRestSheet(true)}>
            Change
          </button>
        </div>
      </div>

      <div className="cta-bar">
        <button className="btn btn--primary btn--block btn--lg" disabled={!ready} onClick={onBuild}>
          {!ready
            ? 'Choose a muscle to start'
            : prefs.exerciseCount
              ? `Build ${prefs.exerciseCount} exercise${prefs.exerciseCount === 1 ? '' : 's'} in ${prefs.minutes} minutes`
              : `Build a ${prefs.minutes}-minute workout`}
        </button>
      </div>

      <Sheet open={restSheet} title="Rest and warm-up" onClose={() => setRestSheet(false)}>
        <div className="rows">
          <div className="row">
            <div className="row__text">
              <h2>After compound lifts</h2>
              <p>Squats, presses, rows and other multi-joint moves</p>
            </div>
            <Stepper label="Rest after compound lifts" value={prefs.restCompound} min={30} max={300} step={15} onChange={(restCompound) => onChange({ ...prefs, restCompound })} format={formatClock} />
          </div>
          <div className="row">
            <div className="row__text">
              <h2>After other exercises</h2>
              <p>Curls, raises, core work and other single-joint moves</p>
            </div>
            <Stepper label="Rest after other exercises" value={prefs.restIsolation} min={30} max={300} step={15} onChange={(restIsolation) => onChange({ ...prefs, restIsolation })} format={formatClock} />
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
        <button className="btn btn--primary btn--block sheet__done" onClick={() => setRestSheet(false)}>
          Done
        </button>
      </Sheet>
    </main>
  )
}
