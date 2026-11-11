// Copyright (C) 2026 Deutsche Telekom AG. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig, devices } from '@playwright/test';
const smoke = process.env.COCKPIT_TEST_MODE === 'packaged';
export default defineConfig({
  timeout: 30000,
  expect: { timeout: 10000 },
  retries: 0,
  workers: 2,
  forbidOnly: !!process.env.CI,
  outputDir: smoke
    ? 'test-results/smoke-artifacts'
    : 'test-results/mocked-artifacts',
  reporter: [
    ['list'],
    [
      'junit',
      {
        outputFile: smoke
          ? 'test-results/smoke.xml'
          : 'test-results/browser.xml'
      }
    ],
    [
      'html',
      {
        outputFolder: smoke
          ? 'playwright-report/smoke'
          : 'playwright-report/mocked',
        open: 'never'
      }
    ]
  ],
  use: {
    ...devices['Desktop Chrome'],
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'mocked',
      testDir: './tests',
      use: { baseURL: 'http://127.0.0.1:4173' }
    },
    {
      name: 'packaged',
      testDir: './smoke',
      use: {
        baseURL: process.env.COCKPIT_BASE_URL,
        httpCredentials:
          smoke && process.env.COCKPIT_USERNAME && process.env.COCKPIT_PASSWORD
            ? {
                username: process.env.COCKPIT_USERNAME,
                password: process.env.COCKPIT_PASSWORD,
                origin: new URL(process.env.COCKPIT_BASE_URL!).origin
              }
            : undefined
      }
    }
  ],
  webServer: smoke
    ? undefined
    : {
        command: 'node support/static-server.mjs',
        url: 'http://127.0.0.1:4173',
        reuseExistingServer: false,
        timeout: 15000
      }
});
