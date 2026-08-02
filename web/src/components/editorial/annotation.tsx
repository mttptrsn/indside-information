import type { ReactNode } from "react";

export function Annotation({ index, children }: { index: string; children: ReactNode }) {
  return (
    <aside className="flex gap-4 border-l border-[var(--line)] pl-4 text-sm leading-6 text-[var(--ink-muted)]">
      <span className="font-mono text-[0.6875rem] text-[var(--ink-soft)]">{index}</span>
      <div>{children}</div>
    </aside>
  );
}
