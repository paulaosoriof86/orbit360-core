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
const VALIDATOR='tools/orbit360-validar-runtime-capability-composition-v20260828.mjs';
const INDEX='orbit360-platform/index.html';
const ASEG_OWNER='orbit360-platform/core/client-insurer-operational-directory-owner-v20260722.js';
const CLIENT='orbit360-platform/modules/cliente360.js';
const AUTH='orbit360-platform/core/auth.js';
const SESSION='orbit360-platform/core/access-role-session-owner-v20260728.js';
const TRANSITION='POST_GO_LIVE_RUNTIME_CAPABILITY_OWNER_LINEAGE_REVIEW_SOURCE_ONLY';
const COMPOSITION_PASS='RUNTIME_CAPABILITY_APPROVED_BASELINE_SOURCE_PACKAGE_CLOSURE_PASS_RUNTIME_PROOF_PENDING';
const ZERO_KEYS=['runtime','browser','secrets','firestoreRead','deploy','production','firestoreWrites','authWrites','operationalWrites','dataWrites','main','merge'];
const args=process.argv.slice(2);
const val=f=>{const i=args.indexOf(f);return i>=0?String(args[i+1]||''):'';};
const intentPath=val('--intent')||process.env.ORBIT360_EXECUTION_INTENT||'';
const terminalOut=val('--terminal-out')||process.env.ORBIT360_TERMINAL_EVIDENCE||'';
const runId=Number(val('--run-id')||process.env.ORBIT360_EXECUTION_RUN_ID||0);
const selftest=args.includes('--source-only-selftest');
const A=p=>path.join(ROOT,p);
const T=p=>fs.readFileSync(A(p),'utf8').replace(/^\uFEFF/,'');
const J=p=>JSON.parse(T(p));
const readExternalJson=p=>JSON.parse(fs.readFileSync(path.resolve(p),'utf8').replace(/^\uFEFF/,''));
const write=(p,x)=>{if(!p)return;fs.mkdirSync(path.dirname(path.resolve(p)),{recursive:true});fs.writeFileSync(path.resolve(p),JSON.stringify(x,null,2)+'\n','utf8');};
const zero=extra=>({privilegedRiskObserved:false,secretAccess:false,firestoreRead:false,resetLinksGenerated:0,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,runtimeExecuted:false,browserExecuted:false,productMutation:false,dataMutation:false,containsPII:false,containsSecrets:false,...extra});
function fail(code,meta={}){const out=zero({schemaVersion:'orbit360-runtime-capability-owner-lineage-terminal-v2-current-contracts',transitionId:TRANSITION,runId:Number.isInteger(runId)?runId:0,ok:false,status:'POST_GO_LIVE_RUNTIME_CAPABILITY_OWNER_LINEAGE_REVIEW_FAIL',classification:'PIPELINE_MECHANISM_FAILURE',failureCode:code,...meta});write(terminalOut,out);console.error(JSON.stringify({ok:false,status:out.status,classification:out.classification,code,containsPII:false,containsSecrets:false}));process.exit(41);}
function zeroScope(scope={}){for(const k of ZERO_KEYS)if(scope[k]!==false)throw new Error(`OWNER_LINEAGE_SCOPE_NOT_ZERO:${k}`);}
function runJson(script,argv=[]){const r=spawnSync(process.execPath,[A(script),...argv],{cwd:ROOT,encoding:'utf8',env:{...process.env,ORBIT360_ROOT:ROOT}});let out={};try{out=JSON.parse(String(r.stdout||'').trim());}catch{throw new Error(`OWNER_LINEAGE_DEPENDENCY_OUTPUT_INVALID:${script}`);}if(r.status!==0||out.ok!==true){const detail=out.code||out.failureCode||out.status||r.status;throw new Error(`OWNER_LINEAGE_DEPENDENCY_FAIL:${script}:${out.classification||'UNKNOWN'}:${detail}`);}return out;}
function inspect(I,L){
  if(I.schemaVersion!=='orbit360-execution-intent-v1'||I.transitionId!==TRANSITION)throw new Error('OWNER_LINEAGE_INTENT_INVALID');
  zeroScope(I.scope||{});
  if(!Number.isInteger(Number(I.acceptanceRunId))||Number(I.acceptanceRunId)<=0)throw new Error('OWNER_LINEAGE_ACCEPTANCE_RUN_INVALID');
  if(!/^[A-Za-z0-9_.:-]{1,180}$/.test(String(I.candidateId||'')))throw new Error('OWNER_LINEAGE_CANDIDATE_ID_INVALID');
  for(const k of ['candidateManifestSha256','patchManifestSha256'])if(!/^[a-f0-9]{64}$/.test(String(I[k]||'')))throw new Error(`OWNER_LINEAGE_DIGEST_INVALID:${k}`);
  const S=L.postGoLiveSuccessorAcceptance||{};
  if(S.status!=='ACCEPTED_SOURCE_ONLY_PENDING_COMPOSITION_VALIDATION'||S.classification!=='PASS'||Number(S.acceptanceRunId)!==Number(I.acceptanceRunId)||S.candidateId!==I.candidateId||S.candidateManifestSha256!==I.candidateManifestSha256||S.patchManifestSha256!==I.patchManifestSha256||S.certifiedBaselinePreserved!==true)throw new Error('OWNER_LINEAGE_ACCEPTANCE_BINDING_MISMATCH');
}
function review(){
  const R=J(RUNTIME_REG),P=J(PRODUCT_REG),D=J(ASEG_REG),C=J(CLOSURE_REG),index=T(INDEX),owner=T(ASEG_OWNER),client=T(CLIENT),auth=T(AUTH),session=T(SESSION),L=J(LEDGER);
  const comp=runJson(VALIDATOR,[A('orbit360-platform')]);
  if(comp.status!==COMPOSITION_PASS||comp.classification!=='PASS'||comp.approvedPackageClosureOk!==true||comp.sourceCompositionOk!==true||comp.aseguradorasFinalOwnerAligned!==true||Number(comp.baselineArtifactId)!==9504702901||comp.runtimeProofSatisfied!==false)throw new Error('OWNER_LINEAGE_COMPOSITION_NOT_PASS');
  if(!Array.isArray(comp.packageClosure)||comp.packageClosure.length<6||comp.packageClosure.some(x=>x?.ok!==true))throw new Error('OWNER_LINEAGE_TRANSVERSAL_PACKAGE_CLOSURE_INCOMPLETE');
  const caps=Array.isArray(R.capabilities)?R.capabilities:[],ids=caps.map(x=>x.capabilityId),expectedIds=['ASEGURADORAS_OPERATIONAL_DIRECTORY','CLIENTE360_PRIMARY_RUNTIME','LOGIN_INTERACTIVE_ENTRY'];
  if(JSON.stringify(ids)!==JSON.stringify(expectedIds))throw new Error('OWNER_LINEAGE_CAPABILITY_SET_INVALID');
  const aseg=caps[0],c360=caps[1],login=caps[2];
  if(aseg.finalOwner?.path!=='core/client-insurer-operational-directory-owner-v20260722.js'||aseg.finalOwner?.version!=='20260829.1'||aseg.finalOwner?.ownerId!=='clientInsurerOperationalDirectoryOwner')throw new Error('OWNER_LINEAGE_ASEG_FINAL_OWNER_INVALID');
  if(D.finalOperationalOwner?.path!=='orbit360-platform/core/client-insurer-operational-directory-owner-v20260722.js'||D.finalOperationalOwner?.version!=='20260829.1'||D.finalOperationalOwner?.semantics?.credentialRecordFallbackForAuthorizedRoles!==true||D.finalOperationalOwner?.semantics?.credentialProviderFallbackPreserved!==true||D.legacyConsumer?.mayBeFinalAuthority!==false)throw new Error('OWNER_LINEAGE_ASEG_DOMAIN_CONTRACT_INVALID');
  if(!owner.includes("var VERSION = '20260829.1';")||!owner.includes("ownerId: 'clientInsurerOperationalDirectoryOwner'")||!owner.includes('function inlineCredential(portal)')||!owner.includes('portal.password')||!owner.includes('portal.pass')||!owner.includes('portal.contrasena')||!owner.includes('portal.clave')||!owner.includes('Orbit.secureResources.revealCredential')||!owner.includes('writesStore: false')||!owner.includes('reimportsData: false'))throw new Error('OWNER_LINEAGE_ASEG_OWNER_SOURCE_INVALID');
  const closureAseg=(C.capabilities||[]).find(x=>x.capabilityId==='ASEGURADORAS_OPERATIONAL_DIRECTORY');
  if(!closureAseg||closureAseg.finalOwner!=='core/client-insurer-operational-directory-owner-v20260722.js'||closureAseg.finalOwnerVersion!=='20260829.1'||!(closureAseg.requiredPackageAssets||[]).includes('core/client-insurer-operational-directory-owner-v20260722.js'))throw new Error('OWNER_LINEAGE_ASEG_CLOSURE_INVALID');
  if(c360.finalOwner?.path!=='modules/cliente360.js'||c360.finalOwner?.ownerId!=='Orbit.modules.cliente360'||!index.includes('<script src="modules/cliente360.js?v1360"></script>'))throw new Error('OWNER_LINEAGE_CLIENT_OWNER_INVALID');
  if(!/S\s*=\s*\(\)\s*=>\s*Orbit\.store/.test(client)||!/S\(\)\.all\(['"]clientes['"]\)/.test(client)||!/rows\.length\s*===\s*0/.test(client))throw new Error('OWNER_LINEAGE_CLIENT_CURRENT_SEMANTICS_INVALID');
  const closureClient=(C.capabilities||[]).find(x=>x.capabilityId==='CLIENTE360_PRIMARY_RUNTIME');
  if(!closureClient||(closureClient.requiredPackageAssets||[]).indexOf('modules/cliente360.js')<0)throw new Error('OWNER_LINEAGE_CLIENT_CLOSURE_INVALID');
  if(login.finalOwner?.path!=='core/auth.js'||login.finalOwner?.ownerId!=='Orbit.auth')throw new Error('OWNER_LINEAGE_LOGIN_OWNER_INVALID');
  if(!auth.includes('Orbit.auth = (function ()')||!auth.includes('signInWithEmailAndPassword')||!auth.includes('waitForMembership')||!auth.includes('withTimeout')||!auth.includes('AUTH_SIGNIN_TIMEOUT')||!auth.includes('attempts >= 180')||!auth.includes('attempts < 120')||!session.includes('function productProjection()')||!session.includes('function syncFromAuth()')||session.includes('signInWithEmailAndPassword'))throw new Error('OWNER_LINEAGE_LOGIN_ROLE_SEPARATION_INVALID');
  const closureLogin=(C.capabilities||[]).find(x=>x.capabilityId==='LOGIN_INTERACTIVE_ENTRY');
  if(closureLogin)throw new Error('OWNER_LINEAGE_LOGIN_SHOULD_BE_RUNTIME_PROOF_CAPABILITY_NOT_PACKAGE_MODULE_CLOSURE');
  const overlay=new Map((P.activeOverlay?.acceptedFiles||[]).map(x=>[x.path,x]));
  for(const p of ['orbit360-platform/core/client-insurer-operational-directory-owner-v20260722.js','orbit360-platform/core/router-tenant-config-product-bootstrap-p0.js'])if(!overlay.has(p)||Number(overlay.get(p).acceptanceRunId)!==33284848913)throw new Error(`OWNER_LINEAGE_ACCEPTED_OVERLAY_MISSING:${p}`);
  const blockers=Array.isArray(L.functionalValidation?.blockers)?L.functionalValidation.blockers.map(x=>x.id):[];
  for(const id of ['INSURER_PORTAL_REVEAL_OPEN','CLIENT360_LIST_EMPTY_WITH_DATA_OPEN','LOGIN_LATENCY_OPEN'])if(!blockers.includes(id))throw new Error(`OWNER_LINEAGE_VISIBLE_BLOCKER_MISSING:${id}`);
  return {capabilityCount:caps.length,packageClosureCapabilityCount:comp.packageClosure.length,compositionValidatedNow:true,compositionValidatorStatus:comp.status,baselineArtifactId:Number(comp.baselineArtifactId),aseguradoras:{finalOwner:aseg.finalOwner,legacyConsumerFinalAuthority:false,directAuthorizedCredentialFallback:true,providerFallbackPreserved:true},cliente360:{finalOwner:c360.finalOwner,currentStoreWrapperSemantics:true,currentEmptyStateSemantics:true,visualPass:false},login:{finalOwner:login.finalOwner,sessionRoleOwner:'core/access-role-session-owner-v20260728.js',interactiveLoginOwnerPreserved:true,boundedWaitsValidated:true,latencyStillOpen:true},visibleBlockersStillOpen:true,runtimeProofSatisfied:false};
}
if(selftest){try{const r=review();console.log(JSON.stringify(zero({ok:true,status:'POST_GO_LIVE_RUNTIME_CAPABILITY_OWNER_LINEAGE_REVIEW_SELFTEST_PASS',classification:'PASS',sourceOnly:true,latestExecutionTerminalDependency:false,...r}),null,2));process.exit(0);}catch(error){fail(String(error?.message||error));}}
try{if(!intentPath||!terminalOut||!Number.isInteger(runId)||runId<=0||!fs.existsSync(path.resolve(intentPath)))throw new Error('OWNER_LINEAGE_HANDLER_ARGS_INVALID');const I=readExternalJson(intentPath),L=J(LEDGER);inspect(I,L);const r=review();const terminal=zero({schemaVersion:'orbit360-runtime-capability-owner-lineage-terminal-v2-current-contracts',transitionId:TRANSITION,runId,ok:true,status:'POST_GO_LIVE_RUNTIME_CAPABILITY_OWNER_LINEAGE_REVIEW_PASS',classification:'PASS',acceptanceRunId:Number(I.acceptanceRunId),candidateId:I.candidateId,candidateManifestSha256:I.candidateManifestSha256,patchManifestSha256:I.patchManifestSha256,sourceOnly:true,latestExecutionTerminalDependency:false,...r,evidencePath:`actions-artifact:orbit360-single-state-${runId}/orbit360-terminal.json`});write(terminalOut,terminal);console.log(JSON.stringify({ok:true,status:terminal.status,classification:'PASS',acceptanceRunId:terminal.acceptanceRunId,capabilityCount:terminal.capabilityCount,packageClosureCapabilityCount:terminal.packageClosureCapabilityCount,compositionValidatedNow:true,baselineArtifactId:terminal.baselineArtifactId,aseguradoras:terminal.aseguradoras,cliente360:terminal.cliente360,login:terminal.login,visibleBlockersStillOpen:true,runtimeProofSatisfied:false,latestExecutionTerminalDependency:false,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false},null,2));}catch(error){fail(String(error?.message||error));}
