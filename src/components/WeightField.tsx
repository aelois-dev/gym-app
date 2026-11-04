import { useEffect, useState } from 'react'
import { Icon } from './Icon'
import type { Kit } from '../data/exercises'
import { formatKg, parseKg, weightLabel, weightStep } from '../lib/weights'

/**
 * Weight entry: − / + buttons around a number you can also type into. Blank means "not recorded".
 * The step and the label depend on the equipment (per dumbbell, barbell total, stack weight).
 */
export function WeightField({
  kit,
  value,
  onChange,
  label,
  size = 'md',
}: {
  kit: Kit
  value: number | undefined
  onChange: (kg: number | undefined) => void
  /** Accessible name, e.g. "Incline Dumbbell Press weight". */
  label: string
  size?: 'md' | 'lg'
}) {
  const [text, setText] = useState(value === undefined ? '' : formatKg(value))
  // Follow outside changes (e.g. the next set prefilled) without clobbering what is being typed.
  useEffect(() => {
    setText((t) => (parseKg(t) === value ? t : value === undefined ? '' : formatKg(value)))
  }, [value])

  const step = weightStep(kit)
  const bump = (dir: 1 | -1) => {
    const base = value ?? 0
    const next = Math.max(0, Math.round((base + dir * step) / step) * step)
    onChange(Math.round(next * 100) / 100)
  }

  return (
    <div className={`weight weight--${size}`}>
      <div className="stepper weight__stepper" role="group" aria-label={label}>
        <button type="button" className="stepper__btn" onClick={() => bump(-1)} disabled={!value} aria-label={`Decrease ${label}`}>
          <Icon name="minus" size={size === 'lg' ? 22 : 18} />
        </button>
        <input
          className="weight__input"
          type="text"
          inputMode="decimal"
          enterKeyHint="done"
          placeholder="–"
          value={text}
          aria-label={`${label}, ${weightLabel(kit)}`}
          onChange={(e) => {
            const t = e.target.value.replace(/[^0-9.,]/g, '')
            setText(t)
            onChange(parseKg(t))
          }}
          onFocus={(e) => e.target.select()}
        />
        <button type="button" className="stepper__btn" onClick={() => bump(1)} aria-label={`Increase ${label}`}>
          <Icon name="plus" size={size === 'lg' ? 22 : 18} />
        </button>
      </div>
      <span className="weight__unit">{weightLabel(kit)}</span>
    </div>
  )
}
