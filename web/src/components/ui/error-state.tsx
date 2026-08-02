import { AlertTriangle } from "lucide-react";

export function ErrorState({ title, description }: { title: string; description: string }) {
  return (
    <div role="alert" className="border border-[var(--critical-line)] bg-[var(--critical-bg)] p-6">
      <AlertTriangle className="mb-4 size-5 text-[var(--critical)]" aria-hidden="true" />
      <h3 className="font-medium text-[var(--ink)]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{description}</p>
    </div>
  );
}
