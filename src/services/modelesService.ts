import { getSupabase } from './supabase';
import type { Modele } from '../lib/rendu';
import { deleteModeleAllImages } from './modeleImagesDb';

export const COUT_ANALYSE_AFFICHE = 3;
export const MAX_MODELES_PAR_UTILISATEUR = 20;

export interface AnalyserModeleResult {
  success: boolean;
  data?: {
    modele_id: string;
    type: string;
    nom: string;
    gabarit: string;
    css: string;
    champs: Modele['champs'];
    groupes: Modele['groupes'];
    images: Modele['images'];
    avertissements?: string[];
    credits_restants?: number;
    cout?: number;
  };
  error?: string;
  isInsufficientCredits?: boolean;
  isLimitReached?: boolean;
  creditsRestants?: number;
}

/**
 * Récupère la liste des modèles de l'utilisateur connecté
 */
export async function fetchUserModeles(userId: string): Promise<{ data: Modele[]; error: string | null }> {
  const client = getSupabase();
  if (!client) {
    return { data: [], error: 'Connexion indisponible' };
  }

  try {
    const { data, error } = await client
      .from('modeles_utilisateur')
      .select('id, user_id, nom, type, gabarit, css, champs, groupes, images, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Erreur lecture modeles_utilisateur:', error);
      return { data: [], error: 'Impossible de charger tes modèles.' };
    }

    const modeles: Modele[] = (data || []).map((row: any) => ({
      id: row.id,
      nom: row.nom || 'Sans titre',
      type: row.type || 'autre',
      gabarit: row.gabarit || '',
      css: row.css || '',
      champs: Array.isArray(row.champs) ? row.champs : [],
      groupes: Array.isArray(row.groupes) ? row.groupes : [],
      images: Array.isArray(row.images) ? row.images : []
    }));

    return { data: modeles, error: null };
  } catch (err: any) {
    console.warn('Exception fetchUserModeles:', err);
    return { data: [], error: 'Erreur inattendue lors du chargement des modèles.' };
  }
}

/**
 * Renomme un modèle (mise à jour de la colonne nom uniquement, 80 caractères max)
 */
export async function renameUserModele(
  modeleId: string,
  nouveauNom: string
): Promise<{ success: boolean; error: string | null }> {
  const client = getSupabase();
  if (!client) {
    return { success: false, error: 'Connexion indisponible' };
  }

  const nomNettoye = nouveauNom.trim().slice(0, 80);
  if (!nomNettoye) {
    return { success: false, error: 'Le nom ne peut pas être vide.' };
  }

  try {
    const { error } = await client
      .from('modeles_utilisateur')
      .update({ nom: nomNettoye })
      .eq('id', modeleId);

    if (error) {
      console.warn('Erreur renommage modele:', error);
      return { success: false, error: 'Impossible de renommer ce modèle.' };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erreur lors du renommage.' };
  }
}

/**
 * Supprime un modèle et ses images locales
 */
export async function deleteUserModele(modeleId: string): Promise<{ success: boolean; error: string | null }> {
  const client = getSupabase();
  if (!client) {
    return { success: false, error: 'Connexion indisponible' };
  }

  try {
    const { error } = await client
      .from('modeles_utilisateur')
      .delete()
      .eq('id', modeleId);

    if (error) {
      console.warn('Erreur suppression modele:', error);
      return { success: false, error: 'Impossible de supprimer ce modèle.' };
    }

    // Règle : supprimer aussi les images locales associées dans IndexedDB
    await deleteModeleAllImages(modeleId);

    // Supprimer également le brouillon local s'il existe
    try {
      localStorage.removeItem(`visora_brouillon_modele_${modeleId}`);
    } catch {
      // ignore
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erreur lors de la suppression.' };
  }
}

/**
 * Déclenche l'Edge Function analyser-modele
 */
export async function analyserModele(
  type: string,
  pages: Array<{ media_type: string; donnees: string }>
): Promise<AnalyserModeleResult> {
  const client = getSupabase();
  if (!client) {
    return {
      success: false,
      error: "Connexion au service indisponible. Vérifie ta connexion internet."
    };
  }

  try {
    const { data, error } = await client.functions.invoke('analyser-modele', {
      body: {
        type,
        pages
      }
    });

    if (error) {
      console.warn('Erreur Edge Function analyser-modele:', error);

      // Traitement des messages d'erreur du serveur
      const errMsg = (error.message || '').toLowerCase();
      let status = (error as any).status;

      // Essayer d'extraire le corps de réponse d'erreur s'il est contenu
      let responseBodyError = '';
      if ((error as any).context?.json) {
        try {
          const parsed = await (error as any).context.json();
          responseBodyError = (parsed.error || parsed.message || '').toLowerCase();
        } catch {}
      }

      const combined = `${errMsg} ${responseBodyError}`;

      if (combined.includes('credit') || combined.includes('solde') || combined.includes('insufficient') || status === 402) {
        return {
          success: false,
          isInsufficientCredits: true,
          error: "Crédits insuffisants pour analyser ce modèle (3 crédits requis)."
        };
      }

      if (combined.includes('limite') || combined.includes('20') || combined.includes('maximum')) {
        return {
          success: false,
          isLimitReached: true,
          error: "Tu as atteint la limite de 20 modèles. Supprime un modèle existant pour en ajouter un nouveau."
        };
      }

      return {
        success: false,
        error: "L'analyse a échoué, tes crédits ont été remboursés. Réessaie avec une image plus nette."
      };
    }

    if (!data || !data.modele_id) {
      // Si la réponse JSON indique une erreur applicative
      if (data?.error) {
        const lower = String(data.error).toLowerCase();
        if (lower.includes('credit') || lower.includes('solde') || lower.includes('insufficient')) {
          return {
            success: false,
            isInsufficientCredits: true,
            creditsRestants: data.credits_restants,
            error: "Crédits insuffisants pour analyser ce modèle (3 crédits requis)."
          };
        }
        if (lower.includes('limite') || lower.includes('20') || lower.includes('maximum')) {
          return {
            success: false,
            isLimitReached: true,
            creditsRestants: data.credits_restants,
            error: "Tu as atteint la limite de 20 modèles. Supprime un modèle existant pour en ajouter un nouveau."
          };
        }
      }

      return {
        success: false,
        creditsRestants: data?.credits_restants,
        error: "L'analyse a échoué, tes crédits ont été remboursés. Réessaie avec une image plus nette."
      };
    }

    return {
      success: true,
      data: {
        modele_id: data.modele_id,
        type: data.type || type,
        nom: data.nom || 'Modèle sans titre',
        gabarit: data.gabarit || '',
        css: data.css || '',
        champs: Array.isArray(data.champs) ? data.champs : [],
        groupes: Array.isArray(data.groupes) ? data.groupes : [],
        images: Array.isArray(data.images) ? data.images : [],
        avertissements: Array.isArray(data.avertissements) ? data.avertissements : [],
        credits_restants: data.credits_restants,
        cout: data.cout ?? COUT_ANALYSE_AFFICHE
      },
      creditsRestants: data.credits_restants
    };
  } catch (err: any) {
    console.warn('Exception invoke analyser-modele:', err);
    return {
      success: false,
      error: "L'analyse a échoué, tes crédits ont été remboursés. Réessaie avec une image plus nette."
    };
  }
}
