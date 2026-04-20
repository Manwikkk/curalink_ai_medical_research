import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { PanelLeft, Settings } from "lucide-react";
import { Logo } from "@/components/Logo";
import { SettingsPanel } from "./SettingsPanel";

interface AppTopBarProps {
  showLeftSidebar?: boolean;
  onToggleLeft?: () => void;
}

export function AppTopBar({ showLeftSidebar, onToggleLeft }: AppTopBarProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/40 bg-background/60 px-4 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Logo />
          {onToggleLeft && (
            <button
              type="button"
              onClick={onToggleLeft}
              aria-label={showLeftSidebar ? "Hide sessions sidebar" : "Show sessions sidebar"}
              title={showLeftSidebar ? "Hide sidebar" : "Show sidebar"}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-card/60 hover:text-foreground"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 sm:flex mr-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inset-0 rounded-full bg-success animate-ping-soft" />
              <span className="relative h-2 w-2 rounded-full bg-success" />
            </span>
            <span className="text-xs text-muted-foreground">Session live · 3 sources active</span>
          </div>
          
          <div className="flex items-center gap-1 border-l border-border/40 pl-3">
            <Link
              to="/"
              className="hidden rounded-md px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-card/60 hover:text-foreground sm:block"
            >
              ← Back to home
            </Link>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label="Open settings"
              title="Settings"
              className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-card/60 hover:text-foreground"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <SettingsPanel open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
