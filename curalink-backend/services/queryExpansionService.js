/**
 * Query expansion: combines disease + intent + query into optimised search strings
 * for each external API.
 */

// Common disease synonyms / related terms for better recall
const DISEASE_EXPANSIONS = {
  "lung cancer": ["non-small cell lung cancer", "NSCLC", "SCLC", "pulmonary carcinoma"],
  "nsclc": ["non-small cell lung cancer", "lung adenocarcinoma", "lung squamous cell"],
  "breast cancer": ["breast carcinoma", "HER2", "triple negative breast cancer", "TNBC"],
  "diabetes": ["type 2 diabetes", "T2DM", "insulin resistance", "glycemic control"],
  "alzheimer": ["Alzheimer's disease", "amyloid", "tau", "dementia", "neurodegeneration"],
  "parkinson": ["Parkinson's disease", "dopaminergic", "alpha-synuclein", "levodopa"],
  "heart disease": ["cardiovascular disease", "coronary artery disease", "heart failure", "CAD"],
  "covid": ["COVID-19", "SARS-CoV-2", "coronavirus", "long COVID"],
};

/**
 * Build an expanded query string for PubMed / OpenAlex full-text search.
 * @param {string} query - Raw user query
 * @param {string} condition - Structured condition field
 * @param {string} intent - Structured intent
 * @returns {{ pubmedQuery: string, openAlexQuery: string, trialsCondition: string }}
 */
export function expandQuery(query, condition = "", intent = "") {
  const rawCondition = condition || extractCondition(query);
  const rawIntent = intent || extractIntent(query);

  // Find synonym expansions
  const conditionLower = rawCondition.toLowerCase();
  let expansionTerms = [];
  for (const [key, synonyms] of Object.entries(DISEASE_EXPANSIONS)) {
    if (conditionLower.includes(key) || query.toLowerCase().includes(key)) {
      expansionTerms = synonyms.slice(0, 2); // Take top 2 synonyms
      break;
    }
  }

  // Build core query: condition + intent override + original query
  const parts = [];
  if (rawCondition) parts.push(rawCondition);
  if (rawIntent && !query.toLowerCase().includes(rawIntent.toLowerCase())) {
    parts.push(rawIntent);
  }
  // Add original query terms not already covered
  const queryTerms = query.split(/\s+/).filter((t) => t.length > 3);
  for (const term of queryTerms) {
    if (!parts.join(" ").toLowerCase().includes(term.toLowerCase())) {
      parts.push(term);
    }
  }

  const baseQuery = parts.join(" AND ");

  // PubMed: use AND logic for precision + MeSH-friendly
  const pubmedQuery = baseQuery
    .replace(/\s+AND\s+/g, " AND ")
    .trim();

  // OpenAlex: looser, use space-separated (it does semantic search)
  const openAlexQuery = [rawCondition, rawIntent, ...expansionTerms.slice(0, 1), query]
    .filter(Boolean)
    .join(" ");

  // ClinicalTrials: just the condition (it handles disease matching)
  const trialsCondition = rawCondition || query.slice(0, 100);

  return { pubmedQuery, openAlexQuery, trialsCondition };
}

/**
 * Heuristically extract a medical condition from a free-text query.
 */
function extractCondition(query) {
  const q = query.toLowerCase();

  // Ordered from specific to general
  const knownConditions = [
    "non-small cell lung cancer", "nsclc", "sclc", "lung cancer",
    "breast cancer", "colorectal cancer", "prostate cancer", "pancreatic cancer",
    "type 2 diabetes", "type 1 diabetes", "diabetes",
    "alzheimer's disease", "alzheimer", "parkinson's disease", "parkinson",
    "multiple sclerosis", "rheumatoid arthritis", "crohn's disease",
    "heart failure", "heart disease", "cardiovascular",
    "covid-19", "covid", "hiv", "tuberculosis",
    "depression", "anxiety", "schizophrenia",
    "stroke", "hypertension", "obesity",
  ];

  for (const cond of knownConditions) {
    if (q.includes(cond)) {
      return cond.charAt(0).toUpperCase() + cond.slice(1);
    }
  }

  // Fallback: first medical-sounding noun phrase
  const words = query.split(/\s+/);
  return words.slice(0, 3).join(" ");
}

function extractIntent(query) {
  const q = query.toLowerCase();
  if (q.includes("treatment") || q.includes("therapy") || q.includes("therap")) return "treatment";
  if (q.includes("clinical trial")) return "clinical trial";
  if (q.includes("diagnosis") || q.includes("diagnostic")) return "diagnosis";
  if (q.includes("biomarker") || q.includes("marker")) return "biomarker";
  if (q.includes("outcome") || q.includes("survival") || q.includes("prognosis")) return "prognosis";
  if (q.includes("drug") || q.includes("medication") || q.includes("inhibitor")) return "pharmacotherapy";
  if (q.includes("researcher") || q.includes("scientist")) return "researchers";
  if (q.includes("side effect") || q.includes("adverse")) return "adverse effects";
  return "";
}
