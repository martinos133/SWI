import { defineConfig, devices } from "@playwright/test";

const PORT = 3200;

/**
 * E2E testy bežia proti produkčnému buildu so samostatnou databázou (prisma/e2e.db),
 * takže nezasahujú do vývojových dát. Používajú nainštalovaný Google Chrome.
 */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: "chrome",
    locale: "sk-SK",
    timezoneId: "Europe/Bratislava",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "e2e", testIgnore: /screenshots\.spec/, use: { ...devices["Desktop Chrome"], channel: "chrome" } },
    {
      name: "screenshots",
      testMatch: /screenshots\.spec/,
      use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: "npm run e2e:server",
    url: `http://localhost:${PORT}/login`,
    timeout: 240_000,
    reuseExistingServer: false,
    env: {
      DATABASE_URL: "file:./prisma/e2e.db",
      PORT: String(PORT),
    },
  },
});
