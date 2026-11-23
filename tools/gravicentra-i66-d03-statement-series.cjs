'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const admin=require('firebase-admin'),S=require('./gravicentra-i66-issued-source-schedules.cjs');
const mode=process.argv[2],scope=S.scope('D03'),op=scope.op+'_source_series_v2';
assert.ok(['preflight','apply'].includes(mode));assert.equal(process.env.GCLOUD_PROJECT,'ays-orbit-360-lab');
assert.equal(process.env.GITHUB_REPOSITORY,'paulaosoriof86/orbit360-core');assert.equal(process.env.GITHUB_REF,'refs/heads/recovery/fase-a-clean-20260831');
if(mode==='apply')assert.equal(process.env.GI_I66_BULK_PROTECTED_ENV,'gravicentra-live-data-writes');
admin.initializeApp({credential:admin.credential.applicationDefault(),projectId:process.env.GCLOUD_PROJECT});
const db=admin.firestore(),tenant=db.collection('tenants').doc('alianzas-soluciones');
const requests=tenant.collection('operationalRequests'),col=k=>tenant.collection('data').doc(k).collection('items');
const audit=requests.doc(op),issuerAudit=requests.doc(scope.op);
async function read(tx){
  const [orig,own]=await tx.getAll(issuerAudit,audit);
  assert.equal(orig.get('status'),'COMMITTED');assert.equal(orig.get('decision'),'D03');
  const records=orig.get('records'),financial=records.filter(x=>['recibosEsperados','carteraPrimas'].includes(x.collection));
  assert.equal(financial.length,22);
  const snaps=await tx.getAll(...financial.map(x=>col(x.collection).doc(x.row.id)));
  const amount=financial.filter(x=>x.collection==='carteraPrimas').reduce((v,x)=>v+Math.round(x.row.primaTotal*100),0);
  assert.equal(amount,563508);
  const changes=[];
  for(let i=0;i<snaps.length;i++){
    const original=financial[i].row,row=snaps[i].data(),src=scope.rows.find(r=>r.requirement===row.numeroReciboFuente);
    assert.equal(original.operationId,scope.op);
    assert.ok(src&&src.due===row.fechaVencimientoContractual&&src.grossCents===Math.round(row.primaTotal*100));
    const next={...original,cuota:'',posicionEstadoCuenta:original.secuencia,numeroCuotaFuente:'NO_INFORMADO',cantidadPendientesEstadoCuenta:11};
    delete next.numeroCuota;
    if(own.exists)assert.deepEqual(row,next);
    else{assert.deepEqual(row,original);assert.equal(row.cuota,row.secuencia+'/11');}
    changes.push({ref:snaps[i].ref,before:original.cuota,sourceOrdinal:original.secuencia,next});
  }
  return {own,changes,before:S.sha(JSON.stringify(snaps.map(d=>[d.ref.path,d.updateTime.seconds,d.updateTime.nanoseconds]).sort()))};
}
(async()=>{
  const out=await db.runTransaction(async tx=>{
    const v=await read(tx);
    if(v.own.exists)return {status:'ALREADY_APPLIED',writes:0};
    if(mode==='preflight')return {status:'ELIGIBLE',before:v.before,receipts:11,portfolio:11,writes:0};
    assert.equal(v.before,process.env.I66_EXPECTED_BEFORE);
    for(const x of v.changes)tx.update(x.ref,{cuota:'',numeroCuota:admin.firestore.FieldValue.delete(),posicionEstadoCuenta:x.sourceOrdinal,
      numeroCuotaFuente:'NO_INFORMADO',cantidadPendientesEstadoCuenta:11});
    tx.create(audit,{operation:op,priorOperation:scope.op,authority:'D03',status:'COMMITTED',
      statementSha256:scope.rows[0].sourceSha256,affected:v.changes.map(x=>({path:x.ref.path,oldInstallmentLabel:x.before,oldInstallmentNumber:x.sourceOrdinal})),
      before:v.before,reason:'Estado de cuenta acredita requerimiento, saldo y vencimiento; no declara cuota contractual ni total de cuotas del plan',
      financialAmountsChanged:0,createdAt:admin.firestore.FieldValue.serverTimestamp(),runId:process.env.GITHUB_RUN_ID});
    return {status:'COMMITTED',writes:23};
  },mode==='preflight'?{readOnly:true}:undefined);
  console.log('I66_D03_SOURCE_SERIES_'+mode.toUpperCase()+'='+JSON.stringify(out));
  if(mode==='preflight')fs.appendFileSync(process.env.GITHUB_OUTPUT,'eligible='+(out.status==='ELIGIBLE')+'\nbefore='+(out.before||'')+'\n');
  if(out.status!=='ELIGIBLE')await db.runTransaction(async tx=>{
    const v=await read(tx);assert.ok(v.own.exists);
    console.log('I66_D03_SOURCE_SERIES_VERIFIED rows=11 portfolio=11 amountsChanged=0 pendingCents=563508 directPayments=0');
  },{readOnly:true});
})().catch(e=>{console.error('I66_D03_SERIES_HOLD '+String(e.code||e.message).split('\n')[0].slice(0,80));process.exitCode=1;});
