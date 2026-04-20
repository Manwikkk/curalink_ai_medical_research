import { useEffect, useRef, useState, useCallback } from "react";
import {
  CheckCircle2,
  FileText,
  Loader2,
  Sparkles,
  Stethoscope,
  UploadCloud,
  User,
  X,
  AlertCircle,
  BookOpenCheck,
} from "lucide-react";
import type { ChatMessage, FileAttachment } from "@/lib/types";
import { chatApi, reportApi, type ChatRequest } from "@/lib/api";
import { AnswerView } from "./AnswerView";
import { QueryComposer } from "./QueryComposer";
import { cn } from "@/lib/utils";

interface ChatWindowProps {
  conversationId?: string;
  onConversationCreated?: (id: string) => void;
  isGuest?: boolean;
}

export function ChatWindow({
  conversationId,
  onConversationCreated,
  isGuest = false,
}: ChatWindowProps) {
  const [messages, setMessages]                     = useState<ChatMessage[]>([]);
  const [loading, setLoading]                       = useState(false);
  const [error, setError]                           = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>(conversationId);
  const [sessionTitle, setSessionTitle]             = useState<string>("");
  const [sessionCondition, setSessionCondition]     = useState<string>("");
  const [pendingUploads, setPendingUploads]         = useState<FileAttachment[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Load conversation when switching sessions ──────────────────────────────
  useEffect(() => {
    if (conversationId && !isGuest) {
      setActiveConversationId(conversationId);
      loadConversation(conversationId);
    } else if (!conversationId) {
      setMessages([]);
      setActiveConversationId(undefined);
      setSessionTitle("");
      setSessionCondition("");
      setPendingUploads([]);
    }
  }, [conversationId, isGuest]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, pendingUploads]);

  async function loadConversation(id: string) {
    try {
      const { conversation } = await chatApi.getConversation(id);
      const conv = conversation as any;
      setMessages(conv.messages || []);
      setSessionTitle(conv.title || "");
      setSessionCondition(conv.condition || "");
    } catch {
      setError("Failed to load conversation.");
    }
  }

  // ── File upload with step-by-step status ──────────────────────────────────
  const updateAttachment = useCallback(
    (id: string, patch: Partial<FileAttachment>) =>
      setPendingUploads((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...patch } : a))
      ),
    []
  );

  async function processFile(
    file: File,
    attachId: string,
    convId?: string
  ): Promise<string | null> {
    try {
      // Step 1: upload
      updateAttachment(attachId, { status: "upload" });
      const uploadRes = await reportApi.upload(file, convId);

      // Step 2: extracting text (poll for 20% → 50%)
      updateAttachment(attachId, { status: "extracting", reportId: uploadRes.id });

      // Step 3: indexing (poll until ready)
      await reportApi.pollUntilReady(uploadRes.id, (r) => {
        if (r.progress >= 75) {
          updateAttachment(attachId, { status: "indexing" });
        }
      });

      updateAttachment(attachId, { status: "ready", reportId: uploadRes.id });
      return uploadRes.id;
    } catch (err: any) {
      updateAttachment(attachId, { status: "error", errorMessage: err.message || "Processing failed" });
      return null;
    }
  }

  // ── Submit handler ────────────────────────────────────────────────────────
  async function handleSubmit(data: {
    query: string;
    condition: string;
    intent: string;
    location: string;
    files: File[];
  }) {
    if (!data.query.trim() && data.files.length === 0) return;
    setError(null);

    // Build attachment stubs immediately so they appear in the UI
    const newAttachments: FileAttachment[] = data.files.map((f) => ({
      id:     crypto.randomUUID(),
      name:   f.name,
      size:   f.size,
      status: "upload" as const,
    }));

    const userMsg: ChatMessage = {
      id:          crypto.randomUUID(),
      role:        "user",
      content:     data.query || "",
      timestamp:   Date.now(),
      context: {
        condition: data.condition || undefined,
        intent:    data.intent    || undefined,
        location:  data.location  || undefined,
      },
      attachments: newAttachments.length > 0 ? newAttachments : undefined,
    };

    setMessages((m) => [...m, userMsg]);
    if (newAttachments.length > 0) setPendingUploads((p) => [...p, ...newAttachments]);
    setLoading(true);

    try {
      const newReportIds: string[] = [];

      if (!isGuest && data.files.length > 0) {
        for (let i = 0; i < data.files.length; i++) {
          const rid = await processFile(data.files[i], newAttachments[i].id, activeConversationId);
          if (rid) newReportIds.push(rid);
        }
      }

      const payload: ChatRequest = {
        query:          data.query || "Summarise and analyse the uploaded medical report.",
        condition:      data.condition  || undefined,
        intent:         data.intent     || undefined,
        location:       data.location   || undefined,
        conversationId: isGuest ? undefined : activeConversationId,
        reportIds:      newReportIds.length > 0 ? newReportIds : undefined,
      };

      const res = await chatApi.send(payload);

      if (!isGuest && !activeConversationId && res.conversationId) {
        const id = String(res.conversationId);
        setActiveConversationId(id);
        onConversationCreated?.(id);
      }

      setMessages((m) => [...m, res.message]);

      // Update session header from first response
      if (!sessionTitle && res.conversationId) {
        try {
          const { conversation } = await chatApi.getConversation(String(res.conversationId));
          const c = conversation as any;
          if (c.title) setSessionTitle(c.title);
          if (c.condition) setSessionCondition(c.condition);
        } catch {
          /* non-critical */
        }
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
      setMessages((m) => m.filter((msg) => msg.id !== userMsg.id));
      // Mark all pending uploads as error
      newAttachments.forEach((a) => updateAttachment(a.id, { status: "error" }));
    } finally {
      setLoading(false);
    }
  }

  const hasActiveUploads = pendingUploads.some(
    (a) => a.status === "upload" || a.status === "extracting" || a.status === "indexing"
  );

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col">
      {/* ── Slim session header ────────────────────────────────────────────── */}
      {(sessionTitle || sessionCondition) && (
        <div className="flex shrink-0 items-center gap-3 border-b border-border/30 bg-background/40 px-6 py-2 backdrop-blur-sm">
          <Stethoscope className="h-3.5 w-3.5 shrink-0 text-primary/70" />
          <p className="truncate text-xs font-medium text-foreground">{sessionTitle}</p>
          {sessionCondition && (
            <>
              <span className="text-border/60">·</span>
              <p className="truncate text-xs text-muted-foreground">{sessionCondition}</p>
            </>
          )}
        </div>
      )}

      {/* ── Message feed ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col px-4 sm:px-8">
          {messages.length === 0 && !loading ? (
            <div className="flex flex-1 flex-col items-center justify-center pb-12">
              <EmptyState />
            </div>
          ) : (
            <div className="flex-1 space-y-8 py-6 sm:py-10">
              {messages.map((m) =>
                m.role === "user" ? (
                  <UserMessage
                    key={m.id}
                    msg={m}
                    pendingUploads={pendingUploads}
                  />
                ) : (
                  <AssistantMessage key={m.id} msg={m} />
                )
              )}

              {loading && <LoadingMessage hasUploads={hasActiveUploads} />}

              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Composer ──────────────────────────────────────────────────────── */}
      <div className="border-t border-border/40 bg-background/60 px-4 py-4 backdrop-blur-xl sm:px-8">
        <div className="mx-auto max-w-4xl">
          <QueryComposer onSubmit={handleSubmit} disabled={loading || hasActiveUploads} />
        </div>
      </div>
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex w-full max-w-2xl flex-col items-center justify-center text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[image:var(--gradient-primary)] shadow-[var(--glow-primary)]">
        <Sparkles className="h-7 w-7 text-primary-foreground" />
      </div>
      <h2 className="mt-6 font-display text-2xl font-semibold text-foreground">
        Start a research session
      </h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Ask a clinical question and Curalink will retrieve and synthesise evidence from PubMed,
        OpenAlex, and ClinicalTrials.gov. You can also attach a patient PDF report for
        personalised insights.
      </p>
      <div className="mt-6 grid grid-cols-3 gap-3 text-center">
        {[
          { label: "PubMed", desc: "Peer-reviewed" },
          { label: "OpenAlex", desc: "Open access" },
          { label: "ClinicalTrials", desc: "Active trials" },
        ].map((s) => (
          <div key={s.label} className="glass rounded-xl p-3">
            <p className="text-xs font-semibold text-primary">{s.label}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── User message ───────────────────────────────────────────────────────────────

function UserMessage({
  msg,
  pendingUploads,
}: {
  msg: ChatMessage;
  pendingUploads: FileAttachment[];
}) {
  // Merge stored attachments with live pending state
  const attachments = (msg.attachments || []).map((a) => {
    const live = pendingUploads.find((p) => p.id === a.id);
    return live ?? a;
  });

  return (
    <div className="animate-fade-up flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/50 bg-card/60 text-muted-foreground">
        <User className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        {msg.content && (
          <p className="text-[15px] leading-relaxed text-foreground">{msg.content}</p>
        )}

        {/* Context chips */}
        {msg.context && Object.values(msg.context).some(Boolean) && (
          <div className="flex flex-wrap gap-1.5">
            {msg.context.condition && <ContextChip>{msg.context.condition}</ContextChip>}
            {msg.context.intent    && <ContextChip>{msg.context.intent}</ContextChip>}
            {msg.context.location  && <ContextChip>{msg.context.location}</ContextChip>}
          </div>
        )}

        {/* File attachment bubbles */}
        {attachments.length > 0 && (
          <div className="space-y-1.5">
            {attachments.map((a) => (
              <FileBubble key={a.id} attachment={a} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── File bubble ────────────────────────────────────────────────────────────────

const FILE_STATUS_LABEL: Record<FileAttachment["status"], string> = {
  upload:     "Uploading…",
  extracting: "Extracting text…",
  indexing:   "Building index…",
  ready:      "Context ready ✓",
  error:      "Processing failed",
};

function FileBubble({ attachment: a }: { attachment: FileAttachment }) {
  const isLoading = a.status === "upload" || a.status === "extracting" || a.status === "indexing";
  const isReady   = a.status === "ready";
  const isError   = a.status === "error";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2.5 rounded-xl border px-3.5 py-2 text-sm transition-all",
        isReady  && "border-success/30 bg-success/8",
        isError  && "border-destructive/30 bg-destructive/8",
        isLoading && "border-primary/25 bg-primary/8"
      )}
    >
      {/* Icon */}
      {isLoading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />}
      {isReady   && <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />}
      {isError   && <AlertCircle  className="h-4 w-4 shrink-0 text-destructive" />}
      {!isLoading && !isReady && !isError && <FileText className="h-4 w-4 shrink-0 text-primary" />}

      {/* Name + size */}
      <span className="max-w-[220px] truncate font-medium text-foreground">{a.name}</span>
      <span className="shrink-0 text-[11px] text-muted-foreground">
        {(a.size / 1024).toFixed(0)} KB
      </span>

      {/* Separator */}
      <span className="text-border/60">·</span>

      {/* Status label */}
      <span
        className={cn(
          "shrink-0 text-[11px] font-medium",
          isReady  && "text-success",
          isError  && "text-destructive",
          isLoading && "text-primary"
        )}
      >
        {isError ? (a.errorMessage || FILE_STATUS_LABEL.error) : FILE_STATUS_LABEL[a.status]}
      </span>
    </div>
  );
}

// ── Assistant message ──────────────────────────────────────────────────────────

function AssistantMessage({ msg }: { msg: ChatMessage }) {
  const ragUsed = msg.answer?.ragUsed;

  return (
    <div className="animate-fade-up flex gap-3">
      <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[image:var(--gradient-primary)] shadow-[var(--glow-primary)]">
        <Sparkles className="h-4 w-4 text-primary-foreground" />
      </div>
      <div className="min-w-0 flex-1 space-y-3">
        {/* Header row */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Curalink</span>
          <span>·</span>
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Evidence synthesised
          </span>

          {/* RAG badge */}
          {ragUsed === true && (
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              <BookOpenCheck className="h-3 w-3" />
              Using your uploaded report
            </span>
          )}
          {ragUsed === false && msg.answer && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-card/40 px-2 py-0.5 text-[10px] text-muted-foreground">
              <UploadCloud className="h-3 w-3" />
              No relevant document context
            </span>
          )}
        </div>

        {msg.answer && <AnswerView answer={msg.answer} />}
      </div>
    </div>
  );
}

// ── Loading message ────────────────────────────────────────────────────────────

function LoadingMessage({ hasUploads }: { hasUploads: boolean }) {
  return (
    <div className="animate-fade-in flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[image:var(--gradient-primary)]">
        <Sparkles className="h-4 w-4 animate-pulse text-primary-foreground" />
      </div>
      <div className="min-w-0 flex-1 space-y-3">
        <p className="text-xs text-muted-foreground">
          {hasUploads
            ? "Processing document · building index · preparing retrieval…"
            : "Retrieving · ranking · reasoning across sources…"}
        </p>
        <div className="space-y-2">
          {[82, 96, 64].map((w, i) => (
            <div
              key={i}
              className="h-3 overflow-hidden rounded-md bg-card/60 shimmer"
              style={{ width: `${w}%` }}
            />
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-24 overflow-hidden rounded-xl bg-card/40 shimmer" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Small helpers ──────────────────────────────────────────────────────────────

function ContextChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-border/50 bg-card/40 px-2 py-0.5 text-[11px] text-muted-foreground">
      {children}
    </span>
  );
}
