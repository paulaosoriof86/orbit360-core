#!/usr/bin/env bash
set -uo pipefail

BRANCH='ays/backend-tenant-lab-v99-20260703'
PROJECT='ays-orbit-360-lab'
TENANT='alianzas-soluciones'
PRIOR='visual-matrix-corrected-backup-31135532118'
LAB_URL='https://ays-orbit-360-lab.web.app/index.html?orbitBackend=firestore-lab&tenant=alianzas-soluciones&runtime=20260717-2'
PREFLIGHT='orbit360-platform/runtime-gate-crm-v20260716/v23-block1-preflight-sanitized-v20260807.json'
UNIVERSE='orbit360-platform/runtime-gate-crm-v20260716/v23-block1-universe-adjudication-sanitized-v20260807.json'
PRECHECK='orbit360-platform/runtime-gate-crm-v20260716/v23-block1-browser-precheck-sanitized-v20260807.json'
MATRIX='orbit360-platform/runtime-gate-crm-v20260716/v23-block1-native-matrix-sanitized-v20260807.json'
STATE='orbit360-platform/runtime-gate-crm-v20260716/v23-block1-runtime-state-sanitized-v20260807.json'
ARTIFACT_DIR='orbit360-block1-v23-artifacts'
TIMEOUT_RUNNER='tools/orbit360-run-with-timeout-cross-platform-v20260806.mjs'
SIGNAL_LIB='tools/orbit360-runtime-signal-safe-lib-v20260806.sh'
PRECHECK_RUNNER='tools/orbit360-block1-v23-browser-precheck-v20260807.mjs'
MATRIX_RUNNER='tools/orbit360-block1-native-matrix-v23-v20260807.mjs'

RESTORE_OUTCOME='skipped'; BACKUP_OUTCOME='skipped'; DEPLOY_OUTCOME='skipped'; PRECHECK_OUTCOME='skipped'; MATRIX_OUTCOME='skipped'; ROLLBACK_OUTCOME='skipped'; RUNTIME_OUTCOME='started'; DEPLOY_ATTEMPTED=0; BACKUP_CHANNEL=''; CHECKPOINT='BOOT'

[[ "${ORBIT360_RUNTIME_EXECUTION_AUTHORIZED:-false}" == 'true' ]] || { echo 'SOURCE_ONLY_NOT_AUTHORIZED_V23_RUNTIME'; exit 64; }
[[ "${ORBIT360_CANONICAL_BRANCH:-}" == "$BRANCH" ]] || { echo 'STOP_V23_CANONICAL_BRANCH_MISMATCH'; exit 41; }
[[ "${GITHUB_RUN_ATTEMPT:-1}" == '1' ]] || { echo 'STOP_V23_RUN_ATTEMPT_NOT_ONE'; exit 41; }
[[ -n "${GOOGLE_APPLICATION_CREDENTIALS:-}" && -f "$GOOGLE_APPLICATION_CREDENTIALS" ]] || { echo 'STOP_V23_CREDENTIAL_FILE_MISSING'; exit 41; }
[[ -f "$PREFLIGHT" && -f "$UNIVERSE" ]] || { echo 'STOP_V23_GO_OR_UNIVERSE_EVIDENCE_MISSING'; exit 41; }
jq -e '.status=="GO_GATE_CONTRACT" and .ok==true and .universeAdjudicationRequiredBeforeHosting==true and .hostingDeploysMaximum==1 and .writeAuthorized==false' "$PREFLIGHT" >/dev/null || { echo 'STOP_V23_GO_GATE_CONTRACT_INVALID'; exit 41; }
jq -e '.status=="PASS_BLOCK1_UNIVERSE_ADJUDICATION" and .classification=="PASS_DATA_CONTRACT" and .goForHosting==true and .ok==true and .firestoreWrites==0 and .authWrites==0 and .operationalWrites==0' "$UNIVERSE" >/dev/null || { echo 'STOP_V23_UNIVERSE_NOT_GO'; exit 41; }

source "$SIGNAL_LIB"
write_state(){
  export STATE RESTORE_OUTCOME BACKUP_OUTCOME DEPLOY_OUTCOME PRECHECK_OUTCOME MATRIX_OUTCOME ROLLBACK_OUTCOME RUNTIME_OUTCOME DEPLOY_ATTEMPTED BACKUP_CHANNEL CHECKPOINT
  node <<'NODE'
const fs=require('fs'),path=require('path'); const file=process.env.STATE; const v={schemaVersion:'orbit360-block1-v23-runtime-state-v1',runId:process.env.GITHUB_RUN_ID||'',attempt:Number(process.env.GITHUB_RUN_ATTEMPT||1),checkpoint:process.env.CHECKPOINT||'',restoreOutcome:process.env.RESTORE_OUTCOME,backupOutcome:process.env.BACKUP_OUTCOME,deployOutcome:process.env.DEPLOY_OUTCOME,precheckOutcome:process.env.PRECHECK_OUTCOME,matrixOutcome:process.env.MATRIX_OUTCOME,rollbackOutcome:process.env.ROLLBACK_OUTCOME,runtimeOutcome:process.env.RUNTIME_OUTCOME,deployAttempted:process.env.DEPLOY_ATTEMPTED==='1',backupChannel:process.env.BACKUP_CHANNEL||'',firestoreWrites:0,authWrites:0,operationalWrites:0,productionTouched:false,containsPII:false,containsSecrets:false}; fs.mkdirSync(path.dirname(file),{recursive:true}); fs.writeFileSync(file,JSON.stringify(v,null,2)+'\n');
NODE
}
rollback_if_needed(){
  if [[ "$DEPLOY_ATTEMPTED" == '1' && "$ROLLBACK_OUTCOME" != 'success' ]]; then
    CHECKPOINT='HOSTING_ROLLBACK'; write_state || true
    if [[ "$BACKUP_OUTCOME" == 'success' && -n "$BACKUP_CHANNEL" ]] && node "$TIMEOUT_RUNNER" --timeout-ms 480000 --grace-ms 20000 -- npx firebase hosting:clone "$PROJECT:$BACKUP_CHANNEL" "$PROJECT:live" --project "$PROJECT" --non-interactive; then ROLLBACK_OUTCOME='success'; else ROLLBACK_OUTCOME='failure'; fi
    write_state || true
  fi
}
stop(){ RUNTIME_OUTCOME='failure'; write_state || true; rollback_if_needed; write_state || true; exit "${1:-42}"; }
orbit360_before_signal_stop(){ CHECKPOINT="SIGNAL_${1:-TERM}"; RUNTIME_OUTCOME='failure'; write_state || true; rollback_if_needed || true; }
orbit360_before_abnormal_exit(){ [[ "$RUNTIME_OUTCOME" == 'success' ]] || { CHECKPOINT="ABNORMAL_EXIT_${1:-1}"; RUNTIME_OUTCOME='failure'; write_state || true; rollback_if_needed || true; }; }
orbit360_install_signal_traps
write_state

CHECKPOINT='RESTORE_AUTHORIZED_BASELINE'; write_state
if node "$TIMEOUT_RUNNER" --timeout-ms 480000 --grace-ms 20000 -- npx firebase hosting:clone "$PROJECT:$PRIOR" "$PROJECT:live" --project "$PROJECT" --non-interactive; then RESTORE_OUTCOME='success'; else RESTORE_OUTCOME='failure'; stop; fi
write_state

BACKUP_CHANNEL="block1-v23-backup-${GITHUB_RUN_ID:-local}"; CHECKPOINT='BACKUP_RESTORED_BASELINE'; write_state
if node "$TIMEOUT_RUNNER" --timeout-ms 480000 --grace-ms 20000 -- npx firebase hosting:clone "$PROJECT:live" "$PROJECT:$BACKUP_CHANNEL" --project "$PROJECT" --non-interactive; then BACKUP_OUTCOME='success'; else BACKUP_OUTCOME='failure'; stop; fi
write_state

CHECKPOINT='HOSTING_LAB_DEPLOY'; DEPLOY_ATTEMPTED=1; write_state
if node "$TIMEOUT_RUNNER" --timeout-ms 480000 --grace-ms 20000 -- npx firebase deploy --project "$PROJECT" --only hosting --non-interactive; then DEPLOY_OUTCOME='success'; else DEPLOY_OUTCOME='failure'; stop; fi
write_state

mkdir -p "$ARTIFACT_DIR"
export ORBIT360_PROJECT_ID="$PROJECT" ORBIT360_TENANT_ID="$TENANT" ORBIT360_LAB_URL="$LAB_URL" ORBIT360_BROWSER_PRECHECK_EVIDENCE="$PRECHECK" ORBIT360_MATRIX_EVIDENCE="$MATRIX" ORBIT360_VISUAL_EVIDENCE="$MATRIX" ORBIT360_VISUAL_ARTIFACT_DIR="$ARTIFACT_DIR"
CHECKPOINT='BROWSER_PRECHECK'; write_state
if node "$TIMEOUT_RUNNER" --timeout-ms 420000 --grace-ms 15000 -- node "$PRECHECK_RUNNER" && jq -e '.stage=="PASS_BLOCK1_V23_BROWSER_PRECHECK" and .classification=="GO_FULL_BLOCK1_MATRIX" and .ok==true and .firestoreWrites==0 and .authWrites==0 and .operationalWrites==0' "$PRECHECK" >/dev/null; then PRECHECK_OUTCOME='success'; else PRECHECK_OUTCOME='failure'; stop; fi
write_state

CHECKPOINT='BLOCK1_NATIVE_MATRIX'; write_state
if node "$TIMEOUT_RUNNER" --timeout-ms 1320000 --grace-ms 20000 -- node "$MATRIX_RUNNER" && jq -e '.stage=="PASS_BLOCK1_NATIVE_VISUAL_MATRIX" and .classification=="PASS_VISUAL_POST_AUTH" and .ok==true and .totalRoleFailures==0 and .snapshotIntegrity=="VERIFIED_UNCHANGED" and (.roles|length)==3 and .firestoreWrites==0 and .authWrites==0 and .operationalWrites==0 and .productionTouched==false' "$MATRIX" >/dev/null; then MATRIX_OUTCOME='success'; else MATRIX_OUTCOME='failure'; stop; fi

CHECKPOINT='BLOCK1_MATRIX_COMPLETE'; RUNTIME_OUTCOME='success'; ROLLBACK_OUTCOME='not_required'; write_state
exit 0
