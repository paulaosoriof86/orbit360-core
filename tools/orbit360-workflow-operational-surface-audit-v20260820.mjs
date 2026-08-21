#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd(),DIR=path.join(ROOT,'.github/workflows');
const CANONICAL='.github/workflows/orbit360-continuity-canonical-source-only-v20260820.yml';
const files=fs.existsSync(DIR)?fs.readdirSync(DIR).filter(f=>/\.ya?ml$/i.test(f)).sort():[],offenders=[],inspected=[];
for(const name of files){const rel='.github/workflows/'+name,text=fs.readFileSync(path.join(DIR,name),'utf8'),signals=[];
 if(/permissions\s*:[\s\S]{0,600}?contents\s*:\s*write\b/i.test(text))signals.push('contents:write');
 if(/permissions\s*:[\s\S]{0,600}?actions\s*:\s*write\b/i.test(text))signals.push('actions:write');
 if(/\bgit\s+push\b/i.test(text))signals.push('git-push');
 if(/\bgit\s+commit\b/i.test(text))signals.push('local-git-commit');
 if(/\bgit\s+pull\s+--rebase\b/i.test(text))signals.push('git-pull-rebase');
 if(/\bgh\s+pr\s+(edit|merge|close|reopen)\b/i.test(text))signals.push('gh-pr-mutation');
 if(/\bgh\s+workflow\s+run\b/i.test(text)||/\/actions\/workflows\/[^\s"']+\/dispatches/i.test(text))signals.push('workflow-dispatch');
 if(/\/repos\/[^\s"']+\/contents\//i.test(text)&&/(PUT|DELETE|create-or-update-file|delete-file)/i.test(text))signals.push('contents-api-mutation');
 if(/\/git\/refs\//i.test(text)&&/(PATCH|POST)/i.test(text))signals.push('git-ref-api-mutation');
 const unique=[...new Set(signals)], decisive=unique.filter(x=>['contents:write','actions:write','git-push','gh-pr-mutation','workflow-dispatch','contents-api-mutation','git-ref-api-mutation'].includes(x));
 if(unique.length)inspected.push({path:rel,signals:unique,decisive});
 if(rel!==CANONICAL&&decisive.length)offenders.push({path:rel,signals:unique,decisive});
}
const result={schemaVersion:'orbit360-workflow-control-surface-audit-v3',ok:offenders.length===0,status:offenders.length?'WORKFLOW_CONTROL_SURFACE_AUDIT_FAIL':'WORKFLOW_CONTROL_SURFACE_AUDIT_PASS',canonicalWorkflow:CANONICAL,totalWorkflowFiles:files.length,workflowsWithSignals:inspected.length,unauthorizedControlWorkflows:offenders.length,offenders,inspected,rule:'Only canonical continuity workflow may mutate remote branch/PR or dispatch controlled workflows. Local commits without remote publication are not physical writers.',runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};console.log(JSON.stringify(result,null,2));if(!result.ok)process.exit(41);
