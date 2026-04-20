import { Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { AnimatedBackdrop } from "@/components/AnimatedBackdrop";

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      <AnimatedBackdrop />

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Logo />
        <nav className="hidden items-center gap-8 md:flex">
          <a href="#how" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            How it works
          </a>
          <a href="#features" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Capabilities
          </a>
          <a href="#trust" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Trust & sources
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link to="/signin">Sign in</Link>
          </Button>
          <Button asChild variant="hero" size="sm">
            <Link to="/app">
              Open Curalink
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      {/* ── Hero body ────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-6 pt-10 pb-20 sm:pt-16 sm:pb-28">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="animate-fade-up font-display font-bold tracking-tight text-foreground text-[clamp(2.5rem,8vw,5.5rem)] leading-[1.1]">
            Curalink
          </h1>

          <p className="animate-fade-up delay-100 mx-auto mt-4 font-display text-base font-medium tracking-tight text-foreground/80 sm:text-xl">
            Evidence-grade answers for{" "}
            <span className="gradient-text">modern medical research</span>
          </p>

          <p className="animate-fade-up delay-200 mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Curalink synthesizes peer-reviewed publications, active clinical trials, and your own
            patient context into structured, citation-backed insights — built for clinicians,
            researchers, and translational teams.
          </p>

          {/* ── Single CTA ──────────────────────────────────────────────── */}
          <div className="animate-fade-up delay-300 mt-8 flex justify-center">
            <Button asChild variant="hero" size="xl" className="magnetic">
              <Link to="/app">
                Start a research session
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {/* ── Trust strip ─────────────────────────────────────────────── */}
          <div className="animate-fade-up delay-400 mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-success" />
              HIPAA-aware design
            </span>
            <span className="opacity-40">•</span>
            <span>Sources from PubMed, OpenAlex, ClinicalTrials.gov</span>
            <span className="opacity-40">•</span>
            <span>Every claim is cited</span>
          </div>
        </div>
      </div>
    </section>
  );
}
