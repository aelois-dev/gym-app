import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { ProgressRing, Sheet } from '../components/ui'
import { KIT_LABEL, getExercise, muscleLabel } from '../data/exercises'
import { alarm, keepAwake, tick, unlockAudio } from '../lib/feedback'
import { WARMUP_SEC, formatClock, uid, type Workout } from '../lib/planner'
import type { ActiveSession, HistoryEntry } from '../lib/storage'
import { useNow } from '../lib/timer'

type Step = { kind: 'warmup' } | { kind: 'work' | 'rest'; item: number; set: number }

export function buildSteps(w: Workout): Step[] {
  const steps: Step[] = w.warmup ? [{ kind: 'warmup' }] : []
  let anyWork = false
  w.items.forEach((it, item) => {
    for (let set = 1; set <= it.sets; set++) {
      if (anyWork) steps.push({ kind: 'rest', item, set })
      steps.push({ kind: 'work', item, set })
      anyWork = true
    }
  })
  return steps
}

function endAtFor(step: Step | undefined, w: Workout, now: number): number | null {
  if (!step) return null
  if (step.kind === 'warmup') return now + WARMUP_SEC * 1000
  if (step.kind === 'rest') return now + w.restSec * 1000
  return null
}

const WARMUP_IDEAS = ['2–3 min easy bike, row or brisk walk', 'Arm circles and band pull-aparts', 'Bodyweight squats and hip openers', '1–2 light sets of your first lift']

export function Session({
  session,
  sound,
  onSound,
  onUpdate,
  onFinish,
  onMinimize,
}: {
  session: ActiveSession
  sound: boolean
  onSound: (on: boolean) => void
  onUpdate: (s: ActiveSession) => void
  onFinish: (entry: HistoryEntry | null) => void
  onMinimize: () => void
}) {
  const { workout, stepIndex, endAt, done } = session
  const steps = useMemo(() => buildSteps(workout), [workout])
  const step = steps[stepIndex]
  const now = useNow()
  const [menu, setMenu] = useState(false)
  const [flashUntil, setFlashUntil] = useState(0)
  const lastTick = useRef<number | null>(null)

  const totalSets = workout.items.reduce((n, i) => n + i.sets, 0)
  const setsDone = Object.values(done).reduce((n, v) => n + v, 0)
  const elapsed = (now - session.startedAt) / 1000

  // Initialise a countdown if we arrived on a timed step without one (e.g. a fresh warm-up).
  useEffect(() => {
    if (endAt === null && step && step.kind !== 'work') onUpdate({ ...session, endAt: endAtFor(step, workout, Date.now()) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex])

  useEffect(() => {
    keepAwake(true)
    return () => keepAwake(false)
  }, [])

  const makeEntry = (d: Record<string, number>): HistoryEntry => ({
    id: uid(),
    finishedAt: Date.now(),
    name: workout.name,
    muscles: workout.muscles,
    durationSec: Math.round((Date.now() - session.startedAt) / 1000),
    targetMin: workout.targetMin,
    setsDone: Object.values(d).reduce((n, v) => n + v, 0),
    totalSets,
    exercises: workout.items.map((it) => {
      const ex = getExercise(it.exerciseId)
      return { name: ex.name, setsDone: d[it.uid] ?? 0, sets: it.sets, reps: it.reps, ...(ex.timed ? { timed: true } : {}) }
    }),
  })

  const goTo = (index: number, d: Record<string, number> = done) => {
    if (index >= steps.length) {
      onFinish(makeEntry(d))
      return
    }
    lastTick.current = null
    onUpdate({ ...session, stepIndex: index, done: d, endAt: endAtFor(steps[index], workout, Date.now()) })
  }

  const completeSet = () => {
    if (!step || step.kind !== 'work') return
    const id = workout.items[step.item].uid
    goTo(stepIndex + 1, { ...done, [id]: (done[id] ?? 0) + 1 })
  }

  const skipExercise = () => {
    if (!step || step.kind === 'warmup') return goTo(stepIndex + 1)
    const next = steps.findIndex((s, i) => i > stepIndex && s.kind === 'work' && s.item > step.item)
    goTo(next === -1 ? steps.length : next)
  }

  // Countdown side effects: last-3-seconds ticks, and completion.
  useEffect(() => {
    if (endAt === null || !step) return
    const left = Math.ceil((endAt - now) / 1000)
    if (left <= 0) {
      alarm(sound)
      if (step.kind === 'work') completeSet()
      else {
        setFlashUntil(Date.now() + 3000)
        goTo(stepIndex + 1)
      }
      return
    }
    if (left <= 3 && lastTick.current !== left) {
      lastTick.current = left
      tick(sound)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, endAt])

  const adjust = (deltaSec: number) => {
    if (endAt === null) return
    onUpdate({ ...session, endAt: Math.max(Date.now() + 5000, endAt + deltaSec * 1000) })
  }

  if (!step) return null

  const item = step.kind === 'warmup' ? null : workout.items[step.item]
  const ex = item ? getExercise(item.exerciseId) : null
  const remaining = endAt ? Math.max(0, (endAt - now) / 1000) : 0
  const flashing = now < flashUntil && step.kind === 'work'

  return (
    <main className="screen session" onPointerDown={unlockAudio}>
      <header className="top-bar">
        <button className="icon-btn" onClick={onMinimize} aria-label="Minimise workout">
          <Icon name="down" />
        </button>
        <div className="top-bar__title top-bar__title--center">
          <span className="eyebrow">{workout.name}</span>
          <span className="clock">
            {formatClock(elapsed)} <span className="muted">/ {workout.targetMin}:00</span>
          </span>
        </div>
        <button className="icon-btn" onClick={() => onSound(!sound)} aria-label={sound ? 'Mute sounds' : 'Turn sounds on'} aria-pressed={sound}>
          <Icon name={sound ? 'sound' : 'mute'} />
        </button>
      </header>

      <div className="progress" aria-label={`${setsDone} of ${totalSets} sets done`}>
        <div className="progress__fill" style={{ width: `${(setsDone / totalSets) * 100}%` }} />
      </div>
      <p className="progress__label">
        {setsDone} / {totalSets} sets
      </p>

      {flashing && (
        <div className="flash" role="alert">
          <Icon name="flame" size={18} /> Rest over — let's go
        </div>
      )}

      {step.kind === 'warmup' && (
        <section className="stage">
          <span className="stage__kicker">Warm-up</span>
          <ProgressRing progress={1 - remaining / WARMUP_SEC} size={200}>
            <span className="ring__time">{formatClock(remaining)}</span>
            <span className="ring__label">remaining</span>
          </ProgressRing>
          <ul className="idea-list">
            {WARMUP_IDEAS.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>
      )}

      {step.kind === 'rest' && item && ex && (
        <section className="stage">
          <span className="stage__kicker">Rest</span>
          <ProgressRing progress={1 - remaining / workout.restSec} size={220}>
            <span className="ring__time">{formatClock(remaining)}</span>
            <span className="ring__label">of {formatClock(workout.restSec)}</span>
          </ProgressRing>
          <div className="next-card">
            <span className="eyebrow">{step.set === 1 ? 'Next exercise' : 'Up next'}</span>
            <strong>{ex.name}</strong>
            <span className="muted">
              Set {step.set} of {item.sets} · {item.reps} {ex.timed ? 'sec' : 'reps'}
            </span>
            {step.set === 1 && <p className="tip">{ex.cue}</p>}
          </div>
        </section>
      )}

      {step.kind === 'work' && item && ex && (
        <section className="stage stage--work">
          <span className="eyebrow">
            Exercise {step.item + 1} of {workout.items.length}
          </span>
          <h1 className="work-title">{ex.name}</h1>
          <div className="tags tags--center">
            <span className="tag">{muscleLabel(ex.muscle)}</span>
            <span className="tag tag--muted">{KIT_LABEL[ex.kit]}</span>
          </div>

          {ex.timed && endAt !== null ? (
            <ProgressRing progress={1 - remaining / item.reps} size={230}>
              <span className="ring__time">{formatClock(remaining)}</span>
              <span className="ring__label">hold</span>
            </ProgressRing>
          ) : (
            <div className="target">
              <span className="target__value">{item.reps}</span>
              <span className="target__unit">{ex.timed ? 'seconds' : 'reps'}</span>
            </div>
          )}

          <div className="set-dots" aria-label={`Set ${step.set} of ${item.sets}`}>
            {Array.from({ length: item.sets }, (_, i) => (
              <span key={i} className={`set-dot ${i + 1 < step.set ? 'is-done' : i + 1 === step.set ? 'is-now' : ''}`} />
            ))}
          </div>
          <p className="set-label">
            Set {step.set} of {item.sets}
          </p>

          <div className="tip-card">
            <Icon name="info" size={18} />
            <p>{ex.cue}</p>
          </div>
        </section>
      )}

      <div className="cta-bar cta-bar--session">
        {step.kind === 'warmup' && (
          <button className="btn btn--primary btn--block btn--lg" onClick={() => goTo(stepIndex + 1)}>
            I'm warm — start lifting
          </button>
        )}
        {step.kind === 'rest' && (
          <div className="adjust">
            <button className="btn btn--ghost btn--lg" onClick={() => adjust(-15)} aria-label="Remove 15 seconds">
              −15s
            </button>
            <button className="btn btn--primary btn--lg" onClick={() => goTo(stepIndex + 1)}>
              <Icon name="skip" size={18} /> Skip rest
            </button>
            <button className="btn btn--ghost btn--lg" onClick={() => adjust(15)} aria-label="Add 15 seconds">
              +15s
            </button>
          </div>
        )}
        {step.kind === 'work' && ex && item && (
          <>
            {ex.timed && endAt === null ? (
              <button className="btn btn--primary btn--block btn--lg" onClick={() => onUpdate({ ...session, endAt: Date.now() + item.reps * 1000 })}>
                <Icon name="play" size={18} /> Start {item.reps}s hold
              </button>
            ) : (
              <button className="btn btn--primary btn--block btn--lg" onClick={completeSet}>
                <Icon name="check" size={20} /> {ex.timed ? 'Done early' : 'Set done'}
              </button>
            )}
          </>
        )}
        <div className="cta-bar__secondary">
          {step.kind === 'work' && (
            <button className="link" onClick={skipExercise}>
              Skip exercise
            </button>
          )}
          <button className="link" onClick={() => setMenu(true)}>
            End workout
          </button>
        </div>
      </div>

      <Sheet open={menu} title="End workout?" onClose={() => setMenu(false)}>
        <p className="sheet__text">
          You've done {setsDone} of {totalSets} sets in {formatClock(elapsed)}.
        </p>
        <div className="stack">
          <button className="btn btn--primary btn--block" disabled={setsDone === 0} onClick={() => onFinish(makeEntry(done))}>
            Finish & save to history
          </button>
          <button className="btn btn--danger btn--block" onClick={() => onFinish(null)}>
            Discard workout
          </button>
          <button className="btn btn--ghost btn--block" onClick={() => setMenu(false)}>
            Keep going
          </button>
        </div>
      </Sheet>
    </main>
  )
}
