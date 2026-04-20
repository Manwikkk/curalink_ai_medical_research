import { Router } from "express";
import { requireAuth, optionalAuth } from "../middleware/auth.js";
import {
  sendMessage,
  getConversation,
  deleteConversation,
} from "../controllers/chatController.js";

const router = Router();

// POST /chat — guests allowed (no token = guest session, no persistence)
router.post("/", optionalAuth, sendMessage);

// These require a real account (guests have nothing to load/delete)
router.get("/:conversationId", requireAuth, getConversation);
router.delete("/:conversationId", requireAuth, deleteConversation);

export default router;
