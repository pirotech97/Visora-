// ============================================================================
// MOTEUR DE DESIGN COMMUN POUR LETTRES, DEVIS & FACTURES (VISORA)
// Traitement 100% dans le navigateur - Gratuit, aucun crédit, aucun appel serveur
// ============================================================================

export const PRESET_ACCENT_COLORS: Array<{ name: string; hex: string }> = [
  { name: 'Bleu Visora', hex: '#2563EB' },
  { name: 'Émeraude', hex: '#059669' },
  { name: 'Indigo', hex: '#4F46E5' },
  { name: 'Bourgogne', hex: '#B91C1C' },
  { name: 'Ambre', hex: '#D97706' },
  { name: 'Ardoise', hex: '#334155' },
  { name: 'Sarcelle', hex: '#0D9488' },
  { name: 'Violet royal', hex: '#7C3AED' }
];

// ============================================================================
// LETTRES ADMINISTRATIVES
// ============================================================================

export type LetterTemplateId = 'classique' | 'moderne' | 'sobre';

export interface LetterTemplateConfig {
  id: LetterTemplateId;
  name: string;
  tagline: string;
  description: string;
  badge?: string;
}

export interface LetterDesignOptions {
  templateId: LetterTemplateId;
  accentColor: string;
  fontFamily: 'sans' | 'serif';
  fontSize: 'normal' | 'compact';
}

export const LETTER_TEMPLATES: LetterTemplateConfig[] = [
  {
    id: 'classique',
    name: 'Classique',
    tagline: 'Standard administratif français',
    description: 'Expéditeur en haut à gauche, destinataire à droite, objet en gras, texte justifié.',
    badge: 'Standard'
  },
  {
    id: 'moderne',
    name: 'Moderne',
    tagline: 'Colonne latérale & bandeau fin',
    description: "Bandeau fin d'accent avec le nom, coordonnées en colonne latérale étroite, texte aéré.",
    badge: 'Tendance'
  },
  {
    id: 'sobre',
    name: 'Sobre',
    tagline: 'Élégant & pied de page',
    description: "Nom en grandes lettres, filet d'accent sous l'en-tête, coordonnées discrètes en pied de page.",
    badge: 'Épuré'
  }
];

export const DEFAULT_LETTER_DESIGN_OPTIONS: LetterDesignOptions = {
  templateId: 'classique',
  accentColor: '#2563EB',
  fontFamily: 'sans',
  fontSize: 'normal'
};

const STORAGE_LETTER_PREFS_KEY = 'visora_letter_design_prefs';

export function loadLetterDesignPrefs(): LetterDesignOptions {
  try {
    const raw = localStorage.getItem(STORAGE_LETTER_PREFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        templateId: ['classique', 'moderne', 'sobre'].includes(parsed.templateId)
          ? parsed.templateId
          : 'classique',
        accentColor: typeof parsed.accentColor === 'string' ? parsed.accentColor : '#2563EB',
        fontFamily: ['sans', 'serif'].includes(parsed.fontFamily) ? parsed.fontFamily : 'sans',
        fontSize: ['normal', 'compact'].includes(parsed.fontSize) ? parsed.fontSize : 'normal'
      };
    }
  } catch {
    // fallback
  }
  return { ...DEFAULT_LETTER_DESIGN_OPTIONS };
}

export function saveLetterDesignPrefs(options: LetterDesignOptions): void {
  try {
    const toSave = {
      templateId: options.templateId,
      accentColor: options.accentColor,
      fontFamily: options.fontFamily,
      fontSize: options.fontSize
    };
    localStorage.setItem(STORAGE_LETTER_PREFS_KEY, JSON.stringify(toSave));
  } catch {
    // ignore
  }
}

// ============================================================================
// DEVIS & FACTURES
// ============================================================================

export type InvoiceTemplateId = 'sobre' | 'colore' | 'bandeau' | 'minimal';

export interface InvoiceTemplateConfig {
  id: InvoiceTemplateId;
  name: string;
  tagline: string;
  description: string;
  badge?: string;
}

export interface InvoiceDesignOptions {
  templateId: InvoiceTemplateId;
  accentColor: string;
  fontFamily: 'sans' | 'serif';
  fontSize: 'normal' | 'compact';
  logoUrl?: string | null;
}

export const INVOICE_TEMPLATES: InvoiceTemplateConfig[] = [
  {
    id: 'sobre',
    name: 'Sobre',
    tagline: 'Simple & intemporel',
    description: 'En-tête simple, tableau avec fins traits horizontaux, totaux alignés à droite.',
    badge: 'Universel'
  },
  {
    id: 'colore',
    name: 'Coloré',
    tagline: 'Tableau teinté & rangs alternés',
    description: "En-tête et titres de colonnes dans la couleur d'accent, lignes alternées en gris très clair.",
    badge: 'Professionnel'
  },
  {
    id: 'bandeau',
    name: 'Bandeau',
    tagline: 'Bandeau supérieur impactant',
    description: 'Grand bandeau coloré avec DEVIS ou FACTURE et le numéro, blocs émetteur et client côte à côte.',
    badge: 'Premium'
  },
  {
    id: 'minimal',
    name: 'Minimal',
    tagline: 'Aéré & encadré discret',
    description: 'Très aéré, typographie légère, totaux synthétisés dans un encadré discret.',
    badge: 'Épuré'
  }
];

export const DEFAULT_INVOICE_DESIGN_OPTIONS: InvoiceDesignOptions = {
  templateId: 'sobre',
  accentColor: '#2563EB',
  fontFamily: 'sans',
  fontSize: 'normal',
  logoUrl: null
};

const STORAGE_INVOICE_PREFS_KEY = 'visora_invoice_design_prefs';

export function loadInvoiceDesignPrefs(): InvoiceDesignOptions {
  try {
    const raw = localStorage.getItem(STORAGE_INVOICE_PREFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        templateId: ['sobre', 'colore', 'bandeau', 'minimal'].includes(parsed.templateId)
          ? parsed.templateId
          : 'sobre',
        accentColor: typeof parsed.accentColor === 'string' ? parsed.accentColor : '#2563EB',
        fontFamily: ['sans', 'serif'].includes(parsed.fontFamily) ? parsed.fontFamily : 'sans',
        fontSize: ['normal', 'compact'].includes(parsed.fontSize) ? parsed.fontSize : 'normal',
        logoUrl: typeof parsed.logoUrl === 'string' ? parsed.logoUrl : null
      };
    }
  } catch {
    // fallback
  }
  return { ...DEFAULT_INVOICE_DESIGN_OPTIONS };
}

export function saveInvoiceDesignPrefs(options: InvoiceDesignOptions): void {
  try {
    const toSave = {
      templateId: options.templateId,
      accentColor: options.accentColor,
      fontFamily: options.fontFamily,
      fontSize: options.fontSize,
      logoUrl: options.logoUrl || null
    };
    localStorage.setItem(STORAGE_INVOICE_PREFS_KEY, JSON.stringify(toSave));
  } catch {
    // ignore
  }
}

/**
 * Traite un logo d'entreprise côté navigateur :
 * - Vérifie le format (PNG ou JPG)
 * - Vérifie la taille maximale (2 Mo)
 * - Redimensionne proprement si nécessaire pour optimiser la mémoire et l'export
 * - Ne transmet jamais le fichier au serveur
 */
export async function processLogoImage(file: File): Promise<string> {
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Format non supporté. Utilise une image PNG ou JPG.');
  }

  const MAX_BYTES = 2 * 1024 * 1024; // 2 Mo max
  if (file.size > MAX_BYTES) {
    throw new Error('Image trop lourde. La taille maximale autorisée est de 2 Mo.');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Erreur lors de la lecture du fichier.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Impossible de charger l'image."));
      img.onload = () => {
        // Redimensionnement max 600px en préservant le ratio
        const maxDim = 600;
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // PNG pour préserver la transparence si présente
        const dataUrl = canvas.toDataURL('image/png');
        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
