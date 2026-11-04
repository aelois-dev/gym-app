import { EXERCISES } from '../data/exercises'
import { ExerciseAnimation } from '../figure/ExerciseAnimation'

/**
 * Dev-only contact sheet: every exercise at start, middle and end of a rep.
 * `/?figures` shows all; `/?figures=back-squat,plank` shows only those, large.
 */
export function FigureSheet() {
  const only = new URLSearchParams(location.search).get('figures')
  const ids = only ? only.split(',') : null
  const list = ids ? EXERCISES.filter((e) => ids.includes(e.id)) : EXERCISES
  return (
    <div style={{ display: 'grid', gridTemplateColumns: ids && ids.length <= 4 ? '1fr' : ids ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 8, padding: 8 }}>
      {list.map((e) => (
        <div key={e.id} data-ex={e.id} style={{ background: 'var(--raised)', borderRadius: 8, padding: 4 }}>
          <div style={{ fontSize: ids ? 14 : 10, fontWeight: 600 }}>{e.name}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
            <ExerciseAnimation exerciseId={e.id} frame={0} />
            <ExerciseAnimation exerciseId={e.id} frame={0.5} />
            <ExerciseAnimation exerciseId={e.id} frame={1} />
          </div>
        </div>
      ))}
    </div>
  )
}
