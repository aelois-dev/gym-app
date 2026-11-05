import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Segmented } from '../components/ui'
import { EQUIPMENT } from '../data/exercises'
import { EXPERIENCE_OPTIONS, GOAL_OPTIONS, type Profile, type Sex } from '../lib/profile'
import { buildProgram, programSummary } from '../lib/program'

const SESSION_PRESETS = [30, 45, 60, 75, 90]
const STEPS = ['goal', 'experience', 'week', 'equipment', 'body'] as const

function OptionList<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string; sub: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="options" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} role="radio" aria-checked={value === o.id} className={`option ${value === o.id ? 'is-on' : ''}`} onClick={() => onChange(o.id)}>
          <span className="option__label">{o.label}</span>
          <span className="option__sub">{o.sub}</span>
        </button>
      ))}
    </div>
  )
}

function NumberField({ label, unit, value, onChange, min, max }: { label: string; unit: string; value?: number; onChange: (v?: number) => void; min: number; max: number }) {
  return (
    <label className="row">
      <span className="row__text">
        <h2>{label}</h2>
      </span>
      <span className="number-field">
        <input
          type="text"
          inputMode="decimal"
          value={value ?? ''}
          placeholder="–"
          onChange={(e) => {
            const n = Number(e.target.value.replace(',', '.'))
            onChange(e.target.value.trim() === '' || !Number.isFinite(n) ? undefined : Math.min(max, Math.max(0, n)))
          }}
          onBlur={() => value !== undefined && value < min && onChange(undefined)}
        />
        <span>{unit}</span>
      </span>
    </label>
  )
}

export function Onboarding({ initial, onDone, onCancel }: { initial: Profile; onDone: (p: Profile) => void; onCancel?: () => void }) {
  const [step, setStep] = useState(0)
  const [p, setP] = useState<Profile>(initial)
  const set = (patch: Partial<Profile>) => setP((x) => ({ ...x, ...patch }))
  const program = buildProgram(p)
  const key = STEPS[step]
  const last = step === STEPS.length - 1

  return (
    <main className="screen onboarding">
      <header className="top-bar">
        {step > 0 ? (
          <button className="icon-btn" onClick={() => setStep(step - 1)} aria-label="Previous question">
            <Icon name="back" />
          </button>
        ) : (
          <span />
        )}
        <span className="spacer" />
        <span className="muted onboarding__step">
          {step + 1} of {STEPS.length}
        </span>
        <span className="spacer" />
        <button className="link" onClick={() => (onCancel ? onCancel() : onDone(p))}>
          {onCancel ? 'Cancel' : 'Skip'}
        </button>
      </header>

      {key === 'goal' && (
        <section className="block">
          <h1 className="display">What's your main goal?</h1>
          <OptionList label="Main goal" value={p.goal} options={GOAL_OPTIONS} onChange={(goal) => set({ goal })} />
        </section>
      )}

      {key === 'experience' && (
        <section className="block">
          <h1 className="display">How long have you been lifting?</h1>
          <OptionList label="Experience" value={p.experience} options={EXPERIENCE_OPTIONS} onChange={(experience) => set({ experience })} />
        </section>
      )}

      {key === 'week' && (
        <section className="block">
          <h1 className="display">How often can you train?</h1>
          <div className="presets presets--big" role="radiogroup" aria-label="Days per week">
            {[2, 3, 4, 5, 6].map((d) => (
              <button key={d} role="radio" aria-checked={p.daysPerWeek === d} className={`preset ${p.daysPerWeek === d ? 'is-on' : ''}`} onClick={() => set({ daysPerWeek: d })}>
                {d}
              </button>
            ))}
          </div>
          <p className="muted">days a week</p>
          <h2>For about how long?</h2>
          <div className="presets" role="radiogroup" aria-label="Session length in minutes">
            {SESSION_PRESETS.map((m) => (
              <button key={m} role="radio" aria-checked={p.sessionMin === m} className={`preset ${p.sessionMin === m ? 'is-on' : ''}`} onClick={() => set({ sessionMin: m })}>
                {m}
              </button>
            ))}
          </div>
          <div className="program-preview">
            <p className="program-preview__title">Your week: {programSummary(program)}</p>
            <ol>
              {program.map((d) => (
                <li key={d.id}>{d.name}</li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {key === 'equipment' && (
        <section className="block">
          <h1 className="display">What can you train with?</h1>
          <OptionList
            label="Equipment"
            value={p.equipment}
            options={EQUIPMENT.map((e) => ({ id: e.id, label: e.label, sub: e.hint }))}
            onChange={(equipment) => set({ equipment })}
          />
        </section>
      )}

      {key === 'body' && (
        <section className="block">
          <h1 className="display">About you</h1>
          <p className="muted">Used for your daily protein, water and calorie targets. Every field is optional.</p>
          <div className="rows">
            <NumberField label="Bodyweight" unit="kg" value={p.bodyweightKg} min={30} max={300} onChange={(bodyweightKg) => set({ bodyweightKg })} />
            <NumberField label="Height" unit="cm" value={p.heightCm} min={120} max={230} onChange={(heightCm) => set({ heightCm })} />
            <NumberField label="Age" unit="years" value={p.age} min={14} max={100} onChange={(age) => set({ age })} />
          </div>
          <h2>Sex, for the calorie estimate</h2>
          <Segmented
            label="Sex"
            value={p.sex ?? 'unset'}
            onChange={(v) => set({ sex: v === 'unset' ? undefined : (v as Sex) })}
            options={[
              { id: 'female', label: 'Female' },
              { id: 'male', label: 'Male' },
              { id: 'unset', label: 'Rather not say' },
            ]}
          />
        </section>
      )}

      <div className="cta-bar">
        <button className="btn btn--primary btn--block btn--lg" onClick={() => (last ? onDone(p) : setStep(step + 1))}>
          {last ? 'Make my plan' : 'Next'}
        </button>
      </div>
    </main>
  )
}
