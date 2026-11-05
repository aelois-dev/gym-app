import { EXERCISES, type EquipmentMode, type Kit, type Muscle } from '../data/exercises'
import { generatePlan, uid, workoutName, type PlanInput, type Workout } from './planner'
import type { ProgramDay } from './program'
import type { HistoryEntry, PresetLineup } from './storage'

/** Deterministic random numbers from a string seed (FNV-1a hash into mulberry32). */
export function seededRandom(seed: string): () => number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  let a = h >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface Variant {
  key: string
  label: string
  blurb: string
  prefer?: Kit[]
}

export const VARIANTS: Record<EquipmentMode, Variant[]> = {
  gym: [
    { key: 'barbell', label: 'Barbell focus', blurb: 'Heavy free-weight lifts', prefer: ['barbell'] },
    { key: 'dumbbell', label: 'Dumbbell focus', blurb: 'Dumbbells, each side working alone', prefer: ['dumbbell'] },
    { key: 'machine', label: 'Machines and cables', blurb: 'Guided paths, easy to load', prefer: ['machine', 'cable'] },
  ],
  dumbbell: [
    { key: 'a', label: 'Version A', blurb: 'Dumbbells and bodyweight' },
    { key: 'b', label: 'Version B', blurb: 'Different dumbbell moves' },
    { key: 'c', label: 'Version C', blurb: 'A third mix' },
  ],
  bodyweight: [
    { key: 'a', label: 'Version A', blurb: 'No equipment' },
    { key: 'b', label: 'Version B', blurb: 'Different bodyweight moves' },
    { key: 'c', label: 'Version C', blurb: 'A third mix' },
  ],
}

export interface Preset {
  id: string
  name: string
  blurb: string
  workout: Workout
}

const known = new Set(EXERCISES.map((e) => e.id))

/** A preset's workout: generated from a fixed seed, or the line-up saved the first time it was finished. */
export function presetWorkout(id: string, name: string, input: PlanInput, saved?: PresetLineup): Workout {
  const w = generatePlan({ ...input, count: input.count ?? null }, seededRandom(id))
  const lineup = saved?.filter((it) => known.has(it.exerciseId))
  const items = lineup?.length ? lineup.map((it) => ({ ...it, uid: uid() })) : w.items
  return { ...w, name, presetId: id, items }
}

/** Presets are shared by days with the same name: "push-1" and "push-2" both use "push:…". */
const dayKey = (day: ProgramDay) => day.id.replace(/-\d+$/, '')

/** The three fixed versions of a program day. */
export function dayPresets(input: PlanInput, day: ProgramDay, saved: Record<string, PresetLineup>): Preset[] {
  return VARIANTS[input.equipment].map((v) => {
    const id = `${dayKey(day)}:${v.key}`
    const name = `${day.name} (${v.label.charAt(0).toLowerCase()}${v.label.slice(1)})`
    return { id, name: v.label, blurb: v.blurb, workout: presetWorkout(id, name, { ...input, muscles: day.muscles, prefer: v.prefer }, saved[id]) }
  })
}

const QUICK: { key: string; name: string; muscles: Muscle[] }[] = [
  { key: 'upper', name: 'Upper body', muscles: ['chest', 'back', 'shoulders', 'biceps', 'triceps'] },
  { key: 'lower', name: 'Lower body', muscles: ['legs', 'glutes', 'core'] },
  { key: 'full', name: 'Full body', muscles: ['legs', 'chest', 'back', 'shoulders', 'core'] },
  { key: 'push', name: 'Push', muscles: ['chest', 'shoulders', 'triceps'] },
  { key: 'pull', name: 'Pull', muscles: ['back', 'biceps'] },
  { key: 'arms', name: 'Arms', muscles: ['biceps', 'triceps', 'shoulders'] },
]

/** Fixed quick-start workouts for the Plan tab, one per equipment mode. */
export function quickPresets(input: Omit<PlanInput, 'muscles'>, saved: Record<string, PresetLineup>): Preset[] {
  return QUICK.map((q) => {
    const id = `quick:${q.key}:${input.equipment}`
    return {
      id,
      name: q.name,
      blurb: workoutName(q.muscles),
      workout: presetWorkout(id, q.name, { ...input, muscles: q.muscles, count: null, prefer: undefined }, saved[id]),
    }
  })
}

export interface Usage {
  count: number
  lastAt: number | null
}

export function presetUsage(history: HistoryEntry[], presetId: string): Usage {
  const hits = history.filter((h) => h.presetId === presetId)
  return { count: hits.length, lastAt: hits.length ? Math.max(...hits.map((h) => h.finishedAt)) : null }
}

export function usageLabel(u: Usage): string {
  if (!u.count || u.lastAt === null) return 'Not done yet'
  const date = new Date(u.lastAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  return u.count === 1 ? `Done once, on ${date}` : `Done ${u.count} times, last on ${date}`
}

/** The preset chosen by default: the one last finished for this program day, else the first. */
export function defaultPreset(presets: Preset[], history: HistoryEntry[], programDay?: string): Preset {
  const ids = new Set(presets.map((p) => p.id))
  const last = history.find((h) => h.presetId && ids.has(h.presetId) && (!programDay || h.programDay === programDay))
  return presets.find((p) => p.id === last?.presetId) ?? presets[0]
}

/**
 * The line-up to remember after finishing a preset. A low-readiness day had a set taken off and
 * rest added; the planned values it kept are stored instead. Edits made that day still count.
 */
export function lineupToSave(w: Workout): PresetLineup {
  return w.items.map((it) => {
    const restSec = it.baseRestSec ?? it.restSec
    return { exerciseId: it.exerciseId, sets: it.baseSets ?? it.sets, reps: it.reps, ...(restSec !== undefined ? { restSec } : {}) }
  })
}
