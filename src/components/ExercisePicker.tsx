import { useEffect, useState } from 'react'
import { Icon } from './Icon'
import { Sheet } from './ui'
import { KIT_LABEL, getExercise, muscleLabel, type Exercise } from '../data/exercises'
import { ExerciseAnimation, animationCaption } from '../figure/ExerciseAnimation'

export function describe(ex: Exercise): string {
  return [muscleLabel(ex.muscle), KIT_LABEL[ex.kit].toLowerCase(), ex.compound ? 'compound' : null].filter(Boolean).join(', ')
}

/**
 * Lists exercises to swap in or add. Tapping one opens a preview with the animated figure
 * and form tip, so the choice is made knowing what the movement looks like.
 */
export function ExercisePicker({
  open,
  mode,
  currentId,
  candidates,
  onChoose,
  onClose,
}: {
  open: boolean
  mode: 'swap' | 'add'
  /** The exercise being replaced (swap mode). */
  currentId?: string
  candidates: Exercise[]
  onChoose: (ex: Exercise) => void
  onClose: () => void
}) {
  const [previewId, setPreviewId] = useState<string | null>(null)
  useEffect(() => {
    if (!open) setPreviewId(null)
  }, [open])

  const current = currentId ? getExercise(currentId) : null
  const preview = previewId ? getExercise(previewId) : null
  const title = mode === 'swap' && current ? `Swap ${current.name}` : 'Add an exercise'

  return (
    <Sheet open={open} title={title} onClose={onClose}>
      {preview ? (
        <div className="picker-preview">
          <button className="link link--back" onClick={() => setPreviewId(null)}>
            <Icon name="back" size={16} /> All options
          </button>
          <div>
            <div className="demo">
              <ExerciseAnimation exerciseId={preview.id} />
            </div>
            {animationCaption(preview.id) && <p className="fig-caption">{animationCaption(preview.id)}</p>}
          </div>
          <div className="picker-preview__head">
            <h3 className="display display--sm">{preview.name}</h3>
            <p className="muted">{describe(preview)}</p>
          </div>
          <p className="cue">{preview.cue}</p>
          {mode === 'swap' && current && (
            <div className="compare">
              <span className="compare__thumb">
                <ExerciseAnimation exerciseId={current.id} frame={1} />
              </span>
              <p>
                Replaces <strong>{current.name}</strong>.{' '}
                {!!current.timed === !!preview.timed ? 'Your sets and reps carry over.' : 'Sets and reps reset to the preset for this exercise.'}
              </p>
            </div>
          )}
          <button className="btn btn--primary btn--block btn--lg" onClick={() => onChoose(preview)}>
            {mode === 'swap' ? `Swap in ${preview.name}` : `Add ${preview.name}`}
          </button>
        </div>
      ) : candidates.length === 0 ? (
        <p className="empty-note">Nothing else matches this muscle with your equipment. Try changing the equipment on the setup screen.</p>
      ) : (
        <>
          <p className="sheet__intro">{mode === 'swap' ? 'Tap an exercise to watch it before you swap.' : 'Tap an exercise to watch it before you add it.'}</p>
          <ul className="pick-list">
            {candidates.map((ex) => (
              <li key={ex.id}>
                <button className="pick" onClick={() => setPreviewId(ex.id)}>
                  <span className="thumb">
                    <ExerciseAnimation exerciseId={ex.id} frame={1} />
                  </span>
                  <span className="pick__text">
                    <strong>{ex.name}</strong>
                    <span>{describe(ex)}</span>
                  </span>
                  <Icon name="back" size={18} className="flip pick__chev" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Sheet>
  )
}
