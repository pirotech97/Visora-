import React, { useState, useEffect, useRef } from 'react';
import { KeyRound, Lock, Eye, EyeOff, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { getSupabase, updateUserPassword, isPasswordValid, signOutUser } from '../services/supabase';

interface ResetPasswordScreenProps {
  onGoToSignIn: (successMessage?: string, initialMode?: 'signin' | 'forgot-password') => void;
}

export const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({ onGoToSignIn }) => {
  const [status, setStatus] = useState<'checking' | 'ready' | 'expired'>('checking');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const passwordInputRef = useRef<HTMLInputElement>(null);
  const confirmInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let timer: any = null;
    let subscription: any = null;
    let resolved = false;

    const markReady = () => {
      if (!resolved) {
        resolved = true;
        setStatus('ready');
        if (timer) clearTimeout(timer);
      }
    };

    const markExpired = () => {
      if (!resolved) {
        resolved = true;
        setStatus('expired');
        if (timer) clearTimeout(timer);
      }
    };

    // Vérification immédiate du hash pour erreurs explicites
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      if (
        hash.includes('error=') ||
        hash.includes('error_code=otp_expired') ||
        hash.includes('error_description=')
      ) {
        markExpired();
        return;
      }
    }

    const supabase = getSupabase();
    if (!supabase) {
      markExpired();
      return;
    }

    // Écoute de l'événement Supabase
    try {
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (
          event === 'PASSWORD_RECOVERY' ||
          (session && window.location.hash.includes('type=recovery'))
        ) {
          markReady();
        }
      });
      subscription = data.subscription;
    } catch {
      // Ignorer
    }

    // Vérification de la session en cours
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) {
        const hash = typeof window !== 'undefined' ? window.location.hash : '';
        if (hash.includes('type=recovery') || hash.includes('access_token')) {
          markReady();
        }
      }
    }).catch(() => {
      // Ignorer
    });

    // Règle des 3 secondes maximum sans validation
    timer = setTimeout(() => {
      if (!resolved) {
        markExpired();
      }
    }, 3000);

    return () => {
      if (timer) clearTimeout(timer);
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  const passwordsMatch = password === confirmPassword;
  const isRuleCompliant = isPasswordValid(password);
  const showMismatchError = confirmTouched && confirmPassword.length > 0 && !passwordsMatch;
  const canSubmit = isRuleCompliant && passwordsMatch && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isRuleCompliant) {
      setErrorMessage('Le mot de passe doit comporter au moins 8 caractères, avec au moins une lettre et un chiffre.');
      return;
    }

    if (!passwordsMatch) {
      setErrorMessage('Les mots de passe ne sont pas identiques.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await updateUserPassword(password);
      if (res.error) {
        setErrorMessage(res.error);
        setSubmitting(false);
        return;
      }

      // Succès : déconnexion immédiate de la session temporaire
      await signOutUser();
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', '/');
      }
      onGoToSignIn('Mot de passe modifié. Connecte-toi avec ton nouveau mot de passe.');
    } catch {
      setErrorMessage('Impossible de modifier le mot de passe. Demande un nouveau lien.');
      setSubmitting(false);
    }
  };

  const togglePasswordVisibility = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowPassword((prev) => !prev);
    passwordInputRef.current?.focus();
  };

  const toggleConfirmVisibility = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowConfirmPassword((prev) => !prev);
    confirmInputRef.current?.focus();
  };

  return (
    <div
      className="h-[100dvh] max-h-[100dvh] w-full bg-slate-50 dark:bg-slate-950 flex flex-col justify-between p-4 sm:p-6 max-w-lg mx-auto overflow-y-auto overscroll-contain"
      style={{
        paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(1rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(1rem, env(safe-area-inset-right, 0px))'
      }}
    >
      {/* Top Header */}
      <div className="pt-6 sm:pt-10 text-center select-none">
        <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20 mb-3">
          <KeyRound className="w-8 h-8 sm:w-9 sm:h-9" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Visora
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xs mx-auto">
          Réinitialisation sécurisée de ton mot de passe
        </p>
      </div>

      {/* Main Card */}
      <div className="my-auto py-4">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200/80 dark:border-slate-800">
          {status === 'checking' && (
            <div className="py-10 text-center flex flex-col items-center justify-center">
              <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">
                Vérification du lien de récupération…
              </p>
            </div>
          )}

          {status === 'expired' && (
            <div className="py-4 text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Lien expiré ou invalide
                </h2>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  Ce lien est invalide ou a expiré
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => onGoToSignIn(undefined, 'forgot-password')}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl text-sm shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition cursor-pointer min-h-[46px]"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Demander un nouveau lien</span>
                </button>
              </div>
            </div>
          )}

          {status === 'ready' && (
            <div>
              <div className="mb-5">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  Choisis un nouveau mot de passe
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Définis un mot de passe robuste pour accéder à ton compte.
                </p>
              </div>

              {errorMessage && (
                <div className="mb-4 flex items-start gap-2.5 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs sm:text-sm border border-red-100 dark:border-red-900/40">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                    Nouveau mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      ref={passwordInputRef}
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setErrorMessage(null);
                      }}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className="w-full pl-9 pr-12 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      onMouseDown={(e) => e.preventDefault()}
                      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                      aria-pressed={showPassword}
                      className="absolute right-0 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg transition cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
                    8 caractères minimum, avec une lettre et un chiffre
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                    Confirmer le nouveau mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      ref={confirmInputRef}
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setConfirmTouched(true);
                        setErrorMessage(null);
                      }}
                      onBlur={() => setConfirmTouched(true)}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className="w-full pl-9 pr-12 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
                    />
                    <button
                      type="button"
                      onClick={toggleConfirmVisibility}
                      onMouseDown={(e) => e.preventDefault()}
                      aria-label={showConfirmPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                      aria-pressed={showConfirmPassword}
                      className="absolute right-0 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg transition cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {showMismatchError && (
                    <span className="text-[11px] text-red-500 dark:text-red-400 mt-1 block font-medium">
                      Les mots de passe ne sont pas identiques
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full mt-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl text-sm shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer min-h-[46px]"
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Enregistrer le mot de passe</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      <div className="pb-4 text-center">
        <button
          type="button"
          onClick={() => onGoToSignIn()}
          className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
        >
          Retour à la page de connexion
        </button>
      </div>
    </div>
  );
};
