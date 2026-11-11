import React, { useState, useEffect, useRef } from 'react';
import { Loader2, CheckCircle2, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';
import { VisoraxMascot } from './VisoraxMascot';
import { verifierPaiement } from '../services/paiementService';

interface PaymentReturnModalProps {
  commandeId: string;
  onClose: () => void;
  onPaymentSuccess: (newBalance: number) => void;
  onRetryRecharge: () => void;
}

type VerificationStatus = 'polling' | 'success' | 'timeout' | 'failed';

const MAX_ATTEMPTS = 30; // 30 tentatives × 3s = 90 secondes

export const PaymentReturnModal: React.FC<PaymentReturnModalProps> = ({
  commandeId,
  onClose,
  onPaymentSuccess,
  onRetryRecharge
}) => {
  const [status, setStatus] = useState<VerificationStatus>('polling');
  const [attempt, setAttempt] = useState(1);
  const [solde, setSolde] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isCheckingRef = useRef(false);

  const checkStatus = async (currentAttempt: number) => {
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;

    try {
      const res = await verifierPaiement(commandeId);

      if (res.ok && res.statut === 'payee') {
        try {
          sessionStorage.removeItem('visorax_pending_paiement_id');
        } catch {}
        setSolde(typeof res.solde === 'number' ? res.solde : null);
        setStatus('success');
        return;
      }

      if (res.ok && (res.statut === 'echouee' || res.statut === 'expiree')) {
        try {
          sessionStorage.removeItem('visorax_pending_paiement_id');
        } catch {}
        setErrorMessage(
          res.error || 'La transaction a été annulée ou n’a pas pu être validée.'
        );
        setStatus('failed');
        return;
      }

      // Toujours en attente
      if (currentAttempt >= MAX_ATTEMPTS) {
        setStatus('timeout');
      } else {
        setAttempt(currentAttempt + 1);
      }
    } catch (err: any) {
      if (currentAttempt >= MAX_ATTEMPTS) {
        setStatus('timeout');
      } else {
        setAttempt(currentAttempt + 1);
      }
    } finally {
      isCheckingRef.current = false;
    }
  };

  useEffect(() => {
    if (status !== 'polling') return;

    // Premier appel immédiat
    checkStatus(attempt);

    // Sondage toutes les 3 secondes
    const interval = setInterval(() => {
      setAttempt((prev) => {
        const next = prev + 1;
        checkStatus(prev);
        return next;
      });
    }, 3000);

    timerRef.current = interval;

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [status]);

  const handleRetryVerification = () => {
    setAttempt(1);
    setErrorMessage(null);
    setStatus('polling');
  };

  const handleSuccessContinue = () => {
    try {
      sessionStorage.removeItem('visorax_pending_paiement_id');
    } catch {}
    if (typeof solde === 'number') {
      onPaymentSuccess(solde);
    }
    onClose();
  };

  const handleReturnToApp = () => {
    try {
      sessionStorage.removeItem('visorax_pending_paiement_id');
    } catch {}
    onClose();
  };

  const handleRetryPayment = () => {
    try {
      sessionStorage.removeItem('visorax_pending_paiement_id');
    } catch {}
    onClose();
    onRetryRecharge();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in select-none"
    >
      <div className="w-full max-w-md bg-[#F8FAFC] dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 text-center text-[#0F172A] dark:text-slate-100 font-['Plus_Jakarta_Sans',sans-serif]">
        {/* État 1 : Sondage en cours */}
        {status === 'polling' && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <VisoraxMascot size={72} mood="reflechit" animated={true} decorative={true} />
            </div>

            <h2 className="text-xl sm:text-2xl font-bold font-['Sora',sans-serif] text-[#0F172A] dark:text-white leading-tight">
              Vérification de ton paiement…
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed max-w-sm mx-auto">
              Nous attendons la confirmation de SasPay et de ton opérateur Mobile Money.
            </p>

            <div className="pt-3 pb-1 flex flex-col items-center justify-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-900/60 text-[#2563EB] dark:text-blue-300 text-xs font-semibold">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Vérification en cours ({Math.min(attempt, MAX_ATTEMPTS)} / {MAX_ATTEMPTS})</span>
              </div>
              <span className="text-[11px] text-slate-400">
                Patience, cela prend généralement quelques secondes.
              </span>
            </div>
          </div>
        )}

        {/* État 2 : Succès confirmé */}
        {status === 'success' && (
          <div className="space-y-4 animate-in zoom-in-95">
            <div className="flex justify-center">
              <VisoraxMascot size={76} mood="content" animated={true} decorative={true} />
            </div>

            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 shadow-sm mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <h2 className="text-xl sm:text-2xl font-bold font-['Sora',sans-serif] text-[#0F172A] dark:text-white leading-tight">
              Paiement reçu !
            </h2>

            <p className="text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-200">
              {solde !== null ? (
                <>
                  Ton solde est maintenant de{' '}
                  <span className="font-bold text-[#2563EB] dark:text-blue-400 font-['Sora',sans-serif]">
                    {solde} crédits
                  </span>
                </>
              ) : (
                'Tes crédits ont bien été ajoutés à ton compte.'
              )}
            </p>

            <div className="pt-3">
              <button
                type="button"
                onClick={handleSuccessContinue}
                className="w-full h-12 max-h-12 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-base font-['Sora',sans-serif] shadow-md transition flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
              >
                <span>Continuer</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* État 3 : Timeout après 90 secondes */}
        {status === 'timeout' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex justify-center">
              <VisoraxMascot size={72} mood="reflechit" animated={false} decorative={true} />
            </div>

            <h2 className="text-xl sm:text-2xl font-bold font-['Sora',sans-serif] text-[#0F172A] dark:text-white leading-tight">
              Paiement en cours de confirmation
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed max-w-sm mx-auto">
              Si tu as payé, tes crédits arriveront dans quelques minutes. Tu peux fermer cette page.
            </p>

            <div className="pt-2 space-y-2.5">
              <button
                type="button"
                onClick={handleRetryVerification}
                className="w-full h-11 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-sm font-['Sora',sans-serif] shadow-xs transition flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Réessayer la vérification</span>
              </button>

              <button
                type="button"
                onClick={handleReturnToApp}
                className="w-full h-11 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm transition cursor-pointer min-h-[44px]"
              >
                Retour à l'app
              </button>
            </div>
          </div>
        )}

        {/* État 4 : Échec ou annulé */}
        {status === 'failed' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex justify-center">
              <VisoraxMascot size={72} mood="desole" animated={false} decorative={true} />
            </div>

            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 shadow-sm mx-auto">
              <AlertCircle className="w-7 h-7" />
            </div>

            <h2 className="text-xl sm:text-2xl font-bold font-['Sora',sans-serif] text-[#0F172A] dark:text-white leading-tight">
              Paiement non terminé
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed max-w-sm mx-auto">
              {errorMessage || 'Le paiement n’a pas abouti ou a été interrompu chez ton opérateur.'}
            </p>

            <div className="pt-2 space-y-2.5">
              <button
                type="button"
                onClick={handleRetryPayment}
                className="w-full h-12 max-h-12 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-base font-['Sora',sans-serif] shadow-md transition flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Réessayer</span>
              </button>

              <button
                type="button"
                onClick={handleReturnToApp}
                className="w-full h-11 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm transition cursor-pointer min-h-[44px]"
              >
                Retour à l'app
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
