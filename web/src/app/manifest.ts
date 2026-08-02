import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Inside Information",
    short_name: "Inside Information",
    description:
      "Public insider buying disclosures organized into evidence hidden in plain sight.",
    start_url: "/",
    display: "standalone",
    background_color: "#f2efe8",
    theme_color: "#151514",
  };
}
