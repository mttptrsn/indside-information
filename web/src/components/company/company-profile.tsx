import { Check } from "lucide-react";
import { BehaviorTimeline } from "@/components/visuals/behavior-timeline";
import { BuyerConvergence } from "@/components/visuals/buyer-convergence";
import { CompanyPriceStory } from "@/components/visuals/company-price-story";
import { EvidenceFingerprint } from "@/components/visuals/evidence-fingerprint";
import { OwnershipDelta } from "@/components/visuals/ownership-delta";
import { FilingEvidence } from "@/components/interior/filing-evidence";
import {
  companyHeadline,
  evidenceSummary,
  whyItIsUnusual,
} from "@/lib/narrative";
import { numberValue, text } from "@/lib/record";
import type {
  CompanyDossier,
  CompanyIndexItem,
  CompanyStoryData,
} from "@/types/interior";

export function CompanyProfile({
  dossier,
  story,
}: {
  dossier: CompanyDossier;
  story: CompanyStoryData;
  related: CompanyIndexItem[];
}) {
  const company = dossier.company;
  const signal =
    dossier.latest_event_signal ??
    dossier.current_signal ??
    {};
  const ticker = text(
    company,
    "primary_ticker",
    "ticker",
    "yf_ticker",
  );
  const name =
    text(
      company,
      "company_name",
      "issuer_name",
    ) || ticker;
  const headline = companyHeadline(signal, name);
  const unusual = whyItIsUnusual(signal);
  const evidence = evidenceSummary(signal);

  return (
    <article>
      <header className="editorial-container grid min-h-[48svh] gap-10 py-14 md:grid-cols-12 md:items-end md:py-20">
        <div className="md:col-span-8">
          <p className="eyebrow">
            {ticker} · {name}
          </p>

          <h1 className="mt-6 max-w-[12ch] font-display text-6xl leading-[0.88] tracking-[-0.06em] md:text-8xl">
            {headline}
          </h1>
        </div>

        <div className="md:col-span-4">
          <p className="text-lg leading-8 text-[var(--ink-muted)]">
            {unusual}
          </p>
        </div>
      </header>

      <section className="section-space border-y border-[var(--line)] bg-[var(--surface)]">
        <div className="editorial-container grid gap-10 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-center">
          <EvidenceFingerprint
            conviction={numberValue(
              signal,
              "conviction_score",
              "score",
            )}
            purchase={numberValue(
              signal,
              "abnormality_score",
            )}
            behavior={numberValue(
              signal,
              "behavior_change_score",
            )}
            ownership={numberValue(
              signal,
              "ownership_score",
              "ownership_increase_percent",
            )}
            cluster={numberValue(
              signal,
              "cluster_score",
            )}
          />

          <div className="space-y-4">
            {evidence.map((item) => (
              <div
                key={item}
                className="flex items-start gap-3"
              >
                <Check className="mt-1 size-4 shrink-0" />

                <p className="text-lg leading-7">
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-space editorial-container">
        <p className="eyebrow">
          Where executives bought
        </p>

        <h2 className="mt-5 mb-10 max-w-[13ch] font-display text-5xl leading-[0.94] tracking-[-0.05em] md:text-7xl">
          Price history turns each disclosure into context.
        </h2>

        <CompanyPriceStory story={story} />
      </section>

      <section className="section-space border-y border-[var(--line)] bg-[var(--surface)]">
        <div className="editorial-container">
          <p className="eyebrow">
            Behavior over time
          </p>

          <BehaviorTimeline
            events={dossier.purchase_events}
          />
        </div>
      </section>

      <section className="section-space editorial-container">
        <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="eyebrow">
              Ownership changed
            </p>

            <OwnershipDelta
              before={numberValue(
                signal,
                "holdings_before",
                "shares_owned_before",
              )}
              after={numberValue(
                signal,
                "holdings_after",
                "shares_owned_after",
              )}
              percent={numberValue(
                signal,
                "ownership_increase_percent",
              )}
            />
          </div>

          <div>
            <p className="eyebrow">
              Who else bought?
            </p>

            <BuyerConvergence
              center={ticker || name}
              buyers={dossier.buyers}
            />
          </div>
        </div>
      </section>

      <section className="section-space border-t border-[var(--line)]">
        <div className="editorial-container">
          <p className="eyebrow">
            Source filings
          </p>

          <FilingEvidence
            transactions={
              dossier.qualifying_transactions
            }
          />
        </div>
      </section>
    </article>
  );
}
