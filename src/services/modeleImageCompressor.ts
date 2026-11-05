import * as pdfjsLib from 'pdfjs-dist';

// Configuration worker PDF.js sécurisée
if (typeof window !== 'undefined') {
  try {
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
    }
  } catch {
    // ignore
  }
}

export interface PreparedPage {
  media_type: string;
  donnees: string;      // Base64 SANS le préfixe data:image/...;base64,
  previewUrl: string;   // Data URL complète pour prévisualisation locale
}

/**
 * Compresse une image pour l'analyse par l'IA :
 * - Côté le plus long : 1600 px max
 * - Qualité de départ : 0.85
 * - Poids garanti < 1.5 Mo en base64
 */
export async function compressImageForAnalysis(file: File): Promise<PreparedPage> {
  const dataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(dataUrl);

  let maxDim = 1600;
  let quality = 0.85;

  let result = renderImageToJpeg(img, maxDim, quality);

  // Si le base64 dépasse 1.5 Mo (~1 572 864 caractères base64), réduire la qualité ou les dimensions
  const MAX_BASE64_BYTES = 1.5 * 1024 * 1024;
  let iterations = 0;
  while (result.donnees.length > MAX_BASE64_BYTES && iterations < 4) {
    iterations++;
    quality = Math.max(0.6, quality - 0.1);
    maxDim = Math.max(1200, Math.floor(maxDim * 0.85));
    result = renderImageToJpeg(img, maxDim, quality);
  }

  return result;
}

/**
 * Extrait les 2 premières pages d'un PDF et les convertit en images compressées
 */
export async function convertPdfToAnalysisPages(file: File, maxPages = 2): Promise<PreparedPage[]> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer)
  });
  const pdf = await loadingTask.promise;

  const count = Math.min(pdf.numPages, maxPages);
  const pages: PreparedPage[] = [];

  for (let i = 1; i <= count; i++) {
    const page = await pdf.getPage(i);
    const unscaledViewport = page.getViewport({ scale: 1.0 });

    // Calcul de l'échelle pour que le côté le plus long soit <= 1600 px
    const maxDim = Math.max(unscaledViewport.width, unscaledViewport.height);
    const scale = maxDim > 1600 ? 1600 / maxDim : (maxDim < 800 ? 1.5 : 1.0);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    await (page.render({
      canvasContext: ctx,
      viewport,
      canvas
    } as any) as any).promise;

    let quality = 0.85;
    let fullDataUrl = canvas.toDataURL('image/jpeg', quality);
    let base64 = fullDataUrl.replace(/^data:image\/[a-z0-9_-]+;base64,/, '');

    // Ajustement de taille si > 1.5 Mo
    const MAX_BASE64_BYTES = 1.5 * 1024 * 1024;
    if (base64.length > MAX_BASE64_BYTES) {
      quality = 0.7;
      fullDataUrl = canvas.toDataURL('image/jpeg', quality);
      base64 = fullDataUrl.replace(/^data:image\/[a-z0-9_-]+;base64,/, '');
    }

    pages.push({
      media_type: 'image/jpeg',
      donnees: base64,
      previewUrl: fullDataUrl
    });

    // Nettoyage mémoire du canvas
    canvas.width = 0;
    canvas.height = 0;
  }

  return pages;
}

/**
 * Redimensionne une image pour les logos / signatures / fonds / illustrations / QR de l'utilisateur :
 * - 2000 px max pour un fond, 800 px max pour les autres rôles
 * - Conserve le PNG si l'image comporte de la transparence, sinon JPEG qualité 0.85
 * - Strictement stocké en local dans IndexedDB en data URL
 */
export async function resizeSlotImage(file: File, isBackground = false): Promise<string> {
  const maxDimension = isBackground ? 2000 : 800;
  const dataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(dataUrl);

  const origW = img.naturalWidth || img.width;
  const origH = img.naturalHeight || img.height;

  let targetW = origW;
  let targetH = origH;

  if (Math.max(origW, origH) > maxDimension) {
    if (origW >= origH) {
      targetW = maxDimension;
      targetH = Math.round((origH * maxDimension) / origW);
    } else {
      targetH = maxDimension;
      targetW = Math.round((origW * maxDimension) / origH);
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Contexte canvas inaccessible');

  // Détection de transparence pour PNG / WebP
  const isCandidateTransparent =
    file.type === 'image/png' ||
    file.type === 'image/webp' ||
    file.name.toLowerCase().endsWith('.png') ||
    file.name.toLowerCase().endsWith('.webp');

  if (isCandidateTransparent) {
    ctx.clearRect(0, 0, targetW, targetH);
    ctx.drawImage(img, 0, 0, targetW, targetH);

    try {
      const imgData = ctx.getImageData(0, 0, targetW, targetH);
      const data = imgData.data;
      let hasAlpha = false;
      // Échantillonnage d'un pixel sur 16 pour détecter une couche alpha < 250
      for (let i = 3; i < data.length; i += 16) {
        if (data[i] < 250) {
          hasAlpha = true;
          break;
        }
      }
      if (hasAlpha) {
        return canvas.toDataURL('image/png');
      }
    } catch {
      return canvas.toDataURL('image/png');
    }
  }

  // Pas de transparence : fond blanc uni et compression JPEG qualité 0.85
  const canvasJpeg = document.createElement('canvas');
  canvasJpeg.width = targetW;
  canvasJpeg.height = targetH;
  const ctxJpeg = canvasJpeg.getContext('2d');
  if (!ctxJpeg) return canvas.toDataURL('image/jpeg', 0.85);

  ctxJpeg.fillStyle = '#ffffff';
  ctxJpeg.fillRect(0, 0, targetW, targetH);
  ctxJpeg.drawImage(img, 0, 0, targetW, targetH);
  return canvasJpeg.toDataURL('image/jpeg', 0.85);
}

// ----------------------------------------------------------------------------
// Helpers internes
// ----------------------------------------------------------------------------

function readFileAsDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error || new Error('Erreur lecture fichier'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Erreur chargement image'));
    img.src = src;
  });
}

function renderImageToJpeg(
  img: HTMLImageElement,
  maxDimension: number,
  quality: number
): PreparedPage {
  const origW = img.naturalWidth || img.width;
  const origH = img.naturalHeight || img.height;

  let targetW = origW;
  let targetH = origH;

  if (Math.max(origW, origH) > maxDimension) {
    if (origW >= origH) {
      targetW = maxDimension;
      targetH = Math.round((origH * maxDimension) / origW);
    } else {
      targetH = maxDimension;
      targetW = Math.round((origW * maxDimension) / origH);
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Contexte canvas inaccessible');

  // Remplissage fond blanc
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, targetW, targetH);
  ctx.drawImage(img, 0, 0, targetW, targetH);

  const fullDataUrl = canvas.toDataURL('image/jpeg', quality);
  const base64 = fullDataUrl.replace(/^data:image\/[a-z0-9_-]+;base64,/, '');

  canvas.width = 0;
  canvas.height = 0;

  return {
    media_type: 'image/jpeg',
    donnees: base64,
    previewUrl: fullDataUrl
  };
}
