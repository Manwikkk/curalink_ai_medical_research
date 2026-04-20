import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, select: false }, // null for Google OAuth users
    googleId: { type: String, sparse: true },
    avatar: { type: String },
    // Medical profile for personalization
    medicalProfile: {
      condition: { type: String, default: "" },
      location: { type: String, default: "" },
      specialty: { type: String, default: "" },
      notes: { type: String, default: "" },
    },
    preferences: {
      preferredSources: {
        type: [String],
        default: ["PubMed", "OpenAlex", "ClinicalTrials.gov"],
      },
      maxPublications: { type: Number, default: 6 },
      maxTrials: { type: Number, default: 4 },
      dateRangeYears: { type: Number, default: 5 },
    },
  },
  { timestamps: true }
);

// Hash password before save
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Remove sensitive fields from JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

export default mongoose.model("User", userSchema);
