import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  BorderStyle,
  WidthType,
  ShadingType,
  ImageRun
} from 'docx';
import type {
  CvOutputDocument,
  LettreOutputDocument,
  InvoiceOutputDocument,
  FormDocument
} from '../types';
import {
  CvDesignOptions,
  DEFAULT_DESIGN_OPTIONS
} from './cvDesignEngine';
import {
  LetterDesignOptions,
  InvoiceDesignOptions
} from './adminDesignEngine';
import {
  downloadCvPdf as downloadCvPdfEngine,
  downloadCvDocx as downloadCvDocxEngine
} from './cvExportEngine';
import {
  downloadLettrePdf as downloadLettrePdfEngine,
  downloadLettreDocx as downloadLettreDocxEngine
} from './letterExportEngine';
import {
  downloadInvoicePdf as downloadInvoicePdfEngine,
  downloadInvoiceDocx as downloadInvoiceDocxEngine
} from './invoiceExportEngine';

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

// ============================================================================
// CV : EXPORT PDF (pdfmake)
// ============================================================================

export async function downloadCvPdf(
  cv: CvOutputDocument,
  styleOrOptions?: 'classique' | 'moderne' | CvDesignOptions
): Promise<void> {
  return downloadCvPdfEngine(cv, styleOrOptions);
}

function _legacyDownloadCvPdf(
  cv: CvOutputDocument,
  style: 'classique' | 'moderne' = 'classique'
): void {
  const cleanName = sanitizeFileName(cv.identite?.nom || 'Curriculum_Vitae');
  const filename = `CV_${cleanName}.pdf`;

  if (style === 'moderne') {
    // MODÈLE MODERNE (2 colonnes : bandeau sombre à gauche, contenu riche à droite)
    const leftContent: any[] = [];
    const rightContent: any[] = [];

    // Bandeau gauche : Coordonnées
    leftContent.push({
      text: 'CONTACT',
      style: 'sidebarHeading',
      margin: [0, 0, 0, 8]
    });

    if (cv.identite?.email) {
      leftContent.push({ text: cv.identite.email, style: 'sidebarText' });
    }
    if (cv.identite?.telephone) {
      leftContent.push({ text: cv.identite.telephone, style: 'sidebarText' });
    }
    if (cv.identite?.ville) {
      leftContent.push({ text: cv.identite.ville, style: 'sidebarText' });
    }

    // Bandeau gauche : Compétences
    if (Array.isArray(cv.competences) && cv.competences.length > 0) {
      leftContent.push({
        text: 'COMPÉTENCES',
        style: 'sidebarHeading',
        margin: [0, 18, 0, 8]
      });
      cv.competences.forEach((c) => {
        leftContent.push({ text: `• ${c}`, style: 'sidebarItem' });
      });
    }

    // Bandeau gauche : Langues
    if (Array.isArray(cv.langues) && cv.langues.length > 0) {
      leftContent.push({
        text: 'LANGUES',
        style: 'sidebarHeading',
        margin: [0, 18, 0, 8]
      });
      cv.langues.forEach((l) => {
        leftContent.push({
          text: `${l.langue} (${l.niveau})`,
          style: 'sidebarItem'
        });
      });
    }

    // Bandeau gauche : Centres d'intérêt
    if (Array.isArray(cv.centres_interet) && cv.centres_interet.length > 0) {
      leftContent.push({
        text: "CENTRES D'INTÉRÊT",
        style: 'sidebarHeading',
        margin: [0, 18, 0, 8]
      });
      cv.centres_interet.forEach((ci) => {
        leftContent.push({ text: `• ${ci}`, style: 'sidebarItem' });
      });
    }

    // Colonne droite : En-tête (Nom, Titre visé)
    rightContent.push({
      text: cv.identite?.nom || 'Curriculum Vitae',
      style: 'modernName'
    });
    if (cv.identite?.titre_vise) {
      rightContent.push({
        text: cv.identite.titre_vise.toUpperCase(),
        style: 'modernTitle',
        margin: [0, 2, 0, 12]
      });
    }

    // Colonne droite : Résumé
    if (cv.resume) {
      rightContent.push({
        text: 'PROFIL',
        style: 'rightHeading'
      });
      rightContent.push({
        text: cv.resume,
        style: 'paragraph',
        margin: [0, 0, 0, 12]
      });
    }

    // Colonne droite : Expériences
    if (Array.isArray(cv.experiences) && cv.experiences.length > 0) {
      rightContent.push({
        text: 'EXPÉRIENCES PROFESSIONNELLES',
        style: 'rightHeading'
      });
      cv.experiences.forEach((exp) => {
        rightContent.push({
          columns: [
            { text: exp.poste, bold: true, fontSize: 10.5, color: '#0f172a' },
            { text: exp.periode, alignment: 'right', fontSize: 9.5, color: '#2563eb', bold: true }
          ]
        });
        rightContent.push({
          text: `${exp.employeur}${exp.lieu ? ` — ${exp.lieu}` : ''}`,
          italics: true,
          fontSize: 9.5,
          color: '#475569',
          margin: [0, 1, 0, 4]
        });
        if (Array.isArray(exp.points) && exp.points.length > 0) {
          rightContent.push({
            ul: exp.points.map((p) => ({ text: p, fontSize: 9.5, color: '#334155' })),
            margin: [0, 2, 0, 10]
          });
        } else {
          rightContent.push({ text: '', margin: [0, 0, 0, 8] });
        }
      });
    }

    // Colonne droite : Formations
    if (Array.isArray(cv.formations) && cv.formations.length > 0) {
      rightContent.push({
        text: 'FORMATIONS & DIPLÔMES',
        style: 'rightHeading'
      });
      cv.formations.forEach((f) => {
        rightContent.push({
          columns: [
            { text: f.diplome, bold: true, fontSize: 10.5, color: '#0f172a' },
            { text: f.annee, alignment: 'right', fontSize: 9.5, color: '#2563eb', bold: true }
          ]
        });
        rightContent.push({
          text: `${f.etablissement}${f.lieu ? ` — ${f.lieu}` : ''}`,
          fontSize: 9.5,
          color: '#475569',
          margin: [0, 1, 0, 8]
        });
      });
    }

    const docDefinition: any = {
      pageSize: 'A4',
      pageMargins: [30, 30, 30, 30],
      content: [
        {
          table: {
            widths: [160, '*'],
            body: [
              [
                {
                  fillColor: '#0f172a',
                  margin: [10, 14, 10, 14],
                  stack: leftContent
                },
                {
                  margin: [16, 10, 8, 10],
                  stack: rightContent
                }
              ]
            ]
          },
          layout: 'noBorders'
        }
      ],
      styles: {
        modernName: {
          fontSize: 18,
          bold: true,
          color: '#0f172a'
        },
        modernTitle: {
          fontSize: 11,
          bold: true,
          color: '#2563eb',
          characterSpacing: 0.5
        },
        sidebarHeading: {
          fontSize: 9.5,
          bold: true,
          color: '#38bdf8',
          characterSpacing: 0.5
        },
        sidebarText: {
          fontSize: 8.5,
          color: '#cbd5e1',
          margin: [0, 1, 0, 2]
        },
        sidebarItem: {
          fontSize: 8.5,
          color: '#e2e8f0',
          margin: [0, 1, 0, 2]
        },
        rightHeading: {
          fontSize: 11,
          bold: true,
          color: '#1e293b',
          margin: [0, 10, 0, 6]
        },
        paragraph: {
          fontSize: 9.5,
          lineHeight: 1.3,
          color: '#334155'
        }
      }
    };

    (pdfMake as any).createPdf(docDefinition).download(filename);
  } else {
    // MODÈLE CLASSIQUE (Sobre, centré, élégant, intemporel)
    const content: any[] = [];

    // En-tête
    content.push({
      text: cv.identite?.nom || 'Curriculum Vitae',
      fontSize: 20,
      bold: true,
      alignment: 'center',
      color: '#0f172a'
    });

    if (cv.identite?.titre_vise) {
      content.push({
        text: cv.identite.titre_vise.toUpperCase(),
        fontSize: 12,
        bold: true,
        alignment: 'center',
        color: '#2563eb',
        margin: [0, 3, 0, 4]
      });
    }

    const contactParts = [
      cv.identite?.email,
      cv.identite?.telephone,
      cv.identite?.ville
    ].filter(Boolean);

    if (contactParts.length > 0) {
      content.push({
        text: contactParts.join('  •  '),
        fontSize: 9.5,
        alignment: 'center',
        color: '#64748b',
        margin: [0, 0, 0, 12]
      });
    }

    content.push({
      canvas: [
        {
          type: 'line',
          x1: 0,
          y1: 0,
          x2: 515,
          y2: 0,
          lineWidth: 1.5,
          lineColor: '#2563eb'
        }
      ],
      margin: [0, 0, 0, 14]
    });

    // Profil
    if (cv.resume) {
      content.push({
        text: 'PROFIL PROFESSIONNEL',
        style: 'classicSection'
      });
      content.push({
        text: cv.resume,
        fontSize: 10,
        color: '#334155',
        lineHeight: 1.3,
        margin: [0, 0, 0, 12]
      });
    }

    // Expériences
    if (Array.isArray(cv.experiences) && cv.experiences.length > 0) {
      content.push({
        text: 'EXPÉRIENCES PROFESSIONNELLES',
        style: 'classicSection'
      });

      cv.experiences.forEach((exp) => {
        content.push({
          columns: [
            { text: exp.poste, bold: true, fontSize: 10.5, color: '#0f172a' },
            { text: exp.periode, alignment: 'right', fontSize: 9.5, color: '#475569', bold: true }
          ]
        });
        content.push({
          text: `${exp.employeur}${exp.lieu ? ` — ${exp.lieu}` : ''}`,
          italics: true,
          fontSize: 9.5,
          color: '#475569',
          margin: [0, 1, 0, 3]
        });
        if (Array.isArray(exp.points) && exp.points.length > 0) {
          content.push({
            ul: exp.points.map((p) => ({ text: p, fontSize: 9.5, color: '#334155' })),
            margin: [0, 2, 0, 10]
          });
        } else {
          content.push({ text: '', margin: [0, 0, 0, 8] });
        }
      });
    }

    // Formations
    if (Array.isArray(cv.formations) && cv.formations.length > 0) {
      content.push({
        text: 'FORMATIONS & DIPLÔMES',
        style: 'classicSection'
      });
      cv.formations.forEach((f) => {
        content.push({
          columns: [
            { text: f.diplome, bold: true, fontSize: 10.5, color: '#0f172a' },
            { text: f.annee, alignment: 'right', fontSize: 9.5, color: '#475569', bold: true }
          ]
        });
        content.push({
          text: `${f.etablissement}${f.lieu ? ` — ${f.lieu}` : ''}`,
          fontSize: 9.5,
          color: '#475569',
          margin: [0, 1, 0, 8]
        });
      });
    }

    // Compétences & Langues
    const hasComp = Array.isArray(cv.competences) && cv.competences.length > 0;
    const hasLang = Array.isArray(cv.langues) && cv.langues.length > 0;
    const hasLois = Array.isArray(cv.centres_interet) && cv.centres_interet.length > 0;

    if (hasComp || hasLang || hasLois) {
      content.push({
        text: 'COMPÉTENCES & INFORMATIONS COMPLÉMENTAIRES',
        style: 'classicSection'
      });

      if (hasComp) {
        content.push({
          text: [
            { text: 'Compétences : ', bold: true, color: '#0f172a', fontSize: 9.5 },
            { text: cv.competences.join(', '), color: '#334155', fontSize: 9.5 }
          ],
          margin: [0, 0, 0, 4]
        });
      }

      if (hasLang) {
        content.push({
          text: [
            { text: 'Langues : ', bold: true, color: '#0f172a', fontSize: 9.5 },
            { text: cv.langues.map((l) => `${l.langue} (${l.niveau})`).join(', '), color: '#334155', fontSize: 9.5 }
          ],
          margin: [0, 0, 0, 4]
        });
      }

      if (hasLois) {
        content.push({
          text: [
            { text: "Centres d'intérêt : ", bold: true, color: '#0f172a', fontSize: 9.5 },
            { text: cv.centres_interet.join(', '), color: '#334155', fontSize: 9.5 }
          ],
          margin: [0, 0, 0, 6]
        });
      }
    }

    const docDefinition: any = {
      pageSize: 'A4',
      pageMargins: [40, 36, 40, 36],
      content,
      styles: {
        classicSection: {
          fontSize: 11,
          bold: true,
          color: '#1e293b',
          margin: [0, 10, 0, 6]
        }
      }
    };

    (pdfMake as any).createPdf(docDefinition).download(filename);
  }
}

// ============================================================================
// CV : EXPORT DOCX (docx)
// ============================================================================

export async function downloadCvDocx(
  cv: CvOutputDocument,
  styleOrOptions?: 'classique' | 'moderne' | CvDesignOptions
): Promise<void> {
  return downloadCvDocxEngine(cv, styleOrOptions);
}

async function _legacyDownloadCvDocx(
  cv: CvOutputDocument,
  style: 'classique' | 'moderne' = 'classique'
): Promise<void> {
  const cleanName = sanitizeFileName(cv.identite?.nom || 'Curriculum_Vitae');
  const filename = `CV_${cleanName}.docx`;

  const children: Array<Paragraph | Table> = [];

  // En-tête (Nom, Titre visé, Coordonnées)
  children.push(
    new Paragraph({
      alignment: style === 'classique' ? AlignmentType.CENTER : AlignmentType.LEFT,
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: cv.identite?.nom || 'Curriculum Vitae',
          bold: true,
          size: 36, // 18pt
          color: '0F172A',
          font: 'Calibri'
        })
      ]
    })
  );

  if (cv.identite?.titre_vise) {
    children.push(
      new Paragraph({
        alignment: style === 'classique' ? AlignmentType.CENTER : AlignmentType.LEFT,
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: cv.identite.titre_vise.toUpperCase(),
            bold: true,
            size: 24, // 12pt
            color: '2563EB',
            font: 'Calibri'
          })
        ]
      })
    );
  }

  const contactList = [
    cv.identite?.email,
    cv.identite?.telephone,
    cv.identite?.ville
  ].filter(Boolean);

  if (contactList.length > 0) {
    children.push(
      new Paragraph({
        alignment: style === 'classique' ? AlignmentType.CENTER : AlignmentType.LEFT,
        spacing: { after: 240 },
        children: [
          new TextRun({
            text: contactList.join('  •  '),
            size: 20, // 10pt
            color: '64748B',
            font: 'Calibri'
          })
        ]
      })
    );
  }

  // Profil
  if (cv.resume) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
        children: [
          new TextRun({
            text: 'PROFIL',
            bold: true,
            size: 24,
            color: '1E293B',
            font: 'Calibri'
          })
        ]
      }),
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: cv.resume,
            size: 21,
            color: '334155',
            font: 'Calibri'
          })
        ]
      })
    );
  }

  // Expériences
  if (Array.isArray(cv.experiences) && cv.experiences.length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
        children: [
          new TextRun({
            text: 'EXPÉRIENCES PROFESSIONNELLES',
            bold: true,
            size: 24,
            color: '1E293B',
            font: 'Calibri'
          })
        ]
      })
    );

    cv.experiences.forEach((exp) => {
      children.push(
        new Paragraph({
          spacing: { before: 100, after: 40 },
          children: [
            new TextRun({
              text: exp.poste,
              bold: true,
              size: 22,
              color: '0F172A',
              font: 'Calibri'
            }),
            new TextRun({
              text: `  |  ${exp.employeur}${exp.lieu ? ` — ${exp.lieu}` : ''}`,
              italics: true,
              size: 20,
              color: '475569',
              font: 'Calibri'
            }),
            new TextRun({
              text: `  (${exp.periode})`,
              bold: true,
              size: 19,
              color: '2563EB',
              font: 'Calibri'
            })
          ]
        })
      );

      if (Array.isArray(exp.points)) {
        exp.points.forEach((pt) => {
          children.push(
            new Paragraph({
              bullet: { level: 0 },
              spacing: { after: 40 },
              children: [
                new TextRun({
                  text: pt,
                  size: 20,
                  color: '334155',
                  font: 'Calibri'
                })
              ]
            })
          );
        });
      }
    });
  }

  // Formations
  if (Array.isArray(cv.formations) && cv.formations.length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
        children: [
          new TextRun({
            text: 'FORMATIONS & DIPLÔMES',
            bold: true,
            size: 24,
            color: '1E293B',
            font: 'Calibri'
          })
        ]
      })
    );

    cv.formations.forEach((f) => {
      children.push(
        new Paragraph({
          spacing: { before: 80, after: 60 },
          children: [
            new TextRun({
              text: f.diplome,
              bold: true,
              size: 22,
              color: '0F172A',
              font: 'Calibri'
            }),
            new TextRun({
              text: `  |  ${f.etablissement}${f.lieu ? ` — ${f.lieu}` : ''}`,
              size: 20,
              color: '475569',
              font: 'Calibri'
            }),
            new TextRun({
              text: `  (${f.annee})`,
              size: 19,
              color: '64748B',
              font: 'Calibri'
            })
          ]
        })
      );
    });
  }

  // Compétences, Langues, Loisirs
  const hasComp = Array.isArray(cv.competences) && cv.competences.length > 0;
  const hasLang = Array.isArray(cv.langues) && cv.langues.length > 0;
  const hasLois = Array.isArray(cv.centres_interet) && cv.centres_interet.length > 0;

  if (hasComp || hasLang || hasLois) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
        children: [
          new TextRun({
            text: 'COMPÉTENCES & INFORMATIONS COMPLÉMENTAIRES',
            bold: true,
            size: 24,
            color: '1E293B',
            font: 'Calibri'
          })
        ]
      })
    );

    if (hasComp) {
      children.push(
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({ text: 'Compétences : ', bold: true, size: 21, color: '0F172A', font: 'Calibri' }),
            new TextRun({ text: cv.competences.join(', '), size: 21, color: '334155', font: 'Calibri' })
          ]
        })
      );
    }

    if (hasLang) {
      children.push(
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({ text: 'Langues : ', bold: true, size: 21, color: '0F172A', font: 'Calibri' }),
            new TextRun({
              text: cv.langues.map((l) => `${l.langue} (${l.niveau})`).join(', '),
              size: 21,
              color: '334155',
              font: 'Calibri'
            })
          ]
        })
      );
    }

    if (hasLois) {
      children.push(
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({ text: "Centres d'intérêt : ", bold: true, size: 21, color: '0F172A', font: 'Calibri' }),
            new TextRun({ text: cv.centres_interet.join(', '), size: 21, color: '334155', font: 'Calibri' })
          ]
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1100, right: 1100, bottom: 1100, left: 1100 }
          }
        },
        children
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  triggerBlobDownload(blob, filename);
}

// ============================================================================
// LETTRE ADMINISTRATIVE : EXPORT PDF (pdfmake)
// ============================================================================

export async function downloadLettrePdf(
  lettre: LettreOutputDocument,
  optionsOrStyle?: LetterDesignOptions | string
): Promise<void> {
  return downloadLettrePdfEngine(lettre, optionsOrStyle);
}

function _legacyDownloadLettrePdf(lettre: LettreOutputDocument): void {
  const cleanExp = sanitizeFileName(lettre.expediteur?.nom || 'Lettre');
  const filename = `Lettre_${cleanExp}.pdf`;

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

  const content: any[] = [];

  // Table en-tête expéditeur (gauche) & destinataire (droite)
  content.push({
    columns: [
      { stack: leftExpStack, width: '50%' },
      { stack: rightDestStack, width: '50%', margin: [20, 16, 0, 0] }
    ],
    margin: [0, 0, 0, 24]
  });

  // Lieu et date (aligné à droite)
  if (lettre.lieu_date) {
    content.push({
      text: lettre.lieu_date,
      alignment: 'right',
      fontSize: 10,
      color: '#334155',
      margin: [0, 0, 0, 16]
    });
  }

  // Objet (en gras)
  if (lettre.objet) {
    content.push({
      text: [
        { text: 'Objet : ', bold: true, color: '#0f172a' },
        { text: lettre.objet, bold: true, color: '#1e293b' }
      ],
      fontSize: 10.5,
      margin: [0, 0, 0, 18]
    });
  }

  // Formule d'ouverture
  if (lettre.ouverture) {
    content.push({
      text: lettre.ouverture,
      fontSize: 10.5,
      bold: true,
      color: '#0f172a',
      margin: [0, 0, 0, 12]
    });
  }

  // Paragraphes du corps
  if (Array.isArray(lettre.paragraphes)) {
    lettre.paragraphes.forEach((p) => {
      content.push({
        text: p,
        fontSize: 10.5,
        lineHeight: 1.35,
        alignment: 'justify',
        color: '#334155',
        margin: [0, 0, 0, 10]
      });
    });
  }

  // Formule de politesse
  if (lettre.formule_politesse) {
    content.push({
      text: lettre.formule_politesse,
      fontSize: 10.5,
      lineHeight: 1.35,
      color: '#334155',
      margin: [0, 6, 0, 24]
    });
  }

  // Signature (alignée à droite)
  if (lettre.signature || lettre.expediteur?.nom) {
    content.push({
      text: lettre.signature || lettre.expediteur?.nom,
      alignment: 'right',
      bold: true,
      fontSize: 11,
      color: '#0f172a',
      margin: [0, 10, 30, 0]
    });
  }

  const docDefinition: any = {
    pageSize: 'A4',
    pageMargins: [50, 48, 50, 48],
    content
  };

  (pdfMake as any).createPdf(docDefinition).download(filename);
}

// ============================================================================
// LETTRE ADMINISTRATIVE : EXPORT DOCX (docx)
// ============================================================================

export async function downloadLettreDocx(
  lettre: LettreOutputDocument,
  optionsOrStyle?: LetterDesignOptions | string
): Promise<void> {
  return downloadLettreDocxEngine(lettre, optionsOrStyle);
}

async function _legacyDownloadLettreDocx(lettre: LettreOutputDocument): Promise<void> {
  const cleanExp = sanitizeFileName(lettre.expediteur?.nom || 'Lettre');
  const filename = `Lettre_${cleanExp}.docx`;

  const children: Array<Paragraph | Table> = [];

  // Table pour expéditeur (gauche) et destinataire (droite)
  const leftLines: Paragraph[] = [];
  if (lettre.expediteur?.nom) {
    leftLines.push(new Paragraph({ children: [new TextRun({ text: lettre.expediteur.nom, bold: true, size: 21, font: 'Calibri' })] }));
  }
  if (lettre.expediteur?.adresse) {
    leftLines.push(new Paragraph({ children: [new TextRun({ text: lettre.expediteur.adresse, size: 20, color: '334155', font: 'Calibri' })] }));
  }
  if (lettre.expediteur?.telephone) {
    leftLines.push(new Paragraph({ children: [new TextRun({ text: lettre.expediteur.telephone, size: 20, color: '334155', font: 'Calibri' })] }));
  }
  if (lettre.expediteur?.email) {
    leftLines.push(new Paragraph({ children: [new TextRun({ text: lettre.expediteur.email, size: 20, color: '334155', font: 'Calibri' })] }));
  }

  const rightLines: Paragraph[] = [];
  if (lettre.destinataire?.organisation) {
    rightLines.push(new Paragraph({ children: [new TextRun({ text: lettre.destinataire.organisation, bold: true, size: 22, font: 'Calibri' })] }));
  }
  if (lettre.destinataire?.fonction) {
    rightLines.push(new Paragraph({ children: [new TextRun({ text: lettre.destinataire.fonction, bold: true, size: 21, font: 'Calibri' })] }));
  }
  if (lettre.destinataire?.nom) {
    rightLines.push(new Paragraph({ children: [new TextRun({ text: lettre.destinataire.nom, size: 20, color: '334155', font: 'Calibri' })] }));
  }
  if (lettre.destinataire?.adresse) {
    rightLines.push(new Paragraph({ children: [new TextRun({ text: lettre.destinataire.adresse, size: 20, color: '475569', font: 'Calibri' })] }));
  }

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: leftLines.length > 0 ? leftLines : [new Paragraph({})]
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: rightLines.length > 0 ? rightLines : [new Paragraph({})]
            })
          ]
        })
      ]
    })
  );

  // Lieu et Date
  if (lettre.lieu_date) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 240, after: 200 },
        children: [
          new TextRun({
            text: lettre.lieu_date,
            size: 21,
            color: '334155',
            font: 'Calibri'
          })
        ]
      })
    );
  }

  // Objet
  if (lettre.objet) {
    children.push(
      new Paragraph({
        spacing: { before: 100, after: 240 },
        children: [
          new TextRun({ text: 'Objet : ', bold: true, size: 22, color: '0F172A', font: 'Calibri' }),
          new TextRun({ text: lettre.objet, bold: true, size: 22, color: '1E293B', font: 'Calibri' })
        ]
      })
    );
  }

  // Ouverture
  if (lettre.ouverture) {
    children.push(
      new Paragraph({
        spacing: { after: 160 },
        children: [
          new TextRun({ text: lettre.ouverture, bold: true, size: 22, color: '0F172A', font: 'Calibri' })
        ]
      })
    );
  }

  // Paragraphes
  if (Array.isArray(lettre.paragraphes)) {
    lettre.paragraphes.forEach((p) => {
      children.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 180, line: 320 },
          children: [
            new TextRun({ text: p, size: 21, color: '334155', font: 'Calibri' })
          ]
        })
      );
    });
  }

  // Formule de politesse
  if (lettre.formule_politesse) {
    children.push(
      new Paragraph({
        spacing: { before: 100, after: 280, line: 320 },
        children: [
          new TextRun({ text: lettre.formule_politesse, size: 21, color: '334155', font: 'Calibri' })
        ]
      })
    );
  }

  // Signature
  if (lettre.signature || lettre.expediteur?.nom) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 120, after: 100 },
        children: [
          new TextRun({
            text: lettre.signature || lettre.expediteur?.nom,
            bold: true,
            size: 22,
            color: '0F172A',
            font: 'Calibri'
          })
        ]
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
          }
        },
        children
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  triggerBlobDownload(blob, filename);
}

// ============================================================================
// FORMATAGE MONÉTAIRE (Séparateur de milliers, 0 décimale FCFA, 2 EUR/USD)
// ============================================================================

export function formatMoney(amount: number | undefined | null, currency: string = 'FCFA'): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '0 ' + currency;
  }

  const curUpper = (currency || 'FCFA').trim().toUpperCase();
  const isFcfa = curUpper.includes('FCFA') || curUpper === 'XOF' || curUpper === 'XAF';

  if (isFcfa) {
    const rounded = Math.round(amount);
    const formatted = rounded.toLocaleString('fr-FR', {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0
    });
    return `${formatted} FCFA`;
  }

  const formatted = amount.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  if (curUpper === 'EUR') return `${formatted} €`;
  if (curUpper === 'USD') return `${formatted} $`;
  return `${formatted} ${currency}`;
}

// ============================================================================
// DEVIS & FACTURE : EXPORT PDF (pdfmake)
// ============================================================================

export async function downloadInvoicePdf(
  invoice: InvoiceOutputDocument,
  styleOrOptions?: 'sobre' | 'colore' | InvoiceDesignOptions | string
): Promise<void> {
  return downloadInvoicePdfEngine(invoice, styleOrOptions);
}

function _legacyDownloadInvoicePdf(
  invoice: InvoiceOutputDocument,
  style: 'sobre' | 'colore' = 'sobre'
): void {
  const isInvoice = invoice.type === 'facture';
  const docTitle = isInvoice ? 'FACTURE' : 'DEVIS';
  const cleanNum = sanitizeFileName(invoice.numero || (isInvoice ? 'Facture' : 'Devis'));
  const filename = `${docTitle}_${cleanNum}.pdf`;

  const primaryColor = style === 'colore' ? '#2563eb' : '#0f172a';
  const tableHeaderBg = style === 'colore' ? '#f0f7ff' : '#f8fafc';
  const tableHeaderColor = style === 'colore' ? '#1e40af' : '#0f172a';
  const borderRuleColor = style === 'colore' ? '#93c5fd' : '#e2e8f0';

  const content: any[] = [];

  // 1. En-tête : Titre & Numéro (gauche) + Dates & Délais (droite)
  const headerRightStack: any[] = [
    {
      text: [
        { text: "Date d'émission : ", bold: true, color: '#475569', fontSize: 9.5 },
        { text: invoice.date || '', bold: true, color: '#0f172a', fontSize: 9.5 }
      ],
      alignment: 'right',
      margin: [0, 0, 0, 3]
    }
  ];

  if (isInvoice && invoice.echeance) {
    headerRightStack.push({
      text: [
        { text: "Date d'échéance : ", bold: true, color: '#475569', fontSize: 9.5 },
        { text: invoice.echeance, bold: true, color: primaryColor, fontSize: 9.5 }
      ],
      alignment: 'right',
      margin: [0, 0, 0, 3]
    });
  } else if (!isInvoice && invoice.validite) {
    headerRightStack.push({
      text: [
        { text: "Validité de l'offre : ", bold: true, color: '#475569', fontSize: 9.5 },
        { text: invoice.validite, bold: true, color: primaryColor, fontSize: 9.5 }
      ],
      alignment: 'right',
      margin: [0, 0, 0, 3]
    });
  }

  content.push({
    columns: [
      {
        width: '*',
        stack: [
          { text: docTitle, fontSize: 24, bold: true, color: primaryColor, characterSpacing: 1 },
          { text: `N° ${invoice.numero || ''}`, fontSize: 12, bold: true, color: '#475569', margin: [0, 2, 0, 0] }
        ]
      },
      {
        width: 240,
        stack: headerRightStack
      }
    ],
    margin: [0, 0, 0, 22]
  });

  // Séparateur fin
  content.push({
    canvas: [
      {
        type: 'line',
        x1: 0,
        y1: 0,
        x2: 515,
        y2: 0,
        lineWidth: 1.5,
        lineColor: borderRuleColor
      }
    ],
    margin: [0, 0, 0, 16]
  });

  // 2. Bloc Émetteur (gauche) et Client (droite)
  const emetteurStack: any[] = [
    { text: 'ÉMETTEUR', bold: true, fontSize: 9, color: primaryColor, margin: [0, 0, 0, 4] },
    { text: invoice.emetteur?.nom || '', bold: true, fontSize: 11, color: '#0f172a' }
  ];
  if (invoice.emetteur?.adresse) {
    emetteurStack.push({ text: invoice.emetteur.adresse, fontSize: 9.5, color: '#334155' });
  }
  if (invoice.emetteur?.telephone) {
    emetteurStack.push({ text: `Tél : ${invoice.emetteur.telephone}`, fontSize: 9.5, color: '#334155' });
  }
  if (invoice.emetteur?.email) {
    emetteurStack.push({ text: `Email : ${invoice.emetteur.email}`, fontSize: 9.5, color: '#334155' });
  }
  if (invoice.emetteur?.identifiant_fiscal) {
    emetteurStack.push({
      text: `NIF / Réf. fiscale : ${invoice.emetteur.identifiant_fiscal}`,
      fontSize: 9,
      color: '#64748b',
      margin: [0, 2, 0, 0]
    });
  }

  const clientStack: any[] = [
    { text: 'CLIENT', bold: true, fontSize: 9, color: primaryColor, margin: [0, 0, 0, 4] },
    { text: invoice.client?.nom || '', bold: true, fontSize: 11, color: '#0f172a' }
  ];
  if (invoice.client?.adresse) {
    clientStack.push({ text: invoice.client.adresse, fontSize: 9.5, color: '#334155' });
  }
  if (invoice.client?.telephone) {
    clientStack.push({ text: `Tél : ${invoice.client.telephone}`, fontSize: 9.5, color: '#334155' });
  }
  if (invoice.client?.email) {
    clientStack.push({ text: `Email : ${invoice.client.email}`, fontSize: 9.5, color: '#334155' });
  }
  if (invoice.client?.identifiant_fiscal) {
    clientStack.push({
      text: `NIF / Réf. fiscale : ${invoice.client.identifiant_fiscal}`,
      fontSize: 9,
      color: '#64748b',
      margin: [0, 2, 0, 0]
    });
  }

  content.push({
    columns: [
      {
        width: '50%',
        stack: emetteurStack
      },
      {
        width: '50%',
        stack: clientStack
      }
    ],
    margin: [0, 0, 0, 22]
  });

  // 3. Tableau des lignes
  const tableBody: any[] = [
    [
      { text: 'Description', bold: true, fontSize: 9.5, color: tableHeaderColor, fillColor: tableHeaderBg },
      { text: 'Qté', bold: true, fontSize: 9.5, alignment: 'center', color: tableHeaderColor, fillColor: tableHeaderBg },
      { text: 'Prix unitaire HT', bold: true, fontSize: 9.5, alignment: 'right', color: tableHeaderColor, fillColor: tableHeaderBg },
      { text: 'Remise', bold: true, fontSize: 9.5, alignment: 'center', color: tableHeaderColor, fillColor: tableHeaderBg },
      { text: 'Total HT', bold: true, fontSize: 9.5, alignment: 'right', color: tableHeaderColor, fillColor: tableHeaderBg }
    ]
  ];

  if (Array.isArray(invoice.lignes)) {
    invoice.lignes.forEach((line) => {
      const remiseText = line.remise_pct && line.remise_pct > 0 ? `${line.remise_pct}%` : '-';
      tableBody.push([
        { text: line.description || '', fontSize: 9.5, color: '#0f172a', margin: [0, 3, 0, 3] },
        { text: String(line.quantite || 1), fontSize: 9.5, alignment: 'center', color: '#334155', margin: [0, 3, 0, 3] },
        { text: formatMoney(line.prix_unitaire, invoice.devise), fontSize: 9.5, alignment: 'right', color: '#334155', margin: [0, 3, 0, 3] },
        { text: remiseText, fontSize: 9.5, alignment: 'center', color: '#64748b', margin: [0, 3, 0, 3] },
        { text: formatMoney(line.total_ht, invoice.devise), fontSize: 9.5, bold: true, alignment: 'right', color: '#0f172a', margin: [0, 3, 0, 3] }
      ]);
    });
  }

  content.push({
    table: {
      headerRows: 1,
      widths: ['*', 40, 95, 55, 95],
      body: tableBody
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0,
      hLineColor: () => '#e2e8f0'
    },
    margin: [0, 0, 0, 16]
  });

  // 4. Bloc des Totaux (aligné à droite)
  const totalsTableBody: any[] = [];

  // Sous-total HT
  totalsTableBody.push([
    { text: 'Sous-total HT :', bold: true, alignment: 'right', fontSize: 9.5, color: '#475569' },
    { text: formatMoney(invoice.sous_total_ht, invoice.devise), bold: true, alignment: 'right', fontSize: 9.5, color: '#0f172a' }
  ]);

  // Remise globale si > 0
  if (invoice.remise_globale && invoice.remise_globale > 0) {
    totalsTableBody.push([
      { text: `Remise globale (${invoice.remise_globale_pct ?? 0}%) :`, alignment: 'right', fontSize: 9.5, color: '#dc2626' },
      { text: `- ${formatMoney(invoice.remise_globale, invoice.devise)}`, alignment: 'right', fontSize: 9.5, color: '#dc2626' }
    ]);
    if (invoice.base_ht !== undefined) {
      totalsTableBody.push([
        { text: 'Base HT :', alignment: 'right', fontSize: 9.5, color: '#475569' },
        { text: formatMoney(invoice.base_ht, invoice.devise), alignment: 'right', fontSize: 9.5, color: '#0f172a' }
      ]);
    }
  }

  // TVA si taux > 0 et montant > 0
  if (invoice.tva_montant && invoice.tva_montant > 0) {
    totalsTableBody.push([
      { text: `TVA (${invoice.tva_taux ?? 0}%) :`, alignment: 'right', fontSize: 9.5, color: '#475569' },
      { text: formatMoney(invoice.tva_montant, invoice.devise), alignment: 'right', fontSize: 9.5, color: '#0f172a' }
    ]);
  }

  // Total TTC
  totalsTableBody.push([
    { text: 'TOTAL TTC :', bold: true, alignment: 'right', fontSize: 11, color: primaryColor },
    { text: formatMoney(invoice.total_ttc, invoice.devise), bold: true, alignment: 'right', fontSize: 12, color: primaryColor }
  ]);

  // Acompte & Reste à payer pour une facture si acompte > 0
  if (isInvoice && invoice.acompte && invoice.acompte > 0) {
    totalsTableBody.push([
      { text: 'Acompte déjà versé :', alignment: 'right', fontSize: 9.5, color: '#16a34a' },
      { text: `- ${formatMoney(invoice.acompte, invoice.devise)}`, alignment: 'right', fontSize: 9.5, color: '#16a34a' }
    ]);
    totalsTableBody.push([
      { text: 'RESTE À PAYER :', bold: true, alignment: 'right', fontSize: 11, color: '#0f172a' },
      { text: formatMoney(invoice.reste_a_payer, invoice.devise), bold: true, alignment: 'right', fontSize: 12, color: '#0f172a' }
    ]);
  }

  content.push({
    columns: [
      { width: '*', text: '' },
      {
        width: 250,
        table: {
          widths: [130, 110],
          body: totalsTableBody
        },
        layout: 'noBorders'
      }
    ],
    margin: [0, 0, 0, 24]
  });

  // 5. Conditions de paiement, mentions légales, notes
  if (invoice.conditions_paiement) {
    content.push({
      text: 'Conditions de règlement :',
      bold: true,
      fontSize: 9.5,
      color: '#0f172a',
      margin: [0, 0, 0, 2]
    });
    content.push({
      text: invoice.conditions_paiement,
      fontSize: 9,
      color: '#334155',
      margin: [0, 0, 0, 10]
    });
  }

  if (invoice.mentions) {
    content.push({
      text: 'Mentions légales & fiscales :',
      bold: true,
      fontSize: 9,
      color: '#0f172a',
      margin: [0, 0, 0, 2]
    });
    content.push({
      text: invoice.mentions,
      fontSize: 8.5,
      color: '#64748b',
      lineHeight: 1.25,
      margin: [0, 0, 0, 10]
    });
  }

  if (invoice.notes) {
    content.push({
      text: 'Notes & Remarques :',
      bold: true,
      fontSize: 9,
      color: '#0f172a',
      margin: [0, 0, 0, 2]
    });
    content.push({
      text: invoice.notes,
      fontSize: 8.5,
      color: '#475569',
      margin: [0, 0, 0, 8]
    });
  }

  const docDefinition: any = {
    pageSize: 'A4',
    pageMargins: [42, 38, 42, 38],
    content
  };

  (pdfMake as any).createPdf(docDefinition).download(filename);
}

// ============================================================================
// DEVIS & FACTURE : EXPORT DOCX (docx)
// ============================================================================

export async function downloadInvoiceDocx(
  invoice: InvoiceOutputDocument,
  styleOrOptions?: 'sobre' | 'colore' | InvoiceDesignOptions | string
): Promise<void> {
  return downloadInvoiceDocxEngine(invoice, styleOrOptions);
}

async function _legacyDownloadInvoiceDocx(
  invoice: InvoiceOutputDocument,
  style: 'sobre' | 'colore' = 'sobre'
): Promise<void> {
  const isInvoice = invoice.type === 'facture';
  const docTitle = isInvoice ? 'FACTURE' : 'DEVIS';
  const cleanNum = sanitizeFileName(invoice.numero || (isInvoice ? 'Facture' : 'Devis'));
  const filename = `${docTitle}_${cleanNum}.docx`;

  const children: Array<Paragraph | Table> = [];

  // 1. En-tête titre et métadonnées
  children.push(
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: docTitle,
          bold: true,
          size: 38,
          color: style === 'colore' ? '2563EB' : '0F172A',
          font: 'Calibri'
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 140 },
      children: [
        new TextRun({
          text: `N° ${invoice.numero || ''}`,
          bold: true,
          size: 24,
          color: '475569',
          font: 'Calibri'
        }),
        new TextRun({
          text: `   |   Date d'émission : ${invoice.date || ''}`,
          size: 20,
          color: '64748B',
          font: 'Calibri'
        }),
        ...(isInvoice && invoice.echeance
          ? [
              new TextRun({
                text: `   |   Échéance : ${invoice.echeance}`,
                bold: true,
                size: 20,
                color: '2563EB',
                font: 'Calibri'
              })
            ]
          : !isInvoice && invoice.validite
          ? [
              new TextRun({
                text: `   |   Validité : ${invoice.validite}`,
                bold: true,
                size: 20,
                color: '2563EB',
                font: 'Calibri'
              })
            ]
          : [])
      ]
    })
  );

  // 2. Bloc Émetteur et Client en tableau 2 colonnes
  const emetteurLines: Paragraph[] = [
    new Paragraph({
      spacing: { after: 40 },
      children: [new TextRun({ text: 'ÉMETTEUR', bold: true, size: 19, color: '2563EB', font: 'Calibri' })]
    }),
    new Paragraph({
      spacing: { after: 30 },
      children: [new TextRun({ text: invoice.emetteur?.nom || '', bold: true, size: 22, color: '0F172A', font: 'Calibri' })]
    })
  ];
  if (invoice.emetteur?.adresse) {
    emetteurLines.push(new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: invoice.emetteur.adresse, size: 19, color: '334155', font: 'Calibri' })] }));
  }
  if (invoice.emetteur?.telephone) {
    emetteurLines.push(new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: `Tél : ${invoice.emetteur.telephone}`, size: 19, color: '334155', font: 'Calibri' })] }));
  }
  if (invoice.emetteur?.email) {
    emetteurLines.push(new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: `Email : ${invoice.emetteur.email}`, size: 19, color: '334155', font: 'Calibri' })] }));
  }
  if (invoice.emetteur?.identifiant_fiscal) {
    emetteurLines.push(new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: `NIF : ${invoice.emetteur.identifiant_fiscal}`, size: 18, color: '64748B', font: 'Calibri' })] }));
  }

  const clientLines: Paragraph[] = [
    new Paragraph({
      spacing: { after: 40 },
      children: [new TextRun({ text: 'CLIENT', bold: true, size: 19, color: '2563EB', font: 'Calibri' })]
    }),
    new Paragraph({
      spacing: { after: 30 },
      children: [new TextRun({ text: invoice.client?.nom || '', bold: true, size: 22, color: '0F172A', font: 'Calibri' })]
    })
  ];
  if (invoice.client?.adresse) {
    clientLines.push(new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: invoice.client.adresse, size: 19, color: '334155', font: 'Calibri' })] }));
  }
  if (invoice.client?.telephone) {
    clientLines.push(new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: `Tél : ${invoice.client.telephone}`, size: 19, color: '334155', font: 'Calibri' })] }));
  }
  if (invoice.client?.email) {
    clientLines.push(new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: `Email : ${invoice.client.email}`, size: 19, color: '334155', font: 'Calibri' })] }));
  }
  if (invoice.client?.identifiant_fiscal) {
    clientLines.push(new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: `NIF : ${invoice.client.identifiant_fiscal}`, size: 18, color: '64748B', font: 'Calibri' })] }));
  }

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: emetteurLines }),
            new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: clientLines })
          ]
        })
      ]
    }),
    new Paragraph({ spacing: { after: 240 } })
  );

  // 3. Tableau des lignes
  const docxRows: TableRow[] = [
    new TableRow({
      children: [
        new TableCell({ width: { size: 45, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: 'Description', bold: true, size: 20, font: 'Calibri' })] })] }),
        new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Qté', bold: true, size: 20, font: 'Calibri' })] })] }),
        new TableCell({ width: { size: 18, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Prix unitaire HT', bold: true, size: 20, font: 'Calibri' })] })] }),
        new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Remise', bold: true, size: 20, font: 'Calibri' })] })] }),
        new TableCell({ width: { size: 17, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Total HT', bold: true, size: 20, font: 'Calibri' })] })] })
      ]
    })
  ];

  if (Array.isArray(invoice.lignes)) {
    invoice.lignes.forEach((l) => {
      const remiseText = l.remise_pct && l.remise_pct > 0 ? `${l.remise_pct}%` : '-';
      docxRows.push(
        new TableRow({
          children: [
            new TableCell({ width: { size: 45, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: l.description, size: 19, font: 'Calibri' })] })] }),
            new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(l.quantite || 1), size: 19, font: 'Calibri' })] })] }),
            new TableCell({ width: { size: 18, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: formatMoney(l.prix_unitaire, invoice.devise), size: 19, font: 'Calibri' })] })] }),
            new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: remiseText, size: 19, font: 'Calibri' })] })] }),
            new TableCell({ width: { size: 17, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: formatMoney(l.total_ht, invoice.devise), bold: true, size: 19, font: 'Calibri' })] })] })
          ]
        })
      );
    });
  }

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: docxRows
    }),
    new Paragraph({ spacing: { after: 180 } })
  );

  // 4. Totaux
  children.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 40 },
      children: [
        new TextRun({ text: 'Sous-total HT : ', bold: true, size: 20, color: '475569', font: 'Calibri' }),
        new TextRun({ text: formatMoney(invoice.sous_total_ht, invoice.devise), bold: true, size: 20, color: '0F172A', font: 'Calibri' })
      ]
    })
  );

  if (invoice.remise_globale && invoice.remise_globale > 0) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 40 },
        children: [
          new TextRun({ text: `Remise globale (${invoice.remise_globale_pct ?? 0}%) : `, size: 20, color: 'DC2626', font: 'Calibri' }),
          new TextRun({ text: `- ${formatMoney(invoice.remise_globale, invoice.devise)}`, size: 20, color: 'DC2626', font: 'Calibri' })
        ]
      })
    );
    if (invoice.base_ht !== undefined) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { after: 40 },
          children: [
            new TextRun({ text: 'Base HT : ', size: 20, color: '475569', font: 'Calibri' }),
            new TextRun({ text: formatMoney(invoice.base_ht, invoice.devise), size: 20, color: '0F172A', font: 'Calibri' })
          ]
        })
      );
    }
  }

  if (invoice.tva_montant && invoice.tva_montant > 0) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 40 },
        children: [
          new TextRun({ text: `TVA (${invoice.tva_taux ?? 0}%) : `, size: 20, color: '475569', font: 'Calibri' }),
          new TextRun({ text: formatMoney(invoice.tva_montant, invoice.devise), size: 20, color: '0F172A', font: 'Calibri' })
        ]
      })
    );
  }

  children.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 80, after: 80 },
      children: [
        new TextRun({ text: 'TOTAL TTC : ', bold: true, size: 24, color: '2563EB', font: 'Calibri' }),
        new TextRun({ text: formatMoney(invoice.total_ttc, invoice.devise), bold: true, size: 26, color: '2563EB', font: 'Calibri' })
      ]
    })
  );

  if (isInvoice && invoice.acompte && invoice.acompte > 0) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 40 },
        children: [
          new TextRun({ text: 'Acompte déjà versé : ', size: 20, color: '16A34A', font: 'Calibri' }),
          new TextRun({ text: `- ${formatMoney(invoice.acompte, invoice.devise)}`, size: 20, color: '16A34A', font: 'Calibri' })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 60, after: 120 },
        children: [
          new TextRun({ text: 'RESTE À PAYER : ', bold: true, size: 24, color: '0F172A', font: 'Calibri' }),
          new TextRun({ text: formatMoney(invoice.reste_a_payer, invoice.devise), bold: true, size: 26, color: '0F172A', font: 'Calibri' })
        ]
      })
    );
  }

  // 5. Conditions, Mentions & Notes
  if (invoice.conditions_paiement) {
    children.push(
      new Paragraph({
        spacing: { before: 200, after: 40 },
        children: [new TextRun({ text: 'Conditions de règlement :', bold: true, size: 20, font: 'Calibri' })]
      }),
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun({ text: invoice.conditions_paiement, size: 19, color: '334155', font: 'Calibri' })]
      })
    );
  }

  if (invoice.mentions) {
    children.push(
      new Paragraph({
        spacing: { before: 100, after: 40 },
        children: [new TextRun({ text: 'Mentions légales & fiscales :', bold: true, size: 19, font: 'Calibri' })]
      }),
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun({ text: invoice.mentions, size: 18, color: '64748B', font: 'Calibri' })]
      })
    );
  }

  if (invoice.notes) {
    children.push(
      new Paragraph({
        spacing: { before: 100, after: 40 },
        children: [new TextRun({ text: 'Notes & Remarques :', bold: true, size: 19, font: 'Calibri' })]
      }),
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun({ text: invoice.notes, size: 18, color: '475569', font: 'Calibri' })]
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

// ============================================================================
// FORMULAIRE IMPRIMABLE : EXPORT PDF (pdfmake)
// ============================================================================

export async function downloadFormPdf(form: FormDocument): Promise<void> {
  const cleanTitle = sanitizeFileName(form.titre || 'Formulaire');
  const filename = `Formulaire_${cleanTitle}.pdf`;

  const content: any[] = [];

  // En-tête principal du formulaire
  content.push({
    text: form.titre || 'Formulaire',
    fontSize: 20,
    bold: true,
    color: '#0f172a',
    margin: [0, 0, 0, 4]
  });

  if (form.description) {
    content.push({
      text: form.description,
      fontSize: 10,
      color: '#475569',
      lineHeight: 1.3,
      margin: [0, 0, 0, 14]
    });
  }

  // Ligne de séparation
  content.push({
    canvas: [
      {
        type: 'line',
        x1: 0,
        y1: 0,
        x2: 515,
        y2: 0,
        lineWidth: 1.5,
        lineColor: '#2563eb'
      }
    ],
    margin: [0, 0, 0, 16]
  });

  // Parcourir les sections
  if (Array.isArray(form.sections)) {
    form.sections.forEach((section, sIdx) => {
      // Titre de section
      content.push({
        table: {
          widths: ['*'],
          body: [
            [
              {
                text: `${sIdx + 1}. ${section.titre || 'Section'}`,
                bold: true,
                fontSize: 11,
                color: '#1e293b',
                fillColor: '#f1f5f9',
                margin: [6, 4, 6, 4]
              }
            ]
          ]
        },
        layout: 'noBorders',
        margin: [0, 8, 0, 10]
      });

      // Champs de la section
      if (Array.isArray(section.champs)) {
        section.champs.forEach((champ) => {
          const fieldStack: any[] = [];

          const labelChildren: any[] = [
            { text: champ.libelle || 'Champ', bold: true, fontSize: 10, color: '#0f172a' }
          ];
          if (champ.obligatoire) {
            labelChildren.push({ text: ' *', bold: true, color: '#dc2626', fontSize: 10 });
          }

          fieldStack.push({
            text: labelChildren,
            margin: [0, 2, 0, 2]
          });

          if (champ.aide) {
            fieldStack.push({
              text: champ.aide,
              fontSize: 8.5,
              italics: true,
              color: '#64748b',
              margin: [0, 0, 0, 4]
            });
          }

          // Rendu imprimable selon le type
          switch (champ.type) {
            case 'texte_long':
              fieldStack.push({
                table: {
                  widths: ['*'],
                  body: [
                    [
                      {
                        text: '\n\n\n',
                        border: [true, true, true, true],
                        borderColor: ['#cbd5e1', '#cbd5e1', '#cbd5e1', '#cbd5e1']
                      }
                    ]
                  ]
                },
                margin: [0, 2, 0, 8]
              });
              break;

            case 'choix_unique':
              if (Array.isArray(champ.options) && champ.options.length > 0) {
                const optText = champ.options.map((opt) => `(   )  ${opt}`).join('      ');
                fieldStack.push({
                  text: optText,
                  fontSize: 9.5,
                  color: '#334155',
                  margin: [4, 4, 0, 8]
                });
              } else {
                fieldStack.push({
                  text: '(   )  Oui      (   )  Non',
                  fontSize: 9.5,
                  color: '#334155',
                  margin: [4, 4, 0, 8]
                });
              }
              break;

            case 'choix_multiple':
              if (Array.isArray(champ.options) && champ.options.length > 0) {
                const optText = champ.options.map((opt) => `[   ]  ${opt}`).join('      ');
                fieldStack.push({
                  text: optText,
                  fontSize: 9.5,
                  color: '#334155',
                  margin: [4, 4, 0, 8]
                });
              } else {
                fieldStack.push({
                  text: '[   ]  Option 1      [   ]  Option 2',
                  fontSize: 9.5,
                  color: '#334155',
                  margin: [4, 4, 0, 8]
                });
              }
              break;

            case 'case':
              fieldStack.push({
                text: `[   ]  J'accepte / Je confirme`,
                fontSize: 9.5,
                color: '#334155',
                margin: [4, 4, 0, 8]
              });
              break;

            case 'signature':
              fieldStack.push({
                columns: [
                  { width: '*', text: '' },
                  {
                    width: 220,
                    table: {
                      widths: ['*'],
                      body: [
                        [
                          {
                            text: 'Date et signature :\n\n\n\n',
                            fontSize: 9,
                            color: '#475569',
                            border: [true, true, true, true],
                            borderColor: ['#94a3b8', '#94a3b8', '#94a3b8', '#94a3b8']
                          }
                        ]
                      ]
                    },
                    margin: [0, 4, 0, 8]
                  }
                ]
              });
              break;

            case 'date':
              fieldStack.push({
                text: 'JJ / MM / AAAA  :   ____ / ____ / ________',
                fontSize: 9.5,
                color: '#64748b',
                margin: [0, 3, 0, 8]
              });
              break;

            default:
              // texte, email, telephone, nombre
              fieldStack.push({
                canvas: [
                  {
                    type: 'line',
                    x1: 0,
                    y1: 10,
                    x2: 515,
                    y2: 10,
                    lineWidth: 0.75,
                    lineColor: '#cbd5e1'
                  }
                ],
                margin: [0, 0, 0, 8]
              });
              break;
          }

          content.push({
            stack: fieldStack,
            margin: [4, 2, 0, 4]
          });
        });
      }
    });
  }

  const docDefinition: any = {
    pageSize: 'A4',
    pageMargins: [40, 36, 40, 36],
    content
  };

  (pdfMake as any).createPdf(docDefinition).download(filename);
}

// ============================================================================
// FORMULAIRE IMPRIMABLE : EXPORT DOCX (docx)
// ============================================================================

export async function downloadFormDocx(form: FormDocument): Promise<void> {
  const cleanTitle = sanitizeFileName(form.titre || 'Formulaire');
  const filename = `Formulaire_${cleanTitle}.docx`;

  const children: Array<Paragraph | Table> = [];

  // En-tête du document
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: form.titre || 'Formulaire',
          bold: true,
          size: 36,
          color: '0F172A',
          font: 'Calibri'
        })
      ]
    })
  );

  if (form.description) {
    children.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: form.description,
            italics: true,
            size: 21,
            color: '475569',
            font: 'Calibri'
          })
        ]
      })
    );
  }

  // Sections
  if (Array.isArray(form.sections)) {
    form.sections.forEach((section, sIdx) => {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 120 },
          children: [
            new TextRun({
              text: `${sIdx + 1}. ${section.titre || 'Section'}`,
              bold: true,
              size: 24,
              color: '2563EB',
              font: 'Calibri'
            })
          ]
        })
      );

      if (Array.isArray(section.champs)) {
        section.champs.forEach((champ) => {
          const runs: TextRun[] = [
            new TextRun({
              text: champ.libelle || 'Champ',
              bold: true,
              size: 21,
              color: '0F172A',
              font: 'Calibri'
            })
          ];

          if (champ.obligatoire) {
            runs.push(new TextRun({ text: ' *', bold: true, color: 'DC2626', size: 21 }));
          }

          if (champ.aide) {
            runs.push(
              new TextRun({
                text: `  (${champ.aide})`,
                italics: true,
                size: 19,
                color: '64748B',
                font: 'Calibri'
              })
            );
          }

          children.push(new Paragraph({ spacing: { before: 80, after: 40 }, children: runs }));

          // Ligne de réponse selon le type
          switch (champ.type) {
            case 'texte_long':
              children.push(
                new Paragraph({
                  spacing: { after: 120 },
                  children: [
                    new TextRun({
                      text: '___________________________________________________________________________\n___________________________________________________________________________\n___________________________________________________________________________',
                      size: 20,
                      color: '94A3B8',
                      font: 'Calibri'
                    })
                  ]
                })
              );
              break;

            case 'choix_unique':
              if (Array.isArray(champ.options) && champ.options.length > 0) {
                children.push(
                  new Paragraph({
                    spacing: { after: 100 },
                    children: [
                      new TextRun({
                        text: champ.options.map((opt) => `(   )  ${opt}`).join('      '),
                        size: 20,
                        color: '334155',
                        font: 'Calibri'
                      })
                    ]
                  })
                );
              } else {
                children.push(
                  new Paragraph({
                    spacing: { after: 100 },
                    children: [
                      new TextRun({
                        text: '(   )  Oui      (   )  Non',
                        size: 20,
                        color: '334155',
                        font: 'Calibri'
                      })
                    ]
                  })
                );
              }
              break;

            case 'choix_multiple':
              if (Array.isArray(champ.options) && champ.options.length > 0) {
                children.push(
                  new Paragraph({
                    spacing: { after: 100 },
                    children: [
                      new TextRun({
                        text: champ.options.map((opt) => `[   ]  ${opt}`).join('      '),
                        size: 20,
                        color: '334155',
                        font: 'Calibri'
                      })
                    ]
                  })
                );
              }
              break;

            case 'case':
              children.push(
                new Paragraph({
                  spacing: { after: 100 },
                  children: [
                    new TextRun({
                      text: `[   ]  J'accepte / Je confirme`,
                      size: 20,
                      color: '334155',
                      font: 'Calibri'
                    })
                  ]
                })
              );
              break;

            case 'signature':
              children.push(
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  spacing: { before: 100, after: 120 },
                  children: [
                    new TextRun({
                      text: 'Date et signature :\n\n\n___________________________',
                      bold: true,
                      size: 20,
                      color: '475569',
                      font: 'Calibri'
                    })
                  ]
                })
              );
              break;

            case 'date':
              children.push(
                new Paragraph({
                  spacing: { after: 100 },
                  children: [
                    new TextRun({
                      text: 'Date : ____ / ____ / ________',
                      size: 20,
                      color: '64748B',
                      font: 'Calibri'
                    })
                  ]
                })
              );
              break;

            default:
              children.push(
                new Paragraph({
                  spacing: { after: 100 },
                  children: [
                    new TextRun({
                      text: '___________________________________________________________________________',
                      size: 20,
                      color: '94A3B8',
                      font: 'Calibri'
                    })
                  ]
                })
              );
              break;
          }
        });
      }
    });
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


