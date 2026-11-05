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
  Receipt,
  FileText,
  AlertCircle,
  HelpCircle,
  Edit3,
  Building,
  User,
  Calendar,
  Layers,
  CheckCircle2,
  Palette,
  Sliders,
  Type,
  Check,
  Image as ImageIcon,
  X
} from 'lucide-react';
import type {
  UserProfile,
  InvoiceInputData,
  InvoiceOutputDocument,
  InvoiceLineInput,
  InvoiceEntity
} from '../types';
import { genererDocumentAdministrative } from '../services/supabase';
import {
  formatMoney,
  downloadInvoicePdf,
  downloadInvoiceDocx
} from '../services/adminDocGenerators';
import {
  INVOICE_TEMPLATES,
  PRESET_ACCENT_COLORS,
  type InvoiceDesignOptions,
  type InvoiceTemplateId,
  loadInvoiceDesignPrefs,
  saveInvoiceDesignPrefs,
  processLogoImage
} from '../services/adminDesignEngine';
import { InvoicePreviewRenderer } from './InvoicePreviewRenderer';

interface InvoiceGeneratorToolProps {
  user: UserProfile;
  credits: number | null;
  onBack: () => void;
  onOpenRecharge: () => void;
  onCreditsChange: (newCredits: number) => void;
}

const STORAGE_DRAFT_KEY = 'visora_draft_invoice';
const LOCAL_STORAGE_EMETTEUR_KEY = 'visora_emetteur_sauvegarde';
const INVOICE_COST = 1;

function getTodayISO(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTodayFormatted(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const months = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
  ];
  return `${day} ${months[now.getMonth()]} ${now.getFullYear()}`;
}

function generateDefaultNumber(type: 'devis' | 'facture'): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = type === 'facture' ? 'FAC' : 'DEV';
  return `${prefix}-${year}${month}-001`;
}

export const InvoiceGeneratorTool: React.FC<InvoiceGeneratorToolProps> = ({
  user,
  credits,
  onBack,
  onOpenRecharge,
  onCreditsChange
}) => {
  const [step, setStep] = useState<number>(1);
  const [saveEmetteurForNextTime, setSaveEmetteurForNextTime] = useState<boolean>(true);

  // Initialisation de l'émetteur
  const getInitialEmetteur = (): InvoiceEntity => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_EMETTEUR_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return {
      nom: [user.prenoms, user.nom].filter(Boolean).join(' ') || '',
      adresse: user.pays ? `${user.pays}` : 'Lomé, Togo',
      telephone: user.whatsapp || '',
      email: user.email || '',
      identifiant_fiscal: ''
    };
  };

  const [inputData, setInputData] = useState<InvoiceInputData>(() => {
    try {
      const savedDraft = sessionStorage.getItem(STORAGE_DRAFT_KEY);
      if (savedDraft) {
        return JSON.parse(savedDraft);
      }
    } catch {
      // ignore
    }
    return {
      type: 'devis',
      numero: generateDefaultNumber('devis'),
      date: getTodayFormatted(),
      validite: '30 jours',
      echeance: 'Paiement à réception',
      emetteur: getInitialEmetteur(),
      client: {
        nom: '',
        adresse: '',
        telephone: '',
        email: '',
        identifiant_fiscal: ''
      },
      devise: 'FCFA',
      lignes: [
        {
          description: '',
          quantite: 1,
          prix_unitaire: 0,
          remise_pct: 0
        }
      ],
      remise_globale_pct: 0,
      tva_taux: 0,
      acompte: 0,
      conditions_paiement: 'Règlement par virement bancaire, chèque ou Mobile Money (T-Money / Flooz).',
      mentions: 'Document établi selon la réglementation en vigueur.',
      notes: 'Merci pour votre confiance.'
    };
  });

  const [generatedDoc, setGeneratedDoc] = useState<InvoiceOutputDocument | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showRechargeButton, setShowRechargeButton] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoUploading, setLogoUploading] = useState<boolean>(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  const [designOptions, setDesignOptions] = useState<InvoiceDesignOptions>(() => {
    const prefs = loadInvoiceDesignPrefs();
    try {
      const savedRaw = localStorage.getItem(LOCAL_STORAGE_EMETTEUR_KEY);
      if (savedRaw) {
        const parsed = JSON.parse(savedRaw);
        if (parsed.logoUrl && !prefs.logoUrl) {
          prefs.logoUrl = parsed.logoUrl;
        }
      }
    } catch {
      // ignore
    }
    return prefs;
  });

  const updateDesignOptions = (updates: Partial<InvoiceDesignOptions>) => {
    setDesignOptions((prev) => {
      const next = { ...prev, ...updates };
      saveInvoiceDesignPrefs(next);
      return next;
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError(null);
    setLogoUploading(true);
    try {
      const dataUrl = await processLogoImage(file);
      updateDesignOptions({ logoUrl: dataUrl });

      if (saveEmetteurForNextTime) {
        try {
          const savedRaw = localStorage.getItem(LOCAL_STORAGE_EMETTEUR_KEY);
          const currentEmetteur = savedRaw ? JSON.parse(savedRaw) : inputData.emetteur;
          localStorage.setItem(
            LOCAL_STORAGE_EMETTEUR_KEY,
            JSON.stringify({ ...currentEmetteur, logoUrl: dataUrl })
          );
        } catch {
          // ignore
        }
      }
    } catch (err: any) {
      setLogoError(err?.message || 'Erreur lors du traitement du logo.');
    } finally {
      setLogoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = () => {
    updateDesignOptions({ logoUrl: undefined });
    if (saveEmetteurForNextTime) {
      try {
        const savedRaw = localStorage.getItem(LOCAL_STORAGE_EMETTEUR_KEY);
        if (savedRaw) {
          const parsed = JSON.parse(savedRaw);
          delete parsed.logoUrl;
          localStorage.setItem(LOCAL_STORAGE_EMETTEUR_KEY, JSON.stringify(parsed));
        }
      } catch {
        // ignore
      }
    }
  };

  // Sauvegarde automatique du brouillon dans sessionStorage
  useEffect(() => {
    if (!generatedDoc) {
      sessionStorage.setItem(STORAGE_DRAFT_KEY, JSON.stringify(inputData));
    }
  }, [inputData, generatedDoc]);

  // Changer de type (Devis <-> Facture)
  const handleTypeChange = (newType: 'devis' | 'facture') => {
    setInputData((prev) => ({
      ...prev,
      type: newType,
      numero: prev.numero.startsWith('DEV-') || prev.numero.startsWith('FAC-')
        ? generateDefaultNumber(newType)
        : prev.numero
    }));
  };

  const handleReset = () => {
    sessionStorage.removeItem(STORAGE_DRAFT_KEY);
    setInputData({
      type: 'devis',
      numero: generateDefaultNumber('devis'),
      date: getTodayFormatted(),
      validite: '30 jours',
      echeance: 'Paiement à réception',
      emetteur: getInitialEmetteur(),
      client: {
        nom: '',
        adresse: '',
        telephone: '',
        email: '',
        identifiant_fiscal: ''
      },
      devise: 'FCFA',
      lignes: [
        {
          description: '',
          quantite: 1,
          prix_unitaire: 0,
          remise_pct: 0
        }
      ],
      remise_globale_pct: 0,
      tva_taux: 0,
      acompte: 0,
      conditions_paiement: 'Règlement par virement bancaire, chèque ou Mobile Money (T-Money / Flooz).',
      mentions: 'Document établi selon la réglementation en vigueur.',
      notes: 'Merci pour votre confiance.'
    });
    setGeneratedDoc(null);
    setStep(1);
    setErrorMsg(null);
    setShowRechargeButton(false);
  };

  // Gestion des lignes
  const addLine = () => {
    if (inputData.lignes.length >= 40) return;
    setInputData((prev) => ({
      ...prev,
      lignes: [
        ...prev.lignes,
        { description: '', quantite: 1, prix_unitaire: 0, remise_pct: 0 }
      ]
    }));
  };

  const updateLine = (index: number, field: keyof InvoiceLineInput, value: any) => {
    setInputData((prev) => {
      const updated = [...prev.lignes];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, lignes: updated };
    });
  };

  const removeLine = (index: number) => {
    if (inputData.lignes.length <= 1) return;
    setInputData((prev) => ({
      ...prev,
      lignes: prev.lignes.filter((_, i) => i !== index)
    }));
  };

  // Appel serveur
  const handleGenerate = async () => {
    setErrorMsg(null);
    setShowRechargeButton(false);

    if ((credits ?? 0) < INVOICE_COST) {
      setErrorMsg('Crédits insuffisants. Recharger pour continuer.');
      setShowRechargeButton(true);
      return;
    }

    // Sauvegarder l'émetteur dans localStorage si demandé (avec logo)
    if (saveEmetteurForNextTime && inputData.emetteur.nom.trim()) {
      try {
        const payloadToSave = {
          ...inputData.emetteur,
          ...(designOptions.logoUrl ? { logoUrl: designOptions.logoUrl } : {})
        };
        localStorage.setItem(LOCAL_STORAGE_EMETTEUR_KEY, JSON.stringify(payloadToSave));
      } catch {
        // ignore
      }
    }

    setIsGenerating(true);

    const payload = {
      numero: inputData.numero.trim() || generateDefaultNumber(inputData.type),
      date: inputData.date.trim() || getTodayFormatted(),
      echeance: inputData.type === 'facture' ? inputData.echeance?.trim() : undefined,
      validite: inputData.type === 'devis' ? inputData.validite?.trim() : undefined,
      emetteur: {
        nom: inputData.emetteur.nom.trim(),
        adresse: inputData.emetteur.adresse?.trim(),
        telephone: inputData.emetteur.telephone?.trim(),
        email: inputData.emetteur.email?.trim(),
        identifiant_fiscal: inputData.emetteur.identifiant_fiscal?.trim()
      },
      client: {
        nom: inputData.client.nom.trim(),
        adresse: inputData.client.adresse?.trim(),
        telephone: inputData.client.telephone?.trim(),
        email: inputData.client.email?.trim(),
        identifiant_fiscal: inputData.client.identifiant_fiscal?.trim()
      },
      devise: inputData.devise,
      lignes: inputData.lignes
        .filter((l) => l.description.trim().length > 0)
        .map((l) => ({
          description: l.description.trim(),
          quantite: Number(l.quantite) || 1,
          prix_unitaire: Number(l.prix_unitaire) || 0,
          remise_pct: Number(l.remise_pct) || 0
        })),
      remise_globale_pct: Number(inputData.remise_globale_pct) || 0,
      tva_taux: Number(inputData.tva_taux) || 0,
      acompte: inputData.type === 'facture' ? Number(inputData.acompte) || 0 : 0,
      conditions_paiement: inputData.conditions_paiement?.trim(),
      mentions: inputData.mentions?.trim(),
      notes: inputData.notes?.trim()
    };

    // Assurer au moins une ligne valide
    if (payload.lignes.length === 0) {
      payload.lignes = [
        {
          description: 'Prestation de services',
          quantite: 1,
          prix_unitaire: 0,
          remise_pct: 0
        }
      ];
    }

    const res = await genererDocumentAdministrative(inputData.type, payload);
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

  const isCurrentStepValid = () => {
    if (step === 1) return Boolean(inputData.emetteur.nom.trim());
    if (step === 2) return Boolean(inputData.client.nom.trim());
    if (step === 3) return Boolean(inputData.devise);
    if (step === 4) return inputData.lignes.some((l) => l.description.trim().length > 0);
    return true;
  };

  // ==========================================================================
  // ÉCRAN DE RÉSULTAT DU DOCUMENT ÉDITABLE (Textes modifiables, montants figés)
  // ==========================================================================
  if (generatedDoc) {
    const isInvoice = generatedDoc.type === 'facture';
    const docTitle = isInvoice ? 'Facture' : 'Devis';

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
                {docTitle} {generatedDoc.numero}
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
              <span className="hidden sm:inline">Nouveau document</span>
            </button>
          </div>
        </header>

        {/* Corps déroulant */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 max-w-3xl mx-auto w-full space-y-5">
          {/* Galerie de modèles de design */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Choisis un modèle de {isInvoice ? 'facture' : 'devis'}</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setGeneratedDoc(null);
                  setStep(4);
                }}
                className="px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-xs font-bold hover:bg-blue-100 transition flex items-center gap-1.5 min-h-[36px] cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Modifier les lignes</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
              {INVOICE_TEMPLATES.map((tpl) => {
                const isSelected = designOptions.templateId === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => updateDesignOptions({ templateId: tpl.id as InvoiceTemplateId })}
                    className={`relative p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between min-h-[110px] sm:min-h-[120px] focus:outline-hidden focus:ring-2 focus:ring-blue-500 ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 ring-2 ring-blue-500/30'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    {/* Miniature visuelle */}
                    <div className="w-full h-12 rounded-lg bg-slate-100 dark:bg-slate-700/60 p-1.5 flex flex-col justify-between overflow-hidden relative border border-slate-200/60 dark:border-slate-600/60 mb-2">
                      {tpl.id === 'bandeau' && (
                        <>
                          <div
                            className="h-3 w-full rounded-xs flex items-center px-1"
                            style={{ backgroundColor: designOptions.accentColor }}
                          >
                            <div className="w-6 h-1 bg-white/80 rounded-xs" />
                          </div>
                          <div className="flex justify-between items-center gap-1">
                            <div className="w-1/2 h-1.5 bg-slate-300 dark:bg-slate-500 rounded-xs" />
                            <div className="w-1/3 h-1.5 bg-slate-300 dark:bg-slate-500 rounded-xs" />
                          </div>
                          <div className="w-full h-1 bg-slate-200 dark:bg-slate-600 rounded-xs" />
                        </>
                      )}
                      {tpl.id === 'colore' && (
                        <>
                          <div className="flex justify-between items-center">
                            <div
                              className="w-1/3 h-2 rounded-xs"
                              style={{ backgroundColor: designOptions.accentColor }}
                            />
                            <div className="w-1/4 h-1.5 bg-slate-300 dark:bg-slate-500 rounded-xs" />
                          </div>
                          <div
                            className="w-full h-2 rounded-xs opacity-70"
                            style={{ backgroundColor: designOptions.accentColor }}
                          />
                          <div className="w-full h-1 bg-slate-200 dark:bg-slate-600 rounded-xs" />
                        </>
                      )}
                      {tpl.id === 'sobre' && (
                        <>
                          <div className="flex justify-between items-center">
                            <div className="w-1/3 h-2 bg-slate-800 dark:bg-slate-200 rounded-xs" />
                            <div className="w-1/4 h-1.5 bg-slate-300 dark:bg-slate-500 rounded-xs" />
                          </div>
                          <div
                            className="w-full h-0.5"
                            style={{ backgroundColor: designOptions.accentColor }}
                          />
                          <div className="flex justify-end">
                            <div className="w-1/3 h-1.5 bg-slate-300 dark:bg-slate-500 rounded-xs" />
                          </div>
                        </>
                      )}
                      {tpl.id === 'minimal' && (
                        <>
                          <div className="w-1/4 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-xs" />
                          <div className="w-full h-0.5 bg-slate-200 dark:bg-slate-600" />
                          <div className="flex justify-end">
                            <div
                              className="w-1/3 h-2 rounded-xs border"
                              style={{ borderColor: designOptions.accentColor }}
                            />
                          </div>
                        </>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                          {tpl.name}
                        </span>
                        {isSelected && (
                          <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                        {tpl.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Panneau de réglages du design (Couleur, Typographie, Taille, Logo) */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700/70 pb-3">
              <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Réglages du design (gratuit, immédiat)
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Couleur d'accent */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                  Couleur d'accent
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {PRESET_ACCENT_COLORS.map((preset) => {
                    const isPicked = designOptions.accentColor.toLowerCase() === preset.hex.toLowerCase();
                    return (
                      <button
                        key={preset.hex}
                        type="button"
                        title={preset.name}
                        onClick={() => updateDesignOptions({ accentColor: preset.hex })}
                        style={{ backgroundColor: preset.hex }}
                        className={`w-6 h-6 rounded-full transition cursor-pointer relative shrink-0 ${
                          isPicked ? 'ring-2 ring-offset-2 ring-blue-600 scale-110' : 'hover:scale-105'
                        }`}
                        aria-label={`Choisir la couleur ${preset.name}`}
                      >
                        {isPicked && (
                          <Check className="w-3.5 h-3.5 text-white absolute inset-0 m-auto" />
                        )}
                      </button>
                    );
                  })}
                  {/* Sélecteur libre */}
                  <label
                    title="Choisir une couleur personnalisée"
                    className="w-6 h-6 rounded-full border border-slate-300 dark:border-slate-600 flex items-center justify-center cursor-pointer hover:scale-105 transition overflow-hidden relative shrink-0"
                    style={{ backgroundColor: designOptions.accentColor }}
                  >
                    <input
                      type="color"
                      value={designOptions.accentColor}
                      onChange={(e) => updateDesignOptions({ accentColor: e.target.value })}
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                      aria-label="Palette de couleur personnalisée"
                    />
                  </label>
                </div>
              </div>

              {/* Typographie */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                  Police
                </label>
                <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-700/80 p-0.5 rounded-xl">
                  <button
                    type="button"
                    onClick={() => updateDesignOptions({ fontFamily: 'sans' })}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition min-h-[36px] cursor-pointer ${
                      designOptions.fontFamily === 'sans'
                        ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Sans
                  </button>
                  <button
                    type="button"
                    onClick={() => updateDesignOptions({ fontFamily: 'serif' })}
                    className={`py-1.5 px-2 rounded-lg text-xs font-serif font-semibold transition min-h-[36px] cursor-pointer ${
                      designOptions.fontFamily === 'serif'
                        ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Serif
                  </button>
                </div>
              </div>

              {/* Taille */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                  Taille du texte
                </label>
                <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-700/80 p-0.5 rounded-xl">
                  <button
                    type="button"
                    onClick={() => updateDesignOptions({ fontSize: 'normal' })}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition min-h-[36px] cursor-pointer ${
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
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition min-h-[36px] cursor-pointer ${
                      designOptions.fontSize === 'compact'
                        ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Compacte
                  </button>
                </div>
              </div>

              {/* Option Logo */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                  Logo d'entreprise
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                {designOptions.logoUrl ? (
                  <div className="flex items-center gap-2">
                    <img
                      src={designOptions.logoUrl}
                      alt="Logo sélectionné"
                      className="w-9 h-9 object-contain rounded-lg border border-slate-200 dark:border-slate-700 bg-white p-0.5 shrink-0"
                    />
                    <div className="flex items-center gap-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={logoUploading}
                        className="py-1 px-2 rounded-lg border border-slate-300 dark:border-slate-600 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer min-h-[32px]"
                      >
                        Changer
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                        title="Retirer le logo"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={logoUploading}
                    className="w-full py-1.5 px-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-400 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition flex items-center justify-center gap-1.5 min-h-[36px] cursor-pointer"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>{logoUploading ? 'Traitement...' : 'Ajouter un logo'}</span>
                  </button>
                )}
                {logoError && (
                  <p className="text-[10px] text-red-600 dark:text-red-400 font-medium">
                    {logoError}
                  </p>
                )}
              </div>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">
              Logo PNG/JPG (2 Mo max). Traité dans ton navigateur, jamais envoyé à un serveur.
            </p>
          </div>

          {/* Rendu dynamique du modèle sélectionné */}
          <InvoicePreviewRenderer
            document={generatedDoc}
            onChange={setGeneratedDoc}
            options={designOptions}
          />

          {/* Boutons d'exportation */}
          <div className="space-y-2 pt-2 pb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => downloadInvoicePdf(generatedDoc, designOptions)}
                className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer min-h-[48px] focus:ring-2 focus:ring-blue-500"
              >
                <FileDown className="w-5 h-5" />
                <span>Télécharger en PDF</span>
              </button>

              <button
                type="button"
                onClick={() => downloadInvoiceDocx(generatedDoc, designOptions)}
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
              Devis et facture
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {inputData.type === 'facture' ? 'Créer une Facture' : 'Créer un Devis'}
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

      {/* Sélecteur de type & barre de progression */}
      <div className="shrink-0 bg-white dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800 px-4 py-2 space-y-2">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
          {/* Sélecteur Devis / Facture */}
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
            <button
              type="button"
              onClick={() => handleTypeChange('devis')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition min-h-[36px] ${
                inputData.type === 'devis'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              Devis
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('facture')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition min-h-[36px] ${
                inputData.type === 'facture'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              Facture
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Étape {step}/6
            </span>
            <span className="font-bold text-blue-600 dark:text-blue-400">
              {progressPercent}%
            </span>
          </div>
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
        {/* ÉTAPE 1 : Émetteur */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                1. Émetteur (toi ou ton entreprise)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Ces informations identifient qui délivre le document.
              </p>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nom ou Raison sociale <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={inputData.emetteur.nom}
                  onChange={(e) =>
                    setInputData({
                      ...inputData,
                      emetteur: { ...inputData.emetteur, nom: e.target.value }
                    })
                  }
                  placeholder="ex. Koffi Tech SARL ou Koffi Mensah"
                  className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Adresse postale / Siège
                </label>
                <input
                  type="text"
                  value={inputData.emetteur.adresse || ''}
                  onChange={(e) =>
                    setInputData({
                      ...inputData,
                      emetteur: { ...inputData.emetteur, adresse: e.target.value }
                    })
                  }
                  placeholder="ex. 123 Boulevard Circulaire, Lomé, Togo"
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
                    value={inputData.emetteur.telephone || ''}
                    onChange={(e) =>
                      setInputData({
                        ...inputData,
                        emetteur: { ...inputData.emetteur, telephone: e.target.value }
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
                    value={inputData.emetteur.email || ''}
                    onChange={(e) =>
                      setInputData({
                        ...inputData,
                        emetteur: { ...inputData.emetteur, email: e.target.value }
                      })
                    }
                    placeholder="contact@entreprise.com"
                    className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Identifiant fiscal (facultatif)
                </label>
                <input
                  type="text"
                  value={inputData.emetteur.identifiant_fiscal || ''}
                  onChange={(e) =>
                    setInputData({
                      ...inputData,
                      emetteur: { ...inputData.emetteur, identifiant_fiscal: e.target.value }
                    })
                  }
                  placeholder="ex. NIF 1000123456 ou SIRET 123 456 789 00012"
                  className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden min-h-[44px]"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveEmetteurForNextTime}
                    onChange={(e) => setSaveEmetteurForNextTime(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded-sm border-slate-300 focus:ring-blue-500"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">
                      Enregistrer mes coordonnées pour la prochaine fois
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Stocké uniquement sur ton appareil (les clients et montants ne sont jamais enregistrés).
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ÉTAPE 2 : Client */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                2. Le Client
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                À qui est adressé ce {inputData.type === 'facture' ? 'cette facture' : 'ce devis'} ?
              </p>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nom du client ou Entreprise <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={inputData.client.nom}
                  onChange={(e) =>
                    setInputData({
                      ...inputData,
                      client: { ...inputData.client, nom: e.target.value }
                    })
                  }
                  placeholder="ex. Agence Horizon ou M. David Mensah"
                  className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Adresse postale / Ville
                </label>
                <input
                  type="text"
                  value={inputData.client.adresse || ''}
                  onChange={(e) =>
                    setInputData({
                      ...inputData,
                      client: { ...inputData.client, adresse: e.target.value }
                    })
                  }
                  placeholder="ex. Quartier Nyékonakpoè, Lomé"
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
                    value={inputData.client.telephone || ''}
                    onChange={(e) =>
                      setInputData({
                        ...inputData,
                        client: { ...inputData.client, telephone: e.target.value }
                      })
                    }
                    placeholder="+228 91 00 00 00"
                    className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={inputData.client.email || ''}
                    onChange={(e) =>
                      setInputData({
                        ...inputData,
                        client: { ...inputData.client, email: e.target.value }
                      })
                    }
                    placeholder="client@domaine.com"
                    className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Identifiant fiscal du client (facultatif)
                </label>
                <input
                  type="text"
                  value={inputData.client.identifiant_fiscal || ''}
                  onChange={(e) =>
                    setInputData({
                      ...inputData,
                      client: { ...inputData.client, identifiant_fiscal: e.target.value }
                    })
                  }
                  placeholder="NIF / SIRET du client"
                  className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden min-h-[44px]"
                />
              </div>
            </div>
          </div>
        )}

        {/* ÉTAPE 3 : Infos du document */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                3. Informations du document
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Numéro, date d'émission, devise et délais.
              </p>
            </div>

            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Numéro de document
                  </label>
                  <input
                    type="text"
                    value={inputData.numero}
                    onChange={(e) => setInputData({ ...inputData, numero: e.target.value })}
                    placeholder={generateDefaultNumber(inputData.type)}
                    className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Date d'émission
                  </label>
                  <input
                    type="text"
                    value={inputData.date}
                    onChange={(e) => setInputData({ ...inputData, date: e.target.value })}
                    placeholder={getTodayFormatted()}
                    className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Devise
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['FCFA', 'EUR', 'USD'] as const).map((curr) => (
                    <button
                      key={curr}
                      type="button"
                      onClick={() => setInputData({ ...inputData, devise: curr })}
                      className={`p-3 rounded-2xl border text-center font-bold text-xs sm:text-sm transition cursor-pointer min-h-[44px] ${
                        inputData.devise === curr
                          ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/30'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {curr}
                    </button>
                  ))}
                </div>
              </div>

              {inputData.type === 'facture' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Échéance de paiement
                  </label>
                  <input
                    type="text"
                    value={inputData.echeance || ''}
                    onChange={(e) => setInputData({ ...inputData, echeance: e.target.value })}
                    placeholder="ex. Paiement à réception, ou Sous 30 jours"
                    className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden min-h-[44px]"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Durée de validité de l'offre
                  </label>
                  <input
                    type="text"
                    value={inputData.validite || ''}
                    onChange={(e) => setInputData({ ...inputData, validite: e.target.value })}
                    placeholder="ex. 30 jours, ou 15 jours"
                    className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden min-h-[44px]"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ÉTAPE 4 : Lignes du document */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  4. Lignes de prestations ou produits
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Jusqu'à 40 lignes (prix en {inputData.devise}).
                </p>
              </div>
              <button
                type="button"
                onClick={addLine}
                disabled={inputData.lignes.length >= 40}
                className="px-3 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-xl transition flex items-center gap-1 cursor-pointer min-h-[44px]"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter</span>
              </button>
            </div>

            <div className="space-y-3">
              {inputData.lignes.map((line, index) => {
                const indicativeTotal =
                  (Number(line.quantite) || 0) *
                  (Number(line.prix_unitaire) || 0) *
                  (1 - (Number(line.remise_pct) || 0) / 100);

                return (
                  <div
                    key={index}
                    className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Ligne #{index + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-bold text-slate-500">
                          Total indicatif : {formatMoney(indicativeTotal, inputData.devise)}
                        </span>
                        {inputData.lignes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLine(index)}
                            className="p-1 text-slate-400 hover:text-red-500 rounded-lg transition cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                            title="Supprimer cette ligne"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Description de l'article ou du service <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={line.description}
                        onChange={(e) => updateLine(index, 'description', e.target.value)}
                        placeholder="ex. Développement d'un site vitrine 5 pages"
                        className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 min-h-[40px]"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Quantité
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="any"
                          value={line.quantite}
                          onChange={(e) => updateLine(index, 'quantite', parseFloat(e.target.value) || 0)}
                          className="w-full text-xs sm:text-sm font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 min-h-[40px]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Prix unit. ({inputData.devise})
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={line.prix_unitaire}
                          onChange={(e) => updateLine(index, 'prix_unitaire', parseFloat(e.target.value) || 0)}
                          className="w-full text-xs sm:text-sm font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 min-h-[40px]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Remise (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={line.remise_pct || ''}
                          onChange={(e) => updateLine(index, 'remise_pct', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="w-full text-xs sm:text-sm font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 min-h-[40px]"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ÉTAPE 5 : Options, TVA & Mentions */}
        {step === 5 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                5. Options & Mentions
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                TVA, remises, conditions de paiement et mentions légales.
              </p>
            </div>

            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Taux de TVA (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    value={inputData.tva_taux ?? 0}
                    onChange={(e) => setInputData({ ...inputData, tva_taux: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full text-sm font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Laisse à 0 si non assujetti à la TVA.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Remise globale (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    value={inputData.remise_globale_pct ?? 0}
                    onChange={(e) =>
                      setInputData({ ...inputData, remise_globale_pct: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0"
                    className="w-full text-sm font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Remise commerciale sur le sous-total.</p>
                </div>
              </div>

              {inputData.type === 'facture' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Acompte déjà versé ({inputData.devise})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={inputData.acompte ?? 0}
                    onChange={(e) => setInputData({ ...inputData, acompte: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full text-sm font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Sera déduit du reste à payer.</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Conditions de règlement & coordonnées de paiement
                </label>
                <textarea
                  rows={2}
                  value={inputData.conditions_paiement || ''}
                  onChange={(e) => setInputData({ ...inputData, conditions_paiement: e.target.value })}
                  placeholder="ex. Virement bancaire, chèque ou Mobile Money. RIB / Numéro T-Money..."
                  className="w-full text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mentions légales & fiscales
                </label>
                <textarea
                  rows={2}
                  value={inputData.mentions || ''}
                  onChange={(e) => setInputData({ ...inputData, mentions: e.target.value })}
                  placeholder="ex. Dispensé d'immatriculation au RCS ou TVA non applicable, art. 293 B du CGI."
                  className="w-full text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 italic leading-relaxed">
                  Les mentions légales et fiscales dépendent de ton pays et de ton activité : remplis-les selon ta situation. Visora ne garantit pas la conformité fiscale du document.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes / Remarques (facultatif)
                </label>
                <input
                  type="text"
                  value={inputData.notes || ''}
                  onChange={(e) => setInputData({ ...inputData, notes: e.target.value })}
                  placeholder="ex. Merci pour votre confiance."
                  className="w-full text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                />
              </div>
            </div>
          </div>
        )}

        {/* ÉTAPE 6 : Récapitulatif & Génération */}
        {step === 6 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                6. Récapitulatif & Finalisation
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Vérifie tes informations avant la génération officielle.
              </p>
            </div>

            {/* Récapitulatif */}
            <div className="p-4 rounded-3xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Type de document :</span>
                <span className="font-semibold text-slate-900 dark:text-white uppercase">
                  {inputData.type}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Numéro :</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {inputData.numero}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Émetteur :</span>
                <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[200px]">
                  {inputData.emetteur.nom}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Client :</span>
                <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[200px]">
                  {inputData.client.nom}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Nombre d'articles / prestations :</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {inputData.lignes.filter((l) => l.description.trim().length > 0).length}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Devise :</span>
                <span className="font-semibold text-slate-900 dark:text-white font-mono">
                  {inputData.devise}
                </span>
              </div>
            </div>

            {/* Coût et solde */}
            <div className="p-4 rounded-3xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs text-slate-600 dark:text-slate-400">Coût de la création</span>
                <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-amber-500" />
                  <span>{INVOICE_COST} crédit</span>
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
              {(credits ?? 0) < INVOICE_COST || showRechargeButton ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled
                    className="w-full py-3.5 px-4 bg-slate-300 dark:bg-slate-700 text-slate-500 font-bold rounded-2xl cursor-not-allowed text-xs sm:text-sm min-h-[48px]"
                  >
                    Générer mon {inputData.type} (1 crédit) — Solde insuffisant
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
                      <span>Générer mon {inputData.type} (1 crédit)</span>
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
