#!/usr/bin/env node
'use strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const planner=require('../orbit360-platform/core/planillas-comisiones-commission-dryrun-planner-p0.js');
let checks=0;
const assert=(condition,id)=>{checks++;if(!condition)throw new Error(`STATIC_TEST_FAIL:${id}`);};
const base={
  insurerId:'gt-demo',insurerName:'Aseguradora Demo',policyId:'pol-1',receiptId:'rec-1',advisorId:'ase-1',
  period:'2026-06',country:'GT',currency:'GTQ',netPremium:1000,intermediaryCommission:120,sellerCommission:60,
  sourceSeller:'ASE-1',sellerResolution:'SELLER_ALIAS_MATCHES_POLICY',branch:'AUTO',sourceFile:'planilla.xlsx',sourceSheet:'Hoja1',sourceRow:2,sourceBundle:'demo_gtq_2026_06'
};
const empty={planillas:new Set(),devengadas:new Set(),conciliaciones:new Set()};
const create=planner.planCandidate(base,empty);
assert(create.decision==='CREATE_AS_COMMISSION_DRYRUN','CREATE_DECISION');
assert(create.commissionEligible===true,'CREATE_ELIGIBLE');
assert(create.sellerDecision==='SELLER_SOURCE_MATCH','SELLER_MATCH');
assert(create.proposedDocuments===3,'THREE_DOCS');
assert(create.destinations.join(',')==='planillasComisiones,comisionesDevengadas,conciliacionesComisiones','DESTINATIONS');
assert(create.seeds.comisionesDevengadas.comPagada===120,'EXPLICIT_COMMISSION');
assert(create.seeds.comisionesDevengadas.tasaInferida===false,'NO_RATE_INFERENCE');
assert(create.seeds.comisionesDevengadas.liquidacionAsesorAutorizada===false,'NO_ADVISOR_LIQUIDATION');
assert(create.seeds.comisionesDevengadas.finanzasActivadas===false,'NO_FINANCE');
assert(create.seeds.planillasComisiones._sourceKey===create.sourceKey,'PLAN_KEY');
assert(create.seeds.conciliacionesComisiones._sourceKey===create.sourceKey,'CONCILIATION_KEY');
const unresolvedSeller=planner.planCandidate({...base,sellerResolution:'SELLER_ALIAS_NOT_CONFIGURED'},empty);
assert(unresolvedSeller.decision==='CREATE_AS_COMMISSION_HOLD_SELLER','SELLER_HOLD_ROW');
assert(unresolvedSeller.commissionEligible===true,'AS_COMMISSION_STILL_ELIGIBLE');
assert(unresolvedSeller.sellerDecision==='HOLD_SELLER_ALIAS_NOT_CONFIGURED','SELLER_ALIAS_HOLD');
const completeKey=planner.commissionKey(base);
const complete=planner.planCandidate(base,{planillas:new Set([completeKey]),devengadas:new Set([completeKey]),conciliaciones:new Set([completeKey])});
assert(complete.decision==='OMIT_IDEMPOTENT','IDEMPOTENT_OMIT');
assert(complete.proposedDocuments===0,'IDEMPOTENT_ZERO_DOCS');
const partial=planner.planCandidate(base,{planillas:new Set([completeKey]),devengadas:new Set(),conciliaciones:new Set()});
assert(partial.decision==='HOLD_PARTIAL_DESTINATION_STATE','PARTIAL_HOLD');
assert(partial.existingDocuments===1,'PARTIAL_COUNT');
const incomplete=planner.planCandidate({...base,receiptId:''},empty);
assert(incomplete.decision==='HOLD_COMMISSION_CONTRACT_INCOMPLETE','MISSING_HOLD');
assert(incomplete.missing.includes('reciboId'),'MISSING_RECEIPT');
const reversal=planner.planCandidate({...base,intermediaryCommission:-12,sellerCommission:-6},empty);
assert(reversal.commissionEligible===true,'REVERSAL_ALLOWED');
assert(reversal.seeds.comisionesDevengadas.comPagada===-12,'REVERSAL_PRESERVED');
assert(planner.commissionKey({...base,advisorId:'ase-2'})!==completeKey,'ADVISOR_IN_KEY');
assert(planner.commissionKey({...base,intermediaryCommission:121})!==completeKey,'AMOUNT_IN_KEY');
const summary=planner.summarize([create,unresolvedSeller,complete,partial,incomplete,reversal]);
assert(summary.total===6,'SUMMARY_TOTAL');
assert(summary.commissionCandidates===3,'SUMMARY_CANDIDATES');
assert(summary.proposedDocuments===9,'SUMMARY_DOCS');
assert(summary.operationalWrites===0,'SUMMARY_WRITES');
assert(summary.financeActivated===false,'SUMMARY_FINANCE');
assert(planner.destinations.includes('cxcComisiones')===false,'NO_CXC_DESTINATION');
assert(planner.destinations.includes('liquidacionesAsesores')===false,'NO_LIQ_DESTINATION');
assert(planner.schemaVersion==='orbit360-planillas-comisiones-commission-dryrun-planner-v1','SCHEMA');
console.log(JSON.stringify({status:'STATIC_COMMISSION_DRYRUN_PLANNER_PASS',checks,fixtures:6,realRowsUsed:0,destinations:planner.destinations,writes:0,storeAccess:false,firestoreAccess:false,browserExecuted:false,deployExecuted:false,productionTouched:false},null,2));
