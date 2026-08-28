#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const LEDGER='orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json';
const RUNTIME_REG='orbit360-platform/docs/orbit360-runtime-capability-registry-v20260828.json';
const PRODUCT_REG='orbit360-platform/docs/orbit360-certified-product-preservation-registry-v20260827.json';
const ASEG_REG='orbit360-platform/docs/orbit360-aseguradoras-preservation-registry-v20260827.json';
const VALIDATOR='tools/orbit360-validar-runtime-capability-composition-v20260828.mjs';
const INDEX='orbit360-platform/index.html';
const ASEG_OWNER='orbit360-platform/core/client-insurer-operational-directory-owner-v20260722.js';
const ASEG_BRIDGE='orbit360-platform/modules/aseguradoras-v1202-resources-bridge.js';
const P09_BOOT='orbit360-platform/core/aseguradoras-runtime-bootstrap-p09f.js';
const CLIENT='orbit360-platform/modules/cliente360.js';
const CLIENT_DOC='orbit360-platform/docs/CLIENTE360-LINEAGE-PRESERVATION-CLOSURE-20260827.md';
const AUTH='orbit360-platform/core/auth.js';
const SESSION='orbit360-platform/core/access-role-session-owner-v20260728.js';
const TRANSITION='POST_GO_LIVE_RUNTIME_CAPABILITY_OWNER_LINEAGE_REVIEW_SOURCE_ONLY';
const EXPECTED_CLIENT_BLOB='fa50bae659ed03909a220d720fc0305838c75b31';
const P09_SUPPORT=['modules/aseguradoras-batch-admin-form-p09j.js','modules/aseguradoras-knowledge-p09.js','modules/aseguradoras-knowledge-panel-p09f.js'];
const args=process.argv.slice(2);
const val=f=>{const i=args.indexOf(f);return i>=0?String(args[i+1]||''):'';};
const intentPath=val('--intent')||process.env.ORBIT360_EXECUTION_INTENT||'';
const terminalOut=val('--terminal-out')||process.env.ORBIT360_TERMINAL_EVIDENCE||'';
const runId=Number(val('--run-id')||process.env.ORBIT360_EXECUTION_RUN_ID||0);
const selftest=args.includes('--source-only-selftest');
const A=p=>path.join(ROOT,p);
const T=p=>fs.readFileSync(A(p),'utf8').replace(/^\uFEFF/,'');
const J=p=>JSON.parse(T(p));
const write=(p,x)=>{if(!p)return;fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(x,null,2)+'\n','utf8');};
const zero=extra=>({privilegedRiskObserved:false,secretAccess:false,firestoreRead:false,resetLinksGenerated:0,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,runtimeExecuted:false,browserExecuted:false,productMutation:false,dataMutation:false,containsPII:false,containsSecrets:false,...extra});
const gitBlobSha=buf=>createHash('sha1').update(Buffer.from(`blob ${buf.length}\0`)).update(buf).digest('hex');
function fail(code,meta={}){const out=zero({schemaVersion:'orbit360-runtime-capability-owner-lineage-terminal-v1',transitionId:TRANSITION,runId:Number.isInteger(runId)?runId:0,ok:false,status:'POST_GO_LIVE_RUNTIME_CAPABILITY_OWNER_LINEAGE_REVIEW_FAIL',classification:'PIPELINE_MECHANISM_FAILURE',failureCode:code,...meta});write(terminalOut,out);console.error(JSON.stringify({ok:false,status:out.status,classification:out.classification,code,containsPII:false,containsSecrets:false}));process.exit(41);}
function zeroScope(scope={}){for(const k of ['runtime','browser','secrets','firestoreRead','deploy','production','firestoreWrites','authWrites','operationalWrites','dataWrites','main','merge'])if(scope[k]!==false)throw new Error(`OWNER_LINEAGE_SCOPE_NOT_ZERO:${k}`);}
function runJson(script,argv=[]){const r=spawnSync(process.execPath,[A(script),...argv],{cwd:ROOT,encoding:'utf8',env:{...process.env,ORBIT360_ROOT:ROOT}});let out={};try{out=JSON.parse(String(r.stdout||'').trim());}catch{throw new Error(`OWNER_LINEAGE_DEPENDENCY_OUTPUT_INVALID:${script}`);}if(r.status!==0||out.ok!==true)throw new Error(`OWNER_LINEAGE_DEPENDENCY_FAIL:${script}:${out.status||r.status}`);return out;}
function inspect(I,L){
  if(I.schemaVersion!=='orbit360-execution-intent-v1'||I.transitionId!==TRANSITION)throw new Error('OWNER_LINEAGE_INTENT_INVALID');
  zeroScope(I.scope||{});
  if(!Number.isInteger(Number(I.compositionRunId))||Number(I.compositionRunId)<=0)throw new Error('OWNER_LINEAGE_COMPOSITION_RUN_INVALID');
  if(!Number.isInteger(Number(I.acceptanceRunId))||Number(I.acceptanceRunId)<=0)throw new Error('OWNER_LINEAGE_ACCEPTANCE_RUN_INVALID');
  for(const k of ['candidateManifestSha256','patchManifestSha256'])if(!/^[a-f0-9]{64}$/.test(String(I[k]||'')))throw new Error(`OWNER_LINEAGE_DIGEST_INVALID:${k}`);
  const H=L.history?.latestExecutionTerminal||{};
  if(H.transitionId!=='POST_GO_LIVE_RUNTIME_CAPABILITY_COMPOSITION_VALIDATE_SOURCE_ONLY'||H.ok!==true||H.classification!=='PASS'||Number(H.runId)!==Number(I.compositionRunId)||H.status!=='POST_GO_LIVE_RUNTIME_CAPABILITY_COMPOSITION_VALIDATION_PASS'||Number(H.acceptanceRunId)!==Number(I.acceptanceRunId)||H.candidateId!==I.candidateId||H.candidateManifestSha256!==I.candidateManifestSha256||H.patchManifestSha256!==I.patchManifestSha256)throw new Error('OWNER_LINEAGE_D3_BINDING_NOT_PASS');
  const S=L.postGoLiveSuccessorAcceptance||{};
  if(S.status!=='ACCEPTED_SOURCE_ONLY_PENDING_COMPOSITION_VALIDATION'||S.classification!=='PASS'||Number(S.acceptanceRunId)!==Number(I.acceptanceRunId)||S.candidateId!==I.candidateId||S.candidateManifestSha256!==I.candidateManifestSha256||S.patchManifestSha256!==I.patchManifestSha256)throw new Error('OWNER_LINEAGE_ACCEPTANCE_BINDING_MISMATCH');
}
function review(){
  const R=J(RUNTIME_REG),P=J(PRODUCT_REG),D=J(ASEG_REG),index=T(INDEX),owner=T(ASEG_OWNER),bridge=T(ASEG_BRIDGE),boot=T(P09_BOOT),clientDoc=T(CLIENT_DOC),auth=T(AUTH),session=T(SESSION),L=J(LEDGER);
  const comp=runJson(VALIDATOR,[A('orbit360-platform')]);
  if(comp.status!=='RUNTIME_CAPABILITY_COMPOSITION_PASS'||comp.classification!=='PASS'||comp.aseguradorasFinalOwnerAligned!==true)throw new Error('OWNER_LINEAGE_COMPOSITION_NOT_PASS');
  const caps=Array.isArray(R.capabilities)?R.capabilities:[],ids=caps.map(x=>x.capabilityId);
  const expectedIds=['ASEGURADORAS_OPERATIONAL_DIRECTORY','CLIENTE360_PRIMARY_RUNTIME','LOGIN_INTERACTIVE_ENTRY'];
  if(JSON.stringify(ids)!==JSON.stringify(expectedIds))throw new Error('OWNER_LINEAGE_CAPABILITY_SET_INVALID');
  const aseg=caps[0],c360=caps[1],login=caps[2];
  if(aseg.finalOwner?.path!=='core/client-insurer-operational-directory-owner-v20260722.js'||aseg.finalOwner?.version!=='20260723.2'||aseg.finalOwner?.ownerId!=='clientInsurerOperationalDirectoryOwner')throw new Error('OWNER_LINEAGE_ASEG_FINAL_OWNER_INVALID');
  if(D.finalOperationalOwner?.path!=='orbit360-platform/core/client-insurer-operational-directory-owner-v20260722.js'||D.finalOperationalOwner?.version!=='20260723.2'||D.legacyConsumer?.mayBeFinalAuthority!==false||D.legacyConsumer?.allowedToExist!==true)throw new Error('OWNER_LINEAGE_ASEG_DOMAIN_CONTRACT_INVALID');
  if(!owner.includes("var VERSION = '20260723.2';")||!owner.includes("ownerId: 'clientInsurerOperationalDirectoryOwner'")||!owner.includes('revealCredential(')||!owner.includes('writesStore: false')||!owner.includes('reimportsData: false'))throw new Error('OWNER_LINEAGE_ASEG_OWNER_SOURCE_INVALID');
  if(!bridge.includes("loadScriptOnce('core/aseguradoras-runtime-bootstrap-p09f.js'")||!bridge.includes("ctx.mode !== 'firestore-lab' || ctx.tenantId !== 'alianzas-soluciones'"))throw new Error('OWNER_LINEAGE_ASEG_LAB_SUPPORT_BRIDGE_INVALID');
  const support=Array.isArray(R.certifiedNonEntrypointAssets)?R.certifiedNonEntrypointAssets:[],approved=new Set(P.approvedModuleScripts||[]);
  for(const p of P09_SUPPORT){const row=support.find(x=>x.path===p);if(!row||!approved.has(p)||!String(row.reason||'').includes('runtime entrypoint not required')||!boot.includes(`src: '${p}'`))throw new Error(`OWNER_LINEAGE_ASEG_SUPPORT_CLASSIFICATION_INVALID:${p}`);}
  if(!boot.includes("ctx.mode !== 'firestore-lab' || ctx.tenantId !== 'alianzas-soluciones'"))throw new Error('OWNER_LINEAGE_ASEG_SUPPORT_SCOPE_INVALID');
  if(c360.finalOwner?.path!=='modules/cliente360.js'||c360.finalOwner?.ownerId!=='Orbit.modules.cliente360'||!index.includes('<script src="modules/cliente360.js?v1360"></script>'))throw new Error('OWNER_LINEAGE_CLIENT_OWNER_INVALID');
  const clientBlob=gitBlobSha(fs.readFileSync(A(CLIENT)));
  if(clientBlob!==EXPECTED_CLIENT_BLOB||!clientDoc.includes('LAST_APPROVED_LINEAGE_PRESERVED_SOURCE')||!clientDoc.includes(EXPECTED_CLIENT_BLOB)||!clientDoc.includes('visualPass:false'))throw new Error('OWNER_LINEAGE_CLIENT_PRESERVATION_INVALID');
  if(login.finalOwner?.path!=='core/auth.js'||login.finalOwner?.ownerId!=='Orbit.auth')throw new Error('OWNER_LINEAGE_LOGIN_OWNER_INVALID');
  const order=['core/backend-lab-loader.js','core/backend-lab-init.js','data/store-firestore-lab.local.js','core/auth.js','core/access-role-session-owner-v20260728.js','core/router-tenant-config-bootstrap.js','core/router.js'].map(x=>index.indexOf(x));
  if(order.some(x=>x<0)||order.some((x,i)=>i&&x<=order[i-1]))throw new Error('OWNER_LINEAGE_LOGIN_ENTRY_ORDER_INVALID');
  if(!auth.includes('Orbit.auth = (function ()')||!auth.includes('signInWithEmailAndPassword')||!auth.includes('waitForMembership')||!session.includes('function productProjection()')||!session.includes('function syncFromAuth()')||session.includes('signInWithEmailAndPassword'))throw new Error('OWNER_LINEAGE_LOGIN_ROLE_SEPARATION_INVALID');
  const blockers=Array.isArray(L.functionalValidation?.blockers)?L.functionalValidation.blockers.map(x=>x.id):[];
  for(const id of ['INSURER_PORTAL_REVEAL_OPEN','CLIENT360_LIST_EMPTY_WITH_DATA_OPEN','LOGIN_LATENCY_OPEN'])if(!blockers.includes(id))throw new Error(`OWNER_LINEAGE_VISIBLE_BLOCKER_MISSING:${id}`);
  return {capabilityCount:caps.length,aseguradoras:{finalOwner:aseg.finalOwner,legacyConsumerFinalAuthority:false,p09SupportClassification:'INDIRECT_LAB_SUPPORT_NOT_FINAL_AUTHORITY',p09SupportAssets:P09_SUPPORT},cliente360:{finalOwner:c360.finalOwner,lineage:'LAST_APPROVED_LINEAGE_PRESERVED_SOURCE',blobSha:clientBlob,visualPass:false},login:{finalOwner:login.finalOwner,sessionRoleOwner:'core/access-role-session-owner-v20260728.js',interactiveLoginOwnerPreserved:true,latencyStillOpen:true},visibleBlockersStillOpen:true,compositionValidatorStatus:comp.status};
}
if(selftest){try{const r=review();console.log(JSON.stringify(zero({ok:true,status:'POST_GO_LIVE_RUNTIME_CAPABILITY_OWNER_LINEAGE_REVIEW_SELFTEST_PASS',classification:'PASS',sourceOnly:true,...r}),null,2));process.exit(0);}catch(error){fail(String(error?.message||error));}}
try{
  if(!intentPath||!terminalOut||!Number.isInteger(runId)||runId<=0||!fs.existsSync(intentPath))throw new Error('OWNER_LINEAGE_HANDLER_ARGS_INVALID');
  const I=J(path.relative(ROOT,path.resolve(intentPath))||intentPath),L=J(LEDGER);inspect(I,L);const r=review();
  const terminal=zero({schemaVersion:'orbit360-runtime-capability-owner-lineage-terminal-v1',transitionId:TRANSITION,runId,ok:true,status:'POST_GO_LIVE_RUNTIME_CAPABILITY_OWNER_LINEAGE_REVIEW_PASS',classification:'PASS',compositionRunId:Number(I.compositionRunId),acceptanceRunId:Number(I.acceptanceRunId),candidateId:I.candidateId,candidateManifestSha256:I.candidateManifestSha256,patchManifestSha256:I.patchManifestSha256,sourceOnly:true,...r,evidencePath:`actions-artifact:orbit360-single-state-${runId}/orbit360-terminal.json`});
  write(terminalOut,terminal);console.log(JSON.stringify({ok:true,status:terminal.status,classification:'PASS',compositionRunId:terminal.compositionRunId,acceptanceRunId:terminal.acceptanceRunId,capabilityCount:terminal.capabilityCount,aseguradoras:terminal.aseguradoras,cliente360:terminal.cliente360,login:terminal.login,visibleBlockersStillOpen:true,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false},null,2));
}catch(error){fail(String(error?.message||error));}
