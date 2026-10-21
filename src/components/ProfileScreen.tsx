import React, { useState } from 'react';
import {
  User,
  ArrowLeft,
  Mail,
  Phone,
  Globe,
  Check,
  AlertCircle,
  Loader2,
  Menu,
  Coins
} from 'lucide-react';
import type { UserProfile, AppTab } from '../types';
import { updateUserProfile } from '../services/supabase';
import { RechargeButton } from './RechargeButton';

interface ProfileScreenProps {
  user: UserProfile;
  onUpdateUser: (updatedUser: UserProfile) => void;
  onGoBack: () => void;
  onOpenMenu?: () => void;
  credits: number | null;
}

const PAYS_OPTIONS = [
  'Bénin',
  'Togo',
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

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user,
  onUpdateUser,
  onGoBack,
  onOpenMenu,
  credits
}) => {
  const [nom, setNom] = useState(user.nom || '');
  const [prenoms, setPrenoms] = useState(user.prenoms || '');
  const [sexe, setSexe] = useState(user.sexe || 'Homme');
  const [pays, setPays] = useState(user.pays || 'Togo');
  const [whatsapp, setWhatsapp] = useState(user.whatsapp || '');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    if (!nom.trim() || nom.trim().length < 2) {
      setErrorMsg('Merci de renseigner un nom valide (au moins 2 caractères).');
      return;
    }
    if (!prenoms.trim() || prenoms.trim().length < 2) {
      setErrorMsg('Merci de renseigner des prénoms valides (au moins 2 caractères).');
      return;
    }
    if (!whatsapp.trim() || whatsapp.trim().replace(/\D/g, '').length < 8) {
      setErrorMsg('Merci de renseigner un numéro WhatsApp valide (au moins 8 chiffres).');
      return;
    }

    setSaving(true);
    try {
      const updates = {
        nom: nom.trim(),
        prenoms: prenoms.trim(),
        sexe,
        pays,
        whatsapp: whatsapp.trim()
      };

      const res = await updateUserProfile(user.id, updates);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        const updated: UserProfile = {
          ...user,
          ...updates
        };
        onUpdateUser(updated);
        setSuccessMsg('Profil mis à jour avec succès.');
        setTimeout(() => setSuccessMsg(null), 3500);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Impossible de mettre à jour le profil.');
    } finally {
      setSaving(false);
    }
  };

  const displayName = [prenoms, nom].filter(Boolean).join(' ') || user.email.split('@')[0];

  return (
    <div className="flex-1 min-h-0 flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-hidden">
      {/* Top Header */}
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
              Mon Profil
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Coordonnées et informations personnelles
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <RechargeButton email={user.email} credits={credits ?? 0} variant="header" />
        </div>
      </header>

      {/* Contenu déroulant */}
      <main
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        <div className="max-w-xl mx-auto space-y-5">
          {/* Carte récapitulative */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-2xl flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                {displayName}
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{user.email}</span>
              </div>
              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 text-xs font-bold">
                <Coins className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>{credits ?? 0} crédit{credits !== null && credits > 1 ? 's' : ''} disponible{credits !== null && credits > 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>

          {/* Alertes d'état */}
          {errorMsg && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-medium border border-red-200 dark:border-red-800/50 shadow-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800/50 shadow-xs animate-in fade-in">
              <Check className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Formulaire de profil */}
          <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
              Informations du compte
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nom de famille
                </label>
                <input
                  type="text"
                  required
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Ex : Dossou"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Prénoms
                </label>
                <input
                  type="text"
                  required
                  value={prenoms}
                  onChange={(e) => setPrenoms(e.target.value)}
                  placeholder="Ex : Jean-Marc"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Sexe
                </label>
                <div className="flex gap-2">
                  {(['Homme', 'Femme', 'Autre'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSexe(s)}
                      className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition cursor-pointer ${
                        sexe === s
                          ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-600 text-blue-700 dark:text-blue-300'
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Pays de résidence
                </label>
                <div className="relative">
                  <select
                    value={pays}
                    onChange={(e) => setPays(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition appearance-none cursor-pointer"
                  >
                    {PAYS_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  <Globe className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Numéro WhatsApp - Pas de mention "Ce numéro n'est pas encore vérifié", aucune vérification */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Numéro WhatsApp
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  required
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="Ex : +228 92 55 64 62"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
                />
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                Utilisé pour la recharge de tes crédits et l'assistance client.
              </p>
            </div>

            {/* Adresse E-mail (lecture seule) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Adresse e-mail (compte de connexion)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  disabled
                  value={user.email}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 dark:text-slate-400 text-sm cursor-not-allowed select-none"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl text-sm shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Enregistrement…</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Enregistrer les modifications</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};
