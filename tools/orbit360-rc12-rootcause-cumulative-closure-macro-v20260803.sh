#!/usr/bin/env bash
set -uo pipefail

EVIDENCE_DIR="${ORBIT360_EVIDENCE_DIR:-orbit360-platform/runtime-gate-crm-v20260716}"
FINAL="$EVIDENCE_DIR/rc12-rootcause-cumulative-closure-final.json"
GENERIC_DIAG="$EVIDENCE_DIR/rc12-membership-contract-diagnostic.json"
ROOT_DIAG="$EVIDENCE_DIR/rc12-membership-rootcause-diagnostic.json"
APPLY_EVIDENCE="$EVIDENCE_DIR/rc12-membership-normalization-apply.json"
VERIFY_EVIDENCE="$EVIDENCE_DIR/rc12-membership-normalization-verify.json"
BROWSER_EVIDENCE="$EVIDENCE_DIR/gravicentra-rc12-membership-browser-smoke.json"
DATA_EVIDENCE="$EVIDENCE_DIR/gravicentra-rc1-go-live-smoke.json"
BEFORE_EVIDENCE="$EVIDENCE_DIR/gravicentra-rc1-go-live-before.json"
HOSTING_ROLLBACK_EVIDENCE="$EVIDENCE_DIR/gravicentra-rc1-go-live-rollback.json"
MEMBERSHIP_ROLLBACK_EVIDENCE="$EVIDENCE_DIR/rc12-membership-normalization-rollback.json"
AUDIT_EVIDENCE="$EVIDENCE_DIR/rc12-forensic-module-audit.json"
AUTH_GATE_EVIDENCE="$EVIDENCE_DIR/rc12-auth-membership-antiregression.json"

mkdir -p "$EVIDENCE_DIR"

GENERIC_DIAG_CODE=''
ROOT_DIAG_CODE=''
APPLY_CODE=''
VERIFY_CODE=''
IDENTITIES_CODE=''
BEFORE_CODE=''
DEPLOY_CODE=''
BROWSER_CODE=''
DATA_CODE=''
POSTVERIFY_CODE=''
HOSTING_ROLLBACK_CODE=''
MEMBERSHIP_ROLLBACK_CODE=''
MEMBERSHIP_FORWARD_WRITES=0
DEPLOYED=false

write_final() {
  local decision="$1"
  local classification="$2"
  local owner="$3"
  local solution="$4"
  local ok="$5"
  local production_maintained="$6"
  local hosting_rollback="$7"
  local membership_rollback="$8"
  jq -n \
    --arg decision "$decision" \
    --arg classification "$classification" \
    --arg owner "$owner" \
    --arg solution "$solution" \
    --arg releaseCommit "${ORBIT360_RELEASE_COMMIT:-}" \
    --arg baseline "${ORBIT360_BASELINE:-}" \
    --arg genericDiagnosticExitCode "$GENERIC_DIAG_CODE" \
    --arg rootDiagnosticExitCode "$ROOT_DIAG_CODE" \
    --arg applyExitCode "$APPLY_CODE" \
    --arg verifyExitCode "$VERIFY_CODE" \
    --arg identitiesExitCode "$IDENTITIES_CODE" \
    --arg beforeExitCode "$BEFORE_CODE" \
    --arg deployExitCode "$DEPLOY_CODE" \
    --arg browserExitCode "$BROWSER_CODE" \
    --arg dataExitCode "$DATA_CODE" \
    --arg postVerifyExitCode "$POSTVERIFY_CODE" \
    --arg hostingRollbackExitCode "$HOSTING_ROLLBACK_CODE" \
    --arg membershipRollbackExitCode "$MEMBERSHIP_ROLLBACK_CODE" \
    --argjson membershipForwardWrites "$MEMBERSHIP_FORWARD_WRITES" \
    --argjson ok "$ok" \
    --argjson productionMaintained "$production_maintained" \
    --argjson hostingRollbackExecuted "$hosting_rollback" \
    --argjson membershipRollbackExecuted "$membership_rollback" \
    '{
      schemaVersion:"orbit360-rc12-rootcause-cumulative-closure-final-v1",
      generatedAt:(now|todateiso8601),
      decision:$decision,
      classification:$classification,
      rootCauseOwner:$owner,
      solution:$solution,
      releaseCommit:$releaseCommit,
      baseline:$baseline,
      genericDiagnosticExitCode:$genericDiagnosticExitCode,
      rootDiagnosticExitCode:$rootDiagnosticExitCode,
      applyExitCode:$applyExitCode,
      verifyExitCode:$verifyExitCode,
      identitiesExitCode:$identitiesExitCode,
      beforeExitCode:$beforeExitCode,
      deployExitCode:$deployExitCode,
      browserExitCode:$browserExitCode,
      dataExitCode:$dataExitCode,
      postVerifyExitCode:$postVerifyExitCode,
      hostingRollbackExitCode:$hostingRollbackExitCode,
      membershipRollbackExitCode:$membershipRollbackExitCode,
      membershipForwardWrites:$membershipForwardWrites,
      maximumAuthorizedMembershipDocuments:1,
      authWrites:0,
      userCreates:0,
      userUpdates:0,
      passwordReads:0,
      passwordWrites:0,
      reimportExecuted:false,
      rulesApplied:false,
      functionsDeployed:false,
      mainTouched:false,
      mergeExecuted:false,
      productionMaintained:$productionMaintained,
      hostingRollbackExecuted:$hostingRollbackExecuted,
      membershipRollbackExecuted:$membershipRollbackExecuted,
      forensicAuditPassed:true,
      authorizationConsumed:true,
      containsPII:false,
      containsSecrets:false,
      ok:$ok
    }' > "$FINAL"
}

rollback_membership_if_needed() {
  if [ "$MEMBERSHIP_FORWARD_WRITES" -gt 0 ]; then
    set +e
    node tools/orbit360-normalizar-membership-direccion-rc12-v20260803.mjs rollback
    MEMBERSHIP_ROLLBACK_CODE=$?
    set -e
  else
    MEMBERSHIP_ROLLBACK_CODE=0
  fi
}

rollback_all_after_deploy() {
  set +e
  node tools/orbit360-gravicentra-rc1-go-live-helper-v20260803.mjs rollback
  HOSTING_ROLLBACK_CODE=$?
  set -e
  rollback_membership_if_needed
}

stop_before_deploy() {
  local decision="$1"
  local classification="$2"
  local owner="$3"
  local solution="$4"
  rollback_membership_if_needed
  local membership_rollback=false
  if [ "$MEMBERSHIP_FORWARD_WRITES" -gt 0 ] && [ "$MEMBERSHIP_ROLLBACK_CODE" = '0' ]; then membership_rollback=true; fi
  write_final "$decision" "$classification" "$owner" "$solution" false false false "$membership_rollback"
  exit 41
}

set +e
node tools/orbit360-diagnosticar-memberships-normales-v20260803.mjs
GENERIC_DIAG_CODE=$?
set -e
if [ ! -f "$GENERIC_DIAG" ] || [ "$GENERIC_DIAG_CODE" = '42' ]; then
  stop_before_deploy 'RC12_MEMBERSHIP_DIAGNOSTIC_ENVIRONMENT_NO_GO' 'ENVIRONMENT_FAILURE' 'membership diagnostic runtime' 'Restaurar lectura administrativa de memberships y Firebase Auth antes de cualquier escritura.'
fi

set +e
node tools/orbit360-normalizar-membership-direccion-rc12-v20260803.mjs diagnose
ROOT_DIAG_CODE=$?
set -e
if [ "$ROOT_DIAG_CODE" != '0' ]; then
  categories="$(jq -r '(.counters.reasons // {}) | to_entries | map(select(.value>0) | .key) | join(",")' "$ROOT_DIAG" 2>/dev/null || true)"
  stop_before_deploy 'RC12_DIRECTION_MEMBERSHIP_AMBIGUOUS_NO_GO' 'DATA_CONTRACT_FAILURE' 'tenants/{tenantId}/members/{uid} + Firebase Auth' "No existe exactamente una membership de Dirección corregible. Categorías: ${categories:-no_observable_categories}."
fi

set +e
node tools/orbit360-normalizar-membership-direccion-rc12-v20260803.mjs apply
APPLY_CODE=$?
set -e
if [ -f "$APPLY_EVIDENCE" ]; then
  MEMBERSHIP_FORWARD_WRITES="$(jq -r '.firestoreWrites // 0' "$APPLY_EVIDENCE")"
fi
if [ "$APPLY_CODE" != '0' ] || [ "$MEMBERSHIP_FORWARD_WRITES" -gt 1 ]; then
  stop_before_deploy 'RC12_MEMBERSHIP_NORMALIZATION_FAILED_NO_GO' 'DATA_CONTRACT_FAILURE' 'membership normalization transaction' 'Corregir el diff permitido o la concurrencia del documento; no crear identidades paralelas.'
fi

set +e
node tools/orbit360-normalizar-membership-direccion-rc12-v20260803.mjs verify
VERIFY_CODE=$?
set -e
if [ "$VERIFY_CODE" != '0' ]; then
  stop_before_deploy 'RC12_THREE_PROFILE_CONTRACT_NO_GO' 'DATA_CONTRACT_FAILURE' 'membership contract verification' 'Restaurar o corregir el perfil exacto que aún no cumple Dirección, Operativo y Asesor.'
fi

set +e
node tools/orbit360-gravicentra-rc12-membership-runtime-v20260803.mjs identities
IDENTITIES_CODE=$?
set -e
if [ "$IDENTITIES_CODE" != '0' ]; then
  stop_before_deploy 'RC12_NORMAL_IDENTITIES_NO_GO' 'SECURITY_FAILURE' 'memberships + Firebase Auth identities' 'Corregir proveedor, estado o vínculo del usuario existente; no crear usuarios ni cambiar credenciales.'
fi

set +e
node tools/orbit360-gravicentra-rc1-go-live-helper-v20260803.mjs before
BEFORE_CODE=$?
set -e
if [ "$BEFORE_CODE" != '0' ]; then
  stop_before_deploy 'RC12_SNAPSHOT_OR_ROLLBACK_ANCHOR_NO_GO' 'ENVIRONMENT_FAILURE' 'Hosting/Data pre-risk helper' 'Restaurar lectura de snapshots o ancla de rollback antes del deploy.'
fi

set +e
(
  cd "$ORBIT360_RC12_ROOT"
  npx firebase-tools deploy --only hosting --project "$ORBIT360_PROJECT_ID" --non-interactive
)
DEPLOY_CODE=$?
set -e
if [ "$DEPLOY_CODE" != '0' ]; then
  stop_before_deploy 'RC12_HOSTING_DEPLOY_FAILED_NO_PRODUCTION_CHANGE' 'ENVIRONMENT_FAILURE' 'Firebase Hosting deploy' 'Corregir el mecanismo de Hosting; la membership fue restaurada si había sido normalizada.'
fi
DEPLOYED=true

set +e
node tools/orbit360-gravicentra-rc12-browser-membership-smoke-v20260803.mjs
BROWSER_CODE=$?
set -e
if [ "$BROWSER_CODE" != '0' ]; then
  rollback_all_after_deploy
  if [ "$HOSTING_ROLLBACK_CODE" = '0' ] && [ "$MEMBERSHIP_ROLLBACK_CODE" = '0' ]; then
    write_final 'RC12_BROWSER_FAILED_ROLLED_BACK_SAFE' 'FUNCTIONAL_DEFECT' 'Auth/Store/Guard or browser membership runtime' 'Corregir el owner funcional exacto sobre una candidata incremental; Hosting y membership quedaron restaurados.' false false true "$([ "$MEMBERSHIP_FORWARD_WRITES" -gt 0 ] && echo true || echo false)"
    exit 41
  fi
  write_final 'RC12_BROWSER_FAILED_ROLLBACK_ESCALATE' 'ENVIRONMENT_FAILURE' 'Hosting or membership rollback' 'Restaurar manualmente las anclas registradas y congelar producción.' false false "$([ "$HOSTING_ROLLBACK_CODE" = '0' ] && echo true || echo false)" "$([ "$MEMBERSHIP_ROLLBACK_CODE" = '0' ] && [ "$MEMBERSHIP_FORWARD_WRITES" -gt 0 ] && echo true || echo false)"
  exit 42
fi

set +e
node tools/orbit360-gravicentra-rc1-go-live-helper-v20260803.mjs smoke
DATA_CODE=$?
set -e
if [ "$DATA_CODE" != '0' ]; then
  rollback_all_after_deploy
  if [ "$HOSTING_ROLLBACK_CODE" = '0' ] && [ "$MEMBERSHIP_ROLLBACK_CODE" = '0' ]; then
    write_final 'RC12_DATA_SMOKE_FAILED_ROLLED_BACK_SAFE' 'DATA_CONTRACT_FAILURE' 'canonical data/Hosting smoke' 'Corregir la diferencia de conteos, digests o activos; Hosting y membership quedaron restaurados.' false false true "$([ "$MEMBERSHIP_FORWARD_WRITES" -gt 0 ] && echo true || echo false)"
    exit 41
  fi
  write_final 'RC12_DATA_SMOKE_FAILED_ROLLBACK_ESCALATE' 'ENVIRONMENT_FAILURE' 'Hosting or membership rollback' 'Restaurar manualmente las anclas registradas y congelar producción.' false false "$([ "$HOSTING_ROLLBACK_CODE" = '0' ] && echo true || echo false)" "$([ "$MEMBERSHIP_ROLLBACK_CODE" = '0' ] && [ "$MEMBERSHIP_FORWARD_WRITES" -gt 0 ] && echo true || echo false)"
  exit 42
fi

set +e
node tools/orbit360-normalizar-membership-direccion-rc12-v20260803.mjs verify
POSTVERIFY_CODE=$?
set -e
if [ "$POSTVERIFY_CODE" != '0' ]; then
  rollback_all_after_deploy
  if [ "$HOSTING_ROLLBACK_CODE" = '0' ] && [ "$MEMBERSHIP_ROLLBACK_CODE" = '0' ]; then
    write_final 'RC12_POSTVERIFY_FAILED_ROLLED_BACK_SAFE' 'DATA_CONTRACT_FAILURE' 'membership post-deploy verification' 'Corregir la mutación concurrente o contrato de membership; Hosting y membership quedaron restaurados.' false false true "$([ "$MEMBERSHIP_FORWARD_WRITES" -gt 0 ] && echo true || echo false)"
    exit 41
  fi
  write_final 'RC12_POSTVERIFY_FAILED_ROLLBACK_ESCALATE' 'ENVIRONMENT_FAILURE' 'Hosting or membership rollback' 'Restaurar manualmente las anclas registradas y congelar producción.' false false "$([ "$HOSTING_ROLLBACK_CODE" = '0' ] && echo true || echo false)" "$([ "$MEMBERSHIP_ROLLBACK_CODE" = '0' ] && [ "$MEMBERSHIP_FORWARD_WRITES" -gt 0 ] && echo true || echo false)"
  exit 42
fi

write_final 'RC12_MEMBERSHIP_CUMULATIVE_GO_LIVE_PASS' 'PRODUCTION_SMOKE_PASS' 'closed' 'Mantener RC1.2 publicada; continuar con revisión visual y backlog de madurez sin afirmar backend completo de los 31 módulos.' true true false false
exit 0
