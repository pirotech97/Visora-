type Listener = () => void;

class PopupManager {
  private annonceActive = false;
  private installationActive = false;
  private listeners: Set<Listener> = new Set();

  /**
   * Vérifie si un autre dialogue/popup est actuellement ouvert dans le DOM.
   * Exclut le popup d'annonce lui-même (data-annonce-dialog) et le popup d'installation (data-install-dialog).
   */
  isAnotherPopupOpen(): boolean {
    if (typeof document === 'undefined') return false;
    const dialogs = document.querySelectorAll(
      '[role="dialog"]:not([data-annonce-dialog]):not([data-install-dialog]), [role="alertdialog"], [data-modal]:not([data-annonce-dialog]):not([data-install-dialog])'
    );
    return dialogs.length > 0;
  }

  isAnnonceActive(): boolean {
    return this.annonceActive;
  }

  setAnnonceActive(active: boolean) {
    if (this.annonceActive !== active) {
      this.annonceActive = active;
      this.notify();
    }
  }

  isInstallationActive(): boolean {
    return this.installationActive;
  }

  setInstallationActive(active: boolean) {
    if (this.installationActive !== active) {
      this.installationActive = active;
      this.notify();
    }
  }

  subscribe(listener: Listener) {
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
        // Ignorer les erreurs des écouteurs
      }
    });
  }
}

export const popupManager = new PopupManager();
