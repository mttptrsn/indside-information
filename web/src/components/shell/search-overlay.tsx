"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Command, Search, X } from "lucide-react";
import {
  type KeyboardEvent,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { SearchItemData } from "@/types/home";

interface SafeSearchItem {
  type: "company" | "insider";
  slug: string;
  label: string;
  secondary: string;
  ticker: string;
  keywords: string[];
}

function normalizeText(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  const normalized = String(value).trim();
  const lowered = normalized.toLowerCase();

  if (
    !normalized ||
    lowered === "nan" ||
    lowered === "none" ||
    lowered === "null" ||
    lowered === "undefined"
  ) {
    return "";
  }

  return normalized;
}

function normalizeItem(item: SearchItemData): SafeSearchItem | null {
  const slug = normalizeText(item.slug);
  const ticker = normalizeText(item.ticker);
  const secondary = normalizeText(item.secondary);
  const rawLabel = normalizeText(item.label);

  if (!slug) {
    return null;
  }

  const type: SafeSearchItem["type"] =
    item.type === "insider" ? "insider" : "company";

  const label =
    rawLabel ||
    ticker ||
    secondary ||
    (type === "company" ? "Unnamed company" : "Unnamed executive");

  const keywords = Array.isArray(item.keywords)
    ? item.keywords
        .map(normalizeText)
        .filter((value): value is string => Boolean(value))
    : [];

  return {
    type,
    slug,
    label,
    secondary,
    ticker,
    keywords,
  };
}

function destination(item: SafeSearchItem): string {
  return item.type === "company"
    ? `/companies/${item.slug}`
    : `/insiders/${item.slug}`;
}

export function SearchOverlay({
  items,
  open,
  onClose,
}: {
  items: SearchItemData[];
  open: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const deferredQuery = useDeferredValue(query);
  const inputRef = useRef<HTMLInputElement>(null);

  const normalizedItems = useMemo(
    () =>
      items
        .map(normalizeItem)
        .filter(
          (item): item is SafeSearchItem =>
            item !== null,
        ),
    [items],
  );

  const results = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();

    return normalizedItems
      .map((item) => {
        const ticker = item.ticker.toLowerCase();
        const label = item.label.toLowerCase();
        const secondary = item.secondary.toLowerCase();
        const keywords = item.keywords.join(" ").toLowerCase();

        if (!needle) {
          return {
            item,
            score: 1,
          };
        }

        let score = 0;

        if (ticker === needle) {
          score += 100;
        }

        if (ticker.startsWith(needle)) {
          score += 60;
        }

        if (label.startsWith(needle)) {
          score += 40;
        }

        if (label.includes(needle)) {
          score += 24;
        }

        if (secondary.includes(needle)) {
          score += 12;
        }

        if (keywords.includes(needle)) {
          score += 8;
        }

        return {
          item,
          score,
        };
      })
      .filter((entry) => entry.score > 0)
      .sort(
        (left, right) =>
          right.score - left.score ||
          left.item.label.localeCompare(right.item.label),
      )
      .slice(0, 12)
      .map((entry) => entry.item);
  }, [normalizedItems, deferredQuery]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timer = window.setTimeout(() => {
      setQuery("");
      setActiveIndex(0);
      inputRef.current?.focus();
    }, 80);

    return () => {
      window.clearTimeout(timer);
    };
  }, [open]);

  function closeSearch() {
    setQuery("");
    setActiveIndex(0);
    onClose();
  }

  function handleKeyboard(
    event: KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key === "ArrowDown") {
      event.preventDefault();

      setActiveIndex((index) =>
        Math.min(
          index + 1,
          Math.max(results.length - 1, 0),
        ),
      );

      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      setActiveIndex((index) =>
        Math.max(index - 1, 0),
      );

      return;
    }

    if (event.key === "Enter" && results[activeIndex]) {
      event.preventDefault();

      window.location.assign(
        destination(results[activeIndex]),
      );

      return;
    }

    if (event.key === "Escape") {
      closeSearch();
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[90] bg-[color-mix(in_srgb,var(--canvas)_88%,transparent)] backdrop-blur-2xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label="Search companies and executives"
        >
          <motion.div
            initial={{
              opacity: 0,
              y: 26,
              scale: 0.992,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: 12,
              scale: 0.995,
            }}
            transition={{
              duration: 0.52,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="editorial-container flex min-h-full flex-col py-6 md:py-10"
          >
            <div className="flex items-center justify-between">
              <p className="eyebrow">
                Search the evidence
              </p>

              <button
                type="button"
                onClick={closeSearch}
                className="inline-flex size-11 items-center justify-center border border-[var(--line)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                aria-label="Close search"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-16 flex items-center gap-5 border-b border-[var(--line-strong)] pb-5 md:mt-24">
              <Search className="size-6 shrink-0 text-[var(--ink-soft)]" />

              <input
                ref={inputRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={handleKeyboard}
                placeholder="Company, ticker, executive, role or sector"
                className="min-w-0 flex-1 bg-transparent font-display text-3xl leading-none outline-none placeholder:text-[var(--ink-soft)] md:text-6xl"
                aria-controls="search-results"
                aria-activedescendant={
                  results[activeIndex]
                    ? `search-result-${activeIndex}`
                    : undefined
                }
              />

              <span className="hidden items-center gap-1 border border-[var(--line)] px-2 py-1 font-mono text-[0.625rem] uppercase tracking-[0.08em] text-[var(--ink-soft)] md:inline-flex">
                <Command className="size-3" />
                K
              </span>
            </div>

            <div className="mt-8 flex items-center justify-between gap-5">
              <p className="font-mono text-xs uppercase tracking-[0.12em] text-[var(--ink-soft)]">
                {results.length} results
              </p>

              <p className="hidden text-xs text-[var(--ink-soft)] md:block">
                Arrow keys to navigate · Enter to open · Esc to close
              </p>
            </div>

            <div
              id="search-results"
              role="listbox"
              className="mt-5 divide-y divide-[var(--line)] border-y border-[var(--line)]"
            >
              {results.map((item, index) => (
                <Link
                  id={`search-result-${index}`}
                  role="option"
                  aria-selected={activeIndex === index}
                  key={`${item.type}-${item.slug}`}
                  href={destination(item)}
                  onClick={closeSearch}
                  onMouseEnter={() =>
                    setActiveIndex(index)
                  }
                  className={`group grid gap-3 py-5 transition-colors md:grid-cols-12 md:items-center ${
                    activeIndex === index
                      ? "text-[var(--accent-ink)]"
                      : ""
                  }`}
                >
                  <span className="font-mono text-xs uppercase tracking-[0.12em] text-[var(--ink-soft)] md:col-span-1">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <span className="font-display text-3xl leading-none md:col-span-5 md:text-4xl">
                    {item.label}
                  </span>

                  <span className="text-sm text-[var(--ink-muted)] md:col-span-4">
                    {item.secondary ||
                      "Additional details unavailable"}
                  </span>

                  <span className="flex items-center gap-3 font-mono text-sm md:col-span-2 md:justify-end">
                    {item.ticker || item.type}

                    <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </Link>
              ))}
            </div>

            {!results.length ? (
              <div className="flex flex-1 flex-col items-center justify-center py-20 text-center">
                <p className="font-display text-5xl leading-none">
                  Nothing in the current record.
                </p>

                <p className="mt-5 max-w-md text-[var(--ink-muted)]">
                  Try a ticker, executive surname, role,
                  sector, or industry.
                </p>
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
