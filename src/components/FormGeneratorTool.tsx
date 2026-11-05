import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  FileDown,
  RotateCcw,
  Sparkles,
  Coins,
  CheckSquare,
  FileText,
  AlertCircle,
  ShieldAlert,
  ChevronUp,
  ChevronDown,
  Eye,
  Edit3,
  HelpCircle,
  CheckCircle2
} from 'lucide-react';
import type {
  UserProfile,
  FormInputData,
  FormDocument,
  FormSection,
  FormField,
  FormFieldType
} from '../types';
import { genererDocumentAdministrative } from '../services/supabase';
import { downloadFormPdf, downloadFormDocx } from '../services/adminDocGenerators';

interface FormGeneratorToolProps {
  user: UserProfile;
  credits: number | null;
  onBack: () => void;
  onOpenRecharge: () => void;
  onCreditsChange: (newCredits: number) => void;
}

const STORAGE_DRAFT_KEY = 'visora_draft_form';
const FORM_COST = 2;

const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  texte: 'Texte court',
  texte_long: 'Texte long / Paragraphe',
  nombre: 'Nombre',
  date: 'Date',
  email: 'Email',
  telephone: 'Téléphone',
  choix_unique: 'Choix unique (Boutons radio)',
  choix_multiple: 'Choix multiple (Cases à cocher)',
  case: 'Case à cocher unique',
  signature: 'Zone de signature'
};

const EXEMPLES_IDEE = [
  'Inscription à un tournoi de football de quartier',
  'Demande de devis pour un mariage',
  'Suivi des élèves absents'
];

export const FormGeneratorTool: React.FC<FormGeneratorToolProps> = ({
  user,
  credits,
  onBack,
  onOpenRecharge,
  onCreditsChange
}) => {
  const [step, setStep] = useState<number>(1);
  const [inputData, setInputData] = useState<FormInputData>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_DRAFT_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return {
      idee: '',
      public: '',
      contexte: ''
    };
  });

  const [generatedDoc, setGeneratedDoc] = useState<FormDocument | null>(null);
  const [activeView, setActiveView] = useState<'editeur' | 'apercu'>('editeur');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showRechargeButton, setShowRechargeButton] = useState<boolean>(false);

  // Sauvegarde automatique du brouillon dans sessionStorage
  useEffect(() => {
    if (!generatedDoc) {
      sessionStorage.setItem(STORAGE_DRAFT_KEY, JSON.stringify(inputData));
    }
  }, [inputData, generatedDoc]);

  const handleReset = () => {
    sessionStorage.removeItem(STORAGE_DRAFT_KEY);
    setInputData({
      idee: '',
      public: '',
      contexte: ''
    });
    setGeneratedDoc(null);
    setStep(1);
    setErrorMsg(null);
    setShowRechargeButton(false);
  };

  // Appel serveur
  const handleGenerate = async () => {
    setErrorMsg(null);
    setShowRechargeButton(false);

    if ((credits ?? 0) < FORM_COST) {
      setErrorMsg('Crédits insuffisants. Recharger pour continuer.');
      setShowRechargeButton(true);
      return;
    }

    if (inputData.idee.trim().length < 10) {
      setErrorMsg("Merci de décrire ton idée avec au moins 10 caractères.");
      return;
    }

    setIsGenerating(true);

    const payload = {
      idee: inputData.idee.trim(),
      public: inputData.public?.trim() || undefined,
      contexte: inputData.contexte?.trim() || undefined
    };

    const res = await genererDocumentAdministrative('formulaire', payload);
    setIsGenerating(false);

    if (res.error) {
      setErrorMsg(res.error);
      if (res.isInsufficientCredits) {
        setShowRechargeButton(true);
      }
      return;
    }

    if (typeof res.credits_restants === 'number') {
      onCreditsChange(res.credits_restants);
    }

    if (res.document) {
      sessionStorage.removeItem(STORAGE_DRAFT_KEY);
      setGeneratedDoc(res.document);
    } else {
      setErrorMsg('La génération a échoué. Réessaie.');
    }
  };

  // Modifications de l'éditeur dans le navigateur (gratuit)
  const updateField = (
    sIdx: number,
    fIdx: number,
    patch: Partial<FormField>
  ) => {
    if (!generatedDoc) return;
    const newSections = [...generatedDoc.sections];
    const champs = [...newSections[sIdx].champs];
    champs[fIdx] = { ...champs[fIdx], ...patch };
    newSections[sIdx] = { ...newSections[sIdx], champs };
    setGeneratedDoc({ ...generatedDoc, sections: newSections });
  };

  const removeField = (sIdx: number, fIdx: number) => {
    if (!generatedDoc) return;
    const newSections = [...generatedDoc.sections];
    newSections[sIdx].champs = newSections[sIdx].champs.filter((_, i) => i !== fIdx);
    setGeneratedDoc({ ...generatedDoc, sections: newSections });
  };

  const moveField = (sIdx: number, fIdx: number, direction: 'up' | 'down') => {
    if (!generatedDoc) return;
    const newSections = [...generatedDoc.sections];
    const champs = [...newSections[sIdx].champs];
    const targetIdx = direction === 'up' ? fIdx - 1 : fIdx + 1;
    if (targetIdx < 0 || targetIdx >= champs.length) return;
    const temp = champs[fIdx];
    champs[fIdx] = champs[targetIdx];
    champs[targetIdx] = temp;
    newSections[sIdx] = { ...newSections[sIdx], champs };
    setGeneratedDoc({ ...generatedDoc, sections: newSections });
  };

  const addField = (sIdx: number) => {
    if (!generatedDoc) return;
    const newSections = [...generatedDoc.sections];
    newSections[sIdx].champs.push({
      libelle: 'Nouveau champ',
      type: 'texte',
      obligatoire: false,
      aide: ''
    });
    setGeneratedDoc({ ...generatedDoc, sections: newSections });
  };

  const addSection = () => {
    if (!generatedDoc) return;
    setGeneratedDoc({
      ...generatedDoc,
      sections: [
        ...generatedDoc.sections,
        {
          titre: 'Nouvelle section',
          champs: [
            {
              libelle: 'Nouveau champ',
              type: 'texte',
              obligatoire: false
            }
          ]
        }
      ]
    });
  };

  const removeSection = (sIdx: number) => {
    if (!generatedDoc || generatedDoc.sections.length <= 1) return;
    setGeneratedDoc({
      ...generatedDoc,
      sections: generatedDoc.sections.filter((_, i) => i !== sIdx)
    });
  };

  // ==========================================================================
  // ÉCRAN DE RÉSULTAT DU DOCUMENT ÉDITABLE & APERÇU
  // ==========================================================================
  if (generatedDoc) {
    return (
      <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-900 select-text">
        {/* Header */}
        <header className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 px-3 sm:px-4 py-3 flex items-center justify-between z-20">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="p-2 -ml-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center focus:ring-2 focus:ring-blue-500"
              aria-label="Retour au menu Outils"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                {generatedDoc.titre || 'Formulaire généré'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Personnalise et télécharge ton formulaire
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition flex items-center gap-1.5 min-h-[44px] cursor-pointer focus:ring-2 focus:ring-blue-500"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Nouveau formulaire</span>
            </button>
          </div>
        </header>

        {/* Corps déroulant */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 max-w-3xl mx-auto w-full space-y-5">
          {/* CARTE : Analyse de ton idée */}
          {generatedDoc.analyse && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-4 sm:p-6 border border-slate-200/90 dark:border-slate-700/80 shadow-xs space-y-3.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    Analyse de ton idée
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Objectif et recommandations de conformité
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Objectif</span>
                  <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                    {generatedDoc.analyse.objectif}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Public visé</span>
                  <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                    {generatedDoc.analyse.public}
                  </p>
                </div>
              </div>

              {Array.isArray(generatedDoc.analyse.points_attention) &&
                generatedDoc.analyse.points_attention.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-900/50 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-300">
                      <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Points d'attention (consentement, protection des données) :</span>
                    </div>
                    <ul className="text-xs text-amber-800 dark:text-amber-300/90 space-y-1 pl-5 list-disc">
                      {generatedDoc.analyse.points_attention.map((pt, pIdx) => (
                        <li key={pIdx} className="leading-relaxed">
                          {pt}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          )}

          {/* Onglets : Éditeur vs Aperçu */}
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex rounded-2xl bg-white dark:bg-slate-800 p-1 border border-slate-200/90 dark:border-slate-700 shadow-2xs">
              <button
                type="button"
                onClick={() => setActiveView('editeur')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 min-h-[38px] cursor-pointer ${
                  activeView === 'editeur'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Éditeur</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveView('apercu')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 min-h-[38px] cursor-pointer ${
                  activeView === 'apercu'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Aperçu en direct</span>
              </button>
            </div>

            <span className="text-[11px] text-slate-500 dark:text-slate-400 italic hidden sm:inline">
              Modifications gratuites dans le navigateur
            </span>
          </div>

          {/* VUE 1 : ÉDITEUR */}
          {activeView === 'editeur' && (
            <div className="space-y-5">
              {/* Titre & Description du formulaire */}
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-700 shadow-xs space-y-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                    Titre du formulaire
                  </label>
                  <input
                    type="text"
                    value={generatedDoc.titre}
                    onChange={(e) => setGeneratedDoc({ ...generatedDoc, titre: e.target.value })}
                    className="w-full text-base sm:text-lg font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                    Description ou consigne générale
                  </label>
                  <textarea
                    rows={2}
                    value={generatedDoc.description || ''}
                    onChange={(e) => setGeneratedDoc({ ...generatedDoc, description: e.target.value })}
                    className="w-full text-xs sm:text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 leading-relaxed"
                  />
                </div>
              </div>

              {/* Sections et Champs */}
              {generatedDoc.sections.map((section, sIdx) => (
                <div
                  key={sIdx}
                  className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-700 shadow-xs space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                    <div className="flex-1 mr-2">
                      <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 block mb-1">
                        Section {sIdx + 1}
                      </span>
                      <input
                        type="text"
                        value={section.titre}
                        onChange={(e) => {
                          const newSections = [...generatedDoc.sections];
                          newSections[sIdx].titre = e.target.value;
                          setGeneratedDoc({ ...generatedDoc, sections: newSections });
                        }}
                        className="text-sm sm:text-base font-bold text-slate-900 dark:text-white bg-transparent border-b border-dashed border-slate-300 dark:border-slate-600 py-0.5 focus:outline-hidden focus:border-blue-500 w-full"
                      />
                    </div>
                    {generatedDoc.sections.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSection(sIdx)}
                        className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                        title="Supprimer cette section"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Champs de la section */}
                  <div className="space-y-3">
                    {section.champs.map((champ, fIdx) => (
                      <div
                        key={fIdx}
                        className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-700/60 space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            value={champ.libelle}
                            onChange={(e) => updateField(sIdx, fIdx, { libelle: e.target.value })}
                            placeholder="Libellé de la question"
                            className="flex-1 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-blue-500"
                          />

                          {/* Monter / Descendre */}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => moveField(sIdx, fIdx, 'up')}
                              disabled={fIdx === 0}
                              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                              title="Monter"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveField(sIdx, fIdx, 'down')}
                              disabled={fIdx === section.champs.length - 1}
                              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                              title="Descendre"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeField(sIdx, fIdx)}
                              className="p-1 text-slate-400 hover:text-red-500 cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                              title="Supprimer ce champ"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                              Type de champ
                            </label>
                            <select
                              value={champ.type}
                              onChange={(e) =>
                                updateField(sIdx, fIdx, {
                                  type: e.target.value as FormFieldType,
                                  options:
                                    e.target.value === 'choix_unique' || e.target.value === 'choix_multiple'
                                      ? champ.options && champ.options.length > 0
                                        ? champ.options
                                        : ['Option 1', 'Option 2']
                                      : undefined
                                })
                              }
                              className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500"
                            >
                              {(Object.keys(FIELD_TYPE_LABELS) as FormFieldType[]).map((t) => (
                                <option key={t} value={t}>
                                  {FIELD_TYPE_LABELS[t]}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center sm:justify-end gap-2 pt-4">
                            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                              <input
                                type="checkbox"
                                checked={Boolean(champ.obligatoire)}
                                onChange={(e) => updateField(sIdx, fIdx, { obligatoire: e.target.checked })}
                                className="w-4 h-4 text-blue-600 rounded-sm border-slate-300 focus:ring-blue-500"
                              />
                              <span>Champ obligatoire</span>
                            </label>
                          </div>
                        </div>

                        {/* Options pour choix unique ou multiple */}
                        {(champ.type === 'choix_unique' || champ.type === 'choix_multiple') && (
                          <div className="space-y-1.5 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                            <label className="block text-[10px] uppercase font-bold text-slate-400">
                              Options de réponse (séparées par des virgules) :
                            </label>
                            <input
                              type="text"
                              value={champ.options ? champ.options.join(', ') : ''}
                              onChange={(e) =>
                                updateField(sIdx, fIdx, {
                                  options: e.target.value.split(',').map((o) => o.trim()).filter(Boolean)
                                })
                              }
                              placeholder="ex. Option A, Option B, Option C"
                              className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        )}

                        {/* Aide sous le champ */}
                        <div>
                          <input
                            type="text"
                            value={champ.aide || ''}
                            onChange={(e) => updateField(sIdx, fIdx, { aide: e.target.value })}
                            placeholder="Texte d'aide ou consigne (optionnel)"
                            className="w-full text-[11px] text-slate-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => addField(sIdx)}
                    className="w-full py-2 border border-dashed border-blue-300 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer min-h-[40px]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter un champ dans cette section</span>
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={addSection}
                className="w-full py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
              >
                <Plus className="w-4 h-4" />
                <span>+ Ajouter une nouvelle section</span>
              </button>
            </div>
          )}

          {/* VUE 2 : APERÇU EN DIRECT DU FORMULAIRE */}
          {activeView === 'apercu' && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-8 border border-slate-200/90 dark:border-slate-700 shadow-xs space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-700 pb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  {generatedDoc.titre}
                </h2>
                {generatedDoc.description && (
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                    {generatedDoc.description}
                  </p>
                )}
              </div>

              {generatedDoc.sections.map((section, sIdx) => (
                <div key={sIdx} className="space-y-4">
                  <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 border-b border-blue-100 dark:border-blue-900/60 pb-1">
                    {sIdx + 1}. {section.titre}
                  </h3>

                  <div className="space-y-4 pl-1">
                    {section.champs.map((champ, fIdx) => (
                      <div key={fIdx} className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {champ.libelle}
                          {champ.obligatoire && <span className="text-red-500 font-bold ml-1">*</span>}
                        </label>
                        {champ.aide && (
                          <p className="text-[11px] text-slate-400 italic mb-1">{champ.aide}</p>
                        )}

                        {/* Rendu des types de champs */}
                        {champ.type === 'texte_long' && (
                          <textarea
                            rows={3}
                            disabled
                            placeholder="Zone de texte libre..."
                            className="w-full text-xs bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 cursor-not-allowed opacity-80"
                          />
                        )}

                        {champ.type === 'choix_unique' && (
                          <div className="space-y-1.5 pt-1">
                            {(champ.options && champ.options.length > 0 ? champ.options : ['Oui', 'Non']).map((opt, oIdx) => (
                              <label key={oIdx} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                                <input type="radio" disabled name={`preview_${sIdx}_${fIdx}`} className="text-blue-600" />
                                <span>{opt}</span>
                              </label>
                            ))}
                          </div>
                        )}

                        {champ.type === 'choix_multiple' && (
                          <div className="space-y-1.5 pt-1">
                            {(champ.options && champ.options.length > 0 ? champ.options : ['Option 1', 'Option 2']).map((opt, oIdx) => (
                              <label key={oIdx} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                                <input type="checkbox" disabled className="rounded-sm text-blue-600" />
                                <span>{opt}</span>
                              </label>
                            ))}
                          </div>
                        )}

                        {champ.type === 'case' && (
                          <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 pt-1">
                            <input type="checkbox" disabled className="rounded-sm text-blue-600" />
                            <span>J'accepte et je confirme les informations saisies</span>
                          </label>
                        )}

                        {champ.type === 'signature' && (
                          <div className="w-full sm:w-72 h-24 border border-dashed border-slate-300 dark:border-slate-600 rounded-2xl flex items-center justify-center text-xs text-slate-400">
                            Zone de signature
                          </div>
                        )}

                        {champ.type !== 'texte_long' &&
                          champ.type !== 'choix_unique' &&
                          champ.type !== 'choix_multiple' &&
                          champ.type !== 'case' &&
                          champ.type !== 'signature' && (
                            <input
                              type={champ.type === 'date' ? 'date' : champ.type === 'nombre' ? 'number' : champ.type === 'email' ? 'email' : 'text'}
                              disabled
                              placeholder={champ.type === 'date' ? '' : 'Ta réponse ici...'}
                              className="w-full text-xs bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 cursor-not-allowed opacity-80"
                            />
                          )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Boutons d'exportation */}
          <div className="space-y-2 pt-2 pb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => downloadFormPdf(generatedDoc)}
                className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer min-h-[48px] focus:ring-2 focus:ring-blue-500"
              >
                <FileDown className="w-5 h-5" />
                <span>Télécharger en PDF (Imprimable)</span>
              </button>

              <button
                type="button"
                onClick={() => downloadFormDocx(generatedDoc)}
                className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold rounded-2xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer min-h-[48px] focus:ring-2 focus:ring-slate-500"
              >
                <FileText className="w-5 h-5" />
                <span>Télécharger en Word (.docx)</span>
              </button>
            </div>

            <p className="text-center text-xs text-slate-500 dark:text-slate-400 italic">
              Relis toujours ton document avant de l'envoyer ou de l'imprimer.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // ÉTAPES DU FORMULAIRE ASSISTÉ (Étape 1 & Étape 2)
  // ==========================================================================
  return (
    <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-900 select-none">
      {/* Top Header */}
      <header className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 px-3 sm:px-4 py-3 flex items-center justify-between z-20">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="p-2 -ml-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center focus:ring-2 focus:ring-blue-500"
            aria-label="Retour au menu Outils"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
              Générer un formulaire
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {step === 1 ? "1. Décris ton idée" : "2. Récapitulatif"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            <Coins className="w-3.5 h-3.5 text-amber-500" />
            <span>{credits ?? 0}</span>
          </div>
        </div>
      </header>

      {/* Barre de progression */}
      <div className="shrink-0 bg-white dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800 px-4 py-2">
        <div className="max-w-xl mx-auto flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            Étape {step} sur 2
          </span>
          <span className="font-bold text-blue-600 dark:text-blue-400">
            {step === 1 ? '50%' : '100%'}
          </span>
        </div>
        <div className="max-w-xl mx-auto w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
            style={{ width: step === 1 ? '50%' : '100%' }}
          />
        </div>
      </div>

      {/* Contenu déroulant */}
      <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 max-w-xl mx-auto w-full select-text">
        {/* ÉTAPE 1 : Décris ton idée */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                1. Décris ton idée de formulaire
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Explique ce que tu veux collecter, l'IA créera les sections et champs adaptés.
              </p>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description de ton besoin <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  maxLength={1000}
                  value={inputData.idee}
                  onChange={(e) => setInputData({ ...inputData, idee: e.target.value })}
                  placeholder="ex. Formulaire d'inscription pour un tournoi de basketball des jeunes de la commune, avec coordonnées du capitaine, nom de l'équipe, liste des joueurs et autorisation parentale."
                  className="w-full text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden leading-relaxed"
                />
                <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                  <span>Minimum 10 caractères</span>
                  <span>{inputData.idee.length} / 1000</span>
                </div>
              </div>

              {/* Exemples cliquables */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Ou choisis un exemple pour démarrer :
                </span>
                <div className="flex flex-wrap gap-2">
                  {EXEMPLES_IDEE.map((exemple) => (
                    <button
                      key={exemple}
                      type="button"
                      onClick={() => setInputData({ ...inputData, idee: exemple })}
                      className="px-3 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 text-slate-700 dark:text-slate-300 transition text-left cursor-pointer min-h-[36px]"
                    >
                      💡 {exemple}
                    </button>
                  ))}
                </div>
              </div>

              {/* Champs facultatifs */}
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Qui va le remplir ? (facultatif)
                  </label>
                  <input
                    type="text"
                    value={inputData.public || ''}
                    onChange={(e) => setInputData({ ...inputData, public: e.target.value })}
                    placeholder="ex. Parents d'élèves, Clients particuliers, Candidats..."
                    className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Contexte ou entreprise (facultatif)
                  </label>
                  <input
                    type="text"
                    value={inputData.contexte || ''}
                    onChange={(e) => setInputData({ ...inputData, contexte: e.target.value })}
                    placeholder="ex. Club sportif municipal, Agence événementielle, Établissement scolaire..."
                    className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden min-h-[44px]"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ÉTAPE 2 : Récapitulatif & Lancement */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                2. Récapitulatif avant analyse
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                L'IA analysera ton idée, créera la structure et les points d'attention légaux.
              </p>
            </div>

            {/* Récapitulatif */}
            <div className="p-4 rounded-3xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-2.5 text-xs">
              <div>
                <span className="text-slate-500 block mb-0.5">Ton idée :</span>
                <p className="font-semibold text-slate-900 dark:text-white leading-relaxed">
                  "{inputData.idee}"
                </p>
              </div>
              {inputData.public && (
                <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2 text-slate-600 dark:text-slate-400">
                  <span>Public :</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{inputData.public}</span>
                </div>
              )}
              {inputData.contexte && (
                <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2 text-slate-600 dark:text-slate-400">
                  <span>Contexte :</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{inputData.contexte}</span>
                </div>
              )}
            </div>

            {/* Coût et solde */}
            <div className="p-4 rounded-3xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs text-slate-600 dark:text-slate-400">Coût de la génération</span>
                <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-amber-500" />
                  <span>{FORM_COST} crédits</span>
                </div>
              </div>

              <div className="text-right space-y-0.5">
                <span className="text-xs text-slate-600 dark:text-slate-400">Solde disponible</span>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {credits ?? 0} crédit{(credits ?? 0) > 1 ? 's' : ''}
                </div>
              </div>
            </div>

            {/* Message d'erreur s'il y en a */}
            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <p>{errorMsg}</p>
              </div>
            )}

            {/* Actions de Génération */}
            <div className="pt-2">
              {(credits ?? 0) < FORM_COST || showRechargeButton ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled
                    className="w-full py-3.5 px-4 bg-slate-300 dark:bg-slate-700 text-slate-500 font-bold rounded-2xl cursor-not-allowed text-xs sm:text-sm min-h-[48px]"
                  >
                    Analyser et générer (2 crédits) — Solde insuffisant
                  </button>
                  <button
                    type="button"
                    onClick={onOpenRecharge}
                    className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm min-h-[48px] focus:ring-2 focus:ring-amber-400"
                  >
                    <Coins className="w-4 h-4" />
                    <span>Recharger mes crédits</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm min-h-[48px] focus:ring-2 focus:ring-blue-500"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Rédaction et analyse en cours…</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Analyser et générer (2 crédits)</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Barre de navigation inférieure */}
      <footer className="shrink-0 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 p-3 sm:px-4 z-20">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition flex items-center gap-1.5 cursor-pointer min-h-[44px] focus:ring-2 focus:ring-blue-500"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Précédent</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-red-500 transition cursor-pointer min-h-[44px]"
            >
              Effacer le brouillon
            </button>
          )}

          {step < 2 && (
            <button
              type="button"
              onClick={() => {
                if (inputData.idee.trim().length >= 10) {
                  setErrorMsg(null);
                  setStep(2);
                } else {
                  setErrorMsg("Merci de décrire ton idée avec au moins 10 caractères.");
                }
              }}
              disabled={inputData.idee.trim().length < 10}
              className={`px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition flex items-center gap-1.5 min-h-[44px] focus:ring-2 focus:ring-blue-500 ${
                inputData.idee.trim().length >= 10
                  ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-xs'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span>Suivant</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};
