import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { getHistory, clearHistory } from "../controllers/historyController.js";

const router = Router();

router.use(requireAuth);

router.get("/", getHistory);
router.delete("/", clearHistory);

export default router;
