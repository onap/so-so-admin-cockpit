// Copyright (C) 2026 Deutsche Telekom AG. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { test, expect, search, row } from '../support/cockpit-api';
test('search criteria produce matching rows and navigate to details', async ({
  page,
  api
}) => {
  await page.goto('/');
  await page.getByPlaceholder('Request Id', { exact: true }).fill('request-1');
  await search(page);
  await expect(page.getByText('Demo service', { exact: true })).toBeVisible();
  await expect
    .poll(() => api.calls.find((c) => c.path === '/v1/search')?.body)
    .toBe(JSON.stringify({ requestId: ['EQ', 'request-1'] }));
  await page.getByRole('link', { name: 'request-1', exact: true }).click();
  await expect(page).toHaveURL(/details\/process-1$/);
  await expect(
    page.getByText('Provision service', { exact: true })
  ).toBeVisible();
});
test('an empty search clears a previous result and statistics', async ({
  page,
  api
}) => {
  await page.goto('/');
  await search(page);
  await expect(page.getByText('Demo service', { exact: true })).toBeVisible();
  api.rows = [];
  await search(page);
  await expect(page.getByText('Demo service', { exact: true })).toHaveCount(0);
  await page.getByRole('tab', { name: 'Service Statistics' }).click();
  await expect(page.getByText('100%', { exact: true })).toHaveCount(0);
});
test('invalid dates prevent search requests', async ({ page, api }) => {
  await page.goto('/');
  await page.getByPlaceholder('Choose a start date').fill('');
  await search(page);
  await expect(page.getByText(/Found end or start date empty/)).toBeVisible();
  expect(api.calls).toHaveLength(0);
});
test('lookup and search errors allow successful recovery', async ({
  page,
  api
}) => {
  api.lookupStatus = 404;
  await page.goto('/');
  await search(page);
  await page.getByRole('link', { name: 'request-1', exact: true }).click();
  await expect(page.getByText(/No process instance id found/)).toBeVisible();
  await expect(page).toHaveURL('/');
  api.searchStatus = 500;
  await search(page);
  await expect(page.getByText(/Unable to perform search/)).toBeVisible();
  api.searchStatus = 200;
  api.rows = [{ ...row, serviceInstanceName: 'Recovered service' }];
  await search(page);
  await expect(
    page.getByText('Recovered service', { exact: true })
  ).toBeVisible();
});
test('details render a real BPMN diagram and drill down through an overlay', async ({
  page,
  api
}) => {
  await page.goto('/details/process-1');
  await expect(
    page.getByText('Provision service', { exact: true })
  ).toBeVisible();
  await expect(page.locator('.djs-element.highlight')).toHaveCount(1);
  await page.locator('.highlight-overlay').click();
  await expect(page).toHaveURL(/details\/child-1$/);
  await expect(page.getByText('child-1', { exact: true })).toBeVisible();
});
test('details show activity and variable values', async ({ page, api }) => {
  await page.goto('/details/process-1');
  await expect(
    page.getByRole('link', { name: 'Deploy', exact: true })
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Variable Instances' }).click();
  await expect(page.getByText('west', { exact: true })).toBeVisible();
});
test('details report malformed BPMN while retaining process information', async ({
  page,
  api
}) => {
  api.definition = 'not XML';
  await page.goto('/details/process-1');
  await expect(
    page.getByText('Unable to load BPMN flow', { exact: true })
  ).toBeVisible();
  await expect(
    page.getByText('Provision service', { exact: true })
  ).toBeVisible();
});
test('a process HTTP failure displays an error', async ({ page, api }) => {
  api.processStatus = 500;
  await page.goto('/details/missing');
  await expect(
    page.getByText(/Unable to get process instance for id/)
  ).toBeVisible();
});
test('upload rejects misleading suffix and accepts a later valid WAR', async ({
  page,
  api
}) => {
  await page.goto('/onboard');
  const input = page.getByLabel('Recipe war:');
  await input.setInputFiles({
    name: 'workflow.war.exe',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from('test')
  });
  await expect(
    page.getByText('Invalid file format.', { exact: true })
  ).toBeVisible();
  await input.setInputFiles({
    name: 'workflow.war',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from('inert fixture')
  });
  await page
    .getByRole('button', { name: 'Upload Recipe', exact: true })
    .click();
  await expect(
    page.getByText('Workflow uploaded', { exact: true })
  ).toBeVisible();
  expect(
    api.calls.filter((c) => c.path === '/workflowPackages/onboard')
  ).toHaveLength(1);
});
test('upload handles application and HTTP errors and can retry', async ({
  page,
  api
}) => {
  await page.goto('/onboard');
  await page.getByLabel('Recipe war:').setInputFiles({
    name: 'workflow.war',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from('inert fixture')
  });
  api.upload = { errMsg: 'Invalid archive' };
  await page
    .getByRole('button', { name: 'Upload Recipe', exact: true })
    .click();
  await expect(
    page.getByText('Invalid archive', { exact: true })
  ).toBeVisible();
  api.uploadStatus = 500;
  await page
    .getByRole('button', { name: 'Upload Recipe', exact: true })
    .click();
  await expect(page.getByText(/Unable to upload bpmn file/)).toBeVisible();
  api.uploadStatus = 200;
  api.upload = { result: 'true', message: 'Retry uploaded' };
  await page
    .getByRole('button', { name: 'Upload Recipe', exact: true })
    .click();
  await expect(page.getByText('Retry uploaded', { exact: true })).toBeVisible();
});
test('recipe tabs show empty lists and cancellation sends no save', async ({
  page,
  api
}) => {
  await page.goto('/onboard');
  for (const name of ['Service Recipe', 'Network Recipe', 'VNF Recipe']) {
    await page.getByRole('tab', { name, exact: true }).click();
    await page.getByRole('button', { name: 'Add Recipe', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Add Recipe', exact: true })
    ).toBeVisible();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  }
  expect(api.calls.filter((c) => c.method === 'POST')).toHaveLength(0);
});
test('a recipe requires fields then saves and refreshes its list', async ({
  page,
  api
}) => {
  await page.goto('/onboard');
  await page.getByRole('button', { name: 'Add Recipe', exact: true }).click();
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(
    page.getByText('Please fill valid data.', { exact: true })
  ).toBeVisible();
  await page.getByLabel('Service Model UUID', { exact: true }).fill('uuid');
  await page.getByLabel('Action', { exact: true }).fill('create');
  await page.getByLabel('Orchestration URI', { exact: true }).fill('/flow');
  await page.getByLabel('Recipe Timeout', { exact: true }).fill('60');
  const initial = api.calls.filter(
    (c) => c.path === '/serviceRecipes' && c.method === 'GET'
  ).length;
  api.recipes = [
    {
      serviceModelUUID: 'uuid',
      action: 'create',
      orchestrationUri: '/flow',
      recipeTimeout: '60'
    }
  ];
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(
    page.getByText('Data stored in database.', { exact: true })
  ).toBeVisible();
  await expect
    .poll(
      () =>
        api.calls.filter(
          (c) => c.path === '/serviceRecipes' && c.method === 'GET'
        ).length
    )
    .toBeGreaterThan(initial);
  await expect(page.getByText('uuid', { exact: true })).toBeVisible();
  await expect(
    page
      .getByRole('row')
      .filter({ has: page.getByText('uuid', { exact: true }) })
  ).toContainText('create');
  expect(
    JSON.parse(
      api.calls.find(
        (c) => c.path === '/serviceRecipes' && c.method === 'POST'
      )!.body!
    )
  ).toMatchObject({
    modelType: 'Service',
    modelVersionId: 'uuid',
    operation: 'create'
  });
});
