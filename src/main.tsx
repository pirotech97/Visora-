import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initTheme } from './services/theme';

initTheme();

// Initialisation et suivi continu de la hauteur dynamique réelle (clavier virtuel inclus)
function setupDynamicViewport() {
  if (typeof window === 'undefined') return;

  const updateVvh = () => {
    const height = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    document.documentElement.style.setProperty('--vvh', `${height}px`);
  };

  updateVvh();
  window.visualViewport?.addEventListener('resize', updateVvh);
  window.visualViewport?.addEventListener('scroll', updateVvh);
  window.addEventListener('resize', updateVvh);
  window.addEventListener('orientationchange', () => {
    setTimeout(updateVvh, 100);
  });
}

setupDynamicViewport();

createRoot(document.getElementById('root')!).render(<App />);

// Enregistrement du Service Worker avec vérification de mise à jour
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        reg.update().catch(() => {});
      })
      .catch(() => {
        // Ignore in dev sandbox
      });
  });
}
