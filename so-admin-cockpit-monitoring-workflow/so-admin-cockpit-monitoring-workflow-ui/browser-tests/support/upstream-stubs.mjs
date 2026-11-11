// Copyright (C) 2026 Deutsche Telekom AG. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
export async function startUpstreams(log) {
  const fixtures = JSON.parse(
    await readFile(
      new URL('../fixtures/upstream.json', import.meta.url),
      'utf8'
    )
  );
  const xml = await readFile(
    new URL('../fixtures/process.bpmn', import.meta.url),
    'utf8'
  );
  const unexpected = [];
  const calls = [];
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const path = url.pathname;
    let value;
    calls.push(req.method + ' ' + url.pathname + url.search);
    log.write(req.method + ' ' + req.url + '\n');
    if (
      req.method === 'POST' &&
      path === '/requestdb/v1/getInfraActiveRequests' &&
      url.searchParams.has('from') &&
      url.searchParams.has('to')
    )
      value = fixtures.search;
    else if (
      req.method === 'GET' &&
      path === '/camunda/default/history/process-instance' &&
      url.searchParams.get('variables') === 'requestId_eq_request-1'
    )
      value = [fixtures.process];
    else if (
      req.method === 'GET' &&
      path === '/camunda/default/history/process-instance/process-1'
    )
      value = fixtures.process;
    else if (
      req.method === 'GET' &&
      path === '/camunda/default/history/activity-instance' &&
      url.searchParams.get('processInstanceId') === 'process-1'
    )
      value = fixtures.activities;
    else if (
      req.method === 'GET' &&
      path === '/camunda/default/history/variable-instance' &&
      url.searchParams.get('processInstanceId') === 'process-1'
    )
      value = fixtures.variables;
    else if (
      req.method === 'GET' &&
      path === '/camunda/default/process-definition/definition-1/xml'
    )
      value = { bpmn20Xml: xml };
    else {
      unexpected.push(req.method + ' ' + req.url);
      res
        .writeHead(501, { 'Content-Type': 'application/json' })
        .end(JSON.stringify({ error: 'Unexpected upstream request' }));
      return;
    }
    for await (const chunk of req) {
    }
    res
      .writeHead(200, { 'Content-Type': 'application/json' })
      .end(JSON.stringify(value));
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return {
    url: 'http://127.0.0.1:' + server.address().port,
    unexpected,
    calls,
    close: () => new Promise((resolve) => server.close(resolve))
  };
}
