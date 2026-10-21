import React from 'react';
import { FileText, Loader2, AlertCircle, Download, RotateCw, Wand2 } from 'lucide-react';
import type { MessageRecord, GeneratedImagePayload } from '../types';
import { DocumentPreview } from './DocumentPreview';
import { RechargeButton } from './RechargeButton';
import { VisoraMascot } from './VisoraMascot';
import { downloadImageFile } from '../services/supabase';

interface MessageBubbleProps {
  message: MessageRecord;
  userEmail?: string;
  userCredits?: number;
  onRegenerateImage?: (imagePayload: GeneratedImagePayload) => void;
  onModifyImage?: (imagePayload: GeneratedImagePayload) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  userEmail,
  userCredits = 0,
  onRegenerateImage,
  onModifyImage
}) => {
  const isUser = message.role === 'utilisateur';

  if (isUser) {
    const hasDoc = Boolean(
      message.imagePreviews?.length ||
      message.pdfDownloadBlob ||
      /\.(pdf|docx|png|jpg|jpeg|webp)\s*\(/i.test(message.contenu)
    );

    return (
      <div className="flex justify-end mb-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
        <div className="w-fit max-w-[85%] md:max-w-[640px] rounded-2xl rounded-tr-xs bg-blue-600 text-white px-3.5 py-2.5 sm:px-4 sm:py-3 shadow-xs">
          {hasDoc && (
            <div className="flex items-center gap-1.5 mb-1">
              <FileText className="w-3.5 h-3.5 text-blue-200" />
              <span className="text-[11px] font-semibold text-blue-100 uppercase tracking-wider">
                Document envoyé
              </span>
            </div>
          )}

          <p className="text-[15px] sm:text-base font-medium break-words leading-relaxed whitespace-pre-wrap">
            {message.contenu}
          </p>

          {/* Thumbnail preview if any */}
          {message.imagePreviews && message.imagePreviews.length > 0 && (
            <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1">
              {message.imagePreviews.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`Aperçu page ${idx + 1}`}
                  className="w-16 h-20 object-cover rounded-lg border border-white/20 shadow-xs"
                />
              ))}
            </div>
          )}

          <div className="mt-1 text-right">
            <span className="text-[10px] text-blue-200">
              {new Date(message.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Visora (assistant) message on the left
  return (
    <div className="flex items-start gap-2.5 mb-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
      {/* Visora Mascot Avatar (size 32) */}
      <div className="shrink-0 mt-0.5">
        <VisoraMascot
          size={32}
          mood={message.isLoading ? 'reflechit' : 'content'}
          decorative
        />
      </div>

      <div className="w-fit max-w-[85%] md:max-w-[640px] space-y-1.5">
        <div className="rounded-2xl rounded-tl-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 px-3.5 py-2.5 sm:px-4 sm:py-3 shadow-xs border border-slate-200/80 dark:border-slate-800">
          {message.isLoading ? (
            <div className="flex items-center gap-2.5 py-1 text-blue-600">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <div className="space-y-0.5">
                <p className="text-[15px] font-semibold text-slate-800 dark:text-slate-100">
                  {message.contenu || 'Extraction en cours…'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Lecture fidèle mot pour mot du document
                </p>
              </div>
            </div>
          ) : (
            <>
              {message.contenu && (
                <p className="text-[15px] sm:text-base text-slate-800 dark:text-slate-100 leading-relaxed whitespace-pre-wrap break-words">
                  {message.contenu}
                </p>
              )}

              {/* Recharge Button if credits insufficient or 402 error */}
              {message.showRechargeButton && (
                <div className="mt-3">
                  <RechargeButton email={userEmail || ''} credits={userCredits} variant="inline" />
                </div>
              )}

              {/* Rendu de l'image générée avec boutons Télécharger, Regénérer, Modifier */}
              {message.generatedImage && (
                <div className="mt-3 space-y-2.5">
                  <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 flex items-center justify-center shadow-xs">
                    <img
                      src={message.generatedImage.url}
                      alt={message.generatedImage.prompt || 'Image générée par Visora'}
                      className="max-h-[380px] w-auto max-w-full object-contain rounded-2xl"
                      loading="lazy"
                    />
                  </div>

                  {message.generatedImage.prompt && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 italic line-clamp-2 px-1">
                      « {message.generatedImage.prompt} »
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (message.generatedImage?.url) {
                          downloadImageFile(message.generatedImage.url);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer"
                      title="Télécharger l'image en PNG"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Télécharger</span>
                    </button>

                    {onRegenerateImage && (
                      <button
                        type="button"
                        onClick={() => onRegenerateImage(message.generatedImage!)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition active:scale-95 cursor-pointer"
                        title="Relancer avec les mêmes réglages"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>Regénérer</span>
                      </button>
                    )}

                    {onModifyImage && (
                      <button
                        type="button"
                        onClick={() => onModifyImage(message.generatedImage!)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition active:scale-95 cursor-pointer"
                        title="Modifier cette photo"
                      >
                        <Wand2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>Modifier</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Render preview and download button if document data is present */}
              {message.document && message.document.json_document && (
                <div className="mt-3">
                  <DocumentPreview
                    data={message.document.json_document}
                    filename={message.document.nom_fichier}
                  />
                </div>
              )}

              {/* Render Word to PDF direct download card if present */}
              {message.pdfDownloadBlob && message.pdfFilename && (
                <div className="mt-3 p-3 bg-slate-50 border border-slate-200/90 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-xl bg-red-100 text-red-600 shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {message.pdfFilename}
                      </p>
                      <span className="text-[11px] text-slate-500">Document PDF converti</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!message.pdfDownloadBlob || !message.pdfFilename) return;
                      const url = URL.createObjectURL(message.pdfDownloadBlob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = message.pdfFilename;
                      document.body.appendChild(a);
                      a.click();
                      setTimeout(() => {
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      }, 200);
                    }}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Télécharger PDF</span>
                  </button>
                </div>
              )}
            </>
          )}

          <div className="mt-2 text-right">
            <span className="text-[10px] text-slate-400">
              {new Date(message.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        </div>

        {/* Warning note displayed under the bubble if Word conversion */}
        {message.warningNote && (
          <p className="text-[11px] text-amber-700 bg-amber-50/90 border border-amber-200/80 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
            <span>{message.warningNote}</span>
          </p>
        )}
      </div>
    </div>
  );
};
