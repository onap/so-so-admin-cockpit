#!/usr/bin/env bash
# Copyright (C) 2026 Deutsche Telekom AG. All rights reserved.
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail
[[ $(node -p 'process.versions.node.split(".")[0]') == 22 ]] || { echo 'Node 22 required' >&2; exit 1; }
: "${COCKPIT_DIST_DIR:?Set absolute COCKPIT_DIST_DIR}"
: "${COCKPIT_JAR:?Set absolute COCKPIT_JAR}"
[[ "$COCKPIT_DIST_DIR" = /* && -f "$COCKPIT_DIST_DIR/index.html" ]] || { echo 'Missing production bundle' >&2; exit 1; }
[[ "$COCKPIT_JAR" = /* && -f "$COCKPIT_JAR" ]] || { echo 'Missing executable jar' >&2; exit 1; }
cd "$(dirname "${BASH_SOURCE[0]}")/../browser-tests"
npm ci
npm test
npm run smoke:local -- --jar "$COCKPIT_JAR"
