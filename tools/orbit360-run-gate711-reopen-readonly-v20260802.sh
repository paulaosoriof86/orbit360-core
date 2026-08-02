#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-}"
ROOT="$(pwd)"
EVIDENCE_DIR="${EVIDENCE_DIR:-orbit360-platform/runtime-gate-crm-v20260716}"
REQUEST_FILE="${ORBIT360_REQUEST_FILE:?ORBIT360_REQUEST_FILE required}"
LIFECYCLE_FILE="${ORBIT360_LIFECYCLE_FILE:?ORBIT360_LIFECYCLE_FILE required}"
CANONICAL_REQUEST=".github/orbit360-requests/canonical-runtime-cumulative-visual-lab-v20260801.json"
CANONICAL_LIFECYCLE="tools/orbit360-validator-lifecycle-contract-canonical-runtime-cumulative-visual-lab-v20260801.json"
GATE_ID="block7-canonical-runtime-cumulative-visual-lab-v20260801"
DIGEST="19e1927d39f6b713ee12504f8762bc42ead9de6e365bb0f12162d2a0c8f8469b"

preflight() {
  test "${GITHUB_REF_NAME:-}" = 'ays/backend-tenant-lab-v99-20260703'
  test "${GITHUB_RUN_ATTEMPT:-}" = '1'
  test "$(git rev-parse HEAD^)" = "$(jq -r '.parentHead' "$REQUEST_FILE")"
  mapfile -t changed < <(git diff-tree --no-commit-id --name-only -r HEAD)
  test "${#changed[@]}" = '1'
  test "${changed[0]}" = "$REQUEST_FILE"

  jq -e '.schemaVersion=="orbit360-canonical-runtime-cumulative-visual-lab-request-v1" and .gateId=="block7-canonical-runtime-cumulative-visual-lab-v20260801" and .contractVersion=="7.11.0" and .approved==true and .allowedExecutions==1 and .consumed==false and .branch=="ays/backend-tenant-lab-v99-20260703" and .pullRequest==5 and .projectId=="ays-orbit-360-lab" and .tenantId=="alianzas-soluciones" and .canonicalSnapshotDigest=="19e1927d39f6b713ee12504f8762bc42ead9de6e365bb0f12162d2a0c8f8469b" and .staticReopenEvidence.run==30760809119 and .staticReopenEvidence.artifact==8837378178 and .staticReopenEvidence.authorizationBinding=="GATE711_AUTHORIZATION_BINDING_STATIC_PASS" and .staticReopenEvidence.legalDeferredOrder=="GATE711_LEGAL_DEFERRED_ORDER_STATIC_PASS" and .staticReopenEvidence.preflight=="GO_GATE_CONTRACT" and .identity.existingOnly==true and .identity.createUser==false and .identity.updateUser==false and .identity.customTokenEphemeral==true and .scope.snapshotBeforeAfter==true and .scope.browserWriteGuard==true and .capabilities.secrets==true and .capabilities.firestoreRead==true and .capabilities.writes==false and .capabilities.runtime==true and .capabilities.browser==true and .capabilities.deploy==false and .capabilities.production==false and .stopRetryOnSameStageOrFamily==true' "$REQUEST_FILE" >/dev/null
  jq -e '.status=="CANONICAL_RUNTIME_CUMULATIVE_VISUAL_LAB_AUTHORIZED" and .executionProfile.phase=="LAB_RUNTIME_GATE" and .authorization.authorizationRef=="user_authorizes_single_readonly_gate711_after_static_passes_20260802T1215-0600" and .authorization.allowedExecutions==1 and .authorization.consumed==false and .staticReopenEvidence.run==30760809119 and .staticReopenEvidence.authorizationBinding.status=="GATE711_AUTHORIZATION_BINDING_STATIC_PASS" and .staticReopenEvidence.legalDeferredOrder.status=="GATE711_LEGAL_DEFERRED_ORDER_STATIC_PASS" and .staticReopenEvidence.preflight.status=="GO_GATE_CONTRACT" and .guards.firestoreDataWritesAllowed==false and .guards.operationalWritesAllowed==0 and .guards.reimportAllowed==false and .guards.hostingDeployAllowed==false and .guards.previewDeployAllowed==false and .guards.productionAllowed==false' "$LIFECYCLE_FILE" >/dev/null

  cp "$REQUEST_FILE" "$CANONICAL_REQUEST"
  cp "$LIFECYCLE_FILE" "$CANONICAL_LIFECYCLE"
  cmp -s "$REQUEST_FILE" "$CANONICAL_REQUEST"
  cmp -s "$LIFECYCLE_FILE" "$CANONICAL_LIFECYCLE"

  node --check tools/orbit360-validar-gate-contracts-v20260717.mjs
  node --check tools/orbit360-validar-gate-contracts-engine-canonical-runtime-cumulative-visual-lab-v20260801.mjs
  node --check tools/orbit360-preparar-identidad-browser-canonica-readonly-v20260801.mjs
  node --check tools/orbit360-validar-canonical-runtime-cumulative-visual-lab-v20260801.mjs
  node --check tools/orbit360-validar-legal-deferred-order-gate711-v20260802.mjs
  node --check tools/orbit360-validar-authorization-binding-gate711-v20260802.mjs

  node tools/orbit360-validar-authorization-binding-gate711-v20260802.mjs
  jq -e '.ok==true and .status=="GATE711_AUTHORIZATION_BINDING_STATIC_PASS" and .failed==0 and .secretAccess==false and .firestoreRead==false and .firestoreWrites==0 and .operationalWrites==0 and .runtimeExecuted==false and .browserExecuted==false' "$EVIDENCE_DIR/gate711-authorization-binding-static-v20260802.json" >/dev/null

  node tools/orbit360-validar-gate-contracts-v20260717.mjs "$GATE_ID"
  jq -e '.status=="GO_GATE_CONTRACT" and .classification=="CANONICAL_RUNTIME_CUMULATIVE_VISUAL_LAB_READY" and .executionAuthorized==true and .secretAccessAuthorized==true and .firestoreReadAuthorized==true and .writeAuthorized==false and .runtimeAuthorized==true and .browserAuthorized==true and .previewAuthorized==false and .deployAuthorized==false and .productionAuthorized==false and .failed==0 and .operationalWrites==0 and .authorizationBinding.lifecycleRefPresent==true and .authorizationBinding.requestMatchesLifecycle==true' "$EVIDENCE_DIR/preflight-sanitizado.json" >/dev/null

  node tools/orbit360-validar-legal-deferred-order-gate711-v20260802.mjs
  jq -e '.ok==true and .status=="GATE711_LEGAL_DEFERRED_ORDER_STATIC_PASS" and .failed==0 and .productFilesChanged==0 and .dataFilesChanged==0 and .firestoreReads==0 and .firestoreWrites==0 and .operationalWrites==0 and .runtimeExecuted==false and .browserExecuted==false' "$EVIDENCE_DIR/gate711-legal-deferred-order-static-v20260802.json" >/dev/null
  echo 'ORBIT360_GATE711_PREFLIGHT_PASS'
}

runtime() {
  jq -e '.status=="GO_GATE_CONTRACT" and .failed==0 and .writeAuthorized==false and .deployAuthorized==false and .productionAuthorized==false' "$EVIDENCE_DIR/preflight-sanitizado.json" >/dev/null
  local service_account="${SA_ORBIT360_LAB:-${SA_ORBIT_360_LAB:-${SA_DEFAULT:-}}}"
  test -n "$service_account"

  local key_file="$RUNNER_TEMP/orbit360-canonical-runtime-service-account.json"
  local token_file="$RUNNER_TEMP/orbit360-canonical-browser-token.txt"
  local config_file="$ROOT/orbit360-platform/core/auth-firebase.config.local.js"
  local server_pid=''
  cleanup() {
    if [ -n "$server_pid" ]; then kill "$server_pid" 2>/dev/null || true; fi
    if [ -f "$key_file" ]; then shred -u "$key_file" || rm -f "$key_file"; fi
    if [ -f "$token_file" ]; then shred -u "$token_file" || rm -f "$token_file"; fi
    rm -f "$config_file"
  }
  trap cleanup EXIT

  printf '%s' "$service_account" > "$key_file"
  chmod 600 "$key_file"
  test "$(jq -r '.project_id // empty' "$key_file")" = 'ays-orbit-360-lab'
  export GOOGLE_APPLICATION_CREDENTIALS="$key_file"
  export ORBIT360_PRODUCT_PROJECT_ID='ays-orbit-360-lab'
  export ORBIT360_PRODUCT_TENANT_ID='alianzas-soluciones'
  export ORBIT360_CUSTOM_TOKEN_FILE="$token_file"
  export ORBIT360_LOCAL_FIREBASE_CONFIG_FILE="$config_file"

  node tools/orbit360-preparar-identidad-browser-canonica-readonly-v20260801.mjs
  jq -e '.ok==true and .status=="CANONICAL_BROWSER_EXISTING_IDENTITY_READY" and .classification=="GO_LAB_EXISTING_IDENTITY_READONLY" and .eligibleExistingIdentityCount==1 and .uidMatched==true and .emailMatched==true and .customTokenCreatedEphemeral==true and .authWrites==0 and .firestoreWrites==0 and .operationalWrites==0 and .containsPII==false and .containsSecrets==false' "$EVIDENCE_DIR/canonical-browser-identity-readonly-v20260801.json" >/dev/null
  test -s "$token_file"
  test -s "$config_file"

  node tools/orbit360-revalidar-policies-full-canonical-readonly-v20260801.mjs
  jq -e --arg digest "$DIGEST" '.ok==true and .status=="POLICIES_FULL_CANONICAL_REVALIDATION_READONLY_PASS" and .digests.canonicalDigestSealed==$digest and .firestoreWrites==0 and .operationalWrites==0' "$EVIDENCE_DIR/policies-full-canonical-revalidation-readonly-v20260801.json" >/dev/null
  cp "$EVIDENCE_DIR/policies-full-canonical-revalidation-readonly-v20260801.json" "$EVIDENCE_DIR/canonical-runtime-before-v20260801.json"

  python3 -m http.server 4173 --directory orbit360-platform >"$RUNNER_TEMP/orbit360-http.log" 2>&1 &
  server_pid=$!
  for _ in $(seq 1 40); do
    if curl -fsS 'http://127.0.0.1:4173/index.html' >/dev/null; then break; fi
    sleep 0.25
  done
  curl -fsS 'http://127.0.0.1:4173/index.html' >/dev/null
  export ORBIT360_BASE_URL='http://127.0.0.1:4173/index.html?orbitBackend=firestore-lab&tenant=alianzas-soluciones#/inicio'

  node tools/orbit360-validar-canonical-runtime-cumulative-visual-lab-v20260801.mjs
  jq -e '.ok==true and .status=="CANONICAL_RUNTIME_CUMULATIVE_VISUAL_LAB_PASS" and .classification=="GO_LAB_CANONICAL_RUNTIME_CUMULATIVE_VISUAL" and .authMode=="existing_custom_token_readonly" and .checks.existingIdentity==true and .checks.legalOneClick==true and .checks.legalSettledBeforeWriteGuard==true and .checks.storeContract==true and .checks.dataset==true and .checks.seedExclusion==true and .checks.validationPreserved==true and .checks.bridgeOwner==true and .checks.roles==true and .checks.responsive==true and .checks.routes==true and .checks.noTechnicalCopy==true and .checks.writeGuard==true and .checks.sanitizedScreenshots==true and .dataset.operational.clientes==430 and .dataset.operational.aseguradoras==30 and .dataset.operational.polizas==1373 and .dataset.operational.vehiculos==1032 and .dataset.operational.recibosEsperados==1294 and .dataset.operational.carteraPrimas==673 and .dataset.operational.cobros==5 and ((.store.apiMissing|length)==0) and .store.singleReadOwner==true and .store.canonicalReadModel==true and ((.writeGuard.calls|length)==0) and ((.browserDiagnostics.pageErrors|length)==0) and ((.screenshots|length)>=10) and .firestoreWrites==0 and .operationalWrites==0 and .reimportExecuted==false and .hostingDeploy==false and .previewDeploy==false and .production==false and .containsPII==false and .containsDocumentIds==false and .containsValues==false and .containsSecrets==false' "$EVIDENCE_DIR/canonical-runtime-cumulative-visual-lab-v20260801.json" >/dev/null

  node tools/orbit360-revalidar-policies-full-canonical-readonly-v20260801.mjs
  jq -e --arg digest "$DIGEST" '.ok==true and .status=="POLICIES_FULL_CANONICAL_REVALIDATION_READONLY_PASS" and .digests.canonicalDigestSealed==$digest and .firestoreWrites==0 and .operationalWrites==0' "$EVIDENCE_DIR/policies-full-canonical-revalidation-readonly-v20260801.json" >/dev/null
  cp "$EVIDENCE_DIR/policies-full-canonical-revalidation-readonly-v20260801.json" "$EVIDENCE_DIR/canonical-runtime-after-v20260801.json"
  test "$(jq -r '.digests.sourceSnapshotDigest' "$EVIDENCE_DIR/canonical-runtime-before-v20260801.json")" = "$(jq -r '.digests.sourceSnapshotDigest' "$EVIDENCE_DIR/canonical-runtime-after-v20260801.json")"
  test "$(jq -r '.digests.targetSnapshotDigest' "$EVIDENCE_DIR/canonical-runtime-before-v20260801.json")" = "$(jq -r '.digests.targetSnapshotDigest' "$EVIDENCE_DIR/canonical-runtime-after-v20260801.json")"
  test "$(jq -r '.digests.targetSnapshotDigest' "$EVIDENCE_DIR/canonical-runtime-after-v20260801.json")" = "$DIGEST"
  echo 'ORBIT360_GATE711_RUNTIME_PASS'
}

case "$MODE" in
  preflight) preflight ;;
  runtime) runtime ;;
  *) echo 'usage: orbit360-run-gate711-reopen-readonly-v20260802.sh preflight|runtime' >&2; exit 64 ;;
esac
