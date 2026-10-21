import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import type {
  DocumentData,
  DocumentRecord,
  MessageRecord,
  DocumentStatus,
  CreditTransaction,
  ExtractResult,
  UserProfile,
  SignUpData
} from '../types';

let supabaseClient: SupabaseClient | null = null;
let isConfigured = false;

export function initSupabase(url?: string, anonKey?: string): boolean {
  const supabaseUrl = url || import.meta.env.VITE_SUPABASE_URL || '';
  const supabaseAnonKey = anonKey || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  if (supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')) {
    try {
      supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      });
      isConfigured = true;
      return true;
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
    }
  }

  isConfigured = false;
  return false;
}

export function isSupabaseReady(): boolean {
  return isConfigured && supabaseClient !== null;
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

export async function signUpWithEmail(
  email: string,
  password: string,
  profileData?: SignUpData
): Promise<{ user: UserProfile | null; error: string | null }> {
  if (isSupabaseReady() && supabaseClient) {
    // Note: Ne fais PAS d'update du profil après signUp.
    // La base Supabase crée le profil toute seule via un trigger à partir de options.data.
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
      return { user: null, error: error.message };
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
  }

  // Fallback demo user
  const demoUser: UserProfile = {
    id: 'demo-user-' + Math.random().toString(36).substring(2, 9),
    email,
    nom: profileData?.nom || '',
    prenoms: profileData?.prenoms || '',
    sexe: profileData?.sexe || '',
    pays: profileData?.pays || '',
    whatsapp: profileData?.whatsapp || ''
  };
  localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(demoUser));
  return { user: demoUser, error: null };
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ user: UserProfile | null; error: string | null }> {
  if (isSupabaseReady() && supabaseClient) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });
    if (error) {
      return { user: null, error: error.message };
    }
    if (data.user) {
      // Lecture du profil sans faire de copie forcée de metadata vers la table
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
  }

  // Fallback demo user
  const demoUser = getLocalUser() || {
    id: 'demo-user-' + Math.random().toString(36).substring(2, 9),
    email
  };
  localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(demoUser));
  return { user: demoUser, error: null };
}

export async function signOutUser(): Promise<void> {
  if (isSupabaseReady() && supabaseClient) {
    await supabaseClient.auth.signOut();
  }
  localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
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
        await supabaseClient.auth.updateUser({
          data: {
            nom: updates.nom,
            prenoms: updates.prenoms,
            sexe: updates.sexe,
            pays: updates.pays,
            whatsapp: updates.whatsapp
          }
        });
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
      const { data, error } = await supabaseClient.rpc('mes_credits');

      if (!error && typeof data === 'number') {
        return data;
      }

      if (error) {
        console.warn('RPC mes_credits error, attempting table fallback:', error);
        const { data: tableData, error: tableError } = await supabaseClient
          .from('credits')
          .select('solde')
          .single();

        if (!tableError && tableData && typeof tableData.solde === 'number') {
          return tableData.solde;
        }

        console.error('Error fetching credits from Supabase:', error || tableError);
        return null;
      }
    } catch (err) {
      console.error('Error fetching credits from Supabase:', err);
      return null;
    }
  }

  // Local demo fallback
  const saved = localStorage.getItem('visora_local_credits_' + userId);
  return saved !== null ? parseInt(saved, 10) : 10;
}

export async function fetchCreditTransactions(userId: string): Promise<CreditTransaction[]> {
  if (isSupabaseReady() && supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('credit_transactions')
        .select('delta, motif, created_at')
        .order('created_at', { ascending: false })
        .limit(20);

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
  json_document: DocumentData
): Promise<boolean> {
  if (isSupabaseReady() && supabaseClient) {
    try {
      const { error } = await supabaseClient
        .from('documents')
        .update({ json_document })
        .eq('id', documentId);

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
  docId: string
): Promise<{ json_document: import('../types').DocumentData | null; nom_fichier: string } | null> {
  if (isSupabaseReady() && supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('documents')
        .select('id, nom_fichier, json_document')
        .eq('id', docId)
        .single();

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

export async function deleteDocumentRecord(docId: string): Promise<boolean> {
  if (isSupabaseReady() && supabaseClient) {
    try {
      const { error } = await supabaseClient
        .from('documents')
        .delete()
        .eq('id', docId);

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
  sources: string[];
}

export interface GenerateImageResult {
  image_id?: string;
  url?: string;
  credits_restants?: number;
  error?: string;
  isInsufficientCredits?: boolean;
}

export async function invokeGenerateImageFunction(
  params: GenerateImagePayload,
  userId?: string
): Promise<GenerateImageResult> {
  const { mode, prompt, format, resolution, sources } = params;

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
        if (
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
  const cost = resolution === '2K' ? 2 : 1;
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
    <text x="50%" y="${size.h / 2 + 35}" font-family="system-ui, sans-serif" font-size="${Math.round(size.w * 0.026)}px" fill="rgba(255,255,255,0.85)" text-anchor="middle">Format ${format} · ${resolution}</text>
    <text x="50%" y="${size.h - 50}" font-family="system-ui, sans-serif" font-size="${Math.round(size.w * 0.022)}px" fill="rgba(255,255,255,0.7)" text-anchor="middle">Visora AI · Rendu fidèle</text>
  </svg>`;

  const demoDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(demoSvg);
  const imageId = 'img_' + Math.random().toString(36).substring(2, 9);

  if (userId) {
    saveDemoImageRecord(userId, {
      id: imageId,
      user_id: userId,
      mode,
      prompt,
      format,
      resolution,
      chemin: `demo/${imageId}.png`,
      statut: 'termine',
      created_at: new Date().toISOString(),
      signedUrl: demoDataUrl
    });
  }

  return {
    image_id: imageId,
    url: demoDataUrl,
    credits_restants: remaining
  };
}

export function saveDemoImageRecord(userId: string, record: any): void {
  try {
    const key = 'visora_demo_images_' + userId;
    const existing = localStorage.getItem(key);
    let list: any[] = [];
    if (existing) {
      list = JSON.parse(existing);
    }
    list.unshift(record);
    localStorage.setItem(key, JSON.stringify(list.slice(0, 50)));
  } catch (e) {
    console.warn('Error saving demo image:', e);
  }
}

export async function fetchUserImages(userId: string): Promise<import('../types').ImageHistoryRecord[]> {
  if (isSupabaseReady() && supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('images')
        .select('*')
        .eq('user_id', userId)
        .eq('statut', 'termine')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        const resolved = await Promise.all(
          data.map(async (row: any) => {
            let signedUrl = row.url || '';
            if (row.chemin) {
              try {
                const { data: signData } = await supabaseClient.storage
                  .from('images')
                  .createSignedUrl(row.chemin, 3600);
                if (signData?.signedUrl) {
                  signedUrl = signData.signedUrl;
                }
              } catch (e) {
                console.warn('Error getting signed url for image:', e);
              }
            }
            return {
              id: row.id,
              user_id: row.user_id,
              mode: row.mode,
              prompt: row.prompt,
              format: row.format,
              resolution: row.resolution,
              chemin: row.chemin,
              statut: row.statut,
              created_at: row.created_at,
              signedUrl
            };
          })
        );
        return resolved;
      }
    } catch (err) {
      console.warn('Error querying images table:', err);
    }
  }

  // Fallback local
  try {
    const key = 'visora_demo_images_' + userId;
    const existing = localStorage.getItem(key);
    if (existing) {
      return JSON.parse(existing);
    }
  } catch {
    // ignore
  }
  return [];
}

export async function downloadImageFile(url: string, customName?: string): Promise<void> {
  const now = new Date();
  const dateStr = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    '-',
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0')
  ].join('');

  const filename = customName || `visora-image-${dateStr}.png`;

  try {
    const res = await fetch(url);
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
    }, 300);
  } catch {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
    }, 300);
  }
}

