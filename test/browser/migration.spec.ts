import { test, expect, type Page } from "@playwright/test";
const job = {
  jobId: "uiarc-test-job",
  sourceUrl: "https://example.com",
  pages: [
    { route: "/", url: "https://example.com" },
    { route: "/about", url: "https://example.com/about" },
  ],
  stats: [{ label: "Image payload", before: 2048, after: 1024, unit: "bytes" }],
  notes: ["Images optimized"],
  logs: ["Downloaded assets"],
  fileCount: 12,
  previewHtml:
    '<!doctype html><html><body style="background:white;color:black">Converted site</body></html>',
  zipBase64: "UEsFBgAAAAAAAAAAAAAAAAAAAAAAAA==",
  files: [{ path: "package.json", content: "{}" }],
};
async function restore(page: Page) {
  await page.addInitScript((data) => {
    localStorage.setItem("framer2nextjs_active_job", JSON.stringify(data));
    localStorage.setItem("framer2nextjs_github_token", "legacy-token");
  }, job);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Your Next.js project is ready" }),
  ).toBeVisible();
}
test("authorization, settings, Enter submission, estimated loading, failure and retry", async ({
  page,
}) => {
  let calls = 0,
    body: Record<string, unknown> = {};
  let release: () => void = () => {};
  const pending = new Promise<void>((r) => (release = r));
  await page.route("**/api/convert", async (route) => {
    calls++;
    body = route.request().postDataJSON();
    if (calls === 1) {
      await pending;
      await route.fulfill({
        status: 500,
        json: { error: "Conversion fixture failed" },
      });
    } else await route.fulfill({ json: job });
  });
  await page.goto("/");
  await page.getByLabel("Website URL").fill("https://example.com");
  await page.getByLabel("Website URL").press("Enter");
  await expect(
    page.getByText("Authorization required", { exact: true }),
  ).toBeVisible();
  expect(calls).toBe(0);
  await page.getByRole("checkbox", { name: /I own/ }).check();
  await page.getByRole("button", { name: "Advanced settings" }).click();
  await expect(
    page.getByRole("spinbutton", { name: "Maximum pages" }),
  ).toHaveValue("15");
  await expect(
    page.getByRole("spinbutton", { name: "Image quality" }),
  ).toHaveValue("78");
  await page.getByRole("spinbutton", { name: "Maximum pages" }).fill("12");
  await page.getByRole("spinbutton", { name: "Maximum pages" }).press("Tab");
  await page.getByLabel("Website URL").press("Enter");
  await expect(page.getByRole("progressbar")).toBeVisible();
  await expect(page.getByRole("progressbar")).not.toHaveAttribute(
    "aria-valuenow",
  );
  await expect(page.getByText(/Estimated activity/)).toBeVisible();
  release();
  await expect(
    page.getByText("Conversion fixture failed", { exact: true }),
  ).toBeVisible();
  expect(body).toMatchObject({
    url: "https://example.com",
    maxPages: 12,
    imageQuality: 78,
  });
  await page.getByRole("button", { name: "Convert to Next.js" }).click();
  await expect(
    page.getByRole("heading", { name: "Your Next.js project is ready" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Convert another" }).click();
  await expect(page.getByLabel("Website URL")).toHaveValue("");
  expect(
    await page.evaluate(() => localStorage.getItem("framer2nextjs_active_job")),
  ).toBeNull();
});
test("restored result, preview sizes, sandbox, commands and ZIP download", async ({
  page,
}) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await restore(page);
  expect(
    await page.evaluate(() =>
      localStorage.getItem("framer2nextjs_github_token"),
    ),
  ).toBeNull();
  const frame = page.getByTitle("Converted website preview");
  await expect(frame).toHaveAttribute("sandbox", "allow-scripts");
  await page.getByRole("button", { name: "Tablet", exact: true }).click();
  await expect(frame).toHaveCSS("width", "768px");
  await page.getByRole("button", { name: "Mobile", exact: true }).click();
  await expect(frame).toHaveCSS("width", "375px");
  await page.getByRole("button", { name: "Copy commands" }).click();
  await expect(
    page.getByRole("button", { name: "Copy commands" }),
  ).toHaveAttribute("data-copy-state", "copied");
  await expect(
    page.getByRole("status").filter({ hasText: "Copy commands: Copied" }),
  ).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "npm install && npm run dev",
  );
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download ZIP" }).click();
  expect((await download).suggestedFilename()).toBe("example-com-nextjs.zip");
});
test("GitHub dialog focus, in-memory token, clearing, redaction and mocked success", async ({
  page,
}) => {
  await restore(page);
  await page.getByRole("button", { name: "Push to GitHub" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const token = dialog.getByLabel("GitHub personal access token", {
    exact: true,
  });
  await expect(token).toBeFocused();
  await token.fill("test-token-uiarc");
  await dialog.getByRole("button", { name: "Clear Token" }).click();
  await expect(token).toHaveValue("");
  await token.fill("test-token-uiarc");
  await page.route("**/api/github/push", (r) =>
    r.fulfill({ status: 500, json: { error: "Rejected test-token-uiarc" } }),
  );
  await dialog
    .getByRole("button", { name: "Create repository & push" })
    .click();
  await expect(
    dialog.getByText("Rejected [REDACTED]", { exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    "test-token-uiarc",
  );
  await page.unroute("**/api/github/push");
  await page.route("**/api/github/push", (r) =>
    r.fulfill({ json: { repoUrl: "https://github.com/example/mock-export" } }),
  );
  await dialog
    .getByRole("button", { name: "Create repository & push" })
    .click();
  await expect(
    dialog.getByRole("link", { name: /Open your repository/ }),
  ).toHaveAttribute("href", "https://github.com/example/mock-export");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Push to GitHub" }),
  ).toBeFocused();
});
test("expired jobs preserve useful result and prompt reconversion", async ({
  page,
}) => {
  await restore(page);
  await page.route("**/api/github/push", (r) =>
    r.fulfill({ status: 404, json: { error: "Expired" } }),
  );
  await page.getByRole("button", { name: "Push to GitHub" }).click();
  await page
    .getByLabel("GitHub personal access token", { exact: true })
    .fill("mock-token");
  await page.getByRole("button", { name: "Create repository & push" }).click();
  await expect(
    page.getByText(/Job session expired on the server/),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("framer2nextjs_active_job")),
  ).toBeNull();
});
test("FAQ, mobile drawer and keyboard navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Will this work with all sites?" }),
  ).toHaveAttribute("aria-expanded", "true");
  await page
    .getByRole("button", { name: "Will this work with all sites?" })
    .click();
  await expect(
    page.getByRole("button", { name: "Will this work with all sites?" }),
  ).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toBeFocused();
});
for (const width of [390, 768, 1440])
  for (const theme of ["light", "dark"])
    test(`${theme} at ${width}px: no overflow, long URL, typography and theme persistence`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript(
        (t) => localStorage.setItem("site2nextjs_theme", t),
        theme,
      );
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto("/");
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await page
        .getByLabel("Website URL")
        .fill("https://example.com/" + "long-url-".repeat(40));
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(
        await page.evaluate(() => getComputedStyle(document.body).fontFamily),
      ).toContain("Geist");
      await page.reload();
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      expect(errors).toEqual([]);
      expect(await page.locator(".hero-background canvas").count()).toBe(0);
    });
test("dark default ignores system preference; UIArc switch persists choice", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
test("malformed stored job still clears legacy token and renders fallback", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("framer2nextjs_active_job", "broken json");
    localStorage.setItem("framer2nextjs_github_token", "legacy");
  });
  await page.goto("/");
  await expect(page.getByLabel("Website URL")).toBeVisible();
  expect(
    await page.evaluate(() =>
      localStorage.getItem("framer2nextjs_github_token"),
    ),
  ).toBeNull();
});
test("upgraded dynamic routes return controlled missing-job responses", async ({
  request,
}) => {
  for (const route of [
    "/api/preview/missing-job",
    "/api/download/missing-job",
    "/assets/missing-job/missing.css",
  ]) {
    const response = await request.get(route);
    expect([400, 404]).toContain(response.status());
  }
});
for (const width of [390, 768, 1440])
  test(`results and dialog fit ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await restore(page);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "Push to GitHub" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page
      .getByLabel("GitHub personal access token", { exact: true })
      .fill("x".repeat(120));
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.keyboard.press("Tab");
    expect(
      await page
        .getByRole("dialog")
        .evaluate((el) => el.contains(document.activeElement)),
    ).toBe(true);
  });
test("server ZIP fallback works when restored result lacks embedded archive", async ({
  page,
}) => {
  await page.addInitScript(
    (data) =>
      localStorage.setItem(
        "framer2nextjs_active_job",
        JSON.stringify({ ...data, zipBase64: undefined }),
      ),
    job,
  );
  await page.route("**/api/download/uiarc-test-job", (r) =>
    r.fulfill({
      body: "mock zip",
      contentType: "application/zip",
      headers: {
        "Content-Disposition": 'attachment; filename="server-project.zip"',
      },
    }),
  );
  await page.goto("/");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download ZIP" }).click();
  expect((await download).suggestedFilename()).toBe("server-project.zip");
});
test("selected theme is applied before hydration", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("site2nextjs_theme", "dark"),
  );
  await page.route("**/_next/static/**/*.js", (r) => r.abort());
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
test("application theme leaves the converted website unchanged", async ({
  page,
}) => {
  await restore(page);
  const body = page.frameLocator("iframe").locator("body");
  await expect(body).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await expect(body).toHaveCSS("background-color", "rgb(255, 255, 255)");
});

test("authorization first line aligns, number fields are compact, and Arc radii are restored", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.goto("/");
  const checkbox = await page
    .getByRole("checkbox", { name: /I own/ })
    .boundingBox();
  const line = await page
    .locator('label[for="authorization"]')
    .evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      const r = range.getClientRects()[0];
      return { top: r.top, height: r.height };
    });
  expect(
    Math.abs(checkbox!.y + checkbox!.height / 2 - (line.top + line.height / 2)),
  ).toBeLessThan(3);
  await page.getByRole("button", { name: "Advanced settings" }).click();
  const widths = await page
    .locator('.settings-grid [class*="__control"]')
    .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().width));
  expect(widths).toHaveLength(2);
  for (const width of widths) expect(width).toBeLessThanOrEqual(160);
  expect(
    await page
      .locator(".converter-form")
      .evaluate((el) => getComputedStyle(el).borderTopLeftRadius),
  ).toBe("34px");
});
