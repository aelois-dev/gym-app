import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { ExerciseSheet } from '../components/ExerciseSheet'
import { ProgressRing, Sheet } from '../components/ui'
import { ExerciseAnimation, animationCaption } from '../figure/ExerciseAnimation'
import { getExercise } from '../data/exercises'
import { alarm, keepAwake, tick, unlockAudio } from '../lib/feedback'
import { WARMUP_SEC, formatClock, restFor, uid, type PlanItem, type Workout } from '../lib/planner'
import { tracksWeight } from '../lib/weights'
import { WeightField } from '../components/WeightField'
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

/** Rest before a set uses the rest of the exercise just finished (the previous item between exercises). */
function restOfStep(step: Step, w: Workout): number {
  if (step.kind !== 'rest') return 0
  const from = step.set > 1 ? step.item : step.item - 1
  return restFor(w.items[Math.max(0, from)], w)
}

function endAtFor(step: Step | undefined, w: Workout, now: number): number | null {
  if (!step) return null
  if (step.kind === 'warmup') return now + WARMUP_SEC * 1000
  if (step.kind === 'rest') return now + restOfStep(step, w) * 1000
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
  const [demo, setDemo] = useState(false)
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

  const logged = session.weights ?? {}
  /** The weight shown for the set in progress: what was typed, else the last set's, else the plan's. */
  const weightNow = (it: PlanItem): number | undefined => {
    const typed = session.current?.[it.uid]
    if (typed !== undefined) return typed ?? undefined
    const prev = [...(logged[it.uid] ?? [])].reverse().find((w) => typeof w === 'number')
    return prev ?? it.weightKg
  }

  const makeEntry = (d: Record<string, number>, wts: Record<string, (number | null)[]> = logged): HistoryEntry => ({
    id: uid(),
    finishedAt: Date.now(),
    name: workout.name,
    ...(workout.programDay ? { programDay: workout.programDay } : {}),
    muscles: workout.muscles,
    durationSec: Math.round((Date.now() - session.startedAt) / 1000),
    targetMin: workout.targetMin,
    setsDone: Object.values(d).reduce((n, v) => n + v, 0),
    totalSets,
    exercises: workout.items.map((it) => {
      const ex = getExercise(it.exerciseId)
      return {
        exerciseId: ex.id,
        name: ex.name,
        setsDone: d[it.uid] ?? 0,
        sets: it.sets,
        reps: it.reps,
        ...(ex.timed ? { timed: true } : {}),
        ...(wts[it.uid]?.some((w) => w !== null) ? { weights: wts[it.uid] } : {}),
      }
    }),
  })

  const goTo = (index: number, d: Record<string, number> = done, extra: Partial<ActiveSession> = {}) => {
    if (index >= steps.length) {
      onFinish(makeEntry(d, extra.weights ?? logged))
      return
    }
    lastTick.current = null
    onUpdate({ ...session, ...extra, stepIndex: index, done: d, endAt: endAtFor(steps[index], workout, Date.now()) })
  }

  const completeSet = () => {
    if (!step || step.kind !== 'work') return
    const it = workout.items[step.item]
    const id = it.uid
    const kg = tracksWeight(getExercise(it.exerciseId).kit) ? weightNow(it) : undefined
    // Log this set's weight; the next set starts from it.
    const weights = { ...logged, [id]: [...(logged[id] ?? []), kg ?? null] }
    const { [id]: _typed, ...current } = session.current ?? {}
    goTo(stepIndex + 1, { ...done, [id]: (done[id] ?? 0) + 1 }, { weights, current })
  }

  const setWeight = (it: PlanItem, kg: number | undefined) => onUpdate({ ...session, current: { ...(session.current ?? {}), [it.uid]: kg ?? null } })

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
          <span className="top-bar__name">{workout.name}</span>
          <span className="clock num">
            {formatClock(elapsed)} <span className="muted">of {workout.targetMin}:00</span>
          </span>
        </div>
        <button className="icon-btn" onClick={() => onSound(!sound)} aria-label={sound ? 'Mute sounds' : 'Turn sounds on'} aria-pressed={sound}>
          <Icon name={sound ? 'sound' : 'mute'} />
        </button>
      </header>

      <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={totalSets} aria-valuenow={setsDone} aria-label="Sets done">
        <div className="progress__fill" style={{ width: `${(setsDone / totalSets) * 100}%` }} />
      </div>

      {flashing && step.kind === 'work' && item && (
        <div className="flash" role="alert">
          Rest's over. Set {step.set} of {item.sets}.
        </div>
      )}

      {step.kind === 'warmup' && (
        <section className="stage">
          <h1 className="display">Warm up</h1>
          <ProgressRing progress={1 - remaining / WARMUP_SEC} size={220}>
            <span className="ring__time num">{formatClock(remaining)}</span>
            <span className="ring__label">left</span>
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
          <h1 className="display">Rest</h1>
          <ProgressRing progress={1 - remaining / restOfStep(step, workout)} size={250}>
            <span className="ring__time num">{formatClock(remaining)}</span>
            <span className="ring__label">of {formatClock(restOfStep(step, workout))}</span>
          </ProgressRing>
          <button className="next-row" onClick={() => setDemo(true)} aria-label={`Next: ${ex.name}. Watch the demo`}>
            <span className="thumb thumb--lg">
              <ExerciseAnimation exerciseId={ex.id} paused={step.set !== 1} frame={step.set !== 1 ? 1 : undefined} />
            </span>
            <span className="next-row__text">
              <span className="muted">{step.set === 1 ? 'Next exercise' : 'Next set'}</span>
              <strong>{ex.name}</strong>
              <span className="muted">
                Set {step.set} of {item.sets}, {item.reps} {ex.timed ? 'seconds' : 'reps'}
              </span>
            </span>
          </button>
        </section>
      )}

      {step.kind === 'work' && item && ex && (
        <section className="stage stage--work">
          <p className="stage__count">
            Exercise {step.item + 1} of {workout.items.length}
          </p>
          <h1 className="display work-title">{ex.name}</h1>

          {ex.timed && endAt !== null ? (
            <ProgressRing progress={1 - remaining / item.reps} size={230}>
              <span className="ring__time num">{formatClock(remaining)}</span>
              <span className="ring__label">hold</span>
            </ProgressRing>
          ) : (
            <div>
              <button className={`work-demo ${tracksWeight(ex.kit) ? 'work-demo--compact' : ''}`} onClick={() => setDemo(true)} aria-label={`Show ${ex.name} demo and form tip`}>
                <ExerciseAnimation exerciseId={ex.id} />
              </button>
              {animationCaption(ex.id) && <p className="fig-caption">{animationCaption(ex.id)}</p>}
            </div>
          )}

          <div className="work-target">
            <span className="target__value num">{item.reps}</span>
            <span className="target__unit">{ex.timed ? 'seconds' : 'reps'}</span>
            <span className="work-target__sets">
              <span className="set-dots" aria-hidden="true">
                {Array.from({ length: item.sets }, (_, i) => (
                  <span key={i} className={`set-dot ${i + 1 < step.set ? 'is-done' : i + 1 === step.set ? 'is-now' : ''}`} />
                ))}
              </span>
              <span className="set-label">
                Set {step.set} of {item.sets}
              </span>
            </span>
          </div>
          {tracksWeight(ex.kit) && (
            <div className="work-weight">
              <WeightField kit={ex.kit} size="lg" label={`${ex.name} weight for set ${step.set}`} value={weightNow(item)} onChange={(kg) => setWeight(item, kg)} />
              {item.weightNote && step.set === 1 && <p className="coach-hint coach-hint--center">{item.weightNote}</p>}
            </div>
          )}
          <p className="cue cue--work">{ex.cue}</p>
        </section>
      )}

      <div className="cta-bar cta-bar--session">
        {step.kind === 'warmup' && (
          <button className="btn btn--primary btn--block btn--lg" onClick={() => goTo(stepIndex + 1)}>
            Start lifting
          </button>
        )}
        {step.kind === 'rest' && (
          <div className="adjust">
            <button className="btn btn--quiet btn--lg" onClick={() => adjust(-15)} aria-label="Remove 15 seconds">
              −15s
            </button>
            <button className="btn btn--primary btn--lg" onClick={() => goTo(stepIndex + 1)}>
              <Icon name="skip" size={18} /> Skip rest
            </button>
            <button className="btn btn--quiet btn--lg" onClick={() => adjust(15)} aria-label="Add 15 seconds">
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
                {ex.timed ? 'Done early' : 'Set done'}
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

      <ExerciseSheet exerciseId={demo && ex ? ex.id : null} sets={item?.sets} reps={item?.reps} onClose={() => setDemo(false)} />

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
          <button className="btn btn--quiet btn--block" onClick={() => setMenu(false)}>
            Keep going
          </button>
        </div>
      </Sheet>
    </main>
  )
}
