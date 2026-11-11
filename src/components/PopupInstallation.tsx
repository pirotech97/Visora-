import React, { useEffect, useRef, useState } from 'react';
import {
  Download,
  Share2,
  PlusSquare,
  Check,
  Zap,
  Maximize2,
  Gauge,
  X,
  Compass
} from 'lucide-react';
import { VisoraxMascot } from './VisoraxMascot';
import { useInstallation } from '../hooks/useInstallation';

interface PopupInstallationProps {
  isAuthenticated?: boolean;
}

export const PopupInstallation: React.FC<PopupInstallationProps> = ({
  isAuthenticated = false
}) => {
  const {
    isInstallable,
    isInstalled,
    isIOS,
    isIOSSafari,
    isIOSOther,
    isOpen,
    closeLater,
    closeIOSGuide,
    promptInstall
  } = useInstallation({ isAuthenticated });

  const [installing, setInstalling] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const primaryButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  // Mémorise le focus précédent à l'ouverture et le restitue à la fermeture
  useEffect(() => {
    if (isOpen) {
      previousActiveElementRef.current = document.activeElement as HTMLElement | null;

      // Déplace le focus sur le bouton principal après un court instant
      const timer = setTimeout(() => {
        if (primaryButtonRef.current) {
          primaryButtonRef.current.focus();
        } else if (modalRef.current) {
          modalRef.current.focus();
        }
      }, 50);

      return () => {
        clearTimeout(timer);
        if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === 'function') {
          try {
            previousActiveElementRef.current.focus();
          } catch {
            // Ignorer
          }
        }
      };
    }
  }, [isOpen]);

  // Gestion du piège de focus (Tab / Shift+Tab) et de la touche Échap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (isIOS) {
          closeIOSGuide();
        } else {
          closeLater();
        }
        return;
      }

      if (e.key === 'Tab') {
        if (!modalRef.current) return;
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isIOS, closeLater, closeIOSGuide]);

  if (!isOpen || isInstalled || !isInstallable) {
    return null;
  }

  const handleInstallClick = async () => {
    setInstalling(true);
    try {
      await promptInstall();
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center bg-black/60 backdrop-blur-2xs p-0 md:p-4 animate-in fade-in duration-200"
      onClick={isIOS ? closeIOSGuide : closeLater}
      aria-hidden="false"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-install-title"
        data-install-dialog="true"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full md:max-w-[420px] bg-white dark:bg-slate-900 rounded-t-[24px] md:rounded-3xl shadow-2xl border-t md:border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 flex flex-col max-h-[90vh] overflow-y-auto overscroll-contain transition-all duration-300 motion-reduce:transition-none focus:outline-hidden"
      >
        {/* Poignée décorative sur téléphone */}
        <div
          className="md:hidden w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-3 shrink-0"
          aria-hidden="true"
        />

        {/* Bouton de fermeture en haut à droite (mobile et desktop) */}
        <div className="flex justify-end -mt-1 -mr-1 mb-1">
          <button
            type="button"
            onClick={isIOS ? closeIOSGuide : closeLater}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* En-tête : Mascotte & Titre */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-2.5 filter drop-shadow-md">
            <VisoraxMascot mood="content" size={72} animated={true} />
          </div>

          <h2
            id="pwa-install-title"
            className="text-[22px] font-bold text-slate-900 dark:text-white leading-tight font-['Sora']"
          >
            Installe Visorax Studio
          </h2>

          <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-sm">
            Ouvre l'app en un clic depuis ton écran d'accueil, en plein écran et plus rapidement.
          </p>
        </div>

        {/* Contenu selon la plateforme */}
        {isIOSSafari ? (
          /* Mode d'emploi iOS Safari en 3 étapes illustrées */
          <div className="my-5 space-y-3">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-800 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                <Share2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  1. Appuie sur le bouton Partager
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Dans la barre Safari au bas de ton écran (le carré avec une flèche vers le haut).
                </div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-800 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                <PlusSquare className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  2. Fais défiler et choisis « Sur l'écran d'accueil »
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Dans le menu d'actions de partage de ton iPhone / iPad.
                </div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-800 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                <Check className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  3. Appuie sur « Ajouter »
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  En haut à droite de l'écran pour finaliser l'installation.
                </div>
              </div>
            </div>
          </div>
        ) : isIOSOther ? (
          /* iOS dans un autre navigateur que Safari (Chrome, Edge, etc.) */
          <div className="my-5 p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/50 border border-blue-200/80 dark:border-blue-900/60 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Compass className="w-5 h-5" />
            </div>
            <div className="text-xs text-blue-950 dark:text-blue-200 leading-relaxed">
              <p className="font-bold text-sm text-blue-900 dark:text-blue-100 mb-1">
                Installation sur iOS
              </p>
              Ouvre cette page dans <strong>Safari</strong> pour installer l'app sur ton écran d'accueil.
            </div>
          </div>
        ) : (
          /* Chrome, Android, Edge, Samsung Internet, Desktop */
          <div className="my-4 space-y-2.5">
            {/* Avantage 1 : Accès direct */}
            <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-2xs">
                <Zap className="w-4 h-4 fill-current" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  Accès direct
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  En un clic depuis ton écran d'accueil
                </div>
              </div>
            </div>

            {/* Avantage 2 : Plein écran */}
            <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 shadow-2xs">
                <Maximize2 className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  Plein écran
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Sans la barre d'adresse du navigateur
                </div>
              </div>
            </div>

            {/* Avantage 3 : Plus rapide */}
            <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs">
                <Gauge className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  Plus rapide
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Chargement immédiat et navigation fluide
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Boutons d'action */}
        <div className="mt-2 flex flex-col gap-2 shrink-0">
          {isIOS ? (
            /* Sur iOS : un seul bouton « J'ai compris » */
            <button
              ref={primaryButtonRef}
              type="button"
              onClick={closeIOSGuide}
              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xs transition active:scale-98 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <span>J'ai compris</span>
            </button>
          ) : (
            /* Sur Android / Chrome / Edge : bouton « Installer » et « Plus tard » */
            <>
              <button
                ref={primaryButtonRef}
                type="button"
                onClick={handleInstallClick}
                disabled={installing}
                className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xs transition active:scale-98 cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <Download className="w-4 h-4" />
                <span>{installing ? 'Installation…' : 'Installer'}</span>
              </button>

              <button
                type="button"
                onClick={closeLater}
                className="w-full min-h-[44px] py-2 px-4 rounded-xl text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition active:scale-98 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                <span>Plus tard</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
