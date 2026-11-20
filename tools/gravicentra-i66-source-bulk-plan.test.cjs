'use strict';
const assert = require('node:assert/strict');
const {planSourceBatch, MAX_CHUNK} = require('./gravicentra-i66-source-bulk-plan.cjs');
const sha = 'a'.repeat(64);
function sample(n) {
  const raw = [], groups = [];
  for (let i = 0; i < n; i++) {
    const number = 'AUTO-' + String(i).padStart(6, '0'), id = 'p' + i, rid = 'rec_' + String(i).padStart(16, '0');
    const req = 'AC-' + String(i).padStart(8, '0');
    raw.push({caseId: 'B.' + i, insurer: 'BANTRAB', policy: number,
      requirement: req, due: '2026-11-12', installment: 8, grossCents: 10001,
      state: 'PENDING', sourceSha256: sha});
    groups.push({insurerName:'SEGUROS BANTRAB',clientExists:true,insurerVerified:true,
      policy:{numero:number,id,pais:'GT',moneda:'GTQ',vigenciaInicio:'2026-01-01',vigenciaFin:'2027-01-01',
        estado:'Vigente',clienteId:'cli'+i},
      receipts:[{id:rid,polizaId:id,moneda:'GTQ',vence:'2026-11-12',primaTotal:100}],
      portfolio:[{id:'c'+i,polizaId:id,reciboId:rid,moneda:'GTQ',primaTotal:100,carteraActiva:true}],
      cobros:[]});
  }
  return {raw,groups};
}
const {raw,groups}=sample(750);
const plan=planSourceBatch(raw,groups);
assert.equal(MAX_CHUNK,250);
assert.equal(plan.readyCount,750);
assert.deepEqual(plan.chunks.map(c=>c.count),[250,250,250]);
assert.equal(plan.exceptionCount,0);
assert.equal(plan.writes,0);
assert.ok(plan.chunks.every(c=>/^[a-f\d]{64}$/.test(c.sourcePlanSha256)));
const odd=sample(3);
odd.raw[0].requirement='AC-UNIQUE-001';
odd.raw[1].requirement='AC-UNIQUE-002';
odd.raw[2].requirement='AC-UNIQUE-003';
odd.groups[1].receipts[0].vence='2026-12-12';
const partial=planSourceBatch(odd.raw,odd.groups);
assert.equal(partial.readyCount,2);
assert.equal(partial.exceptionCount,1);
assert.equal(partial.exceptions[0].caseId,'B.1');
const multiple=sample(1);
multiple.raw.push({...multiple.raw[0],caseId:'B.1',requirement:'AC-DIFFERENT'});
const independent=planSourceBatch(multiple.raw,multiple.groups);
assert.equal(independent.readyCount,1);
assert.equal(independent.exceptions[0].code,'RECEIPT_ASSIGNED_TWICE');
const samePolicy=sample(1);
samePolicy.raw.push({...samePolicy.raw[0],caseId:'B.2',requirement:'AC-NEWER',due:'2026-12-12',installment:9});
samePolicy.groups[0].receipts.push({id:'rec_9999999999999999',polizaId:'p0',moneda:'GTQ',vence:'2026-12-12',primaTotal:100});
samePolicy.groups[0].portfolio.push({id:'c999',polizaId:'p0',reciboId:'rec_9999999999999999',moneda:'GTQ',primaTotal:100,carteraActiva:true});
assert.equal(planSourceBatch(samePolicy.raw,samePolicy.groups).readyCount,2);
const notContractual=sample(1);
notContractual.groups[0].receipts[0].fechaLimite='2026-11-12';
delete notContractual.groups[0].receipts[0].vence;
assert.equal(planSourceBatch(notContractual.raw,notContractual.groups).exceptionCount,1);
const confirmed=sample(1);
confirmed.groups[0].receipts[0].numeroReciboFuente=confirmed.raw[0].requirement;
confirmed.groups[0].receipts[0].primaTotal=100.01;
confirmed.groups[0].portfolio[0].primaTotal=100.01;
const noop=planSourceBatch(confirmed.raw,confirmed.groups);
assert.equal(noop.unchangedCount,1);
assert.equal(noop.readyCount,0);
// An exact insurer requirement overrides an outdated system contractual due,
// even if gross and requirement already match (not an unchanged/no-op row).
const insurerDue=sample(1);
insurerDue.groups[0].receipts[0].numeroReciboFuente=insurerDue.raw[0].requirement;
insurerDue.groups[0].receipts[0].vence='2026-11-06';
insurerDue.groups[0].receipts[0].fechaLimite='2026-12-30';
insurerDue.groups[0].receipts[0].primaTotal=100.01;
insurerDue.groups[0].portfolio[0].primaTotal=100.01;
const insurerDuePlan=planSourceBatch(insurerDue.raw,insurerDue.groups);
assert.equal(insurerDuePlan.readyCount,1);
assert.equal(insurerDuePlan.unchangedCount,0);
assert.equal(insurerDuePlan.chunks[0].rows[0].matchMethod,'EXACT_INSURER_REQUIREMENT_DUE');
assert.equal(insurerDuePlan.chunks[0].rows[0].oldContractualDue,'2026-11-06');
const differingPreimages=sample(1);
differingPreimages.groups[0].portfolio[0].primaTotal=99.72;
const correctedPortfolio=planSourceBatch(differingPreimages.raw,differingPreimages.groups);
assert.equal(correctedPortfolio.readyCount,1);
assert.equal(correctedPortfolio.chunks[0].rows[0].oldGrossCents,10000);
assert.equal(correctedPortfolio.chunks[0].rows[0].oldCarteraGrossCents,9972);
const paid=sample(2);
paid.raw[0].state='PAID';
assert.equal(planSourceBatch(paid.raw,paid.groups).exceptions[0].code,'PAID_REQUIRES_COBRO_PROOF_AND_WRITER');
// An insurer's distinct requirement number can match an I6 internal N/12
// only when the policy has a complete, unique 12-month schedule and insurer
// due date is the precise monthly anniversary of the current policy edition.
const monthly=sample(1);
monthly.groups[0].policy={...monthly.groups[0].policy,
  vigenciaInicio:'2026-08-14',vigenciaFin:'2027-08-14',frecuencia:'Mensual'};
monthly.groups[0].receipts=[];
monthly.groups[0].portfolio=[];
for(let n=1;n<=12;n++){
  const rid='rec_schedule_'+n;
  monthly.groups[0].receipts.push({id:rid,polizaId:'p0',moneda:'GTQ',
    numeroReciboFuente:n+'/12',fechaLimite:'2027-12-22',primaTotal:163.01});
  monthly.groups[0].portfolio.push({id:'c_schedule_'+n,polizaId:'p0',
    reciboId:rid,moneda:'GTQ',primaTotal:163.01,carteraActiva:true});
}
monthly.raw[0]={caseId:'R.1',insurer:'BANTRAB',policy:'AUTO-000000',
  requirement:'INSURER-5581772',due:'2026-11-14',grossCents:16302,
  state:'PENDING',sourceSha256:sha};
const monthlyPlan=planSourceBatch(monthly.raw,monthly.groups);
assert.equal(monthlyPlan.readyCount,1);
assert.equal(monthlyPlan.chunks[0].rows[0].matchMethod,'COMPLETE_MONTHLY_INSURER_DATE');
assert.equal(monthlyPlan.chunks[0].rows[0].receiptId,'rec_schedule_4');
monthly.groups[0].receipts.find(r=>r.numeroReciboFuente==='4/12').fechaVencimientoContractual='2026-11-29';
const correctedDue=planSourceBatch(monthly.raw,monthly.groups);
assert.equal(correctedDue.readyCount,1);
assert.equal(correctedDue.chunks[0].rows[0].oldContractualDue,'2026-11-29');
delete monthly.groups[0].receipts.find(r=>r.numeroReciboFuente==='4/12').fechaVencimientoContractual;
monthly.groups[0].receipts.pop();
assert.equal(planSourceBatch(monthly.raw,monthly.groups).exceptionCount,1);
monthly.groups[0].receipts.push({id:'rec_schedule_12',polizaId:'p0',moneda:'GTQ',
  numeroReciboFuente:'12/12',primaTotal:163.01});
monthly.raw[0].due='2026-11-15';
assert.equal(planSourceBatch(monthly.raw,monthly.groups).exceptionCount,1);
const padded=sample(1);
padded.raw[0].policy='91-169567';
padded.groups[0].policy.numero='91-0169567';
assert.equal(planSourceBatch(padded.raw,padded.groups).readyCount,1);
const renewalDay=sample(1);
renewalDay.raw[0].policy='91-169567';
renewalDay.raw[0].due='2026-08-05';
renewalDay.groups[0].policy={...renewalDay.groups[0].policy,
  numero:'91-0169567',vigenciaInicio:'2026-08-05',vigenciaFin:'2027-08-05'};
renewalDay.groups[0].receipts[0].vence='2026-08-05';
renewalDay.groups.push({...renewalDay.groups[0],
  policy:{...renewalDay.groups[0].policy,id:'old-edition',
    vigenciaInicio:'2025-08-05',vigenciaFin:'2026-08-05',estado:'Renovada'},
  receipts:[],portfolio:[]});
assert.equal(planSourceBatch(renewalDay.raw,renewalDay.groups).readyCount,1);
padded.raw[0].policy='91-169568';
assert.equal(planSourceBatch(padded.raw,padded.groups).exceptions[0].code,'POLICY_EDITION_MISSING');
// G&T statement 519815 and issued AUTO-519815 must resolve within G&T
// only, never as an unrelated insurer or ambiguous policy edition.
const gyt=sample(1);
gyt.raw[0]={...gyt.raw[0],insurer:'G&T',policy:'519815',
  requirement:'E-995653883',due:'2026-11-28'};
gyt.groups[0].insurerName='SEGUROS G&T';
gyt.groups[0].policy={...gyt.groups[0].policy,numero:'AUTO-519815',
  vigenciaInicio:'2026-10-28',vigenciaFin:'2027-10-28'};
gyt.groups[0].receipts[0]={...gyt.groups[0].receipts[0],vence:'2026-11-28'};
assert.equal(planSourceBatch(gyt.raw,gyt.groups).readyCount,1,
  'G&T issuer numeric reference aliases its issued AUTO policy');
const insurerMismatch=sample(1);
insurerMismatch.raw[0]={...gyt.raw[0]};
insurerMismatch.groups[0]={...gyt.groups[0],insurerName:'SEGUROS BANTRAB'};
assert.equal(planSourceBatch(insurerMismatch.raw,insurerMismatch.groups).readyCount,0,
  'same digits never bypass insurer identity');
const noCrossInsurer=sample(1);
noCrossInsurer.raw[0]={...gyt.raw[0],insurer:'BANTRAB'};
noCrossInsurer.groups[0]={...gyt.groups[0],insurerName:'SEGUROS BANTRAB'};
assert.equal(planSourceBatch(noCrossInsurer.raw,noCrossInsurer.groups).readyCount,0,
  'AUTO prefix alias limited to G&T source');
const editionCollision=sample(1);
editionCollision.raw[0]={...gyt.raw[0]};
editionCollision.groups=[...gyt.groups,{...gyt.groups[0],policy:{...gyt.groups[0].policy,id:'different-2026-edition'}}];
assert.equal(planSourceBatch(editionCollision.raw,editionCollision.groups).exceptions[0].code,
  'POLICY_EDITION_AMBIGUOUS','duplicate candidate editions must not auto-select');

assert.throws(()=>planSourceBatch(raw,groups,{chunkSize:501}),/SOURCE_BATCH_CHUNK_LIMIT/);
console.log('I66_SOURCE_BULK_PREFLIGHT_PASS 750 rows 3 chunks; exceptions isolated; 0 writes');

{
  const {policyKeys}=require('./gravicentra-i66-source-bulk-plan.cjs');
  assert.ok(policyKeys('04-15-01-603-0','UNIVERSALES').includes('04-15-01-000603-0'));
  assert.ok(policyKeys('04-15-01-000603-0','Seguros Universales').includes('04-15-01-603-0'));
  assert.ok(!policyKeys('04-15-01-603-0','MAPFRE').includes('04-15-01-000603-0'));
}
