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

console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY!");
