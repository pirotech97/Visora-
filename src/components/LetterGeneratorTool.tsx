import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  FileDown,
  RotateCcw,
  Sparkles,
  Coins,
  AlertCircle,
  FileText,
  Plus,
  Trash2,
  CheckCircle2,
  Palette,
  Sliders,
  Type,
  Check
} from 'lucide-react';
import type {
  UserProfile,
  LettreInputData,
  LettreOutputDocument
} from '../types';
import { genererDocumentAdministrative } from '../services/supabase';
import { downloadLettrePdf, downloadLettreDocx } from '../services/adminDocGenerators';
import { LetterPreviewRenderer } from './LetterPreviewRenderer';
import {
  LETTER_TEMPLATES,
  PRESET_ACCENT_COLORS,
  LetterDesignOptions,
  loadLetterDesignPrefs,
  saveLetterDesignPrefs
} from '../services/adminDesignEngine';

interface LetterGeneratorToolProps {
  user: UserProfile;
  credits: number | null;
  onBack: () => void;
  onOpenRecharge: () => void;
  onCreditsChange: (newCredits: number) => void;
}

const STORAGE_KEY = 'visora_draft_lettre';
const LETTRE_COST = 1;

function getTodayFormatted(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const months = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
  ];
  const month = months[now.getMonth()];
  const year = now.getFullYear();
  return `${day} ${month} ${year}`;
}

const DEFAULT_INPUT: LettreInputData = {
  type_lettre: 'emploi',
  expediteur: {
    nom: '',
    adresse: '',
    telephone: '',
    email: ''
  },
  destinataire: {
    nom: '',
    fonction: 'Direction des Ressources Humaines',
    organisation: '',
    adresse: ''
  },
  lieu: 'Lomé',
  date: getTodayFormatted(),
  objet: '',
  points: [''],
  ton: 'formel'
};

const TYPES_LETTRE: Array<{ id: string; label: string; description: string }> = [
  { id: 'emploi', label: 'Emploi', description: 'Candidature spontanée ou réponse à une offre' },
  { id: 'motivation', label: 'Motivation', description: 'Stage, formation ou projet académique' },
  { id: 'demande', label: 'Demande', description: 'Démarche administrative, attestation, recours' },
  { id: 'autre', label: 'Autre', description: 'Courrier officiel ou demande spécifique' }
];

const TONS: Array<{ id: 'formel' | 'chaleureux'; label: string; description: string }> = [
  { id: 'formel', label: 'Formel', description: 'Professionnel, respectueux des usages administratifs' },
  { id: 'chaleureux', label: 'Chaleureux', description: 'Plus personnel, engageant et dynamique' }
];

export const LetterGeneratorTool: React.FC<LetterGeneratorToolProps> = ({
  user,
  credits,
  onBack,
  onOpenRecharge,
  onCreditsChange
}) => {
  const [step, setStep] = useState<number>(1);
  const [inputData, setInputData] = useState<LettreInputData>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return {
      ...DEFAULT_INPUT,
      expediteur: {
        nom: [user.prenoms, user.nom].filter(Boolean).join(' ') || '',
        email: user.email || '',
        telephone: user.whatsapp || '',
        adresse: user.pays || 'Lomé, Togo'
      },
      lieu: user.pays ? user.pays.split(',')[0].trim() : 'Lomé'
    };
  });

  const [generatedDoc, setGeneratedDoc] = useState<LettreOutputDocument | null>(null);
  const [designOptions, setDesignOptions] = useState<LetterDesignOptions>(() => loadLetterDesignPrefs());
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showRechargeButton, setShowRechargeButton] = useState<boolean>(false);

  const updateDesignOptions = (patch: Partial<LetterDesignOptions>) => {
    setDesignOptions((prev) => {
      const next = { ...prev, ...patch };
      saveLetterDesignPrefs(next);
      return next;
    });
  };

  // Sauvegarde brouillon dans sessionStorage
  useEffect(() => {
    if (!generatedDoc) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(inputData));
    }
  }, [inputData, generatedDoc]);

  const handleReset = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setInputData({
      ...DEFAULT_INPUT,
      expediteur: {
        nom: [user.prenoms, user.nom].filter(Boolean).join(' ') || '',
        email: user.email || '',
        telephone: user.whatsapp || '',
        adresse: user.pays || 'Lomé, Togo'
      },
      lieu: user.pays ? user.pays.split(',')[0].trim() : 'Lomé'
    });
    setGeneratedDoc(null);
    setStep(1);
    setErrorMsg(null);
    setShowRechargeButton(false);
  };

  // Gestion des points clés (1 à 10)
  const addPoint = () => {
    if (inputData.points.length >= 10) return;
    setInputData((prev) => ({
      ...prev,
      points: [...prev.points, '']
    }));
  };

  const updatePoint = (index: number, val: string) => {
    setInputData((prev) => {
      const updated = [...prev.points];
      updated[index] = val;
      return { ...prev, points: updated };
    });
  };

  const removePoint = (index: number) => {
    if (inputData.points.length <= 1) return;
    setInputData((prev) => ({
      ...prev,
      points: prev.points.filter((_, i) => i !== index)
    }));
  };

  // Appel de l'Edge Function Supabase
  const handleGenerate = async () => {
    setErrorMsg(null);
    setShowRechargeButton(false);

    if ((credits ?? 0) < LETTRE_COST) {
      setErrorMsg('Crédits insuffisants. Recharger pour continuer.');
      setShowRechargeButton(true);
      return;
    }

    setIsGenerating(true);

    const payload = {
      type_lettre: inputData.type_lettre,
      expediteur: {
        nom: inputData.expediteur.nom.trim(),
        adresse: inputData.expediteur.adresse.trim(),
        telephone: inputData.expediteur.telephone.trim(),
        email: inputData.expediteur.email.trim()
      },
      destinataire: {
        nom: inputData.destinataire.nom.trim(),
        fonction: inputData.destinataire.fonction.trim(),
        organisation: inputData.destinataire.organisation.trim(),
        adresse: inputData.destinataire.adresse.trim()
      },
      lieu: inputData.lieu.trim(),
      date: inputData.date.trim(),
      objet: inputData.objet.trim(),
      points: inputData.points.map((p) => p.trim()).filter(Boolean),
      ton: inputData.ton
    };

    const res = await genererDocumentAdministrative('lettre', payload);
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
      sessionStorage.removeItem(STORAGE_KEY);
      setGeneratedDoc(res.document);
    } else {
      setErrorMsg('La génération a échoué. Réessaie.');
    }
  };

  const isCurrentStepValid = () => {
    if (step === 1) return Boolean(inputData.type_lettre);
    if (step === 2) return Boolean(inputData.expediteur.nom.trim());
    if (step === 3) return true;
    if (step === 4) return Boolean(inputData.objet.trim());
    if (step === 5) return inputData.points.some((p) => p.trim().length > 0);
    return true;
  };

  // ==========================================================================
  // ÉCRAN DE RÉSULTAT DU DOCUMENT ÉDITABLE
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
                Ta lettre administrative
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Aperçu et personnalisation avant export
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
              <span>Recommencer</span>
            </button>
          </div>
        </header>

        {/* Corps déroulant */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 max-w-3xl mx-auto w-full space-y-5">
          {/* GALERIE DE MODÈLES DE DESIGN */}
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Modèles de lettre ({LETTER_TEMPLATES.length})
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Changer de modèle est gratuit (0 crédit)
              </span>
            </div>

            {/* Rangée de miniatures : défilement horizontal sur mobile, grille sur ordi */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 overflow-x-auto pb-1">
              {LETTER_TEMPLATES.map((tmpl) => {
                const isSelected = designOptions.templateId === tmpl.id;
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => updateDesignOptions({ templateId: tmpl.id })}
                    className={`relative p-3 rounded-xl border-2 text-left transition flex flex-col justify-between cursor-pointer min-h-[92px] focus:ring-2 focus:ring-blue-500 ${
                      isSelected
                        ? 'border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-950/30 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900/50'
                    }`}
                  >
                    {/* Miniature visuelle simplifiée */}
                    <div className="w-full h-10 rounded-md bg-slate-100 dark:bg-slate-800 p-1.5 mb-2 flex flex-col justify-between overflow-hidden pointer-events-none">
                      {tmpl.id === 'classique' ? (
                        <>
                          <div className="flex justify-between items-start">
                            <div className="w-1/3 h-1 bg-slate-400 dark:bg-slate-500 rounded-xs" />
                            <div className="w-1/4 h-1 bg-slate-300 dark:bg-slate-600 rounded-xs" />
                          </div>
                          <div className="w-2/5 h-1 rounded-xs" style={{ backgroundColor: designOptions.accentColor }} />
                          <div className="space-y-0.5">
                            <div className="w-full h-0.5 bg-slate-300 dark:bg-slate-600 rounded-xs" />
                            <div className="w-4/5 h-0.5 bg-slate-200 dark:bg-slate-700 rounded-xs" />
                          </div>
                        </>
                      ) : tmpl.id === 'moderne' ? (
                        <>
                          <div className="w-full h-2 rounded-xs" style={{ backgroundColor: designOptions.accentColor }} />
                          <div className="flex gap-1 h-full pt-1">
                            <div className="w-1/4 h-full bg-slate-200 dark:bg-slate-700 rounded-xs" />
                            <div className="w-3/4 space-y-0.5">
                              <div className="w-full h-0.5 bg-slate-300 dark:bg-slate-600 rounded-xs" />
                              <div className="w-4/5 h-0.5 bg-slate-200 dark:bg-slate-700 rounded-xs" />
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-1/2 h-1.5 bg-slate-800 dark:bg-slate-200 rounded-xs" />
                          <div className="w-full h-0.5 rounded-full" style={{ backgroundColor: designOptions.accentColor }} />
                          <div className="space-y-0.5">
                            <div className="w-full h-0.5 bg-slate-300 dark:bg-slate-600 rounded-xs" />
                            <div className="w-3/4 h-0.5 bg-slate-200 dark:bg-slate-700 rounded-xs" />
                          </div>
                        </>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                          {tmpl.name}
                        </span>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2">
                        {tmpl.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RÉGLAGES DE PERSONNALISATION DU STYLE */}
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs space-y-4">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Personnalisation du style
              </h3>
            </div>

            {/* Couleur d'accent */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Couleur d'accent
                </span>
                <span className="text-slate-400 text-[11px] font-mono uppercase">
                  {designOptions.accentColor}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {PRESET_ACCENT_COLORS.map((preset) => {
                  const isCurrent = designOptions.accentColor.toLowerCase() === preset.hex.toLowerCase();
                  return (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => updateDesignOptions({ accentColor: preset.hex })}
                      title={preset.name}
                      aria-label={`Couleur ${preset.name}`}
                      className={`w-7 h-7 rounded-full transition-transform cursor-pointer flex items-center justify-center min-h-[28px] min-w-[28px] focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                        isCurrent
                          ? 'scale-110 ring-2 ring-offset-2 ring-blue-600 dark:ring-offset-slate-900'
                          : 'hover:scale-105 opacity-90'
                      }`}
                      style={{ backgroundColor: preset.hex }}
                    >
                      {isCurrent && <Check className="w-3.5 h-3.5 text-white drop-shadow-xs" />}
                    </button>
                  );
                })}

                {/* Sélecteur libre */}
                <label
                  title="Choisir une couleur personnalisée"
                  className="w-7 h-7 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-slate-400 cursor-pointer flex items-center justify-center relative overflow-hidden transition"
                >
                  <input
                    type="color"
                    value={designOptions.accentColor}
                    onChange={(e) => updateDesignOptions({ accentColor: e.target.value })}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <Palette className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300 pointer-events-none" />
                </label>
              </div>
            </div>

            {/* Police & Taille du texte */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100 dark:border-slate-700/80">
              {/* Police */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-slate-400" />
                  Police d'écriture
                </span>
                <div className="grid grid-cols-2 gap-1.5 bg-slate-100 dark:bg-slate-700/80 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => updateDesignOptions({ fontFamily: 'sans' })}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold transition min-h-[38px] cursor-pointer ${
                      designOptions.fontFamily === 'sans'
                        ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Sans (Moderne)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateDesignOptions({ fontFamily: 'serif' })}
                    className={`py-2 px-3 rounded-lg text-xs font-serif font-semibold transition min-h-[38px] cursor-pointer ${
                      designOptions.fontFamily === 'serif'
                        ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Sérif (Élégant)
                  </button>
                </div>
              </div>

              {/* Taille */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Taille du texte
                </span>
                <div className="grid grid-cols-2 gap-1.5 bg-slate-100 dark:bg-slate-700/80 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => updateDesignOptions({ fontSize: 'normal' })}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold transition min-h-[38px] cursor-pointer ${
                      designOptions.fontSize === 'normal'
                        ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Normale
                  </button>
                  <button
                    type="button"
                    onClick={() => updateDesignOptions({ fontSize: 'compact' })}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold transition min-h-[38px] cursor-pointer ${
                      designOptions.fontSize === 'compact'
                        ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Compacte (A4)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Rendu dynamique du modèle sélectionné */}
          <LetterPreviewRenderer
            document={generatedDoc}
            onChange={setGeneratedDoc}
            options={designOptions}
          />

          {/* Boutons d'exportation */}
          <div className="space-y-2 pt-2 pb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => downloadLettrePdf(generatedDoc, designOptions)}
                className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer min-h-[48px] focus:ring-2 focus:ring-blue-500"
              >
                <FileDown className="w-5 h-5" />
                <span>Télécharger en PDF</span>
              </button>

              <button
                type="button"
                onClick={() => downloadLettreDocx(generatedDoc, designOptions)}
                className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold rounded-2xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer min-h-[48px] focus:ring-2 focus:ring-slate-500"
              >
                <FileText className="w-5 h-5" />
                <span>Télécharger en Word (.docx)</span>
              </button>
            </div>

            <p className="text-center text-xs text-slate-500 dark:text-slate-400 italic">
              Relis toujours ton document avant de l'envoyer.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // ÉTAPES DU FORMULAIRE ASSISTÉ
  // ==========================================================================
  const progressPercent = Math.round((step / 6) * 100);

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
              Lettre de demande ou d'emploi
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              Assistant étape par étape
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
            Étape {step} sur 6
          </span>
          <span className="font-semibold text-blue-600 dark:text-blue-400">
            {progressPercent}%
          </span>
        </div>
        <div className="max-w-xl mx-auto w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Contenu déroulant */}
      <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 max-w-xl mx-auto w-full select-text">
        {/* ÉTAPE 1 : Type de lettre */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                1. Quel type de lettre souhaites-tu rédiger ?
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Choisis le modèle le plus adapté à ta démarche.
              </p>
            </div>

            <div className="space-y-2.5">
              {TYPES_LETTRE.map((item) => {
                const isSelected = inputData.type_lettre === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setInputData({ ...inputData, type_lettre: item.id })}
                    className={`w-full p-4 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer min-h-[52px] ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/30'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <span className="text-xs sm:text-sm font-semibold block">{item.label}</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">{item.description}</span>
                    </div>
                    {isSelected && <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ÉTAPE 2 : Expéditeur */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                2. Tes coordonnées (Expéditeur)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Placées en haut à gauche de la lettre.
              </p>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nom complet <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={inputData.expediteur.nom}
                  onChange={(e) =>
                    setInputData({
                      ...inputData,
                      expediteur: { ...inputData.expediteur, nom: e.target.value }
                    })
                  }
                  placeholder="ex. Koffi Mensah"
                  className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Adresse postale ou quartier
                </label>
                <input
                  type="text"
                  value={inputData.expediteur.adresse}
                  onChange={(e) =>
                    setInputData({
                      ...inputData,
                      expediteur: { ...inputData.expediteur, adresse: e.target.value }
                    })
                  }
                  placeholder="ex. Quartier Tokoin, BP 1234, Lomé"
                  className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden min-h-[44px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={inputData.expediteur.telephone}
                    onChange={(e) =>
                      setInputData({
                        ...inputData,
                        expediteur: { ...inputData.expediteur, telephone: e.target.value }
                      })
                    }
                    placeholder="+228 90 00 00 00"
                    className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={inputData.expediteur.email}
                    onChange={(e) =>
                      setInputData({
                        ...inputData,
                        expediteur: { ...inputData.expediteur, email: e.target.value }
                      })
                    }
                    placeholder="koffi.mensah@email.com"
                    className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden min-h-[44px]"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ÉTAPE 3 : Destinataire */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                3. Le Destinataire
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                À qui s'adresse ce document ?
              </p>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Entreprise / Organisme / Ministère
                </label>
                <input
                  type="text"
                  value={inputData.destinataire.organisation}
                  onChange={(e) =>
                    setInputData({
                      ...inputData,
                      destinataire: { ...inputData.destinataire, organisation: e.target.value }
                    })
                  }
                  placeholder="ex. Moov Africa Togo, Ministère de la Fonction Publique"
                  className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Service ou Titre du destinataire
                </label>
                <input
                  type="text"
                  value={inputData.destinataire.fonction}
                  onChange={(e) =>
                    setInputData({
                      ...inputData,
                      destinataire: { ...inputData.destinataire, fonction: e.target.value }
                    })
                  }
                  placeholder="ex. Direction des Ressources Humaines, Monsieur le Directeur"
                  className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nom du destinataire (si connu)
                </label>
                <input
                  type="text"
                  value={inputData.destinataire.nom}
                  onChange={(e) =>
                    setInputData({
                      ...inputData,
                      destinataire: { ...inputData.destinataire, nom: e.target.value }
                    })
                  }
                  placeholder="ex. M. Jean Dupont (optionnel)"
                  className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Adresse postale ou Ville du destinataire
                </label>
                <input
                  type="text"
                  value={inputData.destinataire.adresse}
                  onChange={(e) =>
                    setInputData({
                      ...inputData,
                      destinataire: { ...inputData.destinataire, adresse: e.target.value }
                    })
                  }
                  placeholder="ex. Boulevard de la Paix, Lomé, Togo"
                  className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden min-h-[44px]"
                />
              </div>
            </div>
          </div>
        )}

        {/* ÉTAPE 4 : Lieu, Date & Objet */}
        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                4. Lieu, Date & Objet
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Précise la localisation et l'objet de ta démarche.
              </p>
            </div>

            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Ville d'envoi
                  </label>
                  <input
                    type="text"
                    value={inputData.lieu}
                    onChange={(e) => setInputData({ ...inputData, lieu: e.target.value })}
                    placeholder="Lomé"
                    className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Date
                  </label>
                  <input
                    type="text"
                    value={inputData.date}
                    onChange={(e) => setInputData({ ...inputData, date: e.target.value })}
                    placeholder="ex. 24 octobre 2026"
                    className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Objet de la lettre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={inputData.objet}
                  onChange={(e) => setInputData({ ...inputData, objet: e.target.value })}
                  placeholder="ex. Candidature au poste de Chargé de clientèle — Réf. 12345"
                  className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden min-h-[44px]"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Exemples : Candidature au poste de Développeur Full Stack ; Demande de stage académique ; Demande d'attestation de travail
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ÉTAPE 5 : Points clés à aborder */}
        {step === 5 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  5. Arguments et points clés
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  1 à 10 points essentiels que l'IA doit développer.
                </p>
              </div>
              <button
                type="button"
                onClick={addPoint}
                disabled={inputData.points.length >= 10}
                className="px-3 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-xl transition flex items-center gap-1 cursor-pointer min-h-[44px]"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter</span>
              </button>
            </div>

            <div className="space-y-3">
              {inputData.points.map((pt, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center shrink-0">
                    {index + 1}
                  </span>
                  <input
                    type="text"
                    value={pt}
                    onChange={(e) => updatePoint(index, e.target.value)}
                    placeholder={
                      index === 0
                        ? "ex. Diplômé en informatique avec 3 ans d'expérience en gestion de projet..."
                        : index === 1
                        ? "ex. Très motivé par les projets d'innovation portés par votre structure..."
                        : "ex. Disponible immédiatement pour un entretien..."
                    }
                    className="flex-1 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                  />
                  {inputData.points.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePoint(index)}
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
                      title="Supprimer ce point"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
              Conseil : note tes arguments sous forme d'idées simples, l'IA se charge de la syntaxe et de l'élégance de la rédaction.
            </p>
          </div>
        )}

        {/* ÉTAPE 6 : Ton souhaité & Récapitulatif */}
        {step === 6 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                6. Ton & Récapitulatif
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Choisis le style rédactionnel avant de générer.
              </p>
            </div>

            {/* Ton souhaité */}
            <div className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs space-y-2.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Ton de la rédaction
              </label>
              <div className="space-y-2">
                {TONS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setInputData({ ...inputData, ton: t.id })}
                    className={`w-full p-3.5 rounded-xl border text-left transition flex items-center justify-between cursor-pointer min-h-[44px] ${
                      inputData.ton === t.id
                        ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/30'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div>
                      <span className="text-xs sm:text-sm font-semibold block">{t.label}</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">{t.description}</span>
                    </div>
                    {inputData.ton === t.id && <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Récapitulatif */}
            <div className="p-4 rounded-3xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Type de lettre :</span>
                <span className="font-semibold text-slate-900 dark:text-white capitalize">
                  {TYPES_LETTRE.find((item) => item.id === inputData.type_lettre)?.label || inputData.type_lettre}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Destinataire :</span>
                <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[220px]">
                  {inputData.destinataire.organisation || inputData.destinataire.fonction || inputData.destinataire.nom || 'Non spécifié'}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Objet :</span>
                <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[220px]">
                  {inputData.objet}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Ton :</span>
                <span className="font-semibold text-slate-900 dark:text-white capitalize">
                  {TONS.find((item) => item.id === inputData.ton)?.label || inputData.ton}
                </span>
              </div>
            </div>

            {/* Coût et solde */}
            <div className="p-4 rounded-3xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs text-slate-600 dark:text-slate-400">Coût de la rédaction</span>
                <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-amber-500" />
                  <span>{LETTRE_COST} crédit</span>
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
              {(credits ?? 0) < LETTRE_COST || showRechargeButton ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled
                    className="w-full py-3.5 px-4 bg-slate-300 dark:bg-slate-700 text-slate-500 font-bold rounded-2xl cursor-not-allowed text-xs sm:text-sm min-h-[48px]"
                  >
                    Générer ma lettre (1 crédit) — Solde insuffisant
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
                      <span>Rédaction en cours…</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Générer ma lettre (1 crédit)</span>
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

          {step < 6 && (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              disabled={!isCurrentStepValid()}
              className={`px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition flex items-center gap-1.5 min-h-[44px] focus:ring-2 focus:ring-blue-500 ${
                isCurrentStepValid()
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
