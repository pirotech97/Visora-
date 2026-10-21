import type { DocumentData, ConvertedPage, FigureBlock } from '../types';

/**
 * Découpe les zones de figures (photos, logos, schémas, signatures)
 * à partir du rendu pleine résolution de chaque page.
 *
 * Coordonnées bbox relatives de 0 à 1000 : [ymin, xmin, ymax, xmax].
 * Réduction à 900 px de large maximum, JPEG qualité 0,85.
 * Maximum 8 figures par document (les suivantes sont ignorées).
 */
export async function cropFiguresInDocument(
  docData: DocumentData,
  pages: ConvertedPage[]
): Promise<DocumentData> {
  if (!docData || !Array.isArray(docData.blocs) || pages.length === 0) {
    return docData;
  }

  let figureCount = 0;

  for (const block of docData.blocs) {
    if (block.type === 'figure') {
      figureCount++;

      // Règle : Maximum 8 figures par document ; ignorer les suivantes
      if (figureCount > 8) {
        continue;
      }

      // Si le bloc a déjà son image découpée
      if (block.image) {
        if ('bbox' in block) delete (block as any).bbox;
        continue;
      }

      // Vérifier la présence de la boîte de découpe bbox
      if (!block.bbox || !Array.isArray(block.bbox) || block.bbox.length !== 4) {
        continue;
      }

      // Page correspondante (1-indexed)
      const targetPageNum = typeof block.page === 'number' && block.page >= 1 ? block.page : 1;
      const page = pages.find((p) => p.pageNumber === targetPageNum) || pages[0];

      if (!page) {
        continue;
      }

      // Source graphique en pleine résolution (canvas ou élément image)
      const sourceElement = page.fullResCanvas || page.fullResImage;
      if (!sourceElement) {
        continue;
      }

      const pageWidth = page.fullResCanvas
        ? page.fullResCanvas.width
        : page.fullResImage?.naturalWidth || page.fullResImage?.width || 1000;

      const pageHeight = page.fullResCanvas
        ? page.fullResCanvas.height
        : page.fullResImage?.naturalHeight || page.fullResImage?.height || 1000;

      const [ymin, xmin, ymax, xmax] = block.bbox;

      // Calcul des coordonnées et dimensions réelles
      const rawX = (xmin / 1000) * pageWidth;
      const rawY = (ymin / 1000) * pageHeight;
      const rawWidth = ((xmax - xmin) / 1000) * pageWidth;
      const rawHeight = ((ymax - ymin) / 1000) * pageHeight;

      // Délimiter aux bornes de la page
      const cropX = Math.max(0, Math.floor(rawX));
      const cropY = Math.max(0, Math.floor(rawY));
      const cropWidth = Math.min(pageWidth - cropX, Math.ceil(rawWidth));
      const cropHeight = Math.min(pageHeight - cropY, Math.ceil(rawHeight));

      if (cropWidth <= 0 || cropHeight <= 0) {
        continue;
      }

      // Réduire à 900 px de large maximum tout en préservant le ratio
      let destWidth = cropWidth;
      let destHeight = cropHeight;

      if (destWidth > 900) {
        destHeight = Math.round((destHeight * 900) / destWidth);
        destWidth = 900;
      }

      // Découpe via canvas
      const canvas = document.createElement('canvas');
      canvas.width = destWidth;
      canvas.height = destHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        continue;
      }

      ctx.drawImage(
        sourceElement,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        destWidth,
        destHeight
      );

      // Conversion en JPEG qualité 0.85
      const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.85);

      // Stocker le résultat dans le champ image
      block.image = croppedDataUrl;

      // Supprimer le champ bbox une fois la découpe faite
      delete (block as any).bbox;
    }
  }

  return docData;
}
