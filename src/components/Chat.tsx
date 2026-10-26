import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  History,
  LogOut,
  ShieldCheck,
  AlertCircle,
  Coins,
  Sparkles,
  ArrowDown,
  Zap,
  Image as ImageIcon,
  Menu
} from 'lucide-react';
import type { MessageRecord, DocumentRecord, UserProfile, PendingFile, ConvertedPage, AppTab } from '../types';
import { MessageBubble } from './MessageBubble';
import { ChatComposer } from './ChatComposer';
import { HistoryModal } from './HistoryModal';
import { PWAInstallButton } from './PWAInstallButton';
import { CreditsModal } from './CreditsModal';
import { RechargeButton } from './RechargeButton';
import { BottomNav } from './BottomNav';
import { VisoraMascot } from './VisoraMascot';
import { VisoraHelpModal } from './VisoraHelpModal';
import { CreateImageModal, ImageTabMode, QualityTier } from './CreateImageModal';
import { openWhatsAppRecharge } from '../services/constants';
import { processDocumentFile } from '../services/pdfConverter';
import { convertDocxToPdfBlob } from '../services/docxToPdf';
import { cropFiguresInDocument } from '../services/figureCropper';
import {
  insertDocumentRecord,
  insertMessageRecord,
  fetchUserMessages,
  fetchUserDocuments,
  fetchUserCredits,
  updateDocumentJson,
  uploadFileToUserStorage,
  invokeExtractFunction,
  invokeGenerateImageFunction,
  signOutUser
} from '../services/supabase';
import type { GeneratedImagePayload } from '../types';

interface ChatProps {
  user: UserProfile;
  onSignOut: () => void;
  isCloudReady: boolean;
  onDocumentConverted?: () => void;
  onGoToHistory?: () => void;
  activeTab?: AppTab;
  onTabChange?: (tab: AppTab) => void;
  onOpenMenu?: () => void;
  onCreditsChange?: (credits: number | null) => void;
  createImageTrigger?: number;
  onImageCreated?: (payload: GeneratedImagePayload) => void;
}

const WELCOME_TEXT =
  'Envoie-moi un document (PDF ou photo), je le transforme en Word sans toucher au contenu.';

export const Chat: React.FC<ChatProps> = ({
  user,
  onSignOut,
  isCloudReady,
  onDocumentConverted,
  onGoToHistory,
  activeTab,
  onTabChange,
  onOpenMenu,
  onCreditsChange,
  createImageTrigger,
  onImageCreated
}) => {
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [credits, setCredits] = useState<number | null>(null);
  const [creditsError, setCreditsError] = useState(false);
  const [isCreditsModalOpen, setIsCreditsModalOpen] = useState(false);

  // Modal "Créer une image" et confirmation de regénération
  const [isCreateImageModalOpen, setIsCreateImageModalOpen] = useState(false);
  const [createImageInitialData, setCreateImageInitialData] = useState<{
    mode?: ImageTabMode;
    photoUrl?: string;
    prompt?: string;
    format?: string;
    quality?: QualityTier;
  }>({});
  const [confirmRegeneratePayload, setConfirmRegeneratePayload] = useState<GeneratedImagePayload | null>(null);

  useEffect(() => {
    if (createImageTrigger && createImageTrigger > 0) {
      setCreateImageInitialData({ mode: 'image' });
      setIsCreateImageModalOpen(true);
    }
  }, [createImageTrigger]);

  const [showWelcomeBanner, setShowWelcomeBanner] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('visora_welcome_closed') !== 'true';
    } catch {
      return true;
    }
  });

  const handleCloseWelcomeBanner = () => {
    setShowWelcomeBanner(false);
    try {
      sessionStorage.setItem('visora_welcome_closed', 'true');
    } catch {}
  };

  const [isProcessing, setIsProcessing] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [pendingFile, setPendingFile] = useState<PendingFile | null>(null);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const emptyStateExtractInputRef = useRef<HTMLInputElement>(null);
  const isUserScrolledUpRef = useRef(false);

  // Détection de défilement : affiche "↓" si l'utilisateur a remonté de plus de 80 px
  const handleContainerScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    const isUp = distanceFromBottom > 80;
    isUserScrolledUpRef.current = isUp;
    setShowScrollBottomBtn(isUp);
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    } else if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  // Au focus du champ de texte, ramener immédiatement au dernier message
  const handleFocusTextarea = () => {
    isUserScrolledUpRef.current = false;
    setShowScrollBottomBtn(false);
    setTimeout(() => scrollToBottom('smooth'), 80);
    setTimeout(() => scrollToBottom('smooth'), 250);
  };

  // Gestion du redimensionnement du clavier mobile (visualViewport)
  useEffect(() => {
    const handleViewportChange = () => {
      if (!isUserScrolledUpRef.current) {
        scrollToBottom('auto');
      }
    };
    if (typeof window !== 'undefined' && window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
      return () => {
        window.visualViewport?.removeEventListener('resize', handleViewportChange);
      };
    }
  }, []);

  useEffect(() => {
    onCreditsChange?.(credits);
  }, [credits, onCreditsChange]);

  const refreshCredits = async () => {
    try {
      const c = await fetchUserCredits(user.id);
      if (c === null) {
        setCreditsError(true);
      } else {
        setCredits(c);
        setCreditsError(false);
        onCreditsChange?.(c);
      }
    } catch {
      setCreditsError(true);
    }
  };

  // Après le retour de l'utilisateur sur l'app (événement de retour au premier plan),
  // relire le solde avec supabase.rpc("mes_credits") pour afficher une recharge faite entre-temps.
  useEffect(() => {
    const handleForeground = () => {
      if (document.visibilityState === 'visible') {
        refreshCredits();
      }
    };

    document.addEventListener('visibilitychange', handleForeground);
    window.addEventListener('focus', handleForeground);

    return () => {
      document.removeEventListener('visibilitychange', handleForeground);
      window.removeEventListener('focus', handleForeground);
    };
  }, [user.id]);

  useEffect(() => {
    if (isCreditsModalOpen) {
      refreshCredits();
    }
  }, [isCreditsModalOpen]);

  const loadData = async () => {
    try {
      const [fetchedMessages, fetchedDocs, userCredits] = await Promise.all([
        fetchUserMessages(user.id),
        fetchUserDocuments(user.id),
        fetchUserCredits(user.id)
      ]);

      setDocuments(fetchedDocs);
      if (userCredits === null) {
        setCreditsError(true);
      } else {
        setCredits(userCredits);
        setCreditsError(false);
      }

      if (fetchedMessages.length === 0) {
        // Initial welcome message
        const initialMsg: MessageRecord = {
          id: 'welcome',
          user_id: user.id,
          role: 'visora',
          contenu: WELCOME_TEXT,
          created_at: new Date().toISOString()
        };
        setMessages([initialMsg]);
      } else {
        // Link document payloads to messages
        const docMap = new Map<string, DocumentRecord>();
        fetchedDocs.forEach((d) => docMap.set(d.id, d));

        const enriched = fetchedMessages.map((m) => {
          if (m.document_id && docMap.has(m.document_id)) {
            return {
              ...m,
              document: docMap.get(m.document_id)
            };
          }
          return m;
        });

        // Ensure welcome message is first if none
        if (!enriched.some((m) => m.role === 'visora')) {
          enriched.unshift({
            id: 'welcome',
            user_id: user.id,
            role: 'visora',
            contenu: WELCOME_TEXT,
            created_at: new Date().toISOString()
          });
        }

        setMessages(enriched);
      }
    } catch (err) {
      console.warn('Error loading chat data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [user.id]);

  useEffect(() => {
    if (!isUserScrolledUpRef.current) {
      scrollToBottom();
    }
  }, [messages, isProcessing]);

  // 3. BOUTON D'ENVOI (flèche) ET TOUCHE ENTRÉE
  // Envoie uniquement le texte et répond sans appel à l'IA ni à la fonction extract
  const handleSendTextMessage = async (text: string) => {
    if (!text.trim()) return;

    // Afficher et enregistrer le message de l'utilisateur
    const savedUserMsg = await insertMessageRecord(user.id, 'utilisateur', text.trim());
    setMessages((prev) => [...prev, savedUserMsg]);

    // Réponse de Visora :
    // a) s'il y a un fichier en attente : "Ton fichier est prêt. Pour lancer l'extraction, ouvre le menu + et choisis Extract."
    // b) sinon : "Pour l'instant, je sais extraire le contenu d'un document en Word. Ajoute un fichier avec le bouton +, puis choisis Extract."
    const replyText = pendingFile
      ? "Ton fichier est prêt. Pour lancer l'extraction, ouvre le menu + et choisis Extract."
      : "Pour l'instant, je sais extraire le contenu d'un document en Word. Ajoute un fichier avec le bouton +, puis choisis Extract.";

    const assistantMsg = await insertMessageRecord(user.id, 'visora', replyText);
    setMessages((prev) => [...prev, assistantMsg]);
    // Le fichier en attente n'est PAS retiré après l'envoi du texte, il reste dans sa pastille
  };

  // Action de la Carte 1 de l'écran d'accueil (même action que "Extract" du menu "+")
  const handleCardExtractClick = () => {
    if (pendingFile) {
      handleTriggerExtract(
        pendingFile.file,
        inputText.trim() || undefined,
        pendingFile.convertedPages
      );
      setPendingFile(null);
      setInputText('');
    } else {
      emptyStateExtractInputRef.current?.click();
    }
  };

  // 2. ACTION "EXTRACT" (seul déclencheur)
  const handleTriggerExtract = async (
    file: File,
    userText?: string,
    preloadedPages?: ConvertedPage[]
  ) => {
    // Protection : pas de double lancement
    if (isProcessing) return;
    setErrorMessage(null);
    setIsProcessing(true);

    const customText = userText?.trim() || '';

    // Fichier Word (.docx)
    if (file.name.toLowerCase().endsWith('.docx')) {
      const fileInfo = `${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} Mo)`;
      const userMsgContent = customText ? `${customText}\n\n${fileInfo}` : fileInfo;
      const tempAssistantMsgId = 'temp_docx_' + Date.now();

      const userMsg: MessageRecord = {
        id: 'msg_u_' + Date.now(),
        user_id: user.id,
        role: 'utilisateur',
        contenu: userMsgContent,
        created_at: new Date().toISOString()
      };

      const loadingMsg: MessageRecord = {
        id: tempAssistantMsgId,
        user_id: user.id,
        role: 'visora',
        contenu: 'Conversion Word vers PDF en cours…',
        isLoading: true,
        created_at: new Date().toISOString()
      };

      setMessages((prev) => [...prev, userMsg, loadingMsg]);

      try {
        const pdfBlob = await convertDocxToPdfBlob(file);
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        const pdfFilename = `${baseName}.pdf`;

        const assistantMsg: MessageRecord = {
          id: 'msg_a_' + Date.now(),
          user_id: user.id,
          role: 'visora',
          contenu: 'Voici ton document Word converti en PDF :',
          pdfDownloadBlob: pdfBlob,
          pdfFilename,
          warningNote: 'Conversion simplifiée : les colonnes, zones de texte, en-têtes et pieds de page peuvent être perdus.',
          created_at: new Date().toISOString()
        };

        setMessages((prev) =>
          prev.filter((m) => m.id !== tempAssistantMsgId).concat(assistantMsg)
        );

        // Après l'extraction, retirer le fichier en attente et vider la zone de texte
        setPendingFile(null);
        setInputText('');
      } catch (docxErr) {
        console.error('Docx to PDF conversion failed:', docxErr);
        const errorMsg: MessageRecord = {
          id: 'msg_a_' + Date.now(),
          user_id: user.id,
          role: 'visora',
          contenu: "Je n'ai pas pu convertir ce fichier Word. Vérifie qu'il n'est pas protégé par un mot de passe.",
          created_at: new Date().toISOString()
        };
        setMessages((prev) =>
          prev.filter((m) => m.id !== tempAssistantMsgId).concat(errorMsg)
        );
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    // PDF ou Image
    const fileInfo = `${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} Mo)`;
    const userMsgContent = customText ? `${customText}\n\n${fileInfo}` : fileInfo;
    const tempAssistantMsgId = 'temp_a_' + Date.now();

    try {
      let convertedPages = preloadedPages;
      if (!convertedPages || convertedPages.length === 0) {
        convertedPages = await processDocumentFile(file);
      }
      const pageCount = convertedPages.length;
      const images = convertedPages.map((p) => p.base64);

      // Si du texte est présent dans la zone de saisie au moment du clic sur Extract,
      // l'afficher dans la bulle de l'utilisateur au-dessus du document et l'enregistrer comme les autres messages ; ce texte n'est PAS envoyé à l'IA.
      const savedUserMsg = await insertMessageRecord(user.id, 'utilisateur', userMsgContent);
      savedUserMsg.imagePreviews = images;

      // Si le solde de crédits est insuffisant : ne pas lancer l'extraction
      const currentBalance = credits ?? 0;
      if (pageCount > currentBalance) {
        const insufficientCreditsMsg: MessageRecord = {
          id: 'msg_a_credits_' + Date.now(),
          user_id: user.id,
          role: 'visora',
          contenu: `Crédits insuffisants : ce document demande ${pageCount} crédit${pageCount > 1 ? 's' : ''}, il t'en reste ${currentBalance}.`,
          showRechargeButton: true,
          created_at: new Date().toISOString()
        };

        setMessages((prev) => [...prev, savedUserMsg, insufficientCreditsMsg]);
        setIsProcessing(false);
        return;
      }

      const isLongDocument = pageCount > 3;
      const creditNotice = `Ce document utilisera ${pageCount} crédit${pageCount > 1 ? 's' : ''}.`;
      const loadingAssistantMsg: MessageRecord = {
        id: tempAssistantMsgId,
        user_id: user.id,
        role: 'visora',
        contenu: (isLongDocument
          ? "Extraction en cours… cela peut prendre jusqu'à une minute."
          : "Extraction en cours…") + `\n${creditNotice}`,
        isLoading: true,
        created_at: new Date().toISOString()
      };

      setMessages((prev) => [...prev, savedUserMsg, loadingAssistantMsg]);

      uploadFileToUserStorage(user.id, file).catch((e) =>
        console.warn('Storage background upload:', e)
      );

      // Appel à la fonction "extract" (sans le customText qui n'est pas envoyé à l'IA)
      const result = await invokeExtractFunction(images, file.name);

      if (typeof result.credits_restants === 'number') {
        setCredits(result.credits_restants);
        localStorage.setItem('visora_local_credits_' + user.id, String(result.credits_restants));
      }

      if (result.error) {
        const errorAssistantMsg = await insertMessageRecord(
          user.id,
          'visora',
          result.error
        );

        if (result.isInsufficientCredits) {
          errorAssistantMsg.showRechargeButton = true;
        }

        setMessages((prev) =>
          prev
            .filter((m) => m.id !== tempAssistantMsgId)
            .concat(errorAssistantMsg)
        );
        return;
      }

      if (result.document) {
        const docId = result.document_id || 'doc_' + Date.now();

        // Découpe des figures pleine résolution avant l'aperçu
        const completedDoc = await cropFiguresInDocument(result.document, convertedPages);

        if (result.document_id) {
          updateDocumentJson(result.document_id, completedDoc).catch((e) =>
            console.warn('Error saving cropped figures to documents table:', e)
          );
        }

        const savedAssistantMsg = await insertMessageRecord(
          user.id,
          'visora',
          'Voici ton document extrait avec fidélité mot pour mot :',
          docId
        );

        const docRecord: DocumentRecord = {
          id: docId,
          user_id: user.id,
          nom_fichier: file.name,
          json_document: completedDoc,
          statut: 'termine',
          created_at: new Date().toISOString()
        };

        savedAssistantMsg.document = docRecord;

        setMessages((prev) =>
          prev
            .filter((m) => m.id !== tempAssistantMsgId)
            .concat(savedAssistantMsg)
        );

        const docs = await fetchUserDocuments(user.id);
        setDocuments(docs);
        onDocumentConverted?.();

        if (typeof result.credits_restants !== 'number') {
          refreshCredits();
        }

        // Après l'extraction, retirer le fichier en attente et vider la zone de texte
        setPendingFile(null);
        setInputText('');
      } else {
        throw new Error("Je n'ai pas pu lire ce document, essaie avec une photo plus nette.");
      }
    } catch (err: any) {
      console.error('File extraction error:', err);
      const errorText =
        err.message ||
        "Je n'ai pas pu lire ce document, essaie avec une photo plus nette.";

      const errorAssistantMsg = await insertMessageRecord(
        user.id,
        'visora',
        errorText
      );

      setMessages((prev) =>
        prev
          .filter((m) => m.id !== tempAssistantMsgId)
          .concat(errorAssistantMsg)
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSignOut = async () => {
    await signOutUser();
    onSignOut();
  };

  const handleOpenCreateImage = (data?: {
    mode?: ImageTabMode;
    photoUrl?: string;
    prompt?: string;
    format?: string;
    quality?: QualityTier;
  }) => {
    if (data) {
      setCreateImageInitialData(data);
    } else {
      setCreateImageInitialData({ mode: 'image' });
    }
    setIsCreateImageModalOpen(true);
  };

  const handleImageGenerated = async (payload: GeneratedImagePayload) => {
    onImageCreated?.(payload);

    const userMsg = await insertMessageRecord(
      user.id,
      'utilisateur',
      `Créer une image (${payload.mode}) : ${payload.prompt}`
    );

    const savedMsg = await insertMessageRecord(
      user.id,
      'visora',
      'Voici votre image générée :'
    );
    savedMsg.generatedImage = payload;

    setMessages((prev) => [...prev, userMsg, savedMsg]);
    setTimeout(() => scrollToBottom(), 100);
  };

  const handleExecuteRegenerate = async (payload: GeneratedImagePayload) => {
    const cost = payload.cout || (payload.qualite === 'premium' || payload.resolution === '2K' ? 2 : 1);
    if (credits !== null && credits < cost) {
      const errMsg = await insertMessageRecord(
        user.id,
        'visora',
        "Crédits insuffisants pour regénérer cette image. Recharge ton solde pour continuer."
      );
      errMsg.showRechargeButton = true;
      setMessages((prev) => [...prev, errMsg]);
      setTimeout(() => scrollToBottom(), 100);
      return;
    }

    const tempLoadingId = 'temp_regen_' + Date.now();
    const loadingMsg: MessageRecord = {
      id: tempLoadingId,
      user_id: user.id,
      role: 'visora',
      contenu: "Création en cours, cela peut prendre jusqu'à une minute…",
      isLoading: true,
      created_at: new Date().toISOString()
    };
    setMessages((prev) => [...prev, loadingMsg]);
    setTimeout(() => scrollToBottom(), 100);

    try {
      const result = await invokeGenerateImageFunction(
        {
          mode: payload.mode,
          prompt: payload.prompt,
          format: payload.format,
          resolution: payload.resolution,
          qualite: payload.qualite || (payload.resolution === '2K' ? 'standard' : 'standard'),
          sources: payload.sources || []
        },
        user.id
      );

      if (result.error) {
        setErrorMessage(result.error);
        const errMsg = await insertMessageRecord(
          user.id,
          'visora',
          result.error
        );
        if (result.isInsufficientCredits) {
          errMsg.showRechargeButton = true;
        }
        setMessages((prev) => prev.filter((m) => m.id !== tempLoadingId).concat(errMsg));
        if (typeof result.credits_restants === 'number') {
          setCredits(result.credits_restants);
          onCreditsChange?.(result.credits_restants);
        }
        return;
      }

      if (typeof result.credits_restants === 'number') {
        setCredits(result.credits_restants);
        onCreditsChange?.(result.credits_restants);
      }

      if (result.url) {
        const newPayload: GeneratedImagePayload = {
          ...payload,
          image_id: result.image_id,
          url: result.url,
          qualite: result.qualite || payload.qualite,
          cout: result.cout || cost,
          created_at: new Date().toISOString()
        };

        const savedMsg = await insertMessageRecord(
          user.id,
          'visora',
          'Voici la nouvelle version de ton image :'
        );
        savedMsg.generatedImage = newPayload;
        onImageCreated?.(newPayload);

        setMessages((prev) => prev.filter((m) => m.id !== tempLoadingId).concat(savedMsg));
        setTimeout(() => scrollToBottom(), 100);
      }
    } catch (err: any) {
      console.warn('handleExecuteRegenerate error:', err);
      const errAssistantMsg = await insertMessageRecord(
        user.id,
        'visora',
        "Impossible de regénérer l'image pour le moment. Merci de réessayer."
      );
      setMessages((prev) => prev.filter((m) => m.id !== tempLoadingId).concat(errAssistantMsg));
    }
  };

  const handleModifyImage = (payload: GeneratedImagePayload) => {
    const qual: QualityTier =
      payload.qualite === 'premium' ? 'premium' : payload.resolution === '2K' ? 'haute' : 'standard';
    handleOpenCreateImage({
      mode: 'modifier',
      photoUrl: payload.url,
      prompt: payload.prompt,
      format: payload.format,
      quality: qual
    });
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden">
      {/* Top Header Épinglé */}
      <header className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between z-30 select-none">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          {onOpenMenu && (
            <button
              type="button"
              onClick={onOpenMenu}
              className="p-1.5 sm:p-2 -ml-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              aria-label="Ouvrir le menu"
              title="Menu principal"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">Visora</h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/50 shrink-0">
                Word .docx
              </span>
            </div>
            {/* Sous 480 px, masque le sous-titre "Extraction fidèle de documents" */}
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate hidden min-[480px]:block">
              Extraction fidèle de documents
            </p>
          </div>
        </div>

        {/* Action buttons : pastille de crédits et bouton Recharger à droite */}
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {/* Crédits Button (texte qui ne passe jamais à la ligne, ellipse si manque de place) */}
          {creditsError ? (
            <div className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 text-xs font-bold shadow-2xs whitespace-nowrap">
              <Coins className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="truncate max-w-[80px] sm:max-w-none">Crédits : …</span>
              <button
                type="button"
                onClick={refreshCredits}
                className="ml-0.5 text-[11px] underline hover:text-amber-900 dark:hover:text-amber-200 cursor-pointer font-semibold shrink-0"
                title="Réessayer de charger le solde"
              >
                Réessayer
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsCreditsModalOpen(true)}
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 active:bg-amber-200 border border-amber-200/80 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 transition active:scale-95 cursor-pointer font-bold text-xs shadow-2xs whitespace-nowrap shrink-0 max-w-[120px] sm:max-w-none"
              title="Consulter l'historique de tes crédits"
            >
              <Coins className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="truncate">Crédits : {credits === null ? '…' : credits}</span>
            </button>
          )}

          {/* Bouton Recharger à droite */}
          <RechargeButton email={user.email} credits={credits ?? 0} variant="header" />

          <PWAInstallButton />

          <button
            onClick={handleSignOut}
            className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
            title="Se déconnecter"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Bannière de bienvenue : 1 seule ligne compacte, fermable avec la croix, non réaffichée dans la session */}
      {showWelcomeBanner && (
        <div className="shrink-0 bg-blue-50/90 dark:bg-blue-950/60 border-b border-blue-100 dark:border-blue-900/50 px-3 py-1.5 flex items-center justify-between text-xs text-blue-900 dark:text-blue-200">
          <div className="flex items-center gap-1.5 truncate mr-2">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="truncate">Bienvenue sur Visora ! Convertis tes documents (PDF ou photo) en fichiers Word fidèles.</span>
          </div>
          <button
            type="button"
            onClick={handleCloseWelcomeBanner}
            className="p-1 text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-100 rounded-md transition cursor-pointer shrink-0"
            aria-label="Fermer la bannière de bienvenue"
            title="Fermer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Zone Centrale : la SEULE zone qui défile */}
      <div className="flex-1 min-h-0 relative flex flex-col">
        <main
          ref={messagesContainerRef}
          onScroll={handleContainerScroll}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-4"
          style={{ overscrollBehavior: 'contain' }}
        >
          {/* Input fichier caché pour la Carte 1 de l'écran d'accueil */}
          <input
            ref={emptyStateExtractInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.docx"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              if (file.size > 20 * 1024 * 1024) {
                setErrorMessage('Le fichier est trop volumineux (maximum 20 Mo autorisés).');
                return;
              }
              handleTriggerExtract(file, inputText.trim() || undefined);
              setInputText('');
            }}
          />

          {/* Error alert toast if any (défile avec les messages) */}
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2 shadow-xs shrink-0">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-amber-600 font-bold hover:text-amber-800 ml-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {messages.length === 0 ? (
            /* BLOC D'ACCUEIL DU CHAT (QUAND IL N'Y A AUCUN MESSAGE) */
            <div className="flex-1 my-auto flex flex-col items-center justify-center py-4 px-1 sm:px-2 w-full empty-chat-container">
              <div className="w-full max-w-[560px] mx-auto text-center">
                <div className="empty-chat-title-group mb-5 sm:mb-6">
                  <h1 className="text-2xl sm:text-[28px] font-bold text-slate-900 tracking-tight leading-snug">
                    Que veux-tu convertir aujourd'hui ?
                  </h1>
                  <p className="empty-chat-subtitle text-sm sm:text-base text-slate-500 mt-2">
                    Ajoute un document, je l'extrais et je le mets en Word.
                  </p>
                </div>

                {/* 4 cartes empilées (largeur maximale 560 px, espacement 12 px) */}
                <div className="flex flex-col gap-3 text-left w-full">
                  {/* 1. "Extraire un document" / "PDF ou photo → fichier Word" : même action que "Extract" du menu "+". */}
                  <button
                    type="button"
                    onClick={handleCardExtractClick}
                    className="empty-chat-card w-full bg-white rounded-2xl border border-slate-200/90 shadow-2xs px-4 flex items-center gap-3.5 select-none cursor-pointer text-left"
                    title="Extraire un document"
                  >
                    <div className="empty-chat-icon w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Zap className="w-5 h-5 fill-current" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm text-slate-900 truncate">
                        Extraire un document
                      </div>
                      <div className="text-xs text-slate-500 truncate mt-0.5">
                        PDF ou photo → fichier Word
                      </div>
                    </div>
                  </button>

                  {/* 2. "Mes documents" / "Retrouve tes conversions" : ouvre l'onglet Historique. */}
                  <button
                    type="button"
                    onClick={() => {
                      if (onGoToHistory) onGoToHistory();
                      else onTabChange?.('history');
                    }}
                    className="empty-chat-card w-full bg-white rounded-2xl border border-slate-200/90 shadow-2xs px-4 flex items-center gap-3.5 select-none cursor-pointer text-left"
                    title="Mes documents"
                  >
                    <div className="empty-chat-icon w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm text-slate-900 truncate">
                        Mes documents
                      </div>
                      <div className="text-xs text-slate-500 truncate mt-0.5">
                        Retrouve tes conversions
                      </div>
                    </div>
                  </button>

                  {/* 3. "Recharger mes crédits" / "Ajoute des pages par WhatsApp" : même action que le bouton "Recharger". */}
                  <button
                    type="button"
                    onClick={() => openWhatsAppRecharge(user.email, credits ?? 0)}
                    className="empty-chat-card w-full bg-white rounded-2xl border border-slate-200/90 shadow-2xs px-4 flex items-center gap-3.5 select-none cursor-pointer text-left"
                    title="Recharger mes crédits"
                  >
                    <div className="empty-chat-icon w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <Coins className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm text-slate-900 truncate">
                        Recharger mes crédits
                      </div>
                      <div className="text-xs text-slate-500 truncate mt-0.5">
                        Ajoute des pages par WhatsApp
                      </div>
                    </div>
                  </button>

                  {/* 4. "Créer une image" : carte cliquable active */}
                  <button
                    type="button"
                    onClick={() => handleOpenCreateImage({ mode: 'image' })}
                    className="empty-chat-card w-full bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-2xs px-4 flex items-center gap-3.5 select-none cursor-pointer text-left hover:border-blue-300 dark:hover:border-blue-600 transition"
                    title="Créer une image avec Visora"
                  >
                    <div className="empty-chat-icon w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                          Créer une image
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          Affiches, fiches produits et visuels IA
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 uppercase tracking-wide shrink-0">
                        Nouveau
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-[640px] mx-auto space-y-3">
              {/* Chat Messages Feed */}
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  userEmail={user.email}
                  userCredits={credits ?? 0}
                  onRegenerateImage={(payload) => setConfirmRegeneratePayload(payload)}
                  onModifyImage={handleModifyImage}
                />
              ))}
            </div>
          )}
          <div ref={messagesEndRef} />
        </main>

        {/* Bouton rond "↓" au bas de la zone centrale si scroll > 80 px */}
        {showScrollBottomBtn && (
          <button
            type="button"
            onClick={() => {
              isUserScrolledUpRef.current = false;
              setShowScrollBottomBtn(false);
              scrollToBottom('smooth');
            }}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 w-8 h-8 rounded-full bg-white/95 text-slate-700 shadow-md border border-slate-200/90 flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all cursor-pointer backdrop-blur-xs"
            aria-label="Faire défiler jusqu'au dernier message"
            title="Dernier message"
          >
            <ArrowDown className="w-4 h-4 stroke-[2.5]" />
          </button>
        )}

        {/* Bouton Flottant Mascotte "Aide Visora" */}
        <button
          type="button"
          onClick={() => setIsHelpOpen((prev) => !prev)}
          className="absolute bottom-3 right-3 z-30 w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-white dark:bg-slate-800 shadow-md hover:shadow-lg border border-slate-200/90 dark:border-slate-700 flex items-center justify-center transition-all active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Aide Visora"
          title="Aide Visora"
        >
          <VisoraMascot size={40} mood={isHelpOpen ? 'content' : 'normal'} decorative />
        </button>
      </div>

      {/* Pied de Page Épinglé */}
      <footer className="shrink-0 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 z-30 px-2 pt-1.5 pb-1 select-none">
        <div className="max-w-[640px] mx-auto w-full">
          <ChatComposer
            inputText={inputText}
            setInputText={setInputText}
            pendingFile={pendingFile}
            setPendingFile={setPendingFile}
            isProcessing={isProcessing}
            onSendTextMessage={handleSendTextMessage}
            onTriggerExtract={handleTriggerExtract}
            onError={(msg) => setErrorMessage(msg)}
            onFocusTextarea={handleFocusTextarea}
            credits={credits}
            userEmail={user.email}
            onOpenRecharge={() => openWhatsAppRecharge(user.email, credits ?? 0)}
            onOpenCreateImage={() => handleOpenCreateImage({ mode: 'image' })}
          />

          <div className="mt-0.5">
            <BottomNav
              activeTab="chat"
              onTabChange={(tab) => {
                if (tab === 'history') {
                  if (onGoToHistory) onGoToHistory();
                  else onTabChange?.('history');
                } else if (tab === 'tools') {
                  onTabChange?.('tools');
                } else {
                  onTabChange?.('chat');
                }
              }}
            />
          </div>
        </div>
      </footer>

      {/* Panneau d'Aide FAQ Visora */}
      <VisoraHelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        onAddFileSelect={(file) => {
          handleTriggerExtract(file);
        }}
        onRecharge={() => openWhatsAppRecharge(user.email, credits ?? 0)}
        onGoToHistory={() => {
          if (onGoToHistory) onGoToHistory();
          else onTabChange?.('history');
        }}
      />

      {/* Credits History Modal */}
      <CreditsModal
        user={user}
        credits={credits}
        isOpen={isCreditsModalOpen}
        onClose={() => setIsCreditsModalOpen(false)}
        onRefreshCredits={refreshCredits}
      />

      {/* History Modal */}
      <HistoryModal
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        documents={documents}
        onRefresh={loadData}
      />

      {/* Modal Créer une image */}
      <CreateImageModal
        isOpen={isCreateImageModalOpen}
        onClose={() => setIsCreateImageModalOpen(false)}
        user={user}
        credits={credits}
        onCreditsChange={(c) => {
          setCredits(c);
          onCreditsChange?.(c);
        }}
        onImageGenerated={handleImageGenerated}
        onOpenRecharge={() => openWhatsAppRecharge(user.email, credits ?? 0)}
        initialMode={createImageInitialData.mode}
        initialPhotoUrl={createImageInitialData.photoUrl}
        initialPrompt={createImageInitialData.prompt}
        initialFormat={createImageInitialData.format}
        initialQuality={createImageInitialData.quality}
      />

      {/* Confirmation préalable du coût pour la régénération */}
      {confirmRegeneratePayload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  Regénérer cette création ?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Relance avec les mêmes paramètres
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Cette action débitera{' '}
              <strong className="text-slate-900 dark:text-white">
                {confirmRegeneratePayload.cout || (confirmRegeneratePayload.qualite === 'premium' || confirmRegeneratePayload.resolution === '2K' ? 2 : 1)} crédit
                {(confirmRegeneratePayload.cout || (confirmRegeneratePayload.qualite === 'premium' || confirmRegeneratePayload.resolution === '2K' ? 2 : 1)) > 1 ? 's' : ''}
              </strong>{' '}
              de votre solde actuel.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmRegeneratePayload(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = confirmRegeneratePayload;
                  setConfirmRegeneratePayload(null);
                  handleExecuteRegenerate(target);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-xs transition cursor-pointer"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
