import React, { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { VisoraxMascot } from './VisoraxMascot';
import { isValidAnnonceLien } from '../services/annoncesService';
import type { AnnonceType } from '../types';

export interface AnnonceCarteProps {
  titre: string;
  message: string;
  type: AnnonceType;
  boutonLibelle?: string | null;
  boutonLien?: string | null;
  onFermer?: () => void;
  onBouton?: (lien: string) => void;
  apercu?: boolean; // défaut false : en aperçu, les boutons ne font rien
  inline?: boolean; // si true, n'affiche pas l'overlay plein écran (pour intégration dans une carte d'aperçu)
}

export const AnnonceCarte: React.FC<AnnonceCarteProps> = ({
  titre,
  message,
  type,
  boutonLibelle,
  boutonLien,
  onFermer,
  onBouton,
  apercu = false,
  inline = false
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const primaryButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Mascotte : "content" pour nouveauté et promo, "normal" pour info et important
  const mascotMood = type === 'nouveaute' || type === 'promo' ? 'content' : 'normal';

  // Vérification de validité du bouton d'action
  const isButtonValid = Boolean(
    boutonLibelle &&
    boutonLien &&
    isValidAnnonceLien(boutonLien)
  );

  const isImportant = type === 'important';

  // Détection de prefers-reduced-motion
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Gestion du focus initial, focus trap et restauration du focus
  useEffect(() => {
    if (inline) return;

    // Retient l'élément qui avait le focus avant l'ouverture
    previousFocusRef.current = document.activeElement as HTMLElement | null;

    // Place le focus dans la fenêtre dès l'ouverture
    const timer = setTimeout(() => {
      if (primaryButtonRef.current) {
        primaryButtonRef.current.focus();
      } else if (modalRef.current) {
        const firstFocusable = modalRef.current.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        firstFocusable?.focus();
      }
    }, 30);

    const handleKeyDown = (e: KeyboardEvent) => {
      // Échap ferme (sauf pour "important" et aperçu)
      if (e.key === 'Escape') {
        if (!isImportant && !apercu) {
          e.preventDefault();
          onFermer?.();
        }
        return;
      }

      // Piège de tabulation (focus trap)
      if (e.key === 'Tab' && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;

        const firstElement = focusables[0];
        const lastElement = focusables[focusables.length - 1];

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

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
      // Restauration du focus précédent lors de la fermeture
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
      }
    };
  }, [isImportant, apercu, inline]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isImportant && !apercu) {
      onFermer?.();
    }
  };

  const handleActionClick = () => {
    if (apercu) return;
    if (boutonLien) {
      onBouton?.(boutonLien);
    }
  };

  const handleCloseClick = () => {
    if (apercu) return;
    onFermer?.();
  };

  // Pastille de type au-dessus du titre (pas d'émoji)
  const renderBadge = () => {
    switch (type) {
      case 'info':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#DBEAFE] dark:bg-[#1E3A8A] text-[#0F172A] dark:text-[#F8FAFC]">
            Info
          </span>
        );
      case 'nouveaute':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#2563EB] dark:bg-[#3B82F6] text-white">
            Nouveauté
          </span>
        );
      case 'promo':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#FFB020] text-[#0F172A]">
            Promo
          </span>
        );
      case 'important':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FEE2E2] dark:bg-red-950/70 text-[#991B1B] dark:text-red-200">
            <AlertTriangle className="w-3.5 h-3.5 text-[#991B1B] dark:text-red-300 stroke-[2.5]" aria-hidden="true" />
            <span>Important</span>
          </span>
        );
      default:
        return null;
    }
  };

  // Carte principale
  const cardNode = (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal={!inline}
      aria-labelledby="annonce-titre"
      data-annonce-dialog="true"
      tabIndex={-1}
      className={`w-full max-w-[420px] rounded-[24px] bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xl p-5 sm:p-6 flex flex-col items-center text-center select-none outline-none max-h-[85dvh] ${
        inline
          ? ''
          : prefersReducedMotion
          ? ''
          : 'animate-in fade-in zoom-in-95 duration-150'
      }`}
      style={{
        width: 'min(420px, calc(100vw - 2rem))'
      }}
    >
      {/* 1. Mascotte Visorax en haut (taille 72) */}
      <div className="shrink-0 mb-3 flex items-center justify-center">
        <VisoraxMascot size={72} mood={mascotMood} decorative />
      </div>

      {/* 2. Pastille de type au-dessus du titre */}
      <div className="mb-2 shrink-0">{renderBadge()}</div>

      {/* 3. Titre en Sora 700, 22 px */}
      <h2
        id="annonce-titre"
        className="text-[22px] font-bold text-slate-900 dark:text-white leading-tight tracking-tight mb-3 font-['Sora',sans-serif] shrink-0 max-w-full break-words"
      >
        {titre}
      </h2>

      {/* 4. Message en texte simple : white-space: pre-line, JAMAIS de HTML (affiche texte brut y compris < >) */}
      <div className="w-full flex-1 min-h-0 overflow-y-auto mb-5 pr-1 text-center">
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line break-words select-text">
          {message}
        </p>
      </div>

      {/* 5. Boutons de 44 px de haut minimum */}
      <div className="w-full space-y-2 shrink-0 pt-1">
        {isImportant ? (
          // Pour "important" : UN SEUL bouton "J'ai compris"
          <button
            ref={primaryButtonRef}
            type="button"
            onClick={handleCloseClick}
            className="w-full min-h-[44px] h-[44px] px-5 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-sm flex items-center justify-center transition active:scale-[0.98] cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            J'ai compris
          </button>
        ) : isButtonValid ? (
          // Bouton principal d'action + Bouton secondaire "Fermer"
          <>
            <button
              ref={primaryButtonRef}
              type="button"
              onClick={handleActionClick}
              className={`w-full min-h-[44px] h-[44px] px-5 rounded-xl font-bold text-sm flex items-center justify-center transition active:scale-[0.98] cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 ${
                type === 'promo'
                  ? 'bg-[#FFB020] hover:bg-[#F59E0B] active:bg-[#D97706] text-[#0F172A] focus-visible:ring-amber-500'
                  : 'bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white focus-visible:ring-blue-500'
              }`}
            >
              {boutonLibelle}
            </button>
            <button
              type="button"
              onClick={handleCloseClick}
              className="w-full min-h-[44px] h-[44px] px-4 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              Fermer
            </button>
          </>
        ) : (
          // Pas de bouton d'action : bouton unique "Fermer"
          <button
            ref={primaryButtonRef}
            type="button"
            onClick={handleCloseClick}
            className="w-full min-h-[44px] h-[44px] px-5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:bg-slate-300 dark:active:bg-slate-600 text-slate-800 dark:text-slate-200 font-semibold text-sm flex items-center justify-center transition active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Fermer
          </button>
        )}
      </div>
    </div>
  );

  // Si inline (pour intégration dans une interface d'aperçu de l'administrateur)
  if (inline) {
    return cardNode;
  }

  // Modale plein écran avec backdrop
  return (
    <div
      onClick={handleBackdropClick}
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-2xs select-none ${
        prefersReducedMotion ? '' : 'transition-opacity duration-150 animate-in fade-in'
      }`}
      style={{
        paddingTop: 'max(1rem, env(safe-area-inset-top, 1rem))',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))',
        paddingLeft: 'max(1rem, env(safe-area-inset-left, 1rem))',
        paddingRight: 'max(1rem, env(safe-area-inset-right, 1rem))'
      }}
    >
      {cardNode}
    </div>
  );
};
