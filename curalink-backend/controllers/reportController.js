import multer from "multer";
import Report from "../models/Report.js";
import Conversation from "../models/Conversation.js";
import {
  extractTextFromPDF,
  chunkText,
  classifyDocument,
  extractMedicalInsights,
  extractDocumentKeywords,
  generateQuickSummary,
} from "../services/ragService.js";

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
      filePath: "",
      status:   "processing",
      progress: 10,
      docType:  "unknown",
    });

    res.status(202).json({
      id:       report._id,
      name:     report.name,
      size:     report.size,
      status:   "processing",
      progress: 10,
      docType:  "unknown",
    });

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

    // Step 2 — Classify document type (35%)
    await setProgress(35);
    const docType = classifyDocument(fullText);
    console.log(`[processReport] 📄 ${report.name} classified as: ${docType}`);

    // Step 3 — Guardrail: reject non-medical documents
    if (docType === "non_medical") {
      await Report.findByIdAndUpdate(report._id, {
        docType,
        fullText,
        chunks: [],
        insights: [],
        summary: "This application only supports medical or healthcare-related documents.",
        status: "ready",
        progress: 100,
      });
      console.log(`[processReport] ⛔ ${report.name} — non-medical, stored with warning`);
      return;
    }

    // Step 4 — Chunk text (55%)
    await setProgress(55);
    const chunks = chunkText(fullText);

    // Step 5 — Extract signals depending on doc type (75%)
    await setProgress(75);
    let insights = [];
    let summary = "";

    if (docType === "patient_report") {
      insights = extractMedicalInsights(fullText);
      summary = generateQuickSummary(fullText);
    } else if (docType === "research_paper") {
      // For research papers, extract key topics as insights
      const keywords = extractDocumentKeywords(fullText, 8);
      insights = keywords;
      summary = generateQuickSummary(fullText);
    } else {
      // general_medical
      summary = generateQuickSummary(fullText);
    }

    // Step 6 — Save (100%)
    await Report.findByIdAndUpdate(report._id, {
      fullText,
      chunks,
      docType,
      insights,
      summary,
      status:   "ready",
      progress: 100,
    });

    if (conversationId) {
      await Conversation.findByIdAndUpdate(conversationId, {
        $addToSet: { reportIds: report._id },
      });
    }

    console.log(`[processReport] ✅ ${report.name} — ${chunks.length} chunks, type: ${docType}`);
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
      docType:      report.docType,
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
        docType:  r.docType,
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
