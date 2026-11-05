import { describe, expect, it } from 'vitest'
import { EXERCISES } from '../data/exercises'
import { phase } from './ExerciseAnimation'
import { drawScene, frameFor } from './view34'
import { FLOOR, PATTERNS, animationFor, type Pattern } from './patterns'
import { LEN, lerpPose, solve, type LimbSpec } from './rig'

const frames = [0, 0.25, 0.5, 0.75, 1]
const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1])

describe('exercise animations', () => {
  it('fly exercises use a view that shows the arms opening sideways', () => {
    for (const id of ['db-fly', 'cable-crossover', 'pec-deck', 'rear-delt-fly']) {
      const ex = EXERCISES.find((e) => e.id === id)!
      const { pattern } = animationFor(id, ex.kit)!
      expect(pattern.view, id).toBe('front')
      // The hands travel a long way sideways on screen during the rep.
      const x0 = solve(pattern.a, 'front').arm.end[0]
      const x1 = solve(pattern.b, 'front').arm.end[0]
      expect(Math.abs(x1 - x0), id).toBeGreaterThan(18)
    }
  })

  it('start and end poses describe each limb the same way, so the pose blends', () => {
    const kind = (l?: LimbSpec) => (l ? (l.v3 ? 'v3' : l.a ? 'fk' : l.at ? `ik:${l.from ?? 'world'}` : 'none') : 'default')
    const bad: string[] = []
    for (const [id, raw] of Object.entries(PATTERNS)) {
      const p = raw as Pattern
      for (const limb of ['arm', 'arm2', 'leg', 'leg2'] as const) {
        if (kind(p.a[limb]) !== kind(p.b[limb])) bad.push(`${id}.${limb}: ${kind(p.a[limb])} vs ${kind(p.b[limb])}`)
      }
    }
    expect(bad).toEqual([])
  })

    it('every exercise has an animation', () => {
    const missing = EXERCISES.filter((e) => !animationFor(e.id, e.kit)).map((e) => e.id)
    expect(missing).toEqual([])
  })

  for (const [id, raw] of Object.entries(PATTERNS)) {
    const pattern = raw as Pattern
    it(`${id}: solves to finite, well-formed skeletons above the floor`, () => {
      for (const k of frames) {
        const sk = solve(lerpPose(pattern.a, pattern.b, k), pattern.view)
        const pts = [sk.hip, sk.shoulder, sk.head, ...[sk.arm, sk.arm2, sk.leg, sk.leg2].flatMap((l) => [l.root, l.mid, l.end, ...(l.toe ? [l.toe] : [])])]
        for (const p of pts) {
          expect(Number.isFinite(p[0]) && Number.isFinite(p[1])).toBe(true)
          if (!pattern.overhead) expect(p[1]).toBeLessThanOrEqual(FLOOR + 3)
        }
        // Bones keep their length (IK/FK never stretches a limb). 3D limbs may look shorter when
        // they point toward or away from the viewer, but never longer.
        const bone = (len: number, a: number[], b: number[], is3d: boolean) =>
          is3d ? expect(dist(a, b)).toBeLessThanOrEqual(len + 0.01) : expect(dist(a, b)).toBeCloseTo(len, 1)
        const arm3d = !!pattern.a.arm.v3
        const leg3d = !!pattern.a.leg.v3
        bone(LEN.upperArm, sk.arm.root, sk.arm.mid, arm3d)
        bone(LEN.foreArm, sk.arm.mid, sk.arm.end, arm3d)
        bone(LEN.thigh, sk.leg.root, sk.leg.mid, leg3d)
        bone(LEN.shin, sk.leg.mid, sk.leg.end, leg3d)
      }
      const box = frameFor(pattern, 'barbell')
      expect(box.w / box.h).toBeCloseTo(1.25, 2)
      // Every shape of the three-quarter drawing is a finite path.
      for (const k of frames) {
        for (const g of drawScene(pattern, 'barbell', k, 'chest')) for (const p of g.prims) expect(p.d, id).not.toMatch(/NaN|Infinity/)
      }
    })
  }
})

describe('phase', () => {
  it('starts and ends at pose A and peaks at pose B', () => {
    expect(phase(0)).toBe(0)
    expect(phase(0.45)).toBe(1)
    expect(phase(0.95)).toBe(0)
    expect(phase(0.5, true)).toBeCloseTo(1)
  })
})
