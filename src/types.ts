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

export type AppTab = 'chat' | 'tools' | 'history' | 'profile' | 'settings';

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

