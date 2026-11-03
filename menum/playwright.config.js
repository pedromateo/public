const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  expect: {
    timeout: 10000
  },
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:8086',
    trace: 'on-first-retry',
    launchOptions: {
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    }
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'pixel-8a',
      use: {
        ...devices['Pixel 7'],
        viewport: { width: 412, height: 915 }
      },
    }
  ],
  webServer: {
    command: 'python3 -m http.server 8086',
    url: 'http://127.0.0.1:8086',
    timeout: 10000,
    reuseExistingServer: !process.env.CI,
  },
});
