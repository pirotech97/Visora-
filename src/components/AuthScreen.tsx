import React, { useState, useEffect, useRef } from 'react';
import { VisoraMascot } from './VisoraMascot';
import {
  FileText,
  Lock,
  Mail,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Phone,
  Globe,
  User,
  Eye,
  EyeOff,
  CheckCircle2
} from 'lucide-react';
import {
  signInWithEmail,
  signUpWithEmail,
  resetPasswordForEmail,
  isPasswordValid,
  isSupabaseConfigured,
  checkSupabaseHealth,
  formatSupabaseAuthError
} from '../services/supabase';
import type { UserProfile, SignUpData } from '../types';

interface AuthScreenProps {
  onAuthSuccess: (user: UserProfile) => void;
  isCloudReady: boolean;
  initialErrorMsg?: string | null;
  initialSuccessMsg?: string | null;
  initialIsSignUp?: boolean;
  initialMode?: 'signin' | 'signup' | 'forgot-password';
  onGoBackToLanding?: () => void;
}

const PAYS_LIST = [
  'Togo',
  'Bénin',
  'Côte d’Ivoire',
  'Sénégal',
  'Cameroun',
  'Burkina Faso',
  'Mali',
  'Guinée',
  'Niger',
  'Gabon',
  'Congo',
  'RD Congo',
  'France',
  'Autre'
];

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onAuthSuccess,
  isCloudReady,
  initialErrorMsg,
  initialSuccessMsg,
  initialIsSignUp = false,
  initialMode,
  onGoBackToLanding
}) => {
  const [isSignUp, setIsSignUp] = useState(initialIsSignUp || initialMode === 'signup');
  const [isForgotPassword, setIsForgotPassword] = useState(initialMode === 'forgot-password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmTouched, setConfirmTouched] = useState(false);

  // Visibilité des mots de passe (masqués par défaut)
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordInputRef = useRef<HTMLInputElement>(null);
  const confirmInputRef = useRef<HTMLInputElement>(null);

  // Champs spécifiques à l'inscription
  const [nom, setNom] = useState('');
  const [prenoms, setPrenoms] = useState('');
  const [sexe, setSexe] = useState<'Homme' | 'Femme' | 'Autre'>('Homme');
  const [pays, setPays] = useState('Togo');
  const [whatsapp, setWhatsapp] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(initialErrorMsg || null);
  const [successBanner, setSuccessBanner] = useState<string | null>(initialSuccessMsg || null);
  const [serviceUnavailable, setServiceUnavailable] = useState(false);

  // État "Mot de passe oublié"
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotErrorMsg, setForgotErrorMsg] = useState<string | null>(null);
  const [forgotCooldown, setForgotCooldown] = useState(0);

  useEffect(() => {
    if (initialErrorMsg) {
      setErrorMsg(initialErrorMsg);
    }
  }, [initialErrorMsg]);

  useEffect(() => {
    if (initialSuccessMsg) {
      setSuccessBanner(initialSuccessMsg);
    }
  }, [initialSuccessMsg]);

  // Décompte de 60 s pour le renvoi d'e-mail de réinitialisation
  useEffect(() => {
    if (forgotCooldown <= 0) return;
    const timer = setInterval(() => {
      setForgotCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [forgotCooldown]);

  // Contrôle discret de santé au chargement
  useEffect(() => {
    let isMounted = true;
    checkSupabaseHealth().then((ok) => {
      if (isMounted && !ok) {
        setServiceUnavailable(true);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleTogglePassword = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowPassword((prev) => !prev);
    passwordInputRef.current?.focus();
  };

  const handleToggleConfirmPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowConfirmPassword((prev) => !prev);
    confirmInputRef.current?.focus();
  };

  const handleOpenForgotPassword = () => {
    setIsForgotPassword(true);
    setForgotEmail(email);
    setErrorMsg(null);
    setSuccessBanner(null);
    setForgotErrorMsg(null);
  };

  const handleCloseForgotPassword = () => {
    setIsForgotPassword(false);
    setForgotErrorMsg(null);
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim() || forgotCooldown > 0 || forgotLoading) return;

    setForgotLoading(true);
    setForgotErrorMsg(null);

    try {
      const res = await resetPasswordForEmail(forgotEmail);
      if (res.rateLimited || res.error) {
        setForgotErrorMsg(res.error || 'Trop de demandes. Réessaie dans quelques minutes.');
      } else {
        setForgotSuccess(true);
        setForgotCooldown(60);
      }
    } catch {
      setForgotSuccess(true);
      setForgotCooldown(60);
    } finally {
      setForgotLoading(false);
    }
  };

  const passwordsMatch = password === confirmPassword;
  const isSignupPasswordValid = isPasswordValid(password);
  const showConfirmMismatch =
    isSignUp && (confirmTouched || confirmPassword.length > 0) && !passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessBanner(null);

    if (!isSupabaseConfigured()) {
      setErrorMsg("Configuration manquante : l'adresse ou la clé du projet n'est pas définie.");
      return;
    }

    if (!email || !password) {
      setErrorMsg('Merci de renseigner votre e-mail et votre mot de passe.');
      return;
    }

    if (isSignUp) {
      if (!isSignupPasswordValid) {
        setErrorMsg('Le mot de passe doit comporter au moins 8 caractères, avec au moins une lettre et un chiffre.');
        return;
      }
      if (!passwordsMatch) {
        setErrorMsg('Les mots de passe ne sont pas identiques.');
        return;
      }
      if (!nom.trim() || nom.trim().length < 2) {
        setErrorMsg('Merci de renseigner votre nom de famille (au moins 2 caractères).');
        return;
      }
      if (!prenoms.trim() || prenoms.trim().length < 2) {
        setErrorMsg('Merci de renseigner vos prénoms (au moins 2 caractères).');
        return;
      }
      if (!sexe) {
        setErrorMsg('Merci de sélectionner votre sexe.');
        return;
      }
      if (!pays) {
        setErrorMsg('Merci de sélectionner votre pays de résidence.');
        return;
      }
      const digitsOnly = whatsapp.trim().replace(/\D/g, '');
      if (!whatsapp.trim() || digitsOnly.length < 8) {
        setErrorMsg('Merci de renseigner un numéro WhatsApp valide (au moins 8 chiffres).');
        return;
      }
    } else {
      if (password.length < 6) {
        setErrorMsg('Le mot de passe est trop court. Il doit comporter au moins 6 caractères.');
        return;
      }
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const profileData: SignUpData = {
          nom: nom.trim(),
          prenoms: prenoms.trim(),
          sexe,
          pays,
          whatsapp: whatsapp.trim()
        };

        const { user, error } = await signUpWithEmail(email, password, profileData);
        if (error) {
          setErrorMsg(error);
        } else if (user) {
          onAuthSuccess({ ...user, isNewUser: true });
        }
      } else {
        const { user, error } = await signInWithEmail(email, password);
        if (error) {
          setErrorMsg(error);
        } else if (user) {
          onAuthSuccess(user);
        }
      }
    } catch (err: any) {
      setErrorMsg(formatSupabaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const isSubmitDisabled =
    loading ||
    (isSignUp && (!isSignupPasswordValid || !passwordsMatch));

  return (
    <div
      className="min-h-[100dvh] w-full bg-slate-50 dark:bg-slate-950 flex flex-col justify-between p-4 sm:p-6 lg:p-8 overflow-y-auto overscroll-contain"
      style={{
        paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(1rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(1rem, env(safe-area-inset-right, 0px))'
      }}
    >
      {/* Bouton retour vers la page d'accueil si ouvert depuis la landing page */}
      {onGoBackToLanding && !isForgotPassword && (
        <div className="pt-2 text-left max-w-lg lg:max-w-screen-xl mx-auto w-full shrink-0">
          <button
            type="button"
            onClick={onGoBackToLanding}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour à l'accueil</span>
          </button>
        </div>
      )}

      {/* Conteneur 2 colonnes sur lg et plus, 1 colonne centrée sur mobile/tablette */}
      <div className="w-full max-w-lg lg:max-w-screen-xl mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-center lg:gap-16 xl:gap-24 my-auto">
        {/* Panneau de marque gauche (affiché uniquement sur lg et plus) */}
        <div className="hidden lg:flex flex-col items-start justify-center max-w-md xl:max-w-lg space-y-6 text-left select-none">
          <div className="flex items-center gap-4">
            <VisoraMascot size={110} mood="content" decorative />
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200/60 dark:border-blue-800/60">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Studio de création IA</span>
              </div>
              <h1 className="text-4xl xl:text-5xl font-black text-slate-900 dark:text-white tracking-tight mt-2">
                Visora
              </h1>
            </div>
          </div>

          <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
            Ton atelier intelligent pour convertir, créer et produire en quelques secondes.
          </p>

          <div className="space-y-3.5 pt-2">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                Convertis tes documents et PDF en Word fidèles mot pour mot.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                Génère des vidéos, voix réalistes, musiques et visuels en un clic.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                Tarifs accessibles en FCFA et adapté aux connexions mobiles.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 text-xs font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Tes fichiers restent 100% confidentiels et sécurisés.</span>
            </div>
          </div>
        </div>

        {/* Colonne droite : Carte Auth (420 à 460 px sur lg) */}
        <div className="w-full lg:w-[450px] lg:max-w-[460px] flex flex-col justify-center">
          {/* Top Header visible uniquement sur mobile et tablette */}
          <div className="lg:hidden text-center select-none pt-4 pb-2">
            <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20 mb-3">
              <FileText className="w-8 h-8 sm:w-9 sm:h-9" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Visora
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xs mx-auto">
              Convertis tes PDF et photos en Word (.docx) fidèles mot pour mot, sans retouche ni modification.
            </p>
          </div>

          {/* Auth Card */}
          <div className="py-2 sm:py-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200/80 dark:border-slate-800">
          {isForgotPassword ? (
            /* Panneau Mot de passe oublié */
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleCloseForgotPassword}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Retour à la connexion</span>
              </button>

              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  Réinitialiser le mot de passe
                </h2>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  Saisis ton adresse e-mail. Nous t'enverrons un lien pour choisir un nouveau mot de passe.
                </p>
              </div>

              {forgotErrorMsg && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs sm:text-sm border border-red-100 dark:border-red-900/40">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                  <span>{forgotErrorMsg}</span>
                </div>
              )}

              {forgotSuccess && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 text-xs sm:text-sm border border-emerald-200 dark:border-emerald-900/40">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    Si un compte existe avec cette adresse, tu vas recevoir un e-mail avec un lien pour choisir un nouveau mot de passe. Pense à regarder tes spams.
                  </span>
                </div>
              )}

              <form onSubmit={handleForgotSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                    Adresse e-mail
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="nom@exemple.com"
                      autoComplete="email"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading || forgotCooldown > 0 || !forgotEmail.trim()}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl text-sm shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer min-h-[46px]"
                >
                  {forgotLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : forgotCooldown > 0 ? (
                    <span>Renvoyer dans {forgotCooldown} s</span>
                  ) : (
                    <>
                      <span>{forgotSuccess ? 'Renvoyer le lien' : 'Envoyer le lien'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            /* Écran Connexion / Inscription standard */
            <>
              {/* Onglets */}
              <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 mb-5">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(false);
                    setErrorMsg(null);
                    setSuccessBanner(null);
                  }}
                  className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition cursor-pointer ${
                    !isSignUp
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Connexion
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(true);
                    setErrorMsg(null);
                    setSuccessBanner(null);
                  }}
                  className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition cursor-pointer ${
                    isSignUp
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Inscription
                </button>
              </div>

              {serviceUnavailable && (
                <div className="mb-4 flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 text-xs sm:text-sm border border-amber-200 dark:border-amber-900/40">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <span>Le service est momentanément indisponible</span>
                </div>
              )}

              {successBanner && (
                <div className="mb-4 flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 text-xs sm:text-sm border border-emerald-200 dark:border-emerald-900/40">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{successBanner}</span>
                </div>
              )}

              {errorMsg && (
                <div className="mb-4 flex items-start gap-2.5 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs sm:text-sm border border-red-100 dark:border-red-900/40">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5">
                {/* Champs additionnels lors de l'inscription */}
                {isSignUp && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Nom
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          <input
                            type="text"
                            required
                            value={nom}
                            onChange={(e) => setNom(e.target.value)}
                            placeholder="Ex : Dossou"
                            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Prénoms
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          <input
                            type="text"
                            required
                            value={prenoms}
                            onChange={(e) => setPrenoms(e.target.value)}
                            placeholder="Ex : Jean-Marc"
                            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Sexe
                        </label>
                        <div className="flex gap-1.5">
                          {(['Homme', 'Femme', 'Autre'] as const).map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setSexe(s)}
                              className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition cursor-pointer ${
                                sexe === s
                                  ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-600 text-blue-700 dark:text-blue-300'
                                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                              }`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Pays de résidence
                        </label>
                        <div className="relative">
                          <select
                            value={pays}
                            onChange={(e) => setPays(e.target.value)}
                            className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition appearance-none cursor-pointer"
                          >
                            {PAYS_LIST.map((p) => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                          </select>
                          <Globe className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Numéro WhatsApp
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          type="tel"
                          required
                          value={whatsapp}
                          onChange={(e) => setWhatsapp(e.target.value)}
                          placeholder="Ex : +228 92 55 64 62"
                          className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 block">
                        Utilisé pour tes recharges et le support client.
                      </span>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                    Adresse e-mail
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nom@exemple.com"
                      autoComplete="email"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                    Mot de passe
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
                        setErrorMsg(null);
                      }}
                      placeholder="••••••••"
                      autoComplete={isSignUp ? 'new-password' : 'current-password'}
                      className="w-full pl-9 pr-12 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
                    />
                    <button
                      type="button"
                      onClick={handleTogglePassword}
                      onMouseDown={(e) => e.preventDefault()}
                      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                      aria-pressed={showPassword}
                      className="absolute right-0 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg transition cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {isSignUp && (
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
                      8 caractères minimum, avec une lettre et un chiffre
                    </span>
                  )}
                  {!isSignUp && (
                    <div className="mt-1 text-right">
                      <button
                        type="button"
                        onClick={handleOpenForgotPassword}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        Mot de passe oublié ?
                      </button>
                    </div>
                  )}
                </div>

                {/* Champ "Confirmer le mot de passe" uniquement à l'inscription */}
                {isSignUp && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                      Confirmer le mot de passe
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
                          setErrorMsg(null);
                        }}
                        onBlur={() => setConfirmTouched(true)}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        className="w-full pl-9 pr-12 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
                      />
                      <button
                        type="button"
                        onClick={handleToggleConfirmPassword}
                        onMouseDown={(e) => e.preventDefault()}
                        aria-label={showConfirmPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                        aria-pressed={showConfirmPassword}
                        className="absolute right-0 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg transition cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {showConfirmMismatch && (
                      <span className="text-[11px] text-red-500 dark:text-red-400 mt-1 block font-medium">
                        Les mots de passe ne sont pas identiques
                      </span>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitDisabled}
                  className="w-full mt-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl text-sm shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer min-h-[46px]"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{isSignUp ? 'Créer mon compte' : 'Se connecter'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          {!isCloudReady && (
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium">
                <Sparkles className="w-3 h-3 text-blue-600" />
                Mode test direct disponible
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>

      {/* Privacy Notice Banner visible sur mobile et tablette */}
      <div className="pb-4 text-center select-none lg:hidden">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 text-xs font-medium border border-blue-100/60 dark:border-blue-900/50 shadow-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>Tes fichiers restent 100% confidentiels et sécurisés.</span>
        </div>
      </div>
    </div>
  );
};
