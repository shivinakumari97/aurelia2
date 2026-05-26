import type { MetadataRoute } from "next";

// PWA manifest — enables installable web app / mobile (PWA wrapper) deployment.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Aurelia — Event Operating System",
    short_name: "Aurelia",
    description: "The AI-native operating system for modern event companies.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0B0A08",
    theme_color: "#0B0A08",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
