import React, { useState } from 'react';
import { Download, FileText, Image as ImageIcon, Loader2, Check } from 'lucide-react';
import type { DocumentData } from '../types';
import { downloadDocx } from '../services/docxGenerator';
import { downloadPdfFromDocument } from '../services/pdfGenerator';
import { downloadImagesFromDocument } from '../services/imageExporter';

interface ExportButtonsProps {
  data: DocumentData;
  filename: string;
  variant?: 'prominent' | 'compact';
  onNotification?: (msg: string) => void;
}

export const ExportButtons: React.FC<ExportButtonsProps> = ({
  data,
  filename,
  variant = 'prominent',
  onNotification
}) => {
  const [activeExport, setActiveExport] = useState<'docx' | 'pdf' | 'image' | null>(null);
  const [justExported, setJustExported] = useState<'docx' | 'pdf' | 'image' | null>(null);

  const handleExportDocx = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeExport) return;
    try {
      setActiveExport('docx');
      await downloadDocx(data, filename);
      setJustExported('docx');
      setTimeout(() => setJustExported(null), 2500);
    } catch (err: any) {
      console.error('Docx export error:', err);
      onNotification?.(err.message || 'Erreur lors de la génération du fichier Word.');
    } finally {
      setActiveExport(null);
    }
  };

  const handleExportPdf = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeExport) return;
    try {
      setActiveExport('pdf');
      await downloadPdfFromDocument(data, filename);
      setJustExported('pdf');
      setTimeout(() => setJustExported(null), 2500);
    } catch (err: any) {
      console.error('PDF export error:', err);
      onNotification?.(err.message || 'Erreur lors de la génération du PDF.');
    } finally {
      setActiveExport(null);
    }
  };

  const handleExportImage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeExport) return;
    try {
      setActiveExport('image');
      await downloadImagesFromDocument(data, filename);
      setJustExported('image');
      setTimeout(() => setJustExported(null), 2500);
    } catch (err: any) {
      console.error('Image export error:', err);
      onNotification?.(err.message || "Erreur lors de l'exportation de l'image.");
    } finally {
      setActiveExport(null);
    }
  };

  if (variant === 'compact') {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {/* DOCX button */}
        <button
          type="button"
          onClick={handleExportDocx}
          disabled={Boolean(activeExport)}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
          title="Télécharger en Word (.docx)"
        >
          {activeExport === 'docx' ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Préparation…</span>
            </>
          ) : justExported === 'docx' ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-300" />
              <span>.docx prêt !</span>
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5" />
              <span>.docx</span>
            </>
          )}
        </button>

        {/* PDF button */}
        <button
          type="button"
          onClick={handleExportPdf}
          disabled={Boolean(activeExport)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-xs font-semibold transition active:scale-95 disabled:opacity-50 cursor-pointer border border-slate-200"
          title="Exporter en PDF"
        >
          {activeExport === 'pdf' ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
              <span>Préparation…</span>
            </>
          ) : justExported === 'pdf' ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>PDF prêt !</span>
            </>
          ) : (
            <>
              <FileText className="w-3.5 h-3.5 text-red-500" />
              <span>PDF</span>
            </>
          )}
        </button>

        {/* Image button */}
        <button
          type="button"
          onClick={handleExportImage}
          disabled={Boolean(activeExport)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-xs font-semibold transition active:scale-95 disabled:opacity-50 cursor-pointer border border-slate-200"
          title="Exporter en Image (PNG/ZIP)"
        >
          {activeExport === 'image' ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
              <span>Préparation…</span>
            </>
          ) : justExported === 'image' ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Image prête !</span>
            </>
          ) : (
            <>
              <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
              <span>Image</span>
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      {/* Primary Word Button */}
      <button
        type="button"
        onClick={handleExportDocx}
        disabled={Boolean(activeExport)}
        className="w-full flex items-center justify-center gap-2.5 py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-2xl shadow-sm text-sm transition active:scale-[0.99] disabled:opacity-60 cursor-pointer min-h-[46px]"
      >
        {activeExport === 'docx' ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Préparation…</span>
          </>
        ) : justExported === 'docx' ? (
          <>
            <Check className="w-4 h-4 text-emerald-300" />
            <span>Fichier .docx téléchargé !</span>
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            <span>Télécharger .docx</span>
          </>
        )}
      </button>

      {/* Secondary row with PDF and Image export */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleExportPdf}
          disabled={Boolean(activeExport)}
          className="flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-semibold rounded-xl border border-slate-200 text-xs sm:text-sm transition active:scale-[0.99] disabled:opacity-50 cursor-pointer min-h-[42px]"
        >
          {activeExport === 'pdf' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span>Préparation…</span>
            </>
          ) : justExported === 'pdf' ? (
            <>
              <Check className="w-4 h-4 text-emerald-600" />
              <span>PDF téléchargé !</span>
            </>
          ) : (
            <>
              <FileText className="w-4 h-4 text-red-500" />
              <span>PDF</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleExportImage}
          disabled={Boolean(activeExport)}
          className="flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-semibold rounded-xl border border-slate-200 text-xs sm:text-sm transition active:scale-[0.99] disabled:opacity-50 cursor-pointer min-h-[42px]"
        >
          {activeExport === 'image' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span>Préparation…</span>
            </>
          ) : justExported === 'image' ? (
            <>
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Image téléchargée !</span>
            </>
          ) : (
            <>
              <ImageIcon className="w-4 h-4 text-emerald-600" />
              <span>Image</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
