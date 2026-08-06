#!/usr/bin/env bash
set -uo pipefail

BRANCH='ays/backend-tenant-lab-v99-20260703'
REQUEST='.github/orbit360-requests/visual-matrix-corrected-post-auth-lab-v20260805-authorization.json'
GATE='block2.7-visual-matrix-corrected-post-auth-lab-v20260805'
OUT='orbit360-platform/runtime-gate-crm-v20260716/visual-matrix-corrected-post-auth-preflight-sanitized-v20260805.json'
CANONICAL='orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json'
NODE_BIN="${ORBIT360_NODE_BIN:-node}"
TRANSPORT_HEAD_REF="${ORBIT360_TRANSPORT_HEAD_REF:-}"

emit_failure() {
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
      schemaVersion:"orbit360-visual-matrix-runtime-relay-preflight-v8",
      gateId:$gate,
      contractVersion:"2.7.8",
      status:"STOP_PREFLIGHT_RELAY",
      classification:"PIPELINE_MECHANISM_FAILURE",
      failed:1,
      failedCheckIds:[$checkpoint],
      relayCheckpoint:$checkpoint,
      relayDetail:$detail,
      relayExitCode:$exitCode,
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

[[ "${ORBIT360_RUNTIME_RELAY_AUTHORIZED:-false}" == 'true' ]] || emit_failure 'RELAY_NOT_AUTHORIZED' 'The registered relay was not explicitly enabled.'
[[ "${ORBIT360_CANONICAL_BRANCH:-}" == "$BRANCH" ]] || emit_failure 'CANONICAL_BRANCH_MISMATCH' 'ORBIT360_CANONICAL_BRANCH is not canonical.'
[[ "$TRANSPORT_HEAD_REF" == "$BRANCH" ]] || emit_failure 'TRANSPORT_HEAD_REF_MISMATCH' 'The pull request head is not the canonical Orbit branch.'
[[ "${GITHUB_EVENT_NAME:-}" == 'pull_request' ]] || emit_failure 'TRANSPORT_EVENT_MISMATCH' 'The relay requires a same-repository pull_request synchronize event.'
[[ "${GITHUB_RUN_ATTEMPT:-1}" == '1' ]] || emit_failure 'RUN_ATTEMPT_NOT_ONE' 'Only the first workflow attempt is authorized.'
[[ -f "$REQUEST" ]] || emit_failure 'REQUEST_FILE_MISSING' 'The immutable authorization request is absent.'

REQUEST_COMMIT="$(git rev-parse HEAD 2>/dev/null)" || emit_failure 'REQUEST_COMMIT_UNRESOLVED' 'Unable to resolve request HEAD.'
PARENT="$(git rev-parse "$REQUEST_COMMIT^" 2>/dev/null)" || emit_failure 'REQUEST_PARENT_UNRESOLVED' 'Unable to resolve request parent.'
mapfile -t CHANGED < <(git diff-tree --no-commit-id --name-only -r "$REQUEST_COMMIT")
[[ "${#CHANGED[@]}" == '1' ]] || emit_failure 'REQUEST_COMMIT_NOT_SINGLE_FILE' "The request commit changed ${#CHANGED[@]} files."
[[ "${CHANGED[0]}" == "$REQUEST" ]] || emit_failure 'REQUEST_COMMIT_WRONG_FILE' "The sole path is ${CHANGED[0]}."

jq -e --arg parent "$PARENT" '
  .schemaVersion=="orbit360-visual-matrix-corrected-post-auth-request-v1" and
  .requestVersion=="20260806.8-registered-relay-runtime" and
  .gateId=="block2.7-visual-matrix-corrected-post-auth-lab-v20260805" and
  .contractVersion=="2.7.8" and
  .status=="AUTHORIZED_ONCE" and
  .approved==true and
  .allowedExecutions==1 and
  .consumed==false and
  .replayAllowed==false and
  .parentHead==$parent and
  .scope.registeredWorkflowRelayRequired==true and
  .scope.restorePriorV6BackupBeforeRuntime==true and
  .scope.restorePriorV6BackupChannel=="visual-matrix-corrected-backup-31116830824" and
  .scope.hostingDeploysMaximum==1 and
  .scope.functionsDeploy==false and
  .scope.rulesDeploy==false and
  .scope.firestoreWrites==false and
  .scope.authWrites==false and
  .scope.operationalWrites==false and
  .scope.reimport==false and
  .scope.production==false and
  .scope.main==false and
  .scope.merge==false
' "$REQUEST" >/dev/null || emit_failure 'REQUEST_CONTRACT_INVALID' 'The request is not an admissible v8 registered-relay authorization.'

export ORBIT360_REQUEST_FILE="$REQUEST"
"$NODE_BIN" tools/orbit360-validar-gate-contracts-v20260717.mjs "$GATE"
ROUTER_STATUS=$?
[[ -f "$CANONICAL" ]] || emit_failure 'CANONICAL_EVIDENCE_MISSING' "Canonical router exited $ROUTER_STATUS without evidence."
cp "$CANONICAL" "$OUT" || emit_failure 'CANONICAL_EVIDENCE_COPY_FAILED' 'Unable to copy durable evidence.'

if [[ "$ROUTER_STATUS" != '0' ]]; then
  cat "$OUT"
  exit 41
fi

jq -e '
  .status=="GO_GATE_CONTRACT" and
  .contractVersion=="2.7.8" and
  .failed==0 and
  .ok==true and
  .executionAuthorized==true and
  .secretAccessAuthorized==true and
  .firestoreReadAuthorized==true and
  .writeAuthorized==false and
  .runtimeAuthorized==true and
  .browserAuthorized==true and
  .hostingDeployAuthorized==true and
  .hostingDeploysMaximum==1 and
  .functionsDeployAuthorized==false and
  .rulesDeployAuthorized==false and
  .productionAuthorized==false and
  .secretAccess==false and
  .runtimeExecuted==false and
  .browserExecuted==false and
  .deployExecuted==false and
  .firestoreWrites==0 and
  .authWrites==0 and
  .operationalWrites==0
' "$OUT" >/dev/null || emit_failure 'CANONICAL_GO_EVIDENCE_INVALID' 'Canonical evidence is not an admissible GO_GATE_CONTRACT.'

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  echo 'go=true' >> "$GITHUB_OUTPUT"
fi
cat "$OUT"
