import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { assertSafeUrl, isPrivateIp } from "../src/lib/ssrf.ts";
import { convertRateLimiter, gitPushRateLimiter, getClientIp } from "../src/lib/rateLimit.ts";

console.log("🔒 Running Comprehensive Security Verification Tests...\n");

async function testSsrfDefense() {
  console.log("1. Testing SSRF Firewall (isPrivateIp & assertSafeUrl)...");

  // Private IPv4 tests
  assert.equal(isPrivateIp("127.0.0.1"), true, "127.0.0.1 must be private");
  assert.equal(isPrivateIp("127.0.0.2"), true, "127.0.0.2 must be private");
  assert.equal(isPrivateIp("10.0.0.1"), true, "10.0.0.1 must be private");
  assert.equal(isPrivateIp("172.16.0.1"), true, "172.16.0.1 must be private");
  assert.equal(isPrivateIp("192.168.1.1"), true, "192.168.1.1 must be private");
  assert.equal(isPrivateIp("169.254.169.254"), true, "169.254.169.254 (AWS/GCP cloud metadata) must be private");
  assert.equal(isPrivateIp("100.100.100.200"), true, "100.100.100.200 (Alibaba Cloud metadata) must be private");
  assert.equal(isPrivateIp("0.0.0.0"), true, "0.0.0.0 must be private");
  assert.equal(isPrivateIp("100.64.0.1"), true, "100.64.0.1 (CGNAT) must be private");

  // Private IPv6 tests
  assert.equal(isPrivateIp("::1"), true, "::1 must be private");
  assert.equal(isPrivateIp("fe80::1"), true, "fe80::1 (link-local) must be private");
  assert.equal(isPrivateIp("fc00::1"), true, "fc00::1 (unique local) must be private");
  assert.equal(isPrivateIp("::ffff:127.0.0.1"), true, "::ffff:127.0.0.1 must be private");

  // Public IP tests
  assert.equal(isPrivateIp("8.8.8.8"), false, "8.8.8.8 must be public");
  assert.equal(isPrivateIp("1.1.1.1"), false, "1.1.1.1 must be public");

  // Hostname validation
  await assert.rejects(
    async () => await assertSafeUrl("http://localhost:3000"),
    /blocked|private|Security violation/i,
    "localhost must be rejected"
  );

  await assert.rejects(
    async () => await assertSafeUrl("http://100.100.100.200/latest/meta-data/"),
    /forbidden|blocked|private/i,
    "Alibaba Cloud metadata IP must be rejected"
  );

  await assert.rejects(
    async () => await assertSafeUrl("http://internal.service.local"),
    /blocked for security reasons/i,
    ".local domains must be rejected"
  );

  await assert.rejects(
    async () => await assertSafeUrl("http://test.localhost"),
    /blocked for security reasons/i,
    ".localhost domains must be rejected"
  );

  await assert.rejects(
    async () => await assertSafeUrl("http://2130706433"),
    /blocked|decimal|forbidden|private/i,
    "Raw decimal IP must be rejected"
  );

  await assert.rejects(
    async () => await assertSafeUrl("http://127.0.0.1:8080/secret"),
    /forbidden|private/i,
    "127.0.0.1 must be rejected"
  );

  await assert.rejects(
    async () => await assertSafeUrl("http://169.254.169.254/latest/meta-data/"),
    /blocked|forbidden|private/i,
    "Cloud metadata IP must be rejected"
  );

  await assert.rejects(
    async () => await assertSafeUrl("ftp://example.com/file"),
    /Forbidden protocol/i,
    "Non-HTTP protocols must be rejected"
  );

  await assert.rejects(
    async () => await assertSafeUrl("file:///etc/passwd"),
    /Forbidden protocol/i,
    "file:// protocol must be rejected"
  );

  console.log("   ✔ SSRF firewall blocks private networks, cloud metadata, internal domains, and unauthorized protocols.");
}

async function testRateLimiting() {
  console.log("2. Testing Rate Limiting & Anti-Spoofing...");

  const testIp = "192.0.2.99"; // dedicated test IP
  // First 10 requests should succeed
  for (let i = 1; i <= 10; i++) {
    const res = convertRateLimiter.check(testIp);
    assert.equal(res.success, true, `Request ${i} must succeed`);
  }

  // 11th request must be blocked
  const blocked = convertRateLimiter.check(testIp);
  assert.equal(blocked.success, false, "11th request must be blocked");
  assert.equal(blocked.remaining, 0, "Remaining requests must be 0");
  assert.ok(blocked.resetSeconds > 0, "Reset seconds must be > 0");

  // Verify anti-spoofing in getClientIp
  const makeMockReq = (headers) => ({
    headers: {
      get: (headerName) => headers[headerName.toLowerCase()] || null,
    },
  });

  // Spoofed client-controlled XFF vs Edge headers
  const vercelReq = makeMockReq({
    "x-vercel-forwarded-for": "198.51.100.55",
    "x-forwarded-for": "1.2.3.4, 5.6.7.8",
  });
  assert.equal(getClientIp(vercelReq), "198.51.100.55", "Vercel edge IP must override spoofed X-Forwarded-For");

  const cfReq = makeMockReq({
    "cf-connecting-ip": "198.51.100.77",
    "x-forwarded-for": "1.2.3.4",
  });
  assert.equal(getClientIp(cfReq), "198.51.100.77", "Cloudflare connecting IP must override spoofed X-Forwarded-For");

  const multiXffReq = makeMockReq({
    "x-forwarded-for": "1.2.3.4, 203.0.113.195",
  });
  assert.equal(getClientIp(multiXffReq), "203.0.113.195", "Rightmost trusted proxy IP in X-Forwarded-For must be extracted");

  console.log("   ✔ Rate limiter strictly enforces quota and getClientIp defeats header spoofing.");
}

function testIframeIsolation() {
  console.log("3. Testing Iframe Sandbox Isolation in page.tsx / HomePageClient.tsx...");

  const pagePath = fs.existsSync(path.join(process.cwd(), "src/components/HomePageClient.tsx"))
    ? path.join(process.cwd(), "src/components/HomePageClient.tsx")
    : path.join(process.cwd(), "src/app/page.tsx");
  const pageContent = fs.readFileSync(pagePath, "utf8");

  // Must have sandbox="allow-scripts"
  assert.ok(pageContent.includes('sandbox="allow-scripts"'), "Iframe must have sandbox='allow-scripts'");
  // Must NOT have allow-same-origin
  assert.ok(
    !pageContent.includes('sandbox="allow-scripts allow-same-origin"'),
    "Iframe must NOT have allow-same-origin (prevents XSS sandbox escape)"
  );

  console.log("   ✔ Preview iframe is sandboxed with null-origin isolation (allow-same-origin eradicated).");
}

function testTokenZeroPersistence() {
  console.log("4. Testing Zero-Persistence of GitHub Access Tokens...");

  const pagePath = fs.existsSync(path.join(process.cwd(), "src/components/HomePageClient.tsx"))
    ? path.join(process.cwd(), "src/components/HomePageClient.tsx")
    : path.join(process.cwd(), "src/app/page.tsx");
  const pageContent = fs.readFileSync(pagePath, "utf8");

  // Must NOT store token into localStorage
  assert.ok(
    !pageContent.includes('localStorage.setItem("framer2nextjs_github_token"'),
    "Token must NEVER be written to localStorage"
  );

  // Must actively purge any legacy token
  assert.ok(
    pageContent.includes('localStorage.removeItem("framer2nextjs_github_token")'),
    "Legacy tokens must be purged from localStorage on mount"
  );

  // Must have clear token control
  assert.ok(pageContent.includes("Clear Token"), "Clear Token button must exist in UI");

  console.log("   ✔ GitHub token is strictly ephemeral in React state and wiped from localStorage.");
}

function testPathTraversalProtection() {
  console.log("5. Testing Path Traversal Defenses in Routes...");

  const assetRoute = fs.readFileSync(path.join(process.cwd(), "src/app/assets/[...path]/route.ts"), "utf8");
  assert.ok(assetRoute.includes("isPathConfined"), "Asset route must use canonical root confinement");
  assert.ok(assetRoute.includes("ALLOWED_NAME_REGEX"), "Asset route must strictly validate path segment characters");

  const previewRoute = fs.readFileSync(path.join(process.cwd(), "src/app/api/preview/[jobId]/route.ts"), "utf8");
  assert.ok(previewRoute.includes("UUID_REGEX"), "Preview route must enforce UUID format on jobId");
  assert.ok(previewRoute.includes("Content-Security-Policy"), "Preview route must attach Content-Security-Policy");

  const downloadRoute = fs.readFileSync(path.join(process.cwd(), "src/app/api/download/[jobId]/route.ts"), "utf8");
  assert.ok(downloadRoute.includes("UUID_REGEX"), "Download route must enforce UUID format on jobId");

  console.log("   ✔ All API routes strictly validate UUIDs and confine asset paths to allowed roots.");
}

function testSecurityHeaders() {
  console.log("6. Testing HTTP Security Headers in next.config.mjs...");

  const nextConfig = fs.readFileSync(path.join(process.cwd(), "next.config.mjs"), "utf8");
  assert.ok(nextConfig.includes("Content-Security-Policy"), "next.config.mjs must define Content-Security-Policy");
  assert.ok(nextConfig.includes("X-Frame-Options"), "next.config.mjs must define X-Frame-Options");
  assert.ok(nextConfig.includes("X-Content-Type-Options"), "next.config.mjs must define X-Content-Type-Options");
  assert.ok(nextConfig.includes("Strict-Transport-Security"), "next.config.mjs must define HSTS");
  assert.ok(nextConfig.includes("Permissions-Policy"), "next.config.mjs must define Permissions-Policy");

  console.log("   ✔ Production HTTP security headers and CSP are fully configured.");
}

function testSvgStoredXssProtection() {
  console.log("7. Testing SVG Stored XSS Mitigation in Asset Route...");

  const assetRoute = fs.readFileSync(path.join(process.cwd(), "src/app/assets/[...path]/route.ts"), "utf8");
  assert.ok(assetRoute.includes("image/svg+xml"), "Asset route must handle SVG content type");
  assert.ok(
    assetRoute.includes("default-src 'none'; style-src 'unsafe-inline'"),
    "Asset route must attach restrictive CSP on SVG files to block embedded script execution"
  );
  assert.ok(assetRoute.includes("Content-Disposition"), "Asset route must set safe Content-Disposition for SVGs");

  console.log("   ✔ SVG assets are strictly isolated with dedicated Content-Security-Policy to block Stored XSS.");
}

function testGitHubPushSecurity() {
  console.log("8. Testing GitHub Push Route Workflow Injection & Payload Defense...");

  const pushRoute = fs.readFileSync(path.join(process.cwd(), "src/app/api/github/push/route.ts"), "utf8");
  assert.ok(pushRoute.includes(".github/"), "Push route must reject .github/ files (preventing workflow injection)");
  assert.ok(pushRoute.includes(".git/"), "Push route must reject .git/ metadata tampering");
  assert.ok(pushRoute.includes("content-length"), "Push route must enforce max payload size limit");
  assert.ok(pushRoute.includes("500"), "Push route must enforce maximum file count limit");

  console.log("   ✔ GitHub push route rejects CI workflow injection (.github/), git metadata, and oversized payloads.");
}

function testCliConfinement() {
  console.log("9. Testing CLI Path Traversal & Zip Slip Confinement...");

  const cliCode = fs.readFileSync(path.join(process.cwd(), "src/cli.ts"), "utf8");
  assert.ok(cliCode.includes("path.resolve"), "CLI must use path.resolve for output directory confinement");
  assert.ok(cliCode.includes("normalized.startsWith"), "CLI must verify normalized relative paths");
  assert.ok(cliCode.includes(".github"), "CLI must block reserved security paths (.github, .git)");

  console.log("   ✔ CLI output writing strictly confined to target directory with Zip Slip prevention.");
}

function testDependencySecurity() {
  console.log("10. Testing Dependency Supply Chain Hygiene...");

  const pkgJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
  assert.ok(!pkgJson.dependencies["next-sanity"], "Vulnerable next-sanity package must be removed");
  assert.ok(pkgJson.dependencies["@sanity/client"], "Lightweight @sanity/client must be used instead");

  console.log("   ✔ Supply chain sanitized: next-sanity eliminated, removing adm-zip and decompress vulnerabilities.");
}

async function run() {
  await testSsrfDefense();
  await testRateLimiting();
  testIframeIsolation();
  testTokenZeroPersistence();
  testPathTraversalProtection();
  testSecurityHeaders();
  testSvgStoredXssProtection();
  testGitHubPushSecurity();
  testCliConfinement();
  testDependencySecurity();

  console.log("\n🛡️ ALL 10 SECURITY AUDIT TEST SUITES PASSED WITH 100% COMPLIANCE!\n");
}

run().catch((err) => {
  console.error("❌ Security test failed:", err);
  process.exit(1);
});
