#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { convertSite } from "./lib/converter";

const args = process.argv.slice(2);
const url = args[0];

if (!url || url === "-h" || url === "--help") {
  console.log(`
Framer2NextJS — Convert published Framer sites to 100% fidelity Next.js projects

Usage:
  npx framer2nextjs <url> [options]

Arguments:
  <url>               Published Framer site URL (e.g. https://portfolio.framer.website)

Options:
  -o, --out <dir>     Output directory (default: ./framer-export)
  --max-pages <n>     Max pages to crawl (default: 20)
  -h, --help          Show help
  `);
  process.exit(url ? 0 : 1);
}

let outDir = "./framer-export";
const outIdx = args.indexOf("-o") !== -1 ? args.indexOf("-o") : args.indexOf("--out");
if (outIdx !== -1 && args[outIdx + 1]) {
  outDir = args[outIdx + 1];
}

async function main() {
  console.log(`\n🚀 Framer2NextJS: Converting ${url}...\n`);

  try {
    const report = await convertSite(url, {}, (msg) => {
      console.log(`  • ${msg}`);
    });

    const targetDir = path.resolve(process.cwd(), outDir);
    console.log(`\nWriting project files to ${targetDir}...`);

    for (const f of report.files) {
      const fullPath = path.join(targetDir, f.path);
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
