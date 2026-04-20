import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck, UserRound } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { AnimatedBackdrop } from "@/components/AnimatedBackdrop";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/lib/api";

export const Route = createFileRoute("/signin")({
  head: () => ({
    meta: [
      { title: "Sign in · Curalink" },
      { name: "description", content: "Sign in to Curalink — your AI medical research workspace." },
    ],
  }),
  component: SignInPage,
});

function SignInPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { login, register, continueAsGuest } = useAuth();

  // Detect Google OAuth error redirect e.g. /signin?error=google_auth_failed
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get("error");
    if (oauthError === "google_auth_failed") {
      setError(
        "Google sign-in failed. Please try again or use email & password."
      );
      // Clean up the URL
      window.history.replaceState({}, "", "/signin");
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Client-side password length check (mirrors backend validation)
    if (mode === "signup" && password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "signin") {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
      navigate({ to: "/app" });
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleGuestAccess() {
    continueAsGuest();
    navigate({ to: "/app" });
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <AnimatedBackdrop />
      <div className="absolute left-6 top-6 z-10">
        <Logo />
      </div>

      <div className="animate-fade-up relative z-10 w-full max-w-md">
        <div className="glass-strong gradient-border rounded-3xl p-8 shadow-[var(--shadow-elegant)] sm:p-10">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-primary">
              <ShieldCheck className="h-3.5 w-3.5" />
              Secure access
            </div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              AI medical research assistant for clinicians and scientists.
            </p>
          </div>

          {/* Google OAuth */}
          <div className="mt-8">
            <Button
              type="button"
              variant="glass"
              size="lg"
              className="w-full"
              onClick={() => authApi.googleSignIn()}
            >
              <GoogleIcon className="h-4 w-4" />
              Continue with Google
            </Button>
          </div>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground">
            <span className="h-px flex-1 bg-border/50" />
            or with email
            <span className="h-px flex-1 bg-border/50" />
          </div>

          {/* Email form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "signup" && (
              <FieldInput
                icon={UserRound}
                type="text"
                placeholder="Full name"
                value={name}
                onChange={setName}
                required
              />
            )}
            <FieldInput
              icon={Mail}
              type="email"
              placeholder="you@hospital.org"
              value={email}
              onChange={setEmail}
              required
            />
            <FieldInput
              icon={Lock}
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={setPassword}
              required
              showToggle
              isVisible={showPassword}
              onToggleVisibility={() => setShowPassword((v) => !v)}
            />

            {/* Password hint for signup */}
            {mode === "signup" && (
              <p className="text-[11px] text-muted-foreground/70 pl-1">
                Password must be at least 8 characters.
              </p>
            )}

            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            )}

            <Button
              type="submit"
              variant="hero"
              size="lg"
              className="mt-2 w-full"
              disabled={submitting}
            >
              {submitting
                ? "Please wait…"
                : mode === "signin"
                ? "Sign in"
                : "Create account"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          {/* Toggle mode */}
          <p className="mt-5 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "New to Curalink?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError("");
                setPassword("");
                setShowPassword(false);
              }}
              className="font-medium text-primary transition-colors hover:text-primary/80"
            >
              {mode === "signin" ? "Create account" : "Sign in"}
            </button>
          </p>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground">
            <span className="h-px flex-1 bg-border/50" />
            or
            <span className="h-px flex-1 bg-border/50" />
          </div>

          {/* Guest access */}
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="w-full border border-border/40 text-muted-foreground hover:text-foreground"
            onClick={handleGuestAccess}
          >
            <UserRound className="h-4 w-4" />
            Continue without account
          </Button>
          <p className="mt-2 text-center text-[11px] text-muted-foreground/70">
            No sign-up required · history won't be saved
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing you agree to our{" "}
          <Link to="/" className="underline-offset-4 hover:text-foreground hover:underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link to="/" className="underline-offset-4 hover:text-foreground hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

// ── FieldInput  ──────────────────────────────────────────────────────────────

function FieldInput({
  icon: Icon,
  type,
  placeholder,
  value,
  onChange,
  required,
  showToggle,
  isVisible,
  onToggleVisibility,
}: {
  icon: React.ComponentType<{ className?: string }>;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  showToggle?: boolean;
  isVisible?: boolean;
  onToggleVisibility?: () => void;
}) {
  return (
    <label className="group flex items-center gap-3 rounded-xl border border-border/50 bg-background/40 px-4 py-3 transition-colors focus-within:border-primary/60 focus-within:bg-background/60">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground group-focus-within:text-primary" />
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
      />
      {showToggle && onToggleVisibility && (
        <button
          type="button"
          tabIndex={-1}
          onClick={onToggleVisibility}
          aria-label={isVisible ? "Hide password" : "Show password"}
          className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
        >
          {isVisible ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      )}
    </label>
  );
}

// ── Google Icon SVG ──────────────────────────────────────────────────────────

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.31 0-6-2.74-6-6.1s2.69-6.1 6-6.1c1.88 0 3.14.8 3.86 1.49l2.63-2.54C16.86 3.4 14.66 2.5 12 2.5 6.96 2.5 2.9 6.56 2.9 11.6S6.96 20.7 12 20.7c6.93 0 9.6-4.86 9.6-9.39 0-.63-.07-1.11-.16-1.59H12z"
      />
    </svg>
  );
}
