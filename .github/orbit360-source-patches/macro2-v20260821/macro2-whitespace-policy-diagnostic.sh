#!/usr/bin/env bash
set -euo pipefail

PRODUCT_GZ='.github/orbit360-source-patches/macro2-v20260821/product.patch.gz'
TOOLS_GZ='.github/orbit360-source-patches/macro2-v20260821/tools.patch.gz'
DOC_GZ='.github/orbit360-source-patches/macro2-v20260821/docs.patch.gz'
PRODUCT_PATCH="$RUNNER_TEMP/product-assertion.patch"
TOOLS_PATCH="$RUNNER_TEMP/tools-assertion.patch"
DOC_PATCH="$RUNNER_TEMP/docs-whitespace-policy.patch"
OUT_JSON="$RUNNER_TEMP/macro2-whitespace-policy.json"
gzip -dc "$PRODUCT_GZ" > "$PRODUCT_PATCH"
gzip -dc "$TOOLS_GZ" > "$TOOLS_PATCH"
gzip -dc "$DOC_GZ" > "$DOC_PATCH"

APPLY_CFG="$(git config --show-origin --get-all apply.whitespace 2>/dev/null || true)"
CORE_CFG="$(git config --show-origin --get-all core.whitespace 2>/dev/null || true)"

run_apply() {
  local label="$1"
  local mode="$2"
  local ws="$RUNNER_TEMP/ws-$label"
  local out="$RUNNER_TEMP/$label.log"
  rm -rf "$ws"
  git worktree add --detach "$ws" "$GITHUB_SHA" >/dev/null 2>&1
  set +e
  if [ "$mode" = 'DEFAULT' ]; then
    (cd "$ws" && git apply "$DOC_PATCH") >"$out" 2>&1
  else
    (cd "$ws" && git apply --whitespace="$mode" "$DOC_PATCH") >"$out" 2>&1
  fi
  local rc=$?
  set -e
  git worktree remove --force "$ws" >/dev/null 2>&1 || true
  printf '%s' "$rc"
}

DEFAULT_RC="$(run_apply default DEFAULT)"
WARN_RC="$(run_apply warn warn)"
NOWARN_RC="$(run_apply nowarn nowarn)"
ERRORALL_RC="$(run_apply errorall error-all)"

WS="$RUNNER_TEMP/ws-diffcheck"
rm -rf "$WS"
git worktree add --detach "$WS" "$GITHUB_SHA" >/dev/null 2>&1
set +e
(cd "$WS" && git apply --whitespace=nowarn "$DOC_PATCH") >"$RUNNER_TEMP/diffcheck-apply.log" 2>&1
DIFF_APPLY_RC=$?
if [ "$DIFF_APPLY_RC" -eq 0 ]; then
  (cd "$WS" && git diff --check -- . ':(exclude,glob)**/*.md') >"$RUNNER_TEMP/diffcheck.log" 2>&1
  DIFFCHECK_RC=$?
  mapfile -t MD_FILES < <(cd "$WS" && git diff --name-only -- ':(glob)**/*.md')
  if ((${#MD_FILES[@]})); then
    (
      cd "$WS"
      node - "${MD_FILES[@]}" <<'NODE'
const fs=require('fs');const bad=[];
for(const f of process.argv.slice(2)){
  if(!fs.existsSync(f))continue;
  fs.readFileSync(f,'utf8').split(/\n/).forEach((line,i)=>{const m=line.match(/[ \t]+$/);if(m&&m[0]!=='  ')bad.push(`${f}:${i+1}:${JSON.stringify(m[0])}`);});
}
if(bad.length){console.error('MARKDOWN_TRAILING_WHITESPACE_INVALID\n'+bad.join('\n'));process.exit(41);}
NODE
    ) >"$RUNNER_TEMP/md-validator.log" 2>&1
    MDVALIDATOR_RC=$?
  else
    MDVALIDATOR_RC=0
  fi
else
  DIFFCHECK_RC=99
  MDVALIDATOR_RC=99
fi
set -e
git worktree remove --force "$WS" >/dev/null 2>&1 || true

DEFAULT_WARN=false
grep -q 'trailing whitespace' "$RUNNER_TEMP/default.log" && DEFAULT_WARN=true || true
WARN_WARN=false
grep -q 'trailing whitespace' "$RUNNER_TEMP/warn.log" && WARN_WARN=true || true
NOWARN_WARN=false
grep -q 'trailing whitespace' "$RUNNER_TEMP/nowarn.log" && NOWARN_WARN=true || true
ERRORALL_WARN=false
grep -q 'trailing whitespace' "$RUNNER_TEMP/errorall.log" && ERRORALL_WARN=true || true

WSALL="$RUNNER_TEMP/ws-all-patches"
rm -rf "$WSALL"
git worktree add --detach "$WSALL" "$GITHUB_SHA" >/dev/null 2>&1
set +e
(cd "$WSALL" && git apply --whitespace=nowarn "$PRODUCT_PATCH") >"$RUNNER_TEMP/all-product.log" 2>&1
ALL_PRODUCT_RC=$?
(cd "$WSALL" && git apply --whitespace=nowarn "$TOOLS_PATCH") >"$RUNNER_TEMP/all-tools.log" 2>&1
ALL_TOOLS_RC=$?
(cd "$WSALL" && git apply --whitespace=nowarn "$DOC_PATCH") >"$RUNNER_TEMP/all-docs.log" 2>&1
ALL_DOCS_RC=$?
set -e

DELTA_COUNT=-1
DELTA_JSON='[]'
COMBINED_DELTA_JSON='[]'
CHECKS_JSON='[]'
NON_MD_DIFF_RC=99
ALL_MD_VALIDATOR_RC=99
VALIDATOR_CONTEXT_JSON='[]'
ALLOWED_CONTRACT_JSON='{"declarationFound":false,"declared":[],"canonical":[],"sameSet":false,"sameOrder":false,"missingFromDeclared":[],"extraInDeclared":[]}'
if [ "$ALL_PRODUCT_RC" -eq 0 ] && [ "$ALL_TOOLS_RC" -eq 0 ] && [ "$ALL_DOCS_RC" -eq 0 ]; then
  mapfile -t DELTA < <(cd "$WSALL" && git diff --name-only | sort)
  DELTA_COUNT="${#DELTA[@]}"
  DELTA_JSON="$(printf '%s\n' "${DELTA[@]}" | node -e "const fs=require('fs');const a=fs.readFileSync(0,'utf8').split(/\n/).filter(Boolean);process.stdout.write(JSON.stringify(a));")"
  mapfile -t COMBINED_DELTA < <(cd "$WSALL" && { git diff --name-only; git ls-files --others --exclude-standard; } | sed '/^$/d' | sort -u)
  COMBINED_DELTA_JSON="$(printf '%s\n' "${COMBINED_DELTA[@]}" | node -e "const fs=require('fs');const a=fs.readFileSync(0,'utf8').split(/\n/).filter(Boolean);process.stdout.write(JSON.stringify(a));")"

  CHECK_NAMES=(
    tools/orbit360-build-macro2-transversal-successor-v20260821.mjs
    tools/orbit360-promote-macro2-transversal-candidate-v20260821.mjs
    tools/orbit360-test-macro2-transversal-source-acceptance-v20260821.mjs
    tools/orbit360-documentation-state-discovery-v20260821.mjs
    orbit360-platform/core/ui.js
    orbit360-platform/core/queries.js
    orbit360-platform/core/client-canonical-view-projection-v20260716.js
    orbit360-platform/core/ciclo.js
    orbit360-platform/data/store-firestore-product-readonly-p0.js
    orbit360-platform/modules/inicio.js
    orbit360-platform/modules/cliente360.js
    orbit360-platform/modules/aseguradoras.js
    orbit360-platform/modules/cobros.js
  )
  CHECK_TMP="$RUNNER_TEMP/checks.tsv"
  : > "$CHECK_TMP"
  for f in "${CHECK_NAMES[@]}"; do
    set +e
    (cd "$WSALL" && node --check "$f") >"$RUNNER_TEMP/check-$(basename "$f").log" 2>&1
    rc=$?
    set -e
    printf '%s\t%s\n' "$f" "$rc" >> "$CHECK_TMP"
  done
  CHECKS_JSON="$(node - "$CHECK_TMP" <<'NODE'
const fs=require('fs');const p=process.argv[2];const rows=fs.readFileSync(p,'utf8').trim().split(/\n/).filter(Boolean).map(x=>{const [file,rc]=x.split(/\t/);return {file,rc:Number(rc)};});process.stdout.write(JSON.stringify(rows));
NODE
)"

  VALIDATOR_FILE="$WSALL/tools/orbit360-test-macro2-transversal-source-acceptance-v20260821.mjs"
  if [ -f "$VALIDATOR_FILE" ]; then
    VALIDATOR_CONTEXT_JSON="$(node - "$VALIDATOR_FILE" <<'NODE'
const fs=require('fs');const p=process.argv[2];const lines=fs.readFileSync(p,'utf8').split(/\n/);const needle='DELTA_EXACTLY_ALLOWED_TRANSVERSAL_SET';const i=lines.findIndex(x=>x.includes(needle));if(i<0){process.stdout.write('[]');process.exit(0);}const lo=Math.max(0,i-18),hi=Math.min(lines.length,i+19);process.stdout.write(JSON.stringify(lines.slice(lo,hi).map((text,j)=>({line:lo+j+1,text}))));
NODE
)"
    ALLOWED_CONTRACT_JSON="$(node - "$VALIDATOR_FILE" <<'NODE'
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
const m=src.match(/const\s+ALLOWED_DELTAS\s*=\s*\[([\s\S]*?)\];/);
if(!m){process.stdout.write(JSON.stringify({declarationFound:false,declared:[],canonical,sameSet:false,sameOrder:false,missingFromDeclared:canonical,extraInDeclared:[]}));process.exit(0);}
const declared=[...m[1].matchAll(/['"]([^'"]+)['"]/g)].map(x=>x[1]);
const ds=[...declared].sort();
const cs=[...canonical].sort();
const sameSet=JSON.stringify(ds)===JSON.stringify(cs);
const sameOrder=JSON.stringify(declared)===JSON.stringify(canonical);
const missingFromDeclared=canonical.filter(x=>!declared.includes(x));
const extraInDeclared=declared.filter(x=>!canonical.includes(x));
process.stdout.write(JSON.stringify({declarationFound:true,declared,canonical,sameSet,sameOrder,missingFromDeclared,extraInDeclared}));
NODE
)"
  fi

  set +e
  (cd "$WSALL" && git diff --check -- . ':(exclude,glob)**/*.md') >"$RUNNER_TEMP/all-diffcheck.log" 2>&1
  NON_MD_DIFF_RC=$?
  mapfile -t ALL_MD_FILES < <(cd "$WSALL" && { git diff --name-only -- ':(glob)**/*.md'; git ls-files --others --exclude-standard | grep -E '\.md$' || true; } | sed '/^$/d' | sort -u)
  if ((${#ALL_MD_FILES[@]})); then
    (
      cd "$WSALL"
      node - "${ALL_MD_FILES[@]}" <<'NODE'
const fs=require('fs');const bad=[];
for(const f of process.argv.slice(2)){
  if(!fs.existsSync(f))continue;
  fs.readFileSync(f,'utf8').split(/\n/).forEach((line,i)=>{const m=line.match(/[ \t]+$/);if(m&&m[0]!=='  ')bad.push(`${f}:${i+1}:${JSON.stringify(m[0])}`);});
}
if(bad.length){console.error('MARKDOWN_TRAILING_WHITESPACE_INVALID\n'+bad.join('\n'));process.exit(41);}
NODE
    ) >"$RUNNER_TEMP/all-md-validator.log" 2>&1
    ALL_MD_VALIDATOR_RC=$?
  else
    ALL_MD_VALIDATOR_RC=0
  fi
  set -e
fi
git worktree remove --force "$WSALL" >/dev/null 2>&1 || true

CONCLUSION='UNRESOLVED'
if [ "$DEFAULT_RC" -eq 0 ] && [ "$WARN_RC" -eq 0 ] && [ "$NOWARN_RC" -eq 0 ] && [ "$ERRORALL_RC" -ne 0 ] && [ "$DIFFCHECK_RC" -eq 0 ] && [ "$MDVALIDATOR_RC" -eq 0 ]; then
  CONCLUSION='GIT_APPLY_WARN_ONLY_MARKDOWN_VALIDATOR_PASS'
fi
if [ "$ALL_PRODUCT_RC" -ne 0 ] || [ "$ALL_TOOLS_RC" -ne 0 ] || [ "$ALL_DOCS_RC" -ne 0 ]; then
  CONCLUSION='ALL_PATCH_APPLICATION_FAIL'
elif [ "$(node -e "const a=$COMBINED_DELTA_JSON;process.stdout.write(String(a.length))")" -ne 15 ]; then
  CONCLUSION='COMBINED_DELTA_COUNT_ASSERTION_MISMATCH'
elif ! node -e "const a=$CHECKS_JSON;if(a.some(x=>x.rc!==0))process.exit(1)"; then
  CONCLUSION='NODE_SYNTAX_CHECK_FAIL'
elif [ "$NON_MD_DIFF_RC" -ne 0 ]; then
  CONCLUSION='NON_MARKDOWN_DIFF_CHECK_FAIL'
elif [ "$ALL_MD_VALIDATOR_RC" -ne 0 ]; then
  CONCLUSION='MARKDOWN_VALIDATOR_FAIL'
else
  ALLOWED_FOUND="$(node -e "const x=$ALLOWED_CONTRACT_JSON;process.stdout.write(String(x.declarationFound===true))")"
  ALLOWED_SAME_SET="$(node -e "const x=$ALLOWED_CONTRACT_JSON;process.stdout.write(String(x.sameSet===true))")"
  ALLOWED_SAME_ORDER="$(node -e "const x=$ALLOWED_CONTRACT_JSON;process.stdout.write(String(x.sameOrder===true))")"
  if [ "$ALLOWED_FOUND" != 'true' ]; then
    CONCLUSION='ALLOWED_DELTAS_DECLARATION_NOT_FOUND'
  elif [ "$ALLOWED_SAME_SET" = 'true' ] && [ "$ALLOWED_SAME_ORDER" != 'true' ]; then
    CONCLUSION='VALIDATOR_STALE_ALLOWED_DELTAS_ORDER_MISMATCH'
  elif [ "$ALLOWED_SAME_SET" != 'true' ]; then
    CONCLUSION='ALLOWED_DELTAS_CONTENT_MISMATCH'
  else
    CONCLUSION='ALLOWED_DELTAS_DECLARATION_MATCHES_CANONICAL_9'
  fi
fi

node - "$OUT_JSON" "$APPLY_CFG" "$CORE_CFG" "$DEFAULT_RC" "$WARN_RC" "$NOWARN_RC" "$ERRORALL_RC" "$DIFF_APPLY_RC" "$DIFFCHECK_RC" "$MDVALIDATOR_RC" "$DEFAULT_WARN" "$WARN_WARN" "$NOWARN_WARN" "$ERRORALL_WARN" "$ALL_PRODUCT_RC" "$ALL_TOOLS_RC" "$ALL_DOCS_RC" "$DELTA_COUNT" "$DELTA_JSON" "$COMBINED_DELTA_JSON" "$CHECKS_JSON" "$NON_MD_DIFF_RC" "$ALL_MD_VALIDATOR_RC" "$VALIDATOR_CONTEXT_JSON" "$ALLOWED_CONTRACT_JSON" "$CONCLUSION" <<'NODE'
const fs=require('fs');
const [p,applyCfg,coreCfg,defaultRc,warnRc,nowarnRc,errorAllRc,diffApplyRc,diffCheckRc,mdValidatorRc,defaultWarn,warnWarn,nowarnWarn,errorAllWarn,allProductRc,allToolsRc,allDocsRc,deltaCount,deltaJson,combinedDeltaJson,checksJson,nonMdDiffRc,allMdValidatorRc,validatorContextJson,allowedContractJson,conclusion]=process.argv.slice(2);
const combined=JSON.parse(combinedDeltaJson);
const x={
  schemaVersion:'orbit360-macro2-delta-contract-diagnostic-v4',
  status:'DELTA_CONTRACT_SOURCE_ONLY_DIAGNOSTIC_COMPLETE',
  classification:'PIPELINE_MECHANISM_DIAGNOSTIC',
  applyWhitespaceConfig:applyCfg||null,coreWhitespaceConfig:coreCfg||null,
  defaultApplyRc:Number(defaultRc),warnApplyRc:Number(warnRc),nowarnApplyRc:Number(nowarnRc),errorAllApplyRc:Number(errorAllRc),
  diffCheckPreparationApplyRc:Number(diffApplyRc),diffCheckExcludeMarkdownRc:Number(diffCheckRc),markdownAwareValidatorRc:Number(mdValidatorRc),
  defaultReportedTrailingWhitespace:defaultWarn==='true',warnReportedTrailingWhitespace:warnWarn==='true',nowarnReportedTrailingWhitespace:nowarnWarn==='true',errorAllReportedTrailingWhitespace:errorAllWarn==='true',
  allPatchApply:{productRc:Number(allProductRc),toolsRc:Number(allToolsRc),docsRc:Number(allDocsRc)},
  legacyTrackedDeltaCount:Number(deltaCount),legacyTrackedDeltaFiles:JSON.parse(deltaJson),
  expectedSourceDeltaCount:15,combinedSourceDeltaCount:combined.length,combinedSourceDeltaCountMatchesExpected:combined.length===15,combinedSourceDeltaFiles:combined,
  syntaxChecks:JSON.parse(checksJson),nonMarkdownDiffCheckRc:Number(nonMdDiffRc),allMarkdownAwareValidatorRc:Number(allMdValidatorRc),
  validatorCheckContext:JSON.parse(validatorContextJson),allowedDeltasContract:JSON.parse(allowedContractJson),conclusion,
  sourceOnly:true,productCommitted:false,candidatePublished:false,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,writes:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false
};
fs.writeFileSync(p,JSON.stringify(x,null,2)+'\n');
NODE

cat "$OUT_JSON"
