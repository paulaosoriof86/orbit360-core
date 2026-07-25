#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';

const ROOT=process.cwd();
const PROJECT_ID='ays-orbit-360-lab';
const TENANT_ID='alianzas-soluciones';
const EVIDENCE_DIR=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716');
const M2_EVIDENCE=path.join(EVIDENCE_DIR,'m2-existing-identity-runtime-summary.json');
const M3_EVIDENCE=path.join(EVIDENCE_DIR,'m3-tenant-activation-runtime-summary.json');
const MANIFEST=path.join(ROOT,'tools/orbit360-m3-tenant-activation-manifest-v20260724.json');
const SAFE_PREFIXES=['m3_','m2_','product_','auth_','membresia_','store_','tenant_','config_','runtime_','snapshots_','firestore_','scope_','autorizacion_','integracion_','pais_','branding_','modulos_','project_','identidad_','bootstrap_','bloqueo_','deploy_','rules_','importaciones_','actor_','data_contract_failure','pipeline_mechanism_failure'];
function text(v){return String(v==null?'':v).trim();}
function clean(v){const s=text(v);if(SAFE_PREFIXES.some(p=>s.toLowerCase().startsWith(p))&&/^[A-Za-z0-9_:\-|,]+$/.test(s))return s.slice(0,360);return s.replace(/[A-Za-z0-9_-]{24,}/g,'[redacted]').replace(/[^A-Za-z0-9_:\-|,.[\] ]/g,'').slice(0,180);}
function unique(v){return [...new Set([].concat(v||[]).map(clean).filter(Boolean))];}
function write(payload){fs.mkdirSync(EVIDENCE_DIR,{recursive:true});fs.writeFileSync(M3_EVIDENCE,JSON.stringify({...payload,containsPII:false,containsSecrets:false},null,2)+'\n');}
function load(rel){vm.runInThisContext(fs.readFileSync(path.join(ROOT,rel),'utf8'),{filename:rel});}
const base={schemaVersion:'orbit360-m3-tenant-activation-runtime-v1',gateId:'block3-tenant-activation-runtime-v20260724',contractVersion:'3.1.0',projectId:PROJECT_ID,tenantIdSource:'membership_only',existingIdentityOnly:true,rulesChanged:false,configurationWrites:0,membershipWrites:0,clientWrites:0,insurerWrites:0,auditWrites:0,hostingDeploy:false,functionsDeploy:false,imports:false,mergeMain:false};
try{
  if(text(process.env.ORBIT360_EXISTING_FIREBASE_PROJECT_ID)!==PROJECT_ID)throw new Error('PIPELINE_MECHANISM_FAILURE:EXISTING_PROJECT_IDENTITY_NOT_RESOLVED');
  const run=spawnSync(process.execPath,['tools/orbit360-m2-existing-identity-runtime-v20260724.mjs'],{cwd:ROOT,env:process.env,encoding:'utf8',maxBuffer:32*1024*1024});
  if(!fs.existsSync(M2_EVIDENCE))throw new Error('PIPELINE_MECHANISM_FAILURE:M2_RUNTIME_EVIDENCE_MISSING');
  const m2=JSON.parse(fs.readFileSync(M2_EVIDENCE,'utf8'));
  if(run.status!==0||m2.ok!==true||m2.status!=='M2_EXISTING_IDENTITY_RUNTIME_VALIDATED'){
    write({...base,ok:false,status:m2.status||'DATA_CONTRACT_FAILURE',classification:m2.classification||'DATA_CONTRACT_FAILURE',error:clean(m2.error||'m2_runtime_dependency_failed'),runtimeExecuted:m2.runtimeExecuted===true,browserExecuted:false,activationAuthorized:true,activationExecuted:false,writeAuthorized:false,writeExecuted:false,contractErrors:unique(m2.readinessErrors||m2.bootstrapErrors)});
    process.exit(41);
  }
  const manifest=JSON.parse(fs.readFileSync(MANIFEST,'utf8'));
  if(manifest.tenantId!==TENANT_ID||manifest.containsPII!==false||manifest.containsSecrets!==false)throw new Error('DATA_CONTRACT_FAILURE:ACTIVATION_MANIFEST_INVALID');
  globalThis.window=globalThis;globalThis.Orbit={};
  load('orbit360-platform/core/tenant-canonical-paths-contract-p0.js');
  load('orbit360-platform/core/tenant-activation-runtime-contract-p0.js');
  const check=globalThis.Orbit.tenantActivationRuntimeP0.validate({tenantId:TENANT_ID,projectId:PROJECT_ID,m2RuntimeStatus:m2.status,m3StaticStatus:'M3_TENANT_ACTIVATION_STATIC_READY',identitySource:'membership_only',tenantResolutionSource:'membership',sourceOfTruth:manifest.sourceOfTruth,controlledExistingIdentityAccepted:m2.controlledExistingIdentityAccepted===true,eligibleMemberships:Number(m2.eligibleExistingIdentityCount||0),readOnlyBootstrapValidated:m2.ok===true&&m2.storeInstalled===true&&m2.snapshotsAttached===true,storeNoFallback:m2.noFallback===true,storeWriteEnabled:m2.storeWriteEnabled===true,localWriteBlocked:m2.localWriteBlocked===true,countries:manifest.countries,countryConfig:manifest.countryConfig,branding:manifest.branding,modules:manifest.modules,integrations:manifest.integrations,accessExpansion:manifest.accessExpansion===true,actor:{userId:'existing-privileged-membership',activeRole:'privileged-existing-role',reason:'Activación controlada read-only M3 autorizada por la usuaria'},activationAuthorized:true,activationExecuted:true,persistence:manifest.persistence,deployRequested:false,importsRequested:false,rulesChangeRequested:false});
  const ok=check.ok===true;
  write({...base,ok,status:ok?'M3_TENANT_ACTIVATED_READONLY':'DATA_CONTRACT_FAILURE',classification:ok?null:'DATA_CONTRACT_FAILURE',authRead:m2.authRead===true,firestoreRead:m2.firestoreRead===true,authUserCount:Number(m2.authUserCount||0),membershipCount:Number(m2.membershipCount||0),eligibleExistingIdentityCount:Number(m2.eligibleExistingIdentityCount||0),runtimeExecuted:true,browserExecuted:false,controlledExistingIdentityAccepted:m2.controlledExistingIdentityAccepted===true,storeInstalled:m2.storeInstalled===true,snapshotsAttached:m2.snapshotsAttached===true,noFallback:m2.noFallback===true,storeWriteEnabled:m2.storeWriteEnabled===true,localWriteBlocked:m2.localWriteBlocked===true,activationAuthorized:true,activationExecuted:ok,writeAuthorized:false,writeExecuted:false,sourceOfTruth:manifest.sourceOfTruth,countriesValidated:manifest.countries.length,modulesValidated:manifest.modules.length,integrationsValidated:manifest.integrations.length,contractErrors:unique(check.errors)});
  if(!ok)process.exitCode=41;
}catch(error){const code=clean(error&&error.message||error);const pipeline=text(error&&error.message).startsWith('PIPELINE_MECHANISM_FAILURE');write({...base,ok:false,status:pipeline?'PIPELINE_MECHANISM_FAILURE':'DATA_CONTRACT_FAILURE',classification:pipeline?'PIPELINE_MECHANISM_FAILURE':'DATA_CONTRACT_FAILURE',error:code,runtimeExecuted:false,browserExecuted:false,activationAuthorized:true,activationExecuted:false,writeAuthorized:false,writeExecuted:false});process.exitCode=41;}
