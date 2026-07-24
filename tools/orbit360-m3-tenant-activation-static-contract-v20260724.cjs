#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=process.cwd();
const evidencePath=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/m3-tenant-activation-static-summary.json');
function load(rel){vm.runInThisContext(fs.readFileSync(path.join(ROOT,rel),'utf8'),{filename:rel});}
global.window=global;global.Orbit={};
load('orbit360-platform/core/tenant-canonical-paths-contract-p0.js');
load('orbit360-platform/core/tenant-activation-plan-contract-p0.js');
const api=Orbit.tenantActivationPlanP0;
const checks=[];const check=(id,ok,detail='')=>checks.push({id,ok:!!ok,detail:String(detail)});
const base={
 tenantId:'tenant-ejemplo',m2Closed:true,m2RuntimeStatus:'M2_EXISTING_IDENTITY_RUNTIME_VALIDATED',
 identitySource:'membership_only',tenantResolutionSource:'membership',sourceOfTruth:'backend_tenant_config',
 readOnlyBootstrapValidated:true,storeNoFallback:true,storeWriteEnabled:false,
 countries:['GT','CO'],countryConfig:{GT:{currency:'GTQ',tax:12},CO:{currency:'COP',tax:19}},
 branding:{name:'Tenant Ejemplo',logoRef:'white-label-slot'},modules:['inicio','cliente360','aseguradoras'],
 memberships:{existing:1,eligible:1},
 integrations:[{key:'drive',state:'reference_only',active:false,connectionVerified:false},{key:'whatsapp',state:'backend_required',active:false,connectionVerified:false}],
 accessExpansion:false,actor:{userId:'actor-test',activeRole:'Dirección',reason:'Preparación estática de activación M3'},
 persistence:{tenantWrites:0,configurationWrites:0,membershipWrites:0,clientWrites:0,insurerWrites:0,auditWrites:0},
 activationAuthorized:false,activationExecuted:false,deployRequested:false,importsRequested:false,rulesChangeRequested:false
};
const dry=api.buildDryRun(base);
check('API_PRESENT',!!api&&api.VERSION==='3.0.0-static-20260724');
check('VALID_READY',dry.ok&&dry.status==='M3_TENANT_ACTIVATION_STATIC_READY');
check('NO_WRITE',dry.writeAuthorized===false&&dry.writeExecuted===false);
check('NO_ACTIVATION',dry.activationAuthorized===false&&dry.activationExecuted===false);
check('M4_DEFERRED',JSON.stringify(dry.deferredToM4)===JSON.stringify(['persist_tenant_config','persist_memberships','migrate_clients','migrate_insurers']));
check('AUDIT_PLANNED',dry.auditPlan.required===true&&dry.auditPlan.status==='planned_not_executed');
check('ROLLBACK_PLANNED',dry.rollbackPlan.required===true&&dry.rollbackPlan.requiresBeforeSnapshot===true);
check('CANONICAL_TENANT',dry.tenantId==='tenant-ejemplo');
check('M2_REQUIRED',api.validate({...base,m2Closed:false}).errors.includes('m2_runtime_no_cerrado'));
check('MEMBERSHIP_SOURCE_REQUIRED',api.validate({...base,identitySource:'query_string'}).errors.includes('identity_source_no_membership_only'));
check('TENANT_FROM_MEMBERSHIP',api.validate({...base,tenantResolutionSource:'query_string'}).errors.includes('tenant_no_resuelto_desde_membership'));
check('QUERY_SOURCE_BLOCKED',api.validate({...base,sourceOfTruth:'query_string'}).errors.includes('fuente_productiva_invalida'));
check('LOCALSTORAGE_BLOCKED',api.validate({...base,sourceOfTruth:'localstorage'}).errors.includes('fuente_productiva_invalida'));
check('DEMO_BLOCKED',api.validate({...base,sourceOfTruth:'demo'}).errors.includes('fuente_productiva_invalida'));
check('NO_FALLBACK_REQUIRED',api.validate({...base,storeNoFallback:false}).errors.includes('store_fallback_no_bloqueado'));
check('WRITE_STORE_BLOCKED',api.validate({...base,storeWriteEnabled:true}).errors.includes('store_escritura_habilitada'));
check('COUNTRY_CONFIG_REQUIRED',api.validate({...base,countryConfig:{GT:{currency:'GTQ'}}}).errors.includes('config_pais_incompleta:CO'));
check('MEMBERSHIP_UNIQUE',api.validate({...base,memberships:{existing:2,eligible:2}}).errors.includes('membership_elegible_no_unica'));
check('INTEGRATION_HONESTY',api.validate({...base,integrations:[{key:'drive',state:'reference_only',active:true,connectionVerified:false}]}).errors.includes('integracion_0:activa_sin_conexion_real'));
check('REAL_CONNECTION_VERIFIED',api.validate({...base,integrations:[{key:'drive',state:'connected_real',active:true,connectionVerified:false}]}).errors.includes('integracion_0:conexion_no_verificada'));
check('REAL_CONNECTION_PASS',api.validate({...base,integrations:[{key:'drive',state:'connected_real',active:true,connectionVerified:true}]}).ok===true);
check('EXPANSION_CONFIRMATION',api.validate({...base,accessExpansion:true}).errors.includes('confirmacion_reforzada_requerida'));
check('EXPANSION_CONFIRMED',api.validate({...base,accessExpansion:true,actor:{userId:'actor-test',activeRole:'Dirección',reason:'Activación controlada del tenant',confirmationPhrase:'CONFIRMO ACTIVAR TENANT'}}).ok===true);
check('TENANT_WRITE_BLOCKED',api.validate({...base,persistence:{...base.persistence,tenantWrites:1}}).errors.includes('m3_static_escritura_no_permitida:tenantWrites'));
check('CONFIG_WRITE_BLOCKED',api.validate({...base,persistence:{...base.persistence,configurationWrites:1}}).errors.includes('m3_static_escritura_no_permitida:configurationWrites'));
check('MEMBERSHIP_WRITE_BLOCKED',api.validate({...base,persistence:{...base.persistence,membershipWrites:1}}).errors.includes('m3_static_escritura_no_permitida:membershipWrites'));
check('CLIENT_WRITE_BLOCKED',api.validate({...base,persistence:{...base.persistence,clientWrites:414}}).errors.includes('m3_static_escritura_no_permitida:clientWrites'));
check('INSURER_WRITE_BLOCKED',api.validate({...base,persistence:{...base.persistence,insurerWrites:26}}).errors.includes('m3_static_escritura_no_permitida:insurerWrites'));
check('AUTHORIZATION_BLOCKED',api.validate({...base,activationAuthorized:true}).errors.includes('activacion_no_autorizada_en_preparacion_estatica'));
check('DEPLOY_BLOCKED',api.validate({...base,deployRequested:true}).errors.includes('deploy_no_permitido_en_m3_static'));
check('IMPORTS_BLOCKED',api.validate({...base,importsRequested:true}).errors.includes('importaciones_diferidas_a_m4'));
check('RULES_BLOCKED',api.validate({...base,rulesChangeRequested:true}).errors.includes('rules_no_permitidas_en_m3_static'));
check('SECRETS_BLOCKED',api.validate({...base,secret:'no-permitido'}).errors.some(e=>e.startsWith('secretos_no_permitidos:')));
const source=fs.readFileSync(path.join(ROOT,'orbit360-platform/core/tenant-activation-plan-contract-p0.js'),'utf8');
check('GENERIC_OWNER',!source.includes('alianzas-soluciones')&&!source.includes('A&S'));
check('NO_BACKEND_ACCESS',!source.includes('firebase')&&!source.includes('getFirestore')&&!source.includes('fetch('));
const failed=checks.filter(x=>!x.ok);
const payload={schemaVersion:'orbit360-m3-tenant-activation-static-summary-v1',gateId:'block3-tenant-activation-static-v20260724',contractVersion:'3.0.0',generatedAt:new Date().toISOString(),ok:failed.length===0,status:failed.length?'M3_TENANT_ACTIVATION_STATIC_BLOCKED':'M3_TENANT_ACTIVATION_STATIC_READY',total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),checks,writeAuthorized:false,writeExecuted:false,activationAuthorized:false,activationExecuted:false,secretAccess:false,firebaseAccess:false,firestoreRead:false,rulesChanged:false,configurationWrites:0,membershipWrites:0,clientWrites:0,insurerWrites:0,hostingDeploy:false,functionsDeploy:false,imports:false,policies:false,m3Execution:false,m4Deferred:true,containsPII:false,containsSecrets:false};
fs.mkdirSync(path.dirname(evidencePath),{recursive:true});fs.writeFileSync(evidencePath,JSON.stringify(payload,null,2)+'\n');console.log(JSON.stringify(payload,null,2));process.exit(failed.length?41:0);
