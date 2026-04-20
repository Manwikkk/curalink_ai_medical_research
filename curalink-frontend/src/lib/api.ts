/**
 * Curalink API Client
 * Typed, centralized API layer for all backend communication.
 * Place this file at: src/lib/api.ts
 */

import type {
  AnswerSection,
  ChatMessage,
  ClinicalTrial,
  Conversation,
  Publication,
  UploadedReport,
} from "./types";

// In development, use /api (relative) so Vite's proxy forwards to localhost:5000 — no CORS issues.
// In production, set VITE_API_URL to your deployed backend URL (e.g. https://api.curalink.app/api).
const BASE_URL = import.meta.env.VITE_API_URL || "/api";

// ── Storage helpers ──────────────────────────────────────────────────────────

export const tokenStorage = {
  get: () => localStorage.getItem("curalink_token"),
  set: (t: string) => localStorage.setItem("curalink_token", t),
  clear: () => localStorage.removeItem("curalink_token"),
};

// ── Base fetch wrapper ───────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = tokenStorage.get();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.error || `HTTP ${res.status}`, res.status);
  }

  return res.json();
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  medicalProfile: {
    condition: string;
    location: string;
    specialty: string;
    notes: string;
  };
  preferences: {
    preferredSources: string[];
    maxPublications: number;
    maxTrials: number;
    dateRangeYears: number;
  };
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export const authApi = {
  register: (name: string, email: string, password: string) =>
    request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),

  login: (email: string, password: string) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  getMe: () => request<{ user: AuthUser }>("/auth/me"),

  // Redirect to Google OAuth
  googleSignIn: () => {
    window.location.href = `${BASE_URL}/auth/google`;
  },
};

// ── Chat ─────────────────────────────────────────────────────────────────────

export interface ChatRequest {
  query: string;
  condition?: string;
  intent?: string;
  location?: string;
  conversationId?: string;
  reportIds?: string[];
}

export interface ChatResponse {
  conversationId: string;
  message: ChatMessage;
  stats: {
    pubmedFetched: number;
    openAlexFetched: number;
    trialsFetched: number;
    publicationsRanked: number;
    trialsRanked: number;
  };
}

export const chatApi = {
  send: (payload: ChatRequest) =>
    request<ChatResponse>("/chat", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getConversation: (conversationId: string) =>
    request<{ conversation: Conversation & { messages: ChatMessage[] } }>(
      `/chat/${conversationId}`
    ),

  deleteConversation: (conversationId: string) =>
    request<{ success: boolean }>(`/chat/${conversationId}`, { method: "DELETE" }),
};

// ── History ───────────────────────────────────────────────────────────────────

export const historyApi = {
  get: () =>
    request<{
      conversations: Array<{
        id: string;
        title: string;
        condition?: string;
        updatedAt: number;
        messageCount: number;
      }>;
    }>("/history"),

  clear: () => request<{ success: boolean }>("/history", { method: "DELETE" }),
};

// ── Reports ───────────────────────────────────────────────────────────────────

export interface ReportResponse {
  id: string;
  name: string;
  size: number;
  type: string;
  status: UploadedReport["status"];
  progress: number;
  summary?: string;
  insights?: string[];
}

export const reportApi = {
  upload: (file: File, conversationId?: string): Promise<ReportResponse> => {
    const formData = new FormData();
    formData.append("report", file);
    if (conversationId) formData.append("conversationId", conversationId);

    const token = tokenStorage.get();
    return fetch(`${BASE_URL}/upload-report`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    }).then(async (res) => {
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new ApiError(body.error || `HTTP ${res.status}`, res.status);
      }
      return res.json();
    });
  },

  getStatus: (reportId: string) =>
    request<ReportResponse>(`/upload-report/${reportId}`),

  list: () => request<{ reports: ReportResponse[] }>("/upload-report"),

  delete: (reportId: string) =>
    request<{ success: boolean }>(`/upload-report/${reportId}`, { method: "DELETE" }),

  /** Poll until report is ready or errored. */
  pollUntilReady: (
    reportId: string,
    onProgress?: (r: ReportResponse) => void,
    intervalMs = 1500,
    maxAttempts = 40
  ): Promise<ReportResponse> => {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const interval = setInterval(async () => {
        try {
          attempts++;
          const report = await reportApi.getStatus(reportId);
          if (onProgress) onProgress(report);

          if (report.status === "ready" || report.status === "error") {
            clearInterval(interval);
            if (report.status === "ready") resolve(report);
            else reject(new Error("Report processing failed"));
          } else if (attempts >= maxAttempts) {
            clearInterval(interval);
            reject(new Error("Report processing timed out"));
          }
        } catch (err) {
          clearInterval(interval);
          reject(err);
        }
      }, intervalMs);
    });
  },
};

// ── Settings ──────────────────────────────────────────────────────────────────

export interface MedicalProfile {
  condition?: string;
  location?: string;
  specialty?: string;
  notes?: string;
}

export interface UserPreferences {
  preferredSources?: string[];
  maxPublications?: number;
  maxTrials?: number;
  dateRangeYears?: number;
}

export const settingsApi = {
  get: () =>
    request<{ name: string; email: string; avatar: string | null; medicalProfile: MedicalProfile; preferences: UserPreferences }>("/settings"),

  update: (data: { medicalProfile?: MedicalProfile; preferences?: UserPreferences }) =>
    request<{ user: AuthUser }>("/settings", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  updateProfile: (data: { name?: string; avatar?: string }) =>
    request<{ user: AuthUser }>("/settings/profile", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};
