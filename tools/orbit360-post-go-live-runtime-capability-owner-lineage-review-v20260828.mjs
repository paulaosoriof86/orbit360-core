#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const LEDGER='orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json';
const RUNTIME_REG='orbit360-platform/docs/orbit360-runtime-capability-registry-v20260828.json';
const PRODUCT_REG='orbit360-platform/docs/orbit360-certified-product-preservation-registry-v20260827.json';
const ASEG_REG='orbit360-platform/docs/orbit360-aseguradoras-preservation-registry-v20260827.json';
const CLOSURE_REG='orbit360-platform/docs/orbit360-approved-runtime-closure-registry-v20260829.json';
const ENTRY_REG='orbit360-platform/docs/orbit360-certified-product-entrypoint-contract-v20260830.json';
const VALIDATOR='tools/orbit360-validar-runtime-capability-composition-v20260828.mjs';
const ASEG_OWNER='orbit360-platform/core/client-insurer-operational-directory-owner-v20260722.js';
const PRODUCT_BOOT='orbit360-platform/core/router-tenant-config-product-bootstrap-p0.js';
const CLIENT='orbit360-platform/modules/cliente360.js';
const PRODUCT_AUTH='orbit360-platform/core/auth-product-runtime-p0.js';
const PRODUCT_STORE='orbit360-platform/data/store-firestore-product-readonly-p0.js';
const PRODUCT_HYDRATION='orbit360-platform/core/product-hydration-required-optional-p0.js';
const PRODUCT_ROUTER='orbit360-platform/core/router.js';
const PRODUCT_PWA='orbit360-platform/core/pwa.js';
const PRODUCT_SW='orbit360-platform/sw.js';
const PRODUCT_APP='orbit360-platform/core/product-app-p0.js';
const TRANSITION='POST_GO_LIVE_RUNTIME_CAPABILITY_OWNER_LINEAGE_REVIEW_SOURCE_ONLY';
const COMPOSITION_PASS='RUNTIME_CAPABILITY_CERTIFIED_PRODUCT_ENTRYPOINT_SOURCE_PACKAGE_CLOSURE_PASS_RUNTIME_PROOF_PENDING';
const ZERO_KEYS=['runtime','browser','secrets','firestoreRead','deploy','production','firestoreWrites','authWrites','operationalWrites','dataWrites','main','merge'];
const args=process.argv.slice(2);const val=f=>{const i=args.indexOf(f);return i>=0?String(args[i+1]||''):'';};
const intentPath=val('--intent')||process.env.ORBIT360_EXECUTION_INTENT||'';
const terminalOut=val('--terminal-out')||process.env.ORBIT360_TERMINAL_EVIDENCE||'';
const runId=Number(val('--run-id')||process.env.ORBIT360_EXECUTION_RUN_ID||0);
const selftest=args.includes('--source-only-selftest');
const A=p=>path.join(ROOT,p),T=p=>fs.readFileSync(A(p),'utf8').replace(/^\uFEFF/,''),J=p=>JSON.parse(T(p));
const readExternalJson=p=>JSON.parse(fs.readFileSync(path.resolve(p),'utf8').replace(/^\uFEFF/,''));
const write=(p,x)=>{if(!p)return;fs.mkdirSync(path.dirname(path.resolve(p)),{recursive:true});fs.writeFileSync(path.resolve(p),JSON.stringify(x,null,2)+'\n','utf8');};
const zero=extra=>({privilegedRiskObserved:false,secretAccess:false,firestoreRead:false,resetLinksGenerated:0,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,runtimeExecuted:false,browserExecuted:false,productMutation:false,dataMutation:false,containsPII:false,containsSecrets:false,...extra});
function fail(code,meta={}){const out=zero({schemaVersion:'orbit360-runtime-capability-owner-lineage-terminal-v3-certified-product-entrypoint',transitionId:TRANSITION,runId:Number.isInteger(runId)?runId:0,ok:false,status:'POST_GO_LIVE_RUNTIME_CAPABILITY_OWNER_LINEAGE_REVIEW_FAIL',classification:'PIPELINE_MECHANISM_FAILURE',failureCode:code,...meta});write(terminalOut,out);console.error(JSON.stringify({ok:false,status:out.status,classification:out.classification,code,containsPII:false,containsSecrets:false}));process.exit(41);}
function zeroScope(scope={}){for(const k of ZERO_KEYS)if(scope[k]!==false)throw new Error(`OWNER_LINEAGE_SCOPE_NOT_ZERO:${k}`);}
function runJson(script,argv=[]){const r=spawnSync(process.execPath,[A(script),...argv],{cwd:ROOT,encoding:'utf8',env:{...process.env,ORBIT360_ROOT:ROOT}});let out={};try{out=JSON.parse(String(r.stdout||'').trim());}catch{throw new Error(`OWNER_LINEAGE_DEPENDENCY_OUTPUT_INVALID:${script}`);}if(r.status!==0||out.ok!==true){const detail=out.code||out.failureCode||out.status||r.status;throw new Error(`OWNER_LINEAGE_DEPENDENCY_FAIL:${script}:${out.classification||'UNKNOWN'}:${detail}`);}return out;}
function inspect(I,L){if(I.schemaVersion!=='orbit360-execution-intent-v1'||I.transitionId!==TRANSITION)throw new Error('OWNER_LINEAGE_INTENT_INVALID');zeroScope(I.scope||{});if(!Number.isInteger(Number(I.acceptanceRunId))||Number(I.acceptanceRunId)<=0)throw new Error('OWNER_LINEAGE_ACCEPTANCE_RUN_INVALID');if(!/^[A-Za-z0-9_.:-]{1,180}$/.test(String(I.candidateId||'')))throw new Error('OWNER_LINEAGE_CANDIDATE_ID_INVALID');for(const k of ['candidateManifestSha256','patchManifestSha256'])if(!/^[a-f0-9]{64}$/.test(String(I[k]||'')))throw new Error(`OWNER_LINEAGE_DIGEST_INVALID:${k}`);const S=L.postGoLiveSuccessorAcceptance||{};if(S.status!=='ACCEPTED_SOURCE_ONLY_PENDING_COMPOSITION_VALIDATION'||S.classification!=='PASS'||Number(S.acceptanceRunId)!==Number(I.acceptanceRunId)||S.candidateId!==I.candidateId||S.candidateManifestSha256!==I.candidateManifestSha256||S.patchManifestSha256!==I.patchManifestSha256||S.certifiedBaselinePreserved!==true)throw new Error('OWNER_LINEAGE_ACCEPTANCE_BINDING_MISMATCH');}
function includesAll(src,needles){return needles.every(x=>src.includes(x));}
function review(){
  const R=J(RUNTIME_REG),P=J(PRODUCT_REG),D=J(ASEG_REG),C=J(CLOSURE_REG),E=J(ENTRY_REG),owner=T(ASEG_OWNER),boot=T(PRODUCT_BOOT),client=T(CLIENT),auth=T(PRODUCT_AUTH),store=T(PRODUCT_STORE),hydration=T(PRODUCT_HYDRATION),router=T(PRODUCT_ROUTER),pwa=T(PRODUCT_PWA),sw=T(PRODUCT_SW),app=T(PRODUCT_APP),L=J(LEDGER);
  const comp=runJson(VALIDATOR,[A('orbit360-platform')]);
  if(comp.status!==COMPOSITION_PASS||comp.classification!=='PASS'||comp.approvedPackageClosureOk!==true||comp.sourceCompositionOk!==true||comp.realProductEntrypointModel!==true||Number(comp.baselineArtifactId)!==9504702901||comp.runtimeProofSatisfied!==false)throw new Error('OWNER_LINEAGE_COMPOSITION_NOT_PASS');
  if(!Array.isArray(comp.packageClosure)||comp.packageClosure.length<7||comp.packageClosure.some(x=>x?.ok!==true))throw new Error('OWNER_LINEAGE_TRANSVERSAL_PACKAGE_CLOSURE_INCOMPLETE');
  if(E.status!=='CERTIFIED_ARTIFACT_ENTRYPOINT_BASELINE_WITH_SUCCESSOR_OVERLAYS'||Number(E.baseline?.artifactId)!==9504702901||E.rules?.sourceIndexIsNotProductEntrypointAuthority!==true)throw new Error('OWNER_LINEAGE_PRODUCT_ENTRYPOINT_AUTHORITY_INVALID');
  const caps=Array.isArray(R.capabilities)?R.capabilities:[],ids=caps.map(x=>x.capabilityId),expectedIds=['ASEGURADORAS_OPERATIONAL_DIRECTORY','CLIENTE360_PRIMARY_RUNTIME','LOGIN_INTERACTIVE_ENTRY'];
  if(JSON.stringify(ids)!==JSON.stringify(expectedIds))throw new Error('OWNER_LINEAGE_CAPABILITY_SET_INVALID');
  const aseg=caps[0],c360=caps[1],login=caps[2];
  if(aseg.finalOwner?.path!=='core/client-insurer-operational-directory-owner-v20260722.js'||aseg.finalOwner?.version!=='20260829.1'||aseg.finalOwner?.ownerId!=='clientInsurerOperationalDirectoryOwner')throw new Error('OWNER_LINEAGE_ASEG_FINAL_OWNER_INVALID');
  if(D.finalOperationalOwner?.version!=='20260829.1'||D.finalOperationalOwner?.semantics?.credentialRecordFallbackForAuthorizedRoles!==true||D.finalOperationalOwner?.semantics?.credentialProviderFallbackPreserved!==true||D.legacyConsumer?.mayBeFinalAuthority!==false)throw new Error('OWNER_LINEAGE_ASEG_DOMAIN_CONTRACT_INVALID');
  if(!includesAll(owner,["var VERSION = '20260829.1';","ownerId: 'clientInsurerOperationalDirectoryOwner'",'function inlineCredential(portal)','portal.password','portal.pass','portal.contrasena','portal.clave','Orbit.secureResources.revealCredential','writesStore: false','reimportsData: false']))throw new Error('OWNER_LINEAGE_ASEG_OWNER_SOURCE_INVALID');
  if(!boot.includes('client-insurer-operational-directory-owner-v20260722.js?v=20260829-1'))throw new Error('OWNER_LINEAGE_ASEG_PRODUCT_BOOTSTRAP_INVALID');
  const closureAseg=(C.capabilities||[]).find(x=>x.capabilityId==='ASEGURADORAS_OPERATIONAL_DIRECTORY');if(!closureAseg||closureAseg.finalOwnerVersion!=='20260829.1')throw new Error('OWNER_LINEAGE_ASEG_CLOSURE_INVALID');

  if(c360.finalOwner?.path!=='modules/cliente360.js'||c360.finalOwner?.ownerId!=='Orbit.modules.cliente360')throw new Error('OWNER_LINEAGE_CLIENT_OWNER_INVALID');
  if(!/S\s*=\s*\(\)\s*=>\s*Orbit\.store/.test(client)||!/S\(\)\.all\(['"]clientes['"]\)/.test(client)||!/rows\.length\s*===\s*0/.test(client))throw new Error('OWNER_LINEAGE_CLIENT_CURRENT_SEMANTICS_INVALID');
  if(!includesAll(store,["p0-20260830-authoritative-snapshot-1",'serverConfirmedCollections','cacheOnlyCollections','snapshot.metadata.fromCache']))throw new Error('OWNER_LINEAGE_PRODUCT_STORE_AUTHORITY_INVALID');
  if(!includesAll(hydration,["p0-20260830-authoritative-required-optional-1",'requiredObservedButUnconfirmed','authoritativeServerSnapshotRequired: true']))throw new Error('OWNER_LINEAGE_PRODUCT_HYDRATION_AUTHORITY_INVALID');
  const closureClient=(C.capabilities||[]).find(x=>x.capabilityId==='CLIENTE360_PRIMARY_RUNTIME');if(!closureClient||(closureClient.requiredPackageAssets||[]).includes('core/product-hydration-required-optional-p0.js')===false)throw new Error('OWNER_LINEAGE_CLIENT_CLOSURE_INVALID');

  if(login.finalOwner?.path!=='core/auth-product-runtime-p0.js'||login.finalOwner?.ownerId!=='Orbit.auth')throw new Error('OWNER_LINEAGE_LOGIN_OWNER_INVALID');
  if(!includesAll(auth,['Product Auth owner P0','p.signIn','Orbit.productAppP0.activate','noLocalSession:true'])||auth.includes('admin@demo.com')||auth.includes('orbit.lab@demo.com'))throw new Error('OWNER_LINEAGE_PRODUCT_AUTH_INVALID');
  if(!includesAll(app,['backendProductReadOnlyBootstrapP0','Orbit.router.init','showApp']))throw new Error('OWNER_LINEAGE_PRODUCT_APP_INVALID');
  if(!includesAll(router,['begin();','startupBlocking: false'])||/Promise\.race\([\s\S]{0,350}pwaReady[\s\S]{0,350}20000/.test(router))throw new Error('OWNER_LINEAGE_PWA_STILL_BLOCKS_ROUTER');
  if(!includesAll(pwa,['20260830-visual-runtime-rootfix-1','post-go-live-visual-runtime-rootfix-20260830-1']))throw new Error('OWNER_LINEAGE_PWA_RELEASE_INVALID');
  if(!includesAll(sw,['network-first-bounded-fallback',"'/core/router-tenant-config-product-bootstrap-p0.js'","'/core/auth-product-runtime-p0.js'","'/core/product-hydration-required-optional-p0.js'","'/data/store-firestore-product-readonly-p0.js'"])||sw.includes("'/core/router-tenant-config-bootstrap.js'"))throw new Error('OWNER_LINEAGE_SERVICE_WORKER_INVALID');
  const closureLogin=(C.capabilities||[]).find(x=>x.capabilityId==='LOGIN_INTERACTIVE_ENTRY');if(!closureLogin||(closureLogin.requiredPackageAssets||[]).includes('core/auth-product-runtime-p0.js')===false)throw new Error('OWNER_LINEAGE_LOGIN_CLOSURE_INVALID');

  const blockers=Array.isArray(L.functionalValidation?.blockers)?L.functionalValidation.blockers.map(x=>x.id):[];for(const id of ['INSURER_PORTAL_REVEAL_OPEN','CLIENT360_LIST_EMPTY_WITH_DATA_OPEN','LOGIN_LATENCY_OPEN'])if(!blockers.includes(id))throw new Error(`OWNER_LINEAGE_VISIBLE_BLOCKER_MISSING:${id}`);
  const overlay=new Map((P.activeOverlay?.acceptedFiles||[]).map(x=>[x.path,x]));
  for(const p of ['orbit360-platform/core/client-insurer-operational-directory-owner-v20260722.js','orbit360-platform/core/router-tenant-config-product-bootstrap-p0.js'])if(!overlay.has(p))throw new Error(`OWNER_LINEAGE_ASEG_ACCEPTED_OVERLAY_MISSING:${p}`);
  return {capabilityCount:caps.length,packageClosureCapabilityCount:comp.packageClosure.length,compositionValidatedNow:true,compositionValidatorStatus:comp.status,baselineArtifactId:Number(comp.baselineArtifactId),realProductEntrypointModel:true,aseguradoras:{finalOwner:aseg.finalOwner,directAuthorizedCredentialFallback:true,providerFallbackPreserved:true},cliente360:{finalOwner:c360.finalOwner,serverConfirmedReadiness:true,cacheOnlyCannotSatisfyRequiredReadiness:true,visualPass:false},login:{finalOwner:login.finalOwner,pwaStartupBlocking:false,serviceWorkerRuntimeContracts:'network-first-bounded-fallback',latencyStillOpen:true},visibleBlockersStillOpen:true,runtimeProofSatisfied:false};
}
if(selftest){try{const r=review();console.log(JSON.stringify(zero({ok:true,status:'POST_GO_LIVE_RUNTIME_CAPABILITY_OWNER_LINEAGE_REVIEW_SELFTEST_PASS',classification:'PASS',sourceOnly:true,latestExecutionTerminalDependency:false,...r}),null,2));process.exit(0);}catch(error){fail(String(error?.message||error));}}
try{if(!intentPath||!terminalOut||!Number.isInteger(runId)||runId<=0||!fs.existsSync(path.resolve(intentPath)))throw new Error('OWNER_LINEAGE_HANDLER_ARGS_INVALID');const I=readExternalJson(intentPath),L=J(LEDGER);inspect(I,L);const r=review();const terminal=zero({schemaVersion:'orbit360-runtime-capability-owner-lineage-terminal-v3-certified-product-entrypoint',transitionId:TRANSITION,runId,ok:true,status:'POST_GO_LIVE_RUNTIME_CAPABILITY_OWNER_LINEAGE_REVIEW_PASS',classification:'PASS',acceptanceRunId:Number(I.acceptanceRunId),candidateId:I.candidateId,candidateManifestSha256:I.candidateManifestSha256,patchManifestSha256:I.patchManifestSha256,sourceOnly:true,latestExecutionTerminalDependency:false,...r,evidencePath:`actions-artifact:orbit360-single-state-${runId}/orbit360-terminal.json`});write(terminalOut,terminal);console.log(JSON.stringify(terminal,null,2));}catch(error){fail(String(error?.message||error));}
