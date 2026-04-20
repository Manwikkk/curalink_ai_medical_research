import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

export function CTA() {
  return (
    <section className="relative mx-auto max-w-7xl px-6 py-24">
      <div className="glass-strong relative overflow-hidden rounded-3xl p-12 text-center sm:p-20">
        <div
          className="absolute inset-0 -z-10 opacity-50 animate-gradient-shift"
          style={{ background: "var(--gradient-mesh)" }}
        />
        <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Ready when your research is.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
          Open a session, upload a report, ask a question. Curalink turns scattered evidence into a
          structured, citation-backed answer.
        </p>
        <div className="mt-8 flex justify-center">
          <Button asChild variant="hero" size="xl">
            <Link to="/app">
              Open Curalink
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      <footer className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-border/40 pt-8 text-xs text-muted-foreground sm:flex-row">
        <Logo />
        <p className="font-display">© {new Date().getFullYear()} Curalink Research. For research use — not a substitute for clinical judgment.</p>
      </footer>
    </section>
  );
}
