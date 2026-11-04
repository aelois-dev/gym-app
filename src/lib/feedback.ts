let ctx: AudioContext | null = null

/** Call from a tap handler so iOS/Android allow sound later on. */
export function unlockAudio() {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return
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

export function alarm(sound: boolean) {
  if (sound && ctx) {
    const t = ctx.currentTime
    tone(880, t, 0.18)
    tone(880, t + 0.25, 0.18)
    tone(1320, t + 0.5, 0.35)
  }
  try {
    navigator.vibrate?.([200, 100, 200, 100, 400])
  } catch {
    /* not supported */
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
