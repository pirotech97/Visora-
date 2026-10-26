import React, { useState, useEffect } from 'react';
import { AuthScreen } from './components/AuthScreen';
import { Chat } from './components/Chat';
import { ToolsScreen } from './components/ToolsScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { SidebarDrawer } from './components/SidebarDrawer';
import { OfflineBanner } from './components/OfflineBanner';
import { PWAUpdateBanner } from './components/PWAUpdateBanner';
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
  const [isCloudReady, setIsCloudReady] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>('chat');
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [sessionExpiredMsg, setSessionExpiredMsg] = useState<string | null>(null);
  const isVoluntarySignOut = React.useRef(false);

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

        // 1. Au chargement, restauration de la session avec getSession
        const sessionUser = await restoreSessionUser();
        if (sessionUser) {
          setUser(sessionUser);
          loadUserImages();
          const c = await fetchUserCredits(sessionUser.id);
          setCredits(c);
        }

        // 2. Maintien de la session à jour avec onAuthStateChange
        authSub = subscribeToAuthState((event, updatedUser) => {
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

      {user ? (
        <div className="flex-1 min-h-0 flex flex-col max-w-2xl mx-auto w-full bg-slate-50 dark:bg-slate-900 border-x border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
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

          {/* Menu latéral (Drawer) */}
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
      ) : (
        <AuthScreen
          onAuthSuccess={handleAuthSuccess}
          isCloudReady={isCloudReady}
          initialErrorMsg={sessionExpiredMsg}
        />
      )}
    </div>
  );
}
