"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { safeText } from "@/lib/visual";
import type { InsiderIndexItem } from "@/types/interior";

export function InsiderIndex({
  insiders,
}: {
  insiders: InsiderIndexItem[];
}) {
  const [query, setQuery] = useState("");

  const items = useMemo(
    () =>
      insiders
        .map((insider, index) => ({
          key: `${safeText(insider.owner_cik, "insider")}-${index}`,
          slug: safeText(insider.slug),
          name: safeText(insider.name, "Executive"),
          roles: safeText(insider.roles, "Role unavailable"),
        }))
        .filter((insider) => insider.slug),
    [insiders],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) =>
      [item.name, item.roles].join(" ").toLowerCase().includes(needle),
    );
  }, [items, query]);

  return (
    <div className="editorial-container pb-16">
      <label className="flex items-center gap-4 border-y border-[var(--line)] py-5">
        <Search className="size-5 text-[var(--ink-soft)]" />
        <span className="sr-only">Search executives</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Find an executive"
          className="w-full bg-transparent font-display text-3xl outline-none placeholder:text-[var(--ink-soft)] md:text-5xl"
        />
      </label>

      <div className="mt-8 divide-y divide-[var(--line)] border-y border-[var(--line)]">
        {filtered.map((insider) => (
          <Link
            key={insider.key}
            href={`/insiders/${insider.slug}`}
            className="grid gap-2 py-5 md:grid-cols-[1fr_auto] md:items-center"
          >
            <p className="font-display text-3xl leading-none">{insider.name}</p>
            <p className="text-sm text-[var(--ink-muted)]">{insider.roles}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
