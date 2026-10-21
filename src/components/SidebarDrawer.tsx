import React, { useEffect } from 'react';
import {
  X,
  MessageSquare,
  Clock,
  User,
  Settings,
  LogOut,
  Coins,
  FileText,
  HelpCircle,
  ChevronRight,
  ShieldCheck,
  Image as ImageIcon
} from 'lucide-react';
import type { AppTab, UserProfile } from '../types';
import { RechargeButton } from './RechargeButton';

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  user: UserProfile;
  credits: number | null;
  onSignOut: () => void;
  onOpenHelp?: () => void;
  onOpenCreateImage?: () => void;
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  user,
  credits,
  onSignOut,
  onOpenHelp,
  onOpenCreateImage
}) => {
  // Fermeture avec la touche Échap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const displayName = [user.prenoms, user.nom].filter(Boolean).join(' ') || user.email.split('@')[0];

  const handleNavClick = (tab: AppTab) => {
    onSelectTab(tab);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop sombre */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-2xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Volet latéral glissant depuis la gauche */}
      <aside
        className="relative w-[300px] max-w-[85vw] bg-white dark:bg-slate-900 h-full flex flex-col shadow-2xl z-10 border-r border-slate-200/80 dark:border-slate-800 animate-in slide-in-from-left duration-250 ease-out select-none"
        style={{
          paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
          paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))'
        }}
        role="dialog"
        aria-label="Menu principal"
      >
        {/* En-tête du menu */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-base text-slate-900 dark:text-white leading-none">
                Visora
              </span>
              <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Conversion Word fidèle
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="Fermer le menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profil utilisateur résumé */}
        <div className="p-4 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-base shrink-0 shadow-2xs">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                {displayName}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {user.email}
              </p>
            </div>
          </div>

          {/* Solde de crédits et bouton recharger */}
          <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-200/50 dark:border-slate-700/60">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
              <Coins className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>{credits === null ? '…' : credits} crédit{credits !== null && credits > 1 ? 's' : ''}</span>
            </div>
            <RechargeButton email={user.email} credits={credits ?? 0} variant="header" />
          </div>
        </div>

        {/* Liste des liens de navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1.5">
          <button
            type="button"
            onClick={() => handleNavClick('chat')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-semibold transition cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 shadow-2xs'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
            }`}
          >
            <div className="flex items-center gap-3">
              <MessageSquare className="w-4 h-4" />
              <span>Discussion</span>
            </div>
            <ChevronRight className="w-4 h-4 opacity-40" />
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('history')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-semibold transition cursor-pointer ${
              activeTab === 'history'
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 shadow-2xs'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
            }`}
          >
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4" />
              <span>Mes documents</span>
            </div>
            <ChevronRight className="w-4 h-4 opacity-40" />
          </button>

          {onOpenCreateImage && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenCreateImage();
              }}
              className="w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <ImageIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Créer une image</span>
              </div>
              <ChevronRight className="w-4 h-4 opacity-40" />
            </button>
          )}

          <button
            type="button"
            onClick={() => handleNavClick('profile')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-semibold transition cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 shadow-2xs'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
            }`}
          >
            <div className="flex items-center gap-3">
              <User className="w-4 h-4" />
              <span>Mon Profil</span>
            </div>
            <ChevronRight className="w-4 h-4 opacity-40" />
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('settings')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-semibold transition cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 shadow-2xs'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
            }`}
          >
            <div className="flex items-center gap-3">
              <Settings className="w-4 h-4" />
              <span>Paramètres</span>
            </div>
            <ChevronRight className="w-4 h-4 opacity-40" />
          </button>

          <div className="pt-2 my-2 border-t border-slate-100 dark:border-slate-800" />

          {onOpenHelp && (
            <button
              type="button"
              onClick={() => {
                onOpenHelp();
                onClose();
              }}
              className="w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Aide & FAQ</span>
              </div>
              <ChevronRight className="w-4 h-4 opacity-40" />
            </button>
          )}
        </nav>

        {/* Pied du menu : déconnexion et version */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => {
              onClose();
              onSignOut();
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Se déconnecter</span>
          </button>

          <div className="mt-2 text-center text-[11px] text-slate-400 dark:text-slate-500">
            Visora · Version 1.0.0
          </div>
        </div>
      </aside>
    </div>
  );
};
