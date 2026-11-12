'use strict';
// Signed I6.6 A5/A6 readback. Never mutates financial or customer records.
// Source rows have been extracted from SHA-verifiable Nov 2026 insurer files;
// Columna intermediary 346 only, including paid/current duplicate suppression.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const source=require('../artifacts/orbit360-recovery/release-control/I6_6_CARTERA_A5_A6_SOURCE_EXACT_20261112.json');
const {resolveEditions,policyVariants,numbers,amount}=require('./gravicentra-i66-cartera-a1-a4-readonly.cjs');
const PROJECT='ays-orbit-360-lab',TENANT='alianzas-soluciones';
const text=x=>String(x==null?'':x).trim();
const norm=x=>text(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ');
const h=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex').slice(0,16);
const cents=a=>a.reduce((s,r)=>s+r.cents,0);
function validateSource(){
  assert.equal(source.mode,'READ_ONLY_SOURCE_FORENSICS_NO_FINANCIAL_WRITE');
  const a=source.insurers.A5,b=source.insurers.A6;
  assert.equal(a.paid.length,7);assert.equal(a.pending.length,9);
  assert.equal(cents(a.paid),317161);assert.equal(cents(a.pending),512548);
  assert.equal(b.intermediaryCode,'346');assert.equal(b.paid.length,4);
  assert.equal(b.current.length,9);assert.equal(cents(b.paid),102256);
  assert.equal(cents(b.current),287056);
  const overlap=b.current.filter(r=>r.alsoInPaidSheet);
  assert.equal(overlap.length,1);assert.equal(overlap[0].requirement,'7043053');
  assert.equal(overlap[0].collectedCents,14803);
  assert.ok(b.paid.some(r=>r.requirement===overlap[0].requirement&&r.cents===overlap[0].cents));
  assert.equal(b.current.filter(r=>!r.alsoInPaidSheet).length,8);
  assert.equal(cents(b.current.filter(r=>!r.alsoInPaidSheet)),272253);
  assert.equal(source.safety.writes,0);
}
const paid=(k,code,r,i)=>Object.assign({id:code+'.P'+(i+1),insurer:k,sourceKind:'PAID'},r);
const unpaid=(k,code,r,i)=>Object.assign({id:code+'.U'+(i+1),insurer:k,sourceKind:'PENDING'},r);
const CASES=Object.freeze([
  ...source.insurers.A5.paid.map((r,i)=>paid('ASEGURADORA GENERAL','A5',r,i)),
  ...source.insurers.A5.pending.map((r,i)=>unpaid('ASEGURADORA GENERAL','A5',r,i)),
  ...source.insurers.A6.paid.map((r,i)=>paid('COLUMNA','A6',r,i)),
  ...source.insurers.A6.current.filter(r=>!r.alsoInPaidSheet).map((r,i)=>unpaid('COLUMNA','A6',r,i))
]);
assert.equal(CASES.length,28);
function aliases(one){
  const base=policyVariants(one.policy);
  if(one.insurer==='COLUMNA'){
    const digits=one.policy.replace(/^VA[-\s]*/i,'');
    base.push(digits,Number(digits));
  }
  return Array.from(new Set(base));
}
function sameInsurer(name,expected){
  const n=norm(name),e=norm(expected);
  return e==='COLUMNA'?n.includes('COLUMNA'):
    n.includes('ASEGURADORA GENERAL')||n.includes('SEGUROS GENERAL');
}
async function sourceInsurerName(db,policy,insurerCache){
  const inline=[policy.aseguradoraNombre,policy.compania,policy.nombreAseguradora,
    typeof policy.aseguradora==='string'?policy.aseguradora:''].filter(Boolean);
  if(inline.length)return inline.join(' ');
  const id=text(policy.aseguradoraId||policy.companiaId);
  if(!id)return '';
  if(!Object.hasOwn(insurerCache,id)){
    const ref=db.collection('tenants').doc(TENANT).collection('data').doc('aseguradoras').collection('items').doc(id);
    insurerCache[id]=ref.get().then(s=>s.exists?s.data()?.nombre||s.data()?.razonSocial||'':'');
  }
  return insurerCache[id];
}
async function scan(db){
  const tenant=db.collection('tenants').doc(TENANT);
  const col=n=>tenant.collection('data').doc(n).collection('items');
  const [member,probe]=await Promise.all([tenant.collection('members').limit(1).get(),col('polizas').limit(1).get()]);
  assert.ok(!member.empty&&!probe.empty,'I66_A5_A6_TENANT_SCOPE_NOT_PRESENT');
  const buckets=Object.create(null),insurerCache=Object.create(null);
  const unique=Array.from(new Set(CASES.map(x=>x.insurer+'|'+x.policy)));
  for(const key of unique){
    const one=CASES.find(x=>x.insurer+'|'+x.policy===key),docs=Object.create(null);
    const fields=['numero','numeroPoliza','numero_poliza','numPoliza','polizaNumero','policyNumber'];
    for(const field of fields)for(const value of aliases(one)){
      const read=await col('polizas').where(field,'==',value).limit(5).get();
      for(const d of read.docs)docs[d.id]=d;
      assert.ok(Object.keys(docs).length<25,'I66_A5_A6_POLICY_EDITION_SCAN_LIMIT');
    }
    const matches=[];
    for(const d of Object.values(docs)){
      const p=d.data()||{},actual=await sourceInsurerName(db,p,insurerCache);
      if(!sameInsurer(actual,one.insurer))continue;
      matches.push({id:d.id,data:p});
    }
    buckets[key]=matches;
  }
  const cache=Object.create(null);
  async function readEdition(edition){
    if(Object.hasOwn(cache,edition.id))return cache[edition.id];
    const r=(async()=>{
      const [receipts,cobros,client]=await Promise.all([
        col('recibosEsperados').where('polizaId','==',edition.id).limit(80).get(),
        col('cobros').where('polizaId','==',edition.id).limit(80).get(),
        text(edition.data.clienteId)?col('clientes').doc(text(edition.data.clienteId)).get():Promise.resolve(null)
      ]);
      assert.ok(receipts.size<80&&cobros.size<80,'I66_A5_A6_EDITION_BOUND');
      const rRows=receipts.docs.map(d=>Object.assign({id:d.id},d.data()||{}));
      const cRows=cobros.docs.map(d=>Object.assign({id:d.id},d.data()||{}));
      return{policies:[edition.data],receipts:rRows,cobros:cRows,clientExists:!!client&&client.exists,
        fingerprint:h({policy:edition.data,receipts:rRows,cobros:cRows})};
    })();cache[edition.id]=r;return r;
  }
  const output=[];
  for(const one of CASES){
    const matches=buckets[one.insurer+'|'+one.policy]||[];
    const snapshots=await Promise.all(matches.map(readEdition));
    const result=resolveEditions(one,snapshots);
    let linked=0,quotaExact=0,sourceAmountExact=0;
    for(const snapshot of snapshots)for(const receipt of snapshot.receipts){
      if(!numbers(receipt).includes(one.requirement))continue;
      linked++;if(amount(receipt)===one.cents)sourceAmountExact++;
      const quota=[receipt.secuencia,receipt.cuota,receipt.numeroCuota,receipt.cuotaNumero].some(v=>
        v!=null&&Number(v)===Number(one.quota));
      if(quota)quotaExact++;
    }
    // Do not classify as an appliable payment based on a number/amount alone:
    // insurer, policy edition, source requirement, quota and due need receipts.
    const status=!matches.length?'HOLD_EXACT_INSURER_POLICY_NOT_FOUND':
      linked===0?'HOLD_REQUIREMENT_NOT_LINKED':
      linked!==1?'HOLD_REQUIREMENT_MULTIPLE_EDITIONS':
      sourceAmountExact!==1?'HOLD_AMOUNT_MISMATCH':
      quotaExact!==1?'HOLD_EXACT_QUOTA_NOT_LINKED':
      one.paidDate?'PAID_SOURCE_EXACT_RECEIPT_ELIGIBILITY_REVIEW_NOT_WRITE':
      'PENDING_SOURCE_EXACT_RECEIPT_ELIGIBILITY_REVIEW_NOT_WRITE';
    output.push({id:one.id,sourceKind:one.sourceKind,sourceCaseRow:one.row,
      policyEditionsMatchingInsurer:matches.length,linkedExactRequirements:linked,
      exactAmountLinked:sourceAmountExact,exactQuotaLinked:quotaExact,
      candidateEditionCount:result.exactAmountEditions||0,
      status,writes:0,snapshotFingerprint:h(snapshots.map(s=>s.fingerprint))});
  }
  return output;
}
async function main(){
  validateSource();
  assert.equal(process.env.GCLOUD_PROJECT,PROJECT);
  assert.equal(process.env.GI_I66_CARTERA_MODE,'readonly');
  assert.ok(!process.env.FIRESTORE_EMULATOR_HOST);
  const {getFirestore}=require('firebase-admin/firestore');
  const {initializeApp,getApps}=require('firebase-admin/app');
  const db=getFirestore(getApps()[0]||initializeApp({projectId:PROJECT}));
  const first=await scan(db),second=await scan(db);
  assert.deepEqual(first,second,'I66_A5_A6_CONCURRENT_LIVE_CHANGE_HOLD');
  const counts=first.reduce((m,r)=>(m[r.status]=(m[r.status]||0)+1,m),{});
  const report={schema:'gi.i66.cartera.a5-a6.live.readonly.v1',
    dateGuatemala:'2026-11-12',sourceSha256:{
      aseguradoraGeneralPaid:source.insurers.A5.paidSha256,
      aseguradoraGeneralPending:source.insurers.A5.pendingSha256,
      columna:source.insurers.A6.sha256},
    source:{A5:{paid:7,pending:9},A6:{paid:4,pendingSourceRows:9,
      overlappingPaidCurrent:1,uniquePendingUncollected:8}},
    cases:first,caseCount:first.length,statusCounts:counts,writes:0,certifiedApplied:0,
    next:'Exact edition and endorsement, external receipt, quota, insured identity and amount must be validated before isolated protected CAS.'};
  const dest=text(process.env.GI_I66_CARTERA_REPORT);
  if(dest){
    const prefix=text(process.env.RUNNER_TEMP)+'/';
    assert.ok(prefix.startsWith('/home/runner/work/_temp/'));
    assert.ok(dest.startsWith(prefix)&&dest.endsWith('/gi-i66-a5-a6-live-readonly.json'));
    fs.writeFileSync(dest,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
  }
  console.log('I66_A5_A6_LIVE_READONLY='+JSON.stringify({caseCount:first.length,statusCounts:counts,
    source:report.source,certifiedApplied:0,writes:0}));
}
if(require.main===module)main().catch(e=>{
  console.error(/^I66_A5_A6_[A-Z0-9_]+$/.test(text(e.message))?e.message:'I66_A5_A6_READONLY_HOLD');
  process.exitCode=1;
});
module.exports={validateSource,CASES,aliases,sameInsurer};
