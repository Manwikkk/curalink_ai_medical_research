export type SourceBadge = "PubMed" | "OpenAlex" | "ClinicalTrials.gov" | "NIH" | "WHO";

export interface Publication {
  id: string;
  title: string;
  authors: string[];
  year: number;
  source: SourceBadge;
  abstract: string;
  url: string;
  citations?: number;
  journal?: string;
}

export type TrialStatus =
  | "Recruiting"
  | "Active, not recruiting"
  | "Completed"
  | "Not yet recruiting"
  | "Enrolling by invitation";

export interface ClinicalTrial {
  id: string;
  title: string;
  status: TrialStatus;
  phase?: string;
  eligibility: string;
  location: string;
  contact?: string;
  source: SourceBadge;
  sponsor?: string;
  startDate?: string;
}

export interface Source {
  id: string;
  title: string;
  authors: string[];
  year: number;
  platform: SourceBadge;
  url: string;
  snippet: string;
}

export type DocType =
  | "patient_report"
  | "research_paper"
  | "general_medical"
  | "non_medical"
  | "unknown"
  | null;

export interface AnswerSection {
  /** Unified primary response — always populated */
  answer: string;
  /** Document-specific insights — null when no doc uploaded */
  documentInsights?: string | null;
  /** Type of uploaded document */
  docType?: DocType;
  /** Whether BM25 retrieval found relevant chunks */
  ragUsed?: boolean;
  ragChunksFound?: number;
  /** True when BM25 scored 0 and first-N chunks used as fallback */
  isFallbackContext?: boolean;
  /** Legacy fields kept for UI backward-compat */
  conditionOverview?: string;
  personalizedInsights?: string | null;
  researchInsights?: string;
  publications: Publication[];
  trials: ClinicalTrial[];
  sources: Source[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  context?: {
    condition?: string;
    intent?: string;
    location?: string;
  };
  answer?: AnswerSection;
  /** Inline file attachments displayed in the user bubble */
  attachments?: FileAttachment[];
}

export interface FileAttachment {
  id: string;
  name: string;
  size: number;
  /** upload → processing → ready | error */
  status: "upload" | "extracting" | "indexing" | "ready" | "error";
  reportId?: string;
  errorMessage?: string;
}

export interface Conversation {
  id: string;
  title: string;
  condition?: string;
  updatedAt: number;
  messageCount: number;
}

export interface UploadedReport {
  id: string;
  name: string;
  size: number;
  type: string;
  status: "uploading" | "processing" | "ready" | "error";
  progress: number;
  docType?: DocType;
  summary?: string;
  insights?: string[];
}
