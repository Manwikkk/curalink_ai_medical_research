/**
 * ParticleBackground — homepage-only canvas particle system.
 *
 * Features:
 *  • Floating soft blurred circles at very low opacity (0.04–0.09)
 *  • Slow organic drift motion via simplex-style sine/cos offsets
 *  • Cursor parallax: particles shift slightly toward the mouse
 *  • Pure Canvas 2D — no WebGL, no external libs
 *  • requestAnimationFrame with proper cleanup
 *  • Throttled resize handler
 */
import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  r: number;
  op: number;
  speed: number;
  phase: number;
  phaseY: number;
}

const PARTICLE_COUNT = 28;
const PARALLAX_STRENGTH = 0.022; // how much particles follow cursor (subtle)

export function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    let mouseX = window.innerWidth  / 2;
    let mouseY = window.innerHeight / 2;
    let particles: Particle[] = [];
    let t = 0;

    // ── Resize ────────────────────────────────────────────────────────────
    function resize() {
      canvas!.width  = window.innerWidth;
      canvas!.height = window.innerHeight;
      init();
    }

    let resizeTimer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);
    };
    window.addEventListener("resize", onResize);

    // ── Mouse ─────────────────────────────────────────────────────────────
    const onMouse = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
    window.addEventListener("mousemove", onMouse, { passive: true });

    // ── Spawn particles ───────────────────────────────────────────────────
    function init() {
      const W = canvas!.width;
      const H = canvas!.height;
      particles = Array.from({ length: PARTICLE_COUNT }, () => ({
        x:      Math.random() * W,
        y:      Math.random() * H,
        baseX:  Math.random() * W,
        baseY:  Math.random() * H,
        r:      12 + Math.random() * 60,       // radius 12–72px
        op:     0.03 + Math.random() * 0.06,   // opacity 0.03–0.09
        speed:  0.15 + Math.random() * 0.25,   // drift speed
        phase:  Math.random() * Math.PI * 2,
        phaseY: Math.random() * Math.PI * 2,
      }));
    }

    // ── Draw ──────────────────────────────────────────────────────────────
    // Colour palette: teal / blue / indigo
    const palette = [
      [94, 234, 212],   // teal
      [99, 179, 237],   // sky blue
      [129, 140, 248],  // indigo
      [167, 139, 250],  // violet
    ];

    function draw() {
      const W = canvas!.width;
      const H = canvas!.height;
      ctx!.clearRect(0, 0, W, H);

      const cx = window.innerWidth  / 2;
      const cy = window.innerHeight / 2;

      for (const p of particles) {
        // Organic drift using separate X/Y sine waves
        const driftX = Math.sin(t * p.speed + p.phase)  * 45;
        const driftY = Math.cos(t * p.speed + p.phaseY) * 35;

        // Parallax shift toward cursor (very subtle)
        const px = (mouseX - cx) * PARALLAX_STRENGTH;
        const py = (mouseY - cy) * PARALLAX_STRENGTH;

        p.x = p.baseX + driftX + px;
        p.y = p.baseY + driftY + py;

        // Pick colour
        const col = palette[Math.floor(p.phase * palette.length / (Math.PI * 2)) % palette.length];
        const [r, g, b] = col;

        const grad = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        grad.addColorStop(0,   `rgba(${r},${g},${b},${p.op})`);
        grad.addColorStop(0.5, `rgba(${r},${g},${b},${p.op * 0.4})`);
        grad.addColorStop(1,   `rgba(${r},${g},${b},0)`);

        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fillStyle = grad;
        ctx!.fill();
      }

      t += 0.008; // global time increment
      raf = requestAnimationFrame(draw);
    }

    // ── Start ─────────────────────────────────────────────────────────────
    resize();
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouse);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
      style={{ mixBlendMode: "screen" }}
    />
  );
}
