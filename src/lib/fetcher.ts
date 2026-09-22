import { assertSafeUrl } from "./ssrf";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const MAX_REDIRECTS = 5;

/**
 * Executes an HTTP fetch with strict SSRF validation on every step,
 * manually inspecting redirect location headers to prevent redirect-based SSRF.
 */
async function fetchSafe(
  initialUrl: string,
  headers: Record<string, string>,
  timeoutMs: number
): Promise<{ res: Response; finalUrl: string }> {
  let currentUrl = initialUrl;
  let redirects = 0;

  while (true) {
    // Assert safe destination on initial request and every subsequent redirect
    await assertSafeUrl(currentUrl);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(currentUrl, {
        headers,
        redirect: "manual",
        signal: controller.signal,
      });

      // Check for redirect responses
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location) {
          return { res, finalUrl: currentUrl };
        }

        redirects++;
        if (redirects > MAX_REDIRECTS) {
          throw new Error(`SSRF guard: Exceeded maximum redirects (${MAX_REDIRECTS})`);
        }

        const nextUrl = new URL(location, currentUrl).toString();
        currentUrl = nextUrl;
        continue;
      }

      return { res, finalUrl: currentUrl };
    } finally {
      clearTimeout(timer);
    }
  }
}

export async function fetchText(
  url: string,
  timeoutMs = 15000
): Promise<{ url: string; status: number; text: string; contentType: string }> {
  const headers = {
    "User-Agent": USER_AGENT,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
  };

  const { res, finalUrl } = await fetchSafe(url, headers, timeoutMs);
  const text = await res.text();

  return {
    url: finalUrl,
    status: res.status,
    text,
    contentType: res.headers.get("content-type") || "",
  };
}

export async function fetchBinary(
  url: string,
  retries = 2
): Promise<{ url: string; status: number; buffer: Buffer; contentType: string }> {
  let lastErr: unknown;

  const headers = {
    "User-Agent": USER_AGENT,
    Accept: "*/*",
  };

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { res, finalUrl } = await fetchSafe(url, headers, 20000);

      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
        continue;
      }

      const arrayBuf = await res.arrayBuffer();
      return {
        url: finalUrl,
        status: res.status,
        buffer: Buffer.from(arrayBuf),
        contentType: res.headers.get("content-type") || "",
      };
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
        continue;
      }
    }
  }

  throw lastErr;
}

export function normalizeUrl(input: string): URL {
  let raw = input.trim();
  if (!/^https?:\/\//i.test(raw)) {
    raw = "https://" + raw;
  }
  const u = new URL(raw);
  u.protocol = "https:";
  u.hash = "";
  return u;
}
