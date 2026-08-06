#!/usr/bin/env bash
set -euo pipefail

BRANCH='ays/backend-tenant-lab-v99-20260703'
REQUEST='.github/orbit360-requests/visual-matrix-corrected-post-auth-lab-v20260805-authorization.json'
GATE='block2.7-visual-matrix-corrected-post-auth-lab-v20260805'
OUT='orbit360-platform/runtime-gate-crm-v20260716/visual-matrix-corrected-post-auth-preflight-sanitized-v20260805.json'

[[ "${GITHUB_REF_NAME:-}" == "$BRANCH" ]]
[[ "${GITHUB_RUN_ATTEMPT:-1}" == '1' ]]
[[ -f "$REQUEST" ]]
mapfile -t REQUEST_COMMITS < <(git log --format=%H -- "$REQUEST")
[[ "${#REQUEST_COMMITS[@]}" == '1' ]]
REQUEST_COMMIT="${REQUEST_COMMITS[0]}"
PARENT="$(git rev-parse "$REQUEST_COMMIT^")"
mapfile -t CHANGED < <(git diff-tree --no-commit-id --name-only -r "$REQUEST_COMMIT")
[[ "${#CHANGED[@]}" == '1' ]]
[[ "${CHANGED[0]}" == "$REQUEST" ]]
[[ "$(git rev-parse HEAD)" == "$REQUEST_COMMIT" ]]

jq -e --arg parent "$PARENT" '
  .schemaVersion=="orbit360-visual-matrix-corrected-post-auth-request-v1" and
  .gateId=="block2.7-visual-matrix-corrected-post-auth-lab-v20260805" and
  .contractVersion=="2.7.8" and
  .status=="AUTHORIZED_ONCE" and
  .approved==true and
  .allowedExecutions==1 and
  .consumed==false and
  .replayAllowed==false and
  .parentHead==$parent
' "$REQUEST" >/dev/null

export ORBIT360_REQUEST_FILE="$REQUEST"
node tools/orbit360-validar-gate-contracts-v20260717.mjs "$GATE"
cp orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json "$OUT"

jq -e '
  .status=="GO_GATE_CONTRACT" and
  .contractVersion=="2.7.8" and
  .failed==0 and
  .ok==true and
  .secretAccess==false and
  .browserExecuted==false and
  .deployExecuted==false and
  .firestoreWrites==0 and
  .authWrites==0 and
  .operationalWrites==0
' "$OUT" >/dev/null

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  echo 'go=true' >> "$GITHUB_OUTPUT"
fi
