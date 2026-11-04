import {
  EXERCISES,
  KITS_FOR_MODE,
  getExercise,
  type EquipmentMode,
  type Exercise,
  type Muscle,
} from '../data/exercises'

export type Goal = 'strength' | 'muscle' | 'endurance'

export const GOALS: { id: Goal; label: string; scheme: string; rest: number }[] = [
  { id: 'strength', label: 'Strength', scheme: '4 × 5', rest: 120 },
  { id: 'muscle', label: 'Muscle', scheme: '3 × 10', rest: 75 },
  { id: 'endurance', label: 'Endurance', scheme: '3 × 15', rest: 45 },
]

const BASE: Record<Goal, { sets: number; reps: number; holdSec: number }> = {
  strength: { sets: 4, reps: 5, holdSec: 20 },
  muscle: { sets: 3, reps: 10, holdSec: 30 },
  endurance: { sets: 3, reps: 15, holdSec: 45 },
}

export const WARMUP_SEC = 5 * 60
/** Seconds per rep, plus time to get set up for each set. */
export const SEC_PER_REP = 3
export const SET_SETUP_SEC = 10
/** Extra time to move between exercises (on top of rest). */
export const TRANSITION_SEC = 30
export const MAX_EXERCISES = 10
export const MAX_SETS = 10

export interface PlanItem {
  uid: string
  exerciseId: string
  sets: number
  /** Reps, or seconds when the exercise is timed. */
  reps: number
}

export interface Workout {
  id: string
  name: string
  muscles: Muscle[]
  equipment: EquipmentMode
  goal: Goal
  restSec: number
  warmup: boolean
  targetMin: number
  items: PlanItem[]
}

export interface PlanInput {
  muscles: Muscle[]
  minutes: number
  equipment: EquipmentMode
  goal: Goal
  restSec: number
  warmup: boolean
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

export function defaultPrescription(ex: Exercise, goal: Goal): { sets: number; reps: number } {
  const base = BASE[goal]
  if (ex.timed) return { sets: 3, reps: base.holdSec }
  return { sets: base.sets + (ex.compound ? 1 : 0), reps: base.reps }
}

export function workSeconds(ex: Exercise, reps: number): number {
  return (ex.timed ? reps : reps * SEC_PER_REP) + SET_SETUP_SEC
}

type Timing = Pick<Workout, 'items' | 'restSec' | 'warmup'>

/** Estimated session length in seconds. Rest follows every set except the last one. */
export function estimateSeconds({ items, restSec, warmup }: Timing): number {
  if (items.length === 0) return warmup ? WARMUP_SEC : 0
  let total = warmup ? WARMUP_SEC : 0
  let sets = 0
  for (const it of items) {
    total += it.sets * workSeconds(getExercise(it.exerciseId), it.reps)
    sets += it.sets
  }
  total += Math.max(0, sets - 1) * restSec
  total += (items.length - 1) * TRANSITION_SEC
  return total
}

export function poolFor(muscle: Muscle, equipment: EquipmentMode): Exercise[] {
  const kits = KITS_FOR_MODE[equipment]
  return EXERCISES.filter((e) => e.muscle === muscle && kits.includes(e.kit))
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const ORDER: Muscle[] = ['legs', 'glutes', 'chest', 'back', 'shoulders', 'triceps', 'biceps', 'core']

export function workoutName(muscles: Muscle[]): string {
  const labels = [...muscles]
    .sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b))
    .map((m) => m[0].toUpperCase() + m.slice(1))
  if (labels.length === 0) return 'Workout'
  if (labels.length <= 2) return `${labels.join(' & ')} Day`
  return `${labels.slice(0, -1).join(', ')} & ${labels.at(-1)}`
}

export function generatePlan(input: PlanInput, rand: () => number = Math.random): Workout {
  const muscles = [...input.muscles].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b))
  const budget = input.minutes * 60
  const workout: Workout = {
    id: uid(),
    name: workoutName(muscles),
    muscles,
    equipment: input.equipment,
    goal: input.goal,
    restSec: input.restSec,
    warmup: input.warmup,
    targetMin: input.minutes,
    items: [],
  }

  // Per-muscle queues: compounds first, then isolation, each shuffled for variety.
  const queues = new Map<Muscle, Exercise[]>()
  for (const m of muscles) {
    const pool = poolFor(m, input.equipment)
    // Alternate compound / isolation (compound first) so plans get a balanced mix.
    // Within each group, prefer the equipment the user chose; bodyweight moves are the fallback.
    const preferred = (e: Exercise) => input.equipment === 'bodyweight' || e.kit !== 'bodyweight'
    const ordered = (list: Exercise[]) => [...shuffle(list.filter(preferred), rand), ...shuffle(list.filter((e) => !preferred(e)), rand)]
    const comp = ordered(pool.filter((e) => e.compound))
    const iso = ordered(pool.filter((e) => !e.compound))
    const q: Exercise[] = []
    while (comp.length || iso.length) {
      if (comp.length) q.push(comp.shift()!)
      if (iso.length) q.push(iso.shift()!)
    }
    queues.set(m, q)
  }

  const fits = (items: PlanItem[]) => estimateSeconds({ ...workout, items }) <= budget

  // Round-robin across muscles so every muscle gets work before any gets seconds.
  let added = true
  while (added && workout.items.length < MAX_EXERCISES) {
    added = false
    for (const m of muscles) {
      if (workout.items.length >= MAX_EXERCISES) break
      const q = queues.get(m)!
      const ex = q[0]
      if (!ex) continue
      const item: PlanItem = { uid: uid(), exerciseId: ex.id, ...defaultPrescription(ex, input.goal) }
      const next = [...workout.items, item]
      if (fits(next) || workout.items.length === 0) {
        q.shift()
        workout.items = next
        added = true
      }
    }
  }

  // Use leftover time: one extra set on compound lifts, in order.
  for (const it of workout.items) {
    const ex = getExercise(it.exerciseId)
    if (!ex.compound) continue
    const bumped = workout.items.map((x) => (x === it ? { ...x, sets: x.sets + 1 } : x))
    if (fits(bumped)) workout.items = bumped
  }

  // Compounds first, core last; keep relative order otherwise.
  const rank = (it: PlanItem) => {
    const ex = getExercise(it.exerciseId)
    return ex.muscle === 'core' ? 2 : ex.compound ? 0 : 1
  }
  workout.items = workout.items
    .map((it, i) => ({ it, i }))
    .sort((a, b) => rank(a.it) - rank(b.it) || a.i - b.i)
    .map(({ it }) => it)

  return workout
}

/** Exercises that could replace `exerciseId` — same muscle, allowed equipment, not already in the plan. */
export function swapCandidates(workout: Workout, exerciseId: string): Exercise[] {
  const current = getExercise(exerciseId)
  const used = new Set(workout.items.map((i) => i.exerciseId))
  return poolFor(current.muscle, workout.equipment).filter((e) => !used.has(e.id))
}

/** Exercises that could be added for any targeted muscle. */
export function addCandidates(workout: Workout): Exercise[] {
  const used = new Set(workout.items.map((i) => i.exerciseId))
  return workout.muscles.flatMap((m) => poolFor(m, workout.equipment)).filter((e) => !used.has(e.id))
}

export function formatDuration(sec: number): string {
  const m = Math.round(sec / 60)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r ? `${h} h ${r} min` : `${h} h`
}

export function formatClock(sec: number): string {
  const s = Math.max(0, Math.round(sec))
  const m = Math.floor(s / 60)
  const ss = String(s % 60).padStart(2, '0')
  if (m >= 60) return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}:${ss}`
  return `${m}:${ss}`
}
