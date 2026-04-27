import { useRef, useState } from "react";
import { ArrowUp, MapPin, Paperclip, Sparkles, Stethoscope, Target, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QueryComposerProps {
  onSubmit?: (data: {
    query: string;
    condition: string;
    intent: string;
    location: string;
    files: File[];
  }) => void;
  disabled?: boolean;
}

export function QueryComposer({ onSubmit, disabled = false }: QueryComposerProps) {
  const [query, setQuery] = useState("");
  const [condition, setCondition] = useState("");
  const [intent, setIntent] = useState("");
  const [location, setLocation] = useState("");
  const [showStructured, setShowStructured] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (disabled) return;
    if (!query.trim() && files.length === 0) return;
    onSubmit?.({ query, condition, intent, location, files });
    // Reset everything so stale context never bleeds into the next query
    setQuery("");
    setFiles([]);
    setCondition("");
    setIntent("");
    setLocation("");
    setShowStructured(false);
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)]);
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <div
      className={`glass-strong gradient-border rounded-2xl p-3 shadow-[var(--shadow-elegant)] transition-all ${dragActive ? "ring-2 ring-primary/60" : ""
        }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragActive(false);
        addFiles(e.dataTransfer.files);
      }}
    >
      <form onSubmit={handleSubmit}>
        {files.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-2 pb-2">
            {files.map((f, i) => (
              <div
                key={i}
                className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2 py-1 text-xs text-foreground"
              >
                <Paperclip className="h-3 w-3 text-primary" />
                <span className="max-w-[160px] truncate">{f.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  aria-label="Remove attachment"
                  className="rounded text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          rows={2}
          placeholder={
            dragActive
              ? "Drop files to attach…"
              : "Ask a clinical research question — e.g., latest first-line therapy for HER2-low metastatic breast cancer"
          }
          disabled={disabled}
          className="block w-full resize-none bg-transparent px-4 py-3 text-[15px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        />

        {showStructured && (
          <div className="grid gap-2 px-2 py-2 sm:grid-cols-3">
            <StructuredField
              icon={Stethoscope}
              label="Condition"
              value={condition}
              onChange={setCondition}
              placeholder="e.g., NSCLC"
            />
            <StructuredField
              icon={Target}
              label="Intent"
              value={intent}
              onChange={setIntent}
              placeholder="e.g., treatment"
            />
            <StructuredField
              icon={MapPin}
              label="Location"
              value={location}
              onChange={setLocation}
              placeholder="e.g., Europe"
            />
          </div>
        )}

        <div className="flex items-center justify-between gap-2 border-t border-border/40 px-2 pt-2">
          <div className="flex items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt,image/*"
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach document"
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-card/60 hover:text-foreground"
            >
              <Paperclip className="h-3.5 w-3.5" />
              Attach
            </button>
            <button
              type="button"
              onClick={() => setShowStructured((s) => !s)}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-card/60 hover:text-foreground"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {showStructured ? "Hide" : "Add"} structured context
            </button>
          </div>
          <Button
            type="submit"
            variant="hero"
            size="default"
            disabled={disabled || (!query.trim() && files.length === 0)}
          >
            {disabled ? "Processing…" : "Synthesize"}
            <ArrowUp className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}

function StructuredField({
  icon: Icon,
  label,
  value,
  onChange,
  placeholder,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="group flex items-center gap-2 rounded-lg border border-border/40 bg-background/40 px-3 py-1.5 transition-colors focus-within:border-primary/50">
      <Icon className="h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary" />
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
      />
    </label>
  );
}
