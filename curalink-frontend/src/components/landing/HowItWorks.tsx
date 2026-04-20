import { Brain, Database, FileSearch, Quote, Sparkles, Target } from "lucide-react";

const steps = [
  {
    icon: FileSearch,
    title: "Query",
    body: "Ask in natural language and add structured context — condition, intent, location.",
  },
  {
    icon: Database,
    title: "Retrieve",
    body: "Federated search across PubMed, OpenAlex, ClinicalTrials.gov and your uploaded reports.",
  },
  {
    icon: Target,
    title: "Rank",
    body: "Cross-encoder reranking weights recency, study quality, and relevance to your context.",
  },
  {
    icon: Brain,
    title: "Reason",
    body: "Section-aware synthesis structures findings into clinically meaningful chapters.",
  },
  {
    icon: Quote,
    title: "Cite",
    body: "Every statement is grounded with traceable, expandable source attribution.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="relative mx-auto max-w-7xl px-6 py-14 sm:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          The Curalink pipeline
        </p>
        <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          From question to cited evidence
        </h2>
        <p className="mt-4 text-base text-muted-foreground">
          A retrieval-augmented reasoning loop designed for the demands of clinical research.
        </p>
      </div>

      <div className="relative mt-16">
        <div className="absolute left-0 right-0 top-1/2 hidden h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-primary/30 to-transparent lg:block" />
        <div className="grid gap-4 lg:grid-cols-5">
          {steps.map((s, i) => (
            <div
              key={s.title}
              className="glass hover-lift group relative rounded-2xl p-6"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="absolute -top-3 right-4 rounded-md border border-border/60 bg-background/80 px-2 py-0.5 font-mono text-[10px] text-muted-foreground backdrop-blur">
                0{i + 1}
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[image:var(--gradient-primary)] shadow-[var(--shadow-elegant)] transition-transform group-hover:scale-110">
                <s.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="mt-4 font-display text-sm font-semibold text-foreground">
                {s.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        Conversation memory keeps disease context across follow-ups.
      </div>
    </section>
  );
}
