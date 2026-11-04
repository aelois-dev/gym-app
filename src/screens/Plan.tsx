import { useState } from 'react'
import { Icon } from '../components/Icon'
import { ExerciseSheet } from '../components/ExerciseSheet'
import { Sheet, Stepper } from '../components/ui'
import { KIT_LABEL, getExercise, muscleLabel, type Exercise } from '../data/exercises'
import {
  MAX_SETS,
  addCandidates,
  defaultPrescription,
  estimateSeconds,
  formatClock,
  formatDuration,
  swapCandidates,
  uid,
  type PlanItem,
  type Workout,
} from '../lib/planner'
import { store } from '../lib/storage'

export function Plan({
  workout,
  onChange,
  onBack,
  onRegenerate,
  onStart,
  notify,
}: {
  workout: Workout
  onChange: (w: Workout) => void
  onBack: () => void
  onRegenerate: () => void
  onStart: () => void
  notify: (msg: string) => void
}) {
  const [picker, setPicker] = useState<{ mode: 'swap'; uid: string } | { mode: 'add' } | null>(null)
  const [demo, setDemo] = useState<string | null>(null)
  const [saved, setSaved] = useState(() => store.isSaved(workout.id))

  const est = estimateSeconds(workout)
  const target = workout.targetMin * 60
  const over = est > target
  const totalSets = workout.items.reduce((n, i) => n + i.sets, 0)

  const commit = (w: Workout) => {
    onChange(w)
    if (saved) store.saveWorkout(w)
  }
  const update = (items: PlanItem[]) => commit({ ...workout, items })
  const patch = (id: string, p: Partial<PlanItem>) => update(workout.items.map((i) => (i.uid === id ? { ...i, ...p } : i)))
  const move = (idx: number, dir: -1 | 1) => {
    const items = [...workout.items]
    const j = idx + dir
    if (j < 0 || j >= items.length) return
    ;[items[idx], items[j]] = [items[j], items[idx]]
    update(items)
  }

  const choose = (ex: Exercise) => {
    if (!picker) return
    if (picker.mode === 'swap') {
      update(workout.items.map((i) => (i.uid === picker.uid ? { ...i, exerciseId: ex.id, ...keepOrDefault(i, ex, workout) } : i)))
      notify(`Swapped in ${ex.name}`)
    } else {
      update([...workout.items, { uid: uid(), exerciseId: ex.id, ...defaultPrescription(ex, workout.goal) }])
      notify(`Added ${ex.name}`)
    }
    setPicker(null)
  }

  const toggleSave = () => {
    if (saved) {
      store.removeSaved(workout.id)
      setSaved(false)
      notify('Removed from saved')
    } else {
      store.saveWorkout(workout)
      setSaved(true)
      notify('Saved to Library')
    }
  }

  const candidates =
    picker?.mode === 'swap'
      ? swapCandidates(workout, workout.items.find((i) => i.uid === picker.uid)!.exerciseId)
      : picker?.mode === 'add'
        ? addCandidates(workout)
        : []

  return (
    <main className="screen">
      <header className="top-bar">
        <button className="icon-btn" onClick={onBack} aria-label="Back to setup">
          <Icon name="back" />
        </button>
        <div className="top-bar__title">
          <span className="eyebrow">Your plan</span>
          <h1>{workout.name}</h1>
        </div>
        <button className={`icon-btn ${saved ? 'is-on' : ''}`} onClick={toggleSave} aria-label={saved ? 'Remove from saved' : 'Save workout'} aria-pressed={saved}>
          <Icon name="bookmark" />
        </button>
      </header>

      <section className="summary-card">
        <div className="stats">
          <div className="stat">
            <span className={`stat__value ${over ? 'is-warn' : ''}`}>{formatDuration(est)}</span>
            <span className="stat__label">of {workout.targetMin} min</span>
          </div>
          <div className="stat">
            <span className="stat__value">{workout.items.length}</span>
            <span className="stat__label">exercises</span>
          </div>
          <div className="stat">
            <span className="stat__value">{totalSets}</span>
            <span className="stat__label">sets</span>
          </div>
        </div>
        <div className="meter" aria-hidden="true">
          <div className={`meter__fill ${over ? 'is-warn' : ''}`} style={{ width: `${Math.min(100, (est / target) * 100)}%` }} />
        </div>
        {over && <p className="hint hint--warn">About {formatDuration(est - target)} over your target. Remove a set or shorten rest.</p>}
        <div className="summary-card__row">
          <div>
            <h2>Rest between sets</h2>
            <p className="hint">Applies to every exercise</p>
          </div>
          <Stepper label="Rest time" value={workout.restSec} min={15} max={300} step={15} format={formatClock} onChange={(restSec) => commit({ ...workout, restSec })} />
        </div>
      </section>

      {workout.warmup && (
        <div className="warmup-row">
          <Icon name="flame" />
          <span>Warm-up</span>
          <span className="muted">5 min</span>
          <button className="link" onClick={() => commit({ ...workout, warmup: false })}>
            Remove
          </button>
        </div>
      )}

      <ol className="ex-list">
        {workout.items.map((it, idx) => {
          const ex = getExercise(it.exerciseId)
          return (
            <li key={it.uid} className="ex-card">
              <div className="ex-card__head">
                <span className="ex-card__num">{idx + 1}</span>
                <div className="ex-card__title">
                  <h3>{ex.name}</h3>
                  <div className="tags">
                    <span className="tag">{muscleLabel(ex.muscle)}</span>
                    <span className="tag tag--muted">{KIT_LABEL[ex.kit]}</span>
                    {ex.compound && <span className="tag tag--accent">Compound</span>}
                  </div>
                </div>
                <button
                  className="icon-btn icon-btn--sm"
                  aria-label={`Show ${ex.name} demo and form tip`}
                  onClick={() => setDemo(it.uid)}
                >
                  <Icon name="info" size={18} />
                </button>
              </div>
              <div className="ex-card__controls">
                <div className="control">
                  <span className="control__label">Sets</span>
                  <Stepper label={`${ex.name} sets`} value={it.sets} min={1} max={MAX_SETS} onChange={(sets) => patch(it.uid, { sets })} />
                </div>
                <div className="control">
                  <span className="control__label">{ex.timed ? 'Seconds' : 'Reps'}</span>
                  <Stepper
                    label={`${ex.name} ${ex.timed ? 'seconds' : 'reps'}`}
                    value={it.reps}
                    min={ex.timed ? 10 : 1}
                    max={ex.timed ? 180 : 50}
                    step={ex.timed ? 5 : 1}
                    onChange={(reps) => patch(it.uid, { reps })}
                  />
                </div>
              </div>
              <div className="ex-card__actions">
                <button className="chip-btn" onClick={() => move(idx, -1)} disabled={idx === 0} aria-label="Move up">
                  <Icon name="up" size={18} />
                </button>
                <button className="chip-btn" onClick={() => move(idx, 1)} disabled={idx === workout.items.length - 1} aria-label="Move down">
                  <Icon name="down" size={18} />
                </button>
                <span className="spacer" />
                <button className="chip-btn" onClick={() => setPicker({ mode: 'swap', uid: it.uid })}>
                  <Icon name="swap" size={18} /> Swap
                </button>
                <button
                  className="chip-btn chip-btn--danger"
                  onClick={() => update(workout.items.filter((i) => i.uid !== it.uid))}
                  disabled={workout.items.length === 1}
                  aria-label={`Remove ${ex.name}`}
                >
                  <Icon name="trash" size={18} />
                </button>
              </div>
            </li>
          )
        })}
      </ol>

      <div className="row-actions">
        <button className="btn btn--ghost" onClick={() => setPicker({ mode: 'add' })} disabled={addCandidates(workout).length === 0}>
          <Icon name="plus" size={18} /> Add exercise
        </button>
        <button className="btn btn--ghost" onClick={onRegenerate}>
          <Icon name="refresh" size={18} /> New plan
        </button>
      </div>

      <div className="cta-bar">
        <button className="btn btn--primary btn--block btn--lg" onClick={onStart}>
          <Icon name="play" size={18} /> Start workout
          <span className="btn__meta">{formatDuration(est)}</span>
        </button>
      </div>

      {(() => {
        const it = workout.items.find((i) => i.uid === demo)
        return (
          <ExerciseSheet
            exerciseId={it ? it.exerciseId : null}
            sets={it?.sets}
            reps={it?.reps}
            onClose={() => setDemo(null)}
            onSwap={
              it && swapCandidates(workout, it.exerciseId).length > 0
                ? () => {
                    setDemo(null)
                    setPicker({ mode: 'swap', uid: it.uid })
                  }
                : undefined
            }
          />
        )
      })()}

      <Sheet open={!!picker} title={picker?.mode === 'swap' ? 'Swap exercise' : 'Add exercise'} onClose={() => setPicker(null)}>
        {candidates.length === 0 ? (
          <p className="empty">No other exercises match this muscle and equipment.</p>
        ) : (
          <ul className="pick-list">
            {candidates.map((ex) => (
              <li key={ex.id}>
                <button className="pick" onClick={() => choose(ex)}>
                  <div>
                    <strong>{ex.name}</strong>
                    <span>
                      {muscleLabel(ex.muscle)} · {KIT_LABEL[ex.kit]}
                      {ex.compound ? ' · Compound' : ''}
                    </span>
                  </div>
                  <Icon name="plus" size={18} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Sheet>
    </main>
  )
}

/** When swapping, keep the user's numbers unless the new exercise uses a different unit (reps vs seconds). */
function keepOrDefault(item: PlanItem, next: Exercise, workout: Workout) {
  const prev = getExercise(item.exerciseId)
  if (!!prev.timed === !!next.timed) return { sets: item.sets, reps: item.reps }
  return defaultPrescription(next, workout.goal)
}
