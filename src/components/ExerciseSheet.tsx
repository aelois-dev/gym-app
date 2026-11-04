import { Icon } from './Icon'
import { Sheet } from './ui'
import { KIT_LABEL, getExercise, muscleLabel } from '../data/exercises'
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
        <div className="ex-detail">
          <div className="demo">
            <ExerciseAnimation exerciseId={ex.id} />
          </div>
          <div className="tags">
            <span className="tag">{muscleLabel(ex.muscle)}</span>
            <span className="tag tag--muted">{KIT_LABEL[ex.kit]}</span>
            {ex.compound && <span className="tag tag--accent">Compound</span>}
            {sets !== undefined && reps !== undefined && (
              <span className="tag tag--muted">
                {sets} × {reps}
                {ex.timed ? 's' : ''}
              </span>
            )}
          </div>
          <div className="ex-detail__tip">
            <h3>Form tip</h3>
            <p>{ex.cue}</p>
          </div>
          {onSwap && (
            <button className="btn btn--ghost btn--block" onClick={onSwap}>
              <Icon name="swap" size={18} /> Swap for another exercise
            </button>
          )}
        </div>
      )}
    </Sheet>
  )
}
