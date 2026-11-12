// Copyright (C) 2026 Deutsche Telekom AG. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
import { test, expect } from '../support/cockpit-api';
test('keyboard search and links navigate through details, home and onboarding', async ({ page, api }) => {
  await page.goto('/');
  const input = page.getByPlaceholder('Request Id', { exact: true });
  await input.fill('request-1');
  await input.press('Enter');
  await expect(page.getByText('Demo service', { exact: true })).toBeVisible();
  expect(api.calls.filter(c => c.path === '/v1/search')).toHaveLength(1);
  const request = page.getByRole('link', { name: 'request-1', exact: true });
  await request.focus(); await request.press('Enter');
  await expect(page).toHaveURL(/details\/process-1$/);
  const child = page.getByRole('link', { name: 'Deploy', exact: true });
  await child.focus();
  await child.press('Enter');
  await expect(page).toHaveURL(/details\/child-1$/);
  const home = page.getByRole('link', { name: 'Home', exact: true });
  await home.focus();
  await home.press('Enter');
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('button', { name: 'Search', exact: true })).toBeVisible();
  const onboard = page.getByRole('link', { name: 'Update Recipe', exact: true });
  await onboard.focus();
  await onboard.press('Enter');
  await expect(page).toHaveURL('/onboard');
  await expect(page.getByRole('button', { name: 'Add Recipe', exact: true })).toBeVisible();
});
test('tab selection and Add dialog preserve keyboard focus on Escape and Cancel', async ({ page, api }) => {
  await page.goto('/onboard');
  const service = page.getByRole('tab', { name: 'Service Recipe', exact: true });
  const network = page.getByRole('tab', { name: 'Network Recipe', exact: true });
  await service.focus(); await service.press('ArrowRight');
  await expect(network).toBeFocused();
  await expect(service).toHaveAttribute('aria-selected', 'true');
  expect(api.calls.filter(c => c.path === '/networkRecipes')).toHaveLength(0);
  await network.press('Enter');
  await expect(network).toHaveAttribute('aria-selected', 'true');
  await expect.poll(() => api.calls.filter(c => c.path === '/networkRecipes').length).toBe(1);
  await network.press('Enter');
  expect(api.calls.filter(c => c.path === '/networkRecipes')).toHaveLength(1);
  const add = page.getByRole('button', { name: 'Add Recipe', exact: true });
  await add.focus(); await add.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Model Name', { exact: true })).toBeFocused();
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    await expect.poll(() => dialog.evaluate(node => node.contains(document.activeElement))).toBe(true);
  }
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Shift+Tab');
    await expect.poll(() => dialog.evaluate(node => node.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0); await expect(add).toBeFocused();
  await add.press('Space'); await expect(dialog).toBeVisible();
  const cancel = dialog.getByRole('button', { name: 'Cancel', exact: true });
  await cancel.focus(); await cancel.press('Enter');
  await expect(dialog).toHaveCount(0); await expect(add).toBeFocused();
  expect(api.calls.filter(c => c.method === 'POST')).toHaveLength(0);
});
test('Modify prefills each recipe mode and exposes only current validation errors', async ({ page, api }) => {
  for (const scenario of [
    { tab: 'Service Recipe', data: { serviceModelUUID: 'service-uuid' }, label: 'Service Model UUID', value: 'service-uuid' },
    { tab: 'Network Recipe', data: { modelName: 'demo-network', versionStr: 'network-version' }, label: 'Model Name', value: 'demo-network' },
    { tab: 'VNF Recipe', data: { nfRole: 'firewall', versionStr: 'vnf-version' }, label: 'NF Role', value: 'firewall' }
  ]) {
    api.recipes = [{ ...scenario.data, id: '1', action: 'create', orchestrationUri: '/mso/async/services/flow', recipeTimeout: '180' }];
    await page.goto('/onboard');
    await page.getByRole('tab', { name: scenario.tab, exact: true }).click();
    const modify = page.getByRole('tabpanel', { name: scenario.tab, exact: true }).getByRole('button', { name: 'Modify', exact: true });
    await expect(modify).toBeVisible(); await modify.focus(); await modify.press('Enter');
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Update Recipe', exact: true })).toBeVisible();
    await expect(dialog.getByLabel(scenario.label, { exact: true })).toHaveValue(scenario.value);
    await expect(dialog.getByLabel('Orchestration URI', { exact: true })).toHaveValue('flow');
    const action = dialog.getByLabel('Action', { exact: true });
    await expect(action).toHaveValue('create');
    await expect(action).toHaveAccessibleDescription('');
    await action.fill('');
    await action.press('Tab');
    const error = dialog.getByText('Action is required.', { exact: true });
    await expect(error).toBeVisible();
    await expect(action).toHaveAccessibleDescription('Action is required.');
    await action.fill('create');
    await action.press('Tab');
    await expect(error).toBeHidden();
    await expect(action).toHaveAccessibleDescription('');
    const cancel = dialog.getByRole('button', { name: 'Cancel', exact: true });
    await cancel.focus(); await cancel.press('Space');
    await expect(page.getByRole('dialog')).toHaveCount(0); await expect(modify).toBeFocused();
  }
  expect(api.calls.filter(c => c.method === 'POST')).toHaveLength(0);
});
// Requesting api activates the synthetic route fixture for the real viewer.
test('BPMN overlay and zoom support keyboard focus and activation', async ({ page, api }) => {
  await page.goto('/details/process-1');
  const viewport = page.locator('.djs-container svg .viewport');
  await expect(page.locator('.djs-element.highlight')).toHaveCount(1);
  const initial = await viewport.getAttribute('transform');
  const zoomIn = page.getByRole('button', { name: 'Zoom in', exact: true });
  expect(await zoomIn.locator('mat-icon').evaluate(node => getComputedStyle(node).fontFamily)).toContain('FontAwesome');
  await zoomIn.focus(); await zoomIn.press('Enter');
  await expect.poll(() => viewport.getAttribute('transform')).not.toBe(initial);
  const zoomed = await viewport.getAttribute('transform');
  const zoomOut = page.getByRole('button', { name: 'Zoom out', exact: true });
  await zoomOut.focus(); await zoomOut.press('Space');
  await expect.poll(() => viewport.getAttribute('transform')).not.toBe(zoomed);
  const reset = page.getByRole('button', { name: 'Reset zoom', exact: true });
  await reset.focus(); await reset.press('Enter');
  const overlay = page.getByRole('button', { name: 'Open process child-1 for Deploy', exact: true });
  await overlay.focus(); await expect(overlay).toBeFocused();
  expect(await overlay.evaluate(node => getComputedStyle(node).outlineStyle)).toBe('solid');
  expect(await overlay.evaluate(node => getComputedStyle(node).outlineWidth)).toBe('3px');
  await overlay.press('Space'); await expect(page).toHaveURL(/details\/child-1$/);
  await expect(page.getByRole('button', { name: 'Open process child-1 for Deploy', exact: true })).toBeVisible();
  await page.goto('/details/process-1');
  await expect(overlay).toBeVisible(); await overlay.focus(); await overlay.press('Enter');
  await expect(page).toHaveURL(/details\/child-1$/);
});
