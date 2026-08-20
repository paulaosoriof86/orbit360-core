#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const ROOT=process.cwd();
const run=(args,env={})=>spawnSync(process.execPath,args,{cwd:ROOT,env:{...process.env,...env},encoding:'utf8',maxBuffer:16*1024*1024});
const failures=[]; const checks={};
function ok(name,condition,detail=''){checks[name]=condition?'PASS':'FAIL'; if(!condition)failures.push(detail||name);}
for(const file of ['tools/orbit360-continuity-transition-owner-v20260820.mjs','tools/orbit360-continuity-projection-atomic-v20260820.mjs','tools/orbit360-control-plane-composite-invariant-v20260820.mjs','tools/orbit360-store-read-amplification-synthetic-v20260820.mjs','tools/orbit360-workflow-operational-surface-audit-v20260820.mjs']){const r=run(['--check',file]);ok(`syntax:${file}`,r.status===0,r.stderr||r.stdout);}
const ledger=JSON.parse(fs.readFileSync('orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json','utf8')); const pkg=JSON.parse(fs.readFileSync('orbit360-platform/docs/orbit360-production-reopening-package-v20260820.json','utf8'));
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'orbit360-owner-')); fs.mkdirSync(path.join(temp,'orbit360-platform/docs'),{recursive:true}); fs.copyFileSync('orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json',path.join(temp,'orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json')); fs.copyFileSync('orbit360-platform/docs/orbit360-production-reopening-package-v20260820.json',path.join(temp,'orbit360-platform/docs/orbit360-production-reopening-package-v20260820.json'));
const first=run(['tools/orbit360-continuity-transition-owner-v20260820.mjs','--expected-revision',String(ledger.revision),'--expected-package-revision',String(pkg.revision),'--transition','CP03_PASS_TO_CP04'],{ORBIT360_ROOT:temp}); ok('transitionOwnerExpectedRevision',first.status===0,first.stderr||first.stdout);
const stale=run(['tools/orbit360-continuity-transition-owner-v20260820.mjs','--expected-revision',String(ledger.revision),'--expected-package-revision',String(pkg.revision),'--transition','CP03_PASS_TO_CP04'],{ORBIT360_ROOT:temp}); ok('transitionOwnerRejectsStaleRevision',stale.status!==0&&String(stale.stderr+stale.stdout).includes('EXPECTED_REVISION_MISMATCH'),'STALE_REVISION_NOT_REJECTED');
const projectedLedger=JSON.parse(fs.readFileSync(path.join(temp,'orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json'),'utf8')); ok('transitionRevisionExactlyOnce',projectedLedger.revision===ledger.revision+1,'REVISION_INCREMENT_NOT_EXACTLY_ONE');
fs.rmSync(temp,{recursive:true,force:true});
const perf=run(['tools/orbit360-store-read-amplification-synthetic-v20260820.mjs']); ok('storeAmplificationSynthetic',perf.status===0,perf.stderr||perf.stdout);
const surface=run(['tools/orbit360-workflow-operational-surface-audit-v20260820.mjs']); ok('workflowOperationalSurface',surface.status===0,surface.stderr||surface.stdout);
const composite=run(['tools/orbit360-control-plane-composite-invariant-v20260820.mjs']); ok('compositeInvariant',composite.status===0,composite.stderr||composite.stdout);
const wf=fs.readFileSync('.github/workflows/orbit360-continuity-canonical-source-only-v20260820.yml','utf8'); ok('workflowNoPullRebase',!/git\s+pull\s+--rebase/i.test(wf),'WORKFLOW_PULL_REBASE_PRESENT'); ok('workflowCAS',wf.includes('START_HEAD')&&wf.includes('REMOTE_HEAD')&&wf.includes('git fetch origin')&&wf.includes('test "$REMOTE_HEAD" = "$START_HEAD"'),'WORKFLOW_CAS_MISSING');
const result={schemaVersion:'orbit360-production-reopening-integrated-audit-v1',ok:failures.length===0,status:failures.length?'PRODUCTION_REOPENING_INTEGRATED_SOURCE_ONLY_AUDIT_FAIL':'PRODUCTION_REOPENING_INTEGRATED_SOURCE_ONLY_AUDIT_PASS',checks,failures,ledgerRevision:ledger.revision,packageRevision:pkg.revision,candidateArtifactId:ledger.successorCandidate?.artifactId,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,publicationExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
console.log(JSON.stringify(result,null,2)); if(!result.ok)process.exit(41);
