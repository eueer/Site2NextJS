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

/**
 * Extracts client IP safely from NextRequest headers
 */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0].trim();
    if (first) return first;
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  // Next.js request IP if available
  const ip = (req as any).ip;
  if (ip && typeof ip === "string") return ip.trim();

  return "127.0.0.1";
}
