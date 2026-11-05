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
  ShadingType
} from 'docx';
import type { LettreOutputDocument } from '../types';
import type { LetterDesignOptions } from './adminDesignEngine';
import { DEFAULT_LETTER_DESIGN_OPTIONS } from './adminDesignEngine';

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

function resolveOptions(optionsOrStyle?: LetterDesignOptions | string): LetterDesignOptions {
  if (!optionsOrStyle) return { ...DEFAULT_LETTER_DESIGN_OPTIONS };
  if (typeof optionsOrStyle === 'string') {
    const validId = ['classique', 'moderne', 'sobre'].includes(optionsOrStyle)
      ? (optionsOrStyle as LetterDesignOptions['templateId'])
      : 'classique';
    return { ...DEFAULT_LETTER_DESIGN_OPTIONS, templateId: validId };
  }
  return {
    ...DEFAULT_LETTER_DESIGN_OPTIONS,
    ...optionsOrStyle
  };
}

// ============================================================================
// LETTRE ADMINISTRATIVE : EXPORT PDF (pdfmake)
// ============================================================================

export async function downloadLettrePdf(
  lettre: LettreOutputDocument,
  optionsOrStyle?: LetterDesignOptions | string
): Promise<void> {
  const options = resolveOptions(optionsOrStyle);
  const cleanExp = sanitizeFileName(lettre.expediteur?.nom || 'Lettre');
  const filename = `Lettre_${cleanExp}.pdf`;
  const accent = options.accentColor || '#2563EB';

  const content: any[] = [];
  let pageMargins: [number, number, number, number] = [40, 40, 40, 40];

  // --------------------------------------------------------------------------
  // MODÈLE 1 : CLASSIQUE
  // Expéditeur haut gauche, destinataire droite, objet en gras, texte justifié
  // --------------------------------------------------------------------------
  if (options.templateId === 'classique') {
    const leftExpStack: any[] = [];
    if (lettre.expediteur?.nom) {
      leftExpStack.push({ text: lettre.expediteur.nom, bold: true, fontSize: 10, color: '#0f172a' });
    }
    if (lettre.expediteur?.adresse) {
      leftExpStack.push({ text: lettre.expediteur.adresse, fontSize: 9.5, color: '#334155' });
    }
    if (lettre.expediteur?.telephone) {
      leftExpStack.push({ text: lettre.expediteur.telephone, fontSize: 9.5, color: '#334155' });
    }
    if (lettre.expediteur?.email) {
      leftExpStack.push({ text: lettre.expediteur.email, fontSize: 9.5, color: '#334155' });
    }

    const rightDestStack: any[] = [];
    if (lettre.destinataire?.organisation) {
      rightDestStack.push({ text: lettre.destinataire.organisation, bold: true, fontSize: 10.5, color: '#0f172a' });
    }
    if (lettre.destinataire?.fonction) {
      rightDestStack.push({ text: lettre.destinataire.fonction, bold: true, fontSize: 9.5, color: '#334155' });
    }
    if (lettre.destinataire?.nom) {
      rightDestStack.push({ text: lettre.destinataire.nom, fontSize: 9.5, color: '#334155' });
    }
    if (lettre.destinataire?.adresse) {
      rightDestStack.push({ text: lettre.destinataire.adresse, fontSize: 9.5, color: '#475569' });
    }

    content.push({
      columns: [
        { stack: leftExpStack, width: '50%' },
        { stack: rightDestStack, width: '50%', margin: [20, 16, 0, 0] }
      ],
      margin: [0, 0, 0, 24]
    });

    if (lettre.lieu_date) {
      content.push({
        text: lettre.lieu_date,
        alignment: 'right',
        fontSize: 10,
        color: '#334155',
        margin: [0, 0, 0, 18]
      });
    }

    if (lettre.objet) {
      content.push({
        text: [
          { text: 'Objet : ', bold: true, color: accent },
          { text: lettre.objet, bold: true, color: '#0f172a' }
        ],
        fontSize: 10.5,
        margin: [0, 0, 0, 18]
      });
    }

    if (lettre.ouverture) {
      content.push({
        text: lettre.ouverture,
        fontSize: 10.5,
        bold: true,
        color: '#0f172a',
        margin: [0, 0, 0, 12]
      });
    }

    if (Array.isArray(lettre.paragraphes)) {
      lettre.paragraphes.forEach((p) => {
        if (p.trim()) {
          content.push({
            text: p,
            fontSize: 10,
            lineHeight: 1.35,
            alignment: 'justify',
            color: '#1e293b',
            margin: [0, 0, 0, 12]
          });
        }
      });
    }

    if (lettre.formule_politesse) {
      content.push({
        text: lettre.formule_politesse,
        fontSize: 10,
        lineHeight: 1.35,
        color: '#1e293b',
        margin: [0, 6, 0, 24]
      });
    }

    if (lettre.signature) {
      content.push({
        text: lettre.signature,
        fontSize: 10.5,
        bold: true,
        alignment: 'right',
        color: '#0f172a',
        margin: [0, 0, 20, 0]
      });
    }
  }

  // --------------------------------------------------------------------------
  // MODÈLE 2 : MODERNE
  // Bandeau fin de couleur avec nom, colonne latérale étroite, texte aéré
  // --------------------------------------------------------------------------
  else if (options.templateId === 'moderne') {
    pageMargins = [36, 36, 36, 36];

    // Bandeau fin supérieur avec nom
    content.push({
      table: {
        widths: ['*'],
        body: [
          [
            {
              fillColor: accent,
              border: [false, false, false, false],
              margin: [16, 12, 16, 12],
              columns: [
                {
                  text: (lettre.expediteur?.nom || 'EXPÉDITEUR').toUpperCase(),
                  bold: true,
                  fontSize: 14,
                  color: '#ffffff',
                  characterSpacing: 0.5
                },
                {
                  text: lettre.lieu_date || '',
                  alignment: 'right',
                  fontSize: 9.5,
                  color: '#ffffff',
                  margin: [0, 2, 0, 0]
                }
              ]
            }
          ]
        ]
      },
      layout: 'noBorders',
      margin: [-36, -36, -36, 20]
    });

    // 2 colonnes : colonne latérale gauche (coordonnées) + colonne droite (corps)
    const leftCoords: any[] = [];
    leftCoords.push({
      text: 'COORDONNÉES',
      fontSize: 8.5,
      bold: true,
      color: accent,
      margin: [0, 0, 0, 6]
    });
    if (lettre.expediteur?.adresse) leftCoords.push({ text: lettre.expediteur.adresse, fontSize: 8.5, color: '#475569', margin: [0, 0, 0, 3] });
    if (lettre.expediteur?.telephone) leftCoords.push({ text: lettre.expediteur.telephone, fontSize: 8.5, color: '#475569', margin: [0, 0, 0, 3] });
    if (lettre.expediteur?.email) leftCoords.push({ text: lettre.expediteur.email, fontSize: 8.5, color: '#475569', margin: [0, 0, 0, 3] });

    leftCoords.push({
      text: 'DESTINATAIRE',
      fontSize: 8.5,
      bold: true,
      color: '#0f172a',
      margin: [0, 16, 0, 6]
    });
    if (lettre.destinataire?.organisation) leftCoords.push({ text: lettre.destinataire.organisation, fontSize: 9, bold: true, color: '#0f172a', margin: [0, 0, 0, 2] });
    if (lettre.destinataire?.fonction) leftCoords.push({ text: lettre.destinataire.fonction, fontSize: 8.5, color: '#334155', margin: [0, 0, 0, 2] });
    if (lettre.destinataire?.nom) leftCoords.push({ text: lettre.destinataire.nom, fontSize: 8.5, color: '#475569', margin: [0, 0, 0, 2] });
    if (lettre.destinataire?.adresse) leftCoords.push({ text: lettre.destinataire.adresse, fontSize: 8.5, color: '#475569', margin: [0, 0, 0, 2] });

    const rightBody: any[] = [];
    if (lettre.objet) {
      rightBody.push({
        table: {
          widths: ['*'],
          body: [
            [
              {
                fillColor: '#f8fafc',
                border: [true, false, false, false],
                borderColor: [accent, '', '', ''],
                margin: [8, 6, 8, 6],
                text: [
                  { text: 'Objet : ', bold: true, color: accent, fontSize: 9.5 },
                  { text: lettre.objet, bold: true, color: '#0f172a', fontSize: 9.5 }
                ]
              }
            ]
          ]
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 16]
      });
    }

    if (lettre.ouverture) {
      rightBody.push({
        text: lettre.ouverture,
        fontSize: 10,
        bold: true,
        color: '#0f172a',
        margin: [0, 0, 0, 12]
      });
    }

    if (Array.isArray(lettre.paragraphes)) {
      lettre.paragraphes.forEach((p) => {
        if (p.trim()) {
          rightBody.push({
            text: p,
            fontSize: 9.5,
            lineHeight: 1.4,
            color: '#1e293b',
            margin: [0, 0, 0, 12]
          });
        }
      });
    }

    if (lettre.formule_politesse) {
      rightBody.push({
        text: lettre.formule_politesse,
        fontSize: 9.5,
        lineHeight: 1.4,
        color: '#1e293b',
        margin: [0, 4, 0, 20]
      });
    }

    if (lettre.signature) {
      rightBody.push({
        text: lettre.signature,
        fontSize: 10,
        bold: true,
        alignment: 'right',
        color: '#0f172a'
      });
    }

    content.push({
      columns: [
        { width: 140, stack: leftCoords },
        { width: '*', stack: rightBody, margin: [16, 0, 0, 0] }
      ]
    });
  }

  // --------------------------------------------------------------------------
  // MODÈLE 3 : SOBRE
  // Nom en grandes lettres, filet de couleur sous l'en-tête, pied de page coordonnées
  // --------------------------------------------------------------------------
  else {
    pageMargins = [42, 40, 42, 40];

    // En-tête : Nom en grandes lettres & Date à droite
    content.push(
      {
        columns: [
          {
            text: (lettre.expediteur?.nom || 'LETTRE ADMINISTRATIVE').toUpperCase(),
            fontSize: 16,
            bold: true,
            color: '#0f172a',
            characterSpacing: 1
          },
          {
            text: lettre.lieu_date || '',
            alignment: 'right',
            fontSize: 9.5,
            color: '#64748b',
            margin: [0, 4, 0, 0]
          }
        ]
      },
      // Filet d'accent fin sous l'en-tête
      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 510, y2: 0, lineWidth: 1.5, lineColor: accent }],
        margin: [0, 8, 0, 20]
      }
    );

    // Bloc destinataire aligné à droite
    const destStack: any[] = [];
    if (lettre.destinataire?.organisation) destStack.push({ text: lettre.destinataire.organisation, bold: true, fontSize: 10, color: '#0f172a' });
    if (lettre.destinataire?.fonction) destStack.push({ text: lettre.destinataire.fonction, fontSize: 9.5, color: '#334155' });
    if (lettre.destinataire?.nom) destStack.push({ text: lettre.destinataire.nom, fontSize: 9.5, color: '#475569' });
    if (lettre.destinataire?.adresse) destStack.push({ text: lettre.destinataire.adresse, fontSize: 9, color: '#64748b' });

    content.push({
      columns: [
        { width: '*', text: '' },
        { width: 220, stack: destStack }
      ],
      margin: [0, 0, 0, 20]
    });

    if (lettre.objet) {
      content.push({
        text: [
          { text: 'Objet : ', bold: true, color: accent },
          { text: lettre.objet, bold: true, color: '#0f172a' }
        ],
        fontSize: 10,
        margin: [0, 0, 0, 16]
      });
    }

    if (lettre.ouverture) {
      content.push({
        text: lettre.ouverture,
        fontSize: 10,
        bold: true,
        color: '#0f172a',
        margin: [0, 0, 0, 12]
      });
    }

    if (Array.isArray(lettre.paragraphes)) {
      lettre.paragraphes.forEach((p) => {
        if (p.trim()) {
          content.push({
            text: p,
            fontSize: 9.5,
            lineHeight: 1.4,
            alignment: 'justify',
            color: '#1e293b',
            margin: [0, 0, 0, 12]
          });
        }
      });
    }

    if (lettre.formule_politesse) {
      content.push({
        text: lettre.formule_politesse,
        fontSize: 9.5,
        lineHeight: 1.4,
        color: '#1e293b',
        margin: [0, 4, 0, 20]
      });
    }

    if (lettre.signature) {
      content.push({
        text: lettre.signature,
        fontSize: 10,
        bold: true,
        alignment: 'right',
        color: '#0f172a',
        margin: [0, 0, 10, 20]
      });
    }
  }

  // Footer pour le modèle Sobre (coordonnées discrètes)
  const docDef: any = {
    pageSize: 'A4',
    pageMargins,
    content,
    defaultStyle: {
      font: 'Roboto'
    }
  };

  if (options.templateId === 'sobre') {
    const footerItems = [
      lettre.expediteur?.nom,
      lettre.expediteur?.adresse,
      lettre.expediteur?.telephone,
      lettre.expediteur?.email
    ].filter(Boolean);

    docDef.footer = (currentPage: number, pageCount: number) => {
      return {
        stack: [
          { canvas: [{ type: 'line', x1: 42, y1: 0, x2: 553, y2: 0, lineWidth: 0.5, lineColor: '#e2e8f0' }] },
          {
            text: footerItems.join('  •  '),
            fontSize: 8,
            color: '#94a3b8',
            alignment: 'center',
            margin: [40, 6, 40, 0]
          }
        ]
      };
    };
  }

  pdfMake.createPdf(docDef).download(filename);
}

// ============================================================================
// LETTRE ADMINISTRATIVE : EXPORT WORD (docx)
// ============================================================================

export async function downloadLettreDocx(
  lettre: LettreOutputDocument,
  optionsOrStyle?: LetterDesignOptions | string
): Promise<void> {
  const options = resolveOptions(optionsOrStyle);
  const cleanExp = sanitizeFileName(lettre.expediteur?.nom || 'Lettre');
  const filename = `Lettre_${cleanExp}.docx`;
  const font = options.fontFamily === 'serif' ? 'Times New Roman' : 'Calibri';
  const accentHex = (options.accentColor || '#2563EB').replace('#', '');

  const children: any[] = [];

  // En-tête selon le modèle
  if (options.templateId === 'moderne') {
    children.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        shading: { type: ShadingType.CLEAR, fill: accentHex },
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: `  ${(lettre.expediteur?.nom || 'LETTRE ADMINISTRATIVE').toUpperCase()}  `,
            bold: true,
            size: 28,
            color: 'FFFFFF',
            font
          })
        ]
      })
    );
  } else if (options.templateId === 'sobre') {
    children.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: (lettre.expediteur?.nom || 'LETTRE ADMINISTRATIVE').toUpperCase(),
            bold: true,
            size: 32,
            color: '0F172A',
            font
          })
        ]
      })
    );
  } else {
    // Classique
    children.push(
      new Paragraph({
        spacing: { after: 40 },
        children: [
          new TextRun({
            text: lettre.expediteur?.nom || '',
            bold: true,
            size: 22,
            color: '0F172A',
            font
          })
        ]
      })
    );
    if (lettre.expediteur?.adresse) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: lettre.expediteur.adresse, size: 20, color: '334155', font })]
        })
      );
    }
    if (lettre.expediteur?.telephone || lettre.expediteur?.email) {
      children.push(
        new Paragraph({
          spacing: { after: 180 },
          children: [
            new TextRun({
              text: [lettre.expediteur?.telephone, lettre.expediteur?.email].filter(Boolean).join('  |  '),
              size: 20,
              color: '334155',
              font
            })
          ]
        })
      );
    }
  }

  // Destinataire
  if (lettre.destinataire?.organisation || lettre.destinataire?.nom) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 40 },
        children: [
          new TextRun({
            text: lettre.destinataire.organisation || '',
            bold: true,
            size: 22,
            color: '0F172A',
            font
          })
        ]
      })
    );
    if (lettre.destinataire?.fonction) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: lettre.destinataire.fonction, size: 20, color: '334155', font })]
        })
      );
    }
    if (lettre.destinataire?.nom) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: lettre.destinataire.nom, size: 20, color: '475569', font })]
        })
      );
    }
    if (lettre.destinataire?.adresse) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { after: 200 },
          children: [new TextRun({ text: lettre.destinataire.adresse, size: 20, color: '475569', font })]
        })
      );
    }
  }

  // Lieu et date
  if (lettre.lieu_date) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 200 },
        children: [new TextRun({ text: lettre.lieu_date, size: 20, color: '475569', font })]
      })
    );
  }

  // Objet
  if (lettre.objet) {
    children.push(
      new Paragraph({
        spacing: { after: 180 },
        children: [
          new TextRun({ text: 'Objet : ', bold: true, size: 22, color: accentHex, font }),
          new TextRun({ text: lettre.objet, bold: true, size: 22, color: '0F172A', font })
        ]
      })
    );
  }

  // Ouverture
  if (lettre.ouverture) {
    children.push(
      new Paragraph({
        spacing: { after: 140 },
        children: [new TextRun({ text: lettre.ouverture, bold: true, size: 22, color: '0F172A', font })]
      })
    );
  }

  // Paragraphes
  if (Array.isArray(lettre.paragraphes)) {
    lettre.paragraphes.forEach((p) => {
      if (p.trim()) {
        children.push(
          new Paragraph({
            alignment: options.templateId === 'classique' ? AlignmentType.JUSTIFIED : AlignmentType.LEFT,
            spacing: { after: 140, line: 300 },
            children: [new TextRun({ text: p, size: 21, color: '1E293B', font })]
          })
        );
      }
    });
  }

  // Formule de politesse
  if (lettre.formule_politesse) {
    children.push(
      new Paragraph({
        spacing: { after: 240, line: 300 },
        children: [new TextRun({ text: lettre.formule_politesse, size: 21, color: '1E293B', font })]
      })
    );
  }

  // Signature
  if (lettre.signature) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 200 },
        children: [new TextRun({ text: lettre.signature, bold: true, size: 22, color: '0F172A', font })]
      })
    );
  }

  // Pied de page si Sobre
  if (options.templateId === 'sobre') {
    const footerText = [
      lettre.expediteur?.nom,
      lettre.expediteur?.adresse,
      lettre.expediteur?.telephone,
      lettre.expediteur?.email
    ].filter(Boolean).join('  •  ');

    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 400 },
        children: [new TextRun({ text: footerText, size: 18, color: '94A3B8', font })]
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
