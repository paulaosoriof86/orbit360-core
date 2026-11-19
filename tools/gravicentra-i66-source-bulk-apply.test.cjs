'use strict';
const assert=require('node:assert/strict');
const {planSourceBatch}=require('./gravicentra-i66-source-bulk-plan.cjs');
const {applyProtectedBatch}=require('./gravicentra-i66-source-bulk-apply.cjs');
class MockDb {
  constructor(){this.docs=new Map();this.writes=0;}
  collection(key){return new MockRef(this,key);}
  async runTransaction(work){
    const staged=[];
    const tx={get:ref=>ref.get(),update:(ref,value)=>staged.push(['update',ref.path,value]),
      create:(ref,value)=>staged.push(['create',ref.path,value])};
    const result=await work(tx);
    for(const [op,path,value] of staged){
      if(op==='create'&&this.docs.has(path))throw Error('ALREADY_EXISTS');
      this.docs.set(path,{...this.docs.get(path),...value});this.writes++;
    }
    return result;
  }
}
class MockRef {
  constructor(db,path,query=null){this.db=db;this.path=path;this.query=query;}
  doc(id){return new MockRef(this.db,this.path+'/'+id);}
  collection(name){return new MockRef(this.db,this.path+'/'+name);}
  where(field,op,value){assert.equal(op,'==');return new MockRef(this.db,this.path,{field,value});}
  limit(n){return new MockRef(this.db,this.path,{...this.query,limit:n});}
  async get(){
    if(this.query){
      const docs=[...this.db.docs.entries()].filter(([path,data])=>
        path.startsWith(this.path+'/')&&path.slice(this.path.length+1).indexOf('/')<0&&
        data[this.query.field]===this.query.value).slice(0,this.query.limit||100).map(([path,data])=>({
        id:path.split('/').at(-1),exists:true,data:()=>({...data})}));
      return {docs,size:docs.length,empty:!docs.length};
    }
    const value=this.db.docs.get(this.path);
    return {id:this.path.split('/').at(-1),exists:!!value,data:()=>value&&{...value}};
  }
}
const tenant='tenants/alianzas-soluciones',name=type=>tenant+'/data/'+type+'/items/';
const db=new MockDb();
db.docs.set(name('polizas')+'p1',{id:'p1',numero:'AUTO-1',pais:'GT',moneda:'GTQ',estado:'Vigente',
  vigenciaInicio:'2026-01-01',vigenciaFin:'2027-01-01',clienteId:'cli1',aseguradoraId:'asg1'});
db.docs.set(name('recibosEsperados')+'rec_0000000000000001',{polizaId:'p1',moneda:'GTQ',vence:'2026-11-12',
  primaTotal:100,estado:'Pendiente'});
db.docs.set(name('carteraPrimas')+'c1',{polizaId:'p1',reciboId:'rec_0000000000000001',
  moneda:'GTQ',primaTotal:100,carteraActiva:true,clienteId:'cli1'});
// An identical external requirement on another policy is not a contradiction
// of this policy's uniquely identified pending installment.
db.docs.set(name('recibosEsperados')+'rec_0000000000000999',{polizaId:'p-other',
  numeroReciboFuente:'AC-11223344',moneda:'GTQ',vence:'2026-11-12',primaTotal:100});
db.docs.set(name('clientes')+'cli1',{pais:'GT'});
db.docs.set(name('aseguradoras')+'asg1',{nombre:'SEGUROS BANTRAB'});
const source=[{caseId:'B.1',insurer:'BANTRAB',policy:'AUTO-1',requirement:'AC-11223344',
  due:'2026-11-12',installment:8,grossCents:10001,state:'PENDING',sourceSha256:'b'.repeat(64)}];
const groups=[{clientExists:true,insurerVerified:true,insurerName:'SEGUROS BANTRAB',
  policy:{...db.docs.get(name('polizas')+'p1'),id:'p1'},
  receipts:[{...db.docs.get(name('recibosEsperados')+'rec_0000000000000001'),id:'rec_0000000000000001'}],
  portfolio:[{...db.docs.get(name('carteraPrimas')+'c1'),id:'c1'}],cobros:[]}];
const plan=planSourceBatch(source,groups),gate={environment:'gravicentra-live-data-writes',
  reviewerEvidence:true,repository:'paulaosoriof86/orbit360-core',
  ref:'refs/heads/recovery/fase-a-clean-20260831',project:'ays-orbit-360-lab',
  sourceManifestSha256:'c'.repeat(64)};
(async()=>{
  await assert.rejects(applyProtectedBatch(db,plan,{...gate,reviewerEvidence:false}),
    /I66_BULK_HOLD_ENVIRONMENT_OR_PLAN_NOT_APPROVED/);
  assert.equal(db.writes,0);
  const r=await applyProtectedBatch(db,plan,gate);
  assert.equal(r.status,'BULK_PROTECTED_READBACK_PASS');
  assert.equal(r.receiptWrites,1);assert.equal(r.portfolioWrites,1);assert.equal(r.cobroWrites,0);
  assert.equal(db.writes,3); // receipt + cartera + auditable rollback record
  assert.equal(db.docs.get(name('recibosEsperados')+'rec_0000000000000001').primaTotal,100.01);
  assert.equal(db.docs.get(name('carteraPrimas')+'c1').primaTotal,100.01);
  const again=await applyProtectedBatch(db,plan,gate);
  assert.equal(again.alreadyApplied,1);assert.equal(again.applied,0);assert.equal(db.writes,3);
  const altered=new MockDb();
  altered.docs=new Map([...db.docs].filter(([key])=>!key.includes('/operationalRequests/')));
  altered.docs.get(name('recibosEsperados')+'rec_0000000000000001').primaTotal=123;
  const changed=await applyProtectedBatch(altered,plan,gate);
  assert.equal(changed.status,'BULK_PARTIAL_HOLD');
  assert.equal(changed.receiptWrites,0);assert.equal(altered.writes,0);
  // Execute, read back and replay a genuinely large *synthetic* source batch.
  // Identifiers are unique obligations, not an arbitrary per-policy cap.
  const largeDb=new MockDb();
  largeDb.docs.set(name('clientes')+'cli1',{pais:'GT'});
  largeDb.docs.set(name('aseguradoras')+'asg1',{nombre:'SEGUROS BANTRAB'});
  const largeSources=[],largeGroups=[];
  for(let i=1;i<=750;i++){
    const policyId='many_p'+i,receiptId='rec_'+i.toString(16).padStart(16,'0'),portfolioId='many_c'+i;
    const policy={id:policyId,numero:'BIG-'+i,pais:'GT',moneda:'GTQ',estado:'Vigente',
      vigenciaInicio:'2026-01-01',vigenciaFin:'2027-01-01',clienteId:'cli1',aseguradoraId:'asg1'};
    const receipt={id:receiptId,polizaId:policyId,moneda:'GTQ',vence:'2026-11-12',
      primaTotal:100,estado:'Pendiente'};
    const portfolio={id:portfolioId,polizaId:policyId,reciboId:receiptId,
      moneda:'GTQ',primaTotal:100,carteraActiva:true,clienteId:'cli1'};
    largeDb.docs.set(name('polizas')+policyId,policy);
    largeDb.docs.set(name('recibosEsperados')+receiptId,receipt);
    largeDb.docs.set(name('carteraPrimas')+portfolioId,portfolio);
    largeSources.push({caseId:'BULK-'+i,insurer:'BANTRAB',policy:policy.numero,
      requirement:'AC-'+i,due:'2026-11-12',installment:1,
      grossCents:10000+i,state:'PENDING',sourceSha256:'d'.repeat(64)});
    largeGroups.push({clientExists:true,insurerVerified:true,insurerName:'SEGUROS BANTRAB',
      policy,receipts:[receipt],portfolio:[portfolio],cobros:[]});
  }
  const largePlan=planSourceBatch(largeSources,largeGroups);
  assert.equal(largePlan.readyCount,750);
  assert.deepEqual(largePlan.chunks.map(c=>c.count),[250,250,250]);
  const largeApplied=await applyProtectedBatch(largeDb,largePlan,gate);
  assert.equal(largeApplied.status,'BULK_PROTECTED_READBACK_PASS');
  assert.equal(largeApplied.receiptWrites,750);
  assert.equal(largeApplied.portfolioWrites,750);
  assert.equal(largeApplied.failed.length,0);
  assert.equal(largeDb.writes,2250);
  const replay=await applyProtectedBatch(largeDb,largePlan,gate);
  assert.equal(replay.alreadyApplied,750);
  assert.equal(replay.applied,0);
  assert.equal(largeDb.writes,2250);
  // El Roble-style monthly importer: 19 distinct insurer requirements map
  // to 19 existing installments across two complete 12-receipt policies.
  // The operational cutoff is intentionally unrelated to contractual due.
  const monthlyDb=new MockDb(),monthlyRows=[],monthlyGroups=[];
  monthlyDb.docs.set(name('clientes')+'cli1',{pais:'GT'});
  monthlyDb.docs.set(name('aseguradoras')+'asg1',{nombre:'SEGUROS EL ROBLE'});
  for(const [policyId,number,startMonth,startDay,firstIncluded,gross] of [
    ['p-month-a','91-MONTH-A',8,14,4,16302],
    ['p-month-b','91-MONTH-B',9,8,3,28246]]){
    const start='2026-'+String(startMonth).padStart(2,'0')+'-'+String(startDay).padStart(2,'0');
    const end='2027-'+String(startMonth).padStart(2,'0')+'-'+String(startDay).padStart(2,'0');
    const policy={id:policyId,numero:number,pais:'GT',moneda:'GTQ',estado:'Vigente',
      vigenciaInicio:start,vigenciaFin:end,frecuencia:'Mensual',
      clienteId:'cli1',aseguradoraId:'asg1'};
    monthlyDb.docs.set(name('polizas')+policyId,policy);
    const recs=[],cartera=[];
    for(let n=1;n<=12;n++){
      const rid='rec_'+policyId+'_'+n, cid='car_'+policyId+'_'+n;
      const receipt={id:rid,polizaId:policyId,moneda:'GTQ',
        numeroReciboFuente:n+'/12',fechaLimite:'2027-12-22',
        ...(policyId==='p-month-a'&&n===4?
          {fechaVencimientoContractual:'2026-11-29'}:{}),
        primaTotal:gross/100-0.5,primaNeta:gross/100-20,estado:'Pendiente'};
      const port={id:cid,polizaId:policyId,reciboId:rid,moneda:'GTQ',
        primaTotal:gross/100-(policyId==='p-month-a'&&n===4?0.75:0.5),
        carteraActiva:true,clienteId:'cli1'};
      monthlyDb.docs.set(name('recibosEsperados')+rid,receipt);
      monthlyDb.docs.set(name('carteraPrimas')+cid,port);
      recs.push(receipt);cartera.push(port);
      if(n>=firstIncluded){
        const month=startMonth-1+n-1, year=2026+Math.floor(month/12);
        const monthOfYear=month%12+1;
        const due=year+'-'+String(monthOfYear).padStart(2,'0')+
          '-'+String(startDay).padStart(2,'0');
        monthlyRows.push({caseId:'ROBLE-'+policyId+'-'+n,insurer:'ROBLE',policy:number,
          requirement:'REQ-'+policyId+'-'+n,due,grossCents:gross,
          state:'PENDING',sourceSha256:'e'.repeat(64)});
      }
    }
    monthlyGroups.push({policy,clientExists:true,insurerVerified:true,
      insurerName:'SEGUROS EL ROBLE',receipts:recs,portfolio:cartera,cobros:[]});
  }
  const monthlyPlan=planSourceBatch(monthlyRows,monthlyGroups);
  assert.equal(monthlyPlan.readyCount,19);
  assert.equal(monthlyPlan.exceptionCount,0);
  assert.ok(monthlyPlan.chunks[0].rows.every(x=>
    x.matchMethod==='COMPLETE_MONTHLY_INSURER_DATE'));
  const monthlyApplied=await applyProtectedBatch(monthlyDb,monthlyPlan,gate);
  assert.equal(monthlyApplied.status,'BULK_PROTECTED_READBACK_PASS');
  assert.equal(monthlyApplied.receiptWrites,19);
  assert.equal(monthlyApplied.portfolioWrites,19);
  assert.equal(monthlyDb.writes,57);
  for(const row of monthlyPlan.chunks[0].rows){
    const updated=monthlyDb.docs.get(name('recibosEsperados')+row.receiptId);
    assert.equal(updated.numeroReciboFuente,row.requirement);
    assert.equal(updated.fechaVencimientoContractual,row.due);
    assert.equal(updated.fechaLimite,'2027-12-22');
    assert.match(updated.referenciaCuotaInterna,/^\d+\/12$/);
    assert.equal(updated.primaTotal,row.grossCents/100);
    assert.equal(updated.primaNeta,row.grossCents/100-20);
  }
  const correctedFirst=monthlyPlan.chunks[0].rows.find(row=>
    row.policy==='91-MONTH-A'&&row.due==='2026-11-14');
  assert.equal(correctedFirst.oldContractualDue,'2026-11-29');
  assert.notEqual(correctedFirst.oldCarteraGrossCents,correctedFirst.oldGrossCents);
  const originalDueAudit=[...monthlyDb.docs.entries()].filter(([key,value])=>
    key.includes('/operationalRequests/')&&value.receiptId===correctedFirst.receiptId);
  assert.equal(originalDueAudit.length,1);
  assert.equal(originalDueAudit[0][1].rollback.fechaVencimientoContractual,'2026-11-29');
  const monthlyReplay=await applyProtectedBatch(monthlyDb,monthlyPlan,gate);
  assert.equal(monthlyReplay.alreadyApplied,19);
  assert.equal(monthlyDb.writes,57);
  const updatedGroups=monthlyGroups.map(g=>({...g,
    receipts:g.receipts.map(r=>({...monthlyDb.docs.get(name('recibosEsperados')+r.id)})),
    portfolio:g.portfolio.map(c=>({...monthlyDb.docs.get(name('carteraPrimas')+c.id)}))}));
  assert.equal(planSourceBatch(monthlyRows,updatedGroups).unchangedCount,19);
  // A source may omit the leading zero in an El Roble policy's fixed-width
  // number; the transaction must resolve the existing exact canonical edition.
  const zeroDb=new MockDb();
  zeroDb.docs.set(name('clientes')+'cli1',{pais:'GT'});
  zeroDb.docs.set(name('aseguradoras')+'asg1',{nombre:'SEGUROS EL ROBLE'});
  const zp={id:'p-zero',numero:'91-0169567',pais:'GT',moneda:'GTQ',estado:'Vigente',
    vigenciaInicio:'2026-08-05',vigenciaFin:'2027-08-05',clienteId:'cli1',aseguradoraId:'asg1'};
  const zr={id:'rec_zero',polizaId:'p-zero',moneda:'GTQ',vence:'2026-11-05',primaTotal:288.06};
  const zc={id:'car_zero',reciboId:'rec_zero',polizaId:'p-zero',moneda:'GTQ',
    primaTotal:288.06,carteraActiva:true,clienteId:'cli1'};
  zeroDb.docs.set(name('polizas')+'p-zero',zp);
  zeroDb.docs.set(name('recibosEsperados')+'rec_zero',zr);
  zeroDb.docs.set(name('carteraPrimas')+'car_zero',zc);
  const zeroPlan=planSourceBatch([{caseId:'Z1',insurer:'ROBLE',policy:'91-169567',
    requirement:'5485470',due:'2026-11-05',grossCents:28806,state:'PENDING',
    sourceSha256:'f'.repeat(64)}],[{policy:zp,clientExists:true,insurerVerified:true,
    insurerName:'SEGUROS EL ROBLE',receipts:[zr],portfolio:[zc],cobros:[]}]);
  assert.equal(zeroPlan.readyCount,1);
  const zeroApplied=await applyProtectedBatch(zeroDb,zeroPlan,gate);
  assert.equal(zeroApplied.receiptWrites,1);
  assert.equal(zeroDb.docs.get(name('recibosEsperados')+'rec_zero').numeroReciboFuente,'5485470');
  // A legacy receipt can hold two additional gross aliases. They must match
  // its own previous primaTotal, be CAS-checked and move together to insurer
  // gross; primaNeta and any operational limit are never reclassified.
  const aliasDb=new MockDb();
  aliasDb.docs=new Map([...zeroDb.docs].filter(([key])=>
    !key.includes('/operationalRequests/')).map(([key,value])=>[key,{...value}]));
  const oldAliasReceipt=aliasDb.docs.get(name('recibosEsperados')+'rec_zero');
  delete oldAliasReceipt.numeroReciboFuente;
  Object.assign(oldAliasReceipt,{primaTotal:288.07,monto:288.07,montoTotal:288.07,
    primaNeta:210.17,fechaLimite:'2026-12-15'});
  const oldAliasCartera=aliasDb.docs.get(name('carteraPrimas')+'car_zero');
  Object.assign(oldAliasCartera,{primaTotal:288.07,montoTotal:288.07});
  const aliasSource=[{caseId:'ROBLE-FIRST-ALIAS',insurer:'ROBLE',policy:'91-169567',
    requirement:'5485467',due:'2026-11-05',grossCents:28808,state:'PENDING',
    sourceSha256:'f'.repeat(64)}];
  const aliasGroup={policy:zp,clientExists:true,insurerVerified:true,
    insurerName:'SEGUROS EL ROBLE',
    receipts:[{...oldAliasReceipt,id:'rec_zero'}],
    portfolio:[{...oldAliasCartera,id:'car_zero'}],cobros:[]};
  const aliasPlan=planSourceBatch(aliasSource,[aliasGroup]);
  assert.equal(aliasPlan.readyCount,1);
  assert.deepEqual(aliasPlan.chunks[0].rows[0].oldGrossAliases,
    {receipt:{monto:28807,montoTotal:28807},cartera:{montoTotal:28807}});
  const badAliasGroup={...aliasGroup,
    receipts:[{...aliasGroup.receipts[0],monto:1}]};
  assert.equal(planSourceBatch(aliasSource,[badAliasGroup]).exceptions[0].code,
    'GROSS_PREIMAGE_NOT_COMPARABLE');
  const aliasWritten=await applyProtectedBatch(aliasDb,aliasPlan,gate);
  assert.equal(aliasWritten.receiptWrites,1);
  const newAliasReceipt=aliasDb.docs.get(name('recibosEsperados')+'rec_zero');
  const newAliasCartera=aliasDb.docs.get(name('carteraPrimas')+'car_zero');
  for(const key of ['primaTotal','monto','montoTotal'])
    assert.equal(newAliasReceipt[key],288.08);
  assert.equal(newAliasCartera.primaTotal,288.08);
  assert.equal(newAliasCartera.montoTotal,288.08);
  assert.equal(newAliasReceipt.primaNeta,210.17);
  assert.equal(newAliasReceipt.fechaLimite,'2026-12-15');
  const aliasAudit=[...aliasDb.docs.entries()].find(([key])=>
    key.includes('/operationalRequests/'))[1];
  assert.deepEqual(aliasAudit.rollback.receiptGrossAliases,
    {monto:288.07,montoTotal:288.07});
  assert.deepEqual(aliasAudit.rollback.carteraGrossAliases,{montoTotal:288.07});
  assert.equal((await applyProtectedBatch(aliasDb,aliasPlan,gate)).alreadyApplied,1);
  console.log('I66_BULK_PROTECTED_WRITER_SYNTHETIC_PASS 1 receipt 1 cartera 1 audit; retry idempotent; CAS hold');
  console.log('I66_BULK_PROTECTED_WRITER_SYNTHETIC_750_ROWS_PASS 3 chunks x 250; 1500 materialized receipt/cartera rows; 750 audit; 0 duplicate replay writes');
  console.log('I66_EL_ROBLE_MONTHLY_19_SYNTHETIC_PASS source due, aliases, CAS, exact readback, replay');
  console.log('I66_LEGACY_GROSS_ALIASES_SYNTHETIC_PASS issuer update, preserved net/limit, audit, replay and ambiguous-alias hold');
})().catch(error=>{console.error(error);process.exitCode=1;});
