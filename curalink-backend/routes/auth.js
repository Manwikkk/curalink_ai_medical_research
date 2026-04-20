import { Router } from "express";
import passport from "passport";
import {
  register,
  login,
  googleAuth,
  googleCallback,
  getMe,
} from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Email / password
router.post("/register", register);
router.post("/login", login);

// Google OAuth
router.get("/google", googleAuth);
router.get("/google/callback", googleCallback);

// Protected
router.get("/me", requireAuth, getMe);

export default router;
