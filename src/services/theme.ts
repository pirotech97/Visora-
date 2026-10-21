export type ThemeMode = 'auto' | 'light' | 'dark';

const STORAGE_KEY = 'visora_theme';

/**
 * Récupère le mode de thème enregistré (avec protection try/catch pour le localStorage)
 */
export function getStoredTheme(): ThemeMode {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (val === 'light' || val === 'dark' || val === 'auto') {
      return val;
    }
  } catch (err) {
    console.warn('Impossible de lire visora_theme depuis localStorage:', err);
  }
  return 'auto';
}

/**
 * Enregistre le mode de thème et l'applique immédiatement
 */
export function setStoredTheme(theme: ThemeMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch (err) {
    console.warn('Impossible d\'écrire visora_theme dans localStorage:', err);
  }
  applyTheme(theme);
}

/**
 * Applique le thème sur documentElement (classe .dark et attribut data-theme)
 */
export function applyTheme(theme: ThemeMode): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const prefersDark =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;

  const isDark = theme === 'dark' || (theme === 'auto' && prefersDark);

  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  root.setAttribute('data-theme', theme);
}

/**
 * Initialise le thème au chargement et écoute les changements système si mode auto
 */
export function initTheme(): () => void {
  const current = getStoredTheme();
  applyTheme(current);

  if (typeof window === 'undefined' || !window.matchMedia) {
    return () => {};
  }

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const listener = () => {
    const theme = getStoredTheme();
    if (theme === 'auto') {
      applyTheme('auto');
    }
  };

  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  } else if (typeof (mediaQuery as any).addListener === 'function') {
    (mediaQuery as any).addListener(listener);
    return () => (mediaQuery as any).removeListener(listener);
  }

  return () => {};
}
