import * as cheerio from "cheerio";

export function detectFramer($: cheerio.CheerioAPI): { isFramer: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const generator = $('meta[name="generator"]').attr("content") || "";

  if (/framer/i.test(generator)) reasons.push(`generator meta = ${generator}`);
  if ($('meta[name="framer-search-index"]').length) reasons.push("framer-search-index meta tag");
  if ($("script[data-framer-bundle]").length) reasons.push("data-framer-bundle script tag");
  if ($("[data-framer-appear-id]").length) reasons.push("data-framer-appear-id attributes");
  if ($("style[data-framer-css-ssr-minified]").length) reasons.push("framer SSR minified CSS");
  if ($('script[src*="events.framer.com"]').length) reasons.push("framer events telemetry script");
  if ($('script[src*="framerusercontent.com"]').length) reasons.push("framerusercontent bundle scripts");
  if ($("#main").length) reasons.push("#main element container");

  return {
    isFramer: reasons.length >= 1, // Any confirmed Framer signature
    reasons,
  };
}

export function extractMeta($: cheerio.CheerioAPI) {
  return {
    title: $("title").first().text().trim(),
    description: $('meta[name="description"]').attr("content") || "",
    lang: $("html").attr("lang") || "en",
    canonical: $('link[rel="canonical"]').attr("href") || "",
    viewport: $('meta[name="viewport"]').attr("content") || "width=device-width, initial-scale=1",
    favicon: $('link[rel="icon"]').attr("href") || $('link[rel="shortcut icon"]').attr("href") || "",
    ogTitle: $('meta[property="og:title"]').attr("content") || "",
    ogDescription: $('meta[property="og:description"]').attr("content") || "",
    ogImage: $('meta[property="og:image"]').attr("content") || "",
    searchIndexUrl: $('meta[name="framer-search-index"]').attr("content") || "",
  };
}

export function collectStyleText($: cheerio.CheerioAPI): string {
  let css = "";
  $("style").each((_, el) => {
    css += "\n" + ($(el).html() || "");
  });
  return css;
}
