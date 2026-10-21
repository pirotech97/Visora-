import React from 'react';
import type { DocumentData, DocxBlock } from '../types';
import { ExportButtons } from './ExportButtons';

interface DocumentPreviewProps {
  data: DocumentData;
  filename: string;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({ data, filename }) => {

  const renderBlock = (block: DocxBlock, index: number) => {
    if (block.type === 'titre') {
      if (block.niveau === 1) {
        return (
          <h2 key={index} className="text-lg font-bold text-slate-900 mt-3 mb-1.5 first:mt-0 tracking-tight">
            {block.texte}
          </h2>
        );
      }
      if (block.niveau === 2) {
        return (
          <h3 key={index} className="text-base font-semibold text-slate-800 mt-2.5 mb-1 tracking-tight">
            {block.texte}
          </h3>
        );
      }
      return (
        <h4 key={index} className="text-sm font-semibold text-slate-800 mt-2 mb-1">
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
        <div key={index} className="my-3 overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-xs sm:text-sm" style={{ fontFamily: 'Calibri, sans-serif' }}>
            <tbody className="divide-y divide-slate-200 bg-white">
              {rows.map((row, rIdx) => {
                const cells = Array.isArray(row) ? row : [String(row)];
                const isHeader = rIdx === 0;
                return (
                  <tr key={rIdx} className={isHeader ? 'bg-slate-50 font-semibold text-slate-900' : 'text-slate-700'}>
                    {cells.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        className="px-3 py-2 border-r last:border-r-0 border-slate-200 whitespace-normal break-words"
                      >
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

  const blocks = Array.isArray(data?.blocs) ? data.blocs : [];

  return (
    <div className="w-full space-y-3">
      {/* Readable preview paper box */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs max-h-96 overflow-y-auto">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Aperçu fidèle
            </span>
          </div>
          <span className="text-xs text-slate-400 font-mono truncate max-w-[150px]">
            {filename}
          </span>
        </div>

        <div className="space-y-1">
          {blocks.length > 0 ? (
            blocks.map((block, idx) => renderBlock(block, idx))
          ) : (
            <p className="text-sm text-slate-400 italic">Aucun contenu extrait.</p>
          )}
        </div>
      </div>

      {/* Export Action Buttons (Word, PDF, Image) */}
      <ExportButtons data={data} filename={filename} variant="prominent" />
    </div>
  );
};
