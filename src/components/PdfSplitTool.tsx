import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCcw,
  Sparkles,
  Download,
  Scissors,
  CheckSquare,
  Square,
  Archive,
  Layers
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import {
  renderPdfThumbnail,
  parsePageRangeString,
  extractPagesToSinglePdf,
  splitPdfToOnePagePerFileZip,
  splitPdfEveryNPagesZip,
  triggerFileDownload,
  generateDefaultFilename
} from '../services/pdfTools';

type SplitMode = 'extract' | 'single_page' | 'every_n';

interface PageThumbnailItem {
  pageNumber: number;
  thumbnailUrl?: string;
  isLoading: boolean;
}

interface PdfSplitToolProps {
  onBack: () => void;
}

export const PdfSplitTool: React.FC<PdfSplitToolProps> = ({ onBack }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [pageThumbnails, setPageThumbnails] = useState<PageThumbnailItem[]>([]);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [rangeInput, setRangeInput] = useState<string>('');
  const [rangeError, setRangeError] = useState<string | null>(null);

  const [splitMode, setSplitMode] = useState<SplitMode>('extract');
  const [everyNCount, setEveryNCount] = useState<number>(2);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{ percent: number; message: string } | null>(null);
  const [resultSummary, setResultSummary] = useState<{ message: string; filename: string } | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isCancelledRef = useRef(false);

  // Synchronise le champ texte de plage quand on clique sur des miniatures
  const updateRangeFromSelectedPages = (pagesSet: Set<number>, total: number) => {
    if (pagesSet.size === 0) {
      setRangeInput('');
      setRangeError(null);
      return;
    }

    const sorted = Array.from(pagesSet).sort((a, b) => a - b);
    const ranges: string[] = [];
    let start = sorted[0];
    let prev = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
      const curr = sorted[i];
      if (curr === prev + 1) {
        prev = curr;
      } else {
        ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
        start = curr;
        prev = curr;
      }
    }
    ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
    const generated = ranges.join(', ');
    setRangeInput(generated);
    setRangeError(null);
  };

  // Synchronise les cases cochées quand l'utilisateur tape dans le champ de plage
  const handleRangeInputChange = (value: string) => {
    setRangeInput(value);
    if (!value.trim()) {
      setSelectedPages(new Set());
      setRangeError(null);
      return;
    }

    const parsed = parsePageRangeString(value, totalPages);
    if (!parsed.valid) {
      setRangeError(parsed.error || 'Plage invalide');
    } else {
      setRangeError(null);
      setSelectedPages(new Set(parsed.pages));
    }
  };

  const handleTogglePage = (pageNum: number) => {
    const next = new Set(selectedPages);
    if (next.has(pageNum)) {
      next.delete(pageNum);
    } else {
      next.add(pageNum);
    }
    setSelectedPages(next);
    updateRangeFromSelectedPages(next, totalPages);
  };

  const handleSelectAllPages = () => {
    const all = new Set<number>();
    for (let i = 1; i <= totalPages; i++) {
      all.add(i);
    }
    setSelectedPages(all);
    setRangeInput(`1-${totalPages}`);
    setRangeError(null);
  };

  const handleDeselectAllPages = () => {
    setSelectedPages(new Set());
    setRangeInput('');
    setRangeError(null);
  };

  // Chargement et analyse d'un fichier PDF
  const handleFileSelect = async (file: File) => {
    setGeneralError(null);
    setResultSummary(null);
    setProgress(null);
    isCancelledRef.current = false;

    if (!file.type.includes('pdf') && !/\.pdf$/i.test(file.name)) {
      setGeneralError('Format non supporté. Sélectionne un fichier PDF.');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setGeneralError('Le fichier dépasse la limite de 20 Mo.');
      return;
    }

    setIsAnalyzing(true);
    setSelectedFile(file);

    try {
      const buffer = await file.arrayBuffer();

      // Vérification chiffrement / mot de passe
      try {
        const doc = await PDFDocument.load(buffer, { ignoreEncryption: false });
        const numPages = doc.getPageCount();
        setTotalPages(numPages);

        // Initialisation de la grille de miniatures (squelette)
        const initialThumbs: PageThumbnailItem[] = Array.from({ length: numPages }, (_, i) => ({
          pageNumber: i + 1,
          isLoading: true
        }));
        setPageThumbnails(initialThumbs);

        // Sélection par défaut de la page 1
        setSelectedPages(new Set([1]));
        setRangeInput(numPages > 1 ? '1' : '1');

        setIsAnalyzing(false);

        // Chargement séquentiel des miniatures en arrière-plan (économise la mémoire)
        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
        const pdf = await loadingTask.promise;

        for (let i = 1; i <= numPages; i++) {
          if (isCancelledRef.current) break;
          try {
            const page = await pdf.getPage(i);
            const defaultViewport = page.getViewport({ scale: 1.0 });
            const scale = 110 / defaultViewport.width;
            const viewport = page.getViewport({ scale });

            const canvas = document.createElement('canvas');
            canvas.width = Math.floor(viewport.width);
            canvas.height = Math.floor(viewport.height);
            const ctx = canvas.getContext('2d');
            if (ctx) {
              await (page.render({
                canvasContext: ctx,
                viewport,
                canvas
              } as any) as any).promise;
              const url = canvas.toDataURL('image/jpeg', 0.7);
              canvas.width = 0;
              canvas.height = 0;

              setPageThumbnails((prev) =>
                prev.map((item) =>
                  item.pageNumber === i
                    ? { ...item, thumbnailUrl: url, isLoading: false }
                    : item
                )
              );
            }
          } catch (e) {
            console.warn(`Erreur miniature page ${i}:`, e);
          }
        }
      } catch (err: any) {
        const msg = String(err?.message || '').toLowerCase();
        if (msg.includes('encrypt') || msg.includes('password')) {
          setGeneralError('Ce fichier est protégé par mot de passe. Retire-le de la liste.');
        } else {
          setGeneralError('Ce fichier est protégé ou abîmé. Impossible de le lire.');
        }
        setSelectedFile(null);
        setIsAnalyzing(false);
      }
    } catch {
      setGeneralError('Impossible d’ouvrir ce fichier PDF.');
      setSelectedFile(null);
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    isCancelledRef.current = true;
    setSelectedFile(null);
    setTotalPages(0);
    setPageThumbnails([]);
    setSelectedPages(new Set());
    setRangeInput('');
    setRangeError(null);
    setResultSummary(null);
    setProgress(null);
    setGeneralError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  useEffect(() => {
    return () => {
      isCancelledRef.current = true;
    };
  }, []);

  const handleSplit = async () => {
    if (!selectedFile || isProcessing) return;
    setGeneralError(null);
    setIsProcessing(true);
    const baseName = selectedFile.name.replace(/\.pdf$/i, '');

    try {
      if (splitMode === 'extract') {
        if (selectedPages.size === 0) {
          setGeneralError('Sélectionne au moins une page à extraire.');
          setIsProcessing(false);
          return;
        }

        const pagesArray = Array.from(selectedPages).sort((a, b) => a - b);
        const { pdfBytes, extractedCount } = await extractPagesToSinglePdf(
          selectedFile,
          pagesArray,
          (percent, message) => setProgress({ percent, message })
        );

        const filename = generateDefaultFilename(`${baseName}-extrait`, 'pdf');
        triggerFileDownload(pdfBytes, filename);

        setResultSummary({
          message: `Terminé : ${extractedCount} page(s) extraite(s) dans un nouveau document PDF.`,
          filename
        });
      } else if (splitMode === 'single_page') {
        const { zipBlob, fileCount } = await splitPdfToOnePagePerFileZip(
          selectedFile,
          baseName,
          (percent, message) => setProgress({ percent, message })
        );

        const filename = generateDefaultFilename(`${baseName}-pages-separees`, 'zip');
        triggerFileDownload(zipBlob, filename, 'application/zip');

        setResultSummary({
          message: `Terminé : ${fileCount} fichiers PDF individuels créés dans une archive ZIP.`,
          filename
        });
      } else if (splitMode === 'every_n') {
        const { zipBlob, fileCount } = await splitPdfEveryNPagesZip(
          selectedFile,
          everyNCount,
          baseName,
          (percent, message) => setProgress({ percent, message })
        );

        const filename = generateDefaultFilename(`${baseName}-decoupe-${everyNCount}p`, 'zip');
        triggerFileDownload(zipBlob, filename, 'application/zip');

        setResultSummary({
          message: `Terminé : ${fileCount} documents de ${everyNCount} pages créés dans une archive ZIP.`,
          filename
        });
      }
    } catch (err: any) {
      console.error('Erreur lors de la découpe:', err);
      setGeneralError(err.message || 'Impossible de découper ce document.');
    } finally {
      setIsProcessing(false);
    }
  };

  const isExtractValid = splitMode !== 'extract' || (selectedPages.size > 0 && !rangeError);

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
              Séparer un PDF
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Extrais des pages ou découpe ton document
            </p>
          </div>
        </div>

        {selectedFile && !resultSummary && (
          <button
            type="button"
            onClick={handleReset}
            disabled={isProcessing}
            className="text-xs font-semibold text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-40"
          >
            Changer de fichier
          </button>
        )}
      </header>

      {/* Corps déroulant */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 max-w-2xl mx-auto w-full space-y-4">
        {/* Résultat final avec téléchargement */}
        {resultSummary ? (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-emerald-200 dark:border-emerald-800/60 shadow-xs text-center space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-2xs">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Séparation terminée !
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
                {resultSummary.message}
              </p>
              <p className="text-xs text-slate-400 mt-1 font-mono truncate max-w-xs mx-auto">
                {resultSummary.filename}
              </p>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800">
              Le fichier a été téléchargé sur ton appareil. Tes documents restent toujours confidentiels sur ton appareil.
            </p>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 transition active:scale-95 cursor-pointer min-h-[44px]"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Séparer un autre document</span>
              </button>
            </div>
          </div>
        ) : !selectedFile ? (
          /* Écran d'accueil de sélection de fichier */
          <div className="space-y-4">
            <div className="bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/50 rounded-2xl p-3.5 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong>Traitement 100 % local et gratuit :</strong> aucune page n’est transmise à un serveur. Choisi le mode d’extraction qui te convient (pages sélectionnées, une page par fichier ou découpe par blocs).
              </div>
            </div>

            {generalError && (
              <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-2xl p-3.5 text-xs text-red-700 dark:text-red-300 flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed font-medium">{generalError}</div>
              </div>
            )}

            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl p-8 sm:p-10 text-center bg-white dark:bg-slate-800/80 hover:border-blue-400 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                }}
                className="hidden"
                id="split-file-input"
                disabled={isAnalyzing}
              />

              <div className="flex flex-col items-center justify-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
                  {isAnalyzing ? (
                    <Loader2 className="w-7 h-7 animate-spin" />
                  ) : (
                    <Scissors className="w-7 h-7" />
                  )}
                </div>

                <div>
                  <label
                    htmlFor="split-file-input"
                    className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-md shadow-blue-500/20 transition cursor-pointer min-h-[44px]"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Choisir un fichier PDF</span>
                  </label>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2.5">
                    Un seul document PDF · 20 Mo maximum
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Fichier sélectionné : options de découpe et miniatures */
          <div className="space-y-4">
            {generalError && (
              <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-2xl p-3.5 text-xs text-red-700 dark:text-red-300 flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed font-medium">{generalError}</div>
              </div>
            )}

            {/* Carte résumé du fichier chargé */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-3.5 border border-slate-200/90 dark:border-slate-700 flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                    {selectedFile.name}
                  </p>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    <span>{totalPages} page{totalPages > 1 ? 's' : ''}</span>
                    <span aria-hidden="true">·</span>
                    <span>{(selectedFile.size / (1024 * 1024)).toFixed(1)} Mo</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleReset}
                disabled={isProcessing}
                className="text-xs font-semibold text-slate-500 hover:text-red-600 dark:text-slate-400 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Changer
              </button>
            </div>

            {/* Sélecteur des 3 modes de séparation */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Mode de séparation
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSplitMode('extract')}
                  disabled={isProcessing}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                    splitMode === 'extract'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 shadow-2xs'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-bold leading-tight">Extraire des pages</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    Un seul PDF avec les pages sélectionnées
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSplitMode('single_page')}
                  disabled={isProcessing}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                    splitMode === 'single_page'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 shadow-2xs'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Archive className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-bold leading-tight">Une page par fichier</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    Toutes les pages séparées dans un ZIP
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSplitMode('every_n')}
                  disabled={isProcessing}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                    splitMode === 'every_n'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 shadow-2xs'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-bold leading-tight">Couper tous les N</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    Fichiers de N pages livrés dans un ZIP
                  </p>
                </button>
              </div>
            </div>

            {/* Réglage spécifique Mode 3 : Nombre de pages par fichier */}
            {splitMode === 'every_n' && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-700 space-y-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Découper toutes les…
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 5, 10].map((n) => (
                    <button
                      key={n}
                      type="button"
                      disabled={isProcessing}
                      onClick={() => setEveryNCount(n)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                        everyNCount === n
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {n} page{n > 1 ? 's' : ''}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Le document de {totalPages} pages sera découpé en {Math.ceil(totalPages / everyNCount)} fichier{Math.ceil(totalPages / everyNCount) > 1 ? 's' : ''}.
                </p>
              </div>
            )}

            {/* Réglage Mode 1 : Plage de pages + boutons Tout cocher / Décocher */}
            {splitMode === 'extract' && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="range-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Plage de pages à extraire
                  </label>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={handleSelectAllPages}
                      disabled={isProcessing}
                      className="text-blue-600 hover:underline cursor-pointer"
                    >
                      Tout cocher
                    </button>
                    <span className="text-slate-300">·</span>
                    <button
                      type="button"
                      onClick={handleDeselectAllPages}
                      disabled={isProcessing}
                      className="text-slate-500 hover:underline cursor-pointer"
                    >
                      Tout décocher
                    </button>
                  </div>
                </div>

                <input
                  id="range-input"
                  type="text"
                  value={rangeInput}
                  onChange={(e) => handleRangeInputChange(e.target.value)}
                  disabled={isProcessing}
                  placeholder="Ex : 1-3, 5, 8-"
                  className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition ${
                    rangeError ? 'border-red-400 focus:ring-red-500' : 'border-slate-200 dark:border-slate-700'
                  }`}
                />

                {rangeError ? (
                  <p className="text-[11px] font-semibold text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{rangeError}</span>
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {selectedPages.size} page{selectedPages.size > 1 ? 's' : ''} sélectionnée{selectedPages.size > 1 ? 's' : ''} sur {totalPages}. Tu peux cocher les pages directement ci-dessous ou saisir une plage.
                  </p>
                )}
              </div>
            )}

            {/* Grille de miniatures cochables */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1 text-xs text-slate-500 dark:text-slate-400">
                <span>Pages du document ({totalPages})</span>
                {splitMode === 'extract' && (
                  <span>Clique pour sélectionner / désélectionner</span>
                )}
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5 max-h-[380px] overflow-y-auto p-1 bg-slate-100/60 dark:bg-slate-800/40 rounded-2xl border border-slate-200/70 dark:border-slate-700/60">
                {pageThumbnails.map((item) => {
                  const isChecked = selectedPages.has(item.pageNumber);
                  const isClickable = splitMode === 'extract' && !isProcessing;

                  return (
                    <div
                      key={item.pageNumber}
                      onClick={() => {
                        if (isClickable) handleTogglePage(item.pageNumber);
                      }}
                      className={`relative group rounded-xl overflow-hidden border transition flex flex-col items-center bg-white dark:bg-slate-800 select-none ${
                        isClickable ? 'cursor-pointer hover:border-blue-400' : 'cursor-default'
                      } ${
                        splitMode === 'extract' && isChecked
                          ? 'border-blue-600 ring-2 ring-blue-500/30'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {/* En-tête miniature avec badge de numéro et case à cocher */}
                      <div className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700/70 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">
                          p. {item.pageNumber}
                        </span>

                        {splitMode === 'extract' && (
                          <div className="shrink-0 text-blue-600 dark:text-blue-400">
                            {isChecked ? (
                              <CheckSquare className="w-3.5 h-3.5 fill-blue-600 text-white" />
                            ) : (
                              <Square className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                            )}
                          </div>
                        )}
                      </div>

                      {/* Image de la miniature */}
                      <div className="w-full aspect-3/4 flex items-center justify-center p-1 bg-slate-50 dark:bg-slate-900">
                        {item.isLoading ? (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 animate-pulse">
                            <Loader2 className="w-4 h-4 animate-spin mb-1" />
                            <span className="text-[9px]">Chargement</span>
                          </div>
                        ) : item.thumbnailUrl ? (
                          <img
                            src={item.thumbnailUrl}
                            alt={`Page ${item.pageNumber}`}
                            className="w-full h-full object-contain rounded-sm"
                            loading="lazy"
                          />
                        ) : (
                          <FileText className="w-6 h-6 text-slate-300" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Barre de progression pendant la découpe */}
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

            {/* Bouton d'action Séparer */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSplit}
                disabled={!isExtractValid || isProcessing}
                className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 text-white font-bold rounded-2xl text-sm shadow-md shadow-blue-500/20 disabled:shadow-none transition flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed min-h-[46px]"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Séparation en cours…</span>
                  </>
                ) : (
                  <>
                    <Scissors className="w-4 h-4" />
                    <span>
                      {splitMode === 'extract'
                        ? `Extraire les pages (${selectedPages.size} sélectionnée${selectedPages.size > 1 ? 's' : ''})`
                        : splitMode === 'single_page'
                        ? `Séparer en ${totalPages} fichiers (ZIP)`
                        : `Découper par blocs de ${everyNCount} pages (ZIP)`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
