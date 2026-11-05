import { useEffect, useState } from 'react'

type Mod = typeof import('./index')
export type State3d = 'loading' | 'off' | Mod

let mod: Mod | null = null
let failed = false
let promise: Promise<void> | null = null
const listeners = new Set<() => void>()

/** Start fetching the 3D renderer (called once the app has painted). */
export function preload3d(): Promise<void> {
  if (!promise) {
    promise = (typeof window === 'undefined' || !('WebGLRenderingContext' in window) ? Promise.reject(new Error('no webgl')) : import('./index'))
      .then((m) => {
        if (m.webglAvailable()) mod = m
        else failed = true
      })
      .catch(() => {
        failed = true
      })
      .finally(() => listeners.forEach((l) => l()))
  }
  return promise
}

/** The 3D components once loaded, 'loading' meanwhile, or 'off' to use the 2D figure. */
export function use3d(): State3d {
  const [, bump] = useState(0)
  useEffect(() => {
    if (mod || failed) return
    const l = () => bump((n) => n + 1)
    listeners.add(l)
    void preload3d()
    return () => {
      listeners.delete(l)
    }
  }, [])
  if (mod) return mod
  if (failed) return 'off'
  return 'loading'
}
