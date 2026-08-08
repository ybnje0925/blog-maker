import { useEffect } from "react";

export type StructuredData = Record<string, unknown>;

export interface SeoProps {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
  image?: string;
  noindex?: boolean;
  structuredData?: StructuredData | StructuredData[];
}

const SITE_NAME = "BlogDraft";
const DEFAULT_OG_IMAGE = "/og-blogdraft.png";

export function getClientBaseUrl() {
  const envBaseUrl = (import.meta.env.VITE_SITE_URL || import.meta.env.VITE_BASE_URL) as string | undefined;
  if (envBaseUrl?.trim()) return envBaseUrl.trim().replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

export function absoluteUrl(path: string, baseUrl = getClientBaseUrl()) {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

function setMeta(selector: string, create: () => HTMLMetaElement, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = create();
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

function setLink(rel: string, href: string) {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", rel);
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
}

export function SEO({
  title,
  description,
  path,
  type = "website",
  image = DEFAULT_OG_IMAGE,
  noindex = false,
  structuredData,
}: SeoProps) {
  useEffect(() => {
    const canonical = absoluteUrl(path);
    const imageUrl = absoluteUrl(image);

    document.documentElement.lang = "ko";
    document.title = title;
    setLink("canonical", canonical);

    setMeta('meta[name="description"]', () => {
      const meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      return meta;
    }, description);

    setMeta('meta[name="robots"]', () => {
      const meta = document.createElement("meta");
      meta.setAttribute("name", "robots");
      return meta;
    }, noindex ? "noindex,follow" : "index,follow");

    const ogValues: Record<string, string> = {
      "og:site_name": SITE_NAME,
      "og:title": title,
      "og:description": description,
      "og:type": type,
      "og:url": canonical,
      "og:image": imageUrl,
    };

    Object.entries(ogValues).forEach(([property, content]) => {
      setMeta(`meta[property="${property}"]`, () => {
        const meta = document.createElement("meta");
        meta.setAttribute("property", property);
        return meta;
      }, content);
    });

    const twitterValues: Record<string, string> = {
      "twitter:card": "summary_large_image",
      "twitter:title": title,
      "twitter:description": description,
      "twitter:image": imageUrl,
    };

    Object.entries(twitterValues).forEach(([name, content]) => {
      setMeta(`meta[name="${name}"]`, () => {
        const meta = document.createElement("meta");
        meta.setAttribute("name", name);
        return meta;
      }, content);
    });

    document.getElementById("blogdraft-jsonld")?.remove();
    if (structuredData) {
      const script = document.createElement("script");
      script.id = "blogdraft-jsonld";
      script.type = "application/ld+json";
      script.textContent = JSON.stringify(structuredData);
      document.head.appendChild(script);
    }
  }, [description, image, noindex, path, structuredData, title, type]);

  return null;
}
