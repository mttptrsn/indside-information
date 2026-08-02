"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

function routeLabel(pathname: string): string {
  if (pathname === "/") return "Home";
  return pathname
    .split("/")
    .filter(Boolean)
    .map((part) =>
      part
        .replaceAll("-", " ")
        .replace(/\b\w/g, (character) => character.toUpperCase()),
    )
    .join(", ");
}

export function RouteAnnouncer() {
  const pathname = usePathname();
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAnnouncement(`${routeLabel(pathname)} page loaded`);
    }, 50);

    return () => window.clearTimeout(timer);
  }, [pathname]);

  return (
    <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {announcement}
    </p>
  );
}
