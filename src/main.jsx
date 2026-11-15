import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// If npm can't install Plus Jakarta Sans, swap these lines for the version 1 fonts
// (@fontsource/schibsted-grotesk and @fontsource/zilla-slab) and the two font names in index.css.
import '@fontsource/plus-jakarta-sans/400.css'
import '@fontsource/plus-jakarta-sans/500.css'
import '@fontsource/plus-jakarta-sans/600.css'
import '@fontsource/plus-jakarta-sans/700.css'
import '@fontsource/plus-jakarta-sans/800.css'
import './index.css'
import App from './App.jsx'
import { AppProvider } from './lib/store.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
)

// Lets the app open without internet after its first visit.
if ('serviceWorker' in navigator && import.meta.env.PROD && !window.Capacitor) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {})
  })
}
