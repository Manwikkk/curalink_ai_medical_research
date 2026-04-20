import { useState } from "react";
import { ChevronDown, ExternalLink, MapPin, Phone, Users } from "lucide-react";
import type { ClinicalTrial, TrialStatus } from "@/lib/types";
import { SourceBadgePill } from "@/components/SourceBadgePill";
import { cn } from "@/lib/utils";

const statusStyle: Record<TrialStatus, string> = {
  Recruiting: "bg-success/15 text-success border-success/30",
  "Active, not recruiting": "bg-info/15 text-info border-info/30",
  Completed: "bg-muted text-muted-foreground border-border/50",
  "Not yet recruiting": "bg-warning/15 text-warning border-warning/30",
  "Enrolling by invitation": "bg-accent/15 text-accent border-accent/30",
};

export function TrialCard({ trial, index }: { trial: ClinicalTrial; index: number }) {
  const [open, setOpen] = useState(index === 0);
  return (
    <article className="glass hover-lift rounded-xl p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
            statusStyle[trial.status],
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {trial.status}
        </span>
        {trial.phase && (
          <span className="rounded-full border border-border/50 bg-card/40 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            {trial.phase}
          </span>
        )}
        <SourceBadgePill source={trial.source} />
      </div>
      <h3 className="mt-3 text-[15px] font-semibold leading-snug text-foreground">
        {trial.title}
      </h3>
      <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
        <p className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" />
          {trial.location}
        </p>
        {trial.sponsor && (
          <p className="flex items-start gap-2">
            <Users className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" />
            Sponsor: {trial.sponsor}
          </p>
        )}
      </div>
      <div
        className={cn(
          "grid transition-all duration-300",
          open ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden space-y-3">
          <div className="rounded-lg border border-border/40 bg-card/30 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Eligibility
            </p>
            <p className="mt-1 text-xs leading-relaxed text-foreground/90">{trial.eligibility}</p>
          </div>
          {trial.contact && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Phone className="h-3.5 w-3.5 text-primary/70" />
              {trial.contact}
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <button
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          {open ? "Hide details" : "Show eligibility & contact"}
          <ChevronDown
            className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
          />
        </button>
        <button className="inline-flex items-center gap-1.5 rounded-md border border-border/50 bg-card/40 px-2.5 py-1 text-xs text-foreground transition-colors hover:border-primary/40 hover:text-primary">
          View on registry
          <ExternalLink className="h-3 w-3" />
        </button>
      </div>
    </article>
  );
}
