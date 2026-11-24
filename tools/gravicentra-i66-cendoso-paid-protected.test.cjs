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



// Source-backed historical delta: execute the production transaction code
// against a complete in-memory Firestore surface, including fresh census,
// parent CAS, exact postimages and zero-write replay.
const H=require('./gravicentra-i66-cendoso-paid-protected.cjs');
const historicalSource=source.candidates.filter(r=>r.policyNumberSource==='AUTO-20251544');
assert.equal(historicalSource.length,2);
const historicalPacket={candidates:historicalSource};
const historicalPolicy={id:'hist-policy',numero:'AUTO-20251544',clienteId:'hist-client',
  aseguradoraId:'hist-insurer',asesorId:'hist-advisor',pais:'GT',moneda:'GTQ',
  vigenciaInicio:historicalSource[0].coverageStart,vigenciaFin:historicalSource[0].coverageEnd,
  frecuencia:'Mensual',estado:'Renovada',renovadaPor:'existing-successor'};
const historicalClient={id:'hist-client',nombre:'PRIVATE_TEST_CLIENT',pais:'GT'};
const historicalInsurer={id:'hist-insurer',nombre:'BAM',activo:true,pais:'GT'};
const historicalGroup={policy:historicalPolicy,clientExists:true,insurerVerified:true,
  clientSnapshotHash:H.stableHash(historicalClient),insurerSnapshotHash:H.stableHash(historicalInsurer),
  insurerName:'BAM',receipts:[],portfolio:[],cobros:[]};
const sourceDigest='649fa315a90b176b794abf6eef3d9f893d47de64cfe558d203a099c408692aa0';
const emptyHistorical=()=>({complete:true,sourceSha256:sourceDigest,records:[],audits:[],
  policies:[historicalPolicy],insurers:[historicalInsurer]});
const assessHistorical=(snapshot=emptyHistorical(),packet=historicalPacket,raw=historicalSource[0])=>
  H.assessHistorical(raw,[historicalGroup],packet,snapshot);
assert.ok(assessHistorical().ready);
assert.equal(H.historicalSourceProved({...historicalSource[0],sourceRows:historicalSource[0].sourceRows
  .filter(r=>!r.file.includes('-24-'))}),false,'a schedule alone does not prove payment');
assert.equal(H.historicalSourceProved({...historicalSource[0],sourceRows:historicalSource[0].sourceRows
  .filter(r=>r.file.includes('-24-'))}),false,'a paid row alone does not authorize a missing schedule');
assert.equal(H.historicalSourceProved({...historicalSource[0],materialSourceVariation:true}),false);
assert.equal(H.historicalSourceProved({...historicalSource[0],actualPaidDate:'2026-02-31'}),false);
assert.equal(assessHistorical({...emptyHistorical(),complete:false}).code,'HISTORICAL_COMPLETE_CENSUS_REQUIRED');
const addRecord=record=>({...emptyHistorical(),records:[record]});
assert.equal(assessHistorical(addRecord({collection:'recibosEsperados',id:'alias-receipt',
  policyId:historicalPolicy.id})).code,'HISTORICAL_EXISTING_POLICY_FINANCIAL_RECORD');
assert.equal(assessHistorical(addRecord({collection:'cobros',id:'alias-conflict',
  polizaId:historicalPolicy.id,policyId:'another-policy'})).code,'HISTORICAL_EXISTING_POLICY_FINANCIAL_RECORD');
assert.equal(assessHistorical(addRecord({collection:'cobros',id:'orphan-payment',
  evidenceId:historicalSource[0].candidateId})).code,'HISTORICAL_EXISTING_NATURAL_KEY_OR_EVIDENCE');
assert.equal(assessHistorical(addRecord({collection:'carteraPrimas',id:'natural-orphan',
  historicalNaturalKey:H.historicalIdentity(historicalSource[0],historicalPolicy).naturalKey})).code,
  'HISTORICAL_EXISTING_NATURAL_KEY_OR_EVIDENCE');
assert.equal(assessHistorical(addRecord({collection:'cobros',id:'unanchored-paid',
  fechaLimite:historicalSource[0].receiptDueDate,monto:Number(historicalSource[0].totalPremium)})).code,
  'HISTORICAL_ORPHAN_OR_ALIAS_AMBIGUITY');
assert.equal(assessHistorical(addRecord({collection:'cobros',id:'broken-parent',policyId:'missing-parent',
  fechaLimite:historicalSource[0].receiptDueDate,monto:Number(historicalSource[0].totalPremium)})).code,
  'HISTORICAL_ORPHAN_OR_ALIAS_AMBIGUITY');
for(const field of ['fechaPago','paidDate','actualPaidDate'])assert.equal(assessHistorical(addRecord({
  collection:'cobros',id:'paid-date-orphan',
  [field]:historicalSource[0].actualPaidDate,monto:Number(historicalSource[0].totalPremium)})).code,
  'HISTORICAL_ORPHAN_OR_ALIAS_AMBIGUITY','a date-only orphan payment cannot become a duplicate');
assert.equal(assessHistorical(addRecord({collection:'cobros',id:'unparsed-date-orphan',
  paidDate:{seconds:123456789},monto:Number(historicalSource[0].totalPremium)})).code,
  'HISTORICAL_ORPHAN_OR_ALIAS_AMBIGUITY','an unparsed payment date does not prove absence');
assert.equal(assessHistorical({...emptyHistorical(),policies:[historicalPolicy,
  {...historicalPolicy,id:'rival-edition'}]}).code,'HISTORICAL_GLOBAL_POLICY_EDITION_NOT_UNIQUE');
assert.equal(assessHistorical(emptyHistorical(),{candidates:[...historicalSource,
  {...historicalSource[0],candidateId:'cendoso_'+'f'.repeat(24),totalPremium:'999.00',actualPaidDate:'2026-02-10'}]}).code,
  'HISTORICAL_SOURCE_PERIOD_NOT_UNIQUE','a different paid amount/date cannot create a second period receipt');

function memoryFirestore(){
  const records=new Map(),stats={creates:0,collections:[]},clone=v=>JSON.parse(JSON.stringify(v));
  const key=(col,id)=>['tenants','alianzas-soluciones','data',col,'items',id].join('/');
  const auditKey=id=>['tenants','alianzas-soluciones','operationalRequests',id].join('/');
  const snap=(p,fields)=>({id:p.split('/').at(-1),exists:records.has(p),data:()=>{
    const v=records.get(p);if(v===undefined)return undefined;
    if(!fields)return clone(v);
    return Object.fromEntries(fields.filter(k=>v[k]!==undefined).map(k=>[k,clone(v[k])]));
  }});
  const at=(parts,cap=Infinity,fields=null)=>({
    path:parts.join('/'),collection(name){return at([...parts,name]);},doc(id){assert.ok(id);return at([...parts,id]);},
    limit(n){return at(parts,n,fields);},select(...names){return at(parts,cap,names);},
    async get(){
      if(parts.length%2===0)return snap(parts.join('/'),fields);
      const prefix=parts.join('/')+'/';
      const docs=[...records.keys()].filter(k=>k.startsWith(prefix)&&!k.slice(prefix.length).includes('/'))
        .slice(0,cap).map(k=>snap(k,fields));
      return {docs,size:docs.length,empty:docs.length===0};
    }
  });
  const db=at([]);
  db.getAll=async(...refs)=>Promise.all(refs.map(r=>r.get()));
  db.runTransaction=async fn=>{
    if(db.beforeTransaction){const f=db.beforeTransaction;db.beforeTransaction=null;f();}
    const pending=[];let writing=false;
    const tx={get:async ref=>{assert.equal(writing,false,'Firestore reads must precede writes');return ref.get();},
      getAll:async(...refs)=>{assert.equal(writing,false);return Promise.all(refs.map(r=>r.get()));},
      create(ref,value){writing=true;pending.push([ref.path,clone(value)]);}};
    const out=await fn(tx);
    assert.equal(new Set(pending.map(([p])=>p)).size,pending.length,'no repeated target in one atomic commit');
    for(const [p]of pending)assert.equal(records.has(p),false,'create must not overwrite');
    for(const [p,v]of pending){records.set(p,v);stats.creates++;stats.collections.push(p.split('/')[3]);}
    if(db.afterCommit){const f=db.afterCommit;db.afterCommit=null;f();}
    return out;
  };
  db.seed=(col,id,value)=>records.set(key(col,id),clone(value));
  db.remove=(col,id)=>records.delete(key(col,id));
  db.seedAudit=(id,value)=>records.set(auditKey(id),clone(value));
  db.read=(col,id)=>clone(records.get(key(col,id)));
  db.readAudit=id=>clone(records.get(auditKey(id)));
  db.stats=stats;
  db.seed('polizas',historicalPolicy.id,historicalPolicy);
  db.seed('clientes',historicalClient.id,historicalClient);
  db.seed('aseguradoras',historicalInsurer.id,historicalInsurer);
  return db;
}
(async()=>{
  const db=memoryFirestore(),snapshot=await H.readHistoricalSnapshot(db,historicalPacket);
  const plan=H.planBatch(historicalPacket,[historicalGroup],snapshot);
  assert.equal(plan.readyCount,2);assert.ok(plan.ready.every(r=>r.creatingReceipt));
  const beforePolicy=JSON.stringify(db.read('polizas',historicalPolicy.id));
  const first=await H.applyHistoricalChunk(db,[plan.ready[0]],historicalPacket);
  assert.equal(first.holds.length,0);assert.equal(first.accepted.length,1);assert.equal(db.stats.creates,4);
  const ids=H.historicalIdentity(historicalSource[0],historicalPolicy);
  const receipt=db.read('recibosEsperados',ids.receiptId),portfolio=db.read('carteraPrimas',ids.portfolioId),
    payment=db.read('cobros',ids.cobroId);
  assert.equal(receipt.numeroReciboFuente,null,'do not invent an insurer requirement from the candidate hash');
  for(const r of [receipt,portfolio,payment]){
    assert.equal(r.paymentState,'PAID_DIRECT');assert.equal(r.applicationState,'PENDING_APPLICATION');
    assert.equal(r.conciliado,false);assert.equal(r.carteraActiva,false);assert.equal(r.saldo,0);
    assert.equal(r.fechaPago,historicalSource[0].actualPaidDate);
    assert.equal(r.primaNeta,Number(historicalSource[0].netPremium));
  }
  assert.equal(portfolio.carteraTipo,'historico_pagado_fuente');
  assert.equal(JSON.stringify(db.read('polizas',historicalPolicy.id)),beforePolicy,'coverage/lifecycle must remain exact');
  assert.ok(db.stats.collections.every(c=>['recibosEsperados','carteraPrimas','cobros'].includes(c)||c.startsWith('gi_i66_cendoso_paid_')));
  const second=await H.applyHistoricalChunk(db,[plan.ready[1]],historicalPacket);
  assert.equal(second.holds.length,0,'verified prior-chunk sibling must not block a distinct paid period');
  assert.equal(second.accepted.length,1);assert.equal(db.stats.creates,8);
  const replay=await H.applyHistoricalChunk(db,plan.ready,historicalPacket);
  assert.equal(replay.holds.length,0);assert.equal(replay.accepted.length,2);
  assert.ok(replay.accepted.every(r=>r.status==='ALREADY_APPLIED_READBACK_PASS'));
  assert.equal(db.stats.creates,8,'replay creates zero records');
  const originalAudit=db.readAudit(H.auditId(historicalSource[0].candidateId));
  db.seedAudit(H.auditId(historicalSource[0].candidateId),{...originalAudit,newGrossCents:originalAudit.newGrossCents+1});
  const badAuditReplay=await H.applyHistoricalChunk(db,[plan.ready[0]],historicalPacket);
  assert.equal(badAuditReplay.accepted.length,0);assert.equal(badAuditReplay.committedCount,0);
  assert.equal(badAuditReplay.holds[0].reason,'HISTORICAL_REPLAY_POSTIMAGE_HOLD');
  db.seedAudit(H.auditId(historicalSource[0].candidateId),originalAudit);
  db.seed('recibosEsperados','natural-duplicate-after-commit',{...receipt,id:'natural-duplicate-after-commit'});
  const duplicateReplay=await H.applyHistoricalChunk(db,[plan.ready[0]],historicalPacket);
  assert.equal(duplicateReplay.accepted.length,0);assert.equal(duplicateReplay.committedCount,0);
  assert.equal(duplicateReplay.holds[0].reason,'HISTORICAL_REPLAY_POSTIMAGE_HOLD');
  db.remove('recibosEsperados','natural-duplicate-after-commit');
  db.seed('cobros',ids.cobroId,{...payment,monto:payment.monto+1});
  const badReplay=await H.applyHistoricalChunk(db,[plan.ready[0]],historicalPacket);
  assert.equal(badReplay.accepted.length,0);assert.equal(badReplay.holds[0].reason,'HISTORICAL_REPLAY_POSTIMAGE_HOLD');
  assert.equal(db.stats.creates,8,'a corrupted replay never repairs or duplicates silently');

  for(const mutation of [
    d=>d.seed('clientes',historicalClient.id,{...historicalClient,nombre:'changed-concurrently'}),
    d=>d.seed('polizas','competing-edition',{...historicalPolicy,id:'competing-edition'}),
    d=>{d.seed('aseguradoras','equivalent-insurer',{id:'equivalent-insurer',nombre:'BAM Guatemala',activo:true});
      d.seed('polizas','competing-insurer-alias',{...historicalPolicy,id:'competing-insurer-alias',aseguradoraId:'equivalent-insurer'});},
    d=>d.seed('recibosEsperados','alias-arrived',{policyId:historicalPolicy.id}),
    d=>d.seed('cobros','orphan-arrived',{evidenceId:historicalSource[0].candidateId})
  ]){
    const raced=memoryFirestore();raced.beforeTransaction=()=>mutation(raced);
    const out=await H.applyHistoricalChunk(raced,[plan.ready[0]],historicalPacket);
    assert.equal(out.accepted.length,0);assert.equal(out.holds.length,1);assert.equal(raced.stats.creates,0);
  }
  const changedPostimage=memoryFirestore();changedPostimage.afterCommit=()=>{
    const p=changedPostimage.read('cobros',ids.cobroId);changedPostimage.seed('cobros',ids.cobroId,{...p,conciliado:true});
  };
  const badReadback=await H.applyHistoricalChunk(changedPostimage,[plan.ready[0]],historicalPacket);
  assert.equal(badReadback.accepted.length,0);assert.equal(badReadback.holds[0].reason,'HISTORICAL_POSTIMAGE_READBACK_HOLD');
  assert.equal(badReadback.committedCount,1);assert.equal(badReadback.physicalDocumentCreates,4);
  assert.equal(badReadback.holds[0].commitOutcome,'COMMITTED_PENDING_READBACK',
    'a committed but unverified row must never be reported as zero writes');
  assert.deepEqual(badReadback.committedUnverified,[historicalSource[0].candidateId]);
  const unavailableReadback=memoryFirestore();unavailableReadback.afterCommit=()=>{
    unavailableReadback.getAll=async()=>{throw Error('simulated transport failure');};
  };
  const transportHold=await H.applyHistoricalChunk(unavailableReadback,[plan.ready[0]],historicalPacket);
  assert.equal(transportHold.accepted.length,0);assert.equal(transportHold.committedCount,1);
  assert.equal(transportHold.holds[0].reason,'HISTORICAL_POSTIMAGE_READBACK_UNAVAILABLE');
  const isolated=memoryFirestore();isolated.seed('cobros','orphan-first-only',{evidenceId:historicalSource[0].candidateId});
  const isolatedResult=await H.applyHistoricalChunk(isolated,plan.ready,historicalPacket);
  assert.equal(isolatedResult.holds.length,1);assert.equal(isolatedResult.accepted.length,1);
  assert.equal(isolatedResult.accepted[0].sourceId,historicalSource[1].candidateId);
  assert.equal(isolatedResult.committedCount,1);
  console.log('I66_CENDOSO_HISTORICAL_PAIRED_SOURCE_CENSUS_CAS_POSTIMAGE_REPLAY_ZERO_PASS');
})().catch(error=>{console.error(error);process.exitCode=1;});

// The probe found one later AUTO installment and four later VA installments.
// The pinned paired source proves seven earlier payments; these exact existing
// rows must survive while seven different closed historical rows are created.
const distinctSources=source.candidates.filter(r=>['AUTO-45580','VA-53105'].includes(r.policyNumberSource));
assert.equal(distinctSources.length,7);
assert.equal(distinctSources.reduce((n,r)=>n+Math.round(Number(r.totalPremium)*100),0),216796);
function distinctFixture(){
 const configs=[
  {id:'pol_6537ecb219275945f57fc567610c',number:'AUTO-45580',start:'2025-07-21',end:'2026-07-21',insurer:'Bantrab',gross:299.94,net:200,total:10,
   rows:[['rec_hist_16212cd7ce44fe9d916493a6',10,'2026-04-21','car_hist_f08197b9ffd468b4e631bf57']]},
  {id:'pol_c0001022fe28c0fa04d405d4a5b8',number:'VA-53105',start:'2025-07-10',end:'2026-07-10',insurer:'Columna',gross:334.13,net:298.33,total:12,
   rows:[['rec_hist_c8094f5c5d957ebb92394280',9,'2026-03-20','car_hist_81df5e9d13fb048cc5a7c7ee'],
    ['rec_hist_97584e6447b4d77693e3b2bb',10,'2026-04-20','car_hist_b71098f7943809fc28e538fd'],
    ['rec_hist_b20e2186b389ed6a2176c09e',11,'2026-05-20','car_hist_2a9bbbf32c3a2b9f3c32323a'],
    ['rec_hist_746bbd6d8c6722088a24d50f',12,'2026-06-20','car_hist_0d88f3b85f39cd4262946a7f']]}
 ];
 const db=memoryFirestore(),groups=[],preserved=[];
 for(const c of configs){
  const policy={id:c.id,numero:c.number,clienteId:'client-'+c.number,aseguradoraId:'insurer-'+c.number,
   asesorId:'preserved-advisor',vigenciaInicio:c.start,vigenciaFin:c.end,pais:'GT',moneda:'GTQ',frecuencia:'Mensual',estado:'Renovada'},
   client={id:policy.clienteId,pais:'GT',nombre:'PRIVATE_TEST_'+c.number},insurer={id:policy.aseguradoraId,pais:'GT',nombre:c.insurer,activo:true};
  const g={policy,insurerName:c.insurer,clientExists:true,insurerVerified:true,clientSnapshotHash:H.stableHash(client),
   insurerSnapshotHash:H.stableHash(insurer),receipts:[],portfolio:[],cobros:[]};
  for(const [rid,ordinal,due,pid] of c.rows){
   const shared={polizaId:policy.id,clienteId:policy.clienteId,aseguradoraId:policy.aseguradoraId,moneda:'GTQ',
    numeroReciboFuente:'',serie:ordinal+'/'+c.total,polizaNumero:c.number,fechaLimite:due,primaTotal:c.gross,
    historicalExigible:true,sourceBundleSha256:'f445e2f4a20b9eb7a526bda8896472dab9e7ac4617b3c5d8124a939a0dee0e6a'};
   const receipt={...shared,id:rid,primaNeta:c.net},portfolio={...shared,id:pid,reciboId:rid};
   g.receipts.push(receipt);g.portfolio.push(portfolio);
   for(const [collection,row] of [['recibosEsperados',receipt],['carteraPrimas',portfolio]]){
    db.seed(collection,row.id,row);preserved.push({collection,id:row.id,before:JSON.stringify(row)});
   }
  }
  for(const [collection,row] of [['polizas',policy],['clientes',client],['aseguradoras',insurer]]){
   db.seed(collection,row.id,row);preserved.push({collection,id:row.id,before:JSON.stringify(row)});
  }
  groups.push(g);
 }
 return {db,groups,preserved,packet:{candidates:distinctSources}};
}
(async()=>{
 const fixture=distinctFixture(),{db,groups,packet,preserved}=fixture,snapshot=await H.readHistoricalSnapshot(db,packet);
 for(const raw of distinctSources){
  const g=groups.find(g=>g.policy.numero===raw.policyNumberSource);
  assert.equal(H.assess(H.sourceRow(raw),[g]).code,'RECEIPT_PERIOD_OR_DUE_NOT_FOUND','causal old path cannot match a later installment');
  assert.ok(H.assessHistorical(raw,[g],packet,snapshot).ready,'positive identity proof permits the missing exact period');
 }
 const plan=H.planBatch(packet,groups,snapshot);assert.equal(plan.readyCount,7);assert.equal(plan.holdsCount,0);
 assert.equal(plan.ready.reduce((n,r)=>n+r.grossCents,0),216796);
 assert.ok(plan.ready.every(r=>r.creatingReceipt&&r.creatingPortfolio&&r.before.existingDistinctInstallments.length>=2));
 assert.equal(db.stats.creates,0,'planning cannot write');
 const applied=await H.applyHistoricalChunk(db,plan.ready,packet);
 assert.equal(applied.accepted.length,7,JSON.stringify(applied));assert.equal(applied.committedCount,7);assert.equal(applied.holds.length,0);
 assert.equal(db.stats.creates,28);assert.equal(applied.physicalDocumentCreates,28);
 for(const item of preserved)assert.equal(JSON.stringify(db.read(item.collection,item.id)),item.before,'every existing record and parent is preserved');
 for(const raw of distinctSources){
  const g=groups.find(g=>g.policy.numero===raw.policyNumberSource),ids=H.historicalIdentity(raw,g.policy);
  for(const [collection,id] of [['recibosEsperados',ids.receiptId],['carteraPrimas',ids.portfolioId],['cobros',ids.cobroId]]){
   const r=db.read(collection,id);assert.equal(r.paymentState,'PAID_DIRECT');assert.equal(r.conciliado,false);
   assert.equal(r.applicationState,'PENDING_APPLICATION');assert.equal(r.saldo,0);assert.equal(r.carteraActiva,false);
   assert.equal(r.fechaPago,raw.actualPaidDate);assert.equal(r.primaTotal,Number(raw.totalPremium));
  }
 }
 const replay=await H.applyHistoricalChunk(db,plan.ready,packet);
 assert.equal(replay.accepted.length,7,JSON.stringify(replay));assert.equal(replay.holds.length,0);
 assert.ok(replay.accepted.every(r=>r.status==='ALREADY_APPLIED_READBACK_PASS'));assert.equal(db.stats.creates,28);
 const fresh=H.planBatch(packet,groups.map(g=>({...g,
  receipts:[...g.receipts,...distinctSources.filter(r=>r.policyNumberSource===g.policy.numero).map(r=>db.read('recibosEsperados',H.historicalIdentity(r,g.policy).receiptId))],
  portfolio:[...g.portfolio,...distinctSources.filter(r=>r.policyNumberSource===g.policy.numero).map(r=>db.read('carteraPrimas',H.historicalIdentity(r,g.policy).portfolioId))],
  cobros:distinctSources.filter(r=>r.policyNumberSource===g.policy.numero).map(r=>db.read('cobros',H.historicalIdentity(r,g.policy).cobroId))
 })),await H.readHistoricalSnapshot(db,packet));
 assert.equal(fresh.readyCount,0);assert.equal(fresh.holdCounts.ALREADY_PAID_WITH_COBRO_PRESERVE,7);

 const mutations=[
  r=>{r.serie='5/10';},r=>{r.serie='';},r=>{r.numeroCuota=5;},r=>{r.cuota='5/10';},
  r=>{r.fechaLimite='2025-11-21';},r=>{r.fechaVencimientoContractual='2025-11-21';},
  r=>{r.periodoInicioFuente='2025-11-21';},r=>{r.sourceBundleSha256='x'.repeat(64);},
  r=>{r.polizaNumero='AUTO-99999';},r=>{r.policyId='another';},r=>{r.clienteId='another';},
  r=>{r.numeroPolizaFuente='AUTO-99999';},
  r=>{r.moneda='USD';},r=>{r.primaTotal=299.95;},r=>{r.primaNeta=200.01;},
  r=>{r.monto=299.95;},r=>{r.numeroReciboFuente='9912345';},r=>{r.paymentState='PAID_REPORTED';},
  r=>{r.sourceId=distinctSources[0].candidateId;}
 ];
 for(const mutate of mutations){
  const f=distinctFixture(),g=f.groups[0],r={...g.receipts[0]};mutate(r);f.db.seed('recibosEsperados',r.id,r);
  const s=await H.readHistoricalSnapshot(f.db,f.packet),out=H.assessHistorical(distinctSources[0],[g],f.packet,s);
  assert.ok(!out.ready,'contradictory later-installment witness stays held: '+mutate.toString());assert.equal(f.db.stats.creates,0);
 }
 for(const race of ['legacy-body','orphan','source-evidence','portfolio-link','new-receipt','policy-country']){
  const f=distinctFixture(),s=await H.readHistoricalSnapshot(f.db,f.packet),p=H.planBatch(f.packet,f.groups,s),g=f.groups[0];
  f.db.beforeTransaction=()=>{
   if(race==='legacy-body')f.db.seed('recibosEsperados',g.receipts[0].id,{...g.receipts[0],freshNote:'changed-after-preflight'});
   if(race==='orphan')f.db.seed('cobros','orphan',{monto:299.94,fechaPago:distinctSources[0].actualPaidDate});
   if(race==='source-evidence')f.db.seed('cobros','source-evidence',{sourceId:distinctSources[0].candidateId});
   if(race==='portfolio-link')f.db.seed('carteraPrimas',g.portfolio[0].id,{...g.portfolio[0],reciboId:'unknown'});
   if(race==='new-receipt')f.db.seed('recibosEsperados','new-receipt',{polizaId:g.policy.id,serie:'5/10',primaTotal:299.94});
   if(race==='policy-country')f.db.seed('polizas',g.policy.id,{...g.policy,pais:'CO'});
  };
  const out=await H.applyHistoricalChunk(f.db,[p.ready.find(r=>r.sourceId===distinctSources[0].candidateId)],f.packet);
  assert.equal(out.accepted.length,0,race);assert.equal(out.holds.length,1,race);assert.equal(f.db.stats.creates,0,race);
 }
 console.log('I66_CENDOSO_DISTINCT_LEGACY_7_PAYMENTS_Q2167_96_28_CREATES_CAS_READBACK_REPLAY_PASS');
})().catch(error=>{console.error(error);process.exitCode=1;});
