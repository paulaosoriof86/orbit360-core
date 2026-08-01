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
add('POLICY_TOTAL_NOT_INFERRED_FROM_NET', detail.includes('out.primaTotal = total;') && !detail.includes('out.primaTotal = total != null ? total : net'));
add('POLICY_QUALITY_FAIL_CLOSED', detail.includes('policyCompleteness') && detail.includes('Información pendiente de completar'));
add('DETAIL_MONEY_PRESERVES_CENTS', detail.includes('moneyDetail') && detail.includes('minimumFractionDigits:2'));
add('DARK_HEADER_ACTION_VISIBLE', detail.includes('background:transparent') && detail.includes('Volver al cliente'));
add('PREMIUM_SCHEDULE_BREAKDOWN', detail.includes('premiumBreakdown') && detail.includes("sum('gastosExpedicion')") && detail.includes("sum('gastosFinanciamiento')") && detail.includes("sum('impuestosIVA')") && detail.includes('Descuento / ajuste (campo fuente)'));
add('POLICY_RECEIPTS_CHRONOLOGICAL', detail.includes(".sort((a,b) => safe(first(a.fechaLimite") && detail.includes('Ajuste fuente'));

// Vehicle and receipt navigation must have real details, not dead-end rows/cards.
add('VEHICLE_TAB_FULLPAGE_ACTION', detail.includes('Ver vehículo completo') && detail.includes('patchLegacyCards') && detail.includes('verVehiculo(v.id)'));
add('RECEIPT_DETAIL_OWNER', receipts.includes('renderReceiptDetail') && receipts.includes('data-rp-receipt-id'));
add('RECEIPT_DETAIL_USES_EXPECTED', receipts.includes("Orbit.store.get('recibosEsperados'") && receipts.includes('Pago reportado · por conciliar'));
add('RECEIPT_SINGLE_SOURCE_NOT_AUTO_COBRO', receipts.includes('la ausencia de saldo no crea por sí sola un cobro conciliado') && receipts.includes('Existe evidencia de pago reportado, pero aún no es un cobro conciliado.'));
add('RECEIPT_PAYMENT_BALANCE_SEPARATED', receipts.includes('Cobro conciliado') && receipts.includes('Cartera conciliada con aseguradora') && receipts.includes('Esto confirma cartera; no equivale a un pago.'));
add('RECEIPT_RECONCILIATION_TRACE_VISIBLE', receipts.includes('Fuente autoridad') && receipts.includes('Calidad de match') && receipts.includes('Referencia fuente'));
add('RECEIPT_HERO_BADGE_COMPACT', receipts.includes('data-rp-receipt-hero="1"') && receipts.includes('align-items:flex-start') && receipts.includes('data-rp-hero-status="1"') && receipts.includes('align-self:flex-start;flex:0 0 auto'));

// Global Policies must not freeze on 1,373 policies and must consume canonical receipts.
add('POLICIES_INDEXED_VEHICLES', policies.includes('vehiclesByPolicy') && !policies.includes("S().all('vehiculos').find(v => v.polizaId === p.id)"));
add('POLICIES_PAGINATED', policies.includes('PAGE_SIZE') && policies.includes('.slice(0, PAGE_SIZE)'));
add('POLICIES_EXPECTED_RECEIPTS', policies.includes("S().all('recibosEsperados')") && !policies.includes("const recibos = S().all('cobros').filter(c => c.polizaId === id)"));
add('POLICIES_MISSING_COMPONENTS_NOT_ZERO', !policies.includes('(p.gastosEmision || 0) + (p.gastosFinan || 0) + (p.otros || 0)'));

// The visible premium label must not silently mix net and total concepts.
add('CLIENT_PREMIUM_LABEL_EXPLICIT', detail.includes('Prima total anual vigente') || client.includes('Prima total anual vigente') || client.includes('Prima neta anual vigente'));

const failed=checks.filter(x=>!x.ok);
const out={schemaVersion:'orbit360-human-visual-contract-v5',status:failed.length?'FUNCTIONAL_DEFECT':'HUMAN_VISUAL_STATIC_READY',classification:failed.length?'FUNCTIONAL_DEFECT':null,total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),checks,firestoreWrites:0,operationalWrites:0,browserExecuted:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
console.log(JSON.stringify(out,null,2));
if(failed.length){console.error('HUMAN_VISUAL_FAILED_CHECKS='+failed.map(x=>x.id).join(','));process.exit(41);}
