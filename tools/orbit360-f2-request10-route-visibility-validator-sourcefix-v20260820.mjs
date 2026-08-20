#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const RUNNER=path.join(ROOT,'tools/orbit360-f2-productive-acceptance-runtime-browser-readonly-v20260818.mjs');
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/f2-request10-route-visibility-validator-sourcefix-v20260820.json');
const source=fs.readFileSync(RUNNER,'utf8');

function replaceOnce(text,oldValue,newValue,label){
  const first=text.indexOf(oldValue);
  if(first<0) throw new Error('SOURCEFIX_TARGET_MISSING:'+label);
  if(text.indexOf(oldValue,first+oldValue.length)>=0) throw new Error('SOURCEFIX_TARGET_NOT_UNIQUE:'+label);
  return text.slice(0,first)+newValue+text.slice(first+oldValue.length);
}

const oldRoute=`async function route(page,name,label=name){await page.evaluate(n=>{location.hash=\`#/${'${n}'}\`;},name);await page.waitForTimeout(450);try{await page.locator('#host').waitFor({state:'visible',timeout:20000});}catch(_error){const state=await page.evaluate(()=>{const host=document.querySelector('#host'),main=document.querySelector('#main'),shell=document.querySelector('#shell'),login=document.querySelector('#login'),rect=host?host.getBoundingClientRect():null,hs=host?getComputedStyle(host):null,ms=main?getComputedStyle(main):null,ss=shell?getComputedStyle(shell):null;return{hostExists:!!host,childElementCount:host?host.childElementCount:0,textLength:host?String(host.innerText||host.textContent||'').trim().length:0,hostDisplay:hs?hs.display:'',hostVisibility:hs?hs.visibility:'',hostWidth:rect?Math.round(rect.width):0,hostHeight:rect?Math.round(rect.height):0,mainDisplay:ms?ms.display:'',shellDisplay:ss?ss.display:'',bodyPreAuth:document.body.classList.contains('pre-auth'),authStage:String(document.body.dataset.authStage||''),loginHidden:!!(login&&login.classList.contains('hidden')),hash:String(location.hash||'')};});const rendered=state.hostExists&&(state.childElementCount>0||state.textLength>0);throw new Error((rendered?'FUNCTIONAL_DEFECT:F2_ROUTE_NOT_VISIBLE':'FUNCTIONAL_DEFECT:F2_ROUTE_NOT_RENDERED')+':'+label+':'+safe(JSON.stringify(state)));}}`;

const newRoute=`async function route(page,name,label=name){const startedAt=Date.now();await page.evaluate(n=>{location.hash=\`#/${'${n}'}\`;},name);await page.waitForTimeout(450);try{await page.waitForFunction(target=>{const host=document.querySelector('#host'),rect=host?host.getBoundingClientRect():null,hs=host?getComputedStyle(host):null,key=String(window.Orbit&&Orbit.route&&Orbit.route.key||'').trim(),text=host?String(host.innerText||host.textContent||'').trim():'';const rendered=!!host&&(host.childElementCount>0||text.length>0);return rendered&&!!rect&&rect.width>0&&rect.height>0&&!!hs&&hs.display!=='none'&&hs.visibility!=='hidden'&&key===target&&String(location.hash||'').startsWith('#/'+target);},name,{timeout:20000,polling:100});const state=await page.evaluate(()=>{const host=document.querySelector('#host'),rect=host?host.getBoundingClientRect():null,hs=host?getComputedStyle(host):null;return{routeKey:String(window.Orbit&&Orbit.route&&Orbit.route.key||'').trim(),childElementCount:host?host.childElementCount:0,textLength:host?String(host.innerText||host.textContent||'').trim().length:0,hostDisplay:hs?hs.display:'',hostVisibility:hs?hs.visibility:'',hostWidth:rect?Math.round(rect.width):0,hostHeight:rect?Math.round(rect.height):0,hash:String(location.hash||'')};});routeTrace.push({label,name,ok:true,elapsedMs:Date.now()-startedAt,...state});return state;}catch(_error){const state=await page.evaluate(()=>{const host=document.querySelector('#host'),main=document.querySelector('#main'),shell=document.querySelector('#shell'),login=document.querySelector('#login'),rect=host?host.getBoundingClientRect():null,hs=host?getComputedStyle(host):null,ms=main?getComputedStyle(main):null,ss=shell?getComputedStyle(shell):null;return{hostExists:!!host,routeKey:String(window.Orbit&&Orbit.route&&Orbit.route.key||'').trim(),childElementCount:host?host.childElementCount:0,textLength:host?String(host.innerText||host.textContent||'').trim().length:0,hostDisplay:hs?hs.display:'',hostVisibility:hs?hs.visibility:'',hostWidth:rect?Math.round(rect.width):0,hostHeight:rect?Math.round(rect.height):0,mainDisplay:ms?ms.display:'',shellDisplay:ss?ss.display:'',bodyPreAuth:document.body.classList.contains('pre-auth'),authStage:String(document.body.dataset.authStage||''),loginHidden:!!(login&&login.classList.contains('hidden')),hash:String(location.hash||'')};});const rendered=state.hostExists&&(state.childElementCount>0||state.textLength>0),contractVisible=rendered&&state.hostDisplay!=='none'&&state.hostVisibility!=='hidden'&&state.hostWidth>0&&state.hostHeight>0&&state.routeKey===name&&state.hash.startsWith('#/'+name);routeTrace.push({label,name,ok:false,elapsedMs:Date.now()-startedAt,contractVisible,...state});const code=contractVisible?'VALIDATOR_STALE:F2_ROUTE_READINESS_TIMEOUT_CONTRADICTED_BY_CAPTURE':rendered?'FUNCTIONAL_DEFECT:F2_ROUTE_NOT_VISIBLE':'FUNCTIONAL_DEFECT:F2_ROUTE_NOT_RENDERED';throw new Error(code+':'+label+':'+safe(JSON.stringify(state)));}}`;

let next=replaceOnce(source,oldRoute,newRoute,'route-wait');
next=replaceOnce(next,"let adminApp,browser,context,page,customToken='';const writeSignals=[],pageErrors=[],consoleErrors=[],base=","let adminApp,browser,context,page,customToken='',crossTenantDeniedObserved=false,localWriteGuardObserved=null;const routeTrace=[],writeSignals=[],pageErrors=[],consoleErrors=[],base=",'observed-state-vars');
next=replaceOnce(next,"const crossTenantDenied=await page.evaluate(async deniedPath=>{","const crossTenantDenied=await page.evaluate(async deniedPath=>{",'cross-tenant-anchor');
next=replaceOnce(next,"},PROBE_DOCUMENT_PATH);need(crossTenantDenied,'SECURITY_FAILURE:F2_CROSS_TENANT_READ_NOT_DENIED');const localWriteGuard=await page.evaluate(()=>{","},PROBE_DOCUMENT_PATH);crossTenantDeniedObserved=crossTenantDenied;need(crossTenantDenied,'SECURITY_FAILURE:F2_CROSS_TENANT_READ_NOT_DENIED');const localWriteGuard=await page.evaluate(()=>{",'cross-tenant-preserve');
next=replaceOnce(next,"need(localWriteGuard.blocked&&/WRITE_BLOCKED_PRODUCT_READ_ONLY_P0/.test(localWriteGuard.code),'SECURITY_FAILURE:F2_LOCAL_WRITE_GUARD_FAILED');const roleViews={};","localWriteGuardObserved=localWriteGuard;need(localWriteGuard.blocked&&/WRITE_BLOCKED_PRODUCT_READ_ONLY_P0/.test(localWriteGuard.code),'SECURITY_FAILURE:F2_LOCAL_WRITE_GUARD_FAILED');const roleViews={};",'write-guard-preserve');
next=replaceOnce(next,"serviceWorker,integrityBeforeAfter,pageErrors:[],consoleErrors:[],writeSignals:[],firestoreRead:true","serviceWorker,integrityBeforeAfter,routeTrace:[...routeTrace],pageErrors:[],consoleErrors:[],writeSignals:[],firestoreRead:true",'success-trace');
next=replaceOnce(next,"error:safe(error?.message||error),crossTenantDenied:false,integrityBeforeAfter:false,pageErrors:","error:safe(error?.message||error),crossTenantDenied:crossTenantDeniedObserved,localWriteGuard:localWriteGuardObserved,routeTrace:[...routeTrace],integrityBeforeAfter:false,pageErrors:",'failure-preserve');

if(next===source) throw new Error('SOURCEFIX_NO_CHANGE');
fs.writeFileSync(RUNNER,next);
const evidence={
  schemaVersion:'orbit360-f2-request10-route-visibility-validator-sourcefix-v1',
  ok:true,
  status:'F2_REQUEST10_ROUTE_VISIBILITY_VALIDATOR_SOURCEFIX_APPLIED',
  classification:'VALIDATOR_STALE_ROOTFIX',
  rootCause:'VALIDATOR_STALE:F2_ROUTE_VISIBLE_WAIT_CONTRADICTS_CAPTURED_DOM_STATE',
  request10RunId:32318415706,
  request10EvidenceArtifactId:9388976113,
  candidateArtifactId:9387820198,
  candidateSourceHead:'fc46bd85783d8b4d524cbeb0fee54ee9a2c774af',
  productMutation:false,candidateRebuild:false,dataMutation:false,
  explicitRouteReadiness:true,playwrightLocatorHostWaitRemoved:true,
  contradictoryTimeoutFailsValidatorStale:true,crossTenantPassPreservedOnLaterFailure:true,localWriteGuardPreservedOnLaterFailure:true,routeTraceCaptured:true,
  browserExecuted:false,runtimeExecuted:false,secretAccess:false,firestoreRead:false,
  firestoreWrites:0,authWrites:0,membershipWrites:0,dataWrites:0,operationalWrites:0,
  deployExecuted:false,publicationExecuted:false,productionTouched:false,
  request11Created:false,request11Authorized:false,containsPII:false,containsSecrets:false
};
fs.mkdirSync(path.dirname(OUT),{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify(evidence,null,2));
