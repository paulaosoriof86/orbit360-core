#!/usr/bin/env bash
set -uo pipefail

BRANCH='ays/backend-tenant-lab-v99-20260703'
REQUEST='.github/orbit360-requests/visual-matrix-corrected-post-auth-lab-v20260805-authorization.json'
GATE='block2.7-visual-matrix-corrected-post-auth-lab-v20260805'
OUT='orbit360-platform/runtime-gate-crm-v20260716/visual-matrix-corrected-post-auth-preflight-sanitized-v20260805.json'
CANONICAL='orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json'
JSON_GUARD='tools/orbit360-json-guard-visual-matrix-runtime-v20260806.mjs'
DEFAULT_LIFECYCLE='tools/orbit360-validator-lifecycle-contract-visual-matrix-corrected-post-auth-lab-v20260805.json'
LIFECYCLE="${ORBIT360_LIFECYCLE:-$DEFAULT_LIFECYCLE}"
NODE_BIN="${ORBIT360_NODE_BIN:-node}"
TRANSPORT_HEAD_REF="${ORBIT360_TRANSPORT_HEAD_REF:-}"
EXPECTED_REQUEST_VERSION="${ORBIT360_EXPECTED_REQUEST_VERSION:-NONE_PENDING_FRESH_AUTHORIZATION}"

emit_failure() {
  local check_id="$1"
  local detail="$2"
  local exit_code="${3:-41}"
  mkdir -p "$(dirname "$OUT")"
  "$NODE_BIN" "$JSON_GUARD" emit-failure "$OUT" "$GATE" "$check_id" "$detail" "$exit_code"
  exit "$exit_code"
}

command -v "$NODE_BIN" >/dev/null 2>&1 || {
  printf '%s\n' 'STOP_PREFLIGHT_RELAY: NODE_EXECUTOR_UNAVAILABLE' >&2
  exit 41
}
[[ -f "$JSON_GUARD" ]] || {
  printf '%s\n' 'STOP_PREFLIGHT_RELAY: JSON_GUARD_MISSING' >&2
  exit 41
}

[[ "${ORBIT360_RUNTIME_RELAY_AUTHORIZED:-false}" == 'true' ]] || emit_failure 'RELAY_NOT_AUTHORIZED' 'The registered relay was not explicitly enabled.'
[[ "${ORBIT360_CANONICAL_BRANCH:-}" == "$BRANCH" ]] || emit_failure 'CANONICAL_BRANCH_MISMATCH' 'ORBIT360_CANONICAL_BRANCH is not canonical.'
[[ "$TRANSPORT_HEAD_REF" == "$BRANCH" ]] || emit_failure 'TRANSPORT_HEAD_REF_MISMATCH' 'The pull request head is not the canonical Orbit branch.'
[[ "${GITHUB_EVENT_NAME:-}" == 'pull_request' ]] || emit_failure 'TRANSPORT_EVENT_MISMATCH' 'The relay requires a same-repository pull_request synchronize event.'
[[ "${GITHUB_RUN_ATTEMPT:-1}" == '1' ]] || emit_failure 'RUN_ATTEMPT_NOT_ONE' 'Only the first workflow attempt is authorized.'
[[ "$EXPECTED_REQUEST_VERSION" != 'NONE_PENDING_FRESH_AUTHORIZATION' ]] || emit_failure 'FRESH_AUTHORIZATION_NOT_REGISTERED' 'No fresh immutable runtime request is registered.'
[[ -f "$REQUEST" ]] || emit_failure 'REQUEST_FILE_MISSING' 'The immutable authorization request is absent.'
[[ -f "$LIFECYCLE" ]] || emit_failure 'LIFECYCLE_FILE_MISSING' 'The runtime lifecycle contract is absent.'

REQUEST_COMMIT="$(git rev-parse HEAD 2>/dev/null)" || emit_failure 'REQUEST_COMMIT_UNRESOLVED' 'Unable to resolve request HEAD.'
PARENT="$(git rev-parse "$REQUEST_COMMIT^" 2>/dev/null)" || emit_failure 'REQUEST_PARENT_UNRESOLVED' 'Unable to resolve request parent.'
mapfile -t CHANGED < <(git diff-tree --no-commit-id --name-only -r "$REQUEST_COMMIT")
[[ "${#CHANGED[@]}" == '1' ]] || emit_failure 'REQUEST_COMMIT_NOT_SINGLE_FILE' "The request commit changed ${#CHANGED[@]} files."
[[ "${CHANGED[0]}" == "$REQUEST" ]] || emit_failure 'REQUEST_COMMIT_WRONG_FILE' "The sole path is ${CHANGED[0]}."

"$NODE_BIN" "$JSON_GUARD" validate-request "$REQUEST" "$PARENT" "$EXPECTED_REQUEST_VERSION" "$LIFECYCLE" ||
  emit_failure 'REQUEST_CONTRACT_INVALID' 'The request does not match the registered lifecycle baseline contract.'

export ORBIT360_REQUEST_FILE="$REQUEST"
"$NODE_BIN" tools/orbit360-validar-gate-contracts-v20260717.mjs "$GATE"
ROUTER_STATUS=$?
[[ -f "$CANONICAL" ]] || emit_failure 'CANONICAL_EVIDENCE_MISSING' "Canonical router exited $ROUTER_STATUS without evidence."
cp "$CANONICAL" "$OUT" || emit_failure 'CANONICAL_EVIDENCE_COPY_FAILED' 'Unable to copy durable evidence.'

if [[ "$ROUTER_STATUS" != '0' ]]; then
  cat "$OUT"
  exit 41
fi

"$NODE_BIN" "$JSON_GUARD" validate-go "$OUT" ||
  emit_failure 'CANONICAL_GO_EVIDENCE_INVALID' 'Canonical evidence is not an admissible GO_GATE_CONTRACT.'

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  echo 'go=true' >> "$GITHUB_OUTPUT"
fi
cat "$OUT"
