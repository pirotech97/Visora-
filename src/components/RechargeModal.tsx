import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Zap,
  CheckCircle2,
  Clock,
  AlertCircle,
  HelpCircle,
  Loader2,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ShieldCheck
} from 'lucide-react';
import { VisoraxMascot } from './VisoraxMascot';
import {
  creerPaiement,
  verifierPaiement,
  fetchCommandesCredits,
  formatFcfa,
  isOrderWithin24Hours,
  type CommandeCredit
} from '../services/paiementService';

interface RechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentCredits: number | null;
  onCreditsUpdated?: (newBalance: number) => void;
}

const PACKS_RAPIDES = [
  { credits: 50, montant: 1000 },
  { credits: 100, montant: 2000, populaire: true },
  { credits: 250, montant: 5000 },
  { credits: 500, montant: 10000 }
];

export const RechargeModal: React.FC<RechargeModalProps> = ({
  isOpen,
  onClose,
  userId,
  currentCredits,
  onCreditsUpdated
}) => {
  const [selectedPackCredits, setSelectedPackCredits] = useState<number | null>(100);
  const [isCustom, setIsCustom] = useState(false);
  const [customCreditsInput, setCustomCreditsInput] = useState('10');
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Gestion du paiement dans un onglet externe & vérification
  const [paymentInitiated, setPaymentInitiated] = useState(false);
  const [pendingCheckoutUrl, setPendingCheckoutUrl] = useState<string | null>(null);
  const [activeCommandeId, setActiveCommandeId] = useState<string | null>(null);
  const [mustShowManualButton, setMustShowManualButton] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<
    'idle' | 'polling' | 'success' | 'timeout' | 'failed'
  >('idle');
  const [verifyAttempt, setVerifyAttempt] = useState(1);
  const [newSolde, setNewSolde] = useState<number | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);

  // Historique des commandes
  const [commandes, setCommandes] = useState<CommandeCredit[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [verifyingCommandeId, setVerifyingCommandeId] = useState<string | null>(null);
  const [verifyNotice, setVerifyNotice] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Arrêt propre du sondage
  const stopPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    isPollingRef.current = false;
  };

  // Calcul du nombre de crédits effectif
  const customNumber = parseInt(customCreditsInput, 10);
  const effectiveCredits = isCustom
    ? isNaN(customNumber)
      ? 0
      : customNumber
    : selectedPackCredits ?? 100;

  // Montant indicatif (crédits × 20 FCFA)
  const indicativeAmount = effectiveCredits * 20;

  // Validation du champ personnalisé
  let validationError: string | null = null;
  if (isCustom) {
    if (isNaN(customNumber) || customCreditsInput.trim() === '' || customNumber < 10) {
      validationError = 'Minimum 10 crédits (200 FCFA).';
    } else if (customNumber > 500) {
      validationError = 'Maximum 500 crédits';
    }
  }

  const isFormValid = !validationError && effectiveCredits >= 10 && effectiveCredits <= 500;

  // Chargement de l'historique quand la modale s'ouvre
  useEffect(() => {
    if (!isOpen || !userId) {
      stopPolling();
      setPaymentInitiated(false);
      setPendingCheckoutUrl(null);
      setActiveCommandeId(null);
      setMustShowManualButton(false);
      setVerificationStatus('idle');
      setVerifyAttempt(1);
      setNewSolde(null);
      setVerifyError(null);
      return;
    }
    setErrorMessage(null);
    setVerifyNotice(null);
    setLoadingHistory(true);
    fetchCommandesCredits(userId)
      .then((data) => {
        setCommandes(data);
        if (data.length > 0) {
          setHistoryOpen(true);
        }
      })
      .catch((err) => console.warn('Erreur chargement commandes:', err))
      .finally(() => setLoadingHistory(false));
  }, [isOpen, userId]);

  // Écoute de la touche Échap
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loadingPayment) {
        stopPolling();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loadingPayment, onClose]);

  // Nettoyage au démontage
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  const executeVerifyStep = async (attemptNum: number, cmdId?: string) => {
    try {
      const res = await verifierPaiement(cmdId || activeCommandeId || undefined);

      if (res.ok && res.statut === 'payee') {
        stopPolling();
        setVerificationStatus('success');
        const soldeVal = typeof res.solde === 'number' ? res.solde : null;
        setNewSolde(soldeVal);
        if (soldeVal !== null && onCreditsUpdated) {
          onCreditsUpdated(soldeVal);
        }
        fetchCommandesCredits(userId).then(setCommandes);
        return;
      }

      if (res.ok && (res.statut === 'echouee' || res.statut === 'expiree')) {
        stopPolling();
        setVerificationStatus('failed');
        setVerifyError(res.error || 'La transaction a été annulée ou n’a pas pu être validée.');
        fetchCommandesCredits(userId).then(setCommandes);
        return;
      }

      if (attemptNum >= 30) {
        stopPolling();
        setVerificationStatus('timeout');
      } else {
        setVerifyAttempt(attemptNum + 1);
      }
    } catch {
      if (attemptNum >= 30) {
        stopPolling();
        setVerificationStatus('timeout');
      } else {
        setVerifyAttempt(attemptNum + 1);
      }
    }
  };

  const startVerification = (cmdId?: string) => {
    if (verificationStatus === 'success') return;
    stopPolling();
    isPollingRef.current = true;
    setVerificationStatus('polling');
    setVerifyAttempt(1);
    setVerifyError(null);

    const targetCmdId = cmdId || activeCommandeId || undefined;
    executeVerifyStep(1, targetCmdId);

    let current = 1;
    pollTimerRef.current = setInterval(() => {
      current += 1;
      executeVerifyStep(current, targetCmdId);
    }, 3000);
  };

  // Reprendre automatiquement la vérification quand l'utilisateur revient sur l'onglet
  useEffect(() => {
    if (!isOpen || !paymentInitiated) return;

    const handleVisibilityChange = () => {
      if (
        document.visibilityState === 'visible' &&
        !isPollingRef.current &&
        verificationStatus !== 'success'
      ) {
        startVerification();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isOpen, paymentInitiated, verificationStatus, activeCommandeId]);

  if (!isOpen) return null;

  const handleSelectPack = (credits: number) => {
    setIsCustom(false);
    setSelectedPackCredits(credits);
    setCustomCreditsInput(String(credits));
    setErrorMessage(null);
  };

  const handleSelectCustom = () => {
    setIsCustom(true);
    setSelectedPackCredits(null);
    setErrorMessage(null);
    if (!customCreditsInput || isNaN(parseInt(customCreditsInput, 10)) || parseInt(customCreditsInput, 10) < 10) {
      setCustomCreditsInput('10');
    }
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setCustomCreditsInput(val);
    setErrorMessage(null);
  };

  const handlePayer = async () => {
    // 1) Première ligne avant tout appel réseau : ouvrir tout de suite un nouvel onglet vide
    const onglet = window.open('', '_blank');
    if (onglet) {
      try {
        onglet.document.title = 'Redirection vers le paiement…';
        if (onglet.document.body) {
          onglet.document.body.textContent = 'Redirection vers le paiement…';
        }
      } catch {
        // En cas de restriction cross-origin sur l'onglet créé
      }
    }

    if (!isFormValid || loadingPayment) {
      if (onglet && !onglet.closed) {
        try {
          onglet.close();
        } catch {}
      }
      return;
    }

    setLoadingPayment(true);
    setErrorMessage(null);
    setPaymentInitiated(false);
    setPendingCheckoutUrl(null);
    setVerificationStatus('idle');
    setMustShowManualButton(false);
    setVerifyError(null);

    // 2) Appeler ensuite la fonction Supabase "paiement"
    const res = await creerPaiement(effectiveCredits);

    // 3) Si la réponse contient checkout_url (commençant par https://)
    if (
      res.ok &&
      res.checkout_url &&
      typeof res.checkout_url === 'string' &&
      res.checkout_url.startsWith('https://')
    ) {
      const url = res.checkout_url;
      const cmdId = res.commande_id || null;
      setPendingCheckoutUrl(url);
      if (cmdId) {
        setActiveCommandeId(cmdId);
      }
      setPaymentInitiated(true);
      setLoadingPayment(false);

      let tabNavigated = false;
      if (onglet && !onglet.closed) {
        try {
          onglet.location.href = url;
          tabNavigated = true;
        } catch {
          tabNavigated = false;
        }
      }

      if (!tabNavigated) {
        // sinon (ouverture bloquée) : essayer window.top.location.assign(checkout_url) dans un try/catch
        let topAssigned = false;
        try {
          if (window.top && window.top !== window) {
            window.top.location.assign(url);
            topAssigned = true;
          }
        } catch {
          topAssigned = false;
        }

        if (!topAssigned) {
          // Si cela échoue aussi, afficher le gros bouton lien <a ...>
          setMustShowManualButton(true);
        }
      }
    } else {
      // 4) Si la réponse est une erreur : fermer l'onglet vide et afficher le message
      if (onglet && !onglet.closed) {
        try {
          onglet.close();
        } catch {}
      }
      setLoadingPayment(false);
      setErrorMessage(
        res.error || 'Impossible d’initialiser le paiement. Merci de réessayer dans un instant.'
      );
    }
  };

  const handleVerifierCommande = async (commande: CommandeCredit) => {
    if (verifyingCommandeId) return;
    setVerifyingCommandeId(commande.id);
    setVerifyNotice(null);

    const res = await verifierPaiement(commande.id);
    setVerifyingCommandeId(null);

    if (res.ok) {
      if (res.statut === 'payee' || (res.credites && res.credites > 0)) {
        setVerifyNotice(`Paiement confirmé ! +${commande.credits} crédits ajoutés.`);
        if (typeof res.solde === 'number' && onCreditsUpdated) {
          onCreditsUpdated(res.solde);
        }
        // Rafraîchir l'historique
        fetchCommandesCredits(userId).then(setCommandes);
      } else if (res.statut === 'en_attente') {
        setVerifyNotice('Le paiement est toujours en cours de confirmation chez ton opérateur.');
      } else if (res.statut === 'echouee' || res.statut === 'expiree') {
        setVerifyNotice(`Le paiement a le statut : ${res.statut}.`);
        fetchCommandesCredits(userId).then(setCommandes);
      } else {
        setVerifyNotice('Vérification effectuée.');
        fetchCommandesCredits(userId).then(setCommandes);
      }
    } else {
      setVerifyNotice(res.error || 'Vérification impossible pour le moment.');
    }
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} à ${hours}:${minutes}`;
    } catch {
      return isoStr;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="recharge-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in select-none"
    >
      <div className="w-full max-w-lg bg-[#F8FAFC] dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden my-auto text-[#0F172A] dark:text-slate-100 font-['Plus_Jakarta_Sans',sans-serif]">
        {/* En-tête avec bouton de fermeture */}
        <div className="relative pt-6 px-6 pb-4 bg-white dark:bg-slate-850 border-b border-slate-100 dark:border-slate-800 text-center shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={loadingPayment}
            aria-label="Fermer la fenêtre de recharge"
            className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Mascotte Visorax humeur */}
          <div className="flex justify-center mb-2.5">
            <VisoraxMascot
              size={64}
              mood={
                verificationStatus === 'success'
                  ? 'content'
                  : verificationStatus === 'failed'
                  ? 'desole'
                  : verificationStatus === 'polling' || verificationStatus === 'timeout' || paymentInitiated
                  ? 'reflechit'
                  : 'content'
              }
              animated={true}
              decorative={true}
            />
          </div>

          <h2
            id="recharge-title"
            className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white leading-tight font-['Sora',sans-serif]"
          >
            Recharge tes crédits
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium max-w-md mx-auto">
            1 crédit = 20 FCFA. Paiement par Mobile Money, sécurisé par SasPay.
          </p>

          {currentCredits !== null && (
            <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40 text-amber-800 dark:text-amber-300 text-xs font-semibold">
              <Zap className="w-3.5 h-3.5 fill-current text-amber-500" />
              <span>Solde actuel : {currentCredits} crédit{currentCredits > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {/* Corps défilable */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Grille responsive des 4 choix rapides */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
              Choix rapide
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {PACKS_RAPIDES.map((pack) => {
                const isSelected = !isCustom && selectedPackCredits === pack.credits;
                return (
                  <button
                    key={pack.credits}
                    type="button"
                    onClick={() => handleSelectPack(pack.credits)}
                    className={`relative min-h-[72px] sm:min-h-[80px] p-3 rounded-2xl flex flex-col items-center justify-center text-center transition cursor-pointer ${
                      isSelected
                        ? 'border-2 border-[#2563EB] bg-blue-50/90 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-300 shadow-sm ring-2 ring-blue-500/20'
                        : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-200'
                    }`}
                  >
                    {pack.populaire && (
                      <span className="absolute -top-2 px-2 py-0.5 rounded-full bg-[#FFB020] text-[#0F172A] font-extrabold text-[10px] tracking-wide shadow-2xs">
                        Populaire
                      </span>
                    )}
                    <span className="text-base sm:text-lg font-bold font-['Sora',sans-serif] leading-tight">
                      {pack.credits}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      crédits
                    </span>
                    <span className="mt-1 text-xs font-bold text-slate-700 dark:text-slate-300 font-['Sora',sans-serif]">
                      {formatFcfa(pack.montant)} F
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Carte « Autre montant » */}
          <div
            onClick={handleSelectCustom}
            className={`p-4 rounded-2xl transition cursor-pointer border ${
              isCustom
                ? 'border-2 border-[#2563EB] bg-blue-50/90 dark:bg-blue-950/60 ring-2 ring-blue-500/20'
                : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Autre montant
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                10 à 500 crédits
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={customCreditsInput}
                  onFocus={handleSelectCustom}
                  onChange={handleCustomChange}
                  placeholder="10 à 500"
                  aria-label="Nombre personnalisé de crédits (entre 10 et 500)"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold font-['Sora',sans-serif] text-base focus:outline-hidden focus:ring-2 focus:ring-[#2563EB] transition"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                  crédits
                </span>
              </div>

              <div className="text-right shrink-0">
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Prix indicatif
                </div>
                <div className="text-sm sm:text-base font-bold font-['Sora',sans-serif] text-slate-900 dark:text-white">
                  {formatFcfa(indicativeAmount)} FCFA
                </div>
              </div>
            </div>

            {/* Validation en direct */}
            {isCustom && validationError && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-1 animate-in fade-in">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{validationError}</span>
              </p>
            )}
          </div>

          {/* Affichage d'erreur globale (429 ou serveur) */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/70 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs sm:text-sm font-medium flex items-start gap-2.5 shadow-2xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          {/* Bouton d'action principal */}
          <div>
            <button
              type="button"
              onClick={handlePayer}
              disabled={!isFormValid || loadingPayment}
              className="w-full h-12 max-h-12 rounded-xl bg-[#2563EB] hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-base font-['Sora',sans-serif] shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none min-h-[44px]"
            >
              {loadingPayment ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Redirection…</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5 text-white/90" />
                  <span>
                    Payer {formatFcfa(indicativeAmount)} FCFA
                  </span>
                </>
              )}
            </button>

            {/* Mention sous le bouton */}
            <p className="mt-2 text-center text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-md mx-auto">
              Tu seras redirigé vers la page sécurisée de SasPay pour choisir ton opérateur Mobile Money (Orange, MTN, Moov, Wave…).
            </p>
          </div>

          {/* Section affichée après la création du paiement */}
          {paymentInitiated && pendingCheckoutUrl && (
            <div className="p-4 rounded-2xl bg-blue-50/90 dark:bg-blue-950/60 border border-blue-200/90 dark:border-blue-900/60 space-y-3 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <Clock className="w-5 h-5 text-[#2563EB] dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight font-['Sora',sans-serif]">
                    Paiement en cours dans l'autre onglet. Quand tu as fini, reviens ici
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                    SasPay traite ton règlement Mobile Money en toute sécurité.
                  </p>
                </div>
              </div>

              {mustShowManualButton && (
                <a
                  href={pendingCheckoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-12 max-h-12 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-900 font-bold text-base font-['Sora',sans-serif] shadow-md transition flex items-center justify-center gap-2 cursor-pointer no-underline select-none min-h-[44px]"
                >
                  <ExternalLink className="w-5 h-5" />
                  <span>Ouvrir la page de paiement</span>
                </a>
              )}

              {verificationStatus === 'polling' ? (
                <div className="w-full h-12 max-h-12 rounded-xl bg-blue-100 dark:bg-blue-900/70 border border-blue-300 dark:border-blue-700 text-[#2563EB] dark:text-blue-200 font-bold text-sm font-['Sora',sans-serif] flex items-center justify-center gap-2 select-none min-h-[44px]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Vérification en cours… ({verifyAttempt} / 30)</span>
                </div>
              ) : verificationStatus === 'success' ? (
                <div className="p-3.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-center space-y-2 animate-in zoom-in-95">
                  <div className="flex items-center justify-center gap-1.5 font-bold font-['Sora',sans-serif] text-sm text-emerald-800 dark:text-emerald-200">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <span>Paiement reçu !</span>
                  </div>
                  <p className="text-xs font-semibold">
                    {newSolde !== null
                      ? `Ton solde est maintenant de ${newSolde} crédits`
                      : 'Tes crédits ont bien été ajoutés à ton compte.'}
                  </p>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs font-['Sora',sans-serif] transition flex items-center justify-center gap-1 cursor-pointer min-h-[40px]"
                  >
                    Continuer
                  </button>
                </div>
              ) : verificationStatus === 'timeout' ? (
                <div className="space-y-2 pt-1">
                  <div className="text-xs text-slate-600 dark:text-slate-300 text-center">
                    <p className="font-bold text-slate-800 dark:text-white font-['Sora',sans-serif]">Paiement en cours de confirmation</p>
                    <p className="mt-0.5">Si tu as payé, tes crédits arriveront dans quelques minutes. Tu peux fermer cette page.</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => startVerification()}
                      className="flex-1 h-11 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs sm:text-sm font-['Sora',sans-serif] shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Réessayer</span>
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 h-11 rounded-xl bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs sm:text-sm transition cursor-pointer min-h-[44px]"
                    >
                      Fermer
                    </button>
                  </div>
                </div>
              ) : verificationStatus === 'failed' ? (
                <div className="space-y-2 pt-1 text-center">
                  <p className="text-xs font-semibold text-red-600 dark:text-red-400">
                    {verifyError || 'Paiement non terminé. Tu peux réessayer.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => startVerification()}
                    className="w-full h-11 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs sm:text-sm font-['Sora',sans-serif] shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Réessayer la vérification</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => startVerification()}
                  className="w-full h-12 max-h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-base font-['Sora',sans-serif] shadow-md transition flex items-center justify-center gap-2 cursor-pointer select-none min-h-[44px]"
                >
                  <RefreshCw className="w-5 h-5" />
                  <span>J'ai payé, vérifier</span>
                </button>
              )}

              {/* Dans tous les cas, garder aussi ce lien visible sous le bouton « Payer » après la création : « La page de paiement ne s'est pas ouverte ? Touche ici » */}
              <div className="text-center pt-1">
                <a
                  href={pendingCheckoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-[#2563EB] dark:text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>La page de paiement ne s'est pas ouverte ? Touche ici</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}

          {/* Section : Historique des achats */}
          <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setHistoryOpen(!historyOpen)}
              className="w-full flex items-center justify-between py-2 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer min-h-[44px]"
            >
              <span>Historique de tes achats ({commandes.length})</span>
              {historyOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {verifyNotice && (
              <div className="mb-2.5 p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-900 dark:text-blue-200 font-medium">
                {verifyNotice}
              </div>
            )}

            {historyOpen && (
              <div className="space-y-2 mt-1">
                {loadingHistory ? (
                  <div className="py-6 flex items-center justify-center gap-2 text-slate-400 text-xs">
                    <Loader2 className="w-4 h-4 animate-spin text-[#2563EB]" />
                    <span>Chargement de l'historique…</span>
                  </div>
                ) : commandes.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs font-medium">
                    Aucun achat de crédits enregistré pour l'instant.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {commandes.map((c) => {
                      const canVerify = c.statut === 'en_attente' && isOrderWithin24Hours(c.created_at);
                      const isVerifyingThis = verifyingCommandeId === c.id;

                      let badgeClass = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
                      let badgeLabel = 'Expiré';

                      if (c.statut === 'payee') {
                        badgeClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/70';
                        badgeLabel = 'Payé';
                      } else if (c.statut === 'en_attente') {
                        badgeClass = 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/70';
                        badgeLabel = 'En attente';
                      } else if (c.statut === 'echouee') {
                        badgeClass = 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-200/70';
                        badgeLabel = 'Échoué';
                      } else if (c.statut === 'expiree') {
                        badgeClass = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
                        badgeLabel = 'Expiré';
                      }

                      return (
                        <div
                          key={c.id}
                          className="p-3 rounded-xl bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="font-bold font-['Sora',sans-serif] text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>+{c.credits} crédits</span>
                              <span className="text-slate-400 font-normal">·</span>
                              <span className="text-slate-600 dark:text-slate-300 font-medium">
                                {formatFcfa(c.montant_fcfa)} FCFA
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {formatDate(c.created_at)}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`px-2.5 py-1 rounded-full font-bold text-[11px] ${badgeClass}`}>
                              {badgeLabel}
                            </span>

                            {canVerify && (
                              <button
                                type="button"
                                onClick={() => handleVerifierCommande(c)}
                                disabled={isVerifyingThis}
                                className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-800 text-[#2563EB] dark:text-blue-300 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50 min-h-[36px]"
                                title="Vérifier la confirmation de paiement"
                              >
                                {isVerifyingThis ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <RefreshCw className="w-3 h-3" />
                                )}
                                <span>Vérifier</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
