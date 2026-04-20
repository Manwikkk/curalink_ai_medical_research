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

export interface AnswerSection {
  conditionOverview: string;
  personalizedInsights?: string | null;
  researchInsights: string;
  publications: Publication[];
  trials: ClinicalTrial[];
  sources: Source[];
  /** Whether BM25 retrieval found relevant chunks from an uploaded document */
  ragUsed?: boolean;
  ragChunksFound?: number;
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
  summary?: string;
  insights?: string[];
}
