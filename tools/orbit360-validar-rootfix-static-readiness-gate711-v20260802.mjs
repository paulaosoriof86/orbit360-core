#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {VISUAL_SEAL} from './orbit360-policies-dual-path-provenance-constants-v20260801.mjs';
import {visualManifest} from './orbit360-policies-dual-path-provenance-lib-v20260801.mjs';

const ROOT=process.cwd();
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/gate711-rootfix-static-readiness-v20260802.json');
const EXPECTED='3d25a83218a4373513e1fff24ea9b12817d4c47be0fad08777e7f94867b3f676';
const OWNER='orbit360-platform/data/academia-v1230-operational-directory-v20260722.js';
const BOOTSTRAP='orbit360-platform/core/academia-static-content-write-policy-v20260729.js';
const BASE='820d1bb942e371104b481dde467485820bc8d103';
const REGISTRY='tools/orbit360-gate711-rootfix-lifecycle-registry-v20260802.json';
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const git=(...args)=>execFileSync('git',args,{cwd:ROOT,encoding:'utf8'}).trim();

const cumulative=json('tools/orbit360-cumulative-visual-candidate-contract-v20260801.json');
const registry=json(REGISTRY);
const lifecycleFile=String(process.env.ORBIT360_GATE711_LIFECYCLE_FILE||registry.activeLifecycleFile||'').trim();
const lifecycle=json(lifecycleFile);
const engine=read('tools/orbit360-validar-gate-contracts-engine-canonical-runtime-cumulative-visual-lab-v20260801.mjs');
const identityValidator=read('tools/orbit360-validar-identity-ephemeral-path-contract-v20260802.mjs');
const identityContract=read('tools/orbit360-identity-ephemeral-path-workflow-contract-v20260802.yml');
const owner=read(OWNER);
const bootstrap=read(BOOTSTRAP);
const manifest=visualManifest(ROOT);
const changed=git('diff','--name-only',BASE,'HEAD','--','orbit360-platform/index.html','orbit360-platform/modules','orbit360-platform/core','orbit360-platform/styles','orbit360-platform/data').split(/\r?\n/).map(x=>x.trim()).filter(Boolean).filter(file=>!file.includes('/runtime-gate-')).sort();
const expectedChanged=[BOOTSTRAP,OWNER].sort();
const lifecycleRootFixCommit=lifecycle.rootCause?.rootFixCommit||lifecycle.rootFix?.commit||'';
const lifecycleRootFixVersion=lifecycle.rootCause?.rootFixVersion||lifecycle.rootFix?.version||'';
const lifecycleReady=lifecycle.staticReadiness?.status==='GATE711_ROOTFIX_STATIC_READINESS_PASS'||lifecycle.staticEvidence?.integratedReadiness?.status==='GATE711_ROOTFIX_STATIC_READINESS_PASS';
const lifecycleRegistered=registry.schemaVersion==='orbit360-gate711-rootfix-lifecycle-registry-v1'&&registry.gateId==='block7-canonical-runtime-cumulative-visual-lab-v20260801'&&lifecycleFile===registry.activeLifecycleFile&&registry.allowedLifecycleStatuses.includes(lifecycle.status)&&lifecycle.authorization?.authorizationRef===registry.authorizationRef&&lifecycle.cumulativeManifest?.contentDigest===registry.requiredManifestDigest&&lifecycleRootFixCommit===registry.requiredRootFixCommit&&lifecycleRootFixVersion===registry.requiredRootFixVersion&&lifecycleReady&&registry.writesAllowed===false&&registry.deployAllowed===false&&registry.productionAllowed===false;
const checks=[
  {id:'VISUAL_SEAL_UPDATED',ok:VISUAL_SEAL.trackedFileCount===309&&VISUAL_SEAL.contentDigest===EXPECTED&&VISUAL_SEAL.sealRevision==='academia-bootstrap-rootfix-20260802.2'},
  {id:'ACTUAL_MANIFEST_MATCHES_SEAL',ok:manifest.manifestMatches===true&&manifest.contentDigest===EXPECTED&&manifest.trackedFileCount===309},
  {id:'CUMULATIVE_CONTRACT_MATCHES',ok:cumulative.status==='CUMULATIVE_VISUAL_CANDIDATE_MANIFEST_SEALED'&&cumulative.contractVersion==='1.3.0'&&cumulative.manifest.contentDigest===EXPECTED&&cumulative.authorizedIncrementalRootFix?.bootstrapRootFixCommit==='997fca628f95dd397dba347700a6bc644fe840f0'},
  {id:'ENGINE_MATCHES_LEDGER',ok:engine.includes(`const CONTENT_DIGEST='${EXPECTED}'`)&&engine.includes("add('ACADEMIA_OWNER_CONNECTED'")},
  {id:'LIFECYCLE_MATCHES_LEDGER',ok:lifecycleRegistered},
  {id:'ONLY_ACADEMIA_ROOTFIX_FILES_CHANGED',ok:changed.length===expectedChanged.length&&changed.every((file,index)=>file===expectedChanged[index])},
  {id:'ROOT_CAUSE_OWNER_FIXED',ok:owner.includes("F='20260802.1'")&&owner.includes('sessionChangeWrites:false')&&owner.includes('targetOnlyIdempotentUpsert:true')},
  {id:'SESSION_LISTENER_REMOVED',ok:!owner.includes("addEventListener('orbit:session'")},
  {id:'ACTIVE_BOOTSTRAP_LOADS_OWNER',ok:bootstrap.includes("BOOTSTRAP_VERSION='20260802.2'")&&bootstrap.includes("data/academia-v1230-operational-directory-v20260722.js?v=20260802-2")&&bootstrap.includes('script.async=false')&&bootstrap.includes('data-orbit-academia-operational-owner')&&bootstrap.includes('ensureOperationalDirectoryOwner();')},
  {id:'BOOTSTRAP_DUPLICATE_GUARD',ok:bootstrap.includes("document.querySelector('script[data-orbit-academia-operational-owner=\"20260722\"]')")&&bootstrap.includes("Orbit.academiaOperationalDirectoryV20260722.rootFix==='20260802.1'")},
  {id:'IDENTITY_VALIDATOR_USES_REGISTRY',ok:identityValidator.includes('orbit360-identity-ephemeral-path-workflow-contract-v20260802.yml')&&!identityValidator.includes('.github/workflows/orbit360-gate711-write-owner-diagnostic-runtime-v20260802.yml')},
  {id:'IDENTITY_CONTRACT_STATIC_ONLY',ok:identityContract.includes('status: STATIC_CONTRACT_ONLY')&&identityContract.includes('sameStep: true')&&identityContract.includes('writesAllowed: false')&&identityContract.includes('deployAllowed: false')},
  {id:'NO_PARALLEL_CANDIDATE',ok:cumulative.compositionPolicy?.singleCandidate===true&&cumulative.compositionPolicy?.parallelCandidatesAllowed===false&&cumulative.compositionPolicy?.reducedShellAllowed===false},
  {id:'APPROVAL_BOUNDARY_PRESERVED',ok:lifecycle.humanApproval?.clientes===registry.requiredApprovalBoundary.clientes&&lifecycle.humanApproval?.polizas===registry.requiredApprovalBoundary.polizas&&lifecycle.humanApproval?.vehiculos===registry.requiredApprovalBoundary.vehiculos&&lifecycle.humanApproval?.recibos===registry.requiredApprovalBoundary.recibos&&lifecycle.humanApproval?.cartera===registry.requiredApprovalBoundary.cartera}
];
const failed=checks.filter(x=>!x.ok);
const payload={schemaVersion:'orbit360-gate711-rootfix-static-readiness-v2',gateId:'block7-canonical-runtime-cumulative-visual-lab-v20260801',status:failed.length?'GATE711_ROOTFIX_STATIC_READINESS_FAIL':'GATE711_ROOTFIX_STATIC_READINESS_PASS',classification:failed.length?'VALIDATOR_STALE':'GO_STATIC_ROOTFIX_READINESS',lifecycleRegistry:{file:REGISTRY,activeLifecycleFile:lifecycleFile,status:lifecycle.status,authorizationRef:lifecycle.authorization?.authorizationRef||''},rootCause:{classification:'FUNCTIONAL_DEFECT',owner:BOOTSTRAP,missingRuntimeOwner:OWNER,trigger:'owner_not_loaded',runtimeFailureRun:30770397329},rootFix:{ownerCommit:'fd49e1b15e69d1f023727b4ff92190852bcae1e0',ownerVersion:'20260802.1',bootstrapCommit:'997fca628f95dd397dba347700a6bc644fe840f0',bootstrapVersion:'20260802.2'},manifest:{trackedFileCount:manifest.trackedFileCount,pathDigest:manifest.pathDigest,contentDigest:manifest.contentDigest,indexDigest:manifest.indexDigest,changedVisualPaths:changed},checks,total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),secretAccess:false,firestoreRead:false,firestoreWrites:0,operationalWrites:0,runtimeExecuted:false,browserExecuted:false,reimportExecuted:false,deployExecuted:false,production:false,containsPII:false,containsValues:false,containsSecrets:false,ok:failed.length===0};
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n','utf8');console.log(JSON.stringify(payload,null,2));process.exit(payload.ok?0:41);
