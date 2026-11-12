# Browser regression tests

Use Node 22 (`nvm use`) in this directory; CI pins 22.23.2. The Angular package retains Node 10.19.0 and Yarn 1.7.0; never add these dependencies to that package.

```sh
npm ci
npx playwright install --with-deps chromium
npm test
npm test -- --repeat-each=3
npm run report
```

Build the application first using `yarn build` under its legacy runtime. Mocked tests serve that optimized bundle on loopback port 4173. Set an absolute `COCKPIT_DIST_DIR` to use another bundle. An occupied port fails the run. All cockpit APIs are intercepted per test; unknown endpoints, external requests, failed assets/requests and uncaught browser errors fail the test. Intentional cockpit HTTP errors are configured explicitly by the scenario; cancelled navigations are ignored. Fixtures are synthetic and owned by the scenarios in `tests/workflows.spec.ts`, `tests/keyboard.spec.ts` and `support/cockpit-api.ts`. Keep the real BPMN viewer in browser tests.

The sixteen scenarios cover search criteria/navigation, empty results/statistics, date validation, lookup failures, BPMN rendering/drill-down, activities/variables, malformed diagrams, process failures, upload validation/retry, and recipe validation/save/cancel. The four keyboard cases additionally cover Enter search, home/onboard links, activity drill-down, manual tab selection, Add dialog focus trapping and Escape/Cancel focus return, every Modify mode, actual accessible validation descriptions, and BPMN zoom/overlay activation. Unit tests cover each recipe mode's payload and error boundaries.

## Packaged application

Build the full Maven reactor with its Java 17 runtime so the executable includes the same production UI:

```sh
# From the repository root:
export JAVA_HOME=/usr/lib/jvm/temurin-17-jdk-amd64
export PATH="$JAVA_HOME/bin:$PATH"
mvn verify
# From this browser-tests directory, select Node 22 (22.23.2 in CI):
export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH"
COCKPIT_DIST_DIR=/absolute/path/to/current/dist/ONAP-SO-Monitor npm test
npm run smoke:local -- --jar /absolute/path/to/current/service.jar
```

Use the executable and bundle produced by that same source checkout. Its JAR must contain `BOOT-INF/classes/static/index.html` and each referenced JS/CSS bundle; compare those entries to the current production dist when validating packaging. `mvn verify -DskipTests` and `mvn verify -Dmaven.test.skip=true` still build/package the UI but omit unit/coverage and lint checks. `-DskipFrontendTests=true` remains available for the legacy CI jobs. No browser suite is implicitly added to Maven.

The runner configures a synthetic GUI account and authenticates readiness checks and packaged tests. Credentials are restricted to the application origin and supplied only to the local process; production authentication settings are unchanged. For an already running authenticated instance, supply both `COCKPIT_USERNAME` and `COCKPIT_PASSWORD`.

The runner starts Java and strict local Camunda/RequestDB stubs with synthetic credentials, disables TLS only for that local process, waits up to 60 seconds for readiness, and cleans up on success, failure or termination. CatalogDB and onboarding URLs also point to the stubs; unrecognized requests fail the run. Three tests check production assets, actual search/detail controller JSON and bookmarked detail refresh. These tests never intercept cockpit APIs. They validate packaging and controller integration; live ONAP integration is separate.

For an already running fixture-configured instance:

```sh
COCKPIT_BASE_URL=http://127.0.0.1:9091 COCKPIT_USERNAME=test-gui-user COCKPIT_PASSWORD=test-password npm run test:smoke
```

JUnit is in `test-results/browser.xml` and `test-results/smoke.xml`. Screenshots/traces are retained on failure under distinct `test-results/*-artifacts/` directories. HTML reports are in `playwright-report/mocked/` and `playwright-report/smoke/`. Java/upstream logs remain in `test-results/`.

## Jenkins

The voting frontend job uses `../ci/Dockerfile`, with matching Playwright browsers, Node 22 and Java 17. It runs Maven unit tests and then `../ci/verify-frontend.sh` against the production bundle and executable from that build. The script requires absolute `COCKPIT_DIST_DIR` and `COCKPIT_JAR`. Legacy Maven verify, merge and release-stage jobs use `-DskipFrontendTests=true`; the frontend gate owns all three UI test layers. `-DskipTests` and `-Dmaven.test.skip=true` also skip frontend unit/coverage and lint checks when packaging locally. JUnit, coverage and failure artifacts are published even when a gate fails. The job definition is maintained separately in ONAP ci-management.

The enforced per-file coverage floors are declared once in [`../src/main/frontend/coverage-thresholds.json`](../src/main/frontend/coverage-thresholds.json), shared by Karma and the independent `test:ci` summary gate. See the frontend README for pinned-runtime unit/lint commands, skip semantics and coverage-gate regression checks. JUnit and all coverage/browser artifacts remain available when a check fails.
