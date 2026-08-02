import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--line)]">
      <div className="editorial-container grid gap-8 py-10 md:grid-cols-12 md:items-end">
        <div className="md:col-span-8">
          <p className="font-display text-5xl leading-[0.9] tracking-[-0.055em]">
            Inside Information
          </p>

          <p className="mt-4 max-w-[18ch] font-display text-3xl leading-[0.96] tracking-[-0.035em]">
            Not secret. Just hidden in plain sight.
          </p>

          <p className="mt-4 max-w-xl text-sm leading-6 text-[var(--ink-muted)]">
            Every conclusion begins with public SEC filings and ends with
            transparent behavioral analysis.
          </p>
        </div>

        <div className="flex gap-5 text-sm text-[var(--ink-muted)] md:col-span-4 md:justify-end">
          <Link href="/methodology">
            Methodology
          </Link>

          <Link href="/status">
            Data status
          </Link>
        </div>
      </div>
    </footer>
  );
}
