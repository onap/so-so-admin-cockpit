# Browser regression tests

Use Node 22 (`nvm use`) in this directory. The Angular package retains Node 10.19.0 and Yarn 1.7.0; never add these dependencies to that package.

```sh
npm ci
npx playwright install --with-deps chromium
npm test
npm test -- --repeat-each=3
npm run report
```

Build the application first using `yarn build` under its legacy runtime. Mocked tests serve that optimized bundle on loopback port 4173. Set an absolute `COCKPIT_DIST_DIR` to use another bundle. An occupied port fails the run. All cockpit APIs are intercepted per test; unknown endpoints, external requests, failed assets/requests and uncaught browser errors fail the test. Intentional cockpit HTTP errors are configured explicitly by the scenario; cancelled navigations are ignored. Fixtures are synthetic and owned by the scenarios in `tests/workflows.spec.ts` and `support/cockpit-api.ts`. Keep the real BPMN viewer in browser tests.

The twelve scenarios cover search criteria/navigation, empty results/statistics, date validation, lookup failures, BPMN rendering/drill-down, activities/variables, malformed diagrams, process failures, upload validation/retry, and recipe validation/save/cancel. Unit tests cover each recipe mode's payload and error boundaries.

## Packaged application

Build the full Maven reactor with its Java 17 runtime so the executable includes the same production UI:

```sh
mvn clean package -DskipTests
npm run smoke:local -- --jar /absolute/path/to/service.jar
```

The runner configures a synthetic GUI account and authenticates readiness checks and packaged tests. Credentials are restricted to the application origin and supplied only to the local process; production authentication settings are unchanged. For an already running authenticated instance, supply both `COCKPIT_USERNAME` and `COCKPIT_PASSWORD`.

The runner starts Java and strict local Camunda/RequestDB stubs with synthetic credentials, disables TLS only for that local process, waits up to 60 seconds for readiness, and cleans up on success, failure or termination. CatalogDB and onboarding URLs also point to the stubs; unrecognized requests fail the run. Three tests check production assets, actual search/detail controller JSON and bookmarked detail refresh. These tests never intercept cockpit APIs. They validate packaging and controller integration; live ONAP integration is separate.

For an already running fixture-configured instance:

```sh
COCKPIT_BASE_URL=http://127.0.0.1:9091 COCKPIT_USERNAME=test-gui-user COCKPIT_PASSWORD=test-password npm run test:smoke
```

JUnit is in `test-results/browser.xml` and `test-results/smoke.xml`. Screenshots/traces are retained on failure under distinct `test-results/*-artifacts/` directories. HTML reports are in `playwright-report/mocked/` and `playwright-report/smoke/`. Java/upstream logs remain in `test-results/`.

## Jenkins

The voting frontend job uses `../ci/Dockerfile`, with matching Playwright browsers, Node 22 and Java 17. It runs Maven unit tests and then `../ci/verify-frontend.sh` against the production bundle and executable from that build. The script requires absolute `COCKPIT_DIST_DIR` and `COCKPIT_JAR`. Legacy Maven verify, merge and release-stage jobs use `-DskipFrontendTests=true`; the frontend gate owns all three UI test layers. `-DskipTests` also skips unit execution when packaging locally. JUnit, coverage and failure artifacts are published even when a gate fails. The job definition is maintained separately in ONAP ci-management.

Observed development runs: 84 unit/component cases took about 23 seconds in the browser (about 53 seconds including compilation); the twelve mocked cases took about 22 seconds. Remeasure after test/runtime changes rather than enforcing a timing assumption.

The three packaged cases took about seven seconds after Java readiness; local startup took about twenty seconds.

The initial per-file coverage floors (statements / branches / functions / lines, percent) are:

| File | Statements | Branches | Functions | Lines |
| --- | ---: | ---: | ---: | ---: |
| DataService | 100 | 100 | 100 | 100 |
| HTTP error handler | 100 | 83 | 100 | 100 |
| SearchData | 97 | 96 | 100 | 97 |
| Home | 100 | 100 | 100 | 100 |
| Details | 93 | 67 | 96 | 98 |
| Onboard | 90 | 73 | 86 | 88 |
| Recipe | 97 | 83 | 100 | 97 |

The measured whole-application baseline was 95.90% statements, 79.85% branches, 95.80% functions and 97.02% lines. The JSON summary records exact per-file measurements; each enforced floor is rounded down to an integer.
