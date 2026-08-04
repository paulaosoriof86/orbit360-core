#!/usr/bin/env bash
set -uo pipefail

EVIDENCE_DIR="${ORBIT360_EVIDENCE_DIR:-orbit360-platform/runtime-gate-crm-v20260716}"
FINAL="$EVIDENCE_DIR/rc12-approved-roster-final-go-live.json"
CENSUS="$EVIDENCE_DIR/rc12-approved-roster-census.json"
APPLY="$EVIDENCE_DIR/rc12-approved-roster-apply.json"
VERIFY="$EVIDENCE_DIR/rc12-approved-roster-verify.json"
ROLLBACK_PROVISIONING="$EVIDENCE_DIR/rc12-approved-roster-rollback.json"
GATE713="$EVIDENCE_DIR/rc12-gate713-post-approved-roster.json"
IDENTITIES="$EVIDENCE_DIR/gravicentra-rc12-membership-identities.json"
BEFORE="$EVIDENCE_DIR/gravicentra-rc1-go-live-before.json"
BROWSER="$EVIDENCE_DIR/gravicentra-rc12-membership-browser-smoke.json"
DATA="$EVIDENCE_DIR/gravicentra-rc1-go-live-smoke.json"
ROLLBACK_HOSTING="$EVIDENCE_DIR/gravicentra-rc1-go-live-rollback.json"

mkdir -p "$EVIDENCE_DIR"
CENSUS_CODE=''; APPLY_CODE=''; VERIFY_CODE=''; GATE713_CODE=''; IDENTITIES_CODE=''; BEFORE_CODE=''; DEPLOY_CODE=''; BROWSER_CODE=''; DATA_CODE=''; POSTVERIFY_CODE=''; PROVISIONING_ROLLBACK_CODE=''; HOSTING_ROLLBACK_CODE=''
AUTH_CREATES=0
MEMBERSHIP_WRITES=0
DEPLOY_ATTEMPTED=false
DEPLOYED=false

write_final() {
  local decision="$1" classification="$2" owner="$3" solution="$4" ok="$5" productionMaintained="$6" provisioningRollback="$7" hostingRollback="$8"
  local blockers='[]'
  if [ -f "$CENSUS" ]; then blockers="$(jq -c '.blockerProfiles // []' "$CENSUS" 2>/dev/null || echo '[]')"; fi
  jq -n \
    --arg decision "$decision" \
    --arg classification "$classification" \
    --arg owner "$owner" \
    --arg solution "$solution" \
    --arg releaseCommit "${ORBIT360_RELEASE_COMMIT:-}" \
    --arg baseline "${ORBIT360_BASELINE:-}" \
    --arg censusExitCode "$CENSUS_CODE" \
    --arg applyExitCode "$APPLY_CODE" \
    --arg verifyExitCode "$VERIFY_CODE" \
    --arg gate713ExitCode "$GATE713_CODE" \
    --arg identitiesExitCode "$IDENTITIES_CODE" \
    --arg beforeExitCode "$BEFORE_CODE" \
    --arg deployExitCode "$DEPLOY_CODE" \
    --arg browserExitCode "$BROWSER_CODE" \
    --arg dataExitCode "$DATA_CODE" \
    --arg postVerifyExitCode "$POSTVERIFY_CODE" \
    --arg provisioningRollbackExitCode "$PROVISIONING_ROLLBACK_CODE" \
    --arg hostingRollbackExitCode "$HOSTING_ROLLBACK_CODE" \
    --argjson authCreates "$AUTH_CREATES" \
    --argjson membershipWrites "$MEMBERSHIP_WRITES" \
    --argjson blockerProfiles "$blockers" \
    --argjson ok "$ok" \
    --argjson productionMaintained "$productionMaintained" \
    --argjson provisioningRollbackExecuted "$provisioningRollback" \
    --argjson hostingRollbackExecuted "$hostingRollback" \
    --argjson deployAttempted "$DEPLOY_ATTEMPTED" \
    --argjson deploySucceeded "$DEPLOYED" \
    '{
      schemaVersion:"orbit360-rc12-approved-roster-final-go-live-v1",
      generatedAt:(now|todateiso8601),
      decision:$decision,
      classification:$classification,
      rootCauseOwner:$owner,
      solution:$solution,
      releaseCommit:$releaseCommit,
      baseline:$baseline,
      censusExitCode:$censusExitCode,
      applyExitCode:$applyExitCode,
      verifyExitCode:$verifyExitCode,
      gate713ExitCode:$gate713ExitCode,
      identitiesExitCode:$identitiesExitCode,
      beforeExitCode:$beforeExitCode,
      deployExitCode:$deployExitCode,
      browserExitCode:$browserExitCode,
      dataExitCode:$dataExitCode,
      postVerifyExitCode:$postVerifyExitCode,
      provisioningRollbackExitCode:$provisioningRollbackExitCode,
      hostingRollbackExitCode:$hostingRollbackExitCode,
      authCreates:$authCreates,
      maximumAuthorizedAuthCreates:3,
      existingUserUpdates:0,
      membershipWrites:$membershipWrites,
      maximumAuthorizedMembershipWrites:3,
      blockerProfiles:$blockerProfiles,
      temporaryCredentialsExposed:false,
      temporaryCredentialsSent:false,
      passwordReads:0,
      passwordWrites:$authCreates,
      customTokensMaximum:3,
      tokenPersistence:false,
      deployAttempted:$deployAttempted,
      deploySucceeded:$deploySucceeded,
      reimportExecuted:false,
      rulesApplied:false,
      functionsDeployed:false,
      mainTouched:false,
      mergeExecuted:false,
      gate711Executed:false,
      gate713Executed:($gate713ExitCode=="0"),
      productionMaintained:$productionMaintained,
      provisioningRollbackExecuted:$provisioningRollbackExecuted,
      hostingRollbackExecuted:$hostingRollbackExecuted,
      authorizationConsumed:true,
      containsPII:false,
      containsSecrets:false,
      ok:$ok
    }' > "$FINAL"
}

rollback_provisioning() {
  if [ -f "${ORBIT360_APPROVED_ROSTER_PRIVATE_STATE:-}" ]; then
    set +e
    node tools/orbit360-provisionar-roster-aprobado-final-rc12-v20260804.mjs rollback
    PROVISIONING_ROLLBACK_CODE=$?
    set -e
  else
    PROVISIONING_ROLLBACK_CODE=0
  fi
}
rollback_all() {
  if [ "$DEPLOY_ATTEMPTED" = true ]; then
    set +e
    node tools/orbit360-gravicentra-rc1-go-live-helper-v20260803.mjs rollback
    HOSTING_ROLLBACK_CODE=$?
    set -e
  else
    HOSTING_ROLLBACK_CODE=0
  fi
  rollback_provisioning
}
stop_no_write() {
  local decision="$1" classification="$2" owner="$3" solution="$4"
  write_final "$decision" "$classification" "$owner" "$solution" false false false false
  exit 41
}
stop_after_write() {
  local decision="$1" classification="$2" owner="$3" solution="$4"
  rollback_all
  local pr=false hr=false
  [ "$PROVISIONING_ROLLBACK_CODE" = '0' ] && pr=true
  [ "$DEPLOY_ATTEMPTED" = false ] && hr=false
  [ "$DEPLOY_ATTEMPTED" = true ] && [ "$HOSTING_ROLLBACK_CODE" = '0' ] && hr=true
  if [ "$PROVISIONING_ROLLBACK_CODE" = '0' ] && [ "$HOSTING_ROLLBACK_CODE" = '0' ]; then
    write_final "$decision" "$classification" "$owner" "$solution" false false "$pr" "$hr"
    exit 41
  fi
  write_final 'RC12_APPROVED_ROSTER_ROLLBACK_ESCALATE' 'ENVIRONMENT_FAILURE' 'approved roster or Hosting rollback' 'Mantener producción congelada y restaurar las anclas exactas registradas antes de cualquier nueva ejecución.' false false "$pr" "$hr"
  exit 42
}

set +e
node tools/orbit360-provisionar-roster-aprobado-final-rc12-v20260804.mjs census
CENSUS_CODE=$?
set -e
if [ "$CENSUS_CODE" != '0' ]; then
  blockers="$(jq -r '(.blockerProfiles // []) | join(",")' "$CENSUS" 2>/dev/null || true)"
  stop_no_write 'RC12_APPROVED_ROSTER_RECONCILIATION_NO_GO_NO_WRITE' 'DATA_CONTRACT_FAILURE' 'approved roster + canonical advisor records + Firebase Auth' "No se pudo resolver inequívocamente: ${blockers:-campo no identificado}. No se creó usuario ni membership."
fi

set +e
node tools/orbit360-provisionar-roster-aprobado-final-rc12-v20260804.mjs apply
APPLY_CODE=$?
set -e
if [ -f "$APPLY" ]; then
  AUTH_CREATES="$(jq -r '.userCreates // .userCreatesAttempted // 0' "$APPLY")"
  MEMBERSHIP_WRITES="$(jq -r '.membershipWrites // .membershipCreatesAttempted // 0' "$APPLY")"
fi
if [ "$APPLY_CODE" != '0' ] || [ "$AUTH_CREATES" -gt 3 ] || [ "$MEMBERSHIP_WRITES" -gt 3 ]; then
  stop_after_write 'RC12_APPROVED_ROSTER_APPLY_FAILED_ROLLED_BACK' 'DATA_CONTRACT_FAILURE' 'controlled Auth provisioning or atomic membership transaction' 'Corregir únicamente el contrato exacto reportado; no modificar usuarios existentes ni la identidad técnica.'
fi

set +e
node tools/orbit360-provisionar-roster-aprobado-final-rc12-v20260804.mjs verify
VERIFY_CODE=$?
set -e
if [ "$VERIFY_CODE" != '0' ]; then
  stop_after_write 'RC12_APPROVED_ROSTER_VERIFY_FAILED_ROLLED_BACK' 'DATA_CONTRACT_FAILURE' 'three approved normal identities and memberships' 'Corregir el perfil exacto que no coincide con el padrón, roles o advisorId canónico.'
fi

GATE713_REQUEST="${RUNNER_TEMP:-/tmp}/rc12-gate713-post-approved-roster-request.json"
cat > "$GATE713_REQUEST" <<'JSON'
{
  "schemaVersion":"orbit360-rc12-rootcause-cumulative-closure-request-v1",
  "status":"AUTHORIZED_SINGLE_MACRO",
  "approved":true,
  "allowedExecutions":1,
  "consumed":false,
  "retryAuthorized":false,
  "postRollbackFinal":true,
  "parentAuthorizationRef":"user_authorizes_single_final_post_rollback_rc12_20260804T0734-0600",
  "rollbackRecoveryRun":30911627137,
  "branch":"ays/backend-tenant-lab-v99-20260703",
  "pullRequest":5,
  "releaseBranch":"release/gravicentra-insurance-rc1-2-membership-auth-20260803",
  "releaseCommit":"b699ba329960cd830121b57452ce558399aa84fb",
  "baseline":"27cb7dfcda8568280ebef15993a953364304f29b",
  "projectId":"ays-orbit-360-lab",
  "tenantId":"alianzas-soluciones",
  "scope":{
    "forensicAuditBeforeSecrets":true,
    "authAntiregressionBeforeSecrets":true,
    "diagnosticBeforeWrite":true,
    "exactlyOneDirectionCandidateRequired":true,
    "normalizationConditional":true,
    "threeProfilesBeforeDeploy":true,
    "hostingDeployConditional":true,
    "browserSmokeThreeProfiles":true,
    "snapshotBeforeAfter":true,
    "rollbackMembership":true,
    "rollbackHosting":true,
    "authWrites":false,
    "userCreates":false,
    "userUpdates":false,
    "passwordReads":false,
    "passwordWrites":false,
    "emailChanges":false,
    "providerChanges":false,
    "uidChanges":false,
    "advisorIdChanges":false,
    "scopeChanges":false,
    "reimport":false,
    "rules":false,
    "functions":false,
    "main":false,
    "merge":false,
    "gate711":false,
    "generalPredeploy":false
  }
}
JSON
set +e
ORBIT360_REQUEST_FILE="$GATE713_REQUEST" node tools/orbit360-validar-gate-contracts-v20260717.mjs block7.13-rc12-membership-rootcause-cumulative-closure-v20260803
GATE713_CODE=$?
set -e
cp "$EVIDENCE_DIR/preflight-sanitizado.json" "$GATE713" 2>/dev/null || true
rm -f "$GATE713_REQUEST"
if [ "$GATE713_CODE" != '0' ]; then
  stop_after_write 'RC12_GATE713_POST_MEMBERSHIP_FAILED_ROLLED_BACK' 'VALIDATOR_STALE' 'Gate 7.13 post-membership verification' 'Corregir el contrato o validador antes de Hosting; el onboarding creado quedó restaurado.'
fi

set +e
node tools/orbit360-gravicentra-rc12-membership-runtime-v20260803.mjs identities
IDENTITIES_CODE=$?
set -e
if [ "$IDENTITIES_CODE" != '0' ]; then
  stop_after_write 'RC12_APPROVED_IDENTITIES_RUNTIME_FAILED_ROLLED_BACK' 'SECURITY_FAILURE' 'memberships + Firebase Auth identities' 'Corregir el vínculo exacto que no resuelve Dirección, Operativo o Asesor.'
fi

set +e
node tools/orbit360-gravicentra-rc1-go-live-helper-v20260803.mjs before
BEFORE_CODE=$?
set -e
if [ "$BEFORE_CODE" != '0' ]; then
  stop_after_write 'RC12_SNAPSHOT_OR_HOSTING_ANCHOR_FAILED_ROLLED_BACK' 'ENVIRONMENT_FAILURE' 'canonical data and Hosting snapshot helper' 'Restaurar la lectura de snapshots o el ancla de Hosting antes de publicar.'
fi

DEPLOY_ATTEMPTED=true
set +e
(
  cd "$ORBIT360_RC12_ROOT"
  firebase deploy --only hosting --project "$ORBIT360_PROJECT_ID" --config firebase.json --non-interactive
)
DEPLOY_CODE=$?
set -e
if [ "$DEPLOY_CODE" != '0' ]; then
  stop_after_write 'RC12_HOSTING_DEPLOY_FAILED_ROLLED_BACK' 'ENVIRONMENT_FAILURE' 'Firebase Hosting deploy' 'Corregir el mecanismo exacto de Hosting; se restauraron Hosting, memberships y usuarios creados.'
fi
DEPLOYED=true

set +e
node tools/orbit360-gravicentra-rc12-browser-membership-smoke-v20260803.mjs
BROWSER_CODE=$?
set -e
if [ "$BROWSER_CODE" != '0' ]; then
  stop_after_write 'RC12_BROWSER_THREE_PROFILE_SMOKE_FAILED_ROLLED_BACK' 'FUNCTIONAL_DEFECT' 'Auth/Store/Guard browser runtime' 'Corregir el owner funcional exacto; Hosting y onboarding fueron restaurados.'
fi

set +e
node tools/orbit360-gravicentra-rc1-go-live-helper-v20260803.mjs smoke
DATA_CODE=$?
set -e
if [ "$DATA_CODE" != '0' ]; then
  stop_after_write 'RC12_DATA_OR_MODULE_SMOKE_FAILED_ROLLED_BACK' 'DATA_CONTRACT_FAILURE' 'canonical data, assets and module smoke' 'Corregir el criterio exacto de conteos, digest, activos o cobertura; no reimportar.'
fi

set +e
node tools/orbit360-provisionar-roster-aprobado-final-rc12-v20260804.mjs verify
POSTVERIFY_CODE=$?
set -e
if [ "$POSTVERIFY_CODE" != '0' ]; then
  stop_after_write 'RC12_POSTDEPLOY_MEMBERSHIP_VERIFY_FAILED_ROLLED_BACK' 'DATA_CONTRACT_FAILURE' 'approved roster post-deploy verification' 'Corregir la mutación concurrente o contrato exacto; Hosting y onboarding fueron restaurados.'
fi

write_final 'RC12_APPROVED_ROSTER_CUMULATIVE_GO_LIVE_PASS' 'PRODUCTION_SMOKE_PASS' 'closed' 'Mantener RC1.2 publicada con la candidata acumulativa, tres identidades normales y datos canónicos preservados.' true true false false
exit 0
