import Link from "next/link";
import { safeText } from "@/lib/visual";

export function BuyerConvergence({
  center,
  buyers,
}: {
  center: string;
  buyers: Array<Record<string, unknown>>;
}) {
  const visible = buyers.slice(0, 6).map((buyer, index) => {
    const ownerCik = safeText(buyer.owner_cik, safeText(buyer.insider_id));
    return {
      key: `${ownerCik || "buyer"}-${index}`,
      name: safeText(buyer.owner_name, safeText(buyer.display_name, "Executive")),
      role: safeText(
        buyer.normalized_roles,
        safeText(buyer.raw_officer_title, "Role unavailable"),
      ),
      href: ownerCik ? `/insiders/${ownerCik.toLowerCase()}` : "",
    };
  });

  return (
    <div className="relative grid gap-5 md:grid-cols-[1fr_auto_1fr] md:items-center">
      <div className="space-y-3">
        {visible
          .filter((_, index) => index % 2 === 0)
          .map((buyer) => {
            const { key, ...props } = buyer;

            return <Buyer key={key} {...props} />;
          })}
      </div>

      <div className="relative flex min-h-56 items-center justify-center">
        <span className="absolute inset-x-0 h-px bg-[var(--line-strong)]" />
        <div className="relative z-10 flex size-40 items-center justify-center rounded-full border-4 border-[var(--accent)] bg-[var(--canvas)] p-5 text-center">
          <span className="font-display text-3xl leading-none">{center}</span>
        </div>
      </div>

      <div className="space-y-3">
        {visible
          .filter((_, index) => index % 2 === 1)
          .map((buyer) => {
            const { key, ...props } = buyer;

            return <Buyer key={key} {...props} />;
          })}
      </div>
    </div>
  );
}

function Buyer({
  name,
  role,
  href,
}: {
  name: string;
  role: string;
  href: string;
}) {
  const content = (
    <div className="border-l-4 border-[var(--ink)] bg-[var(--surface)] px-5 py-4">
      <p className="font-display text-2xl leading-none">{name}</p>
      <p className="mt-2 text-sm text-[var(--ink-muted)]">{role}</p>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
