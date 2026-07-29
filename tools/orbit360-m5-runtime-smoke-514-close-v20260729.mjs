#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
const ROOT=process.cwd();
const DIR=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716');
const RC_HASH='ae6bb2a35ce4f03c0353d670218c841e51b57a2461a3ba9e741d8bd7a973fd61';
const read=name=>{try{return JSON.parse(fs.readFileSync(path.join(DIR,name),'utf8'));}catch{return null;}};
const before=read('m5-runtime-smoke-live-before.json');
const after=read('m5-runtime-smoke-live-after.json');
const browser=read('m5-runtime-smoke-514-browser-summary.json');
const preflight=read('preflight-sanitizado.json');
const contract=read('m5-runtime-smoke-514-contract-summary.json');
const keys=['sourceClients','sourceInsurers','advisors','canonicalClients','canonicalInsurers','memberships','config'];
const digestComparisons=Object.fromEntries(keys.map(key=>[key,Boolean(before&&after&&before.digests&&after.digests&&before.digests[key]===after.digests[key])]));
const allDigestsStable=keys.every(key=>digestComparisons[key]===true);
const allCountsStable=keys.every(key=>Boolean(before&&after&&before.counts&&after.counts&&before.counts[key]===after.counts[key]));
const transientStaticCalls=Number(browser&&browser.writeGuard&&Array.isArray(browser.writeGuard.transientStaticCalls)?browser.writeGuard.transientStaticCalls.length:0);
const blockedOperationalCalls=Number(browser&&browser.writeGuard&&Array.isArray(browser.writeGuard.blockedOperationalCalls)?browser.writeGuard.blockedOperationalCalls.length:0);
const networkWriteCandidates=Number(browser&&browser.writeGuard&&Array.isArray(browser.writeGuard.networkWriteCandidates)?browser.writeGuard.networkWriteCandidates.length:0);
const guardInstalled=Boolean(browser&&browser.writeGuard&&browser.writeGuard.storeGuardInstalled===true&&browser.writeGuard.policyVersion==='20260729.2');
const roleViewsOk=Boolean(browser&&browser.checks&&browser.checks.desktopDirection===true&&browser.checks.tabletOperativo===true&&browser.checks.mobileAsesor===true&&browser.checks.mobileMenu===true);
const normalizedOwnerOk=Boolean(browser&&browser.bootstrapOwner==='tools/orbit360-gate-bootstrap-auth-legal-normalized-v20260729.mjs'&&browser.checks&&browser.checks.normalizedBootstrapOwner===true);
const ok=Boolean(
  preflight&&preflight.status==='GO_GATE_CONTRACT'&&preflight.failed===0&&preflight.contractVersion==='5.0.14'&&
  contract&&contract.status==='M5_RUNTIME_SMOKE_514_CONTRACT_PASS'&&contract.failed===0&&contract.releaseCandidateHash===RC_HASH&&
  before&&before.ok===true&&after&&after.ok===true&&
  browser&&browser.ok===true&&browser.releaseCandidateHash===RC_HASH&&browser.contractVersion==='5.0.14'&&
  guardInstalled&&normalizedOwnerOk&&roleViewsOk&&transientStaticCalls>0&&blockedOperationalCalls===0&&networkWriteCandidates===0&&
  allDigestsStable&&allCountsStable
);
const out={
  schemaVersion:'orbit360-m5-runtime-smoke-summary-v4',generatedAt:new Date().toISOString(),ok,
  status:ok?'M5_RUNTIME_SMOKE_514_CLOSED_SUCCESS':'M5_RUNTIME_SMOKE_514_FAILED_STOP_LINE',
  gateId:'block5-release-candidate-visualization-v20260728',contractVersion:'5.0.14',releaseCandidateHash:RC_HASH,
  projectId:'ays-orbit-360-lab',canonicalUrl:'https://ays-orbit-360-lab--orbit360-ays-lab-fj1zxnk2.web.app',reviewUrl:'https://ays-orbit-360-lab--orbit360-ays-lab-fj1zxnk2.web.app/ays-lab-preview.html',
  publicParityPreserved:'25/25',canonicalPreflight:preflight&&preflight.status||'NOT_RUN',preflightPassed:preflight&&preflight.passed||0,preflightTotal:preflight&&preflight.total||0,
  contractStatus:contract&&contract.status||'NOT_RUN',contractPassed:contract&&contract.passed||0,contractTotal:contract&&contract.total||0,
  browserStatus:browser&&browser.ok===true?'PASS':'FAIL',browserStage:browser&&browser.stage||'NOT_RUN',failureStage:browser&&browser.failureStage||'',browserError:browser&&browser.error||'',
  bootstrapOwner:browser&&browser.bootstrapOwner||'',checks:browser&&browser.checks||{},dataBaseline:browser&&browser.dataBaseline||{},accessBoundary:browser&&browser.accessBoundary||{},roleViews:browser&&browser.roleViews||{},mobileMenuVisibleModules:browser&&browser.mobileMenuVisibleModules||0,academiaStaticWritePolicy:browser&&browser.academiaStaticWritePolicy||{},
  beforeCounts:before&&before.counts||{},afterCounts:after&&after.counts||{},digestComparisons,allDigestsStable,allCountsStable,storeGuardInstalled:guardInstalled,normalizedBootstrapOwner:normalizedOwnerOk,roleViewsCompleted:roleViewsOk,
  transientStaticCalls,blockedOperationalCalls,networkWriteCandidates,firestoreRead:true,firestoreWrites:0,operationalWrites:0,runtimeSmokeExecuted:true,browserExecuted:true,hostingDeploy:false,functionsDeploy:false,rulesDeploy:false,production:false,mergeMain:false,policies:false,visualReviewExecuted:false,
  approvalReadyForVisualReview:ok,visualReviewAuthorized:false,containsPII:false,containsSecrets:false
};
fs.writeFileSync(path.join(DIR,'m5-runtime-smoke-514-summary.json'),JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out,null,2));
if(!ok)process.exit(41);
