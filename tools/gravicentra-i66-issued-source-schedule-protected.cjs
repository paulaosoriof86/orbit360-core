'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {GoogleAuth}=require('google-auth-library');
const admin=require('firebase-admin');
const C=require('./gravicentra-i66-issued-source-schedules.cjs');
const {sourceAliases}=require('./gravicentra-i66-source-bulk-plan.cjs');
const [mode,code]=process.argv.slice(2);
const s=C.scope(code),tid='alianzas-soluciones',project='ays-orbit-360-lab';
assert.equal(process.env.GITHUB_REPOSITORY,'paulaosoriof86/orbit360-core');
assert.equal(process.env.GITHUB_REF,'refs/heads/recovery/fase-a-clean-20260831');
assert.equal(process.env.GCLOUD_PROJECT,project);assert.ok(['preflight','apply'].includes(mode));
if(mode==='apply')assert.equal(process.env.GI_I66_BULK_PROTECTED_ENV,'gravicentra-live-data-writes');
require('./gravicentra-i66-issued-renewal-cas.cjs').checkSources(); // same pinned signed Direction addendum
admin.initializeApp({credential:admin.credential.applicationDefault(),projectId:project});
const db=admin.firestore(),tenant=db.collection('tenants').doc(tid),col=k=>tenant.collection('data').doc(k).collection('items');
const audit=tenant.collection('operationalRequests').doc(s.op),data=d=>({...d.data(),id:d.id});
const stop=reason=>({status:'HOLD',reason,writes:0});
async function derive(tx,original){
  const a=await tx.get(audit);
  if(a.exists){assert.equal(a.get('operation'),s.op);return {status:'ALREADY_APPLIED',writes:0};}
  if(original.status!=='VERIFIED')return stop(original.status);
  const indexes=await Promise.all([['clientes',1000,['nombre','nombreCompleto','razonSocial','asesorId']],['aseguradoras',100,['nombre','activo']],
    ['polizas',2300,['numero','numeroPoliza','polizaNumero','clienteId','aseguradoraId','vigenciaInicio','vigenciaFin','renuevaDe','renovadaPor']],
    ['vehiculos',2000,['placa','placaFuente','vin','chasis','chasisFuente','clienteId','polizaId']]].map(async ([k,limit,fields])=>{
      const q=k==='vehiculos'?col(k):col(k).where('pais','==','GT');
      const snap=await tx.get(q.select(...fields).limit(limit));assert.ok(snap.size<limit,'DOCUMENTARY_INDEX_LIMIT');return snap.docs.map(data);
  }));
  const [cs,as,ps,vs]=indexes;
  const holders=cs.filter(c=>[c.nombre,c.nombreCompleto,c.razonSocial].some(v=>C.matches(s,v,'holderWitness')));
  const insurers=as.filter(a=>a.activo!==false&&/roble/i.test(a.nombre||''));
  if(holders.length!==1||insurers.length!==1)return stop('HOLDER_OR_INSURER_NOT_UNIQUE');
  const client=holders[0],insurer=insurers[0];
  const related=ps.filter(p=>[p.numero,p.numeroPoliza,p.polizaNumero].some(v=>C.norm(v)===C.norm(s.term.policy)));
  if(related.some(p=>p.vigenciaInicio===s.term.vigenciaInicio||p.vigenciaFin===s.term.vigenciaFin))return stop('CURRENT_EDITION_EXISTS_RECONCILE_INDIVIDUALLY');
  const predecessors=related.filter(p=>p.clienteId===client.id&&p.aseguradoraId===insurer.id&&p.vigenciaFin===s.term.vigenciaInicio);
  if(code==='D01'&&related.length||code==='D03'&&(predecessors.length!==1||related.some(p=>!p.vigenciaFin||p.vigenciaFin>s.term.vigenciaInicio)))return stop('PREDECESSOR_OR_EDITION_DRIFT');
  const historical=predecessors[0];let prior;
  const docs=[await tx.get(col('clientes').doc(client.id)),await tx.get(col('aseguradoras').doc(insurer.id))];
  if(historical){
    const d=await tx.get(col('polizas').doc(historical.id));prior=data(d);docs.push(d);
    if(prior.renovadaPor||ps.some(p=>p.renuevaDe===prior.id)||/cancelad|anulad/i.test(prior.estado||''))return stop('COMPETING_SUCCESSOR_OR_CANCELLATION');
  }
  const advisorId=prior?.asesorId||client.asesorId;
  if(!advisorId)return stop('ADVISOR_MISSING');
  const adv=await tx.get(col('asesores').doc(advisorId));docs.push(adv);if(!adv.exists||adv.get('activo')===false)return stop('ADVISOR_INACTIVE');
  const risks=vs.filter(v=>[v.placa,v.placaFuente].some(n=>C.matches(s,n,'plateWitness'))||[v.chasis,v.chasisFuente,v.vin].some(n=>C.matches(s,n,'vinWitness')));
  if(risks.some(v=>v.clienteId!==client.id || !prior || v.polizaId!==prior.id))return stop('RISK_REQUIRES_CROSSWALK');
  const nums=[...new Set([...s.rows.map(r=>r.requirement),...s.w.schedule.map(r=>r.requirement)])];
  const vals=nums.concat(nums.map(Number));assert.ok(vals.length<=30);
  const dup=await Promise.all(['recibosEsperados','carteraPrimas','cobros'].flatMap(k=>
    [...new Set([...sourceAliases,'numeroRecibo'])].map(field=>tx.get(col(k).where(field,'in',vals).select('polizaId').limit(2)))));
  if(dup.some(d=>!d.empty))return stop('EXISTING_SOURCE_REQUIREMENT_OR_PAYMENT');
  const evidence=await Promise.all(['cancelaciones','cobros','recibosEsperados','carteraPrimas'].map(k=>
    tx.get(col(k).where('clienteId','==',client.id).limit(400))));
  if(evidence.some(x=>x.size>=400))return stop('CLIENT_FINANCIAL_INDEX_LIMIT');
  const conflicting=evidence.some(snap=>snap.docs.some(d=>{
    const r=d.data();return [r.numeroPoliza,r.polizaNumero,r.poliza].some(v=>C.norm(v)===C.norm(s.term.policy))&&
      [r.fechaPago,r.fechaAplicacionAseguradora,r.vigenciaInicio,r.fechaCancelacion].some(v=>typeof v==='string'&&v>=s.term.vigenciaInicio);
  }));
  if(conflicting)return stop('SOURCE_CONTRADICTED_BY_EXISTING_FINANCIAL_RECORD');
  const plan=C.plan(s,{client,insurer,advisor:data(adv),prior},original,new Date().toISOString());
  const refs=plan.creates.map(([k,r])=>col(k).doc(r.id));const exists=await tx.getAll(...refs);
  if(exists.some(d=>d.exists))return stop('TARGET_ALREADY_EXISTS');
  const before=C.sha(JSON.stringify(docs.map(d=>[d.ref.path,d.updateTime.seconds,d.updateTime.nanoseconds]).sort()));
  if(mode==='preflight')return {status:'ELIGIBLE',before,case:code,creates:refs.length,updates:prior?1:0,pendingGrossCents:plan.pending,inferredGrossCents:plan.inferred,writes:0};
  assert.equal(before,process.env.I66_EXPECTED_BEFORE,'DOCUMENTARY_SOURCE_CHANGED_SINCE_PREFLIGHT');
  plan.creates.forEach(([,r],i)=>tx.create(refs[i],r));
  if(prior)tx.update(col('polizas').doc(prior.id),plan.patch);
  tx.create(audit,{operation:s.op,decision:code,runId:process.env.GITHUB_RUN_ID,status:'COMMITTED',before,
    proof:plan.facts,previousPolicyId:prior?.id||null,beforeFields:prior?Object.fromEntries(Object.keys(plan.patch).map(k=>[k,{present:Object.hasOwn(prior,k),value:prior[k]??null}])):{},
    expectedPriorPatch:plan.patch,records:plan.creates.map(([k,row])=>({collection:k,row})),createdAt:admin.firestore.FieldValue.serverTimestamp()});
  return {status:'COMMITTED',writes:refs.length+(prior?2:1)};
}
async function verify(){
  return db.runTransaction(async tx=>{
    const receipt=await tx.get(audit);assert.equal(receipt.get('operation'),s.op);
    const records=receipt.get('records'),refs=records.map(x=>col(x.collection).doc(x.row.id)),actual=await tx.getAll(...refs);
    const amendment=code==='D03'?await tx.get(tenant.collection('operationalRequests').doc(s.op+'_source_series_v2')):null;
    actual.forEach((d,i)=>{
      const expected={...records[i].row};
      if(amendment?.exists&&['recibosEsperados','carteraPrimas'].includes(records[i].collection)){
        assert.equal(amendment.get('priorOperation'),s.op);expected.cuota='';delete expected.numeroCuota;
        Object.assign(expected,{posicionEstadoCuenta:expected.secuencia,numeroCuotaFuente:'NO_INFORMADO',cantidadPendientesEstadoCuenta:11});
      }
      assert.deepEqual(d.data(),expected);
    });
    const policy=records.find(x=>x.collection==='polizas').row;
    const quantities={};
    for(const k of ['recibosEsperados','carteraPrimas','cobros','vehiculos','actividades']){
      const found=await tx.get(col(k).where('polizaId','==',policy.id).limit(40));
      assert.equal(found.size,records.filter(x=>x.collection===k).length);quantities[k]=found.size;
      for(const d of found.docs)assert.equal(d.get('clienteId'),policy.clienteId);
    }
    const expected=records.filter(r=>r.collection==='recibosEsperados').map(r=>r.row);
    const balances=records.filter(r=>r.collection==='carteraPrimas').map(r=>r.row);
    assert.ok(balances.every(c=>expected.some(r=>r.id===c.reciboId&&r.carteraActiva&&r.numeroReciboFuente===c.numeroReciboFuente)));
    const pending=balances.reduce((a,r)=>a+Math.round(100*r.primaTotal),0);
    const inferred=records.filter(r=>r.collection==='cobros').map(r=>r.row);
    assert.ok(inferred.every(r=>r.inferredPaid&&!r.confirmado&&!r.conciliado&&expected.some(e=>e.inferredPaid&&e.id===r.reciboId)));
    assert.equal(pending,code==='D01'?334370:563508);assert.equal(inferred.length,code==='D01'?2:0);
    if(policy.renuevaDe){
      const prior=await tx.get(col('polizas').doc(policy.renuevaDe));
      for(const [k,v] of Object.entries(receipt.get('expectedPriorPatch')))assert.deepEqual(prior.get(k),v);
    }
    return {case:code,policy:1,quantities,pendingGrossCents:pending,inferredGrossCents:inferred.reduce((a,r)=>a+Math.round(r.monto*100),0),
      directPayments:0,contractGrossCents:Math.round(policy.primaTotal*100),auditIdDigest:C.sha(audit.id),policyIdDigest:C.sha(policy.id)};
  },{readOnly:true});
}
(async()=>{
  const auth=await new GoogleAuth({scopes:['https://www.googleapis.com/auth/drive.readonly']}).getClient();
  const original=await C.originalRisk(s,await auth.getRequestHeaders());
  const out=await db.runTransaction(tx=>derive(tx,original),mode==='preflight'?{readOnly:true}:undefined);
  console.log('I66_DOCUMENTARY_'+code+'_'+mode.toUpperCase()+'='+JSON.stringify(out));
  if(mode==='preflight')fs.appendFileSync(process.env.GITHUB_OUTPUT,'eligible='+(out.status==='ELIGIBLE')+'\nbefore='+(out.before||'')+'\n');
  if(['COMMITTED','ALREADY_APPLIED'].includes(out.status))console.log('I66_DOCUMENTARY_'+code+'_SERVER_READBACK='+JSON.stringify(await verify()));
  if(mode==='apply')assert.ok(['COMMITTED','ALREADY_APPLIED'].includes(out.status),'ISSUED_CASE_HELD');
})().catch(e=>{console.error('I66_DOCUMENTARY_'+code+'_HOLD '+String(e.code||e.message).split('\n')[0].replace(/[^\w -]/g,'').slice(0,90));process.exitCode=1;});
