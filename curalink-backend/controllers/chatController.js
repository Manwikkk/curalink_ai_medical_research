import { v4 as uuidv4 } from "uuid";
import Conversation from "../models/Conversation.js";
import Report from "../models/Report.js";
import { expandQuery } from "../services/queryExpansionService.js";
import { searchPubMed } from "../services/pubmedService.js";
import { searchOpenAlex } from "../services/openAlexService.js";
import { searchClinicalTrials } from "../services/clinicalTrialsService.js";
import { rankPublications, rankTrials, publicationsToSources } from "../services/rankingService.js";
import { generateAnswer, generateTitle } from "../services/llmService.js";
import { retrieveRelevantChunks } from "../services/ragService.js";

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

      // Merge newly uploaded reportIds into the conversation
      if (Array.isArray(reportIds) && reportIds.length > 0) {
        conversation.reportIds = [
          ...new Set([...(conversation.reportIds || []).map(String), ...reportIds.map(String)]),
        ];
      }
    }

    // ── 2. Build context ───────────────────────────────────────────────────
    const conversationHistory = priorMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const effectiveCondition =
      condition || conversation?.condition || extractConditionFromHistory(priorMessages) || "";
    const effectiveLocation = location || req.user?.medicalProfile?.location || "";

    // ── 3. Query expansion ─────────────────────────────────────────────────
    const { pubmedQuery, openAlexQuery, trialsCondition } = expandQuery(
      query,
      effectiveCondition,
      intent
    );

    // ── 4. Parallel retrieval ──────────────────────────────────────────────
    const [rawPubMed, rawOpenAlex, rawTrials] = await Promise.allSettled([
      searchPubMed(pubmedQuery, 80),
      searchOpenAlex(openAlexQuery, 80),
      searchClinicalTrials(trialsCondition, effectiveLocation, 60),
    ]);

    const pubMedResults   = rawPubMed.status   === "fulfilled" ? rawPubMed.value   : [];
    const openAlexResults = rawOpenAlex.status === "fulfilled" ? rawOpenAlex.value : [];
    const trialsResults   = rawTrials.status   === "fulfilled" ? rawTrials.value   : [];

    // ── 5. Rank & deduplicate ──────────────────────────────────────────────
    const maxPubs   = req.user?.preferences?.maxPublications || 6;
    const maxTrials = req.user?.preferences?.maxTrials       || 4;

    const topPublications = rankPublications(
      [...pubMedResults, ...openAlexResults],
      `${query} ${effectiveCondition}`,
      maxPubs
    );
    const topTrials = rankTrials(trialsResults, `${query} ${effectiveCondition}`, maxTrials);

    // ── 6. RAG — BM25 retrieval from uploaded reports ─────────────────────
    let reportContext   = null;
    let ragUsed         = false;
    let ragChunksFound  = 0;

    if (!isGuest && conversation?.reportIds?.length > 0) {
      // Find the most recently uploaded ready report
      const report = await Report.findOne({
        _id:    { $in: conversation.reportIds },
        status: "ready",
      })
        .select("+chunks")
        .sort({ createdAt: -1 });

      if (report?.chunks?.length > 0) {
        const ragResult = retrieveRelevantChunks(report.chunks, query, 5);
        if (ragResult.ragUsed && ragResult.context) {
          reportContext  = ragResult.context;
          ragUsed        = true;
          ragChunksFound = ragResult.context.split("---").length;
          console.log(`[RAG] ✅ ${report.name} — BM25 topScore=${ragResult.topScore.toFixed(3)}, chunks=${ragChunksFound}`);
        } else {
          console.log(`[RAG] ℹ️  ${report.name} — no relevant chunks for this query`);
        }
      }
    }

    // ── 7. LLM synthesis ──────────────────────────────────────────────────
    const llmResult = await generateAnswer({
      query,
      condition:           effectiveCondition,
      publications:        topPublications,
      trials:              topTrials,
      conversationHistory,
      reportContext,
      userProfile:         req.user || {},
    });

    // ── 8. Build answer section ────────────────────────────────────────────
    const answerSection = {
      conditionOverview:    llmResult.conditionOverview    || "",
      personalizedInsights: llmResult.personalizedInsights || null,
      researchInsights:     llmResult.researchInsights     || "",
      publications:         topPublications,
      trials:               topTrials,
      sources:              publicationsToSources(topPublications),
      ragUsed,
      ragChunksFound,
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
            condition: effectiveCondition || undefined,
            intent:    intent            || undefined,
            location:  effectiveLocation || undefined,
          },
        },
        {
          id:        uuidv4(),
          role:      "assistant",
          content:   llmResult.researchInsights?.slice(0, 200) || "Research synthesis complete.",
          timestamp: Date.now(),
          answer:    answerSection,
        }
      );

      if (effectiveCondition && !conversation.condition) {
        conversation.condition = effectiveCondition;
      }

      if (conversation.messages.length <= 2) {
        conversation.title = await generateTitle(query, effectiveCondition);
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
        content:   llmResult.researchInsights?.slice(0, 200) || "Research synthesis complete.",
        timestamp: Date.now(),
        answer:    answerSection,
      },
      isGuest,
      ragUsed,
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
