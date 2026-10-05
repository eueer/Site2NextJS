import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./test/browser",
  fullyParallel: true,
  timeout: 30000,
  use: {
    baseURL: process.env.TEST_BASE_URL || "http://127.0.0.1:3000",
    reducedMotion: "reduce",
    trace: "retain-on-failure",
  },
  webServer: process.env.TEST_BASE_URL
    ? undefined
    : {
        command: "npm run start",
        url: "http://127.0.0.1:3000",
        reuseExistingServer: true,
        timeout: 60000,
      },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
