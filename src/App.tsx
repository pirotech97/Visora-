import React, { useState, useEffect } from 'react';
import { LandingPage } from './components/LandingPage';
import { AuthScreen } from './components/AuthScreen';
import { ResetPasswordScreen } from './components/ResetPasswordScreen';
import { Chat } from './components/Chat';
import { ToolsScreen } from './components/ToolsScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { AdminScreen } from './components/AdminScreen';
import { SidebarDrawer } from './components/SidebarDrawer';
import { DesktopSidebar } from './components/DesktopSidebar';
import { OfflineBanner } from './components/OfflineBanner';
import { PWAUpdateBanner } from './components/PWAUpdateBanner';
import { AlertTriangle, X } from 'lucide-react';
import { fetchServerConfig } from './services/api';
import { openWhatsAppRecharge } from './services/constants';
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

  if (loading) {
    return (
      <div className="h-[100dvh] max-h-[100dvh] w-full bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Chargement de Visora…</p>
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
              onOpenRecharge={() => openWhatsAppRecharge(user.email, credits ?? 0)}
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
                />
              )}

              {activeTab === 'tools' && (
                <ToolsScreen
                  user={user}
                  credits={credits}
                  onGoToChat={() => setActiveTab('chat')}
                  onGoToHistory={() => setActiveTab('history')}
                  onOpenMenu={() => setIsMenuOpen(true)}
                  onTabChange={(tab) => setActiveTab(tab)}
                  onOpenCreateImage={handleOpenCreateImage}
                  onOpenRecharge={() => openWhatsAppRecharge(user.email, credits ?? 0)}
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
        <div className="flex-1 min-h-0 w-full h-full overflow-y-auto overscroll-contain">
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
    </div>
  );
}
