const stats = [
  { value: "34M+", label: "Indexed publications" },
  { value: "490K", label: "Active clinical trials" },
  { value: "<2.4s", label: "Median synthesis time" },
  { value: "100%", label: "Cited claims" },
];

export function Stats() {
  return (
    <section id="trust" className="relative mx-auto max-w-7xl px-6 py-12 sm:py-16">
      <div className="glass-strong gradient-border rounded-3xl p-10 sm:p-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center sm:text-left">
              <p className="font-display text-4xl font-semibold tracking-tight gradient-text sm:text-5xl">
                {s.value}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
