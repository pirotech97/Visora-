import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Trash2,
  AlertCircle,
  Clock,
  ChevronDown,
  Loader2,
  Eye,
  X,
  FileCheck,
  Image as ImageIcon,
  Menu,
  Sparkles
} from 'lucide-react';
import type { DocumentSummary, UserProfile, DocumentData, DocxBlock, ImageHistoryRecord } from '../types';
import {
  fetchUserDocumentsSummary,
  fetchDocumentDetails,
  deleteDocumentRecord,
  fetchUserImages,
  downloadImageFile
} from '../services/supabase';
import { downloadDocx } from '../services/docxGenerator';
import { downloadPdfFromDocument } from '../services/pdfGenerator';
import { downloadImagesFromDocument } from '../services/imageExporter';
import { ExportButtons } from './ExportButtons';
import { PWAInstallButton } from './PWAInstallButton';
import { BottomNav } from './BottomNav';

interface HistoryScreenProps {
  user: UserProfile;
  refreshTrigger: number;
  onGoToChat: () => void;
  activeTab?: 'chat' | 'history';
  onTabChange?: (tab: 'chat' | 'history') => void;
  onOpenMenu?: () => void;
  onOpenCreateImage?: () => void;
}

function formatFrenchDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const day = d.getDate();
    const months = [
      'janv.',
      'févr.',
      'mars',
      'avr.',
      'mai',
      'juin',
      'juil.',
      'août',
      'sept.',
      'oct.',
      'nov.',
      'déc.'
    ];
    const month = months[d.getMonth()] || '';
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${year}, ${hours}:${minutes}`;
  } catch {
    return dateStr;
  }
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  user,
  refreshTrigger,
  onGoToChat,
  activeTab,
  onTabChange,
  onOpenMenu,
  onOpenCreateImage
}) => {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [rowExportState, setRowExportState] = useState<{ docId: string; type: 'docx' | 'pdf' | 'image' } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<DocumentSummary | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Section switcher: Documents ou Images
  const [section, setSection] = useState<'documents' | 'images'>('documents');
  const [images, setImages] = useState<ImageHistoryRecord[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [downloadingImageId, setDownloadingImageId] = useState<string | null>(null);

  // Quick preview modal states
  const [previewDoc, setPreviewDoc] = useState<DocumentSummary | null>(null);
  const [previewData, setPreviewData] = useState<DocumentData | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const PAGE_SIZE = 20;

  const loadInitialDocs = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetchUserDocumentsSummary(user.id, 0, PAGE_SIZE);
      setDocuments(res.data);
      setHasMore(res.hasMore);
    } catch (err: any) {
      console.error('Error loading documents:', err);
      setErrorMsg('Impossible de charger l’historique.');
    } finally {
      setLoading(false);
    }
  };

  const loadImages = async () => {
    setLoadingImages(true);
    try {
      const data = await fetchUserImages(user.id);
      setImages(data);
    } catch (err) {
      console.warn('Error loading images:', err);
    } finally {
      setLoadingImages(false);
    }
  };

  useEffect(() => {
    loadInitialDocs();
    loadImages();
  }, [user.id, refreshTrigger]);

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextOffset = documents.length;
      const res = await fetchUserDocumentsSummary(user.id, nextOffset, PAGE_SIZE);
      setDocuments((prev) => [...prev, ...res.data]);
      setHasMore(res.hasMore);
    } catch (err) {
      console.error('Error loading more docs:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleExportRow = async (doc: DocumentSummary, type: 'docx' | 'pdf' | 'image') => {
    if (doc.statut !== 'termine' || rowExportState) return;
    setRowExportState({ docId: doc.id, type });
    setErrorMsg(null);

    try {
      const details = await fetchDocumentDetails(doc.id);
      if (!details || !details.json_document) {
        throw new Error('Données du document introuvables.');
      }

      if (type === 'docx') {
        await downloadDocx(details.json_document, doc.nom_fichier);
      } else if (type === 'pdf') {
        await downloadPdfFromDocument(details.json_document, doc.nom_fichier);
      } else if (type === 'image') {
        await downloadImagesFromDocument(details.json_document, doc.nom_fichier);
      }
    } catch (err: any) {
      console.error('Export error:', err);
      setErrorMsg(err.message || 'Erreur lors de l’exportation du document.');
    } finally {
      setRowExportState(null);
    }
  };

  const handleOpenPreview = async (doc: DocumentSummary) => {
    setPreviewDoc(doc);
    setPreviewData(null);
    setLoadingPreview(true);
    setErrorMsg(null);

    try {
      const details = await fetchDocumentDetails(doc.id);
      if (details?.json_document) {
        setPreviewData(details.json_document);
      } else {
        throw new Error('Données textuelles indisponibles pour ce document.');
      }
    } catch (err: any) {
      console.error('Error loading preview:', err);
      setErrorMsg(err.message || 'Impossible de charger l’aperçu du document.');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleClosePreview = () => {
    setPreviewDoc(null);
    setPreviewData(null);
  };

  const executeDelete = async (doc: DocumentSummary) => {
    setDeletingId(doc.id);
    setConfirmDeleteDoc(null);
    setErrorMsg(null);

    try {
      const success = await deleteDocumentRecord(doc.id);
      if (success) {
        setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
        if (previewDoc?.id === doc.id) {
          handleClosePreview();
        }
      } else {
        throw new Error('Échec de la suppression du document.');
      }
    } catch (err: any) {
      console.error('Error deleting doc:', err);
      setErrorMsg(err.message || 'Impossible de supprimer ce document.');
    } finally {
      setDeletingId(null);
    }
  };

  const renderPreviewBlock = (block: DocxBlock, index: number) => {
    if (block.type === 'titre') {
      if (block.niveau === 1) {
        return (
          <h3 key={index} className="text-base font-bold text-slate-900 mt-3 mb-1 first:mt-0">
            {block.texte}
          </h3>
        );
      }
      return (
        <h4 key={index} className="text-sm font-semibold text-slate-800 mt-2.5 mb-1">
          {block.texte}
        </h4>
      );
    }

    if (block.type === 'paragraphe') {
      let alignClass = 'text-left';
      if (block.alignement === 'centre') alignClass = 'text-center';
      if (block.alignement === 'droite') alignClass = 'text-right';
      if (block.alignement === 'justifie') alignClass = 'text-justify';

      return (
        <p
          key={index}
          className={`text-xs sm:text-sm text-slate-700 leading-relaxed mb-2 ${alignClass} ${
            block.gras ? 'font-semibold text-slate-900' : 'font-normal'
          }`}
          style={{ fontFamily: 'Calibri, sans-serif' }}
        >
          {block.texte}
        </p>
      );
    }

    if (block.type === 'liste') {
      const elements = Array.isArray(block.elements) ? block.elements : [];
      return (
        <ul key={index} className="list-disc pl-5 my-2 space-y-1 text-xs sm:text-sm text-slate-700" style={{ fontFamily: 'Calibri, sans-serif' }}>
          {elements.map((el, elIdx) => (
            <li key={elIdx}>{el}</li>
          ))}
        </ul>
      );
    }

    if (block.type === 'tableau') {
      const rows = Array.isArray(block.lignes) ? block.lignes : [];
      if (rows.length === 0) return null;

      return (
        <div key={index} className="my-2.5 overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-xs" style={{ fontFamily: 'Calibri, sans-serif' }}>
            <tbody className="divide-y divide-slate-200 bg-white">
              {rows.map((row, rIdx) => {
                const cells = Array.isArray(row) ? row : [String(row)];
                const isHeader = rIdx === 0;
                return (
                  <tr key={rIdx} className={isHeader ? 'bg-slate-50 font-semibold text-slate-900' : 'text-slate-700'}>
                    {cells.map((cell, cIdx) => (
                      <td key={cIdx} className="px-2.5 py-1.5 border-r last:border-r-0 border-slate-200">
                        {String(cell || '')}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    if (block.type === 'figure') {
      if (!block.image) return null;
      return (
        <div key={index} className="my-3 flex flex-col items-center">
          <img
            src={block.image}
            alt={block.legende || 'Figure extraite'}
            className="max-w-full rounded-lg border border-slate-200/80 shadow-2xs object-contain"
          />
          {block.legende && block.legende.trim() && (
            <p className="mt-1 text-xs text-slate-500 italic text-center">
              {block.legende.trim()}
            </p>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden">
      {/* Header épinglé */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 px-3 sm:px-4 py-2.5 sm:py-3 shrink-0 flex items-center justify-between z-30 select-none">
        <div className="flex items-center gap-2">
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
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">Historique des fichiers</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Tes documents convertis en fichiers Word (.docx)
            </p>
          </div>
        </div>
        <PWAInstallButton />
      </header>

      {/* Zone centrale qui défile */}
      <div
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-4 space-y-3"
        style={{ overscrollBehavior: 'contain' }}
      >

      {errorMsg && (
        <div className="m-3 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between">
          <span>{errorMsg}</span>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-red-600 font-bold hover:text-red-800"
          >
            ✕
          </button>
        </div>
      )}

      {/* Switcher Documents / Images */}
      <div className="flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl max-w-xs mx-auto mb-3">
        <button
          type="button"
          onClick={() => setSection('documents')}
          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
            section === 'documents'
              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Documents</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setSection('images');
            loadImages();
          }}
          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
            section === 'images'
              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Images</span>
        </button>
      </div>

      {/* Main Content */}
      {section === 'images' ? (
        loadingImages ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
            <p className="text-sm font-medium text-slate-600">Chargement des images…</p>
          </div>
        ) : images.length === 0 ? (
          <div className="py-16 px-4 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700 my-4 shadow-2xs">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3">
              <ImageIcon className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Aucune image pour le moment</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-xs mx-auto leading-relaxed">
              Crée ta première image, affiche ou fiche produit avec Visora.
            </p>
            {onOpenCreateImage ? (
              <button
                type="button"
                onClick={onOpenCreateImage}
                className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Créer une image</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onGoToChat}
                className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer"
              >
                <span>Aller au Chat</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {images.map((img) => {
              const isPremium = img.modele === 'premium' || img.qualite === 'premium';
              return (
                <div
                  key={img.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 p-3 sm:p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 transition hover:shadow-xs"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Miniature via createSignedUrl sur le bucket "images" */}
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-700 shrink-0 flex items-center justify-center">
                      {img.signedUrl ? (
                        <img
                          src={img.signedUrl}
                          alt={img.prompt || 'Miniature'}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-slate-500" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                          {img.mode || 'Image'}
                        </span>
                        {isPremium && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60">
                            Premium
                          </span>
                        )}
                        {img.format && (
                          <span className="text-[11px] text-slate-400">
                            {img.format}
                          </span>
                        )}
                        {img.resolution && (
                          <span className="text-[11px] text-slate-400">
                            · {img.resolution}
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white line-clamp-2 leading-snug">
                        {img.prompt || 'Création graphique Visora'}
                      </p>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatFrenchDate(img.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-700/60">
                    <button
                      type="button"
                      disabled={!img.signedUrl || downloadingImageId === img.id}
                      onClick={async () => {
                        if (!img.signedUrl) return;
                        setDownloadingImageId(img.id);
                        try {
                          await downloadImageFile(img.signedUrl, isPremium);
                        } finally {
                          setDownloadingImageId(null);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
                      title={isPremium ? "Télécharger l'image en JPG" : "Télécharger l'image en PNG"}
                    >
                      {downloadingImageId === img.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      <span>Télécharger</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
            <p className="text-sm font-medium text-slate-600">Chargement de l'historique…</p>
          </div>
        ) : documents.length === 0 ? (
          /* Empty State */
          <div className="py-16 px-4 text-center bg-white rounded-3xl border border-slate-200/80 my-4 shadow-2xs">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
              <FileText className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Aucun document pour le moment</h3>
            <p className="text-xs text-slate-500 mt-1.5 max-w-xs mx-auto leading-relaxed">
              Envoie ton premier fichier dans le chat pour le convertir en Word.
            </p>
            <button
              onClick={onGoToChat}
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer"
            >
              Aller au Chat
            </button>
          </div>
        ) : (
          /* Documents List */
          <div className="space-y-2.5">
            {documents.map((doc) => {
              const isFinished = doc.statut === 'termine';
              const isError = doc.statut === 'erreur';
              const isPending = doc.statut === 'en_cours';

              return (
                <div
                  key={doc.id}
                  className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs transition hover:border-slate-300"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                        <h4 className="text-sm font-bold text-slate-900 truncate">
                          {doc.nom_fichier}
                        </h4>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <span className="flex items-center gap-1 text-[11px] text-slate-500">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {formatFrenchDate(doc.created_at)}
                        </span>

                        {/* Status Pills */}
                        {isFinished && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Terminé
                          </span>
                        )}

                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            En cours
                          </span>
                        )}

                        {isError && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            Erreur
                          </span>
                        )}
                      </div>

                      {/* Error text notice if failed */}
                      {isError && (
                        <p className="mt-2 text-xs font-medium text-red-600 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>La lecture a échoué</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    {/* Finished document actions */}
                    {isFinished && (
                      <>
                        {/* Quick preview button */}
                        <button
                          type="button"
                          onClick={() => handleOpenPreview(doc)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition active:scale-95 cursor-pointer"
                          title="Aperçu rapide du texte extrait"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Aperçu</span>
                        </button>

                        {/* Download .docx button */}
                        <button
                          type="button"
                          onClick={() => handleExportRow(doc, 'docx')}
                          disabled={Boolean(rowExportState)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                          {rowExportState?.docId === doc.id && rowExportState.type === 'docx' ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Préparation…</span>
                            </>
                          ) : (
                            <>
                              <Download className="w-3.5 h-3.5" />
                              <span>Télécharger .docx</span>
                            </>
                          )}
                        </button>

                        {/* PDF export button */}
                        <button
                          type="button"
                          onClick={() => handleExportRow(doc, 'pdf')}
                          disabled={Boolean(rowExportState)}
                          className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 border border-slate-200 text-xs font-semibold transition active:scale-95 disabled:opacity-50 cursor-pointer"
                          title="Exporter en PDF"
                        >
                          {rowExportState?.docId === doc.id && rowExportState.type === 'pdf' ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                              <span>Préparation…</span>
                            </>
                          ) : (
                            <>
                              <FileText className="w-3.5 h-3.5 text-red-500" />
                              <span>PDF</span>
                            </>
                          )}
                        </button>

                        {/* Image export button */}
                        <button
                          type="button"
                          onClick={() => handleExportRow(doc, 'image')}
                          disabled={Boolean(rowExportState)}
                          className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 border border-slate-200 text-xs font-semibold transition active:scale-95 disabled:opacity-50 cursor-pointer"
                          title="Exporter en Image (PNG)"
                        >
                          {rowExportState?.docId === doc.id && rowExportState.type === 'image' ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                              <span>Préparation…</span>
                            </>
                          ) : (
                            <>
                              <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Image</span>
                            </>
                          )}
                        </button>
                      </>
                    )}

                    {/* Delete button (available for finished and error documents) */}
                    {(isFinished || isError) && (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteDoc(doc)}
                        disabled={deletingId === doc.id}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 text-xs font-semibold transition active:scale-95 disabled:opacity-50 cursor-pointer"
                        title="Supprimer ce document"
                      >
                        {deletingId === doc.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                        <span>Supprimer</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Load More Button */}
            {hasMore && (
              <div className="pt-2 pb-4 text-center">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {loadingMore ? (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                  <span>Voir plus</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pied de page épinglé */}
      <footer
        className="shrink-0 bg-white border-t border-slate-200/80 z-30 px-2 py-1 select-none"
        style={{ paddingBottom: 'max(0.25rem, env(safe-area-inset-bottom))' }}
      >
        <BottomNav
          activeTab={activeTab || 'history'}
          onTabChange={(tab) => {
            if (tab === 'chat') {
              onGoToChat();
              onTabChange?.('chat');
            } else {
              onTabChange?.('history');
            }
          }}
        />
      </footer>
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-2xs p-3 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-blue-100 text-blue-700 shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 truncate">
                    {previewDoc.nom_fichier}
                  </h3>
                  <p className="text-[11px] text-slate-500">Aperçu rapide du texte extrait</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClosePreview}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2 bg-white">
              {loadingPreview ? (
                <div className="py-16 flex flex-col items-center justify-center text-slate-400">
                  <Loader2 className="w-7 h-7 animate-spin text-blue-600 mb-2" />
                  <p className="text-xs font-semibold text-slate-600">Chargement de l'extrait…</p>
                </div>
              ) : previewData && Array.isArray(previewData.blocs) && previewData.blocs.length > 0 ? (
                <div className="space-y-1">
                  {previewData.blocs.map((block, idx) => renderPreviewBlock(block, idx))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic text-center py-10">
                  Aucun extrait textuel disponible pour ce document.
                </p>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={handleClosePreview}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer"
              >
                Fermer
              </button>

              {previewData && (
                <ExportButtons
                  data={previewData}
                  filename={previewDoc.nom_fichier}
                  variant="compact"
                  onNotification={(msg) => setErrorMsg(msg)}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Deletion */}
      {confirmDeleteDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-2xs p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 text-center">
              Supprimer ce document ?
            </h3>
            <p className="text-xs text-slate-500 text-center mt-1.5 leading-relaxed">
              Cette action est définitive. Le document <span className="font-semibold text-slate-700">« {confirmDeleteDoc.nom_fichier} »</span> sera supprimé de ton historique.
            </p>

            <div className="mt-6 flex gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmDeleteDoc(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => executeDelete(confirmDeleteDoc)}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
