import { describe, expect, it } from 'vitest'
import { EXERCISES } from '../data/exercises'
import { fitBox, phase } from './ExerciseAnimation'
import { FLOOR, PATTERNS, animationFor, type Pattern } from './patterns'
import { LEN, lerpPose, solve } from './rig'

const frames = [0, 0.25, 0.5, 0.75, 1]
const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1])

describe('exercise animations', () => {
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
          expect(p[1]).toBeLessThanOrEqual(FLOOR + 3)
        }
        // Bones keep their length (IK/FK never stretches a limb).
        expect(dist(sk.arm.root, sk.arm.mid)).toBeCloseTo(LEN.upperArm, 1)
        expect(dist(sk.arm.mid, sk.arm.end)).toBeCloseTo(LEN.foreArm, 1)
        expect(dist(sk.leg.root, sk.leg.mid)).toBeCloseTo(LEN.thigh, 1)
        expect(dist(sk.leg.mid, sk.leg.end)).toBeCloseTo(LEN.shin, 1)
      }
      const box = fitBox(pattern)
      expect(box.w / box.h).toBeCloseTo(1.25, 2)
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
