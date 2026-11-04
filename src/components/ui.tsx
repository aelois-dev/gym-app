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

/** A countdown dial styled like a weight plate: iron rim, red progress, raised hub. */
export function ProgressRing({ progress, size = 260, children }: { progress: number; size?: number; stroke?: number; children?: ReactNode }) {
  const c = size / 2
  const rimW = size * 0.085
  const r = c - rimW / 2 - 2
  const circ = 2 * Math.PI * r
  const p = Math.min(1, Math.max(0, progress))
  const ticks = Array.from({ length: 60 }, (_, i) => {
    const a = (i / 60) * Math.PI * 2
    const r1 = r - rimW / 2 - 6
    const r2 = r1 - (i % 5 === 0 ? 7 : 3.5)
    return `M${(c + r1 * Math.sin(a)).toFixed(1)} ${(c - r1 * Math.cos(a)).toFixed(1)}L${(c + r2 * Math.sin(a)).toFixed(1)} ${(c - r2 * Math.cos(a)).toFixed(1)}`
  }).join('')
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={c} cy={c} r={c - 1} className="ring__face" />
        <circle cx={c} cy={c} r={r} fill="none" className="ring__rim" strokeWidth={rimW} />
        <circle
          className="ring__bar"
          cx={c}
          cy={c}
          r={r}
          fill="none"
          strokeWidth={rimW}
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - p)}
          transform={`rotate(-90 ${c} ${c})`}
        />
        <path d={ticks} className="ring__ticks" />
        <circle cx={c} cy={c} r={size * 0.29} className="ring__hub" />
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
