#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const ROUTER_REL='tools/orbit360-validar-gate-contracts-v20260717.mjs',ROUTER=path.join(ROOT,ROUTER_REL);
const AUTHORITY_REL='tools/orbit360-gate-contract-f2-productive-acceptance-v20260820.json',AUTHORITY=path.join(ROOT,AUTHORITY_REL);
const LIFE_REL='tools/orbit360-validator-lifecycle-contract-f2-productive-acceptance-runtime-v20260819.json',LIFE=path.join(ROOT,LIFE_REL);
const REQUEST=String(process.env.ORBIT360_REQUEST_FILE||'').trim();
const EXPECTED='F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V3';
const REQUEST_SCHEMA='orbit360-f2-productive-acceptance-runtime-browser-readonly-request-v3';
const SOURCE_PHASE='F2_PRODUCTIVE_ACCEPTANCE_SOURCE_ONLY';
const need=(v,c)=>{if(!v)throw new Error(c);};

need(REQUEST&&fs.existsSync(path.join(ROOT,REQUEST)),'F2_RUNTIME_REGISTER_REQUEST_REQUIRED');
const req=JSON.parse(fs.readFileSync(path.join(ROOT,REQUEST),'utf8'));
let life=JSON.parse(fs.readFileSync(LIFE,'utf8')),authority=JSON.parse(fs.readFileSync(AUTHORITY,'utf8'));
const runId=Number(process.env.GITHUB_RUN_ID||0);

need(req.schemaVersion===REQUEST_SCHEMA&&req.status==='RUNTIME_ATTEMPT_ACCEPTED_PREFLIGHT_PENDING'&&req.allowedExecutions===0&&req.consumed===false&&req.authorizationFrozen===true&&req.replayAllowed===false&&req.historical===false&&req.runtimeAttemptAccepted===true&&Number(req.runtimeAttemptCount)===1,'F2_RUNTIME_REGISTER_REQUEST_NOT_ACCEPTED_V3');
need(runId>0&&Number(req.runtimeRunId)===runId,'F2_RUNTIME_REGISTER_RUN_BINDING_INVALID');
need(/^[a-f0-9]{64}$/.test(String(req.authorizationIdentityDigest||'')),'F2_RUNTIME_REGISTER_AUTH_IDENTITY_REQUIRED');
need(life.gateId==='f2-productive-acceptance-exact-successor-v20260818'&&authority.gateId===life.gateId,'F2_RUNTIME_REGISTER_GATE_MISMATCH');
need(Number(life.guards?.successorCandidateArtifactId)===Number(req.candidateArtifactId)&&life.guards?.successorCandidateSourceHead===req.candidateSourceHead,'F2_RUNTIME_REGISTER_CANDIDATE_MISMATCH');
need(authority.sourcePhase===SOURCE_PHASE,'F2_RUNTIME_REGISTER_SOURCE_PHASE_AUTHORITY_INVALID');

life.currentPhase='F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY';
life.status='AUTHORIZED_ONE_SHOT_ACCEPTED_RUNTIME_REGISTERED_TRANSIENT_V3';
life.executionProfile={phase:'F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY',capabilities:{secrets:true,firestoreRead:true,writes:false,runtime:true,browser:true,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false}};
life.authorization={requiredForExecution:true,activeRequest:true,freshAuthorizationRequired:false,authorizationCarryForwardForbidden:true,nextRuntimeMaterializationAllowed:false,replayAllowed:false,request:'DYNAMIC:ORBIT360_REQUEST_FILE',authorizationIdentityDigest:req.authorizationIdentityDigest,allowedExecutions:0,consumed:false,runtimeAttemptAccepted:true,runtimeRunId:runId};
fs.writeFileSync(LIFE,JSON.stringify(life,null,2)+'\n','utf8');

authority.lifecycles.source=LIFE_REL;
authority.requestBinding={...(authority.requestBinding||{}),activeRequest:REQUEST,defaultRequest:REQUEST,requestOrdinalHasOperationalSemantics:false,historicalRequestMayBeUsedAsActiveBinding:false};
fs.writeFileSync(AUTHORITY,JSON.stringify(authority,null,2)+'\n','utf8');

let router=fs.readFileSync(ROUTER,'utf8');
const oldVersionLine="    if (request.requestVersion!==expectedRequestVersion) throw new Error('CANONICAL_REQUEST_VERSION_MISMATCH');";
const newVersionBlock=`    if (GATE_ID===F2_GATE_ID && expectedRequestVersion==='${EXPECTED}') {\n      if (request.schemaVersion!=='${REQUEST_SCHEMA}') throw new Error('CANONICAL_REQUEST_SCHEMA_MISMATCH_V3');\n    } else if (request.requestVersion!==expectedRequestVersion) throw new Error('CANONICAL_REQUEST_VERSION_MISMATCH');`;
need(router.includes(oldVersionLine),'F2_RUNTIME_REGISTER_ROUTER_VERSION_GUARD_NOT_FOUND');
router=router.replace(oldVersionLine,newVersionBlock);

const oldLine="    if (request.status!=='AUTHORIZED_ONCE'||request.allowedExecutions!==1||request.consumed!==false||request.authorizationFrozen!==false||request.replayAllowed!==false) throw new Error('CANONICAL_REQUEST_NOT_ACTIVE');";
const newBlock=`    if (GATE_ID===F2_GATE_ID && expectedRequestVersion==='${EXPECTED}') {\n      if (request.schemaVersion!=='${REQUEST_SCHEMA}'||request.status!=='RUNTIME_ATTEMPT_ACCEPTED_PREFLIGHT_PENDING'||request.allowedExecutions!==0||request.consumed!==false||request.authorizationFrozen!==true||request.replayAllowed!==false||request.historical!==false||request.runtimeAttemptAccepted!==true||Number(request.runtimeAttemptCount)!==1||Number(request.runtimeRunId)!==Number(process.env.GITHUB_RUN_ID||0)) throw new Error('CANONICAL_REQUEST_NOT_ACCEPTED_ONE_SHOT_V3');\n    } else if (request.status!=='AUTHORIZED_ONCE'||request.allowedExecutions!==1||request.consumed!==false||request.authorizationFrozen!==false||request.replayAllowed!==false) throw new Error('CANONICAL_REQUEST_NOT_ACTIVE');`;
need(router.includes(oldLine),'F2_RUNTIME_REGISTER_ROUTER_ACTIVE_REQUEST_GUARD_NOT_FOUND');
router=router.replace(oldLine,newBlock);
fs.writeFileSync(ROUTER,router,'utf8');

console.log(JSON.stringify({ok:true,status:'F2_RUNTIME_LIFECYCLE_AND_ROUTER_REGISTERED_TRANSIENT_V3',gateId:life.gateId,candidateArtifactId:req.candidateArtifactId,authorizationIdentityDigest:req.authorizationIdentityDigest,runtimeRunId:runId,runtimeAttemptAccepted:true,lifecycle:LIFE_REL,authority:AUTHORITY_REL,router:ROUTER_REL,sourcePhasePreserved:authority.sourcePhase===SOURCE_PHASE,contractVersion:life.gateContractVersion,lifecycleRevision:life.validatorLifecycleRevision,persistentSourceChanged:false},null,2));
