#!/usr/bin/env bash
set -euo pipefail

DOC_GZ='.github/orbit360-source-patches/macro2-v20260821/docs.patch.gz'
DOC_PATCH="$RUNNER_TEMP/docs-whitespace-policy.patch"
OUT_JSON="$RUNNER_TEMP/macro2-whitespace-policy.json"
gzip -dc "$DOC_GZ" > "$DOC_PATCH"

APPLY_CFG="$(git config --show-origin --get-all apply.whitespace 2>/dev/null || true)"
CORE_CFG="$(git config --show-origin --get-all core.whitespace 2>/dev/null || true)"

run_apply() {
  local label="$1" mode="$2" ws="$RUNNER_TEMP/ws-$label" out="$RUNNER_TEMP/$label.log"
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

CONCLUSION='UNRESOLVED'
if [ "$DEFAULT_RC" -eq 0 ] && [ "$WARN_RC" -eq 0 ] && [ "$NOWARN_RC" -eq 0 ] && [ "$ERRORALL_RC" -ne 0 ] && [ "$DIFFCHECK_RC" -eq 0 ] && [ "$MDVALIDATOR_RC" -eq 0 ]; then
  CONCLUSION='GIT_APPLY_WARN_ONLY_MARKDOWN_VALIDATOR_PASS'
elif [ "$NOWARN_RC" -eq 0 ] && [ "$DIFFCHECK_RC" -ne 0 ]; then
  CONCLUSION='SOURCE_AWARE_DIFF_CHECK_COMMAND_FAIL'
elif [ "$NOWARN_RC" -eq 0 ] && [ "$DIFFCHECK_RC" -eq 0 ] && [ "$MDVALIDATOR_RC" -ne 0 ]; then
  CONCLUSION='MARKDOWN_VALIDATOR_FAIL'
elif [ "$DEFAULT_RC" -ne 0 ] && [ "$NOWARN_RC" -eq 0 ]; then
  CONCLUSION='GIT_APPLY_EFFECTIVE_WHITESPACE_POLICY_FAILS_DEFAULT'
elif [ "$NOWARN_RC" -ne 0 ]; then
  CONCLUSION='PATCH_APPLICATION_FAILS_INDEPENDENT_OF_WHITESPACE_POLICY'
fi

node - "$OUT_JSON" "$APPLY_CFG" "$CORE_CFG" "$DEFAULT_RC" "$WARN_RC" "$NOWARN_RC" "$ERRORALL_RC" "$DIFF_APPLY_RC" "$DIFFCHECK_RC" "$MDVALIDATOR_RC" "$DEFAULT_WARN" "$WARN_WARN" "$NOWARN_WARN" "$ERRORALL_WARN" "$CONCLUSION" <<'NODE'
const fs=require('fs');
const [p,applyCfg,coreCfg,defaultRc,warnRc,nowarnRc,errorAllRc,diffApplyRc,diffCheckRc,mdValidatorRc,defaultWarn,warnWarn,nowarnWarn,errorAllWarn,conclusion]=process.argv.slice(2);
const x={
  schemaVersion:'orbit360-macro2-whitespace-policy-diagnostic-v1',
  status:'PATCH_APPLY_WHITESPACE_POLICY_DIAGNOSTIC_COMPLETE',
  classification:'PIPELINE_MECHANISM_DIAGNOSTIC',
  applyWhitespaceConfig:applyCfg||null,
  coreWhitespaceConfig:coreCfg||null,
  defaultApplyRc:Number(defaultRc),
  warnApplyRc:Number(warnRc),
  nowarnApplyRc:Number(nowarnRc),
  errorAllApplyRc:Number(errorAllRc),
  diffCheckPreparationApplyRc:Number(diffApplyRc),
  diffCheckExcludeMarkdownRc:Number(diffCheckRc),
  markdownAwareValidatorRc:Number(mdValidatorRc),
  defaultReportedTrailingWhitespace:defaultWarn==='true',
  warnReportedTrailingWhitespace:warnWarn==='true',
  nowarnReportedTrailingWhitespace:nowarnWarn==='true',
  errorAllReportedTrailingWhitespace:errorAllWarn==='true',
  conclusion,
  sourceOnly:true,productCommitted:false,candidatePublished:false,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,writes:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false
};
fs.writeFileSync(p,JSON.stringify(x,null,2)+'\n');
NODE

cat "$OUT_JSON"
