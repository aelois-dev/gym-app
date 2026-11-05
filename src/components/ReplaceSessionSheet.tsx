import { formatClock, type Workout } from '../lib/planner'
import { setsDoneIn } from '../lib/session'
import type { ActiveSession } from '../lib/storage'
import { Sheet } from './ui'

/**
 * Shown when starting a workout while another is in progress (or when ending one from the Plan tab).
 * Nothing is replaced without a choice.
 */
export function ReplaceSessionSheet({
  session,
  next,
  onResume,
  onEnd,
  onClose,
}: {
  session: ActiveSession
  /** The workout waiting to start, or null when only ending the current one. */
  next: Workout | null
  onResume: () => void
  onEnd: (save: boolean) => void
  onClose: () => void
}) {
  const cur = session.workout.name
  const done = setsDoneIn(session.done)
  const total = session.workout.items.reduce((n, i) => n + i.sets, 0)
  const elapsed = formatClock((Date.now() - session.startedAt) / 1000)
  return (
    <Sheet open title={next ? 'A workout is in progress' : `End ${cur}?`} onClose={onClose}>
      <p className="sheet__text">
        {cur} is in progress: {done} of {total} sets in {elapsed}.{next ? ` Starting ${next.name} ends it.` : ''}
      </p>
      <div className="stack">
        <button className="btn btn--primary btn--block" onClick={onResume}>
          Resume {cur}
        </button>
        {done > 0 && (
          <button className="btn btn--quiet btn--block" onClick={() => onEnd(true)}>
            {next ? `Save ${cur} and start ${next.name}` : `Save ${cur} to history`}
          </button>
        )}
        <button className="btn btn--danger btn--block" onClick={() => onEnd(false)}>
          {next ? `Discard ${cur} and start ${next.name}` : `Discard ${cur}`}
        </button>
        <button className="btn btn--quiet btn--block" onClick={onClose}>
          Cancel
        </button>
      </div>
    </Sheet>
  )
}
