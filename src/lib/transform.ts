import * as cheerio from "cheerio";
import { ensureFontDisplaySwap, removeFontPreconnects } from "./fonts";
import { rewriteImageRefs } from "./images";

export const CANONICAL_SCRIPT = `<script>(function(){try{var u=location.origin+location.pathname;var c=document.querySelector('link[rel="canonical"]');if(c)c.setAttribute('href',u);var g=document.querySelector('meta[property="og:url"]');if(g)g.setAttribute('content',u);}catch(e){}})();</script>`;

export function boostLcpImage($: cheerio.CheerioAPI) {
  const imgs = $("img").toArray();
  const hero = imgs.find((el) => {
    const $el = $(el);
    const w = parseInt($el.attr("width") || "0", 10);
    const ref = ($el.attr("src") || "") + ($el.attr("srcset") || "");
    return /framerusercontent\.com\/images\//.test(ref) && (w >= 400 || w === 0);
  });

  if (!hero) return;
  const ref = ($(hero).attr("src") || "") + ($(hero).attr("srcset") || "");
  const m = ref.match(/framerusercontent\.com\/images\/([A-Za-z0-9]+)[.?]/);
  if (!m) return;
  const id = m[1];

  $("img").each((_, el) => {
    const $el = $(el);
    const s = ($el.attr("src") || "") + ($el.attr("srcset") || "");
    if (s.includes(id)) {
      $el.attr("fetchpriority", "high");
      if ($el.attr("loading") === "lazy") $el.removeAttr("loading");
    }
  });
}

export function deferOffscreenMedia($: cheerio.CheerioAPI) {
  $("img").each((_, el) => {
    const $el = $(el);
    if ($el.attr("fetchpriority") === "high") return;
    if (!$el.attr("loading")) $el.attr("loading", "lazy");
    if (!$el.attr("decoding")) $el.attr("decoding", "async");
  });

  $("iframe").each((_, el) => {
    const $el = $(el);
    if (!$el.attr("loading")) $el.attr("loading", "lazy");
  });
}

export function ensureHtmlLang($: cheerio.CheerioAPI) {
  if (!$("html").attr("lang")) $("html").attr("lang", "en");
}

export function ensureIframeTitles($: cheerio.CheerioAPI) {
  $("iframe").each((_, el) => {
    const $el = $(el);
    if ($el.attr("title")) return;
    const src = $el.attr("src") || "";
    let label = "Embedded content";
    if (/vimeo\.com|youtube\.com|youtu\.be|wistia\.com/i.test(src)) label = "Video player";
    else if (/spotify\.com|soundcloud\.com/i.test(src)) label = "Audio player";
    else if (/google\.com\/maps|maps\.google/i.test(src)) label = "Map";
    $el.attr("title", label);
  });
}

export function ensureMainLandmark($: cheerio.CheerioAPI) {
  if ($('[role="main"], main').length > 0) return;
  const candidate = $("body > div#main");
  if (candidate.length === 1) candidate.attr("role", "main");
}

const KNOWN_LINK_HOSTS: [RegExp, string][] = [
  [/instagram\.com/i, "Instagram"],
  [/(twitter|x)\.com/i, "Twitter"],
  [/facebook\.com/i, "Facebook"],
  [/linkedin\.com/i, "LinkedIn"],
  [/youtube\.com|youtu\.be/i, "YouTube"],
  [/tiktok\.com/i, "TikTok"],
  [/github\.com/i, "GitHub"],
  [/behance\.net/i, "Behance"],
  [/dribbble\.com/i, "Dribbble"],
  [/pinterest\.com/i, "Pinterest"],
];

export function fixUnlabeledLinks($: cheerio.CheerioAPI) {
  $("a").each((_, el) => {
    const $el = $(el);
    const hasVisibleText = ($el.text() || "").trim().length > 0;
    const hasLabel = $el.attr("aria-label") || $el.attr("aria-labelledby") || $el.attr("title");
    const hasImgAlt = $el.find("img[alt]").filter((_, im) => ($(im).attr("alt") || "").trim() !== "").length > 0;

    if (hasVisibleText || hasLabel || hasImgAlt) return;

    const href = ($el.attr("href") || "").trim();
    const innerHtml = $el.html() || "";
    let label = "";

    if (/^(\.?\/?#home|\.?\/?)$/i.test(href) || /data-framer-name="Logo"/i.test(innerHtml)) {
      label = "Home";
    } else if (href.startsWith("mailto:")) {
      label = "Email";
    } else if (href.startsWith("tel:")) {
      label = "Phone";
    } else {
      const known = KNOWN_LINK_HOSTS.find(([re]) => re.test(href));
      if (known) label = known[1];
    }

    if (label) $el.attr("aria-label", label);
  });
}

export function removeBadgesAndTrackers($: cheerio.CheerioAPI) {
  const badgeSel = [
    "#__framer-badge-container",
    ".framer-badge-container",
    ".framer-badge",
    "[data-framer-badge]",
    'a[href*="framer.com/?via"]',
    'a[href^="https://www.framer.com/?via"]',
  ].join(",");

  $(badgeSel).remove();

  $("a").each((_, el) => {
    const txt = $(el).text().trim().toLowerCase();
    if (txt === "made in framer" || txt === "made with framer") {
      $(el).remove();
    }
  });

  // Remove Framer tracking telemetry
  $('script[src^="https://events.framer.com/"]').remove();
}

export function processDocument(html: string, route: string, assetMap: Map<string, string>): string {
  const $ = cheerio.load(html);
  const path = route || "/";

  // Repoint canonical and og:url to relative path
  $('link[rel="canonical"]').each((_, el) => {
    $(el).attr("href", path);
  });
  $('meta[property="og:url"]').each((_, el) => {
    $(el).attr("content", path);
  });
  if (!$('link[rel="canonical"]').length) {
    $("head").append(`<link rel="canonical" href="${path}">`);
  }

  // Optimize LCP & offscreen media
  boostLcpImage($);
  deferOffscreenMedia($);

  // Remap assets
  if (assetMap.size) {
    rewriteImageRefs($, assetMap);
  }

  // Optimize fonts
  ensureFontDisplaySwap($);
  removeFontPreconnects($);

  // Fix SEO & Accessibility
  ensureHtmlLang($);
  ensureIframeTitles($);
  ensureMainLandmark($);
  fixUnlabeledLinks($);

  // Clean up Framer badges & tracking beacons
  removeBadgesAndTrackers($);

  // Preconnect to Framer CDN for fast chunk loading
  $("head").prepend('<link rel="preconnect" href="https://framerusercontent.com">');

  // Dynamic canonical upgrader script
  $("head").append(CANONICAL_SCRIPT);

  return $.html();
}
