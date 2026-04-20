import { Link } from "@tanstack/react-router";
import { Activity } from "lucide-react";

export function Logo({ to = "/", showText = true }: { to?: string; showText?: boolean }) {
  return (
    <Link to={to} className="group flex items-center gap-2.5">
      {/* Heartbeat line — no circle, just glowing icon */}
      <div className="relative flex items-center justify-center">
        {/* Outer glow layer — only visible on hover */}
        <div className="absolute h-7 w-7 rounded-full opacity-0 blur-md transition-all duration-300 group-hover:bg-primary/50 group-hover:opacity-100 group-hover:blur-lg" />
        {/* The icon itself — no shadow default, shadow on hover */}
        <Activity
          className="relative h-5 w-5 text-white transition-all duration-300 group-hover:drop-shadow-[0_0_8px_rgba(94,234,212,0.9)]"
          strokeWidth={2.5}
        />
      </div>

      {showText && (
        <span className="font-display text-[20px] font-semibold tracking-tight text-foreground">
          Curalink
        </span>
      )}
    </Link>
  );
}
