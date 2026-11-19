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
  console.log('I66_BULK_PROTECTED_WRITER_SYNTHETIC_PASS 1 receipt 1 cartera 1 audit; retry idempotent; CAS hold');
  console.log('I66_BULK_PROTECTED_WRITER_SYNTHETIC_750_ROWS_PASS 3 chunks x 250; 1500 materialized receipt/cartera rows; 750 audit; 0 duplicate replay writes');
})().catch(error=>{console.error(error);process.exitCode=1;});
