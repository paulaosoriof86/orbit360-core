#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const ROOT=process.cwd(),GATE_ID=process.argv[2]||'',EXPECTED='block-auth-paula-membership-readonly-reconcile-v2-lab-v20260817',CONTRACT='14.3.0';
const REQUEST=process.env.ORBIT360_REQUEST_FILE||'.github/orbit360-requests/auth-paula-membership-readonly-reconcile-v2-lab-v20260817.json';
const EXPECTED_VERSION=process.env.ORBIT360_EXPECTED_REQUEST_VERSION||'';
const EVIDENCE=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const HASH='9b663847979724e9491e1c655da32a7cb17a5f6ed26dba352de1eb811254b23f',ADVISOR='ase-paula-osorio';
const read=rel=>JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8').replace(/^\uFEFF/,''));
function write(p){fs.mkdirSync(path.dirname(EVIDENCE),{recursive:true});fs.writeFileSync(EVIDENCE,JSON.stringify(p,null,2)+'\n');console.log(JSON.stringify(p,null,2));}
function stop(e){write({schemaVersion:'orbit360-auth-paula-membership-readonly-v2-preflight-v1',gateId:EXPECTED,contractVersion:CONTRACT,status:'STOP_RETRY',classification:'PIPELINE_MECHANISM_FAILURE',failed:1,failedCheckIds:['AUTH_PAULA_MEMBERSHIP_READONLY_V2_PREFLIGHT'],error:String(e?.message||e).slice(0,700),executionAuthorized:false,secretAccessAuthorized:false,firestoreReadAuthorized:false,writeAuthorized:false,authWriteAuthorized:false,runtimeAuthorized:false,browserAuthorized:false,deployAuthorized:false,productionAuthorized:false,containsPII:false,containsSecrets:false,ok:false});process.exit(41);}
try{
 if(GATE_ID!==EXPECTED)throw new Error('GATE_ID_MISMATCH');
 if(EXPECTED_VERSION!=='AUTH_PAULA_MEMBERSHIP_READONLY_RECONCILE_V2')throw new Error('REQUEST_VERSION_ENV_MISMATCH');
 const r=read(REQUEST);const scope={existingIdentityRead:true,membershipRead:true,teamRecordRead:true,passwordReset:false,passwordResetLink:false,passwordChange:false,directPasswordSet:false,authUserCreate:false,authUserDelete:false,firestoreWrites:false,functionsDeploy:false,hostingDeploy:false,rulesDeploy:false,browser:false,reimport:false,crmWrites:false,production:false,main:false,merge:false};
 if(r.schemaVersion!=='orbit360-auth-paula-membership-readonly-reconcile-request-v2'||r.requestVersion!=='AUTH_PAULA_MEMBERSHIP_READONLY_RECONCILE_V2'||r.gateId!==EXPECTED||r.rcId!=='RC-AYS-LAB-CANONICA-01'||r.status!=='AUTHORIZED_ONCE'||r.approved!==true||r.allowedExecutions!==1||r.consumed!==false||r.authorizationFrozen!==false||r.replayAllowed!==false||r.branch!=='ays/backend-tenant-lab-v99-20260703'||r.pullRequest!==5||r.projectId!=='ays-orbit-360-lab'||r.tenantId!=='alianzas-soluciones'||r.target?.advisorId!==ADVISOR||r.target?.emailHash!==HASH||JSON.stringify(r.scope)!==JSON.stringify(scope))throw new Error('REQUEST_CONTRACT_MISMATCH');
 const parent=execFileSync('git',['rev-parse','HEAD^'],{cwd:ROOT,encoding:'utf8'}).trim();if(r.parentHead!==parent)throw new Error('REQUEST_PARENT_HEAD_MISMATCH');
 const changed=execFileSync('git',['diff-tree','--no-commit-id','--name-only','-r','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);if(changed.length!==1||changed[0]!==REQUEST)throw new Error('REQUEST_COMMIT_NOT_EXCLUSIVE');
 write({schemaVersion:'orbit360-auth-paula-membership-readonly-v2-preflight-v1',gateId:EXPECTED,contractVersion:CONTRACT,status:'GO_GATE_CONTRACT',classification:'GO_TARGET_IDENTITY_MEMBERSHIP_CANONICAL_READONLY_RECONCILIATION',total:24,passed:24,failed:0,failedCheckIds:[],executionAuthorized:true,secretAccessAuthorized:true,firestoreReadAuthorized:true,writeAuthorized:false,authWriteAuthorized:false,passwordResetAuthorized:false,passwordResetLinkAuthorized:false,runtimeAuthorized:true,browserAuthorized:false,deployAuthorized:false,productionAuthorized:false,targetCount:1,targetAdvisorId:ADVISOR,targetEmailHash:HASH,containsPII:false,containsSecrets:false,ok:true});
}catch(e){stop(e);}
