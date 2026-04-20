import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bell,
  Brain,
  ChevronRight,
  FileText,
  LogOut,
  Save,
  ShieldCheck,
  Stethoscope,
  Trash2,
  User,
  X,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { settingsApi, reportApi, type MedicalProfile, type UserPreferences } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface SettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SettingsSection =
  | "profile"
  | "medical"
  | "reports"
  | "ai"
  | "notifications"
  | "privacy"
  | null;

// ── Shared Input Component ────────────────────────────────────────────────────

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  disabled,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full rounded-xl border border-border/50 bg-background/40 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/60 focus:bg-background/60 focus:outline-none disabled:opacity-50"
    />
  );
}

function SaveBar({
  saving,
  saved,
  onSave,
  error,
}: {
  saving: boolean;
  saved: boolean;
  onSave: () => void;
  error?: string;
}) {
  return (
    <div className="mt-5 space-y-2">
      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
      )}
      <Button
        onClick={onSave}
        disabled={saving}
        variant="hero"
        size="sm"
        className="w-full"
      >
        {saving ? (
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 animate-spin rounded-full border border-primary-foreground border-t-transparent" />
            Saving…
          </span>
        ) : saved ? (
          "✓ Saved"
        ) : (
          <>
            <Save className="h-3.5 w-3.5" />
            Save changes
          </>
        )}
      </Button>
    </div>
  );
}

// ── Section: Profile ──────────────────────────────────────────────────────────

function ProfileSection({ onBack }: { onBack: () => void }) {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Load from API in case user object is stale
  useEffect(() => {
    settingsApi.get().then((d) => {
      setName(d.name || user?.name || "");
    }).catch(() => {});
  }, [user?.name]);

  async function handleSave() {
    setError("");
    setSaving(true);
    try {
      await settingsApi.updateProfile({ name: name.trim() });
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <SectionHeader icon={User} title="Profile" onBack={onBack} />
      <div className="space-y-3">
        <FieldRow label="Display name">
          <TextInput value={name} onChange={setName} placeholder="Your name" />
        </FieldRow>
        <FieldRow label="Email address">
          <TextInput
            value={user?.email || ""}
            onChange={() => {}}
            disabled
            placeholder="your@email.com"
          />
          <p className="text-[11px] text-muted-foreground/60">
            Email cannot be changed here. Contact support if needed.
          </p>
        </FieldRow>
      </div>
      <SaveBar saving={saving} saved={saved} onSave={handleSave} error={error} />
    </div>
  );
}

// ── Section: Medical Profile ──────────────────────────────────────────────────

function MedicalProfileSection({ onBack }: { onBack: () => void }) {
  const [profile, setProfile] = useState<MedicalProfile>({
    condition: "",
    location: "",
    specialty: "",
    notes: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    settingsApi
      .get()
      .then((d) => setProfile(d.medicalProfile || {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function set(key: keyof MedicalProfile, value: string) {
    setProfile((p) => ({ ...p, [key]: value }));
  }

  async function handleSave() {
    setError("");
    setSaving(true);
    try {
      await settingsApi.update({ medicalProfile: profile });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <SectionHeader icon={Stethoscope} title="Medical Profile" onBack={onBack} />
      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            This context personalises Curalink's research synthesis to your clinical practice.
          </p>
          <div className="space-y-3">
            <FieldRow label="Condition / focus area">
              <TextInput
                value={profile.condition || ""}
                onChange={(v) => set("condition", v)}
                placeholder="e.g. NSCLC, Type 2 Diabetes"
              />
            </FieldRow>
            <FieldRow label="Specialty">
              <TextInput
                value={profile.specialty || ""}
                onChange={(v) => set("specialty", v)}
                placeholder="e.g. Oncology, Cardiology"
              />
            </FieldRow>
            <FieldRow label="Location / region">
              <TextInput
                value={profile.location || ""}
                onChange={(v) => set("location", v)}
                placeholder="e.g. United States, India"
              />
            </FieldRow>
            <FieldRow label="Notes (optional)">
              <textarea
                value={profile.notes || ""}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Any additional context for Curalink…"
                rows={3}
                className="w-full rounded-xl border border-border/50 bg-background/40 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/60 focus:outline-none resize-none"
              />
            </FieldRow>
          </div>
          <SaveBar saving={saving} saved={saved} onSave={handleSave} error={error} />
        </>
      )}
    </div>
  );
}

// ── Section: AI Preferences ───────────────────────────────────────────────────

const SOURCE_OPTIONS = ["PubMed", "OpenAlex", "ClinicalTrials.gov"];

function AIPreferencesSection({ onBack }: { onBack: () => void }) {
  const [prefs, setPrefs] = useState<UserPreferences>({
    preferredSources: ["PubMed", "OpenAlex", "ClinicalTrials.gov"],
    maxPublications: 6,
    maxTrials: 4,
    dateRangeYears: 5,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    settingsApi
      .get()
      .then((d) =>
        setPrefs(
          d.preferences || {
            preferredSources: SOURCE_OPTIONS,
            maxPublications: 6,
            maxTrials: 4,
            dateRangeYears: 5,
          }
        )
      )
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function toggleSource(src: string) {
    setPrefs((p) => {
      const current = p.preferredSources || [];
      const next = current.includes(src)
        ? current.filter((s) => s !== src)
        : [...current, src];
      return { ...p, preferredSources: next };
    });
  }

  async function handleSave() {
    setError("");
    setSaving(true);
    try {
      await settingsApi.update({ preferences: prefs });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <SectionHeader icon={Brain} title="AI Preferences" onBack={onBack} />
      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className="space-y-4">
            {/* Sources */}
            <FieldRow label="Preferred sources">
              <div className="flex flex-wrap gap-2 pt-1">
                {SOURCE_OPTIONS.map((src) => {
                  const active = (prefs.preferredSources || []).includes(src);
                  return (
                    <button
                      key={src}
                      type="button"
                      onClick={() => toggleSource(src)}
                      className={`rounded-full border px-3 py-1 text-xs transition-all ${
                        active
                          ? "border-primary bg-primary/20 text-primary"
                          : "border-border/50 bg-card/40 text-muted-foreground hover:border-border"
                      }`}
                    >
                      {src}
                    </button>
                  );
                })}
              </div>
            </FieldRow>

            {/* Max publications slider */}
            <SliderRow
              label="Max publications per query"
              value={prefs.maxPublications ?? 6}
              min={2}
              max={15}
              onChange={(v) => setPrefs((p) => ({ ...p, maxPublications: v }))}
            />

            {/* Max trials slider */}
            <SliderRow
              label="Max clinical trials per query"
              value={prefs.maxTrials ?? 4}
              min={1}
              max={10}
              onChange={(v) => setPrefs((p) => ({ ...p, maxTrials: v }))}
            />

            {/* Date range slider */}
            <SliderRow
              label="Publication date range (years)"
              value={prefs.dateRangeYears ?? 5}
              min={1}
              max={25}
              onChange={(v) => setPrefs((p) => ({ ...p, dateRangeYears: v }))}
            />
          </div>
          <SaveBar saving={saving} saved={saved} onSave={handleSave} error={error} />
        </>
      )}
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <FieldRow label={label}>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 accent-primary"
        />
        <span className="w-7 text-center text-sm font-semibold text-primary">{value}</span>
      </div>
    </FieldRow>
  );
}

// ── Section: Reports ──────────────────────────────────────────────────────────

function ReportsSection({ onBack }: { onBack: () => void }) {
  const [reports, setReports] = useState<
    { id: string; name: string; size: number; status: string; progress: number }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    reportApi
      .list()
      .then((d) => setReports(d.reports || []))
      .catch(() => setError("Could not load reports."))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await reportApi.delete(id);
      setReports((r) => r.filter((rep) => rep.id !== id));
    } catch {
      setError("Failed to delete report.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <SectionHeader icon={FileText} title="Reports" onBack={onBack} />
      <p className="text-xs text-muted-foreground">
        Uploaded patient reports that Curalink uses for personalised RAG context.
      </p>
      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : reports.length === 0 ? (
        <div className="rounded-xl border border-border/40 bg-card/30 px-4 py-6 text-center text-sm text-muted-foreground">
          No reports uploaded yet.
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map((rep) => (
            <div
              key={rep.id}
              className="flex items-center gap-3 rounded-xl border border-border/40 bg-card/40 px-4 py-3"
            >
              <FileText className="h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{rep.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(rep.size / 1024).toFixed(1)} KB ·{" "}
                  <span
                    className={
                      rep.status === "ready"
                        ? "text-success"
                        : rep.status === "error"
                        ? "text-destructive"
                        : "text-warning"
                    }
                  >
                    {rep.status}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(rep.id)}
                disabled={deletingId === rep.id}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                aria-label="Delete report"
              >
                {deletingId === rep.id ? (
                  <span className="h-4 w-4 animate-spin rounded-full border border-current border-t-transparent" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Section: Notifications ─────────────────────────────────────────────────────

type NotifKey = "trialAlerts" | "pubUpdates" | "sessionSummaries";

function NotificationsSection({ onBack }: { onBack: () => void }) {
  const STORAGE_KEY = "curalink_notif_prefs";
  const defaults: Record<NotifKey, boolean> = {
    trialAlerts: true,
    pubUpdates: true,
    sessionSummaries: false,
  };

  const [prefs, setPrefs] = useState<Record<NotifKey, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return defaults;
    }
  });
  const [saved, setSaved] = useState(false);

  const items: { key: NotifKey; label: string; description: string }[] = [
    {
      key: "trialAlerts",
      label: "Trial alerts",
      description: "Get notified when new matching clinical trials open",
    },
    {
      key: "pubUpdates",
      label: "Publication updates",
      description: "Weekly digest of new publications matching your profile",
    },
    {
      key: "sessionSummaries",
      label: "Session summaries",
      description: "Receive a summary after each research session",
    },
  ];

  function toggle(key: NotifKey) {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  }

  function handleSave() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="space-y-4">
      <SectionHeader icon={Bell} title="Notifications" onBack={onBack} />
      <p className="text-xs text-muted-foreground">
        Notification preferences are stored locally on this device.
      </p>
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.key}
            className="flex items-center gap-3 rounded-xl border border-border/40 bg-card/40 px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
            <button
              type="button"
              onClick={() => toggle(item.key)}
              aria-label={`Toggle ${item.label}`}
              className={`relative h-6 w-11 rounded-full transition-colors focus:outline-none ${
                prefs[item.key] ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  prefs[item.key] ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        ))}
      </div>
      <Button onClick={handleSave} variant="hero" size="sm" className="w-full">
        {saved ? "✓ Saved" : "Save preferences"}
      </Button>
    </div>
  );
}

// ── Section: Privacy ──────────────────────────────────────────────────────────

function PrivacySection({ onBack }: { onBack: () => void }) {
  return (
    <div className="space-y-4">
      <SectionHeader icon={ShieldCheck} title="Privacy" onBack={onBack} />
      <div className="space-y-3">
        {[
          {
            title: "Data storage",
            body: "Your conversation history and uploaded reports are stored securely in MongoDB Atlas. Reports are stored only while associated with a conversation.",
          },
          {
            title: "Data sharing",
            body: "Curalink does not sell or share your data with third parties. Query text is sent to Groq (LLM provider) for synthesis — no personal identifiers are included.",
          },
          {
            title: "Session data",
            body: "Guest sessions are not persisted. Authenticated sessions store conversation history tied to your account, which you can delete at any time.",
          },
          {
            title: "Retention",
            body: "You can delete individual conversations from the sidebar and reports from the Reports section. To delete your account entirely, contact support.",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-xl border border-border/40 bg-card/30 px-4 py-3"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              {item.title}
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{item.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
  onBack,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  onBack: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onBack}
        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-card/60 hover:text-foreground"
        aria-label="Go back"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="font-display text-base font-semibold text-foreground">{title}</h3>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex justify-center py-8">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

// ── Main Settings Panel ───────────────────────────────────────────────────────

const sections = [
  { id: "profile" as const,       icon: User,        title: "Profile",        description: "Name, email, and account details" },
  { id: "medical" as const,       icon: Stethoscope, title: "Medical Profile", description: "Specialty, conditions, and clinical interests" },
  { id: "reports" as const,       icon: FileText,    title: "Reports",        description: "Manage uploaded documents and extracted context" },
  { id: "ai" as const,            icon: Brain,       title: "AI Preferences", description: "Sources, citation depth, and result limits" },
  { id: "notifications" as const, icon: Bell,        title: "Notifications",  description: "Trial alerts and publication updates" },
  { id: "privacy" as const,       icon: ShieldCheck, title: "Privacy",        description: "Data retention, sharing, and security" },
];

export function SettingsPanel({ open, onOpenChange }: SettingsPanelProps) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [activeSection, setActiveSection] = useState<SettingsSection>(null);

  function handleLogout() {
    logout();          // clears token from localStorage
    onOpenChange(false);
    navigate({ to: "/signin" });
  }

  function handleClose() {
    setActiveSection(null);
    onOpenChange(false);
  }

  function renderSection() {
    switch (activeSection) {
      case "profile":       return <ProfileSection onBack={() => setActiveSection(null)} />;
      case "medical":       return <MedicalProfileSection onBack={() => setActiveSection(null)} />;
      case "reports":       return <ReportsSection onBack={() => setActiveSection(null)} />;
      case "ai":            return <AIPreferencesSection onBack={() => setActiveSection(null)} />;
      case "notifications": return <NotificationsSection onBack={() => setActiveSection(null)} />;
      case "privacy":       return <PrivacySection onBack={() => setActiveSection(null)} />;
      default:              return null;
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="right"
        className="w-full border-l border-border/40 bg-background/70 p-0 backdrop-blur-2xl sm:max-w-md"
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <SheetHeader className="border-b border-border/40 px-6 py-5">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="font-display text-xl font-semibold text-foreground">
                  {activeSection
                    ? sections.find((s) => s.id === activeSection)?.title ?? "Settings"
                    : "Settings"}
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  Personalise your research workspace
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {activeSection ? (
              renderSection()
            ) : (
              <div className="space-y-2">
                {sections.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveSection(s.id)}
                    className="group flex w-full items-center gap-3 rounded-xl border border-border/40 bg-card/40 px-4 py-3 text-left transition-all hover:border-primary/40 hover:bg-card/70"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                      <s.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{s.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{s.description}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Logout */}
          <div className="border-t border-border/40 px-4 py-4">
            <button
              type="button"
              onClick={handleLogout}
              className="group flex w-full items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-left transition-all hover:border-destructive/60 hover:bg-destructive/10"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/15 text-destructive">
                <LogOut className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-destructive">Log out</p>
                <p className="text-xs text-destructive/70">End your current session</p>
              </div>
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
