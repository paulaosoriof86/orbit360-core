#!/usr/bin/env bash
set -euo pipefail

BRANCH='ays/backend-tenant-lab-v99-20260703'
REQUEST="${ORBIT360_VISUAL_REQUEST_PATH:-.github/orbit360-requests/visual-matrix-corrected-post-auth-lab-v20260805-authorization.json}"
HELPER='tools/orbit360-validate-runtime-transport-context-v20260806.mjs'
RUNNER='tools/orbit360-run-visual-matrix-corrected-post-auth-runtime-only-v3-cross-runner-v20260806.sh'
EVENT_NAME="${GITHUB_EVENT_NAME:-}"
EVENT_BASE_REF="${GITHUB_BASE_REF:-}"
CANONICAL_BRANCH="${ORBIT360_CANONICAL_BRANCH:-}"

[[ "${ORBIT360_RUNTIME_EXECUTION_AUTHORIZED:-false}" == 'true' ]] || {
  echo 'SOURCE_ONLY_NOT_AUTHORIZED_TRANSPORT_BASE_SHA'
  exit 64
}
[[ "$CANONICAL_BRANCH" == "$BRANCH" ]] || {
  echo 'STOP_RUNTIME_TRANSPORT_CONTEXT: CANONICAL_BRANCH_MISMATCH' >&2
  exit 41
}
[[ "$EVENT_NAME" == 'pull_request' ]] || {
  echo 'STOP_RUNTIME_TRANSPORT_CONTEXT: TRANSPORT_EVENT_MISMATCH' >&2
  exit 41
}
[[ -n "$EVENT_BASE_REF" ]] || {
  echo 'STOP_RUNTIME_TRANSPORT_CONTEXT: TRANSPORT_BASE_REF_MISSING' >&2
  exit 41
}
[[ -f "$REQUEST" && -f "$HELPER" && -f "$RUNNER" ]] || {
  echo 'STOP_RUNTIME_TRANSPORT_CONTEXT: SOURCE_FILE_MISSING' >&2
  exit 41
}

BASE_SHA="$(git rev-parse "origin/${EVENT_BASE_REF}^{commit}" 2>/dev/null)" || {
  echo 'STOP_RUNTIME_TRANSPORT_CONTEXT: TRANSPORT_BASE_SHA_UNRESOLVED' >&2
  exit 41
}

node "$HELPER" "$REQUEST" "$EVENT_NAME" "$EVENT_BASE_REF" "$BASE_SHA" "$BRANCH"

# The v3 runner retains its audited canonical-branch boundary. The actual
# transport base has already been proven equal to request.parentHead above.
exec env GITHUB_BASE_REF="$BRANCH" bash "$RUNNER"
