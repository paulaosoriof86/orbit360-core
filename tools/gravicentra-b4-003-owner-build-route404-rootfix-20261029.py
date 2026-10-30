#!/usr/bin/env python3
import pathlib,subprocess,json
ROOT=pathlib.Path.cwd()
WF=ROOT/'.github/workflows/gravicentra-b4-003-cumulative-safe-read-preview-20261029.yml'
EXPECTED='ecc856d57f8bff5bd2b17d193635967b8659583d'
def run(*args): return subprocess.run(args,cwd=ROOT,check=True,text=True,capture_output=True).stdout.strip()
def blob(p): return run('git','hash-object',str(p))
def replace_once(s,old,new,label):
    n=s.count(old)
    if n!=1: raise RuntimeError(f'{label}_MATCH_COUNT_{n}')
    return s.replace(old,new,1)
if blob(WF)!=EXPECTED: raise RuntimeError('OWNER_BUILD404_BASE_BLOB_MISMATCH:'+blob(WF))
s=WF.read_text(encoding='utf8')
s=replace_once(s,"          curl --fail --silent --show-error --location --retry 2 --max-time 30 https://app.aysseguros.com/__recovery__/build.json > \"$RUNNER_TEMP/gi-owner-build-before.json\"\n",'', 'REMOVE_OWNER_BUILD_BEFORE_CURL')
s=replace_once(s,"          for(const p of ['gi-live-build-before.json','gi-owner-build-before.json']){\n","          for(const p of ['gi-live-build-before.json']){\n",'OWNER_BUILD_PARSE_LOOP')
s=replace_once(s,"          curl --fail --silent --show-error --location --retry 2 --max-time 30 https://app.aysseguros.com/__recovery__/build.json > \"$RUNNER_TEMP/gi-owner-build-after.json\"\n",'', 'REMOVE_OWNER_BUILD_AFTER_CURL')
s=replace_once(s,"          cmp \"$RUNNER_TEMP/gi-owner-build-before.json\" \"$RUNNER_TEMP/gi-owner-build-after.json\"\n",'', 'REMOVE_OWNER_BUILD_CMP')
s=replace_once(s,"ownerBuildExact:true,ownerRuntimeExact:true,ownerRootStructuralExact:true","ownerRuntimeExact:true,ownerRootStructuralExact:true",'REMOVE_OWNER_BUILD_REPORT_FLAG')
s=replace_once(s,",ownerBuildSha256:hash('gi-owner-build-after.json'),ownerRuntimeSha256",",ownerRuntimeSha256",'REMOVE_OWNER_BUILD_REPORT_HASH')
s=replace_once(s,"LAB LIVE exact; owner build/runtime/structural identity unchanged.","LAB LIVE exact; owner runtime and structural identity unchanged.",'SUMMARY_OWNER_IDENTITY')
s=replace_once(s,"Owner stable build/runtime/structural identity: PASS","Owner stable runtime/structural identity: PASS",'STEP_SUMMARY_OWNER_IDENTITY')
WF.write_text(s,encoding='utf8')
run('git','diff','--check','--',str(WF))
print(json.dumps({'status':'OWNER_BUILD_ROUTE_404_ROOTFIX_PREPARED','beforeBlob':EXPECTED,'afterBlob':blob(WF),'workflow':str(WF.relative_to(ROOT))}))
