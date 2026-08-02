import type { ReactNode } from "react";
import type { SearchItemData } from "@/types/home";
import { AmbientLayer } from "@/components/shell/ambient-layer";
import { RouteAnnouncer } from "@/components/shell/route-announcer";
import { SiteFooter } from "@/components/shell/site-footer";
import { SiteHeader } from "@/components/shell/site-header";

export function AppShell({
  children,
  searchItems,
}: {
  children: ReactNode;
  searchItems: SearchItemData[];
}) {
  return (
    <div className="min-h-screen">
      <a
        href="#main-content"
        className="skip-link"
      >
        Skip to content
      </a>
      <AmbientLayer />
      <RouteAnnouncer />
      <SiteHeader searchItems={searchItems} />
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
