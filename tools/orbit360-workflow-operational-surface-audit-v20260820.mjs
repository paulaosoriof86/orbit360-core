#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const DIR=path.join(ROOT,'.github/workflows');
const CANONICAL='.github/workflows/orbit360-continuity-canonical-source-only-v20260820.yml';
const files=fs.existsSync(DIR)?fs.readdirSync(DIR).filter(f=>/\.ya?ml$/i.test(f)).sort():[];
const offenders=[];
const inspected=[];
for(const name of files){
  const rel='.github/workflows/'+name;
  const text=fs.readFileSync(path.join(DIR,name),'utf8');
  const signals=[];
  if(/permissions\s*:[\s\S]{0,500}?contents\s*:\s*write\b/i.test(text))signals.push('contents:write');
  if(/\bgit\s+push\b/i.test(text))signals.push('git-push');
  if(/\bgit\s+commit\b/i.test(text))signals.push('git-commit');
  if(/\bgit\s+pull\s+--rebase\b/i.test(text))signals.push('git-pull-rebase');
  if(/\bgh\s+pr\s+(edit|merge|close|reopen)\b/i.test(text))signals.push('gh-pr-mutation');
  if(/\/repos\/[^\s"']+\/contents\//i.test(text)&&/(PUT|DELETE|create-or-update-file|delete-file)/i.test(text))signals.push('contents-api-mutation');
  if(/\/git\/refs\//i.test(text)&&/(PATCH|POST)/i.test(text))signals.push('git-ref-api-mutation');
  if(/\bgit\s+reset\s+--hard\b/i.test(text)&&/origin\//i.test(text))signals.push('remote-reset');
  const unique=[...new Set(signals)];
  if(unique.length)inspected.push({path:rel,signals:unique});
  if(rel!==CANONICAL&&unique.length)offenders.push({path:rel,signals:unique});
}
const result={
  schemaVersion:'orbit360-workflow-physical-writer-audit-v2',
  ok:offenders.length===0,
  status:offenders.length?'WORKFLOW_PHYSICAL_WRITER_AUDIT_FAIL':'WORKFLOW_PHYSICAL_WRITER_AUDIT_PASS',
  canonicalWorkflow:CANONICAL,
  totalWorkflowFiles:files.length,
  mutationCapableWorkflowFiles:inspected.length,
  unauthorizedPhysicalWriters:offenders.length,
  offenders,
  inspected,
  rule:'Only the canonical continuity workflow may mutate the Git branch or PR. Runtime, observers, candidate builders and diagnostics must publish artifacts/status only.',
  runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false
};
console.log(JSON.stringify(result,null,2));
if(!result.ok)process.exit(41);
