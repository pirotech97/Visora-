import { popupManager } from './popupManager';

export interface InstallationStorage {
  visites: number;
  refus: number;
  dernierRefus: number | null;
  installee: boolean;
}

const STORAGE_KEY = 'vx_installation';
const SEPT_JOURS_MS = 7 * 24 * 60 * 60 * 1000;

// État mémoire de secours si localStorage est désactivé / inaccessible
let inMemoryStorage: InstallationStorage = {
  visites: 0,
  refus: 0,
  dernierRefus: null,
  installee: false
};

let memoryDismissedThisSession = false;

// Lecture sécurisée du localStorage
export function getInstallationStorage(): InstallationStorage {
  if (typeof window === 'undefined') {
    return inMemoryStorage;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return inMemoryStorage;
    const parsed = JSON.parse(raw);
    return {
      visites: typeof parsed.visites === 'number' ? parsed.visites : 0,
      refus: typeof parsed.refus === 'number' ? parsed.refus : 0,
      dernierRefus: typeof parsed.dernierRefus === 'number' ? parsed.dernierRefus : null,
      installee: Boolean(parsed.installee)
    };
  } catch {
    return inMemoryStorage;
  }
}

// Écriture sécurisée dans le localStorage
export function saveInstallationStorage(patch: Partial<InstallationStorage>): InstallationStorage {
  const current = getInstallationStorage();
  const updated: InstallationStorage = {
    ...current,
    ...patch
  };
  inMemoryStorage = updated;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignorer l'erreur de quota ou mode privé
    }
  }
  return updated;
}

// Détection de l'appareil et de l'environnement d'affichage
export function getDeviceInfo() {
  if (typeof window === 'undefined') {
    return {
      isStandalone: false,
      isIOS: false,
      isIOSSafari: false,
      isIOSOther: false
    };
  }

  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;

  const ua = (navigator.userAgent || '').toLowerCase();
  // iPhone, iPad, iPod ou iPadOS se déclarant Mac avec écran tactile
  const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  const isIOS = /iphone|ipad|ipod/.test(ua) || isIPadOS;

  // Sur iOS, les navigateurs tiers contiennent des chaînes comme crios (Chrome), fxios (Firefox), edgios (Edge), etc.
  const isIOSOther = isIOS && /crios|fxios|edgios|opt|opios|duckduckgo|brave/i.test(ua);
  const isIOSSafari = isIOS && !isIOSOther;

  return {
    isStandalone,
    isIOS,
    isIOSSafari,
    isIOSOther
  };
}

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

type Listener = () => void;

class InstallationStore {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private isInstalled = false;
  private isPopupOpen = false;
  private isManualTrigger = false;
  private listeners: Set<Listener> = new Set();
  private initialized = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  private init() {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    const device = getDeviceInfo();
    const stored = getInstallationStorage();

    if (device.isStandalone || stored.installee) {
      this.isInstalled = true;
    }

    // Écoute de l'événement beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      this.notify();
    });

    // Écoute de l'événement appinstalled
    window.addEventListener('appinstalled', () => {
      this.isInstalled = true;
      this.deferredPrompt = null;
      saveInstallationStorage({ installee: true });
      this.closePopup('installed');
      this.notify();
    });

    // Écoute des changements de mode d'affichage (si l'app passe en standalone)
    const mql = window.matchMedia('(display-mode: standalone)');
    mql.addEventListener?.('change', (e) => {
      if (e.matches) {
        this.isInstalled = true;
        saveInstallationStorage({ installee: true });
        this.closePopup('installed');
        this.notify();
      }
    });
  }

  public subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => {
      try {
        l();
      } catch {
        // Ignorer
      }
    });
  }

  public getDeferredPrompt(): BeforeInstallPromptEvent | null {
    return this.deferredPrompt;
  }

  public getIsInstalled(): boolean {
    const device = getDeviceInfo();
    const stored = getInstallationStorage();
    return this.isInstalled || device.isStandalone || stored.installee;
  }

  /**
   * Indique si l'installation est matériellement possible pour ce navigateur :
   * - Pas déjà installée
   * - ET (événement beforeinstallprompt prêt OU appareil iOS)
   */
  public isInstallPossible(): boolean {
    if (this.getIsInstalled()) return false;
    const device = getDeviceInfo();
    return Boolean(this.deferredPrompt || device.isIOS);
  }

  public getIsOpen(): boolean {
    return this.isPopupOpen;
  }

  public getIsManualTrigger(): boolean {
    return this.isManualTrigger;
  }

  /**
   * Incrémente le compteur de visites pour une session donnée
   */
  public registerSessionVisit(): number {
    if (typeof window === 'undefined') return 0;
    try {
      const alreadyCounted = window.sessionStorage.getItem('vx_installation_session_counted');
      const current = getInstallationStorage();
      if (!alreadyCounted) {
        window.sessionStorage.setItem('vx_installation_session_counted', 'true');
        const nextVisites = (current.visites || 0) + 1;
        saveInstallationStorage({ visites: nextVisites });
        return nextVisites;
      }
      return current.visites || 1;
    } catch {
      return inMemoryStorage.visites;
    }
  }

  /**
   * Vérifie si le popup automatique est autorisé à s'afficher selon les règles :
   * - Non installée
   * - Installation possible (beforeinstallprompt ou iOS)
   * - Pas plus de 3 refus
   * - Pas de refus récent (< 7 jours)
   * - Pas de session rejetée en mode mémoire
   * - Pas d'annonce en cours (priorité annonces admin)
   * - Pas de dialogue modal ou création en cours
   */
  public canAutoPrompt(): boolean {
    if (this.getIsInstalled()) return false;
    if (!this.isInstallPossible()) return false;
    if (memoryDismissedThisSession) return false;

    const stored = getInstallationStorage();
    if (stored.installee) return false;
    if (stored.refus >= 3) return false;

    if (stored.dernierRefus) {
      const tempsEcoule = Date.now() - stored.dernierRefus;
      if (tempsEcoule < SEPT_JOURS_MS) {
        return false;
      }
    }

    // Vérification de la file de popups (priorité absolue aux annonces admin)
    if (popupManager.isAnnonceActive()) return false;
    if (popupManager.isAnotherPopupOpen()) return false;

    return true;
  }

  /**
   * Ouvre le popup (déclenchement automatique ou manuel)
   */
  public openPopup(isManual = false) {
    if (this.getIsInstalled()) return;
    if (!isManual && !this.canAutoPrompt()) return;

    this.isManualTrigger = isManual;
    this.isPopupOpen = true;
    popupManager.setInstallationActive?.(true);
    this.notify();
  }

  /**
   * Ferme le popup et enregistre le refus si applicable
   */
  public closePopup(reason: 'later' | 'installed' | 'dismissed' | 'manual_close') {
    const wasOpen = this.isPopupOpen;
    this.isPopupOpen = false;
    popupManager.setInstallationActive?.(false);

    if (reason === 'later' || reason === 'dismissed') {
      memoryDismissedThisSession = true;
      const current = getInstallationStorage();
      saveInstallationStorage({
        refus: (current.refus || 0) + 1,
        dernierRefus: Date.now()
      });
    } else if (reason === 'installed') {
      saveInstallationStorage({
        installee: true
      });
      this.isInstalled = true;
      this.deferredPrompt = null;
    }

    if (wasOpen) {
      this.notify();
    }
  }

  /**
   * Déclenche l'installation native Chrome / Android / Edge
   */
  public async promptInstall(): Promise<'accepted' | 'dismissed' | 'unsupported'> {
    if (!this.deferredPrompt) {
      return 'unsupported';
    }

    const promptEvent = this.deferredPrompt;
    // Un événement ne sert qu'une fois : supprime-le immédiatement après utilisation
    this.deferredPrompt = null;
    this.notify();

    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice && choice.outcome === 'accepted') {
        this.closePopup('installed');
        return 'accepted';
      } else {
        this.closePopup('dismissed');
        return 'dismissed';
      }
    } catch {
      this.closePopup('dismissed');
      return 'dismissed';
    }
  }
}

export const installationStore = new InstallationStore();
