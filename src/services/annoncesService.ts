import { getSupabase } from './supabase';
import type { Annonce } from '../types';

/**
 * Règle de validation d'un lien d'action pour une annonce :
 * - Jamais de "javascript:"
 * - Doit commencer par "https://" (externe) ou "/" (interne)
 * - Doit respecter la regex (^https://\S+$ ou ^/\S+$)
 */
export function isValidAnnonceLien(lien?: string | null): boolean {
  if (!lien || typeof lien !== 'string') return false;
  const trimmed = lien.trim();
  if (trimmed.toLowerCase().startsWith('javascript:')) return false;
  return /^https:\/\/\S+$/.test(trimmed) || /^\/\S*$/.test(trimmed);
}

/**
 * Appelle la fonction SQL annonces_a_afficher() via Supabase RPC.
 * Renvoie au plus 3 annonces actives, en cours, non vues par l'utilisateur connecté.
 * En cas d'erreur réseau ou indisponibilité, renvoie un tableau vide de façon silencieuse.
 */
export async function fetchAnnoncesAAfficher(): Promise<Annonce[]> {
  try {
    const client = getSupabase();
    if (!client) return [];

    const { data, error } = await client.rpc('annonces_a_afficher');
    if (error || !data || !Array.isArray(data)) {
      return [];
    }

    // Normalisation des colonnes reçues
    return data.map((item: any) => ({
      id: item.id,
      titre: String(item.titre || ''),
      message: String(item.message || ''),
      type: (['info', 'nouveaute', 'promo', 'important'].includes(item.type)
        ? item.type
        : 'info') as Annonce['type'],
      bouton_libelle: item.bouton_libelle ? String(item.bouton_libelle) : null,
      bouton_lien: item.bouton_lien ? String(item.bouton_lien) : null
    }));
  } catch {
    // Si l'appel échoue (réseau, erreur), ne montre rien et n'affiche aucune erreur
    return [];
  }
}

/**
 * Enregistre qu'une annonce a été vue par l'utilisateur connecté dans la table annonces_vues.
 * upsert avec { onConflict: "user_id,annonce_id", ignoreDuplicates: true }
 */
export async function marquerAnnonceVue(
  userId: string,
  annonceId: string | number
): Promise<boolean> {
  try {
    const client = getSupabase();
    if (!client) return false;

    const { error } = await client
      .from('annonces_vues')
      .upsert(
        { user_id: userId, annonce_id: annonceId },
        { onConflict: 'user_id,annonce_id', ignoreDuplicates: true }
      );

    return !error;
  } catch {
    return false;
  }
}
