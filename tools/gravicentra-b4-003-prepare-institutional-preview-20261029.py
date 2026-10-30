#!/usr/bin/env python3
import pathlib,re,subprocess,json
ROOT=pathlib.Path.cwd()
WF=ROOT/'.github/workflows/gravicentra-b4-003-cumulative-safe-read-preview-20261029.yml'
EXPECTED_BEFORE='b7581f77de5243fd3327b0679bb057041d34313c'

def run(*args): return subprocess.run(args,cwd=ROOT,check=True,text=True,capture_output=True).stdout.strip()
def blob(p): return run('git','hash-object',str(p))
def sub1(text,pattern,repl,label,flags=0):
    out,n=re.subn(pattern,repl,text,count=1,flags=flags)
    if n!=1: raise RuntimeError(f'{label}_MATCH_COUNT_{n}')
    return out

if blob(WF)!=EXPECTED_BEFORE: raise RuntimeError('PREVIEW_WORKFLOW_BASE_BLOB_MISMATCH:'+blob(WF))
s=WF.read_text(encoding='utf8')
new_block="""          const S=C.b4003InstitutionalGoalsSourceSuccessor20261029;
          need(S&&S.gate==='I6.5/B4-003'&&
           S.status==='SOURCE_SUCCESSOR_ATOMIC_PREVIEW_PENDING_AUTHENTICATED_UAT'&&
           S.findingId==='B4-003-P0-20261012-INSTITUTIONAL-GOALS'&&
           S.previewAuthorizedAfterGuardAndRegressionPass===true&&
           S.productionPromotionAuthorized===false&&
           S.rulesAuthIamDataChangesAuthorized===false&&
           S.securityB4003StillHold===true,'CONTROL_PLANE_INSTITUTIONAL_GOALS_PREVIEW_AUTHORITY_REQUIRED');
          need(C.repository===process.env.GITHUB_REPOSITORY&&
           C.branch===process.env.GITHUB_REF_NAME,'REPOSITORY_BRANCH_MISMATCH');
          need(git('rev-parse','HEAD')===process.env.TRANSPORT_SHA,'TRANSPORT_HEAD_MISMATCH');
          need(git('show','-s','--format=%s','HEAD')===
           'build(i6.5 B4-003): trigger cumulative safe-read isolated Preview only','TRANSPORT_SUBJECT_MISMATCH');
          need(git('diff','--name-only','HEAD^','HEAD')===workflowPath,'TRANSPORT_MUST_CHANGE_ONLY_EXISTING_WORKFLOW');
          const source=git('rev-parse','HEAD^');
          const productCommit=git('log','-1','--format=%H','--',S.productPath);
          need(/^[0-9a-f]{40}$/.test(source)&&/^[0-9a-f]{40}$/.test(productCommit)&&
           source!==process.env.TRANSPORT_SHA&&
           git('merge-base',productCommit,source)===productCommit&&
           git('rev-parse',productCommit+'^')===S.parentHead,
           'EXACT_INSTITUTIONAL_GOALS_SOURCE_ANCESTRY_REQUIRED');
          need(git('diff','--name-only',source,'HEAD')===workflowPath,
           'SOURCE_TO_TRANSPORT_MUST_CHANGE_ONLY_EXISTING_WORKFLOW');
          const R=JSON.parse(fs.readFileSync(S.receiptPath,'utf8'));
          need(git('hash-object',S.receiptPath)===S.receiptBlobSha&&
           R.schema==='GRAVICENTRA_I65_B4003_INSTITUTIONAL_GOALS_SOURCE_SUCCESSOR_V1'&&
           R.gate===S.gate&&R.status===S.status&&R.parentHead===S.parentHead&&
           R.repository===C.repository&&R.branch===C.branch,'INSTITUTIONAL_GOALS_RECEIPT_MISMATCH');
          need(R.boundaries?.previewOnly===true&&R.boundaries.livePromotion===false&&
           R.boundaries.operationalWrites===false&&R.boundaries.dataImport===false&&
           R.boundaries.authIamRulesChange===false&&R.boundaries.freelancerContractInvented===false&&
           R.boundaries.freelancerFindingClosed===false&&R.boundaries.acceptanceGranted===false&&
           R.boundaries.securityB4003StillHold===true,'INSTITUTIONAL_GOALS_BOUNDARY_MISMATCH');
          const expected=(S.atomicCommitPaths||[]).slice().sort();
          const actual=git('diff','--name-only',S.parentHead,productCommit).split(/\\r?\\n/).filter(Boolean).sort();
          need(expected.length===5&&JSON.stringify(expected)===JSON.stringify(actual)&&
           JSON.stringify(expected)===JSON.stringify((R.atomicCommitPaths||[]).slice().sort()),
           'INSTITUTIONAL_GOALS_ATOMIC_SOURCE_PATHS_MISMATCH');
          need(S.productPath==='orbit360-platform/modules/equipo.js'&&
           R.source?.path===S.productPath&&R.source.beforeBlob===S.beforeBlob&&R.source.afterBlob===S.afterBlob&&
           git('rev-parse',S.parentHead+':'+S.productPath)===S.beforeBlob&&
           git('rev-parse',productCommit+':'+S.productPath)===S.afterBlob&&
           git('rev-parse',source+':'+S.productPath)===S.afterBlob,
           'INSTITUTIONAL_GOALS_PRODUCT_BLOB_MISMATCH');
          need(S.regressionPath===R.regression.path&&S.regressionBlob===R.regression.blob&&
           git('rev-parse',productCommit+':'+S.regressionPath)===S.regressionBlob&&
           git('rev-parse',source+':'+S.regressionPath)===S.regressionBlob&&
           R.regression.checks===15&&R.regression.syntheticOnly===true&&
           R.regression.realBusinessWrites===0&&R.regression.firestoreAccess===0,
           'INSTITUTIONAL_GOALS_REGRESSION_BINDING_MISMATCH');
          const postProduct=git('diff','--name-only',productCommit,source).split(/\\r?\\n/).filter(Boolean);
          need(postProduct.every(p=>!p.startsWith('orbit360-platform/')&&!p.startsWith('functions/')),
           'PRODUCT_SOURCE_CHANGED_AFTER_INSTITUTIONAL_GOALS_COMMIT:'+postProduct.filter(p=>p.startsWith('orbit360-platform/')||p.startsWith('functions/')).join(','));
          need(S.currentCapabilityAcceptances===0&&S.securityB4003StillHold===true,
           'INSTITUTIONAL_GOALS_ACCEPTANCE_BOUNDARY_MISMATCH');
          fs.appendFileSync(process.env.GITHUB_ENV,'EXACT_SOURCE_SHA='+source+'\\n');
          fs.writeFileSync(process.env.RUNNER_TEMP+'/gi-authorized-source.sha',source+'\\n');
          fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
           'Preview authority: CONTROL_PLANE.b4003InstitutionalGoalsSourceSuccessor20261029\\n'+
           'Product commit: '+productCommit+'\\nSource to build: '+source+'\\nTransport-only commit: '+process.env.TRANSPORT_SHA+'\\n');
          console.log('AUTHORIZED_EXACT_INSTITUTIONAL_GOALS_SOURCE='+source);"""
s=sub1(s,r"          const S=C\.b4003CloseoutSourceSuccessor20261029;[\s\S]*?          console\.log\('AUTHORIZED_EXACT_CLOSEOUT_SOURCE='\+source\);",new_block,'AUTHORITY_BLOCK')
s=sub1(s,r"          node tools/gravicentra-b4-003-closeout-source-successor\.test\.cjs", "          node tools/gravicentra-b4-003-institutional-goals-owner.test.cjs\n          node tools/gravicentra-b4-003-closeout-source-successor.test.cjs",'TEST_INSERT')
s=sub1(s,r"'modules/inicio\.js','modules/insights\.js'", "'modules/inicio.js','modules/equipo.js','modules/insights.js'",'PACKAGE_EQUIPO')
s=sub1(s,r"index\.html __recovery__/build\.json product-runtime-config\.js modules/inicio\.js modules/insights\.js", "index.html __recovery__/build.json product-runtime-config.js modules/inicio.js modules/equipo.js modules/insights.js",'READBACK_EQUIPO')
WF.write_text(s,encoding='utf8')
run('python3','-c',"import yaml,sys; yaml.safe_load(open(sys.argv[1]))",str(WF)) if False else None
run('git','diff','--check','--',str(WF))
run('git','config','user.name','gravicentra-release-bot')
run('git','config','user.email','gravicentra-release-bot@users.noreply.github.com')
run('git','add',str(WF))
changed=run('git','diff','--cached','--name-only').splitlines()
if changed!=[str(WF.relative_to(ROOT))]: raise RuntimeError('TRANSPORT_PATCH_SCOPE_INVALID:'+json.dumps(changed))
run('git','commit','-m','build(i6.5 B4-003): trigger cumulative safe-read isolated Preview only')
commit=run('git','rev-parse','HEAD')
print(json.dumps({'status':'TRANSPORT_COMMIT_READY','commit':commit,'workflowBlob':blob(WF)}))
