# SO Admin Cockpit frontend

The application builds with Node **10.19.0** and Yarn **1.7.0**, installed by Maven in the UI module's `target/node/`. Angular 6 and TypeScript 2.7 are retained. `yarn.lock` is the authoritative application lockfile.

```sh
yarn install --frozen-lockfile
yarn test:ci
yarn build
```

Set `CHROME_BIN` to an installed Chrome/Chromium executable if it is not on PATH. `yarn test` runs the interactive Karma watcher; use Jasmine's `fit`/`fdescribe` temporarily for focused development and restore them before review. The CI command performs one headless run and fails for failed assertions or coverage regressions.

Unit/component tests use real templates, Angular HTTP testing and controlled service/BPMN boundaries. They cover search filters and statistics, HTTP bodies/errors, detail navigation and viewer lifecycle, uploads, and all recipe form modes. Always flush HTTP requests; teardown verifies there are none outstanding. Await asynchronous work rather than ignoring error emissions.

Reports: `test-results/unit/junit.xml`, `coverage/index.html`, `coverage/lcov.info` and `coverage/coverage-summary.json`. All application sources are loaded for coverage; only test helpers, tests, bootstrap/polyfill and environment files are excluded. Karma holds per-file coverage floors at the measured baseline rounded down; raise them as tests improve and review any reduction.

From the repository root with Java 17:

```sh
mvn -pl so-admin-cockpit-monitoring-workflow/so-admin-cockpit-monitoring-workflow-ui -am test
```

Maven runs `test:ci` in the test phase. `-DskipTests` skips execution; `-DskipFrontendTests=true` delegates it to the browser CI job. A frozen install and production build still run.

Browser regression and packaged-application smoke tests are a separate package at `../../../browser-tests`. Switch to Node 22 there and follow its README; Protractor has been retired. Do not run modern browser tooling under the legacy application's Node runtime.
