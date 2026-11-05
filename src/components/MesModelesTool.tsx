import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Coins,
  Plus,
  Trash2,
  Edit2,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Printer,
  ChevronRight,
  Upload,
  X,
  Sparkles,
  HelpCircle,
  Eye,
  Camera,
  Layers,
  FileCheck,
  Download,
  Share2,
  Palette,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import html2canvas from 'html2canvas';
import type { UserProfile } from '../types';
import type { Modele, Valeurs, Lignes, Images, Champ, Groupe } from '../lib/rendu';
import {
  rendre,
  pageComplete,
  champsManquants,
  calculerTotaux
} from '../lib/rendu';
import {
  fetchUserModeles,
  renameUserModele,
  deleteUserModele,
  analyserModele,
  COUT_ANALYSE_AFFICHE,
  MAX_MODELES_PAR_UTILISATEUR
} from '../services/modelesService';
import {
  saveModeleImage,
  getModeleImage,
  getModeleImages,
  deleteModeleImage
} from '../services/modeleImagesDb';
import {
  compressImageForAnalysis,
  convertPdfToAnalysisPages,
  resizeSlotImage,
  type PreparedPage
} from '../services/modeleImageCompressor';

interface MesModelesToolProps {
  user: UserProfile;
  credits: number | null;
  onBack: () => void;
  onOpenRecharge: () => void;
  onCreditsChange: (credits: number) => void;
  initialFilter?: 'all' | 'affiche';
  initialAction?: 'list' | 'add_affiche';
}

type ViewState = 'list' | 'add' | 'slots' | 'form' | 'preview';

const TYPE_OPTIONS = [
  { id: 'affiche', label: 'Affiche', desc: 'Affiche promo, événement, annonce' },
  { id: 'facture', label: 'Facture', desc: 'Facture client avec lignes et totaux' },
  { id: 'devis', label: 'Devis', desc: 'Devis commercial détaillé' },
  { id: 'cv', label: 'CV', desc: 'Curriculum vitæ personnalisé' },
  { id: 'lettre', label: 'Lettre', desc: 'Courrier administratif ou officiel' },
  { id: 'formulaire', label: 'Formulaire', desc: 'Fiche d’inscription, reçu, attestation' },
  { id: 'autre', label: 'Autre document', desc: 'Tout autre type de document' }
];

const ROLE_INFO: Record<string, { label: string; desc: string }> = {
  fond: { label: 'Image de fond', desc: "S'affiche sur toute la page ou en arrière-plan" },
  logo: { label: 'Logo', desc: "Logo de ton entreprise ou de ta marque" },
  illustration: { label: 'Illustration', desc: "Visuel ou graphisme principal de l'affiche" },
  photo: { label: 'Photo', desc: "Photo ou portrait" },
  qr: { label: 'Code QR', desc: "Code QR vers un lien, WhatsApp ou paiement" },
  signature: { label: 'Signature', desc: "Signature manuscrite" },
  cachet: { label: 'Cachet / Tampon', desc: "Cachet officiel" },
  autre: { label: 'Image', desc: "Image personnalisée" }
};

export const MesModelesTool: React.FC<MesModelesToolProps> = ({
  user,
  credits,
  onBack,
  onOpenRecharge,
  onCreditsChange,
  initialFilter = 'all',
  initialAction = 'list'
}) => {
  const [filter, setFilter] = useState<'all' | 'affiche'>(initialFilter);
  const [view, setView] = useState<ViewState>(initialAction === 'add_affiche' ? 'add' : 'list');
  const [modeles, setModeles] = useState<Modele[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // Modèle actuellement sélectionné / en cours d'utilisation
  const [currentModele, setCurrentModele] = useState<Modele | null>(null);

  // État formulaire d'ajout
  const [selectedType, setSelectedType] = useState<string>(
    initialAction === 'add_affiche' ? 'affiche' : 'affiche'
  );
  const [preparedPages, setPreparedPages] = useState<PreparedPage[]>([]);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isInsufficientCreditsError, setIsInsufficientCreditsError] = useState(false);
  const [isLimitReachedError, setIsLimitReachedError] = useState(false);
  const [analysisWarnings, setAnalysisWarnings] = useState<string[]>([]);
  const [analysisProgressText, setAnalysisProgressText] = useState('Analyse en cours…');

  // État renommage
  const [modeleToRename, setModeleToRename] = useState<Modele | null>(null);
  const [newNameInput, setNewNameInput] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);

  // État suppression
  const [modeleToDelete, setModeleToDelete] = useState<Modele | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // État images locales (logos, signatures, fonds, qr)
  const [slotImages, setSlotImages] = useState<Images>({});
  const [uploadingSlotId, setUploadingSlotId] = useState<string | null>(null);

  // État saisie document dynamique
  const [valeurs, setValeurs] = useState<Valeurs>({});
  const [lignes, setLignes] = useState<Lignes>({});
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Onglet sur mobile pour la vue form/aperçu ('form' ou 'preview')
  const [mobileTab, setMobileTab] = useState<'form' | 'preview'>('form');

  // État export image / pdf / partage
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // Aperçu rendu en direct
  const [liveHtml, setLiveHtml] = useState<string>('');
  const [previewScale, setPreviewScale] = useState(1);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const liveIframeRef = useRef<HTMLIFrameElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Détection du mode paysage de l'affiche
  const isPaysage = Boolean(
    currentModele?.css && /(^|[;{\s])width\s*:\s*297mm/.test(currentModele.css)
  );
  // Dimensions réelles A4 portrait (794 × 1123 px) ou paysage (1123 × 794 px)
  const a4Width = isPaysage ? 1123 : 794;
  const a4Height = isPaysage ? 794 : 1123;

  // Chargement de la liste des modèles
  const loadModeles = async () => {
    setLoadingList(true);
    setListError(null);
    const res = await fetchUserModeles(user.id);
    setLoadingList(false);
    if (res.error) {
      setListError(res.error);
    } else {
      setModeles(res.data);
    }
  };

  useEffect(() => {
    loadModeles();
  }, [user.id]);

  // Si l'action initiale change, mettre à jour la vue
  useEffect(() => {
    if (initialAction === 'add_affiche') {
      setSelectedType('affiche');
      setView('add');
    }
    if (initialFilter) {
      setFilter(initialFilter);
    }
  }, [initialAction, initialFilter]);

  // Chargement des images locales d'un modèle dès qu'il est ouvert
  useEffect(() => {
    if (currentModele && currentModele.id && currentModele.images?.length > 0) {
      const slotIds = currentModele.images.map((s) => s.id);
      getModeleImages(currentModele.id, slotIds).then((imgs) => {
        setSlotImages(imgs);
      });
    } else {
      setSlotImages({});
    }
  }, [currentModele]);

  // Sauvegarde automatique du brouillon du modèle en cours dans localStorage
  useEffect(() => {
    if (!currentModele || !currentModele.id || view !== 'form') return;
    try {
      const draft = { valeurs, lignes };
      localStorage.setItem(`visora_brouillon_modele_${currentModele.id}`, JSON.stringify(draft));
    } catch {
      // ignore
    }
  }, [valeurs, lignes, currentModele, view]);

  // Rendu en direct avec débounce de 400 ms
  useEffect(() => {
    if (!currentModele) return;
    const timer = setTimeout(() => {
      try {
        const corps = rendre(currentModele, valeurs, lignes, slotImages);
        const full = pageComplete(currentModele, corps);
        setLiveHtml(full);
      } catch (err) {
        console.warn('Erreur calcul liveHtml:', err);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [currentModele, valeurs, lignes, slotImages]);

  // Calcul dynamique de l'échelle (scale) pour adapter l'A4 aux dimensions du conteneur
  useEffect(() => {
    const el = previewContainerRef.current;
    if (!el) return;

    const updateScale = () => {
      const containerWidth = el.clientWidth || 360;
      const padding = 24;
      const availableW = Math.max(260, containerWidth - padding);
      const s = Math.min(1, availableW / a4Width);
      setPreviewScale(Math.max(0.25, s));
    };

    updateScale();
    const observer = new ResizeObserver(() => updateScale());
    observer.observe(el);
    window.addEventListener('resize', updateScale);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, [a4Width, view, mobileTab]);

  // Animation de texte pendant l'analyse
  useEffect(() => {
    if (!isAnalyzing) return;
    const steps = [
      'Téléversement de la page…',
      'Lecture de la mise en page et des polices…',
      'Détection des textes, prix et coordonnées…',
      'Création des emplacements d’images et du gabarit…',
      'Finalisation de ton modèle…'
    ];
    let idx = 0;
    setAnalysisProgressText(steps[0]);
    const interval = setInterval(() => {
      idx = (idx + 1) % steps.length;
      setAnalysisProgressText(steps[idx]);
    }, 4500);
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  // --------------------------------------------------------------------------
  // FLUX 1 : GESTION DES FICHIERS POUR AJOUT DE MODÈLE
  // --------------------------------------------------------------------------
  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    e.target.value = '';

    setFileError(null);
    setIsProcessingFiles(true);

    try {
      const isPdf = files.some(
        (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
      );

      const maxPages = selectedType === 'affiche' ? 1 : 2;

      if (isPdf) {
        const pdfFile = files.find(
          (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
        )!;
        const pages = await convertPdfToAnalysisPages(pdfFile, maxPages);
        if (pages.length === 0) {
          throw new Error('Impossible de lire les pages de ce PDF.');
        }
        setPreparedPages(pages);
      } else {
        // Pour une affiche : 1 seule image suffit
        const imageFiles = files.slice(0, maxPages);
        const pages: PreparedPage[] = [];
        for (const f of imageFiles) {
          const comp = await compressImageForAnalysis(f);
          pages.push(comp);
        }
        setPreparedPages(pages);
      }
    } catch (err: any) {
      console.warn('Erreur préparation fichiers:', err);
      setFileError(
        err.message || 'Impossible de traiter ce fichier. Utilise une image JPEG, PNG ou un PDF.'
      );
    } finally {
      setIsProcessingFiles(false);
    }
  };

  const handleStartAnalysis = async () => {
    if (preparedPages.length === 0 || isAnalyzing) return;

    setIsAnalyzing(true);
    setAnalysisError(null);
    setIsInsufficientCreditsError(false);
    setIsLimitReachedError(false);
    setAnalysisWarnings([]);

    const payloadPages = preparedPages.map((p) => ({
      media_type: p.media_type,
      donnees: p.donnees
    }));

    const result = await analyserModele(selectedType, payloadPages);
    setIsAnalyzing(false);

    if (!result.success || !result.data) {
      setAnalysisError(result.error || "L'analyse a échoué. Réessaie avec une image plus nette.");
      if (result.isInsufficientCredits) {
        setIsInsufficientCreditsError(true);
      }
      if (result.isLimitReached) {
        setIsLimitReachedError(true);
      }
      return;
    }

    // Mise à jour immédiate du solde de crédits
    if (typeof result.data.credits_restants === 'number') {
      onCreditsChange(result.data.credits_restants);
    } else if (credits !== null) {
      onCreditsChange(Math.max(0, credits - COUT_ANALYSE_AFFICHE));
    }

    if (result.data.avertissements && result.data.avertissements.length > 0) {
      setAnalysisWarnings(result.data.avertissements);
    }

    const nouveauModele: Modele = {
      id: result.data.modele_id,
      nom: result.data.nom,
      type: result.data.type,
      gabarit: result.data.gabarit,
      css: result.data.css,
      champs: result.data.champs,
      groupes: result.data.groupes,
      images: result.data.images
    };

    setCurrentModele(nouveauModele);
    setModeles((prev) => [nouveauModele, ...prev]);

    // Initialisation des valeurs et lignes par défaut
    initModelDraft(nouveauModele);

    // Si images.length > 0, aller aux slots d'images, sinon directement au formulaire
    if (nouveauModele.images && nouveauModele.images.length > 0) {
      setView('slots');
    } else {
      setView('form');
    }
  };

  // --------------------------------------------------------------------------
  // FLUX 2 : GESTION DES IMAGES D'EMPLACEMENT (FOND, LOGO, QR, ETC.)
  // --------------------------------------------------------------------------
  const handleSlotImageUpload = async (slotId: string, role: string, file: File) => {
    if (!currentModele || !currentModele.id) return;
    setUploadingSlotId(slotId);
    try {
      // 2000 px max pour un fond, 800 px max pour les autres rôles
      const isBackground = role === 'fond';
      const dataUrl = await resizeSlotImage(file, isBackground);
      // Enregistre UNIQUEMENT dans IndexedDB local (jamais envoyé au serveur ni à l'IA)
      await saveModeleImage(currentModele.id, slotId, dataUrl);
      setSlotImages((prev) => ({ ...prev, [slotId]: dataUrl }));
    } catch (err: any) {
      console.warn('Erreur téléversement image emplacement:', err);
    } finally {
      setUploadingSlotId(null);
    }
  };

  const handleRemoveSlotImage = async (slotId: string) => {
    if (!currentModele || !currentModele.id) return;
    await deleteModeleImage(currentModele.id, slotId);
    setSlotImages((prev) => {
      const next = { ...prev };
      delete next[slotId];
      return next;
    });
  };

  // --------------------------------------------------------------------------
  // FLUX 3 : REMPLISSAGE DU FORMULAIRE DYNAMIQUE
  // --------------------------------------------------------------------------
  const initModelDraft = (m: Modele) => {
    let restoredVal: Valeurs = {};
    let restoredLignes: Lignes = {};
    if (m.id) {
      try {
        const saved = localStorage.getItem(`visora_brouillon_modele_${m.id}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.valeurs) restoredVal = parsed.valeurs;
          if (parsed.lignes) restoredLignes = parsed.lignes;
        }
      } catch {}
    }

    const initialVal: Valeurs = { ...restoredVal };
    m.champs.forEach((c) => {
      if (initialVal[c.id] === undefined) {
        if (c.id === 'devise') initialVal[c.id] = 'FCFA';
        else if (c.type === 'date') initialVal[c.id] = new Date().toISOString().split('T')[0];
        else initialVal[c.id] = '';
      }
    });
    setValeurs(initialVal);

    const initialLignes: Lignes = { ...restoredLignes };
    m.groupes.forEach((g) => {
      if (!initialLignes[g.id] || initialLignes[g.id].length === 0) {
        const defaultRow: Valeurs = {};
        g.champs.forEach((gc) => {
          defaultRow[gc.id] = gc.id === 'quantite' ? '1' : '';
        });
        initialLignes[g.id] = [defaultRow];
      }
    });
    setLignes(initialLignes);

    // Initialiser le rendu live
    try {
      const corps = rendre(m, initialVal, initialLignes, slotImages);
      setLiveHtml(pageComplete(m, corps));
    } catch {}
  };

  const handleOpenModele = (m: Modele) => {
    setCurrentModele(m);
    initModelDraft(m);
    setView('form');
    setMobileTab('form');
  };

  const handleOpenSlotsForModele = (m: Modele) => {
    setCurrentModele(m);
    setView('slots');
  };

  const handleAddGroupRow = (groupeId: string) => {
    if (!currentModele) return;
    const g = currentModele.groupes.find((x) => x.id === groupeId);
    if (!g) return;

    const currentRows = lignes[groupeId] || [];
    if (currentRows.length >= g.max) return;

    const newRow: Valeurs = {};
    g.champs.forEach((gc) => {
      newRow[gc.id] = gc.id === 'quantite' ? '1' : '';
    });

    setLignes((prev) => ({
      ...prev,
      [groupeId]: [...currentRows, newRow]
    }));
  };

  const handleRemoveGroupRow = (groupeId: string, index: number) => {
    setLignes((prev) => {
      const currentRows = prev[groupeId] || [];
      const updated = currentRows.filter((_, i) => i !== index);
      return {
        ...prev,
        [groupeId]: updated
      };
    });
  };

  const handleGroupFieldChange = (
    groupeId: string,
    rowIndex: number,
    fieldId: string,
    value: string
  ) => {
    setLignes((prev) => {
      const currentRows = [...(prev[groupeId] || [])];
      if (!currentRows[rowIndex]) return prev;
      currentRows[rowIndex] = {
        ...currentRows[rowIndex],
        [fieldId]: value
      };
      return {
        ...prev,
        [groupeId]: currentRows
      };
    });
  };

  // --------------------------------------------------------------------------
  // VALIDATION ET EXPORTATION (PNG, PDF, PARTAGE)
  // --------------------------------------------------------------------------
  const validateBeforeExport = (): boolean => {
    if (!currentModele) return false;
    const manquants = champsManquants(currentModele, valeurs, lignes);
    if (manquants.length > 0) {
      setValidationErrors(manquants);
      return false;
    }
    setValidationErrors([]);
    return true;
  };

  const handleDownloadPng = async () => {
    if (!validateBeforeExport()) return;
    const iframe = liveIframeRef.current;
    if (!iframe?.contentDocument) {
      alert("Aperçu en cours de chargement. Patiente un instant et réessaie.");
      return;
    }

    setIsExportingPng(true);
    try {
      const doc = iframe.contentDocument;
      const targetEl = (doc.querySelector('.gabarit .page') ||
        doc.querySelector('.gabarit') ||
        doc.body) as HTMLElement;

      const canvas = await html2canvas(targetEl, {
        scale: 2,
        backgroundColor: null,
        useCORS: false,
        logging: false
      });

      const dataUrl = canvas.toDataURL('image/png');
      const slug = (currentModele?.nom || 'affiche')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `affiche-${slug || 'visora'}.png`;
      a.click();
    } catch (err) {
      console.error('Erreur export PNG:', err);
      alert("Impossible de générer l'image PNG. Vérifie le modèle.");
    } finally {
      setIsExportingPng(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!validateBeforeExport()) return;
    const iframe = liveIframeRef.current;
    try {
      iframe?.contentWindow?.print();
    } catch {
      window.print();
    }
  };

  const handleShare = async () => {
    if (!validateBeforeExport()) return;
    const iframe = liveIframeRef.current;
    if (!iframe?.contentDocument) return;

    setIsSharing(true);
    try {
      const doc = iframe.contentDocument;
      const targetEl = (doc.querySelector('.gabarit .page') ||
        doc.querySelector('.gabarit') ||
        doc.body) as HTMLElement;

      const canvas = await html2canvas(targetEl, {
        scale: 2,
        backgroundColor: null,
        useCORS: false,
        logging: false
      });

      canvas.toBlob(async (blob) => {
        if (!blob) {
          setIsSharing(false);
          return;
        }
        const slug = (currentModele?.nom || 'affiche')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
        const file = new File([blob], `affiche-${slug || 'visora'}.png`, { type: 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: currentModele?.nom || 'Affiche Visora',
            text: `Voici mon affiche : ${currentModele?.nom}`
          });
        } else if (navigator.share) {
          await navigator.share({
            title: currentModele?.nom || 'Affiche Visora',
            text: `Voici mon affiche : ${currentModele?.nom}`
          });
        } else {
          // Fallback téléchargement si partage non supporté
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `affiche-${slug || 'visora'}.png`;
          a.click();
        }
        setIsSharing(false);
      }, 'image/png');
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Erreur partage:', err);
      }
      setIsSharing(false);
    }
  };

  // --------------------------------------------------------------------------
  // ACTIONS DE GESTION (RENOMMER / SUPPRIMER)
  // --------------------------------------------------------------------------
  const handleConfirmRename = async () => {
    if (!modeleToRename || !modeleToRename.id) return;
    setRenameLoading(true);
    const res = await renameUserModele(modeleToRename.id, newNameInput);
    setRenameLoading(false);
    if (res.success) {
      setModeles((prev) =>
        prev.map((m) =>
          m.id === modeleToRename.id ? { ...m, nom: newNameInput.trim().slice(0, 80) } : m
        )
      );
      if (currentModele?.id === modeleToRename.id) {
        setCurrentModele((prev) =>
          prev ? { ...prev, nom: newNameInput.trim().slice(0, 80) } : null
        );
      }
      setModeleToRename(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!modeleToDelete || !modeleToDelete.id) return;
    setDeleteLoading(true);
    const res = await deleteUserModele(modeleToDelete.id);
    setDeleteLoading(false);
    if (res.success) {
      setModeles((prev) => prev.filter((m) => m.id !== modeleToDelete.id));
      if (currentModele?.id === modeleToDelete.id) {
        setCurrentModele(null);
      }
      setModeleToDelete(null);
    }
  };

  // Totaux calculés en direct pour factures / devis
  const devisFactureTotaux =
    currentModele && (currentModele.type === 'facture' || currentModele.type === 'devis')
      ? calculerTotaux(valeurs, lignes.lignes || [])
      : null;

  // Filtrage des modèles affichés
  const affichesCount = modeles.filter((m) => m.type === 'affiche').length;
  const displayedModeles = filter === 'affiche' ? modeles.filter((m) => m.type === 'affiche') : modeles;

  // ==========================================================================
  // RENDU DU COMPOSANT
  // ==========================================================================
  return (
    <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-900 select-none">
      {/* Top Header */}
      <header className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between z-30 select-none">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => {
              if (view === 'form' || view === 'slots') setView('list');
              else if (view === 'add') setView('list');
              else onBack();
            }}
            className="p-1.5 sm:p-2 -ml-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Retour"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs shrink-0">
            {filter === 'affiche' || currentModele?.type === 'affiche' ? (
              <Palette className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : (
              <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight truncate">
                {view === 'add'
                  ? selectedType === 'affiche'
                    ? "Importer un modèle d'affiche"
                    : 'Ajouter mon modèle'
                  : view === 'slots'
                  ? 'Images du modèle'
                  : view === 'form'
                  ? currentModele?.nom || 'Personnaliser mon affiche'
                  : filter === 'affiche'
                  ? 'Mes affiches'
                  : 'Mes modèles'}
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shrink-0">
                {filter === 'affiche' || currentModele?.type === 'affiche' ? 'Affiche A4' : 'Sur mesure'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate hidden min-[480px]:block">
              {view === 'add'
                ? 'Analyse IA d’après photo ou capture'
                : view === 'slots'
                ? 'Fonds, logos et QR conservés en local'
                : view === 'form'
                ? isPaysage
                  ? 'A4 Paysage • Rendu en direct'
                  : 'A4 Portrait • Rendu en direct'
                : 'Crée tes documents avec tes propres gabarits'}
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

      {/* ===================================================================
          VUE 1 : LISTE DES MODÈLES (« Mes modèles » / « Mes affiches »)
          =================================================================== */}
      {view === 'list' && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-4xl mx-auto w-full space-y-5">
          {/* En-tête d'action + Filtres */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                {filter === 'affiche' ? 'Mes affiches personnalisées' : 'Mes modèles personnalisés'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                {modeles.length} / {MAX_MODELES_PAR_UTILISATEUR} modèle{modeles.length > 1 ? 's' : ''} enregistré{modeles.length > 1 ? 's' : ''}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (modeles.length >= MAX_MODELES_PAR_UTILISATEUR) {
                    alert(
                      `Tu as atteint la limite de ${MAX_MODELES_PAR_UTILISATEUR} modèles. Supprime un modèle existant pour en ajouter un nouveau.`
                    );
                    return;
                  }
                  setPreparedPages([]);
                  setFileError(null);
                  setAnalysisError(null);
                  setIsInsufficientCreditsError(false);
                  setIsLimitReachedError(false);
                  setSelectedType(filter === 'affiche' ? 'affiche' : 'facture');
                  setView('add');
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm shadow-xs transition active:scale-95 cursor-pointer min-h-[44px]"
              >
                <Plus className="w-4 h-4" />
                <span>
                  {filter === 'affiche' ? "Importer une affiche" : "Ajouter mon modèle"}
                </span>
              </button>
            </div>
          </div>

          {/* Onglets Filtres : Tous les modèles / Mes affiches */}
          <div className="flex items-center gap-2 p-1 bg-slate-200/80 dark:bg-slate-800/80 rounded-2xl w-fit">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                filter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Tous les modèles ({modeles.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('affiche')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                filter === 'affiche'
                  ? 'bg-white dark:bg-slate-700 text-fuchsia-700 dark:text-fuchsia-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Affiches ({affichesCount})</span>
            </button>
          </div>

          {loadingList ? (
            <div className="py-16 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-3" />
              <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400">
                Chargement de tes modèles…
              </p>
            </div>
          ) : listError ? (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between">
              <span>{listError}</span>
              <button
                type="button"
                onClick={loadModeles}
                className="underline font-bold ml-2 cursor-pointer"
              >
                Réessayer
              </button>
            </div>
          ) : displayedModeles.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 sm:p-12 text-center border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto">
                {filter === 'affiche' ? <Palette className="w-7 h-7" /> : <Camera className="w-7 h-7" />}
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {filter === 'affiche' ? 'Aucune affiche personnalisée' : 'Aucun modèle personnalisé'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {filter === 'affiche'
                    ? "Envoie une photo ou une capture d'une affiche qui te plaît. Ton affiche aura la même mise en page, avec tes textes et tes images."
                    : "Prends en photo ou envoie la capture d’un CV, d’une facture ou d’une lettre. L’IA reproduit sa structure pour que tu puisses l’utiliser autant de fois que tu veux."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedType(filter === 'affiche' ? 'affiche' : 'facture');
                  setView('add');
                }}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm shadow-xs transition active:scale-95 cursor-pointer min-h-[44px]"
              >
                <Plus className="w-4 h-4" />
                <span>
                  {filter === 'affiche'
                    ? "Importer mon premier modèle d'affiche"
                    : 'Ajouter mon premier modèle'}
                </span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {displayedModeles.map((m) => {
                const isModelAffiche = m.type === 'affiche';
                const hasSlots = m.images && m.images.length > 0;
                const formattedDate = (m as any).created_at
                  ? new Date((m as any).created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short'
                    })
                  : null;

                return (
                  <div
                    key={m.id}
                    className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col justify-between space-y-4 transition hover:border-purple-300 dark:hover:border-purple-700"
                  >
                    <div>
                      {/* Vignette colorée pour les affiches */}
                      {isModelAffiche && (
                        <div className="mb-3 h-20 rounded-2xl bg-gradient-to-br from-fuchsia-600 via-pink-600 to-indigo-700 p-3 flex items-end justify-between text-white shadow-2xs">
                          <div className="flex items-center gap-1.5 text-xs font-bold">
                            <Palette className="w-4 h-4" />
                            <span>Affiche A4</span>
                          </div>
                          {formattedDate && (
                            <span className="text-[10px] text-white/80 bg-black/20 px-2 py-0.5 rounded-full">
                              {formattedDate}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            isModelAffiche
                              ? 'bg-fuchsia-50 dark:bg-fuchsia-950/60 text-fuchsia-700 dark:text-fuchsia-300 border border-fuchsia-200 dark:border-fuchsia-800'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          {isModelAffiche ? 'AFFICHE' : m.type.toUpperCase()}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setModeleToRename(m);
                              setNewNameInput(m.nom);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                            title="Renommer le modèle"
                            aria-label="Renommer le modèle"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setModeleToDelete(m)}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                            title="Supprimer le modèle"
                            aria-label="Supprimer le modèle"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-2 leading-snug line-clamp-2">
                        {m.nom}
                      </h3>

                      <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <span>{m.champs?.length || 0} champ{m.champs?.length > 1 ? 's' : ''}</span>
                        {m.groupes?.length > 0 && (
                          <>
                            <span>•</span>
                            <span>{m.groupes.length} section{m.groupes.length > 1 ? 's' : ''}</span>
                          </>
                        )}
                        {hasSlots && (
                          <>
                            <span>•</span>
                            <span className="text-purple-600 dark:text-purple-400 font-semibold">
                              {m.images.length} image{m.images.length > 1 ? 's' : ''}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenModele(m)}
                        className={`flex-1 py-2 px-3 rounded-xl text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer min-h-[40px] shadow-2xs active:scale-95 ${
                          isModelAffiche ? 'bg-fuchsia-600 hover:bg-fuchsia-700' : 'bg-purple-600 hover:bg-purple-700'
                        }`}
                      >
                        <FileCheck className="w-3.5 h-3.5" />
                        <span>{isModelAffiche ? "Créer l'affiche" : 'Utiliser'}</span>
                      </button>

                      {hasSlots && (
                        <button
                          type="button"
                          onClick={() => handleOpenSlotsForModele(m)}
                          className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer min-h-[40px]"
                          title="Gérer les fonds, logos ou QR de ce modèle"
                        >
                          <ImageIcon className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                          <span>Images</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================
          VUE 2 : AJOUTER UN MODÈLE (FLUX 1)
          =================================================================== */}
      {view === 'add' && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-xl mx-auto w-full space-y-5">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-5">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                {selectedType === 'affiche'
                  ? "Importer un modèle d'affiche"
                  : 'Nouveau modèle depuis une photo ou capture'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                L’IA analyse la structure, les polices et la disposition de ton document.
              </p>
            </div>

            {/* Étape 1 : Choix du type de document */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                1. Quel type de document veux-tu reproduire ?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TYPE_OPTIONS.map((t) => {
                  const isSelected = selectedType === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      disabled={isAnalyzing}
                      onClick={() => setSelectedType(t.id)}
                      className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer min-h-[72px] ${
                        isSelected
                          ? 'border-purple-600 dark:border-purple-400 bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 font-bold shadow-2xs'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-xs font-bold">{t.label}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">
                        {t.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Affiche Spécifique : Texte d'aide & Avertissement de responsabilité */}
            {selectedType === 'affiche' && (
              <div className="p-3.5 rounded-2xl bg-fuchsia-50 dark:bg-fuchsia-950/40 border border-fuchsia-200 dark:border-fuchsia-800/60 text-xs text-fuchsia-900 dark:text-fuchsia-200 space-y-1.5 leading-relaxed">
                <p className="font-semibold">
                  Envoie une photo ou une capture d'une affiche qui te plaît. Ton affiche aura la même mise en page, avec tes textes et tes images.
                </p>
                <p className="text-[11px] text-fuchsia-700 dark:text-fuchsia-300">
                  Les images et logos que tu ajoutes restent sous ta responsabilité.
                </p>
              </div>
            )}

            {/* Étape 2 : Envoi des images ou du PDF */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                {selectedType === 'affiche'
                  ? "2. Capture ou photo de l'affiche (1 image)"
                  : '2. Capture ou photo du document (1 ou 2 pages)'}
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                multiple={selectedType !== 'affiche'}
                className="hidden"
                onChange={handleFilesSelected}
              />

              {preparedPages.length === 0 ? (
                <div
                  onClick={() => !isProcessingFiles && !isAnalyzing && fileInputRef.current?.click()}
                  className="p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl hover:border-purple-500 transition text-center cursor-pointer bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center gap-2"
                >
                  {isProcessingFiles ? (
                    <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                  ) : (
                    <Upload className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                  )}
                  <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                    {isProcessingFiles
                      ? 'Compression côté client…'
                      : selectedType === 'affiche'
                      ? "Choisir la photo de l'affiche"
                      : 'Choisir une photo ou un PDF'}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs">
                    {selectedType === 'affiche'
                      ? "1 image (JPG, PNG, WebP) ou 1ère page d'un PDF"
                      : "JPG, PNG, WebP (1 ou 2 images) ou fichier PDF (les 2 premières pages)"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className={`grid ${preparedPages.length > 1 ? 'grid-cols-2' : 'grid-cols-1 max-w-[240px] mx-auto'} gap-3`}>
                    {preparedPages.map((page, idx) => (
                      <div
                        key={idx}
                        className="relative rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-900 aspect-3/4 flex items-center justify-center shadow-xs"
                      >
                        <img
                          src={page.previewUrl}
                          alt={`Page ${idx + 1}`}
                          className="w-full h-full object-contain"
                        />
                        <span className="absolute bottom-1.5 left-1.5 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Page {idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>

                  {!isAnalyzing && (
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => setPreparedPages([])}
                        className="text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer underline"
                      >
                        Choisir une autre image
                      </button>
                    </div>
                  )}
                </div>
              )}

              {fileError && (
                <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold mt-2">
                  {fileError}
                </p>
              )}
            </div>

            {/* RÈGLE NON NÉGOCIABLE : Mention obligatoire du coût */}
            <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/60 text-xs text-purple-900 dark:text-purple-200 leading-relaxed flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">
                  L'analyse coûte {COUT_ANALYSE_AFFICHE} crédits, une seule fois.
                </p>
                <p className="mt-0.5 text-purple-800 dark:text-purple-300">
                  Ensuite, toutes tes affiches avec ce modèle sont gratuites.
                </p>
              </div>
            </div>

            {/* Messages d'erreur de l'analyse */}
            {analysisError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-700 dark:text-rose-300 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="font-semibold">{analysisError}</span>
                </div>
                {isInsufficientCreditsError && (
                  <button
                    type="button"
                    onClick={onOpenRecharge}
                    className="w-full py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition cursor-pointer"
                  >
                    Recharger des crédits
                  </button>
                )}
                {isLimitReachedError && (
                  <button
                    type="button"
                    onClick={() => setView('list')}
                    className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition cursor-pointer"
                  >
                    Gérer et supprimer des modèles
                  </button>
                )}
              </div>
            )}

            {/* Avertissements éventuels */}
            {analysisWarnings.length > 0 && (
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 space-y-1">
                <span className="font-bold">Remarques sur la lisibilité :</span>
                <ul className="list-disc list-inside">
                  {analysisWarnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Boutons Annuler / Continuer */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                disabled={isAnalyzing}
                onClick={() => setView('list')}
                className="flex-1 py-3 px-4 rounded-2xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm transition cursor-pointer min-h-[44px]"
              >
                Annuler
              </button>

              <button
                type="button"
                disabled={preparedPages.length === 0 || isAnalyzing}
                onClick={handleStartAnalysis}
                className="flex-1 py-3 px-4 rounded-2xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-xs transition active:scale-95 cursor-pointer min-h-[44px] flex items-center justify-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{analysisProgressText}</span>
                  </>
                ) : (
                  <>
                    <span>Continuer ({COUT_ANALYSE_AFFICHE} crédits)</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          VUE 3 : LOGOS, FONDS ET IMAGES DU MODÈLE (FLUX 2)
          =================================================================== */}
      {view === 'slots' && currentModele && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-xl mx-auto w-full space-y-5">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-5">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                {currentModele.type === 'affiche'
                  ? "Images et visuels de l'affiche"
                  : 'Logos et images de ton modèle'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Ton modèle contient {currentModele.images?.length || 0} emplacement{currentModele.images?.length > 1 ? 's' : ''} visuel{currentModele.images?.length > 1 ? 's' : ''}.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
              🔒 <strong>Privé & local :</strong> Tes images, logos et codes QR restent uniquement sur ton appareil (IndexedDB). Ils ne sont jamais envoyés à une IA ni au serveur.
            </div>

            {/* Liste des emplacements (fond, logo, illustration, photo, qr, etc.) */}
            <div className="space-y-4">
              {currentModele.images?.map((slot) => {
                const currentImg = slotImages[slot.id];
                const isUploading = uploadingSlotId === slot.id;
                const roleDef = ROLE_INFO[slot.role] || {
                  label: slot.role.toUpperCase(),
                  desc: slot.description
                };
                const isBackground = slot.role === 'fond';

                return (
                  <div
                    key={slot.id}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                          {roleDef.label}
                        </span>
                        {isBackground && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                            Plein écran (2000px max)
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                        {slot.description || roleDef.desc}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {isBackground
                          ? "Image d'arrière-plan en haute résolution"
                          : "PNG transparent ou JPEG"}
                      </p>
                    </div>

                    {currentImg ? (
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 rounded-xl border border-slate-300 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800 p-1 flex items-center justify-center shrink-0">
                          <img
                            src={currentImg}
                            alt={slot.description}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="py-2 px-3 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-xs font-bold text-slate-800 dark:text-slate-100 cursor-pointer min-h-[40px] flex items-center">
                            <span>Changer</span>
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleSlotImageUpload(slot.id, slot.role, f);
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => handleRemoveSlotImage(slot.id)}
                            className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
                            title="Retirer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="inline-flex items-center gap-2 py-2 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs cursor-pointer min-h-[40px] transition active:scale-95">
                          {isUploading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4" />
                          )}
                          <span>
                            {isUploading ? "Traitement…" : `Ajouter : ${roleDef.label}`}
                          </span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            disabled={isUploading}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleSlotImageUpload(slot.id, slot.role, f);
                            }}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setView('form')}
                className="w-full py-3 px-4 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm shadow-xs transition active:scale-95 cursor-pointer min-h-[44px] flex items-center justify-center gap-2"
              >
                <span>Continuer vers le formulaire</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          VUE 4 : FORMULAIRE DYNAMIQUE + APERÇU EN DIRECT (FLUX 3)
          Desktop (>= 1024px) : 2 colonnes (formulaire à gauche, aperçu en direct à droite)
          Mobile (< 1024px) : Onglets "Modifier" et "Aperçu"
          =================================================================== */}
      {view === 'form' && currentModele && (
        <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden">
          {/* Barre d'action supérieure avec bascule mobile et boutons d'export */}
          <div className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-4 py-2 flex items-center justify-between gap-2 z-20">
            {/* Bascule mobile : Modifier / Aperçu */}
            <div className="flex items-center gap-1.5 lg:hidden bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setMobileTab('form')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  mobileTab === 'form'
                    ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Modifier
              </button>
              <button
                type="button"
                onClick={() => setMobileTab('preview')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  mobileTab === 'preview'
                    ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Aperçu</span>
              </button>
            </div>

            {/* Titre ou statut */}
            <div className="hidden lg:flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {currentModele.nom}
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                • {isPaysage ? 'A4 Paysage (1123 × 794)' : 'A4 Portrait (794 × 1123)'}
              </span>
            </div>

            {/* Boutons d'exportation */}
            <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
              <span className="hidden sm:inline-flex text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Gratuit
              </span>

              {/* Télécharger en image PNG (html2canvas) */}
              <button
                type="button"
                disabled={isExportingPng}
                onClick={handleDownloadPng}
                className="py-1.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs transition active:scale-95 cursor-pointer flex items-center gap-1.5 min-h-[38px] shadow-2xs"
                title="Télécharger l'affiche en haute résolution PNG (x2)"
              >
                {isExportingPng ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Création de l'image…</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>Télécharger en image (PNG)</span>
                  </>
                )}
              </button>

              {/* Télécharger en PDF */}
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="py-1.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition cursor-pointer flex items-center gap-1.5 min-h-[38px]"
                title="Imprimer ou enregistrer en PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Télécharger en PDF</span>
                <span className="sm:hidden">PDF</span>
              </button>

              {/* Partager */}
              <button
                type="button"
                disabled={isSharing}
                onClick={handleShare}
                className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition cursor-pointer flex items-center gap-1.5 min-h-[38px]"
                title="Partager l'affiche"
              >
                {isSharing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Share2 className="w-3.5 h-3.5" />
                )}
                <span className="hidden md:inline">Partager</span>
              </button>
            </div>
          </div>

          {/* Corps : Colonne gauche (formulaire) et Colonne droite (aperçu en direct) */}
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
            {/* Colonne Formulaire (visible sur desktop, ou sur mobile si mobileTab === 'form') */}
            <div
              className={`flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 lg:w-1/2 lg:border-r border-slate-200 dark:border-slate-800 ${
                mobileTab === 'preview' ? 'hidden lg:block' : 'block'
              }`}
            >
              <div className="max-w-xl mx-auto space-y-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                      {currentModele.type}
                    </span>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                      {currentModele.nom}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Remplis les champs ci-dessous : l'aperçu s'actualise en direct.
                    </p>
                  </div>

                  {currentModele.images?.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setView('slots')}
                      className="px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 text-purple-700 dark:text-purple-300 text-xs font-bold transition flex items-center gap-1.5 shrink-0"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Images ({currentModele.images.length})</span>
                    </button>
                  )}
                </div>

                {/* Erreurs de validation (champs manquants) */}
                {validationErrors.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-700 dark:text-rose-300 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Remplis les champs obligatoires avant de télécharger :</span>
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 pl-1">
                      {validationErrors.map((errName, i) => (
                        <li key={i}>{errName}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 1. Champs simples */}
                <div className="space-y-4 bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    {currentModele.type === 'affiche'
                      ? "Textes et informations de l'affiche"
                      : "Informations du document"}
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {currentModele.champs?.map((champ) => {
                      const val = valeurs[champ.id] ?? '';
                      const isFullWidth = champ.type === 'texte_long';
                      const isAffiche = currentModele.type === 'affiche';

                      return (
                        <div key={champ.id} className={isFullWidth ? 'sm:col-span-2' : ''}>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                              {champ.libelle}
                              {champ.obligatoire && <span className="text-rose-500 ml-1">*</span>}
                            </label>
                            {/* Compteur de caractères pour les affiches */}
                            {isAffiche && (
                              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                                {String(val).length} caractères
                              </span>
                            )}
                          </div>

                          {champ.type === 'texte_long' ? (
                            <textarea
                              rows={3}
                              value={val}
                              onChange={(e) =>
                                setValeurs((prev) => ({ ...prev, [champ.id]: e.target.value }))
                              }
                              placeholder={champ.aide || ''}
                              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          ) : (
                            <input
                              type={
                                champ.type === 'date'
                                  ? 'date'
                                  : champ.type === 'email'
                                  ? 'email'
                                  : champ.type === 'telephone'
                                  ? 'tel'
                                  : 'text'
                              }
                              inputMode={
                                champ.type === 'montant' || champ.type === 'nombre'
                                  ? 'decimal'
                                  : undefined
                              }
                              value={val}
                              onChange={(e) =>
                                setValeurs((prev) => ({ ...prev, [champ.id]: e.target.value }))
                              }
                              placeholder={champ.aide || ''}
                              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          )}

                          {champ.aide && (
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                              💡 {champ.aide}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Groupes répétables (lignes de facture, plannings, etc.) */}
                {currentModele.groupes?.map((groupe) => {
                  const rows = lignes[groupe.id] || [];
                  const canAdd = rows.length < groupe.max;
                  const isLignesFacture = groupe.id === 'lignes';

                  return (
                    <div
                      key={groupe.id}
                      className="space-y-3 bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                            {groupe.libelle}
                          </h3>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            {rows.length} sur {groupe.max} max
                          </p>
                        </div>

                        <button
                          type="button"
                          disabled={!canAdd}
                          onClick={() => handleAddGroupRow(groupe.id)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-purple-50 hover:text-purple-600 disabled:opacity-40 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Ajouter une ligne</span>
                        </button>
                      </div>

                      <div className="space-y-3">
                        {rows.map((row, rIdx) => {
                          const ligneTotale =
                            isLignesFacture && devisFactureTotaux?.lignes?.[rIdx]
                              ? devisFactureTotaux.lignes[rIdx]
                              : null;

                          return (
                            <div
                              key={rIdx}
                              className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700 space-y-3"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                  Ligne {rIdx + 1}
                                </span>
                                {rows.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveGroupRow(groupe.id, rIdx)}
                                    className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                                    title="Supprimer cette ligne"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {groupe.champs.map((gc) => (
                                  <div key={gc.id}>
                                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                                      {gc.libelle}
                                      {gc.obligatoire && <span className="text-rose-500 ml-0.5">*</span>}
                                    </label>
                                    <input
                                      type="text"
                                      inputMode={
                                        gc.type === 'montant' || gc.type === 'nombre' ? 'decimal' : undefined
                                      }
                                      value={row[gc.id] ?? ''}
                                      onChange={(e) =>
                                        handleGroupFieldChange(groupe.id, rIdx, gc.id, e.target.value)
                                      }
                                      placeholder={gc.aide || ''}
                                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                  </div>
                                ))}
                              </div>

                              {ligneTotale && (
                                <div className="text-right text-[11px] font-bold text-slate-700 dark:text-slate-300 pt-1">
                                  Total ligne :{' '}
                                  <span className="text-purple-600 dark:text-purple-400">
                                    {ligneTotale}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* 3. Totaux calculés en direct (Devis & Facture) */}
                {devisFactureTotaux && (
                  <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/60 space-y-1.5 text-xs">
                    <span className="font-bold text-purple-900 dark:text-purple-200 uppercase tracking-wider text-[11px]">
                      Totaux calculés en direct
                    </span>
                    <div className="flex justify-between text-slate-700 dark:text-slate-300 pt-1">
                      <span>Sous-total HT :</span>
                      <span className="font-bold">{devisFactureTotaux.hauts.sous_total_ht}</span>
                    </div>
                    {devisFactureTotaux.hauts.remise_globale && (
                      <div className="flex justify-between text-rose-600">
                        <span>Remise globale :</span>
                        <span className="font-bold">- {devisFactureTotaux.hauts.remise_globale}</span>
                      </div>
                    )}
                    {devisFactureTotaux.hauts.tva_montant && (
                      <div className="flex justify-between text-slate-700 dark:text-slate-300">
                        <span>TVA :</span>
                        <span className="font-bold">{devisFactureTotaux.hauts.tva_montant}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-black text-purple-900 dark:text-purple-100 pt-1 border-t border-purple-200/80 dark:border-purple-800/80">
                      <span>Total TTC :</span>
                      <span>{devisFactureTotaux.hauts.total_ttc}</span>
                    </div>
                    {devisFactureTotaux.hauts.reste_a_payer && (
                      <div className="flex justify-between text-slate-700 dark:text-slate-300 font-semibold pt-0.5">
                        <span>Reste à payer :</span>
                        <span>{devisFactureTotaux.hauts.reste_a_payer}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Bascule mobile pour voir l'aperçu */}
                <div className="lg:hidden pt-2">
                  <button
                    type="button"
                    onClick={() => setMobileTab('preview')}
                    className="w-full py-3 px-4 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm shadow-xs transition active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Voir l'aperçu en direct</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Colonne Aperçu en Direct (visible sur desktop, ou sur mobile si mobileTab === 'preview') */}
            <div
              ref={previewContainerRef}
              className={`flex-1 min-h-0 lg:w-1/2 bg-slate-200 dark:bg-slate-950 overflow-auto p-4 flex flex-col items-center justify-start ${
                mobileTab === 'form' ? 'hidden lg:flex' : 'flex'
              }`}
            >
              {/* Conteneur avec dimensions réelles et transform: scale() */}
              <div
                style={{
                  width: `${a4Width}px`,
                  minHeight: `${a4Height}px`,
                  transform: previewScale < 1 ? `scale(${previewScale})` : undefined,
                  transformOrigin: 'top center',
                  marginBottom:
                    previewScale < 1
                      ? `-${Math.round(a4Height * (1 - previewScale))}px`
                      : '16px'
                }}
                className="bg-white shadow-2xl rounded-sm overflow-hidden shrink-0 border border-slate-300"
              >
                {/* RÈGLE NON NÉGOCIABLE : iframe sandbox="allow-same-origin", JAMAIS allow-scripts */}
                <iframe
                  ref={liveIframeRef}
                  srcDoc={liveHtml}
                  sandbox="allow-same-origin"
                  title="Aperçu de l'affiche"
                  style={{
                    width: `${a4Width}px`,
                    height: `${a4Height}px`
                  }}
                  className="border-0 pointer-events-auto"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          MODALE DE RENOMMAGE
          =================================================================== */}
      {modeleToRename && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Renommer le modèle
            </h3>
            <input
              type="text"
              maxLength={80}
              value={newNameInput}
              onChange={(e) => setNewNameInput(e.target.value)}
              placeholder="Nom du modèle (80 caractères max)"
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={renameLoading}
                onClick={() => setModeleToRename(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer min-h-[40px]"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={renameLoading || !newNameInput.trim()}
                onClick={handleConfirmRename}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition cursor-pointer min-h-[40px] flex items-center gap-1.5"
              >
                {renameLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Enregistrer</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          MODALE DE SUPPRESSION
          =================================================================== */}
      {modeleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                  Supprimer ce modèle ?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  « {modeleToDelete.nom} »
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Cette action est irréversible. Le gabarit et les images enregistrés localement sur ton appareil seront définitivement supprimés.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={deleteLoading}
                onClick={() => setModeleToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer min-h-[40px]"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition cursor-pointer min-h-[40px] flex items-center gap-1.5"
              >
                {deleteLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Supprimer</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
