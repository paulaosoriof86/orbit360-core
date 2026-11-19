'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {sourceRow,assess,planBatch,loadSource,insurerMatches}=require('./gravicentra-i66-cendoso-paid-protected.cjs');
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
assert.equal(assessCase({...raw,currencySource:'COP'}).code,'SOURCE_CURRENCY_NOT_GTQ');
assert.equal(assessCase({...raw,holdReasons:['CONFLICTING_SOURCE_PAID_DATES']}).code,'CONFLICTING_SOURCE_DATES');
assert.equal(assessCase(raw,[]).code,'POLICY_NUMBER_NOT_FOUND');
assert.equal(assessCase(raw,[{...group,policy:{...group.policy,vigenciaInicio:'2026-08-05'}}]).code,'EXACT_POLICY_EDITION_NOT_FOUND');
assert.equal(assessCase(raw,[group,group]).code,'MULTIPLE_POLICY_EDITIONS');
assert.equal(assessCase(raw,[{...group,receipts:[receipt,{...receipt,id:'r2'}]}]).code,'MULTIPLE_RECEIPTS_FOR_PERIOD_OR_AMOUNT');
assert.equal(assessCase(raw,[{...group,receipts:[{...receipt,estado:'Pagado'}]}]).code,'ALREADY_PAID_PRESERVE');
assert.equal(assessCase(raw,[{...group,portfolio:[cartera,{...cartera,id:'c2'}]}]).code,'ACTIVE_PORTFOLIO_NOT_UNIQUE');
assert.equal(assessCase(raw,[{...group,receipts:[{...receipt,primaNeta:100}]}]).code,'NET_PREMIUM_CHANGED_REQUIRES_COMMISSION_RECOMPUTE');
assert.equal(assessCase(raw,[{...group,receipts:[{...receipt,monto:280}]}]).code,'GROSS_ALIASES_INCONSISTENT');
assert.equal(assessCase(raw,[{...group,receipts:[{...receipt,primaTotal:280,monto:280,montoTotal:280}],
  portfolio:[{...cartera,primaTotal:280,monto:280,montoTotal:280}]}]).ready.grossCents,29684,
  'insurer/authorized source gross overrides consistent stale gross only with unique edition/period');
assert.equal(insurerMatches('Mapfre','MAPFRE Seguros de Guatemala'),true);
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
assert.ok(!src.includes('forceReconciliation:true'));
console.log('I66_CENDOSO_PROTECTED_PAID_UNIT_PASS 607_SOURCE 574_GTQ_NO_SOURCE_HOLD 12_GUARDS');
