import { getSupabase } from './supabase';

export interface CommandeCredit {
  id: string;
  user_id: string;
  credits: number;
  montant_fcfa: number;
  statut: 'payee' | 'en_attente' | 'echouee' | 'expiree';
  created_at: string;
}

export const EVENT_OPEN_RECHARGE = 'visorax-open-recharge';

/**
 * Déclenche l'ouverture de la modale de recharge dans toute l'application.
 */
export function triggerOpenRecharge(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_OPEN_RECHARGE));
  }
}

/**
 * Formate un montant en FCFA avec séparateur de milliers (ex: 2 000 FCFA).
 */
export function formatFcfa(montant: number): string {
  try {
    return Number(montant).toLocaleString('fr-FR');
  } catch {
    return String(montant);
  }
}

/**
 * Vérifie si une commande date de moins de 24 heures.
 */
export function isOrderWithin24Hours(createdAtStr: string): boolean {
  try {
    const created = new Date(createdAtStr).getTime();
    const now = Date.now();
    const diffHours = (now - created) / (1000 * 60 * 60);
    return diffHours >= 0 && diffHours < 24;
  } catch {
    return false;
  }
}

/**
 * Crée une intention de paiement auprès de la fonction Edge Supabase "paiement".
 * RÈGLE DE SÉCURITÉ : L'app n'a aucune clé SasPay et n'envoie que le nombre de crédits (10 à 500).
 * Le serveur recalcule toujours le montant côté backend.
 */
export async function creerPaiement(credits: number): Promise<{
  ok: boolean;
  checkout_url?: string;
  commande_id?: string;
  error?: string;
  isRateLimit?: boolean;
}> {
  const client = getSupabase();
  if (!client) {
    return { ok: false, error: 'Service Supabase non initialisé.' };
  }

  const entierCredits = Math.round(credits);
  if (entierCredits < 10 || entierCredits > 500) {
    return { ok: false, error: 'Le montant doit être compris entre 10 et 500 crédits.' };
  }

  try {
    const { data: sessionData } = await client.auth.getSession();
    const token = sessionData?.session?.access_token;
    const headers: Record<string, string> = {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache'
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const { data, error } = await client.functions.invoke('paiement', {
      body: { action: 'creer', credits: entierCredits },
      headers
    });

    if (error) {
      let errorMessage = 'Une erreur est survenue lors de la création du paiement.';
      let status = 500;

      if ('context' in error && (error as any).context) {
        try {
          const resp = (error as any).context as Response;
          status = resp.status;
          let detail: any = null;
          if (typeof resp.json === 'function') {
            detail = await resp.json().catch(() => null);
          } else if (typeof resp.clone === 'function') {
            detail = await resp.clone().json().catch(() => null);
          }
          if (detail && typeof detail.error === 'string') {
            errorMessage = detail.error;
          } else if (detail && typeof detail.message === 'string') {
            errorMessage = detail.message;
          }
        } catch {
          // Utilisation du message d'erreur par défaut
        }
      }

      if (status === 429 || errorMessage.toLowerCase().includes('trop de tentatives')) {
        return {
          ok: false,
          isRateLimit: true,
          error: 'Trop de tentatives en cours, réessaie dans quelques minutes'
        };
      }

      return { ok: false, error: errorMessage };
    }

    if (data?.checkout_url && typeof data.checkout_url === 'string') {
      const commandeId =
        data.commande_id ||
        data.id ||
        data.commande?.id ||
        (typeof data.checkout_url === 'string'
          ? data.checkout_url.match(/commande_id=([a-f0-9-]+)/i)?.[1]
          : undefined);

      return {
        ok: true,
        checkout_url: data.checkout_url,
        commande_id: typeof commandeId === 'string' ? commandeId : undefined
      };
    }

    if (data?.error && typeof data.error === 'string') {
      const is429 = data.error.toLowerCase().includes('trop de tentatives');
      return {
        ok: false,
        isRateLimit: is429,
        error: is429
          ? 'Trop de tentatives en cours, réessaie dans quelques minutes'
          : data.error
      };
    }

    return {
      ok: false,
      error: 'Aucune adresse de paiement reçue du serveur.'
    };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || 'Erreur réseau lors de la communication avec SasPay.'
    };
  }
}

/**
 * Vérifie le statut d'une commande (ou de toutes les commandes en attente pour l'utilisateur).
 * Appel : action: "verifier" [, commande_id: <uuid>]
 */
export async function verifierPaiement(commandeId?: string): Promise<{
  ok: boolean;
  statut?: 'payee' | 'en_attente' | 'echouee' | 'expiree' | string;
  credites?: number;
  solde?: number;
  error?: string;
}> {
  const client = getSupabase();
  if (!client) {
    return { ok: false, error: 'Service Supabase non initialisé.' };
  }

  try {
    const { data: sessionData } = await client.auth.getSession();
    const token = sessionData?.session?.access_token;
    const headers: Record<string, string> = {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache'
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const body: Record<string, any> = { action: 'verifier' };
    if (commandeId) {
      body.commande_id = commandeId;
    }

    const { data, error } = await client.functions.invoke('paiement', {
      body,
      headers
    });

    if (error) {
      let errorMessage = 'Impossible de vérifier le paiement pour le moment.';
      if ('context' in error && (error as any).context) {
        try {
          const resp = (error as any).context as Response;
          const detail = await resp.json().catch(() => null);
          if (detail && typeof detail.error === 'string') {
            errorMessage = detail.error;
          }
        } catch {
          // Pas d'accès au corps de réponse
        }
      }
      return { ok: false, error: errorMessage };
    }

    return {
      ok: true,
      statut: data?.statut,
      credites: typeof data?.credites === 'number' ? data.credites : 0,
      solde: typeof data?.solde === 'number' ? data.solde : undefined
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Erreur de connexion.' };
  }
}

/**
 * Récupère l'historique des achats de crédits depuis la table `commandes_credits`.
 */
export async function fetchCommandesCredits(userId: string): Promise<CommandeCredit[]> {
  const client = getSupabase();
  if (!client || !userId) {
    return [];
  }

  try {
    const { data, error } = await client
      .from('commandes_credits')
      .select('id, user_id, credits, montant_fcfa, statut, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error || !Array.isArray(data)) {
      console.warn('Notice loading commandes_credits:', error?.message);
      return [];
    }

    return data as CommandeCredit[];
  } catch (err) {
    console.warn('Exception reading commandes_credits:', err);
    return [];
  }
}
