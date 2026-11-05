import { useState, type ReactNode } from 'react'
import { Stepper } from '../components/ui'
import { EMPTY_DAY, metTarget, targets, type HabitDay, type HabitKey } from '../lib/nutrition'
import type { Profile } from '../lib/profile'
import { dateKey } from '../lib/readiness'
import { store } from '../lib/storage'

const DAY = 86400e3
const fmt = (n: number, digits = 1) => n.toLocaleString(undefined, { maximumFractionDigits: digits })

function Habit({
  title,
  value,
  goal,
  unit,
  missing,
  week,
  digits = 1,
  children,
}: {
  digits?: number
  title: string
  value: number
  goal?: number
  unit: string
  /** Shown instead of a target when one can't be worked out. */
  missing?: string
  week: boolean[]
  children: ReactNode
}) {
  const pct = goal ? Math.min(100, (value / goal) * 100) : 0
  return (
    <section className="habit" aria-label={title}>
      <div className="habit__head">
        <h2>{title}</h2>
        <p className="habit__value">
          <span className="num">{fmt(value, digits)}</span>
          {goal ? ` of ${fmt(goal, digits)} ${unit}` : ` ${unit}`}
        </p>
      </div>
      {goal ? (
        <div className="meter" role="progressbar" aria-valuemin={0} aria-valuemax={goal} aria-valuenow={value} aria-label={`${title} today`}>
          <div className={`meter__fill ${value >= goal ? 'is-done' : ''}`} style={{ width: `${pct}%` }} />
        </div>
      ) : (
        missing && <p className="hint">{missing}</p>
      )}
      <div className="habit__row">
        <div className="habit__actions">{children}</div>
        <div className="habit__week" aria-label={`Target met on ${week.filter(Boolean).length} of the last 7 days`}>
          {week.map((m, i) => (
            <span key={i} className={`habit__dot ${m ? 'is-met' : ''} ${i === 6 ? 'is-today' : ''}`} />
          ))}
        </div>
      </div>
    </section>
  )
}

export function Habits({ profile, onSettings }: { profile: Profile; onSettings: () => void }) {
  const today = dateKey()
  const [all, setAll] = useState(store.habits)
  const day: HabitDay = { ...EMPTY_DAY, ...all[today] }
  const t = targets(profile)
  const set = (patch: Partial<HabitDay>) => {
    const next = { ...day, ...patch }
    store.saveHabitDay(today, next)
    setAll({ ...all, [today]: next })
  }
  const add = (key: HabitKey, n: number) => set({ [key]: Math.max(0, Math.round((day[key] + n) * 10) / 10) })
  const week = (key: HabitKey) => Array.from({ length: 7 }, (_, i) => metTarget(all[dateKey(Date.now() - (6 - i) * DAY)], key, t))
  const needsWeight = 'Add your bodyweight in coach settings for a daily target.'

  return (
    <main className="screen">
      <header className="page-head page-head--row">
        <h1 className="display">Habits</h1>
        <button className="link" onClick={onSettings}>
          Coach settings
        </button>
      </header>

      <div className="fuel">
        <p className="fuel__kcal">
          {t.kcal ? (
            <>
              About <span className="num">{t.kcal.toLocaleString()}</span> kcal a day
            </>
          ) : (
            'Add your height, age and sex in coach settings for a calorie estimate.'
          )}
        </p>
        <p className="hint">Estimates for healthy adults, not medical advice. The dots show the last 7 days; filled means you hit the target.</p>
      </div>

      <div className="habits">
        <Habit title="Protein" value={day.proteinG} goal={t.proteinG} unit="g" missing={needsWeight} week={week('proteinG')}>
          <button className="btn btn--sm btn--quiet" onClick={() => add('proteinG', 20)}>
            +20 g
          </button>
          <button className="btn btn--sm btn--quiet" onClick={() => add('proteinG', 30)}>
            +30 g
          </button>
          <button className="btn btn--sm btn--quiet" onClick={() => add('proteinG', -10)} disabled={day.proteinG <= 0} aria-label="Remove 10 grams of protein">
            −10
          </button>
        </Habit>

        <Habit title="Water" value={day.waterMl / 1000} goal={t.waterMl ? t.waterMl / 1000 : undefined} unit="litres" digits={2} missing={needsWeight} week={week('waterMl')}>
          <button className="btn btn--sm btn--quiet" onClick={() => add('waterMl', 250)}>
            +1 glass
          </button>
          <button className="btn btn--sm btn--quiet" onClick={() => add('waterMl', 500)}>
            +1 bottle
          </button>
          <button className="btn btn--sm btn--quiet" onClick={() => add('waterMl', -250)} disabled={day.waterMl <= 0} aria-label="Remove one glass of water">
            −1
          </button>
        </Habit>

        <Habit title="Steps" value={day.steps} goal={t.steps} unit="steps" week={week('steps')}>
          <label className="number-field">
            <span className="sr-only">Steps today</span>
            <input
              type="text"
              inputMode="numeric"
              value={day.steps || ''}
              placeholder="0"
              onChange={(e) => set({ steps: Math.min(100000, Number(e.target.value.replace(/\D/g, '')) || 0) })}
            />
            <span>from your phone or watch</span>
          </label>
        </Habit>

        <Habit title="Sleep last night" value={day.sleepH} goal={t.sleepH} unit="hours" week={week('sleepH')}>
          <Stepper label="Hours of sleep" value={day.sleepH} min={0} max={14} step={0.5} onChange={(sleepH) => set({ sleepH })} format={(h) => `${fmt(h)} h`} />
        </Habit>
      </div>
    </main>
  )
}
