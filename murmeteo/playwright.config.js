const { defineConfig, devices } = require('@playwright/test');
const fs = require('fs');

const systemChromium = ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'].find(p => fs.existsSync(p));

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  expect: {
    timeout: 10000
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [['list']] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:8085',
    trace: 'on-first-retry',
    serviceWorkers: 'block',
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH || systemChromium || undefined,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu'
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
    command: 'node test-server.js',
    url: 'http://127.0.0.1:8085',
    timeout: 30000,
    reuseExistingServer: !process.env.CI,
  },
});
