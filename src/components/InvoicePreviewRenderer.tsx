import React from 'react';
import type { InvoiceOutputDocument } from '../types';
import type { InvoiceDesignOptions } from '../services/adminDesignEngine';
import { formatMoney } from '../services/adminDocGenerators';

interface InvoicePreviewRendererProps {
  document: InvoiceOutputDocument;
  onChange: (doc: InvoiceOutputDocument) => void;
  options: InvoiceDesignOptions;
}

export const InvoicePreviewRenderer: React.FC<InvoicePreviewRendererProps> = ({
  document: doc,
  onChange,
  options
}) => {
  const isInvoice = doc.type === 'facture';
  const docTitle = isInvoice ? 'FACTURE' : 'DEVIS';
  const isSerif = options.fontFamily === 'serif';
  const isCompact = options.fontSize === 'compact';
  const accent = options.accentColor;

  const fontClass = isSerif ? 'font-serif' : 'font-sans';
  const textSizeClass = isCompact ? 'text-[11.5px]' : 'text-xs sm:text-sm';

  const updateEmetteur = (field: keyof typeof doc.emetteur, value: string) => {
    onChange({
      ...doc,
      emetteur: { ...doc.emetteur, [field]: value }
    });
  };

  const updateClient = (field: keyof typeof doc.client, value: string) => {
    onChange({
      ...doc,
      client: { ...doc.client, [field]: value }
    });
  };

  const updateLineDescription = (idx: number, desc: string) => {
    const updated = [...doc.lignes];
    updated[idx] = { ...updated[idx], description: desc };
    onChange({ ...doc, lignes: updated });
  };

  // ==========================================================================
  // MODÈLE 1 : SOBRE
  // En-tête simple, tableau avec fins traits horizontaux, totaux alignés à droite
  // ==========================================================================
  if (options.templateId === 'sobre') {
    return (
      <div
        className={`bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl p-6 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-sm ${fontClass} ${textSizeClass} transition-all space-y-6`}
      >
        {/* En-tête simple avec logo facultatif */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-4">
            {options.logoUrl && (
              <img
                src={options.logoUrl}
                alt="Logo entreprise"
                className="max-h-14 max-w-28 object-contain rounded-md"
              />
            )}
            <div>
              <span className="text-2xl font-black uppercase tracking-wider block text-slate-900 dark:text-white">
                {docTitle}
              </span>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span>N°</span>
                <input
                  type="text"
                  value={doc.numero}
                  onChange={(e) => onChange({ ...doc, numero: e.target.value })}
                  className="font-bold text-slate-900 dark:text-white bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 px-1 py-0.5 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          <div className="sm:text-right space-y-1 text-xs">
            <div className="flex items-center sm:justify-end gap-1.5">
              <span className="text-slate-500">Date d'émission :</span>
              <input
                type="text"
                value={doc.date}
                onChange={(e) => onChange({ ...doc, date: e.target.value })}
                className="font-bold text-slate-800 dark:text-slate-200 bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 px-1 py-0.5 sm:text-right focus:outline-hidden"
              />
            </div>
            {isInvoice && (
              <div className="flex items-center sm:justify-end gap-1.5">
                <span className="text-slate-500">Date d'échéance :</span>
                <input
                  type="text"
                  value={doc.echeance || ''}
                  placeholder="Paiement à réception"
                  onChange={(e) => onChange({ ...doc, echeance: e.target.value })}
                  className="font-bold text-slate-800 dark:text-slate-200 bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 px-1 py-0.5 sm:text-right focus:outline-hidden"
                />
              </div>
            )}
            {!isInvoice && (
              <div className="flex items-center sm:justify-end gap-1.5">
                <span className="text-slate-500">Validité :</span>
                <input
                  type="text"
                  value={doc.validite || ''}
                  placeholder="30 jours"
                  onChange={(e) => onChange({ ...doc, validite: e.target.value })}
                  className="font-bold text-slate-800 dark:text-slate-200 bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 px-1 py-0.5 sm:text-right focus:outline-hidden"
                />
              </div>
            )}
          </div>
        </div>

        {/* Émetteur (gauche) & Client (droite) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              Émetteur
            </span>
            <input
              type="text"
              value={doc.emetteur?.nom || ''}
              onChange={(e) => updateEmetteur('nom', e.target.value)}
              className="font-bold text-sm text-slate-900 dark:text-white bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 w-full py-0.5 focus:outline-hidden"
            />
            <input
              type="text"
              value={doc.emetteur?.adresse || ''}
              placeholder="Adresse"
              onChange={(e) => updateEmetteur('adresse', e.target.value)}
              className="text-xs text-slate-600 dark:text-slate-400 bg-transparent border-b border-dashed border-slate-200 dark:border-slate-800 w-full py-0.5 focus:outline-hidden"
            />
            <input
              type="text"
              value={doc.emetteur?.telephone || ''}
              placeholder="Téléphone"
              onChange={(e) => updateEmetteur('telephone', e.target.value)}
              className="text-xs text-slate-600 dark:text-slate-400 bg-transparent border-b border-dashed border-slate-200 dark:border-slate-800 w-full py-0.5 focus:outline-hidden"
            />
            <input
              type="text"
              value={doc.emetteur?.email || ''}
              placeholder="Email"
              onChange={(e) => updateEmetteur('email', e.target.value)}
              className="text-xs text-slate-600 dark:text-slate-400 bg-transparent border-b border-dashed border-slate-200 dark:border-slate-800 w-full py-0.5 focus:outline-hidden"
            />
            <input
              type="text"
              value={doc.emetteur?.identifiant_fiscal || ''}
              placeholder="Réf. fiscale / NIF"
              onChange={(e) => updateEmetteur('identifiant_fiscal', e.target.value)}
              className="text-[11px] text-slate-400 bg-transparent border-b border-dashed border-slate-200 dark:border-slate-800 w-full py-0.5 focus:outline-hidden"
            />
          </div>

          <div className="space-y-1 sm:text-right sm:pl-4">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              Client
            </span>
            <input
              type="text"
              value={doc.client?.nom || ''}
              onChange={(e) => updateClient('nom', e.target.value)}
              className="font-bold text-sm text-slate-900 dark:text-white bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 w-full py-0.5 sm:text-right focus:outline-hidden"
            />
            <input
              type="text"
              value={doc.client?.adresse || ''}
              placeholder="Adresse"
              onChange={(e) => updateClient('adresse', e.target.value)}
              className="text-xs text-slate-600 dark:text-slate-400 bg-transparent border-b border-dashed border-slate-200 dark:border-slate-800 w-full py-0.5 sm:text-right focus:outline-hidden"
            />
            <input
              type="text"
              value={doc.client?.telephone || ''}
              placeholder="Téléphone"
              onChange={(e) => updateClient('telephone', e.target.value)}
              className="text-xs text-slate-600 dark:text-slate-400 bg-transparent border-b border-dashed border-slate-200 dark:border-slate-800 w-full py-0.5 sm:text-right focus:outline-hidden"
            />
            <input
              type="text"
              value={doc.client?.email || ''}
              placeholder="Email"
              onChange={(e) => updateClient('email', e.target.value)}
              className="text-xs text-slate-600 dark:text-slate-400 bg-transparent border-b border-dashed border-slate-200 dark:border-slate-800 w-full py-0.5 sm:text-right focus:outline-hidden"
            />
            <input
              type="text"
              value={doc.client?.identifiant_fiscal || ''}
              placeholder="Réf. fiscale client"
              onChange={(e) => updateClient('identifiant_fiscal', e.target.value)}
              className="text-[11px] text-slate-400 bg-transparent border-b border-dashed border-slate-200 dark:border-slate-800 w-full py-0.5 sm:text-right focus:outline-hidden"
            />
          </div>
        </div>

        {/* Tableau avec fins traits horizontaux */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-300 dark:border-slate-700 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                <th className="py-2.5 px-2">Description</th>
                <th className="py-2.5 px-2 text-center w-16">Qté</th>
                <th className="py-2.5 px-2 text-right w-24">Prix unitaire</th>
                <th className="py-2.5 px-2 text-center w-20">Remise</th>
                <th className="py-2.5 px-2 text-right w-28">Total HT</th>
              </tr>
            </thead>
            <tbody>
              {doc.lignes.map((l, idx) => (
                <tr key={idx} className="border-b border-slate-100 dark:border-slate-800/80">
                  <td className="py-2.5 px-2">
                    <input
                      type="text"
                      value={l.description}
                      onChange={(e) => updateLineDescription(idx, e.target.value)}
                      className="w-full bg-transparent border-b border-dashed border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-hidden font-medium"
                    />
                  </td>
                  <td className="py-2.5 px-2 text-center text-slate-600 dark:text-slate-300 font-mono">
                    {l.quantite}
                  </td>
                  <td className="py-2.5 px-2 text-right text-slate-600 dark:text-slate-300 font-mono">
                    {formatMoney(l.prix_unitaire, doc.devise)}
                  </td>
                  <td className="py-2.5 px-2 text-center text-slate-400 font-mono">
                    {l.remise_pct && l.remise_pct > 0 ? `${l.remise_pct}%` : '-'}
                  </td>
                  <td className="py-2.5 px-2 text-right font-bold text-slate-900 dark:text-white font-mono">
                    {formatMoney(l.total_ht, doc.devise)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totaux alignés à droite */}
        <div className="flex justify-end pt-2">
          <div className="w-full sm:w-72 space-y-2 border-t border-slate-200 dark:border-slate-800 pt-3 text-xs">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Sous-total HT :</span>
              <span className="font-bold text-slate-900 dark:text-white font-mono">
                {formatMoney(doc.sous_total_ht, doc.devise)}
              </span>
            </div>

            {Boolean(doc.remise_globale && doc.remise_globale > 0) && (
              <div className="flex justify-between text-rose-600">
                <span>Remise globale ({doc.remise_globale_pct ?? 0}%) :</span>
                <span className="font-bold font-mono">- {formatMoney(doc.remise_globale, doc.devise)}</span>
              </div>
            )}

            {Boolean(doc.tva_montant && doc.tva_montant > 0) && (
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>TVA ({doc.tva_taux ?? 0}%) :</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  {formatMoney(doc.tva_montant, doc.devise)}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold">
              <span className="uppercase text-xs sm:text-sm">TOTAL TTC :</span>
              <span className="text-base sm:text-lg font-black font-mono">
                {formatMoney(doc.total_ttc, doc.devise)}
              </span>
            </div>

            {isInvoice && Boolean(doc.acompte && doc.acompte > 0) && (
              <>
                <div className="flex justify-between text-emerald-600">
                  <span>Acompte déjà versé :</span>
                  <span className="font-bold font-mono">- {formatMoney(doc.acompte, doc.devise)}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
                  <span className="font-black uppercase text-xs">RESTE À PAYER :</span>
                  <span className="font-black text-sm font-mono">
                    {formatMoney(doc.reste_a_payer, doc.devise)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Mentions & Conditions */}
        <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              Conditions de règlement
            </span>
            <textarea
              rows={2}
              value={doc.conditions_paiement || ''}
              onChange={(e) => onChange({ ...doc, conditions_paiement: e.target.value })}
              className="w-full bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 focus:outline-hidden focus:border-blue-500"
            />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              Mentions légales & fiscales
            </span>
            <textarea
              rows={2}
              value={doc.mentions || ''}
              onChange={(e) => onChange({ ...doc, mentions: e.target.value })}
              className="w-full bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 focus:outline-hidden focus:border-blue-500"
            />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              Notes
            </span>
            <input
              type="text"
              value={doc.notes || ''}
              onChange={(e) => onChange({ ...doc, notes: e.target.value })}
              className="w-full bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 focus:outline-hidden focus:border-blue-500"
            />
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // MODÈLE 2 : COLORÉ
  // En-tête et titres de colonnes du tableau dans la couleur d'accent, lignes alternées gris clair
  // ==========================================================================
  if (options.templateId === 'colore') {
    return (
      <div
        className={`bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl p-6 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-sm ${fontClass} ${textSizeClass} transition-all space-y-6`}
      >
        {/* En-tête avec couleur d'accent */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-4">
            {options.logoUrl && (
              <img
                src={options.logoUrl}
                alt="Logo entreprise"
                className="max-h-16 max-w-28 object-contain rounded-md"
              />
            )}
            <div>
              <span className="text-3xl font-black uppercase tracking-wider block" style={{ color: accent }}>
                {docTitle}
              </span>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="font-bold">N°</span>
                <input
                  type="text"
                  value={doc.numero}
                  onChange={(e) => onChange({ ...doc, numero: e.target.value })}
                  className="font-bold text-slate-900 dark:text-white bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 px-1 py-0.5 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          <div className="sm:text-right space-y-1 text-xs">
            <div className="flex items-center sm:justify-end gap-1.5">
              <span className="text-slate-500">Date d'émission :</span>
              <input
                type="text"
                value={doc.date}
                onChange={(e) => onChange({ ...doc, date: e.target.value })}
                className="font-bold text-slate-800 dark:text-slate-200 bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 px-1 py-0.5 sm:text-right focus:outline-hidden"
              />
            </div>
            {isInvoice ? (
              <div className="flex items-center sm:justify-end gap-1.5">
                <span className="text-slate-500">Échéance :</span>
                <input
                  type="text"
                  value={doc.echeance || ''}
                  placeholder="Paiement à réception"
                  onChange={(e) => onChange({ ...doc, echeance: e.target.value })}
                  className="font-bold bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 px-1 py-0.5 sm:text-right focus:outline-hidden"
                  style={{ color: accent }}
                />
              </div>
            ) : (
              <div className="flex items-center sm:justify-end gap-1.5">
                <span className="text-slate-500">Validité :</span>
                <input
                  type="text"
                  value={doc.validite || ''}
                  placeholder="30 jours"
                  onChange={(e) => onChange({ ...doc, validite: e.target.value })}
                  className="font-bold bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 px-1 py-0.5 sm:text-right focus:outline-hidden"
                  style={{ color: accent }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Émetteur & Client */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-2">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border-l-4 space-y-1" style={{ borderColor: accent }}>
            <span className="text-[10px] uppercase font-bold tracking-wider block" style={{ color: accent }}>
              Émetteur
            </span>
            <input
              type="text"
              value={doc.emetteur?.nom || ''}
              onChange={(e) => updateEmetteur('nom', e.target.value)}
              className="font-bold text-sm text-slate-900 dark:text-white bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 w-full py-0.5 focus:outline-hidden"
            />
            <input
              type="text"
              value={doc.emetteur?.adresse || ''}
              placeholder="Adresse"
              onChange={(e) => updateEmetteur('adresse', e.target.value)}
              className="text-xs text-slate-600 dark:text-slate-400 bg-transparent border-b border-dashed border-slate-200 dark:border-slate-800 w-full py-0.5 focus:outline-hidden"
            />
            <input
              type="text"
              value={doc.emetteur?.telephone || ''}
              placeholder="Téléphone"
              onChange={(e) => updateEmetteur('telephone', e.target.value)}
              className="text-xs text-slate-600 dark:text-slate-400 bg-transparent border-b border-dashed border-slate-200 dark:border-slate-800 w-full py-0.5 focus:outline-hidden"
            />
            <input
              type="text"
              value={doc.emetteur?.email || ''}
              placeholder="Email"
              onChange={(e) => updateEmetteur('email', e.target.value)}
              className="text-xs text-slate-600 dark:text-slate-400 bg-transparent border-b border-dashed border-slate-200 dark:border-slate-800 w-full py-0.5 focus:outline-hidden"
            />
            <input
              type="text"
              value={doc.emetteur?.identifiant_fiscal || ''}
              placeholder="Réf. fiscale"
              onChange={(e) => updateEmetteur('identifiant_fiscal', e.target.value)}
              className="text-[11px] text-slate-400 bg-transparent border-b border-dashed border-slate-200 dark:border-slate-800 w-full py-0.5 focus:outline-hidden"
            />
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border-l-4 border-slate-300 dark:border-slate-700 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
              Client
            </span>
            <input
              type="text"
              value={doc.client?.nom || ''}
              onChange={(e) => updateClient('nom', e.target.value)}
              className="font-bold text-sm text-slate-900 dark:text-white bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 w-full py-0.5 focus:outline-hidden"
            />
            <input
              type="text"
              value={doc.client?.adresse || ''}
              placeholder="Adresse"
              onChange={(e) => updateClient('adresse', e.target.value)}
              className="text-xs text-slate-600 dark:text-slate-400 bg-transparent border-b border-dashed border-slate-200 dark:border-slate-800 w-full py-0.5 focus:outline-hidden"
            />
            <input
              type="text"
              value={doc.client?.telephone || ''}
              placeholder="Téléphone"
              onChange={(e) => updateClient('telephone', e.target.value)}
              className="text-xs text-slate-600 dark:text-slate-400 bg-transparent border-b border-dashed border-slate-200 dark:border-slate-800 w-full py-0.5 focus:outline-hidden"
            />
            <input
              type="text"
              value={doc.client?.email || ''}
              placeholder="Email"
              onChange={(e) => updateClient('email', e.target.value)}
              className="text-xs text-slate-600 dark:text-slate-400 bg-transparent border-b border-dashed border-slate-200 dark:border-slate-800 w-full py-0.5 focus:outline-hidden"
            />
            <input
              type="text"
              value={doc.client?.identifiant_fiscal || ''}
              placeholder="Réf. fiscale client"
              onChange={(e) => updateClient('identifiant_fiscal', e.target.value)}
              className="text-[11px] text-slate-400 bg-transparent border-b border-dashed border-slate-200 dark:border-slate-800 w-full py-0.5 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Tableau avec en-tête coloré et lignes alternées en gris très clair */}
        <div className="overflow-x-auto rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr style={{ backgroundColor: accent }} className="text-white text-[11px] uppercase tracking-wider font-bold">
                <th className="py-3 px-3">Description</th>
                <th className="py-3 px-2 text-center w-16">Qté</th>
                <th className="py-3 px-2 text-right w-24">P.U.</th>
                <th className="py-3 px-2 text-center w-20">Remise</th>
                <th className="py-3 px-3 text-right w-28">Total HT</th>
              </tr>
            </thead>
            <tbody>
              {doc.lignes.map((l, idx) => {
                const isEven = idx % 2 === 0;
                return (
                  <tr
                    key={idx}
                    className={isEven ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/80 dark:bg-slate-800/40'}
                  >
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={l.description}
                        onChange={(e) => updateLineDescription(idx, e.target.value)}
                        className="w-full bg-transparent border-b border-dashed border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-hidden font-medium"
                      />
                    </td>
                    <td className="py-2.5 px-2 text-center text-slate-600 dark:text-slate-300 font-mono">
                      {l.quantite}
                    </td>
                    <td className="py-2.5 px-2 text-right text-slate-600 dark:text-slate-300 font-mono">
                      {formatMoney(l.prix_unitaire, doc.devise)}
                    </td>
                    <td className="py-2.5 px-2 text-center text-slate-400 font-mono">
                      {l.remise_pct && l.remise_pct > 0 ? `${l.remise_pct}%` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white font-mono">
                      {formatMoney(l.total_ht, doc.devise)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totaux */}
        <div className="flex justify-end pt-2">
          <div className="w-full sm:w-72 space-y-2 border-t border-slate-200 dark:border-slate-800 pt-3 text-xs">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Sous-total HT :</span>
              <span className="font-bold text-slate-900 dark:text-white font-mono">
                {formatMoney(doc.sous_total_ht, doc.devise)}
              </span>
            </div>

            {Boolean(doc.remise_globale && doc.remise_globale > 0) && (
              <div className="flex justify-between text-rose-600">
                <span>Remise globale ({doc.remise_globale_pct ?? 0}%) :</span>
                <span className="font-bold font-mono">- {formatMoney(doc.remise_globale, doc.devise)}</span>
              </div>
            )}

            {Boolean(doc.tva_montant && doc.tva_montant > 0) && (
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>TVA ({doc.tva_taux ?? 0}%) :</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  {formatMoney(doc.tva_montant, doc.devise)}
                </span>
              </div>
            )}

            <div
              className="flex justify-between items-center p-3 rounded-xl text-white font-bold"
              style={{ backgroundColor: accent }}
            >
              <span className="uppercase text-xs sm:text-sm">TOTAL TTC :</span>
              <span className="text-base sm:text-lg font-black font-mono">
                {formatMoney(doc.total_ttc, doc.devise)}
              </span>
            </div>

            {isInvoice && Boolean(doc.acompte && doc.acompte > 0) && (
              <>
                <div className="flex justify-between text-emerald-600 pt-1">
                  <span>Acompte déjà versé :</span>
                  <span className="font-bold font-mono">- {formatMoney(doc.acompte, doc.devise)}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
                  <span className="font-black uppercase text-xs">RESTE À PAYER :</span>
                  <span className="font-black text-sm font-mono">
                    {formatMoney(doc.reste_a_payer, doc.devise)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Mentions & Conditions */}
        <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              Conditions de règlement
            </span>
            <textarea
              rows={2}
              value={doc.conditions_paiement || ''}
              onChange={(e) => onChange({ ...doc, conditions_paiement: e.target.value })}
              className="w-full bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 focus:outline-hidden"
            />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              Mentions légales & fiscales
            </span>
            <textarea
              rows={2}
              value={doc.mentions || ''}
              onChange={(e) => onChange({ ...doc, mentions: e.target.value })}
              className="w-full bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 focus:outline-hidden"
            />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              Notes
            </span>
            <input
              type="text"
              value={doc.notes || ''}
              onChange={(e) => onChange({ ...doc, notes: e.target.value })}
              className="w-full bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 focus:outline-hidden"
            />
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // MODÈLE 3 : BANDEAU
  // Grand bandeau coloré avec le mot DEVIS ou FACTURE et le numéro, blocs émetteur et client côte à côte
  // ==========================================================================
  if (options.templateId === 'bandeau') {
    return (
      <div
        className={`bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm ${fontClass} ${textSizeClass} transition-all`}
      >
        {/* Grand bandeau coloré */}
        <div className="p-6 sm:p-8 text-white relative" style={{ backgroundColor: accent }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {options.logoUrl && (
                <div className="p-2 bg-white/10 rounded-xl backdrop-blur-xs">
                  <img
                    src={options.logoUrl}
                    alt="Logo entreprise"
                    className="max-h-16 max-w-28 object-contain"
                  />
                </div>
              )}
              <div>
                <span className="text-3xl sm:text-4xl font-black uppercase tracking-wider block drop-shadow-xs">
                  {docTitle}
                </span>
                <div className="flex items-center gap-2 text-sm text-white/90 font-medium">
                  <span>Numéro de référence :</span>
                  <input
                    type="text"
                    value={doc.numero}
                    onChange={(e) => onChange({ ...doc, numero: e.target.value })}
                    className="font-bold text-white bg-transparent border-b border-white/40 focus:border-white focus:outline-hidden px-1"
                  />
                </div>
              </div>
            </div>

            <div className="sm:text-right space-y-1 text-xs text-white/90">
              <div className="flex items-center sm:justify-end gap-1.5">
                <span className="text-white/80">Date :</span>
                <input
                  type="text"
                  value={doc.date}
                  onChange={(e) => onChange({ ...doc, date: e.target.value })}
                  className="font-bold text-white bg-transparent border-b border-white/40 focus:border-white focus:outline-hidden px-1 sm:text-right"
                />
              </div>
              {isInvoice ? (
                <div className="flex items-center sm:justify-end gap-1.5">
                  <span className="text-white/80">Échéance :</span>
                  <input
                    type="text"
                    value={doc.echeance || ''}
                    placeholder="Paiement à réception"
                    onChange={(e) => onChange({ ...doc, echeance: e.target.value })}
                    className="font-bold text-white bg-transparent border-b border-white/40 focus:border-white focus:outline-hidden px-1 sm:text-right"
                  />
                </div>
              ) : (
                <div className="flex items-center sm:justify-end gap-1.5">
                  <span className="text-white/80">Validité :</span>
                  <input
                    type="text"
                    value={doc.validite || ''}
                    placeholder="30 jours"
                    onChange={(e) => onChange({ ...doc, validite: e.target.value })}
                    className="font-bold text-white bg-transparent border-b border-white/40 focus:border-white focus:outline-hidden px-1 sm:text-right"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Corps du document */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Blocs émetteur et client côte à côte */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider block" style={{ color: accent }}>
                Émis par
              </span>
              <input
                type="text"
                value={doc.emetteur?.nom || ''}
                onChange={(e) => updateEmetteur('nom', e.target.value)}
                className="font-bold text-sm text-slate-900 dark:text-white bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 w-full py-0.5 focus:outline-hidden"
              />
              <input
                type="text"
                value={doc.emetteur?.adresse || ''}
                placeholder="Adresse"
                onChange={(e) => updateEmetteur('adresse', e.target.value)}
                className="text-xs text-slate-600 dark:text-slate-400 bg-transparent border-b border-dashed border-slate-200 dark:border-slate-800 w-full py-0.5 focus:outline-hidden"
              />
              <input
                type="text"
                value={doc.emetteur?.telephone || ''}
                placeholder="Téléphone"
                onChange={(e) => updateEmetteur('telephone', e.target.value)}
                className="text-xs text-slate-600 dark:text-slate-400 bg-transparent border-b border-dashed border-slate-200 dark:border-slate-800 w-full py-0.5 focus:outline-hidden"
              />
              <input
                type="text"
                value={doc.emetteur?.email || ''}
                placeholder="Email"
                onChange={(e) => updateEmetteur('email', e.target.value)}
                className="text-xs text-slate-600 dark:text-slate-400 bg-transparent border-b border-dashed border-slate-200 dark:border-slate-800 w-full py-0.5 focus:outline-hidden"
              />
              <input
                type="text"
                value={doc.emetteur?.identifiant_fiscal || ''}
                placeholder="NIF / Réf. fiscale"
                onChange={(e) => updateEmetteur('identifiant_fiscal', e.target.value)}
                className="text-[11px] text-slate-400 bg-transparent border-b border-dashed border-slate-200 dark:border-slate-800 w-full py-0.5 focus:outline-hidden"
              />
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                Facturé à
              </span>
              <input
                type="text"
                value={doc.client?.nom || ''}
                onChange={(e) => updateClient('nom', e.target.value)}
                className="font-bold text-sm text-slate-900 dark:text-white bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 w-full py-0.5 focus:outline-hidden"
              />
              <input
                type="text"
                value={doc.client?.adresse || ''}
                placeholder="Adresse"
                onChange={(e) => updateClient('adresse', e.target.value)}
                className="text-xs text-slate-600 dark:text-slate-400 bg-transparent border-b border-dashed border-slate-200 dark:border-slate-800 w-full py-0.5 focus:outline-hidden"
              />
              <input
                type="text"
                value={doc.client?.telephone || ''}
                placeholder="Téléphone"
                onChange={(e) => updateClient('telephone', e.target.value)}
                className="text-xs text-slate-600 dark:text-slate-400 bg-transparent border-b border-dashed border-slate-200 dark:border-slate-800 w-full py-0.5 focus:outline-hidden"
              />
              <input
                type="text"
                value={doc.client?.email || ''}
                placeholder="Email"
                onChange={(e) => updateClient('email', e.target.value)}
                className="text-xs text-slate-600 dark:text-slate-400 bg-transparent border-b border-dashed border-slate-200 dark:border-slate-800 w-full py-0.5 focus:outline-hidden"
              />
              <input
                type="text"
                value={doc.client?.identifiant_fiscal || ''}
                placeholder="Réf. fiscale client"
                onChange={(e) => updateClient('identifiant_fiscal', e.target.value)}
                className="text-[11px] text-slate-400 bg-transparent border-b border-dashed border-slate-200 dark:border-slate-800 w-full py-0.5 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Tableau */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] uppercase tracking-wider font-bold">
                  <th className="py-3 px-3">Description</th>
                  <th className="py-3 px-2 text-center w-16">Qté</th>
                  <th className="py-3 px-2 text-right w-24">P.U.</th>
                  <th className="py-3 px-2 text-center w-20">Remise</th>
                  <th className="py-3 px-3 text-right w-28">Total HT</th>
                </tr>
              </thead>
              <tbody>
                {doc.lignes.map((l, idx) => (
                  <tr key={idx} className="border-b border-slate-100 dark:border-slate-800/80">
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={l.description}
                        onChange={(e) => updateLineDescription(idx, e.target.value)}
                        className="w-full bg-transparent border-b border-dashed border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-hidden font-medium"
                      />
                    </td>
                    <td className="py-2.5 px-2 text-center text-slate-600 dark:text-slate-300 font-mono">
                      {l.quantite}
                    </td>
                    <td className="py-2.5 px-2 text-right text-slate-600 dark:text-slate-300 font-mono">
                      {formatMoney(l.prix_unitaire, doc.devise)}
                    </td>
                    <td className="py-2.5 px-2 text-center text-slate-400 font-mono">
                      {l.remise_pct && l.remise_pct > 0 ? `${l.remise_pct}%` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white font-mono">
                      {formatMoney(l.total_ht, doc.devise)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totaux */}
          <div className="flex justify-end pt-2">
            <div className="w-full sm:w-72 space-y-2 border-t border-slate-200 dark:border-slate-800 pt-3 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Sous-total HT :</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  {formatMoney(doc.sous_total_ht, doc.devise)}
                </span>
              </div>

              {Boolean(doc.remise_globale && doc.remise_globale > 0) && (
                <div className="flex justify-between text-rose-600">
                  <span>Remise globale ({doc.remise_globale_pct ?? 0}%) :</span>
                  <span className="font-bold font-mono">- {formatMoney(doc.remise_globale, doc.devise)}</span>
                </div>
              )}

              {Boolean(doc.tva_montant && doc.tva_montant > 0) && (
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>TVA ({doc.tva_taux ?? 0}%) :</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">
                    {formatMoney(doc.tva_montant, doc.devise)}
                  </span>
                </div>
              )}

              <div
                className="flex justify-between items-center p-3 rounded-xl text-white font-bold"
                style={{ backgroundColor: accent }}
              >
                <span className="uppercase text-xs sm:text-sm">TOTAL TTC :</span>
                <span className="text-base sm:text-lg font-black font-mono">
                  {formatMoney(doc.total_ttc, doc.devise)}
                </span>
              </div>

              {isInvoice && Boolean(doc.acompte && doc.acompte > 0) && (
                <>
                  <div className="flex justify-between text-emerald-600 pt-1">
                    <span>Acompte déjà versé :</span>
                    <span className="font-bold font-mono">- {formatMoney(doc.acompte, doc.devise)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
                    <span className="font-black uppercase text-xs">RESTE À PAYER :</span>
                    <span className="font-black text-sm font-mono">
                      {formatMoney(doc.reste_a_payer, doc.devise)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Mentions & Conditions */}
          <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Conditions de règlement
              </span>
              <textarea
                rows={2}
                value={doc.conditions_paiement || ''}
                onChange={(e) => onChange({ ...doc, conditions_paiement: e.target.value })}
                className="w-full bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 focus:outline-hidden"
              />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Mentions légales & fiscales
              </span>
              <textarea
                rows={2}
                value={doc.mentions || ''}
                onChange={(e) => onChange({ ...doc, mentions: e.target.value })}
                className="w-full bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 focus:outline-hidden"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // MODÈLE 4 : MINIMAL
  // Très aéré, typographie légère, totaux dans un encadré discret
  // ==========================================================================
  return (
    <div
      className={`bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl p-6 sm:p-12 border border-slate-200 dark:border-slate-800 shadow-sm ${fontClass} ${textSizeClass} transition-all space-y-8`}
    >
      {/* En-tête très aéré */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
        <div className="space-y-2">
          {options.logoUrl && (
            <img
              src={options.logoUrl}
              alt="Logo entreprise"
              className="max-h-12 max-w-28 object-contain mb-2"
            />
          )}
          <span className="text-xl sm:text-2xl font-light uppercase tracking-widest text-slate-800 dark:text-slate-200 block">
            {docTitle}
          </span>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Réf.</span>
            <input
              type="text"
              value={doc.numero}
              onChange={(e) => onChange({ ...doc, numero: e.target.value })}
              className="font-medium text-slate-700 dark:text-slate-300 bg-transparent border-b border-dashed border-slate-200 dark:border-slate-700 px-1 focus:outline-hidden"
            />
          </div>
        </div>

        <div className="sm:text-right space-y-1 text-xs text-slate-500">
          <div>
            <span>Date : </span>
            <input
              type="text"
              value={doc.date}
              onChange={(e) => onChange({ ...doc, date: e.target.value })}
              className="font-medium text-slate-800 dark:text-slate-200 bg-transparent border-b border-dashed border-slate-200 dark:border-slate-700 px-1 sm:text-right focus:outline-hidden"
            />
          </div>
          {isInvoice ? (
            <div>
              <span>Échéance : </span>
              <input
                type="text"
                value={doc.echeance || ''}
                placeholder="À réception"
                onChange={(e) => onChange({ ...doc, echeance: e.target.value })}
                className="font-medium text-slate-800 dark:text-slate-200 bg-transparent border-b border-dashed border-slate-200 dark:border-slate-700 px-1 sm:text-right focus:outline-hidden"
              />
            </div>
          ) : (
            <div>
              <span>Validité : </span>
              <input
                type="text"
                value={doc.validite || ''}
                placeholder="30 jours"
                onChange={(e) => onChange({ ...doc, validite: e.target.value })}
                className="font-medium text-slate-800 dark:text-slate-200 bg-transparent border-b border-dashed border-slate-200 dark:border-slate-700 px-1 sm:text-right focus:outline-hidden"
              />
            </div>
          )}
        </div>
      </div>

      {/* Trait de couleur d'accent fin et discret */}
      <div className="w-16 h-0.5 rounded-full" style={{ backgroundColor: accent }} />

      {/* Émetteur & Client */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs">
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">
            De
          </span>
          <input
            type="text"
            value={doc.emetteur?.nom || ''}
            onChange={(e) => updateEmetteur('nom', e.target.value)}
            className="font-semibold text-slate-900 dark:text-white bg-transparent border-b border-dashed border-slate-200 dark:border-slate-700 w-full py-0.5 focus:outline-hidden"
          />
          <input
            type="text"
            value={doc.emetteur?.adresse || ''}
            placeholder="Adresse"
            onChange={(e) => updateEmetteur('adresse', e.target.value)}
            className="text-slate-500 bg-transparent border-b border-dashed border-slate-100 dark:border-slate-800 w-full py-0.5 focus:outline-hidden"
          />
          <input
            type="text"
            value={doc.emetteur?.telephone || ''}
            placeholder="Téléphone"
            onChange={(e) => updateEmetteur('telephone', e.target.value)}
            className="text-slate-500 bg-transparent border-b border-dashed border-slate-100 dark:border-slate-800 w-full py-0.5 focus:outline-hidden"
          />
          <input
            type="text"
            value={doc.emetteur?.email || ''}
            placeholder="Email"
            onChange={(e) => updateEmetteur('email', e.target.value)}
            className="text-slate-500 bg-transparent border-b border-dashed border-slate-100 dark:border-slate-800 w-full py-0.5 focus:outline-hidden"
          />
        </div>

        <div className="space-y-1 sm:text-right">
          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">
            Pour
          </span>
          <input
            type="text"
            value={doc.client?.nom || ''}
            onChange={(e) => updateClient('nom', e.target.value)}
            className="font-semibold text-slate-900 dark:text-white bg-transparent border-b border-dashed border-slate-200 dark:border-slate-700 w-full py-0.5 sm:text-right focus:outline-hidden"
          />
          <input
            type="text"
            value={doc.client?.adresse || ''}
            placeholder="Adresse"
            onChange={(e) => updateClient('adresse', e.target.value)}
            className="text-slate-500 bg-transparent border-b border-dashed border-slate-100 dark:border-slate-800 w-full py-0.5 sm:text-right focus:outline-hidden"
          />
          <input
            type="text"
            value={doc.client?.telephone || ''}
            placeholder="Téléphone"
            onChange={(e) => updateClient('telephone', e.target.value)}
            className="text-slate-500 bg-transparent border-b border-dashed border-slate-100 dark:border-slate-800 w-full py-0.5 sm:text-right focus:outline-hidden"
          />
          <input
            type="text"
            value={doc.client?.email || ''}
            placeholder="Email"
            onChange={(e) => updateClient('email', e.target.value)}
            className="text-slate-500 bg-transparent border-b border-dashed border-slate-100 dark:border-slate-800 w-full py-0.5 sm:text-right focus:outline-hidden"
          />
        </div>
      </div>

      {/* Lignes légères */}
      <div className="overflow-x-auto pt-2">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              <th className="py-2.5 px-2">Prestation</th>
              <th className="py-2.5 px-2 text-center w-16">Qté</th>
              <th className="py-2.5 px-2 text-right w-24">P.U.</th>
              <th className="py-2.5 px-2 text-center w-20">Remise</th>
              <th className="py-2.5 px-2 text-right w-28">Total</th>
            </tr>
          </thead>
          <tbody>
            {doc.lignes.map((l, idx) => (
              <tr key={idx} className="border-b border-slate-100 dark:border-slate-800/60">
                <td className="py-3 px-2">
                  <input
                    type="text"
                    value={l.description}
                    onChange={(e) => updateLineDescription(idx, e.target.value)}
                    className="w-full bg-transparent border-b border-dashed border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-hidden"
                  />
                </td>
                <td className="py-3 px-2 text-center text-slate-500 font-mono">{l.quantite}</td>
                <td className="py-3 px-2 text-right text-slate-500 font-mono">{formatMoney(l.prix_unitaire, doc.devise)}</td>
                <td className="py-3 px-2 text-center text-slate-400 font-mono">{l.remise_pct && l.remise_pct > 0 ? `${l.remise_pct}%` : '-'}</td>
                <td className="py-3 px-2 text-right font-semibold text-slate-900 dark:text-white font-mono">{formatMoney(l.total_ht, doc.devise)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totaux dans un encadré discret */}
      <div className="flex justify-end pt-2">
        <div className="w-full sm:w-72 p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
          <div className="flex justify-between text-slate-500">
            <span>Sous-total HT :</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">{formatMoney(doc.sous_total_ht, doc.devise)}</span>
          </div>

          {Boolean(doc.remise_globale && doc.remise_globale > 0) && (
            <div className="flex justify-between text-rose-600">
              <span>Remise ({doc.remise_globale_pct ?? 0}%) :</span>
              <span className="font-mono">- {formatMoney(doc.remise_globale, doc.devise)}</span>
            </div>
          )}

          {Boolean(doc.tva_montant && doc.tva_montant > 0) && (
            <div className="flex justify-between text-slate-500">
              <span>TVA ({doc.tva_taux ?? 0}%) :</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">{formatMoney(doc.tva_montant, doc.devise)}</span>
            </div>
          )}

          <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white">
            <span className="uppercase tracking-wider text-xs">Total TTC :</span>
            <span className="text-base font-black font-mono">{formatMoney(doc.total_ttc, doc.devise)}</span>
          </div>

          {isInvoice && Boolean(doc.acompte && doc.acompte > 0) && (
            <>
              <div className="flex justify-between text-emerald-600 pt-1 text-[11px]">
                <span>Acompte déjà versé :</span>
                <span className="font-mono">- {formatMoney(doc.acompte, doc.devise)}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                <span className="font-bold uppercase text-[11px]">Reste dû :</span>
                <span className="font-black text-xs font-mono">{formatMoney(doc.reste_a_payer, doc.devise)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mentions & Conditions discrètes */}
      <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
        <div>
          <span className="font-bold text-slate-600 dark:text-slate-400 block mb-0.5">Règlement :</span>
          <textarea
            rows={1}
            value={doc.conditions_paiement || ''}
            onChange={(e) => onChange({ ...doc, conditions_paiement: e.target.value })}
            className="w-full bg-transparent border-b border-dashed border-slate-200 dark:border-slate-800 focus:outline-hidden"
          />
        </div>
        <div>
          <span className="font-bold text-slate-600 dark:text-slate-400 block mb-0.5">Mentions légales :</span>
          <textarea
            rows={1}
            value={doc.mentions || ''}
            onChange={(e) => onChange({ ...doc, mentions: e.target.value })}
            className="w-full bg-transparent border-b border-dashed border-slate-200 dark:border-slate-800 focus:outline-hidden"
          />
        </div>
      </div>
    </div>
  );
};
