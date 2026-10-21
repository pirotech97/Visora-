import mammoth from 'mammoth';
import htmlToPdfmake from 'html-to-pdfmake';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

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

const MARGIN_2CM = 56.7;

export async function convertDocxToPdfBlob(file: File): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  const html = result.value;

  if (!html || html.trim().length === 0) {
    throw new Error('Document Word vide ou non convertible.');
  }

  // Conversion HTML vers la structure pdfmake
  const pdfContent = htmlToPdfmake(html);

  const docDefinition: any = {
    pageSize: 'A4',
    pageMargins: [MARGIN_2CM, MARGIN_2CM, MARGIN_2CM, MARGIN_2CM],
    content: pdfContent,
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
      pdf.getBlob((blob: Blob) => {
        resolve(blob);
      });
    } catch (err) {
      reject(err);
    }
  });
}
