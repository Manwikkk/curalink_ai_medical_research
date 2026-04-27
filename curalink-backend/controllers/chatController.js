import { v4 as uuidv4 } from "uuid";
import Conversation from "../models/Conversation.js";
import Report from "../models/Report.js";
import { expandQuery } from "../services/queryExpansionService.js";
import { searchPubMed } from "../services/pubmedService.js";
import { searchOpenAlex } from "../services/openAlexService.js";
import { searchClinicalTrials } from "../services/clinicalTrialsService.js";
import { rankPublications, rankTrials, publicationsToSources } from "../services/rankingService.js";
import { generateAnswer, generateTitle } from "../services/llmService.js";
import { retrieveRelevantChunks, extractDocumentKeywords } from "../services/ragService.js";

/**
 * POST /api/chat
 */
export async function sendMessage(req, res) {
  try {
    const { query, condition, intent, location, conversationId, reportIds } = req.body;
    const isGuest = !req.user;

    if (!query?.trim()) {
      return res.status(400).json({ error: "Query is required" });
    }

    // ── 1. Load or create conversation ────────────────────────────────────
    let conversation = null;
    let priorMessages = [];

    if (!isGuest) {
      const userId = req.user._id;
      if (conversationId) {
        conversation = await Conversation.findOne({ _id: conversationId, userId });
        if (!conversation) return res.status(404).json({ error: "Conversation not found" });
        priorMessages = conversation.messages.slice(-10);
      } else {
        conversation = new Conversation({ userId, messages: [], title: "New research session" });
      }

      if (Array.isArray(reportIds) && reportIds.length > 0) {
        conversation.reportIds = [
          ...new Set([...(conversation.reportIds || []).map(String), ...reportIds.map(String)]),
        ];
      }
    }

    // ── 2. Build context ───────────────────────────────────────────────────

    // Build rich conversation history for LLM memory.
    // Include user questions with their structured context labels so the LLM
    // understands what each prior turn was about.
    const conversationHistory = priorMessages.map((m) => {
      if (m.role === "user") {
        // Reconstruct user turn with context so LLM knows prior intent
        const parts = [m.content];
        if (m.context?.condition) parts.push(`[Condition: ${m.context.condition}]`);
        if (m.context?.intent)    parts.push(`[Intent: ${m.context.intent}]`);
        if (m.context?.location)  parts.push(`[Location: ${m.context.location}]`);
        return { role: "user", content: parts.join(" ") };
      }
      // Assistant: use the full answer text where available, fallback to content
      const answerText = m.answer?.answer || m.answer?.conditionOverview || m.content || "";
      return { role: "assistant", content: answerText.slice(0, 600) };
    });

    // ── STRUCTURED CONTEXT — current request only ──────────────────────────
    // IMPORTANT: These are ONLY what the user explicitly provided in THIS request.
    // They are NEVER carried over from previous turns — that would cause the LLM
    // to re-apply old structured context to unrelated follow-up questions.
    const currentCondition = condition?.trim() || "";
    const currentIntent    = intent?.trim()    || "";
    const currentLocation  = location?.trim()  || "";

    // ── META CONDITION — for search expansion and conversation metadata only ─
    // Carries forward the conversation topic for better API queries,
    // but is NOT injected as a hard constraint into the LLM prompt.
    const metaCondition =
      condition?.trim() ||
      conversation?.condition ||
      extractConditionFromHistory(priorMessages) ||
      "";
    const metaLocation = location?.trim() || req.user?.medicalProfile?.location || "";

    // ── 3. RAG — load document and classify ──────────────────────────────
    let reportContext    = null;
    let ragUsed          = false;
    let ragChunksFound   = 0;
    let isFallbackContext = false;
    let docType          = null;
    let searchQuery      = query; // May be augmented for research papers

    if (!isGuest && conversation?.reportIds?.length > 0) {
      const report = await Report.findOne({
        _id:    { $in: conversation.reportIds },
        status: "ready",
      })
        .select("+chunks +fullText docType")
        .sort({ createdAt: -1 });

      if (report) {
        docType = report.docType || "unknown";

        // Non-medical doc: skip retrieval, let LLM return guardrail
        if (docType === "non_medical") {
          reportContext = "__non_medical__";
        } else if (report.chunks?.length > 0) {
          // For research papers, enrich search query with document keywords
          if (docType === "research_paper" && report.fullText) {
            const docKeywords = extractDocumentKeywords(report.fullText, 6);
            if (docKeywords.length > 0) {
              searchQuery = `${query} ${docKeywords.slice(0, 3).join(" ")}`;
              console.log(`[RAG] 📚 Research paper — enriched search: "${searchQuery}"`);
            }
          }

          const ragResult = retrieveRelevantChunks(report.chunks, query, 6);

          if (ragResult.ragUsed && ragResult.context) {
            reportContext     = ragResult.context;
            ragUsed           = true;
            isFallbackContext = ragResult.isFallback || false;
            ragChunksFound    = ragResult.context.split("---").length;
            console.log(
              `[RAG] ✅ ${report.name} (${docType}) — topScore=${ragResult.topScore.toFixed(3)}, chunks=${ragChunksFound}, fallback=${isFallbackContext}`
            );
          } else {
            console.log(`[RAG] ℹ️  ${report.name} — no chunks retrieved`);
          }
        }
      }
    }

    // ── 4. Query expansion ──────────────────────────────────────────────────
    // Use ONLY currentCondition (what user sent in THIS request) for search queries.
    // Using metaCondition here would pollute the search with previous turn's topic
    // (e.g., a follow-up about "Paralysis attack" would incorrectly search for "Bone marrow").
    // The LLM handles topical continuity via conversation history — not via search APIs.
    const { pubmedQuery, openAlexQuery, trialsCondition } = expandQuery(
      searchQuery,
      currentCondition,
      currentIntent
    );

    // ── 5. Parallel retrieval ──────────────────────────────────────────────
    const [rawPubMed, rawOpenAlex, rawTrials] = await Promise.allSettled([
      searchPubMed(pubmedQuery, 80),
      searchOpenAlex(openAlexQuery, 80),
      searchClinicalTrials(trialsCondition, metaLocation, 60),
    ]);

    const pubMedResults   = rawPubMed.status   === "fulfilled" ? rawPubMed.value   : [];
    const openAlexResults = rawOpenAlex.status === "fulfilled" ? rawOpenAlex.value : [];
    const trialsResults   = rawTrials.status   === "fulfilled" ? rawTrials.value   : [];

    // ── 6. Rank & deduplicate ──────────────────────────────────────────────
    const maxPubs   = req.user?.preferences?.maxPublications || 6;
    const maxTrials = req.user?.preferences?.maxTrials       || 4;

    // Use currentCondition so ranking doesn't apply a stale previous-turn condition
    const topPublications = rankPublications(
      [...pubMedResults, ...openAlexResults],
      `${searchQuery} ${currentCondition}`.trim(),
      maxPubs
    );
    const topTrials = rankTrials(
      trialsResults,
      `${searchQuery} ${currentCondition}`.trim(),
      maxTrials
    );

    // ── 7. LLM synthesis ──────────────────────────────────────────────────
    // Pass ONLY the current request's structured context to the LLM.
    // The LLM gets conversation memory through conversationHistory.
    // Do NOT pass metaCondition here — that would re-apply stale prior context.
    const llmResult = await generateAnswer({
      query,
      condition:        currentCondition,
      intent:           currentIntent,
      location:         currentLocation,
      publications:     topPublications,
      trials:           topTrials,
      conversationHistory,
      reportContext:    reportContext === "__non_medical__" ? null : reportContext,
      docType,
      isFallbackContext,
      userProfile:      req.user || {},
    });

    // ── 8. Build answer section ────────────────────────────────────────────
    const answerSection = {
      // New unified fields
      answer:            llmResult.answer            || "",
      documentInsights:  llmResult.documentInsights  || null,
      docType:           llmResult.docType           || docType || null,
      // Legacy fields kept for backward compat with existing UI sections
      conditionOverview:    llmResult.answer         || "",
      personalizedInsights: llmResult.documentInsights || null,
      researchInsights:     llmResult.answer         || "",
      // Data
      publications:  topPublications,
      trials:        topTrials,
      sources:       publicationsToSources(topPublications),
      ragUsed,
      ragChunksFound,
      isFallbackContext,
    };

    // ── 9. Persist (authenticated only) ───────────────────────────────────
    let savedConversationId = conversationId || null;

    if (!isGuest && conversation) {
      conversation.messages.push(
        {
          id:        uuidv4(),
          role:      "user",
          content:   query,
          timestamp: Date.now(),
          context: {
            condition: currentCondition || undefined,
            intent:    currentIntent    || undefined,
            location:  currentLocation  || undefined,
          },
        },
        {
          id:        uuidv4(),
          role:      "assistant",
          content:   llmResult.answer?.slice(0, 200) || "Research synthesis complete.",
          timestamp: Date.now(),
          answer:    answerSection,
        }
      );

      // Save metaCondition to conversation metadata — for UI display and session context
      if (metaCondition && !conversation.condition) {
        conversation.condition = metaCondition;
      }

      if (conversation.messages.length <= 2) {
        conversation.title = await generateTitle(query, metaCondition);
      }

      await conversation.save();
      savedConversationId = conversation._id;
    }

    // ── 10. Response ───────────────────────────────────────────────────────
    res.json({
      conversationId: savedConversationId,
      message: {
        id:        uuidv4(),
        role:      "assistant",
        content:   llmResult.answer?.slice(0, 200) || "Research synthesis complete.",
        timestamp: Date.now(),
        answer:    answerSection,
      },
      isGuest,
      ragUsed,
      docType,
      stats: {
        pubmedFetched:      pubMedResults.length,
        openAlexFetched:    openAlexResults.length,
        trialsFetched:      trialsResults.length,
        publicationsRanked: topPublications.length,
        trialsRanked:       topTrials.length,
      },
    });
  } catch (err) {
    console.error("[sendMessage]", err);
    res.status(500).json({ error: err.message || "Failed to process research query" });
  }
}

export async function getConversation(req, res) {
  try {
    const conversation = await Conversation.findOne({
      _id:    req.params.conversationId,
      userId: req.user._id,
    });
    if (!conversation) return res.status(404).json({ error: "Conversation not found" });
    res.json({ conversation });
  } catch {
    res.status(500).json({ error: "Failed to load conversation" });
  }
}

export async function deleteConversation(req, res) {
  try {
    await Conversation.deleteOne({ _id: req.params.conversationId, userId: req.user._id });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete conversation" });
  }
}

function extractConditionFromHistory(messages) {
  for (const msg of [...messages].reverse()) {
    if (msg.context?.condition) return msg.context.condition;
  }
  return "";
}
