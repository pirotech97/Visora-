import React, { useState, useEffect } from 'react';
import {
  FileText,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Phone,
  Globe,
  User
} from 'lucide-react';
import {
  signInWithEmail,
  signUpWithEmail,
  isSupabaseConfigured,
  checkSupabaseHealth,
  formatSupabaseAuthError
} from '../services/supabase';
import type { UserProfile, SignUpData } from '../types';

interface AuthScreenProps {
  onAuthSuccess: (user: UserProfile) => void;
  isCloudReady: boolean;
  initialErrorMsg?: string | null;
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
  initialErrorMsg
}) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Champs spécifiques à l'inscription
  const [nom, setNom] = useState('');
  const [prenoms, setPrenoms] = useState('');
  const [sexe, setSexe] = useState<'Homme' | 'Femme' | 'Autre'>('Homme');
  const [pays, setPays] = useState('Togo');
  const [whatsapp, setWhatsapp] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(initialErrorMsg || null);
  const [serviceUnavailable, setServiceUnavailable] = useState(false);

  useEffect(() => {
    if (initialErrorMsg) {
      setErrorMsg(initialErrorMsg);
    }
  }, [initialErrorMsg]);

  // Contrôle discret de santé au chargement : GET {URL}/auth/v1/health avec apikey
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Vérification de la configuration Supabase
    if (!isSupabaseConfigured()) {
      console.warn('Variables Supabase absentes');
      setErrorMsg("Configuration manquante : l'adresse ou la clé du projet n'est pas définie.");
      return;
    }

    if (!email || !password) {
      setErrorMsg('Merci de renseigner votre e-mail et votre mot de passe.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Le mot de passe est trop court. Il doit comporter au moins 6 caractères.');
      return;
    }

    if (isSignUp) {
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
      <div className="my-auto py-4">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200/80 dark:border-slate-800">
          {/* Tabs */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 mb-5">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false);
                setErrorMsg(null);
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
                      <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
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
                      <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
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
                    <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
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
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
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
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl text-sm shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition disabled:opacity-70 cursor-pointer min-h-[46px]"
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

      {/* Privacy Notice Banner */}
      <div className="pb-4 text-center select-none">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 text-xs font-medium border border-blue-100/60 dark:border-blue-900/50 shadow-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>Tes fichiers restent 100% confidentiels et sécurisés.</span>
        </div>
      </div>
    </div>
  );
};
