#!/usr/bin/env node
'use strict';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const gate=path.join(ROOT,'tools/orbit360-control-plane-evidence-convergence-v20260822.mjs');
const r=spawnSync(process.execPath,[gate,'--repo-only'],{cwd:ROOT,encoding:'utf8'});
let detail={};try{detail=JSON.parse(r.stdout||'{}');}catch{}
const out={schemaVersion:'orbit360-control-plane-composite-invariant-v3',ok:r.status===0&&detail.ok===true,status:r.status===0?'CONTROL_PLANE_COMPOSITE_INVARIANT_PASS':'CONTROL_PLANE_COMPOSITE_INVARIANT_FAIL',canonicalConvergenceStatus:detail.status||null,failures:detail.failures||[],stateFingerprint:detail.stateFingerprint||null,ledgerRevision:detail.ledgerRevision||null,packageRevision:detail.packageRevision||null,candidateArtifactId:detail.candidateArtifactId||null,productionRouteProgressPct:detail.productionRouteProgressPct||null,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
console.log(JSON.stringify(out,null,2));if(!out.ok)process.exit(41);
