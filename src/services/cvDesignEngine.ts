// ============================================================================
// MOTEUR DE CONFIGURATION DES MODÈLES DE CV (VISORA)
// Traitement 100% dans le navigateur - Aucun crédit, aucun appel serveur
// ============================================================================

export type CvTemplateId =
  | 'classique'
  | 'barre-laterale'
  | 'bandeau'
  | 'minimal'
  | 'chronologie'
  | 'compact';

export interface CvTemplateConfig {
  id: CvTemplateId;
  name: string;
  tagline: string;
  description: string;
  defaultAccent: string;
  layout: 'single-column' | 'sidebar-left' | 'banner-top' | 'minimal' | 'timeline' | 'compact';
  badge: string;
}

export interface CvDesignOptions {
  templateId: CvTemplateId;
  accentColor: string;
  fontFamily: 'sans' | 'serif';
  fontSize: 'normal' | 'compact';
  photoUrl?: string | null;
  photoShape: 'round' | 'square';
  hiddenSections: {
    competences: boolean;
    langues: boolean;
    centresInteret: boolean;
  };
}

export const PRESET_ACCENT_COLORS: Array<{ name: string; hex: string }> = [
  { name: 'Bleu Visorax', hex: '#2563EB' },
  { name: 'Émeraude', hex: '#059669' },
  { name: 'Indigo', hex: '#4F46E5' },
  { name: 'Bourgogne', hex: '#B91C1C' },
  { name: 'Ambre', hex: '#D97706' },
  { name: 'Ardoise', hex: '#334155' },
  { name: 'Sarcelle', hex: '#0D9488' },
  { name: 'Violet royal', hex: '#7C3AED' }
];

export const CV_TEMPLATES: CvTemplateConfig[] = [
  {
    id: 'classique',
    name: 'Classique',
    tagline: 'Élégant & intemporel',
    description: 'Une colonne, nom centré en grande taille, fine ligne de séparation, style sobre et universel.',
    defaultAccent: '#2563EB',
    layout: 'single-column',
    badge: 'Recommandé'
  },
  {
    id: 'barre-laterale',
    name: 'Barre latérale',
    tagline: 'Colonne teintée 32%',
    description: 'Bande latérale colorée avec contact, compétences et langues ; grand espace à droite.',
    defaultAccent: '#2563EB',
    layout: 'sidebar-left',
    badge: 'Moderne'
  },
  {
    id: 'bandeau',
    name: 'Bandeau',
    tagline: 'En-tête premium',
    description: 'Grand bandeau coloré en haut avec photo à droite, corps structuré en 2 colonnes.',
    defaultAccent: '#4F46E5',
    layout: 'banner-top',
    badge: 'Impactant'
  },
  {
    id: 'minimal',
    name: 'Minimal',
    tagline: 'Épuré & spacieux',
    description: 'Beaucoup d’espace blanc, typographie légère, titres gris avec accent subtil.',
    defaultAccent: '#334155',
    layout: 'minimal',
    badge: 'Épuré'
  },
  {
    id: 'chronologie',
    name: 'Chronologie',
    tagline: 'Ligne temporelle',
    description: 'Ligne verticale ponctuée de pastilles d’accent reliant ton parcours d’expériences.',
    defaultAccent: '#0D9488',
    layout: 'timeline',
    badge: 'Visuel'
  },
  {
    id: 'compact',
    name: 'Compact',
    tagline: 'Haute densité 1 page',
    description: 'Marges réduites, compétences sur 2 colonnes, idéal pour les parcours riches.',
    defaultAccent: '#059669',
    layout: 'compact',
    badge: '1 Page'
  }
];

const PREFS_STORAGE_KEY = 'visora_cv_design_prefs';

export const DEFAULT_DESIGN_OPTIONS: CvDesignOptions = {
  templateId: 'classique',
  accentColor: '#2563EB',
  fontFamily: 'sans',
  fontSize: 'normal',
  photoUrl: null,
  photoShape: 'round',
  hiddenSections: {
    competences: false,
    langues: false,
    centresInteret: false
  }
};

/**
 * Charge les préférences de design depuis localStorage
 * (Ne stocke et ne lit JAMAIS le contenu du CV ou des données personnelles)
 */
export function loadCvDesignPrefs(): CvDesignOptions {
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_DESIGN_OPTIONS };
    const parsed = JSON.parse(raw);

    const validTemplate = CV_TEMPLATES.some((t) => t.id === parsed.templateId)
      ? parsed.templateId
      : DEFAULT_DESIGN_OPTIONS.templateId;

    const validAccent = typeof parsed.accentColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(parsed.accentColor)
      ? parsed.accentColor
      : DEFAULT_DESIGN_OPTIONS.accentColor;

    const validFont = parsed.fontFamily === 'serif' ? 'serif' : 'sans';
    const validSize = parsed.fontSize === 'compact' ? 'compact' : 'normal';
    const validShape = parsed.photoShape === 'square' ? 'square' : 'round';

    return {
      templateId: validTemplate,
      accentColor: validAccent,
      fontFamily: validFont,
      fontSize: validSize,
      photoUrl: null, // la photo n'est jamais stockée dans localStorage pour respecter la mémoire
      photoShape: validShape,
      hiddenSections: {
        competences: Boolean(parsed.hiddenSections?.competences),
        langues: Boolean(parsed.hiddenSections?.langues),
        centresInteret: Boolean(parsed.hiddenSections?.centresInteret)
      }
    };
  } catch {
    return { ...DEFAULT_DESIGN_OPTIONS };
  }
}

/**
 * Mémorise le modèle, la couleur et les réglages de design dans localStorage
 */
export function saveCvDesignPrefs(options: CvDesignOptions): void {
  try {
    const dataToSave = {
      templateId: options.templateId,
      accentColor: options.accentColor,
      fontFamily: options.fontFamily,
      fontSize: options.fontSize,
      photoShape: options.photoShape,
      hiddenSections: options.hiddenSections
    };
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(dataToSave));
  } catch {
    // ignore quotas
  }
}

/**
 * Recadre et compresse une photo de profil 100% dans le navigateur
 * Limite à 5 Mo, redimensionne à 360x360 px maximum, applique masque rond ou carré
 */
export async function processProfilePhoto(
  file: File,
  shape: 'round' | 'square' = 'round'
): Promise<string> {
  const MAX_SIZE = 5 * 1024 * 1024; // 5 Mo
  if (file.size > MAX_SIZE) {
    throw new Error('La photo dépasse la taille maximale autorisée de 5 Mo.');
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('Veuillez sélectionner un fichier image valide (JPG ou PNG).');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Erreur de lecture de l’image.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Format d’image non supporté.'));
      img.onload = () => {
        try {
          const targetSize = 360;
          const canvas = document.createElement('canvas');
          canvas.width = targetSize;
          canvas.height = targetSize;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(reader.result as string);
            return;
          }

          // Découpe carrée centrée
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;

          if (shape === 'round') {
            ctx.beginPath();
            ctx.arc(targetSize / 2, targetSize / 2, targetSize / 2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
          }

          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize);
          const dataUrl = canvas.toDataURL(shape === 'round' ? 'image/png' : 'image/jpeg', 0.88);
          resolve(dataUrl);
        } catch {
          resolve(reader.result as string);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
