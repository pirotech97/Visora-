import React, { useState, useEffect, useCallback } from 'react';
import {
  Megaphone,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Loader2,
  Calendar,
  Link as LinkIcon,
  ArrowLeft,
  X
} from 'lucide-react';
import type { AdminAnnonceItem, AnnonceType } from '../../types';
import {
  fetchAdminAnnonces,
  saveAdminAnnonce,
  toggleAdminAnnonce,
  deleteAdminAnnonce
} from '../../services/adminApi';
import { AnnonceCarte } from '../AnnonceCarte';
import { isValidAnnonceLien } from '../../services/annoncesService';

export const AdminAnnoncesTab: React.FC = () => {
  const [annonces, setAnnonces] = useState<AdminAnnonceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Vue liste ou formulaire
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAnnonce, setEditingAnnonce] = useState<AdminAnnonceItem | null>(null);

  // Champs du formulaire
  const [formTitre, setFormTitre] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formType, setFormType] = useState<AnnonceType>('info');
  const [formBoutonLibelle, setFormBoutonLibelle] = useState('');
  const [formBoutonLien, setFormBoutonLien] = useState('');
  const [formActif, setFormActif] = useState(true);
  const [formDebutLe, setFormDebutLe] = useState(''); // format datetime-local
  const [formFinLe, setFormFinLe] = useState(''); // format datetime-local

  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Modal confirmation suppression
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Basculement état (toggle) en cours
  const [togglingId, setTogglingId] = useState<string | number | null>(null);

  // Auto-dismiss notice de succès après 5 secondes
  useEffect(() => {
    if (successNotice) {
      const timer = setTimeout(() => setSuccessNotice(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successNotice]);

  // Conversion ISO UTC vers datetime-local (heure locale) pour le champ input
  const isoToLocalInput = (isoStr?: string | null): string => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return '';
      const pad = (n: number) => String(n).padStart(2, '0');
      const year = d.getFullYear();
      const month = pad(d.getMonth() + 1);
      const day = pad(d.getDate());
      const hours = pad(d.getHours());
      const minutes = pad(d.getMinutes());
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch {
      return '';
    }
  };

  // Conversion datetime-local (heure locale) vers ISO UTC pour l'envoi
  const localInputToIso = (localStr: string): string | null => {
    if (!localStr || !localStr.trim()) return null;
    try {
      const d = new Date(localStr);
      if (isNaN(d.getTime())) return null;
      return d.toISOString();
    } catch {
      return null;
    }
  };

  // Chargement des annonces
  const loadAnnonces = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAdminAnnonces();
      if (res.error) {
        setError(res.error);
      } else {
        setAnnonces(res.annonces || []);
      }
    } catch (err: any) {
      setError(err?.message || 'Impossible de charger la liste des annonces.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnnonces();
  }, [loadAnnonces]);

  // Ouverture formulaire création
  const handleOpenCreate = () => {
    setEditingAnnonce(null);
    setFormTitre('');
    setFormMessage('');
    setFormType('nouveaute');
    setFormBoutonLibelle('');
    setFormBoutonLien('');
    setFormActif(true);
    setFormDebutLe('');
    setFormFinLe('');
    setFormError(null);
    setIsFormOpen(true);
  };

  // Ouverture formulaire édition
  const handleOpenEdit = (item: AdminAnnonceItem) => {
    setEditingAnnonce(item);
    setFormTitre(item.titre || '');
    setFormMessage(item.message || '');
    setFormType(item.type || 'info');
    setFormBoutonLibelle(item.bouton_libelle || '');
    setFormBoutonLien(item.bouton_lien || '');
    setFormActif(Boolean(item.actif));
    setFormDebutLe(isoToLocalInput(item.debut_at || item.debut_le));
    setFormFinLe(isoToLocalInput(item.fin_at || item.fin_le));
    setFormError(null);
    setIsFormOpen(true);
  };

  // Fermeture formulaire
  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingAnnonce(null);
    setFormError(null);
  };

  // Validation et soumission du formulaire
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const titreClean = formTitre.trim();
    const messageClean = formMessage.trim();
    const libelleClean = formBoutonLibelle.trim();
    const lienClean = formBoutonLien.trim();

    // 1. Titre et message obligatoires
    if (!titreClean) {
      setFormError('Le titre de l’annonce est obligatoire.');
      return;
    }
    if (titreClean.length > 80) {
      setFormError('Le titre ne doit pas dépasser 80 caractères.');
      return;
    }
    if (!messageClean) {
      setFormError('Le message de l’annonce est obligatoire.');
      return;
    }
    if (messageClean.length > 600) {
      setFormError('Le message ne doit pas dépasser 600 caractères.');
      return;
    }

    // 2. Bouton et lien ensemble ou aucun
    const hasLibelle = Boolean(libelleClean);
    const hasLien = Boolean(lienClean);
    if ((hasLibelle && !hasLien) || (!hasLibelle && hasLien)) {
      setFormError(
        'Le texte du bouton et le lien doivent être renseignés ensemble, ou laissés vides tous les deux.'
      );
      return;
    }

    // 3. Validation du lien si présent
    if (hasLien) {
      if (lienClean.toLowerCase().startsWith('javascript:')) {
        setFormError('Le lien ne peut pas contenir de code script (javascript:).');
        return;
      }
      if (!isValidAnnonceLien(lienClean)) {
        setFormError(
          'Le lien doit commencer par https:// ou par un chemin interne / (ex: /outils ou https://visorax.studio).'
        );
        return;
      }
    }

    // 4. Dates de début et fin
    const debutIso = localInputToIso(formDebutLe);
    const finIso = localInputToIso(formFinLe);

    if (debutIso && finIso) {
      if (new Date(finIso) <= new Date(debutIso)) {
        setFormError('La date de fin doit être postérieure à la date de début.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        ...(editingAnnonce ? { id: editingAnnonce.id } : {}),
        titre: titreClean,
        message: messageClean,
        type: formType,
        bouton_libelle: hasLibelle ? libelleClean : null,
        bouton_lien: hasLien ? lienClean : null,
        actif: formActif,
        debut_le: debutIso,
        fin_le: finIso
      };

      const res = await saveAdminAnnonce(payload);
      if (res.error) {
        setFormError(res.error);
        return;
      }

      setSuccessNotice(
        editingAnnonce
          ? 'L’annonce a été modifiée avec succès.'
          : 'L’annonce a été enregistrée avec succès.'
      );
      setIsFormOpen(false);
      setEditingAnnonce(null);
      await loadAnnonces();
    } catch (err: any) {
      setFormError(err?.message || 'Erreur lors de l’enregistrement de l’annonce.');
    } finally {
      setSubmitting(false);
    }
  };

  // Basculer actif / inactif
  const handleToggle = async (item: AdminAnnonceItem) => {
    const nextState = !item.actif;
    setTogglingId(item.id);
    try {
      const res = await toggleAdminAnnonce(item.id, nextState);
      if (res.error) {
        setError(res.error);
      } else {
        setAnnonces((prev) =>
          prev.map((a) => (a.id === item.id ? { ...a, actif: nextState } : a))
        );
        setSuccessNotice(
          nextState
            ? `Annonce « ${item.titre} » activée.`
            : `Annonce « ${item.titre} » désactivée.`
        );
      }
    } catch (err: any) {
      setError(err?.message || 'Erreur lors du changement d’état.');
    } finally {
      setTogglingId(null);
    }
  };

  // Confirmation de suppression
  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return;
    setDeleting(true);
    try {
      const res = await deleteAdminAnnonce(deleteConfirmId);
      if (res.error) {
        setError(res.error);
      } else {
        setAnnonces((prev) => prev.filter((a) => a.id !== deleteConfirmId));
        setSuccessNotice('L’annonce a été supprimée avec succès.');
        setDeleteConfirmId(null);
      }
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de la suppression.');
    } finally {
      setDeleting(false);
    }
  };

  // Calcul du statut d'une annonce
  const getStatus = (item: AdminAnnonceItem) => {
    const now = Date.now();
    const debutStr = item.debut_at || item.debut_le;
    const finStr = item.fin_at || item.fin_le;
    const debutTime = debutStr ? new Date(debutStr).getTime() : 0;
    const finTime = finStr ? new Date(finStr).getTime() : null;

    // 1. « Terminée » (orange) si fin passée (quel que soit actif)
    if (finTime !== null && finTime < now) {
      return {
        label: 'Terminée',
        badge:
          'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50'
      };
    }

    // 2. Si non actif et pas terminée -> « Désactivée » (gris)
    if (!item.actif) {
      return {
        label: 'Désactivée',
        badge:
          'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
      };
    }

    // 3. « Programmée » (bleu) si actif ET début dans le futur
    if (debutTime > now) {
      return {
        label: 'Programmée',
        badge:
          'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50'
      };
    }

    // 4. « En ligne » (vert) si actif ET début passé ET (fin non définie OU fin dans le futur)
    return {
      label: 'En ligne',
      badge:
        'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50'
    };
  };

  // Formatage de date simple jj/mm/aaaa hh:mm
  const formatDateSimple = (isoStr?: string | null) => {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return '—';
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return '—';
    }
  };

  // Badge du type d'annonce
  const renderTypeBadge = (type: AnnonceType) => {
    switch (type) {
      case 'info':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#DBEAFE] dark:bg-[#1E3A8A] text-[#0F172A] dark:text-[#F8FAFC]">
            Info
          </span>
        );
      case 'nouveaute':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#2563EB] dark:bg-[#3B82F6] text-white">
            Nouveauté
          </span>
        );
      case 'promo':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFB020] text-[#0F172A]">
            Promo
          </span>
        );
      case 'important':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FEE2E2] dark:bg-red-950/70 text-[#991B1B] dark:text-red-200">
            <AlertTriangle className="w-3 h-3 text-[#991B1B] dark:text-red-300 stroke-[2.5]" />
            <span>Important</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto select-none">
      {/* Messages de succès / erreur */}
      {successNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between gap-2 shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="font-semibold">{successNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessNotice(null)}
            className="p-1 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-900/60 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={loadAnnonces}
            className="px-2.5 py-1 rounded-lg bg-red-100 dark:bg-red-900/50 hover:bg-red-200 font-semibold cursor-pointer text-xs shrink-0"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* =================================================================== */}
      {/* VUE FORMULAIRE : CRÉATION OU MODIFICATION */}
      {/* =================================================================== */}
      {isFormOpen ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleCloseForm}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer p-1 -ml-1 rounded-lg"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Retour à la liste des annonces</span>
            </button>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {editingAnnonce ? 'Modifier l’annonce' : 'Nouvelle annonce'}
            </h3>
          </div>

          {formError && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Disposition côte à côte sur ordinateur, l'un sous l'autre sur mobile */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Formulaire à gauche */}
            <form
              onSubmit={handleSubmitForm}
              className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 p-4 sm:p-5 shadow-2xs space-y-4"
            >
              {/* 1. Titre (max 80 car.) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Titre <span className="text-red-500">*</span>
                  </label>
                  <span
                    className={`text-[11px] font-mono ${
                      formTitre.length > 80
                        ? 'text-red-600 font-bold'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {formTitre.length} / 80
                  </span>
                </div>
                <input
                  type="text"
                  value={formTitre}
                  onChange={(e) => setFormTitre(e.target.value)}
                  maxLength={80}
                  placeholder="Ex : Nouveauté : Crée tes affiches en 1 clic !"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* 2. Message (max 600 car., texte simple) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <span
                    className={`text-[11px] font-mono ${
                      formMessage.length > 600
                        ? 'text-red-600 font-bold'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {formMessage.length} / 600
                  </span>
                </div>
                <textarea
                  value={formMessage}
                  onChange={(e) => setFormMessage(e.target.value)}
                  maxLength={600}
                  rows={4}
                  placeholder="Écris ton message ici. Il sera affiché comme du texte simple sans balise HTML."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 resize-y"
                  required
                />
              </div>

              {/* 3. Type d'annonce */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Type d'annonce
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['info', 'nouveaute', 'promo', 'important'] as AnnonceType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFormType(t)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                        formType === t
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 shadow-2xs'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      {t === 'info' && 'Info'}
                      {t === 'nouveaute' && 'Nouveauté'}
                      {t === 'promo' && 'Promo'}
                      {t === 'important' && 'Important'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Bouton facultatif : Texte + Lien */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Bouton d'action (facultatif)
                  </span>
                  <span className="text-[11px] text-slate-400">Remplir les 2 champs ou aucun</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Texte du bouton (max 30)
                    </label>
                    <input
                      type="text"
                      value={formBoutonLibelle}
                      onChange={(e) => setFormBoutonLibelle(e.target.value)}
                      maxLength={30}
                      placeholder="Ex : Découvrir, Voir l'offre"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Lien de redirection
                    </label>
                    <input
                      type="text"
                      value={formBoutonLien}
                      onChange={(e) => setFormBoutonLien(e.target.value)}
                      placeholder="https://… ou /outils"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Aide : commence par <code className="text-blue-600 font-mono">https://</code> pour un site externe ou par <code className="text-blue-600 font-mono">/</code> pour naviguer dans l'app (ex : <code className="font-mono">/outils</code>).
                </p>
              </div>

              {/* 5. Période de diffusion : Début & Fin */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Début (vide = maintenant)
                  </label>
                  <input
                    type="datetime-local"
                    value={formDebutLe}
                    onChange={(e) => setFormDebutLe(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Fin (facultatif)
                  </label>
                  <input
                    type="datetime-local"
                    value={formFinLe}
                    onChange={(e) => setFormFinLe(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* 6. Interrupteur "Publier tout de suite" */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                <div>
                  <span className="block text-xs font-bold text-slate-900 dark:text-white">
                    Publier tout de suite
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Si désactivé, l’annonce sera enregistrée mais restera inactive
                  </span>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formActif}
                    onChange={(e) => setFormActif(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Boutons validation */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  disabled={submitting}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingAnnonce ? 'Mettre à jour' : 'Enregistrer l’annonce'}</span>
                </button>
              </div>
            </form>

            {/* Aperçu en direct à droite (ou dessous sur mobile) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Aperçu en direct (rendu utilisateur)
                </span>
                <span className="text-[11px] text-slate-400">Boutons inactifs en aperçu</span>
              </div>

              <div className="p-4 sm:p-6 bg-slate-100 dark:bg-slate-950/80 rounded-3xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-center min-h-[380px]">
                <AnnonceCarte
                  titre={formTitre || 'Titre de l’annonce'}
                  message={
                    formMessage ||
                    'Le message complet apparaîtra ici tel que tes utilisateurs le verront dans leur popup.'
                  }
                  type={formType}
                  boutonLibelle={formBoutonLibelle || null}
                  boutonLien={formBoutonLien || null}
                  apercu={true}
                  inline={true}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* =================================================================== */
        /* VUE LISTE DES ANNONCES */
        /* =================================================================== */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                Gestion des annonces
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Publie des fenêtres popups (nouveautés, promos, alertes) visibles une fois par compte
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <button
                type="button"
                onClick={loadAnnonces}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs transition active:scale-95 cursor-pointer disabled:opacity-50"
                title="Actualiser les annonces"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Actualiser</span>
              </button>

              <button
                type="button"
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold shadow-2xs transition active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nouvelle annonce</span>
              </button>
            </div>
          </div>

          {/* Tableau sur ordinateur >= 768 px */}
          <div className="hidden md:block bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold">
                  <th className="py-3 px-3.5">Titre</th>
                  <th className="py-3 px-3.5 w-28">Type</th>
                  <th className="py-3 px-3.5 w-32">État</th>
                  <th className="py-3 px-3.5 w-36">Audience</th>
                  <th className="py-3 px-3.5 w-44">Période</th>
                  <th className="py-3 px-3.5 text-right w-36">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading && annonces.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                      Chargement des annonces…
                    </td>
                  </tr>
                ) : annonces.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Aucune annonce publiée pour le moment.
                    </td>
                  </tr>
                ) : (
                  annonces.map((item) => {
                    const st = getStatus(item);
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="py-3 px-3.5">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {item.titre}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                            {item.message}
                          </div>
                          {item.bouton_libelle && (
                            <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5 flex items-center gap-1">
                              <LinkIcon className="w-3 h-3" />
                              <span>{item.bouton_libelle}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          {renderTypeBadge(item.type)}
                        </td>
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${st.badge}`}
                          >
                            {st.label}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">
                          {(() => {
                            const count = item.vues_count ?? item.vues ?? 0;
                            return `Vue par ${count} personne${count > 1 ? 's' : ''}`;
                          })()}
                        </td>
                        <td className="py-3 px-3.5 text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          <div>Du : {formatDateSimple(item.debut_at || item.debut_le)}</div>
                          <div>Au : {formatDateSimple(item.fin_at || item.fin_le)}</div>
                        </td>
                        <td className="py-3 px-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Toggle Activer / Désactiver */}
                            <label
                              className="relative inline-flex items-center cursor-pointer mr-1"
                              title={item.actif ? 'Désactiver l’annonce' : 'Activer l’annonce'}
                            >
                              <input
                                type="checkbox"
                                checked={Boolean(item.actif)}
                                onChange={() => handleToggle(item)}
                                disabled={togglingId === item.id}
                                className="sr-only peer"
                              />
                              <div className="w-8 h-4 bg-slate-300 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>

                            {/* Modifier */}
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(item)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                              title="Modifier cette annonce"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Supprimer */}
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(item.id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
                              title="Supprimer cette annonce"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Cartes sur mobile (< 768 px) : sans défilement horizontal */}
          <div className="md:hidden space-y-3">
            {loading && annonces.length === 0 ? (
              <div className="py-10 text-center text-slate-400 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                Chargement des annonces…
              </div>
            ) : annonces.length === 0 ? (
              <div className="py-10 text-center text-slate-400 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                Aucune annonce publiée pour le moment.
              </div>
            ) : (
              annonces.map((item) => {
                const st = getStatus(item);
                return (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 p-4 shadow-2xs space-y-2.5 text-xs"
                  >
                    {/* Pastilles en haut */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {renderTypeBadge(item.type)}
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${st.badge}`}
                        >
                          {st.label}
                        </span>
                      </div>

                      {/* Interrupteur Actif */}
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(item.actif)}
                          onChange={() => handleToggle(item)}
                          disabled={togglingId === item.id}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4 bg-slate-300 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    {/* Titre & extrait */}
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        {item.titre}
                      </h4>
                      <p className="text-slate-600 dark:text-slate-300 line-clamp-2 mt-0.5 leading-relaxed">
                        {item.message}
                      </p>
                    </div>

                    {/* Audience & Dates */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 gap-2">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {(() => {
                          const count = item.vues_count ?? item.vues ?? 0;
                          return `Vue par ${count} personne${count > 1 ? 's' : ''}`;
                        })()}
                      </span>
                      <span>
                        Du {formatDateSimple(item.debut_at || item.debut_le)} au {formatDateSimple(item.fin_at || item.fin_le)}
                      </span>
                    </div>

                    {/* Actions Modifier / Supprimer */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(item)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Modifier</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(item.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-semibold cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Supprimer</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL DE CONFIRMATION DE SUPPRESSION */}
      {/* =================================================================== */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-red-600" />
              <span>Supprimer l’annonce</span>
            </h4>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Supprimer cette annonce ? Les utilisateurs ne la verront plus.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                disabled={deleting}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirmer</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
