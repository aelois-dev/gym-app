import { useEffect, useState } from 'react'

/** Re-renders a few times a second and returns Date.now(). Time is always derived from timestamps,
 *  so it stays correct after the phone sleeps or the tab is backgrounded. */
export function useNow(active = true, intervalMs = 250): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const tick = () => setNow(Date.now())
    const id = window.setInterval(tick, intervalMs)
    document.addEventListener('visibilitychange', tick)
    tick()
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [active, intervalMs])
  return now
}
