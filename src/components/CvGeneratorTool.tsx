import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  FileDown,
  RotateCcw,
  Sparkles,
  Coins,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  GraduationCap,
  User,
  Wrench,
  FileText,
  HelpCircle,
  Layers,
  ChevronDown,
  Palette,
  Image as ImageIcon,
  Check,
  Sliders,
  EyeOff,
  Type,
  X
} from 'lucide-react';
import type {
  UserProfile,
  CvInputData,
  CvOutputDocument,
  CvExperienceInput,
  CvFormationInput,
  CvLangueInput
} from '../types';
import { genererDocumentAdministrative } from '../services/supabase';
import { downloadCvPdf, downloadCvDocx } from '../services/adminDocGenerators';
import { CvPreviewRenderer } from './CvPreviewRenderer';
import {
  CV_TEMPLATES,
  PRESET_ACCENT_COLORS,
  CvDesignOptions,
  CvTemplateId,
  loadCvDesignPrefs,
  saveCvDesignPrefs,
  processProfilePhoto
} from '../services/cvDesignEngine';

interface CvGeneratorToolProps {
  user: UserProfile;
  credits: number | null;
  onBack: () => void;
  onOpenRecharge: () => void;
  onCreditsChange: (newCredits: number) => void;
}

const STORAGE_KEY = 'visora_draft_cv';
const CV_COST = 2;

const DEFAULT_INPUT: CvInputData = {
  nom: '',
  titre_vise: '',
  email: '',
  telephone: '',
  ville: '',
  resume: '',
  auto_redaction_resume: false,
  experiences: [
    {
      poste: '',
      employeur: '',
      lieu: '',
      debut: '',
      fin: 'Actuellement',
      description: ''
    }
  ],
  formations: [
    {
      diplome: '',
      etablissement: '',
      lieu: '',
      annee: ''
    }
  ],
  competences: [],
  langues: [
    { langue: 'Français', niveau: 'Courant' }
  ],
  centres_interet: []
};

export const CvGeneratorTool: React.FC<CvGeneratorToolProps> = ({
  user,
  credits,
  onBack,
  onOpenRecharge,
  onCreditsChange
}) => {
  const [step, setStep] = useState<number>(1);
  const [inputData, setInputData] = useState<CvInputData>(() => {
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
      nom: [user.prenoms, user.nom].filter(Boolean).join(' ') || '',
      email: user.email || ''
    };
  });

  // Generated document state
  const [generatedDoc, setGeneratedDoc] = useState<CvOutputDocument | null>(null);
  const [designOptions, setDesignOptions] = useState<CvDesignOptions>(() => loadCvDesignPrefs());
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showRechargeButton, setShowRechargeButton] = useState<boolean>(false);
  const [tagInput, setTagInput] = useState<string>('');
  const [interestInput, setInterestInput] = useState<string>('');
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState<boolean>(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Mise à jour et persistance des réglages de design
  const updateDesignOptions = (patch: Partial<CvDesignOptions>) => {
    setDesignOptions((prev) => {
      const updated = {
        ...prev,
        ...patch,
        hiddenSections: {
          ...prev.hiddenSections,
          ...(patch.hiddenSections || {})
        }
      };
      saveCvDesignPrefs(updated);
      return updated;
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError(null);
    setIsProcessingPhoto(true);
    try {
      const dataUrl = await processProfilePhoto(file, designOptions.photoShape);
      updateDesignOptions({ photoUrl: dataUrl });
    } catch (err: any) {
      setPhotoError(err.message || 'Impossible de charger cette image.');
    } finally {
      setIsProcessingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handleTogglePhotoShape = () => {
    const newShape = designOptions.photoShape === 'round' ? 'square' : 'round';
    updateDesignOptions({ photoShape: newShape });
  };

  const handleRemovePhoto = () => {
    updateDesignOptions({ photoUrl: null });
    setPhotoError(null);
  };

  // Save draft in sessionStorage
  useEffect(() => {
    if (!generatedDoc) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(inputData));
    }
  }, [inputData, generatedDoc]);

  const handleReset = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setInputData({
      ...DEFAULT_INPUT,
      nom: [user.prenoms, user.nom].filter(Boolean).join(' ') || '',
      email: user.email || ''
    });
    setGeneratedDoc(null);
    setStep(1);
    setErrorMsg(null);
    setShowRechargeButton(false);
  };

  // Experience handlers
  const addExperience = () => {
    if (inputData.experiences.length >= 8) return;
    setInputData((prev) => ({
      ...prev,
      experiences: [
        ...prev.experiences,
        { poste: '', employeur: '', lieu: '', debut: '', fin: '', description: '' }
      ]
    }));
  };

  const updateExperience = (index: number, field: keyof CvExperienceInput, val: string) => {
    setInputData((prev) => {
      const exps = [...prev.experiences];
      exps[index] = { ...exps[index], [field]: val };
      return { ...prev, experiences: exps };
    });
  };

  const removeExperience = (index: number) => {
    if (inputData.experiences.length <= 1) return;
    setInputData((prev) => ({
      ...prev,
      experiences: prev.experiences.filter((_, i) => i !== index)
    }));
  };

  // Formation handlers
  const addFormation = () => {
    if (inputData.formations.length >= 6) return;
    setInputData((prev) => ({
      ...prev,
      formations: [
        ...prev.formations,
        { diplome: '', etablissement: '', lieu: '', annee: '' }
      ]
    }));
  };

  const updateFormation = (index: number, field: keyof CvFormationInput, val: string) => {
    setInputData((prev) => {
      const forms = [...prev.formations];
      forms[index] = { ...forms[index], [field]: val };
      return { ...prev, formations: forms };
    });
  };

  const removeFormation = (index: number) => {
    if (inputData.formations.length <= 1) return;
    setInputData((prev) => ({
      ...prev,
      formations: prev.formations.filter((_, i) => i !== index)
    }));
  };

  // Competence tags
  const addCompetence = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !inputData.competences.includes(trimmed)) {
      setInputData((prev) => ({
        ...prev,
        competences: [...prev.competences, trimmed]
      }));
      setTagInput('');
    }
  };

  const removeCompetence = (item: string) => {
    setInputData((prev) => ({
      ...prev,
      competences: prev.competences.filter((c) => c !== item)
    }));
  };

  // Langues
  const addLangue = () => {
    setInputData((prev) => ({
      ...prev,
      langues: [...prev.langues, { langue: '', niveau: 'Intermédiaire' }]
    }));
  };

  const updateLangue = (index: number, field: keyof CvLangueInput, val: string) => {
    setInputData((prev) => {
      const langs = [...prev.langues];
      langs[index] = { ...langs[index], [field]: val };
      return { ...prev, langues: langs };
    });
  };

  const removeLangue = (index: number) => {
    setInputData((prev) => ({
      ...prev,
      langues: prev.langues.filter((_, i) => i !== index)
    }));
  };

  // Centres d'intérêt
  const addInterest = () => {
    const trimmed = interestInput.trim();
    if (trimmed && !inputData.centres_interet.includes(trimmed)) {
      setInputData((prev) => ({
        ...prev,
        centres_interet: [...prev.centres_interet, trimmed]
      }));
      setInterestInput('');
    }
  };

  const removeInterest = (item: string) => {
    setInputData((prev) => ({
      ...prev,
      centres_interet: prev.centres_interet.filter((i) => i !== item)
    }));
  };

  // Invocation de la fonction
  const handleGenerate = async () => {
    setErrorMsg(null);
    setShowRechargeButton(false);

    if ((credits ?? 0) < CV_COST) {
      setErrorMsg('Crédits insuffisants. Recharger pour continuer.');
      setShowRechargeButton(true);
      return;
    }

    setIsGenerating(true);

    const payload = {
      nom: inputData.nom.trim(),
      titre_vise: inputData.titre_vise.trim(),
      email: inputData.email.trim(),
      telephone: inputData.telephone.trim(),
      ville: inputData.ville.trim(),
      resume: inputData.auto_redaction_resume ? '' : inputData.resume.trim(),
      auto_redaction_resume: Boolean(inputData.auto_redaction_resume),
      experiences: inputData.experiences.filter((e) => e.poste.trim() || e.employeur.trim()),
      formations: inputData.formations.filter((f) => f.diplome.trim() || f.etablissement.trim()),
      competences: inputData.competences,
      langues: inputData.langues.filter((l) => l.langue.trim()),
      centres_interet: inputData.centres_interet
    };

    const res = await genererDocumentAdministrative('cv', payload);
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
    if (step === 1) {
      return Boolean(inputData.nom.trim() && inputData.titre_vise.trim() && inputData.email.trim());
    }
    return true;
  };

  // ==========================================================================
  // ÉCRAN DE RÉSULTAT DU DOCUMENT ÉDITABLE
  // ==========================================================================
  if (generatedDoc) {
    const hasReplacementWarning =
      Boolean(generatedDoc.verification?.passages_remplaces_par_ton_texte &&
      generatedDoc.verification.passages_remplaces_par_ton_texte > 0);

    return (
      <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-900">
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
                Ton CV professionnel
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
              <span className="hidden sm:inline">Nouveau CV</span>
            </button>
          </div>
        </header>

        {/* Corps déroulant */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 max-w-3xl mx-auto w-full space-y-5">
          {/* Avertissement chiffres remplacés */}
          {hasReplacementWarning && (
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p>
                Certains passages proposés par l'IA contenaient des chiffres absents de ta saisie : ils ont été remplacés par tes propres mots.
              </p>
            </div>
          )}

          {/* GALERIE DE MODÈLES DE DESIGN */}
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Modèles de design ({CV_TEMPLATES.length})
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Changer de modèle est gratuit (0 crédit)
              </span>
            </div>

            {/* Rangée de miniatures : défilement horizontal sur mobile, grille sur ordi */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 overflow-x-auto pb-1">
              {CV_TEMPLATES.map((tmpl) => {
                const isSelected = designOptions.templateId === tmpl.id;
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => updateDesignOptions({ templateId: tmpl.id })}
                    className={`relative p-2.5 rounded-xl border-2 text-left transition flex flex-col justify-between cursor-pointer min-h-[92px] focus:ring-2 focus:ring-blue-500 ${
                      isSelected
                        ? 'border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-950/30 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900/50'
                    }`}
                  >
                    {/* Miniature visuelle simplifiée */}
                    <div className="w-full h-9 rounded-md bg-slate-100 dark:bg-slate-800 p-1 mb-1.5 flex flex-col justify-between overflow-hidden pointer-events-none">
                      {tmpl.id === 'bandeau' ? (
                        <>
                          <div className="w-full h-2 rounded-xs" style={{ backgroundColor: designOptions.accentColor }} />
                          <div className="space-y-0.5">
                            <div className="w-3/4 h-1 bg-slate-300 dark:bg-slate-600 rounded-xs" />
                            <div className="w-1/2 h-1 bg-slate-200 dark:bg-slate-700 rounded-xs" />
                          </div>
                        </>
                      ) : tmpl.id === 'barre-laterale' ? (
                        <div className="flex h-full gap-1">
                          <div className="w-1/3 h-full rounded-xs opacity-90" style={{ backgroundColor: designOptions.accentColor }} />
                          <div className="w-2/3 h-full flex flex-col justify-between py-0.5">
                            <div className="w-full h-1 bg-slate-300 dark:bg-slate-600 rounded-xs" />
                            <div className="w-4/5 h-1 bg-slate-200 dark:bg-slate-700 rounded-xs" />
                            <div className="w-3/5 h-1 bg-slate-200 dark:bg-slate-700 rounded-xs" />
                          </div>
                        </div>
                      ) : tmpl.id === 'minimal' ? (
                        <div className="flex flex-col justify-between h-full py-0.5">
                          <div className="w-1/2 h-1.5 bg-slate-800 dark:bg-slate-200 rounded-xs" />
                          <div className="w-full h-0.5" style={{ backgroundColor: designOptions.accentColor }} />
                          <div className="w-3/4 h-1 bg-slate-200 dark:bg-slate-700 rounded-xs" />
                        </div>
                      ) : tmpl.id === 'chronologie' ? (
                        <div className="flex h-full gap-1 items-center">
                          <div className="w-1 h-full rounded-full" style={{ backgroundColor: designOptions.accentColor }} />
                          <div className="flex-1 space-y-0.5">
                            <div className="w-2/3 h-1 bg-slate-300 dark:bg-slate-600 rounded-xs" />
                            <div className="w-4/5 h-1 bg-slate-200 dark:bg-slate-700 rounded-xs" />
                          </div>
                        </div>
                      ) : tmpl.id === 'compact' ? (
                        <div className="grid grid-cols-2 gap-0.5 h-full">
                          <div className="bg-slate-200 dark:bg-slate-700 rounded-xs h-full" />
                          <div className="bg-slate-200 dark:bg-slate-700 rounded-xs h-full" />
                        </div>
                      ) : (
                        <div className="flex flex-col justify-between h-full py-0.5">
                          <div className="w-2/3 h-1.5 rounded-xs" style={{ backgroundColor: designOptions.accentColor }} />
                          <div className="w-full h-0.5 bg-slate-200 dark:bg-slate-700" />
                          <div className="w-4/5 h-1 bg-slate-300 dark:bg-slate-600 rounded-xs" />
                        </div>
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
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {tmpl.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RÉGLAGES DE PERSONNALISATION : COULEUR, POLICE, TAILLE, PHOTO, SECTIONS */}
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
                        isCurrent ? 'scale-110 ring-2 ring-offset-2 ring-blue-600 dark:ring-offset-slate-900' : 'hover:scale-105 opacity-90'
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
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

            {/* Photo & Masquage de sections */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-700/80">
              {/* Photo */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                    Photo de profil
                  </span>
                  <span className="text-[10px] text-slate-400 italic">
                    Jamais envoyée au serveur
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    id="cv-photo-file-input"
                  />

                  {designOptions.photoUrl ? (
                    <div className="flex items-center gap-2">
                      <img
                        src={designOptions.photoUrl}
                        alt="Aperçu photo"
                        className={`w-10 h-10 object-cover border border-slate-300 dark:border-slate-600 ${
                          designOptions.photoShape === 'round' ? 'rounded-full' : 'rounded-lg'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={handleTogglePhotoShape}
                        className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-[11px] font-semibold text-slate-700 dark:text-slate-200 rounded-lg transition min-h-[36px] cursor-pointer"
                      >
                        Forme : {designOptions.photoShape === 'round' ? 'Rond' : 'Carré'}
                      </button>
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                        title="Retirer la photo"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={isProcessingPhoto}
                      onClick={() => photoInputRef.current?.click()}
                      className="px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-200 rounded-xl transition flex items-center gap-2 cursor-pointer min-h-[40px] focus:ring-2 focus:ring-blue-500"
                    >
                      <Plus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>{isProcessingPhoto ? 'Recadrage...' : 'Ajouter une photo (JPG/PNG, ≤ 5 Mo)'}</span>
                    </button>
                  )}
                </div>

                {photoError && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400">{photoError}</p>
                )}
              </div>

              {/* Masquer des sections */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                  Masquer des sections
                </span>
                <div className="flex flex-wrap gap-3 pt-1">
                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer min-h-[36px]">
                    <input
                      type="checkbox"
                      checked={Boolean(designOptions.hiddenSections.competences)}
                      onChange={(e) =>
                        updateDesignOptions({
                          hiddenSections: {
                            ...designOptions.hiddenSections,
                            competences: e.target.checked
                          }
                        })
                      }
                      className="w-4 h-4 rounded-md text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>Compétences</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer min-h-[36px]">
                    <input
                      type="checkbox"
                      checked={Boolean(designOptions.hiddenSections.langues)}
                      onChange={(e) =>
                        updateDesignOptions({
                          hiddenSections: {
                            ...designOptions.hiddenSections,
                            langues: e.target.checked
                          }
                        })
                      }
                      className="w-4 h-4 rounded-md text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>Langues</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer min-h-[36px]">
                    <input
                      type="checkbox"
                      checked={Boolean(designOptions.hiddenSections.centresInteret)}
                      onChange={(e) =>
                        updateDesignOptions({
                          hiddenSections: {
                            ...designOptions.hiddenSections,
                            centresInteret: e.target.checked
                          }
                        })
                      }
                      className="w-4 h-4 rounded-md text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>Centres d'intérêt</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* APERÇU ÉDITABLE DU DOCUMENT AVEC LE MÊME MOTEUR VISUEL */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Aperçu fidèle & édition directe
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                Clique directement sur un texte pour le modifier
              </span>
            </div>

            <CvPreviewRenderer
              document={generatedDoc}
              onChange={setGeneratedDoc}
              options={designOptions}
            />
          </div>

          {/* Boutons d'exportation */}
          <div className="space-y-2 pt-2 pb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => downloadCvPdf(generatedDoc, designOptions)}
                className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer min-h-[48px] focus:ring-2 focus:ring-blue-500"
              >
                <FileDown className="w-5 h-5" />
                <span>Télécharger en PDF ({CV_TEMPLATES.find((t) => t.id === designOptions.templateId)?.name || 'Design'})</span>
              </button>

              <button
                type="button"
                onClick={() => downloadCvDocx(generatedDoc, designOptions)}
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
  const progressPercent = Math.round((step / 5) * 100);

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
              Créer un CV
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
            Étape {step} sur 5
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

      {/* Contenu déroulant de l'étape courante */}
      <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 max-w-xl mx-auto w-full select-text">
        {/* ÉTAPE 1 : Identité */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                1. Tes coordonnées et ton profil
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Ces informations apparaîtront en tête de ton CV.
              </p>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nom complet <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={inputData.nom}
                  onChange={(e) => setInputData({ ...inputData, nom: e.target.value })}
                  placeholder="ex. Koffi Mensah"
                  className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden min-h-[44px]"
                />
                <p className="text-[11px] text-slate-400 mt-1">Exemple : Koffi Mensah</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Titre visé <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={inputData.titre_vise}
                  onChange={(e) => setInputData({ ...inputData, titre_vise: e.target.value })}
                  placeholder="ex. Développeur Full Stack, Comptable confirmé"
                  className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden min-h-[44px]"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Exemple : Développeur Full Stack, Chargé de clientèle, Comptable confirmé
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={inputData.email}
                    onChange={(e) => setInputData({ ...inputData, email: e.target.value })}
                    placeholder="koffi.mensah@email.com"
                    className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={inputData.telephone}
                    onChange={(e) => setInputData({ ...inputData, telephone: e.target.value })}
                    placeholder="+228 90 00 00 00"
                    className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Ville / Région
                </label>
                <input
                  type="text"
                  value={inputData.ville}
                  onChange={(e) => setInputData({ ...inputData, ville: e.target.value })}
                  placeholder="Lomé, Togo"
                  className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden min-h-[44px]"
                />
                <p className="text-[11px] text-slate-400 mt-1">Exemple : Lomé, Togo ou Abidjan, Côte d'Ivoire</p>
              </div>
            </div>
          </div>
        )}

        {/* ÉTAPE 2 : Expériences */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  2. Tes expériences professionnelles
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Ajoute tes postes (jusqu'à 8 expériences).
                </p>
              </div>
              <button
                type="button"
                onClick={addExperience}
                disabled={inputData.experiences.length >= 8}
                className="px-3 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-xl transition flex items-center gap-1 cursor-pointer min-h-[44px]"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter</span>
              </button>
            </div>

            <div className="space-y-4">
              {inputData.experiences.map((exp, index) => (
                <div
                  key={index}
                  className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Expérience #{index + 1}
                    </span>
                    {inputData.experiences.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeExperience(index)}
                        className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                        title="Supprimer cette expérience"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Poste occupé
                      </label>
                      <input
                        type="text"
                        value={exp.poste}
                        onChange={(e) => updateExperience(index, 'poste', e.target.value)}
                        placeholder="ex. Chef de projet digital"
                        className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Employeur / Entreprise
                      </label>
                      <input
                        type="text"
                        value={exp.employeur}
                        onChange={(e) => updateExperience(index, 'employeur', e.target.value)}
                        placeholder="ex. Moov Africa"
                        className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Ville
                      </label>
                      <input
                        type="text"
                        value={exp.lieu}
                        onChange={(e) => updateExperience(index, 'lieu', e.target.value)}
                        placeholder="ex. Lomé"
                        className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Début
                      </label>
                      <input
                        type="text"
                        value={exp.debut}
                        onChange={(e) => updateExperience(index, 'debut', e.target.value)}
                        placeholder="ex. Janv 2021"
                        className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Fin
                      </label>
                      <input
                        type="text"
                        value={exp.fin}
                        onChange={(e) => updateExperience(index, 'fin', e.target.value)}
                        placeholder="ex. Actuellement"
                        className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Missions & réalisations principales (2 à 3 points)
                    </label>
                    <textarea
                      rows={2}
                      value={exp.description}
                      onChange={(e) => updateExperience(index, 'description', e.target.value)}
                      placeholder="ex. Gestion d'une équipe de 5 personnes, refonte de la plateforme web, amélioration du taux de conversion de 15%."
                      className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 leading-relaxed"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ÉTAPE 3 : Formations */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  3. Formations & Diplômes
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Tes diplômes ou certifications (jusqu'à 6 formations).
                </p>
              </div>
              <button
                type="button"
                onClick={addFormation}
                disabled={inputData.formations.length >= 6}
                className="px-3 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-xl transition flex items-center gap-1 cursor-pointer min-h-[44px]"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter</span>
              </button>
            </div>

            <div className="space-y-3.5">
              {inputData.formations.map((f, index) => (
                <div
                  key={index}
                  className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Diplôme #{index + 1}
                    </span>
                    {inputData.formations.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeFormation(index)}
                        className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                        title="Supprimer cette formation"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Intitulé du Diplôme / Certification
                      </label>
                      <input
                        type="text"
                        value={f.diplome}
                        onChange={(e) => updateFormation(index, 'diplome', e.target.value)}
                        placeholder="ex. Licence en Informatique"
                        className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Établissement / Université
                      </label>
                      <input
                        type="text"
                        value={f.etablissement}
                        onChange={(e) => updateFormation(index, 'etablissement', e.target.value)}
                        placeholder="ex. Université de Lomé"
                        className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Ville
                      </label>
                      <input
                        type="text"
                        value={f.lieu}
                        onChange={(e) => updateFormation(index, 'lieu', e.target.value)}
                        placeholder="ex. Lomé"
                        className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Année d'obtention
                      </label>
                      <input
                        type="text"
                        value={f.annee}
                        onChange={(e) => updateFormation(index, 'annee', e.target.value)}
                        placeholder="ex. 2022"
                        className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ÉTAPE 4 : Compétences, Langues & Loisirs */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                4. Compétences & Atouts
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Mets en valeur tes savoir-faire clés et tes langues.
              </p>
            </div>

            {/* Compétences tags */}
            <div className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs space-y-3">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Compétences techniques et métier
              </label>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCompetence();
                    }
                  }}
                  placeholder="ex. React, Gestion comptable, Excel avancé"
                  className="flex-1 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={addCompetence}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition min-h-[44px] cursor-pointer"
                >
                  Ajouter
                </button>
              </div>

              {inputData.competences.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {inputData.competences.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeCompetence(tag)}
                        className="hover:text-red-500 cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 italic">
                  Ajoute au moins 3 à 5 compétences clés pour enrichir ton CV.
                </p>
              )}
            </div>

            {/* Langues */}
            <div className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Langues
                </label>
                <button
                  type="button"
                  onClick={addLangue}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  + Ajouter une langue
                </button>
              </div>

              <div className="space-y-2">
                {inputData.langues.map((l, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={l.langue}
                      onChange={(e) => updateLangue(index, 'langue', e.target.value)}
                      placeholder="Langue (ex. Anglais)"
                      className="flex-1 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    />
                    <select
                      value={l.niveau}
                      onChange={(e) => updateLangue(index, 'niveau', e.target.value)}
                      className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Langue maternelle">Langue maternelle</option>
                      <option value="Courant">Courant</option>
                      <option value="Professionnel">Professionnel</option>
                      <option value="Intermédiaire">Intermédiaire</option>
                      <option value="Débutant">Débutant</option>
                    </select>
                    {inputData.langues.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLangue(index)}
                        className="text-slate-400 hover:text-red-500 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Centres d'intérêt */}
            <div className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs space-y-3">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Centres d'intérêt / Loisirs (optionnel)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={interestInput}
                  onChange={(e) => setInterestInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addInterest();
                    }
                  }}
                  placeholder="ex. Photographie, Football, Lecture"
                  className="flex-1 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={addInterest}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition min-h-[44px] cursor-pointer"
                >
                  Ajouter
                </button>
              </div>

              {inputData.centres_interet.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {inputData.centres_interet.map((ci) => (
                    <span
                      key={ci}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                    >
                      {ci}
                      <button
                        type="button"
                        onClick={() => removeInterest(ci)}
                        className="hover:text-red-500 cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ÉTAPE 5 : Résumé & Récapitulatif Final */}
        {step === 5 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                5. Accroche & Récapitulatif
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Rédige ton profil ou laisse l'assistant le formuler.
              </p>
            </div>

            {/* Option Rédaction automatique */}
            <div className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inputData.auto_redaction_resume}
                  onChange={(e) =>
                    setInputData({ ...inputData, auto_redaction_resume: e.target.checked })
                  }
                  className="mt-1 w-4 h-4 text-blue-600 rounded-sm border-slate-300 focus:ring-blue-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Rédiger automatiquement le résumé selon mes expériences
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    L'IA formulera une synthèse professionnelle percutante adaptée à ton titre visé.
                  </p>
                </div>
              </label>

              {!inputData.auto_redaction_resume && (
                <div className="pt-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Bio / Accroche personnelle (3 à 4 lignes)
                  </label>
                  <textarea
                    rows={3}
                    value={inputData.resume}
                    onChange={(e) => setInputData({ ...inputData, resume: e.target.value })}
                    placeholder="ex. Professionnel rigoureux et passionné, doté de 4 ans d'expérience dans..."
                    className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 leading-relaxed"
                  />
                </div>
              )}
            </div>

            {/* Récapitulatif des données */}
            <div className="p-4 rounded-3xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Candidat :</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {inputData.nom} — {inputData.titre_vise}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Expériences saisies :</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {inputData.experiences.filter((e) => e.poste.trim()).length}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Formations :</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {inputData.formations.filter((f) => f.diplome.trim()).length}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Compétences :</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {inputData.competences.length}
                </span>
              </div>
            </div>

            {/* Encart Coût et Solde */}
            <div className="p-4 rounded-3xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs text-slate-600 dark:text-slate-400">Coût de la création</span>
                <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-amber-500" />
                  <span>{CV_COST} crédits</span>
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
              {(credits ?? 0) < CV_COST || showRechargeButton ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled
                    className="w-full py-3.5 px-4 bg-slate-300 dark:bg-slate-700 text-slate-500 font-bold rounded-2xl cursor-not-allowed text-xs sm:text-sm min-h-[48px]"
                  >
                    Générer mon CV (2 crédits) — Solde insuffisant
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
                      <span>Générer mon CV (2 crédits)</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Barre de navigation inférieure (Précédent / Suivant) */}
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

          {step < 5 && (
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
