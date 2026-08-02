import Link from "next/link";

export default function NotFound() {
  return (
    <section className="editorial-container flex min-h-[70svh] flex-col justify-center py-20">
      <p className="eyebrow">Evidence unavailable</p>
      <h1 className="mt-6 max-w-[10ch] font-display text-7xl leading-[0.9] tracking-[-0.05em] md:text-9xl">
        This profile is not in the current record.
      </h1>
      <p className="mt-8 max-w-lg text-lg leading-8 text-[var(--ink-muted)]">
        The symbol or reporting owner may be unsupported, inactive, or absent
        from the latest static export.
      </p>
      <Link
        href="/discoveries"
        className="mt-10 w-fit border-b border-[var(--ink)] pb-1 text-sm"
      >
        Return to current discoveries
      </Link>
    </section>
  );
}
