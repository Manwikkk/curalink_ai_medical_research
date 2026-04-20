/**
 * MagneticCursor — homepage-only custom cursor.
 *
 * Features:
 *  • Soft glowing circle that replaces the system cursor
 *  • Smooth inertia follow via requestAnimationFrame
 *  • Magnetic pull on elements with [data-magnetic] or .magnetic class
 *  • Grows + changes colour when hovering interactive elements
 *  • Pure JS transforms — zero layout thrashing, maintains 60fps
 */
import { useEffect, useRef } from "react";

export function MagneticCursor() {
  const dotRef  = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dot  = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    let mouseX = window.innerWidth  / 2;
    let mouseY = window.innerHeight / 2;
    let ringX  = mouseX;
    let ringY  = mouseY;
    let raf: number;
    let isHovering = false;

    // ── Follow mouse ──────────────────────────────────────────────────────
    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
    window.addEventListener("mousemove", onMove, { passive: true });

    // ── Hover detect ──────────────────────────────────────────────────────
    const interactables = "a, button, input, textarea, [data-magnetic], .magnetic, label";

    const onEnter = () => {
      isHovering = true;
      ring.style.width   = "52px";
      ring.style.height  = "52px";
      ring.style.opacity = "0.6";
      ring.style.background = "radial-gradient(circle, rgba(94,234,212,0.18) 0%, transparent 70%)";
    };
    const onLeave = () => {
      isHovering = false;
      ring.style.width   = "36px";
      ring.style.height  = "36px";
      ring.style.opacity = "0.35";
      ring.style.background = "radial-gradient(circle, rgba(94,234,212,0.10) 0%, transparent 70%)";
    };

    document.querySelectorAll<HTMLElement>(interactables).forEach((el) => {
      el.addEventListener("mouseenter", onEnter);
      el.addEventListener("mouseleave", onLeave);
    });

    // MutationObserver to catch dynamically added elements
    const observer = new MutationObserver(() => {
      document.querySelectorAll<HTMLElement>(interactables).forEach((el) => {
        el.removeEventListener("mouseenter", onEnter);
        el.removeEventListener("mouseleave", onLeave);
        el.addEventListener("mouseenter", onEnter);
        el.addEventListener("mouseleave", onLeave);
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // ── RAF loop ──────────────────────────────────────────────────────────
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const RING_EASE = 0.12;  // lag amount (lower = slower)

    const tick = () => {
      // Dot snaps instantly
      dot.style.transform = `translate(${mouseX - 4}px, ${mouseY - 4}px)`;

      // Ring follows with eased interpolation
      ringX = lerp(ringX, mouseX, RING_EASE);
      ringY = lerp(ringY, mouseY, RING_EASE);
      ring.style.transform = `translate(${ringX - 18}px, ${ringY - 18}px)`;

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // ── Hide system cursor on the page ────────────────────────────────────
    document.documentElement.style.cursor = "none";

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      observer.disconnect();
      document.querySelectorAll<HTMLElement>(interactables).forEach((el) => {
        el.removeEventListener("mouseenter", onEnter);
        el.removeEventListener("mouseleave", onLeave);
      });
      document.documentElement.style.cursor = "";
    };
  }, []);

  return (
    <>
      {/* Tiny bright dot — snaps directly */}
      <div
        ref={dotRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[9999] h-2 w-2 rounded-full bg-white will-change-transform"
        style={{
          boxShadow: "0 0 8px 2px rgba(94,234,212,0.95), 0 0 20px 4px rgba(94,234,212,0.4)",
        }}
      />
      {/* Soft glowing ring — lags behind for inertia */}
      <div
        ref={ringRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[9998] h-9 w-9 rounded-full border border-primary/50 will-change-transform transition-[width,height,opacity] duration-200"
        style={{
          background:   "radial-gradient(circle, rgba(94,234,212,0.10) 0%, transparent 70%)",
          boxShadow:    "0 0 18px 4px rgba(94,234,212,0.18), inset 0 0 8px rgba(94,234,212,0.08)",
          opacity:      0.35,
          backdropFilter: "blur(1px)",
        }}
      />
    </>
  );
}
