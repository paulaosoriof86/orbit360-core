#!/usr/bin/env bash
set -euo pipefail

set +e
node - <<'NODE'
const fs=require('node:fs');
const c=JSON.parse(fs.readFileSync('artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json','utf8'));
const l=JSON.parse(fs.readFileSync('artifacts/orbit360-recovery/release-control/I6_5_FORENSIC_B3_EXECUTION_LOCK_20260929.json','utf8'));
const q=l.b3006SyntheticQaAuthorization||{};
const ok=c.nextAction==='I6_5_FORENSIC_REMEDIATION_B3_006_EXACT_PREVIEW'
 && c.i65ForensicRemediationPlan?.b3?.status==='B3_006_CONTRACT_PASS_PENDING_EXACT_PREVIEW'
 && l.status==='B3_006_CONTRACT_PASS_PENDING_EXACT_PREVIEW'
 && l.activeFinding?.id==='B3-006'
 && q.status==='AUTHORIZED_FOR_B3_006_PREVIEW_ONLY'
 && q.cleanupRequired===true
 && q.operationalBusinessWritesAuthorized===false
 && q.syntheticBusinessWritesAuthorized===true;
if(!ok){console.log('B3_006_EXECUTOR_MODE=NOOP');process.exit(10);}
console.log('B3_006_EXECUTOR_MODE=RUN');
NODE
rc=$?
set -e
if [ "$rc" = "10" ]; then
  echo "run=false" >> "$GITHUB_OUTPUT"
  exit 0
fi
test "$rc" = "0"

test "$GITHUB_REF_NAME" = "recovery/fase-a-clean-20260831"
git fetch origin "$GITHUB_REF_NAME"
git reset --hard "origin/$GITHUB_REF_NAME"
CANDIDATE_SOURCE_SHA="$(git rev-parse HEAD)"
REMOTE="$(git ls-remote origin "refs/heads/$GITHUB_REF_NAME" | awk '{print $1}')"
test "$CANDIDATE_SOURCE_SHA" = "$REMOTE"
export CANDIDATE_SOURCE_SHA

node tools/gravicentra-governance-preflight-v1.mjs --mode=i6
node tools/gravicentra-certified-live-binding-check.mjs
node --check orbit360-platform/core/importa.js
node --check orbit360-platform/core/policy-receipts-engine.js
node --check tools/gravicentra-i6-5-b3-006-contract.mjs
node --check tools/gravicentra-i6-5-b3-006-preview-proof.mjs
node tools/gravicentra-i6-5-b3-006-contract.mjs

ROOT="$RUNNER_TEMP/b3-006-auth"; mkdir -p "$ROOT"; export ROOT
python3 - <<'PY'
import json,os,pathlib
rows=[]
for i,k in enumerate(['SA_DEFAULT','SA_ORBIT360_LAB','SA_ORBIT_360_LAB']):
    try:d=json.loads(os.environ.get(k,''))
    except:continue
    if d.get('type')=='service_account' and d.get('project_id')=='ays-orbit-360-lab' and d.get('private_key'):
        p=pathlib.Path(os.environ['ROOT'])/f'{i}.json';p.write_text(json.dumps(d));p.chmod(0o600);rows.append(str(p))
if not rows:raise SystemExit('B3_006_NO_SERVICE_ACCOUNT')
pathlib.Path(os.environ['ROOT']+'/files').write_text('\n'.join(rows)+'\n')
PY

CROOT="$RUNNER_TEMP/b3-006-firebase-cli"
npm install --prefix "$CROOT" --ignore-scripts --no-audit --no-fund firebase-tools@14.10.1 >/dev/null
node tools/gravicentra-firebase-tools-empty-extensions-workaround-v1.mjs "$CROOT"
FIREBASE_CLI_BIN="$CROOT/node_modules/firebase-tools/lib/bin/firebase.js"
export FIREBASE_CLI_BIN
SEL=''
while read -r F; do
  if GOOGLE_APPLICATION_CREDENTIALS="$F" node "$FIREBASE_CLI_BIN" apps:list WEB --project "$PROJECT_ID" --non-interactive --json >/dev/null 2>&1; then SEL="$F"; break; fi
done < "$ROOT/files"
test -n "$SEL"
cp "$SEL" "$RUNNER_TEMP/b3-006-sa.json"
chmod 600 "$RUNNER_TEMP/b3-006-sa.json"
export GOOGLE_APPLICATION_CREDENTIALS="$RUNNER_TEMP/b3-006-sa.json"

npm install --no-save --package-lock=false firebase-admin@13.4.0 playwright@1.55.0 >/dev/null
npx playwright install --with-deps chromium >/dev/null

node "$FIREBASE_CLI_BIN" apps:list WEB --project "$PROJECT_ID" --non-interactive --json > "$RUNNER_TEMP/apps-b3-006.json"
export APPS="$RUNNER_TEMP/apps-b3-006.json"
APP_ID="$(python3 - <<'PY'
import json,os
d=json.load(open(os.environ['APPS']));a=d.get('result') if isinstance(d,dict) else None
web=[x for x in (a or []) if str(x.get('platform','')).upper() in ('WEB','PLATFORM_WEB','')]
if len(web)!=1:raise SystemExit('B3_006_WEB_APP_CARDINALITY:'+str(len(web)))
print(web[0].get('appId',''))
PY
)"
node "$FIREBASE_CLI_BIN" apps:sdkconfig WEB "$APP_ID" --project "$PROJECT_ID" --non-interactive --json > "$RUNNER_TEMP/public-config-b3-006.json"
export PUBLIC_CONFIG_FILE="$RUNNER_TEMP/public-config-b3-006.json"

node tools/gravicentra-i6-5-b1-branding-snapshot.mjs "$RUNNER_TEMP/b3-006-branding-snapshot.json"
export TENANT_BRANDING_SNAPSHOT_FILE="$RUNNER_TEMP/b3-006-branding-snapshot.json"
export SOURCE_SHA="$CANDIDATE_SOURCE_SHA"
export RELEASE_GATE="I6.5-B3-006"
export BUILD_PREFIX="gi-i65-b3"
export ENVIRONMENT_REF="firebase-hosting-preview-i6-5-forensic-b3-006"
node tools/gravicentra-i6-1-preview-package.mjs . "$RUNNER_TEMP/b3-006-package" "$PUBLIC_CONFIG_FILE" > "$RUNNER_TEMP/b3-006-package-output.json"

export PKGOUT="$RUNNER_TEMP/b3-006-package-output.json"
python3 - <<'PY' > "$RUNNER_TEMP/b3-006-build.env"
import json,os,shlex
d=json.load(open(os.environ['PKGOUT']))
for k,v in {'BUILD_ID':d.get('buildId',''),'HOSTED_PAYLOAD_DIGEST':d.get('hostedPayloadDigest',''),'BACKEND_SOURCE_DIGEST':d.get('backendSourceDigest',''),'BUNDLE_DIGEST':d.get('bundleDigest','')}.items():
    print(k+'='+shlex.quote(str(v)))
PY
source "$RUNNER_TEMP/b3-006-build.env"
export BUILD_ID HOSTED_PAYLOAD_DIGEST BACKEND_SOURCE_DIGEST BUNDLE_DIGEST

cd "$RUNNER_TEMP/b3-006-package/bundle"
CHANNEL_ID="gi-b3006-$GITHUB_RUN_ID"
deploy_channel() {
  set +e
  node "$FIREBASE_CLI_BIN" hosting:channel:deploy "$CHANNEL_ID" --config firebase.json --project "$PROJECT_ID" --expires 7d --non-interactive --json > "$RUNNER_TEMP/b3-006-preview.json" 2>&1
  RC=$?
  set -e
  cat "$RUNNER_TEMP/b3-006-preview.json"
  return "$RC"
}
if ! deploy_channel; then
  if grep -Fq "channel quota reached" "$RUNNER_TEMP/b3-006-preview.json"; then
    node "$GITHUB_WORKSPACE/tools/gravicentra-preview-channel-gc.mjs" "$FIREBASE_CLI_BIN" "$PROJECT_ID" "$CHANNEL_ID" "$GITHUB_WORKSPACE" "gi-"
    deploy_channel
  else
    exit 1
  fi
fi
export DEPLOY="$RUNNER_TEMP/b3-006-preview.json"
PREVIEW_URL="$(python3 - <<'PY'
import os,re
raw=open(os.environ['DEPLOY']).read();prod='https://'+os.environ['HOSTING_SITE']+'.web.app'
urls=[u.rstrip('/') for u in re.findall(r'https://[A-Za-z0-9._-]+\.web\.app',raw) if u.rstrip('/')!=prod]
if not urls:raise SystemExit('B3_006_PREVIEW_URL_NOT_FOUND')
print(urls[-1])
PY
)"
export PREVIEW_URL

export MANIFEST="$RUNNER_TEMP/b3-006-package/evidence/site-manifest.sha256"
python3 - <<'PY'
import hashlib,json,os,time,urllib.parse,urllib.request
rows=[tuple(x.split('  ',1)) for x in open(os.environ['MANIFEST']).read().splitlines() if x.strip()]
base=os.environ['PREVIEW_URL'].rstrip('/')
for attempt in range(1,9):
    bad=[]
    for want,rel in rows:
        try:
            req=urllib.request.Request(base+'/'+urllib.parse.quote(rel,safe='/')+'?b3006='+str(attempt)+'-'+str(int(time.time())),headers={'Accept-Encoding':'identity','Cache-Control':'no-cache, no-store'})
            with urllib.request.urlopen(req,timeout=30) as z:got=hashlib.sha256(z.read()).hexdigest()
        except Exception as e:got=type(e).__name__
        if got!=want:bad.append(rel)
    with urllib.request.urlopen(base+'/__recovery__/build.json?b3006='+str(time.time()),timeout=30) as z:marker=json.loads(z.read())
    if not bad and marker.get('sourceSha')==os.environ['CANDIDATE_SOURCE_SHA'] and marker.get('buildId')==os.environ['BUILD_ID']:break
    if attempt==8:raise SystemExit('B3_006_READBACK:'+str(bad[:5])+':'+str(marker))
    time.sleep(3)
print('B3_006_HOSTING_READBACK=PASS')
PY

cd "$GITHUB_WORKSPACE"
export B3_006_PROOF_OUT="$RUNNER_TEMP/b3-006-preview-proof.json"
export B3_PREVIEW_URL="$PREVIEW_URL"
node tools/gravicentra-i6-5-b3-006-preview-proof.mjs
node - <<'NODE'
const x=require(process.env.B3_006_PROOF_OUT);
if(x.status!=='PASS'||x.assertions?.browserImportPathExecuted!==true||x.assertions?.canonicalPolicyCreated!==true||x.assertions?.expectedReceiptsCreated!==true||x.assertions?.portfolioCreated!==true||x.assertions?.zeroCobrosWithoutEvidence!==true||x.assertions?.invalidRowFailClosed!==true||x.cleanup?.pass!==true)process.exit(1);
console.log('B3_006_PREVIEW_MACHINE_PROOF=PASS');
NODE

{
  echo "run=true"
  echo "source_sha=$CANDIDATE_SOURCE_SHA"
  echo "build_id=$BUILD_ID"
  echo "preview_url=$PREVIEW_URL"
  echo "channel_id=$CHANNEL_ID"
  echo "proof_path=$B3_006_PROOF_OUT"
  echo "package_path=$RUNNER_TEMP/b3-006-package"
  echo "hosted_payload_digest=$HOSTED_PAYLOAD_DIGEST"
  echo "backend_source_digest=$BACKEND_SOURCE_DIGEST"
  echo "bundle_digest=$BUNDLE_DIGEST"
} >> "$GITHUB_OUTPUT"
