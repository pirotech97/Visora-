import React, { useState, useEffect } from 'react';
import { LandingPage } from './components/LandingPage';
import { AuthScreen } from './components/AuthScreen';
import { ResetPasswordScreen } from './components/ResetPasswordScreen';
import { Chat } from './components/Chat';
const ToolsScreen = React.lazy(() =>
  import('./components/ToolsScreen').then((m) => ({ default: m.ToolsScreen }))
);
const HistoryScreen = React.lazy(() =>
  import('./components/HistoryScreen').then((m) => ({ default: m.HistoryScreen }))
);
import { ProfileScreen } from './components/ProfileScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { AdminScreen } from './components/AdminScreen';
import { SidebarDrawer } from './components/SidebarDrawer';
import { DesktopSidebar } from './components/DesktopSidebar';
import { OfflineBanner } from './components/OfflineBanner';
import { PWAUpdateBanner } from './components/PWAUpdateBanner';
import { AnnoncePopupHost } from './components/AnnoncePopupHost';
import { PopupInstallation } from './components/PopupInstallation';
import { RechargeModal } from './components/RechargeModal';
import { PaymentReturnModal } from './components/PaymentReturnModal';
import { EVENT_OPEN_RECHARGE, verifierPaiement } from './services/paiementService';
import { AlertTriangle, X, Loader2, CheckCircle2 } from 'lucide-react';
import { fetchServerConfig } from './services/api';
import {
  initSupabase,
  restoreSessionUser,
  subscribeToAuthState,
  fetchUserCredits,
  fetchUserImages,
  fetchSingleImageRecord
} from './services/supabase';
import type { UserProfile, AppTab, ImageHistoryRecord, GeneratedImagePayload } from './types';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauthView, setUnauthView] = useState<'landing' | 'signin' | 'signup'>('landing');
  const [isResetPassword, setIsResetPassword] = useState(() => {
    return typeof window !== 'undefined' && window.location.pathname.startsWith('/reinitialiser-mot-de-passe');
  });
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);
  const [authInitialMode, setAuthInitialMode] = useState<'signin' | 'signup' | 'forgot-password'>('signin');
  const [isCloudReady, setIsCloudReady] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>(() => {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
      return 'admin';
    }
    return 'chat';
  });
  const [accessDeniedNotice, setAccessDeniedNotice] = useState<string | null>(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [sessionExpiredMsg, setSessionExpiredMsg] = useState<string | null>(null);
  const isVoluntarySignOut = React.useRef(false);

  // Gestion de la recharge et du retour de paiement SasPay
  const [isRechargeOpen, setIsRechargeOpen] = useState(false);
  const [safetyNetToast, setSafetyNetToast] = useState<string | null>(null);
  const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const pid = searchParams.get('paiement');
      if (pid) {
        // Nettoyer l'URL immédiatement sans recharger la page
        searchParams.delete('paiement');
        const newSearch = searchParams.toString();
        const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '') + window.location.hash;
        window.history.replaceState(null, '', newUrl || '/');
        sessionStorage.setItem('visorax_pending_paiement_id', pid);
        return pid;
      }
      return sessionStorage.getItem('visorax_pending_paiement_id');
    } catch {
      return null;
    }
  });

  // Si retour de paiement sans être connecté, inviter à se connecter pour reprendre la vérification
  useEffect(() => {
    if (!loading && !user && pendingPaymentId) {
      setUnauthView('signin');
      setAuthInitialMode('signin');
      setSessionExpiredMsg('Connecte-toi pour finaliser la vérification de ton paiement.');
    }
  }, [loading, user, pendingPaymentId]);

  // Écoute de l'événement global d'ouverture de la recharge
  useEffect(() => {
    const handleOpen = () => setIsRechargeOpen(true);
    window.addEventListener(EVENT_OPEN_RECHARGE, handleOpen);
    return () => window.removeEventListener(EVENT_OPEN_RECHARGE, handleOpen);
  }, []);

  // Filet de sécurité au chargement de l'app (une fois par session)
  useEffect(() => {
    if (!user) return;
    const sessionKey = `visorax_safety_net_${user.id}`;
    try {
      if (sessionStorage.getItem(sessionKey)) return;
      sessionStorage.setItem(sessionKey, '1');
    } catch {}

    verifierPaiement()
      .then((res) => {
        if (res.ok && res.credites && res.credites > 0) {
          setSafetyNetToast(`+${res.credites} crédits ajoutés suite à ton paiement`);
          if (typeof res.solde === 'number') {
            setCredits(res.solde);
          } else {
            fetchUserCredits(user.id).then((c) => setCredits(c));
          }
        }
      })
      .catch(() => {
        // Silencieux si rien en attente ou erreur
      });
  }, [user]);

  // Fermeture automatique du toast du filet de sécurité après 7 secondes
  useEffect(() => {
    if (safetyNetToast) {
      const timer = setTimeout(() => {
        setSafetyNetToast(null);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [safetyNetToast]);

  // Synchronisation de l'URL avec l'onglet actif (/admin <-> /)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.pathname.startsWith('/reinitialiser-mot-de-passe')) return;
    if (activeTab === 'admin') {
      if (window.location.pathname !== '/admin') {
        window.history.pushState(null, '', '/admin');
      }
    } else {
      if (window.location.pathname === '/admin') {
        window.history.pushState(null, '', '/');
      }
    }
  }, [activeTab]);

  // Écoute de l'historique du navigateur (boutons Précédent / Suivant)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.startsWith('/reinitialiser-mot-de-passe')) {
        setIsResetPassword(true);
      } else {
        setIsResetPassword(false);
        if (path.startsWith('/admin')) {
          setActiveTab('admin');
        } else if (activeTab === 'admin') {
          setActiveTab('chat');
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeTab]);

  // Fermeture automatique du message d'accès refusé après 6 secondes
  useEffect(() => {
    if (accessDeniedNotice) {
      const timer = setTimeout(() => {
        setAccessDeniedNotice(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [accessDeniedNotice]);

  const handleAdminAccessDenied = (message?: string) => {
    setAccessDeniedNotice(message || 'Accès refusé');
    setActiveTab('chat');
    if (typeof window !== 'undefined' && window.location.pathname === '/admin') {
      window.history.replaceState(null, '', '/');
    }
  };

  // Images state (source de vérité : table "images", adresses fraîches)
  const [images, setImages] = useState<ImageHistoryRecord[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [imagesError, setImagesError] = useState<string | null>(null);

  const loadUserImages = async () => {
    setLoadingImages(true);
    setImagesError(null);
    try {
      const res = await fetchUserImages();
      if (res.error) {
        setImagesError('Impossible de charger tes images. Réessaie.');
      } else {
        setImages(res.data);
      }
    } catch {
      setImagesError('Impossible de charger tes images. Réessaie.');
    } finally {
      setLoadingImages(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const updateViewport = () => {
      if (window.visualViewport) {
        setViewportHeight(window.visualViewport.height);
      }
    };
    window.visualViewport.addEventListener('resize', updateViewport);
    window.visualViewport.addEventListener('scroll', updateViewport);
    updateViewport();
    return () => {
      window.visualViewport?.removeEventListener('resize', updateViewport);
      window.visualViewport?.removeEventListener('scroll', updateViewport);
    };
  }, []);

  useEffect(() => {
    let authSub: { unsubscribe: () => void } | null = null;

    async function initialize() {
      try {
        const config = await fetchServerConfig();
        const ready = initSupabase(config.supabaseUrl, config.supabaseAnonKey);
        setIsCloudReady(ready);

        const isOnResetPage = typeof window !== 'undefined' && window.location.pathname.startsWith('/reinitialiser-mot-de-passe');
        if (!isOnResetPage) {
          // 1. Au chargement, restauration de la session avec getSession
          const sessionUser = await restoreSessionUser();
          if (sessionUser) {
            setUser(sessionUser);
            loadUserImages();
            const c = await fetchUserCredits(sessionUser.id);
            setCredits(c);
          }
        }

        // 2. Maintien de la session à jour avec onAuthStateChange
        authSub = subscribeToAuthState((event, updatedUser) => {
          if (typeof window !== 'undefined' && window.location.pathname.startsWith('/reinitialiser-mot-de-passe')) {
            return;
          }
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            if (updatedUser) {
              setUser(updatedUser);
              setSessionExpiredMsg(null);
              loadUserImages();
              fetchUserCredits(updatedUser.id).then((c) => setCredits(c));
            }
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
            setImages([]);
            if (!isVoluntarySignOut.current) {
              setSessionExpiredMsg('Ta session a expiré, reconnecte-toi.');
              setUnauthView('signin');
            } else {
              setUnauthView('landing');
            }
            isVoluntarySignOut.current = false;
            setActiveTab('chat');
          }
        });
      } catch (err) {
        console.warn('Initialization error:', err);
      } finally {
        setLoading(false);
      }
    }

    initialize();

    return () => {
      authSub?.unsubscribe();
    };
  }, []);

  // 2. À l'ouverture de l'onglet Historique : lire la table images
  useEffect(() => {
    if (activeTab === 'history' && user) {
      loadUserImages();
    }
  }, [activeTab, user]);

  const handleAuthSuccess = (authenticatedUser: UserProfile) => {
    setSessionExpiredMsg(null);
    setUser(authenticatedUser);
    setActiveTab('chat');
    setUnauthView('landing');
    loadUserImages();
    fetchUserCredits(authenticatedUser.id).then((c) => setCredits(c));
  };

  const handleSignOut = () => {
    isVoluntarySignOut.current = true;
    setSessionExpiredMsg(null);
    setUser(null);
    setImages([]);
    setActiveTab('chat');
    setIsMenuOpen(false);
    setUnauthView('landing');
  };

  const [createImageTrigger, setCreateImageTrigger] = useState(0);

  const handleOpenCreateImage = () => {
    setActiveTab('chat');
    setIsMenuOpen(false);
    setCreateImageTrigger((prev) => prev + 1);
  };

  // 5. Juste après une génération réussie, ajoute l'image à la liste sans attendre le rechargement
  const handleImageCreated = async (payload: GeneratedImagePayload) => {
    if (payload.image_id) {
      const fresh = await fetchSingleImageRecord(payload.image_id);
      if (fresh) {
        setImages((prev) => [fresh, ...prev.filter((img) => img.id !== fresh.id)]);
        return;
      }
    }

    const tempRecord: ImageHistoryRecord = {
      id: payload.image_id || 'img_' + Date.now(),
      mode: payload.mode,
      prompt: payload.prompt,
      modele: payload.qualite || (payload.resolution === '2K' ? 'premium' : 'standard'),
      chemin: `outputs/${payload.image_id || 'image'}.png`,
      created_at: payload.created_at || new Date().toISOString(),
      statut: 'termine',
      signedUrl: payload.url
    };
    setImages((prev) => [tempRecord, ...prev.filter((img) => img.id !== tempRecord.id)]);
  };

  const handleUpdateFreshUrl = (id: string, freshUrl: string) => {
    setImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, signedUrl: freshUrl } : img))
    );
  };

  const handleDocumentConverted = () => {
    // Incrémente la clé pour rafraîchir l'historique sans rechargement de page
    setHistoryRefreshKey((prev) => prev + 1);
  };

  const handleNavigate = (path: string) => {
    const clean = path.toLowerCase().split('?')[0].split('#')[0];
    if (clean === '/admin') {
      setActiveTab('admin');
    } else if (clean === '/tools' || clean === '/outils') {
      setActiveTab('tools');
    } else if (clean === '/history' || clean === '/historique') {
      setActiveTab('history');
    } else if (clean === '/profile' || clean === '/profil') {
      setActiveTab('profile');
    } else if (clean === '/settings' || clean === '/parametres') {
      setActiveTab('settings');
    } else if (clean === '/' || clean === '/chat') {
      setActiveTab('chat');
    } else {
      window.history.pushState(null, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  if (loading) {
    return (
      <div className="h-[100dvh] max-h-[100dvh] w-full bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Chargement de Visorax Studio…</p>
      </div>
    );
  }

  return (
    <div
      className="h-[100dvh] max-h-[100dvh] w-full bg-slate-100 dark:bg-slate-950 flex flex-col overflow-hidden"
      style={{
        height: viewportHeight ? `${viewportHeight}px` : '100dvh',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)'
      }}
    >
      <OfflineBanner />
      <PWAUpdateBanner />

      {/* Annonces administratives en popup (une seule à la fois, une fois par utilisateur) */}
      {user && !isResetPassword && !loading && (
        <AnnoncePopupHost
          user={user}
          isAppReady={!loading && !isResetPassword}
          onNavigate={handleNavigate}
        />
      )}

      {/* Popup d'installation de l'application (PWA) */}
      {user && !isResetPassword && !loading && (
        <PopupInstallation isAuthenticated={true} />
      )}

      {isResetPassword ? (
        <div className="flex-1 min-h-0 w-full h-full overflow-y-auto overscroll-contain">
          <ResetPasswordScreen
            onGoToSignIn={(successMsg, initialMode) => {
              setIsResetPassword(false);
              if (typeof window !== 'undefined') {
                window.history.replaceState(null, '', '/');
              }
              setUnauthView('signin');
              setAuthInitialMode(initialMode || 'signin');
              if (successMsg) {
                setResetSuccessMsg(successMsg);
              }
            }}
          />
        </div>
      ) : user ? (
        <div className="flex-1 min-h-0 w-full flex justify-center bg-slate-100/60 dark:bg-slate-950/80 overflow-hidden">
          <div className="w-full max-w-screen-xl h-full flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-900 lg:border-x border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            {/* Barre latérale desktop fixe (240px) sur lg et plus */}
            <DesktopSidebar
              activeTab={activeTab}
              onSelectTab={(tab) => setActiveTab(tab)}
              user={user}
              credits={credits}
              onSignOut={handleSignOut}
              onOpenCreateImage={handleOpenCreateImage}
              onOpenRecharge={() => setIsRechargeOpen(true)}
            />

            {/* Contenu principal occupant la place restante à droite */}
            <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden relative">
              {accessDeniedNotice && (
                <div className="mx-3 mt-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/70 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs flex items-center justify-between gap-2 shadow-xs shrink-0 z-30 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
                    <span className="font-semibold">{accessDeniedNotice}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAccessDeniedNotice(null)}
                    className="p-1 rounded-md hover:bg-red-100 dark:hover:bg-red-900/50 cursor-pointer"
                    aria-label="Fermer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {activeTab === 'chat' && (
                <Chat
                  user={user}
                  onSignOut={handleSignOut}
                  isCloudReady={isCloudReady}
                  onDocumentConverted={handleDocumentConverted}
                  onGoToHistory={() => setActiveTab('history')}
                  activeTab="chat"
                  onTabChange={(tab) => setActiveTab(tab)}
                  onOpenMenu={() => setIsMenuOpen(true)}
                  onCreditsChange={(c) => setCredits(c)}
                  createImageTrigger={createImageTrigger}
                  onImageCreated={handleImageCreated}
                  onOpenRecharge={() => setIsRechargeOpen(true)}
                />
              )}

              <React.Suspense
                fallback={
                  <div className="flex-1 flex items-center justify-center p-8">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                  </div>
                }
              >
                {activeTab === 'tools' && (
                  <ToolsScreen
                    user={user}
                    credits={credits}
                    onGoToChat={() => setActiveTab('chat')}
                    onGoToHistory={() => setActiveTab('history')}
                    onOpenMenu={() => setIsMenuOpen(true)}
                    onTabChange={(tab) => setActiveTab(tab)}
                    onOpenCreateImage={handleOpenCreateImage}
                    onOpenRecharge={() => setIsRechargeOpen(true)}
                    onCreditsChange={(c) => setCredits(c)}
                  />
                )}

                {activeTab === 'history' && (
                  <HistoryScreen
                    user={user}
                    refreshTrigger={historyRefreshKey}
                    onGoToChat={() => setActiveTab('chat')}
                    activeTab="history"
                    onTabChange={(tab) => setActiveTab(tab)}
                    onOpenMenu={() => setIsMenuOpen(true)}
                    onOpenCreateImage={handleOpenCreateImage}
                    images={images}
                    loadingImages={loadingImages}
                    imagesError={imagesError}
                    onReloadImages={loadUserImages}
                    onUpdateFreshUrl={handleUpdateFreshUrl}
                  />
                )}
              </React.Suspense>

              {activeTab === 'profile' && (
                <ProfileScreen
                  user={user}
                  onUpdateUser={setUser}
                  onGoBack={() => setActiveTab('chat')}
                  onOpenMenu={() => setIsMenuOpen(true)}
                  credits={credits}
                />
              )}

              {activeTab === 'settings' && (
                <SettingsScreen
                  user={user}
                  onGoBack={() => setActiveTab('chat')}
                  onOpenMenu={() => setIsMenuOpen(true)}
                  onSignOut={handleSignOut}
                  isCloudReady={isCloudReady}
                />
              )}

              {activeTab === 'admin' && (
                <AdminScreen
                  currentUser={user}
                  onGoHome={handleAdminAccessDenied}
                  onOpenMenu={() => setIsMenuOpen(true)}
                />
              )}
            </div>

            {/* Menu latéral (Drawer) pour mobile/tablette */}
            <SidebarDrawer
              isOpen={isMenuOpen}
              onClose={() => setIsMenuOpen(false)}
              activeTab={activeTab}
              onSelectTab={(tab) => setActiveTab(tab)}
              user={user}
              credits={credits}
              onSignOut={handleSignOut}
              onOpenCreateImage={handleOpenCreateImage}
            />
          </div>
        </div>
      ) : unauthView === 'landing' ? (
        <div className="flex-1 min-h-0 w-full h-full overflow-y-auto overscroll-contain bg-[#0B1220]">
          <LandingPage
            onOpenSignIn={() => {
              setAuthInitialMode('signin');
              setResetSuccessMsg(null);
              setUnauthView('signin');
            }}
            onOpenSignUp={() => {
              setAuthInitialMode('signup');
              setResetSuccessMsg(null);
              setUnauthView('signup');
            }}
          />
        </div>
      ) : (
        <div className="flex-1 min-h-0 w-full h-full overflow-y-auto overscroll-contain">
          <AuthScreen
            onAuthSuccess={handleAuthSuccess}
            isCloudReady={isCloudReady}
            initialErrorMsg={sessionExpiredMsg}
            initialSuccessMsg={resetSuccessMsg}
            initialIsSignUp={unauthView === 'signup' || authInitialMode === 'signup'}
            initialMode={authInitialMode}
            onGoBackToLanding={() => {
              setResetSuccessMsg(null);
              setUnauthView('landing');
            }}
          />
        </div>
      )}

      {/* Toast discret du filet de sécurité (+X crédits) */}
      {safetyNetToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] px-4 py-3 rounded-2xl bg-emerald-600 text-white shadow-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4 duration-300 select-none"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs sm:text-sm font-bold font-['Sora',sans-serif] truncate">
              {safetyNetToast}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSafetyNetToast(null)}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer shrink-0 min-h-[32px] min-w-[32px] flex items-center justify-center"
            aria-label="Fermer le message"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modale d'achat de crédits SasPay Mobile Money */}
      {user && isRechargeOpen && (
        <RechargeModal
          isOpen={isRechargeOpen}
          onClose={() => setIsRechargeOpen(false)}
          userId={user.id}
          currentCredits={credits}
          onCreditsUpdated={(newBalance) => {
            setCredits(newBalance);
          }}
        />
      )}

      {/* Modale de vérification du retour de paiement (?paiement=<uuid>) */}
      {user && pendingPaymentId && (
        <PaymentReturnModal
          commandeId={pendingPaymentId}
          onClose={() => setPendingPaymentId(null)}
          onPaymentSuccess={(newBalance) => {
            setCredits(newBalance);
            setPendingPaymentId(null);
          }}
          onRetryRecharge={() => {
            setPendingPaymentId(null);
            setIsRechargeOpen(true);
          }}
        />
      )}
    </div>
  );
}
