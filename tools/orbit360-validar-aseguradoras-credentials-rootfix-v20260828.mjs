#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const ROOT=path.resolve(process.argv[2]||process.env.ORBIT360_ROOT||process.cwd());
const PROVIDER='orbit360-platform/core/aseguradoras-credentials-provider-lab-v20260720.js';
const BACKEND='functions/index.js';
const A=p=>path.join(ROOT,p);
const read=p=>fs.readFileSync(A(p),'utf8').replace(/^\uFEFF/,'');
const fail=(code,detail={})=>{console.log(JSON.stringify({ok:false,status:'ASEGURADORAS_CREDENTIALS_ROOTFIX_SOURCE_FAIL',classification:'FUNCTIONAL_DEFECT',code,...detail,sourceOnly:true,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false},null,2));process.exit(2);};
const requireAll=(src,label,items)=>{for(const item of items)if(!src.includes(item))fail('REQUIRED_SOURCE_CONTRACT_MISSING',{label,item});};
const forbidAll=(src,label,items)=>{for(const item of items)if(src.includes(item))fail('FORBIDDEN_SOURCE_CONTRACT_PRESENT',{label,item});};
for(const p of [PROVIDER,BACKEND])if(!fs.existsSync(A(p)))fail('REQUIRED_SOURCE_MISSING',{path:p});
const provider=read(PROVIDER),backend=read(BACKEND);
requireAll(provider,'provider',["canonicalHost","previewHost","authorizedHost = canonicalHost || previewHost","mode !== 'firestore-lab'","tenant !== TENANT_ID","registerCredentialProvider","cache: 'no-store'","noSecretPersistence: true","exposesSecretsInStore: false","retainsSecretPayload: false"]);
if(!/ays-orbit-360-lab\\?\.?\(\?:web/.test(provider)&&!provider.includes('ays-orbit-360-lab'))fail('CANONICAL_LAB_HOST_NOT_ALLOWED');
requireAll(backend,'backend',["collection('tenants').doc(TENANT_ID).collection('members')","clean(member.status, 40).toLowerCase() !== 'active'","assignedRoles.includes(activeRole)","roleAllowed","extraAllowed","collection('auditEvents').add","containsSecrets: false"]);
forbidAll(backend,'backend',['EXPECTED_UID','EXPECTED_EMAIL','orbit.lab@demo.com']);
const syntax=spawnSync(process.execPath,['--check',A(BACKEND)],{cwd:ROOT,encoding:'utf8'});
if(syntax.status!==0)fail('BACKEND_SYNTAX_INVALID',{detail:String(syntax.stderr||syntax.stdout||'').slice(0,1000)});
console.log(JSON.stringify({ok:true,status:'ASEGURADORAS_CREDENTIALS_ROOTFIX_SOURCE_PASS',classification:'PASS',providerCanonicalHostEligible:true,previewHostPreserved:true,firestoreLabRequired:true,tenantRequired:true,demoIdentityAllowlistRemoved:true,activeMembershipRequired:true,assignedActiveRoleRequired:true,roleOrExtraPermissionRequired:true,auditWriteDeclared:true,noSecretPersistence:true,sourceOnly:true,runtimeProofRequired:true,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false},null,2));
