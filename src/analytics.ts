type AnalyticsParams = Record<string, string | number | boolean | undefined>;

const GA_ID = (import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined)?.trim();
const CLARITY_ID = (import.meta.env.VITE_CLARITY_PROJECT_ID as string | undefined)?.trim();
const analyticsEnabled = import.meta.env.PROD;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    clarity?: (...args: unknown[]) => void;
  }
}

function appendScript(src: string, id: string) {
  if (document.getElementById(id)) return;
  const script = document.createElement("script");
  script.id = id;
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

function sanitizeParams(params: AnalyticsParams = {}) {
  const safe: AnalyticsParams = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined) return;
    if (/api|key|token|secret|content|request|prompt|file|pdf|image|photo/i.test(key)) return;
    safe[key] = value;
  });
  return safe;
}

export function initAnalytics() {
  if (!analyticsEnabled || typeof window === "undefined") return;

  if (GA_ID) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtagShim(...args: unknown[]) {
      window.dataLayer?.push(args);
    };
    window.gtag("js", new Date());
    window.gtag("config", GA_ID, { send_page_view: false });
    appendScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`, "blogdraft-ga4");
  }

  if (CLARITY_ID && !document.getElementById("blogdraft-clarity")) {
    const script = document.createElement("script");
    script.id = "blogdraft-clarity";
    script.textContent = `
      (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
      })(window, document, "clarity", "script", ${JSON.stringify(CLARITY_ID)});
    `;
    document.head.appendChild(script);
  }
}

export function trackPageView(path: string, title: string) {
  if (!analyticsEnabled || !GA_ID || typeof window.gtag !== "function") return;
  window.gtag("event", "page_view", {
    page_path: path,
    page_title: title,
    page_location: window.location.href,
  });
}

export function trackEvent(name: string, params?: AnalyticsParams) {
  if (!analyticsEnabled || typeof window.gtag !== "function") return;
  window.gtag("event", name, sanitizeParams(params));
}
