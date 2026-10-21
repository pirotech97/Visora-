import React, { useState } from 'react';
import {
  ArrowLeft,
  Moon,
  Sun,
  Laptop,
  Shield,
  HelpCircle,
  LogOut,
  Download,
  Info,
  Menu,
  MessageCircle
} from 'lucide-react';
import type { UserProfile } from '../types';
import { getStoredTheme, setStoredTheme, type ThemeMode } from '../services/theme';
import { PWAInstallButton } from './PWAInstallButton';
import { openWhatsAppRecharge } from '../services/constants';

interface SettingsScreenProps {
  user: UserProfile;
  onGoBack: () => void;
  onOpenMenu?: () => void;
  onSignOut: () => void;
  onOpenHelp?: () => void;
  isCloudReady: boolean;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  user,
  onGoBack,
  onOpenMenu,
  onSignOut,
  onOpenHelp,
  isCloudReady
}) => {
  const [theme, setTheme] = useState<ThemeMode>(getStoredTheme());

  const handleThemeSelect = (mode: ThemeMode) => {
    setTheme(mode);
    setStoredTheme(mode);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-hidden">
      {/* Header */}
      <header className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between z-30 select-none">
        <div className="flex items-center gap-2">
          {onOpenMenu && (
            <button
              type="button"
              onClick={onOpenMenu}
              className="p-2 -ml-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              aria-label="Ouvrir le menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <button
            type="button"
            onClick={onGoBack}
            className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="Retour"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
              Paramètres
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Préférences et configuration de l'application
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        <div className="max-w-xl mx-auto space-y-5">
          {/* Section Thème */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-1">
              Apparence
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Choisis le thème d'affichage de Visora
            </p>

            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => handleThemeSelect('auto')}
                className={`p-3.5 rounded-2xl border text-center transition flex flex-col items-center gap-2 cursor-pointer ${
                  theme === 'auto'
                    ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold shadow-2xs'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                <Laptop className="w-5 h-5" />
                <span className="text-xs">Système</span>
              </button>

              <button
                type="button"
                onClick={() => handleThemeSelect('light')}
                className={`p-3.5 rounded-2xl border text-center transition flex flex-col items-center gap-2 cursor-pointer ${
                  theme === 'light'
                    ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold shadow-2xs'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                <Sun className="w-5 h-5 text-amber-500" />
                <span className="text-xs">Clair</span>
              </button>

              <button
                type="button"
                onClick={() => handleThemeSelect('dark')}
                className={`p-3.5 rounded-2xl border text-center transition flex flex-col items-center gap-2 cursor-pointer ${
                  theme === 'dark'
                    ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold shadow-2xs'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                <Moon className="w-5 h-5 text-indigo-400" />
                <span className="text-xs">Sombre</span>
              </button>
            </div>
          </div>

          {/* Section Compte & Sécurité */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-3.5">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Compte & Sécurité
            </h2>

            <div className="flex items-center justify-between text-xs py-1">
              <span className="text-slate-500 dark:text-slate-400">Identifiant</span>
              <span className="font-semibold text-slate-900 dark:text-white font-mono">
                {user.email}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs py-1 border-t border-slate-100 dark:border-slate-700/60">
              <span className="text-slate-500 dark:text-slate-400">Stockage</span>
              <span className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400">
                <Shield className="w-3.5 h-3.5" />
                {isCloudReady ? 'Cloud sécurisé Supabase' : 'Mode local'}
              </span>
            </div>
          </div>

          {/* Section Application & Support */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
              Application
            </h2>

            {onOpenHelp && (
              <button
                type="button"
                onClick={onOpenHelp}
                className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      Guide & questions fréquentes
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Comprendre le fonctionnement et les crédits
                    </div>
                  </div>
                </div>
              </button>
            )}

            <button
              type="button"
              onClick={() => openWhatsAppRecharge(user.email, 0)}
              className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    Assistance par WhatsApp
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Contacter notre équipe directement
                  </div>
                </div>
              </div>
            </button>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">Installer l'application</span>
              <PWAInstallButton />
            </div>
          </div>

          {/* Déconnexion */}
          <div className="pt-2">
            <button
              type="button"
              onClick={onSignOut}
              className="w-full py-3.5 px-4 rounded-2xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 font-semibold text-sm border border-red-200 dark:border-red-800/60 transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
            >
              <LogOut className="w-4 h-4" />
              <span>Se déconnecter</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};
