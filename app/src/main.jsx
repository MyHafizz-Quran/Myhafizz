import '@/instrument'
import * as Sentry from '@sentry/react'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { installGlobalFeedback } from '@/lib/feedback'
import { startArabicFit } from '@/lib/arabicFit'
installGlobalFeedback()
startArabicFit()
import { PLATFORM, isStandalone } from '@/hooks/usePlatform'

// Plateforme et mode d'affichage, pour adapter les barres natives
const html = document.documentElement;
html.classList.add(`platform-${PLATFORM}`);
if (isStandalone()) html.classList.add('standalone');

// Empêche le zoom par pincement sur iOS (le double-tap est déjà bloqué par touch-action: manipulation)
document.addEventListener('gesturestart', (e) => e.preventDefault());

// Plantage d'écran : l'erreur est déjà partie sur Sentry ; on recharge une fois en silence, sinon retour à l'accueil.
function CrashReload() {
  let n = 0; try { n = Number(sessionStorage.getItem('mh_crash') || 0) } catch { /* ignore */ }
  React.useEffect(() => {
    try { sessionStorage.setItem('mh_crash', String(n + 1)) } catch { /* ignore */ }
    if (n === 0) location.reload()
    else if (n === 1) location.replace('/Dashboard')
  }, [])
  if (n < 2) return <div style={{ minHeight: '100dvh' }} />
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <button onClick={() => { try { sessionStorage.removeItem('mh_crash') } catch { /* ignore */ } location.replace('/Dashboard') }}
        style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 16, color: '#fff', background: '#00A3A8', border: 0, borderRadius: 16, padding: '14px 22px', boxShadow: '0 4px 0 #007C80' }}>
        Revenir à l'accueil
      </button>
    </div>
  )
}
// L'app tourne normalement depuis 10 s : on remet le compteur de rechargements à zéro
setTimeout(() => { try { sessionStorage.removeItem('mh_crash') } catch { /* ignore */ } }, 10000)

ReactDOM.createRoot(document.getElementById('root')).render(
  <Sentry.ErrorBoundary fallback={<CrashReload />}>
    <App />
  </Sentry.ErrorBoundary>
)
