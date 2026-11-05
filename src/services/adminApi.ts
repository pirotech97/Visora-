import { getSupabase } from './supabase';
import type {
  AdminDashboardStats,
  AdminUserSummary,
  AdminUserDetail,
  AdminJournalEntry,
  AdminCreditTransaction,
  AdminUserCreation
} from '../types';

export interface AdminApiResponse<T = any> {
  data?: T;
  error?: string;
  status?: number;
}

/**
 * Exécute un appel exclusif à l'Edge Function "admin-api".
 * Ne stocke aucune donnée dans le stockage local ni dans le cache.
 */
export async function invokeAdminApi<T = any>(body: Record<string, any>): Promise<AdminApiResponse<T>> {
  const client = getSupabase();
  if (!client) {
    return { error: 'Service Supabase non initialisé.', status: 500 };
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

    const { data, error } = await client.functions.invoke('admin-api', {
      body,
      headers
    });

    if (error) {
      let errorMessage = 'Une erreur est survenue lors de l’opération.';
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
          // ignore
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      return { error: errorMessage, status };
    }

    if (data && typeof data === 'object' && data.error) {
      return { data, error: String(data.error), status: data.status || 400 };
    }

    return { data, status: 200 };
  } catch (err: any) {
    return { error: err?.message || 'Erreur réseau ou appel impossible.', status: 500 };
  }
}

/**
 * Vérifie l'accès administrateur auprès de la fonction
 */
export async function checkIsAdmin(): Promise<{ admin: boolean; error?: string; status?: number }> {
  const res = await invokeAdminApi<{ admin?: boolean }>({ action: 'moi' });
  if (res.error || !res.data || res.data.admin !== true) {
    return {
      admin: false,
      error: res.error || 'Accès refusé',
      status: res.status ?? (res.error ? 403 : 200)
    };
  }
  return { admin: true, status: 200 };
}

/**
 * Récupère les statistiques du tableau de bord
 */
export async function fetchAdminStats(): Promise<{ data?: AdminDashboardStats; error?: string; status?: number }> {
  const res = await invokeAdminApi<AdminDashboardStats>({ action: 'stats' });
  return { data: res.data, error: res.error, status: res.status };
}

/**
 * Récupère la liste des utilisateurs paginée et filtrée
 */
export async function fetchAdminUsers(
  recherche?: string,
  limite = 25,
  decalage = 0
): Promise<{ total: number; utilisateurs: AdminUserSummary[]; error?: string; status?: number }> {
  const body: Record<string, any> = {
    action: 'utilisateurs',
    limite,
    decalage
  };
  if (recherche && recherche.trim()) {
    body.recherche = recherche.trim();
  }

  const res = await invokeAdminApi<{ total?: number; utilisateurs?: AdminUserSummary[] }>(body);
  if (res.error) {
    return { total: 0, utilisateurs: [], error: res.error, status: res.status };
  }

  return {
    total: res.data?.total ?? (res.data?.utilisateurs?.length ?? 0),
    utilisateurs: res.data?.utilisateurs ?? [],
    status: res.status
  };
}

/**
 * Récupère la fiche détaillée d'un utilisateur
 */
export async function fetchAdminUserDetail(
  userId: string
): Promise<{ data?: AdminUserDetail; error?: string; status?: number }> {
  const res = await invokeAdminApi<any>({
    action: 'detail',
    user_id: userId
  });

  if (res.error) {
    return { error: res.error, status: res.status };
  }

  const raw = res.data;
  if (!raw) {
    return { error: 'Aucune donnée reçue.', status: 404 };
  }

  // Détection souple : l'utilisateur peut être dans raw.utilisateur, raw.user, ou à la racine de raw
  const userObj = raw.utilisateur || raw.user || raw;

  const utilisateur: AdminUserSummary = {
    id: userObj.id || raw.id || userId,
    email: userObj.email || raw.email || '',
    nom: userObj.nom ?? raw.nom ?? '',
    prenoms: userObj.prenoms ?? raw.prenoms ?? '',
    pays: userObj.pays ?? raw.pays ?? '',
    whatsapp: userObj.whatsapp ?? raw.whatsapp ?? '',
    created_at: userObj.created_at || raw.created_at || '',
    last_sign_in_at: userObj.last_sign_in_at || raw.last_sign_in_at || '',
    banned_until: userObj.banned_until ?? raw.banned_until ?? null,
    solde: typeof userObj.solde === 'number' ? userObj.solde : (typeof raw.solde === 'number' ? raw.solde : 0),
    est_admin: Boolean(userObj.est_admin ?? raw.est_admin)
  };

  const transactions: AdminCreditTransaction[] = Array.isArray(raw.transactions)
    ? raw.transactions
    : (Array.isArray(userObj.transactions) ? userObj.transactions : []);

  const creations: AdminUserCreation[] = Array.isArray(raw.creations)
    ? raw.creations
    : (Array.isArray(raw.medias) ? raw.medias : (Array.isArray(userObj.creations) ? userObj.creations : []));

  return {
    data: {
      utilisateur,
      transactions,
      creations
    },
    status: res.status
  };
}

/**
 * Ajuste les crédits d'un utilisateur
 */
export async function adjustUserCredits(
  userId: string,
  delta: number,
  note: string
): Promise<{ ok?: boolean; solde?: number; error?: string; status?: number }> {
  const res = await invokeAdminApi<{ ok?: boolean; solde?: number }>({
    action: 'ajuster_credits',
    user_id: userId,
    delta,
    note
  });
  return {
    ok: res.data?.ok,
    solde: res.data?.solde,
    error: res.error,
    status: res.status
  };
}

/**
 * Bloque un compte utilisateur
 */
export async function blockUser(
  userId: string,
  note?: string
): Promise<{ ok?: boolean; error?: string; status?: number }> {
  const res = await invokeAdminApi<{ ok?: boolean }>({
    action: 'bloquer',
    user_id: userId,
    note
  });
  return { ok: res.data?.ok, error: res.error, status: res.status };
}

/**
 * Débloque un compte utilisateur
 */
export async function unblockUser(
  userId: string,
  note?: string
): Promise<{ ok?: boolean; error?: string; status?: number }> {
  const res = await invokeAdminApi<{ ok?: boolean }>({
    action: 'debloquer',
    user_id: userId,
    note
  });
  return { ok: res.data?.ok, error: res.error, status: res.status };
}

/**
 * Récupère le journal des actions administratives
 */
export async function fetchAdminJournal(): Promise<{ journal: AdminJournalEntry[]; error?: string; status?: number }> {
  const res = await invokeAdminApi<{ journal?: AdminJournalEntry[] } | AdminJournalEntry[]>({
    action: 'journal'
  });

  if (res.error) {
    return { journal: [], error: res.error, status: res.status };
  }

  let list: AdminJournalEntry[] = [];
  if (Array.isArray(res.data)) {
    list = res.data;
  } else if (res.data && Array.isArray((res.data as any).journal)) {
    list = (res.data as any).journal;
  }

  return { journal: list, status: res.status };
}
