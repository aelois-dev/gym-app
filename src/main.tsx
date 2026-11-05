import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const FigureSheet = import.meta.env.DEV ? lazy(() => import('./dev/FigureSheet').then((m) => ({ default: m.FigureSheet }))) : null
const showSheet = FigureSheet && new URLSearchParams(location.search).has('figures')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {showSheet ? (
      <Suspense>
        <FigureSheet />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
)

// Fetch the 3D figure renderer once the first screen is up.
setTimeout(() => void import('./figure3d/load').then((m) => m.preload3d()), 300)
