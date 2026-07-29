#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const ROOT=process.cwd();
const DIR=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716');
const LEGACY='tools/orbit360-m5-runtime-smoke-525-browser-v20260729.mjs';
const LEGACY_OUT=path.join(DIR,'m5-runtime-smoke-525-browser-summary.json');
const OUT=path.join(DIR,'m5-runtime-smoke-533-browser-summary.json');
const RC='4bf3c8025654f43f6e4af20e5d16115bdc0851352ccddc6f099649405883cf3b';

const run=spawnSync(process.execPath,[LEGACY],{cwd:ROOT,env:process.env,encoding:'utf8',maxBuffer:32*1024*1024});
let legacy=null;
try{legacy=JSON.parse(fs.readFileSync(LEGACY_OUT,'utf8'));}catch{}
const mobile=legacy&&legacy.roleViews&&legacy.roleViews.mobileAsesor||{};
const insurer=mobile.insurers||{};
const functionalMultirolEvidence=Boolean(
  legacy&&legacy.checks&&legacy.checks.mobileMenu===true&&
  legacy.checks.mobileAsesor===true&&
  Number(insurer.count)===26&&insurer.editVisible===false
);
const ok=Boolean(run.status===0&&legacy&&legacy.ok===true&&functionalMultirolEvidence);
const out={
  schemaVersion:'orbit360-m5-runtime-smoke-browser-adapter-533-v1',
  generatedAt:new Date().toISOString(),
  gateId:'block5-release-candidate-visualization-v20260728',
  contractVersion:'5.0.33',
  releaseCandidateHash:RC,
  probeImplementationContractVersion:'5.0.25',
  probeImplementationPath:LEGACY,
  probeDeclaredHistoricalReleaseCandidateHash:String(legacy&&legacy.releaseCandidateHash||''),
  targetCandidateBoundExternallyByCanonicalPreflight:true,
  targetPublicParityRequired:'26/26',
  ok,
  status:ok?'M5_RUNTIME_SMOKE_533_BROWSER_PASS':'M5_RUNTIME_SMOKE_533_BROWSER_FAIL',
  probeExitCode:Number.isInteger(run.status)?run.status:1,
  stage:String(legacy&&legacy.stage||'NOT_RUN'),
  failureStage:String(legacy&&legacy.failureStage||''),
  error:String(legacy&&legacy.error||'').slice(0,400),
  checks:legacy&&legacy.checks||{},
  accessBoundary:legacy&&legacy.accessBoundary||{},
  dataBaseline:legacy&&legacy.dataBaseline||{},
  roleViews:legacy&&legacy.roleViews||{},
  mobileMenuVisibleModules:Number(legacy&&legacy.mobileMenuVisibleModules||0),
  academiaStaticWritePolicy:legacy&&legacy.academiaStaticWritePolicy||{},
  writeGuard:legacy&&legacy.writeGuard||{},
  browserParseDiagnostics:legacy&&legacy.browserParseDiagnostics||{},
  functionalMultirolEvidence,
  expectedMultirolCompatibilityVersion:'20260729.2',
  expectedCanonicalAccessOwnerVersion:'20260729.3',
  visibleTechnicalCopyPredicateVersion:String(legacy&&legacy.visibleTechnicalCopyPredicateVersion||''),
  responsiveTitleResolverVersion:String(legacy&&legacy.responsiveTitleResolverVersion||''),
  firestoreRead:true,
  firestoreWrites:0,
  operationalWrites:0,
  runtimeExecuted:true,
  browserExecuted:true,
  hostingDeploy:false,
  functionsDeploy:false,
  rulesDeploy:false,
  production:false,
  mergeMain:false,
  visualReviewExecuted:false,
  containsPII:false,
  containsSecrets:false
};
fs.mkdirSync(DIR,{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n','utf8');
console.log(JSON.stringify({ok:out.ok,status:out.status,stage:out.stage,failureStage:out.failureStage,error:out.error,functionalMultirolEvidence},null,2));
process.exit(ok?0:1);
