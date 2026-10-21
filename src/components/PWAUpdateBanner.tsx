import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

export const PWAUpdateBanner: React.FC = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const refreshing = false;
    // Retient s'il y avait déjà un service worker actif au chargement
    const hadExistingController = Boolean(navigator.serviceWorker.controller);

    // 1. Écoute les messages émis par le service worker lors de l'activation
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SW_UPDATED') {
        if (hadExistingController) {
          setUpdateAvailable(true);
        }
      }
    };
    navigator.serviceWorker.addEventListener('message', handleMessage);

    // 2. Écoute le changement de contrôleur actif
    const handleControllerChange = () => {
      if (hadExistingController && !refreshing) {
        setUpdateAvailable(true);
      }
    };
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    // 3. Surveille l'enregistrement pour les nouvelles versions
    navigator.serviceWorker.ready
      .then((registration) => {
        // Si un worker est déjà en attente
        if (registration.waiting && hadExistingController) {
          setUpdateAvailable(true);
        }

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (
              (newWorker.state === 'installed' || newWorker.state === 'activated') &&
              navigator.serviceWorker.controller &&
              hadExistingController
            ) {
              setUpdateAvailable(true);
            }
          });
        });

        // Vérification de mise à jour au focus et périodiquement
        const checkForUpdate = () => {
          registration.update().catch(() => {});
        };

        const intervalId = setInterval(checkForUpdate, 60 * 1000);
        window.addEventListener('focus', checkForUpdate);

        return () => {
          clearInterval(intervalId);
          window.removeEventListener('focus', checkForUpdate);
        };
      })
      .catch(() => {});

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  const handleReload = () => {
    window.location.reload();
  };

  if (!updateAvailable) return null;

  return (
    <div
      role="alert"
      className="fixed top-3 left-1/2 -translate-x-1/2 z-50 max-w-[92vw] sm:max-w-md w-auto"
      style={{ top: 'max(0.75rem, env(safe-area-inset-top, 0.75rem))' }}
    >
      <button
        type="button"
        onClick={handleReload}
        className="flex items-center gap-2.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-full shadow-lg shadow-blue-600/30 border border-blue-400/40 text-xs sm:text-sm font-semibold transition cursor-pointer select-none"
        title="Cliquer pour recharger et appliquer la mise à jour"
      >
        <RefreshCw className="w-4 h-4 shrink-0" />
        <span className="whitespace-nowrap">Nouvelle version disponible – Recharger</span>
      </button>
    </div>
  );
};
