// Copyright (C) 2026 Deutsche Telekom AG. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const childProcess = require('child_process');
const thresholds = require('../coverage-thresholds.json').each.overrides;
const gate = require('./test-ci');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'cockpit-coverage-gate-'));
const summaryPath = path.join(temp, 'coverage-summary.json');
const passing = { total: {} };
Object.keys(thresholds).forEach(function (pattern) {
  const file = '/workspace/' + pattern.slice(3);
  passing[file] = {};
  Object.keys(thresholds[pattern]).forEach(function (metric) {
    passing[file][metric] = { pct: thresholds[pattern][metric] };
  });
});
let count = 0;
function test(name, check) {
  check();
  count++;
  console.log('PASS ' + name);
}
function write(summary) {
  fs.writeFileSync(summaryPath, JSON.stringify(summary));
}
function copy() {
  return JSON.parse(JSON.stringify(passing));
}
const firstFile = Object.keys(passing)[1];
try {
  test('accepts complete coverage at the shared floors', function () {
    write(passing);
    gate.checkCoverage(summaryPath, 0);
  });
  test('rejects below-floor coverage despite assertion success', function () {
    const summary = copy();
    summary[firstFile].lines.pct = 0;
    write(summary);
    assert.throws(function () { gate.checkCoverage(summaryPath, 0); }, /below/);
  });
  test('rejects a missing summary', function () {
    fs.unlinkSync(summaryPath);
    assert.throws(function () { gate.checkCoverage(summaryPath, 0); }, /ENOENT/);
  });
  test('rejects malformed JSON', function () {
    fs.writeFileSync(summaryPath, '{');
    assert.throws(function () { gate.checkCoverage(summaryPath, 0); }, /JSON/);
  });
  test('rejects a missing expected file', function () {
    const summary = copy();
    delete summary[firstFile];
    write(summary);
    assert.throws(function () { gate.checkCoverage(summaryPath, 0); }, /Expected one/);
  });
  test('rejects missing and malformed metric data', function () {
    [undefined, { pct: '100' }, { pct: null }, { pct: -1 }, { pct: 101 }].forEach(function (metric) {
      const summary = copy();
      summary[firstFile].lines = metric;
      write(summary);
      assert.throws(function () { gate.checkCoverage(summaryPath, 0); }, /Invalid/);
    });
  });
  test('rejects a stale summary', function () {
    write(passing);
    fs.utimesSync(summaryPath, new Date(0), new Date(0));
    assert.throws(function () { gate.checkCoverage(summaryPath, Date.now()); }, /stale/);
  });
  test('deletes an earlier summary before executing the runner', function () {
    write(passing);
    const inspect = 'if (require("fs").existsSync(' + JSON.stringify(summaryPath) + ')) process.exit(91);';
    assert.strictEqual(gate.runTests(['-e', inspect], summaryPath), 1);
    assert.strictEqual(fs.existsSync(summaryPath), false);
  });
  test('preserves the runner failure exit code', function () {
    assert.strictEqual(gate.runTests(['-e', 'process.exit(23)'], summaryPath), 23);
  });
  test('preserves runner termination signals', function () {
    const invoke = 'require(' + JSON.stringify(path.join(__dirname, 'test-ci.js')) + ').runTests(["-e", "process.kill(process.pid, \'SIGTERM\')"], ' + JSON.stringify(summaryPath) + ');';
    const child = childProcess.spawnSync(process.execPath, ['-e', invoke]);
    assert.strictEqual(child.signal, 'SIGTERM');
  });
  test('requires and accepts coverage newly written by the runner', function () {
    const create = 'require("fs").writeFileSync(' + JSON.stringify(summaryPath) + ', ' + JSON.stringify(JSON.stringify(passing)) + ');';
    assert.strictEqual(gate.runTests(['-e', create], summaryPath), 0);
  });
  test('fails an assertion-green runner that writes below-floor coverage', function () {
    const summary = copy();
    summary[firstFile].lines.pct = 0;
    const create = 'require("fs").writeFileSync(' + JSON.stringify(summaryPath) + ', ' + JSON.stringify(JSON.stringify(summary)) + ');';
    assert.strictEqual(gate.runTests(['-e', create], summaryPath), 1);
  });
} finally {
  if (fs.existsSync(summaryPath)) fs.unlinkSync(summaryPath);
  fs.rmdirSync(temp);
}
console.log(count + ' coverage gate checks passed');
