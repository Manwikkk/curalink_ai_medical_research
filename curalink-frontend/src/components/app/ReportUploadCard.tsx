/**
 * ReportUploadCard — wired to real backend.
 */
import { useState } from "react";
import { CheckCircle2, FileText, Loader2, UploadCloud, X } from "lucide-react";
import type { UploadedReport } from "@/lib/types";
import { reportApi } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Props {
  conversationId?: string;
  onReportReady?: (reportId: string) => void;
}

export function ReportUploadCard({ conversationId, onReportReady }: Props) {
  const [report, setReport] = useState<UploadedReport | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  async function handleUpload(file: File) {
    const pending: UploadedReport = {
      id: "",
      name: file.name,
      size: file.size,
      type: file.type,
      status: "uploading",
      progress: 0,
    };
    setReport(pending);

    try {
      const uploadRes = await reportApi.upload(file, conversationId);
      setReport({ ...pending, id: uploadRes.id, status: "processing", progress: 30 });

      const ready = await reportApi.pollUntilReady(
        uploadRes.id,
        (r) => {
          setReport({
            id: r.id,
            name: r.name,
            size: r.size,
            type: r.type || file.type,
            status: r.status,
            progress: r.progress,
            summary: r.summary,
            insights: r.insights,
          });
        }
      );

      setReport({
        id: ready.id,
        name: ready.name,
        size: ready.size,
        type: ready.type || file.type,
        status: "ready",
        progress: 100,
        summary: ready.summary,
        insights: ready.insights,
      });

      onReportReady?.(ready.id);
    } catch (err: any) {
      setReport({ ...pending, status: "error", progress: 0 });
    }
  }

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Personalized context</p>
          <h3 className="mt-1 font-display text-sm font-semibold text-foreground">Medical report</h3>
        </div>
        {report?.status === "ready" && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-0.5 text-[11px] font-medium text-success">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inset-0 rounded-full bg-success animate-ping-soft" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-success" />
            </span>
            Context active
          </span>
        )}
      </div>

      {!report && (
        <label
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f) handleUpload(f); }}
          className={cn(
            "mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-background/30 p-6 text-center transition-all",
            isDragging && "border-primary/60 bg-primary/5"
          )}
        >
          <input type="file" accept=".pdf,image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UploadCloud className="h-5 w-5" />
          </div>
          <p className="mt-2.5 text-sm font-medium text-foreground">Drag & drop or click to upload</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">PDF or image · pathology, imaging, discharge</p>
        </label>
      )}

      {report && report.status !== "ready" && (
        <div className="mt-4 rounded-xl border border-border/50 bg-background/40 p-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {report.status === "uploading" ? <UploadCloud className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{report.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {report.status === "uploading" ? "Uploading…" : report.status === "error" ? "Processing failed" : "Extracting medical signals…"}
              </p>
            </div>
          </div>
          {report.status !== "error" && (
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-card/60">
              <div className="h-full rounded-full bg-[image:var(--gradient-primary)] transition-all" style={{ width: `${report.progress}%` }} />
            </div>
          )}
        </div>
      )}

      {report?.status === "ready" && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/40 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/15 text-success">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
                <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                {report.name}
              </p>
              <p className="text-[11px] text-muted-foreground">{(report.size / 1024).toFixed(0)} KB · processed</p>
            </div>
            <button onClick={() => setReport(null)} className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-card/60 hover:text-destructive" aria-label="Remove report">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {report.summary && (
            <div className="rounded-xl border border-border/40 bg-card/30 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Extracted summary</p>
              <p className="mt-1.5 text-xs leading-relaxed text-foreground/90">{report.summary}</p>
              {report.insights && report.insights.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {report.insights.map((i) => (
                    <span key={i} className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">{i}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
