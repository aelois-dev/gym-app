import type { Muscle } from '../data/exercises'
import type { Workout } from './planner'

export interface HistoryEntry {
  id: string
  finishedAt: number
  name: string
  muscles: Muscle[]
  durationSec: number
  targetMin: number
  setsDone: number
  totalSets: number
  exercises: {
    /** Missing on entries saved before weights were tracked. */
    exerciseId?: string
    name: string
    setsDone: number
    sets: number
    reps: number
    timed?: boolean
    /** Weight logged for each completed set, in kg. */
    weights?: (number | null)[]
  }[]
}

export interface SavedWorkout {
  savedAt: number
  workout: Workout
}

export interface ActiveSession {
  workout: Workout
  stepIndex: number
  startedAt: number
  /** Timestamp when the current countdown (warm-up, rest or hold) ends. */
  endAt: number | null
  /** Sets completed per plan item uid. */
  done: Record<string, number>
  /** Weight logged for each completed set, per plan item uid (null = not recorded). */
  weights?: Record<string, (number | null)[]>
  /** Weight entered for the set in progress, per plan item uid. */
  current?: Record<string, number | null>
}

export interface Prefs {
  muscles: Muscle[]
  minutes: number
  equipment: Workout['equipment']
  goal: Workout['goal']
  /** Default rest after sets of compound lifts / other exercises, in seconds. */
  restCompound: number
  restIsolation: number
  /** Exact number of exercises, or null to fill the time. */
  exerciseCount: number | null
  warmup: boolean
  sound: boolean
}

const KEYS = {
  history: 'gp.history.v1',
  saved: 'gp.saved.v1',
  active: 'gp.active.v1',
  prefs: 'gp.prefs.v1',
  weights: 'gp.weights.v1',
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable (private mode / quota) — app still works for this visit */
  }
}

export const store = {
  history: () => read<HistoryEntry[]>(KEYS.history, []),
  addHistory(entry: HistoryEntry) {
    write(KEYS.history, [entry, ...store.history()].slice(0, 200))
  },
  removeHistory(id: string) {
    write(KEYS.history, store.history().filter((h) => h.id !== id))
  },

  saved: () => read<SavedWorkout[]>(KEYS.saved, []),
  saveWorkout(workout: Workout) {
    const rest = store.saved().filter((s) => s.workout.id !== workout.id)
    write(KEYS.saved, [{ savedAt: Date.now(), workout }, ...rest])
  },
  removeSaved(id: string) {
    write(KEYS.saved, store.saved().filter((s) => s.workout.id !== id))
  },
  isSaved: (id: string) => store.saved().some((s) => s.workout.id === id),

  active: () => read<ActiveSession | null>(KEYS.active, null),
  setActive: (s: ActiveSession | null) => write(KEYS.active, s),

  prefs: () => read<Prefs | null>(KEYS.prefs, null),
  setPrefs: (p: Prefs) => write(KEYS.prefs, p),

  /** Last weight used per exercise id, in kg. */
  lastWeights: () => read<Record<string, number>>(KEYS.weights, {}),
  rememberWeights(entry: HistoryEntry) {
    const next = { ...store.lastWeights() }
    for (const e of entry.exercises) {
      const last = [...(e.weights ?? [])].reverse().find((w) => typeof w === 'number')
      if (e.exerciseId && typeof last === 'number') next[e.exerciseId] = last
    }
    write(KEYS.weights, next)
  },
}
