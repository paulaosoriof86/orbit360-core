#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=process.cwd(),OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/m5-release-candidate-contract-summary.json');
globalThis.window=globalThis;globalThis.Orbit={};
vm.runInThisContext(fs.readFileSync(path.join(ROOT,'orbit360-platform/core/m5-release-candidate-contract-p0.js'),'utf8'));
const api=globalThis.Orbit.m5ReleaseCandidateP0;
function base(parity){return {prerequisites:{m1Closed:true,m2Closed:true,m3Closed:true,m4Closed:true},dataBaseline:{clients:414,insurers:26,advisors:7,missingClientCurrency:0,targetOnlyClients:0,targetOnlyInsurers:0},visualReadiness:{mobileTitleResponsiveContract:true,m1HumanApprovalPresent:true,noKnownBlockingVisualDebt:true},releaseCandidate:{allCriticalAssetsPresent:true,criticalAssetCount:40,hash:'a'.repeat(64),hashAlgorithm:'sha256'},remoteLab:{assetsExpected:22,assetsChecked:22,assetsMatched:parity?22:20,mismatchCount:parity?0:2,remoteParity:!!parity,reviewUrl:'https://ays-orbit-360-lab--orbit360-ays-lab-fj1zxnk2.web.app/ays-lab-preview.html'},writes:{operationalWrites:0,clientWrites:0,insurerWrites:0,configurationWrites:0,membershipWrites:0},secrets:false,firestoreRead:false,browser:false,deploy:false,rulesDeploy:false,functionsDeploy:false,productionTouched:false,policies:false,mergeMain:false,containsPII:false,containsSecrets:false};}
const tests=[];function t(name,mutate,expectOk,expectStatus){const x=base(false);if(mutate)mutate(x);const r=api.build(x);tests.push({name,ok:r.ok===expectOk&&(!expectStatus||r.status===expectStatus)});}
let r=api.build(base(false));tests.push({name:'delivery-required-positive',ok:r.ok===true&&r.status==='M5_RC_READY_LAB_DELIVERY_REQUIRED'&&r.approvalReadyForLabDelivery===true&&r.approvalReadyForRuntimeSmoke===false});
r=api.build(base(true));tests.push({name:'parity-positive',ok:r.ok===true&&r.status==='M5_RC_READY_FOR_RUNTIME_SMOKE'&&r.approvalReadyForRuntimeSmoke===true});
t('m1-open',x=>x.prerequisites.m1Closed=false,false);
t('m2-open',x=>x.prerequisites.m2Closed=false,false);
t('m3-open',x=>x.prerequisites.m3Closed=false,false);
t('m4-open',x=>x.prerequisites.m4Closed=false,false);
t('clients-drift',x=>x.dataBaseline.clients=413,false);
t('insurers-drift',x=>x.dataBaseline.insurers=25,false);
t('advisors-drift',x=>x.dataBaseline.advisors=6,false);
t('currency-drift',x=>x.dataBaseline.missingClientCurrency=1,false);
t('target-overlay',x=>x.dataBaseline.targetOnlyClients=1,false);
t('mobile-debt',x=>x.visualReadiness.mobileTitleResponsiveContract=false,false);
t('asset-count',x=>x.releaseCandidate.criticalAssetCount=39,false);
t('hash-invalid',x=>x.releaseCandidate.hash='bad',false);
t('remote-count',x=>x.remoteLab.assetsChecked=21,false);
t('parity-inconsistent',x=>{x.remoteLab.remoteParity=true;x.remoteLab.assetsMatched=21;x.remoteLab.mismatchCount=1;},false);
t('write-forbidden',x=>x.writes.clientWrites=1,false);
t('deploy-forbidden',x=>x.deploy=true,false);
t('browser-forbidden',x=>x.browser=true,false);
t('policy-forbidden',x=>x.policies=true,false);
t('privacy-forbidden',x=>x.containsPII=true,false);
const q={schemaVersion:'orbit360-m5-release-candidate-readiness-request-v1',gateId:'block5-release-candidate-visualization-v20260728',contractVersion:'5.0.0',branch:'ays/backend-tenant-lab-v99-20260703',authorizedBaseCommit:'abc',explicitAuthorization:true,allowedExecutions:1,readinessStatic:true,remoteLabIntegrityRead:true,secrets:false,firestoreRead:false,browser:false,deploy:false,operationalWrites:false,production:false,policies:false,mergeMain:false,containsPII:false,containsSecrets:false};
let b=api.validateActivationBoundary({requestPresent:false,parentCommit:'abc'});tests.push({name:'boundary-package',ok:b.ok===true&&b.executionAuthorized===false});
b=api.validateActivationBoundary({requestPresent:true,request:q,parentCommit:'abc'});tests.push({name:'boundary-request',ok:b.ok===true&&b.executionAuthorized===true&&b.allowedExecutions===1});
b=api.validateActivationBoundary({requestPresent:true,request:q,parentCommit:'other'});tests.push({name:'boundary-historical',ok:b.ok===true&&b.executionAuthorized===false});
const failed=tests.filter(x=>!x.ok),out={schemaVersion:'orbit360-m5-release-candidate-contract-summary-v1',status:failed.length?'FAIL':'PASS',validationMode:'executed_contract_fixtures',literalSourceInspection:false,total:tests.length,passed:tests.length-failed.length,failed:failed.length,positiveFixtures:2,negativeFixtures:tests.length-5,tests};fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));if(failed.length)process.exit(41);
