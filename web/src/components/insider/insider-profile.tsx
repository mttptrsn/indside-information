import { BehaviorTimeline } from "@/components/visuals/behavior-timeline";
import { EvidenceFingerprint } from "@/components/visuals/evidence-fingerprint";
import { formatCurrency, formatNumber } from "@/lib/format";
import { numberValue, text, tokens } from "@/lib/record";
import type { InsiderDossier } from "@/types/interior";

export function InsiderProfile({
  dossier,
}: {
  dossier: InsiderDossier;
}) {
  const insider = dossier.insider;
  const signal = dossier.signals[0] ?? {};
  const name =
    text(insider, "display_name", "canonical_name", "owner_name") ||
    "Executive";
  const roles = tokens(insider, "normalized_roles");
  const count = dossier.behavior_profile.purchase_count ?? 0;

  return (
    <article>
      <header className="editorial-container grid min-h-[44svh] gap-8 py-14 md:grid-cols-12 md:items-end md:py-20">
        <div className="md:col-span-8">
          <p className="eyebrow">{roles.join(" · ") || "Executive"}</p>
          <h1 className="mt-6 font-display text-6xl leading-[0.88] tracking-[-0.06em] md:text-8xl">
            {name}
          </h1>
        </div>

        <div className="md:col-span-4">
          <p className="font-display text-4xl leading-none">
            {formatNumber(count)} purchases
          </p>
          <p className="mt-3 text-sm text-[var(--ink-muted)]">
            {formatCurrency(dossier.behavior_profile.total_purchase_value)} total reported value
          </p>
        </div>
      </header>

      <section className="section-space border-y border-[var(--line)] bg-[var(--surface)]">
        <div className="editorial-container">
          <EvidenceFingerprint
            conviction={numberValue(signal, "conviction_score", "score")}
            purchase={numberValue(signal, "abnormality_score")}
            behavior={numberValue(signal, "behavior_change_score")}
            ownership={numberValue(
              signal,
              "ownership_score",
              "ownership_increase_percent",
            )}
            cluster={numberValue(signal, "cluster_score")}
          />
        </div>
      </section>

      <section className="section-space editorial-container">
        <p className="eyebrow">Purchase history</p>
        <BehaviorTimeline events={dossier.purchase_events} />
      </section>
    </article>
  );
}
