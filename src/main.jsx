import '@/instrument'
import * as Sentry from '@sentry/react'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { installGlobalFeedback } from '@/lib/feedback'
installGlobalFeedback()
import { PLATFORM, isStandalone } from '@/hooks/usePlatform'

// Plateforme et mode d'affichage, pour adapter les barres natives
const html = document.documentElement;
html.classList.add(`platform-${PLATFORM}`);
if (isStandalone()) html.classList.add('standalone');

// Empêche le zoom par pincement sur iOS (le double-tap est déjà bloqué par touch-action: manipulation)
document.addEventListener('gesturestart', (e) => e.preventDefault());

ReactDOM.createRoot(document.getElementById('root')).render(
  <Sentry.ErrorBoundary fallback={<p style={{ padding: 24, fontFamily: 'Nunito, sans-serif' }}>Une erreur est survenue. Recharge la page.</p>}>
    <App />
  </Sentry.ErrorBoundary>
)
