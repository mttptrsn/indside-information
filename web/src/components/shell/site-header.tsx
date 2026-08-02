"use client";

import Link from "next/link";
import { Menu, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { SearchOverlay } from "@/components/shell/search-overlay";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import type { SearchItemData } from "@/types/home";

const links = [
  ["Evidence", "/discoveries"],
  ["Companies", "/companies"],
  ["Activity", "/activity"],
  ["Methodology", "/methodology"],
] as const;

export function SiteHeader({
  searchItems = [],
}: {
  searchItems?: SearchItemData[];
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener("keydown", onKey);

    return () =>
      window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--canvas)_94%,transparent)] backdrop-blur-xl">
        <div className="editorial-container flex h-16 items-center justify-between">
          <Link
            href="/"
            className="font-display text-2xl tracking-[-0.045em]"
            aria-label="Inside Information home"
          >
            Inside Information
          </Link>

          <nav
            className="hidden items-center gap-7 md:flex"
            aria-label="Primary"
          >
            {links.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="text-sm text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]"
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="inline-flex size-10 items-center justify-center border border-[var(--line)]"
              aria-label="Search"
            >
              <Search className="size-4" />
            </button>

            <ThemeToggle />

            <button
              type="button"
              onClick={() =>
                setMenuOpen((value) => !value)
              }
              className="inline-flex size-10 items-center justify-center border border-[var(--line)] md:hidden"
              aria-label="Toggle navigation"
              aria-expanded={menuOpen}
            >
              {menuOpen ? (
                <X className="size-4" />
              ) : (
                <Menu className="size-4" />
              )}
            </button>
          </div>
        </div>

        {menuOpen ? (
          <nav
            className="editorial-container border-t border-[var(--line)] py-3 md:hidden"
            aria-label="Mobile primary"
          >
            {links.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className="block border-b border-[var(--line)] py-4 font-display text-2xl"
              >
                {label}
              </Link>
            ))}
          </nav>
        ) : null}
      </header>

      <SearchOverlay
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        items={searchItems}
      />
    </>
  );
}
