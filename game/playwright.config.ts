import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000, // la cuidadora empieza en la entrada y los paseos son largos
  retries: process.env.CI ? 1 : 0,
  use: {
    ...devices['Desktop Chrome'],
    // En local se usa el Chrome instalado; en CI, el Chromium que instala Playwright.
    channel: process.env.CI ? undefined : 'chrome',
    baseURL: 'http://localhost:5173',
    viewport: { width: 1280, height: 720 },
    // Las pruebas de siempre leen textos en español; el inglés tiene su propio archivo (english.spec.ts).
    locale: 'es-ES',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
