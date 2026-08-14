#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const REQUEST_ENV=String(process.env.ORBIT360_REQUEST_FILE||'').trim();
const RESUME=String(process.env.ORBIT360_RESUME_FILE||'').trim();
const SOURCE=String(process.env.ORBIT360_SOURCE_HEAD||'').trim();
const BRANCH=String(process.env.ORBIT360_BRANCH||'').trim();
const PROJECT=String(process.env.ORBIT360_PRODUCT_PROJECT_ID||'').trim();
const TENANT=String(process.env.ORBIT360_PRODUCT_TENANT_ID||'').trim();
const URL=String(process.env.ORBIT360_PRODUCT_URL||'').trim();
const ARTIFACT=String(process.env.ORBIT360_PRODUCT_ARTIFACT||'').trim();
const fail=(code,detail='')=>{throw new Error(`${code}${detail?`:${detail}`:''}`)};
const json=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const ancestor=(a,b='HEAD')=>{try{execFileSync('git',['merge-base','--is-ancestor',a,b],{stdio:'ignore'});return true;}catch{return false;}};
const changedAt=sha=>git('diff-tree','--no-commit-id','--name-only','-r',sha).split(/\r?\n/).filter(Boolean);
const changed=git('diff','--name-only','HEAD^','HEAD').split(/\r?\n/).filter(Boolean);
if(changed.length!==1)fail('PRODUCTION_TRIGGER_FILE_COUNT_INVALID',String(changed.length));
const trigger=changed[0];
if(!RESUME||!SOURCE||!BRANCH||!PROJECT||!TENANT||!URL||!ARTIFACT)fail('PRODUCTION_GUARD_CONTEXT_INCOMPLETE');
let requestPath=REQUEST_ENV,requestCommit='',requestReused=false,newRequestCreated=false,previousDeployCount=0;
if(trigger===RESUME){
 if(!fs.existsSync(RESUME))fail('PRODUCTION_RESUME_MISSING');
 const m=json(RESUME),bad=[];
 if(m.schemaVersion!=='orbit360-fase-a-production-resume-v3')bad.push('resumeSchema');
 if(m.resumeAllowed!==true||m.newRequestCreated!==true||m.requestReused!==false||m.secondForwardDeployAllowed!==false)bad.push('resumeSafety');
 if(m.previousDeployCount!==0||m.forwardDeployBudget!==1)bad.push('resumeBudget');
 if(m.priorFailedProductionRunId!==31763649841||m.priorRollbackSafe!==true)bad.push('priorRollbackEvidence');
 if(m.rootCauseClosed!=='PRODUCT_ARTIFACT_ENTRYPOINT_GAP')bad.push('rootCauseClosure');
 if(m.sourcePreflightRunId!==31772635572||m.sourcePreflightStatus!=='SUCCESS')bad.push('sourceClosureEvidence');
 if(typeof m.requestFile!=='string'||!m.requestFile.startsWith('.github/orbit360-requests/'))bad.push('requestFile');
 if(typeof m.requestCommit!=='string'||m.requestCommit.length<12)bad.push('requestCommit');
 if(bad.length)fail('PRODUCTION_RESUME_V3_FAIL',bad.join(','));
 requestPath=m.requestFile;requestCommit=m.requestCommit;requestReused=false;newRequestCreated=true;previousDeployCount=0;
 if(!fs.existsSync(requestPath))fail('PRODUCTION_REQUEST_MISSING',requestPath);
 if(!ancestor(requestCommit,'HEAD'))fail('PRODUCTION_REQUEST_COMMIT_NOT_ANCESTOR');
 const requestChanged=changedAt(requestCommit);
 if(requestChanged.length!==1||requestChanged[0]!==requestPath)fail('PRODUCTION_REQUEST_COMMIT_NOT_IMMUTABLE');
}else if(trigger===REQUEST_ENV){
 requestPath=REQUEST_ENV;requestCommit='HEAD';requestReused=false;newRequestCreated=true;previousDeployCount=0;
}else fail('PRODUCTION_TRIGGER_UNSUPPORTED',trigger);
if(!requestPath||!fs.existsSync(requestPath))fail('PRODUCTION_REQUEST_MISSING');
const r=json(requestPath),bad=[];
if(r.schemaVersion!=='orbit360-fase-a-production-go-live-request-v1')bad.push('schema');
if(r.branch!==BRANCH||r.sourceHead!==SOURCE)bad.push('sourceBinding');
if(r.approved!==true||r.authorizedByUser!==true||r.allowedExecutions!==1||r.consumed!==false||r.authorizationFrozen!==false||r.replayAllowed!==false)bad.push('authorization');
if(r.hostingDeployAuthorized!==true||r.browserAuthorized!==true||r.rollbackAuthorized!==true||r.productionAuthorized!==true)bad.push('capabilities');
if(r.firestoreWritesAuthorized!==0||r.authWritesAuthorized!==0||r.operationalWritesAuthorized!==0||r.reimportAuthorized!==false||r.functionsDeployAuthorized!==false||r.rulesDeployAuthorized!==false||r.mainAuthorized!==false||r.mergeAuthorized!==false||r.hostdimeRequired!==false)bad.push('scope');
if(r.target?.projectId!==PROJECT||r.target?.tenantId!==TENANT||r.target?.liveUrl!==URL||r.target?.artifact!==ARTIFACT)bad.push('target');
if(!ancestor(SOURCE,'HEAD'))bad.push('sourceAncestor');
if(!ancestor(r.controlPlaneHead,'HEAD'))bad.push('controlPlaneAncestor');
if(trigger===RESUME){
 const parent=git('rev-parse',`${requestCommit}^`);
 if(r.controlPlaneHead!==parent)bad.push('requestParentBinding');
 if(r.sourcePreflightRunId!==31772635572||r.sourcePreflightStatus!=='SUCCESS')bad.push('sourcePreflightBinding');
}
if(bad.length)fail('PRODUCTION_REQUEST_GUARD_FAIL',bad.join(','));
const out={ok:true,status:'PRODUCTION_REQUEST_RESUME_GUARD_PASS',trigger,sourceHead:SOURCE,requestId:r.requestId,requestFile:requestPath,requestReused,newRequestCreated,previousDeployCount,forwardDeployBudget:1,secondForwardDeployAllowed:false,secretAccess:false,productionTouched:false};
console.log(JSON.stringify(out,null,2));
