import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  BorderStyle,
  WidthType,
  ShadingType,
  ImageRun
} from 'docx';
import type { InvoiceOutputDocument } from '../types';
import type { InvoiceDesignOptions } from './adminDesignEngine';
import { DEFAULT_INVOICE_DESIGN_OPTIONS } from './adminDesignEngine';
import { formatMoney } from './adminDocGenerators';

// Ensure virtual file system fonts are attached for pdfMake
try {
  const vfs = (pdfFonts as any)?.pdfMake?.vfs || (pdfFonts as any)?.vfs || pdfFonts;
  (pdfMake as any).vfs = vfs;
  (pdfMake as any).fonts = {
    Roboto: {
      normal: 'Roboto-Regular.ttf',
      bold: 'Roboto-Medium.ttf',
      italics: 'Roboto-Italic.ttf',
      bolditalics: 'Roboto-MediumItalic.ttf'
    }
  };
} catch (e) {
  console.warn('pdfMake vfs initialization error:', e);
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\u00C0-\u017F-]/g, '_').replace(/_+/g, '_');
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

function resolveOptions(optionsOrStyle?: InvoiceDesignOptions | string): InvoiceDesignOptions {
  if (!optionsOrStyle) return { ...DEFAULT_INVOICE_DESIGN_OPTIONS };
  if (typeof optionsOrStyle === 'string') {
    const validId = ['sobre', 'colore', 'bandeau', 'minimal'].includes(optionsOrStyle)
      ? (optionsOrStyle as InvoiceDesignOptions['templateId'])
      : 'sobre';
    return { ...DEFAULT_INVOICE_DESIGN_OPTIONS, templateId: validId };
  }
  return {
    ...DEFAULT_INVOICE_DESIGN_OPTIONS,
    ...optionsOrStyle
  };
}

function base64ToUint8Array(dataUrl: string): Uint8Array | null {
  try {
    const base64 = dataUrl.split(',')[1] || dataUrl;
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch (e) {
    console.warn('Failed to convert base64 image:', e);
    return null;
  }
}

// ============================================================================
// DEVIS & FACTURE : EXPORT PDF (pdfmake)
// ============================================================================

export async function downloadInvoicePdf(
  invoice: InvoiceOutputDocument,
  optionsOrStyle?: InvoiceDesignOptions | string
): Promise<void> {
  const options = resolveOptions(optionsOrStyle);
  const isInvoice = invoice.type === 'facture';
  const docTitle = isInvoice ? 'FACTURE' : 'DEVIS';
  const cleanNum = sanitizeFileName(invoice.numero || (isInvoice ? 'Facture' : 'Devis'));
  const filename = `${docTitle}_${cleanNum}.pdf`;

  const accent = options.accentColor || '#2563EB';
  const content: any[] = [];
  let pageMargins: [number, number, number, number] = [36, 36, 36, 36];

  // --------------------------------------------------------------------------
  // MODÈLE 1 : SOBRE
  // En-tête simple, tableau avec fins traits horizontaux, totaux alignés à droite
  // --------------------------------------------------------------------------
  if (options.templateId === 'sobre') {
    const headerLeftCols: any[] = [];
    if (options.logoUrl) {
      headerLeftCols.push({
        image: options.logoUrl,
        width: 60,
        margin: [0, 0, 10, 0]
      });
    }
    headerLeftCols.push({
      stack: [
        { text: docTitle, fontSize: 22, bold: true, color: '#0f172a' },
        { text: `N° ${invoice.numero || ''}`, fontSize: 11, bold: true, color: '#64748b', margin: [0, 2, 0, 0] }
      ]
    });

    const headerRightStack: any[] = [
      {
        text: [
          { text: "Date d'émission : ", bold: true, color: '#64748b', fontSize: 9 },
          { text: invoice.date || '', bold: true, color: '#0f172a', fontSize: 9 }
        ],
        alignment: 'right',
        margin: [0, 0, 0, 3]
      }
    ];

    if (isInvoice && invoice.echeance) {
      headerRightStack.push({
        text: [
          { text: "Date d'échéance : ", bold: true, color: '#64748b', fontSize: 9 },
          { text: invoice.echeance, bold: true, color: '#0f172a', fontSize: 9 }
        ],
        alignment: 'right',
        margin: [0, 0, 0, 3]
      });
    } else if (!isInvoice && invoice.validite) {
      headerRightStack.push({
        text: [
          { text: "Validité : ", bold: true, color: '#64748b', fontSize: 9 },
          { text: invoice.validite, bold: true, color: '#0f172a', fontSize: 9 }
        ],
        alignment: 'right',
        margin: [0, 0, 0, 3]
      });
    }

    content.push({
      columns: [
        { columns: headerLeftCols, width: '*' },
        { stack: headerRightStack, width: 220 }
      ],
      margin: [0, 0, 0, 20]
    });

    content.push({
      canvas: [{ type: 'line', x1: 0, y1: 0, x2: 522, y2: 0, lineWidth: 1, lineColor: '#e2e8f0' }],
      margin: [0, 0, 0, 16]
    });

    // Émetteur & Client
    content.push({
      columns: [
        {
          width: '50%',
          stack: [
            { text: 'ÉMETTEUR', fontSize: 8.5, bold: true, color: '#64748b', margin: [0, 0, 0, 4] },
            { text: invoice.emetteur?.nom || '', bold: true, fontSize: 10, color: '#0f172a' },
            invoice.emetteur?.adresse ? { text: invoice.emetteur.adresse, fontSize: 8.5, color: '#475569' } : { text: '' },
            invoice.emetteur?.telephone ? { text: invoice.emetteur.telephone, fontSize: 8.5, color: '#475569' } : { text: '' },
            invoice.emetteur?.email ? { text: invoice.emetteur.email, fontSize: 8.5, color: '#475569' } : { text: '' },
            invoice.emetteur?.identifiant_fiscal ? { text: `NIF: ${invoice.emetteur.identifiant_fiscal}`, fontSize: 8, color: '#94a3b8' } : { text: '' }
          ]
        },
        {
          width: '50%',
          stack: [
            { text: 'CLIENT', fontSize: 8.5, bold: true, color: '#64748b', alignment: 'right', margin: [0, 0, 0, 4] },
            { text: invoice.client?.nom || '', bold: true, fontSize: 10, color: '#0f172a', alignment: 'right' },
            invoice.client?.adresse ? { text: invoice.client.adresse, fontSize: 8.5, color: '#475569', alignment: 'right' } : { text: '' },
            invoice.client?.telephone ? { text: invoice.client.telephone, fontSize: 8.5, color: '#475569', alignment: 'right' } : { text: '' },
            invoice.client?.email ? { text: invoice.client.email, fontSize: 8.5, color: '#475569', alignment: 'right' } : { text: '' },
            invoice.client?.identifiant_fiscal ? { text: `Réf: ${invoice.client.identifiant_fiscal}`, fontSize: 8, color: '#94a3b8', alignment: 'right' } : { text: '' }
          ]
        }
      ],
      margin: [0, 0, 0, 20]
    });

    // Tableau avec fins traits horizontaux
    const tableBody: any[][] = [
      [
        { text: 'DESCRIPTION', fontSize: 8.5, bold: true, color: '#64748b', margin: [0, 5, 0, 5] },
        { text: 'QTÉ', fontSize: 8.5, bold: true, color: '#64748b', alignment: 'center', margin: [0, 5, 0, 5] },
        { text: 'P.U.', fontSize: 8.5, bold: true, color: '#64748b', alignment: 'right', margin: [0, 5, 0, 5] },
        { text: 'REMISE', fontSize: 8.5, bold: true, color: '#64748b', alignment: 'center', margin: [0, 5, 0, 5] },
        { text: 'TOTAL HT', fontSize: 8.5, bold: true, color: '#64748b', alignment: 'right', margin: [0, 5, 0, 5] }
      ]
    ];

    invoice.lignes.forEach((l) => {
      tableBody.push([
        { text: l.description, fontSize: 9, color: '#1e293b', margin: [0, 5, 0, 5] },
        { text: String(l.quantite), fontSize: 9, alignment: 'center', color: '#475569', margin: [0, 5, 0, 5] },
        { text: formatMoney(l.prix_unitaire, invoice.devise), fontSize: 9, alignment: 'right', color: '#475569', margin: [0, 5, 0, 5] },
        { text: l.remise_pct && l.remise_pct > 0 ? `${l.remise_pct}%` : '-', fontSize: 9, alignment: 'center', color: '#94a3b8', margin: [0, 5, 0, 5] },
        { text: formatMoney(l.total_ht, invoice.devise), fontSize: 9, bold: true, alignment: 'right', color: '#0f172a', margin: [0, 5, 0, 5] }
      ]);
    });

    content.push({
      table: {
        headerRows: 1,
        widths: ['*', 45, 80, 50, 95],
        body: tableBody
      },
      layout: {
        hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5),
        vLineWidth: () => 0,
        hLineColor: (i: number) => (i === 0 || i === 1 ? '#cbd5e1' : '#f1f5f9'),
        paddingTop: () => 3,
        paddingBottom: () => 3
      },
      margin: [0, 0, 0, 16]
    });

    // Totaux alignés à droite
    const totalsRows: any[] = [
      [
        { text: 'Sous-total HT :', fontSize: 9, color: '#64748b' },
        { text: formatMoney(invoice.sous_total_ht, invoice.devise), fontSize: 9, bold: true, alignment: 'right', color: '#0f172a' }
      ]
    ];

    if (invoice.remise_globale && invoice.remise_globale > 0) {
      totalsRows.push([
        { text: `Remise globale (${invoice.remise_globale_pct ?? 0}%) :`, fontSize: 8.5, color: '#dc2626' },
        { text: `- ${formatMoney(invoice.remise_globale, invoice.devise)}`, fontSize: 8.5, bold: true, alignment: 'right', color: '#dc2626' }
      ]);
    }

    if (invoice.tva_montant && invoice.tva_montant > 0) {
      totalsRows.push([
        { text: `TVA (${invoice.tva_taux ?? 0}%) :`, fontSize: 8.5, color: '#64748b' },
        { text: formatMoney(invoice.tva_montant, invoice.devise), fontSize: 8.5, bold: true, alignment: 'right', color: '#0f172a' }
      ]);
    }

    totalsRows.push([
      { text: 'TOTAL TTC :', fontSize: 10.5, bold: true, color: '#0f172a', margin: [0, 4, 0, 0] },
      { text: formatMoney(invoice.total_ttc, invoice.devise), fontSize: 11, bold: true, alignment: 'right', color: '#0f172a', margin: [0, 4, 0, 0] }
    ]);

    if (isInvoice && invoice.acompte && invoice.acompte > 0) {
      totalsRows.push([
        { text: 'Acompte déjà versé :', fontSize: 8.5, color: '#059669' },
        { text: `- ${formatMoney(invoice.acompte, invoice.devise)}`, fontSize: 8.5, bold: true, alignment: 'right', color: '#059669' }
      ]);
      totalsRows.push([
        { text: 'RESTE À PAYER :', fontSize: 9.5, bold: true, color: '#0f172a' },
        { text: formatMoney(invoice.reste_a_payer, invoice.devise), fontSize: 10, bold: true, alignment: 'right', color: '#0f172a' }
      ]);
    }

    content.push({
      columns: [
        { width: '*', text: '' },
        {
          width: 230,
          table: {
            widths: ['*', 100],
            body: totalsRows
          },
          layout: 'noBorders'
        }
      ],
      margin: [0, 0, 0, 20]
    });
  }

  // --------------------------------------------------------------------------
  // MODÈLE 2 : COLORÉ
  // En-tête et titres de colonnes dans la couleur d'accent, lignes alternées en gris très clair
  // --------------------------------------------------------------------------
  else if (options.templateId === 'colore') {
    const headerLeftCols: any[] = [];
    if (options.logoUrl) {
      headerLeftCols.push({
        image: options.logoUrl,
        width: 65,
        margin: [0, 0, 10, 0]
      });
    }
    headerLeftCols.push({
      stack: [
        { text: docTitle, fontSize: 24, bold: true, color: accent },
        { text: `N° ${invoice.numero || ''}`, fontSize: 11, bold: true, color: '#475569', margin: [0, 2, 0, 0] }
      ]
    });

    content.push({
      columns: [
        { columns: headerLeftCols, width: '*' },
        {
          width: 220,
          stack: [
            { text: `Date d'émission : ${invoice.date || ''}`, fontSize: 9, bold: true, alignment: 'right', color: '#0f172a' },
            isInvoice && invoice.echeance
              ? { text: `Échéance : ${invoice.echeance}`, fontSize: 9, bold: true, alignment: 'right', color: accent, margin: [0, 2, 0, 0] }
              : !isInvoice && invoice.validite
              ? { text: `Validité : ${invoice.validite}`, fontSize: 9, bold: true, alignment: 'right', color: accent, margin: [0, 2, 0, 0] }
              : { text: '' }
          ]
        }
      ],
      margin: [0, 0, 0, 18]
    });

    // Blocs émetteur et client encadrés
    content.push({
      columns: [
        {
          width: '50%',
          table: {
            widths: ['*'],
            body: [
              [
                {
                  fillColor: '#f8fafc',
                  border: [true, false, false, false],
                  borderColor: [accent, '', '', ''],
                  margin: [8, 6, 8, 6],
                  stack: [
                    { text: 'ÉMETTEUR', fontSize: 8, bold: true, color: accent, margin: [0, 0, 0, 3] },
                    { text: invoice.emetteur?.nom || '', bold: true, fontSize: 9.5, color: '#0f172a' },
                    invoice.emetteur?.adresse ? { text: invoice.emetteur.adresse, fontSize: 8.5, color: '#475569' } : { text: '' },
                    invoice.emetteur?.telephone ? { text: invoice.emetteur.telephone, fontSize: 8.5, color: '#475569' } : { text: '' },
                    invoice.emetteur?.email ? { text: invoice.emetteur.email, fontSize: 8.5, color: '#475569' } : { text: '' },
                    invoice.emetteur?.identifiant_fiscal ? { text: `NIF: ${invoice.emetteur.identifiant_fiscal}`, fontSize: 8, color: '#94a3b8' } : { text: '' }
                  ]
                }
              ]
            ]
          },
          layout: 'noBorders'
        },
        {
          width: '50%',
          table: {
            widths: ['*'],
            body: [
              [
                {
                  fillColor: '#f8fafc',
                  border: [true, false, false, false],
                  borderColor: ['#cbd5e1', '', '', ''],
                  margin: [8, 6, 8, 6],
                  stack: [
                    { text: 'CLIENT', fontSize: 8, bold: true, color: '#64748b', margin: [0, 0, 0, 3] },
                    { text: invoice.client?.nom || '', bold: true, fontSize: 9.5, color: '#0f172a' },
                    invoice.client?.adresse ? { text: invoice.client.adresse, fontSize: 8.5, color: '#475569' } : { text: '' },
                    invoice.client?.telephone ? { text: invoice.client.telephone, fontSize: 8.5, color: '#475569' } : { text: '' },
                    invoice.client?.email ? { text: invoice.client.email, fontSize: 8.5, color: '#475569' } : { text: '' },
                    invoice.client?.identifiant_fiscal ? { text: `Réf: ${invoice.client.identifiant_fiscal}`, fontSize: 8, color: '#94a3b8' } : { text: '' }
                  ]
                }
              ]
            ]
          },
          layout: 'noBorders',
          margin: [10, 0, 0, 0]
        }
      ],
      margin: [0, 0, 0, 18]
    });

    // Tableau coloré avec lignes alternées
    const tableBody: any[][] = [
      [
        { text: 'DESCRIPTION', fontSize: 8.5, bold: true, color: '#ffffff', fillColor: accent, margin: [4, 5, 4, 5] },
        { text: 'QTÉ', fontSize: 8.5, bold: true, color: '#ffffff', fillColor: accent, alignment: 'center', margin: [0, 5, 0, 5] },
        { text: 'P.U.', fontSize: 8.5, bold: true, color: '#ffffff', fillColor: accent, alignment: 'right', margin: [0, 5, 0, 5] },
        { text: 'REMISE', fontSize: 8.5, bold: true, color: '#ffffff', fillColor: accent, alignment: 'center', margin: [0, 5, 0, 5] },
        { text: 'TOTAL HT', fontSize: 8.5, bold: true, color: '#ffffff', fillColor: accent, alignment: 'right', margin: [4, 5, 4, 5] }
      ]
    ];

    invoice.lignes.forEach((l, idx) => {
      const rowBg = idx % 2 === 1 ? '#f8fafc' : '#ffffff';
      tableBody.push([
        { text: l.description, fontSize: 9, color: '#1e293b', fillColor: rowBg, margin: [4, 5, 4, 5] },
        { text: String(l.quantite), fontSize: 9, alignment: 'center', color: '#475569', fillColor: rowBg, margin: [0, 5, 0, 5] },
        { text: formatMoney(l.prix_unitaire, invoice.devise), fontSize: 9, alignment: 'right', color: '#475569', fillColor: rowBg, margin: [0, 5, 0, 5] },
        { text: l.remise_pct && l.remise_pct > 0 ? `${l.remise_pct}%` : '-', fontSize: 9, alignment: 'center', color: '#94a3b8', fillColor: rowBg, margin: [0, 5, 0, 5] },
        { text: formatMoney(l.total_ht, invoice.devise), fontSize: 9, bold: true, alignment: 'right', color: '#0f172a', fillColor: rowBg, margin: [4, 5, 4, 5] }
      ]);
    });

    content.push({
      table: {
        headerRows: 1,
        widths: ['*', 45, 80, 50, 95],
        body: tableBody
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0,
        hLineColor: () => '#e2e8f0',
        paddingTop: () => 2,
        paddingBottom: () => 2
      },
      margin: [0, 0, 0, 16]
    });

    // Totaux avec boîte Total TTC teintée
    const totalsRows: any[] = [
      [
        { text: 'Sous-total HT :', fontSize: 9, color: '#64748b' },
        { text: formatMoney(invoice.sous_total_ht, invoice.devise), fontSize: 9, bold: true, alignment: 'right', color: '#0f172a' }
      ]
    ];

    if (invoice.remise_globale && invoice.remise_globale > 0) {
      totalsRows.push([
        { text: `Remise globale (${invoice.remise_globale_pct ?? 0}%) :`, fontSize: 8.5, color: '#dc2626' },
        { text: `- ${formatMoney(invoice.remise_globale, invoice.devise)}`, fontSize: 8.5, bold: true, alignment: 'right', color: '#dc2626' }
      ]);
    }

    if (invoice.tva_montant && invoice.tva_montant > 0) {
      totalsRows.push([
        { text: `TVA (${invoice.tva_taux ?? 0}%) :`, fontSize: 8.5, color: '#64748b' },
        { text: formatMoney(invoice.tva_montant, invoice.devise), fontSize: 8.5, bold: true, alignment: 'right', color: '#0f172a' }
      ]);
    }

    totalsRows.push([
      { text: 'TOTAL TTC :', fontSize: 10.5, bold: true, color: '#ffffff', fillColor: accent, margin: [6, 4, 6, 4] },
      { text: formatMoney(invoice.total_ttc, invoice.devise), fontSize: 11, bold: true, alignment: 'right', color: '#ffffff', fillColor: accent, margin: [6, 4, 6, 4] }
    ]);

    content.push({
      columns: [
        { width: '*', text: '' },
        {
          width: 230,
          table: {
            widths: ['*', 105],
            body: totalsRows
          },
          layout: 'noBorders'
        }
      ],
      margin: [0, 0, 0, 20]
    });
  }

  // --------------------------------------------------------------------------
  // MODÈLE 3 : BANDEAU
  // Grand bandeau coloré supérieur avec DEVIS/FACTURE et N°, blocs émetteur & client côte à côte
  // --------------------------------------------------------------------------
  else if (options.templateId === 'bandeau') {
    pageMargins = [36, 36, 36, 36];

    const bannerLeftCols: any[] = [];
    if (options.logoUrl) {
      bannerLeftCols.push({
        image: options.logoUrl,
        width: 60,
        margin: [0, 0, 10, 0]
      });
    }
    bannerLeftCols.push({
      stack: [
        { text: docTitle, fontSize: 24, bold: true, color: '#ffffff' },
        { text: `N° ${invoice.numero || ''}`, fontSize: 11, bold: true, color: '#ffffff', margin: [0, 2, 0, 0] }
      ]
    });

    content.push({
      table: {
        widths: ['*'],
        body: [
          [
            {
              fillColor: accent,
              border: [false, false, false, false],
              margin: [16, 14, 16, 14],
              columns: [
                { columns: bannerLeftCols, width: '*' },
                {
                  width: 200,
                  stack: [
                    { text: `Date : ${invoice.date || ''}`, fontSize: 9.5, color: '#ffffff', alignment: 'right' },
                    isInvoice && invoice.echeance
                      ? { text: `Échéance : ${invoice.echeance}`, fontSize: 9.5, bold: true, color: '#ffffff', alignment: 'right', margin: [0, 2, 0, 0] }
                      : !isInvoice && invoice.validite
                      ? { text: `Validité : ${invoice.validite}`, fontSize: 9.5, bold: true, color: '#ffffff', alignment: 'right', margin: [0, 2, 0, 0] }
                      : { text: '' }
                  ]
                }
              ]
            }
          ]
        ]
      },
      layout: 'noBorders',
      margin: [-36, -36, -36, 20]
    });

    // Blocs émetteur et client côte à côte
    content.push({
      columns: [
        {
          width: '50%',
          stack: [
            { text: 'ÉMIS PAR', fontSize: 8.5, bold: true, color: accent, margin: [0, 0, 0, 4] },
            { text: invoice.emetteur?.nom || '', bold: true, fontSize: 10, color: '#0f172a' },
            invoice.emetteur?.adresse ? { text: invoice.emetteur.adresse, fontSize: 8.5, color: '#475569' } : { text: '' },
            invoice.emetteur?.telephone ? { text: invoice.emetteur.telephone, fontSize: 8.5, color: '#475569' } : { text: '' },
            invoice.emetteur?.email ? { text: invoice.emetteur.email, fontSize: 8.5, color: '#475569' } : { text: '' },
            invoice.emetteur?.identifiant_fiscal ? { text: `NIF: ${invoice.emetteur.identifiant_fiscal}`, fontSize: 8, color: '#94a3b8' } : { text: '' }
          ]
        },
        {
          width: '50%',
          stack: [
            { text: 'FACTURÉ À', fontSize: 8.5, bold: true, color: '#64748b', alignment: 'right', margin: [0, 0, 0, 4] },
            { text: invoice.client?.nom || '', bold: true, fontSize: 10, color: '#0f172a', alignment: 'right' },
            invoice.client?.adresse ? { text: invoice.client.adresse, fontSize: 8.5, color: '#475569', alignment: 'right' } : { text: '' },
            invoice.client?.telephone ? { text: invoice.client.telephone, fontSize: 8.5, color: '#475569', alignment: 'right' } : { text: '' },
            invoice.client?.email ? { text: invoice.client.email, fontSize: 8.5, color: '#475569', alignment: 'right' } : { text: '' },
            invoice.client?.identifiant_fiscal ? { text: `Réf: ${invoice.client.identifiant_fiscal}`, fontSize: 8, color: '#94a3b8', alignment: 'right' } : { text: '' }
          ]
        }
      ],
      margin: [0, 0, 0, 20]
    });

    // Tableau
    const tableBody: any[][] = [
      [
        { text: 'DESCRIPTION', fontSize: 8.5, bold: true, color: '#475569', margin: [0, 5, 0, 5] },
        { text: 'QTÉ', fontSize: 8.5, bold: true, color: '#475569', alignment: 'center', margin: [0, 5, 0, 5] },
        { text: 'P.U.', fontSize: 8.5, bold: true, color: '#475569', alignment: 'right', margin: [0, 5, 0, 5] },
        { text: 'REMISE', fontSize: 8.5, bold: true, color: '#475569', alignment: 'center', margin: [0, 5, 0, 5] },
        { text: 'TOTAL HT', fontSize: 8.5, bold: true, color: '#475569', alignment: 'right', margin: [0, 5, 0, 5] }
      ]
    ];

    invoice.lignes.forEach((l) => {
      tableBody.push([
        { text: l.description, fontSize: 9, color: '#1e293b', margin: [0, 5, 0, 5] },
        { text: String(l.quantite), fontSize: 9, alignment: 'center', color: '#475569', margin: [0, 5, 0, 5] },
        { text: formatMoney(l.prix_unitaire, invoice.devise), fontSize: 9, alignment: 'right', color: '#475569', margin: [0, 5, 0, 5] },
        { text: l.remise_pct && l.remise_pct > 0 ? `${l.remise_pct}%` : '-', fontSize: 9, alignment: 'center', color: '#94a3b8', margin: [0, 5, 0, 5] },
        { text: formatMoney(l.total_ht, invoice.devise), fontSize: 9, bold: true, alignment: 'right', color: '#0f172a', margin: [0, 5, 0, 5] }
      ]);
    });

    content.push({
      table: {
        headerRows: 1,
        widths: ['*', 45, 80, 50, 95],
        body: tableBody
      },
      layout: {
        hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5),
        vLineWidth: () => 0,
        hLineColor: () => '#e2e8f0',
        paddingTop: () => 3,
        paddingBottom: () => 3
      },
      margin: [0, 0, 0, 16]
    });

    // Totaux avec total TTC teinté
    const totalsRows: any[] = [
      [
        { text: 'Sous-total HT :', fontSize: 9, color: '#64748b' },
        { text: formatMoney(invoice.sous_total_ht, invoice.devise), fontSize: 9, bold: true, alignment: 'right', color: '#0f172a' }
      ]
    ];

    if (invoice.remise_globale && invoice.remise_globale > 0) {
      totalsRows.push([
        { text: `Remise globale (${invoice.remise_globale_pct ?? 0}%) :`, fontSize: 8.5, color: '#dc2626' },
        { text: `- ${formatMoney(invoice.remise_globale, invoice.devise)}`, fontSize: 8.5, bold: true, alignment: 'right', color: '#dc2626' }
      ]);
    }

    if (invoice.tva_montant && invoice.tva_montant > 0) {
      totalsRows.push([
        { text: `TVA (${invoice.tva_taux ?? 0}%) :`, fontSize: 8.5, color: '#64748b' },
        { text: formatMoney(invoice.tva_montant, invoice.devise), fontSize: 8.5, bold: true, alignment: 'right', color: '#0f172a' }
      ]);
    }

    totalsRows.push([
      { text: 'TOTAL TTC :', fontSize: 10.5, bold: true, color: '#ffffff', fillColor: accent, margin: [6, 4, 6, 4] },
      { text: formatMoney(invoice.total_ttc, invoice.devise), fontSize: 11, bold: true, alignment: 'right', color: '#ffffff', fillColor: accent, margin: [6, 4, 6, 4] }
    ]);

    content.push({
      columns: [
        { width: '*', text: '' },
        {
          width: 230,
          table: {
            widths: ['*', 105],
            body: totalsRows
          },
          layout: 'noBorders'
        }
      ],
      margin: [0, 0, 0, 20]
    });
  }

  // --------------------------------------------------------------------------
  // MODÈLE 4 : MINIMAL
  // Très aéré, typographie légère, totaux dans un encadré discret
  // --------------------------------------------------------------------------
  else {
    pageMargins = [44, 44, 44, 44];

    const minHeaderLeft: any[] = [];
    if (options.logoUrl) {
      minHeaderLeft.push({
        image: options.logoUrl,
        width: 55,
        margin: [0, 0, 10, 0]
      });
    }
    minHeaderLeft.push({
      stack: [
        { text: docTitle, fontSize: 18, color: '#1e293b', characterSpacing: 2 },
        { text: `Réf. ${invoice.numero || ''}`, fontSize: 9.5, color: '#94a3b8', margin: [0, 2, 0, 0] }
      ]
    });

    content.push(
      {
        columns: [
          { columns: minHeaderLeft, width: '*' },
          {
            width: 200,
            stack: [
              { text: `Date : ${invoice.date || ''}`, fontSize: 9, color: '#64748b', alignment: 'right' },
              isInvoice && invoice.echeance
                ? { text: `Échéance : ${invoice.echeance}`, fontSize: 9, color: '#64748b', alignment: 'right' }
                : !isInvoice && invoice.validite
                ? { text: `Validité : ${invoice.validite}`, fontSize: 9, color: '#64748b', alignment: 'right' }
                : { text: '' }
            ]
          }
        ],
        margin: [0, 0, 0, 14]
      },
      // Petit filet d'accent discret
      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 40, y2: 0, lineWidth: 2, lineColor: accent }],
        margin: [0, 0, 0, 18]
      }
    );

    // Émetteur & Client
    content.push({
      columns: [
        {
          width: '50%',
          stack: [
            { text: 'DE', fontSize: 7.5, bold: true, color: '#94a3b8', characterSpacing: 1, margin: [0, 0, 0, 3] },
            { text: invoice.emetteur?.nom || '', bold: true, fontSize: 9.5, color: '#1e293b' },
            invoice.emetteur?.adresse ? { text: invoice.emetteur.adresse, fontSize: 8.5, color: '#64748b' } : { text: '' },
            invoice.emetteur?.telephone ? { text: invoice.emetteur.telephone, fontSize: 8.5, color: '#64748b' } : { text: '' },
            invoice.emetteur?.email ? { text: invoice.emetteur.email, fontSize: 8.5, color: '#64748b' } : { text: '' }
          ]
        },
        {
          width: '50%',
          stack: [
            { text: 'POUR', fontSize: 7.5, bold: true, color: '#94a3b8', characterSpacing: 1, alignment: 'right', margin: [0, 0, 0, 3] },
            { text: invoice.client?.nom || '', bold: true, fontSize: 9.5, color: '#1e293b', alignment: 'right' },
            invoice.client?.adresse ? { text: invoice.client.adresse, fontSize: 8.5, color: '#64748b', alignment: 'right' } : { text: '' },
            invoice.client?.telephone ? { text: invoice.client.telephone, fontSize: 8.5, color: '#64748b', alignment: 'right' } : { text: '' },
            invoice.client?.email ? { text: invoice.client.email, fontSize: 8.5, color: '#64748b', alignment: 'right' } : { text: '' }
          ]
        }
      ],
      margin: [0, 0, 0, 22]
    });

    // Lignes très légères
    const tableBody: any[][] = [
      [
        { text: 'PRESTATION', fontSize: 8, bold: true, color: '#94a3b8', margin: [0, 4, 0, 4] },
        { text: 'QTÉ', fontSize: 8, bold: true, color: '#94a3b8', alignment: 'center', margin: [0, 4, 0, 4] },
        { text: 'P.U.', fontSize: 8, bold: true, color: '#94a3b8', alignment: 'right', margin: [0, 4, 0, 4] },
        { text: 'REMISE', fontSize: 8, bold: true, color: '#94a3b8', alignment: 'center', margin: [0, 4, 0, 4] },
        { text: 'TOTAL', fontSize: 8, bold: true, color: '#94a3b8', alignment: 'right', margin: [0, 4, 0, 4] }
      ]
    ];

    invoice.lignes.forEach((l) => {
      tableBody.push([
        { text: l.description, fontSize: 8.5, color: '#334155', margin: [0, 5, 0, 5] },
        { text: String(l.quantite), fontSize: 8.5, alignment: 'center', color: '#64748b', margin: [0, 5, 0, 5] },
        { text: formatMoney(l.prix_unitaire, invoice.devise), fontSize: 8.5, alignment: 'right', color: '#64748b', margin: [0, 5, 0, 5] },
        { text: l.remise_pct && l.remise_pct > 0 ? `${l.remise_pct}%` : '-', fontSize: 8.5, alignment: 'center', color: '#94a3b8', margin: [0, 5, 0, 5] },
        { text: formatMoney(l.total_ht, invoice.devise), fontSize: 8.5, bold: true, alignment: 'right', color: '#1e293b', margin: [0, 5, 0, 5] }
      ]);
    });

    content.push({
      table: {
        headerRows: 1,
        widths: ['*', 40, 75, 45, 90],
        body: tableBody
      },
      layout: {
        hLineWidth: (i: number, node: any) => (i === 1 || i === node.table.body.length ? 0.5 : 0.25),
        vLineWidth: () => 0,
        hLineColor: () => '#e2e8f0',
        paddingTop: () => 2,
        paddingBottom: () => 2
      },
      margin: [0, 0, 0, 16]
    });

    // Totaux dans un encadré discret
    const totalsRows: any[] = [
      [
        { text: 'Sous-total HT :', fontSize: 8.5, color: '#64748b' },
        { text: formatMoney(invoice.sous_total_ht, invoice.devise), fontSize: 8.5, bold: true, alignment: 'right', color: '#334155' }
      ]
    ];

    if (invoice.remise_globale && invoice.remise_globale > 0) {
      totalsRows.push([
        { text: `Remise (${invoice.remise_globale_pct ?? 0}%) :`, fontSize: 8, color: '#dc2626' },
        { text: `- ${formatMoney(invoice.remise_globale, invoice.devise)}`, fontSize: 8, bold: true, alignment: 'right', color: '#dc2626' }
      ]);
    }

    if (invoice.tva_montant && invoice.tva_montant > 0) {
      totalsRows.push([
        { text: `TVA (${invoice.tva_taux ?? 0}%) :`, fontSize: 8, color: '#64748b' },
        { text: formatMoney(invoice.tva_montant, invoice.devise), fontSize: 8, bold: true, alignment: 'right', color: '#334155' }
      ]);
    }

    totalsRows.push([
      { text: 'TOTAL TTC :', fontSize: 10, bold: true, color: '#0f172a', margin: [0, 3, 0, 0] },
      { text: formatMoney(invoice.total_ttc, invoice.devise), fontSize: 10.5, bold: true, alignment: 'right', color: '#0f172a', margin: [0, 3, 0, 0] }
    ]);

    content.push({
      columns: [
        { width: '*', text: '' },
        {
          width: 220,
          table: {
            widths: ['*'],
            body: [
              [
                {
                  fillColor: '#f8fafc',
                  border: [true, true, true, true],
                  borderColor: ['#e2e8f0', '#e2e8f0', '#e2e8f0', '#e2e8f0'],
                  margin: [8, 8, 8, 8],
                  table: {
                    widths: ['*', 90],
                    body: totalsRows
                  },
                  layout: 'noBorders'
                }
              ]
            ]
          },
          layout: 'noBorders'
        }
      ],
      margin: [0, 0, 0, 16]
    });
  }

  // Mentions légales & conditions communes en bas de page
  const footerStack: any[] = [];
  if (invoice.conditions_paiement) {
    footerStack.push({
      text: [
        { text: 'Règlement : ', bold: true, fontSize: 8, color: '#64748b' },
        { text: invoice.conditions_paiement, fontSize: 8, color: '#475569' }
      ],
      margin: [0, 0, 0, 3]
    });
  }
  if (invoice.mentions) {
    footerStack.push({
      text: [
        { text: 'Mentions légales : ', bold: true, fontSize: 8, color: '#64748b' },
        { text: invoice.mentions, fontSize: 8, color: '#475569' }
      ],
      margin: [0, 0, 0, 3]
    });
  }
  if (invoice.notes) {
    footerStack.push({
      text: [
        { text: 'Note : ', bold: true, fontSize: 8, color: '#64748b' },
        { text: invoice.notes, fontSize: 8, color: '#475569' }
      ],
      margin: [0, 0, 0, 3]
    });
  }

  if (footerStack.length > 0) {
    content.push(
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 520, y2: 0, lineWidth: 0.5, lineColor: '#e2e8f0' }], margin: [0, 8, 0, 8] },
      { stack: footerStack }
    );
  }

  const docDef: any = {
    pageSize: 'A4',
    pageMargins,
    content,
    defaultStyle: {
      font: 'Roboto'
    }
  };

  pdfMake.createPdf(docDef).download(filename);
}

// ============================================================================
// DEVIS & FACTURE : EXPORT WORD (docx)
// ============================================================================

export async function downloadInvoiceDocx(
  invoice: InvoiceOutputDocument,
  optionsOrStyle?: InvoiceDesignOptions | string
): Promise<void> {
  const options = resolveOptions(optionsOrStyle);
  const isInvoice = invoice.type === 'facture';
  const docTitle = isInvoice ? 'FACTURE' : 'DEVIS';
  const cleanNum = sanitizeFileName(invoice.numero || (isInvoice ? 'Facture' : 'Devis'));
  const filename = `${docTitle}_${cleanNum}.docx`;

  const font = options.fontFamily === 'serif' ? 'Times New Roman' : 'Calibri';
  const accentHex = (options.accentColor || '#2563EB').replace('#', '');
  const logoBytes = options.logoUrl ? base64ToUint8Array(options.logoUrl) : null;

  const children: any[] = [];

  // Logo si présent
  if (logoBytes) {
    try {
      children.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { after: 140 },
          children: [
            new ImageRun({
              data: logoBytes,
              transformation: { width: 90, height: 45 },
              type: 'png'
            })
          ]
        })
      );
    } catch (e) {
      console.warn('Docx logo error:', e);
    }
  }

  // Titre & Numéro selon le modèle
  if (options.templateId === 'bandeau') {
    children.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        shading: { type: ShadingType.CLEAR, fill: accentHex },
        spacing: { after: 180 },
        children: [
          new TextRun({
            text: `   ${docTitle} N° ${invoice.numero || ''}   `,
            bold: true,
            size: 28,
            color: 'FFFFFF',
            font
          })
        ]
      })
    );
  } else {
    children.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: docTitle,
            bold: true,
            size: 36,
            color: options.templateId === 'colore' ? accentHex : '0F172A',
            font
          })
        ]
      }),
      new Paragraph({
        spacing: { after: 140 },
        children: [
          new TextRun({
            text: `N° ${invoice.numero || ''}`,
            bold: true,
            size: 22,
            color: '64748B',
            font
          })
        ]
      })
    );
  }

  // Dates
  children.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({ text: "Date d'émission : ", bold: true, size: 20, color: '64748B', font }),
        new TextRun({ text: invoice.date || '', bold: true, size: 20, color: '0F172A', font })
      ]
    })
  );

  if (isInvoice && invoice.echeance) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 180 },
        children: [
          new TextRun({ text: "Date d'échéance : ", bold: true, size: 20, color: '64748B', font }),
          new TextRun({ text: invoice.echeance, bold: true, size: 20, color: accentHex, font })
        ]
      })
    );
  } else if (!isInvoice && invoice.validite) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 180 },
        children: [
          new TextRun({ text: "Validité de l'offre : ", bold: true, size: 20, color: '64748B', font }),
          new TextRun({ text: invoice.validite, bold: true, size: 20, color: accentHex, font })
        ]
      })
    );
  }

  // Émetteur et Client
  children.push(
    new Paragraph({
      spacing: { before: 100, after: 40 },
      children: [
        new TextRun({ text: 'ÉMETTEUR : ', bold: true, size: 20, color: accentHex, font }),
        new TextRun({ text: invoice.emetteur?.nom || '', bold: true, size: 20, color: '0F172A', font })
      ]
    })
  );
  if (invoice.emetteur?.adresse) {
    children.push(new Paragraph({ children: [new TextRun({ text: invoice.emetteur.adresse, size: 19, color: '475569', font })] }));
  }
  if (invoice.emetteur?.telephone || invoice.emetteur?.email) {
    children.push(new Paragraph({ children: [new TextRun({ text: [invoice.emetteur?.telephone, invoice.emetteur?.email].filter(Boolean).join(' | '), size: 19, color: '475569', font })] }));
  }
  if (invoice.emetteur?.identifiant_fiscal) {
    children.push(new Paragraph({ children: [new TextRun({ text: `NIF: ${invoice.emetteur.identifiant_fiscal}`, size: 18, color: '94A3B8', font })] }));
  }

  children.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 120, after: 40 },
      children: [
        new TextRun({ text: 'CLIENT : ', bold: true, size: 20, color: '64748B', font }),
        new TextRun({ text: invoice.client?.nom || '', bold: true, size: 20, color: '0F172A', font })
      ]
    })
  );
  if (invoice.client?.adresse) {
    children.push(new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: invoice.client.adresse, size: 19, color: '475569', font })] }));
  }
  if (invoice.client?.telephone || invoice.client?.email) {
    children.push(new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: [invoice.client?.telephone, invoice.client?.email].filter(Boolean).join(' | '), size: 19, color: '475569', font })] }));
  }

  // Tableau
  const tableRows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          width: { size: 50, type: WidthType.PERCENTAGE },
          shading: options.templateId === 'colore' ? { type: ShadingType.CLEAR, fill: accentHex } : undefined,
          children: [new Paragraph({ children: [new TextRun({ text: 'Description', bold: true, size: 20, color: options.templateId === 'colore' ? 'FFFFFF' : '0F172A', font })] })]
        }),
        new TableCell({
          width: { size: 12, type: WidthType.PERCENTAGE },
          shading: options.templateId === 'colore' ? { type: ShadingType.CLEAR, fill: accentHex } : undefined,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Qté', bold: true, size: 20, color: options.templateId === 'colore' ? 'FFFFFF' : '0F172A', font })] })]
        }),
        new TableCell({
          width: { size: 18, type: WidthType.PERCENTAGE },
          shading: options.templateId === 'colore' ? { type: ShadingType.CLEAR, fill: accentHex } : undefined,
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'P.U.', bold: true, size: 20, color: options.templateId === 'colore' ? 'FFFFFF' : '0F172A', font })] })]
        }),
        new TableCell({
          width: { size: 20, type: WidthType.PERCENTAGE },
          shading: options.templateId === 'colore' ? { type: ShadingType.CLEAR, fill: accentHex } : undefined,
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Total HT', bold: true, size: 20, color: options.templateId === 'colore' ? 'FFFFFF' : '0F172A', font })] })]
        })
      ]
    })
  ];

  invoice.lignes.forEach((l, idx) => {
    const isZebra = options.templateId === 'colore' && idx % 2 === 1;
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({
            shading: isZebra ? { type: ShadingType.CLEAR, fill: 'F8FAFC' } : undefined,
            children: [new Paragraph({ children: [new TextRun({ text: l.description, size: 20, color: '1E293B', font })] })]
          }),
          new TableCell({
            shading: isZebra ? { type: ShadingType.CLEAR, fill: 'F8FAFC' } : undefined,
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(l.quantite), size: 20, color: '475569', font })] })]
          }),
          new TableCell({
            shading: isZebra ? { type: ShadingType.CLEAR, fill: 'F8FAFC' } : undefined,
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: formatMoney(l.prix_unitaire, invoice.devise), size: 20, color: '475569', font })] })]
          }),
          new TableCell({
            shading: isZebra ? { type: ShadingType.CLEAR, fill: 'F8FAFC' } : undefined,
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: formatMoney(l.total_ht, invoice.devise), bold: true, size: 20, color: '0F172A', font })] })]
          })
        ]
      })
    );
  });

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: tableRows
    })
  );

  // Totaux (venant du serveur sans recalcul)
  children.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 200, after: 60 },
      children: [
        new TextRun({ text: 'Sous-total HT : ', size: 20, color: '64748B', font }),
        new TextRun({ text: formatMoney(invoice.sous_total_ht, invoice.devise), bold: true, size: 20, color: '0F172A', font })
      ]
    })
  );

  if (invoice.remise_globale && invoice.remise_globale > 0) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 60 },
        children: [
          new TextRun({ text: `Remise (${invoice.remise_globale_pct ?? 0}%) : `, size: 20, color: 'DC2626', font }),
          new TextRun({ text: `- ${formatMoney(invoice.remise_globale, invoice.devise)}`, bold: true, size: 20, color: 'DC2626', font })
        ]
      })
    );
  }

  if (invoice.tva_montant && invoice.tva_montant > 0) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 60 },
        children: [
          new TextRun({ text: `TVA (${invoice.tva_taux ?? 0}%) : `, size: 20, color: '64748B', font }),
          new TextRun({ text: formatMoney(invoice.tva_montant, invoice.devise), bold: true, size: 20, color: '0F172A', font })
        ]
      })
    );
  }

  children.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 60, after: 120 },
      children: [
        new TextRun({ text: 'TOTAL TTC : ', bold: true, size: 24, color: accentHex, font }),
        new TextRun({ text: formatMoney(invoice.total_ttc, invoice.devise), bold: true, size: 26, color: accentHex, font })
      ]
    })
  );

  if (isInvoice && invoice.acompte && invoice.acompte > 0) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({ text: 'Acompte déjà versé : ', size: 20, color: '059669', font }),
          new TextRun({ text: `- ${formatMoney(invoice.acompte, invoice.devise)}`, bold: true, size: 20, color: '059669', font })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 40, after: 120 },
        children: [
          new TextRun({ text: 'RESTE À PAYER : ', bold: true, size: 22, color: '0F172A', font }),
          new TextRun({ text: formatMoney(invoice.reste_a_payer, invoice.devise), bold: true, size: 24, color: '0F172A', font })
        ]
      })
    );
  }

  // Conditions & Mentions
  if (invoice.conditions_paiement) {
    children.push(
      new Paragraph({
        spacing: { before: 240, after: 60 },
        children: [
          new TextRun({ text: 'Règlement : ', bold: true, size: 18, color: '64748B', font }),
          new TextRun({ text: invoice.conditions_paiement, size: 18, color: '475569', font })
        ]
      })
    );
  }
  if (invoice.mentions) {
    children.push(
      new Paragraph({
        spacing: { after: 60 },
        children: [
          new TextRun({ text: 'Mentions légales : ', bold: true, size: 18, color: '64748B', font }),
          new TextRun({ text: invoice.mentions, size: 18, color: '475569', font })
        ]
      })
    );
  }
  if (invoice.notes) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Note : ', bold: true, size: 18, color: '64748B', font }),
          new TextRun({ text: invoice.notes, size: 18, color: '475569', font })
        ]
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1200, right: 1200, bottom: 1200, left: 1200 }
          }
        },
        children
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  triggerBlobDownload(blob, filename);
}
