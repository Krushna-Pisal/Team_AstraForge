import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  timeout: 120000,
  expect: { timeout: 15000 },
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:5182",
    channel: process.env.PLAYWRIGHT_CHANNEL || "msedge",
    trace: "retain-on-failure",
  },
  webServer: {
    command:
      (process.platform === "win32"
        ? "..\\.venv\\Scripts\\python.exe"
        : "../.venv/bin/python") +
      " ../scripts/dev.py --skip-install --backend-port 8012 --frontend-port 5182",
    url: "http://127.0.0.1:5182/api/market-data/catalog",
    reuseExistingServer: false,
    timeout: 60000,
  },
});
