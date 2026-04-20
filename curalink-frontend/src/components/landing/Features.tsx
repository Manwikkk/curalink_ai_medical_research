import { BookOpen, FlaskConical, FileUp, MessageSquare } from "lucide-react";

const features = [
  {
    icon: BookOpen,
    title: "Publications",
    body: "Live access to peer-reviewed literature from PubMed and OpenAlex with deep filters for relevance, recency, and source.",
    points: ["Citation-aware ranking", "Expandable abstracts", "Direct DOI links"],
  },
  {
    icon: FlaskConical,
    title: "Clinical trials",
    body: "Search ClinicalTrials.gov for recruiting and active studies with eligibility, geography, and contact details surfaced inline.",
    points: ["Status pills & phase", "Eligibility highlights", "Site & sponsor info"],
  },
  {
    icon: FileUp,
    title: "Personalized context",
    body: "Upload pathology, imaging, or discharge reports. Curalink extracts structured signals to personalize every retrieval.",
    points: ["PDF & image OCR", "Private RAG context", "Insight previews"],
  },
  {
    icon: MessageSquare,
    title: "Conversation memory",
    body: "Continue follow-up questions across sessions. Disease, intent, and uploaded context persist for coherent reasoning.",
    points: ["Disease-aware threading", "Saved sessions", "Audit-ready transcripts"],
  },
];

export function Features() {
  return (
    <section id="features" className="relative mx-auto max-w-7xl px-6 py-14 sm:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Built for clinical depth
        </p>
        <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Everything a research workflow needs
        </h2>
      </div>

      <div className="mt-14 grid gap-5 md:grid-cols-2">
        {features.map((f) => (
          <div
            key={f.title}
            className="glass hover-lift group relative overflow-hidden rounded-2xl p-7"
          >
            <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />
            <div className="relative">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 font-display text-lg font-semibold tracking-tight text-foreground">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              <ul className="mt-4 grid gap-1.5">
                {f.points.map((p) => (
                  <li
                    key={p}
                    className="flex items-center gap-2 text-xs text-muted-foreground/90"
                  >
                    <span className="h-1 w-1 rounded-full bg-primary" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
