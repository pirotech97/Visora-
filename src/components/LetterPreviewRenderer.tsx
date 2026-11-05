import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { LettreOutputDocument } from '../types';
import type { LetterDesignOptions } from '../services/adminDesignEngine';

interface LetterPreviewRendererProps {
  document: LettreOutputDocument;
  onChange: (doc: LettreOutputDocument) => void;
  options: LetterDesignOptions;
}

export const LetterPreviewRenderer: React.FC<LetterPreviewRendererProps> = ({
  document: doc,
  onChange,
  options
}) => {
  const isSerif = options.fontFamily === 'serif';
  const isCompact = options.fontSize === 'compact';
  const accent = options.accentColor;

  const fontClass = isSerif ? 'font-serif' : 'font-sans';
  const textSizeClass = isCompact ? 'text-[12px] leading-relaxed' : 'text-[13.5px] leading-relaxed';

  // Helper modifications
  const updateExpediteur = (field: keyof typeof doc.expediteur, value: string) => {
    onChange({
      ...doc,
      expediteur: { ...doc.expediteur, [field]: value }
    });
  };

  const updateDestinataire = (field: keyof typeof doc.destinataire, value: string) => {
    onChange({
      ...doc,
      destinataire: { ...doc.destinataire, [field]: value }
    });
  };

  const updateParagraph = (index: number, val: string) => {
    const updated = [...doc.paragraphes];
    updated[index] = val;
    onChange({ ...doc, paragraphes: updated });
  };

  const addParagraph = () => {
    onChange({
      ...doc,
      paragraphes: [...doc.paragraphes, 'Nouveau paragraphe']
    });
  };

  const removeParagraph = (index: number) => {
    if (doc.paragraphes.length <= 1) return;
    onChange({
      ...doc,
      paragraphes: doc.paragraphes.filter((_, i) => i !== index)
    });
  };

  // ==========================================================================
  // MODÈLE 1 : CLASSIQUE
  // Expéditeur haut gauche, destinataire droite, objet en gras, texte justifié
  // ==========================================================================
  if (options.templateId === 'classique') {
    return (
      <div
        className={`bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl p-6 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-sm ${fontClass} ${textSizeClass} transition-all space-y-6`}
      >
        {/* En-tête : Expéditeur (gauche) & Destinataire (droite) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-2">
          {/* Expéditeur */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
              Expéditeur
            </span>
            <input
              type="text"
              value={doc.expediteur?.nom || ''}
              onChange={(e) => updateExpediteur('nom', e.target.value)}
              placeholder="Nom de l'expéditeur"
              className="w-full font-bold text-slate-900 dark:text-white bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 py-0.5 focus:outline-hidden focus:border-blue-500"
            />
            <input
              type="text"
              value={doc.expediteur?.adresse || ''}
              onChange={(e) => updateExpediteur('adresse', e.target.value)}
              placeholder="Adresse"
              className="w-full text-slate-600 dark:text-slate-400 bg-transparent border-b border-dashed border-slate-200 dark:border-slate-800 py-0.5 text-xs focus:outline-hidden focus:border-blue-500"
            />
            <input
              type="text"
              value={doc.expediteur?.telephone || ''}
              onChange={(e) => updateExpediteur('telephone', e.target.value)}
              placeholder="Téléphone"
              className="w-full text-slate-600 dark:text-slate-400 bg-transparent border-b border-dashed border-slate-200 dark:border-slate-800 py-0.5 text-xs focus:outline-hidden focus:border-blue-500"
            />
            <input
              type="text"
              value={doc.expediteur?.email || ''}
              onChange={(e) => updateExpediteur('email', e.target.value)}
              placeholder="Email"
              className="w-full text-slate-600 dark:text-slate-400 bg-transparent border-b border-dashed border-slate-200 dark:border-slate-800 py-0.5 text-xs focus:outline-hidden focus:border-blue-500"
            />
          </div>

          {/* Destinataire */}
          <div className="space-y-1 sm:text-right sm:pl-4">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
              Destinataire
            </span>
            <input
              type="text"
              value={doc.destinataire?.organisation || ''}
              onChange={(e) => updateDestinataire('organisation', e.target.value)}
              placeholder="Organisation"
              className="w-full font-bold text-slate-900 dark:text-white bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 py-0.5 sm:text-right focus:outline-hidden focus:border-blue-500"
            />
            <input
              type="text"
              value={doc.destinataire?.fonction || ''}
              onChange={(e) => updateDestinataire('fonction', e.target.value)}
              placeholder="Fonction"
              className="w-full font-semibold text-slate-700 dark:text-slate-300 bg-transparent border-b border-dashed border-slate-200 dark:border-slate-800 py-0.5 text-xs sm:text-right focus:outline-hidden focus:border-blue-500"
            />
            <input
              type="text"
              value={doc.destinataire?.nom || ''}
              onChange={(e) => updateDestinataire('nom', e.target.value)}
              placeholder="Nom"
              className="w-full text-slate-600 dark:text-slate-400 bg-transparent border-b border-dashed border-slate-200 dark:border-slate-800 py-0.5 text-xs sm:text-right focus:outline-hidden focus:border-blue-500"
            />
            <input
              type="text"
              value={doc.destinataire?.adresse || ''}
              onChange={(e) => updateDestinataire('adresse', e.target.value)}
              placeholder="Adresse"
              className="w-full text-slate-600 dark:text-slate-400 bg-transparent border-b border-dashed border-slate-200 dark:border-slate-800 py-0.5 text-xs sm:text-right focus:outline-hidden focus:border-blue-500"
            />
          </div>
        </div>

        {/* Lieu et Date (droite) */}
        <div className="flex justify-end pt-2">
          <input
            type="text"
            value={doc.lieu_date}
            onChange={(e) => onChange({ ...doc, lieu_date: e.target.value })}
            placeholder="Lieu et date"
            className="text-right text-xs font-semibold text-slate-600 dark:text-slate-400 bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 px-2 py-1 focus:outline-hidden focus:border-blue-500"
          />
        </div>

        {/* Objet */}
        <div className="pt-2">
          <div className="flex items-center gap-2">
            <span className="font-bold uppercase text-xs" style={{ color: accent }}>
              Objet :
            </span>
            <input
              type="text"
              value={doc.objet}
              onChange={(e) => onChange({ ...doc, objet: e.target.value })}
              className="flex-1 font-bold text-slate-900 dark:text-white bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 py-1 focus:outline-hidden focus:border-blue-500"
            />
          </div>
        </div>

        {/* Formule d'ouverture */}
        <div className="pt-1">
          <input
            type="text"
            value={doc.ouverture}
            onChange={(e) => onChange({ ...doc, ouverture: e.target.value })}
            className="w-full font-bold text-slate-900 dark:text-white bg-transparent border-b border-dashed border-slate-200 dark:border-slate-800 py-0.5 focus:outline-hidden focus:border-blue-500"
          />
        </div>

        {/* Paragraphes du corps (justifié) */}
        <div className="space-y-4 text-justify">
          {doc.paragraphes.map((p, idx) => (
            <div key={idx} className="relative group">
              <textarea
                rows={3}
                value={p}
                onChange={(e) => updateParagraph(idx, e.target.value)}
                className="w-full text-slate-800 dark:text-slate-200 bg-slate-50/50 dark:bg-slate-800/40 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-blue-500 rounded-xl p-3 focus:outline-hidden leading-relaxed resize-y text-justify"
              />
              {doc.paragraphes.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeParagraph(idx)}
                  className="absolute -top-2 -right-2 p-1.5 bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/80 text-rose-600 rounded-lg opacity-0 group-hover:opacity-100 transition cursor-pointer"
                  title="Supprimer ce paragraphe"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={addParagraph}
            className="text-xs font-semibold text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1.5 cursor-pointer py-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ajouter un paragraphe</span>
          </button>
        </div>

        {/* Formule de politesse */}
        <div className="pt-2">
          <textarea
            rows={2}
            value={doc.formule_politesse}
            onChange={(e) => onChange({ ...doc, formule_politesse: e.target.value })}
            className="w-full text-slate-800 dark:text-slate-200 bg-transparent border-b border-dashed border-slate-200 dark:border-slate-800 py-1 focus:outline-hidden focus:border-blue-500"
          />
        </div>

        {/* Signature */}
        <div className="flex justify-end pt-4">
          <div className="w-full sm:w-64 text-right space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              Signature
            </span>
            <input
              type="text"
              value={doc.signature || doc.expediteur?.nom || ''}
              onChange={(e) => onChange({ ...doc, signature: e.target.value })}
              className="w-full text-right font-bold text-slate-900 dark:text-white bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 py-1 focus:outline-hidden focus:border-blue-500"
            />
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // MODÈLE 2 : MODERNE
  // Bandeau fin d'accent avec le nom, coordonnées en colonne latérale étroite, texte aéré
  // ==========================================================================
  if (options.templateId === 'moderne') {
    return (
      <div
        className={`bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm ${fontClass} ${textSizeClass} transition-all`}
      >
        {/* Bandeau fin de la couleur d'accent avec le nom de l'expéditeur */}
        <div className="px-6 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-3 text-white" style={{ backgroundColor: accent }}>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest opacity-80 block">
              Correspondance officielle
            </span>
            <input
              type="text"
              value={doc.expediteur?.nom || ''}
              onChange={(e) => updateExpediteur('nom', e.target.value)}
              placeholder="Ton nom"
              className="text-base sm:text-lg font-black bg-transparent border-b border-white/40 focus:border-white focus:outline-hidden w-full placeholder:text-white/60 text-white"
            />
          </div>
          <div className="text-right">
            <input
              type="text"
              value={doc.lieu_date}
              onChange={(e) => onChange({ ...doc, lieu_date: e.target.value })}
              placeholder="Lieu et date"
              className="text-right text-xs font-semibold bg-transparent border-b border-white/40 focus:border-white focus:outline-hidden text-white"
            />
          </div>
        </div>

        {/* Corps structuré : Colonne latérale étroite (coordonnées) + Espace principal */}
        <div className="grid grid-cols-1 md:grid-cols-12 min-h-[460px]">
          {/* Colonne latérale étroite */}
          <div className="md:col-span-4 bg-slate-50 dark:bg-slate-950/60 p-5 sm:p-6 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 space-y-4">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1.5">
                Coordonnées
              </span>
              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <input
                  type="text"
                  value={doc.expediteur?.adresse || ''}
                  onChange={(e) => updateExpediteur('adresse', e.target.value)}
                  placeholder="Adresse"
                  className="w-full bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 py-1 focus:outline-hidden focus:border-blue-500"
                />
                <input
                  type="text"
                  value={doc.expediteur?.telephone || ''}
                  onChange={(e) => updateExpediteur('telephone', e.target.value)}
                  placeholder="Téléphone"
                  className="w-full bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 py-1 focus:outline-hidden focus:border-blue-500"
                />
                <input
                  type="text"
                  value={doc.expediteur?.email || ''}
                  onChange={(e) => updateExpediteur('email', e.target.value)}
                  placeholder="Email"
                  className="w-full bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 py-1 focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1.5">
                Destinataire
              </span>
              <div className="space-y-1.5 text-xs">
                <input
                  type="text"
                  value={doc.destinataire?.organisation || ''}
                  onChange={(e) => updateDestinataire('organisation', e.target.value)}
                  placeholder="Organisation"
                  className="w-full font-bold text-slate-900 dark:text-white bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 py-1 focus:outline-hidden focus:border-blue-500"
                />
                <input
                  type="text"
                  value={doc.destinataire?.fonction || ''}
                  onChange={(e) => updateDestinataire('fonction', e.target.value)}
                  placeholder="Fonction"
                  className="w-full text-slate-700 dark:text-slate-300 bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 py-1 focus:outline-hidden focus:border-blue-500"
                />
                <input
                  type="text"
                  value={doc.destinataire?.nom || ''}
                  onChange={(e) => updateDestinataire('nom', e.target.value)}
                  placeholder="Nom"
                  className="w-full text-slate-600 dark:text-slate-400 bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 py-1 focus:outline-hidden focus:border-blue-500"
                />
                <input
                  type="text"
                  value={doc.destinataire?.adresse || ''}
                  onChange={(e) => updateDestinataire('adresse', e.target.value)}
                  placeholder="Adresse"
                  className="w-full text-slate-600 dark:text-slate-400 bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 py-1 focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Espace principal de lecture aéré */}
          <div className="md:col-span-8 p-6 sm:p-8 space-y-5">
            {/* Objet */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border-l-4" style={{ borderColor: accent }}>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                Objet de la demande
              </span>
              <input
                type="text"
                value={doc.objet}
                onChange={(e) => onChange({ ...doc, objet: e.target.value })}
                className="w-full font-bold text-sm text-slate-900 dark:text-white bg-transparent focus:outline-hidden"
              />
            </div>

            {/* Ouverture */}
            <input
              type="text"
              value={doc.ouverture}
              onChange={(e) => onChange({ ...doc, ouverture: e.target.value })}
              className="w-full font-bold text-slate-900 dark:text-white bg-transparent border-b border-dashed border-slate-200 dark:border-slate-700 py-0.5 focus:outline-hidden focus:border-blue-500"
            />

            {/* Corps de texte aéré */}
            <div className="space-y-4">
              {doc.paragraphes.map((p, idx) => (
                <div key={idx} className="relative group">
                  <textarea
                    rows={3}
                    value={p}
                    onChange={(e) => updateParagraph(idx, e.target.value)}
                    className="w-full text-slate-800 dark:text-slate-200 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-blue-500 rounded-xl p-2.5 focus:outline-hidden leading-relaxed resize-y"
                  />
                  {doc.paragraphes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeParagraph(idx)}
                      className="absolute -top-2 -right-2 p-1.5 bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/80 text-rose-600 rounded-lg opacity-0 group-hover:opacity-100 transition cursor-pointer"
                      title="Supprimer ce paragraphe"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={addParagraph}
                className="text-xs font-semibold text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1.5 cursor-pointer py-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter un paragraphe</span>
              </button>
            </div>

            {/* Formule de politesse */}
            <textarea
              rows={2}
              value={doc.formule_politesse}
              onChange={(e) => onChange({ ...doc, formule_politesse: e.target.value })}
              className="w-full text-slate-800 dark:text-slate-200 bg-transparent border-b border-dashed border-slate-200 dark:border-slate-700 py-1 focus:outline-hidden focus:border-blue-500"
            />

            {/* Signature */}
            <div className="flex justify-end pt-3">
              <div className="w-full sm:w-60 text-right space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Signature
                </span>
                <input
                  type="text"
                  value={doc.signature || doc.expediteur?.nom || ''}
                  onChange={(e) => onChange({ ...doc, signature: e.target.value })}
                  className="w-full text-right font-bold text-slate-900 dark:text-white bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 py-1 focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // MODÈLE 3 : SOBRE
  // Nom en grandes lettres, filet de couleur sous l'en-tête, pied de page avec coordonnées
  // ==========================================================================
  return (
    <div
      className={`bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl p-6 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-sm ${fontClass} ${textSizeClass} transition-all space-y-6 flex flex-col justify-between min-h-[580px]`}
    >
      <div className="space-y-6">
        {/* Nom en grandes lettres & filet d'accent */}
        <div className="pb-3 border-b-2" style={{ borderBottomColor: accent }}>
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <input
              type="text"
              value={doc.expediteur?.nom || ''}
              onChange={(e) => updateExpediteur('nom', e.target.value)}
              placeholder="Ton nom complet"
              className="text-xl sm:text-2xl font-black uppercase tracking-wider text-slate-900 dark:text-white bg-transparent focus:outline-hidden w-full sm:w-auto"
            />
            <input
              type="text"
              value={doc.lieu_date}
              onChange={(e) => onChange({ ...doc, lieu_date: e.target.value })}
              placeholder="Lieu et date"
              className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 bg-transparent border-b border-dashed border-slate-200 dark:border-slate-700 text-right focus:outline-hidden focus:border-blue-500"
            />
          </div>
        </div>

        {/* Destinataire (bloc encadré sobre à droite) */}
        <div className="flex justify-end">
          <div className="w-full sm:w-72 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1 text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              À l'attention de
            </span>
            <input
              type="text"
              value={doc.destinataire?.organisation || ''}
              onChange={(e) => updateDestinataire('organisation', e.target.value)}
              placeholder="Organisation"
              className="w-full font-bold text-slate-900 dark:text-white bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 py-0.5 focus:outline-hidden"
            />
            <input
              type="text"
              value={doc.destinataire?.fonction || ''}
              onChange={(e) => updateDestinataire('fonction', e.target.value)}
              placeholder="Fonction"
              className="w-full text-slate-700 dark:text-slate-300 bg-transparent border-b border-dashed border-slate-200 dark:border-slate-700 py-0.5 focus:outline-hidden"
            />
            <input
              type="text"
              value={doc.destinataire?.nom || ''}
              onChange={(e) => updateDestinataire('nom', e.target.value)}
              placeholder="Nom"
              className="w-full text-slate-600 dark:text-slate-400 bg-transparent border-b border-dashed border-slate-200 dark:border-slate-700 py-0.5 focus:outline-hidden"
            />
            <input
              type="text"
              value={doc.destinataire?.adresse || ''}
              onChange={(e) => updateDestinataire('adresse', e.target.value)}
              placeholder="Adresse"
              className="w-full text-slate-500 dark:text-slate-400 bg-transparent border-b border-dashed border-slate-200 dark:border-slate-700 py-0.5 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Objet */}
        <div className="pt-1">
          <div className="flex items-center gap-2">
            <span className="font-bold uppercase text-xs tracking-wider" style={{ color: accent }}>
              Objet :
            </span>
            <input
              type="text"
              value={doc.objet}
              onChange={(e) => onChange({ ...doc, objet: e.target.value })}
              className="flex-1 font-bold text-slate-900 dark:text-white bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 py-0.5 focus:outline-hidden focus:border-blue-500"
            />
          </div>
        </div>

        {/* Ouverture */}
        <input
          type="text"
          value={doc.ouverture}
          onChange={(e) => onChange({ ...doc, ouverture: e.target.value })}
          className="w-full font-bold text-slate-900 dark:text-white bg-transparent border-b border-dashed border-slate-200 dark:border-slate-800 py-0.5 focus:outline-hidden focus:border-blue-500"
        />

        {/* Corps de texte */}
        <div className="space-y-4">
          {doc.paragraphes.map((p, idx) => (
            <div key={idx} className="relative group">
              <textarea
                rows={3}
                value={p}
                onChange={(e) => updateParagraph(idx, e.target.value)}
                className="w-full text-slate-800 dark:text-slate-200 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-blue-500 rounded-xl p-2.5 focus:outline-hidden leading-relaxed resize-y"
              />
              {doc.paragraphes.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeParagraph(idx)}
                  className="absolute -top-2 -right-2 p-1.5 bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/80 text-rose-600 rounded-lg opacity-0 group-hover:opacity-100 transition cursor-pointer"
                  title="Supprimer ce paragraphe"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={addParagraph}
            className="text-xs font-semibold text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1.5 cursor-pointer py-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ajouter un paragraphe</span>
          </button>
        </div>

        {/* Formule de politesse */}
        <textarea
          rows={2}
          value={doc.formule_politesse}
          onChange={(e) => onChange({ ...doc, formule_politesse: e.target.value })}
          className="w-full text-slate-800 dark:text-slate-200 bg-transparent border-b border-dashed border-slate-200 dark:border-slate-800 py-1 focus:outline-hidden focus:border-blue-500"
        />

        {/* Signature */}
        <div className="flex justify-end pt-2">
          <div className="w-full sm:w-60 text-right space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              Signature
            </span>
            <input
              type="text"
              value={doc.signature || doc.expediteur?.nom || ''}
              onChange={(e) => onChange({ ...doc, signature: e.target.value })}
              className="w-full text-right font-bold text-slate-900 dark:text-white bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 py-1 focus:outline-hidden focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Pied de page discret avec coordonnées de l'expéditeur */}
      <div className="pt-6 mt-6 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center">
        <span>{doc.expediteur?.nom}</span>
        {doc.expediteur?.adresse && <span>• {doc.expediteur.adresse}</span>}
        {doc.expediteur?.telephone && <span>• {doc.expediteur.telephone}</span>}
        {doc.expediteur?.email && <span>• {doc.expediteur.email}</span>}
      </div>
    </div>
  );
};
