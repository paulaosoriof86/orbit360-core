#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const plan='orbit360-platform/docs/PLAN-MAESTRO-CONGELADO-DEFINITIVO-RUTA-PRODUCCION-ORBIT360-AYS-20260821.md';
const allowed=new Set([
  plan,
  'orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json',
  'orbit360-platform/docs/orbit360-production-reopening-package-v20260820.json',
  'orbit360-platform/docs/orbit360-f2-runtime-authorization-boundary-v20260820.json',
  'orbit360-platform/docs/orbit360-live-state-v1.json',
  'orbit360-platform/docs/ORBIT360-CURRENT-DOCUMENTATION-INDEX-v1.json',
  'orbit360-platform/docs/ORBIT360-PR5-CURRENT-STATE.md',
  'orbit360-platform/docs/CHECKPOINT-CONTROL-PLANE-HARDENING-20260820.md',
  'README.md',
  'orbit360-platform/CHANGELOG.md'
]);
const historicalMarker=/\b(HISTORICAL|HIST[ÓO]RICO|SUPERSEDED|SUPERADO|ARCHIVED|ARCHIVO HIST[ÓO]RICO)\b/i;
const stateMarker=/(ESTADO\s+VIVO|ESTADO\s+OPERATIVO|AUTORIDAD\s+(DE\s+)?REANUDACI[ÓO]N|PLAN\s+(VIVO|VIGENTE)|\bVIGENTE\b|nextActionExact|nextAction|firstIncompleteStep|activeBlock|CURRENT_BINDING|CANONICAL_CURRENT|estado\s+actual)/i;
const candidates=[];
function add(rel){
  const abs=path.join(ROOT,rel); if(!fs.existsSync(abs)||!fs.statSync(abs).isFile())return;
  const txt=fs.readFileSync(abs,'utf8').replace(/^\uFEFF/,'');
  if(!stateMarker.test(txt))return;
  const implicitlyHistorical=/20260[1-7]\d{2}/.test(rel)||/202608(?:0\d|1\d|20)(?!\d)/.test(rel);
  const isAllowed=allowed.has(rel);
  const markedHistorical=historicalMarker.test(txt)||implicitlyHistorical;
  candidates.push({path:rel,isAllowed,markedHistorical});
}
for(const rel of ['README.md','orbit360-platform/CHANGELOG.md'])add(rel);
const docsDir=path.join(ROOT,'orbit360-platform/docs');
if(fs.existsSync(docsDir)){
  for(const ent of fs.readdirSync(docsDir,{withFileTypes:true})){
    if(!ent.isFile()||!/(\.md|\.json|\.txt)$/i.test(ent.name))continue;
    add('orbit360-platform/docs/'+ent.name);
  }
}
const offenders=candidates.filter(x=>!x.isAllowed&&!x.markedHistorical);
const result={schemaVersion:'orbit360-documentation-state-discovery-v1',ok:offenders.length===0,status:offenders.length?'DOCUMENTATION_STATE_DISCOVERY_FAIL':'DOCUMENTATION_STATE_DISCOVERY_PASS',canonicalPlan:plan,stateBearingFiles:candidates.length,allowedCurrentFiles:candidates.filter(x=>x.isAllowed).map(x=>x.path),historicalStateFiles:candidates.filter(x=>!x.isAllowed&&x.markedHistorical).map(x=>x.path),offenders:offenders.map(x=>x.path),rule:'A non-canonical state-bearing document must be historical/superseded. Only allowlisted generated projections and the frozen 20260821 plan may express current operational state.',runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
console.log(JSON.stringify(result,null,2));
if(!result.ok)process.exit(41);
