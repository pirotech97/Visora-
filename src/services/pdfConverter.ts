import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  } catch {
    // Fallback if needed
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
  }
}

import type { ConvertedPage } from '../types';
export type { ConvertedPage };

export async function convertPdfToImages(file: File): Promise<ConvertedPage[]> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const numPages = pdf.numPages;
  if (numPages > 10) {
    throw new Error("Document trop lourd, envoie 10 pages maximum.");
  }

  const pages: ConvertedPage[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);

    // 1. Rendu pleine résolution (scale 2.0 pour découpe ultra-nette des figures)
    const fullViewport = page.getViewport({ scale: 2.0 });
    const fullCanvas = document.createElement('canvas');
    const fullContext = fullCanvas.getContext('2d');
    fullCanvas.width = Math.floor(fullViewport.width);
    fullCanvas.height = Math.floor(fullViewport.height);

    if (!fullContext) {
      throw new Error("Impossible d'initialiser le rendu graphique du PDF.");
    }

    const renderContext: any = {
      canvasContext: fullContext,
      viewport: fullViewport,
      canvas: fullCanvas
    };

    await (page.render(renderContext) as any).promise;

    // 2. Version réduite à largeur max 1600 px pour l'envoi à la fonction extract
    let sendCanvas = fullCanvas;
    if (fullCanvas.width > 1600) {
      const scaledWidth = 1600;
      const scaledHeight = Math.round((fullCanvas.height * 1600) / fullCanvas.width);
      const downscaledCanvas = document.createElement('canvas');
      downscaledCanvas.width = scaledWidth;
      downscaledCanvas.height = scaledHeight;
      const downCtx = downscaledCanvas.getContext('2d');
      if (downCtx) {
        downCtx.drawImage(fullCanvas, 0, 0, scaledWidth, scaledHeight);
        sendCanvas = downscaledCanvas;
      }
    }

    // JPEG qualité 0.8 pour l'envoi à extract
    const base64DataUrl = sendCanvas.toDataURL('image/jpeg', 0.8);
    pages.push({
      base64: base64DataUrl,
      mimeType: 'image/jpeg',
      pageNumber: i,
      fullResCanvas: fullCanvas
    });
  }

  return pages;
}

export async function convertImageFileToPayload(file: File): Promise<ConvertedPage[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const MAX_WIDTH = 1600;
        let width = img.width;
        let height = img.height;

        // Largeur maximale 1600 px pour extract
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve([{ base64: dataUrl, mimeType: file.type || 'image/jpeg', pageNumber: 1, fullResImage: img }]);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // JPEG qualité 0.8
        const optimizedBase64 = canvas.toDataURL('image/jpeg', 0.8);
        resolve([{
          base64: optimizedBase64,
          mimeType: 'image/jpeg',
          pageNumber: 1,
          fullResImage: img
        }]);
      };
      img.onerror = () => {
        resolve([{ base64: dataUrl, mimeType: file.type || 'image/jpeg', pageNumber: 1 }]);
      };
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error('Erreur lors de la lecture de la photo.'));
    reader.readAsDataURL(file);
  });
}

export async function processDocumentFile(file: File): Promise<ConvertedPage[]> {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const isImage =
    file.type.startsWith('image/') ||
    /\.(jpg|jpeg|png|webp)$/i.test(file.name);

  let pages: ConvertedPage[];
  if (isPdf) {
    pages = await convertPdfToImages(file);
  } else if (isImage) {
    pages = await convertImageFileToPayload(file);
  } else {
    throw new Error('Format de fichier non supporté. Merci de fournir un fichier PDF, JPG ou PNG.');
  }

  // Vérifier la limite de 10 pages maximum
  if (pages.length > 10) {
    throw new Error("Document trop lourd, envoie 10 pages maximum.");
  }

  // Si le total dépasse 8 Mo, afficher "Document trop lourd, envoie moins de pages."
  let totalBytes = 0;
  for (const p of pages) {
    const raw = p.base64.split(',')[1] || p.base64;
    totalBytes += Math.round((raw.length * 3) / 4);
  }

  const MAX_PAYLOAD_BYTES = 8 * 1024 * 1024; // 8 Mo
  if (totalBytes > MAX_PAYLOAD_BYTES) {
    throw new Error("Document trop lourd, envoie moins de pages.");
  }

  return pages;
}
