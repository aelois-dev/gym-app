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
  exercises: { name: string; setsDone: number; sets: number; reps: number; timed?: boolean }[]
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
}

export interface Prefs {
  muscles: Muscle[]
  minutes: number
  equipment: Workout['equipment']
  goal: Workout['goal']
  restSec: number
  warmup: boolean
  sound: boolean
}

const KEYS = {
  history: 'gp.history.v1',
  saved: 'gp.saved.v1',
  active: 'gp.active.v1',
  prefs: 'gp.prefs.v1',
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
}
