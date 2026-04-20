import { createFileRoute } from "@tanstack/react-router";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Features } from "@/components/landing/Features";
import { Stats } from "@/components/landing/Stats";
import { Footer } from "@/components/landing/Footer";
import { MagneticCursor } from "@/components/landing/MagneticCursor";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Curalink — AI Medical Research Assistant" },
      {
        name: "description",
        content:
          "Curalink synthesizes peer-reviewed literature, clinical trials, and your patient context into structured, citation-backed medical research answers.",
      },
      { property: "og:title", content: "Curalink — AI Medical Research Assistant" },
      {
        property: "og:description",
        content:
          "Evidence-grade AI for clinicians and researchers. Publications, trials, and personalized RAG context — fully cited.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <>
      {/* Homepage-only: custom cursor */}
      <MagneticCursor />

      <main className="relative">
        <Hero />
        <HowItWorks />
        <Features />
        <Stats />
        <Footer />
      </main>
    </>
  );
}
