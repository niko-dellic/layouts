import { defineConfig } from '@playwright/test';
const port = Number(process.env.LAYOUTS_TEST_PORT ?? 5186);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error('Invalid LAYOUTS_TEST_PORT');
const baseURL = `http://localhost:${port}`;
export default defineConfig({
  testDir: './tests/browser',
  use: { baseURL, headless: true },
  workers: 1,
  webServer: {
    command: `npm run dev -- --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
});
