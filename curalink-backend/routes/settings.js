import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { getSettings, updateSettings, updateProfile } from "../controllers/settingsController.js";

const router = Router();

router.use(requireAuth);

router.get("/", getSettings);
router.patch("/", updateSettings);
router.patch("/profile", updateProfile);

export default router;
