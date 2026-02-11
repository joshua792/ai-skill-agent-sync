import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://assetvault.dev";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard/", "/api/", "/sign-in", "/sign-up"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
