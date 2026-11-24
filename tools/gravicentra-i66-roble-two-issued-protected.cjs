'use strict';
// Existing I6.6 insurer-source gate and original two renewal identities.
// The remaining 25 obligations use the same CAS with their pinned originals.
// No bypass of gravicentra-live-data-writes, no direct cash payments, no retries across owners.
const assert=require('node:assert/strict'),fs=require('node:fs');
const admin=require('firebase-admin');
const C=require('./gravicentra-i66-roble-two-issued-plan.cjs');
const identityReadback=require('./gravicentra-i66-financial-identity-readback.cjs');
const {sourceAliases}=require('./gravicentra-i66-source-bulk-plan.cjs');
const mode=process.argv[2];
assert.ok(['preflight','apply','readback'].includes(mode),'TWO_MODE_EXPLICIT_REQUIRED');
const identityRequest=mode==='preflight'?require('../artifacts/orbit360-recovery/release-control/I6_6_20261123_PROTECTED_SOURCE_BULK_REFRESH_REQUEST.json').readonlyIdentityReadback:null;
const identityReports=[];
assert.equal(process.env.GITHUB_REPOSITORY,'paulaosoriof86/orbit360-core');
assert.equal(process.env.GITHUB_REF,'refs/heads/recovery/fase-a-clean-20260831');
assert.equal(process.env.GCLOUD_PROJECT,C.project);
if(mode==='apply')assert.equal(process.env.GI_I66_BULK_PROTECTED_ENV,'gravicentra-live-data-writes');
C.check();
const expectedPreimages=mode==='apply'?JSON.parse(Buffer.from(process.env.GI_I66_TWO_EXPECTED_B64||'e30','base64url').toString('utf8')):{};
assert.ok(expectedPreimages&&typeof expectedPreimages==='object'&&!Array.isArray(expectedPreimages));
assert.ok(Object.entries(expectedPreimages).every(([policy,digest])=>C.cases.some(c=>c.policy===policy)&&/^[a-f0-9]{64}$/.test(digest)),
 'SIGNED_PREFLIGHT_SCOPE_INVALID');
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
  tx.get((c.riskFromIssuedOriginal?col('polizas'):col('polizas').where('pais','==','GT')).select('numero','numeroPoliza','polizaNumero','pais','vigenciaInicio','vigenciaFin','clienteId','asesorId','aseguradoraId','renuevaDe','renovadaPor','estado').limit(2500)),
  tx.get(col('vehiculos').select('placa','placaFuente','vin','chasis','chasisFuente','clienteId','polizaId','pais').limit(2000)),
  tx.get(col('asesores').select('activo','pais','paises').limit(400))
 ]);
 assert.ok(clients.size<1000&&insurers.size<100&&policies.size<2500&&vehicles.size<2000&&advisors.size<400,'TWO_INDEX_SCAN_UNBOUNDED');
 const arrays={clientes:clients.docs.map(row),aseguradoras:insurers.docs.map(row),polizas:policies.docs.map(row),
  vehiculos:vehicles.docs.map(row),asesores:advisors.docs.map(row)};
 const check=C.resolve(c,arrays);
 // The diagnostic uses a separate projection and cannot change the matcher,
 // its arrays, preimages, eligibility outputs, or any apply/readback path.
 if(mode==='preflight'&&identityRequest?.enabled===true&&c.policy===identityRequest.riskPolicy){
  try{
  const selected=identityReadback.select(identityRequest,c,check,arrays),snapshots=[];
  for(let offset=0;offset<selected.length;offset+=100){
   const chunk=selected.slice(offset,offset+100);
   snapshots.push(...await tx.getAll(...chunk.map(r=>col(r.collection).doc(r.id))));
  }
  const entries=snapshots.map((s,i)=>({...selected[i],exists:s.exists,data:s.exists?s.data():null,
   updateTime:s.exists?{seconds:s.updateTime.seconds,nanoseconds:s.updateTime.nanoseconds}:null}));
  const diagnostic=identityReadback.report(identityRequest,c,check,arrays,entries,beforeDigest(snapshots));
  identityReports.splice(0,identityReports.length,diagnostic);
  }catch(error){
   identityReports.splice(0,identityReports.length,{schema:'GI_I66_SOURCE_IDENTITY_READBACK_RESULT_V1',
    status:'READONLY_DIAGNOSTIC_HOLD',diagnosticOnly:true,noEligibilityEffect:true,writes:0,
    reason:/^[A-Z0-9_]+$/.test(error.message)?error.message:'PRIVATE_IDENTITY_DIAGNOSTIC_FAILED'});
  }
 }
 // A replay must prove the exact existing operation, not classify its own
 // successor as a new ambiguity. Competing editions/risk references still hold.
 if(check.evidence.holderCount===1&&check.evidence.insurerCount===1&&check.holder&&check.insurer&&
    ['ELIGIBLE_SOURCE_IDENTITY_ONLY','ISSUED_EDITION_ALREADY_EXISTS'].includes(check.status)){
  const operation=C.operationFor(c,check.holder,check.insurer),recorded=await tx.get(audits.doc(operation));
  if(recorded.exists){
   const records=recorded.get('records')||[],policy=records.find(r=>r.collection==='polizas')?.row;
   assert.equal(recorded.get('operation'),operation,'TWO_AUDIT_IDENTITY_CONFLICT');
   assert.equal(recorded.get('status'),'COMMITTED','TWO_AUDIT_NOT_COMMITTED');
   assert.equal(recorded.get('policy'),c.policy,'TWO_AUDIT_POLICY_CONFLICT');
   assert.equal(policy?.id,'pol_'+operation,'TWO_AUDIT_TARGET_CONFLICT');
   if(check.evidence.currentCount!==1)return{result:fail('COMMITTED_EDITION_NOT_UNIQUE',c.policy)};
   if(c.riskFromIssuedOriginal&&(check.riskConflictIds||[]).some(id=>!records.some(r=>r.collection==='vehiculos'&&r.row.id===id)))
    return{result:fail('COMMITTED_RISK_HAS_COMPETING_REFERENCE',c.policy)};
   return{result:{case:c.policy,status:'ALREADY_APPLIED_READBACK_REQUIRED',writes:0,operation}};
  }
 }
 if(check.status!=='ELIGIBLE_SOURCE_IDENTITY_ONLY')
  return{result:{...fail(check.status,c.policy),...(c.riskFromIssuedOriginal?{evidence:check.evidence,original:c.originalProof}:{})}};
 if(mode==='readback')return{result:fail('EXACT_SIGNED_AUDIT_REQUIRED',c.policy)};
 if(mode==='apply'&&!Object.hasOwn(expectedPreimages,c.policy))return{result:fail('NOT_ELIGIBLE_IN_SIGNED_PREFLIGHT',c.policy)};
 const {prior,holder,insurer,vehicle,advisor}=check;
 // Re-read every parent and historical risk used in the identity/duplicate
 // decision. A new issuer-defined risk never overwrites or borrows old fields.
 const preservedVehicleIds=c.riskFromIssuedOriginal?check.preservedVehicleIds:[vehicle.id];
 const preservedPolicies=[...new Set([prior?.id,...preservedVehicleIds.map(id=>arrays.vehiculos.find(v=>v.id===id)?.polizaId)].filter(Boolean))];
 const refsBefore=[...preservedPolicies.map(id=>col('polizas').doc(id)),col('clientes').doc(holder.id),
  col('aseguradoras').doc(insurer.id),col('asesores').doc(advisor.id),...preservedVehicleIds.map(id=>col('vehiculos').doc(id))];
 const snapshots=await tx.getAll(...refsBefore);
 if(snapshots.some(d=>!d.exists))return{result:fail('PREIMAGE_PARENT_MISSING',c.policy)};
 const at=(collection,id)=>snapshots.find(d=>d.ref.path===col(collection).doc(id).path);
 const old=prior?row(at('polizas',prior.id)):null,holderDoc=row(at('clientes',holder.id)),
  insurerDoc=row(at('aseguradoras',insurer.id)),advisorDoc=row(at('asesores',advisor.id));
 const vehicleDoc=c.riskFromIssuedOriginal?c.originalRisk:row(at('vehiculos',vehicle.id));
 if(old&&(old.renovadaPor||old.aseguradoraId!==insurerDoc.id||old.clienteId!==holderDoc.id||old.asesorId!==advisorDoc.id)||
    !c.riskFromIssuedOriginal&&(vehicleDoc.clienteId!==holderDoc.id||vehicleDoc.polizaId!==old.id))
  return{result:fail('PREIMAGE_RELATION_CHANGED',c.policy)};
 const enrolled=C.resolve(c,{...arrays,
  clientes:arrays.clientes.map(h=>h.id===holderDoc.id?holderDoc:h),
  aseguradoras:arrays.aseguradoras.map(i=>i.id===insurerDoc.id?insurerDoc:i),
  asesores:arrays.asesores.map(a=>a.id===advisorDoc.id?advisorDoc:a),
  polizas:arrays.polizas.map(p=>preservedPolicies.includes(p.id)?row(at('polizas',p.id)):p),
  vehiculos:arrays.vehiculos.map(v=>preservedVehicleIds.includes(v.id)?row(at('vehiculos',v.id)):v)});
 if(enrolled.status!=='ELIGIBLE_SOURCE_IDENTITY_ONLY')return{result:fail(enrolled.status,c.policy)};
 const muts=C.mutation(c,{...enrolled,holder:holderDoc,insurer:insurerDoc,vehicle:vehicleDoc,advisor:advisorDoc},
  new Date().toISOString());
 const audit=audits.doc(muts.operation);
 const recorded=await tx.get(audit);
 if(recorded.exists){
  if(recorded.get('operation')!==muts.operation||recorded.get('policy')!==c.policy)
   throw new Error('TWO_AUDIT_IDENTITY_CONFLICT');
  return{result:{case:c.policy,status:'ALREADY_APPLIED_READBACK_REQUIRED',writes:0,operation:muts.operation}};
 }
 const reqs=c.schedule.flatMap(r=>[r.requirement,Number(r.requirement)]);
 assert.ok(reqs.length===c.schedule.length*2&&reqs.length<=30);
 const fields=[...new Set([...sourceAliases,'numeroRecibo','numeroReciboFuente','numeroRequerimiento','requerimiento'])];
 const duplicate=await Promise.all(['recibosEsperados','carteraPrimas','cobros'].flatMap(coll=>
  fields.map(field=>tx.get(col(coll).where(field,'in',reqs).select('polizaId').limit(2)))));
 if(duplicate.some(d=>!d.empty))return{result:fail('ISSUER_REQUIREMENT_ALREADY_USED',c.policy)};
 if(old){
  const clash=await tx.get(col('polizas').where('renuevaDe','==',old.id).limit(2));
  if(!clash.empty)return{result:fail('PREDECESSOR_ALREADY_REFERENCED',c.policy)};
 }
 const refs=muts.creates.map(([k,d])=>col(k).doc(d.id));
 const target=await tx.getAll(...refs);
 if(target.some(d=>d.exists))return{result:fail('CANONICAL_TARGET_ALREADY_EXISTS',c.policy)};
 const sourcePreimage=beforeDigest(snapshots);
 if(mode==='preflight')return{result:{case:c.policy,status:'ELIGIBLE',beforeDigest:sourcePreimage,
   additions:muts.creates.length,updates:old?1:0,auditCreates:1,
   expectedReceipts:c.schedule.length,expectedPortfolio:c.schedule.length,
   pendingGrossCents:c.issuedScheduleGrossCents,realFinancialWrites:0,
   ...(c.riskFromIssuedOriginal?{documentaryRisk:check.evidence,original:c.originalProof}:{})}};
 if(expectedPreimages[c.policy]!==sourcePreimage)throw new Error('TWO_CAS_PREIMAGE_CHANGED_'+c.policy);
 for(let i=0;i<muts.creates.length;i++)tx.create(refs[i],muts.creates[i][1]);
 if(old)tx.update(col('polizas').doc(old.id),muts.previous);
 tx.create(audit,{operation:muts.operation,policy:c.policy,status:'COMMITTED',
  origin:'2026-11-22 Direction I6.6 signed issued original',tenantId:C.tenant,
  sourcePdfSha256:muts.evidence.pdfSha256,
  originalGrossCents:muts.evidence.originalGrossCents,
  pendingGrossCents:muts.evidence.sourceCalendarGrossCents,
  documentedMinorDeltaCents:muts.evidence.documentedMinorDeltaCents,
  oldPolicyId:old?.id||null,beforeDigest:sourcePreimage,previousPatch:muts.previous,
  beforeFields:old?Object.fromEntries(Object.keys(muts.previous).map(k=>[k,{present:Object.hasOwn(old,k),value:old[k]??null}])):{},
  ...(c.riskFromIssuedOriginal?{originalProof:c.originalProof,
    preservedVehicles:preservedVehicleIds.map(id=>({id,row:at('vehiculos',id).data()}))}:{}),
  records:muts.creates.map(([collection,d])=>({collection,row:d})),
  runId:process.env.GITHUB_RUN_ID,createdAt:admin.firestore.FieldValue.serverTimestamp()});
 return{result:{case:c.policy,status:'COMMITTED',writes:muts.creates.length+(old?2:1),
   operation:muts.operation,pendingGrossCents:c.issuedScheduleGrossCents}};
}
async function verify(c,operation){
 return db.runTransaction(async tx=>{
  const audit=tenant.collection('operationalRequests').doc(operation),a=await tx.get(audit);
  assert.ok(a.exists,'TWO_AUDIT_REQUIRED');
  const issued=C.five.cases.find(x=>x.policy===c.policy);
  assert.equal(a.get('operation'),operation);assert.equal(a.get('policy'),c.policy);
  assert.equal(a.get('status'),'COMMITTED','TWO_AUDIT_NOT_COMMITTED');
  assert.equal(a.get('sourcePdfSha256'),issued.sourcePdfRawSha256,'ISSUED_PDF_AUDIT_DRIFT');
  assert.equal(a.get('originalGrossCents'),c.issuerHeader.grossCents);
  assert.equal(a.get('pendingGrossCents'),c.issuedScheduleGrossCents);
  const expected=a.get('records')||[],refs=expected.map(e=>col(e.collection).doc(e.row.id));
  assert.equal(expected.length,c.schedule.length*2+3);
  const fresh=await tx.getAll(...refs);
  assert.ok(fresh.every(d=>d.exists));
  for(let i=0;i<fresh.length;i++)assert.deepEqual(fresh[i].data(),expected[i].row,'TWO_READBACK_POSTIMAGE_'+i);
  const policy=expected.find(e=>e.collection==='polizas').row;
  assert.equal(policy.id,'pol_'+operation);assert.equal(policy.numero,c.policy);
  assert.equal(C.operationFor(c,{id:policy.clienteId},{id:policy.aseguradoraId}),operation);
  assert.equal(policy.vigenciaInicio,c.termStart);assert.equal(policy.vigenciaFin,c.termEnd);
  assert.equal(policy.issuerDocumentSha256,issued.sourcePdfRawSha256);
  assert.equal(policy.documentRef,issued.sourcePdfId);
  assert.ok(policy.documentos.some(d=>d.fileId===issued.sourcePdfId&&d.sha256===issued.sourcePdfRawSha256));
  if(a.get('oldPolicyId')){
   const old=await tx.get(col('polizas').doc(a.get('oldPolicyId')));
   assert.equal(old.get('renovadaPor'),policy.id);assert.equal(policy.renuevaDe,old.id);
  }else{
   assert.equal(policy.renuevaDe,undefined);assert.equal(policy.externalRenewalWithoutCanonicalPredecessor,true);
   assert.equal(policy.issuerOperation,'RENOVACION');
  }
  for(const v of a.get('preservedVehicles')||[]){
   const preserved=await tx.get(col('vehiculos').doc(v.id));
   assert.ok(preserved.exists,'HISTORICAL_RISK_MISSING');assert.deepEqual(preserved.data(),v.row,'HISTORICAL_RISK_CHANGED');
  }
  assert.equal(Math.round(Number(policy.sumaAsegurada)*100),c.issuedInsuredValueCents,'ISSUED_RISK_COVER_READBACK');
  assert.equal(Math.round(Number(policy.primaTotal)*100),c.issuerHeader.grossCents,'ISSUED_GROSS_COVER_READBACK');
  assert.equal(policy.endoso,c.endorsement,'ISSUED_ENDORSEMENT_READBACK');
  const loaded=await Promise.all(['recibosEsperados','carteraPrimas','cobros','vehiculos','actividades'].map(k=>
   tx.get(col(k).where('polizaId','==',policy.id).limit(40))));
  const counts=loaded.map(x=>x.size);
  assert.deepEqual(counts,[c.schedule.length,c.schedule.length,0,1,1]);
  assert.ok(loaded[0].docs.every(d=>d.get('clienteId')===policy.clienteId));
  assert.ok(loaded[1].docs.every(d=>d.get('clienteId')===policy.clienteId));
  for(const r of c.schedule){
   const expectedReceipt=loaded[0].docs.filter(d=>String(d.get('numeroReciboFuente'))===r.requirement);
   assert.equal(expectedReceipt.length,1);assert.equal(expectedReceipt[0].get('fechaVencimientoContractual'),r.due);
   assert.equal(Math.round(expectedReceipt[0].get('primaTotal')*100),r.grossCents);
  }
  const gross=loaded[1].docs.reduce((sum,d)=>sum+Math.round(Number(d.get('primaTotal'))*100),0);
  assert.equal(gross,c.issuedScheduleGrossCents);
  return {case:c.policy,policySuccessor:a.get('oldPolicyId')?1:0,externalRenewal:a.get('oldPolicyId')?0:1,
   receipts:c.schedule.length,portfolio:c.schedule.length,payments:0,
   vehicle:1,activity:1,historicalVehiclesPreserved:(a.get('preservedVehicles')||[]).length,
   auditIdDigest:C.sha(a.id),policyIdDigest:C.sha(policy.id),originalRunId:a.get('runId'),beforeDigest:a.get('beforeDigest'),
   pendingGrossCents:gross,sourceDigest:C.sha(c.policy+'|'+(policy.renuevaDe||'EXTERNAL_RENEWAL_NO_CANONICAL_PREDECESSOR'))};
 },{readOnly:true});
}
(async()=>{
 const results=[],preimages={};
 let headers;
 for(const candidate of C.cases){
  let c=candidate;
  if(c.riskFromIssuedOriginal){
   try{
    if(!headers){const {GoogleAuth}=require('google-auth-library');headers=await(await new GoogleAuth({scopes:['https://www.googleapis.com/auth/drive.readonly']}).getClient()).getRequestHeaders();}
    c=await C.originals.load(c,headers);
   }catch(error){results.push(fail(/^[A-Z0-9_]+$/.test(error.message)?error.message:'ISSUER_ORIGINAL_UNAVAILABLE',c.policy));continue;}
  }
  let result;
  try{
   const out=await db.runTransaction(tx=>scoped(tx,c),mode!=='apply'?{readOnly:true}:undefined);
   result=out.result;
   if(result.status==='ELIGIBLE')preimages[c.policy]=result.beforeDigest;
   if(result.status==='COMMITTED'||result.status==='ALREADY_APPLIED_READBACK_REQUIRED'){
     result.readback=await verify(c,result.operation);
     if(result.status==='ALREADY_APPLIED_READBACK_REQUIRED')result.status='ALREADY_APPLIED_READBACK_PASS';
   }
   results.push(result);
  }catch(error){
   const reason=/^[A-Z0-9_-]+$/.test(error.message)?error.message:'PRIVATE_TRANSACTION_OR_READBACK_HOLD';
   if(result?.status==='COMMITTED')results.push({...result,status:'COMMITTED_READBACK_HOLD',reason});
   else results.push(fail(reason,c.policy));
  }
 }
 const sums={cases:results.length,eligible:results.filter(r=>r.status==='ELIGIBLE').length,
  committed:results.filter(r=>r.status==='COMMITTED').length,alreadyApplied:results.filter(r=>r.status==='ALREADY_APPLIED_READBACK_PASS').length,
  committedWithReadbackHold:results.filter(r=>r.status==='COMMITTED_READBACK_HOLD').length,
  holds:results.filter(r=>r.status==='HOLD'||r.status==='COMMITTED_READBACK_HOLD').length,
  writes:results.reduce((n,r)=>n+(r.writes||0),0)};
 const report={schema:'GI_I66_ROBLE_TWO_24_CAS_'+mode.toUpperCase()+'_V1',mode,
  results:results.map(r=>{const copy={...r};delete copy.operation;return copy;}),totals:sums,
  commercialPaymentsCreated:0,newProductSourceVersion:false,
  ...(identityReports.length?{readonlyIdentityReadbacks:identityReports}:{})};
 console.log('I66_ROBLE_TWO_24_'+mode.toUpperCase()+'='+JSON.stringify(report));
 if(mode==='readback'){
  console.log('I66_TWO_RENEWALS_INDEPENDENT_READBACK='+JSON.stringify({
   status:sums.holds?'READBACK_WITH_ISOLATED_HOLDS':'ALL_ISSUED_CASES_READBACK_PASS',
   cases:results.length,checks:results.filter(r=>r.readback).map(r=>r.readback),
   holds:results.filter(r=>r.status==='HOLD'||r.status==='COMMITTED_READBACK_HOLD'),writes:0}));
  assert.equal(sums.alreadyApplied,C.cases.length,'ALL_ISSUED_AUDITS_NOT_VERIFIED');
 }
 if(mode==='preflight'){
  assert.ok(process.env.GITHUB_OUTPUT);
  fs.appendFileSync(process.env.GITHUB_OUTPUT,
   'eligible='+String(sums.eligible>0)+'\npreimagesB64='+Buffer.from(JSON.stringify(preimages)).toString('base64url')+'\n');
 }
 if(mode==='apply'&&sums.committedWithReadbackHold)throw Error('I66_TWO_COMMITTED_READBACK_INCOMPLETE');
 if(mode==='apply'&&!(sums.committed+sums.alreadyApplied>0))throw Error('I66_TWO_PROTECTED_NOT_APPLIED');
})().catch(e=>{console.error('I66_ROBLE_TWO_24_HOLD '+String(e.code||e.message).replace(/[^A-Za-z0-9_ -]/g,'').slice(0,100));process.exitCode=1;});
