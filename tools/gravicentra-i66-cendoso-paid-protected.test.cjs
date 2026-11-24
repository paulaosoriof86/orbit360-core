'use strict';
// 2026-11-19: insurer source prevails for historical due/period; paid Cobro never auto-reconciled.
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
// Reproduces the current two El Roble holds: the issuer's installment date
// exists only in fechaLimite, while Cendoso separately records the later due.
const issuerPeriodReceipt={...receipt,vence:'',fechaLimite:raw.receiptPeriodStart,
  numeroReciboFuente:'4992323'};
const issuerPeriodGroup={...group,receipts:[issuerPeriodReceipt]};
assert.equal(assessCase(raw,[issuerPeriodGroup]).ready.match,
  'LEGACY_INSURER_LIMIT_EXACT_SOURCE_PERIOD_GROSS_EQUAL');
const issuerPeriodCase=patch=>assessCase(raw,[{...issuerPeriodGroup,
  receipts:[{...issuerPeriodReceipt,...patch}]}]);
assert.equal(issuerPeriodCase({fechaVencimientoContractual:'2026-03-06'}).code,
  'RECEIPT_PERIOD_OR_DUE_NOT_FOUND','an explicit contractual date cannot be ignored');
assert.equal(issuerPeriodCase({fechaVencimientoContractual:'not-a-date'}).code,
  'RECEIPT_PERIOD_OR_DUE_NOT_FOUND','an invalid contractual value is not an absent field');
assert.equal(issuerPeriodCase({fechaVencimientoContractual:'not-a-date',vence:'2026-03-06'}).code,
  'RECEIPT_PERIOD_OR_DUE_NOT_FOUND','a malformed alias cannot hide another contractual date');
assert.equal(issuerPeriodCase({fechaLimite:'2026-03-06'}).code,
  'RECEIPT_PERIOD_OR_DUE_NOT_FOUND','no date proximity or same-month inference');
assert.equal(issuerPeriodCase({primaTotal:296.85,monto:296.85,montoTotal:296.85}).code,
  'RECEIPT_PERIOD_OR_DUE_NOT_FOUND','this fallback requires exact source gross');
assert.equal(issuerPeriodCase({numeroReciboFuente:'5/12'}).code,
  'RECEIPT_PERIOD_OR_DUE_NOT_FOUND','an internal installment label is not an issuer reference');
assert.equal(issuerPeriodCase({numeroReciboFuente:''}).code,'RECEIPT_PERIOD_OR_DUE_NOT_FOUND');
assert.equal(issuerPeriodCase({polizaId:'other-policy'}).code,'RECEIPT_PERIOD_OR_DUE_NOT_FOUND');
assert.equal(issuerPeriodCase({monto:280}).code,'GROSS_ALIASES_INCONSISTENT');
assert.equal(assessCase(raw,[{...issuerPeriodGroup,receipts:[issuerPeriodReceipt,
  {...issuerPeriodReceipt,id:'another-receipt'}]}]).code,'MULTIPLE_RECEIPTS_FOR_PERIOD_OR_AMOUNT');
assert.equal(assessCase(raw,[{...issuerPeriodGroup,
  cobros:[{id:'existing-payment',reciboId:'r1',estado:'Pagado'}]}]).code,'ALREADY_PAID_WITH_COBRO_PRESERVE');
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

// Causal reader regression: the same exact policy and receipt are invisible
// through numero alone when an approved persisted alias owns the number.
// No policy is rewritten, and a conflicting alias never becomes eligible.
const {readGroups,policyIdentityNumber,heldPolicyDiagnostics}=require('./gravicentra-i66-cendoso-paid-protected.cjs');
function fakeReader(records){
  const calls=[];
  const doc=(id,data)=>({id,exists:data!=null,data:()=>data});
  const at=parts=>({
    collection(name){return at([...parts,name]);},
    doc(id){return at([...parts,id]);},
    where(field,operator,value){
      assert.equal(operator,'==');const name=parts[3];
      return {limit(max){return {async get(){
        calls.push({name,field,value,max});
        const docs=Object.entries(records[name]||{}).filter(([,r])=>r[field]===value).slice(0,max).map(([id,r])=>doc(id,r));
        return {size:docs.length,docs};
      }}}};
    },
    async get(){return doc(parts[parts.length-1],records[parts[3]]?.[parts[parts.length-1]]);}
  });
  return {db:at([]),calls};
}
(async()=>{
  const aliasPolicy={...group.policy,numeroPoliza:'91-169567',polizaNumero:'91-0169567',aseguradoraId:'ins1'};
  delete aliasPolicy.numero;
  const records={polizas:{p1:aliasPolicy},clientes:{cli1:{nombre:'PRIVATE_CUSTOMER',email:'PRIVATE_EMAIL'}},
    aseguradoras:{ins1:{nombre:'Seguros El Roble',activo:true}},
    recibosEsperados:{r1:receipt},carteraPrimas:{c1:cartera},cobros:{}};
  const before=JSON.stringify(records),reader=fakeReader(records);
  const oldLookup=await reader.db.collection('tenants').doc('alianzas-soluciones').collection('data')
    .doc('polizas').collection('items').where('numero','==','91-169567').limit(16).get();
  assert.equal(oldLookup.size,0,'original single-field lookup reproduces missing policy');
  const actual=await readGroups(reader.db,{candidates:[raw]});
  assert.equal(actual.length,1,'alias queries deduplicate the same physical policy');
  assert.equal(actual[0].policy.numero,undefined,'no persisted canonical field is invented');
  assert.equal(planBatch({candidates:[raw]},actual).readyCount,1);
  assert.deepEqual([...new Set(reader.calls.filter(x=>x.name==='polizas').map(x=>x.field))].sort(),
    ['numero','numeroPoliza','polizaNumero'].sort());
  assert.equal(JSON.stringify(records),before,'bounded readback cannot mutate records');
  const conflict={...actual[0],policy:{...actual[0].policy,polizaNumero:'91-169568'}};
  assert.equal(policyIdentityNumber(conflict.policy),'');
  assert.equal(planBatch({candidates:[raw]},[conflict]).holdCounts.POLICY_NUMBER_FIELDS_CONFLICT,1);
  const productConflict={...labeledGroup,policy:{...labeledGroup.policy,
    numero:'39012',numeroPoliza:'AUTO - 39012',polizaNumero:'TECD - 39012'}};
  assert.equal(policyIdentityNumber(productConflict.policy),'',
    'a bare canonical number cannot bridge two conflicting product labels');
  assert.equal(planBatch({candidates:[labeled]},[productConflict]).holdCounts.POLICY_NUMBER_FIELDS_CONFLICT,1);
  assert.equal(policyIdentityNumber({...productConflict.policy,polizaNumero:'AUTO 39012'}),'AUTO - 39012',
    'consistent persisted product aliases remain eligible');
  const differentSourceProduct={...labeledGroup,policy:{...labeledGroup.policy,
    numero:'39012',numeroPoliza:'TECD - 39012'}};
  assert.equal(policyIdentityNumber(differentSourceProduct.policy),'TECD - 39012');
  assert.equal(planBatch({candidates:[labeled]},[differentSourceProduct]).readyCount,0,
    'the source cannot cross a known different product label via a bare stored number');
  const wrongEdition={...actual[0],policy:{...actual[0].policy,vigenciaInicio:'2026-08-05'}};
  assert.equal(planBatch({candidates:[raw]},[wrongEdition]).holdCounts.EXACT_POLICY_EDITION_NOT_FOUND,1);
  const otherInsurer={...actual[0],insurerName:'Universales'};
  assert.equal(planBatch({candidates:[raw]},[otherInsurer]).holdCounts.EXACT_POLICY_EDITION_NOT_FOUND,1);
  const rival={...actual[0],policy:{...actual[0].policy,id:'p2'}};
  assert.equal(planBatch({candidates:[raw]},[actual[0],rival]).holdCounts.MULTIPLE_POLICY_EDITIONS,1);
  const paidGroup={...actual[0],cobros:[{id:'existing',reciboId:'r1',estado:'Pagado'}]};
  assert.equal(planBatch({candidates:[raw]},[paidGroup]).holdCounts.ALREADY_PAID_WITH_COBRO_PRESERVE,1);
  const missing={...actual[0],receipts:[]};
  const missingPlan=planBatch({candidates:[raw]},[missing]);
  const diagnosed=heldPolicyDiagnostics({candidates:[raw]},[missing],missingPlan.holds);
  assert.equal(diagnosed.length,1);assert.equal(diagnosed[0].editions[0].receiptCount,0);
  assert.equal(diagnosed[0].sourceRows[0].reason,'RECEIPT_PERIOD_OR_DUE_NOT_FOUND');
  assert.ok(!JSON.stringify(diagnosed).includes('PRIVATE_'),'diagnostic contains no customer fields');
  assert.deepEqual(heldPolicyDiagnostics({candidates:[raw]},[paidGroup],
    planBatch({candidates:[raw]},[paidGroup]).holds),[],'already-paid history is not reopened');
  console.log('I66_CENDOSO_ALIAS_READER_CAUSAL_PASS OLD_ZERO_NEW_ONE_CONFLICT_HOLD_NO_WRITES');
})().catch(error=>{console.error(error);process.exitCode=1;});
