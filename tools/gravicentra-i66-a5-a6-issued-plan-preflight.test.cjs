'use strict';
// Insurer-issued source schedules checked against immutable PDF-derived facts.
// No Firebase, no customer records, no write transport in this test.
const assert=require('node:assert/strict');
const {issuerInstallments,receiptOrdinal,paymentOrReportEvidence,issuerSchedulePreview,issuerScheduleAdjudication}=require('./gravicentra-i66-cartera-a5-a6-readonly.cjs');

const general=issuerInstallments('A5.P7');
assert.equal(general.length,10);
assert.equal(general.reduce((sum,r)=>sum+r.cents,0),325860);
assert.deepEqual(general[0],{quota:1,requirement:'14518453',due:'2026-08-21',cents:32586});
assert.deepEqual(general[1],{quota:2,requirement:'14518454',due:'2026-09-21',cents:32586});
assert.deepEqual(general.at(-1),{quota:10,requirement:'14518462',due:'2027-05-21',cents:32586});

const columna=issuerInstallments('A6.P4');
assert.equal(columna.length,12);
assert.equal(columna.reduce((sum,r)=>sum+r.cents,0),177632);
assert.deepEqual(columna[0],{quota:1,requirement:'7043045',due:'2026-03-04',cents:14803});
assert.deepEqual(columna[8],{quota:9,requirement:'7043053',due:'2026-11-04',cents:14803});
assert.deepEqual(columna.at(-1),{quota:12,requirement:'7043056',due:'2027-02-04',cents:14799});
assert.equal(issuerInstallments('A5.P1').length,0);

assert.equal(receiptOrdinal({serie:'03/12'}),3);
assert.equal(receiptOrdinal({cuota:'9/12',secuencia:9}),9);
assert.equal(receiptOrdinal({cuota:'8/12',secuencia:9}),null);
assert.equal(receiptOrdinal({serie:'NOT_A_QUOTA'}),null);
assert.equal(paymentOrReportEvidence({estado:'Pendiente'}),false);
assert.equal(paymentOrReportEvidence({fechaPagoReportada:'2026-11-09'}),true);
assert.equal(paymentOrReportEvidence({estado:'Conciliado'}),true);

const generated=columna.map(r=>({serie:r.quota+'/12',monto:r.cents/100,
  fechaLimite:r.due,numeroReciboFuente:r.requirement,estado:'Pendiente'}));
const exact=issuerSchedulePreview('A6.P4',{receipts:generated});
assert.equal(exact.completeInternalQuotaIdentity,true);
assert.equal(exact.issuerQuotaCount,12);
assert.equal(exact.liveReceiptTotalCents,177632);
assert.equal(exact.liveDateAmountOrReferenceDifferences.every(r=>
  r.dueMatches&&r.amountMatches&&r.sourceMatches&&!r.sourceOccupiedByDifferentValue),true);
assert.equal(exact.safeToAutoApply,false,'read-only preflight must never approve live mutation');
assert.equal(exact.writes,0);

const conflicted=generated.map(r=>({...r}));
conflicted[0].numeroReciboFuente='OTHER_INSURER_REF';
conflicted[11].monto=148.03;
conflicted[8].fechaPagoReportada='2026-11-09';
conflicted[8].fechaLimite='2026-11-30';
const diff=issuerSchedulePreview('A6.P4',{receipts:conflicted});
assert.equal(diff.liveReceiptTotalCents,177636);
assert.equal(diff.paymentOrReportEvidenceRows,1);
assert.equal(diff.liveDateAmountOrReferenceDifferences[0].sourceOccupiedByDifferentValue,true);
assert.equal(diff.liveDateAmountOrReferenceDifferences[11].amountMatches,false);
assert.equal(diff.safeToAutoApply,false);

const unsequenced=issuerSchedulePreview('A5.P7',{receipts:
  Array.from({length:12},()=>({monto:271.55,estado:'Pendiente'}))});
assert.equal(unsequenced.completeInternalQuotaIdentity,false);
assert.equal(unsequenced.issuerQuotaCount,10);
assert.equal(unsequenced.liveReceiptCount,12);
assert.equal(unsequenced.safeToAutoApply,false);

const exactAdjudication=issuerScheduleAdjudication('A6.P4',{receipts:generated});
assert.equal(exactAdjudication.cases.length,12);
assert.equal(exactAdjudication.statusCounts.NOOP_ALREADY_INSURER_EXACT,12);
assert.equal(exactAdjudication.writes,0);
const disputed=issuerScheduleAdjudication('A6.P4',{receipts:conflicted});
assert.equal(disputed.cases[0].decision,'HOLD_EXISTING_EXTERNAL_REFERENCE_NOT_PROVEN_REPLACEABLE');
assert.equal(disputed.cases[8].decision,'HOLD_PAYMENT_OR_REPORT_PROTECTED');
assert.equal(disputed.cases[11].document.cents,14799);
assert.equal(disputed.safeToAutoApply,false);
const crossQuota=generated.map(x=>({...x}));
crossQuota[1].numeroReciboFuente=columna[2].requirement;
assert.equal(issuerScheduleAdjudication('A6.P4',{receipts:crossQuota}).cases[1].decision,
  'HOLD_REFERENCE_BELONGS_TO_ANOTHER_INSURER_QUOTA');
const extra=issuerScheduleAdjudication('A5.P7',{receipts:[...general.map(r=>({
  serie:r.quota+'/12',monto:r.cents/100,fechaLimite:r.due,
  numeroReciboFuente:r.requirement,estado:'Pendiente'})),
  {serie:'11/12',monto:1,fechaLimite:'2027-06-21',numeroReciboFuente:'legacy-A'},
  {serie:'12/12',monto:1,fechaLimite:'2027-07-21',numeroReciboFuente:'legacy-B'}]});
assert.equal(extra.cases.length,12);
assert.equal(extra.cases[10].decision,'HOLD_EXTRA_LIVE_QUOTA_NOT_IN_INSURER_POLICY');
assert.equal(extra.cases[11].decision,'HOLD_EXTRA_LIVE_QUOTA_NOT_IN_INSURER_POLICY');
assert.equal(extra.safeToAutoApply,false);

console.log('I66_A5_A6_ISSUER_DOCUMENT_SCHEDULE_PREFLIGHT_AND_REFERENCE_ADJUDICATION_READONLY_PASS');
