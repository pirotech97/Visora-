import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Clock,
  Layers,
  User,
  Settings,
  LogOut,
  Coins,
  FileText,
  ShieldCheck,
  Plus,
  Zap
} from 'lucide-react';
import type { AppTab, UserProfile } from '../types';
import { getSupabase } from '../services/supabase';
import { VisoraxLogo } from './VisoraxLogo';
import { PWAInstallButton } from './PWAInstallButton';

interface DesktopSidebarProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  user: UserProfile;
  credits: number | null;
  onSignOut: () => void;
  onOpenCreateImage?: () => void;
  onOpenRecharge: () => void;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  activeTab,
  onSelectTab,
  user,
  credits,
  onSignOut,
  onOpenCreateImage,
  onOpenRecharge
}) => {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function checkAdmin() {
      if (!user) return;
      const client = getSupabase();
      if (!client) return;
      try {
        const { data, error } = await client
          .from('administrateurs')
          .select('user_id')
          .maybeSingle();
        if (isMounted) {
          setIsAdmin(Boolean(!error && data?.user_id));
        }
      } catch {
        if (isMounted) setIsAdmin(false);
      }
    }
    checkAdmin();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const displayName = [user.prenoms, user.nom].filter(Boolean).join(' ') || user.email.split('@')[0];

  const navItems = [
    { tab: 'chat' as AppTab, label: 'Chat', icon: MessageSquare },
    { tab: 'tools' as AppTab, label: 'Outils', icon: Layers },
    { tab: 'history' as AppTab, label: 'Historique', icon: Clock },
    { tab: 'profile' as AppTab, label: 'Mon profil', icon: User },
    { tab: 'settings' as AppTab, label: 'Paramètres', icon: Settings },
    ...(isAdmin ? [{ tab: 'admin' as AppTab, label: 'Admin', icon: ShieldCheck }] : [])
  ];

  return (
    <aside
      className="hidden lg:flex flex-col w-60 shrink-0 border-r border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 h-full select-none z-20"
      aria-label="Navigation principale"
    >
      {/* 1. Header de marque */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
        <button
          type="button"
          onClick={() => onSelectTab('chat')}
          className="flex items-center gap-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-xl p-1 -m-1 cursor-pointer transition hover:opacity-90"
        >
          <VisoraxLogo variant="ligne" size={32} />
        </button>
      </div>

      {/* 2. Solde & Recharge */}
      <div className="p-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Solde
            </span>
            <div className="flex items-center gap-1 text-xs font-extrabold text-slate-900 dark:text-white">
              <Coins className="w-3.5 h-3.5 text-amber-500" />
              <span>{credits ?? 0} crédit{(credits ?? 0) > 1 ? 's' : ''}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenRecharge}
            className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Recharger</span>
          </button>
        </div>

        {onOpenCreateImage && (
          <button
            type="button"
            onClick={onOpenCreateImage}
            className="w-full mt-2.5 py-2 px-3 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80 text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Créer une image</span>
          </button>
        )}
      </div>

      {/* 3. Navigation principale */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.tab;
          return (
            <button
              key={item.tab}
              type="button"
              onClick={() => onSelectTab(item.tab)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-extrabold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.4]' : 'stroke-[2]'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}

        <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800">
          <PWAInstallButton variant="sidebar" />
        </div>
      </nav>

      {/* 4. Footer utilisateur */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 shrink-0 space-y-2">
        <div className="flex items-center gap-2.5 px-2 py-1 min-w-0">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-xs font-bold text-slate-900 dark:text-white truncate">
              {displayName}
            </span>
            <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {user.email}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onSignOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          <LogOut className="w-4 h-4" />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  );
};
