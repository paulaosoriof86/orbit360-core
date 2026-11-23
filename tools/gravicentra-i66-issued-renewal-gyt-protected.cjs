'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const admin=require('firebase-admin');
const plan=require('./gravicentra-i66-issued-renewal-gyt-plan.cjs');
const {sameInsurerPolicyNumber,sourceAliases}=require('./gravicentra-i66-source-bulk-plan.cjs');
const mode=process.argv[2], tenantId='alianzas-soluciones', project='ays-orbit-360-lab';
const {operation,term,sha}=plan;
assert.ok(['preflight','apply','readback'].includes(mode));
assert.equal(process.env.GITHUB_REPOSITORY,'paulaosoriof86/orbit360-core');
assert.equal(process.env.GITHUB_REF,'refs/heads/recovery/fase-a-clean-20260831');
assert.equal(process.env.GCLOUD_PROJECT,project);
assert.ok(!process.env.FIRESTORE_EMULATOR_HOST);
if(mode==='apply')assert.equal(process.env.GI_I66_BULK_PROTECTED_ENV,'gravicentra-live-data-writes');
plan.check();
admin.initializeApp({credential:admin.credential.applicationDefault(),projectId:project});
const db=admin.firestore(), root=db.collection('tenants').doc(tenantId);
const col=name=>root.collection('data').doc(name).collection('items');
const audit=root.collection('operationalRequests').doc(operation);
const hold=reason=>({status:'HOLD',reason,writes:0});
const asRow=d=>({...d.data(),id:d.id});
const platePolicy=p=>[p.numero,p.numeroPoliza,p.polizaNumero].some(n=>sameInsurerPolicyNumber(n,term.policy,term.insurer));
const permittedDoc=d=>d.exists&&(!d.get('tenantId')||d.get('tenantId')===tenantId);
const sameHolder=d=>['nombre','nombreCompleto','razonSocial'].some(k=>plan.matches(d.get(k),term.holderWitness));
const sameInsurer=d=>d.get('activo')!==false&&/G\s*(?:&|Y)\s*T/i.test(String(d.get('nombre')||''));
async function scope(tx){
  const committed=await tx.get(audit);
  if(committed.exists){
    assert.equal(committed.get('operation'),operation); assert.equal(committed.get('pdfSha256'),term.pdfSha256);
    return {status:'PREVIOUS_COMMIT_REQUIRES_READBACK',writes:0};
  }
  const policyIndex=await tx.get(col('polizas').where('pais','==','GT')
    .select('numero','numeroPoliza','polizaNumero','clienteId','aseguradoraId','vigenciaInicio','vigenciaFin','renuevaDe').limit(2500));
  if(policyIndex.size>=2500)return hold('POLICY_INDEX_UNBOUNDED');
  const siblings=policyIndex.docs.filter(d=>platePolicy(asRow(d)));
  const old=siblings.filter(d=>d.get('vigenciaFin')===term.termStart);
  if(old.length!==1)return hold('PRIOR_NUMBER_AND_TERM_NOT_UNIQUE');
  const priorSnap=await tx.get(old[0].ref),p=asRow(priorSnap);
  if(!permittedDoc(priorSnap)||!p.asesorId||!p.clienteId||!p.aseguradoraId||p.renovadaPor||
    /cancelad|anulad|suspend/i.test(String(p.estado)))return hold('PRIOR_NOT_OPEN_FOR_DOCUMENTARY_LINK');
  if(siblings.some(d=>d.get('vigenciaInicio')===term.termStart)||policyIndex.docs.some(d=>
    d.get('renuevaDe')===p.id||d.get('clienteId')===p.clienteId&&d.get('aseguradoraId')===p.aseguradoraId&&
    d.get('vigenciaInicio')===term.termStart&&d.get('vigenciaFin')===term.termEnd))return hold('SUCCESSOR_EXISTS');
  const [holder,insurer,advisor]=await tx.getAll(col('clientes').doc(p.clienteId),
    col('aseguradoras').doc(p.aseguradoraId),col('asesores').doc(p.asesorId));
  if(![holder,insurer,advisor].every(permittedDoc)||holder.get('pais')!=='GT'||insurer.get('pais')!=='GT'||
    !sameHolder(holder)||!sameInsurer(insurer)||advisor.get('activo')===false)return hold('HOLDER_INSURER_OR_ADVISOR_CHANGED');
  const vehicles=await tx.get(col('vehiculos').where('polizaId','==',p.id).limit(3));
  if(vehicles.size!==1)return hold('PRIOR_RISK_NOT_UNIQUE');
  const risk=vehicles.docs[0],v=asRow(risk);
  if(!permittedDoc(risk)||v.clienteId!==holder.id||(p.vehiculoId&&p.vehiculoId!==v.id)||
    (v.pais&&v.pais!=='GT')||!plan.matchRisk(v))return hold('PRIOR_RISK_NO_LONGER_MATCHES');
  // A separate client can own a similarly printed policy number, but no
  // insurer-issued requirement may already be materialized under another ID.
  const numbers=term.issuedSchedule.flatMap(r=>[r.number,Number(r.number)]);
  const used=await Promise.all(['recibosEsperados','carteraPrimas','cobros'].flatMap(collection=>
    [...new Set(sourceAliases.concat('numeroRecibo'))].map(field=>tx.get(col(collection).where(field,'in',numbers).select('polizaId').limit(1)))));
  if(used.some(s=>!s.empty))return hold('ISSUED_REQUIREMENT_ALREADY_MATERIALIZED');
  const stamp=sha(JSON.stringify([priorSnap,holder,insurer,advisor,risk].map(d=>[d.ref.path,d.updateTime.seconds,d.updateTime.nanoseconds])));
  const planned=plan.mutation(p,v,new Date().toISOString()), refs=planned.created.map(([k,d])=>col(k).doc(d.id));
  assert.equal(refs.length,23);
  if((await tx.getAll(...refs)).some(d=>d.exists))return hold('EXACT_TARGET_ALREADY_EXISTS');
  if(mode==='preflight')return {status:'ELIGIBLE',beforeDigest:stamp,creates:23,priorUpdates:1,audit:1,writes:0};
  assert.equal(stamp,process.env.GI_I66_GYT_BEFORE,'GYT_PREIMAGE_CHANGED');
  planned.created.forEach(([,d],i)=>tx.create(refs[i],d));
  tx.update(priorSnap.ref,planned.previous);
  tx.create(audit,{operation,status:'COMMITTED',policy:'AUTO-519815',previous:p.id,pdfSha256:term.pdfSha256,
    beforeDigest:stamp,beforeFields:Object.fromEntries(Object.keys(planned.previous).map(k=>[k,{present:Object.hasOwn(p,k),value:p[k]??null}])),
    expected:planned.created.map(([collection,row])=>({collection,row})),previousPatch:planned.previous,
    runId:process.env.GITHUB_RUN_ID,createdAt:admin.firestore.FieldValue.serverTimestamp()});
  return {status:'COMMITTED_REQUIRES_READBACK',beforeDigest:stamp,writes:25};
}
async function verify(tx){
  const a=await tx.get(audit); assert.equal(a.get('operation'),operation);assert.equal(a.get('status'),'COMMITTED');
  const expected=a.get('expected');assert.equal(expected.length,23);
  const docs=await tx.getAll(...expected.map(e=>col(e.collection).doc(e.row.id)));
  docs.forEach((d,i)=>assert.deepEqual(d.data(),expected[i].row));
  const policy=docs[0].data(),old=await tx.get(col('polizas').doc(a.get('previous')));
  for(const [key,value] of Object.entries(a.get('previousPatch')))assert.deepEqual(old.get(key),value);
  assert.equal(old.get('renovadaPor'),policy.id);assert.equal(policy.renuevaDe,old.id);
  const contents=await Promise.all(['recibosEsperados','carteraPrimas','vehiculos','actividades','cobros'].map(k=>
    tx.get(col(k).where('polizaId','==',policy.id).limit(12))));
  assert.deepEqual(contents.map(x=>x.size),[10,10,1,1,0]);
  const [receipts,portfolio,vehicles]=contents;
  assert.equal(policy.vehiculoId,vehicles.docs[0].id);
  const owed={ESTADO_ASEGURADORA_PENDIENTE:0,CALENDARIO_EMITIDO_FUTURO:0};
  for(const r of receipts.docs){
    const related=portfolio.docs.filter(x=>x.get('reciboId')===r.id);assert.equal(related.length,1);
    assert.equal(r.get('clienteId'),policy.clienteId);assert.equal(r.get('asesorId'),policy.asesorId);
    assert.equal(r.get('primaTotal'),related[0].get('primaTotal'));
    assert.ok(Object.hasOwn(owed,r.get('origenSaldo')));owed[r.get('origenSaldo')]+=Math.round(r.get('primaTotal')*100);
  }
  assert.deepEqual(owed,{ESTADO_ASEGURADORA_PENDIENTE:132948,CALENDARIO_EMITIDO_FUTURO:531789});
  return {originalRunId:a.get('runId'),beforeDigest:a.get('beforeDigest'),auditDigest:sha(a.id),policyDigest:sha(policy.id),
    successors:1,receipts:10,portfolio:10,vehicle:1,activity:1,oldPolicyLinked:true,payments:0,
    contractualGrossCents:664737,statementPendingCents:132948,otherFutureScheduledCents:531789};
}
(async()=>{
  const runVerify=()=>db.runTransaction(verify,{readOnly:true});
  if(mode==='readback'){console.log('I66_GYT_VERIFIED='+JSON.stringify(await runVerify()));return;}
  const result=await db.runTransaction(scope,mode==='preflight'?{readOnly:true}:undefined);
  if(['COMMITTED_REQUIRES_READBACK','PREVIOUS_COMMIT_REQUIRES_READBACK'].includes(result.status))result.readback=await runVerify();
  console.log('I66_GYT_'+mode.toUpperCase()+'='+JSON.stringify(result));
  if(mode==='preflight')fs.appendFileSync(process.env.GITHUB_OUTPUT,'eligible='+(result.status==='ELIGIBLE')+'\nbefore='+String(result.beforeDigest||'')+'\n');
  if(mode==='apply'&&!result.readback)throw Error('ISSUED_CAS_HELD');
})().catch(e=>{console.error('I66_GYT_FAILED '+String(e.code||e.message).split('\n')[0].replace(/[^A-Za-z0-9_ -]/g,'').slice(0,100));process.exitCode=1;});
