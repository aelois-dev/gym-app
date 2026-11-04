import { useEffect, type ReactNode } from 'react'
import { Icon } from './Icon'

export function Stepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
  format = (v: number) => String(v),
  size = 'md',
}: {
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step?: number
  label: string
  format?: (v: number) => string
  size?: 'md' | 'lg'
}) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, v)))
  return (
    <div className={`stepper stepper--${size}`} role="group" aria-label={label}>
      <button type="button" className="stepper__btn" onClick={() => set(value - step)} disabled={value <= min} aria-label={`Decrease ${label}`}>
        <Icon name="minus" size={size === 'lg' ? 22 : 18} />
      </button>
      <output className="stepper__value" aria-live="polite">
        {format(value)}
      </output>
      <button type="button" className="stepper__btn" onClick={() => set(value + step)} disabled={value >= max} aria-label={`Increase ${label}`}>
        <Icon name="plus" size={size === 'lg' ? 22 : 18} />
      </button>
    </div>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: { id: T; label: string; sub?: string }[]
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          type="button"
          key={o.id}
          role="radio"
          aria-checked={value === o.id}
          className={`segmented__opt ${value === o.id ? 'is-on' : ''}`}
          onClick={() => onChange(o.id)}
        >
          <span className="segmented__label">{o.label}</span>
          {o.sub && <span className="segmented__sub">{o.sub}</span>}
        </button>
      ))}
    </div>
  )
}

export function ProgressRing({ progress, size = 260, stroke = 14, children }: { progress: number; size?: number; stroke?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const p = Math.min(1, Math.max(0, progress))
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
        <circle
          className="ring__bar"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring__inner">{children}</div>
    </div>
  )
}

export function Sheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
      <div className="sheet__scrim" onClick={onClose} />
      <div className="sheet__panel">
        <div className="sheet__grab" />
        <header className="sheet__head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </header>
        <div className="sheet__body">{children}</div>
      </div>
    </div>
  )
}

export function Toast({ message }: { message: string | null }) {
  return (
    <div className={`toast ${message ? 'is-on' : ''}`} role="status" aria-live="polite">
      {message}
    </div>
  )
}
