import User from "../models/User.js";

/**
 * GET /api/settings
 */
export async function getSettings(req, res) {
  res.json({
    name: req.user.name,
    email: req.user.email,
    avatar: req.user.avatar || null,
    medicalProfile: req.user.medicalProfile,
    preferences: req.user.preferences,
  });
}

/**
 * PATCH /api/settings
 * Update medical profile and/or preferences.
 */
export async function updateSettings(req, res) {
  try {
    const { medicalProfile, preferences } = req.body;

    const updates = {};
    if (medicalProfile) {
      const allowed = ["condition", "location", "specialty", "notes"];
      for (const key of allowed) {
        if (medicalProfile[key] !== undefined) {
          updates[`medicalProfile.${key}`] = medicalProfile[key];
        }
      }
    }

    if (preferences) {
      const allowed = ["preferredSources", "maxPublications", "maxTrials", "dateRangeYears"];
      for (const key of allowed) {
        if (preferences[key] !== undefined) {
          updates[`preferences.${key}`] = preferences[key];
        }
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.json({ user });
  } catch (err) {
    console.error("[updateSettings]", err);
    res.status(500).json({ error: "Failed to update settings" });
  }
}

/**
 * PATCH /api/settings/profile
 * Update user's display name or avatar.
 */
export async function updateProfile(req, res) {
  try {
    const { name, avatar } = req.body;
    const updates = {};
    if (name) updates.name = name.trim();
    if (avatar) updates.avatar = avatar;

    const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: "Failed to update profile" });
  }
}
