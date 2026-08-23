#!/usr/bin/env node
'use strict';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const gate=path.join(ROOT,'tools/orbit360-control-plane-evidence-convergence-v20260822.mjs');
const args=[gate];if(process.env.ORBIT360_PR_BODY_FILE)args.push('--pr-body-file',process.env.ORBIT360_PR_BODY_FILE);else args.push('--repo-only');
const r=spawnSync(process.execPath,args,{cwd:ROOT,encoding:'utf8'});let detail={};try{detail=JSON.parse(r.stdout||'{}');}catch{}
const out={schemaVersion:'orbit360-control-plane-independent-readback-v3',ok:r.status===0&&detail.ok===true,status:r.status===0?'CONTROL_PLANE_INDEPENDENT_READBACK_PASS':'CONTROL_PLANE_INDEPENDENT_READBACK_FAIL',canonicalConvergenceStatus:detail.status||null,prBodyValidated:Boolean(process.env.ORBIT360_PR_BODY_FILE)&&detail.prBodyValidated===true,failures:detail.failures||[],stateFingerprint:detail.stateFingerprint||null,ledgerRevision:detail.ledgerRevision||null,packageRevision:detail.packageRevision||null,candidateArtifactId:detail.candidateArtifactId||null,productionRouteProgressPct:detail.productionRouteProgressPct||null,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
console.log(JSON.stringify(out,null,2));if(!out.ok)process.exit(41);
