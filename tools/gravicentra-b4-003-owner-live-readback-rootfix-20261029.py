#!/usr/bin/env python3
import pathlib,re,subprocess,json,sys

ROOT=pathlib.Path.cwd()
WF=ROOT/'.github/workflows/gravicentra-b4-003-cumulative-safe-read-preview-20261029.yml'
EXPECTED_BEFORE='b27daac122c7aadc5ab00f1c384217be400ff15e'

def run(*args):
    return subprocess.run(args,cwd=ROOT,check=True,text=True,capture_output=True).stdout.strip()
def blob(path): return run('git','hash-object',str(path))
def replace_once(text,old,new,label):
    n=text.count(old)
    if n!=1: raise RuntimeError(f'{label}_MATCH_COUNT_{n}')
    return text.replace(old,new,1)
def regex_once(text,pattern,repl,label):
    out,n=re.subn(pattern,repl,text,count=1,flags=re.S)
    if n!=1: raise RuntimeError(f'{label}_MATCH_COUNT_{n}')
    return out

if blob(WF)!=EXPECTED_BEFORE:
    raise RuntimeError('OWNER_READBACK_WORKFLOW_BASE_BLOB_MISMATCH:'+blob(WF))
s=WF.read_text(encoding='utf8')
old_source="""          const source=git('rev-parse','HEAD^');
          const productCommit=git('log','-1','--format=%H','--',S.productPath);
          need(/^[0-9a-f]{40}$/.test(source)&&/^[0-9a-f]{40}$/.test(productCommit)&&
           source!==process.env.TRANSPORT_SHA&&
           git('merge-base',productCommit,source)===productCommit&&
           git('rev-parse',productCommit+'^')===S.parentHead,
           'EXACT_INSTITUTIONAL_GOALS_SOURCE_ANCESTRY_REQUIRED');
          need(git('diff','--name-only',source,'HEAD')===workflowPath,
           'SOURCE_TO_TRANSPORT_MUST_CHANGE_ONLY_EXISTING_WORKFLOW');
"""
new_source="""          const transportParent=git('rev-parse','HEAD^');
          const productCommit=git('log','-1','--format=%H','--',S.productPath);
          const source=productCommit;
          need(/^[0-9a-f]{40}$/.test(source)&&/^[0-9a-f]{40}$/.test(productCommit)&&
           source===productCommit&&source!==process.env.TRANSPORT_SHA&&
           git('merge-base',productCommit,transportParent)===productCommit&&
           git('rev-parse',productCommit+'^')===S.parentHead,
           'EXACT_INSTITUTIONAL_GOALS_SOURCE_ANCESTRY_REQUIRED');
          need(git('diff','--name-only',transportParent,'HEAD')===workflowPath,
           'TRANSPORT_PARENT_TO_HEAD_MUST_CHANGE_ONLY_EXISTING_WORKFLOW');
"""
s=replace_once(s,old_source,new_source,'SOURCE_ANCHOR')
s=replace_once(s,
"          const postProduct=git('diff','--name-only',productCommit,source).split(/\\r?\\n/).filter(Boolean);\n",
"          const postProduct=git('diff','--name-only',productCommit,transportParent).split(/\\r?\\n/).filter(Boolean);\n",
'POST_PRODUCT_RANGE')

snapshot="""      - name: Snapshot public LIVE identities before preview
        run: |
          set -euo pipefail
          curl --fail --silent --show-error --location --retry 2 --max-time 30 https://ays-orbit-360-lab.web.app/ > "$RUNNER_TEMP/gi-live-before.html"
          curl --fail --silent --show-error --location --retry 2 --max-time 30 https://ays-orbit-360-lab.web.app/__recovery__/build.json > "$RUNNER_TEMP/gi-live-build-before.json"
          for n in 1 2; do
            curl --fail --silent --show-error --location --retry 2 --max-time 30 -D "$RUNNER_TEMP/gi-owner-before-$n.headers" https://app.aysseguros.com/ > "$RUNNER_TEMP/gi-owner-before-$n.html"
          done
          curl --fail --silent --show-error --location --retry 2 --max-time 30 https://app.aysseguros.com/__recovery__/build.json > "$RUNNER_TEMP/gi-owner-build-before.json"
          curl --fail --silent --show-error --location --retry 2 --max-time 30 https://app.aysseguros.com/product-runtime-config.js > "$RUNNER_TEMP/gi-owner-runtime-before.js"
          cat > "$RUNNER_TEMP/gi-owner-root-fingerprint.js" <<'NODE'
          'use strict';
          const fs=require('node:fs'),crypto=require('node:crypto');
          const [phase,fileA,fileB,out]=process.argv.slice(2);
          const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
          function fingerprint(path){
            const html=fs.readFileSync(path,'utf8');
            const title=((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||'').replace(/\s+/g,' ').trim();
            const buildIds=[...new Set([...html.matchAll(/orbitBuild=([^&"'<>\s]+)/g)].map(m=>decodeURIComponent(m[1])))].sort();
            const assets=[...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)=["']([^"']+)["']/gi)].map(m=>m[1]).map(raw=>{
              try{
                const u=new URL(raw,'https://app.aysseguros.com/');
                if(u.origin==='https://app.aysseguros.com'&&u.pathname.startsWith('/cdn-cgi/'))return '';
                const build=u.searchParams.get('orbitBuild');
                return (u.origin==='https://app.aysseguros.com'?'':u.origin)+u.pathname+(build?'?orbitBuild='+build:'');
              }catch{return String(raw).split('#')[0];}
            }).filter(Boolean);
            const uniqueAssets=[...new Set(assets)].sort();
            const brand=/Gravicentra Insurance|Insurance OS/i.test(html);
            if(!brand||uniqueAssets.length<10||buildIds.length<1)throw Error('OWNER_ROOT_STABLE_IDENTITY_MISSING:'+path);
            return {title,brand,buildIds,assets:uniqueAssets};
          }
          const first=fingerprint(fileA),second=fingerprint(fileB);
          if(JSON.stringify(first)!==JSON.stringify(second))throw Error('OWNER_ROOT_PREDEPLOY_STRUCTURAL_VARIANCE');
          fs.writeFileSync(out,JSON.stringify({phase,rawHashes:[sha(fileA),sha(fileB)],rawByteStable:sha(fileA)===sha(fileB),fingerprint:first},null,2)+'\n');
          NODE
          node "$RUNNER_TEMP/gi-owner-root-fingerprint.js" before "$RUNNER_TEMP/gi-owner-before-1.html" "$RUNNER_TEMP/gi-owner-before-2.html" "$RUNNER_TEMP/gi-owner-identity-before.json"
          node - <<'NODE'
          const fs=require('node:fs');
          for(const p of ['gi-live-build-before.json','gi-owner-build-before.json']){
            const v=JSON.parse(fs.readFileSync(process.env.RUNNER_TEMP+'/'+p,'utf8'));
            if(!v.buildId||!v.sourceSha)throw Error('LIVE_BUILD_IDENTITY_INVALID:'+p);
          }
          if(!fs.readFileSync(process.env.RUNNER_TEMP+'/gi-owner-runtime-before.js','utf8').includes('scopedReadPreviewCandidate'))throw Error('OWNER_RUNTIME_CONFIG_IDENTITY_MISSING');
          NODE
"""
s=regex_once(s,r"      - name: Snapshot both public LIVE entrypoints before preview\n[\s\S]*?(?=\n      - name: Resolve pre-existing LAB-only account and pinned Firebase CLI)",snapshot,'SNAPSHOT_STEP')

verify="""      - name: Verify served bytes and unchanged LIVE identities
        env:
          PREVIEW_URL: ${{ steps.deploy.outputs.url }}
        run: |
          set -euo pipefail
          ROOT="$RUNNER_TEMP/gi-preview-package/bundle/site"
          for rel in index.html __recovery__/build.json product-runtime-config.js modules/inicio.js modules/equipo.js modules/insights.js modules/portal.js core/legal.js data/store-firestore-product-readonly-p0.js modules/cobros.js modules/plantillas.js core/product-app-p0.js core/queries.js; do
            curl --fail --silent --show-error --location --retry 2 --max-time 30 "$PREVIEW_URL/$rel" > "$RUNNER_TEMP/gi-served-$(basename "$rel")"
            cmp "$ROOT/$rel" "$RUNNER_TEMP/gi-served-$(basename "$rel")"
          done
          export META_FILE="$RUNNER_TEMP/gi-served-build.json"
          node - <<'NODE'
          const fs=require('node:fs');
          const meta=JSON.parse(fs.readFileSync(process.env.META_FILE,'utf8'));
          if(meta.sourceSha!==process.env.EXACT_SOURCE_SHA||meta.gate!=='I6.5-B4-003')throw Error('SERVED_SOURCE_MISMATCH');
          NODE
          curl --fail --silent --show-error --location --retry 2 --max-time 30 https://ays-orbit-360-lab.web.app/ > "$RUNNER_TEMP/gi-live-after.html"
          curl --fail --silent --show-error --location --retry 2 --max-time 30 https://ays-orbit-360-lab.web.app/__recovery__/build.json > "$RUNNER_TEMP/gi-live-build-after.json"
          for n in 1 2; do
            curl --fail --silent --show-error --location --retry 2 --max-time 30 -D "$RUNNER_TEMP/gi-owner-after-$n.headers" https://app.aysseguros.com/ > "$RUNNER_TEMP/gi-owner-after-$n.html"
          done
          curl --fail --silent --show-error --location --retry 2 --max-time 30 https://app.aysseguros.com/__recovery__/build.json > "$RUNNER_TEMP/gi-owner-build-after.json"
          curl --fail --silent --show-error --location --retry 2 --max-time 30 https://app.aysseguros.com/product-runtime-config.js > "$RUNNER_TEMP/gi-owner-runtime-after.js"
          cmp "$RUNNER_TEMP/gi-live-before.html" "$RUNNER_TEMP/gi-live-after.html"
          cmp "$RUNNER_TEMP/gi-live-build-before.json" "$RUNNER_TEMP/gi-live-build-after.json"
          cmp "$RUNNER_TEMP/gi-owner-build-before.json" "$RUNNER_TEMP/gi-owner-build-after.json"
          cmp "$RUNNER_TEMP/gi-owner-runtime-before.js" "$RUNNER_TEMP/gi-owner-runtime-after.js"
          node "$RUNNER_TEMP/gi-owner-root-fingerprint.js" after "$RUNNER_TEMP/gi-owner-after-1.html" "$RUNNER_TEMP/gi-owner-after-2.html" "$RUNNER_TEMP/gi-owner-identity-after.json"
          node - <<'NODE'
          const fs=require('node:fs'),crypto=require('node:crypto');
          const read=p=>JSON.parse(fs.readFileSync(process.env.RUNNER_TEMP+'/'+p,'utf8'));
          const before=read('gi-owner-identity-before.json'),after=read('gi-owner-identity-after.json');
          if(JSON.stringify(before.fingerprint)!==JSON.stringify(after.fingerprint))throw Error('OWNER_ROOT_STRUCTURAL_IDENTITY_CHANGED');
          const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(process.env.RUNNER_TEMP+'/'+p)).digest('hex');
          const report={schema:'GRAVICENTRA_OWNER_LIVE_IDENTITY_READBACK_V1',labLiveRootExact:true,labLiveBuildExact:true,ownerBuildExact:true,ownerRuntimeExact:true,ownerRootStructuralExact:true,ownerRootRawByteStableBefore:before.rawByteStable,ownerRootRawByteStableAfter:after.rawByteStable,ownerRootRawHashesBefore:before.rawHashes,ownerRootRawHashesAfter:after.rawHashes,ownerBuildSha256:hash('gi-owner-build-after.json'),ownerRuntimeSha256:hash('gi-owner-runtime-after.js'),previewSource:process.env.EXACT_SOURCE_SHA,previewUrl:process.env.PREVIEW_URL,livePromotion:false};
          fs.writeFileSync(process.env.RUNNER_TEMP+'/gi-live-identity-readback.json',JSON.stringify(report,null,2)+'\n');
          fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,'Owner root raw bytes stable before: '+before.rawByteStable+'\nOwner root raw bytes stable after: '+after.rawByteStable+'\nOwner stable build/runtime/structural identity: PASS\n');
          NODE
          printf '%s\n' "I6.5/B4-003 cumulative source/byte/readback PASS" "Source: $EXACT_SOURCE_SHA" "Preview: $PREVIEW_URL" "LAB LIVE exact; owner build/runtime/structural identity unchanged. No Functions/Rules/Auth/IAM/data mutation." "Authenticated multi-role full-UAT still pending; B4-003 production HOLD." >> "$GITHUB_STEP_SUMMARY"

      - name: Preserve LIVE identity readback evidence
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: gi-b4003-live-identity-readback-${{ github.run_id }}
          path: |
            ${{ runner.temp }}/gi-live-identity-readback.json
            ${{ runner.temp }}/gi-owner-identity-before.json
            ${{ runner.temp }}/gi-owner-identity-after.json
            ${{ runner.temp }}/gi-owner-before-1.headers
            ${{ runner.temp }}/gi-owner-before-2.headers
            ${{ runner.temp }}/gi-owner-after-1.headers
            ${{ runner.temp }}/gi-owner-after-2.headers
          retention-days: 7
          if-no-files-found: warn
"""
s=regex_once(s,r"      - name: Verify served bytes and unchanged LIVE roots\n[\s\S]*\Z",verify,'VERIFY_STEP')
WF.write_text(s,encoding='utf8')
run('git','diff','--check','--',str(WF))
print(json.dumps({'status':'OWNER_LIVE_READBACK_ROOTFIX_PREPARED','beforeBlob':EXPECTED_BEFORE,'afterBlob':blob(WF),'workflow':str(WF.relative_to(ROOT))}))
