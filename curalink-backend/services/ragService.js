import fs from "fs";
import pdfParse from "pdf-parse";

// ── Constants ─────────────────────────────────────────────────────────────────
const CHUNK_CHAR_SIZE = 1800;   // ~450 tokens
const CHUNK_OVERLAP   = 400;    // ~100 token overlap
const BM25_K1 = 1.5;           // term frequency saturation
const BM25_B  = 0.75;          // length normalisation

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

// ── Sentence-Aware Chunking ───────────────────────────────────────────────────

/**
 * Split text into overlapping sentence-aware chunks.
 * Each chunk stores its text and pre-computed term frequencies for BM25.
 */
export function chunkText(text) {
  // Split on sentence boundaries first, then group into chunks
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
          termFreq: computeTermFreq(terms),   // stored for BM25
        });
      }
      // Overlap: carry last ~CHUNK_OVERLAP chars into next chunk
      buffer = buffer.length > CHUNK_OVERLAP ? buffer.slice(-CHUNK_OVERLAP) : "";
    }
  }

  return chunks;
}

// ── BM25 Retrieval ────────────────────────────────────────────────────────────

/**
 * Retrieve top-K most relevant chunks using Okapi BM25 scoring.
 * Returns { chunks: string[], score: number, ragUsed: boolean }
 */
export function retrieveRelevantChunks(chunks, query, topK = 5) {
  if (!chunks || chunks.length === 0) return { context: "", ragUsed: false, topScore: 0 };

  const queryTerms = tokenise(query);
  if (queryTerms.length === 0) return { context: "", ragUsed: false, topScore: 0 };

  // Compute IDF for each query term across the chunk collection
  const N = chunks.length;
  const idf = {};
  for (const term of queryTerms) {
    const df = chunks.filter((c) => {
      // Check termFreq map first, fall back to keyword list
      return (c.termFreq && c.termFreq[term]) || (c.keywords && c.keywords.includes(term));
    }).length;
    idf[term] = Math.log((N - df + 0.5) / (df + 0.5) + 1);
  }

  // Average chunk length for length-normalisation
  const avgLen = chunks.reduce((s, c) => s + c.text.length, 0) / N;

  // Score each chunk
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

  const top = scored
    .sort((a, b) => b._score - a._score)
    .slice(0, topK)
    .filter((c) => c._score > 0.1); // discard zero-relevance chunks

  if (top.length === 0) return { context: "", ragUsed: false, topScore: 0 };

  const context = top.map((c, i) => `[Excerpt ${i + 1}]\n${c.text}`).join("\n\n---\n\n");
  return { context, ragUsed: true, topScore: top[0]._score };
}

// ── Medical Insights ──────────────────────────────────────────────────────────

export function extractMedicalInsights(text) {
  const insights = [];
  // Mutations / biomarkers
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
    /\b(diagnosis|treatment|cancer|tumor|mutation|stage|therapy|pathology|biopsy|imaging|labs?|findings?|impression|conclusion|history|assessment)\b/i.test(s)
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
