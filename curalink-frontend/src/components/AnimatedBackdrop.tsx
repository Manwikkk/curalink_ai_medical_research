export function AnimatedBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-60" />
      <div
        className="absolute -top-40 -left-32 h-[520px] w-[520px] rounded-full opacity-50 blur-3xl animate-float-slow"
        style={{ background: "radial-gradient(circle, oklch(0.55 0.18 200 / 0.55), transparent 60%)" }}
      />
      <div
        className="absolute top-1/3 -right-40 h-[600px] w-[600px] rounded-full opacity-40 blur-3xl animate-float-slow"
        style={{
          background: "radial-gradient(circle, oklch(0.55 0.20 270 / 0.5), transparent 60%)",
          animationDelay: "-6s",
        }}
      />
      <div
        className="absolute bottom-0 left-1/3 h-[460px] w-[460px] rounded-full opacity-35 blur-3xl animate-float-slow"
        style={{
          background: "radial-gradient(circle, oklch(0.60 0.18 175 / 0.5), transparent 60%)",
          animationDelay: "-12s",
        }}
      />
      <div className="absolute inset-0 bg-noise opacity-[0.015] mix-blend-overlay" />
    </div>
  );
}
