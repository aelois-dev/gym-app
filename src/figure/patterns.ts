import type { Kit } from '../data/exercises'
import type { AttachRef, LimbSpec, Pose, Pt, Vec3, View } from './rig'

export type LoadKind = 'barbell' | 'dumbbell' | 'cable' | 'machine' | 'none'

export type Prop =
  | { kind: 'bench'; x: number; y: number; w: number }
  | { kind: 'box'; x: number; y: number; w: number }
  | { kind: 'bar'; x1: number; x2: number; y: number }
  | { kind: 'dipBars'; x1: number; x2: number; y: number }
  | { kind: 'wall'; x: number }
  | { kind: 'pad'; from: Pt; to: Pt; w?: number }
  | { kind: 'rect'; x: number; y: number; w: number; h: number; tone: 'pad' | 'block' | 'steel' }

export interface Pattern {
  view?: View
  a: Pose
  b: Pose
  props?: Prop[]
  /** Where the weight sits (default: in the hands). */
  loadAt?: AttachRef
  /** Cable pulley / machine pivot position. */
  anchor?: Pt
  /** Moving pads attached to the body (leg extension, leg curl, sled). */
  pads?: AttachRef[]
  /** Seconds per full rep. */
  dur?: number
  /** Isometric hold: subtle motion only. */
  hold?: boolean
  /** Bird's-eye view: no floor line or shadow. */
  overhead?: boolean
  /** Short note shown under the figure when the camera angle isn't obvious. */
  caption?: string
  /** Machine pads along the forearms (pec deck). */
  armPads?: boolean
  /** Front view: only the near hand holds a cable (both hands share one handle). */
  singleCable?: boolean
}

export const FLOOR = 149
const ANKLE = 145
const STAND_HIP: Pt = [96, 84]

// Limb helpers
const fk = (a1: number, a2: number): LimbSpec => ({ a: [a1, a2] })
const w = (x: number, y: number, bend?: number): LimbSpec => ({ at: [x, y], bend })
const sh = (dx: number, dy: number, bend?: number): LimbSpec => ({ at: [dx, dy], from: 'shoulder', bend })
const feet = (x = 100): LimbSpec => w(x, ANKLE)
const v3 = (upper: Vec3, lower: Vec3): LimbSpec => ({ v3: [upper, lower] })

const stand = (arm: LimbSpec, extra: Partial<Pose> = {}): Pose => ({ hip: STAND_HIP, t: 0, arm, leg: feet(), ...extra })

// Lying on a bench, head to the left.
const BENCH: Prop = { kind: 'bench', x: 48, y: 110, w: 82 }
const lying = (arm: LimbSpec, extra: Partial<Pose> = {}): Pose => ({ hip: [110, 104], t: -90, arm, leg: w(140, ANKLE), ...extra })

// Lying on the floor, head to the left.
const floorBack = (arm: LimbSpec, leg: LimbSpec, extra: Partial<Pose> = {}): Pose => ({ hip: [100, 138], t: -90, arm, leg, ...extra })

const seated = (arm: LimbSpec, extra: Partial<Pose> = {}): Pose => ({ hip: [92, 108], t: -4, arm, leg: w(124, ANKLE), ...extra })
const SEAT: Prop = { kind: 'bench', x: 70, y: 112, w: 42 }
const SEAT_BACK: Prop = { kind: 'pad', from: [80, 112], to: [76, 58] }

export const PATTERNS = {
  // ---------- legs ----------
  squat: { a: stand(fk(90, 90)), b: { hip: [78, 114], t: 38, arm: fk(90, 90), leg: feet() } },
  squatBack: {
    a: stand(sh(-9, 4, -1)),
    b: { hip: [78, 114], t: 40, arm: sh(-9, 4, -1), leg: feet() },
    loadAt: { on: 'shoulder', offset: [-11, 3] },
  },
  squatFront: { a: stand(sh(9, -2, -1)), b: { hip: [80, 116], t: 22, arm: sh(9, -2, -1), leg: feet() } },
  squatGoblet: { a: stand(sh(12, 14)), b: { hip: [79, 116], t: 26, arm: sh(12, 14), leg: feet() } },
  deadlift: { a: { hip: [82, 106], t: 52, arm: fk(0, 0), leg: feet(102) }, b: { hip: STAND_HIP, t: 0, arm: fk(0, 0), leg: feet(102) } },
  rdl: { a: { hip: STAND_HIP, t: 0, arm: fk(0, 0), leg: feet(102) }, b: { hip: [84, 89], t: 72, arm: fk(0, 0), leg: feet(102) } },
  lunge: {
    a: { hip: [93, 90], t: 3, arm: fk(0, 0), leg: w(122, ANKLE), leg2: w(64, 141), foot2: 40 },
    b: { hip: [93, 114], t: 3, arm: fk(0, 0), leg: w(122, ANKLE), leg2: w(64, 141), foot2: 40 },
  },
  splitSquat: {
    a: { hip: [96, 92], t: 4, arm: fk(0, 0), leg: w(120, ANKLE), leg2: w(60, 116), foot2: -90 },
    b: { hip: [94, 113], t: 8, arm: fk(0, 0), leg: w(120, ANKLE), leg2: w(60, 116), foot2: -90 },
    props: [{ kind: 'bench', x: 34, y: 120, w: 38 }],
  },
  stepUp: {
    a: { hip: [94, 86], t: 14, arm: fk(0, 0), leg: w(124, 119), leg2: w(92, ANKLE) },
    b: { hip: [118, 60], t: 4, arm: fk(0, 0), leg: w(124, 119), leg2: w(108, 104) },
    props: [{ kind: 'box', x: 108, y: 123, w: 44 }],
  },
  calfRaise: {
    a: stand(fk(0, 0)),
    b: { hip: [96, 77], t: 0, arm: fk(0, 0), leg: w(100, 138), foot: 40 },
    dur: 1.8,
  },
  jumpSquat: {
    a: { hip: [79, 114], t: 34, arm: fk(-40, -30), leg: feet() },
    b: { hip: [97, 64], t: 0, arm: fk(150, 160), leg: w(100, 125), foot: 50 },
    dur: 1.6,
  },
  wallSit: {
    a: { hip: [74, 114], t: 0, arm: fk(40, 80), leg: w(106, ANKLE) },
    b: { hip: [74, 115], t: 0, arm: fk(40, 80), leg: w(106, ANKLE) },
    props: [{ kind: 'wall', x: 64 }],
    hold: true,
  },
  legPress: {
    a: { hip: [70, 112], t: -60, arm: fk(30, 60), leg: w(102, 82) },
    b: { hip: [70, 112], t: -60, arm: fk(30, 60), leg: w(122, 62) },
    props: [{ kind: 'pad', from: [84, 118], to: [40, 92], w: 8 }],
    pads: [{ on: 'ankle', offset: [0, 0] }],
  },
  legExtension: {
    a: { hip: [86, 108], t: -8, arm: fk(10, 40), leg: fk(90, 5) },
    b: { hip: [86, 108], t: -8, arm: fk(10, 40), leg: fk(90, 82) },
    props: [{ kind: 'bench', x: 70, y: 112, w: 50 }, { kind: 'pad', from: [76, 112], to: [72, 64] }],
    pads: [{ on: 'ankle' }],
  },
  legCurl: {
    a: { hip: [84, 107], t: 92, arm: fk(10, 70), leg: fk(-90, -90), foot: -150 },
    b: { hip: [84, 107], t: 92, arm: fk(10, 70), leg: fk(-90, 160), foot: 120 },
    props: [{ kind: 'bench', x: 40, y: 112, w: 100 }],
    pads: [{ on: 'ankle' }],
  },

  // ---------- glutes ----------
  hipThrust: {
    a: { hip: [94, 132], t: -55, arm: w(94, 124), leg: w(126, ANKLE) },
    b: { hip: [102, 108], t: -90, arm: w(102, 100), leg: w(126, ANKLE) },
    props: [{ kind: 'bench', x: 28, y: 114, w: 40 }],
    loadAt: { on: 'hip', offset: [9, 0] },
  },
  bridge: {
    a: floorBack(fk(90, 90), w(124, ANKLE), { hip: [92, 140] }),
    b: floorBack(fk(90, 90), w(124, ANKLE), { hip: [96, 118], t: -116 }),
  },
  singleBridge: {
    a: floorBack(fk(90, 90), w(124, ANKLE), { hip: [92, 140], leg2: fk(112, 112) }),
    b: floorBack(fk(90, 90), w(124, ANKLE), { hip: [96, 118], t: -116, leg2: fk(116, 116) }),
  },
  donkeyKick: {
    a: { hip: [92, 110], t: 74, arm: w(131, ANKLE), leg: fk(0, -90), leg2: fk(0, -90), foot: -150, foot2: -150 },
    b: { hip: [92, 110], t: 74, arm: w(131, ANKLE), leg: fk(-95, -178), leg2: fk(0, -90), foot: -90, foot2: -150 },
  },
  cableKickback: {
    a: { hip: [96, 84], t: 18, arm: fk(70, 80), leg: fk(0, 0), leg2: feet(), foot: 90 },
    b: { hip: [96, 84], t: 22, arm: fk(70, 80), leg: fk(-42, -35), leg2: feet(), foot: 60 },
    loadAt: { on: 'ankle' },
    anchor: [150, 140],
  },
  abduction: {
    view: 'front',
    a: { hip: [100, 84], t: 0, arm: fk(10, 10), leg: fk(0, 0), leg2: fk(0, 0) },
    b: { hip: [97, 84], t: -5, arm: fk(10, 10), leg: fk(38, 38), leg2: fk(0, 0) },
    loadAt: { on: 'ankle' },
    anchor: [40, 140],
  },

  // ---------- chest ----------
  benchPress: { a: lying(w(80, 92)), b: lying(w(76, 58)), props: [BENCH] },
  inclinePress: {
    a: { hip: [112, 104], t: -58, arm: w(92, 72), leg: w(140, ANKLE) },
    b: { hip: [112, 104], t: -58, arm: w(84, 37), leg: w(140, ANKLE) },
    props: [{ kind: 'pad', from: [116, 111], to: [62, 77], w: 8 }, { kind: 'bench', x: 100, y: 111, w: 30 }],
  },
  pushUp: {
    a: { hip: [104, 128], t: 82, arm: w(138, ANKLE), leg: w(44, 142), foot: 15 },
    b: { hip: [98, 117], t: 66, arm: w(138, ANKLE), leg: w(44, 142), foot: 15 },
  },
  declinePushUp: {
    a: { hip: [107, 118], t: 92, arm: w(150, ANKLE), leg: w(44, 110), foot: 15 },
    b: { hip: [104, 112], t: 74, arm: w(150, ANKLE), leg: w(44, 110), foot: 15 },
    props: [{ kind: 'box', x: 22, y: 114, w: 36 }],
  },
  seatedPress: {
    a: { hip: [80, 108], t: -6, arm: w(100, 72), leg: w(114, ANKLE) },
    b: { hip: [80, 108], t: -6, arm: w(124, 70), leg: w(114, ANKLE) },
    props: [{ kind: 'bench', x: 60, y: 112, w: 40 }, { kind: 'pad', from: [70, 112], to: [66, 58] }],
    anchor: [60, 20],
  },

  // Flies move the arms toward and away from the camera, so they use front or bird's-eye views
  // with 3D arm directions (x = outward, y = up, z = toward the viewer).
  flyOverhead: {
    view: 'front',
    overhead: true,
    caption: 'Seen from above, lying on a flat bench',
    a: { hip: [100, 112], t: 0, arm: v3([1, 0.08, -0.3], [1, 0.12, -0.2]), leg: v3([0.42, -1, 0], [0.3, -0.25, -1]), foot: 15 },
    b: { hip: [100, 112], t: 0, arm: v3([0.18, 0, 1], [0.02, 0, 1]), leg: v3([0.42, -1, 0], [0.3, -0.25, -1]), foot: 15 },
    props: [
      { kind: 'rect', x: 80, y: 34, w: 40, h: 104, tone: 'steel' },
      { kind: 'rect', x: 83, y: 37, w: 34, h: 98, tone: 'block' },
    ],
  },
  crossover: {
    view: 'front',
    a: { hip: [100, 84], t: 0, arm: v3([0.95, 0.4, -0.15], [0.9, 0.35, 0.05]), leg: fk(5, 3) },
    b: { hip: [100, 84], t: 0, arm: v3([0.2, -0.45, 0.87], [-0.45, -0.35, 0.82]), leg: fk(5, 3) },
    anchor: [176, -8],
  },
  pecDeck: {
    view: 'front',
    a: { hip: [100, 112], t: 0, arm: v3([1, 0, -0.2], [0, 1, 0]), leg: v3([0.3, -0.15, 1], [0.05, -1, 0.05]), foot: 20 },
    b: { hip: [100, 112], t: 0, arm: v3([0.1, 0, 1], [0, 1, 0.1]), leg: v3([0.3, -0.15, 1], [0.05, -1, 0.05]), foot: 20 },
    props: [
      { kind: 'rect', x: 84, y: 30, w: 32, h: 86, tone: 'block' },
      { kind: 'rect', x: 97, y: 118, w: 6, h: 31, tone: 'steel' },
      { kind: 'rect', x: 80, y: 110, w: 40, h: 8, tone: 'pad' },
    ],
    armPads: true,
  },
  rearDeltFront: {
    view: 'front',
    a: { hip: [100, 86], t: 0, pitch: 62, arm: v3([0.12, -1, 0.25], [0.1, -1, 0.3]), leg: fk(5, 3) },
    b: { hip: [100, 86], t: 0, pitch: 62, arm: v3([1, -0.1, 0.1], [1, -0.2, 0.1]), leg: fk(5, 3) },
    anchor: [178, 76],
  },

  // ---------- back ----------
  bentRow: {
    a: { hip: [88, 88], t: 68, arm: w(126, 118), leg: feet(102) },
    b: { hip: [88, 88], t: 68, arm: w(110, 96), leg: feet(102) },
  },
  latPulldown: {
    a: { hip: [94, 108], t: -14, arm: w(92, 24), leg: w(126, ANKLE) },
    b: { hip: [94, 108], t: -14, arm: w(94, 60), leg: w(126, ANKLE) },
    props: [SEAT],
    anchor: [90, -16],
  },
  seatedRow: {
    a: { hip: [70, 128], t: 18, arm: w(118, 104), leg: w(134, 124) },
    b: { hip: [70, 128], t: -6, arm: w(92, 104), leg: w(134, 124) },
    props: [{ kind: 'bench', x: 50, y: 132, w: 40 }, { kind: 'pad', from: [142, 108], to: [142, 140], w: 5 }],
    anchor: [178, 114],
  },
  straightArm: {
    a: { hip: [92, 86], t: 24, arm: w(138, 20), leg: feet(102) },
    b: { hip: [92, 86], t: 24, arm: w(112, 96), leg: feet(102) },
    anchor: [164, -12],
  },
  pullover: { a: lying(w(30, 112)), b: lying(w(72, 60)), props: [BENCH] },
  pullUp: {
    a: { hip: [99, 82], t: 0, arm: w(102, -4), leg: fk(8, -20) },
    b: { hip: [99, 48], t: 0, arm: w(102, -4), leg: fk(8, -20) },
    props: [{ kind: 'bar', x1: 66, x2: 140, y: -6 }],
  },
  invertedRow: {
    a: { hip: [111, 137], t: 85, arm: w(150, 88), leg: w(50, 142), foot: 170 },
    b: { hip: [104.5, 114.7], t: 63.4, arm: w(150, 88), leg: w(50, 142), foot: 170 },
    props: [{ kind: 'dipBars', x1: 132, x2: 176, y: 88 }],
  },
  superman: {
    a: { hip: [96, 139], t: 90, arm: fk(90, 90), leg: fk(-90, -90), foot: -180 },
    b: { hip: [96, 139], t: 80, arm: fk(104, 106), leg: fk(-100, -102), foot: -180 },
    hold: true,
  },
  proneRaise: {
    a: { hip: [96, 139], t: 88, arm: fk(90, 90), leg: fk(-90, -90), foot: -180 },
    b: { hip: [96, 139], t: 84, arm: fk(118, 120), leg: fk(-90, -90), foot: -180 },
  },

  // ---------- shoulders ----------
  ohp: { a: stand(w(104, 46)), b: stand(w(98, -2)) },
  seatedOhp: { a: seated(w(98, 70)), b: seated(w(94, 23)), props: [SEAT, SEAT_BACK], anchor: [70, -6] },
  frontRaise: { a: stand(fk(4, 4)), b: stand(fk(90, 92)), anchor: [84, ANKLE] },
  lateralRaise: {
    view: 'front',
    a: { hip: [100, 84], t: 0, arm: fk(8, 10), leg: fk(4, 2) },
    b: { hip: [100, 84], t: 0, arm: fk(86, 90), leg: fk(4, 2) },
    anchor: [56, ANKLE],
  },
  facePull: {
    a: { hip: [94, 84], t: -6, arm: w(138, 48), leg: feet(98), leg2: w(84, ANKLE) },
    b: { hip: [94, 84], t: -6, arm: w(102, 32, -1), leg: feet(98), leg2: w(84, ANKLE) },
    anchor: [176, 44],
  },
  pike: {
    a: { hip: [96, 84], t: 135, arm: w(130, ANKLE), leg: w(60, 142), foot: 30 },
    b: { hip: [90, 88], t: 110, arm: w(130, ANKLE), leg: w(60, 142), foot: 30 },
  },

  // ---------- arms ----------
  curl: { a: stand(fk(0, 0)), b: stand(fk(-4, 150)), anchor: [112, ANKLE] },
  preacher: {
    a: { hip: [86, 110], t: 10, arm: fk(45, 50), leg: w(116, ANKLE) },
    b: { hip: [86, 110], t: 10, arm: fk(45, 168), leg: w(116, ANKLE) },
    props: [{ kind: 'bench', x: 64, y: 114, w: 40 }, { kind: 'pad', from: [100, 86], to: [118, 102], w: 6 }],
    anchor: [150, 120],
  },
  concentrationCurl: {
    a: { hip: [80, 112], t: 40, arm: fk(0, 0), leg: w(124, ANKLE) },
    b: { hip: [80, 112], t: 40, arm: fk(0, 158), leg: w(124, ANKLE) },
    props: [{ kind: 'bench', x: 54, y: 116, w: 50 }],
  },
  inclineCurl: {
    a: { hip: [104, 110], t: -42, arm: fk(0, 0), leg: w(134, ANKLE) },
    b: { hip: [104, 110], t: -42, arm: fk(0, 150), leg: w(134, ANKLE) },
    props: [{ kind: 'pad', from: [108, 117], to: [70, 74], w: 8 }, { kind: 'bench', x: 96, y: 117, w: 30 }],
  },
  skullCrusher: { a: lying(w(60, 84)), b: lying(w(68, 58)), props: [BENCH] },
  pushdown: { a: stand(fk(4, 100), { t: 10 }), b: stand(fk(4, 4), { t: 10 }), anchor: [128, -12] },
  overheadExt: { a: stand(fk(172, -12)), b: stand(fk(172, 176)), anchor: [40, 130] },
  kickback: {
    a: { hip: [88, 88], t: 70, arm: fk(-80, 0), arm2: fk(30, 30), leg: feet(102) },
    b: { hip: [88, 88], t: 70, arm: fk(-80, -82), arm2: fk(30, 30), leg: feet(102) },
    anchor: [160, 140],
  },
  dip: {
    a: { hip: [97, 81], t: 8, arm: w(102, 86), leg: fk(18, -78), foot: -40 },
    b: { hip: [94, 106], t: 14, arm: w(102, 86), leg: fk(18, -78), foot: -40 },
    props: [{ kind: 'dipBars', x1: 84, x2: 130, y: 86 }],
  },
  benchDip: {
    a: { hip: [88, 104], t: -4, arm: w(74, 108), leg: w(128, ANKLE) },
    b: { hip: [90, 126], t: -2, arm: w(74, 108), leg: w(128, ANKLE) },
    props: [{ kind: 'bench', x: 36, y: 110, w: 42 }],
  },

  // ---------- core ----------
  plank: {
    a: { hip: [99.4, 128.1], t: 76.8, arm: fk(0, 90), leg: w(40, 142), foot: 15 },
    b: { hip: [99.4, 126.6], t: 76, arm: fk(0, 90), leg: w(40, 142), foot: 15 },
    hold: true,
  },
  sidePlank: {
    view: 'front',
    a: { hip: [99, 126], t: 76, arm: fk(0, 90), arm2: fk(180, 180), leg: w(40, 140), leg2: w(40, 136), foot: 90, foot2: 90 },
    b: { hip: [99, 124], t: 75, arm: fk(0, 90), arm2: fk(180, 180), leg: w(40, 140), leg2: w(40, 136), foot: 90, foot2: 90 },
    hold: true,
  },
  hangingLegRaise: {
    a: { hip: [100, 82], t: 0, arm: w(100, -4), leg: fk(4, 4), foot: 30 },
    b: { hip: [104, 80], t: -10, arm: w(100, -4), leg: fk(90, 92), foot: 170 },
    props: [{ kind: 'bar', x1: 66, x2: 140, y: -6 }],
  },
  cableCrunch: {
    a: { hip: [100, 110], t: 8, arm: sh(9, -12, -1), leg: fk(0, -90), foot: -150 },
    b: { hip: [100, 110], t: 92, arm: sh(9, -12, -1), leg: fk(0, -90), foot: -150 },
    anchor: [112, -16],
  },
  pallof: {
    a: { hip: STAND_HIP, t: 0, arm: w(108, 60), leg: feet(102), leg2: w(90, ANKLE) },
    b: { hip: STAND_HIP, t: 0, arm: w(140, 62), leg: feet(102), leg2: w(90, ANKLE) },
    anchor: [30, 62],
  },
  russianTwist: {
    a: { hip: [84, 138], t: -38, arm: sh(26, 12), arm2: sh(22, 14), leg: fk(125, 95), foot: 150 },
    b: { hip: [84, 138], t: -38, arm: sh(12, 24), arm2: sh(8, 26), leg: fk(125, 95), foot: 150 },
    loadAt: { on: 'hand' },
    dur: 1.6,
  },
  sideBend: {
    view: 'front',
    a: { hip: [100, 84], t: -14, arm: fk(0, 0), arm2: fk(0, 0), leg: fk(4, 2) },
    b: { hip: [100, 84], t: 14, arm: fk(0, 0), arm2: fk(0, 0), leg: fk(4, 2) },
    loadAt: { on: 'hand' },
  },
  deadBug: {
    a: floorBack(fk(180, 180), fk(180, 90), { arm2: fk(180, 180), leg2: fk(180, 90) }),
    b: floorBack(fk(262, 262), fk(180, 90), { arm2: fk(180, 180), leg2: fk(98, 98) }),
  },
  bicycle: {
    a: floorBack(sh(-4, -12, -1), fk(150, 80), { t: -76, leg2: fk(96, 96), foot: 150, foot2: 170 }),
    b: floorBack(sh(-4, -12, -1), fk(96, 96), { t: -76, leg2: fk(150, 80), foot: 170, foot2: 150 }),
    dur: 1.6,
  },
  mountainClimber: {
    a: { hip: [98, 117], t: 66, arm: w(138, ANKLE), leg: w(44, 142), leg2: w(44, 142), foot: 15, foot2: 15 },
    b: { hip: [100, 115], t: 68, arm: w(138, ANKLE), leg: w(114, 136), leg2: w(44, 142), foot: 40, foot2: 15 },
    dur: 1.1,
  },

  // ---------- added movements ----------
  declinePress: {
    a: { hip: [106, 100], t: -112, arm: w(78, 104), leg: w(136, 126, -1), foot: 150 },
    b: { hip: [106, 100], t: -112, arm: w(74, 70), leg: w(136, 126, -1), foot: 150 },
    props: [{ kind: 'pad', from: [116, 106], to: [50, 130], w: 8 }, { kind: 'pad', from: [140, 120], to: [140, 132], w: 7 }],
  },
  lowCableFly: {
    view: 'front',
    a: { hip: [100, 84], t: 0, arm: v3([0.9, -0.45, 0.1], [0.9, -0.4, 0.15]), leg: fk(5, 3) },
    b: { hip: [100, 84], t: 0, arm: v3([0.15, 0.35, 0.9], [-0.4, 0.3, 0.85]), leg: fk(5, 3) },
    anchor: [176, 140],
  },
  inclinePushUp: {
    a: { hip: [104.8, 111.5], t: 60, arm: w(140, 112), leg: w(52, 142), foot: 15 },
    b: { hip: [96.7, 98.5], t: 45.8, arm: w(140, 112), leg: w(52, 142), foot: 15 },
    props: [{ kind: 'bench', x: 128, y: 116, w: 40 }],
  },
  rackPull: {
    a: { hip: [88, 96], t: 32, arm: fk(0, 0), leg: feet(102) },
    b: { hip: STAND_HIP, t: 0, arm: fk(0, 0), leg: feet(102) },
    props: [{ kind: 'pad', from: [74, 118], to: [74, 149], w: 4 }],
  },
  goodMorning: {
    a: { hip: STAND_HIP, t: 0, arm: sh(-9, 4, -1), leg: feet(102) },
    b: { hip: [86, 88], t: 75, arm: sh(-9, 4, -1), leg: feet(102) },
    loadAt: { on: 'shoulder', offset: [-11, 3] },
  },
  renegadeRow: {
    a: { hip: [98, 117], t: 66, arm: w(140, 145), arm2: w(134, 145), leg: w(44, 142), foot: 15 },
    b: { hip: [98, 117], t: 66, arm: w(126, 112), arm2: w(134, 145), leg: w(44, 142), foot: 15 },
  },
  backExtension: {
    a: { hip: [100, 92], t: 140, arm: sh(10, 14), leg: fk(-45, -45), foot: -135 },
    b: { hip: [100, 92], t: 45, arm: sh(10, 14), leg: fk(-45, -45), foot: -135 },
    props: [
      { kind: 'pad', from: [60, 146], to: [104, 104], w: 3 },
      { kind: 'pad', from: [108, 98], to: [94, 112], w: 10 },
      { kind: 'pad', from: [50, 142], to: [62, 130], w: 6 },
    ],
  },
  uprightRow: { a: stand(w(102, 90, -1)), b: stand(w(104, 40, -1)), anchor: [104, ANKLE] },
  reversePecDeck: {
    view: 'front',
    a: { hip: [100, 112], t: 0, arm: v3([0.12, 0, 1], [0.1, 0, 1]), leg: v3([0.3, -0.15, 1], [0.05, -1, 0.05]), foot: 20 },
    b: { hip: [100, 112], t: 0, arm: v3([1, 0, 0.05], [1, 0, 0.05]), leg: v3([0.3, -0.15, 1], [0.05, -1, 0.05]), foot: 20 },
    props: [
      { kind: 'rect', x: 97, y: 118, w: 6, h: 31, tone: 'steel' },
      { kind: 'rect', x: 80, y: 110, w: 40, h: 8, tone: 'pad' },
    ],
  },
  hackSquat: {
    a: { hip: [94, 86], t: -22, arm: sh(6, -2), leg: w(114, 138) },
    b: { hip: [76, 112], t: -20, arm: sh(6, -2), leg: w(114, 138) },
    props: [{ kind: 'pad', from: [104, 146], to: [128, 136], w: 6 }],
    pads: [{ on: 'shoulder', offset: [-7, -2] }],
  },
  seatedCalfRaise: {
    a: { hip: [86, 108], t: 0, arm: fk(30, 70), leg: w(116, ANKLE) },
    b: { hip: [86, 108], t: 0, arm: fk(30, 70), leg: w(116, 138), foot: 40 },
    props: [{ kind: 'bench', x: 62, y: 112, w: 40 }],
    pads: [{ on: 'knee', offset: [-4, -8] }],
    dur: 1.8,
  },
  nordicCurl: {
    a: { hip: [100, 110], t: 0, arm: sh(10, 14), leg: fk(0, -90), foot: -160 },
    b: { hip: [125.4, 123.2], t: 55, arm: sh(10, 14), leg: fk(-55, -90), foot: -160 },
    props: [{ kind: 'pad', from: [92, 147], to: [110, 147], w: 4 }],
    pads: [{ on: 'ankle' }],
  },
  pistolSquat: {
    a: { hip: [96, 84], t: 0, arm: fk(90, 90), leg: feet(), leg2: fk(20, 12) },
    b: { hip: [80, 118], t: 40, arm: fk(90, 90), leg: feet(), leg2: fk(84, 88) },
  },
  lungeBarbell: {
    a: { hip: [93, 90], t: 3, arm: sh(-9, 4, -1), leg: w(122, ANKLE), leg2: w(64, 141), foot2: 40 },
    b: { hip: [93, 114], t: 3, arm: sh(-9, 4, -1), leg: w(122, ANKLE), leg2: w(64, 141), foot2: 40 },
    loadAt: { on: 'shoulder', offset: [-11, 3] },
  },
  pullThrough: {
    a: { hip: [84, 89], t: 72, arm: w(96, 130), leg: feet(104) },
    b: { hip: STAND_HIP, t: 0, arm: w(104, 92), leg: feet(104) },
    anchor: [22, 142],
  },
  bridgeBarbell: {
    a: floorBack(w(92, 128), w(124, ANKLE), { hip: [92, 140] }),
    b: floorBack(w(96, 108), w(124, ANKLE), { hip: [96, 118], t: -116 }),
    loadAt: { on: 'hip', offset: [9, 0] },
  },
  dbSwing: {
    a: { hip: [84, 92], t: 70, arm: w(94, 130), leg: feet(104) },
    b: { hip: STAND_HIP, t: 0, arm: w(142, 48), leg: feet(104) },
    dur: 1.6,
  },
  singleLegRdl: {
    a: { hip: STAND_HIP, t: 0, arm: fk(0, 0), leg: feet(102), leg2: fk(-6, -6) },
    b: { hip: [92, 88], t: 80, arm: fk(0, 0), leg: feet(102), leg2: fk(-84, -86), foot2: 0 },
  },
  crunch: {
    a: floorBack(sh(-4, -12, 1), w(124, ANKLE), { t: -86 }),
    b: floorBack(sh(-4, -12, 1), w(124, ANKLE), { t: -62 }),
    dur: 2,
  },
  reverseCrunch: {
    a: floorBack(fk(90, 90), fk(180, 95)),
    b: floorBack(fk(90, 90), fk(215, 140), { hip: [102, 134], t: -98 }),
  },
  vUp: {
    a: floorBack(fk(-90, -90), fk(90, 90), { hip: [100, 140], foot: 180 }),
    // -210 is the same direction as 150 but makes the arms swing up over the head, not through the floor.
    b: floorBack(fk(-210, -210), fk(135, 135), { hip: [100, 140], t: -45, foot: 225 }),
  },
  woodchop: {
    view: 'front',
    a: { hip: [100, 84], t: -6, arm: w(146, 24, 1), arm2: w(142, 27, -1), leg: fk(8, 4) },
    b: { hip: [100, 84], t: 8, arm: w(66, 116, -1), arm2: w(70, 114, 1), leg: fk(8, 4) },
    anchor: [176, -10],
    singleCable: true,
  },
  farmerCarry: {
    a: { hip: [96, 86], t: 0, arm: fk(2, 0), leg: w(112, ANKLE), leg2: w(80, ANKLE) },
    b: { hip: [96, 86], t: 0, arm: fk(2, 0), leg: w(80, ANKLE), leg2: w(112, ANKLE) },
    dur: 1.2,
  },
  hollowHold: {
    a: floorBack(fk(-100, -100), fk(100, 100), { t: -80, foot: 190 }),
    b: floorBack(fk(-102, -102), fk(102, 102), { t: -82, foot: 192 }),
    hold: true,
  },
  birdDog: {
    a: { hip: [92, 110], t: 74, arm: fk(0, 0), arm2: w(131, ANKLE), leg: fk(0, -90), leg2: fk(0, -90), foot: -150, foot2: -150 },
    b: { hip: [92, 110], t: 74, arm: fk(95, 95), arm2: w(131, ANKLE), leg: fk(0, -90), leg2: fk(-92, -92), foot: -150, foot2: -90 },
  },
} satisfies Record<string, Pattern>

export type PatternId = keyof typeof PATTERNS

const KIT_LOAD: Record<Kit, LoadKind> = { barbell: 'barbell', dumbbell: 'dumbbell', cable: 'cable', machine: 'machine', bodyweight: 'none' }

/** Exercise id → [movement pattern, load override]. */
export const EXERCISE_ANIMATION: Record<string, [PatternId, LoadKind?]> = {
  'bench-press': ['benchPress'],
  'incline-bench': ['inclinePress'],
  'machine-chest-press': ['seatedPress'],
  'db-bench': ['benchPress'],
  'incline-db-press': ['inclinePress'],
  'db-fly': ['flyOverhead'],
  'cable-crossover': ['crossover'],
  'pec-deck': ['pecDeck', 'none'],
  'push-up': ['pushUp'],
  'decline-push-up': ['declinePushUp'],
  'wide-push-up': ['pushUp'],
  deadlift: ['deadlift'],
  'barbell-row': ['bentRow'],
  'lat-pulldown': ['latPulldown'],
  'seated-cable-row': ['seatedRow'],
  'straight-arm-pulldown': ['straightArm'],
  'one-arm-db-row': ['bentRow'],
  'chest-supported-row': ['bentRow'],
  'db-pullover': ['pullover'],
  'pull-up': ['pullUp'],
  'inverted-row': ['invertedRow'],
  superman: ['superman'],
  'overhead-press': ['ohp'],
  'machine-shoulder-press': ['seatedOhp'],
  'db-shoulder-press': ['seatedOhp'],
  'arnold-press': ['seatedOhp'],
  'lateral-raise': ['lateralRaise'],
  'rear-delt-fly': ['rearDeltFront'],
  'front-raise': ['frontRaise'],
  'cable-lateral-raise': ['lateralRaise'],
  'face-pull': ['facePull'],
  'pike-push-up': ['pike'],
  'ytw-raise': ['proneRaise'],
  'barbell-curl': ['curl'],
  'preacher-curl': ['preacher', 'dumbbell'],
  'cable-curl': ['curl'],
  'db-curl': ['curl'],
  'hammer-curl': ['curl'],
  'incline-db-curl': ['inclineCurl'],
  'concentration-curl': ['concentrationCurl'],
  'chin-up': ['pullUp'],
  'underhand-row': ['invertedRow'],
  'close-grip-bench': ['benchPress'],
  'skull-crusher': ['skullCrusher'],
  'cable-pushdown': ['pushdown'],
  'overhead-cable-ext': ['overheadExt'],
  'db-overhead-ext': ['overheadExt'],
  'db-kickback': ['kickback'],
  dip: ['dip'],
  'diamond-push-up': ['pushUp'],
  'bench-dip': ['benchDip'],
  'back-squat': ['squatBack'],
  'front-squat': ['squatFront'],
  'romanian-deadlift': ['rdl'],
  'leg-press': ['legPress', 'none'],
  'leg-extension': ['legExtension', 'none'],
  'leg-curl': ['legCurl', 'none'],
  'calf-raise': ['calfRaise', 'none'],
  'goblet-squat': ['squatGoblet'],
  'bulgarian-split-squat': ['splitSquat'],
  'db-rdl': ['rdl'],
  'db-lunge': ['lunge'],
  'bodyweight-squat': ['squat'],
  'reverse-lunge': ['lunge'],
  'jump-squat': ['jumpSquat'],
  'single-leg-calf': ['calfRaise'],
  'wall-sit': ['wallSit'],
  'hip-thrust': ['hipThrust'],
  'hip-abduction': ['abduction', 'cable'],
  'cable-kickback': ['cableKickback'],
  'db-hip-thrust': ['hipThrust'],
  'db-step-up': ['stepUp'],
  'sumo-squat': ['squatGoblet'],
  'glute-bridge': ['bridge'],
  'single-leg-bridge': ['singleBridge'],
  'donkey-kick': ['donkeyKick'],
  'cable-crunch': ['cableCrunch'],
  'pallof-press': ['pallof'],
  'russian-twist': ['russianTwist'],
  'db-side-bend': ['sideBend'],
  'hanging-leg-raise': ['hangingLegRaise'],
  plank: ['plank'],
  'side-plank': ['sidePlank'],
  'dead-bug': ['deadBug'],
  'bicycle-crunch': ['bicycle'],
  'mountain-climber': ['mountainClimber'],
  // added
  'decline-bench': ['declinePress'],
  'db-squeeze-press': ['benchPress'],
  'low-cable-fly': ['lowCableFly'],
  'incline-push-up': ['inclinePushUp'],
  'archer-push-up': ['pushUp'],
  't-bar-row': ['bentRow'],
  'pendlay-row': ['bentRow'],
  'rack-pull': ['rackPull'],
  'good-morning': ['goodMorning'],
  'machine-row': ['seatedRow', 'cable'],
  'renegade-row': ['renegadeRow'],
  'back-extension': ['backExtension'],
  'push-press': ['ohp'],
  'upright-row': ['uprightRow'],
  'reverse-pec-deck': ['reversePecDeck', 'none'],
  'cable-rear-delt-fly': ['rearDeltFront'],
  'ez-bar-curl': ['curl'],
  'reverse-curl': ['curl'],
  'spider-curl': ['preacher'],
  'zottman-curl': ['curl'],
  'rope-hammer-curl': ['curl'],
  'db-skull-crusher': ['skullCrusher'],
  'rope-pushdown': ['pushdown'],
  'cable-tricep-kickback': ['kickback'],
  'assisted-dip': ['dip', 'none'],
  'sumo-deadlift': ['deadlift'],
  'barbell-lunge': ['lungeBarbell'],
  'hack-squat': ['hackSquat', 'none'],
  'seated-calf-raise': ['seatedCalfRaise', 'none'],
  'pistol-squat': ['pistolSquat'],
  'nordic-curl': ['nordicCurl'],
  'barbell-glute-bridge': ['bridgeBarbell'],
  'cable-pull-through': ['pullThrough'],
  'db-swing': ['dbSwing'],
  'single-leg-rdl': ['singleLegRdl'],
  'frog-pump': ['bridge'],
  'cable-woodchop': ['woodchop'],
  'farmer-carry': ['farmerCarry'],
  crunch: ['crunch'],
  'reverse-crunch': ['reverseCrunch'],
  'v-up': ['vUp'],
  'hollow-hold': ['hollowHold'],
  'bird-dog': ['birdDog'],
}

export function animationFor(exerciseId: string, kit: Kit): { pattern: Pattern; load: LoadKind } | null {
  const entry = EXERCISE_ANIMATION[exerciseId]
  if (!entry) return null
  const [id, load] = entry
  return { pattern: PATTERNS[id] as Pattern, load: load ?? KIT_LOAD[kit] }
}
