import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ArrowLeft,
  ChevronRight,
  Plus,
  Zap,
  Clock,
  MessageCircle,
  HelpCircle
} from 'lucide-react';
import { VisoraMascot, type VisoraMood } from './VisoraMascot';

// ============================================================================
// QUESTIONS ET RÉPONSES FIXES DE VISORA (Faciles à modifier)
// ============================================================================
export interface FaqItem {
  id: number;
  question: string;
  answer: string;
  actionLabel?: string;
  actionType?: 'add_file' | 'recharge' | 'history' | 'support';
  mood?: VisoraMood;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 1,
    question: 'Comment convertir un document ?',
    answer:
      'Clique sur + et ajoute ton PDF ou ta photo, puis choisis Extract. Je recopie le contenu et je te prépare un fichier Word à télécharger.',
    actionLabel: 'Ajouter un fichier',
    actionType: 'add_file',
    mood: 'content'
  },
  {
    id: 2,
    question: 'Quelles limites ?',
    answer: "Jusqu'à 20 pages et 20 Mo par document.",
    mood: 'content'
  },
  {
    id: 3,
    question: 'Comment marchent les crédits ?',
    answer:
      "1 crédit = 1 page. Ton solde est affiché en haut. Si l'extraction échoue, tes crédits te sont rendus automatiquement.",
    mood: 'content'
  },
  {
    id: 4,
    question: 'Comment recharger ?',
    answer:
      "Clique sur Recharger : WhatsApp s'ouvre pour discuter du paiement avec l'équipe. Tes crédits sont ajoutés après confirmation.",
    actionLabel: 'Recharger',
    actionType: 'recharge',
    mood: 'content'
  },
  {
    id: 5,
    question: 'Où retrouver mes documents ?',
    answer:
      "Dans l'Historique : tu peux ouvrir l'aperçu, télécharger le Word ou supprimer un document.",
    actionLabel: 'Historique',
    actionType: 'history',
    mood: 'content'
  },
  {
    id: 6,
    question: 'Le texte est-il modifié ?',
    answer:
      "Non. Je recopie le contenu tel qu'il est, sans le réécrire ni le corriger.",
    mood: 'content'
  },
  {
    id: 7,
    question: 'Un problème ?',
    answer:
      "Désolée pour ça. Écris à l'équipe sur WhatsApp et on regarde ensemble.",
    actionLabel: "Écrire à l'équipe",
    actionType: 'support',
    mood: 'desole'
  }
];

interface VisoraHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddFileSelect: (file: File) => void;
  onRecharge: () => void;
  onGoToHistory: () => void;
}

export const VisoraHelpModal: React.FC<VisoraHelpModalProps> = ({
  isOpen,
  onClose,
  onAddFileSelect,
  onRecharge,
  onGoToHistory
}) => {
  const [selectedFaq, setSelectedFaq] = useState<FaqItem | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Réinitialiser la sélection à l'ouverture
  useEffect(() => {
    if (isOpen) {
      setSelectedFaq(null);
    }
  }, [isOpen]);

  // Fermeture avec la touche Échap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Clic à l'extérieur pour fermer
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  const handleActionClick = (actionType?: string) => {
    if (actionType === 'add_file') {
      fileInputRef.current?.click();
    } else if (actionType === 'recharge') {
      onClose();
      onRecharge();
    } else if (actionType === 'history') {
      onClose();
      onGoToHistory();
    } else if (actionType === 'support') {
      const url =
        'https://wa.me/22892556462?text=' +
        encodeURIComponent(
          "Bonjour l'équipe Visora, j'ai une question ou besoin d'aide avec mes documents :"
        );
      window.open(url, '_blank', 'noopener');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    onClose();
    onAddFileSelect(file);
  };

  if (!isOpen) return null;

  const currentMood: VisoraMood = selectedFaq ? selectedFaq.mood || 'content' : 'normal';

  return (
    <>
      {/* File input caché pour l'action "Ajouter un fichier" */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.docx"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Fond d'atténuation / Backdrop pour clic extérieur */}
      <div
        onClick={handleBackdropClick}
        className="fixed inset-0 z-50 bg-black/40 sm:bg-black/25 backdrop-blur-2xs transition-opacity duration-200"
        aria-hidden="true"
      />

      {/* Panneau d'aide Visora :
          - Mobile : feuille qui monte du bas, 70 % de la hauteur (dvh)
          - Ordinateur : carte de 360 px de large ancrée en bas à droite
      */}
      <div
        ref={panelRef}
        role="dialog"
        aria-labelledby="visora-help-title"
        aria-modal="true"
        className="fixed z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden inset-x-0 bottom-0 h-[70dvh] max-h-[70dvh] rounded-t-3xl sm:inset-x-auto sm:bottom-20 sm:right-6 sm:w-[360px] sm:h-[540px] sm:max-h-[580px] sm:rounded-3xl animate-in slide-in-from-bottom sm:zoom-in-95 sm:fade-in duration-200 select-none"
      >
        {/* En-tête : mascotte (size 32) + "Visora" + "Je t'explique comment ça marche" */}
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/60 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <VisoraMascot size={32} mood={currentMood} decorative />
            <div className="min-w-0">
              <h2
                id="visora-help-title"
                className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight"
              >
                Visora
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Je t'explique comment ça marche
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Fermer l'aide"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corps défilable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!selectedFaq ? (
            <>
              {/* Message d'accueil de Visora */}
              <div className="flex items-start gap-2.5 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 rounded-2xl p-3.5">
                <VisoraMascot size={28} mood="normal" decorative className="shrink-0 mt-0.5" />
                <p className="text-xs sm:text-[13px] text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                  Salut, je suis Visora. Je transforme tes PDF et tes photos en Word, sans toucher au texte. Que veux-tu savoir ?
                </p>
              </div>

              {/* Liste de questions cliquables */}
              <div className="space-y-1.5 pt-1">
                {FAQ_ITEMS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedFaq(item)}
                    className="w-full p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 hover:border-blue-300 dark:hover:border-blue-500/50 hover:bg-slate-50/80 dark:hover:bg-slate-800 transition flex items-center justify-between gap-2.5 text-left group cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition leading-snug">
                      {item.question}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition shrink-0" />
                  </button>
                ))}
              </div>
            </>
          ) : (
            /* Affichage Question sélectionnée + Réponse Visora */
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Bouton "Retour aux questions" */}
              <button
                type="button"
                onClick={() => setSelectedFaq(null)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer p-1 -ml-1 rounded-lg transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Retour aux questions</span>
              </button>

              {/* Bulle Question (Utilisateur) */}
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-tr-xs bg-blue-600 text-white px-3.5 py-2.5 text-xs font-semibold shadow-xs">
                  {selectedFaq.question}
                </div>
              </div>

              {/* Bulle Réponse (Visora) */}
              <div className="flex items-start gap-2.5">
                <VisoraMascot
                  size={32}
                  mood={selectedFaq.mood || 'content'}
                  decorative
                  className="shrink-0 mt-0.5"
                />
                <div className="flex-1 space-y-3">
                  <div className="rounded-2xl rounded-tl-xs bg-slate-50 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 p-3.5 shadow-2xs">
                    <p className="text-xs sm:text-[13px] text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                      {selectedFaq.answer}
                    </p>
                  </div>

                  {/* Bouton d'action si applicable */}
                  {selectedFaq.actionLabel && (
                    <div>
                      {selectedFaq.actionType === 'add_file' && (
                        <button
                          type="button"
                          onClick={() => handleActionClick('add_file')}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{selectedFaq.actionLabel}</span>
                        </button>
                      )}

                      {selectedFaq.actionType === 'recharge' && (
                        <button
                          type="button"
                          onClick={() => handleActionClick('recharge')}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
                        >
                          <Zap className="w-3.5 h-3.5 fill-current" />
                          <span>{selectedFaq.actionLabel}</span>
                        </button>
                      )}

                      {selectedFaq.actionType === 'history' && (
                        <button
                          type="button"
                          onClick={() => handleActionClick('history')}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>{selectedFaq.actionLabel}</span>
                        </button>
                      )}

                      {selectedFaq.actionType === 'support' && (
                        <button
                          type="button"
                          onClick={() => handleActionClick('support')}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>{selectedFaq.actionLabel}</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
