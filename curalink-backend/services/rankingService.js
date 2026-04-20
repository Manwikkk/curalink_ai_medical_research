/**
 * Intelligent ranking engine for publications and clinical trials.
 * Scores each result on:
 *  - Keyword relevance (TF-like match against query terms)
 *  - Recency (exponential decay, half-life ~3 years)
 *  - Source credibility (PubMed > OpenAlex)
 *  - Citation count (log-scaled)
 */

const CURRENT_YEAR = new Date().getFullYear();

// ── Publications ─────────────────────────────────────────────────────────────

/**
 * Score a single publication [0–1].
 */
function scorePublication(pub, queryTerms) {
  let score = 0;

  // 1. Keyword relevance (title + abstract) — most important factor
  const text = `${pub.title ?? ""} ${pub.abstract ?? ""}`.toLowerCase();
  const matchCount = queryTerms.reduce(
    (acc, term) => acc + (text.includes(term) ? 1 : 0),
    0
  );
  score += (matchCount / Math.max(queryTerms.length, 1)) * 0.55;

  // 2. Recency — half-life decay of 3 years
  if (pub.year > 0) {
    const age = Math.max(0, CURRENT_YEAR - pub.year);
    score += Math.exp(-0.231 * age) * 0.20;
  }

  // 3. Source credibility
  const credibility = { PubMed: 0.10, OpenAlex: 0.07 };
  score += credibility[pub.source] || 0.04;

  // 4. Citation count (log-scaled, capped at 0.10)
  if (pub.citations > 0) {
    score += Math.min(Math.log10(pub.citations + 1) / 5, 0.10);
  }

  // 5. Bonus: title keyword density
  const titleText = (pub.title ?? "").toLowerCase();
  const titleMatches = queryTerms.filter((t) => titleText.includes(t)).length;
  score += (titleMatches / Math.max(queryTerms.length, 1)) * 0.15;

  return Math.min(score, 1);
}

/**
 * Rank and deduplicate publications, return top N.
 * @param {Publication[]} pubs
 * @param {string} query
 * @param {number} topN
 * @returns {RankedPublication[]}
 */
export function rankPublications(pubs, query, topN = 6) {
  const queryTerms = extractTerms(query);

  // Deduplicate by title similarity
  const seen = new Set();
  const unique = pubs.filter((p) => {
    if (!p.title) return false; // skip publications without a title
    const key = normalizeTitle(p.title);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Score all candidates
  const scored = unique.map((p) => ({
    ...p,
    _score: scorePublication(p, queryTerms),
    _titleMatches: queryTerms.filter((t) => (p.title ?? "").toLowerCase().includes(t)).length,
  }));

  // ── Relevance gate ───────────────────────────────────────────────────────
  // Remove publications with NO title keyword match AND overall score < 0.30.
  // This prevents highly-cited but topically-unrelated papers from dominating.
  const relevant = scored.filter(
    (p) => p._titleMatches > 0 || p._score >= 0.30
  );

  // Fall back to all scored items if the gate is too aggressive
  const candidates = relevant.length >= Math.min(topN, 3) ? relevant : scored;

  return candidates
    .sort((a, b) => b._score - a._score)
    .slice(0, topN)
    .map(({ _score, _titleMatches, ...p }) => p); // strip internal fields
}

// ── Clinical Trials ──────────────────────────────────────────────────────────

const STATUS_PRIORITY = {
  Recruiting: 4,
  "Not yet recruiting": 3,
  "Active, not recruiting": 2,
  "Enrolling by invitation": 1,
  Completed: 0,
};

function scoreTrial(trial, queryTerms) {
  let score = 0;

  // 1. Status priority
  const statusScore = STATUS_PRIORITY[trial.status] ?? 0;
  score += (statusScore / 4) * 0.35;

  // 2. Keyword relevance (title + eligibility)
  const text = `${trial.title} ${trial.eligibility}`.toLowerCase();
  const matchCount = queryTerms.reduce(
    (acc, t) => acc + (text.includes(t) ? 1 : 0),
    0
  );
  score += (matchCount / Math.max(queryTerms.length, 1)) * 0.40;

  // 3. Phase bonus
  if (trial.phase?.includes("3") || trial.phase?.includes("4")) score += 0.15;
  else if (trial.phase?.includes("2")) score += 0.07;

  // 4. Recency
  if (trial.startDate) {
    const year = parseInt(trial.startDate.split("-")[0] || "0");
    const age = Math.max(0, CURRENT_YEAR - year);
    score += Math.exp(-0.231 * age) * 0.10;
  }

  return Math.min(score, 1);
}

/**
 * Rank and deduplicate trials, return top N.
 */
export function rankTrials(trials, query, topN = 4) {
  const queryTerms = extractTerms(query);

  const seen = new Set();
  const unique = trials.filter((t) => {
    const key = normalizeTitle(t.title);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique
    .map((t) => ({ ...t, _score: scoreTrial(t, queryTerms) }))
    .sort((a, b) => b._score - a._score)
    .slice(0, topN)
    .map(({ _score, ...t }) => t);
}

// ── Sources (for citation section) ──────────────────────────────────────────

/**
 * Convert top publications to Source objects for the answer section.
 */
export function publicationsToSources(publications) {
  return publications.slice(0, 4).map((p) => ({
    id: p.id,
    title: p.title,
    authors: p.authors,
    year: p.year,
    platform: p.source,
    url: p.url,
    snippet: p.abstract?.slice(0, 200) + "…",
  }));
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractTerms(query) {
  const stopwords = new Set([
    "the", "a", "an", "and", "or", "of", "for", "in", "on", "is", "are",
    "with", "without", "to", "from", "at", "by", "about", "what", "how",
    "can", "i", "my", "me", "latest", "recent", "new", "best", "study",
  ]);
  return query
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !stopwords.has(t));
}

function normalizeTitle(title) {
  return title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 60);
}
