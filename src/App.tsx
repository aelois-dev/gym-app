import { useCallback, useEffect, useMemo, useState } from 'react'
import { Icon } from './components/Icon'
import { Toast } from './components/ui'
import { DEFAULT_REST, generatePlan, type PlanInput, type Workout } from './lib/planner'
import { withSuggestedWeights } from './lib/progression'
import { store, type ActiveSession, type HistoryEntry, type Prefs } from './lib/storage'
import { coachNote } from './lib/coach'
import { adjustForReadiness, dateKey, readiness, type CheckIn, type Readiness } from './lib/readiness'
import { fatigue } from './lib/recovery'
import { DEFAULT_PROFILE, type Profile } from './lib/profile'
import { buildProgram, dayAt, programInput, startOfWeek } from './lib/program'
import { Library } from './screens/Library'
import { Onboarding } from './screens/Onboarding'
import { Today } from './screens/Today'
import { Habits } from './screens/Habits'
import { EMPTY_DAY, targets } from './lib/nutrition'
import { Plan } from './screens/Plan'
import { Session } from './screens/Session'
import { Setup } from './screens/Setup'
import { Summary } from './screens/Summary'
import { ReplaceSessionSheet } from './components/ReplaceSessionSheet'
import { dayPresets, defaultPreset, lineupToSave, presetUsage } from './lib/presets'
import { sessionEntry } from './lib/session'
import { DEFAULT_WARMUP_MIN } from './lib/warmup'

type Screen = 'onboarding' | 'today' | 'setup' | 'plan' | 'session' | 'summary' | 'library' | 'habits'

const DEFAULT_PREFS: Prefs = {
  muscles: [],
  minutes: 45,
  equipment: 'gym',
  goal: 'muscle',
  restCompound: DEFAULT_REST.compound,
  restIsolation: DEFAULT_REST.isolation,
  warmup: true,
  warmupMin: DEFAULT_WARMUP_MIN,
  sound: true,
  exerciseCount: null,
}

export default function App() {
  const [profile, setProfileState] = useState<Profile | null>(() => store.profile())
  const [screen, setScreen] = useState<Screen>(() => (store.profile() ? 'today' : 'onboarding'))
  const [programIndex, setProgramIndexState] = useState(() => store.programIndex())
  const [historyVersion, setHistoryVersion] = useState(0)
  /** Where the plan editor returns to. */
  const [planFrom, setPlanFrom] = useState<Screen>('setup')
  const [prefs, setPrefsState] = useState<Prefs>(() => ({ ...DEFAULT_PREFS, ...store.prefs(), muscles: store.prefs()?.muscles ?? [] }))
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [session, setSession] = useState<ActiveSession | null>(() => migrateSession(store.active()))
  /** A workout waiting to start while another is in progress ('end' = just ending the current one). */
  const [replace, setReplace] = useState<{ next: Workout | null } | null>(null)
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

  /** New plans start at the weights you last lifted. */
  const plan = (input: PlanInput, r: Readiness = 'normal') => withSuggestedWeights(generatePlan(input), store.history(), store.lastWeights(), r)

  // ---------- coach: weekly program ----------
  const coachProfile = profile ?? DEFAULT_PROFILE
  const program = useMemo(() => buildProgram(coachProfile), [coachProfile])
  const day = dayAt(program, programIndex)
  const nextDay = dayAt(program, programIndex + 1)
  const setProgramIndex = (i: number) => {
    setProgramIndexState(i)
    store.setProgramIndex(i)
  }
  const [checkIn, setCheckInState] = useState<CheckIn | null>(() => store.checkIn(dateKey()))
  const ready = readiness(checkIn)
  const history = useMemo(() => store.history(), [historyVersion])

  // Three fixed versions of today's program day; the choice is remembered per day.
  const [presetChoice, setPresetChoice] = useState<Record<string, string>>({})
  const presets = useMemo(
    () => dayPresets(programInput(coachProfile, day, prefs), day, store.presets()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [day, coachProfile, prefs.warmup, prefs.warmupMin, prefs.restCompound, prefs.restIsolation, historyVersion],
  )
  const chosen = presets.find((p) => p.id === presetChoice[day.id]) ?? defaultPreset(presets, history, day.id)
  const todayPlan = useMemo(
    () => adjustForReadiness({ ...withSuggestedWeights(chosen.workout, history, store.lastWeights(), ready), programDay: day.id }, ready),
    [chosen, history, ready, day.id],
  )
  const presetCards = presets.map((p) => ({ id: p.id, name: p.name, blurb: p.blurb, usage: presetUsage(history, p.id), workout: p.workout }))
  const fatigueNow = useMemo(() => fatigue(history), [history])
  const sessionsThisWeek = history.filter((h) => h.finishedAt >= startOfWeek()).length
  const protein = targets(coachProfile).proteinG
  const proteinToday = { ...EMPTY_DAY, ...store.habits()[dateKey()] }.proteinG
  const note = coachNote({
    proteinTarget: protein,
    proteinLeft: protein ? Math.max(0, protein - proteinToday) : undefined,
    now: Date.now(),
    day,
    nextDay,
    history,
    sessionsThisWeek,
    targetPerWeek: coachProfile.daysPerWeek,
    fatigue: fatigueNow,
    readiness: ready,
  })

  const saveProfile = (p: Profile) => {
    setProfileState(p)
    store.setProfile(p)
    setScreen('today')
  }

  const editPlan = (w: Workout, from: Screen) => {
    setWorkout(w)
    setPlanFrom(from)
    setScreen('plan')
  }

  const build = () => {
    editPlan(plan({ ...prefs, count: prefs.exerciseCount }), 'setup')
  }

  const begin = (w: Workout) => {
    const s: ActiveSession = { workout: w, stepIndex: 0, startedAt: Date.now(), endAt: null, done: {} }
    store.setActive(s)
    setSession(s)
    setScreen('session')
  }

  /** Starting a workout never silently replaces one in progress. */
  const start = (w: Workout) => {
    if (session) setReplace({ next: w })
    else begin(w)
  }

  /** Save a finished (or ended-early) session: history, last weights, preset line-up, rotation. */
  const record = (entry: HistoryEntry, w: Workout) => {
    store.addHistory(entry)
    store.rememberWeights(entry)
    if (w.presetId) store.savePreset(w.presetId, lineupToSave(w))
    // Finishing today's program day moves the rotation on.
    if (entry.programDay && entry.programDay === day.id) setProgramIndex(programIndex + 1)
    setHistoryVersion((v) => v + 1)
  }

  const endCurrent = (save: boolean) => {
    if (!session) return
    if (save) record(sessionEntry(session), session.workout)
    store.setActive(null)
    setSession(null)
  }

  const finish = (entry: HistoryEntry | null) => {
    if (session) setWorkout(session.workout)
    store.setActive(null)
    setSession(null)
    if (entry) {
      if (session) record(entry, session.workout)
      setSummary(entry)
      setScreen('summary')
    } else {
      setScreen(session?.workout.programDay ? 'today' : session ? 'plan' : 'setup')
    }
  }

  const tab = screen === 'library' ? 'library' : screen === 'today' ? 'today' : screen === 'habits' ? 'habits' : 'build'
  const showNav = screen === 'today' || screen === 'setup' || screen === 'library' || screen === 'habits'

  return (
    <div className={`app ${showNav ? 'has-nav' : ''}`}>
      {screen === 'onboarding' && <Onboarding initial={coachProfile} onDone={saveProfile} onCancel={profile ? () => setScreen('today') : undefined} />}
      {screen === 'today' && (
        <Today
          note={note}
          day={day}
          nextDay={nextDay}
          plan={todayPlan}
          presets={presetCards}
          chosenPreset={chosen.id}
          onChoosePreset={(id) => setPresetChoice({ ...presetChoice, [day.id]: id })}
          sessionsThisWeek={sessionsThisWeek}
          targetPerWeek={coachProfile.daysPerWeek}
          activeSession={session}
          onResume={() => setScreen('session')}
          onStart={() => start(todayPlan)}
          onEditPlan={() => editPlan(todayPlan, 'today')}
          onSkipDay={() => setProgramIndex(programIndex + 1)}
          onSettings={() => setScreen('onboarding')}
          checkIn={checkIn}
          onCheckIn={(c) => {
            store.saveCheckIn(c)
            setCheckInState(c)
          }}
          fatigue={fatigueNow}
        />
      )}
      {screen === 'habits' && <Habits profile={coachProfile} onSettings={() => setScreen('onboarding')} />}
      {screen === 'setup' && (
        <Setup
          prefs={prefs}
          onChange={setPrefs}
          onBuild={build}
          activeSession={session}
          onResume={() => setScreen('session')}
          onEndSession={() => setReplace({ next: null })}
          history={history}
          onOpenPreset={(w) => editPlan(withSuggestedWeights(w, history, store.lastWeights()), 'setup')}
          draft={workout}
          onOpenDraft={() => setScreen('plan')}
        />
      )}
      {screen === 'plan' && workout && (
        <Plan
          workout={workout}
          onChange={setWorkout}
          onBack={() => setScreen(planFrom)}
          onRegenerate={() => setWorkout(plan({ ...prefs, ...pickPlanInputs(workout) }))}
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
          onMinimize={() => setScreen(session.workout.programDay ? 'today' : 'setup')}
        />
      )}
      {screen === 'summary' && summary && (
        <Summary entry={summary} workout={workout} onDone={() => setScreen('today')} notify={notify} />
      )}
      {screen === 'library' && (
        <Library
          goal={coachProfile.goal}
          notify={notify}
        />
      )}

      {showNav && (
        <nav className="bottom-nav" aria-label="Main">
          <button className={tab === 'today' ? 'is-on' : ''} onClick={() => setScreen('today')} aria-current={tab === 'today' ? 'page' : undefined}>
            <Icon name="today" size={22} />
            <span>Today</span>
          </button>
          <button className={tab === 'build' ? 'is-on' : ''} onClick={() => setScreen('setup')} aria-current={tab === 'build' ? 'page' : undefined}>
            <Icon name="dumbbell" size={22} />
            <span>Plan</span>
          </button>
          <button className={tab === 'library' ? 'is-on' : ''} onClick={() => setScreen('library')} aria-current={tab === 'library' ? 'page' : undefined}>
            <Icon name="chart" size={22} />
            <span>Progress</span>
          </button>
          <button className={tab === 'habits' ? 'is-on' : ''} onClick={() => setScreen('habits')} aria-current={tab === 'habits' ? 'page' : undefined}>
            <Icon name="drop" size={22} />
            <span>Habits</span>
          </button>
        </nav>
      )}
      {replace && session && (
        <ReplaceSessionSheet
          session={session}
          next={replace.next}
          onClose={() => setReplace(null)}
          onResume={() => {
            setReplace(null)
            setScreen('session')
          }}
          onEnd={(save) => {
            const next = replace.next
            endCurrent(save)
            setReplace(null)
            if (next) begin(next)
            else notify(save ? 'Saved to history' : 'Workout discarded')
          }}
        />
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
    warmupMin: w.warmupMin,
    count: w.requestedCount ?? null,
    ...(w.restCompound !== undefined ? { restCompound: w.restCompound } : {}),
    ...(w.restIsolation !== undefined ? { restIsolation: w.restIsolation } : {}),
  }
}

/** Sessions saved before the guided warm-up had one warm-up step; it now has four. */
function migrateSession(s: ActiveSession | null): ActiveSession | null {
  if (!s || !s.workout.warmup || s.workout.warmupMin !== undefined) return s
  return { ...s, workout: { ...s.workout, warmupMin: DEFAULT_WARMUP_MIN }, stepIndex: s.stepIndex > 0 ? s.stepIndex + 3 : 0 }
}
