# SO Admin Cockpit frontend

The application builds with Node **10.19.0** and Yarn **1.7.0**, installed by Maven in the UI module's `target/node/`. Angular 6 and TypeScript 2.7 are retained. `yarn.lock` is the authoritative application lockfile.

From this frontend directory, use the pinned runtime for Yarn and its child commands:

```sh
export PATH="$PWD/../../../target/node:$PATH"
../../../target/node/node ../../../target/node/yarn/dist/bin/yarn.js install --frozen-lockfile
../../../target/node/node ../../../target/node/yarn/dist/bin/yarn.js start
../../../target/node/node ../../../target/node/yarn/dist/bin/yarn.js lint
../../../target/node/node ../../../target/node/yarn/dist/bin/yarn.js test:ci
../../../target/node/node ../../../target/node/yarn/dist/bin/yarn.js build
```

`yarn start` serves HTTPS using the checked-in development certificate. Browser acceptance uses the separate loopback HTTP fixture server described below.

Set `CHROME_BIN` to an installed Chrome/Chromium executable if it is not on PATH, for example `export CHROME_BIN=/usr/bin/chromium`. Ordinary runs retain Chrome's sandbox. An isolated CI runner that cannot initialize the sandbox can explicitly opt in for that command:

```sh
KARMA_NO_SANDBOX=true ../../../target/node/node ../../../target/node/yarn/dist/bin/yarn.js test:ci
```

Only the exact value `true` enables this launcher; use it only in an isolated runner. The same setting works with the Maven command below.

`yarn test` runs the interactive Karma watcher; use Jasmine's `fit`/`fdescribe` temporarily for focused development and restore them before review. The CI command first checks the dependency-free coverage wrapper, then performs one headless run and fails for failed assertions or coverage regressions. Angular 6 can return success before its Istanbul reporter applies the coverage floor, so `scripts/test-ci.js` also validates the generated JSON summary. It deletes the previous summary before launching Angular, preserves runner failures and signals, and rejects missing, malformed, stale or below-floor results. Karma and the wrapper read the same unchanged per-file floors from `coverage-thresholds.json`.

The dependency-free wrapper regression checks also run with the pinned runtime:

```sh
../../../target/node/node scripts/test-ci.spec.js
```

Unit/component tests use real templates, Angular HTTP testing and controlled service/BPMN boundaries. They cover search filters and statistics, HTTP bodies/errors, detail navigation and viewer lifecycle, uploads, and all recipe form modes. Always flush HTTP requests; teardown verifies there are none outstanding. Await asynchronous work rather than ignoring error emissions.

Reports: `test-results/unit/junit.xml`, `coverage/index.html`, `coverage/lcov.info` and `coverage/coverage-summary.json`. All application sources are loaded for coverage; only test helpers, tests, bootstrap/polyfill and environment files are excluded. Karma holds per-file coverage floors at the measured baseline rounded down; raise them as tests improve and review any reduction.

From the repository root with Java 17:

```sh
export JAVA_HOME=/usr/lib/jvm/temurin-17-jdk-amd64
export PATH="$JAVA_HOME/bin:$PATH"
mvn -pl so-admin-cockpit-monitoring-workflow/so-admin-cockpit-monitoring-workflow-ui -am verify
mvn verify
```

Maven runs `test:ci` once in the test phase and lint in verify. Either `-DskipTests` or `-Dmaven.test.skip=true` skips both frontend checks; `-DskipFrontendTests=true` retains the explicit CI opt-out. All three still run the frozen install and production build, and full-reactor packaging still includes the UI. Normal `mvn verify` enforces assertions, coverage and lint; browser acceptance is a separate command with Node 22 and provisioned Playwright Chromium.

Browser regression and packaged-application smoke tests are a separate package at `../../../browser-tests`. Switch to Node 22 there and follow its README; Protractor has been retired. Do not run modern browser tooling under the legacy application's Node runtime.

Recipe Add and Modify both use the existing backend create endpoint; Modify prefills a new recipe rather than updating its original row. The backend assigns a fresh ID and stores a timeout of 180 seconds. The frontend removes one leading `/mso/async/services/` prefix from the flow it submits. Failed HTTP requests, HTTP-200 application errors and invalid save responses retain the form for correction/retry; a save in progress prevents duplicate submission. Only a successful save closes and refreshes the list. Cancel and Escape close without a POST and return focus to the opener.
