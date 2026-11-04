import { EXERCISES } from '../data/exercises'
import { ExerciseAnimation } from '../figure/ExerciseAnimation'

/** Dev-only contact sheet: every exercise at start (A), middle and end (B) of a rep. */
export function FigureSheet() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, padding: 8 }}>
      {EXERCISES.map((e) => (
        <div key={e.id} style={{ background: 'var(--surface)', borderRadius: 8, padding: 4 }}>
          <div style={{ fontSize: 10, fontWeight: 600 }}>{e.name}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
            <ExerciseAnimation exerciseId={e.id} frame={0} />
            <ExerciseAnimation exerciseId={e.id} frame={0.5} />
            <ExerciseAnimation exerciseId={e.id} frame={1} />
          </div>
        </div>
      ))}
    </div>
  )
}
