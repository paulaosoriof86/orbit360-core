#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const ROOT=path.resolve(process.argv[2]||process.env.ORBIT360_ROOT||process.cwd());
const OWNER='orbit360-platform/core/client-insurer-operational-directory-owner-v20260722.js';
const BOOT='orbit360-platform/core/router-tenant-config-product-bootstrap-p0.js';
const A=p=>path.join(ROOT,p);
const read=p=>fs.readFileSync(A(p),'utf8').replace(/^\uFEFF/,'');
const fail=(code,detail={})=>{console.log(JSON.stringify({ok:false,status:'ASEGURADORAS_AUTHORIZED_REVEAL_SOURCE_FAIL',classification:'FUNCTIONAL_DEFECT',code,...detail,sourceOnly:true,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false},null,2));process.exit(2);};
const requireAll=(src,label,items)=>{for(const item of items)if(!src.includes(item))fail('REQUIRED_SOURCE_CONTRACT_MISSING',{label,item});};
const forbidAll=(src,label,items)=>{for(const item of items)if(src.includes(item))fail('FORBIDDEN_SOURCE_CONTRACT_PRESENT',{label,item});};
for(const p of [OWNER,BOOT])if(!fs.existsSync(A(p)))fail('REQUIRED_SOURCE_MISSING',{path:p});
const owner=read(OWNER),boot=read(BOOT);
requireAll(owner,'owner',[
  "var VERSION = '20260829.1';",
  'function credentialAccessAllowed()',
  "aseguradoras_plataformas_credenciales",
  "Orbit.access.can('aseguradoras', 'credentials')",
  "['direccion','admin','superadmin','superadministrador','admintenant','operativo']",
  'function inlineCredential(portal)',
  'portal.password || portal.pass || portal.contrasena || portal.clave',
  "source:'record'",
  "source:'provider'",
  'function resolveCredential(portal, insurer, index)',
  "typeof Orbit.secureResources.revealCredential !== 'function'",
  'credentialRecordFallbackForAuthorizedRoles: true',
  'credentialProviderFallbackPreserved: true',
  'writesStore: false',
  'reimportsData: false'
]);
forbidAll(owner,'owner',['orbit.lab@demo.com','EXPECTED_UID','EXPECTED_EMAIL']);
requireAll(boot,'product-bootstrap',[
  "mode:'product-readonly'",
  "operationalOwner:['core/client-insurer-operational-directory-owner-v20260722.js?v=20260829-1'",
  "var order=['visualStyle','editStyle','session','importerContract','importerAcademy','secureTargetBridge','operationalPolicy','editOwner','visualStability','visualBase','operationalOwner']",
  'writeAuthorized:false',
  'queryTenantAllowed:false'
]);
forbidAll(boot,'product-bootstrap',[
  "credentialProvider:['core/aseguradoras-credentials-provider-lab-v20260720.js",
  'backend-lab',
  'firestore-lab'
]);
for(const p of [OWNER,BOOT]){const syntax=spawnSync(process.execPath,['--check',A(p)],{cwd:ROOT,encoding:'utf8'});if(syntax.status!==0)fail('SOURCE_SYNTAX_INVALID',{path:p,detail:String(syntax.stderr||syntax.stdout||'').slice(0,1000)});}
console.log(JSON.stringify({ok:true,status:'ASEGURADORAS_AUTHORIZED_REVEAL_SOURCE_PASS',classification:'PASS',ownerVersion:'20260829.1',authorizedRolesOrExplicitPermissionRequired:true,directRecordReadFallback:true,providerFallbackPreserved:true,productBootstrapCacheBust:true,labProviderExcludedFromProductBootstrap:true,noStoreWrites:true,noReimport:true,sourceOnly:true,runtimeProofRequired:true,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false},null,2));
