"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/shell/theme-provider";

export function ThemeToggle() {
  const { setTheme } = useTheme();

  function toggleTheme() {
    const currentTheme =
      document.documentElement.dataset.theme === "dark" ? "dark" : "light";

    setTheme(currentTheme === "dark" ? "light" : "dark");
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="group relative inline-flex size-10 items-center justify-center border border-[var(--line)] transition-[background-color,border-color] duration-300 hover:border-[var(--line-strong)] hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)]"
      aria-label="Toggle color theme"
      title="Toggle color theme"
    >
      <Sun className="theme-icon theme-icon-light size-4" aria-hidden="true" />
      <Moon
        className="theme-icon theme-icon-dark absolute size-4"
        aria-hidden="true"
      />
      <span className="sr-only">Toggle color theme</span>
    </button>
  );
}
