#!/usr/bin/env node
'use strict';
import fs from 'node:fs';

const read = p => fs.readFileSync(p,'utf8');
const detail = read('orbit360-platform/modules/policy-receipts-v1199-detail-guard.js');
const client = read('orbit360-platform/modules/cliente360.js');
const policies = read('orbit360-platform/modules/polizas.js');
const receipts = read('orbit360-platform/core/backend-lab-receipts-portfolio-projection-v910.js');
const checks=[];
const add=(id,ok)=>checks.push({id,ok:Boolean(ok)});

// Human-review regressions: missing values must remain unknown, never become numeric zero.
add('PREMIUM_BLANK_NOT_ZERO', detail.includes('function numberOrNull') && detail.includes("safe(v) === ''") && !detail.includes("const finite = v => Number.isFinite(Number(v)) ? Number(v) : null"));
add('POLICY_QUALITY_FAIL_CLOSED', detail.includes('policyCompleteness') && detail.includes('Información pendiente de completar'));
add('DETAIL_MONEY_PRESERVES_CENTS', detail.includes('moneyDetail') && detail.includes('minimumFractionDigits:2'));
add('DARK_HEADER_ACTION_VISIBLE', detail.includes('background:transparent') && detail.includes('Volver al cliente'));

// Vehicle and receipt navigation must have real details, not dead-end rows/cards.
add('VEHICLE_TAB_FULLPAGE_ACTION', client.includes("verVehiculo('${v.id}')") && client.includes('Ver vehículo completo'));
add('RECEIPT_DETAIL_OWNER', receipts.includes('renderReceiptDetail') && receipts.includes('data-rp-receipt-id'));
add('RECEIPT_DETAIL_USES_EXPECTED', receipts.includes("Orbit.store.get('recibosEsperados'") && receipts.includes('Pago reportado · por conciliar'));

// Global Policies must not freeze on 1,373 policies and must consume canonical receipts.
add('POLICIES_INDEXED_VEHICLES', policies.includes('vehiclesByPolicy') && !policies.includes("S().all('vehiculos').find(v => v.polizaId === p.id)"));
add('POLICIES_PAGINATED', policies.includes('PAGE_SIZE') && policies.includes('.slice(0, PAGE_SIZE)'));
add('POLICIES_EXPECTED_RECEIPTS', policies.includes("S().all('recibosEsperados')") && !policies.includes("const recibos = S().all('cobros').filter(c => c.polizaId === id)"));
add('POLICIES_MISSING_COMPONENTS_NOT_ZERO', !policies.includes('(p.gastosEmision || 0) + (p.gastosFinan || 0) + (p.otros || 0)'));

// The visible premium label must not silently mix net and total concepts.
add('CLIENT_PREMIUM_LABEL_EXPLICIT', client.includes('Prima total anual vigente') || client.includes('Prima neta anual vigente'));

const failed=checks.filter(x=>!x.ok);
const out={schemaVersion:'orbit360-human-visual-contract-v1',status:failed.length?'FUNCTIONAL_DEFECT':'HUMAN_VISUAL_STATIC_READY',classification:failed.length?'FUNCTIONAL_DEFECT':null,total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),checks,firestoreWrites:0,operationalWrites:0,browserExecuted:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
console.log(JSON.stringify(out,null,2));
if(failed.length) process.exit(41);
