#!/usr/bin/env bash
set -euo pipefail
# STAGE: Mandatory Macro-2 durable pipeline preflight
set -euo pipefail
test "$GITHUB_REF_NAME" = "$ORBIT360_BRANCH"
test "$GITHUB_RUN_ATTEMPT" = '1'
test "$GITHUB_EVENT_BEFORE" != ""
test "$GITHUB_EVENT_BEFORE" != "0000000000000000000000000000000000000000"
test "$(git rev-parse HEAD)" = "$GITHUB_SHA"
test "$(git rev-parse HEAD^)" = "$GITHUB_EVENT_BEFORE"
ORBIT360_MACRO2_REQUEST="$MACRO2_REQUEST" node tools/orbit360-macro2-pipeline-preflight-v20260821.mjs | tee "$RUNNER_TEMP/macro2-pipeline-preflight.json"
jq -e '.ok==true and .status=="MACRO2_PIPELINE_PREFLIGHT_PASS" and .stopRetryReopenValidated==true and .actionsRegistrationHandshakeValidated==true and .activationParentBindingValidated==true and .durableSourceBeforeArtifact==true and .durableArtifactMetadataBeforePromotion==true and .artifactDigestContractNormalized==true and .runtimeExecuted==false and .browserExecuted==false and .secretAccess==false and .firestoreRead==false and .writes==0 and .deployExecuted==false and .productionTouched==false' "$RUNNER_TEMP/macro2-pipeline-preflight.json" >/dev/null
PRODUCT_PATCH="$RUNNER_TEMP/macro2-product.patch"
TOOLS_PATCH="$RUNNER_TEMP/macro2-tools.patch"
DOCS_PATCH="$RUNNER_TEMP/macro2-docs.patch"
gzip -dc "$(jq -r '.patchSets[]|select(.name=="product")|.gzipPath' "$MACRO2_REQUEST")" > "$PRODUCT_PATCH"
gzip -dc "$(jq -r '.patchSets[]|select(.name=="tools")|.gzipPath' "$MACRO2_REQUEST")" > "$TOOLS_PATCH"
gzip -dc "$(jq -r '.patchSets[]|select(.name=="docs")|.gzipPath' "$MACRO2_REQUEST")" > "$DOCS_PATCH"
git apply --check "$PRODUCT_PATCH"; git apply --check "$TOOLS_PATCH"; git apply --check "$DOCS_PATCH"
echo "PRODUCT_PATCH=$PRODUCT_PATCH" >> "$GITHUB_ENV"
echo "TOOLS_PATCH=$TOOLS_PATCH" >> "$GITHUB_ENV"
echo "DOCS_PATCH=$DOCS_PATCH" >> "$GITHUB_ENV"
echo "START_HEAD=$(git rev-parse HEAD)" >> "$GITHUB_ENV"

# STAGE: Apply exact source-only patches
set -euo pipefail
git apply "$PRODUCT_PATCH"
git apply "$TOOLS_PATCH"
git apply "$DOCS_PATCH"
mapfile -t DELTA < <(git diff --name-only | sort)
cat > "$RUNNER_TEMP/expected-paths.txt" <<'EOF'
orbit360-platform/core/ciclo.js
orbit360-platform/core/client-canonical-view-projection-v20260716.js
orbit360-platform/core/queries.js
orbit360-platform/core/ui.js
orbit360-platform/data/store-firestore-product-readonly-p0.js
orbit360-platform/docs/ACADEMIA-ACTUALIZACION-MACRO2-READMODEL-SEGURO-Y-PERFORMANCE-20260821.md
orbit360-platform/docs/CLAUDE-ACUMULADO-MACRO2-READMODEL-SEGURO-20260821.md
orbit360-platform/modules/aseguradoras.js
orbit360-platform/modules/cliente360.js
orbit360-platform/modules/cobros.js
orbit360-platform/modules/inicio.js
tools/orbit360-build-macro2-transversal-successor-v20260821.mjs
tools/orbit360-documentation-state-discovery-v20260821.mjs
tools/orbit360-promote-macro2-transversal-candidate-v20260821.mjs
tools/orbit360-test-macro2-transversal-source-acceptance-v20260821.mjs
EOF
sed -i 's/^          //' "$RUNNER_TEMP/expected-paths.txt"
diff -u "$RUNNER_TEMP/expected-paths.txt" <(printf '%s\n' "${DELTA[@]}")
node --check tools/orbit360-build-macro2-transversal-successor-v20260821.mjs
node --check tools/orbit360-promote-macro2-transversal-candidate-v20260821.mjs
node --check tools/orbit360-test-macro2-transversal-source-acceptance-v20260821.mjs
node --check tools/orbit360-documentation-state-discovery-v20260821.mjs
for f in orbit360-platform/core/ui.js orbit360-platform/core/queries.js orbit360-platform/core/client-canonical-view-projection-v20260716.js orbit360-platform/core/ciclo.js orbit360-platform/data/store-firestore-product-readonly-p0.js orbit360-platform/modules/inicio.js orbit360-platform/modules/cliente360.js orbit360-platform/modules/aseguradoras.js orbit360-platform/modules/cobros.js; do node --check "$f"; done
git diff --check

# STAGE: Download exact predecessor artifact 9433944723
set -euo pipefail
OUTER="$RUNNER_TEMP/base-outer.zip"
OD="$RUNNER_TEMP/base-outer"
PRE="$RUNNER_TEMP/predecessor"
rm -rf "$OUTER" "$OD" "$PRE"
mkdir -p "$OD" "$PRE"
curl -L --fail --retry 3 -H "Authorization: Bearer $GH_TOKEN" -H 'Accept: application/vnd.github+json' -H 'X-GitHub-Api-Version: 2022-11-28' "https://api.github.com/repos/${GITHUB_REPOSITORY}/actions/artifacts/${BASE_ARTIFACT_ID}/zip" -o "$OUTER"
unzip -q "$OUTER" -d "$OD"
mapfile -t FILES < <(find "$OD" -maxdepth 1 -type f -printf '%f\n' | sort)
test "${#FILES[@]}" = '1'
INNER="$OD/${FILES[0]}"
test "$(sha256sum "$INNER" | awk '{print $1}')" = "$BASE_ZIP_SHA256"
unzip -q "$INNER" -d "$PRE"
test "$(sha256sum "$PRE/orbit360-package-manifest.json" | awk '{print $1}')" = "$BASE_MANIFEST_SHA256"
test "$(jq -r '.sourceHead' "$PRE/orbit360-package-manifest.json")" = "$BASE_SOURCE_HEAD"
cp "$PRE/orbit360-package-manifest.json" "$RUNNER_TEMP/base-manifest.json"
echo "MACRO2_PRE=$PRE" >> "$GITHUB_ENV"
echo "MACRO2_BASE_MANIFEST=$RUNNER_TEMP/base-manifest.json" >> "$GITHUB_ENV"

# STAGE: Source acceptance before source commit
set -euo pipefail
ORBIT360_MACRO2_CANDIDATE_DIR="$GITHUB_WORKSPACE/orbit360-platform" ORBIT360_MACRO2_BASE_MANIFEST="$MACRO2_BASE_MANIFEST" node tools/orbit360-test-macro2-transversal-source-acceptance-v20260821.mjs > "$RUNNER_TEMP/macro2-source-acceptance-precommit.json"
jq -e '.ok==true and .status=="TRANSVERSAL_SOURCE_ACCEPTANCE_PASS" and .checksPassed==107 and .checksTotal==107 and .performance.clients==414 and .performance.allPolizas==1 and .performance.wherePolizas==0' "$RUNNER_TEMP/macro2-source-acceptance-precommit.json" >/dev/null

# STAGE: Create immutable local source commit
set -euo pipefail
git config user.name 'orbit360-control-plane'
git config user.email 'orbit360-control-plane@users.noreply.github.com'
git add -- orbit360-platform/core/ui.js orbit360-platform/core/queries.js orbit360-platform/core/client-canonical-view-projection-v20260716.js orbit360-platform/core/ciclo.js orbit360-platform/data/store-firestore-product-readonly-p0.js orbit360-platform/modules/inicio.js orbit360-platform/modules/cliente360.js orbit360-platform/modules/aseguradoras.js orbit360-platform/modules/cobros.js orbit360-platform/docs/ACADEMIA-ACTUALIZACION-MACRO2-READMODEL-SEGURO-Y-PERFORMANCE-20260821.md orbit360-platform/docs/CLAUDE-ACUMULADO-MACRO2-READMODEL-SEGURO-20260821.md tools/orbit360-build-macro2-transversal-successor-v20260821.mjs tools/orbit360-promote-macro2-transversal-candidate-v20260821.mjs tools/orbit360-test-macro2-transversal-source-acceptance-v20260821.mjs tools/orbit360-documentation-state-discovery-v20260821.mjs
git diff --cached --check
git commit -m 'fix(macro2): transversal safe read-model source acceptance'
echo "SOURCE_HEAD=$(git rev-parse HEAD)" >> "$GITHUB_ENV"

# STAGE: Publish accepted source commit before candidate build
set -euo pipefail
# Restore owner to dispatch-only before the first push so this and later pushes cannot retrigger.
OWNER_SAFE_HEAD=$(jq -r '.ownerSafeHead' "$MACRO2_REQUEST")
test "$OWNER_SAFE_HEAD" != ""
git show "$OWNER_SAFE_HEAD:.github/workflows/orbit360-continuity-canonical-source-only-v20260820.yml" > .github/workflows/orbit360-continuity-canonical-source-only-v20260820.yml
git add -- .github/workflows/orbit360-continuity-canonical-source-only-v20260820.yml
git commit --amend --no-edit
SOURCE_HEAD=$(git rev-parse HEAD)
echo "SOURCE_HEAD=$SOURCE_HEAD" >> "$GITHUB_ENV"
git fetch origin "$ORBIT360_BRANCH"
test "$(git rev-parse origin/$ORBIT360_BRANCH)" = "$START_HEAD"
git push origin "HEAD:$ORBIT360_BRANCH"
echo "SOURCE_PUBLISHED_HEAD=$SOURCE_HEAD" >> "$GITHUB_ENV"

# STAGE: Build and revalidate single successor candidate
set -euo pipefail
OUT="$RUNNER_TEMP/macro2-successor"
ORBIT360_MACRO2_PREDECESSOR_DIR="$MACRO2_PRE" ORBIT360_MACRO2_SOURCE_ROOT="$GITHUB_WORKSPACE" ORBIT360_MACRO2_SUCCESSOR_DIR="$OUT" ORBIT360_MACRO2_SOURCE_HEAD="$SOURCE_HEAD" node tools/orbit360-build-macro2-transversal-successor-v20260821.mjs > "$RUNNER_TEMP/macro2-build.json"
jq -e '.ok==true and .status=="MACRO2_TRANSVERSAL_SUCCESSOR_BUILD_PASS" and .fileCount==194 and .deltaCount==9 and .unchangedFileCount==185 and .fullRehashPass==true and (.protectedTouched==["data/store-firestore-product-readonly-p0.js"])' "$RUNNER_TEMP/macro2-build.json" >/dev/null
ORBIT360_MACRO2_CANDIDATE_DIR="$OUT" ORBIT360_MACRO2_BASE_MANIFEST="$MACRO2_BASE_MANIFEST" node tools/orbit360-test-macro2-transversal-source-acceptance-v20260821.mjs > "$RUNNER_TEMP/macro2-source-acceptance-successor.json"
jq -e '.ok==true and .checksPassed==107 and .checksTotal==107 and .runtimeExecuted==false and .browserExecuted==false and .secretAccess==false and .firestoreRead==false and .firestoreWrites==0 and .authWrites==0 and .operationalWrites==0' "$RUNNER_TEMP/macro2-source-acceptance-successor.json" >/dev/null
cd "$OUT"
zip -qr "$RUNNER_TEMP/orbit360-macro2-transversal-${SOURCE_HEAD:0:12}.zip" .
cd - >/dev/null
echo "SUCCESSOR_DIR=$OUT" >> "$GITHUB_ENV"
echo "SUCCESSOR_ZIP=$RUNNER_TEMP/orbit360-macro2-transversal-${SOURCE_HEAD:0:12}.zip" >> "$GITHUB_ENV"
echo "SUCCESSOR_ZIP_SHA=$(sha256sum "$RUNNER_TEMP/orbit360-macro2-transversal-${SOURCE_HEAD:0:12}.zip" | awk '{print $1}')" >> "$GITHUB_ENV"
echo "SUCCESSOR_MANIFEST_SHA=$(sha256sum "$OUT/orbit360-package-manifest.json" | awk '{print $1}')" >> "$GITHUB_ENV"
