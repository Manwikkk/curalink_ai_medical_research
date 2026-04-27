import mongoose from "mongoose";

const chunkSchema = new mongoose.Schema(
  {
    text:     { type: String,  required: true },
    index:    { type: Number,  required: true },
    keywords: [String],
    // BM25 term frequency map { term: count } — for fast retrieval without recomputing
    termFreq: { type: Map, of: Number, default: {} },
  },
  { _id: false }
);

const reportSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true },
    size: Number,
    mimeType: String,
    filePath: String,
    status: {
      type: String,
      enum: ["uploading", "processing", "ready", "error"],
      default: "uploading",
    },
    progress: { type: Number, default: 0 },
    // Document classification result
    docType: {
      type: String,
      enum: ["patient_report", "research_paper", "general_medical", "non_medical", "unknown"],
      default: "unknown",
    },
    // Extracted content
    fullText: { type: String, select: false },
    chunks: { type: [chunkSchema], select: false },
    summary: String,
    insights: [String],
    errorMessage: String,
  },
  { timestamps: true }
);

export default mongoose.model("Report", reportSchema);
