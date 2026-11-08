import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnnonceCarte } from './AnnonceCarte';
import { fetchAnnoncesAAfficher, marquerAnnonceVue } from '../services/annoncesService';
import { popupManager } from '../services/popupManager';
import type { Annonce, UserProfile } from '../types';

interface AnnoncePopupHostProps {
  user: UserProfile | null;
  isAppReady: boolean;
  onNavigate: (path: string) => void;
}

export const AnnoncePopupHost: React.FC<AnnoncePopupHostProps> = ({
  user,
  isAppReady,
  onNavigate
}) => {
  const [queue, setQueue] = useState<Annonce[]>([]);
  const [isAnotherModalOpen, setIsAnotherModalOpen] = useState(false);
  const dismissedInSessionRef = useRef<Set<string | number>>(new Set());
  const isFetchingRef = useRef(false);
  const lastHiddenTimeRef = useRef<number>(0);

  // Charge les annonces depuis la fonction SQL annonces_a_afficher
  const loadAnnonces = useCallback(async () => {
    if (!user || !isAppReady || isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const annonces = await fetchAnnoncesAAfficher();
      // Filtrer les annonces déjà rejetées ou vues durant cette session
      const fresh = annonces.filter((a) => !dismissedInSessionRef.current.has(a.id));
      if (fresh.length > 0) {
        setQueue((prev) => {
          // Fusionne sans doublons d'ID
          const existingIds = new Set(prev.map((p) => p.id));
          const toAdd = fresh.filter((f) => !existingIds.has(f.id));
          return [...prev, ...toAdd];
        });
      }
    } catch {
      // Échec silencieux
    } finally {
      isFetchingRef.current = false;
    }
  }, [user, isAppReady]);

  // Chargement initial quand l'utilisateur est connecté et l'application prête
  useEffect(() => {
    if (user && isAppReady) {
      loadAnnonces();
    } else {
      setQueue([]);
    }
  }, [user, isAppReady, loadAnnonces]);

  // Re-vérification lors du retour au premier plan après plus de 30 minutes
  useEffect(() => {
    if (!user || !isAppReady) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        lastHiddenTimeRef.current = Date.now();
      } else if (document.visibilityState === 'visible') {
        if (lastHiddenTimeRef.current > 0) {
          const elapsed = Date.now() - lastHiddenTimeRef.current;
          // Plus de 30 minutes d'absence (30 * 60 * 1000 = 1 800 000 ms)
          if (elapsed >= 30 * 60 * 1000) {
            loadAnnonces();
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, isAppReady, loadAnnonces]);

  // Surveillance des popups tiers dans le DOM pour faire patienter l'annonce
  useEffect(() => {
    const checkModals = () => {
      const isOpen = popupManager.isAnotherPopupOpen();
      setIsAnotherModalOpen(isOpen);
    };

    checkModals();

    const observer = new MutationObserver(() => {
      checkModals();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['role', 'class', 'style', 'aria-hidden']
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  // Déclare au popupManager si une annonce est en cours ou en attente
  useEffect(() => {
    popupManager.setAnnonceActive(queue.length > 0);
  }, [queue.length]);

  // L'annonce ne s'affiche que si aucun autre popup n'est actuellement ouvert
  const canShow = queue.length > 0 && !isAnotherModalOpen;
  const currentAnnonce = canShow ? queue[0] : null;

  // Clôture d'une annonce (bouton Fermer, J'ai compris, Échap)
  const handleFermer = async () => {
    if (!currentAnnonce || !user) return;
    const annonceId = currentAnnonce.id;

    // Enregistre en mémoire de session immédiatement pour ne jamais reboucler
    dismissedInSessionRef.current.add(annonceId);

    // Enregistre la vue côté serveur avant de passer à la suivante
    try {
      await marquerAnnonceVue(user.id, annonceId);
    } catch {
      // Ne bloque pas l'utilisateur si échec
    }

    // Ouvre la suivante en retirant la tête de file
    setQueue((prev) => prev.slice(1));
  };

  // Clic sur le bouton d'action
  const handleBouton = async (lien: string) => {
    if (!currentAnnonce || !user) return;
    const annonceId = currentAnnonce.id;

    dismissedInSessionRef.current.add(annonceId);

    // Enregistre la vue côté serveur avant d'exécuter l'action
    try {
      await marquerAnnonceVue(user.id, annonceId);
    } catch {
      // Ne bloque pas l'utilisateur
    }

    // Retire l'annonce de la file
    setQueue((prev) => prev.slice(1));

    // Exécution de l'action selon la destination
    const trimmedLien = lien.trim();
    if (trimmedLien.startsWith('/')) {
      onNavigate(trimmedLien);
    } else if (trimmedLien.startsWith('https://')) {
      window.open(trimmedLien, '_blank', 'noopener,noreferrer');
    }
  };

  if (!currentAnnonce) {
    return null;
  }

  return (
    <AnnonceCarte
      key={currentAnnonce.id}
      titre={currentAnnonce.titre}
      message={currentAnnonce.message}
      type={currentAnnonce.type}
      boutonLibelle={currentAnnonce.bouton_libelle}
      boutonLien={currentAnnonce.bouton_lien}
      onFermer={handleFermer}
      onBouton={handleBouton}
      apercu={false}
      inline={false}
    />
  );
};
