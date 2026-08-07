#!/usr/bin/env node
'use strict';

import { diagnoseSnapshot, BASELINE } from './orbit360-diagnose-block1-universe-differential-v25-v20260807.mjs';

const row = (id, data) => ({ id, data });
const baseClient = n => row(`c-base-${n}`, { pais:'GT', moneda:'GTQ', identificacion:`ID-${n}`, _migration:{ batchTemplate: BASELINE.batchTemplate, source:'clientes_controlled_load' } });
const postClient = n => row(`c-post-${n}`, { pais:'GT', moneda:'GTQ', identificacion:`POST-${n}`, createdAt:'2026-07-25T12:00:00Z', _migration:{ batchTemplate:'client_post_baseline_v1', batchId:`post-${n}`, source:'client_admin_config' } });
const baseInsurer = n => row(`i-base-${n}`, { pais: n <= 13 ? 'GT' : 'CO', moneda: n <= 13 ? 'GTQ' : 'COP', nit:`NIT-${n}`, vinculada:true, _migration:{ batchTemplate: BASELINE.batchTemplate, source:'directorios_aseguradoras_gt_co' } });
const extraInsurer = n => row(`i-extra-${n}`, { pais:'GT', moneda:'GTQ', nit:`EXTRA-${n}`, vinculada:false, createdAt:'2026-07-26T12:00:00Z', _migration:{ batchTemplate:'insurer_post_baseline_v1', batchId:`iextra-${n}`, source:'insurer_admin_config' } });
const advisors = Array.from({length:7}, (_,i) => row(`a-${i+1}`, {}));

const checks = [];
function check(id, condition, detail='') { checks.push({ id, ok: !!condition, detail }); }

const caseClientStale = diagnoseSnapshot({
  clients: [...Array.from({length:414},(_,i)=>baseClient(i+1)), ...Array.from({length:16},(_,i)=>postClient(i+1))],
  insurers: Array.from({length:26},(_,i)=>baseInsurer(i+1)),
  advisors
});
check('clients-baseline-414-tagged', caseClientStale.observed.baselineTagged.clientes === 414);
check('clients-differential-exact-16', caseClientStale.differential.clientes.length === 16);
check('clients-objective-post-baseline-validator-stale', caseClientStale.domainDecision.clientes.classification === 'VALIDATOR_STALE');
check('clients-demonstrated-count-430', caseClientStale.domainDecision.clientes.demonstratedObjectiveCount === 430);
check('advisors-7-invariant', caseClientStale.domainDecision.asesores.classification === 'PASS_DATA_CONTRACT');

const insurersOneBaselineExcluded = Array.from({length:26},(_,i)=>baseInsurer(i+1));
insurersOneBaselineExcluded[0].data.vinculada = false;
const caseInsurerNeedsValidation = diagnoseSnapshot({
  clients: [...Array.from({length:414},(_,i)=>baseClient(i+1)), ...Array.from({length:16},(_,i)=>postClient(i+1))],
  insurers: [...insurersOneBaselineExcluded, ...Array.from({length:4},(_,i)=>extraInsurer(i+1))],
  advisors
});
check('insurers-raw-30', caseInsurerNeedsValidation.observed.raw.aseguradoras === 30);
check('insurers-effective-25', caseInsurerNeedsValidation.observed.effective.aseguradoras === 25);
check('insurers-baseline-26-tagged', caseInsurerNeedsValidation.observed.baselineTagged.aseguradoras === 26);
check('insurers-five-differential', caseInsurerNeedsValidation.differential.aseguradoras.length === 5);
check('insurer-baseline-excluded-one', caseInsurerNeedsValidation.observed.baselineInsurersExcluded === 1);
check('insurer-no-transition-evidence-data-contract', caseInsurerNeedsValidation.domainDecision.aseguradoras.classification === 'DATA_CONTRACT_FAILURE');
check('overall-data-contract-when-baseline-insurer-unexplained', caseInsurerNeedsValidation.decision === 'DATA_CONTRACT_FAILURE');

const auditedInsurers = Array.from({length:26},(_,i)=>baseInsurer(i+1));
auditedInsurers[0].data.vinculada = false;
auditedInsurers[0].data.updatedAt = '2026-07-25T12:00:00Z';
auditedInsurers[0].data.auditReason = 'configuration-change';
auditedInsurers[0].data.updatedBy = 'role-admin';
const caseInsurerStale = diagnoseSnapshot({
  clients: [...Array.from({length:414},(_,i)=>baseClient(i+1)), ...Array.from({length:16},(_,i)=>postClient(i+1))],
  insurers: [...auditedInsurers, ...Array.from({length:4},(_,i)=>extraInsurer(i+1))],
  advisors
});
check('insurer-audited-post-closure-validator-stale', caseInsurerStale.domainDecision.aseguradoras.classification === 'VALIDATOR_STALE');
check('overall-validator-stale-when-both-domains-proven', caseInsurerStale.decision === 'VALIDATOR_STALE');
check('insurer-demonstrated-count-25', caseInsurerStale.domainDecision.aseguradoras.demonstratedObjectiveCount === 25);

const uncertainClients = Array.from({length:430},(_,i)=>row(`unc-${i+1}`, { pais:'GT', moneda:'GTQ', identificacion:`U-${i+1}` }));
const caseUncertain = diagnoseSnapshot({ clients: uncertainClients, insurers:Array.from({length:26},(_,i)=>baseInsurer(i+1)), advisors });
check('missing-baseline-membership-requires-validation', caseUncertain.domainDecision.clientes.classification === 'REQUIERE_VALIDACION');
check('uncertain-client-differential-not-invented', caseUncertain.differential.clientes.length === 0);

const serialized = JSON.stringify(caseInsurerNeedsValidation);
check('sanitized-no-test-identifiers', !serialized.includes('ID-') && !serialized.includes('NIT-') && !serialized.includes('POST-') && !serialized.includes('EXTRA-'));
check('sanitized-no-names-emails-documents', caseInsurerNeedsValidation.containsPII === false && caseInsurerNeedsValidation.containsNames === false && caseInsurerNeedsValidation.containsEmails === false && caseInsurerNeedsValidation.containsDocuments === false);
check('zero-write-contract', caseInsurerNeedsValidation.firestoreWrites === 0 && caseInsurerNeedsValidation.authWrites === 0 && caseInsurerNeedsValidation.operationalWrites === 0 && caseInsurerNeedsValidation.reimport === false && caseInsurerNeedsValidation.hostingTouched === false && caseInsurerNeedsValidation.browserExecuted === false);

const failed = checks.filter(x=>!x.ok);
const output = { schemaVersion:'orbit360-v25-differential-universe-source-fixtures-v1', status: failed.length ? 'STOP_V25_SOURCE_FIXTURES' : 'PASS_V25_SOURCE_FIXTURES', total:checks.length, passed:checks.length-failed.length, failed:failed.length, failedCheckIds:failed.map(x=>x.id), checks, secretsRead:false, firebaseAccess:false, browserExecuted:false, hostingTouched:false, writes:0, productionTouched:false, ok:failed.length===0 };
console.log(JSON.stringify(output,null,2));
process.exit(failed.length ? 41 : 0);
