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
  ImageRun
} from 'docx';
import type { DocumentData, DocxBlock } from '../types';

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] || dataUrl;
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth || img.width || 450,
        height: img.naturalHeight || img.height || 300
      });
    };
    img.onerror = () => resolve({ width: 450, height: 300 });
    img.src = dataUrl;
  });
}

export async function createDocxFromData(data: DocumentData): Promise<Document> {
  const children: Array<Paragraph | Table> = [];

  for (const block of data.blocs) {
    if (block.type === 'titre') {
      let headingLevel: (typeof HeadingLevel)[keyof typeof HeadingLevel] = HeadingLevel.HEADING_1;
      let fontSize = 32; // 16pt

      if (block.niveau === 2) {
        headingLevel = HeadingLevel.HEADING_2;
        fontSize = 28; // 14pt
      } else if (block.niveau >= 3) {
        headingLevel = HeadingLevel.HEADING_3;
        fontSize = 24; // 12pt
      }

      children.push(
        new Paragraph({
          heading: headingLevel,
          spacing: { before: 240, after: 120 },
          children: [
            new TextRun({
              text: block.texte || '',
              font: 'Calibri',
              size: fontSize,
              bold: true,
              color: '1E3A8A'
            })
          ]
        })
      );
    } else if (block.type === 'paragraphe') {
      let alignment: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT;
      if (block.alignement === 'centre') alignment = AlignmentType.CENTER;
      if (block.alignement === 'droite') alignment = AlignmentType.RIGHT;
      if (block.alignement === 'justifie') alignment = AlignmentType.JUSTIFIED;

      children.push(
        new Paragraph({
          alignment,
          spacing: { before: 80, after: 120, line: 276 },
          children: [
            new TextRun({
              text: block.texte || '',
              font: 'Calibri',
              size: 22, // 11pt
              bold: Boolean(block.gras)
            })
          ]
        })
      );
    } else if (block.type === 'liste') {
      const elements = Array.isArray(block.elements) ? block.elements : [];
      for (const el of elements) {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { before: 60, after: 60 },
            children: [
              new TextRun({
                text: el || '',
                font: 'Calibri',
                size: 22 // 11pt
              })
            ]
          })
        );
      }
    } else if (block.type === 'tableau') {
      const rows = Array.isArray(block.lignes) ? block.lignes : [];
      if (rows.length > 0) {
        const borderConfig = {
          style: BorderStyle.SINGLE,
          size: 1,
          color: 'CBD5E1'
        };

        const tableRows = rows.map((row, rowIndex) => {
          const cells = Array.isArray(row) ? row : [String(row)];
          const isHeader = rowIndex === 0;

          return new TableRow({
            tableHeader: isHeader,
            children: cells.map((cellText) => {
              return new TableCell({
                borders: {
                  top: borderConfig,
                  bottom: borderConfig,
                  left: borderConfig,
                  right: borderConfig
                },
                shading: isHeader ? { fill: 'F1F5F9' } : undefined,
                margins: {
                  top: 100,
                  bottom: 100,
                  left: 140,
                  right: 140
                },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: String(cellText || ''),
                        font: 'Calibri',
                        size: 22, // 11pt
                        bold: isHeader
                      })
                    ]
                  })
                ]
              });
            })
          });
        });

        children.push(
          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE
            },
            borders: {
              top: borderConfig,
              bottom: borderConfig,
              left: borderConfig,
              right: borderConfig,
              insideHorizontal: borderConfig,
              insideVertical: borderConfig
            },
            rows: tableRows
          })
        );

        children.push(
          new Paragraph({
            spacing: { before: 120, after: 120 },
            children: []
          })
        );
      }
    } else if (block.type === 'figure') {
      // Ignorer si pas d'image
      if (!block.image) continue;

      try {
        const { width: origW, height: origH } = await getImageDimensions(block.image);
        const MAX_W = 450;
        let finalW = origW;
        let finalH = origH;

        if (finalW > MAX_W) {
          finalH = Math.round((origH * MAX_W) / origW);
          finalW = MAX_W;
        }

        const imageBytes = dataUrlToUint8Array(block.image);

        const imageType: 'png' | 'jpg' = block.image.startsWith('data:image/png') ? 'png' : 'jpg';

        // Insérer l'image avec ImageRun (largeur max 450 px, hauteur proportionnelle), centrée
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 180, after: block.legende && block.legende.trim() ? 60 : 180 },
            children: [
              new ImageRun({
                type: imageType,
                data: imageBytes,
                transformation: {
                  width: finalW,
                  height: finalH
                }
              })
            ]
          })
        );

        // Suivie de la légende en italique
        if (block.legende && block.legende.trim()) {
          children.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 40, after: 180 },
              children: [
                new TextRun({
                  text: block.legende.trim(),
                  font: 'Calibri',
                  size: 18, // 9 pt
                  italics: true,
                  color: '64748B'
                })
              ]
            })
          );
        }
      } catch (figErr) {
        console.warn('Failed to insert figure in Word:', figErr);
      }
    }
  }

  // Fallback if empty document
  if (children.length === 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Document vide',
            font: 'Calibri',
            size: 22
          })
        ]
      })
    );
  }

  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
              right: 1440,
              bottom: 1440,
              left: 1440
            }
          }
        },
        children
      }
    ]
  });
}

export async function downloadDocx(data: DocumentData, originalFilename: string): Promise<void> {
  const doc = await createDocxFromData(data);
  const blob = await Packer.toBlob(doc);

  const baseName = originalFilename
    ? originalFilename.replace(/\.[^/.]+$/, '')
    : 'document';
  const downloadName = `${baseName}.docx`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = downloadName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
