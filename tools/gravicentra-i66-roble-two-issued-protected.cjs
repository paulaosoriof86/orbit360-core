'use strict';
// Existing I6.6 insurer-source gate, EXACT two previously documented renewals.
// No bypass of gravicentra-live-data-writes, no direct cash payments, no retries across owners.
const assert=require('node:assert/strict'),fs=require('node:fs');
const admin=require('firebase-admin');
const C=require('./gravicentra-i66-roble-two-issued-plan.cjs');
const {sourceAliases}=require('./gravicentra-i66-source-bulk-plan.cjs');
const mode=process.argv[2];
assert.ok(['preflight','apply'].includes(mode),'TWO_MODE_EXPLICIT_REQUIRED');
assert.equal(process.env.GITHUB_REPOSITORY,'paulaosoriof86/orbit360-core');
assert.equal(process.env.GITHUB_REF,'refs/heads/recovery/fase-a-clean-20260831');
assert.equal(process.env.GCLOUD_PROJECT,C.project);
if(mode==='apply')assert.equal(process.env.GI_I66_BULK_PROTECTED_ENV,'gravicentra-live-data-writes');
C.check();
admin.initializeApp({credential:admin.credential.applicationDefault(),projectId:C.project});
const db=admin.firestore(),tenant=db.collection('tenants').doc(C.tenant),col=n=>tenant.collection('data').doc(n).collection('items');
const row=d=>({...d.data(),id:d.id});
const fail=(why,caseId)=>({case:caseId,status:'HOLD',reason:why,writes:0});
function beforeDigest(snaps){
 return C.sha(JSON.stringify(snaps.filter(s=>s.exists).map(s=>[s.ref.path,s.updateTime.seconds,s.updateTime.nanoseconds].join('|')).sort()));
}
async function scoped(tx,c){
 const audits=tenant.collection('operationalRequests');
 const [clients,insurers,policies,vehicles,advisors]=await Promise.all([
  tx.get(col('clientes').where('pais','==','GT').select('nombre','nombreCompleto','razonSocial','pais','asesorId').limit(1000)),
  tx.get(col('aseguradoras').where('pais','==','GT').select('nombre','activo','pais').limit(100)),
  tx.get(col('polizas').where('pais','==','GT').select('numero','numeroPoliza','polizaNumero','pais','vigenciaInicio','vigenciaFin','clienteId','asesorId','aseguradoraId','renuevaDe','renovadaPor','estado').limit(2500)),
  tx.get(col('vehiculos').select('placa','placaFuente','vin','chasis','chasisFuente','clienteId','polizaId','pais').limit(2000)),
  tx.get(col('asesores').select('activo','pais','paises').limit(400))
 ]);
 assert.ok(clients.size<1000&&insurers.size<100&&policies.size<2500&&vehicles.size<2000&&advisors.size<400,'TWO_INDEX_SCAN_UNBOUNDED');
 const arrays={clientes:clients.docs.map(row),aseguradoras:insurers.docs.map(row),polizas:policies.docs.map(row),
  vehiculos:vehicles.docs.map(row),asesores:advisors.docs.map(row)};
 const check=C.resolve(c,arrays);
 if(check.status!=='ELIGIBLE_SOURCE_IDENTITY_ONLY')
  return{result:fail(check.status,c.policy)};
 const {prior,holder,insurer,vehicle,advisor}=check;
 // Existing physical document details are needed in the next immutable post-image.
 const snapshots=await tx.getAll(col('polizas').doc(prior.id),col('clientes').doc(holder.id),
  col('aseguradoras').doc(insurer.id),col('asesores').doc(advisor.id),col('vehiculos').doc(vehicle.id));
 if(snapshots.some(d=>!d.exists))return{result:fail('PREIMAGE_PARENT_MISSING',c.policy)};
 const [oldSnap,holderSnap,insurerSnap,advisorSnap,vehicleSnap]=snapshots;
 const old=row(oldSnap),holderDoc=row(holderSnap),insurerDoc=row(insurerSnap),vehicleDoc=row(vehicleSnap);
 if(old.renovadaPor||old.aseguradoraId!==insurerDoc.id||old.clienteId!==holderDoc.id||
    old.asesorId!==advisorSnap.id||vehicleDoc.clienteId!==holderDoc.id||
    vehicleDoc.polizaId!==old.id)
  return{result:fail('PREIMAGE_RELATION_CHANGED',c.policy)};
 const enrolled=C.resolve(c,{...arrays,
  polizas:arrays.polizas.map(p=>p.id===old.id?old:p),
  vehiculos:arrays.vehiculos.map(v=>v.id===vehicleDoc.id?vehicleDoc:v)});
 if(enrolled.status!=='ELIGIBLE_SOURCE_IDENTITY_ONLY')return{result:fail(enrolled.status,c.policy)};
 const muts=C.mutation(c,{...enrolled,holder:holderDoc,insurer:insurerDoc,vehicle:vehicleDoc,advisor:row(advisorSnap)},
  new Date().toISOString());
 const audit=audits.doc(muts.operation);
 const recorded=await tx.get(audit);
 if(recorded.exists){
  if(recorded.get('operation')!==muts.operation||recorded.get('policy')!==c.policy)
   throw new Error('TWO_AUDIT_IDENTITY_CONFLICT');
  return{result:{case:c.policy,status:'ALREADY_APPLIED_READBACK_REQUIRED',writes:0,operation:muts.operation}};
 }
 const reqs=c.schedule.flatMap(r=>[r.requirement,Number(r.requirement)]);
 assert.ok(reqs.length===24);
 const fields=[...new Set([...sourceAliases,'numeroRecibo','numeroReciboFuente','numeroRequerimiento','requerimiento'])];
 const duplicate=await Promise.all(['recibosEsperados','carteraPrimas','cobros'].flatMap(coll=>
  fields.map(field=>tx.get(col(coll).where(field,'in',reqs).select('polizaId').limit(2)))));
 if(duplicate.some(d=>!d.empty))return{result:fail('ISSUER_REQUIREMENT_ALREADY_USED',c.policy)};
 const clash=await tx.get(col('polizas').where('renuevaDe','==',old.id).limit(2));
 if(!clash.empty)return{result:fail('PREDECESSOR_ALREADY_REFERENCED',c.policy)};
 const refs=muts.creates.map(([k,d])=>col(k).doc(d.id));
 const target=await tx.getAll(...refs);
 if(target.some(d=>d.exists))return{result:fail('CANONICAL_TARGET_ALREADY_EXISTS',c.policy)};
 const sourcePreimage=beforeDigest(snapshots);
 if(mode==='preflight')return{result:{case:c.policy,status:'ELIGIBLE',beforeDigest:sourcePreimage,
   additions:muts.creates.length,updates:1,auditCreates:1,
   expectedReceipts:12,expectedPortfolio:12,pendingGrossCents:c.issuedScheduleGrossCents,realFinancialWrites:0}};
 const expected=JSON.parse(Buffer.from(process.env.GI_I66_TWO_EXPECTED_B64||'','base64url').toString('utf8'));
 if(expected[c.policy]!==sourcePreimage)throw new Error('TWO_CAS_PREIMAGE_CHANGED_'+c.policy);
 for(let i=0;i<muts.creates.length;i++)tx.create(refs[i],muts.creates[i][1]);
 tx.update(col('polizas').doc(old.id),muts.previous);
 tx.create(audit,{operation:muts.operation,policy:c.policy,status:'COMMITTED',
  origin:'2026-11-22 Direction I6.6 signed issued original',tenantId:C.tenant,
  sourcePdfSha256:muts.evidence.pdfSha256,
  originalGrossCents:muts.evidence.originalGrossCents,
  pendingGrossCents:muts.evidence.sourceCalendarGrossCents,
  documentedMinorDeltaCents:muts.evidence.documentedMinorDeltaCents,
  oldPolicyId:old.id,beforeDigest:sourcePreimage,previousPatch:muts.previous,
  beforeFields:Object.fromEntries(Object.keys(muts.previous).map(k=>[k,{present:Object.hasOwn(old,k),value:old[k]??null}])),
  records:muts.creates.map(([collection,d])=>({collection,row:d})),
  runId:process.env.GITHUB_RUN_ID,createdAt:admin.firestore.FieldValue.serverTimestamp()});
 return{result:{case:c.policy,status:'COMMITTED',writes:muts.creates.length+2,
   operation:muts.operation,pendingGrossCents:c.issuedScheduleGrossCents}};
}
async function verify(c,operation){
 return db.runTransaction(async tx=>{
  const audit=tenant.collection('operationalRequests').doc(operation),a=await tx.get(audit);
  assert.ok(a.exists,'TWO_AUDIT_REQUIRED');
  const expected=a.get('records')||[],refs=expected.map(e=>col(e.collection).doc(e.row.id));
  assert.equal(expected.length,27);
  const fresh=await tx.getAll(...refs);
  assert.ok(fresh.every(d=>d.exists));
  for(let i=0;i<fresh.length;i++)assert.deepEqual(fresh[i].data(),expected[i].row,'TWO_READBACK_POSTIMAGE_'+i);
  const policy=expected.find(e=>e.collection==='polizas').row;
  const old=await tx.get(col('polizas').doc(a.get('oldPolicyId')));
  assert.equal(old.get('renovadaPor'),policy.id);
  assert.equal(policy.renuevaDe,old.id);
  assert.equal(Math.round(Number(policy.sumaAsegurada)*100),c.issuedInsuredValueCents,'ISSUED_RISK_COVER_READBACK');
  assert.equal(Math.round(Number(policy.primaTotal)*100),c.issuerHeader.grossCents,'ISSUED_GROSS_COVER_READBACK');
  assert.equal(policy.endoso,c.endorsement,'ISSUED_ENDORSEMENT_READBACK');
  const loaded=await Promise.all(['recibosEsperados','carteraPrimas','cobros','vehiculos','actividades'].map(k=>
   tx.get(col(k).where('polizaId','==',policy.id).limit(40))));
  const counts=loaded.map(x=>x.size);
  assert.deepEqual(counts,[12,12,0,1,1]);
  assert.ok(loaded[0].docs.every(d=>d.get('clienteId')===policy.clienteId));
  assert.ok(loaded[1].docs.every(d=>d.get('clienteId')===policy.clienteId));
  const gross=loaded[1].docs.reduce((sum,d)=>sum+Math.round(Number(d.get('primaTotal'))*100),0);
  assert.equal(gross,c.issuedScheduleGrossCents);
  return {case:c.policy,policySuccessor:1,receipts:12,portfolio:12,payments:0,
   vehicle:1,activity:1,pendingGrossCents:gross,sourceDigest:C.sha(c.policy+'|'+policy.renuevaDe)};
 },{readOnly:true});
}
(async()=>{
 const results=[],preimages={};
 for(const c of C.source.cases){
  const out=await db.runTransaction(tx=>scoped(tx,c),mode==='preflight'?{readOnly:true}:undefined);
  const result=out.result;
  if(result.status==='ELIGIBLE')preimages[c.policy]=result.beforeDigest;
  if(mode==='apply'&&(result.status==='COMMITTED'||result.status==='ALREADY_APPLIED_READBACK_REQUIRED')){
    result.readback=await verify(c,result.operation);
  }
  results.push(result);
 }
 const sums={cases:results.length,eligible:results.filter(r=>r.status==='ELIGIBLE').length,
  committed:results.filter(r=>r.status==='COMMITTED').length,alreadyApplied:results.filter(r=>r.status==='ALREADY_APPLIED_READBACK_REQUIRED').length,
  holds:results.filter(r=>r.status==='HOLD').length,
  writes:results.reduce((n,r)=>n+(r.writes||0),0)};
 const report={schema:'GI_I66_ROBLE_TWO_24_CAS_'+mode.toUpperCase()+'_V1',mode,
  results:results.map(r=>{const copy={...r};delete copy.operation;return copy;}),totals:sums,
  commercialPaymentsCreated:0,newProductSourceVersion:false};
 console.log('I66_ROBLE_TWO_24_'+mode.toUpperCase()+'='+JSON.stringify(report));
 if(mode==='preflight'){
  assert.ok(process.env.GITHUB_OUTPUT);
  fs.appendFileSync(process.env.GITHUB_OUTPUT,
   'eligible='+String(sums.eligible>0)+'\npreimagesB64='+Buffer.from(JSON.stringify(preimages)).toString('base64url')+'\n');
 }
 if(mode==='apply'&&!(sums.committed+sums.alreadyApplied>0))throw Error('I66_TWO_PROTECTED_NOT_APPLIED');
})().catch(e=>{console.error('I66_ROBLE_TWO_24_HOLD '+String(e.code||e.message).replace(/[^A-Za-z0-9_ -]/g,'').slice(0,100));process.exitCode=1;});
