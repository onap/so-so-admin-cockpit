#!/usr/bin/env bash
# Copyright (C) 2026 Deutsche Telekom AG. All rights reserved.
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../../.."
repo_dir=$PWD
ui_dir="$repo_dir/so-admin-cockpit-monitoring-workflow/so-admin-cockpit-monitoring-workflow-ui"
rm -rf "$ui_dir/src/main/frontend/test-results" "$ui_dir/src/main/frontend/coverage"     "$ui_dir/browser-tests/test-results" "$ui_dir/browser-tests/playwright-report"
cd "$ui_dir/browser-tests"
npm ci
browser_path=$(node -e 'process.stdout.write(require("playwright").chromium.executablePath())')
[[ -x "$browser_path" ]] || { echo 'Matching Playwright Chromium must be installed' >&2; exit 1; }
chrome_wrapper=$(mktemp)
trap 'rm -f "$chrome_wrapper"' EXIT
printf '#!/bin/sh\nexec "%s" --no-sandbox --disable-dev-shm-usage "$@"\n' "$browser_path" > "$chrome_wrapper"
chmod +x "$chrome_wrapper"
export CHROME_BIN="$chrome_wrapper"
cd "$repo_dir"
mvn --batch-mode -gs /tmp/cockpit-global-settings.xml -s /tmp/cockpit-settings.xml clean install
export COCKPIT_DIST_DIR="$ui_dir/src/main/frontend/dist/ONAP-SO-Monitor"
service_dir="$repo_dir/so-admin-cockpit-monitoring-workflow/so-admin-cockpit-monitoring-workflow-service"
mapfile -t jars < <(find "$service_dir/target" -maxdepth 1 -name '*.jar' -type f)
[[ ${#jars[@]} == 1 ]] || { echo 'Expected one executable jar' >&2; exit 1; }
export COCKPIT_JAR="${jars[0]}"
bash "$ui_dir/ci/verify-frontend.sh"
