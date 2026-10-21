import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import type { DocumentData, DocxBlock } from '../types';

export async function downloadImagesFromDocument(
  data: DocumentData,
  filename: string
): Promise<void> {
  const baseName = filename.replace(/\.[^/.]+$/, '');
  const A4_WIDTH = 794; // Largeur A4 fixe en px à 96 DPI
  const A4_HEIGHT = 1123; // Hauteur A4 standard en px

  // 1. Créer un conteneur temporaire hors écran de largeur fixe 794 px avec fond blanc
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-99999px';
  container.style.top = '0';
  container.style.width = `${A4_WIDTH}px`;
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#1e293b';
  container.style.padding = '56px'; // Marges intérieures équivalentes à ~2 cm
  container.style.boxSizing = 'border-box';
  container.style.fontFamily = 'Calibri, "Segoe UI", Roboto, sans-serif';
  container.style.lineHeight = '1.45';

  const blocks = Array.isArray(data?.blocs) ? data.blocs : [];

  for (const block of blocks) {
    if (block.type === 'titre') {
      const h = document.createElement(block.niveau === 1 ? 'h1' : block.niveau === 2 ? 'h2' : 'h3');
      h.textContent = block.texte;
      h.style.fontWeight = 'bold';
      h.style.color = '#0f172a';
      h.style.margin = block.niveau === 1 ? '22px 0 10px' : '16px 0 8px';
      h.style.fontSize = block.niveau === 1 ? '24px' : block.niveau === 2 ? '19px' : '16px';
      container.appendChild(h);
    } else if (block.type === 'paragraphe') {
      const p = document.createElement('p');
      p.textContent = block.texte;
      p.style.fontSize = '14px';
      p.style.margin = '0 0 10px';
      p.style.fontWeight = block.gras ? '600' : 'normal';
      p.style.color = block.gras ? '#0f172a' : '#334155';

      if (block.alignement === 'centre') p.style.textAlign = 'center';
      else if (block.alignement === 'droite') p.style.textAlign = 'right';
      else if (block.alignement === 'justifie') p.style.textAlign = 'justify';
      else p.style.textAlign = 'left';

      container.appendChild(p);
    } else if (block.type === 'liste') {
      const ul = document.createElement('ul');
      ul.style.listStyleType = 'disc';
      ul.style.paddingLeft = '24px';
      ul.style.margin = '6px 0 12px';

      for (const el of block.elements || []) {
        const li = document.createElement('li');
        li.textContent = el;
        li.style.fontSize = '14px';
        li.style.color = '#334155';
        li.style.margin = '3px 0';
        ul.appendChild(li);
      }
      container.appendChild(ul);
    } else if (block.type === 'tableau') {
      const rows = block.lignes || [];
      if (rows.length > 0) {
        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.margin = '14px 0 18px';
        table.style.fontSize = '13px';

        rows.forEach((row, rIdx) => {
          const tr = document.createElement('tr');
          const isHeader = rIdx === 0;
          if (isHeader) tr.style.backgroundColor = '#f8fafc';

          (Array.isArray(row) ? row : [row]).forEach((cell) => {
            const td = document.createElement('td');
            td.textContent = String(cell ?? '');
            td.style.border = '1px solid #cbd5e1';
            td.style.padding = '8px 10px';
            td.style.color = isHeader ? '#0f172a' : '#334155';
            if (isHeader) td.style.fontWeight = 'bold';
            tr.appendChild(td);
          });
          table.appendChild(tr);
        });
        container.appendChild(table);
      }
    } else if (block.type === 'figure') {
      if (!block.image) continue;

      const figDiv = document.createElement('div');
      figDiv.style.textAlign = 'center';
      figDiv.style.margin = '16px 0';

      const img = document.createElement('img');
      img.src = block.image;
      img.style.maxWidth = '100%';
      img.style.display = 'inline-block';
      img.style.borderRadius = '6px';
      figDiv.appendChild(img);

      if (block.legende && block.legende.trim()) {
        const caption = document.createElement('p');
        caption.textContent = block.legende.trim();
        caption.style.fontSize = '12px';
        caption.style.fontStyle = 'italic';
        caption.style.color = '#64748b';
        caption.style.margin = '4px 0 0';
        figDiv.appendChild(caption);
      }
      container.appendChild(figDiv);
    }
  }

function sanitizeColor(val: string): string {
  if (typeof val === 'string' && val.includes('oklch')) {
    if (val.includes('none') || val.includes('0%') || val.includes('/ 0')) {
      return 'rgba(0, 0, 0, 0)';
    }
    try {
      const cvs = document.createElement('canvas');
      cvs.width = 1;
      cvs.height = 1;
      const ctx = cvs.getContext('2d');
      if (ctx) {
        ctx.fillStyle = val;
        return ctx.fillStyle;
      }
    } catch {
      // fallback
    }
    return 'rgb(255, 255, 255)';
  }
  return val;
}

function createStyleProxy(style: CSSStyleDeclaration): CSSStyleDeclaration {
  return new Proxy(style, {
    get(target, prop) {
      if (prop === 'getPropertyValue') {
        return (propertyName: string) => {
          const raw = target.getPropertyValue(propertyName);
          return sanitizeColor(raw);
        };
      }
      const val = (target as any)[prop];
      if (typeof val === 'string' && val.includes('oklch')) {
        return sanitizeColor(val);
      }
      return typeof val === 'function' ? val.bind(target) : val;
    }
  });
}

  document.body.appendChild(container);

  const originalGetComputedStyle = window.getComputedStyle;

  try {
    // Intercepter temporairement getComputedStyle du window principal pour neutraliser tout oklch
    window.getComputedStyle = function (el: Element, pseudo?: string | null) {
      const style = originalGetComputedStyle.call(window, el, pseudo);
      return createStyleProxy(style);
    };

    // Attendre le préchargement des images du conteneur avant la capture
    const imgElements = Array.from(container.querySelectorAll('img'));
    if (imgElements.length > 0) {
      await Promise.all(
        imgElements.map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete) resolve();
              else {
                img.onload = () => resolve();
                img.onerror = () => resolve();
              }
            })
        )
      );
    }

    // 2. Capture avec html2canvas (largeur fixe 794 px, fond blanc, échelle 2 pour la netteté)
    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: '#ffffff',
      width: A4_WIDTH,
      useCORS: true,
      logging: false,
      onclone: (clonedDoc, element) => {
        // Intercepter getComputedStyle de l'iframe interne de clonage
        if (clonedDoc.defaultView) {
          const origCloneComputedStyle = clonedDoc.defaultView.getComputedStyle;
          clonedDoc.defaultView.getComputedStyle = function (el: Element, pseudo?: string | null) {
            const style = origCloneComputedStyle.call(clonedDoc.defaultView, el, pseudo);
            return createStyleProxy(style);
          };
        }

        // Supprimer toutes les balises <style> et <link> (qui contiennent les règles oklch de Tailwind v4)
        const styles = clonedDoc.querySelectorAll('style, link[rel="stylesheet"]');
        styles.forEach((el) => el.remove());

        // Réinitialiser explicitement documentElement et body en couleurs RGB standards
        clonedDoc.documentElement.style.backgroundColor = '#ffffff';
        clonedDoc.documentElement.style.color = '#1e293b';
        clonedDoc.body.style.backgroundColor = '#ffffff';
        clonedDoc.body.style.color = '#1e293b';
        clonedDoc.body.style.margin = '0';
        clonedDoc.body.style.padding = '0';

        // Positionner l'élément cloné
        if (element) {
          element.style.position = 'relative';
          element.style.left = '0';
          element.style.top = '0';
          element.style.backgroundColor = '#ffffff';
          element.style.color = '#1e293b';
        }
      }
    });

    const scaledA4Height = A4_HEIGHT * 2; // hauteur A4 en pixels rééchelonnés

    if (canvas.height <= scaledA4Height) {
      // Cas 1 : Rendu tenant sur une seule page A4 -> Téléchargement d'un seul PNG
      await new Promise<void>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) {
            downloadBlob(blob, `${baseName}.png`);
          }
          resolve();
        }, 'image/png');
      });
    } else {
      // Cas 2 : Rendu dépassant la hauteur d'une page A4 -> Découpe en pages A4 et ZIP
      const totalPages = Math.ceil(canvas.height / scaledA4Height);
      const zip = new JSZip();

      for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
        const sliceY = pageIdx * scaledA4Height;
        const currentSliceHeight = Math.min(scaledA4Height, canvas.height - sliceY);

        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = scaledA4Height;

        const ctx = pageCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          ctx.drawImage(
            canvas,
            0,
            sliceY,
            canvas.width,
            currentSliceHeight,
            0,
            0,
            canvas.width,
            currentSliceHeight
          );
        }

        const dataUrl = pageCanvas.toDataURL('image/png');
        const base64Data = dataUrl.split(',')[1];
        zip.file(`page-${pageIdx + 1}.png`, base64Data, { base64: true });
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(zipBlob, `${baseName}.zip`);
    }
  } finally {
    window.getComputedStyle = originalGetComputedStyle;
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    if (document.body.contains(a)) {
      document.body.removeChild(a);
    }
    URL.revokeObjectURL(url);
  }, 200);
}
