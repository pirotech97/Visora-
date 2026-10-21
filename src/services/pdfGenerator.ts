import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import type { DocumentData, DocxBlock } from '../types';

// Ensure virtual file system fonts are attached
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

// 2 cm in PDF points (1 inch = 72 pt = 2.54 cm -> 2 cm = 56.7 pt)
const MARGIN_2CM = 56.7;

export async function downloadPdfFromDocument(
  data: DocumentData,
  filename: string
): Promise<void> {
  const baseName = filename.replace(/\.[^/.]+$/, '');
  const targetFileName = `${baseName}.pdf`;

  const blocks = Array.isArray(data?.blocs) ? data.blocs : [];
  const content: any[] = [];

  for (const block of blocks) {
    if (block.type === 'titre') {
      let fontSize = 14;
      let margin: [number, number, number, number] = [0, 10, 0, 4];
      if (block.niveau === 1) {
        fontSize = 18;
        margin = [0, 14, 0, 6];
      } else if (block.niveau === 2) {
        fontSize = 14;
        margin = [0, 10, 0, 4];
      } else {
        fontSize = 12;
        margin = [0, 8, 0, 3];
      }

      content.push({
        text: block.texte,
        fontSize,
        bold: true,
        color: '#0f172a',
        margin
      });
    } else if (block.type === 'paragraphe') {
      let alignment: 'left' | 'center' | 'right' | 'justify' = 'left';
      if (block.alignement === 'centre') alignment = 'center';
      else if (block.alignement === 'droite') alignment = 'right';
      else if (block.alignement === 'justifie') alignment = 'justify';

      content.push({
        text: block.texte,
        bold: Boolean(block.gras),
        alignment,
        fontSize: 11,
        color: '#334155',
        lineHeight: 1.25,
        margin: [0, 0, 0, 6]
      });
    } else if (block.type === 'liste') {
      const items = Array.isArray(block.elements) ? block.elements : [];
      if (items.length > 0) {
        content.push({
          ul: items.map((el) => ({
            text: el,
            fontSize: 11,
            color: '#334155',
            lineHeight: 1.25,
            margin: [0, 1, 0, 2]
          })),
          margin: [0, 3, 0, 6]
        });
      }
    } else if (block.type === 'tableau') {
      const rows = Array.isArray(block.lignes) ? block.lignes : [];
      if (rows.length > 0) {
        const colCount = Math.max(...rows.map((r) => (Array.isArray(r) ? r.length : 1)));
        const widths = Array(colCount).fill('*');

        const tableBody = rows.map((row, rIdx) => {
          const cells = Array.isArray(row) ? row : [String(row)];
          const isHeader = rIdx === 0;

          // Pad row if needed
          const paddedCells = [...cells];
          while (paddedCells.length < colCount) {
            paddedCells.push('');
          }

          return paddedCells.map((cell) => ({
            text: String(cell ?? ''),
            bold: isHeader,
            fillColor: isHeader ? '#f8fafc' : undefined,
            fontSize: 10,
            color: isHeader ? '#0f172a' : '#334155',
            margin: [4, 4, 4, 4]
          }));
        });

        content.push({
          table: {
            headerRows: 1,
            widths,
            body: tableBody
          },
          layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => '#cbd5e1',
            vLineColor: () => '#cbd5e1'
          },
          margin: [0, 6, 0, 10]
        });
      }
    } else if (block.type === 'figure') {
      // Ignorer si pas d'image
      if (!block.image) continue;

      content.push({
        image: block.image,
        fit: [450, 600],
        alignment: 'center',
        margin: [0, 8, 0, block.legende && block.legende.trim() ? 3 : 8]
      });

      if (block.legende && block.legende.trim()) {
        content.push({
          text: block.legende.trim(),
          italics: true,
          fontSize: 9,
          color: '#64748b',
          alignment: 'center',
          margin: [0, 0, 0, 8]
        });
      }
    }
  }

  // Fallback if content is empty
  if (content.length === 0) {
    content.push({
      text: 'Document sans contenu.',
      fontSize: 11,
      color: '#94a3b8'
    });
  }

  const docDefinition: any = {
    pageSize: 'A4',
    pageMargins: [MARGIN_2CM, MARGIN_2CM, MARGIN_2CM, MARGIN_2CM],
    content,
    defaultStyle: {
      font: 'Roboto',
      fontSize: 11,
      lineHeight: 1.25,
      color: '#334155'
    }
  };

  return new Promise((resolve, reject) => {
    try {
      const pdf = (pdfMake as any).createPdf(docDefinition);
      pdf.download(targetFileName, () => {
        resolve();
      });
      // Safety timeout in case callback doesn't fire in certain browsers
      setTimeout(resolve, 1200);
    } catch (err) {
      console.error('PDF export error:', err);
      reject(err);
    }
  });
}
