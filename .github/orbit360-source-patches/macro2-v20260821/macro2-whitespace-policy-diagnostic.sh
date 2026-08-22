#!/usr/bin/env bash
set -euo pipefail

PRODUCT_GZ='.github/orbit360-source-patches/macro2-v20260821/product.patch.gz'
TOOLS_GZ='.github/orbit360-source-patches/macro2-v20260821/tools.patch.gz'
DOC_GZ='.github/orbit360-source-patches/macro2-v20260821/docs.patch.gz'
PRODUCT_PATCH="$RUNNER_TEMP/product-delta-contract.patch"
TOOLS_PATCH="$RUNNER_TEMP/tools-delta-contract.patch"
DOC_PATCH="$RUNNER_TEMP/docs-delta-contract.patch"
OUT_JSON="$RUNNER_TEMP/macro2-whitespace-policy.json"

gzip -dc "$PRODUCT_GZ" > "$PRODUCT_PATCH"
gzip -dc "$TOOLS_GZ" > "$TOOLS_PATCH"
gzip -dc "$DOC_GZ" > "$DOC_PATCH"

WS="$RUNNER_TEMP/ws-delta-contract"
rm -rf "$WS"
git worktree add --detach "$WS" "$GITHUB_SHA" >/dev/null 2>&1
set +e
(cd "$WS" && git apply --whitespace=nowarn "$PRODUCT_PATCH") >"$RUNNER_TEMP/delta-product.log" 2>&1
PRODUCT_RC=$?
(cd "$WS" && git apply --whitespace=nowarn "$TOOLS_PATCH") >"$RUNNER_TEMP/delta-tools.log" 2>&1
TOOLS_RC=$?
(cd "$WS" && git apply --whitespace=nowarn "$DOC_PATCH") >"$RUNNER_TEMP/delta-docs.log" 2>&1
DOCS_RC=$?
set -e

SOURCE_DELTAS_JSON='[]'
CONTRACT_JSON='{"declarationFound":false,"declared":[],"suffix":"","sortApplied":false,"runtimeAllowedDeltas":[],"canonical":[],"sameSet":false,"sameRuntimeOrder":false,"missingFromDeclared":[],"extraInDeclared":[]}'
CONCLUSION='PATCH_APPLICATION_FAIL'

if [ "$PRODUCT_RC" -eq 0 ] && [ "$TOOLS_RC" -eq 0 ] && [ "$DOCS_RC" -eq 0 ]; then
  mapfile -t SOURCE_DELTAS < <(cd "$WS" && { git diff --name-only; git ls-files --others --exclude-standard; } | sed '/^$/d' | sort -u)
  SOURCE_DELTAS_JSON="$(printf '%s\n' "${SOURCE_DELTAS[@]}" | node -e "const fs=require('fs');const a=fs.readFileSync(0,'utf8').split(/\n/).filter(Boolean);process.stdout.write(JSON.stringify(a));")"
  VALIDATOR="$WS/tools/orbit360-test-macro2-transversal-source-acceptance-v20260821.mjs"
  if [ -f "$VALIDATOR" ]; then
    CONTRACT_JSON="$(node - "$VALIDATOR" <<'NODE'
const fs=require('fs');
const p=process.argv[2];
const src=fs.readFileSync(p,'utf8');
const canonical=[
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
const marker=src.indexOf('const ALLOWED_DELTAS');
if(marker<0){process.stdout.write(JSON.stringify({declarationFound:false,declared:[],suffix:'',sortApplied:false,runtimeAllowedDeltas:[],canonical,sameSet:false,sameRuntimeOrder:false,missingFromDeclared:canonical,extraInDeclared:[]}));process.exit(0);}
const eq=src.indexOf('=',marker);
const open=src.indexOf('[',eq);
if(eq<0||open<0){process.stdout.write(JSON.stringify({declarationFound:false,declared:[],suffix:'',sortApplied:false,runtimeAllowedDeltas:[],canonical,sameSet:false,sameRuntimeOrder:false,missingFromDeclared:canonical,extraInDeclared:[]}));process.exit(0);}
let close=-1,depth=0,quote=null,esc=false;
for(let i=open;i<src.length;i++){
  const ch=src[i];
  if(quote){
    if(esc){esc=false;continue;}
    if(ch==='\\'){esc=true;continue;}
    if(ch===quote){quote=null;continue;}
    continue;
  }
  if(ch==='"'||ch==="'"||ch==='`'){quote=ch;continue;}
  if(ch==='['){depth++;continue;}
  if(ch===']'){depth--;if(depth===0){close=i;break;}}
}
if(close<0){process.stdout.write(JSON.stringify({declarationFound:false,declared:[],suffix:'',sortApplied:false,runtimeAllowedDeltas:[],canonical,sameSet:false,sameRuntimeOrder:false,missingFromDeclared:canonical,extraInDeclared:[]}));process.exit(0);}
const body=src.slice(open+1,close);
const declared=[];
for(let i=0;i<body.length;i++){
  const q=body[i];
  if(q!=="'"&&q!=='"')continue;
  let s='',e=false,j=i+1;
  for(;j<body.length;j++){
    const ch=body[j];
    if(e){s+=ch;e=false;continue;}
    if(ch==='\\'){e=true;continue;}
    if(ch===q)break;
    s+=ch;
  }
  if(j<body.length){declared.push(s);i=j;}
}
const tail=src.slice(close+1,Math.min(src.length,close+121));
const suffix=(tail.split(/\n/)[0]||'').trim();
const sortApplied=/^\.sort\s*\(\s*\)/.test(suffix);
const runtimeAllowedDeltas=sortApplied?[...declared].sort():[...declared];
const sameSet=JSON.stringify([...declared].sort())===JSON.stringify([...canonical].sort());
const sameRuntimeOrder=JSON.stringify(runtimeAllowedDeltas)===JSON.stringify(canonical);
const missingFromDeclared=canonical.filter(x=>!declared.includes(x));
const extraInDeclared=declared.filter(x=>!canonical.includes(x));
process.stdout.write(JSON.stringify({declarationFound:true,declared,suffix,sortApplied,runtimeAllowedDeltas,canonical,sameSet,sameRuntimeOrder,missingFromDeclared,extraInDeclared}));
NODE
)"
  fi
  FOUND="$(node -e "const x=$CONTRACT_JSON;process.stdout.write(String(x.declarationFound===true))")"
  SAME_SET="$(node -e "const x=$CONTRACT_JSON;process.stdout.write(String(x.sameSet===true))")"
  SAME_RUNTIME_ORDER="$(node -e "const x=$CONTRACT_JSON;process.stdout.write(String(x.sameRuntimeOrder===true))")"
  SOURCE_COUNT="$(node -e "const x=$SOURCE_DELTAS_JSON;process.stdout.write(String(x.length))")"
  if [ "$FOUND" != 'true' ]; then
    CONCLUSION='ALLOWED_DELTAS_DECLARATION_NOT_FOUND'
  elif [ "$SOURCE_COUNT" -ne 15 ]; then
    CONCLUSION='SOURCE_DELTA_COUNT_NOT_15'
  elif [ "$SAME_SET" != 'true' ]; then
    CONCLUSION='ALLOWED_DELTAS_CONTENT_MISMATCH'
  elif [ "$SAME_RUNTIME_ORDER" != 'true' ]; then
    CONCLUSION='VALIDATOR_STALE_ALLOWED_DELTAS_RUNTIME_ORDER_MISMATCH'
  else
    CONCLUSION='ALLOWED_DELTAS_RUNTIME_MATCHES_CANONICAL_9'
  fi
fi

git worktree remove --force "$WS" >/dev/null 2>&1 || true

node - "$OUT_JSON" "$PRODUCT_RC" "$TOOLS_RC" "$DOCS_RC" "$SOURCE_DELTAS_JSON" "$CONTRACT_JSON" "$CONCLUSION" <<'NODE'
const fs=require('fs');
const [p,productRc,toolsRc,docsRc,sourceJson,contractJson,conclusion]=process.argv.slice(2);
const source=JSON.parse(sourceJson),contract=JSON.parse(contractJson);
const out={
  schemaVersion:'orbit360-macro2-delta-contract-diagnostic-v5',
  status:'DELTA_CONTRACT_BRACKET_PARSE_DIAGNOSTIC_COMPLETE',
  classification:'PIPELINE_MECHANISM_DIAGNOSTIC',
  allPatchApply:{productRc:Number(productRc),toolsRc:Number(toolsRc),docsRc:Number(docsRc)},
  expectedSourceDeltaCount:15,
  combinedSourceDeltaCount:source.length,
  combinedSourceDeltaFiles:source,
  allowedDeltasContract:contract,
  conclusion,
  sourceOnly:true,
  productCommitted:false,
  candidatePublished:false,
  runtimeExecuted:false,
  browserExecuted:false,
  secretAccess:false,
  firestoreRead:false,
  writes:0,
  deployExecuted:false,
  productionTouched:false,
  containsPII:false,
  containsSecrets:false
};
fs.writeFileSync(p,JSON.stringify(out,null,2)+'\n');
NODE

cat "$OUT_JSON"
