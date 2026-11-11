// Copyright (C) 2026 Deutsche Telekom AG. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
if (!process.env.COCKPIT_BASE_URL)
  throw new Error('COCKPIT_BASE_URL is required for packaged tests');
if (
  Boolean(process.env.COCKPIT_USERNAME) !==
  Boolean(process.env.COCKPIT_PASSWORD)
) {
  throw new Error('Supply both COCKPIT_USERNAME and COCKPIT_PASSWORD');
}
const child = spawn(
  process.execPath,
  ['node_modules/@playwright/test/cli.js', 'test', '--project=packaged'],
  {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    env: { ...process.env, COCKPIT_TEST_MODE: 'packaged' },
    stdio: 'inherit'
  }
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => child.kill(signal));
process.exitCode = await new Promise((resolve, reject) => {
  child.once('error', reject);
  child.once('exit', (code) => resolve(code === null ? 1 : code));
});
