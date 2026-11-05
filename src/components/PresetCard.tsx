import { ExerciseAnimation } from '../figure/ExerciseAnimation'
import { estimateSeconds, formatDuration, type Workout } from '../lib/planner'
import { usageLabel, type Usage } from '../lib/presets'
import { Icon } from './Icon'

export interface PresetCardData {
  id: string
  name: string
  blurb: string
  usage: Usage
  workout: Workout
}

/**
 * A fixed workout to pick. Shows whether (and when) it was done before, so the same
 * workout can be repeated to track progress.
 */
export function PresetCard({ preset, selected, onSelect, mode }: { preset: PresetCardData; selected?: boolean; onSelect: () => void; mode: 'radio' | 'open' }) {
  const done = preset.usage.count > 0
  const w = preset.workout
  return (
    <button
      className={`preset-card ${selected ? 'is-on' : ''} ${done ? 'is-done' : ''}`}
      onClick={onSelect}
      {...(mode === 'radio' ? { role: 'radio', 'aria-checked': !!selected } : {})}
    >
      <span className="preset-card__thumb thumb">{w.items[0] && <ExerciseAnimation exerciseId={w.items[0].exerciseId} frame={1} />}</span>
      <span className="preset-card__text">
        <strong>{preset.name}</strong>
        <span className="muted">
          {preset.blurb}. {w.items.length} exercises, about {formatDuration(estimateSeconds(w))}
        </span>
        <span className={`preset-card__usage ${done ? 'is-done' : ''}`}>
          {done && <Icon name="check" size={14} />}
          {usageLabel(preset.usage)}
        </span>
      </span>
      {mode === 'open' && <Icon name="back" size={18} className="flip pick__chev" />}
    </button>
  )
}
