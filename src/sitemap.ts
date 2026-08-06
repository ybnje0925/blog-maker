export const guideSlugs = [
  "before-publishing-ai-draft",
  "add-personal-experience",
  "keep-my-tone",
  "ai-like-sentences",
  "many-photos-flow",
  "good-title-vs-clickbait",
  "short-thumbnail-copy",
  "avoid-ad-like-thumbnail",
  "how-far-use-ai-tool",
  "final-checklist",
  "restaurant-review-must-add",
  "product-review-human-judgment",
];

export const staticSiteRoutes = [
  "/",
  "/guide",
  "/about",
  "/privacy",
  "/terms",
  "/contact",
  "/copyright",
  "/ai-policy",
];

export const guideRoutes = guideSlugs.map((slug) => `/guide/${slug}`);

export const siteRoutes = [...staticSiteRoutes, ...guideRoutes];

export function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/$/, "");
}

export function buildAbsoluteUrl(baseUrl: string, route: string) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const normalizedRoute = route.startsWith("/") ? route : `/${route}`;
  return `${normalizedBaseUrl}${normalizedRoute}`;
}

export function buildSitemapXml(baseUrl: string) {
  const urls = siteRoutes
    .map((route) => `  <url>\n    <loc>${buildAbsoluteUrl(baseUrl, route)}</loc>\n  </url>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function buildRobotsTxt(baseUrl: string) {
  return `User-agent: *\nAllow: /\n\nSitemap: ${buildAbsoluteUrl(baseUrl, "/sitemap.xml")}\n`;
}
