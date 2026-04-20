/**
 * ConversationsSidebar — wired to real backend.
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { MessageSquarePlus, Search, Trash2, Loader2 } from "lucide-react";
import { historyApi, chatApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface ConversationMeta {
  id: string;
  title: string;
  condition?: string;
  updatedAt: number;
  messageCount: number;
}

interface Props {
  activeId?: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  refreshTrigger?: number;
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function ConversationsSidebar({ activeId, onSelect, onNew, refreshTrigger }: Props) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const fetchHistory = useCallback(async () => {
    try {
      const { conversations } = await historyApi.get();
      setConversations(conversations);
    } catch {
      // silently fail — user may not be authed
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory, refreshTrigger]);

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await chatApi.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeId === id) onNew();
    } catch {}
  }

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(q.toLowerCase())
  );

  const initials = user?.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-border/40 bg-background/40 backdrop-blur-xl">
      <div className="border-b border-border/40 p-4">
        <Button variant="hero" size="default" className="w-full justify-start" onClick={onNew}>
          <MessageSquarePlus className="h-4 w-4" />
          New research session
        </Button>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search sessions"
            className="h-9 w-full rounded-lg border border-border/50 bg-card/40 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-primary/50 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <p className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          Recent sessions
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-3 py-4 text-center text-xs text-muted-foreground">
            {q ? "No matching sessions" : "No sessions yet"}
          </p>
        ) : (
          <div className="space-y-1">
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => onSelect(c.id)}
                className={cn(
                  "group w-full rounded-lg border border-transparent px-3 py-2.5 text-left transition-all",
                  activeId === c.id
                    ? "border-primary/30 bg-primary/10"
                    : "hover:border-border/60 hover:bg-card/40"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{c.title}</p>
                    {c.condition && (
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{c.condition}</p>
                    )}
                  </div>
                  <button
                    onClick={(e) => handleDelete(c.id, e)}
                    className="opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground/50 hover:text-destructive" />
                  </button>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground/70">
                  <span>{c.messageCount} messages</span>
                  <span>{timeAgo(c.updatedAt)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-border/40 p-3">
        <div className="flex items-center gap-3 rounded-lg bg-card/40 p-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[image:var(--gradient-primary)] text-xs font-semibold text-primary-foreground">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="h-full w-full rounded-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{user?.name || "User"}</p>
            <p className="truncate text-[11px] text-muted-foreground">Research workspace</p>
          </div>
          <button
            onClick={() => { logout(); navigate({ to: "/signin" }); }}
            className="text-[10px] text-muted-foreground/60 hover:text-muted-foreground"
            title="Sign out"
          >
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}
