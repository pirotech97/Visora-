import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  ArrowUp,
  Paperclip,
  FileText,
  Image as ImageIcon,
  Zap,
  X,
  Loader2,
  AlertCircle,
  Video,
  Mic,
  Music
} from 'lucide-react';
import type { PendingFile, ConvertedPage } from '../types';
import { processDocumentFile } from '../services/pdfConverter';
import { SEUIL_ALERTE, openWhatsAppRecharge } from '../services/constants';

// Largeur maximale facile à modifier
export const COMPOSER_MAX_WIDTH = '640px';
export { SEUIL_ALERTE };

interface ChatComposerProps {
  inputText: string;
  setInputText: (text: string) => void;
  pendingFile: PendingFile | null;
  setPendingFile: (file: PendingFile | null) => void;
  isProcessing: boolean;
  onSendTextMessage: (text: string) => void;
  onTriggerExtract: (
    file: File,
    userText?: string,
    preloadedPages?: ConvertedPage[]
  ) => void;
  onError: (msg: string) => void;
  onFocusTextarea?: () => void;
  credits?: number | null;
  userEmail?: string;
  onOpenRecharge?: () => void;
  onOpenCreateImage?: () => void;
  onOpenCreateMedia?: (initialTab?: 'video' | 'audio' | 'musique') => void;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  inputText,
  setInputText,
  pendingFile,
  setPendingFile,
  isProcessing,
  onSendTextMessage,
  onTriggerExtract,
  onError,
  onFocusTextarea,
  credits = null,
  userEmail = '',
  onOpenRecharge,
  onOpenCreateImage,
  onOpenCreateMedia
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAlertDismissed, setIsAlertDismissed] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const plusButtonRef = useRef<HTMLButtonElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const addFileInputRef = useRef<HTMLInputElement>(null);
  const extractFileInputRef = useRef<HTMLInputElement>(null);

  // Si le solde change ou si un fichier en attente demande plus de crédits que le solde, réafficher l'alerte
  const lastCreditsRef = useRef(credits);
  const lastPendingFileRef = useRef(pendingFile);

  useEffect(() => {
    if (credits !== lastCreditsRef.current) {
      setIsAlertDismissed(false);
      lastCreditsRef.current = credits;
    }
  }, [credits]);

  useEffect(() => {
    if (pendingFile !== lastPendingFileRef.current) {
      if (pendingFile && credits !== null && pendingFile.pageCount > credits) {
        setIsAlertDismissed(false);
      }
      lastPendingFileRef.current = pendingFile;
    }
  }, [pendingFile, credits]);

  const desktopMenuRef = useRef<HTMLDivElement>(null);

  // Fermeture du menu au clic en dehors ou avec la touche Échap
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const inMobile = menuRef.current?.contains(event.target as Node);
      const inDesktop = desktopMenuRef.current?.contains(event.target as Node);
      const inPlus = plusButtonRef.current?.contains(event.target as Node);

      if (!inMobile && !inDesktop && !inPlus) {
        setIsMenuOpen(false);
      }
    }

    function handleKeyDownGlobal(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    }

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('keydown', handleKeyDownGlobal);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDownGlobal);
    };
  }, [isMenuOpen]);

  // Ajustement dynamique de la hauteur du textarea jusqu'à 4 lignes (max-height 120 px)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollH = textareaRef.current.scrollHeight;
      const newHeight = Math.min(Math.max(scrollH, 36), 120);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [inputText]);

  // 1. AJOUTER UN FICHIER (Menu "+")
  const handleAddFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsMenuOpen(false);

    // Vérification taille max 20 Mo
    const MAX_SIZE_BYTES = 20 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      onError('Le fichier est trop volumineux (maximum 20 Mo autorisés).');
      return;
    }

    const isDocx = file.name.toLowerCase().endsWith('.docx');

    if (isDocx) {
      setPendingFile({
        file,
        pageCount: 1,
        isAnalyzing: false
      });
      return;
    }

    // PDF ou Image : analyse des pages dans le navigateur
    setPendingFile({
      file,
      pageCount: 1,
      isAnalyzing: true
    });

    try {
      const pages = await processDocumentFile(file);
      setPendingFile({
        file,
        pageCount: pages.length,
        convertedPages: pages,
        isAnalyzing: false
      });
    } catch {
      // Repli gracieux : au moins 1 page
      setPendingFile({
        file,
        pageCount: 1,
        isAnalyzing: false
      });
    }
  };

  // 2. EXTRACT (Menu "+")
  const handleExtractClick = () => {
    setIsMenuOpen(false);

    if (pendingFile) {
      // Déclencher l'extraction du document déjà en attente
      onTriggerExtract(
        pendingFile.file,
        inputText.trim() || undefined,
        pendingFile.convertedPages
      );
      setPendingFile(null);
      setInputText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = '36px';
      }
    } else {
      // Ouvrir le sélecteur pour choisir et extraire immédiatement
      extractFileInputRef.current?.click();
    }
  };

  // Sélecteur direct pour Extract si aucun fichier en attente
  const handleDirectExtractSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const MAX_SIZE_BYTES = 20 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      onError('Le fichier est trop volumineux (maximum 20 Mo autorisés).');
      return;
    }

    onTriggerExtract(file, inputText.trim() || undefined);
    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = '36px';
    }
  };

  // Retrait du fichier en attente
  const handleRemovePendingFile = () => {
    setPendingFile(null);
  };

  // 3. ENVOI DU TEXTE (Bouton rond flèche)
  const canSendText = inputText.trim().length > 0 && !isProcessing;

  const handleSendText = () => {
    if (!canSendText) return;
    onSendTextMessage(inputText.trim());
    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = '36px';
    }
  };

  // Touche Entrée pour envoyer (sans Shift)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSendText) {
        handleSendText();
      }
    }
  };

  // Clic sur Recharger
  const handleRechargeClick = () => {
    if (onOpenRecharge) {
      onOpenRecharge();
    } else {
      openWhatsAppRecharge(userEmail, credits ?? 0);
    }
  };

  // Calcul d'état de l'alerte des crédits
  const hasInsufficientCreditsForPending = Boolean(
    pendingFile &&
      credits !== null &&
      !pendingFile.isAnalyzing &&
      pendingFile.pageCount > credits
  );

  const isLowCredits = credits !== null && credits !== undefined && credits < SEUIL_ALERTE;
  const showAlert = !isAlertDismissed && (isLowCredits || hasInsufficientCreditsForPending);

  const getAlertText = () => {
    if (hasInsufficientCreditsForPending && pendingFile) {
      const needed = pendingFile.pageCount;
      const current = credits ?? 0;
      if (current === 0) {
        return `Ce document demande ${needed} crédit${needed > 1 ? 's' : ''}, tu as 0 crédit`;
      }
      return `Ce document demande ${needed} crédit${needed > 1 ? 's' : ''}, il te reste ${current} crédit${current === 1 ? '' : 's'}`;
    }

    const n = credits ?? 0;
    if (n <= 1) {
      return `Il te reste ${n} crédit`;
    }
    return `Il te reste ${n} crédits`;
  };

  const isZeroOrInsufficient = (credits ?? 0) === 0 || hasInsufficientCreditsForPending;

  return (
    <div
      className="w-full mx-auto px-2 sm:px-0"
      style={{ maxWidth: COMPOSER_MAX_WIDTH }}
    >
      {/* Inputs de fichiers cachés */}
      <input
        ref={addFileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.docx"
        className="hidden"
        onChange={handleAddFileSelect}
      />
      <input
        ref={extractFileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.docx"
        className="hidden"
        onChange={handleDirectExtractSelect}
      />

      {/* CONTENEUR UNIQUE (rounded-3xl, bordure fine, légère ombre, fond surface) */}
      <div className="relative bg-white rounded-3xl border border-slate-200/90 shadow-2xs focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100/60 transition-all">
        
        {/* a) BANDE D'ALERTE DES CRÉDITS (haut du bloc si active) */}
        {showAlert && (
          <div
            className={`h-12 px-3 sm:px-4 flex items-center justify-between gap-2 select-none rounded-t-3xl transition-colors ${
              isZeroOrInsufficient
                ? 'bg-amber-100/95 text-amber-950 border-b border-amber-200/90'
                : 'bg-amber-50/90 text-amber-900 border-b border-amber-200/70'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-xs font-semibold truncate">
                {getAlertText()}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Bouton "Recharger" : pilule pleine, 36 px de haut */}
              <button
                type="button"
                onClick={handleRechargeClick}
                className="h-9 px-3.5 rounded-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold shrink-0 flex items-center gap-1.5 shadow-2xs transition active:scale-95 cursor-pointer"
                title="Recharger mes crédits via WhatsApp"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Recharger</span>
              </button>

              {/* Bouton de fermeture "×" : zone tactile 44 px */}
              <button
                type="button"
                onClick={() => setIsAlertDismissed(true)}
                className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-amber-700 hover:text-amber-950 rounded-full cursor-pointer hover:bg-amber-200/40 transition shrink-0"
                aria-label="Fermer l'alerte"
                title="Fermer"
              >
                <X className="w-4 h-4 stroke-[2.2]" />
              </button>
            </div>
          </div>
        )}

        {/* b) PASTILLE DU FICHIER EN ATTENTE (partie centrale si fichier présent) */}
        {pendingFile && (
          <div
            className={`px-3.5 py-2 flex items-center justify-between gap-2.5 bg-slate-50/80 transition-colors ${
              showAlert ? 'border-t border-slate-200/70' : 'rounded-t-3xl'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                {pendingFile.file.type.startsWith('image/') ? (
                  <ImageIcon className="w-4 h-4" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span
                  className="block text-xs font-semibold text-slate-800 truncate"
                  title={pendingFile.file.name}
                >
                  {pendingFile.file.name}
                </span>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  {pendingFile.isAnalyzing ? (
                    <span className="text-blue-600 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin inline" />
                      Analyse en cours…
                    </span>
                  ) : (
                    <>
                      <span>
                        {pendingFile.pageCount} page
                        {pendingFile.pageCount > 1 ? 's' : ''} ·{' '}
                        {pendingFile.pageCount} crédit
                        {pendingFile.pageCount > 1 ? 's' : ''}
                      </span>
                      <span className="text-[10px] font-semibold text-blue-700 bg-blue-100/90 px-1.5 py-0.2 rounded">
                        Prêt
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRemovePendingFile}
              disabled={isProcessing}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition shrink-0 cursor-pointer disabled:opacity-40"
              title="Retirer ce fichier"
              aria-label="Retirer ce fichier"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* c) RANGÉE DE SAISIE (bas du bloc) */}
        <div
          className={`p-[6px] flex items-end gap-2 relative ${
            showAlert || pendingFile
              ? 'border-t border-slate-200/70'
              : 'rounded-3xl'
          } rounded-b-3xl`}
        >
          {/* Bouton rond "+" de 36 px (w-9 h-9) avec icône de 20 px */}
          <div className="relative shrink-0">
            <button
              ref={plusButtonRef}
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              disabled={isProcessing}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition cursor-pointer shrink-0 ${
                isMenuOpen
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              } disabled:opacity-40`}
              title="Ouvrir le menu d'actions (+)"
              aria-label="Menu d'actions"
            >
              <Plus
                className="w-5 h-5 transition-transform duration-200"
                style={{ transform: isMenuOpen ? 'rotate(45deg)' : 'none' }}
              />
            </button>

            {/* Menu flottant sur mobile, boîte de dialogue centrée sur tablette et grand écran (md et plus) */}
            {isMenuOpen && (
              <>
                {/* 1. Version mobile : menu au-dessus du bouton "+" */}
                <div
                  ref={menuRef}
                  className="md:hidden absolute bottom-full mb-2 left-0 z-50 w-72 max-w-[calc(100vw-32px)] bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/90 dark:border-slate-800 p-1.5 animate-in fade-in zoom-in-95"
                >
                  <div className="space-y-1">
                    {/* Ligne 1 : "Ajouter un fichier" */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        addFileInputRef.current?.click();
                      }}
                      disabled={isProcessing}
                      className="w-full flex items-center gap-3 p-2 rounded-xl text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition active:scale-[0.99] group cursor-pointer disabled:opacity-40"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 group-hover:bg-slate-800 group-hover:text-white transition">
                        <Paperclip className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block text-xs font-bold text-slate-900 dark:text-white group-hover:text-slate-800">
                          Ajouter un fichier
                        </span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          Mettre en attente dans la pastille
                        </p>
                      </div>
                    </button>

                    {/* Ligne 2 : "Extract" */}
                    <button
                      type="button"
                      onClick={handleExtractClick}
                      disabled={isProcessing}
                      className="w-full flex items-center gap-3 p-2 rounded-xl text-left hover:bg-blue-50/80 dark:hover:bg-blue-950/60 transition active:scale-[0.99] group cursor-pointer disabled:opacity-40"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition">
                        <Zap className="w-4 h-4 fill-current" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-700 flex items-center justify-between">
                          <span>Extract</span>
                          {pendingFile && (
                            <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-md font-semibold">
                              Prêt
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {pendingFile
                            ? "Lancer l'extraction du document"
                            : 'Choisir un document et extraire'}
                        </p>
                      </div>
                    </button>

                    {/* Ligne 3 : "Créer une image" */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenCreateImage?.();
                      }}
                      disabled={isProcessing}
                      className="w-full flex items-center gap-3 p-2 rounded-xl text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition active:scale-[0.99] group cursor-pointer disabled:opacity-40"
                      title="Générer une image avec Visora"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition">
                        <ImageIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1 flex items-center justify-between">
                        <div>
                          <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                            Créer une image
                          </span>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">Génération d'images</p>
                        </div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 tracking-wide uppercase">
                          Nouveau
                        </span>
                      </div>
                    </button>

                    {/* Ligne 4 : "Créer une vidéo" */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenCreateMedia?.('video');
                      }}
                      disabled={isProcessing}
                      className="w-full flex items-center gap-3 p-2 rounded-xl text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition active:scale-[0.99] group cursor-pointer disabled:opacity-40"
                      title="Générer une vidéo par IA"
                    >
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition">
                        <Video className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1 flex items-center justify-between">
                        <div>
                          <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                            Créer une vidéo
                          </span>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">Vidéo par IA</p>
                        </div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 tracking-wide uppercase">
                          Nouveau
                        </span>
                      </div>
                    </button>

                    {/* Ligne 5 : "Voix" */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenCreateMedia?.('audio');
                      }}
                      disabled={isProcessing}
                      className="w-full flex items-center gap-3 p-2 rounded-xl text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition active:scale-[0.99] group cursor-pointer disabled:opacity-40"
                      title="Texte vers audio parlé"
                    >
                      <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 group-hover:bg-teal-600 group-hover:text-white transition">
                        <Mic className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1 flex items-center justify-between">
                        <div>
                          <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                            Voix
                          </span>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">Texte → audio</p>
                        </div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 tracking-wide uppercase">
                          Nouveau
                        </span>
                      </div>
                    </button>

                    {/* Ligne 6 : "Musique" */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenCreateMedia?.('musique');
                      }}
                      disabled={isProcessing}
                      className="w-full flex items-center gap-3 p-2 rounded-xl text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition active:scale-[0.99] group cursor-pointer disabled:opacity-40"
                      title="Composition musicale par IA"
                    >
                      <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:bg-purple-600 group-hover:text-white transition">
                        <Music className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1 flex items-center justify-between">
                        <div>
                          <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                            Musique
                          </span>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">Morceau musical par IA</p>
                        </div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 tracking-wide uppercase">
                          Nouveau
                        </span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 2. Version tablette et grand écran (md et plus) : boîte de dialogue centrée avec fond assombri */}
                <div
                  className="hidden md:fixed md:inset-0 md:z-50 md:flex md:items-center md:justify-center md:bg-black/60 md:backdrop-blur-xs md:p-4 animate-in fade-in duration-200 select-none"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div
                    ref={desktopMenuRef}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-[540px] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 p-6 animate-in zoom-in-95 duration-200"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Menu d'actions Visora"
                  >
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                          <Plus className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                            Créer avec Visora
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Choisis une action ou un outil de création
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsMenuOpen(false)}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                        aria-label="Fermer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Grille 2 colonnes sur tablette et ordinateur */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* 1. Ajouter un fichier */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          addFileInputRef.current?.click();
                        }}
                        disabled={isProcessing}
                        className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-left transition cursor-pointer group"
                      >
                        <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center mb-2.5 group-hover:bg-slate-800 group-hover:text-white transition">
                          <Paperclip className="w-4 h-4" />
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">Ajouter un fichier</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                          Mettre en attente dans la pastille
                        </p>
                      </button>

                      {/* 2. Extract */}
                      <button
                        type="button"
                        onClick={handleExtractClick}
                        disabled={isProcessing}
                        className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/40 hover:bg-blue-50 dark:hover:bg-blue-950/70 border border-blue-200/80 dark:border-blue-900/60 text-left transition cursor-pointer group"
                      >
                        <div className="flex items-center justify-between mb-2.5">
                          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                            <Zap className="w-4 h-4 fill-current" />
                          </div>
                          {pendingFile && (
                            <span className="text-[10px] bg-blue-100 dark:bg-blue-900/80 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md font-bold">
                              Prêt
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">Extract</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                          Convertir un PDF ou photo en Word
                        </p>
                      </button>

                      {/* 3. Créer une image */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          onOpenCreateImage?.();
                        }}
                        disabled={isProcessing}
                        className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-left transition cursor-pointer group"
                      >
                        <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2.5 group-hover:bg-purple-600 group-hover:text-white transition">
                          <ImageIcon className="w-4 h-4" />
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">Créer une image</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                          Images, affiches et visuels IA
                        </p>
                      </button>

                      {/* 4. Créer une vidéo */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          onOpenCreateMedia?.('video');
                        }}
                        disabled={isProcessing}
                        className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-left transition cursor-pointer group"
                      >
                        <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2.5 group-hover:bg-indigo-600 group-hover:text-white transition">
                          <Video className="w-4 h-4" />
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">Créer une vidéo</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                          Vidéo courte avec ou sans son
                        </p>
                      </button>

                      {/* 5. Voix */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          onOpenCreateMedia?.('audio');
                        }}
                        disabled={isProcessing}
                        className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-left transition cursor-pointer group"
                      >
                        <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-2.5 group-hover:bg-teal-600 group-hover:text-white transition">
                          <Mic className="w-4 h-4" />
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">Voix</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                          Texte vers audio parlé
                        </p>
                      </button>

                      {/* 6. Musique */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          onOpenCreateMedia?.('musique');
                        }}
                        disabled={isProcessing}
                        className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-left transition cursor-pointer group"
                      >
                        <div className="w-8 h-8 rounded-xl bg-pink-100 dark:bg-pink-950 text-pink-600 dark:text-pink-400 flex items-center justify-center mb-2.5 group-hover:bg-pink-600 group-hover:text-white transition">
                          <Music className="w-4 h-4" />
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">Musique</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                          Morceau musical avec paroles
                        </p>
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Zone de texte : sans bordure interne, 1 ligne au départ, min-h 36 px, leading 24 px, py 6 px, px 8 px, font 16 px, max-h 120 px */}
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={onFocusTextarea}
            placeholder="Écris un message ou ajoute un fichier…"
            disabled={isProcessing}
            rows={1}
            className="flex-1 bg-transparent text-[16px] leading-[24px] text-slate-800 placeholder:text-slate-400 focus:outline-none resize-none min-h-[36px] max-h-[120px] py-[6px] px-2 block"
            style={{ height: '36px' }}
          />

          {/* Bouton rond d'envoi de 36 px (w-9 h-9) avec icône de 20 px */}
          <button
            type="button"
            onClick={handleSendText}
            disabled={!canSendText}
            className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center transition ${
              canSendText
                ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-xs cursor-pointer active:scale-95'
                : 'bg-slate-100 text-slate-300 cursor-not-allowed'
            }`}
            title={canSendText ? 'Envoyer le message' : 'Saisis un message pour envoyer'}
            aria-label="Envoyer"
          >
            <ArrowUp className="w-5 h-5 stroke-[2.4]" />
          </button>
        </div>
      </div>

      {/* Texte d'aide : 1 seule ligne sous la carte, 11 px, couleur grise, centré */}
      <p className="mt-1 text-center text-[11px] text-slate-400 truncate px-2 select-none">
        1 crédit = 1 page · PDF, JPG ou PNG · 20 pages et 20 Mo maximum
      </p>
    </div>
  );
};
