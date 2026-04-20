import Groq from "groq-sdk";
import axios from "axios";

const groqClient = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

const GROQ_MODEL  = process.env.GROQ_MODEL    || "llama-3.3-70b-versatile";
const OLLAMA_URL  = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL  || "llama3.2";

export async function chat(messages, maxTokens = 2048) {
  return groqClient ? chatGroq(messages, maxTokens) : chatOllama(messages, maxTokens);
}

async function chatGroq(messages, maxTokens) {
  try {
    const completion = await groqClient.chat.completions.create({
      model: GROQ_MODEL,
      messages,
      max_tokens: maxTokens,
      temperature: 0.25,
    });
    return completion.choices[0]?.message?.content || "";
  } catch (err) {
    console.error("[Groq error, falling back to Ollama]", err.message);
    return chatOllama(messages, maxTokens);
  }
}

async function chatOllama(messages, maxTokens) {
  try {
    const res = await axios.post(
      `${OLLAMA_URL}/api/chat`,
      { model: OLLAMA_MODEL, messages, stream: false, options: { num_predict: maxTokens, temperature: 0.25 } },
      { timeout: 120000 }
    );
    return res.data?.message?.content || "";
  } catch (err) {
    console.error("[Ollama error]", err.message);
    throw new Error("LLM unavailable. Please set GROQ_API_KEY or ensure Ollama is running.");
  }
}

// ── System Prompt ─────────────────────────────────────────────────────────────

export function buildSystemPrompt(userProfile = {}, hasReportContext = false) {
  const profileCtx = userProfile.medicalProfile?.condition
    ? `\nUser's clinical profile: specialty="${userProfile.medicalProfile.specialty || "not set"}", condition of interest="${userProfile.medicalProfile.condition}", location="${userProfile.medicalProfile.location || "not set"}".`
    : "";

  const reportRule = hasReportContext
    ? `\nA patient report has been uploaded. You MUST begin the personalizedInsights field with "Based on your uploaded report, " and then connect the document findings directly to the query. This is mandatory when report context is provided.`
    : "";

  return `You are Curalink, an AI medical research assistant for clinicians and scientists.${profileCtx}${reportRule}

Your job is to synthesise peer-reviewed publications, clinical trial data, and — when provided — an uploaded patient report into a structured, evidence-based JSON response.

CRITICAL RULES:
1. You do NOT hallucinate. You do NOT invent studies, statistics, drug names, or trial results not present in the provided context.
2. You reason ONLY from the context provided in this message.
3. If fewer than 3 publications are found, acknowledge limited evidence explicitly.

STRICT OUTPUT FORMAT — return ONLY this raw JSON object (no markdown, no text outside the braces):
{
  "conditionOverview": "2-4 sentences: factual, evidence-based overview of the condition or treatment queried.",
  "personalizedInsights": null,
  "researchInsights": "3-5 sentences synthesising the key findings from the retrieved publications."
}

RULES FOR personalizedInsights:
- MUST be JSON null (not the string "null") when no patient report is provided.
- When a report IS provided: MUST start with "Based on your uploaded report, " and connect document findings to the query in 2-4 sentences.
- NEVER write the word null as a string. Use actual JSON null.

RULES FOR researchInsights:
- Ground every claim in the provided publications.
- Use precise medical terminology.
- Be concise: 3-5 sentences maximum.`;
}

// ── Answer Generator ──────────────────────────────────────────────────────────

export async function generateAnswer({
  query,
  condition,
  publications,
  trials,
  conversationHistory,
  reportContext,
  userProfile,
}) {
  const hasReportContext = !!reportContext && reportContext.length > 20;
  const systemPrompt = buildSystemPrompt(userProfile, hasReportContext);

  const pubsBrief = publications.slice(0, 8).map((p, i) =>
    `[${i + 1}] "${p.title}" — Source: ${p.source || p.platform}, Year: ${p.year || "unknown"}, Citations: ${p.citations ?? "N/A"}\n     Abstract: ${(p.abstract || p.snippet || "No abstract available.").slice(0, 280)}`
  ).join("\n\n");

  const trialsBrief = trials.slice(0, 6).map((t, i) =>
    `[T${i + 1}] "${t.title}" — Status: ${t.status || "unknown"}, Phase: ${t.phase || "N/A"}, Sponsor: ${t.sponsor || "N/A"}`
  ).join("\n");

  const reportBlock = hasReportContext
    ? `\n\n════════════════════════════════\nUPLOADED PATIENT REPORT CONTEXT\n════════════════════════════════\n${reportContext}\n(End of report — use this for personalizedInsights)\n`
    : "";

  const userMessage = `RESEARCH QUERY: "${query}"
CLINICAL CONDITION: ${condition || "General / inferred from query"}
${reportBlock}
RETRIEVED PUBLICATIONS (${publications.length} results, ranked by relevance):
${pubsBrief || "No publications retrieved."}

RETRIEVED CLINICAL TRIALS (${trials.length} results):
${trialsBrief || "No clinical trials retrieved."}

Generate the JSON response now. ${hasReportContext ? "personalizedInsights MUST begin with 'Based on your uploaded report, '" : "personalizedInsights MUST be JSON null."}`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...conversationHistory.slice(-6),
    { role: "user", content: userMessage },
  ];

  const rawResponse = await chat(messages, 2000);

  try {
    const cleaned = rawResponse
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const start = cleaned.indexOf("{");
    const end   = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("No JSON object found");

    const parsed = JSON.parse(cleaned.slice(start, end + 1));

    // Sanitise null strings
    if (
      parsed.personalizedInsights === "null" ||
      parsed.personalizedInsights === "" ||
      parsed.personalizedInsights === "N/A"
    ) {
      parsed.personalizedInsights = null;
    }
    if (!hasReportContext) parsed.personalizedInsights = null;

    return parsed;
  } catch (err) {
    console.warn("[LLM] JSON parse failed:", err.message, "| Raw:", rawResponse.slice(0, 200));
    return {
      conditionOverview:    extractSection(rawResponse, "condition") || rawResponse.slice(0, 400),
      personalizedInsights: null,
      researchInsights:     extractSection(rawResponse, "insight")   || rawResponse.slice(0, 600),
    };
  }
}

// ── Title Generator ───────────────────────────────────────────────────────────

export async function generateTitle(query, condition) {
  const messages = [
    {
      role: "system",
      content: "Generate a 4-6 word title for a medical research session. Reply with ONLY the title — no quotes, no punctuation at end.",
    },
    { role: "user", content: `Query: "${query}"\nCondition: ${condition || "general"}` },
  ];
  try {
    const title = await chat(messages, 20);
    return title.trim().slice(0, 80) || query.slice(0, 60);
  } catch {
    return query.slice(0, 60);
  }
}

function extractSection(text, keyword) {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(keyword);
  if (idx === -1) return null;
  return text.slice(idx, idx + 500).trim();
}
