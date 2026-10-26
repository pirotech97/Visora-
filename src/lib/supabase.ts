import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// NETTOYAGE ET VALIDATION DES VARIABLES D'ENVIRONNEMENT SUPABASE
// ============================================================================

export function cleanEnvValue(val?: string | null): string {
  if (!val) return '';
  return val
    .trim()
    .replace(/^["']+|["']+$/g, '')
    .trim();
}

export function cleanSupabaseUrl(url?: string | null): string {
  let cleaned = cleanEnvValue(url).replace(/\/+$/, '');
  const match = cleaned.match(/^(https:\/\/[a-z0-9_-]+\.supabase\.co)/i);
  if (match) {
    cleaned = match[1];
  }
  return cleaned;
}

export function cleanSupabaseKey(key?: string | null): string {
  return cleanEnvValue(key);
}

export function isValidSupabaseUrl(url: string): boolean {
  if (!url) return false;
  if (!url.startsWith('https://')) return false;
  if (!url.includes('.supabase.co')) return false;
  const lower = url.toLowerCase();
  if (
    lower.includes('your-project') ||
    lower.includes('placeholder') ||
    lower.includes('xxxx') ||
    lower.includes('<') ||
    lower.includes('>')
  ) {
    return false;
  }
  return true;
}

export function isValidSupabaseKey(key: string): boolean {
  if (!key) return false;
  const lower = key.toLowerCase();
  if (
    lower === 'your-anon-key' ||
    lower.includes('placeholder') ||
    lower.includes('xxxx') ||
    key.length < 20
  ) {
    return false;
  }
  return true;
}

// ============================================================================
// INSTANCE UNIQUE DU CLIENT SUPABASE
// ============================================================================

let currentUrl = '';
let currentAnonKey = '';
let supabaseInstance: SupabaseClient | null = null;
let isConfiguredState = false;

export function isSupabaseConfigured(): boolean {
  return isConfiguredState && supabaseInstance !== null;
}

export function getSupabaseDomain(): string {
  if (!currentUrl) return '';
  try {
    return new URL(currentUrl).hostname;
  } catch {
    return '';
  }
}

export function getSupabaseUrl(): string {
  return currentUrl;
}

export function getSupabaseAnonKey(): string {
  return currentAnonKey;
}

export function initSupabase(overrideUrl?: string, overrideKey?: string): boolean {
  const rawUrl = overrideUrl !== undefined ? overrideUrl : import.meta.env.VITE_SUPABASE_URL;
  const rawKey = overrideKey !== undefined ? overrideKey : import.meta.env.VITE_SUPABASE_ANON_KEY;

  const candidateUrl = cleanSupabaseUrl(rawUrl);
  const candidateKey = cleanSupabaseKey(rawKey);

  if (!isValidSupabaseUrl(candidateUrl) || !isValidSupabaseKey(candidateKey)) {
    console.warn('Variables Supabase absentes');
    supabaseInstance = null;
    isConfiguredState = false;
    currentUrl = '';
    currentAnonKey = '';
    return false;
  }

  try {
    currentUrl = candidateUrl;
    currentAnonKey = candidateKey;
    supabaseInstance = createClient(candidateUrl, candidateKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    });
    isConfiguredState = true;
    return true;
  } catch (err) {
    console.warn('Variables Supabase absentes');
    supabaseInstance = null;
    isConfiguredState = false;
    currentUrl = '';
    currentAnonKey = '';
    return false;
  }
}

// Initialisation au chargement du module avec les variables Vite
initSupabase();

export function getSupabase(): SupabaseClient | null {
  return supabaseInstance;
}

// Contrôle de santé discret : GET {URL}/auth/v1/health avec en-tête apikey
export async function checkSupabaseHealth(): Promise<boolean> {
  if (!isSupabaseConfigured() || !currentUrl || !currentAnonKey) {
    console.warn('Variables Supabase absentes');
    return false;
  }

  try {
    const cleanUrl = currentUrl.replace(/\/+$/, '');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`${cleanUrl}/auth/v1/health`, {
      method: 'GET',
      headers: {
        apikey: currentAnonKey
      },
      signal: controller.signal
    });
    clearTimeout(timer);

    return res.ok;
  } catch (err) {
    const domain = getSupabaseDomain();
    if (domain) {
      console.warn('Nom de domaine contacté :', domain);
    }
    return false;
  }
}
