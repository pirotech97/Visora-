import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  Upload,
  FileText,
  Trash2,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCcw,
  Sparkles,
  Download,
  Plus
} from 'lucide-react';
import {
  analyzeFileForTool,
  mergePdfFiles,
  triggerFileDownload,
  generateDefaultFilename,
  PdfFileInfo
} from '../services/pdfTools';

interface PdfMergeToolProps {
  onBack: () => void;
}

export const PdfMergeTool: React.FC<PdfMergeToolProps> = ({ onBack }) => {
  const [files, setFiles] = useState<PdfFileInfo[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{ percent: number; message: string } | null>(null);
  const [outputFilename, setOutputFilename] = useState(() => generateDefaultFilename('visora-fusion', 'pdf'));
  const [resultSummary, setResultSummary] = useState<{ totalPages: number; filename: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalPagesCount = files.reduce((acc, f) => acc + (f.pageCount || 0), 0);
  const hasCorruptedFiles = files.some((f) => f.isCorruptedOrEncrypted);
  const canMerge = files.length >= 2 && !hasCorruptedFiles && totalPagesCount <= 200 && !isProcessing;

  const handleAddFiles = async (fileList: FileList | File[]) => {
    setErrorMsg(null);
    const incoming = Array.from(fileList);
    if (incoming.length === 0) return;

    if (files.length + incoming.length > 10) {
      setErrorMsg('Tu peux ajouter au maximum 10 fichiers au total.');
      return;
    }

    setIsAnalyzing(true);
    const newItems: PdfFileInfo[] = [];

    for (const file of incoming) {
      // Vérification de la taille (20 Mo max)
      if (file.size > 20 * 1024 * 1024) {
        setErrorMsg(`Le fichier "${file.name}" dépasse la limite de 20 Mo.`);
        continue;
      }

      // Vérification du type (PDF ou images courantes)
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
      const isImg = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(file.name);

      if (!isPdf && !isImg) {
        setErrorMsg(`Le format de "${file.name}" n'est pas supporté. Utilise des fichiers PDF ou des images JPG, PNG, WebP.`);
        continue;
      }

      try {
        const analyzed = await analyzeFileForTool(file);
        newItems.push(analyzed);
      } catch {
        newItems.push({
          id: 'err_' + Date.now(),
          file,
          name: file.name,
          size: file.size,
          pageCount: 0,
          isImage: false,
          isCorruptedOrEncrypted: true,
          errorMessage: 'Ce fichier est protégé ou abîmé. Retire-le de la liste.'
        });
      }
    }

    const updated = [...files, ...newItems];
    const newTotalPages = updated.reduce((acc, f) => acc + (f.pageCount || 0), 0);
    if (newTotalPages > 200) {
      setErrorMsg(`La limite totale est de 200 pages (actuellement ${newTotalPages} pages). Retire quelques fichiers.`);
    }

    setFiles(updated);
    setIsAnalyzing(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    setFiles((prev) => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index >= files.length - 1) return;
    setFiles((prev) => {
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const handleRemove = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setErrorMsg(null);
  };

  const handleReset = () => {
    setFiles([]);
    setErrorMsg(null);
    setResultSummary(null);
    setProgress(null);
    setOutputFilename(generateDefaultFilename('visora-fusion', 'pdf'));
  };

  const handleMerge = async () => {
    if (!canMerge) return;
    setErrorMsg(null);
    setIsProcessing(true);
    setProgress({ percent: 5, message: 'Préparation des fichiers…' });

    try {
      const rawFiles = files.map((f) => f.file);
      const { pdfBytes, totalPages } = await mergePdfFiles(rawFiles, (percent, message) => {
        setProgress({ percent, message });
      });

      const cleanFilename = outputFilename.trim().toLowerCase().endsWith('.pdf')
        ? outputFilename.trim()
        : `${outputFilename.trim()}.pdf`;

      // Téléchargement direct immédiat
      triggerFileDownload(pdfBytes, cleanFilename);

      setResultSummary({
        totalPages,
        filename: cleanFilename
      });
    } catch (err: any) {
      console.error('Erreur lors de la fusion:', err);
      setErrorMsg(err.message || 'Impossible de fusionner ces documents. Vérifie qu’aucun fichier n’est corrompu.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleAddFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-900 select-none">
      {/* Top Header */}
      <header className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 px-3 sm:px-4 py-3 flex items-center justify-between z-30">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBack}
            className="p-2 -ml-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            aria-label="Retour aux outils"
            title="Retour aux outils"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
              Fusionner des PDF
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Combine plusieurs PDF ou images en un document unique
            </p>
          </div>
        </div>

        {files.length > 0 && !resultSummary && (
          <button
            type="button"
            onClick={handleReset}
            disabled={isProcessing}
            className="text-xs font-semibold text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-40"
          >
            Tout effacer
          </button>
        )}
      </header>

      {/* Corps déroulant */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 max-w-2xl mx-auto w-full space-y-4">
        {/* Résumé de réussite si terminé */}
        {resultSummary ? (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-emerald-200 dark:border-emerald-800/60 shadow-xs text-center space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-2xs">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Fusion réussie !
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
                Terminé : <strong className="text-emerald-700 dark:text-emerald-300">{resultSummary.totalPages} pages</strong> réunies dans le document.
              </p>
              <p className="text-xs text-slate-400 mt-1 font-mono truncate max-w-xs mx-auto">
                {resultSummary.filename}
              </p>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800">
              Le fichier a été téléchargé sur ton appareil. Tes données ne quittent jamais ton navigateur.
            </p>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 transition active:scale-95 cursor-pointer min-h-[44px]"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Recommencer une fusion</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Bannière de confidentialité & instructions discrètes */}
            <div className="bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/50 rounded-2xl p-3 sm:p-3.5 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong>Traitement 100 % local et sécurisé :</strong> aucun fichier n’est envoyé sur un serveur. Les images sont automatiquement adaptées et centrées en page A4.
              </div>
            </div>

            {/* Message d'erreur s'il y a lieu */}
            {errorMsg && (
              <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-2xl p-3.5 text-xs text-red-700 dark:text-red-300 flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed font-medium">{errorMsg}</div>
              </div>
            )}

            {/* Zone d'ajout de fichiers / Dropzone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-3xl p-5 sm:p-6 text-center transition-all ${
                isDragging
                  ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/40 scale-[0.99]'
                  : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-blue-400'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,application/pdf,image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  if (e.target.files) handleAddFiles(e.target.files);
                }}
                className="hidden"
                id="merge-file-input"
                disabled={isProcessing || isAnalyzing}
              />

              <div className="flex flex-col items-center justify-center gap-2">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  {isAnalyzing ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Upload className="w-6 h-6" />
                  )}
                </div>

                <div>
                  <label
                    htmlFor="merge-file-input"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition cursor-pointer min-h-[44px]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Ajouter des fichiers</span>
                  </label>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-2">
                    Glisse-dépose tes fichiers ici (PDF, JPG, PNG, WebP)
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                    Maximum 10 fichiers · 20 Mo chacun · 200 pages au total
                  </p>
                </div>
              </div>
            </div>

            {/* Liste ordonnable des fichiers ajoutés */}
            {files.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
                  <span>
                    {files.length} fichier{files.length > 1 ? 's' : ''} · {totalPagesCount} page{totalPagesCount > 1 ? 's' : ''} au total
                  </span>
                  <span>Ordre de fusion (haut vers bas)</span>
                </div>

                <div className="space-y-2">
                  {files.map((item, index) => {
                    const isCorrupted = item.isCorruptedOrEncrypted;
                    return (
                      <div
                        key={item.id}
                        className={`bg-white dark:bg-slate-800 rounded-2xl p-3 border shadow-2xs flex items-center gap-3 transition ${
                          isCorrupted
                            ? 'border-red-300 dark:border-red-800/80 bg-red-50/40 dark:bg-red-950/20'
                            : 'border-slate-200/90 dark:border-slate-700/80'
                        }`}
                      >
                        {/* Numéro d'ordre */}
                        <div className="w-6 text-center text-xs font-bold text-slate-400 dark:text-slate-500 shrink-0">
                          {index + 1}
                        </div>

                        {/* Miniature de la première page */}
                        <div className="w-12 h-14 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shrink-0 flex items-center justify-center">
                          {item.thumbnailUrl ? (
                            <img
                              src={item.thumbnailUrl}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <FileText className="w-5 h-5 text-slate-400" />
                          )}
                        </div>

                        {/* Informations sur le fichier */}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                            {item.name}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            <span>
                              {item.isImage ? 'Image' : `${item.pageCount} page${item.pageCount > 1 ? 's' : ''}`}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{(item.size / (1024 * 1024)).toFixed(1)} Mo</span>
                          </div>

                          {isCorrupted && (
                            <p className="text-[11px] font-semibold text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>{item.errorMessage || 'Ce fichier est protégé ou abîmé. Retire-le de la liste.'}</span>
                            </p>
                          )}
                        </div>

                        {/* Boutons d'ordonnancement & suppression */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0 || isProcessing}
                            className="w-9 h-9 min-w-[36px] flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                            title="Monter"
                            aria-label="Déplacer vers le haut"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleMoveDown(index)}
                            disabled={index === files.length - 1 || isProcessing}
                            className="w-9 h-9 min-w-[36px] flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                            title="Descendre"
                            aria-label="Déplacer vers le bas"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemove(item.id)}
                            disabled={isProcessing}
                            className="w-9 h-9 min-w-[36px] flex items-center justify-center rounded-xl text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 transition cursor-pointer"
                            title="Retirer"
                            aria-label="Retirer ce fichier"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Champ du nom de fichier final */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-700 space-y-2">
                  <label htmlFor="final-filename" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Nom du fichier final
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="final-filename"
                      type="text"
                      value={outputFilename}
                      onChange={(e) => setOutputFilename(e.target.value)}
                      disabled={isProcessing}
                      className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
                      placeholder="visora-fusion.pdf"
                    />
                  </div>
                </div>

                {/* Progression pendant la fusion */}
                {isProcessing && progress && (
                  <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-blue-900 dark:text-blue-200">
                      <span>{progress.message}</span>
                      <span>{progress.percent}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-blue-200 dark:bg-blue-900/60 overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all duration-200 ease-out"
                        style={{ width: `${progress.percent}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Bouton d'action Fusionner */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleMerge}
                    disabled={!canMerge}
                    className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 text-white font-bold rounded-2xl text-sm shadow-md shadow-blue-500/20 disabled:shadow-none transition flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed min-h-[46px]"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Fusion en cours…</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Fusionner ({files.length} fichiers · {totalPagesCount} pages)</span>
                      </>
                    )}
                  </button>

                  {files.length < 2 && (
                    <p className="text-[11px] text-slate-400 text-center mt-2">
                      Ajoute au moins 2 fichiers pour lancer la fusion.
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
