export type Muscle =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'legs'
  | 'glutes'
  | 'core'

export type Kit = 'barbell' | 'machine' | 'cable' | 'dumbbell' | 'bodyweight'
export type EquipmentMode = 'gym' | 'dumbbell' | 'bodyweight'

export interface Exercise {
  id: string
  name: string
  muscle: Muscle
  kit: Kit
  compound: boolean
  /** Timed holds: "reps" are seconds. */
  timed?: boolean
  cue: string
}

export const MUSCLES: { id: Muscle; label: string }[] = [
  { id: 'chest', label: 'Chest' },
  { id: 'back', label: 'Back' },
  { id: 'shoulders', label: 'Shoulders' },
  { id: 'biceps', label: 'Biceps' },
  { id: 'triceps', label: 'Triceps' },
  { id: 'legs', label: 'Legs' },
  { id: 'glutes', label: 'Glutes' },
  { id: 'core', label: 'Core' },
]

export const EQUIPMENT: { id: EquipmentMode; label: string; hint: string }[] = [
  { id: 'gym', label: 'Full gym', hint: 'Barbells, machines, cables' },
  { id: 'dumbbell', label: 'Dumbbells', hint: 'Dumbbells + bodyweight' },
  { id: 'bodyweight', label: 'Bodyweight', hint: 'No equipment' },
]

export const KITS_FOR_MODE: Record<EquipmentMode, Kit[]> = {
  gym: ['barbell', 'machine', 'cable', 'dumbbell', 'bodyweight'],
  dumbbell: ['dumbbell', 'bodyweight'],
  bodyweight: ['bodyweight'],
}

export const KIT_LABEL: Record<Kit, string> = {
  barbell: 'Barbell',
  machine: 'Machine',
  cable: 'Cable',
  dumbbell: 'Dumbbell',
  bodyweight: 'Bodyweight',
}

type Row = [id: string, name: string, kit: Kit, compound: boolean, cue: string, timed?: boolean]

const rows: Record<Muscle, Row[]> = {
  chest: [
    ['bench-press', 'Barbell Bench Press', 'barbell', true, 'Shoulder blades pinched, bar to mid-chest, feet driving into the floor.'],
    ['incline-bench', 'Incline Barbell Press', 'barbell', true, 'Bench at 30°, lower to upper chest, elbows about 45° from your torso.'],
    ['machine-chest-press', 'Machine Chest Press', 'machine', true, 'Handles level with mid-chest; press without letting shoulders roll forward.'],
    ['db-bench', 'Dumbbell Bench Press', 'dumbbell', true, 'Lower until a deep stretch, then press up and slightly in.'],
    ['incline-db-press', 'Incline Dumbbell Press', 'dumbbell', true, 'Keep wrists stacked over elbows and control the descent.'],
    ['db-fly', 'Dumbbell Fly', 'dumbbell', false, 'Soft bend in the elbows; open wide like hugging a tree.'],
    ['cable-crossover', 'Cable Crossover', 'cable', false, 'Lean slightly forward and squeeze the hands together at the bottom.'],
    ['pec-deck', 'Pec Deck', 'machine', false, 'Chest up, pause for a second when the pads meet.'],
    ['push-up', 'Push-Up', 'bodyweight', true, 'Body in one straight line; chest touches the floor every rep.'],
    ['decline-push-up', 'Decline Push-Up', 'bodyweight', true, 'Feet on a bench, brace your core, lower under control.'],
    ['wide-push-up', 'Wide Push-Up', 'bodyweight', false, 'Hands wider than shoulders; slow 3-second lowering.'],
  ],
  back: [
    ['deadlift', 'Deadlift', 'barbell', true, 'Bar over mid-foot, flat back, push the floor away.'],
    ['barbell-row', 'Barbell Row', 'barbell', true, 'Hinge to ~45°, pull the bar to your lower ribs.'],
    ['lat-pulldown', 'Lat Pulldown', 'cable', true, 'Pull elbows down to your sides; lead with the chest.'],
    ['seated-cable-row', 'Seated Cable Row', 'cable', true, 'Tall spine, squeeze shoulder blades at the finish.'],
    ['straight-arm-pulldown', 'Straight-Arm Pulldown', 'cable', false, 'Arms nearly straight, sweep the bar to your thighs.'],
    ['one-arm-db-row', 'One-Arm Dumbbell Row', 'dumbbell', true, 'Pull toward the hip, not the shoulder.'],
    ['chest-supported-row', 'Chest-Supported DB Row', 'dumbbell', true, 'Chest stays on the bench; drive elbows back.'],
    ['db-pullover', 'Dumbbell Pullover', 'dumbbell', false, 'Slight elbow bend, feel the stretch through the lats.'],
    ['pull-up', 'Pull-Up', 'bodyweight', true, 'Full hang at the bottom, chin over the bar at the top.'],
    ['inverted-row', 'Inverted Row', 'bodyweight', true, 'Body rigid like a plank; pull chest to the bar or table edge.'],
    ['superman', 'Superman Hold', 'bodyweight', false, 'Lift chest and legs together, squeeze glutes and hold.', true],
  ],
  shoulders: [
    ['overhead-press', 'Overhead Press', 'barbell', true, 'Glutes tight, press straight up, head through at the top.'],
    ['machine-shoulder-press', 'Machine Shoulder Press', 'machine', true, 'Back flat against the pad; stop just short of lockout.'],
    ['db-shoulder-press', 'Seated DB Shoulder Press', 'dumbbell', true, 'Lower to ear level; keep the ribcage down.'],
    ['arnold-press', 'Arnold Press', 'dumbbell', true, 'Rotate palms out as you press; smooth, no jerking.'],
    ['lateral-raise', 'Lateral Raise', 'dumbbell', false, 'Lead with the elbows, stop at shoulder height.'],
    ['rear-delt-fly', 'Rear Delt Fly', 'dumbbell', false, 'Hinge forward, pinkies up, sweep out wide.'],
    ['front-raise', 'Front Raise', 'dumbbell', false, 'Raise to eye level without leaning back.'],
    ['cable-lateral-raise', 'Cable Lateral Raise', 'cable', false, 'Cable behind your body for constant tension.'],
    ['face-pull', 'Face Pull', 'cable', false, 'Rope to forehead, pull the ends apart, thumbs back.'],
    ['pike-push-up', 'Pike Push-Up', 'bodyweight', true, 'Hips high, head travels in front of the hands.'],
    ['ytw-raise', 'Y-T-W Raise', 'bodyweight', false, 'Lying face down, trace each letter slowly with thumbs up.'],
  ],
  biceps: [
    ['barbell-curl', 'Barbell Curl', 'barbell', false, 'Elbows pinned at your sides; no hip swing.'],
    ['preacher-curl', 'Machine Preacher Curl', 'machine', false, 'Full stretch at the bottom, squeeze hard at the top.'],
    ['cable-curl', 'Cable Curl', 'cable', false, 'Step back slightly so tension stays on at the top.'],
    ['db-curl', 'Dumbbell Curl', 'dumbbell', false, 'Turn the pinky up as you curl; lower slowly.'],
    ['hammer-curl', 'Hammer Curl', 'dumbbell', false, 'Neutral grip, curl across toward the chest.'],
    ['incline-db-curl', 'Incline Dumbbell Curl', 'dumbbell', false, 'Arms hang behind the body for a deep stretch.'],
    ['concentration-curl', 'Concentration Curl', 'dumbbell', false, 'Elbow braced on the inner thigh; pause at the top.'],
    ['chin-up', 'Chin-Up', 'bodyweight', true, 'Palms facing you, pull until your chin clears the bar.'],
    ['underhand-row', 'Underhand Inverted Row', 'bodyweight', true, 'Palms up, keep elbows close, pull with the biceps.'],
  ],
  triceps: [
    ['close-grip-bench', 'Close-Grip Bench Press', 'barbell', true, 'Hands shoulder-width, elbows tucked close to the body.'],
    ['skull-crusher', 'Skull Crusher', 'barbell', false, 'Lower behind the forehead; only the elbows move.'],
    ['cable-pushdown', 'Cable Pushdown', 'cable', false, 'Elbows stay glued to your sides; lock out fully.'],
    ['overhead-cable-ext', 'Overhead Cable Extension', 'cable', false, 'Face away from the stack, stretch deep behind the head.'],
    ['db-overhead-ext', 'DB Overhead Extension', 'dumbbell', false, 'Elbows point forward, not out to the sides.'],
    ['db-kickback', 'Dumbbell Kickback', 'dumbbell', false, 'Upper arm parallel to the floor; squeeze at full extension.'],
    ['dip', 'Parallel Bar Dip', 'bodyweight', true, 'Stay upright for triceps; lower until elbows reach 90°.'],
    ['diamond-push-up', 'Diamond Push-Up', 'bodyweight', true, 'Hands together under the chest, elbows brushing the ribs.'],
    ['bench-dip', 'Bench Dip', 'bodyweight', false, 'Hips close to the bench, shoulders down away from ears.'],
  ],
  legs: [
    ['back-squat', 'Back Squat', 'barbell', true, 'Brace hard, knees track over toes, hit at least parallel.'],
    ['front-squat', 'Front Squat', 'barbell', true, 'Elbows high, torso upright, sit straight down.'],
    ['romanian-deadlift', 'Romanian Deadlift', 'barbell', true, 'Push hips back, soft knees, bar slides down the thighs.'],
    ['leg-press', 'Leg Press', 'machine', true, 'Lower until the knees reach ~90° without the lower back lifting.'],
    ['leg-extension', 'Leg Extension', 'machine', false, 'Pause for one second at the top of each rep.'],
    ['leg-curl', 'Leg Curl', 'machine', false, 'Hips pressed down into the pad; control the return.'],
    ['calf-raise', 'Standing Calf Raise', 'machine', false, 'Full stretch at the bottom, pause at the top.'],
    ['goblet-squat', 'Goblet Squat', 'dumbbell', true, 'Hold the dumbbell at the chest, elbows inside the knees.'],
    ['bulgarian-split-squat', 'Bulgarian Split Squat', 'dumbbell', true, 'Rear foot on a bench, front shin roughly vertical.'],
    ['db-rdl', 'Dumbbell Romanian Deadlift', 'dumbbell', true, 'Hinge at the hips, dumbbells close to the legs.'],
    ['db-lunge', 'Dumbbell Walking Lunge', 'dumbbell', true, 'Long steps, back knee kisses the floor.'],
    ['bodyweight-squat', 'Bodyweight Squat', 'bodyweight', true, 'Arms forward for balance, sit deep, drive through heels.'],
    ['reverse-lunge', 'Reverse Lunge', 'bodyweight', true, 'Step back, drop straight down, push through the front heel.'],
    ['jump-squat', 'Jump Squat', 'bodyweight', true, 'Land softly and go straight into the next rep.'],
    ['single-leg-calf', 'Single-Leg Calf Raise', 'bodyweight', false, 'On a step edge; slow on the way down.'],
    ['wall-sit', 'Wall Sit', 'bodyweight', false, 'Thighs parallel to the floor, back flat on the wall.', true],
  ],
  glutes: [
    ['hip-thrust', 'Barbell Hip Thrust', 'barbell', true, 'Chin tucked, ribs down, squeeze glutes hard at the top.'],
    ['hip-abduction', 'Hip Abduction Machine', 'machine', false, 'Lean slightly forward and push the knees out with control.'],
    ['cable-kickback', 'Cable Kickback', 'cable', false, 'Kick back and slightly out; no arching the lower back.'],
    ['db-hip-thrust', 'Dumbbell Hip Thrust', 'dumbbell', true, 'Dumbbell on the hips, pause for a second at lockout.'],
    ['db-step-up', 'Dumbbell Step-Up', 'dumbbell', true, 'Drive through the top heel; don\'t push off the back foot.'],
    ['sumo-squat', 'Dumbbell Sumo Squat', 'dumbbell', true, 'Wide stance, toes out, chest tall.'],
    ['glute-bridge', 'Glute Bridge', 'bodyweight', false, 'Heels close to the hips, drive up and squeeze.'],
    ['single-leg-bridge', 'Single-Leg Glute Bridge', 'bodyweight', false, 'Keep the hips level; don\'t let one side drop.'],
    ['donkey-kick', 'Donkey Kick', 'bodyweight', false, 'On all fours, kick the heel toward the ceiling.'],
  ],
  core: [
    ['cable-crunch', 'Cable Crunch', 'cable', false, 'Curl the ribs toward the hips; hips stay still.'],
    ['pallof-press', 'Pallof Press', 'cable', false, 'Press out and resist the twist; breathe out slowly.'],
    ['russian-twist', 'Russian Twist', 'dumbbell', false, 'Lean back, rotate from the ribs, not the arms.'],
    ['db-side-bend', 'Dumbbell Side Bend', 'dumbbell', false, 'Bend straight sideways, no leaning forward.'],
    ['hanging-leg-raise', 'Hanging Leg Raise', 'bodyweight', false, 'No swinging; curl the pelvis up at the top.'],
    ['plank', 'Plank', 'bodyweight', false, 'Squeeze glutes and quads; push the floor away.', true],
    ['side-plank', 'Side Plank', 'bodyweight', false, 'Hips high, body in one line; alternate sides each set.', true],
    ['dead-bug', 'Dead Bug', 'bodyweight', false, 'Lower back pressed into the floor the whole time.'],
    ['bicycle-crunch', 'Bicycle Crunch', 'bodyweight', false, 'Slow and controlled; elbow toward the opposite knee.'],
    ['mountain-climber', 'Mountain Climber', 'bodyweight', false, 'Hips level with shoulders, drive the knees fast.'],
  ],
}

export const EXERCISES: Exercise[] = (Object.keys(rows) as Muscle[]).flatMap((muscle) =>
  rows[muscle].map(([id, name, kit, compound, cue, timed]) => ({
    id,
    name,
    muscle,
    kit,
    compound,
    cue,
    ...(timed ? { timed: true } : {}),
  })),
)

const byId = new Map(EXERCISES.map((e) => [e.id, e]))

export function getExercise(id: string): Exercise {
  const ex = byId.get(id)
  if (!ex) throw new Error(`Unknown exercise: ${id}`)
  return ex
}

export function muscleLabel(m: Muscle): string {
  return MUSCLES.find((x) => x.id === m)?.label ?? m
}
