import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Libraryyy",
    short_name: "Libraryyy",
    description:
      "Your University Course Library — courses, presentations, resources, and more.",
    start_url: "/",
    display: "standalone",
    background_color: "#5227FF",
    theme_color: "#5227FF",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
