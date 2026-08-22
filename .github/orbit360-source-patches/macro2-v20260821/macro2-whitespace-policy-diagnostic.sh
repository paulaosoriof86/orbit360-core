#!/usr/bin/env bash
set -euo pipefail

BASE_INDEX='.github/orbit360-source-patches/macro2-v20260821/predecessor-hash-index-9433944723.json'
PRODUCT_GZ='.github/orbit360-source-patches/macro2-v20260821/product.patch.gz'
TOOLS_GZ='.github/orbit360-source-patches/macro2-v20260821/tools.patch.gz'
DOC_GZ='.github/orbit360-source-patches/macro2-v20260821/docs.patch.gz'
OUT_JSON="$RUNNER_TEMP/macro2-whitespace-policy.json"
PRODUCT_PATCH="$RUNNER_TEMP/product.patch"
TOOLS_PATCH="$RUNNER_TEMP/tools.patch"
DOC_PATCH="$RUNNER_TEMP/docs.patch"

test -f "$BASE_INDEX"
jq -e '.schemaVersion=="orbit360-predecessor-file-hash-index-v1" and .status=="VERIFIED_PREDECESSOR_HASH_INDEX" and .artifactId==9433944723 and .sourceHead=="c3bb825da2b1ecae08dabc2034c753482b086fec" and .zipSha256=="1951cc7c2d3390ea1c2a6b3d9ce0bb48e26a6f95d5d10d69b7c31a0027cfbbac" and .manifestSha256=="580921077a88badab6e4076c42e9ef88f9de7936e1b6bad0f62410b39aec6397" and .fileCount==194 and (.files|length)==194 and .verification.fullRehashPass==true and .verification.missingFiles==0 and .verification.hashMismatches==0 and .containsPII==false and .containsSecrets==false' "$BASE_INDEX" >/dev/null

gzip -dc "$PRODUCT_GZ" > "$PRODUCT_PATCH"
gzip -dc "$TOOLS_GZ" > "$TOOLS_PATCH"
gzip -dc "$DOC_GZ" > "$DOC_PATCH"

WS="$RUNNER_TEMP/ws-exact-manifest-delta"
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

node - "$WS" "$BASE_INDEX" "$OUT_JSON" "$PRODUCT_RC" "$TOOLS_RC" "$DOCS_RC" <<'NODE'
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const [root,indexPath,outPath,productRc,toolsRc,docsRc]=process.argv.slice(2);
const baseline=JSON.parse(fs.readFileSync(indexPath,'utf8'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const candidate=path.join(root,'orbit360-platform');
const actual=[];
const missing=[];
const comparisons=[];
for(const f of baseline.files){
  const full=path.join(candidate,f.path);
  if(!fs.existsSync(full)){
    missing.push(f.path);
    comparisons.push({path:f.path,exists:false,baselineSha256:f.sha256,currentSha256:null,delta:false});
    continue;
  }
  const current=sha(fs.readFileSync(full));
  const delta=current!==f.sha256;
  if(delta) actual.push(f.path);
  comparisons.push({path:f.path,exists:true,baselineSha256:f.sha256,currentSha256:current,delta});
}
actual.sort();
const validatorPath=path.join(root,'tools/orbit360-test-macro2-transversal-source-acceptance-v20260821.mjs');
let allowed=[];
let declarationFound=false;
let sortApplied=false;
if(fs.existsSync(validatorPath)){
  const src=fs.readFileSync(validatorPath,'utf8');
  const marker=src.indexOf('const ALLOWED_DELTAS');
  if(marker>=0){
    const eq=src.indexOf('=',marker), open=src.indexOf('[',eq);
    if(eq>=0&&open>=0){
      let close=-1,depth=0,quote=null,esc=false;
      for(let i=open;i<src.length;i++){
        const ch=src[i];
        if(quote){if(esc){esc=false;continue;} if(ch==='\\'){esc=true;continue;} if(ch===quote)quote=null; continue;}
        if(ch==='"'||ch==="'"||ch==='`'){quote=ch;continue;}
        if(ch==='['){depth++;continue;}
        if(ch===']'){depth--;if(depth===0){close=i;break;}}
      }
      if(close>=0){
        declarationFound=true;
        const body=src.slice(open+1,close);
        const declared=[];
        for(let i=0;i<body.length;i++){
          const q=body[i]; if(q!=="'"&&q!=='"')continue;
          let s='',e=false,j=i+1;
          for(;j<body.length;j++){
            const ch=body[j]; if(e){s+=ch;e=false;continue;} if(ch==='\\'){e=true;continue;} if(ch===q)break; s+=ch;
          }
          if(j<body.length){declared.push(s);i=j;}
        }
        const tail=src.slice(close+1,Math.min(src.length,close+121));
        sortApplied=/^\s*\.sort\s*\(\s*\)/.test(tail);
        allowed=sortApplied?[...declared].sort():declared;
      }
    }
  }
}
const unexpected=actual.filter(x=>!allowed.includes(x));
const missingAllowed=allowed.filter(x=>!actual.includes(x));
const exact=declarationFound&&missing.length===0&&unexpected.length===0&&missingAllowed.length===0&&JSON.stringify(actual)===JSON.stringify(allowed);
let classification='PIPELINE_MECHANISM_DIAGNOSTIC';
let failureCode=null;
if(Number(productRc)!==0||Number(toolsRc)!==0||Number(docsRc)!==0){classification='PIPELINE_MECHANISM_FAILURE';failureCode='PATCH_APPLICATION_FAIL';}
else if(missing.length){classification='DATA_CONTRACT_FAILURE';failureCode='PREDECESSOR_MANIFEST_FILE_MISSING_IN_CANDIDATE';}
else if(unexpected.length){classification='DATA_CONTRACT_FAILURE';failureCode='PREDECESSOR_ARTIFACT_SOURCEHEAD_PROVENANCE_MISMATCH';}
else if(missingAllowed.length){classification='VALIDATOR_STALE';failureCode='ALLOWED_DELTA_NOT_ACTUALLY_CHANGED';}
else if(exact){classification='PASS';}
const out={
  schemaVersion:'orbit360-macro2-exact-manifest-delta-forensic-v1',
  status:exact?'EXACT_MANIFEST_DELTA_FORENSIC_PASS':'EXACT_MANIFEST_DELTA_FORENSIC_FINDING',
  classification,
  failureCode,
  baseline:{artifactId:baseline.artifactId,sourceHead:baseline.sourceHead,fileCount:baseline.fileCount,zipSha256:baseline.zipSha256,manifestSha256:baseline.manifestSha256,fullRehashPass:baseline.verification.fullRehashPass},
  allPatchApply:{productRc:Number(productRc),toolsRc:Number(toolsRc),docsRc:Number(docsRc)},
  allowedDeltasDeclarationFound:declarationFound,
  allowedDeltasSortApplied:sortApplied,
  allowedDeltas:allowed,
  actualManifestDeltaCount:actual.length,
  actualManifestDeltaPaths:actual,
  unexpectedDeltaPaths:unexpected,
  missingAllowedDeltas:missingAllowed,
  missingManifestFiles:missing,
  exactAllowedDeltaMatch:exact,
  sourceOnly:true,productCommitted:false,candidatePublished:false,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,writes:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false
};
fs.writeFileSync(outPath,JSON.stringify(out,null,2)+'\n');
NODE

git worktree remove --force "$WS" >/dev/null 2>&1 || true
cat "$OUT_JSON"
