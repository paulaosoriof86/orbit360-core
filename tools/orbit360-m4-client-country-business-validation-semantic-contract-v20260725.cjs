#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=process.cwd(),OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/m4-client-country-business-validation-semantic-contract-summary.json');
global.window=global;global.Orbit={};
vm.runInThisContext(fs.readFileSync(path.join(ROOT,'orbit360-platform/core/m4-client-country-business-validation-semantic-contract-p0.js'),'utf8'));
const api=Orbit.m4ClientCountryBusinessValidationSemanticP0;
const country=JSON.parse(fs.readFileSync(path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/m4-client-country-values-closure.json'),'utf8'));
const durable=JSON.parse(fs.readFileSync(path.join(ROOT,'tools/orbit360-m4-durable-writer-dryrun-freeze-v20260725.json'),'utf8'));
const validation={explicitAuthorization:true,all61Guatemala:true,country:'GT',currency:'GTQ',source:'explicit_user_business_validation',scope:'all_61_missing_currency_clients',writeAuthorized:false,staticOnly:true};
const results=[];function t(id,ok){results.push({id,ok:!!ok});}function clone(v){return JSON.parse(JSON.stringify(v));}
const good=api.compose({countryClosure:country,durableClosure:durable,businessValidation:validation});
t('POSITIVE_COMPOSE',good.ok);
t('POSITIVE_STATUS',good.status===api.STATUS);
t('POSITIVE_BASELINE',good.baseline.clients===414&&good.baseline.missingCurrency===61&&good.baseline.clientTargetOnly===2&&good.baseline.insurerTargetOnly===2&&good.baseline.targetOnlyDeferred===4);
t('POSITIVE_PROPOSAL',good.proposal.records===61&&good.proposal.country==='GT'&&good.proposal.currency==='GTQ'&&good.proposal.targetOnlyDeferred===4);
t('POSITIVE_EVIDENCE',api.validateEvidence(good).ok);
function bad(id,mutate){
  const c=clone(country),d=clone(durable),v=clone(validation);mutate(c,d,v);
  t(id,!api.compose({countryClosure:c,durableClosure:d,businessValidation:v}).ok);
}
bad('NEG_COUNTRY_STATUS',(c)=>{c.status='WRONG';});
bad('NEG_CLIENT_COUNT',(c)=>{c.sourceCounts.clientes=413;});
bad('NEG_MISSING_COUNT',(c)=>{c.sourceCounts.missingCurrency=60;});
bad('NEG_DISTRIBUTION',(c)=>{c.distribution.nonCanonical=60;c.distribution.GT=1;});
bad('NEG_DURABLE_STATUS',(c,d)=>{d.status='WRONG';});
bad('NEG_CLIENT_TARGET_ONLY',(c,d)=>{d.dryRunClosure.issues.clientTargetOnly=1;});
bad('NEG_INSURER_TARGET_ONLY',(c,d)=>{d.dryRunClosure.issues.insurerTargetOnly=1;});
bad('NEG_AUTH',(c,d,v)=>{v.explicitAuthorization=false;});
bad('NEG_COUNTRY',(c,d,v)=>{v.country='CO';});
bad('NEG_CURRENCY',(c,d,v)=>{v.currency='COP';});
bad('NEG_SOURCE',(c,d,v)=>{v.source='inference';});
bad('NEG_SCOPE',(c,d,v)=>{v.scope='partial';});
bad('NEG_WRITE',(c,d,v)=>{v.writeAuthorized=true;});
const badEvidence=clone(good);badEvidence.proposal.targetOnlyDeferred=3;t('NEG_EVIDENCE',!api.validateEvidence(badEvidence).ok);
const failed=results.filter(x=>!x.ok);
const out={schemaVersion:'orbit360-m4-client-country-business-validation-semantic-fixtures-v1',status:failed.length?'FAIL':'PASS',contractVersion:'4.2.5',validationMode:'executed_contract_fixtures',literalSourceInspection:false,total:results.length,passed:results.length-failed.length,failed:failed.length,positiveFixtures:5,negativeFixtures:results.length-5,composedBaseline:good.baseline,proposal:good.proposal,approvalReadyForCorrectionDryRun:good.approvalReadyForCorrectionDryRun===true,approvalReadyForM4Write:false,results,containsPII:false,containsSecrets:false};
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(`PASS ${out.passed}/${out.total}`);if(failed.length)process.exit(41);
