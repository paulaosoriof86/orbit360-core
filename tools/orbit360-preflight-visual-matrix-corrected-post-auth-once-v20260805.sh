#!/usr/bin/env bash
set -uo pipefail

BRANCH='ays/backend-tenant-lab-v99-20260703'
REQUEST='.github/orbit360-requests/visual-matrix-corrected-post-auth-lab-v20260805-authorization.json'
GATE='block2.7-visual-matrix-corrected-post-auth-lab-v20260805'
OUT='orbit360-platform/runtime-gate-crm-v20260716/visual-matrix-corrected-post-auth-preflight-sanitized-v20260805.json'
CANONICAL='orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json'
NODE_BIN="${ORBIT360_NODE_BIN:-node}"
CANONICAL_BRANCH="${ORBIT360_CANONICAL_BRANCH:-}"
EVENT_NAME="${GITHUB_EVENT_NAME:-}"
EVENT_BASE_REF="${GITHUB_BASE_REF:-}"

emit_wrapper_failure() {
  local check_id="$1"
  local detail="$2"
  local exit_code="${3:-41}"
  mkdir -p "$(dirname "$OUT")"
  jq -n \
    --arg gate "$GATE" \
    --arg checkpoint "$check_id" \
    --arg detail "$detail" \
    --argjson exitCode "$exit_code" '
    {
      schemaVersion:"orbit360-visual-matrix-corrected-post-auth-preflight-wrapper-v4",
      gateId:$gate,
      contractVersion:"2.7.8",
      status:"STOP_PREFLIGHT_WRAPPER",
      classification:"PIPELINE_MECHANISM_FAILURE",
      failed:1,
      failedCheckIds:[$checkpoint],
      wrapperCheckpoint:$checkpoint,
      wrapperDetail:$detail,
      wrapperExitCode:$exitCode,
      dataAccess:false,
      secretAccess:false,
      secretsRead:false,
      firestoreRead:false,
      firestoreWrites:0,
      authWrites:0,
      operationalWrites:0,
      runtimeExecuted:false,
      browserExecuted:false,
      backupExecuted:false,
      deployExecuted:false,
      productionTouched:false,
      containsPII:false,
      containsSecrets:false,
      containsPasswords:false,
      ok:false
    }' > "$OUT"
  cat "$OUT"
  exit "$exit_code"
}

[[ "$CANONICAL_BRANCH" == "$BRANCH" ]] || emit_wrapper_failure 'ORBIT360_CANONICAL_BRANCH_MISMATCH' 'ORBIT360_CANONICAL_BRANCH does not match the canonical branch.'
if [[ "$EVENT_NAME" == 'pull_request' || -n "$EVENT_BASE_REF" ]]; then
  [[ "$EVENT_BASE_REF" == "$BRANCH" ]] || emit_wrapper_failure 'PULL_REQUEST_BASE_REF_MISMATCH' 'GITHUB_BASE_REF does not match the canonical pull request base branch.'
fi
[[ "${GITHUB_RUN_ATTEMPT:-1}" == '1' ]] || emit_wrapper_failure 'RUN_ATTEMPT_NOT_ONE' 'Only the first workflow attempt is authorized.'
[[ -f "$REQUEST" ]] || emit_wrapper_failure 'REQUEST_FILE_MISSING' 'The exclusive authorization request file is absent.'

REQUEST_COMMIT="$(git rev-parse HEAD 2>/dev/null)" || emit_wrapper_failure 'REQUEST_COMMIT_UNRESOLVED' 'Unable to resolve HEAD.'
PARENT="$(git rev-parse "$REQUEST_COMMIT^" 2>/dev/null)" || emit_wrapper_failure 'REQUEST_PARENT_UNRESOLVED' 'Unable to resolve the request parent commit.'
git cat-file -e "$REQUEST_COMMIT:$REQUEST" 2>/dev/null || emit_wrapper_failure 'REQUEST_NOT_IN_HEAD_TREE' 'The request is not present in the request commit tree.'
mapfile -t CHANGED < <(git diff-tree --no-commit-id --name-only -r "$REQUEST_COMMIT")
[[ "${#CHANGED[@]}" == '1' ]] || emit_wrapper_failure 'REQUEST_COMMIT_NOT_SINGLE_FILE' "The request commit changed ${#CHANGED[@]} files instead of one."
[[ "${CHANGED[0]}" == "$REQUEST" ]] || emit_wrapper_failure 'REQUEST_COMMIT_WRONG_FILE' "The sole changed path is ${CHANGED[0]}."

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
' "$REQUEST" >/dev/null || emit_wrapper_failure 'REQUEST_CONTRACT_INVALID' 'The request identity, authorization state, or parent binding is invalid.'

export ORBIT360_REQUEST_FILE="$REQUEST"
"$NODE_BIN" tools/orbit360-validar-gate-contracts-v20260717.mjs "$GATE"
ROUTER_STATUS=$?

[[ -f "$CANONICAL" ]] || emit_wrapper_failure 'CANONICAL_ROUTER_EVIDENCE_MISSING' "The canonical router exited $ROUTER_STATUS without durable evidence."
cp "$CANONICAL" "$OUT" || emit_wrapper_failure 'CANONICAL_EVIDENCE_COPY_FAILED' 'Unable to copy canonical evidence to the gate-specific path.'

if [[ "$ROUTER_STATUS" != '0' ]]; then
  tmp="${OUT}.tmp"
  jq --argjson exitCode "$ROUTER_STATUS" '. + {
    wrapperCheckpoint:"CANONICAL_ROUTER_NONZERO",
    wrapperExitCode:$exitCode,
    wrapperObserved:true
  }' "$OUT" > "$tmp" 2>/dev/null && mv "$tmp" "$OUT"
  cat "$OUT"
  exit 41
fi

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
' "$OUT" >/dev/null || emit_wrapper_failure 'CANONICAL_GO_EVIDENCE_INVALID' 'The canonical router returned zero but its evidence is not an admissible GO_GATE_CONTRACT.'

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  echo 'go=true' >> "$GITHUB_OUTPUT"
fi
cat "$OUT"
