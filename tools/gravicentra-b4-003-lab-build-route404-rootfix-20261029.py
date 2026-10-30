#!/usr/bin/env python3
import pathlib,subprocess,json
ROOT=pathlib.Path.cwd()
WF=ROOT/'.github/workflows/gravicentra-b4-003-cumulative-safe-read-preview-20261029.yml'
EXPECTED='b0477e3b63cdc7666c574db19249e24dc5283327'
def run(*args): return subprocess.run(args,cwd=ROOT,check=True,text=True,capture_output=True).stdout.strip()
def blob(p): return run('git','hash-object',str(p))
def replace_once(s,old,new,label):
    n=s.count(old)
    if n!=1: raise RuntimeError(f'{label}_MATCH_COUNT_{n}')
    return s.replace(old,new,1)
if blob(WF)!=EXPECTED: raise RuntimeError('LAB_BUILD404_BASE_BLOB_MISMATCH:'+blob(WF))
s=WF.read_text(encoding='utf8')
s=replace_once(s,"          curl --fail --silent --show-error --location --retry 2 --max-time 30 https://ays-orbit-360-lab.web.app/__recovery__/build.json > \"$RUNNER_TEMP/gi-live-build-before.json\"\n",'', 'REMOVE_LAB_BUILD_BEFORE_CURL')
s=replace_once(s,"""          node - <<'NODE'
          const fs=require('node:fs');
          for(const p of ['gi-live-build-before.json']){
            const v=JSON.parse(fs.readFileSync(process.env.RUNNER_TEMP+'/'+p,'utf8'));
            if(!v.buildId||!v.sourceSha)throw Error('LIVE_BUILD_IDENTITY_INVALID:'+p);
          }
          if(!fs.readFileSync(process.env.RUNNER_TEMP+'/gi-owner-runtime-before.js','utf8').includes('scopedReadPreviewCandidate'))throw Error('OWNER_RUNTIME_CONFIG_IDENTITY_MISSING');
          NODE
""","""          node - <<'NODE'
          const fs=require('node:fs');
          if(!fs.readFileSync(process.env.RUNNER_TEMP+'/gi-owner-runtime-before.js','utf8').includes('scopedReadPreviewCandidate'))throw Error('OWNER_RUNTIME_CONFIG_IDENTITY_MISSING');
          NODE
""",'REMOVE_LAB_BUILD_PARSE')
s=replace_once(s,"          curl --fail --silent --show-error --location --retry 2 --max-time 30 https://ays-orbit-360-lab.web.app/__recovery__/build.json > \"$RUNNER_TEMP/gi-live-build-after.json\"\n",'', 'REMOVE_LAB_BUILD_AFTER_CURL')
s=replace_once(s,"          cmp \"$RUNNER_TEMP/gi-live-build-before.json\" \"$RUNNER_TEMP/gi-live-build-after.json\"\n",'', 'REMOVE_LAB_BUILD_CMP')
s=replace_once(s,"labLiveRootExact:true,labLiveBuildExact:true,ownerRuntimeExact:true","labLiveRootExact:true,ownerRuntimeExact:true",'REMOVE_LAB_BUILD_REPORT_FLAG')
s=replace_once(s,"LAB LIVE exact; owner runtime and structural identity unchanged.","LAB LIVE root exact; owner runtime and structural identity unchanged.",'SUMMARY_LAB_IDENTITY')
WF.write_text(s,encoding='utf8')
run('git','diff','--check','--',str(WF))
print(json.dumps({'status':'LAB_BUILD_ROUTE_404_ROOTFIX_PREPARED','beforeBlob':EXPECTED,'afterBlob':blob(WF),'workflow':str(WF.relative_to(ROOT))}))
