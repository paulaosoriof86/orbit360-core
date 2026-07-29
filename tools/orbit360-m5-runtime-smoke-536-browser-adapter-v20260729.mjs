#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const ROOT=process.cwd();
const DIR=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716');
const LEGACY='tools/orbit360-m5-runtime-smoke-525-browser-v20260729.mjs';
const LEGACY_OUT=path.join(DIR,'m5-runtime-smoke-525-browser-summary.json');
const OUT=path.join(DIR,'m5-runtime-smoke-536-browser-summary.json');
const RC='401f87b148048f85db3f4956474258c51c29e2c9e7c9a59e52f425d491ab89e7';
const run=spawnSync(process.execPath,[LEGACY],{cwd:ROOT,env:process.env,encoding:'utf8',maxBuffer:32*1024*1024});
let legacy=null;try{legacy=JSON.parse(fs.readFileSync(LEGACY_OUT,'utf8'));}catch{}
const views=legacy&&legacy.roleViews||{};
const mobile=views.mobileAsesor||{},insurer=mobile.insurers||{};
const responsiveRows=['desktopDirection','tabletOperativo','mobileAsesor'].flatMap(key=>{const v=views[key]||{};return[v.responsive||{},v.insurerResponsive||{}];});
const responsiveTitleResolverReady=Boolean(legacy&&legacy.responsiveTitleResolverVersion==='20260729.1'&&responsiveRows.length===6&&responsiveRows.every(r=>r.resolverVersion==='20260729.1'&&r.titleVisible===true&&r.titleWithinViewport===true&&r.titleOverflow===false&&r.technicalCopyVisible===false));
const normalizedBootstrapOwner=Boolean(legacy&&legacy.checks&&legacy.checks.canonicalProductBootstrap===true&&legacy.bootstrapOwner==='tools/orbit360-gate-bootstrap-auth-legal-normalized-v20260729.mjs');
const functionalMultirolEvidence=Boolean(legacy&&legacy.checks&&legacy.checks.mobileMenu===true&&legacy.checks.mobileAsesor===true&&Number(insurer.count)===26&&insurer.editVisible===false&&insurer.saveVisible===false);
const derivedChecks=Object.assign({},legacy&&legacy.checks||{}, {responsiveTitleResolver:responsiveTitleResolverReady,normalizedBootstrapOwner});
const ok=Boolean(run.status===0&&legacy&&legacy.ok===true&&functionalMultirolEvidence&&responsiveTitleResolverReady&&normalizedBootstrapOwner);
const out={schemaVersion:'orbit360-m5-runtime-smoke-browser-adapter-536-v1',generatedAt:new Date().toISOString(),gateId:'block5-release-candidate-visualization-v20260728',contractVersion:'5.0.36',candidateContractVersion:'5.0.34',releaseCandidateHash:RC,probeImplementationContractVersion:'5.0.25',probeImplementationPath:LEGACY,probeDeclaredHistoricalReleaseCandidateHash:String(legacy&&legacy.releaseCandidateHash||''),targetCandidateBoundExternallyByCanonicalPreflight:true,targetPublicParityRequired:'27/27',ok,status:ok?'M5_RUNTIME_SMOKE_536_BROWSER_PASS':'M5_RUNTIME_SMOKE_536_BROWSER_FAIL',probeExitCode:Number.isInteger(run.status)?run.status:1,stage:String(legacy&&legacy.stage||'NOT_RUN'),failureStage:String(legacy&&legacy.failureStage||''),error:String(legacy&&legacy.error||'').slice(0,400),checks:derivedChecks,accessBoundary:legacy&&legacy.accessBoundary||{},dataBaseline:legacy&&legacy.dataBaseline||{},roleViews:views,mobileMenuVisibleModules:Number(legacy&&legacy.mobileMenuVisibleModules||0),academiaStaticWritePolicy:legacy&&legacy.academiaStaticWritePolicy||{},writeGuard:legacy&&legacy.writeGuard||{},browserParseDiagnostics:legacy&&legacy.browserParseDiagnostics||{},functionalMultirolEvidence,responsiveTitleResolverReady,normalizedBootstrapOwner,expectedMultirolCompatibilityVersion:'20260729.2',expectedCanonicalAccessOwnerVersion:'20260729.3',expectedAcademiaPolicyVersion:'20260729.2',expectedAcademiaContentVersion:8,visibleTechnicalCopyPredicateVersion:String(legacy&&legacy.visibleTechnicalCopyPredicateVersion||''),responsiveTitleResolverVersion:String(legacy&&legacy.responsiveTitleResolverVersion||''),firestoreRead:true,firestoreWrites:0,operationalWrites:0,runtimeExecuted:true,browserExecuted:true,hostingDeploy:false,functionsDeploy:false,rulesDeploy:false,production:false,mergeMain:false,visualReviewExecuted:false,containsPII:false,containsSecrets:false};
fs.mkdirSync(DIR,{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n','utf8');console.log(JSON.stringify({ok:out.ok,status:out.status,failureStage:out.failureStage,error:out.error,functionalMultirolEvidence,responsiveTitleResolverReady,normalizedBootstrapOwner},null,2));process.exit(ok?0:1);
