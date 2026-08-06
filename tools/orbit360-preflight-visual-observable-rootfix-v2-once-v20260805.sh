#!/usr/bin/env bash
set -euo pipefail

BRANCH='ays/backend-tenant-lab-v99-20260703'
PR_NUMBER='5'
WORKFLOW_FILE='.github/workflows/orbit360-dispatch-visual-observable-rootfix-v2-once-v20260805.yml'
REQUEST_FILE='.github/orbit360-requests/visual-observable-rootfix-v2-lab-v20260805-authorization.json'
REQUEST_COMMIT='c4e21f84c25d2834eccabbd124d22ea802f3652e'
REQUEST_PARENT='e395f526a3dc7cee9cb6900f936057507b57c9ae'
GATE='block2.7-visual-observable-rootfix-v2-lab-v20260805'
REGISTRATION='orbit360-platform/runtime-gate-crm-v20260716/visual-observable-rootfix-v2-gate-registration-sanitized-v20260805.json'
PREFLIGHT='orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json'
FINAL='orbit360-platform/runtime-gate-crm-v20260716/visual-observable-rootfix-v2-final-sanitized-v20260805.json'
LIFECYCLE='tools/orbit360-validator-lifecycle-contract-visual-observable-rootfix-v2-lab-v20260805.json'
CLOSURE='orbit360-platform/docs/CIERRE-VISUAL-OBSERVABLE-ROOTFIX-V2-LAB-20260805.md'

emit() {
  if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
    printf '%s=%s\n' "$1" "$2" >> "$GITHUB_OUTPUT"
  fi
}

persist_preflight_stop() {
  local checkpoint="$1"
  local classification='PIPELINE_MECHANISM_FAILURE'
  case "$checkpoint" in
    VALIDATOR_*|GATE_REGISTRATION_*) classification='VALIDATOR_STALE' ;;
    GO_GATE_CONTRACT_*|SOURCE_CONTRACT_*) classification='DATA_CONTRACT_FAILURE' ;;
  esac
  export ORBIT360_PREFLIGHT_STOP_CHECKPOINT="$checkpoint"
  export ORBIT360_PREFLIGHT_STOP_CLASSIFICATION="$classification"
  node <<'NODE'
const fs = require('fs');
const path = require('path');
const checkpoint = process.env.ORBIT360_PREFLIGHT_STOP_CHECKPOINT || 'PREFLIGHT_UNKNOWN';
const classification = process.env.ORBIT360_PREFLIGHT_STOP_CLASSIFICATION || 'PIPELINE_MECHANISM_FAILURE';
const finalPath = 'orbit360-platform/runtime-gate-crm-v20260716/visual-observable-rootfix-v2-final-sanitized-v20260805.json';
const lifecyclePath = 'tools/orbit360-validator-lifecycle-contract-visual-observable-rootfix-v2-lab-v20260805.json';
const closurePath = 'orbit360-platform/docs/CIERRE-VISUAL-OBSERVABLE-ROOTFIX-V2-LAB-20260805.md';
const preflightPath = 'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json';
const preflight = fs.existsSync(preflightPath) ? JSON.parse(fs.readFileSync(preflightPath, 'utf8')) : null;
const final = {
  schemaVersion: 'orbit360-visual-observable-rootfix-v2-final-v1',
  gateId: 'block2.7-visual-observable-rootfix-v2-lab-v20260805',
  contractVersion: '2.7.5',
  runId: process.env.GITHUB_RUN_ID || '',
  attempt: Number(process.env.GITHUB_RUN_ATTEMPT || 1),
  stage: 'STOP_RETRY_VISUAL_OBSERVABLE_ROOTFIX_V2_PREFLIGHT',
  decision: 'STOP_RETRY',
  classification,
  checkpoint,
  preflightStatus: preflight && preflight.status || 'NOT_PRODUCED',
  preflightChecks: preflight && preflight.total || 0,
  authorizationConsumed: false,
  secretAccessed: false,
  firestoreReads: 0,
  firestoreWrites: 0,
  authWrites: 0,
  operationalWrites: 0,
  browserExecuted: false,
  hostingBackupCreated: false,
  hostingDeploys: 0,
  hostingRollbackRequired: false,
  functionsDeploys: 0,
  rulesDeploys: 0,
  reimports: 0,
  productionTouched: false,
  mainTouched: false,
  mergeExecuted: false,
  containsPII: false,
  containsSecrets: false,
  containsPasswords: false,
  ok: false
};
fs.mkdirSync(path.dirname(finalPath), { recursive: true });
fs.writeFileSync(finalPath, JSON.stringify(final, null, 2) + '\n');
const lifecycle = JSON.parse(fs.readFileSync(lifecyclePath, 'utf8'));
lifecycle.ownerVersion = '20260805.4-preflight-stop-authorization-unconsumed';
lifecycle.status = 'STOP_RETRY_PREFLIGHT_AUTHORIZATION_UNCONSUMED';
lifecycle.classification = classification;
lifecycle.currentPhase = 'PREFLIGHT_STOP_RETRY';
lifecycle.activeRequest = false;
lifecycle.requestConsumed = false;
lifecycle.authorizationReserved = true;
lifecycle.allowedExecutions = 1;
lifecycle.executionAuthorized = false;
lifecycle.secretAccessAuthorized = false;
lifecycle.firestoreReadAuthorized = false;
lifecycle.writeAuthorized = false;
lifecycle.browserAuthorized = false;
lifecycle.hostingDeployAuthorized = false;
lifecycle.functionsDeployAuthorized = false;
lifecycle.rulesDeployAuthorized = false;
lifecycle.productionAuthorized = false;
lifecycle.preflightStop = {
  runId: final.runId,
  checkpoint,
  classification,
  secretAccessed: false,
  hostingDeploys: 0
};
lifecycle.nextAction = 'CLOSE_EXACT_PREFLIGHT_CHECKPOINT_WITHOUT_RUNTIME_RETRY';
fs.writeFileSync(lifecyclePath, JSON.stringify(lifecycle, null, 2) + '\n');
const lines = [
  '# CIERRE VISUAL OBSERVABLE ROOTFIX V2 LAB — PREFLIGHT', '',
  '```text',
  `run: ${final.runId}`,
  `classification: ${classification}`,
  `checkpoint: ${checkpoint}`,
  `preflight: ${final.preflightStatus}`,
  'authorization consumed: false',
  'secret access: false',
  'Hosting deploys: 0',
  'Firestore/Auth/operational writes: 0',
  'Functions/Rules/production/main/merge: 0',
  '```', '',
  'Salida: `STOP_RETRY`; la autorización runtime permanece reservada.'
];
fs.writeFileSync(closurePath, lines.join('\n') + '\n');
NODE

  if [[ -f "$REGISTRATION" ]] && jq -e '.status=="PASS_GATE_REGISTRATION" and .ok==true' "$REGISTRATION" >/dev/null 2>&1; then
    git add tools/orbit360-validar-gate-contracts-v20260717.mjs "$REGISTRATION" 2>/dev/null || true
  else
    git checkout -- tools/orbit360-validar-gate-contracts-v20260717.mjs 2>/dev/null || true
  fi
  git config user.name orbit360-gate-bot
  git config user.email orbit360-gate-bot@users.noreply.github.com
  git add "$PREFLIGHT" "$FINAL" "$LIFECYCLE" "$CLOSURE" 2>/dev/null || true
  if ! git diff --cached --quiet; then
    git commit -m 'runtime: persist visual v2 preflight stop [skip ci]' || true
    git push origin "HEAD:$BRANCH" || true
  fi
  emit dispatch true
  emit go false
  emit checkpoint "$checkpoint"
  exit 41
}

[[ "${GITHUB_REF_NAME:-}" == "$BRANCH" ]] || persist_preflight_stop 'DISPATCH_UNAUTHORIZED_BRANCH'
[[ "${GITHUB_RUN_ATTEMPT:-1}" == '1' ]] || persist_preflight_stop 'DISPATCH_REPLAY_ATTEMPT'

mapfile -t CHANGED < <(git diff-tree --no-commit-id --name-only -r HEAD)
[[ "${#CHANGED[@]}" == '1' && "${CHANGED[0]}" == "$WORKFLOW_FILE" ]] || persist_preflight_stop 'DISPATCH_COMMIT_NOT_EXCLUSIVE_WORKFLOW'

[[ -f "$REQUEST_FILE" ]] || persist_preflight_stop 'SOURCE_CONTRACT_REQUEST_MISSING'
mapfile -t REQUEST_HISTORY < <(git log --format=%H -- "$REQUEST_FILE")
[[ "${#REQUEST_HISTORY[@]}" == '1' && "${REQUEST_HISTORY[0]}" == "$REQUEST_COMMIT" ]] || persist_preflight_stop 'SOURCE_CONTRACT_REQUEST_NOT_IMMUTABLE'
[[ "$(git rev-parse "$REQUEST_COMMIT^")" == "$REQUEST_PARENT" ]] || persist_preflight_stop 'SOURCE_CONTRACT_REQUEST_PARENT_MISMATCH'
mapfile -t REQUEST_CHANGED < <(git diff-tree --no-commit-id --name-only -r "$REQUEST_COMMIT")
[[ "${#REQUEST_CHANGED[@]}" == '1' && "${REQUEST_CHANGED[0]}" == "$REQUEST_FILE" ]] || persist_preflight_stop 'SOURCE_CONTRACT_REQUEST_CREATION_NOT_EXCLUSIVE'

jq -e --arg parent "$REQUEST_PARENT" '
  .schemaVersion=="orbit360-visual-observable-rootfix-v2-lab-request-v1" and
  .gateId=="block2.7-visual-observable-rootfix-v2-lab-v20260805" and
  .contractVersion=="2.7.5" and .rcId=="RC-AYS-LAB-CANONICA-01" and
  .status=="AUTHORIZED_ONCE" and .approved==true and
  .allowedExecutions==1 and .consumed==false and .replayAllowed==false and
  .branch=="ays/backend-tenant-lab-v99-20260703" and .pullRequest==5 and
  .projectId=="ays-orbit-360-lab" and .tenantId=="alianzas-soluciones" and
  .parentHead==$parent and
  .sourcePass.status=="PASS_DIRECT_SOURCE_VALIDATION" and .sourcePass.checks==24 and .sourcePass.ok==true and
  .capabilities.secrets==true and .capabilities.firestoreRead==true and .capabilities.writes==false and
  .capabilities.runtime==true and .capabilities.browser==true and .capabilities.deploy==true and
  .capabilities.functionsDeploy==false and .capabilities.rulesDeploy==false and .capabilities.production==false and
  .scope.hostingDeploysMaximum==1 and .scope.hostingOnly==true and .scope.hostingBackupClone==true and
  .scope.hostingRollbackCloneOnFailure==true and .scope.precheckRequiredBeforeMatrix==true and
  .scope.functionsDeploy==false and .scope.rulesDeploy==false and .scope.firestoreWrites==false and
  .scope.authWrites==false and .scope.operationalWrites==false and .scope.reimport==false and
  .scope.production==false and .scope.main==false and .scope.merge==false and
  .scope.directionDesktop==true and .scope.operationalTablet==true and .scope.advisorMobile==true
' "$REQUEST_FILE" >/dev/null || persist_preflight_stop 'SOURCE_CONTRACT_REQUEST_INVALID'

node --check tools/orbit360-register-visual-observable-rootfix-v2-gate-v20260805.mjs || persist_preflight_stop 'VALIDATOR_REGISTER_SYNTAX'
node --check tools/orbit360-validar-gate-contracts-v20260717.mjs || persist_preflight_stop 'VALIDATOR_CANONICAL_SYNTAX'
node --check tools/orbit360-validar-gate-contracts-engine-visual-observable-rootfix-v2-lab-v20260805.mjs || persist_preflight_stop 'VALIDATOR_ENGINE_SYNTAX'
node --check tools/orbit360-visual-runtime-rootfix-browser-precheck-v20260805.mjs || persist_preflight_stop 'VALIDATOR_PRECHECK_OWNER_SYNTAX'
node --check tools/orbit360-visual-runtime-rootfix-observable-matrix-v20260805.mjs || persist_preflight_stop 'VALIDATOR_MATRIX_OWNER_SYNTAX'
node --check tools/orbit360-seal-visual-observable-rootfix-v2-runtime-v20260805.mjs || persist_preflight_stop 'VALIDATOR_SEALER_SYNTAX'
node --check orbit360-platform/core/visual-runtime-rootfix-v20260805.js || persist_preflight_stop 'SOURCE_CONTRACT_ROOTFIX_SYNTAX'
node --check orbit360-platform/core/visual-runtime-hydration-contract-v20260805.js || persist_preflight_stop 'SOURCE_CONTRACT_HYDRATION_SYNTAX'
node --check orbit360-platform/core/backend-lab-loader.js || persist_preflight_stop 'SOURCE_CONTRACT_LOADER_SYNTAX'

git diff --check || persist_preflight_stop 'SOURCE_CONTRACT_DIFF_CHECK'

if grep -Fq '"block2.7-visual-observable-rootfix-v2-lab-v20260805"' tools/orbit360-validar-gate-contracts-v20260717.mjs; then
  node tools/orbit360-validar-gate-contracts-v20260717.mjs "$GATE" >/dev/null 2>&1 || true
else
  node tools/orbit360-register-visual-observable-rootfix-v2-gate-v20260805.mjs || persist_preflight_stop 'GATE_REGISTRATION_EXECUTION_FAILURE'
  jq -e '.status=="PASS_GATE_REGISTRATION" and .failed==0 and .ok==true' "$REGISTRATION" >/dev/null || persist_preflight_stop 'GATE_REGISTRATION_NOT_PASS'
fi

export ORBIT360_REQUEST_FILE="$REQUEST_FILE"
node tools/orbit360-validar-gate-contracts-v20260717.mjs "$GATE" || persist_preflight_stop 'GO_GATE_CONTRACT_EXECUTION_FAILURE'
jq -e '
  .status=="GO_GATE_CONTRACT" and .contractVersion=="2.7.5" and .failed==0 and .ok==true and
  .executionAuthorized==true and .secretAccessAuthorized==true and .firestoreReadAuthorized==true and
  .writeAuthorized==false and .runtimeAuthorized==true and .browserAuthorized==true and
  .hostingDeployAuthorized==true and .hostingTarget=="ays-orbit-360-lab" and .hostingDeploysMaximum==1 and
  .hostingBackupCloneAuthorized==true and .hostingRollbackCloneAuthorizedOnFailure==true and
  .functionsDeployAuthorized==false and .rulesDeployAuthorized==false and .productionAuthorized==false and
  .firestoreWritesAuthorized==0 and .authWritesAuthorized==0 and .operationalWritesAuthorized==0 and
  .dataAccess==false and .secretAccess==false and .runtimeExecuted==false and .browserExecuted==false and .deployExecuted==false
' "$PREFLIGHT" >/dev/null || persist_preflight_stop 'GO_GATE_CONTRACT_NOT_PASS'

emit dispatch true
emit go true
emit checkpoint 'GO_GATE_CONTRACT'
printf '%s\n' 'GO_GATE_CONTRACT: visual observable rootfix v2 autorizado para runtime.'
