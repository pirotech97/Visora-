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
import type { CvOutputDocument } from '../types';
import {
  CvDesignOptions,
  DEFAULT_DESIGN_OPTIONS
} from './cvDesignEngine';

// Virtual file system fonts attachment for pdfMake
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

function normalizeCvOptions(styleOrOptions?: 'classique' | 'moderne' | CvDesignOptions): CvDesignOptions {
  if (!styleOrOptions) return { ...DEFAULT_DESIGN_OPTIONS };
  if (typeof styleOrOptions === 'string') {
    return {
      ...DEFAULT_DESIGN_OPTIONS,
      templateId: styleOrOptions === 'moderne' ? 'barre-laterale' : 'classique'
    };
  }
  return styleOrOptions;
}

function dataUriToUint8Array(dataUri: string): Uint8Array | null {
  try {
    const parts = dataUri.split(',');
    const base64 = parts[1] || parts[0];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

// ============================================================================
// EXPORT PDF (pdfmake) - Texte 100% sélectionnable, blocs incassables
// ============================================================================

export async function downloadCvPdf(
  cv: CvOutputDocument,
  styleOrOptions?: 'classique' | 'moderne' | CvDesignOptions
): Promise<void> {
  const options = normalizeCvOptions(styleOrOptions);
  const cleanName = sanitizeFileName(cv.identite?.nom || 'Curriculum_Vitae');
  const filename = `CV_${cleanName}.pdf`;

  const accent = options.accentColor || '#2563EB';
  const isCompact = options.fontSize === 'compact';
  const hasPhoto = Boolean(options.photoUrl && options.photoUrl.startsWith('data:image'));

  const showComp = !options.hiddenSections?.competences && Array.isArray(cv.competences) && cv.competences.length > 0;
  const showLang = !options.hiddenSections?.langues && Array.isArray(cv.langues) && cv.langues.length > 0;
  const showCentres = !options.hiddenSections?.centresInteret && Array.isArray(cv.centres_interet) && cv.centres_interet.length > 0;

  // Helper pour les expériences incassables
  const buildExperiencesList = (fontSize = isCompact ? 9 : 9.5, spacing = isCompact ? 6 : 9) => {
    if (!Array.isArray(cv.experiences) || cv.experiences.length === 0) return [];
    return cv.experiences.map((exp) => ({
      stack: [
        {
          columns: [
            { text: exp.poste || '', bold: true, fontSize: fontSize + 1, color: '#0f172a' },
            { text: exp.periode || '', alignment: 'right', fontSize, bold: true, color: accent }
          ]
        },
        {
          text: `${exp.employeur || ''}${exp.lieu ? ` — ${exp.lieu}` : ''}`,
          italics: true,
          fontSize,
          color: '#475569',
          margin: [0, 1, 0, 3]
        },
        Array.isArray(exp.points) && exp.points.length > 0
          ? {
              ul: exp.points.map((p) => ({ text: p, fontSize, color: '#334155' })),
              margin: [0, 2, 0, spacing]
            }
          : { text: '', margin: [0, 0, 0, spacing] }
      ],
      unbreakable: true
    }));
  };

  // Helper pour les formations incassables
  const buildFormationsList = (fontSize = isCompact ? 9 : 9.5, spacing = isCompact ? 6 : 8) => {
    if (!Array.isArray(cv.formations) || cv.formations.length === 0) return [];
    return cv.formations.map((f) => ({
      stack: [
        {
          columns: [
            { text: f.diplome || '', bold: true, fontSize: fontSize + 1, color: '#0f172a' },
            { text: f.annee || '', alignment: 'right', fontSize, bold: true, color: accent }
          ]
        },
        {
          text: `${f.etablissement || ''}${f.lieu ? ` — ${f.lieu}` : ''}`,
          fontSize,
          color: '#475569',
          margin: [0, 1, 0, spacing]
        }
      ],
      unbreakable: true
    }));
  };

  const contactItems = [cv.identite?.email, cv.identite?.telephone, cv.identite?.ville].filter(Boolean);

  let docDefinition: any;

  // ==========================================================================
  // MODÈLE 1 : CLASSIQUE (Une colonne, centré, sobre, accent discret)
  // ==========================================================================
  if (options.templateId === 'classique') {
    const content: any[] = [];

    if (hasPhoto && options.photoUrl) {
      content.push({
        image: options.photoUrl,
        width: isCompact ? 50 : 60,
        height: isCompact ? 50 : 60,
        alignment: 'center',
        margin: [0, 0, 0, 6]
      });
    }

    content.push(
      {
        text: cv.identite?.nom || 'Curriculum Vitae',
        fontSize: isCompact ? 18 : 21,
        bold: true,
        alignment: 'center',
        color: '#0f172a'
      },
      cv.identite?.titre_vise
        ? {
            text: cv.identite.titre_vise.toUpperCase(),
            fontSize: isCompact ? 10.5 : 12,
            bold: true,
            alignment: 'center',
            color: accent,
            margin: [0, 3, 0, 4]
          }
        : { text: '' }
    );

    if (contactItems.length > 0) {
      content.push({
        text: contactItems.join('  •  '),
        fontSize: isCompact ? 9 : 9.5,
        alignment: 'center',
        color: '#64748b',
        margin: [0, 0, 0, 10]
      });
    }

    content.push({
      canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1.5, lineColor: accent }],
      margin: [0, 0, 0, 12]
    });

    if (cv.resume) {
      content.push(
        { text: 'PROFIL PROFESSIONNEL', fontSize: 11, bold: true, color: '#1e293b', margin: [0, 8, 0, 5] },
        { text: cv.resume, fontSize: isCompact ? 9 : 9.5, color: '#334155', lineHeight: 1.3, margin: [0, 0, 0, 10] }
      );
    }

    const exps = buildExperiencesList();
    if (exps.length > 0) {
      content.push(
        { text: 'EXPÉRIENCES PROFESSIONNELLES', fontSize: 11, bold: true, color: '#1e293b', margin: [0, 8, 0, 6] },
        ...exps
      );
    }

    const forms = buildFormationsList();
    if (forms.length > 0) {
      content.push(
        { text: 'FORMATIONS & DIPLÔMES', fontSize: 11, bold: true, color: '#1e293b', margin: [0, 8, 0, 6] },
        ...forms
      );
    }

    if (showComp || showLang || showCentres) {
      content.push({
        text: 'COMPÉTENCES & INFORMATIONS COMPLÉMENTAIRES',
        fontSize: 11,
        bold: true,
        color: '#1e293b',
        margin: [0, 8, 0, 6]
      });

      if (showComp) {
        content.push({
          text: [
            { text: 'Compétences : ', bold: true, color: '#0f172a', fontSize: 9.5 },
            { text: cv.competences.join(', '), color: '#334155', fontSize: 9.5 }
          ],
          margin: [0, 0, 0, 4]
        });
      }

      if (showLang) {
        content.push({
          text: [
            { text: 'Langues : ', bold: true, color: '#0f172a', fontSize: 9.5 },
            { text: cv.langues.map((l) => `${l.langue} (${l.niveau})`).join(', '), color: '#334155', fontSize: 9.5 }
          ],
          margin: [0, 0, 0, 4]
        });
      }

      if (showCentres) {
        content.push({
          text: [
            { text: "Centres d'intérêt : ", bold: true, color: '#0f172a', fontSize: 9.5 },
            { text: cv.centres_interet.join(', '), color: '#334155', fontSize: 9.5 }
          ],
          margin: [0, 0, 0, 6]
        });
      }
    }

    docDefinition = {
      pageSize: 'A4',
      pageMargins: [36, 34, 36, 34],
      content
    };
  }

  // ==========================================================================
  // MODÈLE 2 : BARRE LATÉRALE (Colonne gauche 32 % couleur accent, droite blanche)
  // ==========================================================================
  else if (options.templateId === 'barre-laterale') {
    const leftContent: any[] = [];
    const rightContent: any[] = [];

    if (hasPhoto && options.photoUrl) {
      leftContent.push({
        image: options.photoUrl,
        width: 65,
        height: 65,
        alignment: 'center',
        margin: [0, 0, 0, 12]
      });
    }

    leftContent.push({
      text: 'CONTACT',
      fontSize: 9.5,
      bold: true,
      color: '#ffffff',
      characterSpacing: 0.5,
      margin: [0, 4, 0, 6]
    });

    if (cv.identite?.email) leftContent.push({ text: cv.identite.email, fontSize: 8.5, color: '#f1f5f9', margin: [0, 1, 0, 2] });
    if (cv.identite?.telephone) leftContent.push({ text: cv.identite.telephone, fontSize: 8.5, color: '#f1f5f9', margin: [0, 1, 0, 2] });
    if (cv.identite?.ville) leftContent.push({ text: cv.identite.ville, fontSize: 8.5, color: '#f1f5f9', margin: [0, 1, 0, 2] });

    if (showComp) {
      leftContent.push({
        text: 'COMPÉTENCES',
        fontSize: 9.5,
        bold: true,
        color: '#ffffff',
        characterSpacing: 0.5,
        margin: [0, 14, 0, 6]
      });
      cv.competences.forEach((c) => {
        leftContent.push({ text: `• ${c}`, fontSize: 8.5, color: '#f8fafc', margin: [0, 1, 0, 2] });
      });
    }

    if (showLang) {
      leftContent.push({
        text: 'LANGUES',
        fontSize: 9.5,
        bold: true,
        color: '#ffffff',
        characterSpacing: 0.5,
        margin: [0, 14, 0, 6]
      });
      cv.langues.forEach((l) => {
        leftContent.push({ text: `${l.langue} (${l.niveau})`, fontSize: 8.5, color: '#f8fafc', margin: [0, 1, 0, 2] });
      });
    }

    if (showCentres) {
      leftContent.push({
        text: "CENTRES D'INTÉRÊT",
        fontSize: 9.5,
        bold: true,
        color: '#ffffff',
        characterSpacing: 0.5,
        margin: [0, 14, 0, 6]
      });
      cv.centres_interet.forEach((ci) => {
        leftContent.push({ text: `• ${ci}`, fontSize: 8.5, color: '#f8fafc', margin: [0, 1, 0, 2] });
      });
    }

    // Colonne droite
    rightContent.push({
      text: cv.identite?.nom || 'Curriculum Vitae',
      fontSize: 18,
      bold: true,
      color: '#0f172a'
    });
    if (cv.identite?.titre_vise) {
      rightContent.push({
        text: cv.identite.titre_vise.toUpperCase(),
        fontSize: 11,
        bold: true,
        color: accent,
        margin: [0, 2, 0, 10]
      });
    }

    if (cv.resume) {
      rightContent.push(
        { text: 'PROFIL', fontSize: 10.5, bold: true, color: '#1e293b', margin: [0, 4, 0, 4] },
        { text: cv.resume, fontSize: 9.5, color: '#334155', lineHeight: 1.3, margin: [0, 0, 0, 10] }
      );
    }

    const exps = buildExperiencesList();
    if (exps.length > 0) {
      rightContent.push(
        { text: 'EXPÉRIENCES PROFESSIONNELLES', fontSize: 10.5, bold: true, color: '#1e293b', margin: [0, 6, 0, 6] },
        ...exps
      );
    }

    const forms = buildFormationsList();
    if (forms.length > 0) {
      rightContent.push(
        { text: 'FORMATIONS & DIPLÔMES', fontSize: 10.5, bold: true, color: '#1e293b', margin: [0, 6, 0, 6] },
        ...forms
      );
    }

    docDefinition = {
      pageSize: 'A4',
      pageMargins: [24, 24, 24, 24],
      content: [
        {
          table: {
            widths: [165, '*'],
            body: [
              [
                {
                  fillColor: accent,
                  margin: [12, 14, 12, 14],
                  stack: leftContent
                },
                {
                  margin: [16, 8, 8, 8],
                  stack: rightContent
                }
              ]
            ]
          },
          layout: 'noBorders'
        }
      ]
    };
  }

  // ==========================================================================
  // MODÈLE 3 : BANDEAU (Grand bandeau coloré en haut, 2 colonnes en bas)
  // ==========================================================================
  else if (options.templateId === 'bandeau') {
    const bannerLeft: any[] = [
      { text: cv.identite?.nom || 'Curriculum Vitae', fontSize: 20, bold: true, color: '#ffffff' },
      cv.identite?.titre_vise
        ? { text: cv.identite.titre_vise.toUpperCase(), fontSize: 11, bold: true, color: '#fef08a', margin: [0, 2, 0, 6] }
        : { text: '' },
      contactItems.length > 0
        ? { text: contactItems.join('  •  '), fontSize: 8.5, color: '#f1f5f9' }
        : { text: '' }
    ];

    const bannerRight: any[] = [];
    if (hasPhoto && options.photoUrl) {
      bannerRight.push({
        image: options.photoUrl,
        width: 55,
        height: 55,
        alignment: 'right'
      });
    }

    // 2 colonnes inférieures
    const colLeft: any[] = [];
    if (cv.resume) {
      colLeft.push(
        { text: 'PROFIL', fontSize: 10.5, bold: true, color: accent, margin: [0, 0, 0, 4] },
        { text: cv.resume, fontSize: 9.5, color: '#334155', lineHeight: 1.3, margin: [0, 0, 0, 10] }
      );
    }
    const exps = buildExperiencesList();
    if (exps.length > 0) {
      colLeft.push(
        { text: 'EXPÉRIENCES', fontSize: 10.5, bold: true, color: accent, margin: [0, 6, 0, 6] },
        ...exps
      );
    }
    const forms = buildFormationsList();
    if (forms.length > 0) {
      colLeft.push(
        { text: 'FORMATIONS', fontSize: 10.5, bold: true, color: accent, margin: [0, 6, 0, 6] },
        ...forms
      );
    }

    const colRight: any[] = [];
    if (showComp) {
      colRight.push(
        { text: 'COMPÉTENCES', fontSize: 10.5, bold: true, color: '#0f172a', margin: [0, 0, 0, 6] },
        ...cv.competences.map((c) => ({ text: `• ${c}`, fontSize: 9, color: '#334155', margin: [0, 1, 0, 2] }))
      );
    }
    if (showLang) {
      colRight.push(
        { text: 'LANGUES', fontSize: 10.5, bold: true, color: '#0f172a', margin: [0, 12, 0, 6] },
        ...cv.langues.map((l) => ({ text: `${l.langue} (${l.niveau})`, fontSize: 9, color: '#334155', margin: [0, 1, 0, 2] }))
      );
    }
    if (showCentres) {
      colRight.push(
        { text: "CENTRES D'INTÉRÊT", fontSize: 10.5, bold: true, color: '#0f172a', margin: [0, 12, 0, 6] },
        ...cv.centres_interet.map((ci) => ({ text: `• ${ci}`, fontSize: 9, color: '#334155', margin: [0, 1, 0, 2] }))
      );
    }

    docDefinition = {
      pageSize: 'A4',
      pageMargins: [30, 26, 30, 26],
      content: [
        {
          table: {
            widths: ['*', 70],
            body: [
              [
                { fillColor: accent, margin: [14, 14, 8, 14], stack: bannerLeft },
                { fillColor: accent, margin: [0, 14, 14, 14], stack: bannerRight }
              ]
            ]
          },
          layout: 'noBorders',
          margin: [0, 0, 0, 14]
        },
        {
          table: {
            widths: ['*', 160],
            body: [
              [
                { margin: [0, 0, 12, 0], stack: colLeft },
                { margin: [12, 0, 0, 0], stack: colRight }
              ]
            ]
          },
          layout: 'noBorders'
        }
      ]
    };
  }

  // ==========================================================================
  // MODÈLE 4 : MINIMAL (Beaucoup d'espace blanc, nom léger, trait fin gris)
  // ==========================================================================
  else if (options.templateId === 'minimal') {
    const content: any[] = [];

    const headerCols: any[] = [];
    if (hasPhoto && options.photoUrl) {
      headerCols.push({ image: options.photoUrl, width: 50, height: 50 });
    }
    headerCols.push({
      stack: [
        { text: cv.identite?.nom || 'Curriculum Vitae', fontSize: 19, color: '#0f172a', bold: false, characterSpacing: 0.5 },
        cv.identite?.titre_vise
          ? { text: cv.identite.titre_vise.toUpperCase(), fontSize: 10, color: '#64748b', characterSpacing: 1, margin: [0, 2, 0, 4] }
          : { text: '' },
        contactItems.length > 0
          ? { text: contactItems.join('   /   '), fontSize: 8.5, color: '#94a3b8' }
          : { text: '' }
      ]
    });

    content.push(
      { columns: headerCols, columnGap: 14, margin: [0, 0, 0, 16] },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.8, lineColor: '#e2e8f0' }], margin: [0, 0, 0, 16] }
    );

    const makeMinimalHeading = (title: string) => ({
      stack: [
        {
          columns: [
            { text: title, fontSize: 9.5, bold: true, color: '#475569', characterSpacing: 1 },
            { canvas: [{ type: 'rect', x: 0, y: 4, w: 14, h: 2, color: accent }], alignment: 'right' }
          ]
        },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#f1f5f9' }], margin: [0, 3, 0, 8] }
      ],
      margin: [0, 8, 0, 6]
    });

    if (cv.resume) {
      content.push(makeMinimalHeading('PROFIL'), { text: cv.resume, fontSize: 9, color: '#475569', lineHeight: 1.35, margin: [0, 0, 0, 12] });
    }

    const exps = buildExperiencesList(9, 7);
    if (exps.length > 0) {
      content.push(makeMinimalHeading('EXPÉRIENCES'), ...exps);
    }

    const forms = buildFormationsList(9, 6);
    if (forms.length > 0) {
      content.push(makeMinimalHeading('FORMATIONS'), ...forms);
    }

    if (showComp) {
      content.push(makeMinimalHeading('COMPÉTENCES'), { text: cv.competences.join('  •  '), fontSize: 8.5, color: '#475569', margin: [0, 0, 0, 8] });
    }

    if (showLang) {
      content.push(makeMinimalHeading('LANGUES'), {
        text: cv.langues.map((l) => `${l.langue} (${l.niveau})`).join('  •  '),
        fontSize: 8.5,
        color: '#475569',
        margin: [0, 0, 0, 8]
      });
    }

    if (showCentres) {
      content.push(makeMinimalHeading("CENTRES D'INTÉRÊT"), {
        text: cv.centres_interet.join('  •  '),
        fontSize: 8.5,
        color: '#475569',
        margin: [0, 0, 0, 8]
      });
    }

    docDefinition = {
      pageSize: 'A4',
      pageMargins: [42, 38, 42, 38],
      content
    };
  }

  // ==========================================================================
  // MODÈLE 5 : CHRONOLOGIE (Ligne verticale avec points de couleur)
  // ==========================================================================
  else if (options.templateId === 'chronologie') {
    const content: any[] = [];

    const topHeader: any[] = [];
    if (hasPhoto && options.photoUrl) {
      topHeader.push({ image: options.photoUrl, width: 55, height: 55, alignment: 'center', margin: [0, 0, 0, 6] });
    }
    topHeader.push(
      { text: cv.identite?.nom || 'Curriculum Vitae', fontSize: 20, bold: true, alignment: 'center', color: '#0f172a' },
      cv.identite?.titre_vise
        ? { text: cv.identite.titre_vise.toUpperCase(), fontSize: 11, bold: true, alignment: 'center', color: accent, margin: [0, 2, 0, 4] }
        : { text: '' },
      contactItems.length > 0
        ? { text: contactItems.join('  •  '), fontSize: 9, alignment: 'center', color: '#64748b', margin: [0, 0, 0, 12] }
        : { text: '' }
    );
    content.push(...topHeader);

    if (cv.resume) {
      content.push({
        table: {
          widths: ['*'],
          body: [[{ text: cv.resume, fontSize: 9.5, color: '#334155', fillColor: '#f8fafc', margin: [10, 8, 10, 8] }]]
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 12]
      });
    }

    // Timeline des expériences avec pastilles
    if (Array.isArray(cv.experiences) && cv.experiences.length > 0) {
      content.push({ text: 'CHRONOLOGIE PROFESSIONNELLE', fontSize: 11, bold: true, color: accent, margin: [0, 6, 0, 8] });

      cv.experiences.forEach((exp) => {
        content.push({
          columns: [
            {
              width: 14,
              stack: [
                { canvas: [{ type: 'circle', x: 5, y: 5, r: 4, color: accent }] },
                { canvas: [{ type: 'line', x1: 5, y1: 10, x2: 5, y2: 45, lineWidth: 1.5, lineColor: '#cbd5e1' }] }
              ]
            },
            {
              width: '*',
              stack: [
                {
                  columns: [
                    { text: exp.poste || '', bold: true, fontSize: 10.5, color: '#0f172a' },
                    { text: exp.periode || '', alignment: 'right', fontSize: 9, bold: true, color: accent }
                  ]
                },
                { text: `${exp.employeur || ''}${exp.lieu ? ` — ${exp.lieu}` : ''}`, italics: true, fontSize: 9, color: '#475569', margin: [0, 1, 0, 3] },
                Array.isArray(exp.points) && exp.points.length > 0
                  ? { ul: exp.points.map((p) => ({ text: p, fontSize: 9, color: '#334155' })), margin: [0, 2, 0, 8] }
                  : { text: '', margin: [0, 0, 0, 6] }
              ]
            }
          ],
          unbreakable: true,
          margin: [0, 0, 0, 4]
        });
      });
    }

    // Timeline des formations
    if (Array.isArray(cv.formations) && cv.formations.length > 0) {
      content.push({ text: 'FORMATIONS', fontSize: 11, bold: true, color: accent, margin: [0, 8, 0, 8] });
      cv.formations.forEach((f) => {
        content.push({
          columns: [
            {
              width: 14,
              stack: [
                { canvas: [{ type: 'circle', x: 5, y: 5, r: 4, color: accent }] },
                { canvas: [{ type: 'line', x1: 5, y1: 10, x2: 5, y2: 30, lineWidth: 1.5, lineColor: '#cbd5e1' }] }
              ]
            },
            {
              width: '*',
              stack: [
                {
                  columns: [
                    { text: f.diplome || '', bold: true, fontSize: 10.5, color: '#0f172a' },
                    { text: f.annee || '', alignment: 'right', fontSize: 9, bold: true, color: accent }
                  ]
                },
                { text: `${f.etablissement || ''}${f.lieu ? ` — ${f.lieu}` : ''}`, fontSize: 9, color: '#475569', margin: [0, 1, 0, 6] }
              ]
            }
          ],
          unbreakable: true,
          margin: [0, 0, 0, 4]
        });
      });
    }

    // Bas de page : Compétences et langues
    if (showComp || showLang || showCentres) {
      const bottomStacks: any[] = [];
      if (showComp) {
        bottomStacks.push({
          text: [
            { text: 'Compétences : ', bold: true, color: '#0f172a', fontSize: 9 },
            { text: cv.competences.join(', '), color: '#334155', fontSize: 9 }
          ],
          margin: [0, 0, 0, 3]
        });
      }
      if (showLang) {
        bottomStacks.push({
          text: [
            { text: 'Langues : ', bold: true, color: '#0f172a', fontSize: 9 },
            { text: cv.langues.map((l) => `${l.langue} (${l.niveau})`).join(', '), color: '#334155', fontSize: 9 }
          ],
          margin: [0, 0, 0, 3]
        });
      }
      if (showCentres) {
        bottomStacks.push({
          text: [
            { text: "Loisirs : ", bold: true, color: '#0f172a', fontSize: 9 },
            { text: cv.centres_interet.join(', '), color: '#334155', fontSize: 9 }
          ]
        });
      }

      content.push(
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#e2e8f0' }], margin: [0, 8, 0, 8] },
        { stack: bottomStacks }
      );
    }

    docDefinition = {
      pageSize: 'A4',
      pageMargins: [34, 30, 34, 30],
      content
    };
  }

  // ==========================================================================
  // MODÈLE 6 : COMPACT (Très dense, 1 page garantie, 2 colonnes compétences)
  // ==========================================================================
  else {
    const content: any[] = [];

    // En-tête ultra condensé
    const headLeft: any[] = [
      { text: cv.identite?.nom || 'Curriculum Vitae', fontSize: 16, bold: true, color: '#0f172a' },
      cv.identite?.titre_vise
        ? { text: cv.identite.titre_vise.toUpperCase(), fontSize: 9.5, bold: true, color: accent }
        : { text: '' },
      contactItems.length > 0
        ? { text: contactItems.join('  |  '), fontSize: 8.5, color: '#64748b', margin: [0, 1, 0, 4] }
        : { text: '' }
    ];

    const headCols: any[] = [{ width: '*', stack: headLeft }];
    if (hasPhoto && options.photoUrl) {
      headCols.unshift({
        width: 48,
        image: options.photoUrl,
        height: 44,
        margin: [0, 0, 8, 0]
      });
    }

    content.push(
      { columns: headCols },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 545, y2: 0, lineWidth: 1, lineColor: accent }], margin: [0, 2, 0, 6] }
    );

    if (cv.resume) {
      content.push({
        text: cv.resume,
        fontSize: 8.5,
        color: '#334155',
        lineHeight: 1.25,
        margin: [0, 0, 0, 6]
      });
    }

    const exps = buildExperiencesList(8.5, 4);
    if (exps.length > 0) {
      content.push(
        { text: 'EXPÉRIENCES', fontSize: 9.5, bold: true, color: accent, margin: [0, 2, 0, 4] },
        ...exps
      );
    }

    const forms = buildFormationsList(8.5, 3);
    if (forms.length > 0) {
      content.push(
        { text: 'FORMATIONS', fontSize: 9.5, bold: true, color: accent, margin: [0, 2, 0, 4] },
        ...forms
      );
    }

    if (showComp) {
      content.push({ text: 'COMPÉTENCES', fontSize: 9.5, bold: true, color: accent, margin: [0, 2, 0, 3] });
      // Répartition sur 2 colonnes
      const half = Math.ceil(cv.competences.length / 2);
      const colA = cv.competences.slice(0, half);
      const colB = cv.competences.slice(half);

      content.push({
        columns: [
          { stack: colA.map((c) => ({ text: `• ${c}`, fontSize: 8, color: '#334155', margin: [0, 0, 0, 1.5] })) },
          { stack: colB.map((c) => ({ text: `• ${c}`, fontSize: 8, color: '#334155', margin: [0, 0, 0, 1.5] })) }
        ],
        margin: [0, 0, 0, 4]
      });
    }

    if (showLang || showCentres) {
      const parts: any[] = [];
      if (showLang) parts.push(`Langues : ${cv.langues.map((l) => `${l.langue} (${l.niveau})`).join(', ')}`);
      if (showCentres) parts.push(`Loisirs : ${cv.centres_interet.join(', ')}`);

      content.push({
        text: parts.join('   |   '),
        fontSize: 8,
        color: '#475569',
        margin: [0, 2, 0, 2]
      });
    }

    docDefinition = {
      pageSize: 'A4',
      pageMargins: [25, 20, 25, 20],
      content
    };
  }

  (pdfMake as any).createPdf(docDefinition).download(filename);
}

// ============================================================================
// EXPORT WORD (.docx) - Adapté au modèle, police, couleur et photo
// ============================================================================

export async function downloadCvDocx(
  cv: CvOutputDocument,
  styleOrOptions?: 'classique' | 'moderne' | CvDesignOptions
): Promise<void> {
  const options = normalizeCvOptions(styleOrOptions);
  const cleanName = sanitizeFileName(cv.identite?.nom || 'Curriculum_Vitae');
  const filename = `CV_${cleanName}.docx`;

  const fontName = options.fontFamily === 'serif' ? 'Georgia' : 'Calibri';
  const accentHex = (options.accentColor || '#2563EB').replace('#', '').toUpperCase();
  const photoBytes = options.photoUrl ? dataUriToUint8Array(options.photoUrl) : null;

  const showComp = !options.hiddenSections?.competences && Array.isArray(cv.competences) && cv.competences.length > 0;
  const showLang = !options.hiddenSections?.langues && Array.isArray(cv.langues) && cv.langues.length > 0;
  const showCentres = !options.hiddenSections?.centresInteret && Array.isArray(cv.centres_interet) && cv.centres_interet.length > 0;

  const children: Array<Paragraph | Table> = [];

  // Photo
  if (photoBytes) {
    try {
      children.push(
        new Paragraph({
          alignment: options.templateId === 'classique' || options.templateId === 'chronologie' ? AlignmentType.CENTER : AlignmentType.LEFT,
          spacing: { after: 120 },
          children: [
            new ImageRun({
              data: photoBytes,
              transformation: { width: 64, height: 64 },
              type: 'png'
            })
          ]
        })
      );
    } catch (e) {
      console.warn('Docx image run error:', e);
    }
  }

  // Nom complet
  children.push(
    new Paragraph({
      alignment: options.templateId === 'classique' || options.templateId === 'chronologie' ? AlignmentType.CENTER : AlignmentType.LEFT,
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: cv.identite?.nom || 'Curriculum Vitae',
          bold: true,
          size: options.fontSize === 'compact' ? 32 : 36,
          color: '0F172A',
          font: fontName
        })
      ]
    })
  );

  // Titre visé
  if (cv.identite?.titre_vise) {
    children.push(
      new Paragraph({
        alignment: options.templateId === 'classique' || options.templateId === 'chronologie' ? AlignmentType.CENTER : AlignmentType.LEFT,
        spacing: { after: 100 },
        children: [
          new TextRun({
            text: cv.identite.titre_vise.toUpperCase(),
            bold: true,
            size: options.fontSize === 'compact' ? 20 : 22,
            color: accentHex,
            font: fontName
          })
        ]
      })
    );
  }

  // Coordonnées
  const contactParts = [cv.identite?.email, cv.identite?.telephone, cv.identite?.ville].filter(Boolean);
  if (contactParts.length > 0) {
    children.push(
      new Paragraph({
        alignment: options.templateId === 'classique' || options.templateId === 'chronologie' ? AlignmentType.CENTER : AlignmentType.LEFT,
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: contactParts.join('  •  '),
            size: 19,
            color: '64748B',
            font: fontName
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
        spacing: { before: 180, after: 80 },
        children: [
          new TextRun({
            text: 'PROFIL',
            bold: true,
            size: 22,
            color: accentHex,
            font: fontName
          })
        ]
      }),
      new Paragraph({
        spacing: { after: 180 },
        children: [
          new TextRun({
            text: cv.resume,
            size: options.fontSize === 'compact' ? 19 : 20,
            color: '334155',
            font: fontName
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
        spacing: { before: 200, after: 100 },
        children: [
          new TextRun({
            text: 'EXPÉRIENCES PROFESSIONNELLES',
            bold: true,
            size: 22,
            color: accentHex,
            font: fontName
          })
        ]
      })
    );

    cv.experiences.forEach((exp) => {
      children.push(
        new Paragraph({
          spacing: { before: 90, after: 30 },
          children: [
            new TextRun({
              text: exp.poste,
              bold: true,
              size: 21,
              color: '0F172A',
              font: fontName
            }),
            new TextRun({
              text: `  |  ${exp.employeur}${exp.lieu ? ` — ${exp.lieu}` : ''}`,
              italics: true,
              size: 19,
              color: '475569',
              font: fontName
            }),
            new TextRun({
              text: `  (${exp.periode})`,
              bold: true,
              size: 19,
              color: accentHex,
              font: fontName
            })
          ]
        })
      );

      if (Array.isArray(exp.points) && exp.points.length > 0) {
        exp.points.forEach((pt) => {
          children.push(
            new Paragraph({
              bullet: { level: 0 },
              spacing: { before: 20, after: 20 },
              children: [
                new TextRun({
                  text: pt,
                  size: 19,
                  color: '334155',
                  font: fontName
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
        spacing: { before: 200, after: 100 },
        children: [
          new TextRun({
            text: 'FORMATIONS & DIPLÔMES',
            bold: true,
            size: 22,
            color: accentHex,
            font: fontName
          })
        ]
      })
    );

    cv.formations.forEach((f) => {
      children.push(
        new Paragraph({
          spacing: { before: 80, after: 40 },
          children: [
            new TextRun({
              text: f.diplome,
              bold: true,
              size: 21,
              color: '0F172A',
              font: fontName
            }),
            new TextRun({
              text: `  |  ${f.etablissement}${f.lieu ? ` — ${f.lieu}` : ''}`,
              size: 19,
              color: '475569',
              font: fontName
            }),
            new TextRun({
              text: `  (${f.annee})`,
              size: 18,
              color: '64748B',
              font: fontName
            })
          ]
        })
      );
    });
  }

  // Compétences, Langues, Centres d'intérêt
  if (showComp || showLang || showCentres) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
        children: [
          new TextRun({
            text: 'COMPÉTENCES & INFORMATIONS COMPLÉMENTAIRES',
            bold: true,
            size: 22,
            color: accentHex,
            font: fontName
          })
        ]
      })
    );

    if (showComp) {
      children.push(
        new Paragraph({
          spacing: { after: 50 },
          children: [
            new TextRun({ text: 'Compétences : ', bold: true, size: 20, color: '0F172A', font: fontName }),
            new TextRun({ text: cv.competences.join(', '), size: 20, color: '334155', font: fontName })
          ]
        })
      );
    }

    if (showLang) {
      children.push(
        new Paragraph({
          spacing: { after: 50 },
          children: [
            new TextRun({ text: 'Langues : ', bold: true, size: 20, color: '0F172A', font: fontName }),
            new TextRun({
              text: cv.langues.map((l) => `${l.langue} (${l.niveau})`).join(', '),
              size: 20,
              color: '334155',
              font: fontName
            })
          ]
        })
      );
    }

    if (showCentres) {
      children.push(
        new Paragraph({
          spacing: { after: 50 },
          children: [
            new TextRun({ text: "Centres d'intérêt : ", bold: true, size: 20, color: '0F172A', font: fontName }),
            new TextRun({ text: cv.centres_interet.join(', '), size: 20, color: '334155', font: fontName })
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
            margin: { top: 900, right: 900, bottom: 900, left: 900 }
          }
        },
        children
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  triggerBlobDownload(blob, filename);
}
