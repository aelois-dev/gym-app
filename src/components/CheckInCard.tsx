import { useState } from 'react'
import { Segmented } from './ui'
import { readiness, type CheckIn, type Rating } from '../lib/readiness'

const QUESTIONS: { key: 'sleep' | 'soreness' | 'energy'; label: string; options: [string, string, string] }[] = [
  { key: 'sleep', label: 'Sleep last night', options: ['Poor', 'OK', 'Good'] },
  { key: 'soreness', label: 'Soreness', options: ['None', 'Some', 'A lot'] },
  { key: 'energy', label: 'Energy', options: ['Low', 'OK', 'High'] },
]

const RESULT = {
  low: 'Lighter session today: one set fewer, longer rests.',
  normal: 'Normal session today.',
  high: 'Good to go. Push for the top of your reps.',
}

/** Three-tap daily readiness check-in. Collapses to a one-line summary once saved. */
export function CheckInCard({ date, value, onSave }: { date: string; value: CheckIn | null; onSave: (c: CheckIn) => void }) {
  const [editing, setEditing] = useState(!value)
  const [draft, setDraft] = useState<CheckIn>(value ?? { date, sleep: 2, soreness: 1, energy: 2 })

  if (!editing && value) {
    return (
      <div className="checkin checkin--done">
        <p>
          <strong>Checked in.</strong> {RESULT[readiness(value)]}
        </p>
        <button className="link" onClick={() => setEditing(true)}>
          Change
        </button>
      </div>
    )
  }

  return (
    <section className="checkin" aria-labelledby="checkin-head">
      <h2 id="checkin-head">How are you today?</h2>
      {QUESTIONS.map((q) => (
        <div key={q.key} className="checkin__q">
          <span className="checkin__label">{q.label}</span>
          <Segmented
            label={q.label}
            value={String(draft[q.key])}
            onChange={(v) => setDraft({ ...draft, [q.key]: Number(v) as Rating })}
            options={q.options.map((label, i) => ({ id: String(i + 1), label }))}
          />
        </div>
      ))}
      <button
        className="btn btn--quiet btn--block"
        onClick={() => {
          onSave({ ...draft, date })
          setEditing(false)
        }}
      >
        Save check-in
      </button>
    </section>
  )
}
