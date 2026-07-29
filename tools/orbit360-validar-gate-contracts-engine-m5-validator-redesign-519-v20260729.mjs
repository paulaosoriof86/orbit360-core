#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync,execFileSync} from 'node:child_process';
import {SOURCE_PREDICATE_HELPER_VERSION,hasParserBlockingFirebaseLoader,hasManualPolicyMutation,manualPolicyMutationDetails} from './orbit360-validator-source-predicate-helpers-v20260729.mjs';

const ROOT=process.cwd();
const GATE=process.argv[2]||'';
const EXPECTED_GATE='block5-release-candidate-visualization-v20260728';
const VERSION='5.0.19';
const RC='ae6bb2a35ce4f03c0353d670218c841e51b57a2461a3ba9e741d8bd7a973fd61';
const SUMMARY=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/m5-validator-redesign-519-summary.json');
const CANONICAL=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const checks=[];
const check=(id,ok,detail='')=>checks.push({id,ok:Boolean(ok),detail:String(detail||'').slice(0,240)});

function writeEvidence(out){
  fs.mkdirSync(path.dirname(SUMMARY),{recursive:true});
  const body=JSON.stringify(out,null,2)+'\n';
  fs.writeFileSync(SUMMARY,body,'utf8');
  fs.writeFileSync(CANONICAL,body,'utf8');
}

try{
  const lifecycle=json('tools/orbit360-validator-lifecycle-contract-m5-validator-redesign-519-v20260729.json');
  const overlay=json('tools/orbit360-gate-contract-overlay-m5-validator-redesign-519-v20260729.json');
  const freeze=json('tools/orbit360-m5-validator-redesign-519-freeze-v20260729.json');
  const registry=json('tools/orbit360-gate-contract-registry-extension-m5-validator-redesign-519-v20260729.json');
  const globalFreeze=json('tools/orbit360-m5-release-candidate-freeze-v20260728.json');
  const loader=read('orbit360-platform/core/backend-lab-loader.js');
  const candidate=read('tools/orbit360-m5-runtime-smoke-518-browser-v20260729.mjs');
  const closer=read('tools/orbit360-m5-runtime-smoke-518-close-v20260729.mjs');
  const workflow517=read('.github/workflows/orbit360-m5-policy-readiness-remediation-517-v20260729.yml');

  check('GATE',GATE===EXPECTED_GATE,GATE);
  check('BRANCH',(process.env.ORBIT360_BRANCH||'')==='ays/backend-tenant-lab-v99-20260703',process.env.ORBIT360_BRANCH||'');
  check('LIFECYCLE',lifecycle.gateContractVersion===VERSION&&lifecycle.executionProfile?.phase==='M5_VALIDATOR_REDESIGN_STATIC');
  const cap=lifecycle.executionProfile?.capabilities||{};
  check('ZERO_CAPABILITIES',Object.keys(cap).length===9&&Object.values(cap).every(v=>v===false));
  check('OVERLAY',overlay.contractVersion===VERSION&&overlay.phase==='M5_VALIDATOR_REDESIGN_STATIC'&&overlay.required?.releaseCandidateHash===RC&&overlay.required?.candidateRuntimeContractVersion==='5.0.18');
  const registered=registry.gates&&registry.gates[0];
  check('REGISTRY',registry.gates?.length===1&&registered?.gateId===EXPECTED_GATE&&registered?.contractVersion===VERSION&&registered?.phase==='M5_VALIDATOR_REDESIGN_STATIC'&&registered?.sourcePredicateHelper==='tools/orbit360-validator-source-predicate-helpers-v20260729.mjs');
  check('FREEZE_ONE_SHOT',freeze.contractVersion===VERSION&&freeze.authorization?.staticVerificationAuthorized===true&&freeze.authorization?.allowedExecutions===1&&freeze.authorization?.authorizationConsumed===false);
  check('GLOBAL_AUTH_ZERO',globalFreeze.authorization?.runtimeSmokeAuthorized===false&&globalFreeze.authorization?.allowedRuntimeSmokeExecutions===0&&globalFreeze.authorization?.visualReviewAuthorized===false&&globalFreeze.authorization?.productionAuthorized===false);
  check('PRIOR_517_STOPPED',globalFreeze.policyReadinessRemediation517?.sameStageFailedTwice===true&&globalFreeze.policyReadinessRemediation517?.retriesStopped===true&&globalFreeze.policyReadinessRemediation517?.thirdAttemptForbidden===true);
  check('PRIOR_517_WORKFLOW_FROZEN',workflow517.includes('workflow_dispatch:')&&!/\n\s*push\s*:/.test(workflow517));
  check('RC_UNCHANGED',globalFreeze.releaseCandidate?.hash===RC&&globalFreeze.releaseCandidate?.remoteVisualAssetsMatched===25&&globalFreeze.releaseCandidate?.mismatchCount===0&&globalFreeze.releaseCandidate?.remoteParity===true);
  check('CANDIDATE_518_NOT_EXECUTED',globalFreeze.policyReadinessRemediation517?.candidateRuntimeContractVersion==='5.0.18'&&globalFreeze.policyReadinessRemediation517?.candidateExecuted===false);
  check('HELPER_VERSION',SOURCE_PREDICATE_HELPER_VERSION==='20260729.1',SOURCE_PREDICATE_HELPER_VERSION);

  const fixtureSingle=`function write(src){ document.write('<script src="' + src + '"><\\/script>'); }\nwrite('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');\nwrite('https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js');\nwrite('https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js');`;
  const fixtureDouble=`function write(src){ document.write("<script src='" + src + "'><\\/script>"); }\nwrite("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");\nwrite("https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js");\nwrite("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js");`;
  check('LOADER_SEMANTIC_ACTUAL',hasParserBlockingFirebaseLoader(loader));
  check('LOADER_FIXTURE_SINGLE_QUOTES',hasParserBlockingFirebaseLoader(fixtureSingle));
  check('LOADER_FIXTURE_DOUBLE_QUOTES',hasParserBlockingFirebaseLoader(fixtureDouble));
  check('STRICT_EQUALITY_NOT_ASSIGNMENT',hasManualPolicyMutation("if(typeof Orbit.store._writePolicy==='function'){ok=true;}")===false);
  check('DIRECT_ASSIGNMENT_DETECTED',hasManualPolicyMutation('Orbit.store._writePolicy = classify;')===true);
  check('BRACKET_ASSIGNMENT_DETECTED',hasManualPolicyMutation("Orbit.store['_writePolicy'] = classify;")===true);
  check('MANUAL_INSTALL_DETECTED',hasManualPolicyMutation('Orbit.academiaStaticContentWritePolicy.install();')===true);
  const candidateMutation=manualPolicyMutationDetails(candidate);
  check('CANDIDATE_NO_MANUAL_POLICY_MUTATION',candidateMutation.manualMutation===false,JSON.stringify(candidateMutation));

  check('CANDIDATE_VERSION',candidate.includes("contractVersion:'5.0.18'")&&closer.includes("contractVersion:'5.0.18'"));
  check('CANDIDATE_POLICY_OWNER_SPLIT',candidate.includes("'academia_policy_owner_ready'")&&candidate.includes('ACADEMIA_POLICY_OWNER_NOT_READY')&&candidate.includes('ACADEMIA_STATIC_WRITE_POLICY_NOT_INSTALLED_AFTER_OWNER_READY'));
  check('CANDIDATE_POLICY_BUDGET',candidate.includes('POLICY_OWNER_WAIT_MS=60000')&&candidate.includes('POLICY_OWNER_BOUND_MS=65000'));
  const diagnosticsAt=candidate.indexOf('installBootstrapDiagnostics(page,report);');
  const navigationAt=candidate.indexOf("stage('open_lab_preview')");
  check('DIAGNOSTICS_BEFORE_NAVIGATION',diagnosticsAt>=0&&navigationAt>diagnosticsAt,`${diagnosticsAt}:${navigationAt}`);
  check('CLOSER_REQUIRES_POLICY_OWNER',closer.includes('policyOwnerReady:policyOwnerOk')&&closer.includes('browser.checks.academiaPolicyOwner===true'));

  for(const rel of ['tools/orbit360-validator-source-predicate-helpers-v20260729.mjs','tools/orbit360-m5-runtime-smoke-518-browser-v20260729.mjs','tools/orbit360-m5-runtime-smoke-518-close-v20260729.mjs']){
    const r=spawnSync(process.execPath,['--check',rel],{cwd:ROOT,encoding:'utf8'});
    check('SYNTAX:'+rel,r.status===0,(r.stderr||'').slice(0,180));
  }

  const protectedPaths=[
    'orbit360-platform/index.html',
    'orbit360-platform/core/backend-lab-loader.js',
    'orbit360-platform/core/academia-static-content-write-policy-v20260729.js',
    'orbit360-platform/data/store-firestore-lab.local.js',
    'orbit360-platform/core/access-role-session-owner-v20260728.js'
  ];
  let productUnchanged=false;
  try{execFileSync('git',['diff','--quiet','8c9e58f8dc5d5b9e49b5d917af81e265ad1ea919','HEAD','--',...protectedPaths],{cwd:ROOT});productUnchanged=true;}catch{}
  check('PRODUCT_PROTECTED_UNCHANGED',productUnchanged);

  const failed=checks.filter(x=>!x.ok);
  const out={
    schemaVersion:'orbit360-m5-validator-redesign-519-summary-v1',
    gateId:EXPECTED_GATE,
    contractVersion:VERSION,
    ok:failed.length===0,
    status:failed.length?'M5_VALIDATOR_REDESIGN_519_STATIC_FAIL':'M5_VALIDATOR_REDESIGN_519_STATIC_PASS',
    classification:'PIPELINE_MECHANISM_VALIDATOR_REDESIGN_STATIC',
    releaseCandidateHash:RC,
    candidateRuntimeContractVersion:'5.0.18',
    sourcePredicateHelperVersion:SOURCE_PREDICATE_HELPER_VERSION,
    semanticLoaderDetection:true,
    strictEqualityProtected:true,
    manualPolicyMutationDetectedInCandidate:candidateMutation.manualMutation,
    productProtectedUnchanged:productUnchanged,
    candidateExecuted:false,
    passed:checks.length-failed.length,
    total:checks.length,
    failed:failed.length,
    failedCheckIds:failed.map(x=>x.id),
    checks,
    firestoreRead:false,
    firestoreWrites:0,
    operationalWrites:0,
    runtime:false,
    browser:false,
    secrets:false,
    deploy:false,
    hostingDeploy:false,
    functionsDeploy:false,
    rulesDeploy:false,
    production:false,
    mergeMain:false,
    visualReview:false,
    policies:false,
    'pólizas':false,
    containsPII:false,
    containsSecrets:false
  };
  writeEvidence(out);
  console.log(JSON.stringify(out,null,2));
  if(!out.ok)process.exit(41);
}catch(error){
  const out={schemaVersion:'orbit360-m5-validator-redesign-519-summary-v1',gateId:EXPECTED_GATE,contractVersion:VERSION,ok:false,status:'M5_VALIDATOR_REDESIGN_519_ENGINE_ERROR',classification:'PIPELINE_MECHANISM_FAILURE',failed:1,failedCheckIds:['ENGINE_EXCEPTION'],error:String(error&&error.message||error).slice(0,500),firestoreRead:false,firestoreWrites:0,operationalWrites:0,runtime:false,browser:false,secrets:false,deploy:false,hostingDeploy:false,functionsDeploy:false,rulesDeploy:false,production:false,mergeMain:false,visualReview:false,policies:false,'pólizas':false,containsPII:false,containsSecrets:false};
  writeEvidence(out);
  console.error(JSON.stringify(out,null,2));
  process.exit(41);
}
