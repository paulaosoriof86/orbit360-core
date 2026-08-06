#!/usr/bin/env bash
set -uo pipefail

BRANCH='ays/backend-tenant-lab-v99-20260703'
PROJECT='ays-orbit-360-lab'
TENANT='alianzas-soluciones'
EVIDENCE_DIR='orbit360-platform/runtime-gate-crm-v20260716'
REGISTRATION="$EVIDENCE_DIR/visual-observable-rootfix-v2-gate-registration-sanitized-v20260805.json"
PREFLIGHT="$EVIDENCE_DIR/preflight-sanitizado.json"
PRECHECK="$EVIDENCE_DIR/visual-observable-rootfix-v2-precheck-sanitized-v20260805.json"
MATRIX="$EVIDENCE_DIR/visual-observable-rootfix-v2-matrix-sanitized-v20260805.json"
FINAL="$EVIDENCE_DIR/visual-observable-rootfix-v2-final-sanitized-v20260805.json"
LIFECYCLE='tools/orbit360-validator-lifecycle-contract-visual-observable-rootfix-v2-lab-v20260805.json'
CLOSURE='orbit360-platform/docs/CIERRE-VISUAL-OBSERVABLE-ROOTFIX-V2-LAB-20260805.md'
ARTIFACT_DIR='orbit360-visual-observable-v2-artifacts'
LAB_URL='https://ays-orbit-360-lab.web.app/index.html?orbitBackend=firestore-lab&tenant=alianzas-soluciones&runtime=20260717-2'

REGISTRATION_OUTCOME='success'
PREFLIGHT_OUTCOME='success'
CREDENTIAL_OUTCOME='skipped'
RUNTIME_OUTCOME='skipped'
BACKUP_OUTCOME='skipped'
DEPLOY_OUTCOME='skipped'
PRECHECK_OUTCOME='skipped'
MATRIX_OUTCOME='skipped'
ROLLBACK_OUTCOME='skipped'
DEPLOY_ATTEMPTED=0
BACKUP_CHANNEL=''

persist() {
  export REGISTRATION_OUTCOME PREFLIGHT_OUTCOME CREDENTIAL_OUTCOME RUNTIME_OUTCOME BACKUP_OUTCOME DEPLOY_OUTCOME PRECHECK_OUTCOME MATRIX_OUTCOME ROLLBACK_OUTCOME DEPLOY_ATTEMPTED
  export ORBIT360_PRECHECK_EVIDENCE="$PRECHECK"
  export ORBIT360_MATRIX_EVIDENCE="$MATRIX"
  export ORBIT360_FINAL_EVIDENCE="$FINAL"
  export ORBIT360_LIFECYCLE="$LIFECYCLE"
  export ORBIT360_CLOSURE="$CLOSURE"
  node tools/orbit360-seal-visual-observable-rootfix-v2-runtime-v20260805.mjs || true

  git config user.name orbit360-gate-bot
  git config user.email orbit360-gate-bot@users.noreply.github.com
  local files=(
    tools/orbit360-validar-gate-contracts-v20260717.mjs
    "$REGISTRATION"
    "$PREFLIGHT"
    "$LIFECYCLE"
    "$FINAL"
    "$CLOSURE"
  )
  [[ -f "$PRECHECK" ]] && files+=("$PRECHECK")
  [[ -f "$MATRIX" ]] && files+=("$MATRIX")
  git add "${files[@]}" 2>/dev/null || true
  if ! git diff --cached --quiet; then
    git commit -m 'runtime: persist observable visual rootfix v2 result [skip ci]' || true
    git push origin "HEAD:$BRANCH" || true
  fi
}

rollback_if_needed() {
  if [[ "$DEPLOY_ATTEMPTED" == '1' && "$ROLLBACK_OUTCOME" != 'success' ]]; then
    if [[ -n "$BACKUP_CHANNEL" && "$BACKUP_OUTCOME" == 'success' ]]; then
      if npx firebase hosting:clone "$PROJECT:$BACKUP_CHANNEL" "$PROJECT:live" --project "$PROJECT" --non-interactive; then
        ROLLBACK_OUTCOME='success'
      else
        ROLLBACK_OUTCOME='failure'
      fi
    else
      ROLLBACK_OUTCOME='failure'
    fi
  fi
}

stop() {
  rollback_if_needed
  persist
  exit 42
}

# Barrera obligatoria: esta validación ocurre antes de leer cualquier secreto.
[[ "${GITHUB_REF_NAME:-}" == "$BRANCH" ]] || { PREFLIGHT_OUTCOME='failure'; stop; }
[[ "${GITHUB_RUN_ATTEMPT:-1}" == '1' ]] || { PREFLIGHT_OUTCOME='failure'; stop; }
[[ -f "$PREFLIGHT" && -f "$REGISTRATION" ]] || { PREFLIGHT_OUTCOME='failure'; stop; }
jq -e '
  .status=="PASS_GATE_REGISTRATION" and .contractVersion=="2.7.5" and
  .failed==0 and .ok==true and .secretsRead==false and .firestoreRead==false and
  .browserExecuted==false and .deployExecuted==false
' "$REGISTRATION" >/dev/null || { REGISTRATION_OUTCOME='failure'; stop; }
jq -e '
  .status=="GO_GATE_CONTRACT" and .contractVersion=="2.7.5" and .failed==0 and .ok==true and
  .executionAuthorized==true and .secretAccessAuthorized==true and .firestoreReadAuthorized==true and
  .writeAuthorized==false and .runtimeAuthorized==true and .browserAuthorized==true and
  .hostingDeployAuthorized==true and .hostingTarget=="ays-orbit-360-lab" and .hostingDeploysMaximum==1 and
  .hostingBackupCloneAuthorized==true and .hostingRollbackCloneAuthorizedOnFailure==true and
  .functionsDeployAuthorized==false and .rulesDeployAuthorized==false and .productionAuthorized==false and
  .firestoreWritesAuthorized==0 and .authWritesAuthorized==0 and .operationalWritesAuthorized==0 and
  .dataAccess==false and .secretAccess==false and .runtimeExecuted==false and
  .browserExecuted==false and .deployExecuted==false
' "$PREFLIGHT" >/dev/null || { PREFLIGHT_OUTCOME='failure'; stop; }

# Desde este punto la autorización se consume aunque una etapa posterior falle.
SERVICE_ACCOUNT="${FIREBASE_SERVICE_ACCOUNT_ORBIT360_LAB:-${FIREBASE_SERVICE_ACCOUNT_ORBIT_360_LAB:-${FIREBASE_SERVICE_ACCOUNT:-}}}"
if [[ -z "$SERVICE_ACCOUNT" ]]; then
  CREDENTIAL_OUTCOME='failure'; stop
fi
KEY="$RUNNER_TEMP/orbit360-visual-observable-v2-service-account.json"
printf '%s' "$SERVICE_ACCOUNT" > "$KEY"
chmod 600 "$KEY"
if [[ "$(jq -r '.project_id // empty' "$KEY" 2>/dev/null)" != "$PROJECT" ]]; then
  CREDENTIAL_OUTCOME='failure'; stop
fi
export GOOGLE_APPLICATION_CREDENTIALS="$KEY"
CREDENTIAL_OUTCOME='success'

if npm install --no-save --package-lock=false firebase-admin@13.10.0 firebase-tools@15.25.1 playwright@1.55.0 >/dev/null \
  && npx playwright install --with-deps chromium >/dev/null; then
  RUNTIME_OUTCOME='success'
else
  RUNTIME_OUTCOME='failure'; stop
fi

BACKUP_CHANNEL="visual-observable-v2-backup-${GITHUB_RUN_ID}"
if npx firebase hosting:clone "$PROJECT:live" "$PROJECT:$BACKUP_CHANNEL" --project "$PROJECT" --non-interactive; then
  BACKUP_OUTCOME='success'
else
  BACKUP_OUTCOME='failure'; stop
fi

DEPLOY_ATTEMPTED=1
if npx firebase deploy --project "$PROJECT" --only hosting --non-interactive; then
  DEPLOY_OUTCOME='success'
else
  DEPLOY_OUTCOME='failure'; stop
fi

mkdir -p "$ARTIFACT_DIR"
export ORBIT360_PROJECT_ID="$PROJECT"
export ORBIT360_TENANT_ID="$TENANT"
export ORBIT360_LAB_URL="$LAB_URL"
export ORBIT360_GATE_ID='block2.7-visual-observable-rootfix-v2-lab-v20260805'
export ORBIT360_CONTRACT_VERSION='2.7.5'
export ORBIT360_BROWSER_PRECHECK_EVIDENCE="$PRECHECK"
export ORBIT360_BROWSER_PRECHECK_SCREENSHOT="$ARTIFACT_DIR/precheck-failure.png"
if node tools/orbit360-visual-runtime-rootfix-browser-precheck-v20260805.mjs \
  && jq -e '
    .stage=="PASS_VISUAL_BROWSER_PRECHECK" and
    .classification=="GO_FULL_VISUAL_MATRIX" and .ok==true and
    .checkpoint=="INICIO_READY_PASS" and
    .firestoreWrites==0 and .authWrites==0 and .operationalWrites==0 and
    .deployExecuted==false and .productionTouched==false
  ' "$PRECHECK" >/dev/null; then
  PRECHECK_OUTCOME='success'
else
  PRECHECK_OUTCOME='failure'; stop
fi

export ORBIT360_VISUAL_EVIDENCE="$MATRIX"
export ORBIT360_VISUAL_ARTIFACT_DIR="$ARTIFACT_DIR"
if node tools/orbit360-visual-runtime-rootfix-observable-matrix-v20260805.mjs \
  && jq -e '
    .stage=="PASS_VISUAL_OBSERVABLE_ROOTFIX_MATRIX" and
    .classification=="PASS_VISUAL_POST_AUTH" and .ok==true and
    .totalRoleFailures==0 and .snapshotIntegrity=="VERIFIED_UNCHANGED" and
    (.roles|length)==3 and
    .firestoreWrites==0 and .authWrites==0 and .operationalWrites==0 and
    .functionsDeploys==0 and .rulesDeploys==0 and .productionTouched==false
  ' "$MATRIX" >/dev/null; then
  MATRIX_OUTCOME='success'
else
  MATRIX_OUTCOME='failure'; stop
fi

ROLLBACK_OUTCOME='skipped'
persist
jq -e '
  .ok==true and .stage=="PASS_VISUAL_OBSERVABLE_ROOTFIX_LIVE" and
  .decision=="PASS_VISUAL_POST_AUTH" and .classification=="PASS_VISUAL_POST_AUTH" and
  .checkpoint=="MATRIX_COMPLETE" and .preflightStatus=="GO_GATE_CONTRACT" and
  .hostingDeployAttempted==true and .hostingDeploys==1 and
  .hostingRollbackRequired==false and .snapshotIntegrity=="VERIFIED_UNCHANGED" and
  .totalRoleFailures==0 and .firestoreWrites==0 and .authWrites==0 and
  .operationalWrites==0 and .functionsDeploys==0 and .rulesDeploys==0 and
  .productionTouched==false and .mainTouched==false and .mergeExecuted==false
' "$FINAL" >/dev/null
