// Copyright (C) 2026 Deutsche Telekom AG. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
import { test, expect } from '../support/cockpit-api';

for (const width of [1920, 1100, 720]) {
  test(`search layout contains its controls at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 961 });
    await page.goto('/');
    const button = page.getByRole('button', { name: 'Search', exact: true });
    await expect(button).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const panel = await page.locator('.searchArea').boundingBox();
    const search = await button.boundingBox();
    const results = await page.locator('.example-container').boundingBox();
    expect(search!.y + search!.height).toBeLessThanOrEqual(panel!.y + panel!.height - 9);
    expect(results!.y).toBeGreaterThan(panel!.y + panel!.height);
    expect(results!.x).toBe(panel!.x);
    expect(results!.width).toBe(panel!.width);
    if (width >= 1100) {
      for (const group of await page.locator('.date-time-fields').all()) {
        const fields = await group.locator('mat-form-field').all();
        const boxes = await Promise.all(fields.map(field => field.boundingBox()));
        expect(boxes[1]!.y).toBe(boxes[0]!.y);
        expect(boxes[2]!.y).toBe(boxes[0]!.y);
      }
    }
  });
}
