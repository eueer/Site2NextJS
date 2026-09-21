import assert from "node:assert";
import { processDocument, CANONICAL_SCRIPT } from "../src/lib/transform.ts";
import { routeHandler, getScaffoldFiles } from "../src/lib/generator.ts";
import { createProjectZip } from "../src/lib/zip.ts";
import { detectFramer } from "../src/lib/detector.ts";
import * as cheerio from "cheerio";

console.log("▶ Running Framer2NextJS Unit & Integration Tests...");

// 1. Test Framer Detection
const sampleFramerHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta name="generator" content="Framer 12345">
  <meta name="framer-search-index" content="https://example.com/search.json">
  <link rel="canonical" href="https://example.framer.website/">
</head>
<body>
  <div id="main">
    <!--$-->
    <div data-framer-appear-id="hero-1">
      <img src="https://framerusercontent.com/images/sample.png" width="800" height="600" />
      <a href="https://twitter.com/test"><svg></svg></a>
      <iframe src="https://www.youtube.com/embed/xyz"></iframe>
    </div>
    <!--/$-->
    <div id="__framer-badge-container">Made with Framer</div>
  </div>
  <script src="https://events.framer.com/script.js"></script>
</body>
</html>
`;

const $ = cheerio.load(sampleFramerHtml);
const detection = detectFramer($);
assert.strictEqual(detection.isFramer, true, "Should accurately detect Framer signatures");
console.log("✔ Framer detection passed");

// 2. Test DOM Transformation & Comment Node Preservation
const assetMap = new Map([
  ["https://framerusercontent.com/images/sample.png", "/assets/img/sample.webp"],
]);

const processedHtml = processDocument(sampleFramerHtml, "/", assetMap);

assert.ok(processedHtml.includes("<!--$-->"), "Must preserve React Suspense comment markers");
assert.ok(processedHtml.includes("<!--/$-->"), "Must preserve React Suspense closing markers");
assert.ok(processedHtml.includes("/assets/img/sample.webp"), "Must rewrite image URLs to local WebP");
assert.ok(!processedHtml.includes("__framer-badge-container"), "Must strip Framer badge");
assert.ok(!processedHtml.includes("events.framer.com"), "Must strip Framer tracking beacons");
assert.ok(processedHtml.includes('role="main"'), "Must inject main landmark");
assert.ok(processedHtml.includes('title="Video player"'), "Must inject title for video iframes");
assert.ok(processedHtml.includes('aria-label="Twitter"'), "Must inject aria-label for unlabeled social links");
assert.ok(processedHtml.includes('rel="canonical" href="/"'), "Must repoint canonical to relative path");

console.log("✔ DOM transform, SEO, and accessibility enhancement passed");

// 3. Test Next.js App Router Route Handler Generator
const handlerCode = routeHandler(processedHtml);
assert.ok(handlerCode.includes('export const dynamic = "force-static";'), "Route handler must be force-static");
assert.ok(handlerCode.includes("export function GET()"), "Route handler must export GET");
assert.ok(handlerCode.includes("<!--$-->"), "Generated handler must include the preserved HTML comment markers");
console.log("✔ Route handler generation passed");

// 4. Test Project Scaffolding
const scaffold = getScaffoldFiles("test-site", "https://test.framer.website", 1);
const paths = scaffold.map((f) => f.path);
assert.ok(paths.includes("package.json"), "Must include package.json");
assert.ok(paths.includes("next.config.js"), "Must include next.config.js");
assert.ok(paths.includes("tsconfig.json"), "Must include tsconfig.json");
assert.ok(paths.includes("vercel.json"), "Must include vercel.json");
assert.ok(paths.includes("_headers"), "Must include _headers for Netlify/Cloudflare");
console.log("✔ Project scaffold generation passed");

// 5. Test ZIP Generation
const filesToZip = [
  { path: "app/route.ts", content: handlerCode },
  ...scaffold,
  { path: "public/assets/img/sample.webp", binary: Buffer.from("fake-webp-binary") },
];

const zipBuffer = await createProjectZip(filesToZip);
assert.ok(zipBuffer.length > 0, "ZIP buffer must be non-empty");
console.log(`✔ JSZip archive generation passed (${zipBuffer.length} bytes generated)`);

// 6. Test Universal Platform Detection
const sampleWebflowHtml = `<!DOCTYPE html><html data-wf-page="123" data-wf-site="456"><head><title>Webflow</title></head><body><h1>Webflow Site</h1></body></html>`;
const sampleWpHtml = `<!DOCTYPE html><html><head><meta name="generator" content="WordPress 6.4"></head><body><h1>WP Site</h1></body></html>`;
const sampleGenericHtml = `<!DOCTYPE html><html><head><title>Custom Portfolio</title><link rel="stylesheet" href="/styles/main.css"><script src="/scripts/app.js"></script></head><body><img src="/images/hero.jpg" width="800" height="450" /></body></html>`;

import { detectPlatform } from "../src/lib/detector.ts";
import { resolveRelativeAssets } from "../src/lib/transform.ts";

const webflowDetect = detectPlatform(cheerio.load(sampleWebflowHtml));
assert.strictEqual(webflowDetect.platform, "webflow", "Should accurately detect Webflow platform");

const wpDetect = detectPlatform(cheerio.load(sampleWpHtml));
assert.strictEqual(wpDetect.platform, "wordpress", "Should accurately detect WordPress platform");

const genericDetect = detectPlatform(cheerio.load(sampleGenericHtml));
assert.strictEqual(genericDetect.platform, "html", "Should identify standard HTML platform without throwing");
assert.strictEqual(genericDetect.isFramer, false, "Generic HTML is not Framer");
console.log("✔ Universal platform detection passed (Framer, Webflow, WordPress, HTML)");

// 7. Test Generic HTML DOM Transform & Relative Asset Resolution
const genericAssetMap = new Map([
  ["https://my-site.com/images/hero.jpg", "/assets/img/hero.webp"],
]);
const processedGeneric = processDocument(
  sampleGenericHtml,
  "/",
  genericAssetMap,
  "https://my-site.com",
  false
);

assert.ok(processedGeneric.includes("/assets/img/hero.webp"), "Should rewrite generic images to WebP");
assert.ok(processedGeneric.includes('href="https://my-site.com/styles/main.css"'), "Should resolve relative stylesheet links to origin");
assert.ok(processedGeneric.includes('src="https://my-site.com/scripts/app.js"'), "Should resolve relative script links to origin");
assert.ok(processedGeneric.includes('fetchpriority="high"'), "Should prioritize LCP hero image on generic sites");
assert.ok(!processedGeneric.includes("framerusercontent.com"), "Should not inject Framer CDN preconnect on generic sites");
console.log("✔ Generic HTML transformation and relative asset resolution passed");

console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY!");
