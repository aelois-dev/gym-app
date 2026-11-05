let ctx: AudioContext | null = null

/** Call from a tap handler so iOS/Android allow sound later on. */
export function unlockAudio() {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    // iOS 17+: play beeps even when the silent switch is on.
    const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession
    if (session && session.type !== 'playback') session.type = 'playback'
    ctx ??= new AC()
    if (ctx.state === 'suspended') void ctx.resume()
  } catch {
    ctx = null
  }
}

function tone(freq: number, start: number, dur: number) {
  if (!ctx) return
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(0.35, start + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  osc.connect(gain).connect(ctx.destination)
  osc.start(start)
  osc.stop(start + dur + 0.05)
}

export function tick(sound: boolean) {
  if (!sound || !ctx) return
  tone(660, ctx.currentTime, 0.12)
}

/** Long buzz pattern for when a countdown ends (Android; iPhone Safari has no Vibration API). */
export const ALARM_PATTERN = [500, 150, 500, 150, 900]
const ALARM_ROUNDS = 3
const ALARM_EVERY_MS = 2500

let repeat: number | null = null

function canVibrate() {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
}

let hapticLabel: HTMLLabelElement | null = null
/**
 * iOS 18+ Safari gives a haptic tap when a switch-style checkbox is toggled through its label.
 * A short burst of these is the closest an iPhone web page can get to a vibration.
 */
function hapticBurst(taps = 6) {
  if (typeof document === 'undefined') return
  if (!hapticLabel) {
    const label = document.createElement('label')
    label.setAttribute('aria-hidden', 'true')
    label.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden;left:-10px;top:0'
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.setAttribute('switch', '')
    input.tabIndex = -1
    label.appendChild(input)
    document.body.appendChild(label)
    hapticLabel = label
  }
  for (let i = 0; i < taps; i++) setTimeout(() => hapticLabel?.click(), i * 120)
}

function ring(sound: boolean) {
  if (sound && ctx) {
    const t = ctx.currentTime
    tone(880, t, 0.18)
    tone(880, t + 0.25, 0.18)
    tone(1320, t + 0.5, 0.35)
  }
  try {
    if (canVibrate()) navigator.vibrate(ALARM_PATTERN)
    else hapticBurst()
  } catch {
    /* not supported */
  }
}

/** Beep and buzz when a countdown ends, repeating a few times until the user taps (see stopAlarm). */
export function alarm(sound: boolean, message = "Time's up") {
  stopAlarm()
  ring(sound)
  let rounds = 1
  repeat = window.setInterval(() => {
    if (rounds >= ALARM_ROUNDS) return stopAlarm()
    rounds++
    ring(sound)
  }, ALARM_EVERY_MS)
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') void backgroundNotice(message)
}

export function stopAlarm() {
  if (repeat === null) return
  clearInterval(repeat)
  repeat = null
  try {
    if (canVibrate()) navigator.vibrate(0)
  } catch {
    /* not supported */
  }
}

// ---------- notifications while the app is in the background ----------

const ASKED_KEY = 'gp.alerts.v1'

export function alertsSupported() {
  return typeof window !== 'undefined' && 'Notification' in window
}

/** Whether to offer "Alert me when rest ends": supported, not yet decided, and not dismissed before. */
export function shouldOfferAlerts() {
  if (!alertsSupported() || Notification.permission !== 'default') return false
  try {
    return !localStorage.getItem(ASKED_KEY)
  } catch {
    return false
  }
}

/** Call from a tap. */
export async function requestAlerts(): Promise<boolean> {
  try {
    localStorage.setItem(ASKED_KEY, '1')
  } catch {
    /* ignore */
  }
  if (!alertsSupported()) return false
  try {
    return (await Notification.requestPermission()) === 'granted'
  } catch {
    return false
  }
}

export function dismissAlerts() {
  try {
    localStorage.setItem(ASKED_KEY, '1')
  } catch {
    /* ignore */
  }
}

async function backgroundNotice(body: string) {
  if (!alertsSupported() || Notification.permission !== 'granted') return
  const options = { body, tag: 'gp-timer', renotify: true, vibrate: ALARM_PATTERN, icon: 'icon-192.png' } as NotificationOptions
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) await reg.showNotification('Gym Planner', options)
    else new Notification('Gym Planner', options)
  } catch {
    /* best effort */
  }
}

type Sentinel = { release: () => Promise<void>; released: boolean }
let lock: Sentinel | null = null
let wanted = false

async function acquire() {
  try {
    const wl = (navigator as unknown as { wakeLock?: { request: (t: 'screen') => Promise<Sentinel> } }).wakeLock
    if (!wl || (lock && !lock.released)) return
    lock = await wl.request('screen')
  } catch {
    lock = null
  }
}

function onVisible() {
  if (wanted && document.visibilityState === 'visible') void acquire()
}

export function keepAwake(on: boolean) {
  wanted = on
  if (on) {
    document.addEventListener('visibilitychange', onVisible)
    void acquire()
  } else {
    document.removeEventListener('visibilitychange', onVisible)
    void lock?.release().catch(() => {})
    lock = null
  }
}

export const wakeLockSupported = () => 'wakeLock' in navigator
