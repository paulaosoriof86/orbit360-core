#!/usr/bin/env bash
set -uo pipefail

PROJECT='ays-orbit-360-lab'
TENANT='alianzas-soluciones'
BASELINE='visual-matrix-corrected-backup-31135532118'
LAB_URL='https://ays-orbit-360-lab.web.app/index.html?orbitBackend=firestore-lab&tenant=alianzas-soluciones&runtime=20260717-2'
PREFLIGHT='orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json'
PRECHECK='orbit360-platform/runtime-gate-crm-v20260716/block1-final-visual-precheck-sanitized-v20260810.json'
MATRIX='orbit360-platform/runtime-gate-crm-v20260716/block1-final-visual-matrix-sanitized-v20260810.json'
FINAL='orbit360-platform/runtime-gate-crm-v20260716/block1-final-visual-closure-sanitized-v20260810.json'
ARTIFACT_DIR='orbit360-block1-final-visual-artifacts'
TIMEOUT='tools/orbit360-run-with-timeout-cross-platform-v20260806.mjs'
PRECHECK_RUNNER='tools/orbit360-visual-runtime-rootfix-browser-precheck-v20260805.mjs'
MATRIX_RUNNER='tools/orbit360-block1-native-matrix-v23-canonical-v20260807.mjs'
SA_FILE="${RUNNER_TEMP:-/tmp}/orbit360-block1-final-visual-sa.json"
SAFETY_CHANNEL="block1-final-visual-safety-${GITHUB_RUN_ID:-local}"

BACKUP_OUTCOME='not_started'
BASELINE_RESTORE_OUTCOME='not_started'
DEPLOY_OUTCOME='not_started'
PRECHECK_OUTCOME='not_started'
MATRIX_OUTCOME='not_started'
ROLLBACK_OUTCOME='not_required'
HOSTING_TOUCHED=false
DEPLOY_COUNT=0
CHECKPOINT='BOOT'
CLASSIFICATION='PIPELINE_MECHANISM_FAILURE'
ROOT_CAUSE=''

write_final() {
  mkdir -p "$(dirname "$FINAL")"
  export FINAL PREFLIGHT PRECHECK MATRIX BACKUP_OUTCOME BASELINE_RESTORE_OUTCOME DEPLOY_OUTCOME PRECHECK_OUTCOME MATRIX_OUTCOME ROLLBACK_OUTCOME HOSTING_TOUCHED DEPLOY_COUNT CHECKPOINT CLASSIFICATION ROOT_CAUSE SAFETY_CHANNEL BASELINE
  node <<'NODE'
const fs=require('fs');
const read=f=>{try{return JSON.parse(fs.readFileSync(f,'utf8'));}catch{return null;}};
const pre=read(process.env.PREFLIGHT), pc=read(process.env.PRECHECK), mx=read(process.env.MATRIX);
const matrixPass=!!(mx&&mx.ok===true&&mx.stage==='PASS_BLOCK1_NATIVE_VISUAL_MATRIX'&&mx.classification==='PASS_VISUAL_POST_AUTH'&&mx.snapshotIntegrity==='VERIFIED_UNCHANGED'&&Number(mx.totalRoleFailures||0)===0&&Array.isArray(mx.roles)&&mx.roles.length===3&&Number(mx.firestoreWrites||0)===0&&Number(mx.authWrites||0)===0&&Number(mx.operationalWrites||0)===0&&mx.productionTouched===false);
const precheckPass=!!(pc&&pc.ok===true&&pc.stage==='PASS_VISUAL_BROWSER_PRECHECK'&&pc.classification==='GO_FULL_VISUAL_MATRIX'&&pc.checkpoint==='INICIO_READY_PASS'&&Number(pc.firestoreWrites||0)===0&&Number(pc.authWrites||0)===0&&Number(pc.operationalWrites||0)===0);
const operationalPass=process.env.BACKUP_OUTCOME==='success'&&process.env.BASELINE_RESTORE_OUTCOME==='success'&&process.env.DEPLOY_OUTCOME==='success'&&precheckPass&&matrixPass&&Number(process.env.DEPLOY_COUNT||0)===1;
const roles=mx&&Array.isArray(mx.roles)?mx.roles.map(r=>({role:r.role,failed:Number(r.failed||0),warnings:Number(r.warnings||0),viewport:r.viewport,routeTimings:r.routeTimings||{},ok:r.ok===true})):[];
const out={
 schemaVersion:'orbit360-block1-final-visual-closure-v1',
 gateId:'block1-client360-insurers-lab-v20260717',contractVersion:'1.0.41',operation:'BLOCK1_FINAL_VISUAL_MATRIX_AFTER_RELEASE_UNIVERSE',
 runId:process.env.GITHUB_RUN_ID||'',attempt:Number(process.env.GITHUB_RUN_ATTEMPT||1),
 decision:operationalPass?'PASS_VISUAL_POST_AUTH':'STOP_RETRY',
 classification:operationalPass?'PASS_VISUAL_POST_AUTH':(process.env.CLASSIFICATION||'PIPELINE_MECHANISM_FAILURE'),
 checkpoint:operationalPass?'MATRIX_COMPLETE':(process.env.CHECKPOINT||'UNKNOWN'),rootCause:operationalPass?'':(process.env.ROOT_CAUSE||''),
 blockingRoutes:['inicio','cliente360','aseguradoras'],releaseUniverseDecision:pre&&pre.releaseUniverseDecision||'',
 hosting:{safetyBackupChannelClass:'ephemeral_run_scoped',baselineChannel:process.env.BASELINE,safetyBackupOutcome:process.env.BACKUP_OUTCOME,baselineRestoreOutcome:process.env.BASELINE_RESTORE_OUTCOME,deployOutcome:process.env.DEPLOY_OUTCOME,deploys:Number(process.env.DEPLOY_COUNT||0),hostingTouched:process.env.HOSTING_TOUCHED==='true',rollbackOutcome:process.env.ROLLBACK_OUTCOME},
 precheck:{outcome:process.env.PRECHECK_OUTCOME,stage:pc&&pc.stage||'',classification:pc&&pc.classification||'',checkpoint:pc&&pc.checkpoint||'',firestoreReads:Number(pc&&pc.firestoreReads||0),firestoreWrites:Number(pc&&pc.firestoreWrites||0),authWrites:Number(pc&&pc.authWrites||0),operationalWrites:Number(pc&&pc.operationalWrites||0)},
 matrix:{outcome:process.env.MATRIX_OUTCOME,stage:mx&&mx.stage||'',classification:mx&&mx.classification||'',snapshotIntegrity:mx&&mx.snapshotIntegrity||'',totalRoleFailures:Number(mx&&mx.totalRoleFailures||0),totalWarnings:Number(mx&&mx.totalWarnings||0),firestoreReads:Number(mx&&mx.firestoreReads||0),firestoreWrites:Number(mx&&mx.firestoreWrites||0),authWrites:Number(mx&&mx.authWrites||0),operationalWrites:Number(mx&&mx.operationalWrites||0),roles},
 firestoreWrites:0,authWrites:0,operationalWrites:0,functionsDeploys:0,rulesDeploys:0,reimport:false,productionTouched:false,mainTouched:false,mergeExecuted:false,containsPII:false,containsSecrets:false,
 block1CloseEligible:operationalPass,ok:operationalPass
};
fs.writeFileSync(process.env.FINAL,JSON.stringify(out,null,2)+'\n','utf8');
console.log(JSON.stringify(out));
NODE
}

rollback_if_needed() {
  if [[ "$HOSTING_TOUCHED" == 'true' && "$BACKUP_OUTCOME" == 'success' && "$ROLLBACK_OUTCOME" != 'success' ]]; then
    CHECKPOINT='ROLLBACK_HOSTING_LAB'
    if node "$TIMEOUT" --timeout-ms 480000 --grace-ms 20000 -- npx firebase hosting:clone "$PROJECT:$SAFETY_CHANNEL" "$PROJECT:live" --project "$PROJECT" --non-interactive; then
      ROLLBACK_OUTCOME='success'
    else
      ROLLBACK_OUTCOME='failure'
      CLASSIFICATION='ENVIRONMENT_FAILURE'
      ROOT_CAUSE='HOSTING_ROLLBACK_FAILED'
    fi
  fi
}

fail() {
  local code="${1:-42}"
  rollback_if_needed
  write_final
  rm -f "$SA_FILE"
  exit "$code"
}

trap 'CLASSIFICATION="PIPELINE_MECHANISM_FAILURE"; ROOT_CAUSE="UNEXPECTED_SIGNAL_TERM"; CHECKPOINT="SIGNAL_TERM"; fail 42' TERM
trap 'CLASSIFICATION="PIPELINE_MECHANISM_FAILURE"; ROOT_CAUSE="UNEXPECTED_SIGNAL_INT"; CHECKPOINT="SIGNAL_INT"; fail 42' INT

[[ "${ORBIT360_RUNTIME_EXECUTION_AUTHORIZED:-false}" == 'true' ]] || { CLASSIFICATION='SECURITY_FAILURE'; ROOT_CAUSE='RUNTIME_NOT_AUTHORIZED'; CHECKPOINT='AUTHORIZATION'; write_final; exit 64; }
[[ "${GITHUB_RUN_ATTEMPT:-1}" == '1' ]] || { CLASSIFICATION='SECURITY_FAILURE'; ROOT_CAUSE='RERUN_NOT_ALLOWED'; CHECKPOINT='RUN_ATTEMPT'; write_final; exit 41; }

CHECKPOINT='PREFLIGHT_VERIFY'
jq -e '
 .status=="GO_GATE_CONTRACT_BLOCK1_FINAL_VISUAL" and .failed==0 and .ok==true and
 .executionAuthorized==true and .secretAccessAuthorized==true and .firestoreReadAuthorized==true and
 .browserAuthorized==true and .hostingSafetyBackupAuthorized==true and .hostingBaselineRestoreAuthorized==true and
 .baselineHostingChannel=="visual-matrix-corrected-backup-31135532118" and .hostingDeployAuthorized==true and
 .hostingDeploysMaximum==1 and .hostingRollbackAuthorizedOnFailure==true and .firestoreWritesAuthorized==0 and
 .authWritesAuthorized==0 and .operationalWritesAuthorized==0 and .functionsDeployAuthorized==false and
 .rulesDeployAuthorized==false and .reimportAuthorized==false and .productionAuthorized==false and
 .runtimeExecuted==false and .secretAccess==false and .browserExecuted==false and .deployExecuted==false
' "$PREFLIGHT" >/dev/null || { CLASSIFICATION='PIPELINE_MECHANISM_FAILURE'; ROOT_CAUSE='FINAL_VISUAL_PREFLIGHT_NOT_GO'; fail 41; }

CHECKPOINT='CREDENTIAL_VALIDATE'
SERVICE_ACCOUNT="${FIREBASE_SERVICE_ACCOUNT_ORBIT360_LAB:-${FIREBASE_SERVICE_ACCOUNT_ORBIT_360_LAB:-${FIREBASE_SERVICE_ACCOUNT:-}}}"
[[ -n "$SERVICE_ACCOUNT" ]] || { CLASSIFICATION='ENVIRONMENT_FAILURE'; ROOT_CAUSE='LAB_CREDENTIAL_UNAVAILABLE'; fail 42; }
printf '%s' "$SERVICE_ACCOUNT" > "$SA_FILE"; chmod 600 "$SA_FILE"
[[ "$(jq -r '.project_id // empty' "$SA_FILE" 2>/dev/null)" == "$PROJECT" ]] || { CLASSIFICATION='SECURITY_FAILURE'; ROOT_CAUSE='LAB_PROJECT_MISMATCH'; fail 42; }
export GOOGLE_APPLICATION_CREDENTIALS="$SA_FILE"

CHECKPOINT='DEPENDENCIES'
if ! npm install --no-save --package-lock=false firebase-admin@13.10.0 firebase-tools@15.25.1 playwright@1.55.0 >/dev/null 2>&1; then CLASSIFICATION='ENVIRONMENT_FAILURE'; ROOT_CAUSE='DEPENDENCY_INSTALL_FAILED'; fail 42; fi
if ! npx playwright install --with-deps chromium >/dev/null 2>&1; then CLASSIFICATION='ENVIRONMENT_FAILURE'; ROOT_CAUSE='PLAYWRIGHT_CHROMIUM_INSTALL_FAILED'; fail 42; fi

CHECKPOINT='SAFETY_BACKUP'
if node "$TIMEOUT" --timeout-ms 480000 --grace-ms 20000 -- npx firebase hosting:clone "$PROJECT:live" "$PROJECT:$SAFETY_CHANNEL" --project "$PROJECT" --non-interactive; then
  BACKUP_OUTCOME='success'
else
  BACKUP_OUTCOME='failure'; CLASSIFICATION='ENVIRONMENT_FAILURE'; ROOT_CAUSE='HOSTING_SAFETY_BACKUP_FAILED'; fail 42
fi

CHECKPOINT='BASELINE_RESTORE'
HOSTING_TOUCHED=true
if node "$TIMEOUT" --timeout-ms 480000 --grace-ms 20000 -- npx firebase hosting:clone "$PROJECT:$BASELINE" "$PROJECT:live" --project "$PROJECT" --non-interactive; then
  BASELINE_RESTORE_OUTCOME='success'
else
  BASELINE_RESTORE_OUTCOME='failure'; CLASSIFICATION='ENVIRONMENT_FAILURE'; ROOT_CAUSE='AUTHORIZED_BASELINE_RESTORE_FAILED'; fail 42
fi

CHECKPOINT='HOSTING_DEPLOY'
DEPLOY_COUNT=1
if node "$TIMEOUT" --timeout-ms 480000 --grace-ms 20000 -- npx firebase deploy --project "$PROJECT" --only hosting --non-interactive; then
  DEPLOY_OUTCOME='success'
else
  DEPLOY_OUTCOME='failure'; CLASSIFICATION='ENVIRONMENT_FAILURE'; ROOT_CAUSE='HOSTING_DEPLOY_FAILED'; fail 42
fi

rm -f "$PRECHECK" "$MATRIX" "$FINAL"; rm -rf "$ARTIFACT_DIR"; mkdir -p "$ARTIFACT_DIR"
export ORBIT360_PROJECT_ID="$PROJECT" ORBIT360_TENANT_ID="$TENANT" ORBIT360_LAB_URL="$LAB_URL"

CHECKPOINT='BROWSER_PRECHECK'
export ORBIT360_BROWSER_PRECHECK_EVIDENCE="$PRECHECK"
export ORBIT360_BROWSER_PRECHECK_SCREENSHOT="$ARTIFACT_DIR/precheck-failure.png"
if node "$TIMEOUT" --timeout-ms 420000 --grace-ms 15000 -- node "$PRECHECK_RUNNER" \
  && jq -e '.stage=="PASS_VISUAL_BROWSER_PRECHECK" and .classification=="GO_FULL_VISUAL_MATRIX" and .ok==true and .checkpoint=="INICIO_READY_PASS" and .firestoreWrites==0 and .authWrites==0 and .operationalWrites==0 and .deployExecuted==false and .productionTouched==false' "$PRECHECK" >/dev/null; then
  PRECHECK_OUTCOME='success'
else
  PRECHECK_OUTCOME='failure'; CLASSIFICATION="$(jq -r '.classification // "PIPELINE_MECHANISM_FAILURE"' "$PRECHECK" 2>/dev/null || echo PIPELINE_MECHANISM_FAILURE)"; ROOT_CAUSE="$(jq -r '.rootCauseHint // .error // "BROWSER_PRECHECK_FAILED"' "$PRECHECK" 2>/dev/null || echo BROWSER_PRECHECK_FAILED)"; fail 42
fi

CHECKPOINT='NATIVE_BLOCK1_MATRIX'
export ORBIT360_VISUAL_EVIDENCE="$MATRIX" ORBIT360_MATRIX_EVIDENCE="$MATRIX" ORBIT360_VISUAL_ARTIFACT_DIR="$ARTIFACT_DIR"
if node "$TIMEOUT" --timeout-ms 1500000 --grace-ms 20000 -- node "$MATRIX_RUNNER" \
  && jq -e '.schemaVersion=="orbit360-block1-client360-insurers-native-matrix-v23-canonical-1.0.41" and .contractVersion=="1.0.41" and .blockingRoutes==["inicio","cliente360","aseguradoras"] and .stage=="PASS_BLOCK1_NATIVE_VISUAL_MATRIX" and .classification=="PASS_VISUAL_POST_AUTH" and .ok==true and .totalRoleFailures==0 and .snapshotIntegrity=="VERIFIED_UNCHANGED" and (.roles|length)==3 and .firestoreReads<=30 and .firestoreWrites==0 and .authWrites==0 and .operationalWrites==0 and .productionTouched==false' "$MATRIX" >/dev/null; then
  MATRIX_OUTCOME='success'
else
  MATRIX_OUTCOME='failure'; CLASSIFICATION="$(jq -r '.classification // "PIPELINE_MECHANISM_FAILURE"' "$MATRIX" 2>/dev/null || echo PIPELINE_MECHANISM_FAILURE)"; ROOT_CAUSE="$(jq -r '.error // .validatorFinding // "NATIVE_BLOCK1_MATRIX_FAILED"' "$MATRIX" 2>/dev/null || echo NATIVE_BLOCK1_MATRIX_FAILED)"; fail 42
fi

CHECKPOINT='MATRIX_COMPLETE'
CLASSIFICATION='PASS_VISUAL_POST_AUTH'
ROOT_CAUSE=''
ROLLBACK_OUTCOME='not_required'
write_final
rm -f "$SA_FILE"
jq -e '.decision=="PASS_VISUAL_POST_AUTH" and .classification=="PASS_VISUAL_POST_AUTH" and .block1CloseEligible==true and .hosting.deploys==1 and .hosting.rollbackOutcome=="not_required" and .matrix.snapshotIntegrity=="VERIFIED_UNCHANGED" and .matrix.totalRoleFailures==0 and .firestoreWrites==0 and .authWrites==0 and .operationalWrites==0 and .productionTouched==false and .ok==true' "$FINAL" >/dev/null
exit 0
