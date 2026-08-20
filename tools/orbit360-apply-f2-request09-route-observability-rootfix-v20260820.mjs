#!/usr/bin/env node
'use strict';
import fs from 'node:fs';

const RUNNER='tools/orbit360-f2-productive-acceptance-runtime-browser-readonly-v20260818.mjs';
const SELFTEST='tools/orbit360-test-f2-full-runtime-known-rootfixes-v20260819.mjs';
const EVIDENCE='orbit360-platform/runtime-gate-crm-v20260716/f2-request09-route-observability-rootfix-source-v20260820.json';
const need=(ok,code)=>{if(!ok)throw new Error(code);};
const count=(s,t)=>s.split(t).length-1;

let runner=fs.readFileSync(RUNNER,'utf8');
let selftest=fs.readFileSync(SELFTEST,'utf8');

const oldRoute="async function route(page,name){await page.evaluate(n=>{location.hash=`#/${n}`;},name);await page.waitForTimeout(450);await page.locator('#host').waitFor({state:'visible',timeout:20000});}";
const newRoute="async function route(page,name,label=name){await page.evaluate(n=>{location.hash=`#/${n}`;},name);await page.waitForTimeout(450);try{await page.locator('#host').waitFor({state:'visible',timeout:20000});}catch(_error){const state=await page.evaluate(()=>{const host=document.querySelector('#host'),main=document.querySelector('#main'),shell=document.querySelector('#shell'),login=document.querySelector('#login'),rect=host?host.getBoundingClientRect():null,hs=host?getComputedStyle(host):null,ms=main?getComputedStyle(main):null,ss=shell?getComputedStyle(shell):null;return{hostExists:!!host,childElementCount:host?host.childElementCount:0,textLength:host?String(host.innerText||host.textContent||'').trim().length:0,hostDisplay:hs?hs.display:'',hostVisibility:hs?hs.visibility:'',hostWidth:rect?Math.round(rect.width):0,hostHeight:rect?Math.round(rect.height):0,mainDisplay:ms?ms.display:'',shellDisplay:ss?ss.display:'',bodyPreAuth:document.body.classList.contains('pre-auth'),authStage:String(document.body.dataset.authStage||''),loginHidden:!!(login&&login.classList.contains('hidden')),hash:String(location.hash||'')};});const rendered=state.hostExists&&(state.childElementCount>0||state.textLength>0);throw new Error((rendered?'FUNCTIONAL_DEFECT:F2_ROUTE_NOT_VISIBLE':'FUNCTIONAL_DEFECT:F2_ROUTE_NOT_RENDERED')+':'+label+':'+safe(JSON.stringify(state)));}}";
need(count(runner,oldRoute)===1,'PIPELINE_MECHANISM_FAILURE:F2_ROUTE_OWNER_ANCHOR_MISMATCH');
runner=runner.replace(oldRoute,newRoute);

const oldSimple="async function simpleRoute(page,label,name){await route(page,name);return hostState(page,`${label}:${name}`);}";
const newSimple="async function simpleRoute(page,label,name){await route(page,name,`${label}:${name}`);return hostState(page,`${label}:${name}`);}";
need(count(runner,oldSimple)===1,'PIPELINE_MECHANISM_FAILURE:F2_SIMPLE_ROUTE_ANCHOR_MISMATCH');
runner=runner.replace(oldSimple,newSimple);

const oldClient="async function client360(page,label){await route(page,'cliente360');";
const newClient="async function client360(page,label){await route(page,'cliente360',`${label}:cliente360`);";
need(count(runner,oldClient)===1,'PIPELINE_MECHANISM_FAILURE:F2_CLIENT360_ROUTE_ANCHOR_MISMATCH');
runner=runner.replace(oldClient,newClient);

const oldInsurers="async function insurers(page,label,role){await route(page,'aseguradoras');";
const newInsurers="async function insurers(page,label,role){await route(page,'aseguradoras',`${label}:aseguradoras`);";
need(count(runner,oldInsurers)===1,'PIPELINE_MECHANISM_FAILURE:F2_INSURERS_ROUTE_ANCHOR_MISMATCH');
runner=runner.replace(oldInsurers,newInsurers);

const selftestAnchor="  need(runner.includes(\"ROUTES=['inicio','cliente360','aseguradoras','ops','leads','polizas','cobros']\"),'VALIDATOR_STALE:F2_ROUTE_TOPOLOGY_CHANGED');";
need(count(selftest,selftestAnchor)===1,'PIPELINE_MECHANISM_FAILURE:F2_SELFTEST_ROUTE_ANCHOR_MISMATCH');
const selftestInsert=selftestAnchor+"\n  need(runner.includes('F2_ROUTE_NOT_RENDERED')&&runner.includes('F2_ROUTE_NOT_VISIBLE')&&runner.includes('authStage')&&runner.includes('bodyPreAuth')&&runner.includes('hostWidth')&&runner.includes('hostHeight')&&runner.includes('route(page,name,`${label}:${name}`)'),'VALIDATOR_STALE:F2_ROUTE_WAIT_OBSERVABILITY_NOT_BOUND');";
selftest=selftest.replace(selftestAnchor,selftestInsert);

fs.writeFileSync(RUNNER,runner,'utf8');
fs.writeFileSync(SELFTEST,selftest,'utf8');
fs.mkdirSync('orbit360-platform/runtime-gate-crm-v20260716',{recursive:true});
const evidence={
  schemaVersion:'orbit360-f2-request09-route-observability-rootfix-source-v1',
  ok:true,
  status:'F2_REQUEST09_ROUTE_OBSERVABILITY_ROOTFIX_SOURCE_APPLIED',
  classification:'PIPELINE_MECHANISM_FAILURE_ROOTFIX',
  rootCause:'PIPELINE_MECHANISM_FAILURE:F2_BROWSER_ROUTE_WAIT_UNLABELED',
  request09RunId:32316883621,
  request09EvidenceArtifactId:9388429058,
  candidateArtifactId:9387820198,
  candidateSourceHead:'fc46bd85783d8b4d524cbeb0fee54ee9a2c774af',
  productMutation:false,
  candidateRebuild:false,
  runnerStillRequiresVisibleHost:true,
  routeLabelsBound:true,
  hostRenderedVsVisibleSeparated:true,
  authStageCaptured:true,
  bodyPreAuthCaptured:true,
  geometryCaptured:true,
  browserExecuted:false,
  runtimeExecuted:false,
  secretAccess:false,
  firestoreRead:false,
  firestoreWrites:0,
  authWrites:0,
  membershipWrites:0,
  dataWrites:0,
  operationalWrites:0,
  deployExecuted:false,
  publicationExecuted:false,
  productionTouched:false,
  request10Created:false,
  request10Authorized:false,
  containsPII:false,
  containsSecrets:false
};
fs.writeFileSync(EVIDENCE,JSON.stringify(evidence,null,2)+'\n','utf8');
console.log(JSON.stringify(evidence,null,2));
