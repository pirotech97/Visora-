import React, { useState, useEffect } from 'react';
import { AuthScreen } from './components/AuthScreen';
import { Chat } from './components/Chat';
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
  fetchUserCredits
} from './services/supabase';
import type { UserProfile, AppTab } from './types';

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
          const c = await fetchUserCredits(sessionUser.id);
          setCredits(c);
        }

        // 2. Maintien de la session à jour avec onAuthStateChange
        authSub = subscribeToAuthState((event, updatedUser) => {
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            if (updatedUser) {
              setUser(updatedUser);
              setSessionExpiredMsg(null);
              fetchUserCredits(updatedUser.id).then((c) => setCredits(c));
            }
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
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

  const handleAuthSuccess = (authenticatedUser: UserProfile) => {
    setSessionExpiredMsg(null);
    setUser(authenticatedUser);
    setActiveTab('chat');
    fetchUserCredits(authenticatedUser.id).then((c) => setCredits(c));
  };

  const handleSignOut = () => {
    isVoluntarySignOut.current = true;
    setSessionExpiredMsg(null);
    setUser(null);
    setActiveTab('chat');
    setIsMenuOpen(false);
  };

  const [createImageTrigger, setCreateImageTrigger] = useState(0);

  const handleOpenCreateImage = () => {
    setActiveTab('chat');
    setIsMenuOpen(false);
    setCreateImageTrigger((prev) => prev + 1);
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
