import { useEffect, useRef, useState, type PointerEvent } from 'react'
import type { Highlight } from '../figure/ExerciseAnimation'
import type { LoadKind, Pattern } from '../figure/patterns'
import { FigureView, isDark, resetCache, still } from './render'

const MAX_W = 900

/** Re-render when the colour scheme flips, dropping images drawn in the old palette. */
function useScheme() {
  const [dark, setDark] = useState(isDark)
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const on = () => {
      resetCache()
      setDark(isDark())
    }
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return dark
}

function useWidth(ref: React.RefObject<HTMLElement | null>) {
  const [w, setW] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)))
    ro.observe(el)
    setW(Math.round(el.getBoundingClientRect().width))
    return () => ro.disconnect()
  }, [ref])
  return w
}

// Stills are drawn a few per frame so a long list doesn't block scrolling.
const queue: (() => void)[] = []
let pumping = false
function pump() {
  const start = performance.now()
  while (queue.length && performance.now() - start < 10) queue.shift()!()
  if (queue.length) requestAnimationFrame(pump)
  else pumping = false
}
function enqueue(job: () => void) {
  queue.push(job)
  if (!pumping) {
    pumping = true
    requestAnimationFrame(pump)
  }
}

interface Props {
  id: string
  pattern: Pattern
  load: LoadKind
  hi: Highlight | null
  label: string
  className?: string
}

/** A still image of one moment of the rep (thumbnails). */
export function Still3D({ id, pattern, load, hi, k, label, className }: Props & { k: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const w = useWidth(ref)
  const dark = useScheme()
  useEffect(() => {
    if (!w) return
    let live = true
    const pw = Math.min(MAX_W, Math.round(w * Math.min(2, devicePixelRatio || 1)))
    const ph = Math.round(pw / 1.25)
    enqueue(() => {
      const c = canvas.current
      if (!live || !c) return
      const src = still(id, pattern, load, hi, k, pw, ph)
      c.width = pw
      c.height = ph
      c.getContext('2d')!.drawImage(src, 0, 0)
    })
    return () => {
      live = false
    }
  }, [w, id, pattern, load, hi, k, dark])
  return (
    <div ref={ref} className={`fig fig--3d ${className ?? ''}`} role="img" aria-label={label}>
      <canvas ref={canvas} width={0} height={0} />
    </div>
  )
}

/** The animated figure. Drag sideways to turn it when `turnable`. */
export function Animated3D({
  id,
  pattern,
  load,
  hi,
  label,
  className,
  phaseAt,
  durMs,
  turnable,
}: Props & { phaseAt: (p: number) => number; durMs: number; turnable?: boolean }) {
  const wrap = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const w = useWidth(wrap)
  const dark = useScheme()
  const yaw = useRef(0)
  const drag = useRef<{ x: number; yaw: number } | null>(null)
  const [turned, setTurned] = useState(false)

  useEffect(() => {
    const c = canvas.current
    if (!c || !w) return
    const pw = Math.min(MAX_W, Math.round(w * Math.min(2, devicePixelRatio || 1)))
    const ph = Math.round(pw / 1.25)
    c.width = pw
    c.height = ph
    const ctx = c.getContext('2d')!
    const view = new FigureView(pattern, load, hi)
    let visible = true
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting))
    io.observe(c)
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      if (!visible || document.hidden) return
      view.setYaw(yaw.current)
      view.frame(phaseAt(((now - start) % durMs) / durMs))
      view.drawTo(ctx, pw, ph)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w, id, pattern, load, hi, durMs, dark])

  const onDown = (e: PointerEvent) => {
    if (!turnable) return
    drag.current = { x: e.clientX, yaw: yaw.current }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onMove = (e: PointerEvent) => {
    if (!drag.current) return
    const dx = e.clientX - drag.current.x
    yaw.current = Math.max(-1.4, Math.min(1.4, drag.current.yaw - dx / 120))
    if (Math.abs(dx) > 6) setTurned(true)
  }
  const onUp = () => (drag.current = null)

  return (
    <div
      ref={wrap}
      className={`fig fig--3d ${turnable ? 'fig--turn' : ''} ${className ?? ''}`}
      role="img"
      aria-label={label}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <canvas ref={canvas} />
      {turnable && !turned && <span className="fig__hint">Drag to turn</span>}
      {turnable && turned && (
        <button
          className="fig__reset"
          onClick={(e) => {
            e.stopPropagation()
            yaw.current = 0
            setTurned(false)
          }}
        >
          Reset view
        </button>
      )}
    </div>
  )
}
