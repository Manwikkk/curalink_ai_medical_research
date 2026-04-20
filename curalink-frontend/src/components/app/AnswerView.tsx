import { useState } from "react";
import {
  BookOpen,
  BookOpenCheck,
  FlaskConical,
  Quote,
  Search as SearchIcon,
  Sparkles,
  Stethoscope,
  User,
} from "lucide-react";
import type { AnswerSection } from "@/lib/types";
import { PublicationCard } from "./PublicationCard";
import { TrialCard } from "./TrialCard";
import { SourceCard } from "./SourceCard";
import { cn } from "@/lib/utils";

type Tab = "overview" | "publications" | "trials" | "sources";
type SourceFilter = "all" | "PubMed" | "OpenAlex";
type TrialStatusFilter = "all" | "Recruiting" | "Active" | "Phase 3";

export function AnswerView({ answer }: { answer: AnswerSection }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [pubSort, setPubSort] = useState<"relevance" | "recency">("relevance");
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [trialStatusFilter, setTrialStatusFilter] = useState<TrialStatusFilter>("all");

  // Guard: don't show personalizedInsights if it's literally the string "null" or empty
  const personalizedInsights =
    answer.personalizedInsights &&
    answer.personalizedInsights !== "null" &&
    answer.personalizedInsights.trim().length > 0
      ? answer.personalizedInsights
      : null;

  const tabs: {
    id: Tab;
    label: string;
    count?: number;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: "overview", label: "Overview", icon: Sparkles },
    {
      id: "publications",
      label: "Publications",
      count: answer.publications?.length ?? 0,
      icon: BookOpen,
    },
    {
      id: "trials",
      label: "Clinical trials",
      count: answer.trials?.length ?? 0,
      icon: FlaskConical,
    },
    {
      id: "sources",
      label: "Sources",
      count: answer.sources?.length ?? 0,
      icon: Quote,
    },
  ];

  // ── Publications: filter by source + search + sort ────────────────────────
  const pubs = [...(answer.publications || [])]
    .filter((p) => {
      const titleMatch = (p.title ?? "")
        .toLowerCase()
        .includes(search.toLowerCase());
      const sourceMatch =
        sourceFilter === "all" ||
        (p.source ?? p.platform ?? "") === sourceFilter;
      return titleMatch && sourceMatch;
    })
    .sort((a, b) =>
      pubSort === "recency"
        ? (b.year ?? 0) - (a.year ?? 0)
        : (b.citations ?? 0) - (a.citations ?? 0)
    );

  // ── Trials: filter by status/phase ────────────────────────────────────────
  const trials = (answer.trials || []).filter((t) => {
    if (trialStatusFilter === "all") return true;
    if (trialStatusFilter === "Phase 3")
      return (t.phase ?? "").includes("3") || (t.phase ?? "").includes("4");
    if (trialStatusFilter === "Active")
      return (
        t.status === "Active, not recruiting" ||
        (t.status ?? "").toLowerCase().includes("active")
      );
    return (t.status ?? "").toLowerCase().includes(trialStatusFilter.toLowerCase());
  });

  const pubSources: SourceFilter[] = ["all", "PubMed", "OpenAlex"];
  const trialStatuses: TrialStatusFilter[] = [
    "all",
    "Recruiting",
    "Active",
    "Phase 3",
  ];

  return (
    <div className="animate-fade-up">
      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div className="mb-4 flex items-center gap-2 overflow-x-auto border-b border-border/40 pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-all",
              tab === t.id
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-card/40 hover:text-foreground"
            )}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
            {t.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 text-[10px] font-medium",
                  tab === t.id
                    ? "bg-primary/20 text-primary"
                    : "bg-card/60 text-muted-foreground"
                )}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Overview ──────────────────────────────────────────────────────── */}
      {tab === "overview" && (
        <div className="grid gap-4">
          {/* RAG Document Context Banner */}
          {answer.ragUsed === true && (
            <div className="flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/8 px-4 py-3">
              <BookOpenCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-xs font-semibold text-primary">Using your uploaded report</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {answer.ragChunksFound
                    ? `${answer.ragChunksFound} relevant excerpt${answer.ragChunksFound !== 1 ? "s" : ""} retrieved — personalised insights below reflect your document.`
                    : "Relevant excerpts retrieved from your document and factored into the response."}
                </p>
              </div>
            </div>
          )}

          <Section
            icon={Stethoscope}
            label="Condition overview"
            body={answer.conditionOverview}
          />
          {personalizedInsights && (
            <Section
              icon={User}
              label="Personalized insights"
              accent
              body={personalizedInsights}
            />
          )}
          <Section
            icon={Sparkles}
            label="Research insights"
            body={answer.researchInsights}
          />
          {/* Top cards — only render if data exists */}
          {((answer.publications?.length ?? 0) > 0 ||
            (answer.trials?.length ?? 0) > 0) && (
            <div className="grid gap-4 md:grid-cols-2">
              {(answer.publications?.length ?? 0) > 0 && (
                <MiniBlock
                  icon={BookOpen}
                  label="Top publication"
                  title={answer.publications[0]?.title ?? "Unnamed publication"}
                  meta={`${answer.publications[0]?.journal ?? answer.publications[0]?.source ?? ""} · ${answer.publications[0]?.year ?? ""}`}
                  onClick={() => setTab("publications")}
                />
              )}
              {(answer.trials?.length ?? 0) > 0 && (
                <MiniBlock
                  icon={FlaskConical}
                  label="Highlighted trial"
                  title={answer.trials[0]?.title ?? "Unnamed trial"}
                  meta={`${answer.trials[0]?.status ?? ""} · Phase ${answer.trials[0]?.phase ?? "?"}`}
                  onClick={() => setTab("trials")}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Publications ──────────────────────────────────────────────────── */}
      {tab === "publications" && (
        <div className="space-y-4">
          {/* Controls row */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search within results"
                className="h-9 w-full rounded-lg border border-border/50 bg-card/40 pl-9 pr-3 text-sm placeholder:text-muted-foreground/70 focus:border-primary/50 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              {/* Source filter chips — WIRED */}
              {pubSources.map((src) => (
                <FilterChip
                  key={src}
                  active={sourceFilter === src}
                  onClick={() => setSourceFilter(src)}
                >
                  {src === "all" ? "All sources" : src}
                </FilterChip>
              ))}
              <select
                value={pubSort}
                onChange={(e) =>
                  setPubSort(e.target.value as "relevance" | "recency")
                }
                className="h-9 rounded-lg border border-border/50 bg-card/40 px-3 text-sm text-foreground focus:border-primary/50 focus:outline-none"
              >
                <option value="relevance">Most cited</option>
                <option value="recency">Most recent</option>
              </select>
            </div>
          </div>

          {/* Results */}
          {pubs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No publications match the current filters.
            </p>
          ) : (
            <div className="grid gap-3">
              {pubs.map((p, i) => (
                <PublicationCard key={p.id} pub={p} index={i} />
              ))}
            </div>
          )}

          {/* Active filter summary */}
          {sourceFilter !== "all" && (
            <p className="text-center text-xs text-muted-foreground">
              Showing {pubs.length} result{pubs.length !== 1 ? "s" : ""} from{" "}
              {sourceFilter} ·{" "}
              <button
                type="button"
                className="text-primary underline-offset-2 hover:underline"
                onClick={() => setSourceFilter("all")}
              >
                clear filter
              </button>
            </p>
          )}
        </div>
      )}

      {/* ── Clinical Trials ───────────────────────────────────────────────── */}
      {tab === "trials" && (
        <div className="space-y-4">
          {/* Status filter chips — WIRED */}
          <div className="flex flex-wrap items-center gap-2">
            {trialStatuses.map((s) => (
              <FilterChip
                key={s}
                active={trialStatusFilter === s}
                onClick={() => setTrialStatusFilter(s)}
              >
                {s === "all" ? "All statuses" : s}
              </FilterChip>
            ))}
          </div>

          {/* Results */}
          {trials.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No trials match the current filter.{" "}
              <button
                type="button"
                className="text-primary underline-offset-2 hover:underline"
                onClick={() => setTrialStatusFilter("all")}
              >
                Show all
              </button>
            </p>
          ) : (
            <div className="grid gap-3">
              {trials.map((t, i) => (
                <TrialCard key={t.id} trial={t} index={i} />
              ))}
            </div>
          )}

          {/* Active filter summary */}
          {trialStatusFilter !== "all" && (
            <p className="text-center text-xs text-muted-foreground">
              Showing {trials.length} trial{trials.length !== 1 ? "s" : ""} ·{" "}
              <button
                type="button"
                className="text-primary underline-offset-2 hover:underline"
                onClick={() => setTrialStatusFilter("all")}
              >
                clear filter
              </button>
            </p>
          )}
        </div>
      )}

      {/* ── Sources ───────────────────────────────────────────────────────── */}
      {tab === "sources" && (
        <div className="grid gap-3">
          {(answer.sources || []).map((s, i) => (
            <SourceCard key={s.id} source={s} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Section({
  icon: Icon,
  label,
  body,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  body: string;
  accent?: boolean;
}) {
  if (!body || body === "null") return null;
  return (
    <section
      className={cn(
        "glass rounded-2xl p-5",
        accent && "border-primary/30 bg-primary/5"
      )}
    >
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            accent
              ? "bg-primary/15 text-primary"
              : "border border-border/50 bg-card/60 text-primary"
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="font-display text-sm font-semibold tracking-tight text-foreground">
          {label}
        </h3>
        {accent && (
          <span className="ml-auto rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
            From your report
          </span>
        )}
      </div>
      <p className="mt-3 text-[14px] leading-relaxed text-foreground/90">{body}</p>
    </section>
  );
}

function MiniBlock({
  icon: Icon,
  label,
  title,
  meta,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  title: string;
  meta: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="glass hover-lift rounded-xl p-4 text-left transition-all hover:border-primary/40"
    >
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-primary" />
        {label}
      </div>
      <p className="mt-2 line-clamp-2 text-sm font-medium leading-snug text-foreground">
        {title}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">{meta}</p>
    </button>
  );
}

function FilterChip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs transition-all",
        active
          ? "border-primary/40 bg-primary/15 text-primary"
          : "border-border/50 bg-card/40 text-muted-foreground hover:border-primary/30 hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
