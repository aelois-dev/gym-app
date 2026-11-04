import { useState } from 'react'
import { Icon } from '../components/Icon'
import { ExercisePicker, describe } from '../components/ExercisePicker'
import { ExerciseSheet } from '../components/ExerciseSheet'
import { Stepper } from '../components/ui'
import { getExercise, type Exercise } from '../data/exercises'
import { ExerciseAnimation } from '../figure/ExerciseAnimation'
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
  const [editing, setEditing] = useState<string | null>(null)
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
      notify('Removed from saved workouts')
    } else {
      store.saveWorkout(workout)
      setSaved(true)
      notify('Saved to your library')
    }
  }

  const swapping = picker?.mode === 'swap' ? workout.items.find((i) => i.uid === picker.uid) : undefined
  const candidates = swapping ? swapCandidates(workout, swapping.exerciseId) : picker?.mode === 'add' ? addCandidates(workout) : []
  const demoItem = workout.items.find((i) => i.uid === demo)

  return (
    <main className="screen">
      <header className="top-bar">
        <button className="icon-btn" onClick={onBack} aria-label="Back to setup">
          <Icon name="back" />
        </button>
        <span className="spacer" />
        <button className={`btn btn--sm ${saved ? 'btn--quiet is-on' : 'btn--quiet'}`} onClick={toggleSave} aria-pressed={saved}>
          <Icon name="bookmark" size={16} /> {saved ? 'Saved' : 'Save'}
        </button>
      </header>

      <header className="plan-head">
        <h1 className="display">{workout.name}</h1>
        <p className="plan-head__fit">
          <span className={`num ${over ? 'is-warn' : ''}`}>{formatDuration(est)}</span> planned for your {workout.targetMin}-minute slot
        </p>
        <div className="meter" aria-hidden="true">
          <div className={`meter__fill ${over ? 'is-warn' : ''}`} style={{ width: `${Math.min(100, (est / target) * 100)}%` }} />
        </div>
        <p className="plan-head__meta">
          {workout.items.length} exercises, {totalSets} sets
        </p>
        {over && <p className="warn-note">That's {formatDuration(est - target)} over. Drop a set or shorten the rest.</p>}
      </header>

      <div className="rows">
        <div className="row">
          <div className="row__text">
            <h2>Rest between sets</h2>
            <p>Used for every exercise</p>
          </div>
          <Stepper label="Rest time" value={workout.restSec} min={15} max={300} step={15} format={formatClock} onChange={(restSec) => commit({ ...workout, restSec })} />
        </div>
        {workout.warmup && (
          <div className="row">
            <div className="row__text">
              <h2>Warm-up</h2>
              <p>5 minutes before the first set</p>
            </div>
            <button className="link" onClick={() => commit({ ...workout, warmup: false })}>
              Remove
            </button>
          </div>
        )}
      </div>

      <ol className="plan-list">
        {workout.items.map((it, idx) => {
          const ex = getExercise(it.exerciseId)
          const open = editing === it.uid
          return (
            <li key={it.uid} className={`plan-item ${open ? 'is-open' : ''}`}>
              <div className="plan-item__main">
                <span className="plan-item__num num">{idx + 1}</span>
                <button className="plan-item__body" onClick={() => setEditing(open ? null : it.uid)} aria-expanded={open}>
                  <span className="plan-item__name">{ex.name}</span>
                  <span className="plan-item__desc">{describe(ex)}</span>
                  <span className="scheme">
                    {it.sets} × {it.reps}
                    {ex.timed ? ' s' : ''}
                    <span className="plan-item__edit">{open ? 'Done' : 'Edit'}</span>
                  </span>
                </button>
                <button className="thumb thumb--lg" onClick={() => setDemo(it.uid)} aria-label={`Watch ${ex.name}`}>
                  <ExerciseAnimation exerciseId={ex.id} frame={1} />
                  <span className="thumb__play">
                    <Icon name="play" size={11} />
                  </span>
                </button>
              </div>
              {open && (
                <div className="plan-item__editor">
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
                  <div className="plan-item__actions">
                    <button className="tool" onClick={() => move(idx, -1)} disabled={idx === 0} aria-label="Move up">
                      <Icon name="up" size={18} />
                    </button>
                    <button className="tool" onClick={() => move(idx, 1)} disabled={idx === workout.items.length - 1} aria-label="Move down">
                      <Icon name="down" size={18} />
                    </button>
                    <span className="spacer" />
                    <button className="tool" onClick={() => setPicker({ mode: 'swap', uid: it.uid })}>
                      <Icon name="swap" size={18} /> Swap
                    </button>
                    <button
                      className="tool tool--danger"
                      onClick={() => {
                        update(workout.items.filter((i) => i.uid !== it.uid))
                        setEditing(null)
                      }}
                      disabled={workout.items.length === 1}
                    >
                      <Icon name="trash" size={18} /> Remove
                    </button>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ol>

      <div className="row-actions">
        <button className="btn btn--quiet" onClick={() => setPicker({ mode: 'add' })} disabled={addCandidates(workout).length === 0}>
          <Icon name="plus" size={18} /> Add exercise
        </button>
        <button className="btn btn--quiet" onClick={onRegenerate}>
          <Icon name="refresh" size={18} /> New plan
        </button>
      </div>

      <div className="cta-bar">
        <button className="btn btn--primary btn--block btn--lg" onClick={onStart}>
          Start workout
        </button>
      </div>

      <ExerciseSheet
        exerciseId={demoItem ? demoItem.exerciseId : null}
        sets={demoItem?.sets}
        reps={demoItem?.reps}
        onClose={() => setDemo(null)}
        onSwap={
          demoItem && swapCandidates(workout, demoItem.exerciseId).length > 0
            ? () => {
                setDemo(null)
                setPicker({ mode: 'swap', uid: demoItem.uid })
              }
            : undefined
        }
      />

      <ExercisePicker
        open={!!picker}
        mode={picker?.mode ?? 'add'}
        currentId={swapping?.exerciseId}
        candidates={candidates}
        onChoose={choose}
        onClose={() => setPicker(null)}
      />
    </main>
  )
}

/** When swapping, keep the user's numbers unless the new exercise uses a different unit (reps vs seconds). */
function keepOrDefault(item: PlanItem, next: Exercise, workout: Workout) {
  const prev = getExercise(item.exerciseId)
  if (!!prev.timed === !!next.timed) return { sets: item.sets, reps: item.reps }
  return defaultPrescription(next, workout.goal)
}
