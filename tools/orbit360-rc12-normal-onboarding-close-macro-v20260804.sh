#!/usr/bin/env bash
set -uo pipefail

EVIDENCE_DIR="${ORBIT360_EVIDENCE_DIR:-orbit360-platform/runtime-gate-crm-v20260716}"
FINAL="$EVIDENCE_DIR/rc12-normal-onboarding-close-final.json"
CENSUS="$EVIDENCE_DIR/rc12-normal-auth-census.json"
APPLY="$EVIDENCE_DIR/rc12-normal-memberships-apply.json"
VERIFY="$EVIDENCE_DIR/rc12-normal-memberships-verify.json"
ROLLBACK_MEMBERS="$EVIDENCE_DIR/rc12-normal-memberships-rollback.json"
BEFORE="$EVIDENCE_DIR/gravicentra-rc1-go-live-before.json"
BROWSER="$EVIDENCE_DIR/gravicentra-rc12-membership-browser-smoke.json"
DATA="$EVIDENCE_DIR/gravicentra-rc1-go-live-smoke.json"
ROLLBACK_HOSTING="$EVIDENCE_DIR/gravicentra-rc1-go-live-rollback.json"
GATE713="$EVIDENCE_DIR/rc12-gate713-post-onboarding.json"

mkdir -p "$EVIDENCE_DIR"
CENSUS_CODE=''; APPLY_CODE=''; VERIFY_CODE=''; GATE713_CODE=''; IDENTITIES_CODE=''; BEFORE_CODE=''; DEPLOY_CODE=''; BROWSER_CODE=''; DATA_CODE=''; POSTVERIFY_CODE=''; MEMBER_ROLLBACK_CODE=''; HOSTING_ROLLBACK_CODE=''
MEMBERSHIP_WRITES=0
DEPLOYED=false

write_final() {
  local decision="$1" classification="$2" owner="$3" solution="$4" ok="$5" production="$6" memberRollback="$7" hostingRollback="$8"
  local missing='' ambiguous=''
  if [ -f "$CENSUS" ]; then
    missing="$(jq -c '.missingProfiles // []' "$CENSUS" 2>/dev/null || echo '[]')"
    ambiguous="$(jq -c '.ambiguousProfiles // []' "$CENSUS" 2>/dev/null || echo '[]')"
  else
    missing='[]'; ambiguous='[]'
  fi
  jq -n \
    --arg decision "$decision" --arg classification "$classification" --arg owner "$owner" --arg solution "$solution" \
    --arg releaseCommit "${ORBIT360_RELEASE_COMMIT:-}" --arg baseline "${ORBIT360_BASELINE:-}" \
    --arg censusExitCode "$CENSUS_CODE" --arg applyExitCode "$APPLY_CODE" --arg verifyExitCode "$VERIFY_CODE" --arg gate713ExitCode "$GATE713_CODE" \
    --arg identitiesExitCode "$IDENTITIES_CODE" --arg beforeExitCode "$BEFORE_CODE" --arg deployExitCode "$DEPLOY_CODE" --arg browserExitCode "$BROWSER_CODE" \
    --arg dataExitCode "$DATA_CODE" --arg postVerifyExitCode "$POSTVERIFY_CODE" --arg membershipRollbackExitCode "$MEMBER_ROLLBACK_CODE" --arg hostingRollbackExitCode "$HOSTING_ROLLBACK_CODE" \
    --argjson membershipWrites "$MEMBERSHIP_WRITES" --argjson missingProfiles "$missing" --argjson ambiguousProfiles "$ambiguous" \
    --argjson ok "$ok" --argjson productionMaintained "$production" --argjson membershipRollbackExecuted "$memberRollback" --argjson hostingRollbackExecuted "$hostingRollback" \
    '{schemaVersion:"orbit360-rc12-normal-onboarding-close-final-v1",generatedAt:(now|todateiso8601),decision:$decision,classification:$classification,rootCauseOwner:$owner,solution:$solution,releaseCommit:$releaseCommit,baseline:$baseline,censusExitCode:$censusExitCode,applyExitCode:$applyExitCode,verifyExitCode:$verifyExitCode,gate713ExitCode:$gate713ExitCode,identitiesExitCode:$identitiesExitCode,beforeExitCode:$beforeExitCode,deployExitCode:$deployExitCode,browserExitCode:$browserExitCode,dataExitCode:$dataExitCode,postVerifyExitCode:$postVerifyExitCode,membershipRollbackExitCode:$membershipRollbackExitCode,hostingRollbackExitCode:$hostingRollbackExitCode,membershipWrites:$membershipWrites,maximumAuthorizedMembershipDocuments:3,missingProfiles:$missingProfiles,ambiguousProfiles:$ambiguousProfiles,authWrites:0,userCreates:0,userUpdates:0,passwordReads:0,passwordWrites:0,reimportExecuted:false,rulesApplied:false,functionsDeployed:false,mainTouched:false,mergeExecuted:false,gate711Executed:false,productionMaintained:$productionMaintained,membershipRollbackExecuted:$membershipRollbackExecuted,hostingRollbackExecuted:$hostingRollbackExecuted,authorizationConsumed:true,containsPII:false,containsSecrets:false,ok:$ok}' > "$FINAL"
}

rollback_memberships() {
  if [ "$MEMBERSHIP_WRITES" -gt 0 ]; then
    set +e
    node tools/orbit360-onboarding-normal-rc12-v20260804.mjs rollback
    MEMBER_ROLLBACK_CODE=$?
    set -e
  else
    MEMBER_ROLLBACK_CODE=0
  fi
}
rollback_all() {
  if [ "$DEPLOYED" = true ]; then
    set +e
    node tools/orbit360-gravicentra-rc1-go-live-helper-v20260803.mjs rollback
    HOSTING_ROLLBACK_CODE=$?
    set -e
  else
    HOSTING_ROLLBACK_CODE=0
  fi
  rollback_memberships
}
stop_no_write() {
  local decision="$1" classification="$2" owner="$3" solution="$4"
  write_final "$decision" "$classification" "$owner" "$solution" false false false false
  exit 41
}
stop_after_write() {
  local decision="$1" classification="$2" owner="$3" solution="$4"
  rollback_all
  local mr=false hr=false
  [ "$MEMBERSHIP_WRITES" -gt 0 ] && [ "$MEMBER_ROLLBACK_CODE" = '0' ] && mr=true
  [ "$DEPLOYED" = true ] && [ "$HOSTING_ROLLBACK_CODE" = '0' ] && hr=true
  if [ "$MEMBER_ROLLBACK_CODE" = '0' ] && [ "$HOSTING_ROLLBACK_CODE" = '0' ]; then
    write_final "$decision" "$classification" "$owner" "$solution" false false "$mr" "$hr"
    exit 41
  fi
  write_final 'RC12_NORMAL_ONBOARDING_ROLLBACK_ESCALATE' 'ENVIRONMENT_FAILURE' 'membership or Hosting rollback' 'Restaurar las anclas exactas registradas y mantener producción congelada.' false false "$mr" "$hr"
  exit 42
}

set +e
node tools/orbit360-onboarding-normal-rc12-v20260804.mjs census
CENSUS_CODE=$?
set -e
if [ "$CENSUS_CODE" != '0' ]; then
  missing="$(jq -r '(.missingProfiles // []) | join(",")' "$CENSUS" 2>/dev/null || true)"
  ambiguous="$(jq -r '(.ambiguousProfiles // []) | join(",")' "$CENSUS" 2>/dev/null || true)"
  stop_no_write 'RC12_NORMAL_USERS_MISSING_OR_AMBIGUOUS_NO_WRITE' 'DATA_CONTRACT_FAILURE' 'Firebase Auth normal users + tenant membership onboarding' "Perfiles faltantes: ${missing:-ninguno}; perfiles ambiguos: ${ambiguous:-ninguno}. No se creó ninguna membership."
fi

set +e
node tools/orbit360-onboarding-normal-rc12-v20260804.mjs apply
APPLY_CODE=$?
set -e
[ -f "$APPLY" ] && MEMBERSHIP_WRITES="$(jq -r '.firestoreWrites // 0' "$APPLY")"
if [ "$APPLY_CODE" != '0' ] || [ "$MEMBERSHIP_WRITES" -gt 3 ]; then
  stop_after_write 'RC12_NORMAL_MEMBERSHIPS_APPLY_FAILED_ROLLED_BACK' 'DATA_CONTRACT_FAILURE' 'atomic membership onboarding transaction' 'Corregir la colisión o contrato exacto de los tres documentos; no modificar usuarios Auth.'
fi

set +e
node tools/orbit360-onboarding-normal-rc12-v20260804.mjs verify
VERIFY_CODE=$?
set -e
if [ "$VERIFY_CODE" != '0' ]; then
  stop_after_write 'RC12_NORMAL_MEMBERSHIPS_VERIFY_FAILED_ROLLED_BACK' 'DATA_CONTRACT_FAILURE' 'three normal membership contract' 'Corregir el perfil exacto que no cumple Dirección, Operativo o Asesor.'
fi

GATE713_REQUEST="${RUNNER_TEMP:-/tmp}/rc12-gate713-post-onboarding-request.json"
cat > "$GATE713_REQUEST" <<'JSON'
{
  "schemaVersion":"orbit360-rc12-rootcause-cumulative-closure-request-v1",
  "status":"AUTHORIZED_SINGLE_MACRO",
  "approved":true,
  "allowedExecutions":1,
  "consumed":false,
  "retryAuthorized":false,
  "branch":"ays/backend-tenant-lab-v99-20260703",
  "pullRequest":5,
  "releaseBranch":"release/gravicentra-insurance-rc1-2-membership-auth-20260803",
  "releaseCommit":"b699ba329960cd830121b57452ce558399aa84fb",
  "baseline":"27cb7dfcda8568280ebef15993a953364304f29b",
  "projectId":"ays-orbit-360-lab",
  "tenantId":"alianzas-soluciones",
  "scope":{"forensicAuditBeforeSecrets":true,"authAntiregressionBeforeSecrets":true,"diagnosticBeforeWrite":true,"exactlyOneDirectionCandidateRequired":true,"normalizationConditional":true,"threeProfilesBeforeDeploy":true,"hostingDeployConditional":true,"browserSmokeThreeProfiles":true,"snapshotBeforeAfter":true,"rollbackMembership":true,"rollbackHosting":true,"authWrites":false,"userCreates":false,"userUpdates":false,"passwordReads":false,"passwordWrites":false,"emailChanges":false,"providerChanges":false,"uidChanges":false,"advisorIdChanges":false,"scopeChanges":false,"reimport":false,"rules":false,"functions":false,"main":false,"merge":false,"gate711":false,"generalPredeploy":false}
}
JSON
set +e
ORBIT360_REQUEST_FILE="$GATE713_REQUEST" node tools/orbit360-validar-gate-contracts-v20260717.mjs block7.13-rc12-membership-rootcause-cumulative-closure-v20260803
GATE713_CODE=$?
set -e
cp "$EVIDENCE_DIR/preflight-sanitizado.json" "$GATE713"
rm -f "$GATE713_REQUEST"
if [ "$GATE713_CODE" != '0' ]; then
  stop_after_write 'RC12_GATE713_POST_ONBOARDING_FAILED_ROLLED_BACK' 'VALIDATOR_STALE' 'Gate 7.13 post-membership contract' 'Corregir el contrato o validador antes de Hosting; las memberships quedaron restauradas.'
fi

set +e
node tools/orbit360-gravicentra-rc12-membership-runtime-v20260803.mjs identities
IDENTITIES_CODE=$?
set -e
if [ "$IDENTITIES_CODE" != '0' ]; then
  stop_after_write 'RC12_NORMAL_IDENTITIES_RUNTIME_FAILED_ROLLED_BACK' 'SECURITY_FAILURE' 'memberships + Firebase Auth identities' 'Corregir el vínculo exacto del perfil que no resuelve; no crear ni modificar usuarios.'
fi

set +e
node tools/orbit360-gravicentra-rc1-go-live-helper-v20260803.mjs before
BEFORE_CODE=$?
set -e
if [ "$BEFORE_CODE" != '0' ]; then
  stop_after_write 'RC12_PREDEPLOY_SNAPSHOT_FAILED_ROLLED_BACK' 'ENVIRONMENT_FAILURE' 'data and Hosting snapshot helper' 'Restaurar lectura de snapshots y ancla de rollback antes de publicar.'
fi

set +e
(
  cd "$ORBIT360_RC12_ROOT"
  firebase deploy --only hosting --project "$ORBIT360_PROJECT_ID" --config firebase.json --non-interactive
)
DEPLOY_CODE=$?
set -e
if [ "$DEPLOY_CODE" != '0' ]; then
  stop_after_write 'RC12_HOSTING_DEPLOY_FAILED_MEMBERSHIPS_ROLLED_BACK' 'ENVIRONMENT_FAILURE' 'Firebase Hosting deploy' 'Corregir el mecanismo de Hosting; las memberships quedaron restauradas.'
fi
DEPLOYED=true

set +e
node tools/orbit360-gravicentra-rc12-browser-membership-smoke-v20260803.mjs
BROWSER_CODE=$?
set -e
if [ "$BROWSER_CODE" != '0' ]; then
  stop_after_write 'RC12_BROWSER_SMOKE_FAILED_ROLLED_BACK_SAFE' 'FUNCTIONAL_DEFECT' 'Auth/Store/Guard browser runtime' 'Corregir el owner funcional exacto; Hosting y memberships fueron restaurados.'
fi

set +e
node tools/orbit360-gravicentra-rc1-go-live-helper-v20260803.mjs smoke
DATA_CODE=$?
set -e
if [ "$DATA_CODE" != '0' ]; then
  stop_after_write 'RC12_DATA_MODULE_SMOKE_FAILED_ROLLED_BACK_SAFE' 'DATA_CONTRACT_FAILURE' 'canonical data and module smoke' 'Corregir conteos, activos o cobertura; Hosting y memberships fueron restaurados.'
fi

set +e
node tools/orbit360-onboarding-normal-rc12-v20260804.mjs verify
POSTVERIFY_CODE=$?
set -e
if [ "$POSTVERIFY_CODE" != '0' ]; then
  stop_after_write 'RC12_POSTVERIFY_FAILED_ROLLED_BACK_SAFE' 'DATA_CONTRACT_FAILURE' 'membership post-deploy verification' 'Corregir mutación concurrente o contrato; Hosting y memberships fueron restaurados.'
fi

write_final 'RC12_NORMAL_ONBOARDING_CUMULATIVE_GO_LIVE_PASS' 'PRODUCTION_SMOKE_PASS' 'closed' 'Mantener RC1.2 publicada con tres memberships normales y continuar la revisión visual pendiente sin afirmar backend completo.' true true false false
exit 0
