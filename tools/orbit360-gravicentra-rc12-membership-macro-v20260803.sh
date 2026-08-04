#!/usr/bin/env bash
set -u -o pipefail

ROOT="$(pwd)"
EVIDENCE_DIR="${EVIDENCE_DIR:-orbit360-platform/runtime-gate-crm-v20260716}"
FINAL_FILE="$EVIDENCE_DIR/gravicentra-rc12-membership-go-live-final.json"
PROJECT="${ORBIT360_PROJECT_ID:-ays-orbit-360-lab}"
TENANT="${ORBIT360_TENANT_ID:-alianzas-soluciones}"
RELEASE_COMMIT="${ORBIT360_RELEASE_COMMIT:?ORBIT360_RELEASE_COMMIT required}"
RC12_ROOT="${ORBIT360_RC12_ROOT:?ORBIT360_RC12_ROOT required}"
PRIVATE_IDENTITIES="${ORBIT360_RC12_PRIVATE_IDENTITIES:?ORBIT360_RC12_PRIVATE_IDENTITIES required}"
KEY_FILE="${RUNNER_TEMP:-/tmp}/gravicentra-rc12-service-account.json"

IDENTITIES_CODE=''
BEFORE_CODE=''
DEPLOY_CODE=''
BROWSER_CODE=''
DATA_CODE=''
ROLLBACK_CODE=''
DECISION='RC12_STOP_AFTER_GATE_BEFORE_DEPLOY'
CLASSIFICATION='PIPELINE_MECHANISM_FAILURE'
OWNER='workflow/post-gate'
SOLUTION='Corregir el owner indicado sin reutilizar un deploy ni modificar la candidata.'
MAINTAINED=false
ROLLED_BACK=false
OK=false

cleanup() {
  if [ -f "$KEY_FILE" ]; then shred -u "$KEY_FILE" 2>/dev/null || rm -f "$KEY_FILE"; fi
  if [ -f "$PRIVATE_IDENTITIES" ]; then shred -u "$PRIVATE_IDENTITIES" 2>/dev/null || rm -f "$PRIVATE_IDENTITIES"; fi
  if [ -d "$RC12_ROOT" ]; then git worktree remove --force "$RC12_ROOT" >/dev/null 2>&1 || true; fi
}
trap cleanup EXIT

write_final() {
  mkdir -p "$EVIDENCE_DIR"
  jq -n \
    --arg decision "$DECISION" \
    --arg classification "$CLASSIFICATION" \
    --arg owner "$OWNER" \
    --arg solution "$SOLUTION" \
    --arg releaseCommit "$RELEASE_COMMIT" \
    --arg identitiesCode "$IDENTITIES_CODE" \
    --arg beforeCode "$BEFORE_CODE" \
    --arg deployCode "$DEPLOY_CODE" \
    --arg browserCode "$BROWSER_CODE" \
    --arg dataCode "$DATA_CODE" \
    --arg rollbackCode "$ROLLBACK_CODE" \
    --argjson maintained "$MAINTAINED" \
    --argjson rolledBack "$ROLLED_BACK" \
    --argjson ok "$OK" \
    '{schemaVersion:"orbit360-gravicentra-rc12-membership-go-live-final-v2",decision:$decision,classification:$classification,rootCauseOwner:$owner,solution:$solution,releaseCommit:$releaseCommit,identitiesExitCode:$identitiesCode,beforeExitCode:$beforeCode,deployExitCode:$deployCode,browserExitCode:$browserCode,dataSmokeExitCode:$dataCode,rollbackExitCode:$rollbackCode,productionMaintained:$maintained,rollbackExecuted:$rolledBack,ok:$ok,authorizationConsumed:true,resumedFromPreRiskFailure:true,firestoreWrites:0,authWrites:0,userCreates:0,userUpdates:0,passwordReads:0,passwordWrites:0,operationalWrites:0,reimportExecuted:false,functionsDeployed:false,rulesApplied:false,mainTouched:false,mergeExecuted:false,containsPII:false,containsSecrets:false}' > "$FINAL_FILE"
}

fail_and_close() {
  write_final
  exit 41
}

npm install --global firebase-tools@latest || {
  DECISION='RC12_TOOLING_INSTALL_NO_GO'
  CLASSIFICATION='ENVIRONMENT_FAILURE'
  OWNER='runner/npm/firebase-tools'
  SOLUTION='Restaurar instalación de herramientas antes de leer Firebase o desplegar.'
  fail_and_close
}
npm install --no-save --package-lock=false --ignore-scripts firebase-admin@13 google-auth-library@9 playwright@1.52.0 || {
  DECISION='RC12_RUNTIME_DEPENDENCIES_NO_GO'
  CLASSIFICATION='ENVIRONMENT_FAILURE'
  OWNER='runner/npm/runtime dependencies'
  SOLUTION='Restaurar dependencias del runtime antes de leer Firebase o desplegar.'
  fail_and_close
}
npx playwright install --with-deps chromium || {
  DECISION='RC12_BROWSER_INSTALL_NO_GO'
  CLASSIFICATION='ENVIRONMENT_FAILURE'
  OWNER='runner/Playwright Chromium'
  SOLUTION='Restaurar navegador del smoke antes de leer identidades o desplegar.'
  fail_and_close
}

SERVICE_ACCOUNT="${SA_ORBIT360_LAB:-${SA_ORBIT_360_LAB:-${SA_DEFAULT:-}}}"
if [ -z "$SERVICE_ACCOUNT" ]; then
  DECISION='RC12_SERVICE_IDENTITY_NO_GO'
  CLASSIFICATION='ENVIRONMENT_FAILURE'
  OWNER='GitHub Actions service-account secret'
  SOLUTION='Restaurar la identidad de servicio existente; no crear otra cuenta.'
  fail_and_close
fi
printf '%s' "$SERVICE_ACCOUNT" > "$KEY_FILE"
chmod 600 "$KEY_FILE"
if [ "$(jq -r '.project_id // empty' "$KEY_FILE" 2>/dev/null)" != "$PROJECT" ]; then
  DECISION='RC12_SERVICE_IDENTITY_PROJECT_MISMATCH'
  CLASSIFICATION='SECURITY_FAILURE'
  OWNER='GitHub Actions service-account secret'
  SOLUTION='Corregir el secreto existente para que corresponda al proyecto autorizado.'
  fail_and_close
fi
export GOOGLE_APPLICATION_CREDENTIALS="$KEY_FILE"

node tools/orbit360-gravicentra-rc12-membership-runtime-v20260803.mjs identities
IDENTITIES_CODE="$?"
if [ "$IDENTITIES_CODE" != '0' ]; then
  DECISION='RC12_NORMAL_IDENTITIES_NO_GO'
  CLASSIFICATION='SECURITY_FAILURE'
  OWNER='tenants/{tenant}/members + Firebase Auth'
  SOLUTION='Corregir membership o proveedor del usuario existente; no crear identidades paralelas.'
  fail_and_close
fi
if ! jq -e '.ok==true and .classification=="GO_NORMAL_MEMBERSHIP_IDENTITIES" and .checks.directionResolved==true and .checks.operativoResolved==true and .checks.asesorResolved==true and .checks.allActive==true and .checks.allNormalIdentities==true and .checks.allProvidersValid==true and .checks.allTenantBound==true and .checks.advisorBoundForAdvisor==true and .firestoreWrites==0 and .authWrites==0 and .userCreates==0 and .userUpdates==0 and .tokenCreationExecuted==false' "$EVIDENCE_DIR/gravicentra-rc12-membership-identities.json" >/dev/null; then
  IDENTITIES_CODE='41'
  DECISION='RC12_NORMAL_IDENTITIES_EVIDENCE_NO_GO'
  CLASSIFICATION='SECURITY_FAILURE'
  OWNER='membership identity validator'
  SOLUTION='Corregir la evidencia del validador sin tocar usuarios ni contraseñas.'
  fail_and_close
fi

node tools/orbit360-gravicentra-rc1-go-live-helper-v20260803.mjs before
BEFORE_CODE="$?"
if [ "$BEFORE_CODE" != '0' ]; then
  DECISION='RC12_SNAPSHOT_OR_ROLLBACK_ANCHOR_NO_GO'
  CLASSIFICATION='ENVIRONMENT_FAILURE'
  OWNER='Hosting/Data pre-risk helper'
  SOLUTION='Restaurar lectura de snapshots o ancla de rollback antes de cualquier deploy.'
  fail_and_close
fi
if ! jq -e '.ok==true and .checks.dataComplete==true and .checks.hostingReadable==true and .checks.rollbackAnchorAvailable==true and .firestoreWrites==0 and .authWrites==0 and .operationalWrites==0 and .deployExecuted==false and .productionTouched==false' "$EVIDENCE_DIR/gravicentra-rc1-go-live-before.json" >/dev/null; then
  BEFORE_CODE='41'
  DECISION='RC12_SNAPSHOT_EVIDENCE_NO_GO'
  CLASSIFICATION='ENVIRONMENT_FAILURE'
  OWNER='Hosting/Data pre-risk evidence'
  SOLUTION='Corregir el helper de snapshot antes del deploy.'
  fail_and_close
fi

(cd "$RC12_ROOT" && firebase deploy --only hosting --project "$PROJECT" --config firebase.json --non-interactive)
DEPLOY_CODE="$?"
if [ "$DEPLOY_CODE" != '0' ]; then
  DECISION='RC12_HOSTING_DEPLOY_FAILED_NO_PRODUCTION_CHANGE'
  CLASSIFICATION='ENVIRONMENT_FAILURE'
  OWNER='Firebase Hosting deploy'
  SOLUTION='Corregir el mecanismo de Hosting; no repetir esta autorización.'
  fail_and_close
fi

node tools/orbit360-gravicentra-rc12-browser-membership-smoke-v20260803.mjs
BROWSER_CODE="$?"
if [ "$BROWSER_CODE" = '0' ]; then
  node tools/orbit360-gravicentra-rc1-go-live-helper-v20260803.mjs smoke
  DATA_CODE="$?"
else
  DATA_CODE='skipped-browser-failed'
fi

if [ "$BROWSER_CODE" = '0' ] && [ "$DATA_CODE" = '0' ]; then
  DECISION='RC12_MEMBERSHIP_GO_LIVE_PASS'
  CLASSIFICATION='PRODUCTION_SMOKE_PASS'
  OWNER='closed'
  SOLUTION='Mantener RC1.2 publicada.'
  MAINTAINED=true
  ROLLED_BACK=false
  OK=true
  write_final
  exit 0
fi

node tools/orbit360-gravicentra-rc1-go-live-helper-v20260803.mjs rollback
ROLLBACK_CODE="$?"
if [ "$ROLLBACK_CODE" = '0' ]; then
  DECISION='RC12_ROLLED_BACK_SAFE'
  CLASSIFICATION='FUNCTIONAL_DEFECT'
  OWNER='Auth/Store/Guard or browser membership runtime'
  SOLUTION='Aplicar root fix sobre una candidata incremental; la versión anterior quedó restaurada.'
  MAINTAINED=false
  ROLLED_BACK=true
  OK=false
  write_final
  exit 41
fi

DECISION='RC12_ROLLBACK_FAILED_ESCALATE'
CLASSIFICATION='ENVIRONMENT_FAILURE'
OWNER='Firebase Hosting rollback'
SOLUTION='Restaurar la ancla exacta registrada y congelar producción.'
MAINTAINED=false
ROLLED_BACK=false
OK=false
write_final
exit 42
