import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  Upload,
  Trash2,
  AlertCircle,
  Loader2,
  Coins,
  Image as ImageIcon
} from 'lucide-react';
import type { UserProfile, GeneratedImagePayload } from '../types';
import {
  invokeGenerateImageFunction,
  uploadImageSourceToStorage
} from '../services/supabase';

export type ImageTabMode = 'image' | 'affiche' | 'fiche_produit' | 'modifier';

interface SourcePhotoItem {
  id: string;
  file?: File;
  url: string;
  serverPath?: string;
  name: string;
}

interface CreateImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  credits: number | null;
  onCreditsChange: (newCredits: number) => void;
  onImageGenerated: (payload: GeneratedImagePayload) => void;
  onOpenRecharge: () => void;
  initialMode?: ImageTabMode;
  initialPhotoUrl?: string;
  initialPrompt?: string;
  initialFormat?: string;
  initialResolution?: '1K' | '2K';
}

const TAB_CONFIG: { mode: ImageTabMode; label: string; placeholder: string; requiresPhoto?: boolean }[] = [
  {
    mode: 'image',
    label: 'Image',
    placeholder: 'Ex : Un coucher de soleil chaleureux sur une plage tropicale, style photographique haute définition…'
  },
  {
    mode: 'affiche',
    label: 'Affiche',
    placeholder: 'Ex : Affiche moderne pour un concert de jazz avec typographie percutante et jeu de contrastes…'
  },
  {
    mode: 'fiche_produit',
    label: 'Fiche produit',
    placeholder: 'Ex : Présentation épurée d’un flacon de parfum sur fond marbre blanc avec éclairage studio doux…'
  },
  {
    mode: 'modifier',
    label: 'Modifier une photo',
    placeholder: 'Ex : Remplace l’arrière-plan par un bureau contemporain et améliore la lumière sur le sujet…',
    requiresPhoto: true
  }
];

const FORMAT_OPTIONS: { id: string; label: string; aspect: string }[] = [
  { id: '1:1', label: '1:1', aspect: 'w-3.5 h-3.5' },
  { id: '4:3', label: '4:3', aspect: 'w-4 h-3' },
  { id: '3:4', label: '3:4', aspect: 'w-3 h-4' },
  { id: '3:2', label: '3:2', aspect: 'w-4.5 h-3' },
  { id: '2:3', label: '2:3', aspect: 'w-3 h-4.5' },
  { id: '16:9', label: '16:9', aspect: 'w-5 h-2.8' },
  { id: '9:16', label: '9:16', aspect: 'w-2.8 h-5' }
];

export const CreateImageModal: React.FC<CreateImageModalProps> = ({
  isOpen,
  onClose,
  user,
  credits,
  onCreditsChange,
  onImageGenerated,
  onOpenRecharge,
  initialMode = 'image',
  initialPhotoUrl,
  initialPrompt = '',
  initialFormat = '1:1',
  initialResolution = '1K'
}) => {
  const [activeTab, setActiveTab] = useState<ImageTabMode>(initialMode);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [format, setFormat] = useState(initialFormat);
  const [resolution, setResolution] = useState<'1K' | '2K'>(initialResolution);
  const [photos, setPhotos] = useState<SourcePhotoItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isInsufficientCredits, setIsInsufficientCredits] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronisation lors de l'ouverture ou des modifications de props
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialMode);
      setPrompt(initialPrompt);
      setFormat(initialFormat);
      setResolution(initialResolution);
      setErrorMsg(null);
      setIsInsufficientCredits(false);

      if (initialPhotoUrl) {
        setPhotos([
          {
            id: 'init_' + Date.now(),
            url: initialPhotoUrl,
            name: 'Image sélectionnée'
          }
        ]);
      } else {
        setPhotos([]);
      }
    }
  }, [isOpen, initialMode, initialPhotoUrl, initialPrompt, initialFormat, initialResolution]);

  // Fermeture via la touche Échap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isGenerating) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isGenerating, onClose]);

  if (!isOpen) return null;

  const currentTabConfig = TAB_CONFIG.find((t) => t.mode === activeTab) || TAB_CONFIG[0];
  const requiresPhoto = Boolean(currentTabConfig.requiresPhoto);
  const showPhotoUploader = activeTab === 'fiche_produit' || activeTab === 'modifier';

  const cost = resolution === '2K' ? 2 : 1;
  const isPromptValid = prompt.trim().length > 0;
  const isPhotosValid = !requiresPhoto || photos.length > 0;
  const canGenerate = isPromptValid && isPhotosValid && !isGenerating;

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setErrorMsg(null);

    const validNewItems: SourcePhotoItem[] = [];
    const maxFiles = 3;

    for (const file of files) {
      if (photos.length + validNewItems.length >= maxFiles) {
        setErrorMsg('Tu peux ajouter au maximum 3 photos.');
        break;
      }

      // Vérification du type (JPG, PNG, WebP)
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setErrorMsg('Format non supporté. Utilise des images JPG, PNG ou WebP.');
        continue;
      }

      // Vérification de la taille (10 Mo maximum)
      if (file.size > 10 * 1024 * 1024) {
        setErrorMsg(`Le fichier "${file.name}" dépasse la limite de 10 Mo.`);
        continue;
      }

      const objectUrl = URL.createObjectURL(file);
      validNewItems.push({
        id: 'photo_' + Math.random().toString(36).substring(2, 9),
        file,
        url: objectUrl,
        name: file.name
      });
    }

    if (validNewItems.length > 0) {
      setPhotos((prev) => [...prev, ...validNewItems]);
    }

    // Réinitialise l'input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target && target.url.startsWith('blob:')) {
        URL.revokeObjectURL(target.url);
      }
      return prev.filter((p) => p.id !== id);
    });
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canGenerate) return;

    setErrorMsg(null);
    setIsInsufficientCredits(false);
    setIsGenerating(true);

    try {
      // 1. Envoi des photos dans le bucket Supabase "uploads" sous le chemin {user_id}/images-src/{uuid}.{ext}
      const uploadedSourcePaths: string[] = [];

      for (const item of photos) {
        if (item.serverPath) {
          uploadedSourcePaths.push(item.serverPath);
        } else if (item.file) {
          const path = await uploadImageSourceToStorage(user.id, item.file);
          if (path) {
            uploadedSourcePaths.push(path);
          }
        } else if (item.url) {
          // Si c'est une URL déjà existante (ex: modification d'une image générée précédemment)
          uploadedSourcePaths.push(item.url);
        }
      }

      // 2. Appel de la fonction "image-generer"
      const result = await invokeGenerateImageFunction(
        {
          mode: activeTab,
          prompt: prompt.trim(),
          format,
          resolution,
          sources: uploadedSourcePaths
        },
        user.id
      );

      if (result.error) {
        setErrorMsg(result.error);
        if (result.isInsufficientCredits) {
          setIsInsufficientCredits(true);
        }
        if (typeof result.credits_restants === 'number') {
          onCreditsChange(result.credits_restants);
        }
        setIsGenerating(false);
        return;
      }

      if (typeof result.credits_restants === 'number') {
        onCreditsChange(result.credits_restants);
      }

      if (result.url) {
        onImageGenerated({
          image_id: result.image_id,
          url: result.url,
          mode: activeTab,
          prompt: prompt.trim(),
          format,
          resolution,
          sources: uploadedSourcePaths,
          sourceLocalUrls: photos.map((p) => p.url),
          created_at: new Date().toISOString()
        });
        onClose();
      } else {
        setErrorMsg("Aucune image n'a été renvoyée par le service. Merci de réessayer.");
      }
    } catch (err: any) {
      console.warn('handleGenerate exception:', err);
      setErrorMsg("Impossible de générer l'image. Merci de vérifier ta connexion.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* Backdrop sombre */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={() => {
          if (!isGenerating) onClose();
        }}
        aria-hidden="true"
      />

      {/* Conteneur modal : feuille depuis le bas sur mobile, fenêtre centrée 520 px sur ordinateur */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-image-title"
        className="relative w-full md:max-w-[520px] bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-3xl shadow-2xl border-t md:border border-slate-200/80 dark:border-slate-800 flex flex-col max-h-[92dvh] md:max-h-[88dvh] overflow-hidden z-10 animate-in slide-in-from-bottom duration-250 ease-out select-none"
        style={{
          paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))'
        }}
      >
        {/* En-tête */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 id="modal-image-title" className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
                Créer une image
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Génération graphique haute fidélité
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              <Coins className="w-3 h-3 text-amber-500" />
              <span>{credits ?? 0}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isGenerating}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-40"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barre des 4 onglets : Image, Affiche, Fiche produit, Modifier une photo */}
        <div className="px-5 pt-3 shrink-0">
          <div className="flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 overflow-x-auto no-scrollbar gap-1">
            {TAB_CONFIG.map((t) => {
              const isActive = activeTab === t.mode;
              return (
                <button
                  key={t.mode}
                  type="button"
                  disabled={isGenerating}
                  onClick={() => {
                    setActiveTab(t.mode);
                    setErrorMsg(null);
                  }}
                  className={`flex-1 min-w-[76px] py-1.5 px-2 text-xs font-semibold rounded-xl transition cursor-pointer text-center whitespace-nowrap ${
                    isActive
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Corps déroulant du formulaire */}
        <form onSubmit={handleGenerate} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Alerte d'erreur */}
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-xs text-red-700 dark:text-red-300 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                <span className="leading-relaxed">{errorMsg}</span>
              </div>
              {isInsufficientCredits && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onOpenRecharge();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold rounded-xl text-xs transition cursor-pointer"
                  >
                    <Coins className="w-3.5 h-3.5" />
                    <span>Recharger mes crédits</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Champ de description : 3 lignes, 1000 caractères max, compteur discret */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Description de l'image
              </label>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                {prompt.length}/1000
              </span>
            </div>
            <textarea
              rows={3}
              maxLength={1000}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={currentTabConfig.placeholder}
              disabled={isGenerating}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-slate-900 dark:text-white text-xs sm:text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-800 transition resize-none leading-relaxed"
            />
          </div>

          {/* Section photo (Fiche produit & Modifier une photo) */}
          {showPhotoUploader && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {requiresPhoto ? 'Photo de référence (obligatoire)' : 'Photo de référence (optionnelle)'}
                </label>
                <span className="text-[11px] text-slate-400">1 à 3 photos (max 10 Mo)</span>
              </div>

              {/* Aperçu des photos sélectionnées */}
              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((item) => (
                    <div
                      key={item.id}
                      className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 aspect-square bg-slate-100 dark:bg-slate-800"
                    >
                      <img
                        src={item.url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(item.id)}
                        disabled={isGenerating}
                        className="absolute top-1 right-1 p-1 rounded-lg bg-black/60 hover:bg-red-600 text-white transition cursor-pointer"
                        title="Retirer la photo"
                        aria-label="Retirer cette photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Bouton "Ajouter une photo" */}
              {photos.length < 3 && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handlePhotoSelect}
                    disabled={isGenerating}
                    className="hidden"
                    id="photo-upload-input"
                  />
                  <label
                    htmlFor="photo-upload-input"
                    className="w-full py-2.5 px-3.5 border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-2xl flex items-center justify-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Ajouter une photo (JPG, PNG, WebP)</span>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Format : 1:1, 4:3, 3:4, 3:2, 2:3, 16:9, 9:16 (puces cliquables avec petit aperçu de forme) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Format d'image
            </label>
            <div className="flex flex-wrap gap-1.5">
              {FORMAT_OPTIONS.map((f) => {
                const isSelected = format === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    disabled={isGenerating}
                    onClick={() => setFormat(f.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 shadow-2xs font-semibold'
                        : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    {/* Petit aperçu géométrique de la forme */}
                    <span
                      aria-hidden="true"
                      className={`border border-current rounded-xs shrink-0 ${f.aspect}`}
                    />
                    <span>{f.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Qualité : Standard (1 crédit) ou Haute (2 crédits) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Qualité de rendu
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isGenerating}
                onClick={() => setResolution('1K')}
                className={`flex items-center justify-between p-2.5 rounded-2xl border text-left transition cursor-pointer ${
                  resolution === '1K'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 shadow-2xs'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="text-xs font-bold leading-tight">Standard</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">1 crédit · 1K rapide</div>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                    resolution === '1K' ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
                  }`}
                >
                  {resolution === '1K' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </button>

              <button
                type="button"
                disabled={isGenerating}
                onClick={() => setResolution('2K')}
                className={`flex items-center justify-between p-2.5 rounded-2xl border text-left transition cursor-pointer ${
                  resolution === '2K'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 shadow-2xs'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="text-xs font-bold leading-tight">Haute</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">2 crédits · 2K détaillé</div>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                    resolution === '2K' ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
                  }`}
                >
                  {resolution === '2K' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </button>
            </div>
          </div>

          {/* État de chargement pendant la création (jusqu'à 2 minutes) */}
          {isGenerating && (
            <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/60 flex items-center gap-3 animate-pulse">
              <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin shrink-0" />
              <p className="text-xs font-semibold text-blue-900 dark:text-blue-200 leading-snug">
                Création en cours, cela peut prendre jusqu'à une minute
              </p>
            </div>
          )}

          {/* Bouton Générer affichant le coût */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={!canGenerate}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 text-white font-bold rounded-2xl text-sm shadow-md shadow-blue-500/20 disabled:shadow-none transition flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed min-h-[46px]"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Génération en cours…</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Générer ({cost} crédit{cost > 1 ? 's' : ''})</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
