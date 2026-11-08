import React, { useState, useEffect } from 'react';
import {
  FileText,
  Loader2,
  AlertCircle,
  Download,
  RotateCw,
  Wand2,
  Video,
  Mic,
  Music,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import type { MessageRecord, GeneratedImagePayload, MediaRecord, VideoProjectRecord } from '../types';
import { DocumentPreview } from './DocumentPreview';
import { RechargeButton } from './RechargeButton';
import { VisoraxMascot } from './VisoraxMascot';
import { VideoProjectCard } from './VideoProjectCard';
import { MediaPlayer } from './MediaPlayer';
import {
  downloadImageFile,
  downloadMediaFile,
  fetchMediaStatus
} from '../services/supabase';

interface MessageBubbleProps {
  message: MessageRecord;
  userEmail?: string;
  userCredits?: number;
  onRegenerateImage?: (imagePayload: GeneratedImagePayload) => void;
  onModifyImage?: (imagePayload: GeneratedImagePayload) => void;
  onMediaUpdated?: (media: MediaRecord) => void;
  onProjectUpdated?: (project: VideoProjectRecord) => void;
  onRefreshCredits?: () => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  userEmail,
  userCredits = 0,
  onRegenerateImage,
  onModifyImage,
  onMediaUpdated,
  onProjectUpdated,
  onRefreshCredits
}) => {
  const isUser = message.role === 'utilisateur';
  const [currentMedia, setCurrentMedia] = useState<MediaRecord | undefined>(message.generatedMedia);
  const [isRefreshingMedia, setIsRefreshingMedia] = useState(false);

  useEffect(() => {
    setCurrentMedia(message.generatedMedia);
  }, [message.generatedMedia]);

  const handleManualRefreshMedia = async () => {
    if (!currentMedia?.id) return;
    setIsRefreshingMedia(true);
    try {
      const res = await fetchMediaStatus(currentMedia.id);
      const updated: MediaRecord = {
        ...currentMedia,
        statut: res.statut as any,
        url: res.url || currentMedia.url,
        url_2: res.url_2 || currentMedia.url_2,
        fichier: res.fichier || currentMedia.fichier,
        fichier_2: res.fichier_2 || currentMedia.fichier_2,
        error: res.error || currentMedia.error
      };
      setCurrentMedia(updated);
      onMediaUpdated?.(updated);
      if (res.statut === 'echec' || res.statut === 'erreur') {
        onRefreshCredits?.();
      }
    } catch {
      // ignore
    } finally {
      setIsRefreshingMedia(false);
    }
  };

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
      {/* Visorax Mascot Avatar (size 32) */}
      <div className="shrink-0 mt-0.5">
        <VisoraxMascot
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
                      alt={message.generatedImage.prompt || 'Image générée par Visorax Studio'}
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
                          downloadImageFile(
                            message.generatedImage.url,
                            message.generatedImage.qualite === 'premium'
                          );
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer"
                      title={message.generatedImage.qualite === 'premium' ? "Télécharger l'image en JPG" : "Télécharger l'image en PNG"}
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

              {/* Rendu du Média généré (Vidéo, Voix ou Musique) avec SUIVI, LECTEUR et TÉLÉCHARGEMENT */}
              {currentMedia && (
                <div className="mt-3 p-3.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-3">
                  {/* En-tête de Suivi */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          currentMedia.type === 'musique'
                            ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400'
                            : currentMedia.type === 'audio'
                            ? 'bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400'
                            : 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                        }`}
                      >
                        {currentMedia.type === 'video' ? (
                          <Video className="w-4 h-4" />
                        ) : currentMedia.type === 'musique' ? (
                          <Music className="w-4 h-4" />
                        ) : (
                          <Mic className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
                          {currentMedia.type === 'video'
                            ? 'Vidéo'
                            : currentMedia.type === 'musique'
                            ? 'Musique'
                            : 'Voix'}
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                          {currentMedia.modele && (
                            <span className="font-semibold uppercase text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.2 rounded">
                              {currentMedia.modele}
                            </span>
                          )}
                          {currentMedia.voix && (
                            <span className="font-semibold text-[10px] bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 px-1.5 py-0.2 rounded">
                              {currentMedia.voix}
                            </span>
                          )}
                          {currentMedia.style && (
                            <span className="text-[10px] bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 px-1.5 py-0.2 rounded font-medium">
                              {currentMedia.style}
                            </span>
                          )}
                          {currentMedia.instrumental && (
                            <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.2 rounded font-semibold">
                              Instrumental
                            </span>
                          )}
                          {currentMedia.duree && <span>{currentMedia.duree} s</span>}
                          {currentMedia.resolution && <span>{currentMedia.resolution}</span>}
                          {typeof currentMedia.cout === 'number' && (
                            <span>· {currentMedia.cout} crédits</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Badge de statut du Suivi */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {currentMedia.statut === 'termine' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Terminé</span>
                        </span>
                      ) : currentMedia.statut === 'echec' || currentMedia.statut === 'erreur' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300">
                          <AlertCircle className="w-3 h-3" />
                          <span>Échec</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleManualRefreshMedia}
                          disabled={isRefreshingMedia}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-200 transition cursor-pointer"
                          title="Actualiser le statut"
                        >
                          <Loader2
                            className={`w-3 h-3 ${
                              isRefreshingMedia ? 'animate-spin' : 'animate-spin'
                            }`}
                          />
                          <span>En cours…</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Prompt ou description associé */}
                  {(currentMedia.prompt ||
                    currentMedia.texte ||
                    currentMedia.description ||
                    currentMedia.paroles) && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 italic line-clamp-3 leading-relaxed">
                      «{' '}
                      {currentMedia.prompt ||
                        currentMedia.description ||
                        currentMedia.texte ||
                        currentMedia.paroles}{' '}
                      »
                    </p>
                  )}

                  {/* LECTEUR */}
                  {currentMedia.statut === 'termine' ? (
                    <div className="pt-1 space-y-3">
                      {currentMedia.type === 'musique' ? (
                        // MUSIQUE : Deux versions
                        <div className="space-y-3">
                          {/* Version 1 */}
                          <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                Version 1
                              </span>
                              {currentMedia.url && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    downloadMediaFile(currentMedia.url!, 'visora-musique-1.mp3')
                                  }
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 text-xs font-semibold transition cursor-pointer"
                                  title="Télécharger Version 1 en MP3"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>Télécharger</span>
                                </button>
                              )}
                            </div>
                            {currentMedia.url ? (
                              <audio controls src={currentMedia.url} className="w-full" />
                            ) : (
                              <p className="text-xs text-slate-400">Audio indisponible</p>
                            )}
                          </div>

                          {/* Version 2 */}
                          <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                Version 2
                              </span>
                              {currentMedia.url_2 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    downloadMediaFile(currentMedia.url_2!, 'visora-musique-2.mp3')
                                  }
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 text-xs font-semibold transition cursor-pointer"
                                  title="Télécharger Version 2 en MP3"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>Télécharger</span>
                                </button>
                              )}
                            </div>
                            {currentMedia.url_2 ? (
                              <audio controls src={currentMedia.url_2} className="w-full" />
                            ) : (
                              <p className="text-xs text-slate-400">Version 2 en cours de préparation…</p>
                            )}
                          </div>
                        </div>
                      ) : currentMedia.type === 'audio' ? (
                        // VOIX : Lecteur unique avec téléchargement .wav
                        <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-2.5">
                          {currentMedia.url ? (
                            <audio controls src={currentMedia.url} className="w-full" />
                          ) : (
                            <p className="text-xs text-slate-400">Audio indisponible</p>
                          )}
                          <div className="flex items-center justify-end pt-1">
                            {currentMedia.url && (
                              <button
                                type="button"
                                onClick={() =>
                                  downloadMediaFile(currentMedia.url!, 'visora-voix.wav')
                                }
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300 text-xs font-semibold transition cursor-pointer"
                                title="Télécharger le fichier audio en .wav"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Télécharger</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        // VIDÉO : Lecteur vidéo
                        <MediaPlayer
                          fichier={currentMedia.fichier}
                          initialUrl={currentMedia.url}
                          type="video"
                          id={currentMedia.id}
                        />
                      )}
                    </div>
                  ) : currentMedia.statut === 'echec' || currentMedia.statut === 'erreur' ? (
                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-xs text-red-700 dark:text-red-300 text-center">
                      La création a échoué. Tes crédits ont été rendus.
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 text-center flex items-center justify-center gap-2.5">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
                      <span className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                        {currentMedia.type === 'musique'
                          ? 'La musique peut prendre 2 à 4 minutes'
                          : currentMedia.type === 'audio'
                          ? 'environ 1 minute'
                          : 'Création en cours…'}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Rendu du Projet Vidéo multi-scènes */}
              {message.videoProject && (
                <div className="mt-3">
                  <VideoProjectCard
                    project={message.videoProject}
                    onProjectUpdated={onProjectUpdated}
                  />
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
