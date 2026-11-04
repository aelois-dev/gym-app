import { Icon } from './Icon'
import { describe } from './ExercisePicker'
import { Sheet } from './ui'
import { getExercise } from '../data/exercises'
import { ExerciseAnimation } from '../figure/ExerciseAnimation'

export function ExerciseSheet({
  exerciseId,
  sets,
  reps,
  onClose,
  onSwap,
}: {
  exerciseId: string | null
  sets?: number
  reps?: number
  onClose: () => void
  onSwap?: () => void
}) {
  const ex = exerciseId ? getExercise(exerciseId) : null
  return (
    <Sheet open={!!ex} title={ex?.name ?? ''} onClose={onClose}>
      {ex && (
        <div className="picker-preview">
          <div className="demo">
            <ExerciseAnimation exerciseId={ex.id} />
          </div>
          <div className="picker-preview__head">
            <p className="muted">{describe(ex)}</p>
            {sets !== undefined && reps !== undefined && (
              <p className="scheme">
                {sets} × {reps}
                {ex.timed ? ' s' : ''}
              </p>
            )}
          </div>
          <p className="cue">{ex.cue}</p>
          <p className="legend">
            <span className="legend__swatch" aria-hidden="true" /> Highlighted: the muscle this exercise works
          </p>
          {onSwap && (
            <button className="btn btn--quiet btn--block" onClick={onSwap}>
              <Icon name="swap" size={18} /> Swap for another exercise
            </button>
          )}
        </div>
      )}
    </Sheet>
  )
}
