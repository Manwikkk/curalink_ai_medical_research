import type { SourceBadge } from "@/lib/types";
import { cn } from "@/lib/utils";

const styles: Record<SourceBadge, string> = {
  PubMed: "bg-info/15 text-info border-info/30",
  OpenAlex: "bg-accent/15 text-accent border-accent/30",
  "ClinicalTrials.gov": "bg-primary/15 text-primary border-primary/30",
  NIH: "bg-success/15 text-success border-success/30",
  WHO: "bg-warning/15 text-warning border-warning/30",
};

export function SourceBadgePill({
  source,
  className,
}: {
  source: SourceBadge;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide backdrop-blur",
        styles[source],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {source}
    </span>
  );
}
