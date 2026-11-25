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
  // Direct insurer requirement is authoritative over a stale imported due date.
  // This is a due-only correction; it must still write and read back exactly.
  const dueDb=new MockDb(),duePolicy={id:'due-policy',numero:'91-8282111',
    pais:'GT',moneda:'GTQ',estado:'Vigente',clienteId:'cli1',aseguradoraId:'asg1',
    vigenciaInicio:'2026-01-01',vigenciaFin:'2027-01-01'};
  const dueReceipt={id:'due-receipt',polizaId:'due-policy',moneda:'GTQ',
    numeroReciboFuente:'5254305',vence:'2026-09-06',fechaLimite:'2026-10-20',
    primaTotal:752.16,estado:'Pendiente'};
  const duePortfolio={id:'due-portfolio',polizaId:'due-policy',reciboId:'due-receipt',
    moneda:'GTQ',primaTotal:752.16,clienteId:'cli1',carteraActiva:true};
  dueDb.docs.set(name('polizas')+duePolicy.id,duePolicy);
  dueDb.docs.set(name('recibosEsperados')+dueReceipt.id,dueReceipt);
  dueDb.docs.set(name('carteraPrimas')+duePortfolio.id,duePortfolio);
  dueDb.docs.set(name('clientes')+'cli1',{pais:'GT'});
  dueDb.docs.set(name('aseguradoras')+'asg1',{nombre:'SEGUROS EL ROBLE'});
  const dueSource=[{caseId:'ROBLE-NOV20-DUE',insurer:'ROBLE',
    policy:'91-8282111',requirement:'5254305',due:'2026-09-17',
    grossCents:75216,state:'PENDING',sourceSha256:'f'.repeat(64)}];
  const dueGroup=[{policy:duePolicy,clientExists:true,insurerVerified:true,
    insurerName:'SEGUROS EL ROBLE',receipts:[dueReceipt],portfolio:[duePortfolio],cobros:[]}];
  const duePlan=planSourceBatch(dueSource,dueGroup);
  assert.equal(duePlan.readyCount,1);
  assert.equal(duePlan.unchangedCount,0);
  assert.equal(duePlan.chunks[0].rows[0].matchMethod,'EXACT_INSURER_REQUIREMENT_DUE');
  const dueApplied=await applyProtectedBatch(dueDb,duePlan,gate);
  assert.equal(dueApplied.receiptWrites,1);
  assert.equal(dueApplied.portfolioWrites,1);
  assert.equal(dueDb.docs.get(name('recibosEsperados')+'due-receipt').fechaVencimientoContractual,
    '2026-09-17');
  assert.equal(dueDb.docs.get(name('recibosEsperados')+'due-receipt').fechaLimite,'2026-10-20');
  assert.equal(dueDb.writes,3);
  const dueReplayed=await applyProtectedBatch(dueDb,duePlan,gate);
  assert.equal(dueReplayed.alreadyApplied,1);
  assert.equal(dueDb.writes,3);
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
  await testIssuedMedicalCreation();
  await testMissingMedicalObligation();
  console.log('I66_BULK_PROTECTED_WRITER_SYNTHETIC_PASS 1 receipt 1 cartera 1 audit; retry idempotent; CAS hold');
  console.log('I66_BULK_PROTECTED_WRITER_SYNTHETIC_750_ROWS_PASS 3 chunks x 250; 1500 materialized receipt/cartera rows; 750 audit; 0 duplicate replay writes');
  console.log('I66_EL_ROBLE_MONTHLY_19_SYNTHETIC_PASS source due, aliases, CAS, exact readback, replay');
  console.log('I66_LEGACY_GROSS_ALIASES_SYNTHETIC_PASS issuer update, preserved net/limit, audit, replay and ambiguous-alias hold');
})().catch(error=>{console.error(error);process.exitCode=1;});

async function testIssuedMedicalCreation(){
  const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
  const medical=require('./gravicentra-i66-universales-issued-editions.cjs');
  const sourceBytes=fs.readFileSync(path.join(__dirname,'../artifacts/orbit360-recovery/source-batches/I6_6_SOURCE_BULK_20261120_MULTI_302.json'));
  const source={data:JSON.parse(sourceBytes),bytesSha256:crypto.createHash('sha256').update(sourceBytes).digest('hex')};
  assert.equal(source.bytesSha256,medical.manifest.source302Sha256);
  assert.equal(medical.load().cases.reduce((n,c)=>n+c.pendingRows.length,0),22);
  // Synthetic names remain local to these in-memory tests. Original PDF
  // identity witnesses and the pinned manifest bytes are never rewritten.
  const originalWitnesses=medical.manifest.cases.map(c=>c.holderWitness);
  medical.manifest.cases.forEach((c,i)=>{c.holderWitness=crypto.createHash('sha256')
    .update(c.sourcePdfSha256+'|SYNTHETICHOLDER'+i).digest('hex');});
  const oldRun=process.env.GITHUB_RUN_ID;process.env.GITHUB_RUN_ID='synthetic-medical-22';
  let tests=0;
  try{
    class TimestampWitness{toJSON(){return {seconds:1790000000,nanoseconds:123};}}
    function firestoreShape(value){
      if(Array.isArray(value)){assert.ok(value.every(v=>!Array.isArray(v)),'FIRESTORE_REJECTS_NESTED_ARRAYS');value.forEach(firestoreShape);}
      else if(value&&typeof value==='object')Object.values(value).forEach(firestoreShape);
      else assert.notEqual(value,undefined,'FIRESTORE_REJECTS_UNDEFINED_FIELDS');
    }
    class MedicalDb extends MockDb{
      async runTransaction(work,options){
        const staged=[];let hasWrite=false;
        const tx={get:ref=>{assert.equal(hasWrite,false,'ALL_READS_MUST_PRECEDE_WRITES');return ref.get();},
          update:(ref,value)=>{hasWrite=true;staged.push(['update',ref.path,value]);},
          create:(ref,value)=>{hasWrite=true;staged.push(['create',ref.path,value]);}};
        const result=await work(tx);
        if(options?.readOnly)assert.equal(staged.length,0,'READONLY_CANNOT_STAGE_WRITES');
        for(const [op,key,value] of staged){firestoreShape(value);if(op==='create')assert.equal(this.docs.has(key),false,'CREATE_MUST_BE_ABSENT');}
        for(const [op,key,value] of staged){this.docs.set(key,op==='create'?{...value}:{...this.docs.get(key),...value});this.writes++;}
        if(staged.length&&this.afterCommit){const fn=this.afterCommit;delete this.afterCommit;fn(this);}
        if(staged.length&&this.throwAfterCommit){this.throwAfterCommit=false;throw Error('SIMULATED_COMMIT_RESPONSE_LOST');}
        return result;
      }
    }
    function fixture(){
      const db=new MedicalDb();
      db.docs.set(name('aseguradoras')+'medical-insurer',{id:'medical-insurer',pais:'GT',activo:true,nombre:'SEGUROS UNIVERSALES'});
      medical.manifest.cases.forEach((c,i)=>{
        db.docs.set(name('clientes')+'medical-client-'+i,{id:'medical-client-'+i,pais:'GT',asesorId:'medical-advisor-'+i,
          nombre:'SYNTHETIC HOLDER '+i,updatedAt:new TimestampWitness()});
        // Shared-country advisers may omit pais in the existing owner contract.
        db.docs.set(name('asesores')+'medical-advisor-'+i,{id:'medical-advisor-'+i,activo:true,...(i?{paises:['GT']}:{})});
        if(c.expectedPredecessorId)db.docs.set(name('polizas')+c.expectedPredecessorId,
          {id:c.expectedPredecessorId,numero:c.expectedPredecessor.number,pais:'GT',moneda:'GTQ',
            vigenciaInicio:c.expectedPredecessor.termStart,vigenciaFin:c.expectedPredecessor.termEnd,
            estado:'Renovada',clienteId:'medical-client-'+i,aseguradoraId:'medical-insurer',asesorId:'medical-advisor-'+i,
            sourceHistoricalField:'must remain intact',updatedAt:new TimestampWitness()});
      });
      db.docs.set(name('polizas')+'qa-parent',{id:'qa-parent',numero:'91-0234395',pais:'GT',moneda:'GTQ',
        vigenciaInicio:'2026-05-02',vigenciaFin:'2027-05-02',estado:'Vigente'});
      db.docs.set(name('recibosEsperados')+'qa-receipt',{id:'qa-receipt',polizaId:'qa-parent',primaTotal:278.26,numeroReciboFuente:'5228533'});
      db.docs.set(name('cobros')+'already-paid-10738',{id:'already-paid-10738',polizaId:'qa-parent',primaTotal:1479.35,conciliado:true});
      return db;
    }
    const base=planSourceBatch(source.data.rows,[]),verified=async()=>true;
    const approvedGate={...gate,sourceManifestSha256:source.bytesSha256};
    const wrapped={exports:{}};
    // Execute the real bulk adapter. Only the network document fetch is
    // replaced; assess, transactional CAS, mutation and readback are real.
    vm.runInNewContext(fs.readFileSync(path.join(__dirname,'gravicentra-i66-source-bulk-apply.cjs'),'utf8'),{
      module:wrapped,exports:wrapped.exports,require:id=>id==='./gravicentra-i66-universales-issued-editions.cjs'?
        {...medical,applyChunk:(db,c,g)=>medical.applyChunk(db,c,g,verified)}:require(id),console});
    const apply=wrapped.exports.applyProtectedBatch;
    const prepare=db=>medical.enrichPlan(db,source,base,verified);
    const db=fixture(),untouched=new Map([...db.docs].map(([k,v])=>[k,medical.hash(v)]));
    const plan=await prepare(db);assert.equal(plan.readyCount,22);assert.equal(plan.exceptionCount,base.exceptionCount-22);
    assert.deepEqual(plan.chunks.map(c=>c.count),[12,10]);assert.equal(db.writes,0);tests++;
    const selected=new Set(medical.manifest.cases.flatMap(c=>c.pendingRows.map(r=>r.caseId)));
    assert.deepEqual(plan.exceptions,base.exceptions.filter(r=>!selected.has(r.caseId)));
    const result=await apply(db,plan,approvedGate);
    assert.equal(result.status,'BULK_PROTECTED_READBACK_PASS');assert.equal(result.applied,22);
    assert.equal(result.receiptWrites,22);assert.equal(result.portfolioWrites,22);
    assert.equal(result.policyCreates,2);assert.equal(result.activityCreates,2);assert.equal(result.auditCreates,2);
    assert.equal(result.priorPolicyUpdates,1);assert.equal(result.technicalDocumentWrites,51);
    assert.equal(result.cobroWrites,0);assert.equal(result.paymentWrites,0);assert.equal(db.writes,51);tests++;
    const first=medical.manifest.cases[0],second=medical.manifest.cases[1];
    for(const [key,before] of untouched)if(key!==name('polizas')+first.expectedPredecessorId)
      assert.equal(medical.hash(db.docs.get(key)),before,'UNRELATED_OR_PARENT_DOCUMENT_CHANGED');
    const prior=db.docs.get(name('polizas')+first.expectedPredecessorId);
    assert.equal(prior.estado,'Renovada');assert.equal(prior.sourceHistoricalField,'must remain intact');
    assert.equal(prior.renovadaPor,'pol_'+plan.chunks[0].operation);tests++;
    let gross=0;
    for(let i=0;i<2;i++){
      const c=medical.manifest.cases[i],op=plan.chunks[i].operation,policy=db.docs.get(name('polizas')+'pol_'+op);
      assert.equal(policy.estado,i?'Emitida':'SIN COBERTURA');assert.equal(policy.coverageActiveInferred,false);
      assert.equal(policy.primaTotal,c.header.grossCents/100);assert.equal(policy.saldoPendienteDocumental,c.pendingGrossCents/100);
      assert.equal(policy.vigenciaFin,'2027-09-30');assert.equal(policy.vigenciaFinConvention,'INCLUSIVE_ISSUER_DATE');
      assert.equal(policy.vehiculoId,undefined);
      if(!i){assert.equal(policy.advertenciaCoberturaFuente.literal,'SIN COBERTURA');
        assert.equal(policy.advertenciaCoberturaFuente.fechaPosibleAnulacion,'2026-11-30');
        assert.equal(policy.advertenciaCoberturaFuente.anulacionEjecutada,false);}
      for(const row of c.pendingRows){const r=db.docs.get(name('recibosEsperados')+'rec_'+op+'_'+row.requirement);
        assert.equal(r.numeroCuota,row.sequence);assert.equal(r.serie,row.sequence+'/12');assert.equal(r.primaTotal,row.grossCents/100);
        assert.equal(r.fechaVencimientoContractual,row.due);assert.equal(r.fechaPago,null);assert.equal(r.conciliado,false);
        assert.equal(r.primaNeta,undefined);assert.equal(r.paymentState,undefined);gross+=row.grossCents;}
      const a=db.docs.get(tenant+'/operationalRequests/'+op);
      assert.equal(a.rollback.deleteCreatedTargets.length,c.pendingRows.length*2+2);
      if(!i)assert.equal(a.rollback.prior.renovadaPorWasPresent,false);
    }
    assert.equal(gross,1122994);tests++;
    const replay=await apply(db,plan,approvedGate);assert.equal(replay.applied,0);assert.equal(replay.alreadyApplied,22);
    assert.equal(replay.technicalDocumentWrites,0);assert.equal(db.writes,51);tests++;
    const groups=plan.chunks.map(c=>{const pid='pol_'+c.operation;return {policy:db.docs.get(name('polizas')+pid),
      clientExists:true,insurerVerified:true,insurerName:'SEGUROS UNIVERSALES',cobros:[],
      receipts:[...db.docs].filter(([k,v])=>k.startsWith(name('recibosEsperados'))&&v.polizaId===pid).map(([,v])=>v),
      portfolio:[...db.docs].filter(([k,v])=>k.startsWith(name('carteraPrimas'))&&v.polizaId===pid).map(([,v])=>v)};});
    const fresh=await medical.enrichPlan(db,source,planSourceBatch(source.data.rows,groups),verified);
    assert.equal(fresh.readyCount,0);assert.equal(fresh.unchangedCount,22);assert.equal(db.writes,51);tests++;
    const p1=plan.chunks[0],docFalse=fixture();
    assert.equal((await medical.enrichPlan(docFalse,source,base,async()=>false)).readyCount,0);assert.equal(docFalse.writes,0);tests++;
    await assert.rejects(medical.applyChunk(docFalse,p1,approvedGate,async()=>false),/MEDICAL_DOCUMENT_BYTES_NOT_VERIFIED/);
    assert.equal(docFalse.writes,0);tests++;
    const mutations=[
      ['duplicate holder',d=>d.docs.set(name('clientes')+'duplicate-holder',{id:'duplicate-holder',pais:'GT',nombre:'SYNTHETIC HOLDER 0'})],
      ['parent CAS',d=>d.docs.get(name('clientes')+'medical-client-0').sourceTag='changed'],
      ['advisor inactive',d=>d.docs.get(name('asesores')+'medical-advisor-0').activo=false],
      ['advisor wrong country',d=>d.docs.get(name('asesores')+'medical-advisor-0').pais='CO'],
      ['advisor explicitly empty country scope',d=>d.docs.get(name('asesores')+'medical-advisor-0').paises=[]],
      ['advisor explicitly foreign country scope',d=>d.docs.get(name('asesores')+'medical-advisor-0').paises=['CO']],
      ['advisor country contradicts scope',d=>Object.assign(d.docs.get(name('asesores')+'medical-advisor-0'),{pais:'GT',paises:['CO']})],
      ['advisor foreign country contradicts GT scope',d=>Object.assign(d.docs.get(name('asesores')+'medical-advisor-0'),{pais:'CO',paises:['GT']})],
      ['advisor declared country scope malformed',d=>d.docs.get(name('asesores')+'medical-advisor-0').paises=null],
      ['client tenant contradiction',d=>d.docs.get(name('clientes')+'medical-client-0').tenantId='other'],
      ['prior number contradiction',d=>d.docs.get(name('polizas')+first.expectedPredecessorId).numeroPoliza='99999-3'],
      ['prior linked elsewhere',d=>d.docs.get(name('polizas')+first.expectedPredecessorId).renovadaPor='other'],
      ['orphan country edition',d=>d.docs.set(name('polizas')+'orphan',{id:'orphan',numeroPoliza:'12289-4',vigenciaInicio:first.termStart,vigenciaFin:first.termEnd})],
      ['bare competing current edition',d=>d.docs.set(name('polizas')+'other',{id:'other',numero:'12289',pais:'GT',vigenciaInicio:first.termStart,vigenciaFin:first.termEnd})],
      ['new policy linked to predecessor',d=>d.docs.set(name('polizas')+'link',{id:'link',renuevaDe:first.expectedPredecessorId,pais:'GT'})],
      ['source requirement receipt',d=>d.docs.set(name('recibosEsperados')+'duplicate',{numeroReciboFuente:'39196269',polizaId:'qa-parent'})],
      ['source requirement portfolio',d=>d.docs.set(name('carteraPrimas')+'duplicate',{numeroReciboAseguradora:'39196269',polizaId:'qa-parent'})],
      ['source requirement payment',d=>d.docs.set(name('cobros')+'duplicate',{numeroRequerimiento:'39196269',polizaId:'qa-parent'})],
      ['misparented policy alias',d=>d.docs.set(name('recibosEsperados')+'wrong-parent',{numeroPolizaFuente:'12289-4',polizaId:'qa-parent',primaTotal:278.29})],
      ['orphan due amount',d=>d.docs.set(name('recibosEsperados')+'orphan-financial',{primaTotal:278.29,fechaLimite:'2026-10-01',polizaId:'unknown'})],
      ['target occupied',d=>d.docs.set(name('recibosEsperados')+'rec_'+p1.operation+'_39196269',{polizaId:'qa-parent'})]
    ];
    for(const [label,change] of mutations){const d=fixture();change(d);
      const held=await medical.applyChunk(d,p1,approvedGate,verified);assert.equal(held.status,'HOLD',label);assert.equal(d.writes,0,label);tests++;}
    for(const change of [c=>{c.rows[0].grossCents++;},c=>{c.rows[0].due='2026-10-02';},c=>{c.beforeHash='0'.repeat(64);},
      c=>{c.documentaryManifestSha256='0'.repeat(64);},c=>{c.rows[0].policy=second.policy;},c=>{c.rows[0].state='PAID';}]){
      const d=fixture(),c=structuredClone(p1);change(c);
      await assert.rejects(medical.applyChunk(d,c,approvedGate,verified));assert.equal(d.writes,0);tests++;}
    for(const invalid of [{...approvedGate,reviewerEvidence:false},{...approvedGate,sourceManifestSha256:'0'.repeat(64)},
      {...approvedGate,ref:'refs/heads/main'}]){const d=fixture();await assert.rejects(medical.applyChunk(d,p1,invalid,verified));assert.equal(d.writes,0);tests++;}
    for(const chunks of [[{...p1,operationKind:'UNKNOWN'}],[p1,p1],[{...p1,operationKind:undefined}]]){
      const d=fixture();await assert.rejects(apply(d,{...plan,chunks},approvedGate));assert.equal(d.writes,0);tests++;}
    const post=fixture();post.afterCommit=d=>{d.docs.get(name('recibosEsperados')+'rec_'+p1.operation+'_39196269').primaTotal=1;};
    const held=await apply(post,{...plan,chunks:[p1]},approvedGate);
    assert.equal(held.status,'BULK_PARTIAL_HOLD');assert.equal(held.applied,0);assert.equal(held.receiptWrites,12);
    assert.equal(held.technicalDocumentWrites,28);assert.equal(held.failed.length,12);assert.equal(post.writes,28);tests++;
    const lost=fixture();lost.throwAfterCommit=true;
    const recovered=await medical.applyChunk(lost,p1,approvedGate,verified);
    assert.equal(recovered.status,'APPLIED_READBACK_PASS');assert.equal(recovered.recoveredAfterTransactionError,true);
    assert.equal(recovered.technicalWrites,28);assert.equal(lost.writes,28);tests++;
    const badReplay=await medical.applyChunk(post,p1,approvedGate,verified);assert.equal(badReplay.status,'HOLD');assert.equal(post.writes,28);tests++;
    db.docs.get(tenant+'/operationalRequests/'+p1.operation).rollback.prior.renovadaPorWasPresent=true;
    const badAudit=await medical.applyChunk(db,p1,approvedGate,verified);assert.equal(badAudit.status,'HOLD');assert.equal(db.writes,51);tests++;
    console.log('I66_UNIVERSALES_22_DOCUMENTARY_CREATE_SYNTHETIC_PASS '+tests+' checks; 22 obligations, 51 writes, 0 payments/vehicles, exact readback and replay0; source302 general matching preserved');
  }finally{
    medical.manifest.cases.forEach((c,i)=>{c.holderWitness=originalWitnesses[i];});
    if(oldRun===undefined)delete process.env.GITHUB_RUN_ID;else process.env.GITHUB_RUN_ID=oldRun;
  }
}

async function testMissingMedicalObligation(){
 const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
 const m=require('./gravicentra-i66-universales-issued-editions.cjs');
 assert.equal(typeof m.loadMissing,'function','MISSING_OBLIGATION_OWNER_ENTRY_REQUIRED');
 const loaded=m.loadMissing();assert.equal(loaded.row.state,'PAID');assert.equal(loaded.spec.boundaries.paymentCreates,0);
 const intake=JSON.parse(fs.readFileSync(path.join(__dirname,'../artifacts/orbit360-recovery/release-control/I6_6_COBROS_CONCILIACION_SOURCE_INTAKE_20261110.json')));
 const admitted=Object.values(intake.sourceInventory).flatMap(group=>group?.files||[])
  .filter(row=>row.sha256===loaded.row.sourceSha256&&/VERIFIED/.test(row.hashStatus));
 assert.equal(admitted.length,1,'EXACT_PAID_SOURCE_MUST_ENTER_EXISTING_INTAKE_ALLOWLIST_ONCE');
 const source={data:m.missing.data,bytesSha256:m.MISSING_PIN};
 const c=m.missing.c,label=m.missing.spec.identityCorrection,originalWitness=c.holderWitness,originalLabel=structuredClone(label);
 const originalRun=process.env.GITHUB_RUN_ID;process.env.GITHUB_RUN_ID='123456789';
 const digest=s=>crypto.createHash('sha256').update(s).digest('hex');
 // Synthetic names are used only in process memory. No original manifest or
 // documentary source bytes are changed by these transaction simulations.
 const holder='SYNTHETICDOCUMENTARYHOLDERFULL',printed=holder.slice(0,24);
 c.holderWitness=digest(c.sourcePdfSha256+'|'+holder);label.originalHolderWitness=c.holderWitness;
 label.correctedPrintedHolderWitness=digest(m.missing.row.sourceSha256+'|'+printed);
 label.historicalWitness=digest(m.missing.row.sourceSha256+'|Q'+printed);
 let checks=2;
 try{
  class VersionedRef extends MockRef{
   doc(id){return new VersionedRef(this.db,this.path+'/'+id);}
   collection(name){return new VersionedRef(this.db,this.path+'/'+name);}
   where(field,op,value){assert.equal(op,'==');return new VersionedRef(this.db,this.path,{field,value});}
   limit(n){return new VersionedRef(this.db,this.path,{...this.query,limit:n});}
   async get(){
    if(this.db.readbackUnavailable)throw Error('SYNTHETIC_READBACK_UNAVAILABLE');
    const result=await super.get();
    if(this.query){for(const doc of result.docs)doc.updateTime=this.db.versions.get(this.path+'/'+doc.id);}
    else result.updateTime=this.db.versions.get(this.path);
    return result;
   }
  }
  function validFirestore(value){
   if(Array.isArray(value)){assert.ok(value.every(v=>!Array.isArray(v)),'NO_NESTED_FIRESTORE_ARRAYS');value.forEach(validFirestore);}
   else if(value&&typeof value==='object')Object.values(value).forEach(validFirestore);
   else assert.notEqual(value,undefined,'NO_UNDEFINED_FIRESTORE_VALUES');
  }
  class VersionedDb extends MockDb{
   constructor(){super();this.versions=new Map();this.version=1796000000;}
   collection(key){return new VersionedRef(this,key);}
   seed(key,value){this.docs.set(key,value);this.versions.set(key,{seconds:this.version++,nanoseconds:123000});}
   async runTransaction(work,options){
    const staged=[];let writesStarted=false;
    const tx={get:ref=>{assert.equal(writesStarted,false,'READS_AFTER_WRITES_FORBIDDEN');return ref.get();},
     update:(ref,value)=>{writesStarted=true;staged.push(['update',ref.path,value]);},
     create:(ref,value)=>{writesStarted=true;staged.push(['create',ref.path,value]);}};
    const result=await work(tx);if(options?.readOnly)assert.equal(staged.length,0);
    for(const [op,key,value] of staged){validFirestore(value);if(op==='create')assert.equal(this.docs.has(key),false,'CREATE_EXISTING_FORBIDDEN');}
    for(const [op,key,value] of staged){this.seed(key,op==='create'?structuredClone(value):{...this.docs.get(key),...value});this.writes++;}
    if(staged.length&&this.afterCommit){const fn=this.afterCommit;delete this.afterCommit;fn(this);}
    if(staged.length&&this.throwAfterCommit){delete this.throwAfterCommit;throw Error('SYNTHETIC_RESPONSE_LOST');}
    return result;
   }
  }
  function fixture(){
   const db=new VersionedDb(),client={id:'synthetic-doc09-client',pais:'GT',asesorId:'synthetic-doc09-advisor',nombre:holder},
    insurer={id:'synthetic-doc09-insurer',pais:'GT',activo:true,nombre:'SEGUROS UNIVERSALES'},
    advisor={id:'synthetic-doc09-advisor',pais:'GT',paises:['GT'],activo:true};
   for(const [collection,data] of [['clientes',client],['aseguradoras',insurer],['asesores',advisor]])db.seed(name(collection)+data.id,data);
   const s={complete:true,polizas:[],clientes:[client],aseguradoras:[insurer],asesores:[advisor],recibosEsperados:[],carteraPrimas:[],cobros:[],actividades:[]};
   const identity=m.assess(c,s);assert.equal(identity.status,'ELIGIBLE');
   const createdAt='2026-11-24T10:00:00.000Z',projected=m.mutations(c,identity,createdAt);
   for(const [collection,data] of projected.creates)db.seed(name(collection)+data.id,structuredClone(data));
   db.seed(tenant+'/operationalRequests/'+identity.operation,{schema:'GI_I66_DOCUMENTARY_MEDICAL_CREATE_AUDIT_V1',status:'COMMITTED',
    operation:identity.operation,policy:c.policy,manifestSha256:m.PIN,source302Sha256:m.manifest.source302Sha256,originalSha256:c.sourcePdfSha256,
    before:identity.before,beforeHash:identity.beforeHash,parents:{client,insurer,advisor,prior:null},
    creates:projected.creates.map(([collection,data])=>({collection,data:structuredClone(data)})),priorPatch:null,createdAt,runId:'123450000'});
   db.seed(name('polizas')+'synthetic-unrelated',{id:'synthetic-unrelated',numero:'QA-OTHER',pais:'GT',moneda:'GTQ'});
   db.seed(name('cobros')+'synthetic-existing-paid',{id:'synthetic-existing-paid',polizaId:'synthetic-unrelated',monto:100,estado:'Pagado',fecha:'2026-11-01'});
   return db;
  }
  const verified=async()=>true,approved={...gate,sourceManifestSha256:m.MISSING_PIN};
  const prepare=db=>m.enrichPlan(db,source,planSourceBatch(source.data.rows,[]),verified);
  const wrapped={exports:{}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'gravicentra-i66-source-bulk-apply.cjs'),'utf8'),{
   module:wrapped,exports:wrapped.exports,require:id=>id==='./gravicentra-i66-universales-issued-editions.cjs'?
    {...m,applyChunk:(db,chunk,g)=>m.applyChunk(db,chunk,g,verified)}:require(id),console});
  const apply=wrapped.exports.applyProtectedBatch;
  const db=fixture(),untouched=new Map([...db.docs].map(([k,v])=>[k,{hash:m.hash(v),version:m.hash(db.versions.get(k))}]));
  const plan=await prepare(db);assert.equal(db.writes,0);assert.equal(plan.readyCount,1);assert.equal(plan.exceptionCount,0);
  assert.equal(plan.chunks[0].operationKind,m.MISSING_KIND);assert.equal(plan.chunks[0].rows[0].state,'PAID');checks++;
  const result=await apply(db,plan,approved);
  assert.equal(result.status,'BULK_PROTECTED_READBACK_PASS');assert.equal(result.applied,1);
  assert.deepEqual([result.receiptWrites,result.portfolioWrites,result.auditCreates,result.policyCreates,result.activityCreates,result.paymentWrites,result.cobroWrites,result.technicalDocumentWrites],[1,1,1,0,0,0,0,3]);
  assert.equal(db.writes,3);assert.equal(db.docs.size,untouched.size+3);checks++;
  for(const [key,before] of untouched){assert.equal(m.hash(db.docs.get(key)),before.hash);assert.equal(m.hash(db.versions.get(key)),before.version);}
  const chunk=plan.chunks[0],targets=m.missingTargets(chunk.operation),receipt=db.docs.get(name(targets[0][0])+targets[0][1]);
  assert.equal(receipt.primaTotal,764.40);assert.equal(receipt.numeroCuota,2);assert.equal(receipt.numeroReciboFuente,m.missing.row.requirement);
  assert.equal(receipt.fechaPago,null);assert.equal(receipt.conciliado,false);assert.equal(receipt.sourceEvidence.sourceState,'PAID');
  assert.equal(receipt.sourceEvidence.sourceReportedPaidDate,'2026-11-05');assert.equal(receipt.sourceEvidence.canonicalPaymentRegistration,'PENDING');checks++;
  const replay=await apply(db,plan,approved);assert.equal(replay.alreadyApplied,1);assert.equal(replay.applied,0);assert.equal(replay.technicalDocumentWrites,0);assert.equal(db.writes,3);checks++;
  const replanned=await prepare(db);assert.equal(replanned.readyCount,0);assert.equal(replanned.unchangedCount,1);assert.equal(replanned.chunks.length,0);assert.equal(db.writes,3);checks++;
  const auditRow=db.docs.get(tenant+'/operationalRequests/'+chunk.operation);
  assert.equal(auditRow.rollback.deleteOnlyOwnedTargets.length,2);assert.equal(auditRow.rollback.exactReadbackUpdateTimesRequired,true);
  assert.equal(auditRow.rollback.noPaymentOrExternalReferenceRequired,true);assert.equal(auditRow.rollback.automaticExecution,false);checks++;
  const originalOp=plan.chunks[0].before.originalOperation,policyKey=name('polizas')+'pol_'+originalOp;
  const first=c.pendingRows[0],rid='rec_'+originalOp+'_'+first.requirement,receiptKey=name('recibosEsperados')+rid;
  const negatives=[
   ['original full holder mismatch',d=>{d.docs.get(name('clientes')+'synthetic-doc09-client').nombre='SYNTHETIC DIFFERENT HOLDER';}],
   ['conflicting full holder alias',d=>{d.docs.get(name('clientes')+'synthetic-doc09-client').nombreCompleto='SYNTHETIC DIFFERENT HOLDER';}],
   ['client country conflict',d=>{d.docs.get(name('clientes')+'synthetic-doc09-client').country='CO';}],
   ['insurer country conflict',d=>{d.docs.get(name('aseguradoras')+'synthetic-doc09-insurer').pais='CO';}],
   ['advisor scope conflict',d=>{d.docs.get(name('asesores')+'synthetic-doc09-advisor').paises=['CO'];}],
   ['policy country conflict',d=>{d.docs.get(policyKey).country='CO';}],
   ['policy currency conflict',d=>{d.docs.get(policyKey).currency='USD';}],
   ['policy full number alias conflict',d=>{d.docs.get(policyKey).numeroPoliza='04-05-01-15590-1';}],
   ['policy holder link conflict',d=>{d.docs.get(policyKey).clienteId='other';}],
   ['policy original document conflict',d=>{d.docs.get(policyKey).documentRef='other';}],
   ['policy term conflict',d=>{d.docs.get(policyKey).vigenciaInicio='2026-09-01';}],
   ['policy premium must remain original',d=>{d.docs.get(policyKey).primaTotal+=0.01;}],
   ['policy amount alias contradiction',d=>{d.docs.get(policyKey).prima+=0.01;}],
   ['another full policy edition',d=>d.seed(name('polizas')+'synthetic-duplicate',{...d.docs.get(policyKey),id:'synthetic-duplicate'})],
   ['original creation audit absent',d=>{d.docs.delete(tenant+'/operationalRequests/'+originalOp);}],
   ['original creation audit source drift',d=>{d.docs.get(tenant+'/operationalRequests/'+originalOp).originalSha256='0'.repeat(64);}],
   ['original creation audit targets drift',d=>{d.docs.get(tenant+'/operationalRequests/'+originalOp).creates.pop();}],
   ['existing quota missing',d=>{d.docs.delete(receiptKey);}],
   ['existing quota amount changed',d=>{d.docs.get(receiptKey).monto+=0.01;}],
   ['existing quota requirement changed',d=>{d.docs.get(receiptKey).numeroReciboFuente='other';}],
   ['existing quota date changed',d=>{d.docs.get(receiptKey).fechaLimite='2026-12-02';}],
   ['existing quota marked paid',d=>{d.docs.get(receiptKey).fechaPago='2026-11-24';}],
   ['existing parent payment',d=>d.seed(name('cobros')+'synthetic-paid-target',{id:'synthetic-paid-target',polizaId:'pol_'+originalOp,monto:764.40})],
   ['source fact already nested in a payment',d=>d.seed(name('cobros')+'synthetic-nested-paid',{id:'synthetic-nested-paid',sourceEvidence:{sourceFactId:m.missing.row.sourceFactId}})],
   ['combined invoice already represented',d=>d.seed(name('cobros')+'synthetic-invoice',{id:'synthetic-invoice',numeroFactura:m.missing.row.invoiceSeries+'-'+m.missing.row.invoiceNumber})],
   ['conflicting invoice aliases cannot hide duplicate',d=>d.seed(name('cobros')+'synthetic-invoice-alias',{id:'synthetic-invoice-alias',invoiceNumber:'different',numeroFactura:m.missing.row.invoiceNumber,serieFactura:m.missing.row.invoiceSeries})],
   ['unbound issuer requirement already represented',d=>d.seed(name('recibosEsperados')+'synthetic-unbound',{id:'synthetic-unbound',numeroReciboFuente:m.missing.row.requirement})],
   ['unbound same date and amount',d=>d.seed(name('carteraPrimas')+'synthetic-orphan',{id:'synthetic-orphan',vence:m.missing.row.due,monto:764.40})],
   ['same policy printed on an orphan',d=>d.seed(name('carteraPrimas')+'synthetic-number',{id:'synthetic-number',polizaNumero:c.policy})],
   ['missing exact updateTime',d=>{d.versions.delete(policyKey);}]
  ];
  for(const [label,mutate] of negatives){const d=fixture();mutate(d);const held=await prepare(d);
   assert.equal(held.readyCount,0,label);assert.equal(d.writes,0,label);checks++;}
  for(const [label,mutate] of [
   ['parent data CAS after preflight',d=>{d.docs.get(policyKey).observaciones='changed after approval';}],
   ['parent updateTime CAS with identical data',d=>{d.versions.get(policyKey).nanoseconds++;}],
   ['preserved quota updateTime CAS',d=>{d.versions.get(receiptKey).nanoseconds++;}],
   ['original audit updateTime CAS',d=>{d.versions.get(tenant+'/operationalRequests/'+originalOp).nanoseconds++;}]
  ]){const d=fixture(),p=await prepare(d);mutate(d);const held=await apply(d,p,approved);assert.equal(held.applied,0,label);assert.equal(d.writes,0,label);checks++;}
  for(const change of [p=>{p.operationKind='UNKNOWN';},p=>{p.rows[0].state='PENDING';},p=>{p.rows[0].grossCents++;},
   p=>{p.documentaryManifestSha256='f'.repeat(64);},p=>{p.beforeHash='f'.repeat(64);},p=>{p.rows.push({...p.rows[0]});p.count++;}]){
   const d=fixture(),p=await prepare(d);change(p.chunks[0]);await assert.rejects(m.applyChunk(d,p.chunks[0],approved,verified));assert.equal(d.writes,0);checks++;
  }
  for(const changed of [{...approved,reviewerEvidence:false},{...approved,environment:'other'},{...approved,sourceManifestSha256:'f'.repeat(64)},
   {...approved,ref:'refs/heads/main'},{...approved,project:'other'}]){
   const d=fixture(),p=await prepare(d);await assert.rejects(m.applyChunk(d,p.chunks[0],changed,verified));assert.equal(d.writes,0);checks++;
  }
  const unverified=fixture();assert.equal((await m.enrichPlan(unverified,source,planSourceBatch(source.data.rows,[]),async()=>false)).readyCount,0);assert.equal(unverified.writes,0);checks++;
  const labelBefore=label.correctedPrintedHolderWitness;label.correctedPrintedHolderWitness='0'.repeat(64);
  assert.equal((await prepare(fixture())).readyCount,0);label.correctedPrintedHolderWitness=labelBefore;checks++;
  const lost=fixture(),lostPlan=await prepare(lost);lost.throwAfterCommit=true;
  const recovered=await apply(lost,lostPlan,approved);assert.equal(recovered.status,'BULK_PROTECTED_READBACK_PASS');assert.equal(recovered.applied,1);assert.equal(lost.writes,3);
  assert.equal(recovered.documentaryResults[0].recoveredAfterTransactionError,true);assert.equal((await apply(lost,lostPlan,approved)).alreadyApplied,1);assert.equal(lost.writes,3);checks++;
  const changed=fixture(),changedPlan=await prepare(changed),newReceipt='rec_'+changedPlan.chunks[0].operation+'_'+m.missing.row.requirement;
  changed.afterCommit=d=>{d.docs.get(name('recibosEsperados')+newReceipt).monto=1;};
  const postHold=await apply(changed,changedPlan,approved);assert.equal(postHold.status,'BULK_PARTIAL_HOLD');assert.equal(postHold.applied,0);
  assert.equal(postHold.receiptWrites,1);assert.equal(postHold.portfolioWrites,1);assert.equal(postHold.technicalDocumentWrites,3);assert.equal(changed.writes,3);checks++;
  const protectedReplay=await apply(changed,changedPlan,approved);assert.equal(protectedReplay.applied,0);assert.equal(changed.writes,3);checks++;
  const uncertain=fixture(),uncertainPlan=await prepare(uncertain);uncertain.afterCommit=d=>{d.readbackUnavailable=true;};uncertain.throwAfterCommit=true;
  const unknown=await apply(uncertain,uncertainPlan,approved);assert.equal(unknown.status,'BULK_PARTIAL_HOLD');assert.equal(unknown.applied,0);
  assert.equal(unknown.writeOutcomeIndeterminate,true);assert.equal(unknown.technicalDocumentWrites,null);assert.equal(unknown.receiptWrites,null);
  assert.equal(unknown.portfolioWrites,null);assert.equal(unknown.auditCreates,null);assert.equal(unknown.attemptedTechnicalDocumentWrites,3);
  assert.equal(unknown.policyCreates,0);assert.equal(unknown.paymentWrites,0);assert.equal(uncertain.writes,3);checks++;
  uncertain.readbackUnavailable=false;assert.equal((await apply(uncertain,uncertainPlan,approved)).alreadyApplied,1);assert.equal(uncertain.writes,3);checks++;
  const paidLater=fixture(),paidLaterPlan=await prepare(paidLater);await apply(paidLater,paidLaterPlan,approved);
  const paidReceipt=m.missingTargets(paidLaterPlan.chunks[0].operation)[0][1];
  paidLater.docs.get(name('recibosEsperados')+paidReceipt).fechaPago='2026-11-05';
  paidLater.seed(name('cobros')+'synthetic-later-ui-payment',{id:'synthetic-later-ui-payment',reciboId:paidReceipt,polizaId:'pol_'+originalOp,monto:764.40,estado:'Pagado'});
  const laterReplay=await apply(paidLater,paidLaterPlan,approved);assert.equal(laterReplay.applied,0);assert.equal(laterReplay.status,'BULK_PARTIAL_HOLD');
  assert.equal(paidLater.writes,3,'obligation replay must not reapply or recreate after a separate payment');checks++;
  console.log('I66_UNIVERSALES_DOC09_MISSING_OBLIGATION_SYNTHETIC_PASS '+checks+' checks; 1 receipt + 1 cartera + 1 audit; 0 policy/activity/payment writes; 20 existing financial rows preserved; replay0; exact updateTime CAS; source remains PAID');
 }finally{c.holderWitness=originalWitness;Object.keys(label).forEach(k=>delete label[k]);Object.assign(label,originalLabel);
  if(originalRun===undefined)delete process.env.GITHUB_RUN_ID;else process.env.GITHUB_RUN_ID=originalRun;}
}
