import dns from "node:dns/promises";
import net from "node:net";

// Blocked hostnames for cloud metadata or internal services
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.goog",
  "instance-data",
]);

/**
 * Check whether an IPv4 address is in a private/reserved/loopback range.
 */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((n) => isNaN(n) || n < 0 || n > 255)) {
    return true; // Malformed IPv4 is treated as unsafe
  }

  const [a, b, c] = parts;

  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;

  // 10.0.0.0/8 (Private)
  if (a === 10) return true;

  // 100.64.0.0/10 (Shared Address Space / CGNAT)
  if (a === 100 && b >= 64 && b <= 127) return true;

  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;

  // 169.254.0.0/16 (Link-local / Cloud metadata AWS/GCP/Azure)
  if (a === 169 && b === 254) return true;

  // 172.16.0.0/12 (Private)
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.0.0.0/24 (IETF Protocol Assignments)
  if (a === 192 && b === 0 && c === 0) return true;

  // 192.0.2.0/24 (TEST-NET-1)
  if (a === 192 && b === 0 && c === 2) return true;

  // 192.88.99.0/24 (6to4 Relay)
  if (a === 192 && b === 88 && c === 99) return true;

  // 192.168.0.0/16 (Private)
  if (a === 192 && b === 168) return true;

  // 198.18.0.0/15 (Network benchmark tests)
  if (a === 198 && (b === 18 || b === 19)) return true;

  // 198.51.100.0/24 (TEST-NET-2)
  if (a === 198 && b === 51 && c === 100) return true;

  // 203.0.113.0/24 (TEST-NET-3)
  if (a === 203 && b === 0 && c === 113) return true;

  // 224.0.0.0/4 (Multicast)
  if (a >= 224 && a <= 239) return true;

  // 240.0.0.0/4 (Reserved)
  if (a >= 240) return true;

  return false;
}

/**
 * Check whether an IPv6 address is in a private/reserved/loopback range.
 */
function isPrivateIPv6(ip: string): boolean {
  const clean = ip.toLowerCase().trim();

  // Loopback & Unspecified
  if (clean === "::1" || clean === "::") return true;

  // IPv4-mapped IPv6 (::ffff:x.x.x.x)
  if (clean.startsWith("::ffff:")) {
    const v4 = clean.slice(7);
    if (net.isIPv4(v4)) {
      return isPrivateIPv4(v4);
    }
    return true;
  }

  // Unique Local Address (fc00::/7 -> fc00... to fdff...)
  if (/^f[cd][0-9a-f]{2}:/i.test(clean)) return true;

  // Link-Local Unicast (fe80::/10 -> fe80... to febf...)
  if (/^fe[89ab][0-9a-f]:/i.test(clean)) return true;

  // Multicast (ff00::/8)
  if (clean.startsWith("ff")) return true;

  // IPv4/IPv6 translation (64:ff9b::/96)
  if (clean.startsWith("64:ff9b:")) return true;

  return false;
}

/**
 * Determine if an IP address is private, reserved, loopback, or metadata.
 */
export function isPrivateIp(ip: string): boolean {
  const version = net.isIP(ip);
  if (version === 4) {
    return isPrivateIPv4(ip);
  }
  if (version === 6) {
    return isPrivateIPv6(ip);
  }
  return true; // Not a valid IP -> treat as unsafe
}

/**
 * Validates a target URL against SSRF vulnerabilities:
 * - Scheme must be http or https
 * - Hostname cannot be a blocked cloud metadata or local domain
 * - Resolved DNS addresses cannot map to private, loopback, or reserved IP ranges
 */
export async function assertSafeUrl(urlInput: string | URL): Promise<URL> {
  const parsed = typeof urlInput === "string" ? new URL(urlInput) : urlInput;

  // 1. Only allow HTTP and HTTPS
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Forbidden protocol: ${parsed.protocol}. Only http: and https: are permitted.`);
  }

  const hostname = parsed.hostname.toLowerCase();

  // 2. Reject empty hostname or known blocked hostnames
  if (!hostname) {
    throw new Error("Invalid URL: missing hostname.");
  }

  if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    throw new Error(`Access to ${hostname} is blocked for security reasons.`);
  }

  // 3. If hostname is a raw IP literal, check it directly
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new Error(`Direct connection to private/reserved IP address ${hostname} is forbidden.`);
    }
    return parsed;
  }

  // 4. Resolve DNS records and verify all resolved addresses
  try {
    const addresses = await dns.lookup(hostname, { all: true });
    if (!addresses || addresses.length === 0) {
      throw new Error(`Could not resolve hostname: ${hostname}`);
    }

    for (const record of addresses) {
      if (isPrivateIp(record.address)) {
        throw new Error(
          `Security violation: ${hostname} resolved to private/reserved IP address (${record.address}). Request blocked.`
        );
      }
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("Security violation")) {
      throw err;
    }
    throw new Error(`DNS resolution failed for ${hostname}: ${err instanceof Error ? err.message : String(err)}`);
  }

  return parsed;
}

/**
 * Returns true if the URL is safe, or false if it fails SSRF validation.
 */
export async function isSafeUrl(urlInput: string | URL): Promise<boolean> {
  try {
    await assertSafeUrl(urlInput);
    return true;
  } catch {
    return false;
  }
}
