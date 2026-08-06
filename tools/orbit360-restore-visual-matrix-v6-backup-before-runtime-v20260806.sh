#!/usr/bin/env bash
set -euo pipefail

PROJECT='ays-orbit-360-lab'
SOURCE_BACKUP='visual-matrix-corrected-backup-31116830824'
PREFLIGHT='orbit360-platform/runtime-gate-crm-v20260716/visual-matrix-corrected-post-auth-preflight-sanitized-v20260805.json'
OUT='orbit360-platform/runtime-gate-crm-v20260716/visual-matrix-v7-prior-hosting-restore-sanitized-v20260806.json'

write_result() {
  local status="$1"
  local classification="$2"
  local checkpoint="$3"
  local ok="$4"
  mkdir -p "$(dirname "$OUT")"
  node - "$OUT" "$status" "$classification" "$checkpoint" "$ok" <<'NODE'
const fs = require('node:fs');
const [file, status, classification, checkpoint, ok] = process.argv.slice(2);
const value = {
  schemaVersion: 'orbit360-visual-matrix-v7-prior-hosting-restore-v1',
  gateId: 'block2.7-visual-matrix-corrected-post-auth-lab-v20260805',
  contractVersion: '2.7.8',
  runId: process.env.GITHUB_RUN_ID || '',
  attempt: Number(process.env.GITHUB_RUN_ATTEMPT || 1),
  projectId: 'ays-orbit-360-lab',
  sourceBackupChannel: 'visual-matrix-corrected-backup-31116830824',
  targetChannel: 'live',
  status,
  classification,
  checkpoint,
  restoreExecuted: status === 'PASS_PRIOR_HOSTING_RESTORE',
  restoreOutcome: status === 'PASS_PRIOR_HOSTING_RESTORE' ? 'success' : 'failure',
  secretsRead: true,
  firestoreReads: 0,
  firestoreWrites: 0,
  authWrites: 0,
  operationalWrites: 0,
  browserExecuted: false,
  hostingTouched: true,
  deployExecuted: false,
  functionsDeploys: 0,
  rulesDeploys: 0,
  productionTouched: false,
  mainTouched: false,
  mergeExecuted: false,
  containsPII: false,
  containsSecrets: false,
  containsPasswords: false,
  ok: ok === 'true'
};
fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(value, null, 2));
NODE
}

[[ "${ORBIT360_RUNTIME_EXECUTION_AUTHORIZED:-false}" == 'true' ]] || {
  write_result 'STOP_PRIOR_HOSTING_RESTORE' 'SECURITY_FAILURE' 'RUNTIME_NOT_AUTHORIZED' false
  exit 64
}

jq -e '
  .status=="GO_GATE_CONTRACT" and .contractVersion=="2.7.8" and
  .failed==0 and .ok==true and .secretAccessAuthorized==true and
  .hostingBackupCloneAuthorized==true and .hostingRollbackCloneAuthorizedOnFailure==true and
  .hostingDeployAuthorized==true and .hostingDeploysMaximum==1 and
  .writeAuthorized==false and .productionAuthorized==false
' "$PREFLIGHT" >/dev/null || {
  write_result 'STOP_PRIOR_HOSTING_RESTORE' 'DATA_CONTRACT_FAILURE' 'GO_GATE_CONTRACT_NOT_PASS' false
  exit 41
}

SERVICE_ACCOUNT="${FIREBASE_SERVICE_ACCOUNT_ORBIT360_LAB:-${FIREBASE_SERVICE_ACCOUNT_ORBIT_360_LAB:-${FIREBASE_SERVICE_ACCOUNT:-}}}"
[[ -n "$SERVICE_ACCOUNT" ]] || {
  write_result 'STOP_PRIOR_HOSTING_RESTORE' 'ENVIRONMENT_FAILURE' 'LAB_CREDENTIAL_RESOLUTION_FAILED' false
  exit 42
}

KEY="${RUNNER_TEMP:-/tmp}/orbit360-visual-matrix-v7-restore-service-account.json"
printf '%s' "$SERVICE_ACCOUNT" > "$KEY"
chmod 600 "$KEY"
[[ "$(jq -r '.project_id // empty' "$KEY" 2>/dev/null)" == "$PROJECT" ]] || {
  rm -f "$KEY"
  write_result 'STOP_PRIOR_HOSTING_RESTORE' 'SECURITY_FAILURE' 'LAB_CREDENTIAL_PROJECT_MISMATCH' false
  exit 42
}
export GOOGLE_APPLICATION_CREDENTIALS="$KEY"

if npx firebase hosting:clone "$PROJECT:$SOURCE_BACKUP" "$PROJECT:live" --project "$PROJECT" --non-interactive; then
  rm -f "$KEY"
  write_result 'PASS_PRIOR_HOSTING_RESTORE' 'PASS_AUTHORIZED_HOSTING_LAB_RESTORE' 'PRIOR_V6_BACKUP_RESTORED_TO_LIVE' true
  exit 0
fi

rm -f "$KEY"
write_result 'STOP_PRIOR_HOSTING_RESTORE' 'ENVIRONMENT_FAILURE' 'PRIOR_V6_BACKUP_RESTORE_FAILED' false
exit 42
