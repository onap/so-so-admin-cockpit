// Copyright (C) 2026 Deutsche Telekom AG. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { test, expect } from '@playwright/test';
test.beforeEach(async ({ page }) => {
  page.on('pageerror', (error) => {
    throw error;
  });
});
test('packaged root serves the production application and assets', async ({
  page
}) => {
  const failed: string[] = [];
  page.on('response', (r) => {
    if (/\.(js|css)(\?|$)/.test(r.url()) && r.status() !== 200)
      failed.push(r.url());
  });
  const response = await page.goto('/');
  expect(response?.headers()['content-type']).toContain('text/html');
  await expect(
    page.getByRole('heading', { name: 'SO Monitoring' })
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Search', exact: true })
  ).toBeVisible();
  expect(failed).toEqual([]);
});
test('search and navigation call real cockpit controllers', async ({
  page
}) => {
  await page.goto('/');
  const responsePromise = page.waitForResponse((r) =>
    r.url().includes('/so/monitoring/v1/search')
  );
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('application/json');
  expect(await response.json()).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ requestId: 'request-1' })
    ])
  );
  await page.getByRole('link', { name: 'request-1', exact: true }).click();
  await expect(page).toHaveURL(/details\/process-1$/);
  await expect(
    page.getByText('Provision service', { exact: true })
  ).toBeVisible();
  await expect(page.locator('.djs-element.highlight')).toHaveCount(1);
});
test('a bookmarked detail page and refresh return SPA and real API JSON', async ({
  page,
  request
}) => {
  for (let i = 0; i < 2; i++) {
    const response =
      i === 0 ? await page.goto('/details/process-1') : await page.reload();
    expect(response?.status()).toBe(200);
    expect(response?.headers()['content-type']).toContain('text/html');
    await expect(
      page.getByText('Provision service', { exact: true })
    ).toBeVisible();
  }
  const response = await request.get(
    '/so/monitoring/process-instance/process-1'
  );
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('application/json');
  expect(await response.json()).toMatchObject({
    processInstanceId: 'process-1'
  });
});
