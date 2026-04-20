import Conversation from "../models/Conversation.js";

/**
 * GET /api/history
 * Returns all conversations for the authenticated user (no messages, just metadata).
 */
export async function getHistory(req, res) {
  try {
    const conversations = await Conversation.find({ userId: req.user._id })
      .sort({ updatedAt: -1 })
      .select("title condition messages updatedAt createdAt");

    const result = conversations.map((c) => ({
      id: c._id,
      title: c.title,
      condition: c.condition,
      updatedAt: c.updatedAt.getTime(),
      messageCount: c.messages.length,
    }));

    res.json({ conversations: result });
  } catch (err) {
    console.error("[getHistory]", err);
    res.status(500).json({ error: "Failed to load history" });
  }
}

/**
 * DELETE /api/history
 * Clear all conversations for a user.
 */
export async function clearHistory(req, res) {
  try {
    await Conversation.deleteMany({ userId: req.user._id });
    res.json({ success: true, message: "All history cleared" });
  } catch (err) {
    res.status(500).json({ error: "Failed to clear history" });
  }
}
