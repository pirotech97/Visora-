import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';

// Configuration du worker PDF.js pour le navigateur
if (typeof window !== 'undefined') {
  try {
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
    }
  } catch {
    // Fallback silencieux
  }
}

export interface PdfFileInfo {
  id: string;
  file: File;
  name: string;
  size: number;
  pageCount: number;
  thumbnailUrl?: string;
  isImage: boolean;
  isCorruptedOrEncrypted?: boolean;
  errorMessage?: string;
}

/**
 * Génère une miniature légère (JPEG basse résolution) pour la première page d'un PDF
 */
export async function renderPdfThumbnail(data: ArrayBuffer | Uint8Array, pageNum = 1, targetWidth = 140): Promise<string> {
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: data instanceof Uint8Array ? data : new Uint8Array(data)
    });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(Math.min(pageNum, pdf.numPages));

    const defaultViewport = page.getViewport({ scale: 1.0 });
    const scale = targetWidth / defaultViewport.width;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    await (page.render({
      canvasContext: ctx,
      viewport,
      canvas
    } as any) as any).promise;

    const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
    // Nettoyage mémoire
    canvas.width = 0;
    canvas.height = 0;
    return dataUrl;
  } catch (err) {
    console.warn('Erreur rendu miniature PDF:', err);
    return '';
  }
}

/**
 * Crée une miniature pour une image (JPG, PNG, WebP)
 */
export async function renderImageThumbnail(file: File, targetWidth = 140): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const scale = targetWidth / img.width;
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        URL.revokeObjectURL(objectUrl);
        canvas.width = 0;
        canvas.height = 0;
        resolve(dataUrl);
      } else {
        URL.revokeObjectURL(objectUrl);
        resolve(objectUrl);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve('');
    };
    img.src = objectUrl;
  });
}

/**
 * Analyse un fichier (PDF ou Image) et retourne ses métadonnées
 */
export async function analyzeFileForTool(file: File): Promise<PdfFileInfo> {
  const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(file.name);
  const id = 'f_' + Math.random().toString(36).substring(2, 10);

  if (isImage) {
    const thumb = await renderImageThumbnail(file);
    return {
      id,
      file,
      name: file.name,
      size: file.size,
      pageCount: 1,
      thumbnailUrl: thumb,
      isImage: true
    };
  }

  // Fichier PDF
  try {
    const arrayBuffer = await file.arrayBuffer();

    // 1. Tente de charger avec pdf-lib pour vérifier l'intégrité et le chiffrement
    let pageCount = 0;
    try {
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: false });
      pageCount = pdfDoc.getPageCount();
    } catch (pdfLibErr: any) {
      const msg = String(pdfLibErr?.message || '').toLowerCase();
      if (msg.includes('encrypt') || msg.includes('password') || msg.includes('protect')) {
        return {
          id,
          file,
          name: file.name,
          size: file.size,
          pageCount: 0,
          isImage: false,
          isCorruptedOrEncrypted: true,
          errorMessage: 'Ce fichier est protégé par mot de passe. Retire-le de la liste.'
        };
      }
      return {
        id,
        file,
        name: file.name,
        size: file.size,
        pageCount: 0,
        isImage: false,
        isCorruptedOrEncrypted: true,
        errorMessage: 'Ce fichier est protégé ou abîmé. Retire-le de la liste.'
      };
    }

    // 2. Générer la miniature avec pdfjsLib
    const thumb = await renderPdfThumbnail(arrayBuffer, 1, 140);

    return {
      id,
      file,
      name: file.name,
      size: file.size,
      pageCount,
      thumbnailUrl: thumb,
      isImage: false
    };
  } catch {
    return {
      id,
      file,
      name: file.name,
      size: file.size,
      pageCount: 0,
      isImage: false,
      isCorruptedOrEncrypted: true,
      errorMessage: 'Ce fichier est protégé ou abîmé. Retire-le de la liste.'
    };
  }
}

/**
 * Convertit une image en page PDF A4 centrée avec proportions conservées
 * Format A4 en points : 595.28 x 841.89 points (72 DPI)
 */
export async function convertImageToPdfPage(pdfDoc: PDFDocument, file: File): Promise<void> {
  const page = pdfDoc.addPage([595.28, 841.89]);
  const pageWidth = 595.28;
  const pageHeight = 841.89;

  let imageBytes: ArrayBuffer;
  let isPng = file.type === 'image/png' || /\.png$/i.test(file.name);
  const isJpg = file.type === 'image/jpeg' || file.type === 'image/jpg' || /\.(jpe?g)$/i.test(file.name);

  if (isJpg) {
    imageBytes = await file.arrayBuffer();
  } else if (isPng) {
    imageBytes = await file.arrayBuffer();
  } else {
    // WebP ou autre format raster : conversion en PNG via canvas
    imageBytes = await new Promise<ArrayBuffer>((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error("Erreur de conversion d'image"));
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url);
          if (!blob) {
            reject(new Error("Erreur de création de blob"));
            return;
          }
          blob.arrayBuffer().then(resolve).catch(reject);
        }, 'image/png');
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Impossible de lire l'image"));
      };
      img.src = url;
    });
    isPng = true;
  }

  let embeddedImage;
  if (isPng) {
    embeddedImage = await pdfDoc.embedPng(imageBytes);
  } else {
    embeddedImage = await pdfDoc.embedJpg(imageBytes);
  }

  const { width: imgWidth, height: imgHeight } = embeddedImage;

  // Marge de 24 points tout autour
  const margin = 24;
  const maxAvailableWidth = pageWidth - margin * 2;
  const maxAvailableHeight = pageHeight - margin * 2;

  const scale = Math.min(maxAvailableWidth / imgWidth, maxAvailableHeight / imgHeight, 1.0);
  const drawWidth = imgWidth * scale;
  const drawHeight = imgHeight * scale;

  const x = (pageWidth - drawWidth) / 2;
  const y = (pageHeight - drawHeight) / 2;

  page.drawImage(embeddedImage, {
    x,
    y,
    width: drawWidth,
    height: drawHeight
  });
}

/**
 * FUSIONNER DES PDF
 * Traitement 100% dans le navigateur avec pdf-lib
 */
export async function mergePdfFiles(
  files: File[],
  onProgress?: (percent: number, stepText: string) => void
): Promise<{ pdfBytes: Uint8Array; totalPages: number }> {
  if (files.length === 0) {
    throw new Error('Aucun fichier à fusionner.');
  }

  onProgress?.(5, 'Initialisation du document PDF…');
  const mergedDoc = await PDFDocument.create();

  const totalFiles = files.length;

  for (let i = 0; i < totalFiles; i++) {
    const file = files[i];
    const progressPercent = Math.round(10 + (i / totalFiles) * 80);
    onProgress?.(progressPercent, `Traitement du fichier ${i + 1}/${totalFiles} : ${file.name}`);

    const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(file.name);

    if (isImage) {
      await convertImageToPdfPage(mergedDoc, file);
    } else {
      // PDF
      const arrayBuffer = await file.arrayBuffer();
      let srcDoc: PDFDocument;
      try {
        srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: false });
      } catch (err: any) {
        const msg = String(err?.message || '').toLowerCase();
        if (msg.includes('encrypt') || msg.includes('password')) {
          throw new Error(`Le fichier "${file.name}" est protégé par mot de passe. Retire-le de la liste.`);
        }
        throw new Error(`Le fichier "${file.name}" est protégé ou abîmé. Retire-le de la liste.`);
      }

      const pageIndices = srcDoc.getPageIndices();
      const copiedPages = await mergedDoc.copyPages(srcDoc, pageIndices);
      for (const page of copiedPages) {
        mergedDoc.addPage(page);
      }
    }
  }

  onProgress?.(95, 'Finalisation et compression du document fusionné…');
  const pdfBytes = await mergedDoc.save();
  const totalPages = mergedDoc.getPageCount();

  onProgress?.(100, `Terminé : ${totalPages} pages fusionnées avec succès.`);
  return { pdfBytes, totalPages };
}

/**
 * Analyse et valide une chaîne de plages de pages (ex: "1-3, 5, 8-")
 * Retourne la liste ordonnée des pages (1-indexed) ou une erreur explicative en français
 */
export function parsePageRangeString(
  rangeStr: string,
  totalPages: number
): { valid: boolean; pages: number[]; error?: string } {
  const trimmed = rangeStr.trim();
  if (!trimmed) {
    return { valid: false, pages: [], error: 'Saisis au moins une page ou une plage (ex : 1-3, 5).' };
  }

  const parts = trimmed.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) {
    return { valid: false, pages: [], error: 'Format invalide. Exemple attendu : 1-3, 5, 8-' };
  }

  const selectedPagesSet = new Set<number>();

  for (const part of parts) {
    // Cas plage ouverte : "8-"
    if (/^\d+-$/.test(part)) {
      const start = parseInt(part.replace('-', ''), 10);
      if (start < 1) {
        return { valid: false, pages: [], error: 'Les numéros de page doivent commencer à 1.' };
      }
      if (start > totalPages) {
        return { valid: false, pages: [], error: `La page ${start} dépasse le nombre total de pages (${totalPages}).` };
      }
      for (let p = start; p <= totalPages; p++) {
        selectedPagesSet.add(p);
      }
      continue;
    }

    // Cas plage fermée : "1-3"
    if (/^\d+-\d+$/.test(part)) {
      const [startStr, endStr] = part.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);

      if (start < 1 || end < 1) {
        return { valid: false, pages: [], error: 'Les numéros de page doivent commencer à 1.' };
      }
      if (start > end) {
        return { valid: false, pages: [], error: `La plage "${part}" est inversée : le début (${start}) doit être inférieur à la fin (${end}).` };
      }
      if (end > totalPages) {
        return { valid: false, pages: [], error: `La plage "${part}" dépasse le nombre total de pages (${totalPages}).` };
      }

      for (let p = start; p <= end; p++) {
        selectedPagesSet.add(p);
      }
      continue;
    }

    // Cas page unique : "5"
    if (/^\d+$/.test(part)) {
      const pageNum = parseInt(part, 10);
      if (pageNum < 1) {
        return { valid: false, pages: [], error: 'Les numéros de page doivent commencer à 1.' };
      }
      if (pageNum > totalPages) {
        return { valid: false, pages: [], error: `La page ${pageNum} n'existe pas dans ce document (${totalPages} pages au total).` };
      }
      selectedPagesSet.add(pageNum);
      continue;
    }

    // Caractères invalides
    return {
      valid: false,
      pages: [],
      error: `La saisie "${part}" n'est pas reconnue. Utilise des chiffres séparés par des virgules ou des tirets (ex : 1-3, 5).`
    };
  }

  const sortedPages = Array.from(selectedPagesSet).sort((a, b) => a - b);
  if (sortedPages.length === 0) {
    return { valid: false, pages: [], error: 'Aucune page valide sélectionnée.' };
  }

  return { valid: true, pages: sortedPages };
}

/**
 * Mode 1 Séparer : Extraire des pages spécifiques dans un seul PDF
 */
export async function extractPagesToSinglePdf(
  file: File,
  pagesToExtract: number[], // 1-indexed
  onProgress?: (percent: number, message: string) => void
): Promise<{ pdfBytes: Uint8Array; extractedCount: number }> {
  onProgress?.(10, 'Lecture du document source…');
  const arrayBuffer = await file.arrayBuffer();
  const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: false });

  onProgress?.(30, 'Création du nouveau document…');
  const newDoc = await PDFDocument.create();

  // Conversion en 0-indexed
  const indices = pagesToExtract.map((p) => p - 1);
  onProgress?.(50, `Copie de ${indices.length} page(s)…`);
  const copiedPages = await newDoc.copyPages(srcDoc, indices);

  for (const page of copiedPages) {
    newDoc.addPage(page);
  }

  onProgress?.(85, 'Génération du fichier PDF final…');
  const pdfBytes = await newDoc.save();

  onProgress?.(100, `Extraction terminée : ${newDoc.getPageCount()} page(s).`);
  return { pdfBytes, extractedCount: newDoc.getPageCount() };
}

/**
 * Mode 2 Séparer : Une page par fichier livrées dans un fichier ZIP
 */
export async function splitPdfToOnePagePerFileZip(
  file: File,
  baseFilename: string,
  onProgress?: (percent: number, message: string) => void
): Promise<{ zipBlob: Blob; fileCount: number }> {
  onProgress?.(5, 'Chargement du document…');
  const arrayBuffer = await file.arrayBuffer();
  const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: false });
  const totalPages = srcDoc.getPageCount();

  const zip = new JSZip();
  const cleanBaseName = baseFilename.replace(/\.pdf$/i, '').trim() || 'document';

  for (let i = 0; i < totalPages; i++) {
    const percent = Math.round(10 + (i / totalPages) * 75);
    onProgress?.(percent, `Découpage de la page ${i + 1}/${totalPages}…`);

    const singleDoc = await PDFDocument.create();
    const [copiedPage] = await singleDoc.copyPages(srcDoc, [i]);
    singleDoc.addPage(copiedPage);

    const singleBytes = await singleDoc.save();
    const padLength = totalPages >= 100 ? 3 : totalPages >= 10 ? 2 : 1;
    const pageNumPadded = String(i + 1).padStart(padLength, '0');
    zip.file(`${cleanBaseName}-page-${pageNumPadded}.pdf`, singleBytes);
  }

  onProgress?.(90, 'Création de l’archive ZIP…');
  const zipBlob = await zip.generateAsync(
    { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
    (metadata) => {
      onProgress?.(90 + Math.round(metadata.percent * 0.1), 'Compression de l’archive ZIP…');
    }
  );

  onProgress?.(100, `Terminé : ${totalPages} fichiers créés dans l’archive ZIP.`);
  return { zipBlob, fileCount: totalPages };
}

/**
 * Mode 3 Séparer : Couper tous les N pages, livrés dans un fichier ZIP
 */
export async function splitPdfEveryNPagesZip(
  file: File,
  nPages: number,
  baseFilename: string,
  onProgress?: (percent: number, message: string) => void
): Promise<{ zipBlob: Blob; fileCount: number }> {
  if (nPages < 1) {
    throw new Error('Le nombre de pages par fichier doit être au moins 1.');
  }

  onProgress?.(5, 'Chargement du document…');
  const arrayBuffer = await file.arrayBuffer();
  const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: false });
  const totalPages = srcDoc.getPageCount();

  const zip = new JSZip();
  const cleanBaseName = baseFilename.replace(/\.pdf$/i, '').trim() || 'document';

  let partIndex = 1;
  let fileCount = 0;

  for (let startPage = 0; startPage < totalPages; startPage += nPages) {
    const endPage = Math.min(startPage + nPages, totalPages);
    const percent = Math.round(10 + (startPage / totalPages) * 75);
    onProgress?.(percent, `Création du bloc ${partIndex} (pages ${startPage + 1} à ${endPage})…`);

    const partDoc = await PDFDocument.create();
    const indicesToCopy: number[] = [];
    for (let p = startPage; p < endPage; p++) {
      indicesToCopy.push(p);
    }

    const copiedPages = await partDoc.copyPages(srcDoc, indicesToCopy);
    for (const page of copiedPages) {
      partDoc.addPage(page);
    }

    const partBytes = await partDoc.save();
    zip.file(`${cleanBaseName}-partie-${partIndex}-pages-${startPage + 1}-${endPage}.pdf`, partBytes);
    partIndex++;
    fileCount++;
  }

  onProgress?.(90, 'Création de l’archive ZIP…');
  const zipBlob = await zip.generateAsync(
    { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
    (metadata) => {
      onProgress?.(90 + Math.round(metadata.percent * 0.1), 'Compression de l’archive ZIP…');
    }
  );

  onProgress?.(100, `Terminé : ${fileCount} documents créés dans l’archive ZIP.`);
  return { zipBlob, fileCount };
}

/**
 * Télécharge directement un buffer ou un Blob sur l'appareil de l'utilisateur
 */
export function triggerFileDownload(blobOrBytes: Blob | Uint8Array, filename: string, mimeType = 'application/pdf'): void {
  const blob = blobOrBytes instanceof Blob ? blobOrBytes : new Blob([blobOrBytes as unknown as BlobPart], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 400);
}

/**
 * Génère un nom de fichier par défaut horodaté
 */
export function generateDefaultFilename(prefix: string, extension = 'pdf'): string {
  const now = new Date();
  const dateStr = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    '-',
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0')
  ].join('');
  return `${prefix}-${dateStr}.${extension}`;
}
