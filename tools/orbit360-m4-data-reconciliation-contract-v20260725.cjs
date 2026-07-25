'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path');
global.window=global;global.Orbit={};vm.runInThisContext(fs.readFileSync(path.join(process.cwd(),'orbit360-platform/core/m4-data-reconciliation-contract-p0.js'),'utf8'));
const good={readOnly:true,remoteReadConfirmed:true,writeAuthorized:false,writeExecuted:false,sourceCounts:{clientes:414,aseguradoras:26},currencyResolution:{missingCurrency:61,resolvedGTQ:0,resolvedCOP:0,unresolved:61,countryCurrencyMap:{GT:'GTQ',CO:'COP'}},schemaAudit:{privacyMode:'field_names_and_counts_only',candidateFields:[{name:'Provincia',presentCount:20}],recordsAudited:61,valuesExported:false},targetOnlyResolution:{total:4,clientTotal:2,insurerTotal:2,recommendations:{conservar:0,actualizar_rekey:0,retirar_candidato:4,requiere_validacion:0}},secretValueCount:0,rulesChanged:false,hostingDeploy:false,functionsDeploy:false,imports:false,policies:false,mergeMain:false,containsPII:false,containsSecrets:false};
const checks=[];function t(id,ok){checks.push({id,ok:!!ok});}
const a=Orbit.m4DataReconciliationP0.build(good);
t('GOOD_OK',a.ok);
t('GOOD_NOT_APPROVAL_READY',a.approvalReady===false);
t('WRITES_BLOCKED',!Orbit.m4DataReconciliationP0.build({...good,writeAuthorized:true}).ok);
t('COUNT_BLOCKED',!Orbit.m4DataReconciliationP0.build({...good,sourceCounts:{clientes:413,aseguradoras:26}}).ok);
t('CURRENCY_BALANCE',!Orbit.m4DataReconciliationP0.build({...good,currencyResolution:{...good.currencyResolution,unresolved:60}}).ok);
t('TARGET_BALANCE',!Orbit.m4DataReconciliationP0.build({...good,targetOnlyResolution:{...good.targetOnlyResolution,total:5}}).ok);
t('SANITIZATION_BLOCKED',!Orbit.m4DataReconciliationP0.build({...good,containsPII:true}).ok);
t('SCHEMA_AUDIT_REQUIRED',!Orbit.m4DataReconciliationP0.build({...good,schemaAudit:{}}).ok);
t('SCHEMA_VALUES_BLOCKED',!Orbit.m4DataReconciliationP0.build({...good,schemaAudit:{...good.schemaAudit,valuesExported:true}}).ok);
t('CONTRACT_VERSION',a.contractVersion==='4.2.1-readonly-20260725');
const failed=checks.filter(x=>!x.ok),out={schemaVersion:'orbit360-m4-data-reconciliation-contract-summary-v2',gateId:'block4-data-reconciliation-readonly-v20260725',contractVersion:'4.2.1',ok:failed.length===0,total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),checks,containsPII:false,containsSecrets:false};
fs.mkdirSync('orbit360-platform/runtime-gate-crm-v20260716',{recursive:true});fs.writeFileSync('orbit360-platform/runtime-gate-crm-v20260716/m4-data-reconciliation-contract-summary.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));if(failed.length)process.exit(41);
