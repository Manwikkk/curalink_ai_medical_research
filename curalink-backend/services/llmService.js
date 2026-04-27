import Groq from "groq-sdk";
import axios from "axios";

const groqClient = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

const GROQ_MODEL   = process.env.GROQ_MODEL     || "llama-3.3-70b-versatile";
const OLLAMA_URL   = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL    || "llama3.2";

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

export function buildSystemPrompt(opts = {}) {
  const {
    userProfile = {},
    docType = null,
    hasDocContext = false,
    structuredContext = {},
  } = opts;

  // ── Profile line ──────────────────────────────────────────────────────────
  const profileCtx = userProfile.medicalProfile?.condition
    ? `\nUser profile: specialty="${userProfile.medicalProfile.specialty || "not set"}", condition="${userProfile.medicalProfile.condition}", location="${userProfile.medicalProfile.location || "not set"}".`
    : "";

  // ── Structured query context ──────────────────────────────────────────────
  let contextRules = "";
  if (structuredContext.condition || structuredContext.intent || structuredContext.location) {
    contextRules = "\n\nSTRUCTURED CONTEXT FROM USER:";
    if (structuredContext.condition) contextRules += `\n- Condition: "${structuredContext.condition}"`;
    if (structuredContext.intent)    contextRules += `\n- Research intent: "${structuredContext.intent}"`;
    if (structuredContext.location)  contextRules += `\n- Geographic focus: "${structuredContext.location}"`;
    contextRules += "\n\nYou MUST address all of the above in your response.";
    if (structuredContext.intent)   contextRules += ` Focus your answer on the "${structuredContext.intent}" aspect.`;
    if (structuredContext.location) contextRules += ` Highlight clinical trials near "${structuredContext.location}" and state if none are available there.`;
  }

  // ── Doc-type-specific instructions ───────────────────────────────────────
  let docInstructions = "";
  if (hasDocContext && docType) {
    switch (docType) {
      case "patient_report":
        docInstructions = `\n\nDOCUMENT TYPE: Clinical Patient Report
You have been provided excerpts from the patient's clinical report.
- Connect findings from the report (biomarkers, diagnoses, stage, medications) directly to the user's question.
- In documentInsights, start with "Based on your uploaded report, " and give specific, personalized insights.
- Recommend relevant treatment options and related research grounded in both the document and retrieved publications.`;
        break;

      case "research_paper":
        docInstructions = `\n\nDOCUMENT TYPE: Medical Research Paper
You have been provided excerpts from an uploaded research paper.
- In documentInsights, start with "Based on the uploaded paper, " and summarize: key findings, methodology (if relevant), and clinical implications.
- Answer any question the user has specifically about this paper using the excerpts.
- Connect the paper's findings to the retrieved external publications for broader context.`;
        break;

      case "general_medical":
        docInstructions = `\n\nDOCUMENT TYPE: General Medical Document
You have been provided excerpts from a general medical document.
- In documentInsights, start with "Based on the uploaded document, " and explain what the document contains and how it relates to the question.
- Answer the user's question using both the document content and the retrieved literature.`;
        break;

      default:
        docInstructions = `\n\nA document has been uploaded. Use the provided excerpts to answer the question. Start documentInsights with "Based on the uploaded document, ".`;
    }
  }

  // ── Core rules ────────────────────────────────────────────────────────────
  const hasStructuredContext = !!(structuredContext.condition || structuredContext.intent || structuredContext.location);
  const followUpRule = !hasStructuredContext
    ? `\n\nFOLLOW-UP QUESTION HANDLING:
The user did NOT provide any structured context (condition/intent/location) for this query.
This may be a follow-up to a previous conversation turn.
- Use the conversation history provided to understand prior context.
- Answer the CURRENT question directly — do NOT assume the previous turn's condition, intent, or location still apply unless the question makes that clear.
- If the question is clearly a follow-up (e.g. "what about X?", "tell me more", "what are the side effects?"), use the prior conversation to provide continuity.
- Do NOT mention or reference geographic restrictions, specific conditions, or intents from previous turns unless the user explicitly asks about them again.`
    : "";

  const coreRules = `
CRITICAL RULES:
1. NEVER hallucinate — only reference studies, statistics, or findings present in the provided context.
2. NEVER return "no relevant information", "undefined", or empty fields.
3. If the retrieved publications are insufficient, acknowledge this but still provide a general evidence-based explanation.
4. If no document context is provided, set documentInsights to JSON null.
5. Keep answer concise but complete: 4-6 sentences for each field.
6. NEVER re-apply a previous turn's structured context (condition/intent/location) to the current question unless the user restates it.${followUpRule}

STRICT OUTPUT FORMAT — return ONLY this raw JSON object, no markdown, no text outside braces:
{
  "answer": "Your primary response to the user's question — synthesises publications, trials, document context, and structured query context into one unified intelligent response.",
  "documentInsights": null,
  "docType": null
}

RULES:
- answer: ALWAYS populated. Integrate all available evidence. Never leave empty.
- documentInsights: null when no document uploaded. When document present: MUST start with the exact prefix shown in document instructions above. 2-4 sentences max.
- docType: Set to the document type string if a document was provided, else null.`;

  return `You are Curalink, an expert AI medical research assistant for clinicians and scientists.${profileCtx}${contextRules}${docInstructions}
${coreRules}`;
}

// ── Answer Generator ──────────────────────────────────────────────────────────

export async function generateAnswer({
  query,
  condition,
  intent,
  location,
  publications,
  trials,
  conversationHistory,
  reportContext,
  docType,
  isFallbackContext,
  userProfile,
}) {
  const hasDocContext = !!reportContext && reportContext.length > 20;

  // Guardrail — non-medical documents get a canned response, no LLM call
  if (docType === "non_medical") {
    return {
      answer: "This application only supports medical or healthcare-related documents. The uploaded file does not appear to contain medical content. Please upload a clinical report, research paper, or other healthcare-related document.",
      documentInsights: null,
      docType: "non_medical",
    };
  }

  const systemPrompt = buildSystemPrompt({
    userProfile,
    docType: hasDocContext ? docType : null,
    hasDocContext,
    structuredContext: { condition, intent, location },
  });

  // ── Build publication context ──────────────────────────────────────────────
  const pubsBrief = publications.slice(0, 8).map((p, i) =>
    `[${i + 1}] "${p.title}" — Source: ${p.source || p.platform}, Year: ${p.year || "unknown"}, Citations: ${p.citations ?? "N/A"}\n     Abstract: ${(p.abstract || p.snippet || "No abstract available.").slice(0, 300)}`
  ).join("\n\n");

  // ── Build trials context ──────────────────────────────────────────────────
  const trialsBrief = trials.slice(0, 6).map((t, i) =>
    `[T${i + 1}] "${t.title}" — Status: ${t.status || "unknown"}, Phase: ${t.phase || "N/A"}, Sponsor: ${t.sponsor || "N/A"}, Location: ${t.location || "not specified"}${t.eligibility ? `\n     Eligibility: ${t.eligibility.slice(0, 200)}` : ""}`
  ).join("\n\n");

  // ── Document context block ────────────────────────────────────────────────
  let documentBlock = "";
  if (hasDocContext) {
    const contextLabel = isFallbackContext
      ? "UPLOADED DOCUMENT — BROAD CONTEXT (query didn't match specific sections, showing document overview)"
      : "UPLOADED DOCUMENT — RELEVANT EXCERPTS";
    documentBlock = `\n\n${"═".repeat(40)}\n${contextLabel}\n${"═".repeat(40)}\n${reportContext}\n(End of document excerpts)\n`;
  }

  // ── Structured context summary line (only when provided in THIS request) ─
  const contextParts = [];
  if (condition) contextParts.push(`Condition: ${condition}`);
  if (intent)    contextParts.push(`Intent: ${intent}`);
  if (location)  contextParts.push(`Location: ${location}`);
  const structuredLine = contextParts.length > 0
    ? `STRUCTURED CONTEXT (this query): ${contextParts.join(" | ")}\n`
    : "NOTE: No structured context provided for this query — this may be a follow-up question. Use conversation history for continuity.\n";

  // Only include explicit context lines when they were actually provided
  const conditionLine = condition ? `CLINICAL CONDITION: ${condition}\n` : "";
  const intentLine    = intent    ? `RESEARCH INTENT: ${intent}\n`       : "";
  const locationLine  = location  ? `GEOGRAPHIC FOCUS: ${location}\n`    : "";

  const isFollowUp = conversationHistory.length > 0;

  // When this is a follow-up AND a document is attached, strongly cue the LLM
  // to answer the NEW question rather than re-summarize the document.
  const followUpDocNote = isFollowUp && hasDocContext
    ? `\nIMPORTANT: This is a FOLLOW-UP question in an ongoing conversation. You have already responded to the previous question. Now answer THIS NEW SPECIFIC question: "${query}". Do NOT repeat or re-summarize your previous answer. Use the document excerpts as background context only — they are provided so you can reference relevant sections if needed for THIS question.\n`
    : "";

  const userMessage = `RESEARCH QUERY: "${query}"
${followUpDocNote}${structuredLine}${conditionLine}${intentLine}${locationLine}${documentBlock}
RETRIEVED PUBLICATIONS (${publications.length} ranked results):
${pubsBrief || "No publications retrieved."}

RETRIEVED CLINICAL TRIALS (${trials.length} results):
${trialsBrief || "No clinical trials retrieved."}

Generate the JSON response now.${hasDocContext ? ` documentInsights MUST start with the appropriate prefix for a ${docType || "document"} and relate to the current question.` : " documentInsights MUST be JSON null."}${isFollowUp ? " answer field MUST address the current follow-up question specifically." : ""}`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...conversationHistory.slice(-8),
    { role: "user", content: userMessage },
  ];

  const rawResponse = await chat(messages, 2200);

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
      !parsed.documentInsights ||
      parsed.documentInsights === "null" ||
      parsed.documentInsights === "" ||
      parsed.documentInsights === "N/A"
    ) {
      parsed.documentInsights = null;
    }

    // If no doc uploaded, force null regardless of what LLM returned
    if (!hasDocContext) parsed.documentInsights = null;

    // Ensure answer is never empty
    if (!parsed.answer || parsed.answer.trim().length < 10) {
      parsed.answer = rawResponse.slice(0, 600).trim();
    }

    return parsed;
  } catch (err) {
    console.warn("[LLM] JSON parse failed:", err.message, "| Raw:", rawResponse.slice(0, 200));
    // Return best-effort extraction rather than empty
    return {
      answer: rawResponse.slice(0, 800).trim() || "Research synthesis complete. Please refer to the retrieved publications and trials for evidence.",
      documentInsights: null,
      docType: docType || null,
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
