// Copyright (C) 2026 Deutsche Telekom AG. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
'use strict';

const fs = require('fs');
const path = require('path');
const spawnSync = require('child_process').spawnSync;
const thresholds = require('../coverage-thresholds.json').each.overrides;

function checkCoverage(summaryPath, startedAt) {
  if (fs.statSync(summaryPath).mtimeMs < startedAt) {
    throw new Error('Coverage summary is stale: ' + summaryPath);
  }
  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  if (!summary || typeof summary !== 'object' || Array.isArray(summary)) {
    throw new Error('Invalid coverage summary');
  }
  Object.keys(thresholds).forEach(function (pattern) {
    // The shared overrides use **/ followed by a literal source path.
    const suffix = pattern.slice(2);
    const files = Object.keys(summary).filter(function (file) {
      return file.replace(/\\/g, '/').endsWith(suffix);
    });
    if (files.length !== 1) {
      throw new Error('Expected one coverage file matching ' + pattern + ', found ' + files.length);
    }
    const file = files[0];
    Object.keys(thresholds[pattern]).forEach(function (metric) {
      const data = summary[file] && summary[file][metric];
      if (!data || typeof data.pct !== 'number' || !Number.isFinite(data.pct) || data.pct < 0 || data.pct > 100) {
        throw new Error('Invalid ' + metric + ' coverage for ' + file);
      }
      const floor = thresholds[pattern][metric];
      if (data.pct < floor) {
        throw new Error(file + ': ' + metric + ' coverage ' + data.pct + '% is below ' + floor + '%');
      }
    });
  });
}

function runTests(args, summaryPath) {
  // Angular 6 can report exit 0 before Istanbul has applied its thresholds.
  // An earlier report must never satisfy this invocation's independent gate.
  try {
    fs.unlinkSync(summaryPath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const startedAt = Date.now();
  const runner = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (runner.error) {
    console.error(runner.error.message);
    return 1;
  }
  if (runner.signal) {
    process.kill(process.pid, runner.signal);
    return 1;
  }
  if (runner.status !== 0) return runner.status || 1;
  try {
    checkCoverage(summaryPath, startedAt);
    console.log('Coverage gate passed for all shared per-file floors.');
    return 0;
  } catch (error) {
    console.error('Coverage gate failed: ' + error.message);
    return 1;
  }
}

module.exports = { checkCoverage: checkCoverage, runTests: runTests };
if (require.main === module) {
  const args = [require.resolve('@angular/cli/bin/ng'), 'test', '--watch=false',
    '--browsers=ChromeHeadless', '--progress=false', '--code-coverage'].concat(process.argv.slice(2));
  process.exitCode = runTests(args, path.join(__dirname, '../coverage/coverage-summary.json'));
}
