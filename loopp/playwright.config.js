const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 45000,
  expect: {
    timeout: 15000
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'html',
  use: {
    baseURL: 'http://127.0.0.1:8080',
    trace: 'on-first-retry',
    permissions: ['microphone'],
    launchOptions: {
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--autoplay-policy=no-user-gesture-required',
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    }
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    }
  ],
  webServer: {
    command: 'npx http-server -a 127.0.0.1 -p 8080 -c-1',
    url: 'http://127.0.0.1:8080',
    timeout: 60000,
    reuseExistingServer: !process.env.CI,
  },
});

