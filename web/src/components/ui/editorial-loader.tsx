export function EditorialLoader({
  label = "Reading the latest evidence",
}: {
  label?: string;
}) {
  return (
    <div
      className="editorial-container flex min-h-[70svh] flex-col justify-center py-20"
      role="status"
      aria-live="polite"
    >
      <p className="eyebrow">{label}</p>
      <div className="mt-12 max-w-5xl">
        <div className="loading-line h-[clamp(4rem,10vw,9rem)] w-full" />
        <div className="loading-line mt-4 h-[clamp(4rem,10vw,9rem)] w-[72%]" />
      </div>
      <div className="mt-20 grid gap-8 md:grid-cols-3">
        <div className="loading-line h-32" />
        <div className="loading-line h-32" />
        <div className="loading-line h-32" />
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
