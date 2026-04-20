import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import multer from "multer";
import Report from "../models/Report.js";
import Conversation from "../models/Conversation.js";
import {
  extractTextFromPDF,
  chunkText,
  extractMedicalInsights,
  generateQuickSummary,
} from "../services/ragService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// ── Multer config ─────────────────────────────────────────────────────────────

const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  const allowed = ["application/pdf", "image/jpeg", "image/png", "image/tiff"];
  if (allowed.includes(file.mimetype) || file.originalname.toLowerCase().endsWith(".pdf")) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF and image files are accepted"), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

// ── Upload handler ────────────────────────────────────────────────────────────

export async function uploadReport(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: "No file provided" });

    const { conversationId } = req.body;

    const report = await Report.create({
      userId:   req.user._id,
      name:     req.file.originalname,
      size:     req.file.size,
      mimeType: req.file.mimetype,
      filePath: "", // Deprecated due to memory storage transition
      status:   "processing",
      progress: 10,
    });

    // Return immediately — processing is async
    res.status(202).json({
      id:       report._id,
      name:     report.name,
      size:     report.size,
      status:   "processing",
      progress: 10,
    });

    // Kick off async pipeline
    processReport(report, req.file.buffer, conversationId).catch((err) => {
      console.error("[processReport unhandled]", err);
    });
  } catch (err) {
    console.error("[uploadReport]", err);
    res.status(500).json({ error: err.message || "Upload failed" });
  }
}

// ── Async processing pipeline ─────────────────────────────────────────────────

async function processReport(report, fileBuffer, conversationId) {
  const setProgress = (progress, extra = {}) =>
    Report.findByIdAndUpdate(report._id, { progress, ...extra });

  try {
    // Step 1 — Extract text (20%)
    await setProgress(20);
    let fullText = "";
    if (report.mimeType === "application/pdf" || report.name.toLowerCase().endsWith(".pdf")) {
      fullText = await extractTextFromPDF(fileBuffer);
    } else {
      fullText = "[Image file — OCR not enabled. Please upload a text-based PDF.]";
    }

    // Step 2 — Chunk text (50%)
    await setProgress(50);
    const chunks = chunkText(fullText);

    // Step 3 — Extract medical signals (75%)
    await setProgress(75);
    const insights = extractMedicalInsights(fullText);
    const summary  = generateQuickSummary(fullText);

    // Step 4 — Save all results (100%)
    await Report.findByIdAndUpdate(report._id, {
      fullText,
      chunks,
      insights,
      summary,
      status:   "ready",
      progress: 100,
    });

    // Link to conversation if provided
    if (conversationId) {
      await Conversation.findByIdAndUpdate(conversationId, {
        $addToSet: { reportIds: report._id },
      });
    }

    console.log(`[processReport] ✅ ${report.name} — ${chunks.length} chunks`);
  } catch (err) {
    console.error("[processReport] ❌", err.message);
    await Report.findByIdAndUpdate(report._id, {
      status:       "error",
      errorMessage: err.message || "Processing failed",
      progress:     0,
    });
  }
}

// ── GET /api/upload-report/:reportId ─────────────────────────────────────────

export async function getReportStatus(req, res) {
  try {
    const report = await Report.findOne({ _id: req.params.reportId, userId: req.user._id });
    if (!report) return res.status(404).json({ error: "Report not found" });
    res.json({
      id:           report._id,
      name:         report.name,
      size:         report.size,
      status:       report.status,
      progress:     report.progress,
      summary:      report.summary,
      insights:     report.insights,
      errorMessage: report.errorMessage,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch report status" });
  }
}

// ── GET /api/upload-report ────────────────────────────────────────────────────

export async function listReports(req, res) {
  try {
    const reports = await Report.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .select("-fullText -chunks");
    res.json({
      reports: reports.map((r) => ({
        id:       r._id,
        name:     r.name,
        size:     r.size,
        type:     r.mimeType,
        status:   r.status,
        progress: r.progress,
        summary:  r.summary,
        insights: r.insights,
      })),
    });
  } catch {
    res.status(500).json({ error: "Failed to list reports" });
  }
}

// ── DELETE /api/upload-report/:reportId ──────────────────────────────────────

export async function deleteReport(req, res) {
  try {
    const report = await Report.findOne({ _id: req.params.reportId, userId: req.user._id });
    if (!report) return res.status(404).json({ error: "Report not found" });

    await report.deleteOne();
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete report" });
  }
}
