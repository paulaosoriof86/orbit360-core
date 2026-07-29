#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const DIR=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716');
const RC='4bf3c8025654f43f6e4af20e5d16115bdc0851352ccddc6f099649405883cf3b';
const read=name=>{try{return JSON.parse(fs.readFileSync(path.join(DIR,name),'utf8'));}catch{return null;}};
const before=read('m5-runtime-smoke-live-before.json');
const after=read('m5-runtime-smoke-live-after.json');
const browser=read('m5-runtime-smoke-533-browser-summary.json');
const preflight=read('preflight-sanitizado.json');
const contract=read('m5-runtime-smoke-533-contract-summary.json');
const keys=['sourceClients','sourceInsurers','advisors','canonicalClients','canonicalInsurers','memberships','config'];
const digestComparisons=Object.fromEntries(keys.map(key=>[key,Boolean(before&&after&&before.digests&&after.digests&&before.digests[key]===after.digests[key])]));
const allDigestsStable=keys.every(key=>digestComparisons[key]===true);
const allCountsStable=keys.every(key=>Boolean(before&&after&&before.counts&&after.counts&&before.counts[key]===after.counts[key]));
const transientStaticCalls=Number(browser&&browser.writeGuard&&Array.isArray(browser.writeGuard.transientStaticCalls)?browser.writeGuard.transientStaticCalls.length:0);
const blockedOperationalCalls=Number(browser&&browser.writeGuard&&Array.isArray(browser.writeGuard.blockedOperationalCalls)?browser.writeGuard.blockedOperationalCalls.length:0);
const networkWriteCandidates=Number(browser&&browser.writeGuard&&Array.isArray(browser.writeGuard.networkWriteCandidates)?browser.writeGuard.networkWriteCandidates.length:0);
const guardInstalled=Boolean(browser&&browser.writeGuard&&browser.writeGuard.storeGuardInstalled===true&&browser.writeGuard.policyVersion==='20260729.2');
const roleViewsOk=Boolean(browser&&browser.checks&&browser.checks.desktopDirection===true&&browser.checks.tabletOperativo===true&&browser.checks.mobileAsesor===true&&browser.checks.mobileMenu===true);
const normalizedOwnerOk=Boolean(browser&&browser.checks&&browser.checks.normalizedBootstrapOwner===true);
const policyOwnerOk=Boolean(browser&&browser.checks&&browser.checks.academiaPolicyOwner===true&&browser.academiaStaticWritePolicy&&browser.academiaStaticWritePolicy.storeExplicit===true&&browser.academiaStaticWritePolicy.ownerVersion==='20260729.2');
const semanticCopyPredicateOk=Boolean(browser&&browser.visibleTechnicalCopyPredicateVersion==='20260729.1');
const responsiveTitleResolverOk=Boolean(browser&&browser.responsiveTitleResolverVersion==='20260729.1'&&browser.checks&&browser.checks.responsiveTitleResolver===true);
const multirolCompatibilityOk=Boolean(browser&&browser.functionalMultirolEvidence===true&&browser.expectedMultirolCompatibilityVersion==='20260729.2'&&browser.expectedCanonicalAccessOwnerVersion==='20260729.3');
const ok=Boolean(
  preflight&&preflight.status==='GO_GATE_CONTRACT'&&preflight.failed===0&&preflight.contractVersion==='5.0.33'&&
  contract&&contract.status==='M5_RUNTIME_SMOKE_533_CONTRACT_PASS'&&contract.failed===0&&contract.releaseCandidateHash===RC&&contract.remoteAssetsMatched===26&&
  before&&before.ok===true&&after&&after.ok===true&&browser&&browser.ok===true&&browser.releaseCandidateHash===RC&&browser.contractVersion==='5.0.33'&&
  semanticCopyPredicateOk&&responsiveTitleResolverOk&&multirolCompatibilityOk&&policyOwnerOk&&guardInstalled&&normalizedOwnerOk&&roleViewsOk&&
  transientStaticCalls>0&&blockedOperationalCalls===0&&networkWriteCandidates===0&&allDigestsStable&&allCountsStable
);
const out={
  schemaVersion:'orbit360-m5-runtime-smoke-summary-533-v1',generatedAt:new Date().toISOString(),ok,
  status:ok?'M5_RUNTIME_SMOKE_533_CLOSED_SUCCESS':'M5_RUNTIME_SMOKE_533_FAILED_STOP_LINE',
  gateId:'block5-release-candidate-visualization-v20260728',contractVersion:'5.0.33',releaseCandidateHash:RC,
  projectId:'ays-orbit-360-lab',canonicalUrl:'https://ays-orbit-360-lab--orbit360-ays-lab-fj1zxnk2.web.app',
  reviewUrl:'https://ays-orbit-360-lab--orbit360-ays-lab-fj1zxnk2.web.app/ays-lab-preview.html',publicParityPreserved:'26/26',
  canonicalPreflight:preflight&&preflight.status||'NOT_RUN',contractStatus:contract&&contract.status||'NOT_RUN',
  browserStatus:browser&&browser.ok===true?'PASS':'FAIL',browserStage:browser&&browser.stage||'NOT_RUN',failureStage:browser&&browser.failureStage||'',browserError:browser&&browser.error||'',
  probeImplementationContractVersion:browser&&browser.probeImplementationContractVersion||'',
  visibleTechnicalCopyPredicateVersion:browser&&browser.visibleTechnicalCopyPredicateVersion||'',responsiveTitleResolverVersion:browser&&browser.responsiveTitleResolverVersion||'',
  checks:browser&&browser.checks||{},dataBaseline:browser&&browser.dataBaseline||{},accessBoundary:browser&&browser.accessBoundary||{},roleViews:browser&&browser.roleViews||{},
  mobileMenuVisibleModules:browser&&browser.mobileMenuVisibleModules||0,academiaStaticWritePolicy:browser&&browser.academiaStaticWritePolicy||{},
  beforeCounts:before&&before.counts||{},afterCounts:after&&after.counts||{},digestComparisons,allDigestsStable,allCountsStable,
  semanticCopyPredicateReady:semanticCopyPredicateOk,responsiveTitleResolverReady:responsiveTitleResolverOk,multirolCompatibilityFunctionalReady:multirolCompatibilityOk,
  policyOwnerReady:policyOwnerOk,storeGuardInstalled:guardInstalled,normalizedBootstrapOwner:normalizedOwnerOk,roleViewsCompleted:roleViewsOk,
  transientStaticCalls,blockedOperationalCalls,networkWriteCandidates,
  firestoreRead:true,firestoreWrites:0,operationalWrites:0,runtimeSmokeExecuted:true,browserExecuted:true,
  hostingDeploy:false,functionsDeploy:false,rulesDeploy:false,production:false,mergeMain:false,policies:false,visualReviewExecuted:false,
  approvalReadyForVisualReview:ok,visualReviewAuthorized:false,containsPII:false,containsSecrets:false
};
fs.writeFileSync(path.join(DIR,'m5-runtime-smoke-533-summary.json'),JSON.stringify(out,null,2)+'\n','utf8');
console.log(JSON.stringify(out,null,2));
if(!ok)process.exit(41);
