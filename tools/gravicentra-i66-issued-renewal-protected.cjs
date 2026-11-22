'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const firebase=require('firebase-admin');
const C=require('./gravicentra-i66-issued-renewal-cas.cjs');
const {sourceAliases}=require('./gravicentra-i66-source-bulk-plan.cjs');
const mode=process.argv[2];
assert.ok(['preflight','apply'].includes(mode));
assert.equal(process.env.GITHUB_REPOSITORY,'paulaosoriof86/orbit360-core');
assert.equal(process.env.GITHUB_REF,'refs/heads/recovery/fase-a-clean-20260831');
assert.equal(process.env.GCLOUD_PROJECT,C.projectId);
if(mode==='apply')assert.equal(process.env.GI_I66_BULK_PROTECTED_ENV,'gravicentra-live-data-writes');
C.checkSources();
firebase.initializeApp({credential:firebase.credential.applicationDefault(),projectId:C.projectId});
const db=firebase.firestore(), tenant=db.collection('tenants').doc(C.tenantId);
const collection=k=>tenant.collection('data').doc(k).collection('items');
const auditRef=tenant.collection('operationalRequests').doc(C.operation);
const id='pol_'+C.operation, receiptId='cob_'+id+'_001';
const refs=[['polizas',id],['recibosEsperados',receiptId],['carteraPrimas','car_'+receiptId],
  ['vehiculos','veh_'+C.operation],['actividades','act_'+C.operation]].map(([k,id])=>collection(k).doc(id));
const rows=s=>s.docs.map(d=>({...d.data(),id:d.id}));
const fingerprint = snapshots => C.sha(JSON.stringify([...new Set(snapshots.filter(d=>d.exists)
  .map(d=>[d.ref.path,d.updateTime.seconds,d.updateTime.nanoseconds].join('|')))].sort()));
const stop=code=>({status:'HOLD',reason:code,writes:0});
async function readAndMaybeApply(tx) {
  const audit=await tx.get(auditRef);
  if(audit.exists){
    assert.equal(audit.get('operation'),C.operation);
    assert.equal(audit.get('decision'),'D02');
    return {status:'ALREADY_APPLIED_VERIFY_REQUIRED',writes:0};
  }
  const [clients,insurers,policyIndex]=await Promise.all([
    tx.get(collection('clientes').where('pais','==','GT').select('nombre','nombreCompleto','razonSocial').limit(1000)),
    tx.get(collection('aseguradoras').where('pais','==','GT').select('nombre','activo').limit(100)),
    tx.get(collection('polizas').where('pais','==','GT').select('numero','numeroPoliza','polizaNumero','clienteId','aseguradoraId','vigenciaInicio','vigenciaFin','renuevaDe').limit(2300))]);
  if(clients.size>=1000||insurers.size>=100||policyIndex.size>=2300)return stop('BOUNDED_INDEX_TRUNCATED');
  const holders=rows(clients).filter(c=>[c.nombre,c.nombreCompleto,c.razonSocial].some(n=>C.match(n,'holderWitness')));
  const insurersFound=rows(insurers).filter(a=>a.activo!==false&&/roble/i.test(a.nombre||''));
  if(holders.length!==1||insurersFound.length!==1)return stop('HOLDER_OR_INSURER_NOT_UNIQUE');
  const normalize=x=>String(x||'').replace(/[^A-Za-z0-9]/g,'').toUpperCase();
  const policies=rows(policyIndex).filter(p=>[p.numero,p.numeroPoliza,p.polizaNumero].some(n=>normalize(n)===normalize(C.term.policy)));
  if(policies.some(p=>p.vigenciaInicio===C.term.vigenciaInicio))return stop('ISSUED_EDITION_ALREADY_PRESENT_RECONCILE_EXISTING');
  const prior=policies.filter(p=>p.clienteId===holders[0].id&&p.aseguradoraId===insurersFound[0].id&&p.vigenciaFin===C.term.vigenciaInicio);
  if(prior.length!==1)return stop('PREDECESSOR_NOT_UNIQUE');
  const preRef=collection('polizas').doc(prior[0].id);
  const [oldSnap,riskSnap,targets,holder,insurer]=await Promise.all([
    tx.get(preRef),tx.get(collection('vehiculos').where('polizaId','==',preRef.id).limit(30)),tx.getAll(...refs),
    tx.get(collection('clientes').doc(holders[0].id)),tx.get(collection('aseguradoras').doc(insurersFound[0].id))]);
  const old={...oldSnap.data(),id:oldSnap.id};
  if(!old.asesorId||riskSnap.size>=30)return stop('RISK_OR_ADVISOR_MISSING');
  const adviser=await tx.get(collection('asesores').doc(old.asesorId));
  const possible=await Promise.all(['recibosEsperados','carteraPrimas','cobros'].flatMap(k=>
    [...new Set([...sourceAliases,'numeroRecibo'])].map(field=>tx.get(collection(k)
    .where(field,'in',[C.term.issuedRequirement,Number(C.term.issuedRequirement)]).select('polizaId','reciboId').limit(2)))));
  const risk=rows(riskSnap);
  const decision=C.assess({holders,insurers:insurersFound,policies:policies.map(p=>p.id===old.id?old:p),risk,
    advisors:adviser.exists?[{...adviser.data(),id:adviser.id}]:[],requirementAlreadyUsed:possible.some(s=>!s.empty),
    occupied:targets.some(d=>d.exists),priorObligations:rows(policyIndex).some(p=>p.renuevaDe===preRef.id)});
  const stamp=fingerprint([oldSnap,holder,insurer,adviser,...riskSnap.docs]);
  if(decision!=='ELIGIBLE')return stop(decision);
  const projected=C.mutations(old,holders[0],insurersFound[0],risk[0],new Date().toISOString());
  if(mode==='preflight')return {status:'ELIGIBLE',beforeDigest:stamp,adds:5,updates:1,auditCreates:1,pendingGrossCents:306320,writes:0};
  assert.equal(stamp,process.env.I66_D02_EXPECTED_BEFORE,'ISSUED_SOURCE_CHANGED_SINCE_PREFLIGHT');
  for(const [i,[k,record]] of projected.creates.entries()){
    assert.equal(collection(k).doc(record.id).path,refs[i].path);
    tx.create(refs[i],record);
  }
  tx.update(preRef,projected.previous);
  tx.create(auditRef,{operation:C.operation,decision:'D02',status:'COMMITTED',source:C.term.issuerDocumentId,
    ...projected.evidence,previousPolicyId:old.id,beforeDigest:stamp,
    beforeFields:Object.fromEntries(Object.keys(projected.previous).map(k=>[k,{present:Object.hasOwn(old,k),value:old[k]??null}])),
    actor:'Proceso documental autorizado por Dirección',runId:process.env.GITHUB_RUN_ID,
    references:refs.map(r=>r.path),expectedPostimages:projected.creates.map(([,r])=>r),expectedPredecessorPatch:projected.previous,
    createdAt:firebase.firestore.FieldValue.serverTimestamp()});
  return {status:'COMMITTED_REQUIRES_READBACK',writes:7};
}
async function verify() {
  const result=await db.runTransaction(async tx=>{
    const [a,...target]=await tx.getAll(auditRef,...refs);assert.ok(a.exists&&target.every(d=>d.exists));
    const p=target[0].data(),r=target[1].data(),c=target[2].data(),v=target[3].data(),act=target[4].data();
    const pred=await tx.get(collection('polizas').doc(a.get('previousPolicyId')));
    assert.deepEqual(target.map(d=>d.data()),a.get('expectedPostimages'));
    for(const [key,value] of Object.entries(a.get('expectedPredecessorPatch')))assert.deepEqual(pred.get(key),value);
    assert.equal(pred.get('renovadaPor'),p.id);assert.equal(p.renuevaDe,pred.id);
    for(const row of [r,c,v,act]){assert.equal(row.polizaId,p.id);assert.equal(row.clienteId,p.clienteId);assert.equal(row.asesorId,p.asesorId);}
    assert.equal(c.reciboId,r.id);assert.equal(r.numeroReciboFuente,C.term.issuedRequirement);
    const [payments,receipts,portfolio]=await Promise.all(['cobros','recibosEsperados','carteraPrimas'].map(k=>tx.get(collection(k).where('polizaId','==',p.id).limit(4))));
    assert.equal(receipts.size,1);assert.equal(portfolio.size,1);assert.equal(payments.size,0);
    assert.equal(Math.round(c.montoTotal*100),306320);assert.equal(c.carteraActiva,true);
    return {persistedEdition:1,linkedPredecessor:1,linkedVehicle:1,clientActivities:1,expectedReceipts:1,portfolio:1,
      pendingGrossCents:306320,payments:0,receiptIdDigest:C.sha(r.id),successorIdDigest:C.sha(p.id),auditIdDigest:C.sha(a.id)};
  },{readOnly:true});
  console.log('I66_DOCUMENTARY_RENEWAL_SERVER_READBACK='+JSON.stringify(result));
}
(async()=>{
  const out=await db.runTransaction(readAndMaybeApply,mode==='preflight'?{readOnly:true}:undefined);
  console.log('I66_DOCUMENTARY_RENEWAL_'+mode.toUpperCase()+'='+JSON.stringify(out));
  if(mode==='preflight'){assert.ok(process.env.GITHUB_OUTPUT);fs.appendFileSync(process.env.GITHUB_OUTPUT,
    'eligible='+(out.status==='ELIGIBLE')+'\nbefore='+String(out.beforeDigest||'')+'\n');}
  if(out.status.includes('COMMITTED')||out.status.startsWith('ALREADY_APPLIED'))await verify();
  if(mode==='apply')assert.ok(out.status.includes('COMMITTED')||out.status.startsWith('ALREADY_APPLIED'),'D02_PROTECTED_APPLY_HELD');
})().catch(e=>{console.error('I66_DOCUMENTARY_HOLD '+String(e.code||e.message).split('\n')[0].replace(/[^\w -]/g,'').slice(0,100));process.exitCode=1;});
