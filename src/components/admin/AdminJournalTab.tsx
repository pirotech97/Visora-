import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  AlertTriangle,
  Loader2,
  X,
  User,
  Filter
} from 'lucide-react';
import type { AdminJournalEntry, AdminUserSummary } from '../../types';
import { fetchAdminJournal, fetchAdminUsers } from '../../services/adminApi';

interface AdminJournalTabProps {
  onOpenUser: (userId: string) => void;
  initialUserId?: string | null;
  initialUserLabel?: string | null;
  onClearInitialUser?: () => void;
}

export const AdminJournalTab: React.FC<AdminJournalTabProps> = ({
  onOpenUser,
  initialUserId,
  initialUserLabel,
  onClearInitialUser
}) => {
  const [journal, setJournal] = useState<AdminJournalEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [availableActions, setAvailableActions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtres
  const [actionFilter, setActionFilter] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<{ id: string; label: string } | null>(
    initialUserId ? { id: initialUserId, label: initialUserLabel || initialUserId } : null
  );

  // Recherche d'utilisateurs pour le filtre Compte
  const [userSearchText, setUserSearchText] = useState('');
  const [userSuggestions, setUserSuggestions] = useState<AdminUserSummary[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Pagination (50 par page)
  const [decalage, setDecalage] = useState(0);
  const LIMITE = 50;

  // Synchronisation avec initialUserId venant de la fiche utilisateur
  useEffect(() => {
    if (initialUserId) {
      setSelectedUser({ id: initialUserId, label: initialUserLabel || initialUserId });
      setDecalage(0);
      onClearInitialUser?.();
    }
  }, [initialUserId, initialUserLabel, onClearInitialUser]);

  // Chargement du journal
  const loadJournalData = useCallback(
    async (offset = decalage, act = actionFilter, uid = selectedUser?.id || '') => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchAdminJournal(act, uid, LIMITE, offset);
        if (res.error) {
          setError(res.error);
        } else {
          setJournal(res.journal);
          setTotal(res.total);
          if (res.actions && res.actions.length > 0) {
            setAvailableActions((prev) => Array.from(new Set([...prev, ...res.actions])));
          }
        }
      } catch (err: any) {
        setError(err?.message || 'Impossible de charger le journal.');
      } finally {
        setLoading(false);
      }
    },
    [decalage, actionFilter, selectedUser?.id]
  );

  useEffect(() => {
    loadJournalData(decalage, actionFilter, selectedUser?.id || '');
  }, [decalage, actionFilter, selectedUser?.id, loadJournalData]);

  // Ferme la liste d'autocomplétion si clic en dehors
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Recherche utilisateur avec debounce
  const handleUserSearchChange = (text: string) => {
    setUserSearchText(text);
    if (!text.trim()) {
      setUserSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(async () => {
      setSearchingUsers(true);
      try {
        const res = await fetchAdminUsers(text.trim(), 8, 0);
        setUserSuggestions(res.utilisateurs || []);
        setShowSuggestions(true);
      } catch {
        setUserSuggestions([]);
      } finally {
        setSearchingUsers(false);
      }
    }, 250);
  };

  const handleSelectUser = (u: AdminUserSummary) => {
    const name = [u.prenoms, u.nom].filter(Boolean).join(' ');
    const label = name ? `${name} (${u.email})` : u.email;
    setSelectedUser({ id: u.id, label });
    setUserSearchText('');
    setShowSuggestions(false);
    setDecalage(0);
  };

  const handleClearUserFilter = () => {
    setSelectedUser(null);
    setUserSearchText('');
    setDecalage(0);
  };

  const handleClearAllFilters = () => {
    setActionFilter('');
    setSelectedUser(null);
    setUserSearchText('');
    setDecalage(0);
  };

  // Libellés & badges d'action
  const getActionBadge = (action: string) => {
    switch (action) {
      case 'ajout_credits':
        return {
          label: 'Crédits ajoutés',
          className:
            'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50'
        };
      case 'retrait_credits':
        return {
          label: 'Crédits retirés',
          className:
            'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50'
        };
      case 'blocage':
      case 'bloquage':
        return {
          label: 'Compte bloqué',
          className:
            'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/50'
        };
      case 'deblocage':
        return {
          label: 'Compte débloqué',
          className:
            'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50'
        };
      case 'annonce_creee':
        return {
          label: 'Annonce créée',
          className:
            'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50'
        };
      case 'annonce_modifiee':
        return {
          label: 'Annonce modifiée',
          className:
            'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50'
        };
      case 'annonce_activee':
        return {
          label: 'Annonce activée',
          className:
            'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50'
        };
      case 'annonce_desactivee':
        return {
          label: 'Annonce désactivée',
          className:
            'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50'
        };
      case 'annonce_supprimee':
        return {
          label: 'Annonce supprimée',
          className:
            'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/50'
        };
      default:
        return {
          label: action ? action.replace(/_/g, ' ') : 'Action',
          className:
            'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
        };
    }
  };

  // Formatage des dates en heure locale : jj/mm/aaaa hh:mm
  const formatJournalDate = (isoStr?: string | null): string => {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return '—';
      const pad = (n: number) => String(n).padStart(2, '0');
      const day = pad(d.getDate());
      const month = pad(d.getMonth() + 1);
      const year = d.getFullYear();
      const hours = pad(d.getHours());
      const minutes = pad(d.getMinutes());
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch {
      return '—';
    }
  };

  // Formatage des détails (texte lisible, jamais de JSON brut ni HTML)
  const formatJournalDetails = (item: AdminJournalEntry): string => {
    const details = item.details;
    const action = item.action || '';

    // Crédits ajoutés ou retirés
    if (action === 'ajout_credits' || action === 'retrait_credits') {
      let delta = item.delta;
      let solde = item.solde_apres;
      let note = item.note;

      if (details && typeof details === 'object') {
        if (typeof details.delta === 'number') delta = details.delta;
        if (typeof details.solde_apres === 'number') solde = details.solde_apres;
        else if (typeof details.solde === 'number') solde = details.solde;
        if (typeof details.note === 'string') note = details.note;
      }

      const deltaPart =
        delta !== undefined && delta !== null
          ? delta > 0
            ? `+${delta} crédits`
            : `${delta} crédits`.replace('-', '−')
          : '';
      const soldePart = solde !== undefined && solde !== null ? `, solde : ${solde}` : '';
      const notePart = note && String(note).trim() ? ` « ${String(note).trim()} »` : '';

      const text = `${deltaPart}${soldePart}${notePart}`.trim();
      return text || '—';
    }

    // Blocage / Déblocage
    if (action === 'blocage' || action === 'bloquage' || action === 'deblocage') {
      let note = item.note;
      if (details && typeof details === 'object') {
        note = details.note || details.raison || details.reason || note;
      }
      return note && String(note).trim() ? `« ${String(note).trim()} »` : '—';
    }

    // Annonces
    if (action.startsWith('annonce_')) {
      let titre = '';
      if (details && typeof details === 'object') {
        titre = details.titre || details.nom || details.title || '';
      } else if (typeof details === 'string') {
        titre = details;
      }
      return titre ? `« ${titre} »` : '—';
    }

    // Autres actions
    if (details && typeof details === 'object') {
      if (details.note) return `« ${details.note} »`;
      if (details.message) return String(details.message);
      if (details.raison) return `« ${details.raison} »`;
    }

    if (typeof details === 'string' && details.trim()) {
      return details.trim();
    }

    if (item.note) {
      return `« ${item.note} »`;
    }

    return '—';
  };

  // Export CSV avec protection contre injection de formules
  const handleExportCsv = () => {
    if (journal.length === 0) return;

    const headers = ['Date', 'Action', 'Administrateur', 'Compte concerné', 'Détails'];

    const escapeCsv = (val: any): string => {
      if (val === null || val === undefined) return '""';
      let str = String(val).trim();
      // Protection stricte contre l'injection de formules (=, +, -, @)
      if (/^[=+\-@]/.test(str)) {
        str = `'${str}`;
      }
      return `"${str.replace(/"/g, '""')}"`;
    };

    const rows = journal.map((item) => {
      const dateStr = formatJournalDate(item.created_at);
      const actionLabel = getActionBadge(item.action).label;
      const adminStr = item.admin_email || '—';

      let compteStr = '—';
      if (item.cible_nom || item.cible_email) {
        const parts = [item.cible_nom, item.cible_email].filter(Boolean);
        compteStr = parts.join(' - ');
        if (item.cible_supprimee) {
          compteStr += ' (compte supprimé)';
        }
      }

      const detailsStr = formatJournalDetails(item);

      return [dateStr, actionLabel, adminStr, compteStr, detailsStr].map(escapeCsv).join(';');
    });

    const csvContent = [headers.map(escapeCsv).join(';'), ...rows].join('\r\n');
    // UTF-8 avec BOM (\uFEFF)
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `journal-admin-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Texte de pagination : "51–100 sur 237"
  const startRow = total === 0 ? 0 : decalage + 1;
  const endRow = Math.min(decalage + LIMITE, total);
  const paginationText = `${startRow}–${endRow} sur ${total}`;
  const canPrev = decalage > 0;
  const canNext = decalage + LIMITE < total;

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* 1. En-tête : Titre + Boutons Actualiser et Exporter CSV */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
            Journal d'audit
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Historique complet des actions d'administration avec traçabilité des comptes
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={journal.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs transition active:scale-95 cursor-pointer disabled:opacity-40"
            title="Exporter la page actuelle en CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exporter en CSV</span>
          </button>

          <button
            type="button"
            onClick={() => loadJournalData(decalage, actionFilter, selectedUser?.id || '')}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold shadow-2xs transition active:scale-95 cursor-pointer disabled:opacity-50"
            title="Actualiser le journal"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>
        </div>
      </div>

      {/* 2. Filtres au-dessus */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 p-3 sm:p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          {/* Liste déroulante des actions */}
          <div className="w-full md:w-60 shrink-0">
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Action
            </label>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setDecalage(0);
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="">Toutes les actions</option>
              {availableActions.map((act) => (
                <option key={act} value={act}>
                  {getActionBadge(act).label}
                </option>
              ))}
              {!availableActions.includes('ajout_credits') && (
                <option value="ajout_credits">Crédits ajoutés</option>
              )}
              {!availableActions.includes('retrait_credits') && (
                <option value="retrait_credits">Crédits retirés</option>
              )}
              {!availableActions.includes('blocage') && (
                <option value="blocage">Compte bloqué</option>
              )}
              {!availableActions.includes('deblocage') && (
                <option value="deblocage">Compte débloqué</option>
              )}
              {!availableActions.includes('annonce_creee') && (
                <option value="annonce_creee">Annonce créée</option>
              )}
              {!availableActions.includes('annonce_modifiee') && (
                <option value="annonce_modifiee">Annonce modifiée</option>
              )}
              {!availableActions.includes('annonce_activee') && (
                <option value="annonce_activee">Annonce activée</option>
              )}
              {!availableActions.includes('annonce_desactivee') && (
                <option value="annonce_desactivee">Annonce désactivée</option>
              )}
              {!availableActions.includes('annonce_supprimee') && (
                <option value="annonce_supprimee">Annonce supprimée</option>
              )}
            </select>
          </div>

          {/* Filtre Compte concerné avec recherche */}
          <div ref={searchContainerRef} className="flex-1 relative">
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Compte
            </label>

            {selectedUser ? (
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-xs font-semibold text-blue-900 dark:text-blue-200">
                <div className="flex items-center gap-2 truncate">
                  <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="truncate">{selectedUser.label}</span>
                </div>
                <button
                  type="button"
                  onClick={handleClearUserFilter}
                  className="p-1 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-300 cursor-pointer ml-1"
                  title="Retirer ce filtre"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={userSearchText}
                  onChange={(e) => handleUserSearchChange(e.target.value)}
                  onFocus={() => {
                    if (userSuggestions.length > 0) setShowSuggestions(true);
                  }}
                  placeholder="Filtrer par compte (nom ou e-mail)…"
                  className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
                {searchingUsers && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                )}

                {/* Suggestions déroulantes */}
                {showSuggestions && userSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-30 max-h-56 overflow-y-auto">
                    {userSuggestions.map((u) => {
                      const name = [u.prenoms, u.nom].filter(Boolean).join(' ');
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => handleSelectUser(u)}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800/60 last:border-0 cursor-pointer"
                        >
                          <div className="font-semibold text-slate-900 dark:text-white truncate">
                            {name || u.email}
                          </div>
                          {name && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              {u.email}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bouton Effacer les filtres */}
          {(actionFilter || selectedUser || userSearchText) && (
            <div className="self-end pb-0.5">
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Effacer les filtres</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3. Message d'erreur */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => loadJournalData(decalage, actionFilter, selectedUser?.id || '')}
            className="px-2.5 py-1 rounded-lg bg-red-100 dark:bg-red-900/50 hover:bg-red-200 font-semibold cursor-pointer text-xs shrink-0"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* 4. Tableau (sur ordinateur >= 768 px) */}
      <div className="hidden md:block bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 shadow-2xs overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold">
              <th className="py-3 px-3.5 whitespace-nowrap w-36">Date</th>
              <th className="py-3 px-3.5 whitespace-nowrap w-40">Action</th>
              <th className="py-3 px-3.5 whitespace-nowrap w-44">Administrateur</th>
              <th className="py-3 px-3.5 whitespace-nowrap w-52">Compte concerné</th>
              <th className="py-3 px-3.5">Détails</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading && journal.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                  Chargement du journal…
                </td>
              </tr>
            ) : journal.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400">
                  Aucune action pour ces filtres
                </td>
              </tr>
            ) : (
              journal.map((item) => {
                const badge = getActionBadge(item.action);
                const hasCible = Boolean(item.cible_user_id || item.cible_email || item.cible_nom);
                return (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-3 px-3.5 text-slate-500 dark:text-slate-400 whitespace-nowrap font-mono text-[11px]">
                      {formatJournalDate(item.created_at)}
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-slate-600 dark:text-slate-300 truncate max-w-[160px]">
                      {item.admin_email || '—'}
                    </td>
                    <td className="py-3 px-3.5">
                      {hasCible ? (
                        item.cible_supprimee ? (
                          <div>
                            <div className="font-semibold text-slate-700 dark:text-slate-300">
                              {item.cible_nom || 'Compte sans nom'}
                            </div>
                            <div className="text-[11px] text-slate-400 italic">compte supprimé</div>
                          </div>
                        ) : item.cible_user_id ? (
                          <button
                            type="button"
                            onClick={() => onOpenUser(item.cible_user_id!)}
                            className="text-left group cursor-pointer"
                            title="Ouvrir la fiche de cet utilisateur"
                          >
                            <div className="font-semibold text-blue-600 dark:text-blue-400 group-hover:underline truncate max-w-[180px]">
                              {item.cible_nom || item.cible_email || 'Utilisateur'}
                            </div>
                            {item.cible_nom && item.cible_email && (
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[180px]">
                                {item.cible_email}
                              </div>
                            )}
                          </button>
                        ) : (
                          <div>
                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                              {item.cible_nom || item.cible_email}
                            </div>
                            {item.cible_nom && item.cible_email && (
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                {item.cible_email}
                              </div>
                            )}
                          </div>
                        )
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-slate-700 dark:text-slate-300 font-medium">
                      {formatJournalDetails(item)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 5. Vue mobile (< 768 px) : une carte par ligne, aucun défilement horizontal */}
      <div className="md:hidden space-y-2.5">
        {loading && journal.length === 0 ? (
          <div className="py-10 text-center text-slate-400 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
            Chargement du journal…
          </div>
        ) : journal.length === 0 ? (
          <div className="py-10 text-center text-slate-400 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
            Aucune action pour ces filtres
          </div>
        ) : (
          journal.map((item) => {
            const badge = getActionBadge(item.action);
            const hasCible = Boolean(item.cible_user_id || item.cible_email || item.cible_nom);
            return (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 p-3.5 shadow-2xs space-y-2 text-xs"
              >
                {/* En-tête de carte : Date + Badge action */}
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                    {formatJournalDate(item.created_at)}
                  </span>
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                </div>

                {/* Compte concerné */}
                {hasCible && (
                  <div className="pt-1 border-t border-slate-100 dark:border-slate-800 flex items-start gap-1.5">
                    <span className="text-slate-500 dark:text-slate-400 shrink-0">Compte :</span>
                    {item.cible_supprimee ? (
                      <span className="italic text-slate-400">
                        {item.cible_nom || 'Compte'} (compte supprimé)
                      </span>
                    ) : item.cible_user_id ? (
                      <button
                        type="button"
                        onClick={() => onOpenUser(item.cible_user_id!)}
                        className="text-left font-semibold text-blue-600 dark:text-blue-400 underline cursor-pointer truncate"
                      >
                        {item.cible_nom ? `${item.cible_nom} (${item.cible_email})` : item.cible_email}
                      </button>
                    ) : (
                      <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                        {item.cible_nom ? `${item.cible_nom} (${item.cible_email})` : item.cible_email}
                      </span>
                    )}
                  </div>
                )}

                {/* Administrateur */}
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
                  <span>Par :</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {item.admin_email || '—'}
                  </span>
                </div>

                {/* Détails */}
                <div className="pt-1 border-t border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-medium">
                  {formatJournalDetails(item)}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 6. Pagination : 50 par page */}
      <div className="flex items-center justify-between pt-2 px-1">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          {paginationText}
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDecalage((prev) => Math.max(0, prev - LIMITE))}
            disabled={!canPrev || loading}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs transition active:scale-95 cursor-pointer disabled:opacity-40"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Précédent</span>
          </button>

          <button
            type="button"
            onClick={() => setDecalage((prev) => prev + LIMITE)}
            disabled={!canNext || loading}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs transition active:scale-95 cursor-pointer disabled:opacity-40"
          >
            <span>Suivant</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
