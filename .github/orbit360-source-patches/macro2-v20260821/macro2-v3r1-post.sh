#!/usr/bin/env bash
set -euo pipefail
export ORBIT360_MACRO2_ARTIFACT_ID="$ARTIFACT_ID"
export ORBIT360_MACRO2_ARTIFACT_DIGEST_RAW="$ARTIFACT_DIGEST_RAW"
export ORBIT360_MACRO2_SOURCE_HEAD="$SOURCE_HEAD"
export ORBIT360_MACRO2_ZIP_SHA256="$SUCCESSOR_ZIP_SHA"
export ORBIT360_MACRO2_MANIFEST_SHA256="$SUCCESSOR_MANIFEST_SHA"
export ORBIT360_MACRO2_RUN_ID="$GITHUB_RUN_ID"
# STAGE: Persist candidate artifact metadata before promotion
set -euo pipefail
test "$SOURCE_HEAD" = "$SOURCE_PUBLISHED_HEAD"
test "$ARTIFACT_ID" != ''
test "$ARTIFACT_DIGEST_RAW" != ''
case "$ARTIFACT_DIGEST_RAW" in
  sha256:*) ARTIFACT_DIGEST="$ARTIFACT_DIGEST_RAW" ;;
  *) ARTIFACT_DIGEST="sha256:$ARTIFACT_DIGEST_RAW" ;;
esac
NORMALIZED_ARTIFACT_DIGEST="$ARTIFACT_DIGEST"
META="orbit360-platform/runtime-gate-crm-v20260716/macro2-candidate-artifact-metadata-v20260821.json"
node - "$META" "$ARTIFACT_ID" "$ARTIFACT_DIGEST" "$SOURCE_PUBLISHED_HEAD" "$SUCCESSOR_ZIP_SHA" "$SUCCESSOR_MANIFEST_SHA" "$GITHUB_RUN_ID" <<'NODE'
const fs=require('fs'); const [p,id,digest,source,zip,manifest,run]=process.argv.slice(2);
const x={schemaVersion:'orbit360-macro2-candidate-artifact-metadata-v1',status:'CANDIDATE_ARTIFACT_PUBLISHED_SOURCE_ONLY',artifactId:Number(id),artifactDigest:digest,sourceHead:source,zipSha256:zip,manifestSha256:manifest,runId:Number(run),fileCount:194,deltaCount:9,unchangedFileCount:185,sourcePublished:true,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,writes:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
fs.mkdirSync(require('path').dirname(p),{recursive:true}); fs.writeFileSync(p,JSON.stringify(x,null,2)+'\n');
NODE
git add -- "$META"
git commit -m 'gate(macro2): persist candidate artifact metadata before promotion'
CANDIDATE_METADATA_HEAD=$(git rev-parse HEAD)
git fetch origin "$ORBIT360_BRANCH"
test "$(git rev-parse origin/$ORBIT360_BRANCH)" = "$SOURCE_PUBLISHED_HEAD"
git push origin "HEAD:$ORBIT360_BRANCH"
echo "CANDIDATE_METADATA_HEAD=$CANDIDATE_METADATA_HEAD" >> "$GITHUB_ENV"
echo "NORMALIZED_ARTIFACT_DIGEST=$NORMALIZED_ARTIFACT_DIGEST" >> "$GITHUB_ENV"

# STAGE: Promote candidate and prepare inert fresh authorization boundary
set -euo pipefail
test "$SOURCE_HEAD" = "$SOURCE_PUBLISHED_HEAD"
test "$(git ls-remote origin refs/heads/$ORBIT360_BRANCH | cut -f1)" = "$CANDIDATE_METADATA_HEAD"
test "$NORMALIZED_ARTIFACT_DIGEST" != ''
export ORBIT360_MACRO2_ARTIFACT_DIGEST="$NORMALIZED_ARTIFACT_DIGEST"
sed -i "s#request:'.github/orbit360-requests/macro2-transversal-source-apply-v20260821.json'#request:'$MACRO2_REQUEST'#" tools/orbit360-promote-macro2-transversal-candidate-v20260821.mjs
node tools/orbit360-promote-macro2-transversal-candidate-v20260821.mjs > "$RUNNER_TEMP/macro2-promotion.json"
jq -e '.ok==true and .status=="MACRO2_CANDIDATE_PROMOTION_SOURCE_ONLY_PASS" and .progress==75 and .authorized==false and .requestMaterialized==false and .runtimeAllowed==false' "$RUNNER_TEMP/macro2-promotion.json" >/dev/null
node tools/orbit360-continuity-projection-atomic-v20260820.mjs --expected-revision 30 > "$RUNNER_TEMP/macro2-projection.json"
node tools/orbit360-control-plane-composite-invariant-v20260820.mjs > "$RUNNER_TEMP/macro2-composite.json"
node tools/orbit360-control-plane-independent-readback-v20260820.mjs > "$RUNNER_TEMP/macro2-readback.json"
node tools/orbit360-workflow-operational-surface-audit-v20260820.mjs > "$RUNNER_TEMP/macro2-writer-audit.json"
node tools/orbit360-documentation-state-discovery-v20260821.mjs > "$RUNNER_TEMP/macro2-doc-discovery.json"
jq -e '.ok==true' "$RUNNER_TEMP/macro2-composite.json" >/dev/null
jq -e '.ok==true and .productionRouteProgressPct==75' "$RUNNER_TEMP/macro2-readback.json" >/dev/null
jq -e '.ok==true and .unauthorizedControlWorkflows==0' "$RUNNER_TEMP/macro2-writer-audit.json" >/dev/null
jq -e '.ok==true and (.offenders|length)==0' "$RUNNER_TEMP/macro2-doc-discovery.json" >/dev/null
node - <<'NODE'
const crypto=require('crypto');const B=require('./orbit360-platform/docs/orbit360-f2-runtime-authorization-boundary-v20260820.json');const m={gateId:B.gate.id,gateContractVersion:B.gate.contractVersion,candidateArtifactId:B.candidate.artifactId,candidateArtifactDigest:B.candidate.artifactDigest,candidateSourceHead:B.candidate.sourceHead,ledgerRevision:B.controlPlane.ledgerRevision,packageRevision:B.controlPlane.packageRevision,executionProfile:B.requestedExecutionProfile};const d=crypto.createHash('sha256').update(JSON.stringify(m)).digest('hex');if(d!==B.authorizationIdentity.digest||B.authorized||B.authorizationPersisted||B.requestMaterialized||B.runtimeAllowed)process.exit(41);console.log(JSON.stringify({ok:true,status:'MACRO2_AUTH_IDENTITY_PREPARED_INERT_PASS',digest:d}));
NODE
git checkout -- tools/orbit360-promote-macro2-transversal-candidate-v20260821.mjs
git diff --check

# STAGE: Create promotion commit and final remote CAS
set -euo pipefail
git add -- "$MACRO2_REQUEST" orbit360-platform/docs orbit360-platform/runtime-gate-crm-v20260716 tools/orbit360-gate-contract-f2-productive-acceptance-v20260820.json tools/orbit360-validator-lifecycle-contract-f2-productive-acceptance-source-v20260819.json tools/orbit360-validator-lifecycle-contract-f2-productive-acceptance-runtime-v20260819.json README.md orbit360-platform/CHANGELOG.md
git diff --cached --check
git commit -m 'gate(macro2): promote transversal source candidate and prepare fresh auth'
FINAL_HEAD=$(git rev-parse HEAD)
git fetch origin "$ORBIT360_BRANCH"
test "$(git rev-parse origin/$ORBIT360_BRANCH)" = "$CANDIDATE_METADATA_HEAD"
git push origin "HEAD:$ORBIT360_BRANCH"
echo "FINAL_HEAD=$FINAL_HEAD" >> "$GITHUB_ENV"
