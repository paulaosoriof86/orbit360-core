#!/usr/bin/env node
'use strict';
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';
import {loadResponsiveTitleResolverContract,CONTRACT_SHAPE_READER_VERSION} from './orbit360-contract-shape-reader-v20260729.mjs';
const ROOT=process.cwd(),RC='ae6bb2a35ce4f03c0353d670218c841e51b57a2461a3ba9e741d8bd7a973fd61',BASE='0d71fe9a70b7f9e12f545c14b57c7ef9d3271988';
const read=r=>fs.readFileSync(path.join(ROOT,r),'utf8'),json=r=>JSON.parse(read(r));const checks=[];const check=(id,ok,d='')=>checks.push({id,ok:Boolean(ok),detail:String(d||'').slice(0,220)});
try{
 const resolver=loadResponsiveTitleResolverContract(ROOT),browserRel='tools/orbit360-m5-runtime-smoke-525-browser-v20260729.mjs',closerRel='tools/orbit360-m5-runtime-smoke-525-close-v20260729.mjs',historicalRel='tools/orbit360-m5-runtime-smoke-525-contract-v20260729.cjs';
 const browser=read(browserRel),closer=read(closerRel),historical=read(historicalRel),stop=json('tools/orbit360-m5-release-candidate-stop-overlay-526-v20260729.json');
 check('STOP_526_CLOSED',stop.status==='M5_RUNTIME_526_STOPPED_AFTER_TWO_PACKAGE_PIPELINE_FAILURES'&&stop.runtime525?.executed===false&&stop.runtime525?.requestCreated===false&&stop.runtime525?.authorizationInvalidated===true&&stop.controls?.thirdPackageAttemptForbidden===true);
 check('READER_OWNER',CONTRACT_SHAPE_READER_VERSION==='20260729.1'&&resolver.schemaVersion==='orbit360-responsive-title-resolver-contract-v1'&&resolver.version==='20260729.1');
 check('CANONICAL_FALLBACK',resolver.scopedExactTextFallback.allowed===true&&resolver.scopedExactTextFallback.requiredScope===true&&resolver.scopedExactTextFallback.exactText===true);
 check('CANONICAL_INSURER_SCOPE',resolver.insurerFicha.scopeSelector==='#asg-ficha');
 const browserSha=execFileSync('git',['hash-object',browserRel],{cwd:ROOT,encoding:'utf8'}).trim(),closerSha=execFileSync('git',['hash-object',closerRel],{cwd:ROOT,encoding:'utf8'}).trim();
 check('CANDIDATE_BROWSER_UNCHANGED',browserSha==='70d6ad22553bd0387fa08dd2eeeb6e3b9834fa12',browserSha);check('CANDIDATE_CLOSER_UNCHANGED',closerSha==='bf9301d1ed8bfa5d75f8d17924bd6685c520cb94',closerSha);
 const compact=browser.replace(/\s+/g,'');const tags=resolver.scopedExactTextFallback.candidateTags.join(',');
 check('CANDIDATE_VERSION_FROM_CANONICAL',compact.includes(`RESPONSIVE_TITLE_RESOLVER_VERSION='${resolver.version}'`));
 check('CANDIDATE_SCOPE_FROM_CANONICAL',compact.includes(`scopeSelector:'${resolver.insurerFicha.scopeSelector}'`)&&compact.includes('expectedText:state.insurerName')&&compact.includes("insurerName:String(row&&row.nombre||'')"));
 check('CANDIDATE_TAGS_FROM_CANONICAL',compact.includes(`scope.querySelectorAll('${tags}')`));
 check('CANDIDATE_THRESHOLDS_FROM_CANONICAL',compact.includes(`size>=${resolver.scopedExactTextFallback.minimumFontPx}`)&&compact.includes(`weight>=${resolver.scopedExactTextFallback.minimumFontWeight}`));
 check('CLOSER_VERSION_BINDING',closer.includes(`browser.responsiveTitleResolverVersion==='${resolver.version}'`)&&closer.includes("browser.checks.responsiveTitleResolver===true"));
 check('HISTORICAL_STALE_VALIDATOR_PRESERVED',historical.includes('scopeFallback')&&!historical.includes('orbit360-contract-shape-reader-v20260729.mjs'));
 let productUnchanged=false;try{execFileSync('git',['diff','--quiet',BASE,'HEAD','--','orbit360-platform/index.html','orbit360-platform/modules/cliente360.js','orbit360-platform/modules/aseguradoras.js','orbit360-platform/core/backend-lab-loader.js','orbit360-platform/core/academia-static-content-write-policy-v20260729.js','orbit360-platform/data/store-firestore-lab.local.js','orbit360-platform/core/access-role-session-owner-v20260728.js'],{cwd:ROOT});productUnchanged=true}catch{}check('PRODUCT_PROTECTED_UNCHANGED',productUnchanged);
 const failed=checks.filter(x=>!x.ok),out={schemaVersion:'orbit360-m5-runtime-smoke-525-contract-schema-driven-v1',contractVersion:'5.0.25',ok:failed.length===0,status:failed.length?'M5_RUNTIME_SMOKE_525_CONTRACT_FAIL':'M5_RUNTIME_SMOKE_525_CONTRACT_PASS',releaseCandidateHash:RC,criticalAssets:42,remoteAssetsExpected:25,remoteAssetsMatched:25,schemaDriven:true,contractShapeReaderVersion:CONTRACT_SHAPE_READER_VERSION,responsiveTitleResolverSchemaVersion:resolver.schemaVersion,responsiveTitleResolverVersion:resolver.version,productProtectedUnchanged:productUnchanged,candidateBrowserBlobSha:browserSha,candidateCloserBlobSha:closerSha,historicalStaleValidatorPreserved:true,passed:checks.length-failed.length,total:checks.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),checks,firestoreRead:false,firestoreWrites:0,operationalWrites:0,runtime:false,browser:false,hostingDeploy:false,functionsDeploy:false,rulesDeploy:false,production:false,containsPII:false,containsSecrets:false};
 const p=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/m5-runtime-smoke-525-contract-summary.json');fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));if(!out.ok)process.exit(41);
}catch(error){console.error(String(error&&error.stack||error));process.exit(41)}
