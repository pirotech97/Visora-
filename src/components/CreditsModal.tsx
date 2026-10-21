import React, { useState, useEffect } from 'react';
import { X, Coins, ArrowUpRight, ArrowDownLeft, Loader2, MessageCircle, Sun, Moon, Laptop } from 'lucide-react';
import type { CreditTransaction, UserProfile } from '../types';
import { fetchCreditTransactions } from '../services/supabase';
import { TEXTE_TARIF } from '../services/constants';
import { RechargeButton } from './RechargeButton';
import { getStoredTheme, setStoredTheme, type ThemeMode } from '../services/theme';

interface CreditsModalProps {
  user: UserProfile;
  credits: number | null;
  isOpen: boolean;
  onClose: () => void;
  onRefreshCredits?: () => void;
}

function formatFrenchDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const day = d.getDate();
    const months = [
      'janv.',
      'févr.',
      'mars',
      'avr.',
      'mai',
      'juin',
      'juil.',
      'août',
      'sept.',
      'oct.',
      'nov.',
      'déc.'
    ];
    const month = months[d.getMonth()] || '';
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${year}, ${hours}:${minutes}`;
  } catch {
    return dateStr;
  }
}

function getMotifLabel(motif: string): string {
  switch (motif) {
    case 'bonus_inscription':
      return 'Bonus de bienvenue';
    case 'extraction':
      return 'Conversion';
    case 'remboursement':
      return 'Remboursement';
    case 'achat_manuel':
      return 'Recharge';
    default:
      return motif || 'Transaction';
  }
}

export const CreditsModal: React.FC<CreditsModalProps> = ({
  user,
  credits,
  isOpen,
  onClose,
  onRefreshCredits
}) => {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [themeMode, setThemeMode] = useState<ThemeMode>(getStoredTheme());

  useEffect(() => {
    if (isOpen) {
      setThemeMode(getStoredTheme());
    }
  }, [isOpen]);

  const handleThemeChange = (newTheme: ThemeMode) => {
    setThemeMode(newTheme);
    setStoredTheme(newTheme);
  };

  const loadTransactions = () => {
    setLoading(true);
    fetchCreditTransactions(user.id)
      .then((data) => setTransactions(data))
      .catch((err) => console.warn('Failed to load transactions:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isOpen) {
      loadTransactions();
      onRefreshCredits?.();
    }
  }, [isOpen, user.id]);

  // Après le retour de l'utilisateur sur l'app (événement de retour au premier plan),
  // relire le solde et recharger l'historique
  useEffect(() => {
    if (!isOpen) return;

    const handleForeground = () => {
      if (document.visibilityState === 'visible') {
        onRefreshCredits?.();
        loadTransactions();
      }
    };

    document.addEventListener('visibilitychange', handleForeground);
    window.addEventListener('focus', handleForeground);

    return () => {
      document.removeEventListener('visibilitychange', handleForeground);
      window.removeEventListener('focus', handleForeground);
    };
  }, [isOpen, user.id, onRefreshCredits]);

  if (!isOpen) return null;

  const currentCredits = credits ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-2xs p-3 sm:p-4 animate-in fade-in select-none">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 shadow-2xs">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                Historique des crédits
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Solde actuel :{' '}
                <span className="font-bold text-slate-800">
                  {credits === null ? '…' : currentCredits}
                </span>{' '}
                crédit{currentCredits > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* En haut du panneau : instructions de recharge, TEXTE_TARIF, bouton Recharger */}
        <div className="p-4 bg-emerald-50/70 border-b border-emerald-100/90 shrink-0 space-y-3">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
              <MessageCircle className="w-4 h-4" />
            </div>
            <p className="text-xs text-emerald-950 font-medium leading-relaxed">
              Pour recharger, écris-nous sur WhatsApp, paie par Mobile Money, et tes crédits sont ajoutés dès confirmation du paiement.
            </p>
          </div>

          {Boolean(TEXTE_TARIF && (TEXTE_TARIF as string).trim() !== '') && (
            <div className="p-2.5 rounded-xl bg-white/95 border border-emerald-200/60 text-xs text-slate-700 font-medium whitespace-pre-wrap leading-relaxed shadow-2xs">
              {(TEXTE_TARIF as string).trim()}
            </div>
          )}

          <RechargeButton email={user.email} credits={currentCredits} variant="primary" />
        </div>

        {/* Current Balance Banner */}
        <div className="mx-4 mt-3 p-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between shadow-xs shrink-0">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-100">
              Solde disponible
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-extrabold tracking-tight">
                {credits === null ? '…' : currentCredits}
              </span>
              <span className="text-xs text-blue-100 font-medium">
                page{currentCredits > 1 ? 's' : ''} extractible{currentCredits > 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <span className="text-xs bg-white/20 px-2.5 py-1 rounded-lg text-white font-medium">
            1 crédit = 1 page
          </span>
        </div>

        {/* Transactions List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <div className="flex items-center justify-between pb-1 px-1">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              20 dernières opérations
            </span>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-7 h-7 animate-spin text-blue-600 mb-2" />
              <p className="text-xs font-semibold text-slate-600">Chargement de l'historique…</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Coins className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
              <p className="text-xs font-medium text-slate-500">Aucune transaction pour le moment.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {transactions.map((tx, idx) => {
                const isPositive = tx.delta > 0;
                const isNegative = tx.delta < 0;

                return (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-slate-50/70 border border-slate-200/60 flex items-center justify-between gap-3 hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          isPositive
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {isPositive ? (
                          <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                        ) : (
                          <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {getMotifLabel(tx.motif)}
                        </p>
                        <span className="text-[11px] text-slate-400">
                          {formatFrenchDate(tx.created_at)}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-sm font-extrabold ${
                          isPositive
                            ? 'text-emerald-600'
                            : isNegative
                            ? 'text-red-600'
                            : 'text-slate-600'
                        }`}
                      >
                        {isPositive ? `+${tx.delta}` : `${tx.delta}`}
                      </span>
                      <span className="block text-[10px] text-slate-400 font-medium">
                        crédit{Math.abs(tx.delta) > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Interrupteur de Thème : Automatique / Clair / Sombre */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between text-xs shrink-0 select-none">
          <div className="flex items-center gap-2">
            {themeMode === 'dark' ? (
              <Moon className="w-4 h-4 text-blue-500" />
            ) : themeMode === 'light' ? (
              <Sun className="w-4 h-4 text-amber-500" />
            ) : (
              <Laptop className="w-4 h-4 text-slate-500" />
            )}
            <span className="font-semibold text-slate-700">Thème :</span>
          </div>

          <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-200/60 border border-slate-200/80">
            <button
              type="button"
              onClick={() => handleThemeChange('auto')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                themeMode === 'auto'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Automatique
            </button>
            <button
              type="button"
              onClick={() => handleThemeChange('light')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                themeMode === 'light'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Clair
            </button>
            <button
              type="button"
              onClick={() => handleThemeChange('dark')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                themeMode === 'dark'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sombre
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
