import { Link } from "@tanstack/react-router";
import { ArrowRight, Github, Mail, Twitter } from "lucide-react";
import { Logo } from "@/components/Logo";

const footerLinks = {
  Product: [
    { label: "How it works", href: "#how" },
    { label: "Capabilities", href: "#features" },
    { label: "Trust & sources", href: "#trust" },
    { label: "Open workspace", href: "/app", internal: true },
  ],
  Resources: [
    { label: "PubMed", href: "https://pubmed.ncbi.nlm.nih.gov", external: true },
    { label: "OpenAlex", href: "https://openalex.org", external: true },
    { label: "ClinicalTrials.gov", href: "https://clinicaltrials.gov", external: true },
  ],
  Legal: [
    { label: "Privacy policy", href: "#" },
    { label: "Terms of use", href: "#" },
    { label: "Research disclaimer", href: "#" },
  ],
};

export function Footer() {
  return (
    <footer className="relative border-t border-border/40 bg-background/60 backdrop-blur-xl">
      {/* Top glow line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="mx-auto max-w-7xl px-6 py-16">
        {/* Main grid */}
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          {/* Brand column */}
          <div className="space-y-5">
            <Logo />
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              AI-powered medical research assistant synthesising peer-reviewed evidence, clinical
              trials, and patient context — built for clinicians and researchers.
            </p>
            <div className="flex items-center gap-3">
              {[
                { icon: Twitter, href: "#", label: "Twitter" },
                { icon: Github, href: "#", label: "GitHub" },
                { icon: Mail, href: "mailto:hello@curalink.app", label: "Email" },
              ].map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/50 bg-card/40 text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([group, links]) => (
            <div key={group}>
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                {group}
              </p>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    {"internal" in link && link.internal ? (
                      <Link
                        to={link.href as "/app"}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <a
                        href={link.href}
                        target={"external" in link && link.external ? "_blank" : undefined}
                        rel={"external" in link && link.external ? "noopener noreferrer" : undefined}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-border/30 pt-8 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Curalink Research. For research use only — not a
            substitute for clinical judgment.
          </p>
          <Link
            to="/app"
            className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary transition-all hover:bg-primary/20"
          >
            Open workspace
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </footer>
  );
}
