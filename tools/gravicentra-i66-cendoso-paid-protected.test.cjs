'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {sourceRow,assess,planBatch,loadSource,insurerMatches,policyMatches,
  policyLookupVariants}=require('./gravicentra-i66-cendoso-paid-protected.cjs');
const source=loadSource();
assert.equal(source.candidates.length,607);
assert.equal(source.candidates.filter(r=>r.currencySource==='GTQ'&&!r.holdReasons.length).length,574);
assert.equal(source.candidates.filter(r=>r.holdReasons.length).length,4);
assert.equal(source.candidates.filter(r=>r.currencySource==='COP').length,29);
const sha='a'.repeat(64);
const raw={candidateId:'cendoso_'+'a'.repeat(24),insurerSource:'El Roble',policyNumberSource:'91-0169567',
  coverageStart:'2025-08-05',coverageEnd:'2026-08-05',receiptPeriodStart:'2026-03-05',
  receiptDueDate:'2026-03-15',actualPaidDate:'2026-05-04',currencySource:'GTQ',
  totalPremium:'296.84',netPremium:'202.61',holdReasons:[],sourceRows:[{file:'test.xlsx',row:20,sha256:sha}]};
const receipt={id:'r1',polizaId:'p1',estado:'Pendiente',
  vence:'2026-03-05',fechaLimite:'2026-03-15',primaTotal:296.84,monto:296.84,montoTotal:296.84,
  primaNeta:202.61,numeroReciboFuente:'5/12'};
const cartera={id:'c1',reciboId:'r1',polizaId:'p1',carteraActiva:true,
  estado:'Pendiente',primaTotal:296.84,monto:296.84,montoTotal:296.84};
const group={policy:{id:'p1',numero:'91-169567',vigenciaInicio:'2025-08-05',
  vigenciaFin:'2026-08-05',pais:'GT',moneda:'GTQ',clienteId:'cli1',estado:'Vigente'},
  insurerName:'Seguros El Roble, S.A.',insurerVerified:true,clientExists:true,
  receipts:[receipt],portfolio:[cartera],cobros:[]};
const assessCase=(row=raw,editions=[group])=>assess(sourceRow(row),editions);
assert.ok(assessCase().ready,'exact source and receipt should match');
assert.equal(assessCase().ready.grossCents,29684);
assert.ok(assessCase(raw,[{...group,policy:{...group.policy,estado:'Cancelada'}}]).ready,
  'current policy cancellation cannot block a proven historical insurer payment');
assert.equal(assessCase({...raw,currencySource:'COP'}).code,'SOURCE_CURRENCY_NOT_GTQ');
assert.equal(assessCase({...raw,holdReasons:['CONFLICTING_SOURCE_PAID_DATES']}).code,'CONFLICTING_SOURCE_DATES');
assert.equal(assessCase(raw,[]).code,'POLICY_NUMBER_NOT_FOUND');
assert.equal(assessCase(raw,[{...group,policy:{...group.policy,vigenciaInicio:'2026-08-05'}}]).code,'EXACT_POLICY_EDITION_NOT_FOUND');
assert.equal(assessCase(raw,[group,group]).code,'MULTIPLE_POLICY_EDITIONS');
assert.equal(assessCase(raw,[{...group,receipts:[receipt,{...receipt,id:'r2'}]}]).code,'MULTIPLE_RECEIPTS_FOR_PERIOD_OR_AMOUNT');
assert.equal(assessCase(raw,[{...group,receipts:[{...receipt,estado:'Pagado'}]}]).ready.backfill,true,
  'paid receipt without a Cobro must be completed, not counted as a duplicate Cobro');
assert.equal(assessCase(raw,[{...group,receipts:[{...receipt,estado:'Pagado'}],
  cobros:[{id:'oldpay',reciboId:'r1',estado:'Pagado'}]}]).code,'ALREADY_PAID_WITH_COBRO_PRESERVE');
assert.equal(assessCase(raw,[{...group,receipts:[{...receipt,estado:'Pagado',fechaPago:'2026-05-05'}]}]).code,'LEGACY_PAID_DATE_CONFLICT');
assert.equal(assessCase(raw,[{...group,receipts:[{...receipt,estado:'Pagado',conciliado:true}]}]).code,'EXISTING_RECONCILIATION_WITHOUT_COBRO_REVIEW');
assert.equal(assessCase(raw,[{...group,portfolio:[cartera,{...cartera,id:'c2'}]}]).code,'MULTIPLE_PORTFOLIO_ROWS_FOR_RECEIPT');
assert.equal(assessCase(raw,[{...group,portfolio:[]}]).ready.creatingPortfolio,true,
  'missing paid historical portfolio can be created as closed audit ledger when receipt is unique');
assert.equal(assessCase(raw,[{...group,receipts:[{...receipt,estado:'Pagado'}],portfolio:[]}]).ready.backfill,true,
  'legacy paid receipt with no Cobro or cartera needs both historical records');
assert.equal(assessCase(raw,[{...group,portfolio:[{...cartera,carteraActiva:false}]}]).ready.creatingPortfolio,false);
assert.equal(assessCase(raw,[{...group,receipts:[{...receipt,primaNeta:100}]}]).code,'NET_PREMIUM_CHANGED_REQUIRES_COMMISSION_RECOMPUTE');
assert.equal(assessCase(raw,[{...group,receipts:[{...receipt,monto:280}]}]).code,'GROSS_ALIASES_INCONSISTENT');
assert.equal(assessCase(raw,[{...group,receipts:[{...receipt,primaTotal:280,monto:280,montoTotal:280}],
  portfolio:[{...cartera,primaTotal:280,monto:280,montoTotal:280}]}]).ready.grossCents,29684,
  'insurer/authorized source gross overrides consistent stale gross only with unique edition/period');
assert.equal(assessCase(raw,[{...group,policy:{...group.policy,frecuencia:'Mensual'},
  receipts:[{...receipt,secuencia:8,vence:'2026-03-29',fechaLimite:'2026-03-30'}]}]).ready.match,
  'TERM_INSTALLMENT_SEQUENCE_GROSS_EQUAL','monthly ordinal inside exact edition resolves differing due dates');
assert.equal(assessCase({...raw,frequencySource:'Pago Único'},[{...group,
  receipts:[{...receipt,vence:'2026-03-29',fechaLimite:'2026-03-30'}]}]).ready.match,
  'SINGLE_RECEIPT_POLICY_TERM_GROSS_EQUAL');
assert.equal(assessCase({...raw,receiptPeriodStart:'2026-03-01'},[{...group,
  policy:{...group.policy,frecuencia:'Mensual'},
  receipts:[{...receipt,secuencia:8,vence:'2026-03-29',fechaLimite:'2026-04-08'}]}]).ready.match,
  'SOURCE_PERIOD_MONTH_ORDINAL_GROSS_EQUAL',
  'source month ordinal can identify a unique installment even with old system dates');
assert.equal(insurerMatches('Mapfre','MAPFRE Seguros de Guatemala'),true);
// Product labels on Cendoso policy numbers are not insurer requirement IDs.
// Resolve safe variants only with a unique insurer + exact coverage edition.
assert.ok(policyLookupVariants('AUTO - 39012').includes('39012'));
assert.ok(policyLookupVariants('AUTO 39012').includes('AUTO-39012'));
assert.ok(policyLookupVariants('TECD - 7001051').includes('7001051'));
assert.equal(policyMatches('AUTO - 39012','39012'),true);
assert.equal(policyMatches('AUTO - 39012','AUTO 39012'),true);
assert.equal(policyMatches('AUTO - 39012','TECD - 39012'),false);
assert.equal(policyMatches('AUTO - 39012','39013'),false);
assert.equal(policyMatches('04 05 01 014498 - 1','04 05 01 014498'),false,
  'renewal policy suffix is not a lookup alias');
const labeled={...raw,insurerSource:'AseGuate',policyNumberSource:'AUTO - 39012'};
const labeledGroup={...group,insurerName:'Aseguradora Guatemalteca',
  policy:{...group.policy,numero:'39012'}};
assert.equal(assess(sourceRow(labeled),[labeledGroup]).ready.policyId,'p1');
assert.equal(assess(sourceRow(labeled),[{
  ...labeledGroup,policy:{...labeledGroup.policy,vigenciaInicio:'2026-08-05'}
}]).code,'EXACT_POLICY_EDITION_NOT_FOUND');
assert.equal(assess(sourceRow(labeled),[{
  ...labeledGroup,insurerName:'Seguros El Roble S.A.'
}]).code,'EXACT_POLICY_EDITION_NOT_FOUND');
assert.equal(planBatch({candidates:[labeled]},[labeledGroup]).readyCount,1);
assert.equal(planBatch({candidates:[labeled]},[labeledGroup,{...labeledGroup,
  policy:{...labeledGroup.policy,id:'p2'}}]).holdCounts.MULTIPLE_POLICY_EDITIONS,1);
const mini={candidates:[raw,{...raw,candidateId:'cendoso_'+'b'.repeat(24)}]};
const ambiguous=planBatch(mini,[group]);
assert.equal(ambiguous.readyCount,0);
assert.equal(ambiguous.holdCounts.MULTIPLE_SOURCE_ROWS_FOR_ONE_RECEIPT,2,
  'never post the first of two source candidates for one receipt');
const ready=planBatch({candidates:[raw]},[group]);
assert.equal(ready.readyCount,1);
assert.equal(ready.writes,0);
const src=fs.readFileSync(path.join(__dirname,'gravicentra-i66-cendoso-paid-protected.cjs'),'utf8');
for(const mandatory of ["environment",'PENDING_APPLICATION','conciliado:false','tx.create(cobRef',
  'tx.update(rRef','tx.update(cRef','POSTIMAGE_READBACK_HOLD','sourceSha256:SOURCE_SHA'])
  assert.ok(src.includes(mandatory),'missing post-validation '+mandatory);
assert.ok(src.includes('fechaVencimientoContractual:oldPlan.due'));
assert.ok(src.includes('periodoInicioFuente:oldPlan.periodStart'));
assert.ok(src.includes('receiptDue(rr.data())!==oldPlan.due'));
assert.ok(!src.includes('forceReconciliation:true'));
console.log('I66_CENDOSO_PROTECTED_PAID_UNIT_PASS 607_SOURCE 574_GTQ_NO_SOURCE_HOLD 12_GUARDS');
