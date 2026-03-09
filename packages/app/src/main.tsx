// MUST be first import: sets window.GUN before any gun/sea import in the app runs.
// gun/sea.js checks window.GUN at module evaluation time — if missing, SEA.pair() fails silently.
import './lib/gun-init'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
