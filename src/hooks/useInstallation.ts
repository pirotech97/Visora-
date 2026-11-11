import { useState, useEffect, useCallback, useRef } from 'react';
import {
  installationStore,
  getDeviceInfo,
  getInstallationStorage
} from '../services/installationStore';
import { popupManager } from '../services/popupManager';

interface UseInstallationOptions {
  isAuthenticated?: boolean;
}

export function useInstallation(options: UseInstallationOptions = {}) {
  const { isAuthenticated = false } = options;

  const [device, setDevice] = useState(() => getDeviceInfo());
  const [isInstallable, setIsInstallable] = useState(() => installationStore.isInstallPossible());
  const [isInstalled, setIsInstalled] = useState(() => installationStore.getIsInstalled());
  const [isOpen, setIsOpen] = useState(() => installationStore.getIsOpen());
  const [isManualTrigger, setIsManualTrigger] = useState(() => installationStore.getIsManualTrigger());

  const autoCheckTriggeredRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronisation avec l'installationStore
  const syncWithStore = useCallback(() => {
    setDevice(getDeviceInfo());
    setIsInstallable(installationStore.isInstallPossible());
    setIsInstalled(installationStore.getIsInstalled());
    setIsOpen(installationStore.getIsOpen());
    setIsManualTrigger(installationStore.getIsManualTrigger());
  }, []);

  useEffect(() => {
    syncWithStore();
    const unsubscribe = installationStore.subscribe(syncWithStore);
    return () => {
      unsubscribe();
    };
  }, [syncWithStore]);

  // Logique de déclenchement automatique :
  // - Uniquement pour un utilisateur connecté
  // - Après 30 secondes passées dans l'app OU à la 2e visite (le premier des deux)
  // - Jamais si une création est en cours ou qu'un autre popup (ex. annonce admin) est ouvert
  useEffect(() => {
    if (!isAuthenticated || isInstalled) return;

    // Enregistre la visite pour la session en cours
    const visites = installationStore.registerSessionVisit();

    const attemptAutoOpen = () => {
      if (installationStore.getIsInstalled()) return;

      // Si l'installation n'est pas encore possible (ex: beforeinstallprompt pas encore reçu sur Chrome)
      if (!installationStore.isInstallPossible()) {
        return;
      }

      // Si une annonce ou un dialogue est en cours, attendre sa fermeture
      if (popupManager.isAnnonceActive() || popupManager.isAnotherPopupOpen()) {
        const unsubscribe = popupManager.subscribe(() => {
          if (!popupManager.isAnnonceActive() && !popupManager.isAnotherPopupOpen()) {
            unsubscribe();
            if (installationStore.canAutoPrompt()) {
              installationStore.openPopup(false);
            }
          }
        });
        return;
      }

      if (installationStore.canAutoPrompt()) {
        installationStore.openPopup(false);
      }
    };

    // Condition 1 : Déjà à la 2e visite (ou plus) -> déclenchement immédiat
    if (visites >= 2) {
      const waitASecondForPrompts = setTimeout(() => {
        attemptAutoOpen();
      }, 1000);
      return () => clearTimeout(waitASecondForPrompts);
    }

    // Condition 2 : Première visite -> déclenchement après 30 secondes passées dans l'app
    if (!autoCheckTriggeredRef.current) {
      timerRef.current = setTimeout(() => {
        autoCheckTriggeredRef.current = true;
        attemptAutoOpen();
      }, 30000);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isAuthenticated, isInstalled]);

  // Ré-évaluation automatique dès que l'événement beforeinstallprompt est reçu
  useEffect(() => {
    if (!isAuthenticated || isInstalled || isOpen) return;
    if (installationStore.isInstallPossible() && installationStore.canAutoPrompt()) {
      const stored = getInstallationStorage();
      if (stored.visites >= 2 || autoCheckTriggeredRef.current) {
        if (!popupManager.isAnnonceActive() && !popupManager.isAnotherPopupOpen()) {
          installationStore.openPopup(false);
        }
      }
    }
  }, [isInstallable, isAuthenticated, isInstalled, isOpen]);

  // Actions manuelles
  const openManually = useCallback(() => {
    installationStore.openPopup(true);
  }, []);

  const closeLater = useCallback(() => {
    installationStore.closePopup('later');
  }, []);

  const closeIOSGuide = useCallback(() => {
    // Sur iOS, fermer après consultation
    if (isManualTrigger) {
      installationStore.closePopup('manual_close');
    } else {
      installationStore.closePopup('later');
    }
  }, [isManualTrigger]);

  const promptInstall = useCallback(async () => {
    return await installationStore.promptInstall();
  }, []);

  return {
    isInstallable,
    isInstalled,
    isIOS: device.isIOS,
    isIOSSafari: device.isIOSSafari,
    isIOSOther: device.isIOSOther,
    isOpen,
    isManualTrigger,
    openManually,
    closeLater,
    closeIOSGuide,
    promptInstall
  };
}
