import type { SupabaseClient, User } from '@supabase/supabase-js';
import {
  getSupabase,
  isSupabaseConfigured,
  getSupabaseDomain,
  getSupabaseUrl,
  getSupabaseAnonKey,
  checkSupabaseHealth,
  initSupabase as initSupabaseClient
} from '../lib/supabase';
import type {
  DocumentData,
  DocumentRecord,
  MessageRecord,
  DocumentStatus,
  CreditTransaction,
  ExtractResult,
  UserProfile,
  SignUpData,
  MediaOptionsResponse,
  VideoGeneratePayload,
  AudioGeneratePayload,
  MediaGeneratePayload,
  MediaRecord,
  VideoProjectGeneratePayload,
  VideoProjectRecord,
  VideoProjectScene
} from '../types';

export {
  getSupabase,
  isSupabaseConfigured,
  getSupabaseDomain,
  getSupabaseUrl,
  getSupabaseAnonKey,
  checkSupabaseHealth
};

let supabaseClient: SupabaseClient | null = getSupabase();

export function initSupabase(url?: string, anonKey?: string): boolean {
  const success = initSupabaseClient(url, anonKey);
  supabaseClient = getSupabase();
  return success;
}

export function isSupabaseReady(): boolean {
  supabaseClient = getSupabase();
  return isSupabaseConfigured() && supabaseClient !== null;
}

// ----------------------------------------------------
// LOCAL DEMO / FALLBACK STORAGE (if Supabase not configured)
// ----------------------------------------------------
const LOCAL_STORAGE_USER_KEY = 'visora_demo_user';
const LOCAL_STORAGE_DOCS_KEY = 'visora_demo_docs';
const LOCAL_STORAGE_MSGS_KEY = 'visora_demo_msgs';

function getLocalUser(): UserProfile | null {
  const saved = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
  if (!saved) return null;
  try {
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

function getLocalDocuments(userId: string): DocumentRecord[] {
  const saved = localStorage.getItem(LOCAL_STORAGE_DOCS_KEY);
  if (!saved) return [];
  try {
    const all: DocumentRecord[] = JSON.parse(saved);
    return all.filter((d) => d.user_id === userId);
  } catch {
    return [];
  }
}

function saveLocalDocuments(docs: DocumentRecord[]) {
  const saved = localStorage.getItem(LOCAL_STORAGE_DOCS_KEY);
  let all: DocumentRecord[] = [];
  try {
    if (saved) all = JSON.parse(saved);
  } catch {
    all = [];
  }
  // merge or replace
  const map = new Map<string, DocumentRecord>();
  all.forEach((d) => map.set(d.id, d));
  docs.forEach((d) => map.set(d.id, d));
  localStorage.setItem(LOCAL_STORAGE_DOCS_KEY, JSON.stringify(Array.from(map.values())));
}

function getLocalMessages(userId: string): MessageRecord[] {
  const saved = localStorage.getItem(LOCAL_STORAGE_MSGS_KEY);
  if (!saved) return [];
  try {
    const all: MessageRecord[] = JSON.parse(saved);
    return all.filter((m) => m.user_id === userId);
  } catch {
    return [];
  }
}

function saveLocalMessages(msgs: MessageRecord[]) {
  const saved = localStorage.getItem(LOCAL_STORAGE_MSGS_KEY);
  let all: MessageRecord[] = [];
  try {
    if (saved) all = JSON.parse(saved);
  } catch {
    all = [];
  }
  const map = new Map<string, MessageRecord>();
  all.forEach((m) => map.set(m.id, m));
  msgs.forEach((m) => map.set(m.id, m));
  localStorage.setItem(LOCAL_STORAGE_MSGS_KEY, JSON.stringify(Array.from(map.values())));
}

// ----------------------------------------------------
// AUTH & PROFILE FUNCTIONS
// ----------------------------------------------------

export function formatSupabaseAuthError(error: any): string {
  if (!error) return "Une erreur est survenue lors de l'authentification.";
  const msg = typeof error === 'string' ? error : (error.message || '');
  const lower = msg.toLowerCase();

  // 1. Réseau (Failed to fetch)
  if (
    lower.includes('failed to fetch') ||
    lower.includes('fetch failed') ||
    lower.includes('networkerror') ||
    lower.includes('load failed') ||
    lower.includes('network request failed')
  ) {
    const domain = getSupabaseDomain();
    if (domain) {
      console.warn('Nom de domaine contacté :', domain);
    }
    return 'Impossible de joindre le serveur. Vérifie ta connexion ou réessaie dans un instant.';
  }

  // 2. Mot de passe incorrect
  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid credentials') ||
    lower.includes('invalid_grant') ||
    lower.includes('wrong password')
  ) {
    return 'Mot de passe incorrect ou adresse e-mail inexistante.';
  }

  // 3. E-mail déjà utilisé
  if (
    lower.includes('user already registered') ||
    lower.includes('already registered') ||
    lower.includes('already exists') ||
    lower.includes('user_already_exists')
  ) {
    return 'Cette adresse e-mail est déjà utilisée par un autre compte.';
  }

  // 4. E-mail non confirmé
  if (
    lower.includes('email not confirmed') ||
    lower.includes('email_not_confirmed') ||
    lower.includes('unconfirmed')
  ) {
    return "Ton adresse e-mail n'a pas encore été confirmée. Merci de vérifier ta boîte de réception.";
  }

  // 5. Mot de passe trop court
  if (
    lower.includes('password should be at least') ||
    lower.includes('weak_password') ||
    lower.includes('password is too short')
  ) {
    return 'Le mot de passe est trop court. Il doit comporter au moins 6 caractères.';
  }

  // 6. Trop de tentatives
  if (
    lower.includes('rate limit') ||
    lower.includes('over_email_send_rate_limit') ||
    lower.includes('too many requests') ||
    lower.includes('429')
  ) {
    return 'Trop de tentatives en peu de temps. Merci de patienter quelques minutes avant de réessayer.';
  }

  // 7. Format e-mail invalide
  if (
    lower.includes('unable to validate email address') ||
    lower.includes('invalid email')
  ) {
    return "L'adresse e-mail saisie n'est pas valide.";
  }

  return msg || "Une erreur est survenue lors de l'authentification.";
}

export async function signUpWithEmail(
  email: string,
  password: string,
  profileData?: SignUpData
): Promise<{ user: UserProfile | null; error: string | null }> {
  if (!isSupabaseConfigured() || !supabaseClient) {
    console.warn('Variables Supabase absentes');
    return {
      user: null,
      error: "Configuration manquante : l'adresse ou la clé du projet n'est pas définie."
    };
  }

  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: profileData
          ? {
              nom: profileData.nom.trim(),
              prenoms: profileData.prenoms.trim(),
              sexe: profileData.sexe,
              pays: profileData.pays,
              whatsapp: profileData.whatsapp.trim()
            }
          : undefined
      }
    });

    if (error) {
      return { user: null, error: formatSupabaseAuthError(error) };
    }

    if (data.user) {
      const meta = data.user.user_metadata || {};
      return {
        user: {
          id: data.user.id,
          email: data.user.email || email,
          nom: meta.nom || profileData?.nom || '',
          prenoms: meta.prenoms || profileData?.prenoms || '',
          sexe: meta.sexe || profileData?.sexe || '',
          pays: meta.pays || profileData?.pays || '',
          whatsapp: meta.whatsapp || profileData?.whatsapp || ''
        },
        error: null
      };
    }

    return { user: null, error: "Une erreur est survenue lors de l'inscription." };
  } catch (err: any) {
    return { user: null, error: formatSupabaseAuthError(err) };
  }
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ user: UserProfile | null; error: string | null }> {
  if (!isSupabaseConfigured() || !supabaseClient) {
    console.warn('Variables Supabase absentes');
    return {
      user: null,
      error: "Configuration manquante : l'adresse ou la clé du projet n'est pas définie."
    };
  }

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return { user: null, error: formatSupabaseAuthError(error) };
    }

    if (data.user) {
      let dbProfile: any = null;
      try {
        const { data: p } = await supabaseClient
          .from('profils')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();
        dbProfile = p;
      } catch {
        // Ignorer si la table n'est pas accessible
      }

      const meta = data.user.user_metadata || {};
      return {
        user: {
          id: data.user.id,
          email: data.user.email || email,
          nom: dbProfile?.nom || meta.nom || '',
          prenoms: dbProfile?.prenoms || meta.prenoms || '',
          sexe: dbProfile?.sexe || meta.sexe || '',
          pays: dbProfile?.pays || meta.pays || '',
          whatsapp: dbProfile?.whatsapp || meta.whatsapp || ''
        },
        error: null
      };
    }

    return { user: null, error: "Une erreur est survenue lors de la connexion." };
  } catch (err: any) {
    return { user: null, error: formatSupabaseAuthError(err) };
  }
}

export async function signOutUser(): Promise<void> {
  if (isSupabaseReady() && supabaseClient) {
    await supabaseClient.auth.signOut();
  }
  localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
}

export function isPasswordValid(pwd: string): boolean {
  if (!pwd || pwd.length < 8) return false;
  const hasLetter = /[a-zA-Z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  return hasLetter && hasNumber;
}

export async function resetPasswordForEmail(
  email: string
): Promise<{ error: string | null; rateLimited?: boolean }> {
  if (!isSupabaseConfigured() || !supabaseClient) {
    return { error: "Configuration manquante : l'adresse ou la clé du projet n'est pas définie." };
  }

  try {
    const redirectTo = `${window.location.origin}/reinitialiser-mot-de-passe`;
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email.trim(), {
      redirectTo
    });

    if (error) {
      const msg = (error.message || '').toLowerCase();
      const status = (error as any).status;
      if (
        status === 429 ||
        msg.includes('rate limit') ||
        msg.includes('too many requests') ||
        msg.includes('over_email_send_rate_limit')
      ) {
        return { error: 'Trop de demandes. Réessaie dans quelques minutes.', rateLimited: true };
      }
      // Toujours neutre pour ne pas divulguer si un compte existe
      return { error: null };
    }

    return { error: null };
  } catch (err: any) {
    const msg = (err?.message || '').toLowerCase();
    if (err?.status === 429 || msg.includes('rate limit') || msg.includes('too many requests')) {
      return { error: 'Trop de demandes. Réessaie dans quelques minutes.', rateLimited: true };
    }
    return { error: null };
  }
}

export async function updateUserPassword(
  password: string
): Promise<{ error: string | null; isSamePassword?: boolean }> {
  if (!isSupabaseConfigured() || !supabaseClient) {
    return { error: "Configuration manquante : l'adresse ou la clé du projet n'est pas définie." };
  }

  try {
    const { error } = await supabaseClient.auth.updateUser({ password });
    if (error) {
      const msg = (error.message || '').toLowerCase();
      if (
        msg.includes('same password') ||
        msg.includes('different') ||
        msg.includes('same_password') ||
        msg.includes('should be different')
      ) {
        return { error: "Choisis un mot de passe différent de l'ancien.", isSamePassword: true };
      }
      return { error: "Impossible de modifier le mot de passe. Demande un nouveau lien." };
    }
    return { error: null };
  } catch (err: any) {
    const msg = (err?.message || '').toLowerCase();
    if (msg.includes('same password') || msg.includes('different') || msg.includes('same_password')) {
      return { error: "Choisis un mot de passe différent de l'ancien.", isSamePassword: true };
    }
    return { error: "Impossible de modifier le mot de passe. Demande un nouveau lien." };
  }
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  if (isSupabaseReady() && supabaseClient) {
    let authUser: User | null = null;
    const { data: sessionData } = await supabaseClient.auth.getSession();
    if (sessionData?.session?.user) {
      authUser = sessionData.session.user;
    } else {
      const { data } = await supabaseClient.auth.getUser();
      if (data?.user) {
        authUser = data.user;
      }
    }

    if (authUser) {
      let dbProfile: any = null;
      try {
        const { data: p } = await supabaseClient
          .from('profils')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle();
        dbProfile = p;
      } catch {
        // Ignorer
      }

      const meta = authUser.user_metadata || {};
      return {
        id: authUser.id,
        email: authUser.email || '',
        nom: dbProfile?.nom || meta.nom || '',
        prenoms: dbProfile?.prenoms || meta.prenoms || '',
        sexe: dbProfile?.sexe || meta.sexe || '',
        pays: dbProfile?.pays || meta.pays || '',
        whatsapp: dbProfile?.whatsapp || meta.whatsapp || ''
      };
    }
    return null;
  }
  return getLocalUser();
}

export async function restoreSessionUser(): Promise<UserProfile | null> {
  return getCurrentUser();
}

export function subscribeToAuthState(
  onStateChange: (event: string, user: UserProfile | null) => void
): { unsubscribe: () => void } {
  if (isSupabaseReady() && supabaseClient) {
    const {
      data: { subscription }
    } = supabaseClient.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          const user = await getCurrentUser();
          onStateChange(event, user);
        }
      } else if (event === 'SIGNED_OUT') {
        onStateChange(event, null);
      }
    });

    return {
      unsubscribe: () => subscription.unsubscribe()
    };
  }

  return {
    unsubscribe: () => {}
  };
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfile>
): Promise<{ success: boolean; error: string | null }> {
  if (isSupabaseReady() && supabaseClient) {
    try {
      const { error } = await supabaseClient
        .from('profils')
        .update({
          nom: updates.nom,
          prenoms: updates.prenoms,
          sexe: updates.sexe,
          pays: updates.pays,
          whatsapp: updates.whatsapp,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        // Repli gracieux : mise à jour des metadata de l'utilisateur
        const { error: authError } = await supabaseClient.auth.updateUser({
          data: {
            nom: updates.nom,
            prenoms: updates.prenoms,
            sexe: updates.sexe,
            pays: updates.pays,
            whatsapp: updates.whatsapp
          }
        });
        if (authError) {
          return {
            success: false,
            error: "Impossible d'enregistrer les modifications du profil. Merci de réessayer."
          };
        }
      }
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  const current = getLocalUser();
  if (current) {
    const updated = { ...current, ...updates };
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(updated));
  }
  return { success: true, error: null };
}

// ----------------------------------------------------
// CREDITS & TRANSACTIONS (READ-ONLY)
// ----------------------------------------------------

export async function fetchUserCredits(userId: string): Promise<number | null> {
  if (isSupabaseReady() && supabaseClient) {
    try {
      // 1. Lecture directe depuis la table credits avec filtrage par user_id
      let query = supabaseClient
        .from('credits')
        .select('solde');

      if (userId) {
        query = query.eq('user_id', userId);
      } else {
        const { data: sessionData } = await supabaseClient.auth.getSession();
        const currentUid = sessionData?.session?.user?.id;
        if (currentUid) {
          query = query.eq('user_id', currentUid);
        }
      }

      const { data: tableData, error: tableError } = await query.maybeSingle();

      if (!tableError && tableData && typeof tableData.solde === 'number') {
        return tableData.solde;
      }

      // Si la requête a réussi et qu'aucun enregistrement n'existe encore pour l'utilisateur
      if (!tableError && !tableData) {
        return 0;
      }

      // 2. Si la table est restreinte par RLS, tentative de repli via la fonction RPC mes_credits
      if (tableError) {
        try {
          const { data: rpcData, error: rpcError } = await supabaseClient.rpc('mes_credits');
          if (!rpcError && typeof rpcData === 'number') {
            return rpcData;
          }
        } catch {
          // RPC mes_credits non définie
        }
        return 0;
      }
    } catch (err: any) {
      console.warn('Notice fetching credits:', err?.message || err);
      return 0;
    }
  }

  // Local demo fallback
  const saved = localStorage.getItem('visora_local_credits_' + userId);
  return saved !== null ? parseInt(saved, 10) : 10;
}

export async function fetchCreditTransactions(userId: string): Promise<CreditTransaction[]> {
  if (isSupabaseReady() && supabaseClient) {
    try {
      let query = supabaseClient
        .from('credit_transactions')
        .select('delta, motif, created_at')
        .order('created_at', { ascending: false })
        .limit(20);

      if (userId) {
        query = query.eq('user_id', userId);
      } else {
        const { data: sessionData } = await supabaseClient.auth.getSession();
        const currentUid = sessionData?.session?.user?.id;
        if (currentUid) {
          query = query.eq('user_id', currentUid);
        }
      }

      const { data, error } = await query;

      if (!error && Array.isArray(data)) {
        return data as CreditTransaction[];
      }
    } catch (err) {
      console.warn('Error fetching credit transactions from Supabase:', err);
    }
  }

  // Local demo fallback
  return [
    {
      delta: 10,
      motif: 'bonus_inscription',
      created_at: new Date().toISOString()
    }
  ];
}

// ----------------------------------------------------
// DOCUMENTS TABLE CRUD
// ----------------------------------------------------

export async function insertDocumentRecord(
  userId: string,
  fileName: string
): Promise<DocumentRecord> {
  const newDoc: DocumentRecord = {
    id: isSupabaseReady() ? crypto.randomUUID() : 'doc_' + Math.random().toString(36).substring(2, 9),
    user_id: userId,
    nom_fichier: fileName,
    json_document: null,
    statut: 'en_cours',
    created_at: new Date().toISOString()
  };

  if (isSupabaseReady() && supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('documents')
        .insert({
          id: newDoc.id,
          user_id: userId,
          nom_fichier: fileName,
          json_document: null,
          statut: 'en_cours',
          created_at: newDoc.created_at
        })
        .select()
        .single();

      if (!error && data) {
        return data as DocumentRecord;
      }
    } catch (err) {
      console.warn('Error inserting doc to Supabase:', err);
    }
  }

  // Local fallback
  const existing = getLocalDocuments(userId);
  saveLocalDocuments([...existing, newDoc]);
  return newDoc;
}

export async function updateDocumentRecord(
  docId: string,
  userId: string,
  jsonDocument: DocumentData | null,
  statut: DocumentStatus
): Promise<DocumentRecord | null> {
  if (isSupabaseReady() && supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('documents')
        .update({
          json_document: jsonDocument,
          statut: statut
        })
        .eq('id', docId)
        .eq('user_id', userId)
        .select()
        .single();

      if (!error && data) {
        return data as DocumentRecord;
      }
    } catch (err) {
      console.warn('Error updating doc in Supabase:', err);
    }
  }

  // Local fallback
  const docs = getLocalDocuments(userId);
  const target = docs.find((d) => d.id === docId);
  if (target) {
    target.json_document = jsonDocument;
    target.statut = statut;
    saveLocalDocuments(docs);
    return target;
  }
  return null;
}

export async function updateDocumentJson(
  documentId: string,
  json_document: DocumentData,
  userId?: string
): Promise<boolean> {
  if (isSupabaseReady() && supabaseClient) {
    try {
      let query = supabaseClient
        .from('documents')
        .update({ json_document })
        .eq('id', documentId);

      if (userId) {
        query = query.eq('user_id', userId);
      } else {
        const { data: sessionData } = await supabaseClient.auth.getSession();
        const currentUid = sessionData?.session?.user?.id;
        if (currentUid) {
          query = query.eq('user_id', currentUid);
        }
      }

      const { error } = await query;

      if (error) {
        console.warn('Error updating json_document in Supabase:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Error updating json_document in Supabase:', err);
      return false;
    }
  }
  return true;
}

export async function fetchUserDocumentsSummary(
  userId: string,
  offset: number = 0,
  limit: number = 20
): Promise<{ data: import('../types').DocumentSummary[]; hasMore: boolean }> {
  if (isSupabaseReady() && supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('documents')
        .select('id, nom_fichier, statut, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit);

      if (!error && data) {
        const hasMore = data.length > limit;
        const pageItems = hasMore ? data.slice(0, limit) : data;
        return {
          data: pageItems as import('../types').DocumentSummary[],
          hasMore
        };
      }
    } catch (err) {
      console.warn('Error fetching docs summary from Supabase:', err);
    }
  }

  const docs = getLocalDocuments(userId).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const sliced = docs.slice(offset, offset + limit + 1);
  const hasMore = sliced.length > limit;
  const pageItems = (hasMore ? sliced.slice(0, limit) : sliced).map((d) => ({
    id: d.id,
    nom_fichier: d.nom_fichier,
    statut: d.statut,
    created_at: d.created_at
  }));

  return {
    data: pageItems,
    hasMore
  };
}

export async function fetchDocumentDetails(
  docId: string,
  userId?: string
): Promise<{ json_document: import('../types').DocumentData | null; nom_fichier: string } | null> {
  if (isSupabaseReady() && supabaseClient) {
    try {
      let query = supabaseClient
        .from('documents')
        .select('id, nom_fichier, json_document')
        .eq('id', docId);

      if (userId) {
        query = query.eq('user_id', userId);
      } else {
        const { data: sessionData } = await supabaseClient.auth.getSession();
        const currentUid = sessionData?.session?.user?.id;
        if (currentUid) {
          query = query.eq('user_id', currentUid);
        }
      }

      const { data, error } = await query.single();

      if (!error && data) {
        return {
          json_document: data.json_document,
          nom_fichier: data.nom_fichier
        };
      }
    } catch (err) {
      console.warn('Error fetching document json from Supabase:', err);
    }
  }

  // Local fallback
  const saved = localStorage.getItem('visora_demo_docs');
  if (saved) {
    try {
      const all: DocumentRecord[] = JSON.parse(saved);
      const target = all.find((d) => d.id === docId);
      if (target) {
        return {
          json_document: target.json_document,
          nom_fichier: target.nom_fichier
        };
      }
    } catch {
      // ignore
    }
  }

  return null;
}

export async function deleteDocumentRecord(docId: string, userId?: string): Promise<boolean> {
  if (isSupabaseReady() && supabaseClient) {
    try {
      let query = supabaseClient
        .from('documents')
        .delete()
        .eq('id', docId);

      if (userId) {
        query = query.eq('user_id', userId);
      } else {
        const { data: sessionData } = await supabaseClient.auth.getSession();
        const currentUid = sessionData?.session?.user?.id;
        if (currentUid) {
          query = query.eq('user_id', currentUid);
        }
      }

      const { error } = await query;

      if (!error) {
        return true;
      }
      console.warn('Error deleting doc from Supabase:', error);
    } catch (err) {
      console.warn('Exception deleting doc from Supabase:', err);
    }
  }

  // Local fallback
  const saved = localStorage.getItem('visora_demo_docs');
  if (saved) {
    try {
      const all: DocumentRecord[] = JSON.parse(saved);
      const filtered = all.filter((d) => d.id !== docId);
      localStorage.setItem('visora_demo_docs', JSON.stringify(filtered));
      return true;
    } catch {
      // ignore
    }
  }

  return false;
}

export async function fetchUserDocuments(userId: string): Promise<DocumentRecord[]> {
  if (isSupabaseReady() && supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('documents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data as DocumentRecord[];
      }
    } catch (err) {
      console.warn('Error fetching docs from Supabase:', err);
    }
  }

  const docs = getLocalDocuments(userId);
  return docs.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

// ----------------------------------------------------
// MESSAGES TABLE CRUD
// ----------------------------------------------------

export async function insertMessageRecord(
  userId: string,
  role: 'utilisateur' | 'visora',
  contenu: string,
  documentId?: string | null
): Promise<MessageRecord> {
  const newMsg: MessageRecord = {
    id: isSupabaseReady() ? crypto.randomUUID() : 'msg_' + Math.random().toString(36).substring(2, 9),
    user_id: userId,
    role,
    contenu,
    document_id: documentId || null,
    created_at: new Date().toISOString()
  };

  if (isSupabaseReady() && supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('messages')
        .insert({
          id: newMsg.id,
          user_id: userId,
          role,
          contenu,
          document_id: documentId || null,
          created_at: newMsg.created_at
        })
        .select()
        .single();

      if (!error && data) {
        return data as MessageRecord;
      }
    } catch (err) {
      console.warn('Error inserting message to Supabase:', err);
    }
  }

  const existing = getLocalMessages(userId);
  saveLocalMessages([...existing, newMsg]);
  return newMsg;
}

export async function fetchUserMessages(userId: string): Promise<MessageRecord[]> {
  if (isSupabaseReady() && supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        return data as MessageRecord[];
      }
    } catch (err) {
      console.warn('Error fetching messages from Supabase:', err);
    }
  }

  const msgs = getLocalMessages(userId);
  return msgs.sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

// ----------------------------------------------------
// STORAGE BUCKET HELPER (Bucket de stockage privé "uploads")
// ----------------------------------------------------

export async function uploadFileToUserStorage(
  userId: string,
  file: File
): Promise<string | null> {
  if (!isSupabaseReady() || !supabaseClient) {
    return null;
  }

  try {
    const timestamp = Date.now();
    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${userId}/${timestamp}_${cleanName}`;

    const { data, error } = await supabaseClient.storage
      .from('uploads')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.warn('Storage upload error:', error.message);
      return null;
    }

    return data?.path || filePath;
  } catch (err) {
    console.warn('Storage upload exception:', err);
    return null;
  }
}

// ----------------------------------------------------
// SUPABASE EDGE FUNCTION "extract"
// ----------------------------------------------------

export async function invokeExtractFunction(
  images: string[],
  nom_fichier: string
): Promise<ExtractResult> {
  if (isSupabaseReady() && supabaseClient) {
    try {
      // 1. Verify user session
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const session = sessionData?.session;

      if (!session) {
        return {
          error: "Tu n'es pas connecté. Merci de te connecter pour convertir ce document."
        };
      }

      // 2. Invoke Edge Function with authorization header
      const { data, error } = await supabaseClient.functions.invoke('extract', {
        body: {
          images,
          nom_fichier
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        let extractedMessage = error.message;
        let creditsRestants: number | undefined = undefined;
        let isInsufficientCredits = false;

        // Try to parse the real error response from the Edge Function
        if ('context' in error && (error as any).context) {
          try {
            const resp = (error as any).context as Response;
            if (resp.status === 402) {
              isInsufficientCredits = true;
            }
            const detail = await resp.clone().json().catch(() => null);
            if (detail) {
              if (detail.error && typeof detail.error === 'string') {
                extractedMessage = detail.error;
              } else if (detail.message && typeof detail.message === 'string') {
                extractedMessage = detail.message;
              }
              if (typeof detail.credits_restants === 'number') {
                creditsRestants = detail.credits_restants;
              }
              if (detail.code === 402 || resp.status === 402 || detail.error?.includes('Crédits insuffisants')) {
                isInsufficientCredits = true;
              }
            }
          } catch {
            // ignore
          }
        }

        // Clean user-friendly message
        if (extractedMessage.includes('Non connecté') || extractedMessage.includes('401')) {
          extractedMessage = "Ta session a expiré. Merci de te reconnecter.";
        } else if (extractedMessage.includes('429') || extractedMessage.toLowerCase().includes('rate limit')) {
          extractedMessage = "Trop de requêtes pour l'instant. Merci de patienter un instant.";
        } else if (
          !isInsufficientCredits &&
          (extractedMessage.includes('Edge Function returned a non-2xx status code') ||
           extractedMessage.includes('Failed to send a request'))
        ) {
          extractedMessage = "Je n'ai pas pu lire ce document, essaie avec une photo plus nette.";
        }

        return {
          error: extractedMessage,
          credits_restants: creditsRestants,
          isInsufficientCredits
        };
      }

      if (data?.error) {
        return {
          error: data.error,
          credits_restants: typeof data.credits_restants === 'number' ? data.credits_restants : undefined,
          isInsufficientCredits: data.code === 402 || String(data.error).includes('Crédits insuffisants')
        };
      }

      return {
        document_id: data?.document_id,
        document: data?.document,
        credits_restants: typeof data?.credits_restants === 'number' ? data.credits_restants : undefined
      };
    } catch (err: any) {
      console.warn('invokeExtractFunction exception:', err);
      return { error: "Je n'ai pas pu lire ce document, essaie avec une photo plus nette." };
    }
  }

  // Local demo fallback if testing without Supabase connection
  return {
    document_id: 'doc_' + Math.random().toString(36).substring(2, 9),
    document: {
      blocs: [
        { type: 'titre', niveau: 1, texte: nom_fichier.replace(/\.[^/.]+$/, '') },
        {
          type: 'paragraphe',
          texte: 'Document extrait avec fidélité mot pour mot.',
          gras: false,
          alignement: 'gauche'
        }
      ]
    }
  };
}

// ----------------------------------------------------
// IMAGE GENERATION & STORAGE ("uploads" bucket and "image-generer" edge function)
// ----------------------------------------------------

export async function uploadImageSourceToStorage(
  userId: string,
  file: File | Blob,
  extension?: string
): Promise<string | null> {
  const uuid = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 10);
  let ext = extension || 'jpg';
  if (!extension && file instanceof File) {
    const parts = file.name.split('.');
    if (parts.length > 1) {
      ext = parts[parts.length - 1].toLowerCase();
    }
  }
  const filePath = `${userId}/images-src/${uuid}.${ext}`;

  if (isSupabaseReady() && supabaseClient) {
    try {
      const { data, error } = await supabaseClient.storage
        .from('uploads')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.warn('Storage upload error (images-src):', error.message);
        return filePath;
      }
      return data?.path || filePath;
    } catch (err) {
      console.warn('Storage upload exception (images-src):', err);
      return filePath;
    }
  }

  return filePath;
}

export interface GenerateImagePayload {
  mode: 'image' | 'affiche' | 'fiche_produit' | 'modifier';
  prompt: string;
  format: string;
  resolution: '1K' | '2K';
  qualite?: 'standard' | 'premium';
  sources: string[];
}

export interface GenerateImageResult {
  image_id?: string;
  url?: string;
  credits_restants?: number;
  qualite?: 'standard' | 'premium';
  cout?: number;
  error?: string;
  isInsufficientCredits?: boolean;
}

export async function invokeGenerateImageFunction(
  params: GenerateImagePayload,
  userId?: string
): Promise<GenerateImageResult> {
  const { mode, prompt, format, resolution, qualite = 'standard', sources } = params;

  if (isSupabaseReady() && supabaseClient) {
    try {
      // 1. Vérifier la session active
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const session = sessionData?.session;

      if (!session) {
        return {
          error: "Tu n'es pas connecté. Merci de te connecter pour créer une image."
        };
      }

      // 2. Appel de la fonction Supabase "image-generer"
      const { data, error } = await supabaseClient.functions.invoke('image-generer', {
        body: {
          mode,
          prompt,
          format,
          resolution,
          qualite,
          sources
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        let extractedMessage = error.message || 'Une erreur est survenue lors de la création.';
        let isInsufficientCredits = false;
        let creditsRestants: number | undefined = undefined;

        if ('context' in error && (error as any).context) {
          try {
            const resp = (error as any).context as Response;
            if (resp.status === 402) {
              isInsufficientCredits = true;
            }
            const detail = await resp.clone().json().catch(() => null);
            if (detail) {
              if (detail.code === 'CREDITS_INSUFFISANTS' || detail.code === 402 || resp.status === 402) {
                isInsufficientCredits = true;
              }
              if (typeof detail.credits_restants === 'number') {
                creditsRestants = detail.credits_restants;
              }
              if (detail.error && typeof detail.error === 'string') {
                extractedMessage = detail.error;
              } else if (detail.message && typeof detail.message === 'string') {
                extractedMessage = detail.message;
              }
            }
          } catch {
            // ignore
          }
        }

        if (isInsufficientCredits || extractedMessage.toLowerCase().includes('crédit')) {
          return {
            error: "Crédits insuffisants pour générer cette image.",
            isInsufficientCredits: true,
            credits_restants: creditsRestants
          };
        }

        // Traduction et nettoyage des erreurs techniques
        if (extractedMessage.includes('Non connecté') || extractedMessage.includes('401')) {
          extractedMessage = "Ta session a expiré. Merci de te reconnecter.";
        } else if (extractedMessage.includes('429') || extractedMessage.toLowerCase().includes('rate limit')) {
          extractedMessage = "Trop de requêtes pour l'instant. Merci de patienter un instant.";
        } else if (
          extractedMessage.includes('Edge Function') ||
          extractedMessage.includes('non-2xx') ||
          extractedMessage.includes('Failed to send') ||
          extractedMessage.includes('JSON')
        ) {
          extractedMessage = "Impossible de générer l'image pour l'instant. Merci de réessayer.";
        }

        return {
          error: extractedMessage,
          isInsufficientCredits,
          credits_restants: creditsRestants
        };
      }

      if (data?.error) {
        const isInsufficient = data.code === 'CREDITS_INSUFFISANTS' || data.code === 402 || String(data.error).includes('crédit');
        return {
          error: isInsufficient ? "Crédits insuffisants pour générer cette image." : data.error,
          isInsufficientCredits: isInsufficient,
          credits_restants: typeof data.credits_restants === 'number' ? data.credits_restants : undefined
        };
      }

      return {
        image_id: data?.image_id,
        url: data?.url,
        qualite: data?.qualite || qualite,
        cout: typeof data?.cout === 'number' ? data.cout : (qualite === 'premium' || resolution === '2K' ? 2 : 1),
        credits_restants: typeof data?.credits_restants === 'number' ? data.credits_restants : undefined
      };
    } catch (err: any) {
      console.warn('invokeGenerateImageFunction exception:', err);
      return {
        error: "Impossible de générer l'image pour le moment. Merci de vérifier ta connexion et de réessayer."
      };
    }
  }

  // Fallback direct de démonstration (pour test sans fonction Supabase déployée)
  const cost = qualite === 'premium' || resolution === '2K' ? 2 : 1;
  const currentCredits = userId ? await fetchUserCredits(userId) : 10;
  if (currentCredits !== null && currentCredits < cost) {
    return {
      error: "Crédits insuffisants pour générer cette image.",
      isInsufficientCredits: true,
      credits_restants: currentCredits
    };
  }

  const remaining = currentCredits !== null ? Math.max(0, currentCredits - cost) : 8;
  if (userId) {
    localStorage.setItem('visora_local_credits_' + userId, String(remaining));
  }

  const formatAspects: Record<string, { w: number; h: number }> = {
    '1:1': { w: 800, h: 800 },
    '4:3': { w: 800, h: 600 },
    '3:4': { w: 600, h: 800 },
    '3:2': { w: 900, h: 600 },
    '2:3': { w: 600, h: 900 },
    '16:9': { w: 960, h: 540 },
    '9:16': { w: 540, h: 960 }
  };
  const size = formatAspects[format] || { w: 800, h: 800 };
  const modeLabels: Record<string, string> = {
    image: 'Image artistique',
    affiche: 'Affiche publicitaire',
    fiche_produit: 'Fiche produit studio',
    modifier: 'Photo modifiée'
  };
  const modeLabel = modeLabels[mode] || 'Création Visora';

  const demoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size.w}" height="${size.h}" viewBox="0 0 ${size.w} ${size.h}">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1e3a8a"/>
        <stop offset="50%" stop-color="#3b82f6"/>
        <stop offset="100%" stop-color="#06b6d4"/>
      </linearGradient>
    </defs>
    <rect width="${size.w}" height="${size.h}" fill="url(#bg)"/>
    <circle cx="${size.w / 2}" cy="${size.h / 2 - 40}" r="${Math.min(size.w, size.h) * 0.25}" fill="rgba(255,255,255,0.12)" />
    <text x="50%" y="${size.h / 2 - 10}" font-family="system-ui, sans-serif" font-size="${Math.round(size.w * 0.045)}px" font-weight="bold" fill="#ffffff" text-anchor="middle">${modeLabel}</text>
    <text x="50%" y="${size.h / 2 + 35}" font-family="system-ui, sans-serif" font-size="${Math.round(size.w * 0.026)}px" fill="rgba(255,255,255,0.85)" text-anchor="middle">Format ${format} · ${resolution} · ${qualite}</text>
    <text x="50%" y="${size.h - 50}" font-family="system-ui, sans-serif" font-size="${Math.round(size.w * 0.022)}px" fill="rgba(255,255,255,0.7)" text-anchor="middle">Visora AI · Rendu fidèle</text>
  </svg>`;

  const demoDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(demoSvg);
  const imageId = 'img_' + Math.random().toString(36).substring(2, 9);

  return {
    image_id: imageId,
    url: demoDataUrl,
    qualite,
    cout: cost,
    credits_restants: remaining
  };
}

/**
 * Lit les images depuis la table Supabase "images" (source de vérité)
 * et génère des adresses signées fraîches valables 3600 secondes via une seule requête batch.
 * N'enregistre JAMAIS d'adresse signée dans un stockage local ou persistant.
 */
export async function fetchUserImages(): Promise<{ data: import('../types').ImageHistoryRecord[]; error: string | null }> {
  if (!isSupabaseReady() || !supabaseClient) {
    return {
      data: [],
      error: "Configuration manquante : l'adresse ou la clé du projet n'est pas définie."
    };
  }

  try {
    // 2. Au chargement et à l'ouverture de l'onglet Historique :
    const { data, error } = await supabaseClient
      .from('images')
      .select('id, mode, prompt, modele, chemin, created_at')
      .eq('statut', 'termine')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.warn('Erreur lecture table images:', error.message);
      return { data: [], error: error.message };
    }

    if (!data || !Array.isArray(data) || data.length === 0) {
      return { data: [], error: null };
    }

    // Extraction des chemins pour la requête de signature groupée
    const chemins = data
      .map((row: any) => row.chemin)
      .filter((c: any): c is string => typeof c === 'string' && c.trim().length > 0);

    const signedUrlsMap = new Map<string, string>();

    // 3. Crée une adresse fraîche en une seule requête batch pour la liste
    if (chemins.length > 0) {
      try {
        const { data: signResult, error: signError } = await supabaseClient.storage
          .from('images')
          .createSignedUrls(chemins, 3600);

        if (!signError && Array.isArray(signResult)) {
          signResult.forEach((item: any) => {
            if (item && item.signedUrl && item.path) {
              signedUrlsMap.set(item.path, item.signedUrl);
              signedUrlsMap.set(item.path.replace(/^\/+/, ''), item.signedUrl);
            }
          });
        } else if (signError) {
          console.warn('Erreur batch createSignedUrls images:', signError.message);
        }
      } catch (signErr) {
        console.warn('Exception batch createSignedUrls images:', signErr);
      }
    }

    const records: import('../types').ImageHistoryRecord[] = data.map((row: any) => {
      const chemin = row.chemin || '';
      const cleanChemin = chemin.replace(/^\/+/, '');
      const signedUrl = signedUrlsMap.get(chemin) || signedUrlsMap.get(cleanChemin) || undefined;

      return {
        id: row.id,
        mode: row.mode,
        prompt: row.prompt,
        modele: row.modele,
        chemin: chemin,
        statut: 'termine',
        created_at: row.created_at,
        signedUrl
      };
    });

    return { data: records, error: null };
  } catch (err: any) {
    console.warn('Exception fetchUserImages:', err);
    return { data: [], error: err.message || 'Impossible de charger tes images. Réessaie.' };
  }
}

/**
 * Régénère une adresse fraîche pour un chemin d'image individuel
 * si le lien initial a expiré ou a échoué.
 */
export async function refreshImageSignedUrl(chemin: string): Promise<string | null> {
  if (!isSupabaseReady() || !supabaseClient || !chemin) return null;
  try {
    const cleanChemin = chemin.replace(/^\/+/, '');
    const { data, error } = await supabaseClient.storage
      .from('images')
      .createSignedUrl(cleanChemin, 3600);

    if (!error && data?.signedUrl) {
      return data.signedUrl;
    }
    return null;
  } catch (e) {
    console.warn('refreshImageSignedUrl error:', e);
    return null;
  }
}

/**
 * Récupère un enregistrement fraîchement créé depuis la table "images"
 * avec son adresse signée fraîche.
 */
export async function fetchSingleImageRecord(imageId: string): Promise<import('../types').ImageHistoryRecord | null> {
  if (!isSupabaseReady() || !supabaseClient || !imageId) return null;
  try {
    const { data, error } = await supabaseClient
      .from('images')
      .select('id, mode, prompt, modele, chemin, created_at')
      .eq('id', imageId)
      .maybeSingle();

    if (!error && data) {
      let freshUrl: string | undefined = undefined;
      if (data.chemin) {
        freshUrl = (await refreshImageSignedUrl(data.chemin)) || undefined;
      }
      return {
        id: data.id,
        mode: data.mode,
        prompt: data.prompt,
        modele: data.modele,
        chemin: data.chemin,
        statut: 'termine',
        created_at: data.created_at,
        signedUrl: freshUrl
      };
    }
  } catch (e) {
    console.warn('fetchSingleImageRecord error:', e);
  }
  return null;
}

/**
 * Génère le nom de fichier normé : visora-image-{date} avec l'extension du chemin
 */
export function getImageFilename(chemin: string, created_at?: string): string {
  let ext = 'png';
  if (chemin) {
    const parts = chemin.split('.');
    if (parts.length > 1) {
      const candidate = parts[parts.length - 1].toLowerCase().replace(/[^a-z0-9]/g, '');
      if (candidate.length >= 2 && candidate.length <= 4) {
        ext = candidate;
      }
    }
  }

  const d = created_at ? new Date(created_at) : new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  const dateStr = `${year}-${month}-${day}-${hours}${minutes}${seconds}`;
  return `visora-image-${dateStr}.${ext}`;
}

/**
 * Télécharge un fichier image depuis son adresse fraîche
 */
export async function downloadFreshImage(freshUrl: string, filename: string): Promise<void> {
  try {
    const res = await fetch(freshUrl);
    if (!res.ok) throw new Error('Échec téléchargement image');
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    }, 400);
  } catch {
    const link = document.createElement('a');
    link.href = freshUrl;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
    }, 400);
  }
}

/**
 * Rétrocompatibilité : télécharger une image
 */
export async function downloadImageFile(url: string, isPremium = false, customName?: string): Promise<void> {
  const fallbackFilename = customName || getImageFilename(isPremium ? 'image.jpg' : 'image.png');
  return downloadFreshImage(url, fallbackFilename);
}

/**
 * Génération de document administratif (CV, Lettre, Devis, Facture ou Formulaire) via Supabase Edge Function 'generer-document'
 */
export async function genererDocumentAdministrative(
  type: 'cv' | 'lettre' | 'devis' | 'facture' | 'formulaire',
  donnees: any
): Promise<{
  type?: 'cv' | 'lettre' | 'devis' | 'facture' | 'formulaire';
  document?: any;
  credits_restants?: number;
  cout?: number;
  error?: string;
  isInsufficientCredits?: boolean;
}> {
  const client = getSupabase();
  if (!client) {
    return {
      error: 'Service de documents non connecté. Merci de recharger ou de vous reconnecter.'
    };
  }

  try {
    const { data: sessionData } = await client.auth.getSession();
    const token = sessionData?.session?.access_token;
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const { data, error } = await client.functions.invoke('generer-document', {
      body: {
        type,
        donnees
      },
      headers
    });

    if (error) {
      let errorMessage = 'La génération a échoué. Réessaie.';
      let isInsufficientCredits = false;
      let creditsRestants: number | undefined = undefined;

      if ('context' in error && (error as any).context) {
        try {
          const ctx = (error as any).context;
          const status = ctx.status;
          if (status === 402) {
            isInsufficientCredits = true;
          }
          let detail: any = null;
          if (typeof ctx.json === 'function') {
            detail = await ctx.json().catch(() => null);
          } else if (typeof ctx.clone === 'function') {
            detail = await ctx.clone().json().catch(() => null);
          }
          if (detail) {
            if (
              detail.code === 'CREDITS_INSUFFISANTS' ||
              detail.error === 'CREDITS_INSUFFISANTS' ||
              status === 402
            ) {
              isInsufficientCredits = true;
              errorMessage = 'Crédits insuffisants. Recharger pour continuer.';
            } else if (typeof detail.error === 'string' && detail.error) {
              errorMessage = detail.error;
            } else if (typeof detail.message === 'string' && detail.message) {
              errorMessage = detail.message;
            }
            if (typeof detail.credits_restants === 'number') {
              creditsRestants = detail.credits_restants;
            }
          }
        } catch {
          // ignore parsing error
        }
      }

      if (isInsufficientCredits) {
        errorMessage = 'Crédits insuffisants. Recharger pour continuer.';
      }

      return {
        error: errorMessage,
        isInsufficientCredits,
        credits_restants: creditsRestants
      };
    }

    return {
      type: data?.type || type,
      document: data?.document,
      credits_restants: data?.credits_restants,
      cout: data?.cout
    };
  } catch (err: any) {
    console.error('genererDocumentAdministrative error:', err);
    return {
      error: 'La génération a échoué. Réessaie.'
    };
  }
}

// ============================================================================
// MÉDIA GÉNÉRATEUR (VIDÉO & AUDIO)
// ============================================================================

const SESSION_MEDIA_OPTIONS_KEY = 'visora_media_options';
let inMemoryMediaOptions: MediaOptionsResponse | null = null;

/**
 * Récupère les options et tarifs des modèles vidéo et audio depuis l'Edge Function "media-generer"
 * Ne recopie aucun prix dans le code : tout est dynamique.
 * Garde le résultat en mémoire de session (sessionStorage).
 */
export async function fetchMediaOptions(forceRefresh = false): Promise<{
  data: MediaOptionsResponse | null;
  error: string | null;
}> {
  if (!forceRefresh) {
    if (inMemoryMediaOptions) {
      return { data: inMemoryMediaOptions, error: null };
    }
    try {
      const cached = sessionStorage.getItem(SESSION_MEDIA_OPTIONS_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as MediaOptionsResponse;
        if (parsed && Array.isArray(parsed.video) && parsed.audio) {
          inMemoryMediaOptions = parsed;
          return { data: parsed, error: null };
        }
      }
    } catch {
      // ignore parsing error
    }
  }

  const client = getSupabase();
  if (!client) {
    return { data: null, error: 'Tarifs indisponibles, réessaie' };
  }

  try {
    const { data: sessionData } = await client.auth.getSession();
    const token = sessionData?.session?.access_token;
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const { data, error } = await client.functions.invoke('media-generer', {
      body: { action: 'options' },
      headers
    });

    if (error || !data || !Array.isArray(data.video) || !data.audio) {
      console.warn('fetchMediaOptions invoke error:', error, data);
      return { data: null, error: 'Tarifs indisponibles, réessaie' };
    }

    inMemoryMediaOptions = data as MediaOptionsResponse;
    try {
      sessionStorage.setItem(SESSION_MEDIA_OPTIONS_KEY, JSON.stringify(data));
    } catch {
      // ignore quota error
    }

    return { data: inMemoryMediaOptions, error: null };
  } catch (err: any) {
    console.warn('fetchMediaOptions exception:', err);
    return { data: null, error: 'Tarifs indisponibles, réessaie' };
  }
}

/**
 * Upload d'une image de départ pour la création de vidéo dans le bucket "uploads"
 */
export async function uploadMediaSourceToStorage(
  userId: string,
  file: File
): Promise<string | null> {
  if (!isSupabaseReady() || !supabaseClient) return null;
  try {
    const ext = file.name.split('.').pop() || 'png';
    const uniqueId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2, 10);
    const filePath = `${userId}/media-src/${uniqueId}.${ext}`;

    const { error: uploadError } = await supabaseClient.storage
      .from('uploads')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.warn('Erreur upload source média:', uploadError.message);
      return null;
    }

    return filePath;
  } catch (err) {
    console.warn('Exception upload source média:', err);
    return null;
  }
}

/**
 * Appel de l'Edge Function "media-generer" pour la vidéo ou l'audio
 */
export async function invokeGenerateMedia(
  payload: MediaGeneratePayload
): Promise<{
  data?: any;
  media_id?: string;
  media?: MediaRecord;
  credits_restants?: number;
  cout?: number;
  error?: string;
  isInsufficientCredits?: boolean;
}> {
  const client = getSupabase();
  if (!client) {
    return {
      error: "Service de média non connecté. Merci de te connecter."
    };
  }

  try {
    console.log('media: démarrage');

    const { data: sessionData } = await client.auth.getSession();
    const token = sessionData?.session?.access_token;
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const { data, error } = await client.functions.invoke('media-generer', {
      body: payload,
      headers
    });

    if (error) {
      let errorMessage = 'Une erreur est survenue, réessaie.';
      let isInsufficientCredits = false;
      let creditsRestants: number | undefined = undefined;

      if ('context' in error && (error as any).context) {
        try {
          const resp = (error as any).context as Response;
          let detail: any = null;
          if (typeof resp.json === 'function') {
            detail = await resp.json().catch(() => null);
          } else if (typeof resp.clone === 'function') {
            detail = await resp.clone().json().catch(() => null);
          }

          if (
            resp.status === 402 ||
            detail?.code === 'CREDITS_INSUFFISANTS' ||
            detail?.error === 'CREDITS_INSUFFISANTS'
          ) {
            isInsufficientCredits = true;
            const requis = detail?.credits_requis || detail?.cout || (payload as any).cout;
            errorMessage = requis
              ? `Il te faut ${requis} crédits`
              : 'Crédits insuffisants. Recharger pour continuer.';
          } else if (resp.status === 429) {
            errorMessage =
              (typeof detail?.error === 'string' && detail.error) ||
              (typeof detail?.message === 'string' && detail.message) ||
              'Trop de requêtes, patiente un instant.';
          } else if (detail) {
            if (typeof detail.error === 'string' && detail.error) {
              errorMessage = detail.error;
            } else if (typeof detail.message === 'string' && detail.message) {
              errorMessage = detail.message;
            }
          }

          if (typeof detail?.credits_restants === 'number') {
            creditsRestants = detail.credits_restants;
          }
        } catch {
          // ignore parsing error
        }
      }

      return {
        error: errorMessage,
        isInsufficientCredits,
        credits_restants: creditsRestants
      };
    }

    const mediaId = data?.media_id || data?.id || data?.media?.id;

    return {
      data,
      media_id: mediaId,
      media: data?.media,
      credits_restants: data?.credits_restants,
      cout: data?.cout
    };
  } catch (err: any) {
    console.error('invokeGenerateMedia error:', err);
    return {
      error: 'Une erreur est survenue, réessaie.'
    };
  }
}

/**
 * Suivi du statut d'un média unique via supabase.functions.invoke("media-generer", { body: { action: "statut", media_id } })
 */
export async function fetchMediaStatus(mediaId: string): Promise<{
  statut: 'en_cours' | 'termine' | 'echec' | string;
  url?: string;
  url_2?: string;
  fichier?: string;
  fichier_2?: string;
  error?: string;
  credits_restants?: number;
  data?: any;
}> {
  const client = getSupabase();
  if (!client || !mediaId) {
    return { statut: 'echec', error: 'Service média non connecté.' };
  }

  try {
    const { data: sessionData } = await client.auth.getSession();
    const token = sessionData?.session?.access_token;
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const { data, error } = await client.functions.invoke('media-generer', {
      body: { action: 'statut', media_id: mediaId },
      headers
    });

    if (error || !data) {
      throw new Error(error?.message || 'Erreur réseau');
    }

    // Log visible dans la console du navigateur sans clé API ni jeton
    const cleanLogData = { ...data };
    delete cleanLogData.token;
    delete cleanLogData.apiKey;
    delete cleanLogData.access_token;
    delete cleanLogData.key;
    delete cleanLogData.authorization;
    console.log('media: statut', cleanLogData);

    let statut = data.statut;
    if (!statut) {
      if (data.status === 'completed' || data.status === 'termine') statut = 'termine';
      else if (data.status === 'failed' || data.status === 'echec' || data.status === 'error') statut = 'echec';
      else statut = 'en_cours';
    } else if (statut === 'erreur' || statut === 'failed') {
      statut = 'echec';
    }

    let finalUrl = data.url;
    let finalUrl2 = data.url_2;
    const fichier = data.fichier || data.chemin || data.options?.fichier;
    const fichier2 = data.fichier_2 || data.chemin_2 || data.options?.fichier_2;

    if (fichier && (!finalUrl || !finalUrl.startsWith('http'))) {
      try {
        const { data: signData } = await client.storage
          .from('medias')
          .createSignedUrl(fichier.replace(/^\/+/, ''), 3600);
        if (signData?.signedUrl) {
          finalUrl = signData.signedUrl;
        }
      } catch {
        // ignore
      }
    }

    if (fichier2 && (!finalUrl2 || !finalUrl2.startsWith('http'))) {
      try {
        const { data: signData2 } = await client.storage
          .from('medias')
          .createSignedUrl(fichier2.replace(/^\/+/, ''), 3600);
        if (signData2?.signedUrl) {
          finalUrl2 = signData2.signedUrl;
        }
      } catch {
        // ignore
      }
    }

    if (statut === 'termine') {
      console.log('media: terminé');
    }

    return {
      statut,
      url: finalUrl,
      url_2: finalUrl2,
      fichier,
      fichier_2: fichier2,
      error:
        data.error ||
        (statut === 'echec'
          ? data.message || 'La création a échoué. Tes crédits ont été rendus.'
          : undefined),
      credits_restants: data.credits_restants,
      data
    };
  } catch (err: any) {
    throw err;
  }
}

/**
 * Relit la table "medias" (id, type, statut, fichier, created_at ; order by created_at desc ; limit 30)
 * Reprend le suivi pour les lignes "en_cours" de moins de 15 minutes,
 * et génère une URL fraîche avec supabase.storage.from("medias").createSignedUrl(fichier, 3600) pour celles à "termine".
 */
export async function fetchRecentUserMedias(userId?: string): Promise<MediaRecord[]> {
  const client = getSupabase();
  if (!client) return [];

  try {
    let query = client
      .from('medias')
      .select('id,type,statut,prompt,fichier,projet_id,scene_num,scene_nom,created_at,cout,options')
      .in('type', ['video', 'audio', 'musique'])
      .order('created_at', { ascending: false })
      .limit(30);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
    if (error || !data || !Array.isArray(data)) {
      return [];
    }

    const lignes = data as MediaRecord[];
    console.log('media: liste', lignes);
    return lignes;
  } catch (err) {
    console.warn('fetchRecentUserMedias error:', err);
    return [];
  }
}

/**
 * Récupère les enregistrements de la table "medias" pour l'historique (limit 100)
 */
export async function fetchUserMedias(userId?: string): Promise<{
  data: MediaRecord[];
  error: string | null;
}> {
  const client = getSupabase();
  if (!client) {
    return { data: [], error: null };
  }

  try {
    let query = client
      .from('medias')
      .select('id,type,statut,prompt,fichier,projet_id,scene_num,scene_nom,created_at,cout,options')
      .in('type', ['video', 'audio', 'musique'])
      .order('created_at', { ascending: false })
      .limit(100);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('fetchUserMedias error:', error.message);
      return { data: [], error: error.message };
    }

    const lignes = (data || []) as MediaRecord[];
    console.log('media: liste', lignes);
    return { data: lignes, error: null };
  } catch (err: any) {
    console.warn('fetchUserMedias exception:', err);
    return { data: [], error: err.message || 'Impossible de charger tes médias.' };
  }
}

/**
 * Supprime un média dans la table "medias" puis ses fichiers dans le bucket "medias"
 */
export async function deleteMediaRecord(
  id: string,
  fichier?: string,
  fichier2?: string,
  userId?: string
): Promise<boolean> {
  const client = getSupabase();
  if (!client || !id) return false;
  try {
    let query = client
      .from('medias')
      .delete()
      .eq('id', id);

    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      const { data: sessionData } = await client.auth.getSession();
      const currentUid = sessionData?.session?.user?.id;
      if (currentUid) {
        query = query.eq('user_id', currentUid);
      }
    }

    const { error: delError } = await query;

    if (delError) {
      console.warn('deleteMediaRecord error:', delError.message);
      return false;
    }

    const pathsToRemove: string[] = [];
    if (fichier) {
      pathsToRemove.push(fichier.replace(/^\/+/, ''));
    }
    if (fichier2) {
      pathsToRemove.push(fichier2.replace(/^\/+/, ''));
    }

    if (pathsToRemove.length > 0) {
      await client.storage.from('medias').remove(pathsToRemove);
    }

    return true;
  } catch (err) {
    console.warn('deleteMediaRecord exception:', err);
    return false;
  }
}

/**
 * Récupère le titre d'un projet vidéo depuis la table "projets_video"
 */
export async function fetchProjectTitle(projetId: string): Promise<string> {
  const client = getSupabase();
  if (!client || !projetId) return 'Projet vidéo';
  try {
    const { data, error } = await client
      .from('projets_video')
      .select('id,titre')
      .eq('id', projetId);

    if (error || !data || data.length === 0) {
      return 'Projet vidéo';
    }
    return data[0]?.titre || 'Projet vidéo';
  } catch {
    return 'Projet vidéo';
  }
}

/**
 * Crée un lien signé frais pour un fichier du bucket privé "medias"
 */
export async function createMediaSignedUrl(fichier: string): Promise<{ signedUrl?: string; error?: any }> {
  const client = getSupabase();
  if (!client || !fichier) return { error: new Error('Fichier manquant ou client indisponible') };
  try {
    const cleanPath = fichier.replace(/^\/+/, '');
    const { data, error } = await client.storage.from('medias').createSignedUrl(cleanPath, 3600);
    if (error || !data?.signedUrl) {
      console.log('media: lien', error || new Error('URL introuvable'));
      return { error: error || new Error('URL introuvable') };
    }
    return { signedUrl: data.signedUrl };
  } catch (err) {
    console.log('media: lien', err);
    return { error: err };
  }
}

/**
 * Crée un lien signé frais (durée 3600 secondes) pour un fichier du bucket privé "uploads"
 * (image de départ, photo de personnage, etc.) au moment de l'affichage seulement, sans le stocker nulle part.
 */
export async function createUploadSignedUrl(
  chemin: string,
  expiresInSeconds = 3600
): Promise<{ signedUrl?: string; error?: any }> {
  const client = getSupabase();
  if (!client || !chemin) return { error: new Error('Chemin manquant ou client indisponible') };
  try {
    const cleanPath = chemin.replace(/^\/+/, '');
    const { data, error } = await client.storage
      .from('uploads')
      .createSignedUrl(cleanPath, expiresInSeconds);
    if (error || !data?.signedUrl) {
      return { error: error || new Error('URL signée introuvable') };
    }
    return { signedUrl: data.signedUrl };
  } catch (err) {
    return { error: err };
  }
}

/**
 * Récupère un média unique depuis la table "medias" (pour le suivi et rafraîchissement)
 */
export async function fetchSingleMediaRecord(mediaId: string, userId?: string): Promise<MediaRecord | null> {
  if (!isSupabaseReady() || !supabaseClient || !mediaId) return null;
  try {
    let query = supabaseClient
      .from('medias')
      .select('*')
      .eq('id', mediaId);

    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const currentUid = sessionData?.session?.user?.id;
      if (currentUid) {
        query = query.eq('user_id', currentUid);
      }
    }

    const { data, error } = await query.maybeSingle();

    if (!error && data) {
      let finalUrl = data.url;
      if (data.chemin) {
        try {
          const { data: signData } = await supabaseClient.storage
            .from('uploads')
            .createSignedUrl(data.chemin.replace(/^\/+/, ''), 3600);
          if (signData?.signedUrl) {
            finalUrl = signData.signedUrl;
          }
        } catch {
          // ignore
        }
      }

      return {
        id: data.id,
        user_id: data.user_id,
        type: data.type || 'video',
        modele: data.modele,
        prompt: data.prompt,
        texte: data.texte,
        duree: data.duree,
        resolution: data.resolution,
        format: data.format,
        son: data.son,
        voix: data.voix,
        langue: data.langue,
        vitesse: data.vitesse,
        statut: data.statut || 'termine',
        url: finalUrl,
        chemin: data.chemin,
        cout: data.cout,
        error: data.error,
        created_at: data.created_at,
        image_depart: data.image_depart,
        signedUrl: finalUrl
      };
    }
  } catch (e) {
    console.warn('fetchSingleMediaRecord error:', e);
  }
  return null;
}

/**
 * Télécharge un fichier média (vidéo MP4 ou audio MP3)
 */
export async function downloadMediaFile(url: string, filename: string): Promise<void> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Téléchargement direct impossible');
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    }, 400);
  } catch {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
    }, 400);
  }
}

/**
 * Upload d'une image de personnage dans le bucket "uploads" à {user_id}/personnages/{uuid}.{ext}
 */
export async function uploadPersonnageImage(
  userId: string,
  file: File
): Promise<string | null> {
  if (!isSupabaseReady() || !supabaseClient) return null;
  try {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const uniqueId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2, 10);
    const filePath = `${userId}/personnages/${uniqueId}.${ext}`;

    const { error: uploadError } = await supabaseClient.storage
      .from('uploads')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.warn('Erreur upload personnage:', uploadError.message);
      return null;
    }

    return filePath;
  } catch (err) {
    console.warn('Exception upload personnage:', err);
    return null;
  }
}

/**
 * Création d'un projet vidéo multi-scènes via l'action "projet"
 */
export async function invokeCreateVideoProject(
  payload: VideoProjectGeneratePayload
): Promise<{
  data?: any;
  error?: string;
  isInsufficientCredits?: boolean;
  credits_restants?: number;
  projet_id?: string;
  cout?: number;
}> {
  const client = getSupabase();
  if (!client) {
    return { error: 'Service non connecté. Merci de te connecter.' };
  }

  try {
    console.log('media: démarrage');

    const { data: sessionData } = await client.auth.getSession();
    const token = sessionData?.session?.access_token;
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const { data, error } = await client.functions.invoke('media-generer', {
      body: payload,
      headers
    });

    if (error) {
      let errorMessage = 'La création du projet a échoué. Réessaie.';
      let isInsufficientCredits = false;
      let creditsRestants: number | undefined = undefined;

      if ('context' in error && (error as any).context) {
        try {
          const resp = (error as any).context as Response;
          if (resp.status === 402) {
            isInsufficientCredits = true;
          }
          let detail: any = null;
          if (typeof resp.json === 'function') {
            detail = await resp.json().catch(() => null);
          } else if (typeof resp.clone === 'function') {
            detail = await resp.clone().json().catch(() => null);
          }
          if (detail) {
            if (
              detail.code === 'CREDITS_INSUFFISANTS' ||
              detail.error === 'CREDITS_INSUFFISANTS' ||
              resp.status === 402
            ) {
              isInsufficientCredits = true;
              errorMessage = 'Crédits insuffisants. Recharger pour continuer.';
            } else if (typeof detail.error === 'string' && detail.error) {
              errorMessage = detail.error;
            } else if (typeof detail.message === 'string' && detail.message) {
              errorMessage = detail.message;
            }
            if (typeof detail.credits_restants === 'number') {
              creditsRestants = detail.credits_restants;
            }
          }
        } catch {
          // ignore
        }
      }

      if (isInsufficientCredits) {
        errorMessage = 'Crédits insuffisants. Recharger pour continuer.';
      }

      return {
        error: errorMessage,
        isInsufficientCredits,
        credits_restants: creditsRestants
      };
    }

    return {
      data,
      projet_id: data?.projet_id || data?.id,
      credits_restants: data?.credits_restants,
      cout: data?.cout
    };
  } catch (err: any) {
    console.error('invokeCreateVideoProject exception:', err);
    return { error: 'Une erreur imprévue est survenue lors de la création du projet.' };
  }
}

/**
 * Récupère le statut en direct d'un projet vidéo via l'action "statut_projet"
 * Génère des URL fraîches avec supabase.storage.from("medias").createSignedUrl(fichier, 3600)
 */
export async function fetchProjectStatus(
  projetId: string
): Promise<{
  data?: any;
  error?: string;
  termine?: boolean;
  scenes?: VideoProjectScene[];
}> {
  const client = getSupabase();
  if (!client || !projetId) return { error: 'Client indisponible' };

  try {
    const { data: sessionData } = await client.auth.getSession();
    const token = sessionData?.session?.access_token;
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const { data, error } = await client.functions.invoke('media-generer', {
      body: { action: 'statut_projet', projet_id: projetId },
      headers
    });

    if (error || !data) {
      return { error: error?.message || 'Erreur réseau' };
    }

    const cleanLogData = { ...data };
    delete cleanLogData.token;
    delete cleanLogData.apiKey;
    delete cleanLogData.access_token;
    delete cleanLogData.key;
    delete cleanLogData.authorization;
    console.log('media: statut', cleanLogData);

    if (data.termine) {
      console.log('media: terminé');
    }

    const rawScenes: any[] = data.scenes || [];
    const formattedScenes: VideoProjectScene[] = [];

    for (const sc of rawScenes) {
      let finalUrl = sc.url;
      const fichier = sc.fichier || sc.chemin;
      if (fichier && (!finalUrl || finalUrl.startsWith('http') === false)) {
        try {
          const { data: signData } = await client.storage
            .from('medias')
            .createSignedUrl(fichier.replace(/^\/+/, ''), 3600);
          if (signData?.signedUrl) {
            finalUrl = signData.signedUrl;
          }
        } catch {
          // fallback
        }
      }

      formattedScenes.push({
        id: sc.id,
        scene_num: sc.scene_num ?? sc.num ?? 1,
        nom: sc.nom || sc.scene_nom,
        scene_nom: sc.scene_nom || sc.nom,
        prompt: sc.prompt,
        duree: sc.duree,
        statut: sc.statut || 'en_cours',
        url: finalUrl,
        fichier: fichier,
        cout: sc.cout,
        error: sc.error,
        personnages: sc.personnages
      });
    }

    return {
      data,
      termine: Boolean(data.termine),
      scenes: formattedScenes
    };
  } catch (err: any) {
    return { error: err?.message || 'Erreur réseau' };
  }
}

/**
 * Relit projets_video (id, titre, created_at, order by created_at desc, limit 20)
 * et pour chaque projet ses scènes depuis medias.
 * Génère des URL fraîches avec supabase.storage.from("medias").createSignedUrl(fichier, 3600).
 * Ne stocke jamais d'URL signée en base.
 */
export async function fetchUserVideoProjects(
  userId?: string
): Promise<VideoProjectRecord[]> {
  if (!isSupabaseReady() || !supabaseClient) return [];

  try {
    let query = supabaseClient
      .from('projets_video')
      .select('id, titre, style, modele, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: projectsData, error: pError } = await query;
    if (pError || !projectsData || !Array.isArray(projectsData)) {
      return [];
    }

    const projectRecords: VideoProjectRecord[] = [];

    for (const proj of projectsData) {
      const { data: mediasData } = await supabaseClient
        .from('medias')
        .select('id, scene_num, scene_nom, statut, fichier, cout, duree, prompt')
        .eq('projet_id', proj.id)
        .order('scene_num', { ascending: true });

      const scenes: VideoProjectScene[] = [];
      if (mediasData && Array.isArray(mediasData)) {
        for (const m of mediasData) {
          let signedUrl: string | undefined = undefined;
          if (m.fichier) {
            try {
              const { data: signData } = await supabaseClient.storage
                .from('medias')
                .createSignedUrl(m.fichier.replace(/^\/+/, ''), 3600);
              if (signData?.signedUrl) {
                signedUrl = signData.signedUrl;
              }
            } catch {
              // ignore
            }
          }

          scenes.push({
            id: m.id,
            scene_num: m.scene_num || 1,
            scene_nom: m.scene_nom,
            nom: m.scene_nom,
            statut: m.statut || 'termine',
            fichier: m.fichier,
            cout: m.cout,
            duree: m.duree,
            prompt: m.prompt,
            url: signedUrl
          });
        }
      }

      projectRecords.push({
        id: proj.id,
        titre: proj.titre,
        style: proj.style,
        modele: proj.modele,
        created_at: proj.created_at,
        scenes
      });
    }

    return projectRecords;
  } catch (err) {
    console.warn('fetchUserVideoProjects exception:', err);
    return [];
  }
}




