#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { convertSite } from "./lib/converter";

const args = process.argv.slice(2);
const url = args[0];

if (!url || url === "-h" || url === "--help") {
  console.log(`
Site2NextJS / Framer2NextJS — Convert Framer, Webflow, or any website to 100% fidelity Next.js projects

Usage:
  npx framer2nextjs <url> [options]

Arguments:
  <url>               Published site URL (e.g. https://portfolio.framer.website or https://example.com)

Options:
  -o, --out <dir>     Output directory (default: ./site-export)
  --max-pages <n>     Max pages to crawl (default: 20)
  -h, --help          Show help
  `);
  process.exit(url ? 0 : 1);
}

let outDir = "./site-export";
const outIdx = args.indexOf("-o") !== -1 ? args.indexOf("-o") : args.indexOf("--out");
if (outIdx !== -1 && args[outIdx + 1]) {
  outDir = args[outIdx + 1];
}

async function main() {
  console.log(`\n🚀 Site2NextJS: Converting ${url}...\n`);

  try {
    const report = await convertSite(url, {}, (msg) => {
      console.log(`  • ${msg}`);
    });

    const targetDir = path.resolve(process.cwd(), outDir);
    console.log(`\nWriting project files to ${targetDir}...`);

    for (const f of report.files) {
      if (!f.path || f.path.startsWith("/") || f.path.startsWith("\\")) {
        console.warn(`  ⚠ Skipping file with absolute path: ${f.path}`);
        continue;
      }
      const normalized = path.normalize(f.path);
      if (normalized.startsWith("..") || normalized.includes(`..${path.sep}`)) {
        console.warn(`  ⚠ Skipping path traversal candidate: ${f.path}`);
        continue;
      }
      if (
        normalized.startsWith(".github") ||
        normalized.startsWith(".git")
      ) {
        console.warn(`  ⚠ Skipping reserved security path: ${f.path}`);
        continue;
      }

      const fullPath = path.resolve(targetDir, f.path);
      if (!fullPath.startsWith(targetDir + path.sep)) {
        console.warn(`  ⚠ Path traversal blocked: ${f.path}`);
        continue;
      }

      fs.mkdirSync(path.dirname(fullPath), { recursive: true });

      if (typeof f.content === "string") {
        fs.writeFileSync(fullPath, f.content);
      } else if (f.binary) {
        fs.writeFileSync(fullPath, f.binary);
      }
    }

    console.log(`\n✔ Done! Wrote ${report.files.length} files to ${outDir}`);
    console.log(`  Pages converted: ${report.pages.length}`);
    console.log(`\nNext steps:`);
    console.log(`  cd ${outDir}`);
    console.log(`  npm install`);
    console.log(`  npm run dev\n`);
  } catch (err: unknown) {
    console.error(`\n❌ Error:`, err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
