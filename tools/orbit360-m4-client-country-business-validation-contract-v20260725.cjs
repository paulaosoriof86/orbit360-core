#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
global.window = global;
global.Orbit = {};
vm.runInThisContext(fs.readFileSync(path.join(process.cwd(),'orbit360-platform/core/m4-client-country-business-validation-contract-p0.js'),'utf8'));
const out = 'orbit360-platform/runtime-gate-crm-v20260716/m4-client-country-business-validation-contract-summary.json';
const results = [];
function t(id, ok){ results.push({id,ok:!!ok}); }
const good = {
  readOnly:true,remoteReadConfirmed:true,writeAuthorized:false,writeExecuted:false,
  sourceCounts:{clientes:414,missingCurrency:61},
  sourceDistribution:{GT:0,CO:0,empty:0,nonCanonical:61,conflict:0},
  proposal:{records:61,countryFieldChanges:61,currencyFieldChanges:61,country:'GT',currency:'GTQ',creates:0,deletes:0,targetOnlyDeferred:4},
  traceability:{source:'business_validation_batch',actorRole:'Direccion_AyS',reasonCode:'VALIDACION_EMPRESARIAL_LOTE_61_GT',beforeAfterPlanned:true,recordIdsExported:false},
  rollback:{mode:'per_record_before_snapshot',planned:true,executed:false},
  auditPlan:'append_only',privacyMode:'aggregate_proposal_only',rawValuesExported:false,individualRecordsExported:false,
  collectionScope:{collectionsRead:1,insurersRead:false,targetRead:false},
  containsPII:false,containsSecrets:false,secretValueCount:0,
  configurationWrites:0,membershipWrites:0,clientWrites:0,insurerWrites:0,auditWrites:0,
  rulesChanged:false,hostingDeploy:false,functionsDeploy:false,imports:false,policies:false,mergeMain:false
};
const c = Orbit.m4ClientCountryBusinessValidationP0.build(good);
t('GOOD', c.ok);
t('STATUS', c.status === 'M4_CLIENT_COUNTRY_BUSINESS_VALIDATION_DRYRUN_COMPLETED');
t('VERSION', c.contractVersion === '4.2.4-readonly-20260725');
t('CLIENTS', !Orbit.m4ClientCountryBusinessValidationP0.build({...good,sourceCounts:{clientes:413,missingCurrency:61}}).ok);
t('MISSING', !Orbit.m4ClientCountryBusinessValidationP0.build({...good,sourceCounts:{clientes:414,missingCurrency:60}}).ok);
t('NONCANONICAL', !Orbit.m4ClientCountryBusinessValidationP0.build({...good,sourceDistribution:{GT:1,CO:0,empty:0,nonCanonical:60,conflict:0}}).ok);
t('COUNTRY', !Orbit.m4ClientCountryBusinessValidationP0.build({...good,proposal:{...good.proposal,country:'CO'}}).ok);
t('CURRENCY', !Orbit.m4ClientCountryBusinessValidationP0.build({...good,proposal:{...good.proposal,currency:'COP'}}).ok);
t('TARGET_ONLY', !Orbit.m4ClientCountryBusinessValidationP0.build({...good,proposal:{...good.proposal,targetOnlyDeferred:3}}).ok);
t('TRACE', !Orbit.m4ClientCountryBusinessValidationP0.build({...good,traceability:{...good.traceability,beforeAfterPlanned:false}}).ok);
t('ROLLBACK', !Orbit.m4ClientCountryBusinessValidationP0.build({...good,rollback:{...good.rollback,planned:false}}).ok);
t('WRITES', !Orbit.m4ClientCountryBusinessValidationP0.build({...good,clientWrites:1}).ok);
t('PRIVACY', !Orbit.m4ClientCountryBusinessValidationP0.build({...good,rawValuesExported:true}).ok);
t('M4_WRITE_BLOCKED', c.approvalReadyForM4Write === false);
const failed = results.filter(item => !item.ok);
fs.mkdirSync(path.dirname(out), {recursive:true});
fs.writeFileSync(out, JSON.stringify({status:failed.length?'FAIL':'PASS',contractVersion:'4.2.4',total:results.length,passed:results.length-failed.length,failed:failed.length,results,containsPII:false,containsSecrets:false},null,2)+'\n');
console.log(`PASS ${results.length-failed.length}/${results.length}`);
if(failed.length) process.exit(41);
