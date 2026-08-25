#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const DIR=path.join(ROOT,'.github/workflows');
const CANONICAL='.github/workflows/orbit360-continuity-canonical-source-only-v20260820.yml';
const SNAPSHOT=String(process.env.ORBIT360_WORKFLOW_SOURCE_FILE||'').trim();
const files=fs.existsSync(DIR)?fs.readdirSync(DIR).filter(f=>/\.ya?ml$/i.test(f)).sort():[];
const offenders=[],inspected=[];
const canonicalAbs=path.join(ROOT,CANONICAL);
const canonicalRepoText=fs.existsSync(canonicalAbs)?fs.readFileSync(canonicalAbs,'utf8'):'';
let snapshotText=null,snapshotBound=true;
if(SNAPSHOT){
  const abs=path.resolve(SNAPSHOT);
  if(!fs.existsSync(abs)||!fs.statSync(abs).isFile()){offenders.push({path:CANONICAL,reason:'EXECUTING_WORKFLOW_SNAPSHOT_MISSING'});snapshotBound=false;}
  else{
    snapshotText=fs.readFileSync(abs,'utf8');
    if(snapshotText!==canonicalRepoText){offenders.push({path:CANONICAL,reason:'EXECUTING_WORKFLOW_SNAPSHOT_DRIFT'});snapshotBound=false;}
  }
}
const stepBlock=(text,id)=>{
  const rx=new RegExp(`^\\s*-\\s*id\\s*:\\s*${id}\\s*$`,'mi');
  const hit=rx.exec(text);if(!hit)return '';
  const start=hit.index;
  const rest=text.slice(start+hit[0].length);
  const next=/^\s*-\s*(?:id\s*:|name\s*:|uses\s*:)/mi.exec(rest);
  return next?text.slice(start,start+hit[0].length+next.index):text.slice(start);
};
for(const name of files){
  const rel='.github/workflows/'+name;
  const repoText=fs.readFileSync(path.join(DIR,name),'utf8');
  const text=rel===CANONICAL&&snapshotText!=null?snapshotText:repoText;
  const signals=[];
  if(/permissions\s*:[\s\S]{0,600}?contents\s*:\s*write\b/i.test(text))signals.push('contents:write');
  if(/permissions\s*:[\s\S]{0,600}?actions\s*:\s*write\b/i.test(text))signals.push('actions:write');
  if(/^\s*workflow_dispatch\s*:/mi.test(text))signals.push('workflow-dispatch-event');
  if(/^\s*workflow_run\s*:/mi.test(text))signals.push('workflow-run-event');
  if(/\bgit\s+push\b/i.test(text))signals.push('git-push');
  if(/\bgit\s+commit\b/i.test(text))signals.push('local-git-commit');
  if(/\bgit\s+pull\s+--rebase\b/i.test(text))signals.push('git-pull-rebase');
  if(/\bgh\s+workflow\s+run\b/i.test(text)||/\/actions\/workflows\/[^\s"']+\/dispatches/i.test(text))signals.push('workflow-dispatch-command');
  const unique=[...new Set(signals)],remoteMutation=unique.filter(x=>['contents:write','actions:write','git-push','workflow-dispatch-command'].includes(x)),chaining=unique.filter(x=>['actions:write','workflow-dispatch-event','workflow-run-event','workflow-dispatch-command'].includes(x));
  if(unique.length)inspected.push({path:rel,signals:unique,remoteMutation,chaining});
  if(rel!==CANONICAL&&remoteMutation.length)offenders.push({path:rel,reason:'UNAUTHORIZED_REMOTE_MUTATOR',signals:unique});
  if(chaining.length)offenders.push({path:rel,reason:'WORKFLOW_CHAINING_FORBIDDEN',signals:unique});
  if(rel===CANONICAL){
    const gate=(/^\s*-\s*id\s*:\s*gate\s*$/mi.exec(text)||{}).index,provider=(/^\s*-\s*id\s*:\s*provider\s*$/mi.exec(text)||{}).index;
    if(!text.includes('GENERIC_INTENT_ROUTER_V1'))offenders.push({path:rel,reason:'GENERIC_INTENT_ROUTER_MARKER_MISSING'});
    if(!text.includes('SINGLE_VALIDATED_PUBLICATION_TRANSACTION_V1'))offenders.push({path:rel,reason:'SINGLE_VALIDATED_PUBLICATION_TRANSACTION_MARKER_MISSING'});
    if(!text.includes("'.github/orbit360-intents/*.json'"))offenders.push({path:rel,reason:'INTENT_ONLY_TRIGGER_MISSING'});
    if(text.includes("paths:\n      - '.github/workflows/"))offenders.push({path:rel,reason:'WORKFLOW_SELF_TRANSPORT_TRIGGER_FORBIDDEN'});
    if(/F2_ARTIFACT_ID\s*:\s*['"]?\d{6,}/.test(text))offenders.push({path:rel,reason:'CANDIDATE_ARTIFACT_HARDCODED_IN_WORKFLOW'});
    if(/F2_AUTH_IDENTITY\s*:\s*[a-f0-9]{64}/.test(text))offenders.push({path:rel,reason:'AUTH_IDENTITY_HARDCODED_IN_WORKFLOW'});
    if(/\.revision\s*==\s*\d+\b/.test(text)||/productionReopeningPackage\.revision\s*==\s*\d+\b/.test(text))offenders.push({path:rel,reason:'OPERATIONAL_REVISION_HARDCODED_IN_WORKFLOW'});
    if(!(Number.isInteger(gate)&&Number.isInteger(provider)&&gate<provider))offenders.push({path:rel,reason:'SEMANTIC_GATE_PROVIDER_ORDER_INVALID'});
    const providerBlock=Number.isInteger(provider)?text.slice(provider,provider+1200):'';
    if(!/if\s*:\s*[^\n]*steps\.gate\.(outcome|outputs\.)/.test(providerBlock))offenders.push({path:rel,reason:'PROVIDER_NOT_EXPLICITLY_GATED'});
    if(!/mapfile -t CHANGED[\s\S]{0,350}test "\$\{#CHANGED\[@\]\}" = '1'/.test(text)&&!text.includes('test "${#CHANGED[@]}" = \'1\''))offenders.push({path:rel,reason:'SINGLE_INTENT_DIFF_GUARD_MISSING'});
    for(const id of ['regression_publish','control_plane_close_publish','authpublish','terminalpublish','failurepublish']){
      const block=stepBlock(text,id);
      if(!block){offenders.push({path:rel,reason:'CANONICAL_STATE_PUBLICATION_STEP_MISSING',stepId:id});continue;}
      if(!block.includes('$PUBLICATION_OWNER')||!block.includes('--publish-validated'))offenders.push({path:rel,reason:'CANONICAL_STATE_PUBLICATION_NOT_OWNED_BY_TRANSACTION_OWNER',stepId:id});
      if(/\bgit\s+(?:add|commit|push)\b/i.test(block))offenders.push({path:rel,reason:'DUPLICATE_PHYSICAL_STATE_PUBLISHER_FORBIDDEN',stepId:id});
    }
  }
}
const canonicalCount=files.filter(name=>'.github/workflows/'+name===CANONICAL).length;
if(files.length!==1||canonicalCount!==1)offenders.push({path:CANONICAL,reason:'SINGLE_WORKFLOW_INVARIANT_BROKEN',totalWorkflowFiles:files.length});
const result={
  schemaVersion:'orbit360-workflow-control-surface-audit-v8-single-validated-publication-transaction',
  ok:offenders.length===0,
  status:offenders.length?'WORKFLOW_CONTROL_SURFACE_AUDIT_FAIL':'WORKFLOW_CONTROL_SURFACE_AUDIT_PASS',
  canonicalWorkflow:CANONICAL,
  topologySemanticOwner:'tools/orbit360-workflow-operational-surface-audit-v20260820.mjs',
  executingSnapshotProvided:Boolean(SNAPSHOT),
  executingSnapshotBound:SNAPSHOT?snapshotBound:true,
  totalWorkflowFiles:files.length,
  workflowsWithSignals:inspected.length,
  unauthorizedControlWorkflows:offenders.length,
  offenders,
  inspected,
  semanticPolicy:{gateOrderByTechnicalStepIds:true,providerDependencyRequired:true,candidateHardcodingForbidden:true,authorizationHardcodingForbidden:true,operationalRevisionHardcodingForbidden:true,executingSnapshotMustEqualCanonical:true,duplicateTopologyParsersForbidden:true,singleValidatedPublicationTransactionRequired:true,duplicatePhysicalStatePublisherForbidden:true},
  runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false
};
console.log(JSON.stringify(result,null,2));if(!result.ok)process.exit(41);
