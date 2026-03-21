import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  retries: 0,
  reporter: 'list',

  projects: [
    {
      name: 'chromium-mobile',
      use: {
        baseURL: 'http://localhost:5175',
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        screenshot: 'only-on-failure',
        video: 'off',
        trace: 'off',
      },
    },
  ],

  // Uncomment to have Playwright start the dev server automatically:
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:5173',
  //   reuseExistingServer: true,
  // },
})
