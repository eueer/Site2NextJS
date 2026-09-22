import { NextRequest } from "next/server";

interface RateLimitConfig {
  windowMs: number; // Duration of window in ms
  maxRequests: number; // Maximum allowed requests within window
}

interface ClientRecord {
  timestamps: number[];
}

class SlidingWindowRateLimiter {
  private records = new Map<string, ClientRecord>();
  private windowMs: number;
  private maxRequests: number;
  private lastPrune = Date.now();

  constructor(config: RateLimitConfig) {
    this.windowMs = config.windowMs;
    this.maxRequests = config.maxRequests;
  }

  private prune() {
    const now = Date.now();
    // Prune stale entries at most once every 60 seconds
    if (now - this.lastPrune < 60000) return;
    this.lastPrune = now;

    const threshold = now - this.windowMs;
    for (const [ip, record] of this.records.entries()) {
      record.timestamps = record.timestamps.filter((ts) => ts > threshold);
      if (record.timestamps.length === 0) {
        this.records.delete(ip);
      }
    }
  }

  public check(ip: string): {
    success: boolean;
    limit: number;
    remaining: number;
    resetSeconds: number;
  } {
    this.prune();

    const now = Date.now();
    const threshold = now - this.windowMs;

    let record = this.records.get(ip);
    if (!record) {
      record = { timestamps: [] };
      this.records.set(ip, record);
    }

    // Keep only timestamps within current window
    record.timestamps = record.timestamps.filter((ts) => ts > threshold);

    if (record.timestamps.length >= this.maxRequests) {
      const oldest = record.timestamps[0];
      const resetSeconds = Math.max(1, Math.ceil((oldest + this.windowMs - now) / 1000));
      return {
        success: false,
        limit: this.maxRequests,
        remaining: 0,
        resetSeconds,
      };
    }

    record.timestamps.push(now);
    const resetSeconds = Math.ceil(this.windowMs / 1000);

    return {
      success: true,
      limit: this.maxRequests,
      remaining: this.maxRequests - record.timestamps.length,
      resetSeconds,
    };
  }
}

// 10 conversion requests per 10 minutes per IP
export const convertRateLimiter = new SlidingWindowRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 10,
});

// 10 GitHub pushes per 5 minutes per IP
export const gitPushRateLimiter = new SlidingWindowRateLimiter({
  windowMs: 5 * 60 * 1000,
  maxRequests: 10,
});

function isValidIp(ip: string): boolean {
  if (!ip || ip.length > 45) return false;
  // Check IPv4
  const ipv4Match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
  if (ipv4Match) {
    return ipv4Match.slice(1).every((octet) => {
      const num = parseInt(octet, 10);
      return num >= 0 && num <= 255 && (octet === "0" || !octet.startsWith("0"));
    });
  }
  // Check IPv6
  return /^[0-9a-fA-F:]{2,39}$/.test(ip) && ip.includes(":");
}

/**
 * Extracts client IP safely from NextRequest headers, prioritizing trusted edge
 * headers and using the rightmost IP from X-Forwarded-For to defeat spoofing.
 */
export function getClientIp(req: NextRequest): string {
  // 1. Trusted edge / CDN headers that cannot be forged by clients
  const vercelIp = req.headers.get("x-vercel-forwarded-for");
  if (vercelIp && isValidIp(vercelIp.trim())) {
    return vercelIp.trim();
  }

  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp && isValidIp(cfIp.trim())) {
    return cfIp.trim();
  }

  // 2. Next.js native request IP
  const nextIp = (req as any).ip;
  if (nextIp && typeof nextIp === "string" && isValidIp(nextIp.trim())) {
    return nextIp.trim();
  }

  // 3. Direct proxy remote address header
  const realIp = req.headers.get("x-real-ip");
  if (realIp && isValidIp(realIp.trim())) {
    return realIp.trim();
  }

  // 4. X-Forwarded-For: take the rightmost IP (closest to upstream trusted proxy)
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) {
      const rightmost = parts[parts.length - 1];
      if (isValidIp(rightmost)) return rightmost;
    }
  }

  return "127.0.0.1";
}
