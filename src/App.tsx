import { useCallback, useEffect, useState } from 'react'
import { Icon } from './components/Icon'
import { Toast } from './components/ui'
import { DEFAULT_REST, generatePlan, type Workout } from './lib/planner'
import { store, type ActiveSession, type HistoryEntry, type Prefs } from './lib/storage'
import { Library } from './screens/Library'
import { Plan } from './screens/Plan'
import { Session } from './screens/Session'
import { Setup } from './screens/Setup'
import { Summary } from './screens/Summary'

type Screen = 'setup' | 'plan' | 'session' | 'summary' | 'library'

const DEFAULT_PREFS: Prefs = {
  muscles: [],
  minutes: 45,
  equipment: 'gym',
  goal: 'muscle',
  restCompound: DEFAULT_REST.compound,
  restIsolation: DEFAULT_REST.isolation,
  warmup: true,
  sound: true,
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('setup')
  const [prefs, setPrefsState] = useState<Prefs>(() => ({ ...DEFAULT_PREFS, ...store.prefs(), muscles: store.prefs()?.muscles ?? [] }))
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [session, setSession] = useState<ActiveSession | null>(() => store.active())
  const [summary, setSummary] = useState<HistoryEntry | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const setPrefs = useCallback((p: Prefs) => {
    setPrefsState(p)
    store.setPrefs(p)
  }, [])

  const notify = useCallback((msg: string) => setToast(msg), [])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [screen])

  const build = () => {
    setWorkout(generatePlan(prefs))
    setScreen('plan')
  }

  const start = (w: Workout) => {
    const s: ActiveSession = { workout: w, stepIndex: 0, startedAt: Date.now(), endAt: null, done: {} }
    store.setActive(s)
    setSession(s)
    setScreen('session')
  }

  const finish = (entry: HistoryEntry | null) => {
    if (session) setWorkout(session.workout)
    store.setActive(null)
    setSession(null)
    if (entry) {
      store.addHistory(entry)
      setSummary(entry)
      setScreen('summary')
    } else {
      setScreen(session ? 'plan' : 'setup')
    }
  }

  const tab = screen === 'library' ? 'library' : 'build'
  const showNav = screen === 'setup' || screen === 'library'

  return (
    <div className={`app ${showNav ? 'has-nav' : ''}`}>
      {screen === 'setup' && (
        <Setup
          prefs={prefs}
          onChange={setPrefs}
          onBuild={build}
          activeSession={session}
          onResume={() => setScreen('session')}
          onDiscardSession={() => {
            store.setActive(null)
            setSession(null)
          }}
          draft={workout}
          onOpenDraft={() => setScreen('plan')}
        />
      )}
      {screen === 'plan' && workout && (
        <Plan
          workout={workout}
          onChange={setWorkout}
          onBack={() => setScreen('setup')}
          onRegenerate={() => setWorkout(generatePlan({ ...prefs, ...pickPlanInputs(workout) }))}
          onStart={() => start(workout)}
          notify={notify}
        />
      )}
      {screen === 'session' && session && (
        <Session
          session={session}
          sound={prefs.sound}
          onSound={(sound) => setPrefs({ ...prefs, sound })}
          onUpdate={(s) => {
            store.setActive(s)
            setSession(s)
          }}
          onFinish={finish}
          onMinimize={() => setScreen('setup')}
        />
      )}
      {screen === 'summary' && summary && (
        <Summary entry={summary} workout={workout} onDone={() => setScreen('library')} notify={notify} />
      )}
      {screen === 'library' && (
        <Library
          onOpen={(w) => {
            setWorkout(w)
            setScreen('plan')
          }}
          notify={notify}
        />
      )}

      {showNav && (
        <nav className="bottom-nav" aria-label="Main">
          <button className={tab === 'build' ? 'is-on' : ''} onClick={() => setScreen('setup')} aria-current={tab === 'build' ? 'page' : undefined}>
            <Icon name="dumbbell" size={22} />
            <span>Plan</span>
          </button>
          <button className={tab === 'library' ? 'is-on' : ''} onClick={() => setScreen('library')} aria-current={tab === 'library' ? 'page' : undefined}>
            <Icon name="history" size={22} />
            <span>Log</span>
          </button>
        </nav>
      )}
      <Toast message={toast} />
    </div>
  )
}

function pickPlanInputs(w: Workout) {
  return {
    muscles: w.muscles,
    minutes: w.targetMin,
    equipment: w.equipment,
    goal: w.goal,
    warmup: w.warmup,
    ...(w.restCompound !== undefined ? { restCompound: w.restCompound } : {}),
    ...(w.restIsolation !== undefined ? { restIsolation: w.restIsolation } : {}),
  }
}
