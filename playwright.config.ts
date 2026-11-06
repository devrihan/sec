import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5199',
    // Uses the Edge already on Windows. Change to 'chrome', or remove it after `npx playwright install`.
    channel: process.env.PW_CHANNEL ?? 'msedge',
    viewport: { width: 1280, height: 860 },
  },
  webServer: {
    command: 'npx vite --port 5199 --strictPort',
    url: 'http://localhost:5199',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
