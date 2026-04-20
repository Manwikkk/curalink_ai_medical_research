import { ExternalLink } from "lucide-react";
import type { Source } from "@/lib/types";
import { SourceBadgePill } from "@/components/SourceBadgePill";

export function SourceCard({ source, index }: { source: Source; index: number }) {
  return (
    <article className="glass hover-lift group flex gap-4 rounded-xl p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-card/60 font-mono text-xs font-semibold text-muted-foreground">
        {String(index + 1).padStart(2, "0")}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <SourceBadgePill source={source.platform} />
          <span className="text-[11px] text-muted-foreground">{source.year}</span>
        </div>
        <h4 className="mt-1.5 text-sm font-semibold leading-snug text-foreground group-hover:text-primary">
          {source.title}
        </h4>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {source.authors.slice(0, 3).join(", ")}
          {source.authors.length > 3 && " et al."}
        </p>
        <blockquote className="mt-2 rounded-md border-l-2 border-primary/40 bg-card/30 px-3 py-2 text-xs italic leading-relaxed text-muted-foreground">
          “{source.snippet}”
        </blockquote>
      </div>
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="self-start rounded-md border border-border/50 bg-card/40 p-1.5 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
        aria-label="Open source"
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </article>
  );
}
