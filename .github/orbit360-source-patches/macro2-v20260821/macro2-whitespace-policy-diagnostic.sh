#!/usr/bin/env bash
set -euo pipefail

PRODUCT_GZ='.github/orbit360-source-patches/macro2-v20260821/product.patch.gz'
TOOLS_GZ='.github/orbit360-source-patches/macro2-v20260821/tools.patch.gz'
DOC_GZ='.github/orbit360-source-patches/macro2-v20260821/docs.patch.gz'
OUT_JSON="$RUNNER_TEMP/macro2-whitespace-policy.json"
PRODUCT_PATCH="$RUNNER_TEMP/product.patch"
TOOLS_PATCH="$RUNNER_TEMP/tools.patch"
DOC_PATCH="$RUNNER_TEMP/docs.patch"

gzip -dc "$PRODUCT_GZ" > "$PRODUCT_PATCH"
gzip -dc "$TOOLS_GZ" > "$TOOLS_PATCH"
gzip -dc "$DOC_GZ" > "$DOC_PATCH"

WS="$RUNNER_TEMP/ws-postpatch-hashes"
rm -rf "$WS"
git worktree add --detach "$WS" "$GITHUB_SHA" >/dev/null 2>&1
set +e
(cd "$WS" && git apply --whitespace=nowarn "$PRODUCT_PATCH") >"$RUNNER_TEMP/product.log" 2>&1
PRODUCT_RC=$?
(cd "$WS" && git apply --whitespace=nowarn "$TOOLS_PATCH") >"$RUNNER_TEMP/tools.log" 2>&1
TOOLS_RC=$?
(cd "$WS" && git apply --whitespace=nowarn "$DOC_PATCH") >"$RUNNER_TEMP/docs.log" 2>&1
DOCS_RC=$?
set -e

node - "$WS" "$OUT_JSON" "$PRODUCT_RC" "$TOOLS_RC" "$DOCS_RC" <<'NODE'
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const [root,outPath,productRc,toolsRc,docsRc]=process.argv.slice(2);
const productPaths=[
  'core/ciclo.js',
  'core/client-canonical-view-projection-v20260716.js',
  'core/queries.js',
  'core/ui.js',
  'data/store-firestore-product-readonly-p0.js',
  'modules/aseguradoras.js',
  'modules/cliente360.js',
  'modules/cobros.js',
  'modules/inicio.js'
];
const sha256=b=>crypto.createHash('sha256').update(b).digest('hex');
const gitBlob=b=>crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${b.length}\0`),b])).digest('hex');
const hashes=productPaths.map(p=>{
  const full=path.join(root,'orbit360-platform',p);
  const b=fs.readFileSync(full);
  return {path:p,sha256:sha256(b),gitBlobSha:gitBlob(b),bytes:b.length};
});
const validatorPath=path.join(root,'tools/orbit360-test-macro2-transversal-source-acceptance-v20260821.mjs');
let primitives=[];
if(fs.existsSync(validatorPath)){
  const lines=fs.readFileSync(validatorPath,'utf8').split(/\n/);
  const patterns=[/CANDIDATE/,/\brel\s*=/,/\bexists\s*=/,/\bsha\s*=/,/ALLOWED_DELTAS/,/DELTA_EXACTLY_ALLOWED_TRANSVERSAL_SET/];
  primitives=lines.map((text,i)=>({line:i+1,text})).filter(x=>patterns.some(r=>r.test(x.text)));
}
const combined=require('child_process').execFileSync('bash',['-lc',`cd ${JSON.stringify(root)} && { git diff --name-only; git ls-files --others --exclude-standard; } | sed '/^$/d' | sort -u`],{encoding:'utf8'}).trim().split(/\n/).filter(Boolean);
const result={
  schemaVersion:'orbit360-macro2-postpatch-hash-forensic-v1',
  status:'POSTPATCH_HASH_FORENSIC_COMPLETE',
  classification:'PIPELINE_MECHANISM_DIAGNOSTIC',
  allPatchApply:{productRc:Number(productRc),toolsRc:Number(toolsRc),docsRc:Number(docsRc)},
  combinedSourceDeltaCount:combined.length,
  combinedSourceDeltaFiles:combined,
  postPatchProductHashes:hashes,
  validatorPrimitives:primitives,
  sourceOnly:true,productCommitted:false,candidatePublished:false,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,writes:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false
};
fs.writeFileSync(outPath,JSON.stringify(result,null,2)+'\n');
NODE

git worktree remove --force "$WS" >/dev/null 2>&1 || true
cat "$OUT_JSON"
