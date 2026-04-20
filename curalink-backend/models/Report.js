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
    filePath: String, // Relative path on disk
    status: {
      type: String,
      enum: ["uploading", "processing", "ready", "error"],
      default: "uploading",
    },
    progress: { type: Number, default: 0 },
    // Extracted content
    fullText: { type: String, select: false }, // large, only fetch when needed
    chunks: { type: [chunkSchema], select: false },
    summary: String,
    insights: [String], // Extracted key medical signals e.g. "KRAS G12C mutation"
    errorMessage: String,
  },
  { timestamps: true }
);

export default mongoose.model("Report", reportSchema);
