import { useEffect, useState } from "react";
import { Activity, MapPin, Stethoscope, Target } from "lucide-react";
import { ReportUploadCard } from "./ReportUploadCard";
import { chatApi } from "@/lib/api";

interface Props {
  conversationId?: string;
}

interface SessionMeta {
  title: string;
  condition: string;
  messageCount: number;
  lastContext?: {
    condition?: string;
    intent?: string;
    location?: string;
  };
}

export function ContextSidebar({ conversationId }: Props) {
  const [session, setSession] = useState<SessionMeta | null>(null);

  useEffect(() => {
    if (!conversationId) {
      setSession(null);
      return;
    }
    chatApi.getConversation(conversationId).then(({ conversation }) => {
      const c = conversation as any;
      const messages = c.messages || [];
      // Find last user message context
      const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
      setSession({
        title: c.title || "Research session",
        condition: c.condition || "",
        messageCount: messages.length,
        lastContext: lastUserMsg?.context,
      });
    }).catch(() => setSession(null));
  }, [conversationId]);

  return (
    <aside className="flex h-full w-[300px] shrink-0 flex-col gap-4 overflow-y-auto border-l border-border/40 bg-background/40 p-4 backdrop-blur-xl xl:w-[340px]">
      <div className="glass rounded-2xl p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Active session</p>
        <h3 className="mt-1 font-display text-base font-semibold text-foreground">
          {session?.title || "No session active"}
        </h3>
        <div className="mt-3 grid gap-2 text-xs">
          <ContextRow
            icon={Stethoscope}
            label="Condition"
            value={session?.lastContext?.condition || session?.condition || "—"}
          />
          <ContextRow
            icon={Target}
            label="Intent"
            value={session?.lastContext?.intent || "—"}
          />
          <ContextRow
            icon={MapPin}
            label="Location"
            value={session?.lastContext?.location || "—"}
          />
          <ContextRow
            icon={Activity}
            label="Memory"
            value={
              session
                ? `${session.messageCount} turn${session.messageCount !== 1 ? "s" : ""} · context preserved`
                : "No active session"
            }
            accent={!!session}
          />
        </div>
      </div>

      <ReportUploadCard conversationId={conversationId} />

      <div className="glass rounded-2xl p-4 text-xs leading-relaxed text-muted-foreground">
        <p className="font-semibold text-foreground">Research-only output</p>
        <p className="mt-1">
          Curalink synthesizes published evidence and active trials. Always confirm with primary
          sources before clinical decisions.
        </p>
      </div>
    </aside>
  );
}

function ContextRow({ icon: Icon, label, value, accent }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string; accent?: boolean;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${accent ? "text-success" : "text-primary/70"}`} />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-[13px] text-foreground">{value}</p>
      </div>
    </div>
  );
}
