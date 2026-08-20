#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
const ROOT=process.cwd();
const workflowDir=path.join(ROOT,'.github/workflows');
const canonical='.github/workflows/orbit360-continuity-canonical-source-only-v20260820.yml';
const projectionTargets=['orbit360-platform/docs/orbit360-live-state-v1.json','orbit360-platform/docs/ORBIT360-CURRENT-DOCUMENTATION-INDEX-v1.json','tools/orbit360-validator-lifecycle-contract-f2-productive-acceptance-runtime-v20260819.json','orbit360-platform/docs/ORBIT360-PR5-CURRENT-STATE.md','orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json','orbit360-platform/docs/orbit360-production-reopening-package-v20260820.json'];
const files=fs.readdirSync(workflowDir).filter(f=>/\.ya?ml$/i.test(f));
const offenders=[]; const legacy=[];
for(const f of files){const rel='.github/workflows/'+f,t=fs.readFileSync(path.join(workflowDir,f),'utf8'); const touches=projectionTargets.some(p=>t.includes(p)); const writePermission=/contents:\s*write/i.test(t); const mutates=/git\s+(add|commit|push)|gh\s+pr\s+edit|create-or-update-file|curl[\s\S]{0,200}\/contents\//i.test(t); if(rel!==canonical && touches){legacy.push(rel); if(writePermission||mutates)offenders.push(rel);}}
const result={ok:offenders.length===0,status:offenders.length?'LEGACY_WORKFLOW_OPERATIONAL_SURFACE_FAIL':'LEGACY_WORKFLOW_OPERATIONAL_SURFACE_ISOLATED_PASS',canonicalWorkflow:canonical,totalWorkflowFiles:files.length,legacyProjectionReferences:legacy.length,legacyProjectionWriters:offenders.length,offenders,historyPreserved:true,physicalDeletionRequired:false,operationalIsolationRule:'Only canonical workflow may mutate continuity projections; legacy workflows may remain as historical/read-only evidence.',runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false}; console.log(JSON.stringify(result,null,2)); if(!result.ok)process.exit(41);
