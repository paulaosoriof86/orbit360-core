#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const REQUEST=String(process.env.ORBIT360_REQUEST_FILE||'').trim();
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
const changed=git('diff','--name-only','HEAD^','HEAD').split(/\r?\n/).filter(Boolean);
if(changed.length!==1)fail('PRODUCTION_TRIGGER_FILE_COUNT_INVALID',String(changed.length));
const trigger=changed[0];
if(!REQUEST||!RESUME||!SOURCE||!BRANCH||!PROJECT||!TENANT||!URL||!ARTIFACT)fail('PRODUCTION_GUARD_CONTEXT_INCOMPLETE');
if(!fs.existsSync(REQUEST))fail('PRODUCTION_REQUEST_MISSING');
const r=json(REQUEST),bad=[];
if(r.schemaVersion!=='orbit360-fase-a-production-go-live-request-v1')bad.push('schema');
if(r.branch!==BRANCH||r.sourceHead!==SOURCE)bad.push('sourceBinding');
if(r.approved!==true||r.authorizedByUser!==true||r.allowedExecutions!==1||r.consumed!==false||r.authorizationFrozen!==false||r.replayAllowed!==false)bad.push('authorization');
if(r.hostingDeployAuthorized!==true||r.browserAuthorized!==true||r.rollbackAuthorized!==true||r.productionAuthorized!==true)bad.push('capabilities');
if(r.firestoreWritesAuthorized!==0||r.authWritesAuthorized!==0||r.operationalWritesAuthorized!==0||r.reimportAuthorized!==false||r.functionsDeployAuthorized!==false||r.rulesDeployAuthorized!==false||r.mainAuthorized!==false||r.mergeAuthorized!==false||r.hostdimeRequired!==false)bad.push('scope');
if(r.target?.projectId!==PROJECT||r.target?.tenantId!==TENANT||r.target?.liveUrl!==URL||r.target?.artifact!==ARTIFACT)bad.push('target');
if(!ancestor(SOURCE,'HEAD'))bad.push('sourceAncestor');
if(!ancestor(r.controlPlaneHead,'HEAD'))bad.push('controlPlaneAncestor');
if(trigger===REQUEST){
 const parent=git('rev-parse','HEAD^');
 if(r.controlPlaneHead!==parent)bad.push('requestParentBinding');
}else if(trigger===RESUME){
 if(!fs.existsSync(RESUME))bad.push('resumeMissing');
 else{
  const m=json(RESUME);
  if(m.schemaVersion!=='orbit360-fase-a-production-resume-v2')bad.push('resumeSchema');
  if(m.requestCommit!=='d3749ec9abd14f24fb3972c0a33c600d86f18105')bad.push('resumeRequestCommit');
  if(m.previousDeployCount!==0||m.productionTouched!==false||m.resumeAllowed!==true||m.newRequestCreated!==false||m.requestReused!==true||m.secondForwardDeployAllowed!==false)bad.push('resumeSafety');
  if(!Array.isArray(m.closedPreDeployFailures)||m.closedPreDeployFailures.length<2)bad.push('resumeEvidence');
  if(!m.closedPreDeployFailures.some(x=>x.runId===31762808073&&x.deployCount===0&&x.rootCause==='SOURCE_PHASE_REQUEST_CONTEXT_LEAK'))bad.push('phaseLeakEvidence');
  if(!m.closedPreDeployFailures.some(x=>x.runId===31762940469&&x.deployCount===0&&x.rootCause==='BASH_HEREDOC_GUARD_SYNTAX'))bad.push('shellGuardEvidence');
  if(m.latestCorrection!=='DEDICATED_NODE_REQUEST_RESUME_GUARD')bad.push('resumeCorrection');
  if(!ancestor(m.requestCommit,'HEAD'))bad.push('requestAncestor');
 }
}else bad.push(`trigger:${trigger}`);
if(bad.length)fail('PRODUCTION_REQUEST_RESUME_GUARD_FAIL',bad.join(','));
const out={ok:true,status:'PRODUCTION_REQUEST_RESUME_GUARD_PASS',trigger,sourceHead:SOURCE,requestId:r.requestId,requestReused:trigger===RESUME,newRequestCreated:false,previousDeployCount:0,forwardDeployBudget:1,secondForwardDeployAllowed:false,secretAccess:false,productionTouched:false};
console.log(JSON.stringify(out,null,2));
