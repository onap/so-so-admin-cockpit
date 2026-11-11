// Copyright (C) 2026 Deutsche Telekom AG. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { test as base, expect, Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
export const row = {
  requestId: 'request-1',
  serviceInstanceId: 'service-1',
  serviceInstanceName: 'Demo service',
  networkId: 'network-1',
  requestStatus: 'COMPLETE',
  serviceType: 'test',
  startTime: 1577952000000,
  endTime: 1577952060000
};
export const xml = readFileSync(
  new URL('../fixtures/process.bpmn', import.meta.url),
  'utf8'
);
export const activity = {
  activityId: 'Task_1',
  activityName: 'Deploy',
  activityType: 'callActivity',
  processInstanceId: 'process-1',
  calledProcessInstanceId: 'child-1',
  startTime: null,
  endTime: null,
  durationInMillis: 1
};
export type Api = {
  rows: any[];
  searchStatus: number;
  lookupStatus: number;
  upload: any;
  uploadStatus: number;
  calls: { method: string; path: string; body: string | null }[];
  definition: string;
  processStatus: number;
  recipeStatus: number;
  recipes: any[];
};
export const test = base.extend<{ api: Api }>({
  api: async ({ page }, use) => {
    const api: Api = {
      rows: [row],
      searchStatus: 200,
      lookupStatus: 200,
      upload: { result: 'true', message: 'Workflow uploaded' },
      uploadStatus: 200,
      calls: [],
      definition: xml,
      processStatus: 200,
      recipeStatus: 200,
      recipes: []
    };
    const unexpected: string[] = [];
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
      console.error(error.message);
    });
    page.on('console', (message) => {
      if (message.type() === 'error' && /^ERROR\b/.test(message.text())) {
        errors.push(message.text());
      }
    });
    page.on('response', (response) => {
      const url = new URL(response.url());
      if (
        url.origin === 'http://127.0.0.1:4173' &&
        !url.pathname.startsWith('/so/monitoring') &&
        response.status() >= 400
      ) {
        unexpected.push(response.status() + ' ' + response.url());
      }
    });
    page.on('requestfailed', (request) => {
      const error = request.failure()?.errorText;
      if (request.isNavigationRequest() && error === 'net::ERR_ABORTED') return;
      unexpected.push(request.method() + ' ' + request.url() + ' ' + error);
    });
    await page.route('**/*', async (route) => {
      const request = route.request(),
        url = new URL(request.url());
      if (url.origin !== 'http://127.0.0.1:4173') {
        unexpected.push(request.url());
        await route.abort();
        return;
      }
      if (!url.pathname.startsWith('/so/monitoring')) {
        await route.continue();
        return;
      }
      const path = url.pathname.slice('/so/monitoring'.length),
        method = request.method();
      api.calls.push({ method, path, body: request.postData() });
      let json: any,
        status = 200;
      if (method === 'POST' && path === '/v1/search') {
        json = api.rows;
        status = api.searchStatus;
      } else if (method === 'GET' && path.startsWith('/process-instance-id/')) {
        json = { processInstanceId: 'process-1' };
        status = api.lookupStatus;
      } else if (method === 'GET' && path.startsWith('/process-instance/')) {
        json = {
          processInstanceId: path.split('/').pop(),
          processDefinitionId: 'definition-1',
          processDefinitionName: 'Provision service',
          superProcessInstanceId: null
        };
        status = api.processStatus;
      } else if (method === 'GET' && path.startsWith('/activity-instance/'))
        json = [activity];
      else if (method === 'GET' && path.startsWith('/process-definition/'))
        json = { processDefinitionXml: api.definition };
      else if (method === 'GET' && path.startsWith('/variable-instance/'))
        json = [{ name: 'region', type: 'String', value: 'west' }];
      else if (
        method === 'GET' &&
        ['/serviceRecipes', '/networkRecipes', '/vnfRecipes'].includes(path)
      )
        json = { [path.slice(1)]: api.recipes };
      else if (method === 'POST' && path === '/serviceRecipes') {
        json = { id: 'recipe-1' };
        status = api.recipeStatus;
      } else if (method === 'POST' && path === '/workflowPackages/onboard') {
        json = api.upload;
        status = api.uploadStatus;
      } else {
        unexpected.push(method + ' ' + path);
        status = 501;
        json = { errMsg: 'Unexpected request' };
      }
      await route.fulfill({ status, json });
    });
    await use(api);
    expect(unexpected, 'unexpected requests').toEqual([]);
    expect(errors, 'uncaught browser errors').toEqual([]);
  }
});
export { expect };
export async function search(page: Page) {
  await page.getByRole('button', { name: 'Search', exact: true }).click();
}
