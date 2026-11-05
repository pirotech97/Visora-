export type TitleBlock = {
  type: 'titre';
  niveau: number;
  texte: string;
};

export type ParagraphBlock = {
  type: 'paragraphe';
  texte: string;
  gras?: boolean;
  alignement?: 'gauche' | 'centre' | 'droite' | 'justifie';
};

export type ListBlock = {
  type: 'liste';
  elements: string[];
};

export type TableBlock = {
  type: 'tableau';
  lignes: string[][];
};

export type FigureBlock = {
  type: 'figure';
  page?: number;
  bbox?: [number, number, number, number];
  legende?: string;
  image?: string;
};

export interface ConvertedPage {
  base64: string;
  mimeType: string;
  pageNumber: number;
  fullResCanvas?: HTMLCanvasElement;
  fullResImage?: HTMLImageElement;
}

export type DocxBlock = TitleBlock | ParagraphBlock | ListBlock | TableBlock | FigureBlock;

export interface DocumentData {
  blocs: DocxBlock[];
}

export type DocumentStatus = 'en_cours' | 'termine' | 'erreur';

export interface DocumentSummary {
  id: string;
  nom_fichier: string;
  statut: DocumentStatus;
  created_at: string;
}

export interface DocumentRecord {
  id: string;
  user_id: string;
  nom_fichier: string;
  json_document: DocumentData | null;
  statut: DocumentStatus;
  created_at: string;
  storage_path?: string;
}

export interface GeneratedImagePayload {
  image_id?: string;
  url: string;
  mode: 'image' | 'affiche' | 'fiche_produit' | 'modifier';
  prompt: string;
  format: string;
  resolution: '1K' | '2K';
  qualite?: 'standard' | 'premium';
  cout?: number;
  sources?: string[];
  sourceLocalUrls?: string[];
  created_at?: string;
}

export interface ImageHistoryRecord {
  id: string;
  user_id?: string;
  mode?: string;
  prompt?: string;
  format?: string;
  resolution?: string;
  modele?: string;
  qualite?: string;
  cout?: number;
  chemin: string;
  statut?: string;
  created_at: string;
  signedUrl?: string;
}

export interface MessageRecord {
  id: string;
  user_id: string;
  role: 'utilisateur' | 'visora';
  contenu: string;
  document_id?: string | null;
  created_at: string;
  document?: DocumentRecord;
  imagePreviews?: string[];
  isLoading?: boolean;
  pdfDownloadBlob?: Blob;
  pdfFilename?: string;
  warningNote?: string;
  showRechargeButton?: boolean;
  creditsNotice?: string;
  generatedImage?: GeneratedImagePayload;
  generatedMedia?: MediaRecord;
  videoProject?: VideoProjectRecord;
}

export interface CreditTransaction {
  id?: string;
  delta: number;
  motif: string;
  created_at: string;
}

export interface ExtractResult {
  document_id?: string;
  document?: DocumentData;
  error?: string;
  credits_restants?: number;
  isInsufficientCredits?: boolean;
}

export type AppTab = 'chat' | 'tools' | 'history' | 'profile' | 'settings' | 'admin';

export interface SignUpData {
  nom: string;
  prenoms: string;
  sexe: 'Homme' | 'Femme' | 'Autre' | string;
  pays: string;
  whatsapp: string;
}

export interface UserProfile {
  id: string;
  email: string;
  nom?: string;
  prenoms?: string;
  sexe?: string;
  pays?: string;
  whatsapp?: string;
  isNewUser?: boolean;
}

export interface PendingFile {
  file: File;
  convertedPages?: ConvertedPage[];
  pageCount: number;
  isAnalyzing: boolean;
  error?: string;
}

// ============================================================================
// OUTILS ADMINISTRATIFS (CV & LETTRE)
// ============================================================================

export interface CvExperienceInput {
  poste: string;
  employeur: string;
  lieu: string;
  debut: string;
  fin: string;
  description: string;
}

export interface CvFormationInput {
  diplome: string;
  etablissement: string;
  lieu: string;
  annee: string;
}

export interface CvLangueInput {
  langue: string;
  niveau: string;
}

export interface CvInputData {
  nom: string;
  titre_vise: string;
  email: string;
  telephone: string;
  ville: string;
  resume: string;
  auto_redaction_resume?: boolean;
  experiences: CvExperienceInput[];
  formations: CvFormationInput[];
  competences: string[];
  langues: CvLangueInput[];
  centres_interet: string[];
}

export interface CvOutputExperience {
  poste: string;
  employeur: string;
  lieu: string;
  periode: string;
  points: string[];
}

export interface CvOutputDocument {
  identite: {
    nom: string;
    titre_vise: string;
    email: string;
    telephone: string;
    ville: string;
  };
  resume: string;
  experiences: CvOutputExperience[];
  formations: CvFormationInput[];
  competences: string[];
  langues: CvLangueInput[];
  centres_interet: string[];
  verification?: {
    passages_remplaces_par_ton_texte?: number;
  };
}

export interface LettreExpediteur {
  nom: string;
  adresse: string;
  telephone: string;
  email: string;
}

export interface LettreDestinataire {
  nom: string;
  fonction: string;
  organisation: string;
  adresse: string;
}

export interface LettreInputData {
  type_lettre: string;
  expediteur: LettreExpediteur;
  destinataire: LettreDestinataire;
  lieu: string;
  date: string;
  objet: string;
  points: string[];
  ton: string;
}

export interface LettreOutputDocument {
  lieu_date: string;
  expediteur: LettreExpediteur;
  destinataire: LettreDestinataire;
  objet: string;
  ouverture: string;
  paragraphes: string[];
  formule_politesse: string;
  signature: string;
}

export interface GenererDocumentResult {
  type?: 'cv' | 'lettre' | 'devis' | 'facture' | 'formulaire';
  document?: any;
  credits_restants?: number;
  cout?: number;
  error?: string;
  isInsufficientCredits?: boolean;
}

// ============================================================================
// OUTILS DEVIS & FACTURE
// ============================================================================

export interface InvoiceEntity {
  nom: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  identifiant_fiscal?: string;
}

export interface InvoiceLineInput {
  description: string;
  quantite: number;
  prix_unitaire: number;
  remise_pct?: number;
}

export interface InvoiceLineOutput {
  description: string;
  quantite: number;
  prix_unitaire: number;
  remise_pct?: number;
  total_ht: number;
}

export interface InvoiceInputData {
  type: 'devis' | 'facture';
  numero: string;
  date: string;
  echeance?: string;
  validite?: string;
  emetteur: InvoiceEntity;
  client: InvoiceEntity;
  devise: 'FCFA' | 'EUR' | 'USD';
  lignes: InvoiceLineInput[];
  remise_globale_pct?: number;
  tva_taux?: number;
  acompte?: number;
  conditions_paiement?: string;
  mentions?: string;
  notes?: string;
}

export interface InvoiceOutputDocument {
  type: 'devis' | 'facture';
  numero: string;
  date: string;
  devise: 'FCFA' | 'EUR' | 'USD' | string;
  echeance?: string;
  validite?: string;
  emetteur: InvoiceEntity;
  client: InvoiceEntity;
  lignes: InvoiceLineOutput[];
  sous_total_ht: number;
  remise_globale_pct?: number;
  remise_globale?: number;
  base_ht?: number;
  tva_taux?: number;
  tva_montant?: number;
  total_ttc: number;
  acompte?: number;
  reste_a_payer?: number;
  conditions_paiement?: string;
  mentions?: string;
  notes?: string;
}

// ============================================================================
// OUTIL GÉNÉRER UN FORMULAIRE
// ============================================================================

export type FormFieldType =
  | 'texte'
  | 'texte_long'
  | 'nombre'
  | 'date'
  | 'email'
  | 'telephone'
  | 'choix_unique'
  | 'choix_multiple'
  | 'case'
  | 'signature';

export interface FormField {
  id?: string;
  libelle: string;
  type: FormFieldType;
  obligatoire?: boolean;
  aide?: string;
  options?: string[];
}

export interface FormSection {
  id?: string;
  titre: string;
  champs: FormField[];
}

export interface FormAnalyse {
  objectif: string;
  public: string;
  points_attention: string[];
}

export interface FormDocument {
  titre: string;
  description?: string;
  sections: FormSection[];
  analyse?: FormAnalyse;
}

export interface FormInputData {
  idee: string;
  public?: string;
  contexte?: string;
}

// ============================================================================
// CRÉATION DE MÉDIA (VIDÉO & AUDIO)
// ============================================================================

export interface VideoModelOption {
  id: string; // 'rapide' | 'qualite' | 'kling' | string
  nom: string;
  description: string;
  son: 'reglable' | 'consigne' | 'incertain' | string;
  personnages?: boolean;
  durees: (number | string)[];
  resolutions: string[];
  resolution_defaut: string;
  formats: string[];
  couts: Record<string, Record<string, { avec_son: number; sans_son: number }>>;
}

export interface AudioOptionsConfig {
  credits_par_1000_caracteres: number;
  caracteres_max: number;
  voix: string[];
  modes?: string[];
  repliques_max?: number;
  scene_caracteres_max?: number;
  option_caracteres_max?: number;
  ton_caracteres_max?: number;
  format?: string;
  langues?: string[];
}

export interface MusiqueOptionsConfig {
  cout: number;
  pistes?: number;
  description_max: number;
  titre_max: number;
  style_max: number;
  paroles_max: number;
}

export interface ProjetConfig {
  scenes_max?: number;
  personnages_max?: number;
  personnages_par_scene_max?: number;
  scene_caracteres_max?: number;
  style_caracteres_max?: number;
}

export interface MediaOptionsResponse {
  video: VideoModelOption[];
  audio: AudioOptionsConfig;
  musique?: MusiqueOptionsConfig;
  projet?: ProjetConfig;
}

export interface PersonnageInput {
  id: string;
  nom: string;
  image: string; // chemin dans uploads : {user_id}/personnages/{uuid}.{ext}
  localPreview?: string;
  file?: File;
}

export interface SceneInput {
  id: string;
  nom?: string;
  prompt: string;
  duree: number;
  personnages: string[];
}

export interface VideoProjectGeneratePayload {
  action: 'projet';
  titre?: string;
  style: string;
  modele: string;
  resolution: string;
  format: string;
  son: boolean;
  personnages: { nom: string; image: string }[];
  scenes: { nom?: string; prompt: string; duree: number; personnages: string[] }[];
}

export interface VideoProjectScene {
  id?: string;
  scene_num: number;
  nom?: string;
  scene_nom?: string;
  prompt?: string;
  duree?: number;
  statut: 'en_attente' | 'en_cours' | 'termine' | 'erreur' | string;
  url?: string;
  fichier?: string;
  cout?: number;
  error?: string;
  personnages?: string[];
}

export interface VideoProjectRecord {
  id: string;
  user_id?: string;
  titre?: string;
  style?: string;
  modele?: string;
  statut?: 'en_cours' | 'termine' | 'erreur' | string;
  scenes: VideoProjectScene[];
  created_at: string;
  total_cout?: number;
  total_duree?: number;
}


export interface VideoGeneratePayload {
  type: 'video';
  modele: string;
  prompt: string;
  duree: number;
  resolution: string;
  format: string;
  son: boolean;
  image_depart?: string;
}

export interface AudioRepliqueInput {
  locuteur: 1 | 2;
  texte: string;
}

export interface AudioGeneratePayload {
  type: 'audio';
  mode?: 'dialogue';
  texte?: string;
  voix: string;
  voix_2?: string;
  accent?: string;
  accent_2?: string;
  style?: string;
  style_2?: string;
  rythme?: string;
  rythme_2?: string;
  scene?: string;
  repliques?: AudioRepliqueInput[];
  ton?: string;
  langue?: string;
  vitesse?: number;
}

export interface MusiqueDescriptionPayload {
  type: 'musique';
  description: string;
  instrumental?: boolean;
}

export interface MusiqueParolesPayload {
  type: 'musique';
  mode: 'paroles';
  titre?: string;
  style?: string;
  paroles: string;
}

export type MediaGeneratePayload =
  | VideoGeneratePayload
  | AudioGeneratePayload
  | MusiqueDescriptionPayload
  | MusiqueParolesPayload;

export interface MediaRecord {
  id: string;
  user_id?: string;
  type: 'video' | 'audio' | 'musique';
  modele?: string;
  prompt?: string;
  texte?: string;
  description?: string;
  titre?: string;
  style?: string;
  paroles?: string;
  instrumental?: boolean;
  mode?: string;
  duree?: number;
  resolution?: string;
  format?: string;
  son?: boolean;
  voix?: string;
  ton?: string;
  langue?: string;
  vitesse?: number;
  statut: 'en_attente' | 'en_cours' | 'termine' | 'erreur' | 'echec' | string;
  url?: string;
  url_2?: string;
  chemin?: string;
  fichier?: string;
  fichier_2?: string;
  cout?: number;
  error?: string;
  created_at: string;
  image_depart?: string;
  signedUrl?: string;
  signedUrl_2?: string;
  projet_id?: string;
  scene_num?: number;
  scene_nom?: string;
  options?: any;
}
// ============================================================================
// ADMINISTRATION
// ============================================================================

export interface AdminDashboardStats {
  utilisateurs?: number;
  nouveaux_7j?: number;
  nouveaux?: number;
  nouveaux_7jours?: number;
  medias_termines?: number;
  videos_terminees?: number;
  audios_termines?: number;
  musiques_terminees?: number;
  termines?: number;
  en_cours?: number;
  echecs_24h?: number;
  credits_ajoutes_30j?: number;
  valeur_fcfa_ajoutee_30j?: number;
  credits_depenses_30j?: number;
  credits_en_circulation?: number;
  credits_circulation?: number;
}

export interface AdminUserSummary {
  id: string;
  email: string;
  nom?: string;
  prenoms?: string;
  pays?: string;
  whatsapp?: string;
  created_at: string;
  last_sign_in_at?: string;
  banned_until?: string | null;
  solde: number;
  est_admin: boolean;
}

export interface AdminCreditTransaction {
  id?: string;
  delta: number;
  motif: string;
  note?: string;
  created_at: string;
  solde_apres?: number;
}

export interface AdminUserCreation {
  id: string;
  type: string;
  statut: string;
  cout?: number;
  created_at: string;
  prompt?: string;
}

export interface AdminUserDetail {
  utilisateur: AdminUserSummary;
  transactions: AdminCreditTransaction[];
  creations: AdminUserCreation[];
}

export interface AdminJournalEntry {
  id?: string;
  created_at: string;
  action: 'ajout_credits' | 'retrait_credits' | 'blocage' | 'bloquage' | 'deblocage' | string;
  user_id?: string;
  admin_id?: string;
  delta?: number;
  note?: string;
  solde_apres?: number;
  details?: string | any;
}
