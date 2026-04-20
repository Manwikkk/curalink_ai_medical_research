import { useState } from "react";
import { ChevronDown, ExternalLink, Quote } from "lucide-react";
import type { Publication } from "@/lib/types";
import { SourceBadgePill } from "@/components/SourceBadgePill";
import { cn } from "@/lib/utils";

export function PublicationCard({ pub, index }: { pub: Publication; index: number }) {
  const [open, setOpen] = useState(index === 0);
  return (
    <article
      className={cn(
        "glass hover-lift group rounded-xl p-5 transition-all",
        open && "border-primary/30",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <SourceBadgePill source={pub.source} />
            <span className="text-[11px] text-muted-foreground">{pub.year}</span>
            {pub.journal && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className="text-[11px] italic text-muted-foreground">{pub.journal}</span>
              </>
            )}
            {pub.citations !== undefined && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Quote className="h-3 w-3" />
                  {pub.citations.toLocaleString()} citations
                </span>
              </>
            )}
          </div>
          <h3 className="mt-2 text-[15px] font-semibold leading-snug text-foreground group-hover:text-primary">
            {pub.title}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {pub.authors.slice(0, 4).join(", ")}
            {pub.authors.length > 4 && ` +${pub.authors.length - 4}`}
          </p>
        </div>
      </div>
      <div
        className={cn(
          "grid transition-all duration-300",
          open ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <p className="text-sm leading-relaxed text-muted-foreground">{pub.abstract}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <button
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          {open ? "Collapse" : "Read abstract"}
          <ChevronDown
            className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
          />
        </button>
        <a
          href={pub.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border border-border/50 bg-card/40 px-2.5 py-1 text-xs text-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          Open source
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </article>
  );
}
