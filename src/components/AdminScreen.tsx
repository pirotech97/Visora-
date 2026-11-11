import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  LayoutDashboard,
  Users,
  ScrollText,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Menu,
  Coins,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Unlock,
  PlusCircle,
  MinusCircle,
  ExternalLink,
  Clock,
  Film,
  Music,
  Mic,
  FileText,
  X,
  Loader2,
  Megaphone
} from 'lucide-react';
import type {
  UserProfile,
  AdminDashboardStats,
  AdminUserSummary,
  AdminUserDetail,
  AdminCreditTransaction,
  AdminUserCreation
} from '../types';
import {
  checkIsAdmin,
  fetchAdminStats,
  fetchAdminUsers,
  fetchAdminUserDetail,
  adjustUserCredits,
  blockUser,
  unblockUser
} from '../services/adminApi';
import { AdminJournalTab } from './admin/AdminJournalTab';
import { AdminAnnoncesTab } from './admin/AdminAnnoncesTab';

interface AdminScreenProps {
  currentUser: UserProfile;
  onGoHome: (errorNotice?: string) => void;
  onOpenMenu: () => void;
}

type AdminTab = 'stats' | 'users' | 'journal' | 'annonces';

export const AdminScreen: React.FC<AdminScreenProps> = ({
  currentUser,
  onGoHome,
  onOpenMenu
}) => {
  // 1. Accès & vérification initiale : ne rien afficher avant confirmation par la fonction
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [activeTab, setActiveTab] = useState<AdminTab>('stats');
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Filtre pré-sélectionné pour le journal depuis la fiche utilisateur
  const [journalPreselectedUserId, setJournalPreselectedUserId] = useState<string | null>(null);
  const [journalPreselectedUserLabel, setJournalPreselectedUserLabel] = useState<string | null>(null);

  // État Onglet 1 : Tableau de bord (stats)
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // État Onglet 2 : Utilisateurs
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fiche détaillée d'un utilisateur (Modal)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userDetail, setUserDetail] = useState<AdminUserDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailSuccess, setDetailSuccess] = useState<string | null>(null);

  // Formulaire Ajustement crédits
  const [deltaInput, setDeltaInput] = useState<string>('');
  const [noteInput, setNoteInput] = useState<string>('');
  const [confirmAdjustOpen, setConfirmAdjustOpen] = useState(false);
  const [submittingAdjust, setSubmittingAdjust] = useState(false);

  // Modal Blocage / Déblocage
  const [blockModalType, setBlockModalType] = useState<'block' | 'unblock' | null>(null);
  const [blockReason, setBlockReason] = useState<string>('');
  const [submittingBlock, setSubmittingBlock] = useState(false);

  const PAGE_SIZE = 25;

  // ----------------------------------------------------
  // VÉRIFICATION D'ACCÈS À L'OUVERTURE
  // ----------------------------------------------------
  useEffect(() => {
    let isMounted = true;

    async function verifyAdmin() {
      setCheckingAccess(true);
      try {
        const res = await checkIsAdmin();
        if (!isMounted) return;

        if (!res.admin) {
          onGoHome(res.error || 'Accès refusé');
          return;
        }

        setCheckingAccess(false);
        // Charge les stats par défaut
        loadStats();
      } catch (err: any) {
        if (!isMounted) return;
        onGoHome('Accès refusé');
      }
    }

    verifyAdmin();

    return () => {
      isMounted = false;
    };
  }, []);

  // ----------------------------------------------------
  // GESTION ERREUR 403
  // ----------------------------------------------------
  const handlePotential403 = (status?: number, errMessage?: string) => {
    if (status === 403) {
      onGoHome(errMessage || 'Accès refusé');
      return true;
    }
    return false;
  };

  // ----------------------------------------------------
  // ONGLET 1 : STATS
  // ----------------------------------------------------
  const loadStats = async () => {
    setLoadingStats(true);
    setGlobalError(null);
    try {
      const res = await fetchAdminStats();
      if (handlePotential403(res.status, res.error)) return;
      if (res.error) {
        setGlobalError(res.error);
      } else if (res.data) {
        setStats(res.data);
      }
    } catch (err: any) {
      setGlobalError(err?.message || 'Erreur lors du chargement des statistiques.');
    } finally {
      setLoadingStats(false);
    }
  };

  // ----------------------------------------------------
  // ONGLET 2 : UTILISATEURS
  // ----------------------------------------------------
  const loadUsers = async (query: string, page: number) => {
    setLoadingUsers(true);
    setGlobalError(null);
    try {
      const res = await fetchAdminUsers(query, PAGE_SIZE, page * PAGE_SIZE);
      if (handlePotential403(res.status, res.error)) return;
      if (res.error) {
        setGlobalError(res.error);
      } else {
        setUsers(res.utilisateurs || []);
        setTotalUsers(res.total || 0);
      }
    } catch (err: any) {
      setGlobalError(err?.message || 'Erreur lors du chargement des utilisateurs.');
    } finally {
      setLoadingUsers(false);
    }
  };

  // Changement de la recherche avec debounce 400 ms
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(0);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      loadUsers(val, 0);
    }, 400);
  };

  // ----------------------------------------------------
  // FICHE UTILISATEUR
  // ----------------------------------------------------
  const openUserDetail = async (userId: string) => {
    setSelectedUserId(userId);
    const cachedUser = users.find((u) => u.id === userId);
    if (cachedUser) {
      setUserDetail({
        utilisateur: cachedUser,
        transactions: [],
        creations: []
      });
    } else {
      setUserDetail(null);
    }
    setDetailError(null);
    setDetailSuccess(null);
    setDeltaInput('');
    setNoteInput('');
    setLoadingDetail(true);

    try {
      const res = await fetchAdminUserDetail(userId);
      if (handlePotential403(res.status, res.error)) return;
      if (res.error) {
        setDetailError(res.error);
      } else if (res.data) {
        setUserDetail(res.data);
      }
    } catch (err: any) {
      setDetailError(err?.message || 'Impossible de charger la fiche utilisateur.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeUserDetail = () => {
    setSelectedUserId(null);
    setUserDetail(null);
    setDetailError(null);
    setDetailSuccess(null);
    setConfirmAdjustOpen(false);
    setBlockModalType(null);
  };

  useEffect(() => {
    if (!selectedUserId) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeUserDetail();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedUserId]);

  // ----------------------------------------------------
  // AJUSTEMENT DES CRÉDITS
  // ----------------------------------------------------
  const handleRequestAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    setDetailError(null);
    setDetailSuccess(null);

    const delta = parseInt(deltaInput, 10);
    if (isNaN(delta) || delta === 0) {
      setDetailError('Le montant doit être un entier non nul (positif ou négatif).');
      return;
    }
    if (!noteInput.trim()) {
      setDetailError('La raison de l’ajustement est obligatoire.');
      return;
    }

    setConfirmAdjustOpen(true);
  };

  const executeAdjustCredits = async () => {
    if (!selectedUserId || submittingAdjust) return;
    const delta = parseInt(deltaInput, 10);
    const note = noteInput.trim();

    setSubmittingAdjust(true);
    setDetailError(null);

    try {
      const res = await adjustUserCredits(selectedUserId, delta, note);
      if (handlePotential403(res.status, res.error)) return;

      if (res.error || !res.ok) {
        setDetailError(res.error || 'Échec de l’ajustement des crédits.');
      } else {
        const nouveauSolde = res.solde ?? (((userDetail?.utilisateur?.solde) ?? 0) + delta);
        setDetailSuccess(`Crédits ajustés avec succès ! Nouveau solde : ${nouveauSolde} crédits.`);

        // Mise à jour de la fiche utilisateur
        if (userDetail && userDetail.utilisateur) {
          setUserDetail({
            ...userDetail,
            utilisateur: {
              ...userDetail.utilisateur,
              solde: nouveauSolde
            },
            transactions: [
              {
                id: 'tx_' + Date.now(),
                delta,
                motif: delta > 0 ? 'achat_manuel' : 'ajustement_admin',
                note,
                created_at: new Date().toISOString(),
                solde_apres: nouveauSolde
              },
              ...(userDetail.transactions || [])
            ].slice(0, 30)
          });
        }

        // Mise à jour dans la liste des utilisateurs
        setUsers((prev) =>
          prev.map((u) => (u.id === selectedUserId ? { ...u, solde: nouveauSolde } : u))
        );

        setDeltaInput('');
        setNoteInput('');
        setConfirmAdjustOpen(false);
      }
    } catch (err: any) {
      setDetailError(err?.message || 'Erreur réseau lors de l’ajustement.');
    } finally {
      setSubmittingAdjust(false);
    }
  };

  // ----------------------------------------------------
  // BLOCAGE / DÉBLOCAGE
  // ----------------------------------------------------
  const executeBlockOrUnblock = async () => {
    if (!selectedUserId || !blockModalType || submittingBlock) return;
    setSubmittingBlock(true);
    setDetailError(null);

    try {
      let res;
      if (blockModalType === 'block') {
        res = await blockUser(selectedUserId, blockReason.trim() || undefined);
      } else {
        res = await unblockUser(selectedUserId, blockReason.trim() || undefined);
      }

      if (handlePotential403(res.status, res.error)) return;

      if (res.error || !res.ok) {
        setDetailError(res.error || 'L’opération a échoué.');
      } else {
        const isNowBlocked = blockModalType === 'block';
        const newBannedUntil = isNowBlocked ? new Date(Date.now() + 365 * 86400000).toISOString() : null;

        setDetailSuccess(
          isNowBlocked ? 'Utilisateur bloqué avec succès.' : 'Utilisateur débloqué avec succès.'
        );

        if (userDetail && userDetail.utilisateur) {
          setUserDetail({
            ...userDetail,
            utilisateur: {
              ...userDetail.utilisateur,
              banned_until: newBannedUntil
            }
          });
        }

        setUsers((prev) =>
          prev.map((u) => (u.id === selectedUserId ? { ...u, banned_until: newBannedUntil } : u))
        );

        setBlockModalType(null);
        setBlockReason('');
      }
    } catch (err: any) {
      setDetailError(err?.message || 'Erreur réseau lors de l’opération.');
    } finally {
      setSubmittingBlock(false);
    }
  };

  // Navigation entre onglets
  const handleTabChange = (tab: AdminTab) => {
    setActiveTab(tab);
    setGlobalError(null);
    if (tab === 'stats' && !stats) {
      loadStats();
    } else if (tab === 'users' && users.length === 0) {
      loadUsers(searchQuery, currentPage);
    }
  };

  // Formateurs
  const formatDate = (iso?: string | null) => {
    if (!iso) return 'Jamais';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return iso;
    }
  };

  const formatShortDate = (iso?: string | null) => {
    if (!iso) return '-';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short'
      });
    } catch {
      return iso;
    }
  };

  const getTransactionLabel = (motif: string) => {
    switch (motif) {
      case 'achat_manuel':
        return 'Ajout par l’admin';
      case 'ajustement_admin':
        return 'Retrait par l’admin';
      case 'media':
        return 'Création';
      case 'remboursement_media':
        return 'Remboursement';
      case 'bonus_inscription':
        return 'Bonus d’inscription';
      case 'recharge':
        return 'Recharge';
      case 'achat':
        return 'Achat de crédits';
      default:
        return motif || 'Transaction';
    }
  };

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Film className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />;
      case 'audio':
        return <Mic className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />;
      case 'musique':
        return <Music className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  // ----------------------------------------------------
  // ÉCRAN DE CHARGEMENT INITIAL (VÉRIFICATION SÉCURISÉE)
  // ----------------------------------------------------
  if (checkingAccess) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none bg-slate-50 dark:bg-slate-900">
        <div className="w-12 h-12 rounded-2xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
          <ShieldCheck className="w-6 h-6 animate-pulse" />
        </div>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Vérification des droits d'administration…
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          Connexion sécurisée à l'interface d'administration.
        </p>
      </div>
    );
  }

  const deltaVal = parseInt(deltaInput || '0', 10);
  const fcfaEquiv = Math.abs(deltaVal) * 20;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-hidden text-slate-900 dark:text-slate-100">
      {/* En-tête de la page Admin */}
      <header className="px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 flex items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => onGoHome()}
            className="p-2 -ml-1 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95 cursor-pointer"
            title="Retour à l'accueil"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-base text-slate-900 dark:text-white truncate leading-tight">
                Administration
              </h1>
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/50">
                Admin
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              Tableau de bord & gestion Visorax Studio
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onOpenMenu}
            className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95 cursor-pointer"
            title="Menu principal"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Barre d'onglets Admin */}
      <div className="px-3 py-2 bg-white/70 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 shrink-0 backdrop-blur-xs">
        <nav className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl overflow-x-auto">
          <button
            type="button"
            onClick={() => handleTabChange('stats')}
            className={`flex-1 min-w-[90px] flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'stats'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span className="truncate">Tableau de bord</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('users')}
            className={`flex-1 min-w-[90px] flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'users'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span className="truncate">Utilisateurs</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('journal')}
            className={`flex-1 min-w-[90px] flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'journal'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ScrollText className="w-4 h-4 shrink-0" />
            <span className="truncate">Journal</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('annonces')}
            className={`flex-1 min-w-[90px] flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'annonces'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Megaphone className="w-4 h-4 shrink-0" />
            <span className="truncate">Annonces</span>
          </button>
        </nav>
      </div>

      {/* Message d'erreur global */}
      {globalError && (
        <div className="mx-3 mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
            <span>{globalError}</span>
          </div>
          <button
            type="button"
            onClick={() => setGlobalError(null)}
            className="p-1 rounded-md hover:bg-red-100 dark:hover:bg-red-900/50 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Contenu principal de l'onglet */}
      <main className="flex-1 overflow-y-auto p-3 sm:p-4 min-h-0">
        {/* ================================================================= */}
        {/* ONGLET 1 : TABLEAU DE BORD (STATS) */}
        {/* ================================================================= */}
        {activeTab === 'stats' && (
          <div className="space-y-4 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Métriques d'activité
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Vue consolidée des 30 derniers jours
                </p>
              </div>

              <button
                type="button"
                onClick={loadStats}
                disabled={loadingStats}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-2xs transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingStats ? 'animate-spin' : ''}`} />
                <span>Actualiser</span>
              </button>
            </div>

            {loadingStats && !stats ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
                <p className="text-xs">Chargement des indicateurs…</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                {/* Carte 1 : Utilisateurs totaux */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block truncate">
                    Utilisateurs totaux
                  </span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                      {(stats?.utilisateurs ?? 0).toLocaleString('fr-FR')}
                    </span>
                  </div>
                </div>

                {/* Carte 2 : Nouveaux (7 jours) */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 block truncate">
                    Nouveaux (7 jours)
                  </span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                      +{(stats?.nouveaux_7j ?? stats?.nouveaux ?? stats?.nouveaux_7jours ?? 0).toLocaleString('fr-FR')}
                    </span>
                  </div>
                </div>

                {/* Carte 3 : Créations terminées */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block truncate">
                    Médias terminés
                  </span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl sm:text-2xl font-extrabold text-blue-600 dark:text-blue-400">
                      {(
                        stats?.medias_termines ??
                        stats?.termines ??
                        (stats?.videos_terminees ?? 0) + (stats?.audios_termines ?? 0) + (stats?.musiques_terminees ?? 0)
                      ).toLocaleString('fr-FR')}
                    </span>
                  </div>
                  {(stats?.videos_terminees !== undefined || stats?.audios_termines !== undefined) && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate mt-0.5">
                      {stats?.videos_terminees ?? 0} vid · {stats?.audios_termines ?? 0} voix · {stats?.musiques_terminees ?? 0} mus
                    </span>
                  )}
                </div>

                {/* Carte 4 : Créations en cours */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                  <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 block truncate">
                    En cours
                  </span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl sm:text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                      {(stats?.en_cours ?? 0).toLocaleString('fr-FR')}
                    </span>
                  </div>
                </div>

                {/* Carte 5 : Échecs (24 h) */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                  <span className="text-[11px] font-semibold text-red-600 dark:text-red-400 block truncate">
                    Échecs (24 h)
                  </span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl sm:text-2xl font-extrabold text-red-600 dark:text-red-400">
                      {(stats?.echecs_24h ?? 0).toLocaleString('fr-FR')}
                    </span>
                  </div>
                </div>

                {/* Carte 6 : Crédits ajoutés (30 j) avec valeur FCFA */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 block truncate">
                    Crédits ajoutés (30 j)
                  </span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                      +{(stats?.credits_ajoutes_30j ?? 0).toLocaleString('fr-FR')}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block truncate mt-0.5">
                    {(
                      stats?.valeur_fcfa_ajoutee_30j ??
                      (stats?.credits_ajoutes_30j ? stats.credits_ajoutes_30j * 20 : 0)
                    ).toLocaleString('fr-FR')}{' '}
                    FCFA
                  </span>
                </div>

                {/* Carte 7 : Crédits dépensés (30 j) */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block truncate">
                    Crédits dépensés (30 j)
                  </span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                      {(stats?.credits_depenses_30j ?? 0).toLocaleString('fr-FR')}
                    </span>
                  </div>
                </div>

                {/* Carte 8 : Crédits en circulation */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                  <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 block truncate">
                    En circulation
                  </span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl sm:text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                      {(stats?.credits_en_circulation ?? stats?.credits_circulation ?? 0).toLocaleString('fr-FR')}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* ONGLET 2 : UTILISATEURS */}
        {/* ================================================================= */}
        {activeTab === 'users' && (
          <div className="space-y-3 max-w-5xl mx-auto">
            {/* Barre de recherche */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Rechercher par email, nom, prénoms ou WhatsApp…"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
              />
              {loadingUsers && (
                <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-blue-600" />
              )}
            </div>

            {/* Tableau défilable horizontalement */}
            <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[640px] lg:min-w-full">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold">
                      <th className="py-2.5 px-3">Nom complet</th>
                      <th className="py-2.5 px-3">Email</th>
                      <th className="py-2.5 px-3">Pays</th>
                      <th className="py-2.5 px-3 text-right">Solde</th>
                      <th className="py-2.5 px-3">Dernière connexion</th>
                      <th className="py-2.5 px-3">Inscription</th>
                      <th className="py-2.5 px-3 text-center">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {loadingUsers && users.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1 text-blue-600" />
                          Chargement des utilisateurs…
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          Aucun utilisateur trouvé.
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => {
                        const fullName = [u?.prenoms, u?.nom].filter(Boolean).join(' ') || u?.email || 'Sans nom';
                        const isBlocked = Boolean(u?.banned_until && new Date(u.banned_until) > new Date());
                        const soldeFormatted = typeof u?.solde === 'number' ? u.solde.toLocaleString('fr-FR') : '0';
                        return (
                          <tr
                            key={u?.id || Math.random()}
                            onClick={() => u?.id && openUserDetail(u.id)}
                            className="hover:bg-blue-50/50 dark:hover:bg-slate-700/40 transition cursor-pointer"
                          >
                            <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                              {fullName}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                              {u?.email || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                              {u?.pays || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-amber-700 dark:text-amber-300 whitespace-nowrap">
                              {soldeFormatted} cr
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                              {formatShortDate(u?.last_sign_in_at)}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                              {formatShortDate(u?.created_at)}
                            </td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap space-x-1">
                              {isBlocked && (
                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300">
                                  Bloqué
                                </span>
                              )}
                              {u?.est_admin && (
                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                                  Admin
                                </span>
                              )}
                              {!isBlocked && !u?.est_admin && (
                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-400">
                                  Actif
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>
                  {totalUsers > 0 ? (
                    <>
                      Affichage de {currentPage * PAGE_SIZE + 1} à{' '}
                      {Math.min((currentPage + 1) * PAGE_SIZE, totalUsers)} sur {totalUsers}
                    </>
                  ) : (
                    '0 utilisateur'
                  )}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (currentPage > 0) {
                        const newPage = currentPage - 1;
                        setCurrentPage(newPage);
                        loadUsers(searchQuery, newPage);
                      }
                    }}
                    disabled={currentPage === 0 || loadingUsers}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-semibold px-2">Page {currentPage + 1}</span>
                  <button
                    type="button"
                    onClick={() => {
                      if ((currentPage + 1) * PAGE_SIZE < totalUsers) {
                        const newPage = currentPage + 1;
                        setCurrentPage(newPage);
                        loadUsers(searchQuery, newPage);
                      }
                    }}
                    disabled={(currentPage + 1) * PAGE_SIZE >= totalUsers || loadingUsers}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* ONGLET 3 : JOURNAL */}
        {/* ================================================================= */}
        {activeTab === 'journal' && (
          <AdminJournalTab
            onOpenUser={(uid) => openUserDetail(uid)}
            initialUserId={journalPreselectedUserId}
            initialUserLabel={journalPreselectedUserLabel}
            onClearInitialUser={() => {
              setJournalPreselectedUserId(null);
              setJournalPreselectedUserLabel(null);
            }}
          />
        )}

        {/* ================================================================= */}
        {/* ONGLET 4 : ANNONCES */}
        {/* ================================================================= */}
        {activeTab === 'annonces' && (
          <AdminAnnoncesTab />
        )}
      </main>

      {/* =================================================================== */}
      {/* MODAL / PANNEAU LATÉRAL FICHE UTILISATEUR */}
      {/* =================================================================== */}
      {selectedUserId && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 lg:p-0 lg:justify-end bg-black/60 backdrop-blur-2xs animate-in fade-in duration-150"
          onClick={closeUserDetail}
        >
          <div 
            className="relative w-full max-w-2xl lg:max-w-[420px] lg:w-[420px] bg-white dark:bg-slate-900 rounded-2xl lg:rounded-none lg:rounded-l-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] lg:max-h-full lg:h-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header de la fiche */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white truncate">
                    {userDetail?.utilisateur
                      ? [userDetail.utilisateur.prenoms, userDetail.utilisateur.nom]
                          .filter(Boolean)
                          .join(' ') || userDetail.utilisateur.email || 'Utilisateur'
                      : 'Fiche utilisateur'}
                  </h3>
                  {userDetail?.utilisateur?.est_admin && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                      Admin
                    </span>
                  )}
                  {Boolean(
                    userDetail?.utilisateur?.banned_until &&
                      new Date(userDetail.utilisateur.banned_until) > new Date()
                  ) && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300">
                      Bloqué
                    </span>
                  )}
                </div>
                {userDetail?.utilisateur && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {userDetail.utilisateur.email} · ID : {userDetail.utilisateur.id}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={closeUserDetail}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Corps défilable de la fiche */}
            <div className="p-4 overflow-y-auto space-y-5">
              {detailError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{detailError}</span>
                </div>
              )}

              {detailSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{detailSuccess}</span>
                </div>
              )}

              {loadingDetail && !userDetail ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
                  <p className="text-xs">Chargement des données de l'utilisateur…</p>
                </div>
              ) : userDetail?.utilisateur ? (
                <>
                  {/* Action rapide : Voir le journal de ce compte */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/50">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-blue-950 dark:text-blue-200 truncate">
                        Audit & historique
                      </p>
                      <p className="text-[11px] text-blue-700 dark:text-blue-400 truncate">
                        Consulter toutes les actions liées à ce compte
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const u = userDetail.utilisateur;
                        const fullName = [u.prenoms, u.nom].filter(Boolean).join(' ').trim();
                        const label = fullName ? `${fullName} (${u.email})` : u.email;
                        setJournalPreselectedUserId(u.id);
                        setJournalPreselectedUserLabel(label);
                        closeUserDetail();
                        setActiveTab('journal');
                      }}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition active:scale-95 shrink-0 cursor-pointer"
                    >
                      <ScrollText className="w-3.5 h-3.5" />
                      <span>Voir le journal de ce compte</span>
                    </button>
                  </div>

                  {/* Coordonnées et solde */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 space-y-1.5 text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Coordonnées
                      </span>
                      <p>
                        <strong className="text-slate-500">Pays :</strong>{' '}
                        {userDetail.utilisateur.pays || 'Non renseigné'}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <strong className="text-slate-500">WhatsApp :</strong>{' '}
                        {userDetail.utilisateur.whatsapp ? (
                          <a
                            href={`https://wa.me/${userDetail.utilisateur.whatsapp.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-semibold underline"
                          >
                            <span>{userDetail.utilisateur.whatsapp}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-slate-400">Non renseigné</span>
                        )}
                      </p>
                      <p>
                        <strong className="text-slate-500">Inscription :</strong>{' '}
                        {formatDate(userDetail.utilisateur.created_at)}
                      </p>
                      <p>
                        <strong className="text-slate-500">Dernière visite :</strong>{' '}
                        {formatDate(userDetail.utilisateur.last_sign_in_at)}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/40 flex flex-col justify-between">
                      <div>
                        <span className="text-xs font-bold text-amber-800 dark:text-amber-300 block">
                          Solde actuel
                        </span>
                        <div className="mt-1 flex items-baseline gap-2">
                          <span className="text-2xl font-extrabold text-amber-700 dark:text-amber-300">
                            {userDetail.utilisateur.solde.toLocaleString('fr-FR')}
                          </span>
                          <span className="text-xs font-semibold text-amber-700/80 dark:text-amber-400">
                            crédits
                          </span>
                        </div>
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 block mt-0.5">
                          ≈ {(userDetail.utilisateur.solde * 20).toLocaleString('fr-FR')} FCFA
                        </span>
                      </div>

                      {/* Bouton Bloquer / Débloquer : masqué si est_admin ou propre compte */}
                      {!userDetail.utilisateur.est_admin &&
                        userDetail.utilisateur.id !== currentUser.id && (
                          <div className="mt-3 pt-2 border-t border-amber-200/50 dark:border-amber-900/50 flex justify-end">
                            {Boolean(
                              userDetail.utilisateur.banned_until &&
                                new Date(userDetail.utilisateur.banned_until) > new Date()
                            ) ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setBlockModalType('unblock');
                                  setBlockReason('');
                                }}
                                disabled={submittingBlock}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition active:scale-95 cursor-pointer disabled:opacity-50"
                              >
                                <Unlock className="w-3.5 h-3.5" />
                                <span>Débloquer le compte</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setBlockModalType('block');
                                  setBlockReason('');
                                }}
                                disabled={submittingBlock}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-2xs transition active:scale-95 cursor-pointer disabled:opacity-50"
                              >
                                <Lock className="w-3.5 h-3.5" />
                                <span>Bloquer le compte</span>
                              </button>
                            )}
                          </div>
                        )}
                    </div>
                  </div>

                  {/* Formulaire "Ajuster les crédits" */}
                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-amber-600" />
                      <span>Ajuster les crédits</span>
                    </h4>

                    <form onSubmit={handleRequestAdjust} className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Montant (+ pour ajouter, - pour retirer)
                          </label>
                          <input
                            type="number"
                            step="1"
                            value={deltaInput}
                            onChange={(e) => setDeltaInput(e.target.value)}
                            placeholder="Ex : 50 ou -20"
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                          />
                          {deltaVal !== 0 && !isNaN(deltaVal) && (
                            <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-1">
                              Valeur : {fcfaEquiv.toLocaleString('fr-FR')} FCFA ({deltaVal > 0 ? 'Ajout' : 'Retrait'})
                            </span>
                          )}
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Raison obligatoire
                          </label>
                          <input
                            type="text"
                            value={noteInput}
                            onChange={(e) => setNoteInput(e.target.value)}
                            placeholder="Paiement Mobile Money 1000 F"
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={submittingAdjust || !deltaInput || !noteInput.trim()}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-40"
                        >
                          <Coins className="w-3.5 h-3.5" />
                          <span>Valider l'ajustement</span>
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* 30 dernières transactions */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2 flex items-center justify-between">
                      <span>30 dernières transactions</span>
                      <span className="text-[11px] text-slate-400 font-normal">
                        {userDetail.transactions?.length || 0} transaction(s)
                      </span>
                    </h4>

                    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden max-h-48 overflow-y-auto">
                      {userDetail.transactions && userDetail.transactions.length > 0 ? (
                        <table className="w-full text-left text-xs">
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {userDetail.transactions.map((tx, idx) => (
                              <tr key={tx.id || idx} className="hover:bg-white/60 dark:hover:bg-slate-800/80">
                                <td className="py-2 px-3 whitespace-nowrap text-slate-500 text-[11px]">
                                  {formatDate(tx.created_at)}
                                </td>
                                <td className="py-2 px-3 text-slate-700 dark:text-slate-300">
                                  <div className="font-semibold">{getTransactionLabel(tx.motif)}</div>
                                  {tx.note && (
                                    <div className="text-[11px] text-slate-400 italic">
                                      « {tx.note} »
                                    </div>
                                  )}
                                </td>
                                <td
                                  className={`py-2 px-3 text-right font-bold whitespace-nowrap ${
                                    tx.delta > 0
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-amber-600 dark:text-amber-400'
                                  }`}
                                >
                                  {tx.delta > 0 ? `+${tx.delta}` : tx.delta} cr
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="p-4 text-center text-xs text-slate-400">
                          Aucune transaction enregistrée.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 20 dernières créations */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2 flex items-center justify-between">
                      <span>20 dernières créations</span>
                      <span className="text-[11px] text-slate-400 font-normal">
                        {userDetail.creations?.length || 0} création(s)
                      </span>
                    </h4>

                    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden max-h-48 overflow-y-auto">
                      {userDetail.creations && userDetail.creations.length > 0 ? (
                        <table className="w-full text-left text-xs">
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {userDetail.creations.map((cr, idx) => (
                              <tr key={cr.id || idx} className="hover:bg-white/60 dark:hover:bg-slate-800/80">
                                <td className="py-2 px-3 whitespace-nowrap text-slate-500 text-[11px]">
                                  {formatDate(cr.created_at)}
                                </td>
                                <td className="py-2 px-3 whitespace-nowrap flex items-center gap-1.5 font-semibold capitalize text-slate-700 dark:text-slate-300">
                                  {getMediaIcon(cr.type)}
                                  <span>{cr.type}</span>
                                </td>
                                <td className="py-2 px-3 text-slate-500 max-w-[200px] truncate">
                                  {cr.prompt || '-'}
                                </td>
                                <td className="py-2 px-3 text-center whitespace-nowrap">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      cr.statut === 'termine'
                                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                        : cr.statut === 'echec'
                                        ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                                        : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                                    }`}
                                  >
                                    {cr.statut}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-right font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                  {cr.cout ? `${cr.cout} cr` : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="p-4 text-center text-xs text-slate-400">
                          Aucune création enregistrée.
                        </p>
                      )}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL DE CONFIRMATION D'AJUSTEMENT DE CRÉDITS */}
      {/* =================================================================== */}
      {confirmAdjustOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-600" />
              <span>Confirmer l'ajustement</span>
            </h4>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs space-y-1.5">
              <p>
                <strong>Action :</strong>{' '}
                {deltaVal > 0 ? `Ajouter ${deltaVal} crédits` : `Retirer ${Math.abs(deltaVal)} crédits`}{' '}
                à{' '}
                <strong>
                  {userDetail?.utilisateur
                    ? [userDetail.utilisateur.prenoms, userDetail.utilisateur.nom]
                        .filter(Boolean)
                        .join(' ') || userDetail.utilisateur.email || 'l’utilisateur'
                    : 'l’utilisateur'}
                </strong>
                .
              </p>
              <p>
                <strong>Équivalent :</strong> {fcfaEquiv.toLocaleString('fr-FR')} FCFA
              </p>
              <p>
                <strong>Raison :</strong> « {noteInput.trim()} »
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmAdjustOpen(false)}
                disabled={submittingAdjust}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={executeAdjustCredits}
                disabled={submittingAdjust}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {submittingAdjust ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>Confirmer</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL DE CONFIRMATION DE BLOCAGE / DÉBLOCAGE */}
      {/* =================================================================== */}
      {blockModalType && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              {blockModalType === 'block' ? (
                <>
                  <Lock className="w-4 h-4 text-red-600" />
                  <span>Bloquer cet utilisateur</span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4 text-emerald-600" />
                  <span>Débloquer cet utilisateur</span>
                </>
              )}
            </h4>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              {blockModalType === 'block'
                ? 'L’utilisateur ne pourra plus générer de documents, vidéos ou audios.'
                : 'L’utilisateur retrouvera l’accès complet à la plateforme.'}
            </p>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Raison facultative
              </label>
              <input
                type="text"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Ex : Utilisation abusive ou impayé"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setBlockModalType(null);
                  setBlockReason('');
                }}
                disabled={submittingBlock}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={executeBlockOrUnblock}
                disabled={submittingBlock}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50 ${
                  blockModalType === 'block'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {submittingBlock ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : blockModalType === 'block' ? (
                  <Lock className="w-3.5 h-3.5" />
                ) : (
                  <Unlock className="w-3.5 h-3.5" />
                )}
                <span>{blockModalType === 'block' ? 'Bloquer' : 'Débloquer'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
