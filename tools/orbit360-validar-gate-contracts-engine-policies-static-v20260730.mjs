#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const ROOT=process.cwd();
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const GATE='block7-policies-static-v20260730';
const VERSION='7.0.0';
const files={
  m6:'orbit360-platform/docs/CIERRE-M6-FINAL-630-PASS-20260730.md',
  sourceMatrix:'orbit360-platform/docs/MATRIZ-FUENTES-REALES-RECIBIDAS-FALTANTES-AYS-20260709.md',
  antiDeviation:'orbit360-platform/docs/PROTOCOLO-ANTI-DESVIACION-PLAN-OPERATIVO-DATOS-REALES-AYS-20260709.md',
  model:'orbit360-platform/docs/CONTRATO-MODELO-POLIZAS-RECIBOS-CARTERA-AYS-20260705.md',
  audit:'orbit360-platform/docs/AUDITORIA-CIERRE-POLIZA-RECIBOS-COBROS-V1199-20260711.md',
  hub:'orbit360-platform/modules/importar.js',module:'orbit360-platform/modules/polizas.js',legacy:'orbit360-platform/core/importa.js',normalizer:'orbit360-platform/core/importa-polizas-p0.js',wire:'orbit360-platform/core/importa-polizas-p0-wire.js',owner:'orbit360-platform/core/policy-receipts-engine.js',refinements:'orbit360-platform/core/policy-receipts-v1199-refinements.js',access:'orbit360-platform/core/access-ceilings-v1199.js',
  testNormalizer:'tools/orbit360-test-importa-polizas-p0.mjs',testWire:'tools/orbit360-test-importa-polizas-p0-wire.mjs',testLegacyGuard:'tools/orbit360-test-importa-polizas-legacy-defaults-guard-v20260730.mjs',testOwner:'orbit360-platform/tools/orbit360-test-policy-receipts-v1199.mjs',testOwnerB:'orbit360-platform/tools/orbit360-test-policy-receipts-v1199b.mjs',validateOwner:'orbit360-platform/tools/orbit360-validar-policy-receipts-v1199.mjs',validateOwnerB:'orbit360-platform/tools/orbit360-validar-policy-receipts-v1199b.mjs',testModel:'tools/orbit360-test-validar-modelo-polizas-recibos-cartera-ays.mjs'
};
const checks=[];
const add=(id,ok,detail='')=>checks.push({id,ok:Boolean(ok),detail:String(detail||'').replace(/\s+/g,' ').trim().slice(0,420)});
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');
function run(rel){return execFileSync(process.execPath,[rel],{cwd:ROOT,encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:60000}).trim();}
function write(payload){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n','utf8');}
try{
  add('GATE',process.argv[2]===GATE);
  const missing=Object.values(files).filter(f=>!fs.existsSync(path.join(ROOT,f)));add('FILES',missing.length===0,missing.join(','));if(missing.length)throw new Error('POLICIES_STATIC_FILES_MISSING:'+missing.join(','));
  const m6=read(files.m6),matrix=read(files.sourceMatrix),anti=read(files.antiDeviation),model=read(files.model),audit=read(files.audit),hub=read(files.hub),legacy=read(files.legacy),normalizer=read(files.normalizer),wire=read(files.wire),owner=read(files.owner),access=read(files.access);
  add('M6_CLOSED',m6.includes('M6_FINAL_CLOSURE_PASS')&&m6.includes('30562624279')&&m6.includes('8767559350')&&m6.includes('rollbackExecuted: false'));
  add('NO_REPEAT_BASELINE',anti.includes('No volver a auditar, rediseñar o recalcular estos bloques sin una fuente nueva')&&anti.includes('Pólizas y complementos -> procesadas y cruzadas; no repetir'));
  add('SOURCE_DOMAIN_SEPARATION',model.includes('`polizas` es la fuente natural para crear/actualizar pólizas')&&model.includes('`financiero_historico`, `finmovs`, `estado_cuenta_bancario` y `planilla_comisiones` no crean pólizas ni recibos'));
  add('SOURCE_MATRIX_CURRENT',matrix.includes('Pólizas | Fuentes principales/complementarias ya perfiladas en bloques previos')&&matrix.includes('No corresponde pedir nuevamente Clientes ni Pólizas'));
  for(const rel of [files.module,files.legacy,files.normalizer,files.wire,files.owner,files.refinements,files.access,files.testNormalizer,files.testWire,files.testLegacyGuard,files.testOwner,files.testOwnerB,files.validateOwner,files.validateOwnerB,files.testModel])execFileSync(process.execPath,['--check',rel],{cwd:ROOT,stdio:'pipe'});add('SYNTAX',true);
  add('IMPORT_HUB_WIRES_P0',hub.includes("addScript('core/importa-polizas-p0.js")&&hub.includes("addScript('core/importa-polizas-p0-wire.js")&&hub.includes('loadP0PolicyRules()'));
  add('NORMALIZER_COUNTRY_CURRENCY',normalizer.includes("const PAIS_MONEDA = { GT: 'GTQ', CO: 'COP' }")&&normalizer.includes('resolveCountry')&&normalizer.includes('resolveCurrency')&&normalizer.includes("missing.push('pais')")&&normalizer.includes("missing.push('moneda')"));
  add('NORMALIZER_PREMIUM_SPLIT',normalizer.includes('splitPremium')&&normalizer.includes('primaNeta')&&normalizer.includes('gastos')&&normalizer.includes('iva')&&normalizer.includes('primaTotal')&&normalizer.includes("missing.push('prima_neta')"));
  add('NORMALIZER_PAYMENT_FORM_FAIL_CLOSED',normalizer.includes("if (!formaPago) missing.push('forma_pago')")&&!/formaPago\s*=\s*[^;]*Contado/.test(normalizer));
  add('NORMALIZER_STATUS_FAIL_CLOSED',normalizer.includes('vigente_operativa')&&normalizer.includes('vigente_renovada')&&normalizer.includes('historica_vencida')&&normalizer.includes('cancelada_terminal')&&normalizer.includes('requiere_validacion_estado'));
  add('EXPECTED_RECEIPTS_ONLY_VALIDATED_ACTIVE',normalizer.includes('shouldGenerateExpectedReceipts')&&normalizer.includes('!policy.requiereValidacion')&&normalizer.includes("policy.estadoOperativoOrbit === 'vigente_operativa'")&&normalizer.includes("policy.estadoOperativoOrbit === 'vigente_renovada'"));
  add('WIRE_REDIRECTS_IMPORTED_COBROS',wire.includes("originalInsert('recibosEsperados'")&&wire.includes("coll === 'cobros'")&&wire.includes('confirmadoPago = false')&&wire.includes('conciliado = false'));
  const legacyDefaults={contado:/rec\.frecuencia\s*=\s*rec\.frecuencia\s*\|\|\s*['"]Contado['"]/.test(legacy),commissionInsurer:/comAseguradoraPct[^\n]{0,200}\|\|\s*12/.test(legacy),commissionSeller:/comVendedorPct[^\n]{0,100}\|\|\s*50/.test(legacy)};
  add('LEGACY_DEFAULTS_DETECTED',legacyDefaults.contado&&legacyDefaults.commissionInsurer&&legacyDefaults.commissionSeller,JSON.stringify(legacyDefaults));
  add('WIRE_FAIL_CLOSED_LEGACY_DEFAULTS',wire.includes('sanitizeLegacyAssumptions')&&wire.includes("delete rec.comAseguradoraPct")&&wire.includes("delete rec.comVendedorPct")&&wire.includes("rec._legacyContadoDefaultRemoved = true")&&wire.includes("appendReason(rec, 'forma_pago')")&&wire.includes('commissionSourceRequired: true')&&wire.includes('paymentFrequencyProvenanceRequired: true'));
  add('OPERATIONAL_OWNER_ACTIVE_STATES',owner.includes("const ACTIVE = new Set(['vigente', 'porrenovar'])")&&owner.includes("warnings.push('estado_historico_sin_cartera')"));
  add('OPERATIONAL_OWNER_PREMIUM_FIELDS',owner.includes("'primaNeta'")&&owner.includes("'gastosEmision'")&&owner.includes("'gastosFinan'")&&owner.includes("'ivaMonto'")&&owner.includes("'primaTotal'"));
  add('OPERATIONAL_OWNER_CANONICAL_KEY',owner.includes('canonicalPolicyKey')&&owner.includes("[tid, clean(p.pais), clean(p.aseguradoraId), norm(p.numero)].join('|')"));
  add('NON_DESTRUCTIVE_RECEIPTS',!owner.includes("remove('cobros'")&&audit.includes('no existe `remove(\'cobros\', ...)` en el motor nuevo'));
  add('PAYMENT_NOT_FINMOV',audit.includes('NO escribe finmovs')&&audit.includes('conciliado = false'));
  add('ADVISOR_HARD_CEILING',access.includes('Asesor')&&audit.includes('Asesor bloqueado para modificar pólizas'));
  for(const [name,rel] of [['normalizer',files.testNormalizer],['wire',files.testWire],['legacyGuard',files.testLegacyGuard],['owner',files.testOwner],['ownerB',files.testOwnerB],['validateOwner',files.validateOwner],['validateOwnerB',files.validateOwnerB],['model',files.testModel]]){const out=run(rel);add('TEST_'+name.toUpperCase(),true,out);}
  const failed=checks.filter(c=>!c.ok),status=failed.length?'DATA_CONTRACT_FAILURE':'GO_GATE_CONTRACT';
  const out={schemaVersion:'orbit360-policies-static-qualification-v2',gateId:GATE,contractVersion:VERSION,executionPhase:'POLICIES_STATIC_QUALIFICATION',status,classification:failed.length?'DATA_CONTRACT_FAILURE':null,total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(c=>c.id),checks,m6Closed:true,reuseM6Infrastructure:true,rebuildTransverseInfrastructure:false,sourceDomain:'polizas',sourceReprofilingRequired:false,sourcePayloadRead:false,legacyImporterAuthoritativeForPolicyDefaults:false,legacyDefaultsDetected:legacyDefaults,legacyDefaultsFailClosed:true,commissionSourceRequired:true,paymentFrequencyProvenanceRequired:true,policyNormalizerOwner:files.normalizer,policyImportWire:files.wire,policyOperationalOwner:files.owner,activeStatesGenerateReceipts:['Vigente','Por renovar'],historicalStatesNoNewCartera:['Cancelada','Vencida','Anulada','Rechazada'],countryCurrencyFailClosed:true,premiumComponentsSeparated:true,advisorPolicyMutationRestricted:true,financialHistoryCreatesPolicies:false,firestoreDataWrites:0,operationalWrites:0,dataAccess:false,secretAccess:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,nextPhase:failed.length?'POLICIES_STATIC_REMEDIATION':'POLICIES_SOURCE_DRYRUN_READONLY',nextWriteRequestPrepared:false,storageDeferredFailClosed:true,containsPII:false,containsSecrets:false};write(out);console.log(JSON.stringify(out,null,2));if(failed.length)process.exit(41);
}catch(error){const failed=checks.filter(c=>!c.ok);const out={schemaVersion:'orbit360-policies-static-qualification-v2',gateId:GATE,contractVersion:VERSION,executionPhase:'POLICIES_STATIC_QUALIFICATION',status:'DATA_CONTRACT_FAILURE',classification:'PIPELINE_MECHANISM_FAILURE',total:checks.length,passed:checks.length-failed.length,failed:Math.max(1,failed.length),failedCheckIds:failed.length?failed.map(c=>c.id):['POLICIES_STATIC_EXCEPTION'],checks,error:String(error&&error.message||error).slice(0,600),dataAccess:false,secretAccess:false,firestoreRead:false,firestoreDataWrites:0,operationalWrites:0,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,nextWriteRequestPrepared:false,containsPII:false,containsSecrets:false};write(out);console.log(JSON.stringify(out,null,2));process.exit(41);}
