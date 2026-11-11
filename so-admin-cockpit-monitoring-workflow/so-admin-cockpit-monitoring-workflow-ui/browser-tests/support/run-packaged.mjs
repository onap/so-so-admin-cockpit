// Copyright (C) 2026 Deutsche Telekom AG. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { access, mkdir } from 'node:fs/promises';
import { createServer } from 'node:net';
import { resolve, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { startUpstreams } from './upstream-stubs.mjs';
const packageDir = fileURLToPath(new URL('..', import.meta.url));
const index = process.argv.indexOf('--jar');
const jar = index < 0 ? undefined : process.argv[index + 1];
if (!jar || !isAbsolute(jar))
  throw new Error('Supply --jar /absolute/path/to/executable.jar');
await access(jar);
await mkdir(resolve(packageDir, 'test-results'), { recursive: true });
const log = createWriteStream(resolve(packageDir, 'test-results/java.log'));
const stubLog = createWriteStream(
  resolve(packageDir, 'test-results/upstream.log')
);
const upstream = await startUpstreams(stubLog);
const socket = createServer();
await new Promise((r) => socket.listen(0, '127.0.0.1', r));
const port = socket.address().port;
await new Promise((r) => socket.close(r));
const baseURL = 'http://127.0.0.1:' + port;
const smokeUser = 'test-gui-user';
const smokePassword = 'test-password';
const authorization =
  'Basic ' + Buffer.from(smokeUser + ':' + smokePassword).toString('base64');
const args = [
  '-jar',
  jar,
  '--server.address=127.0.0.1',
  '--server.port=' + port,
  '--server.ssl.enabled=false',
  '--spring.profiles.active=test',
  '--spring.security.usercredentials[0].username=' + smokeUser,
  '--spring.security.usercredentials[0].password=$2a$10$zMcjLr9PPcJLjxLNA1aXbO8lF35HWevKNuBSNFT2Z//wSnsafaapi',
  '--spring.security.usercredentials[0].role=GUI-Client',
  '--camunda.rest.api.url=' + upstream.url + '/camunda/',
  '--camunda.rest.api.engine=default',
  '--camunda.rest.api.auth=Basic dGVzdDp0ZXN0',
  '--mso.database.rest.api.url=' + upstream.url + '/requestdb/',
  '--mso.database.rest.api.auth=Basic dGVzdDp0ZXN0',
  '--mso.catalog.db.endpoint=' + upstream.url + '/catalog',
  '--mso.catalog.db.spring.endpoint=' + upstream.url,
  '--mso.db.auth=Basic dGVzdDp0ZXN0',
  '--so.auth.username=cockpit-client',
  '--so.auth.password=cockpit-secret',
  '--bpmn.url=' + upstream.url + '/onboard'
];
const java = spawn('java', args, { stdio: ['ignore', 'pipe', 'pipe'] });
java.stdout.pipe(log);
java.stderr.pipe(log);
let startError;
java.on('error', (e) => (startError = e));
let runner;
async function terminate(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  child.kill('SIGTERM');
  await Promise.race([new Promise((r) => child.once('exit', r)), delay(5000)]);
  if (child.exitCode === null && child.signalCode === null) {
    child.kill('SIGKILL');
    await new Promise((r) => child.once('exit', r));
  }
}
async function cleanup() {
  await terminate(runner);
  await terminate(java);
  await upstream.close();
  log.end();
  stubLog.end();
}
for (const signal of ['SIGTERM', 'SIGINT'])
  process.once(signal, async () => {
    await cleanup();
    process.exit(130);
  });
try {
  let ready = false;
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    if (startError) throw startError;
    if (java.exitCode !== null)
      throw new Error(
        'Java exited before readiness; see test-results/java.log'
      );
    try {
      const response = await fetch(baseURL, {
        signal: AbortSignal.timeout(1000),
        headers: { Authorization: authorization }
      });
      if (
        response.ok &&
        response.headers.get('content-type')?.includes('text/html')
      ) {
        ready = true;
        break;
      }
    } catch {}
    await delay(250);
  }
  if (!ready)
    throw new Error(
      'Application readiness timed out; see test-results/java.log'
    );
  runner = spawn(
    process.execPath,
    ['node_modules/@playwright/test/cli.js', 'test', '--project=packaged'],
    {
      cwd: packageDir,
      env: {
        ...process.env,
        COCKPIT_BASE_URL: baseURL,
        COCKPIT_TEST_MODE: 'packaged',
        COCKPIT_USERNAME: smokeUser,
        COCKPIT_PASSWORD: smokePassword
      },
      stdio: 'inherit'
    }
  );
  const code = await new Promise((resolve, reject) => {
    runner.once('error', reject);
    runner.once('exit', (code) => resolve(code ?? 1));
  });
  if (upstream.unexpected.length)
    throw new Error(
      'Unexpected upstream requests: ' + upstream.unexpected.join(', ')
    );
  if (
    !upstream.calls.some((c) => c.startsWith('POST /requestdb/')) ||
    !upstream.calls.some((c) => c.includes('/history/process-instance'))
  )
    throw new Error('Smoke did not exercise the upstream APIs');
  process.exitCode = code;
} finally {
  await cleanup();
}
