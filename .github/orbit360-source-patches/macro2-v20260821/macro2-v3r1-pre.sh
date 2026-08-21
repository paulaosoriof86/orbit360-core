#!/usr/bin/env bash
set -euo pipefail

source_aware_diff_check(){
  local mode="${1:-worktree}"
  local -a md=()
  if [ "$mode" = 'staged' ]; then
    git diff --cached --check -- . ':(exclude,glob)**/*.md'
    mapfile -t md < <(git diff --cached --name-only -- ':(glob)**/*.md')
  else
    git diff --check -- . ':(exclude,glob)**/*.md'
    mapfile -t md < <(git diff --name-only -- ':(glob)**/*.md')
  fi
  if ((${#md[@]})); then
    node - "${md[@]}" <<'NODE'
const fs=require('fs');
const bad=[];
for(const f of process.argv.slice(2)){
  if(!fs.existsSync(f)) continue;
  const lines=fs.readFileSync(f,'utf8').split(/\n/);
  lines.forEach((line,i)=>{
    const m=line.match(/[ \t]+$/);
    if(m && m[0] !== '  ') bad.push(`${f}:${i+1}:${JSON.stringify(m[0])}`);
  });
}
if(bad.length){console.error('MARKDOWN_TRAILING_WHITESPACE_INVALID\n'+bad.join('\n'));process.exit(41);}
NODE
  fi
}

# STAGE: Mandatory Macro-2 durable pipeline preflight
set -euo pipefail
test "$GITHUB_REF_NAME" = "$ORBIT360_BRANCH"
test "$GITHUB_RUN_ATTEMPT" = '1'
test "$ORBIT360_EVENT_BEFORE" != ""
test "$ORBIT360_EVENT_BEFORE" != "0000000000000000000000000000000000000000"
test "$(git rev-parse HEAD)" = "$GITHUB_SHA"
test "$(git rev-parse HEAD^)" = "$ORBIT360_EVENT_BEFORE"
ORBIT360_MACRO2_REQUEST="$MACRO2_REQUEST" node tools/orbit360-macro2-pipeline-preflight-v20260821.mjs | tee "$RUNNER_TEMP/macro2-pipeline-preflight.json"
jq -e '.ok==true and .status=="MACRO2_PIPELINE_PREFLIGHT_PASS" and .stopRetryReopenValidated==true and .actionsRegistrationHandshakeValidated==true and .activationParentBindingValidated==true and .durableSourceBeforeArtifact==true and .durableArtifactMetadataBeforePromotion==true and .artifactDigestContractNormalized==true and .runtimeExecuted==false and .browserExecuted==false and .secretAccess==false and .firestoreRead==false and .writes==0 and .deployExecuted==false and .productionTouched==false' "$RUNNER_TEMP/macro2-pipeline-preflight.json" >/dev/null
PRODUCT_PATCH="$RUNNER_TEMP/macro2-product.patch"
TOOLS_PATCH="$RUNNER_TEMP/macro2-tools.patch"
DOCS_PATCH="$RUNNER_TEMP/macro2-docs.patch"
gzip -dc "$(jq -r '.patchSets[]|select(.name=="product")|.gzipPath' "$MACRO2_REQUEST")" > "$PRODUCT_PATCH"
gzip -dc "$(jq -r '.patchSets[]|select(.name=="tools")|.gzipPath' "$MACRO2_REQUEST")" > "$TOOLS_PATCH"
gzip -dc "$(jq -r '.patchSets[]|select(.name=="docs")|.gzipPath' "$MACRO2_REQUEST")" > "$DOCS_PATCH"
git apply --check "$PRODUCT_PATCH"
git apply --check "$TOOLS_PATCH"
git apply --check "$DOCS_PATCH"
echo "PRODUCT_PATCH=$PRODUCT_PATCH" >> "$GITHUB_ENV"
echo "TOOLS_PATCH=$TOOLS_PATCH" >> "$GITHUB_ENV"
echo "DOCS_PATCH=$DOCS_PATCH" >> "$GITHUB_ENV"
START_HEAD=$(git rev-parse HEAD)
echo "START_HEAD=$START_HEAD" >> "$GITHUB_ENV"

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
diff -u "$RUNNER_TEMP/expected-paths.txt" <(printf '%s\n' "${DELTA[@]}")
node --check tools/orbit360-build-macro2-transversal-successor-v20260821.mjs
node --check tools/orbit360-promote-macro2-transversal-candidate-v20260821.mjs
node --check tools/orbit360-test-macro2-transversal-source-acceptance-v20260821.mjs
node --check tools/orbit360-documentation-state-discovery-v20260821.mjs
for f in orbit360-platform/core/ui.js orbit360-platform/core/queries.js orbit360-platform/core/client-canonical-view-projection-v20260716.js orbit360-platform/core/ciclo.js orbit360-platform/data/store-firestore-product-readonly-p0.js orbit360-platform/modules/inicio.js orbit360-platform/modules/cliente360.js orbit360-platform/modules/aseguradoras.js orbit360-platform/modules/cobros.js; do node --check "$f"; done
source_aware_diff_check worktree

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
MACRO2_PRE="$PRE"
MACRO2_BASE_MANIFEST="$RUNNER_TEMP/base-manifest.json"
cp "$PRE/orbit360-package-manifest.json" "$MACRO2_BASE_MANIFEST"
echo "MACRO2_PRE=$MACRO2_PRE" >> "$GITHUB_ENV"
echo "MACRO2_BASE_MANIFEST=$MACRO2_BASE_MANIFEST" >> "$GITHUB_ENV"

# STAGE: Source acceptance before source commit
set -euo pipefail
ORBIT360_MACRO2_CANDIDATE_DIR="$GITHUB_WORKSPACE/orbit360-platform" ORBIT360_MACRO2_BASE_MANIFEST="$MACRO2_BASE_MANIFEST" node tools/orbit360-test-macro2-transversal-source-acceptance-v20260821.mjs > "$RUNNER_TEMP/macro2-source-acceptance-precommit.json"
jq -e '.ok==true and .status=="TRANSVERSAL_SOURCE_ACCEPTANCE_PASS" and .checksPassed==107 and .checksTotal==107 and .performance.clients==414 and .performance.allPolizas==1 and .performance.wherePolizas==0' "$RUNNER_TEMP/macro2-source-acceptance-precommit.json" >/dev/null

# STAGE: Create immutable local source commit
set -euo pipefail
git config user.name 'orbit360-control-plane'
git config user.email 'orbit360-control-plane@users.noreply.github.com'
git add -- orbit360-platform/core/ui.js orbit360-platform/core/queries.js orbit360-platform/core/client-canonical-view-projection-v20260716.js orbit360-platform/core/ciclo.js orbit360-platform/data/store-firestore-product-readonly-p0.js orbit360-platform/modules/inicio.js orbit360-platform/modules/cliente360.js orbit360-platform/modules/aseguradoras.js orbit360-platform/modules/cobros.js orbit360-platform/docs/ACADEMIA-ACTUALIZACION-MACRO2-READMODEL-SEGURO-Y-PERFORMANCE-20260821.md orbit360-platform/docs/CLAUDE-ACUMULADO-MACRO2-READMODEL-SEGURO-20260821.md tools/orbit360-build-macro2-transversal-successor-v20260821.mjs tools/orbit360-promote-macro2-transversal-candidate-v20260821.mjs tools/orbit360-test-macro2-transversal-source-acceptance-v20260821.mjs tools/orbit360-documentation-state-discovery-v20260821.mjs
source_aware_diff_check staged
git commit -m 'fix(macro2): transversal safe read-model source acceptance'
SOURCE_HEAD=$(git rev-parse HEAD)
echo "SOURCE_HEAD=$SOURCE_HEAD" >> "$GITHUB_ENV"

# STAGE: Publish accepted source commit before candidate build
set -euo pipefail
OWNER_SAFE_HEAD=$(jq -r '.ownerSafeHead' "$MACRO2_REQUEST")
test "$OWNER_SAFE_HEAD" != ""
# Permanent canonical listener remains registered; source push does not touch workflow path and cannot retrigger.
SOURCE_HEAD=$(git rev-parse HEAD)
echo "SOURCE_HEAD=$SOURCE_HEAD" >> "$GITHUB_ENV"
git fetch origin "$ORBIT360_BRANCH"
test "$(git rev-parse origin/$ORBIT360_BRANCH)" = "$START_HEAD"
git push origin "HEAD:$ORBIT360_BRANCH"
SOURCE_PUBLISHED_HEAD="$SOURCE_HEAD"
echo "SOURCE_PUBLISHED_HEAD=$SOURCE_PUBLISHED_HEAD" >> "$GITHUB_ENV"

# STAGE: Build and revalidate single successor candidate
set -euo pipefail
OUT="$RUNNER_TEMP/macro2-successor"
ORBIT360_MACRO2_PREDECESSOR_DIR="$MACRO2_PRE" ORBIT360_MACRO2_SOURCE_ROOT="$GITHUB_WORKSPACE" ORBIT360_MACRO2_SUCCESSOR_DIR="$OUT" ORBIT360_MACRO2_SOURCE_HEAD="$SOURCE_HEAD" node tools/orbit360-build-macro2-transversal-successor-v20260821.mjs > "$RUNNER_TEMP/macro2-build.json"
jq -e '.ok==true and .status=="MACRO2_TRANSVERSAL_SUCCESSOR_BUILD_PASS" and .fileCount==194 and .deltaCount==9 and .unchangedFileCount==185 and .fullRehashPass==true and (.protectedTouched==["data/store-firestore-product-readonly-p0.js"])' "$RUNNER_TEMP/macro2-build.json" >/dev/null
ORBIT360_MACRO2_CANDIDATE_DIR="$OUT" ORBIT360_MACRO2_BASE_MANIFEST="$MACRO2_BASE_MANIFEST" node tools/orbit360-test-macro2-transversal-source-acceptance-v20260821.mjs > "$RUNNER_TEMP/macro2-source-acceptance-successor.json"
jq -e '.ok==true and .checksPassed==107 and .checksTotal==107 and .runtimeExecuted==false and .browserExecuted==false and .secretAccess==false and .firestoreRead==false and .firestoreWrites==0 and .authWrites==0 and .operationalWrites==0' "$RUNNER_TEMP/macro2-source-acceptance-successor.json" >/dev/null
SUCCESSOR_DIR="$OUT"
SUCCESSOR_ZIP="$RUNNER_TEMP/orbit360-macro2-transversal-${SOURCE_HEAD:0:12}.zip"
cd "$OUT"
zip -qr "$SUCCESSOR_ZIP" .
cd - >/dev/null
SUCCESSOR_ZIP_SHA=$(sha256sum "$SUCCESSOR_ZIP" | awk '{print $1}')
SUCCESSOR_MANIFEST_SHA=$(sha256sum "$OUT/orbit360-package-manifest.json" | awk '{print $1}')
echo "SUCCESSOR_DIR=$SUCCESSOR_DIR" >> "$GITHUB_ENV"
echo "SUCCESSOR_ZIP=$SUCCESSOR_ZIP" >> "$GITHUB_ENV"
echo "SUCCESSOR_ZIP_SHA=$SUCCESSOR_ZIP_SHA" >> "$GITHUB_ENV"
echo "SUCCESSOR_MANIFEST_SHA=$SUCCESSOR_MANIFEST_SHA" >> "$GITHUB_ENV"
