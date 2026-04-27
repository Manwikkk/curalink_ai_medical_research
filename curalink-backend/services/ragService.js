import pdfParse from "pdf-parse";

// ── Constants ─────────────────────────────────────────────────────────────────
const CHUNK_CHAR_SIZE = 1800;   // ~450 tokens
const CHUNK_OVERLAP   = 400;    // ~100 token overlap
const BM25_K1 = 1.5;           // term frequency saturation
const BM25_B  = 0.75;          // length normalisation
const BM25_THRESHOLD = 0.05;   // lowered from 0.1 — catches more relevant chunks

// ── Text Extraction ───────────────────────────────────────────────────────────

/**
 * Extract full text from a PDF memory buffer.
 */
export async function extractTextFromPDF(buffer) {
  try {
    if (!buffer || buffer.length === 0) throw new Error("PDF file is empty");

    const data = await pdfParse(buffer, { max: 0 });
    const text = (data.text || "").replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

    if (text.length < 30) {
      throw new Error(
        "PDF appears to be scanned/image-only — no extractable text found. Please upload a text-based PDF."
      );
    }
    return text;
  } catch (err) {
    const msg = err.message || "PDF extraction failed";
    throw new Error(msg.includes("assert") ? "PDF parsing error — try a different file." : msg);
  }
}

// ── Document Classification ───────────────────────────────────────────────────

/**
 * Classify a document based on its text content.
 * Returns: "patient_report" | "research_paper" | "general_medical" | "non_medical"
 */
export function classifyDocument(text) {
  const sample = text.slice(0, 5000).toLowerCase();

  // Non-medical check first — if no medical vocabulary at all
  const medicalTerms = [
    "patient", "diagnosis", "treatment", "therapy", "disease", "clinical",
    "medical", "hospital", "doctor", "physician", "symptom", "medication",
    "drug", "dose", "surgery", "pathology", "cancer", "infection", "health",
    "study", "trial", "abstract", "results", "conclusion", "methods",
    "mutation", "biomarker", "gene", "protein", "cell", "tissue",
  ];
  const medicalHits = medicalTerms.filter(t => sample.includes(t)).length;
  if (medicalHits < 3) return "non_medical";

  // Patient report signals
  const patientSignals = [
    "patient name", "date of birth", "dob", "mrn", "medical record",
    "chief complaint", "history of present illness", "hpi",
    "physical examination", "assessment and plan", "impression:",
    "clinical history", "presenting complaint", "past medical history",
    "attending physician", "discharge summary", "admission date",
    "vital signs", "lab results", "pathology report", "radiology report",
    "patient:", "name:", "age:", "sex:", "gender:",
  ];
  const patientHits = patientSignals.filter(s => sample.includes(s)).length;

  // Research paper signals
  const researchSignals = [
    "abstract", "introduction", "methods", "methodology", "results",
    "discussion", "conclusion", "references", "bibliography",
    "doi:", "doi.org", "et al.", "et al,", "p-value", "p value",
    "confidence interval", "statistical", "cohort", "randomized",
    "randomised", "placebo", "double-blind", "meta-analysis",
    "systematic review", "sample size", "figure 1", "table 1",
    "keywords:", "funding:", "acknowledgements", "corresponding author",
  ];
  const researchHits = researchSignals.filter(s => sample.includes(s)).length;

  // Decision logic
  if (patientHits >= 3) return "patient_report";
  if (researchHits >= 4) return "research_paper";
  if (patientHits >= 1 && medicalHits >= 8) return "patient_report";
  if (researchHits >= 2 && medicalHits >= 5) return "research_paper";
  if (medicalHits >= 3) return "general_medical";

  return "non_medical";
}

// ── Sentence-Aware Chunking ───────────────────────────────────────────────────

/**
 * Split text into overlapping sentence-aware chunks.
 * Each chunk stores its text and pre-computed term frequencies for BM25.
 */
export function chunkText(text) {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);

  const chunks = [];
  let buffer = "";
  let idx = 0;

  for (let i = 0; i < sentences.length; i++) {
    buffer += (buffer ? " " : "") + sentences[i];

    if (buffer.length >= CHUNK_CHAR_SIZE || i === sentences.length - 1) {
      const text = buffer.trim();
      if (text.length > 50) {
        const terms = tokenise(text);
        chunks.push({
          text,
          index: idx++,
          keywords: [...new Set(terms)].slice(0, 80),
          termFreq: computeTermFreq(terms),
        });
      }
      buffer = buffer.length > CHUNK_OVERLAP ? buffer.slice(-CHUNK_OVERLAP) : "";
    }
  }

  return chunks;
}

// ── BM25 Retrieval ────────────────────────────────────────────────────────────

/**
 * Retrieve top-K most relevant chunks using Okapi BM25 scoring.
 * Falls back to first 3 chunks if no chunk exceeds threshold (broad context).
 */
export function retrieveRelevantChunks(chunks, query, topK = 6) {
  if (!chunks || chunks.length === 0) return { context: "", ragUsed: false, topScore: 0 };

  const queryTerms = tokenise(query);
  if (queryTerms.length === 0) return { context: "", ragUsed: false, topScore: 0 };

  const N = chunks.length;
  const idf = {};
  for (const term of queryTerms) {
    const df = chunks.filter((c) => {
      return (c.termFreq && c.termFreq[term]) || (c.keywords && c.keywords.includes(term));
    }).length;
    idf[term] = Math.log((N - df + 0.5) / (df + 0.5) + 1);
  }

  const avgLen = chunks.reduce((s, c) => s + c.text.length, 0) / N;

  const scored = chunks.map((chunk) => {
    const tf = chunk.termFreq || {};
    const docLen = chunk.text.length;
    let score = 0;

    for (const term of queryTerms) {
      const freq = tf[term] || (chunk.text.toLowerCase().includes(term) ? 1 : 0);
      const numerator   = freq * (BM25_K1 + 1);
      const denominator = freq + BM25_K1 * (1 - BM25_B + BM25_B * (docLen / avgLen));
      score += (idf[term] || 0) * (numerator / denominator);
    }

    return { ...chunk, _score: score };
  });

  const sorted = scored.sort((a, b) => b._score - a._score);
  const top = sorted.slice(0, topK).filter((c) => c._score > BM25_THRESHOLD);

  // ── Fallback: if BM25 finds nothing relevant, use first 3 chunks as broad context
  if (top.length === 0) {
    const fallback = chunks.slice(0, 3);
    const context = fallback
      .map((c, i) => `[Document Section ${i + 1}]\n${c.text}`)
      .join("\n\n---\n\n");
    return { context, ragUsed: true, topScore: 0, isFallback: true };
  }

  const context = top.map((c, i) => `[Excerpt ${i + 1}]\n${c.text}`).join("\n\n---\n\n");
  return { context, ragUsed: true, topScore: top[0]._score, isFallback: false };
}

// ── Extract keywords for research paper PubMed search ─────────────────────────

/**
 * Extract top N meaningful keywords from document text for related-paper search.
 */
export function extractDocumentKeywords(text, topN = 10) {
  const sample = text.slice(0, 8000);
  const terms = tokenise(sample);
  const freq = computeTermFreq(terms);

  // Sort by frequency, filter short/common terms
  return Object.entries(freq)
    .filter(([term]) => term.length > 4)
    .sort(([, a], [, b]) => b - a)
    .slice(0, topN)
    .map(([term]) => term);
}

// ── Medical Insights ──────────────────────────────────────────────────────────

export function extractMedicalInsights(text) {
  const insights = [];
  const mutations = text.match(
    /\b(KRAS|EGFR|ALK|ROS1|BRAF|HER2|PIK3CA|TP53|BRCA[12]?|NTRK|MET|RET)\s*(G\d+[A-Z]|exon\s*\d+|mutation|amplification|fusion|positive|negative|wild.?type)?/gi
  ) || [];
  for (const m of [...new Set(mutations)].slice(0, 4)) insights.push(m.trim());

  const pdl1 = text.match(/PD-L1\s+(?:TPS|CPS)?\s*\d+%?/i)?.[0];
  if (pdl1) insights.push(pdl1.trim());

  const stage = text.match(/(?:stage|T\dN\dM\d)\s*[IViv1-4]+[A-Ca-c]?/i)?.[0];
  if (stage) insights.push(stage.trim());

  const histology = text.match(
    /(?:adenocarcinoma|squamous cell|small cell|ductal|lobular|sarcoma|lymphoma|carcinoma)/i
  )?.[0];
  if (histology) insights.push(histology.trim());

  const drugs = text.match(
    /\b(osimertinib|pembrolizumab|nivolumab|atezolizumab|bevacizumab|trastuzumab|docetaxel|paclitaxel|cisplatin|carboplatin|sunitinib|imatinib|lorlatinib|semaglutide|orforglipron)\b/gi
  ) || [];
  for (const d of [...new Set(drugs)].slice(0, 3)) insights.push(d.trim());

  const ecog = text.match(/ECOG\s*(?:PS\s*)?\d/i)?.[0];
  if (ecog) insights.push(ecog.trim());

  return [...new Set(insights)].filter(Boolean).slice(0, 8);
}

export function generateQuickSummary(text) {
  const excerpt = text.slice(0, 2500).replace(/\s+/g, " ").trim();
  const sentences = excerpt.split(/[.!?]+/).filter((s) => s.trim().length > 20);
  const medSentences = sentences.filter((s) =>
    /\b(diagnosis|treatment|cancer|tumor|mutation|stage|therapy|pathology|biopsy|imaging|labs?|findings?|impression|conclusion|history|assessment|abstract|methods|results)\b/i.test(s)
  );
  const selected = (medSentences.length > 0 ? medSentences : sentences).slice(0, 3);
  return selected.join(". ").trim() + "." || excerpt.slice(0, 300);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STOPWORDS = new Set([
  "the","a","an","and","or","of","for","in","on","is","are","was","were","be",
  "been","with","without","to","from","at","by","about","as","this","that",
  "these","those","it","its","we","our","they","their","patient","study",
  "results","data","analysis","clinical","medical","health","based","shown",
  "found","also","may","can","such","not","but","all","have","had","has",
]);

function tokenise(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s\-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

function computeTermFreq(terms) {
  const freq = {};
  for (const t of terms) freq[t] = (freq[t] || 0) + 1;
  return freq;
}
