import React from 'react';
import { X, FileText, Clock, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';
import type { DocumentRecord } from '../types';
import { ExportButtons } from './ExportButtons';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: DocumentRecord[];
  onRefresh: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  documents
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="p-1.5 -ml-1.5 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
              aria-label="Retour"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-base font-bold text-slate-900">Historique des documents</h2>
              <p className="text-xs text-slate-500">
                {documents.length} document{documents.length > 1 ? 's' : ''} enregistré{documents.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice */}
        <div className="bg-blue-50 px-5 py-2.5 text-xs text-blue-800 border-b border-blue-100/60 font-medium flex items-center gap-2">
          <span>🔒 Tes fichiers sont supprimés après 24 h.</span>
        </div>

        {/* Document List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {documents.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-700">Aucun document pour le moment</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                Envoie un document PDF ou une photo dans le chat pour commencer l'extraction.
              </p>
            </div>
          ) : (
            documents.map((doc) => {
              const dateStr = new Date(doc.created_at).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              });

              const isSuccess = doc.statut === 'termine' && doc.json_document;
              const isError = doc.statut === 'erreur';

              return (
                <div
                  key={doc.id}
                  className="p-4 rounded-2xl border border-slate-200/80 hover:border-slate-300 transition bg-slate-50/50 flex items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-blue-600 shrink-0 mt-0.5">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {doc.nom_fichier}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="flex items-center gap-1 text-[11px] text-slate-500">
                          <Clock className="w-3 h-3" />
                          {dateStr}
                        </span>
                        {isSuccess && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" />
                            Prêt
                          </span>
                        )}
                        {isError && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                            <AlertTriangle className="w-3 h-3" />
                            Erreur
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {isSuccess && doc.json_document && (
                    <div className="shrink-0">
                      <ExportButtons
                        data={doc.json_document}
                        filename={doc.nom_fichier}
                        variant="compact"
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <button
            onClick={onClose}
            className="w-full py-3 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
