import mongoose from "mongoose";

// ── Sub-schemas ──────────────────────────────────────────────────────────────

const publicationSchema = new mongoose.Schema(
  {
    id: String,
    title: String,
    authors: [String],
    year: Number,
    source: String, // "PubMed" | "OpenAlex"
    abstract: String,
    url: String,
    citations: Number,
    journal: String,
  },
  { _id: false }
);

const clinicalTrialSchema = new mongoose.Schema(
  {
    id: String,
    title: String,
    status: String,
    phase: String,
    eligibility: String,
    location: String,
    contact: String,
    source: { type: String, default: "ClinicalTrials.gov" },
    sponsor: String,
    startDate: String,
  },
  { _id: false }
);

const sourceSchema = new mongoose.Schema(
  {
    id: String,
    title: String,
    authors: [String],
    year: Number,
    platform: String,
    url: String,
    snippet: String,
  },
  { _id: false }
);

const answerSectionSchema = new mongoose.Schema(
  {
    // New unified fields
    answer: String,
    documentInsights: String,
    docType: String,
    ragUsed: Boolean,
    ragChunksFound: Number,
    isFallbackContext: Boolean,
    // Legacy fields
    conditionOverview: String,
    personalizedInsights: String,
    researchInsights: String,
    publications: [publicationSchema],
    trials: [clinicalTrialSchema],
    sources: [sourceSchema],
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    timestamp: { type: Number, default: () => Date.now() },
    context: {
      condition: String,
      intent: String,
      location: String,
    },
    answer: answerSectionSchema,
  },
  { _id: false }
);

// ── Main Conversation schema ─────────────────────────────────────────────────

const conversationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, default: "New research session" },
    condition: String,
    messages: [messageSchema],
    // RAG context: list of report IDs contributing to this conversation
    reportIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Report" }],
  },
  { timestamps: true }
);

conversationSchema.virtual("messageCount").get(function () {
  return this.messages.length;
});

conversationSchema.set("toJSON", { virtuals: true });

export default mongoose.model("Conversation", conversationSchema);
