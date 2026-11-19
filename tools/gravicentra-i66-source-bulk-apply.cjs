'use strict';
// I6.6: per-row CAS adapter for insurer-backed, pending gross receipt and
// cartera corrections. The caller must be the existing protected GitHub
// Environment gate; one approval covers all approved chunks, not each row.
const crypto=require('node:crypto');
const {MAX_CHUNK,moneyCents,preimageFingerprint,paid,internal,sourceAliases,
  monthlySequence,internalSequence,completeMonthlySchedule,canonicalPolicyNumber}
  =require('./gravicentra-i66-source-bulk-plan.cjs');
const TENANT='alianzas-soluciones',PROJECT='ays-orbit-360-lab';
const str=value=>String(value==null?'':value).trim();
const norm=value=>str(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const items=(db,name)=>db.collection('tenants').doc(TENANT).collection('data').doc(name).collection('items');
const audit=(db,id)=>db.collection('tenants').doc(TENANT).collection('operationalRequests').doc(id);
const due=r=>str(r.fechaVencimientoContractual||r.vence||r.fechaVencimiento);
const hold=reason=>{throw new Error('I66_BULK_HOLD_'+reason);};
function gateValid(gate,plan){
  return gate?.environment==='gravicentra-live-data-writes'&&gate?.reviewerEvidence===true&&
    gate?.repository==='paulaosoriof86/orbit360-core'&&
    gate?.ref==='refs/heads/recovery/fase-a-clean-20260831'&&
    gate?.project===PROJECT&&
    gate?.sourceManifestSha256&&/^[a-f\d]{64}$/.test(gate.sourceManifestSha256)&&
    plan?.status==='BULK_SOURCE_PREFLIGHT_ONLY_NO_WRITES'&&plan.writes===0&&
    Array.isArray(plan.chunks)&&plan.chunks.every(c=>c.count<=MAX_CHUNK);
}
async function applyOne(db,row,gate){
  if(!row||!/^[a-f\d]{64}$/.test(str(row.sourceSha256))||
    !str(row.sourceKey).startsWith(str(row.insurer)+'|')||!str(row.requirement)||
    !Number.isSafeInteger(row.grossCents)||row.grossCents<=0)hold('SOURCE_ROW');
  const receiptRef=items(db,'recibosEsperados').doc(row.receiptId);
  const portfolioRef=items(db,'carteraPrimas').doc(row.portfolioId);
  const policyRef=items(db,'polizas').doc(row.policyId);
  const auditId='gi_i66_bulk_'+sha([gate.sourceManifestSha256,row.sourceKey,row.sourceSha256].join('|')).slice(0,35);
  const auditRef=audit(db,auditId);
  const applied=await db.runTransaction(async tx=>{
    const [rs,cs,ps,as]=await Promise.all([tx.get(receiptRef),tx.get(portfolioRef),
      tx.get(policyRef),tx.get(auditRef)]);
    if(as.exists) {
      const prev=as.data();
      if(prev?.sourceKey===row.sourceKey&&prev?.receiptId===row.receiptId&&
        prev?.portfolioId===row.portfolioId&&prev?.sourceSha256===row.sourceSha256)
        return {status:'ALREADY_APPLIED',auditId};
      hold('AUDIT_COLLISION');
    }
    if(!rs.exists||!cs.exists||!ps.exists)hold('RECORD_MISSING');
    const r=rs.data(),c=cs.data(),p=ps.data();
    if(str(r.polizaId)!==row.policyId||str(c.polizaId||c.policyId)!==row.policyId||
      canonicalPolicyNumber(p.numero)!==canonicalPolicyNumber(row.policy)||
      norm(p.pais)!=='GT'||norm(p.moneda)!=='GTQ'||
      norm(r.moneda||p.moneda)!=='GTQ'||norm(c.moneda||p.moneda)!=='GTQ'||
      !str(p.clienteId)||str(c.clienteId||p.clienteId)!==str(p.clienteId)||
      [r,c,p].some(x=>x.tenantId&&x.tenantId!==TENANT)||
      /ANULADA|CANCELADA|SUSPENDIDA|DELETED/.test(norm(p.estado))||
      !str(p.vigenciaInicio)||!str(p.vigenciaFin)||
      row.due<p.vigenciaInicio||row.due>=p.vigenciaFin||
      c.carteraActiva===false||due(r)!==str(row.oldContractualDue)||
      str(r.fechaLimite)!==str(row.oldOperationalLimit))
      hold('IDENTITY_TERM_OR_DUE');
    const [client,insurer,cobros,policyReceipts]=await Promise.all([
      tx.get(items(db,'clientes').doc(str(p.clienteId))),
      tx.get(items(db,'aseguradoras').doc(str(p.aseguradoraId))),
      tx.get(items(db,'cobros').where('reciboId','==',row.receiptId).limit(2)),
      tx.get(items(db,'recibosEsperados').where('polizaId','==',row.policyId).limit(121))
    ]);
    if(!client.exists||!insurer.exists||
      !['GT','GUATEMALA'].includes(norm(client.data().pais))||
      !norm(insurer.data().nombre||insurer.data().razonSocial).includes(row.insurer)||
      cobros.size>0||paid(r)||paid(c)||str(r.estadoOperativo).toUpperCase().includes('PAG')||
      policyReceipts.size>120)hold('IDENTITY_OR_PAYMENT');
    const monthlyIndex=monthlySequence(p,row.due);
    const monthlyMatch=row.matchMethod==='COMPLETE_MONTHLY_INSURER_DATE' &&
      !due(r)&&monthlyIndex!=null&&
      internalSequence(r.numeroReciboFuente)===monthlyIndex&&
      completeMonthlySchedule({receipts:policyReceipts.docs.map(s=>s.data())})&&
      (r.numeroCuota==null||Number(r.numeroCuota)===monthlyIndex)&&
      !str(r.referenciaCuotaInterna);
    if(!monthlyMatch&&due(r)!==row.due)hold('CONTRACTUAL_DUE_NOT_CORROBORATED');
    for(const field of sourceAliases){
      if(str(r[field])&&!internal(r[field])&&str(r[field])!==row.requirement)
        hold('EXTERNAL_SOURCE_ALREADY_DIFFERENT');
      // Requirement numbers may repeat in another insurer or policy. Their
      // identity is insurer + policy edition + external requirement, not a
      // global receipt-number namespace.
      if(policyReceipts.docs.some(s=>s.id!==row.receiptId&&
        str(s.data()[field])===row.requirement))hold('EXTERNAL_REFERENCE_NOT_UNIQUE');
    }
    if(['monto','montoTotal','saldo','valor'].some(k=>r[k]!=null||c[k]!=null))hold('GROSS_ALIASES_NOT_SAFE');
    const beforeReceipt=moneyCents(r.primaTotal),beforeCartera=moneyCents(c.primaTotal);
    if(beforeReceipt!==row.oldGrossCents||beforeCartera!==row.oldGrossCents||
      preimageFingerprint(row.receiptId,row.portfolioId,str(r.numeroReciboFuente),beforeReceipt,beforeCartera)!==row.beforeFingerprint)
      hold('CAS_PREIMAGE_CHANGED');
    tx.update(receiptRef,{numeroReciboFuente:row.requirement,primaTotal:row.grossCents/100,
      fechaVencimientoContractual:row.due,
      ...(monthlyMatch?{referenciaCuotaInterna:str(r.numeroReciboFuente),
        numeroCuota:monthlyIndex}: {})});
    tx.update(portfolioRef,{primaTotal:row.grossCents/100});
    tx.create(auditRef,{status:'APPLIED_PENDING_SOURCE_GROSS',sourceManifestSha256:gate.sourceManifestSha256,
      sourceSha256:row.sourceSha256,sourceKey:row.sourceKey,caseId:row.caseId,
      policyId:row.policyId,receiptId:row.receiptId,portfolioId:row.portfolioId,
      requirement:row.requirement,oldGrossCents:row.oldGrossCents,newGrossCents:row.grossCents,
      matchMethod:row.matchMethod,sourceContractualDue:row.due,
      preservedOperationalLimit:str(r.fechaLimite),
      beforeFingerprint:row.beforeFingerprint,rollback:{
        numeroReciboFuente:str(r.numeroReciboFuente),receiptGrossCents:beforeReceipt,
        portfolioGrossCents:beforeCartera,
        contractualDueWasPresent:Object.hasOwn(r,'fechaVencimientoContractual'),
        fechaVencimientoContractual:r.fechaVencimientoContractual??null,
        cuotaInternaWasPresent:Object.hasOwn(r,'referenciaCuotaInterna'),
        numeroCuotaWasPresent:Object.hasOwn(r,'numeroCuota'),
        numeroCuota:r.numeroCuota??null},paymentWrites:0,cobroWrites:0,
      committedAt:new Date().toISOString()});
    return {status:'COMMITTED_PENDING_READBACK',auditId};
  });
  const [postR,postC,postA]=await Promise.all([receiptRef.get(),portfolioRef.get(),auditRef.get()]);
  if(!postR.exists||!postC.exists||!postA.exists||
    str(postR.data().numeroReciboFuente)!==row.requirement||
    due(postR.data())!==row.due||
    str(postR.data().fechaLimite)!==str(row.oldOperationalLimit)||
    (row.matchMethod==='COMPLETE_MONTHLY_INSURER_DATE'&&
      internalSequence(postR.data().referenciaCuotaInterna)!==monthlySequence(
        (await policyRef.get()).data(),row.due))||
    moneyCents(postR.data().primaTotal)!==row.grossCents||
    moneyCents(postC.data().primaTotal)!==row.grossCents||
    postA.data().sourceKey!==row.sourceKey)hold('POSTIMAGE_NOT_CERTIFIED');
  return {status:applied.status==='ALREADY_APPLIED'?'ALREADY_APPLIED_READBACK_PASS':'APPLIED_READBACK_PASS',
    caseId:row.caseId,receiptId:row.receiptId,portfolioId:row.portfolioId,auditId};
}
async function applyProtectedBatch(db,plan,gate){
  if(!gateValid(gate,plan))hold('ENVIRONMENT_OR_PLAN_NOT_APPROVED');
  const accepted=[],failed=[];
  // Bounded chunks keep a large manifest under one reviewer gate. Per-row CAS
  // isolates real exceptions and can never mark an unverified row as applied.
  for(const chunk of plan.chunks){
    if(chunk.rows.length!==chunk.count||chunk.rows.length>MAX_CHUNK)hold('CHUNK_DRIFT');
    for(let i=0;i<chunk.rows.length;i+=6){
      const six=chunk.rows.slice(i,i+6);
      const completed=await Promise.all(six.map(async row=>{
        try{return {ok:true,value:await applyOne(db,row,gate)};}
        catch(error){return {ok:false,caseId:row.caseId,
          code:/^I66_BULK_HOLD_[A-Z_]+$/.test(error.message)?error.message:'I66_BULK_HOLD_PRIVATE_ERROR'};}
      }));
      for(const r of completed)(r.ok?accepted:failed).push(r.ok?r.value:{caseId:r.caseId,code:r.code});
    }
  }
  return {status:failed.length?'BULK_PARTIAL_HOLD':'BULK_PROTECTED_READBACK_PASS',
    approvedManifest:gate.sourceManifestSha256,
    inputRows:plan.inputRows,readyCount:plan.readyCount,sourceExceptions:plan.exceptionCount,
    applied:accepted.filter(x=>x.status==='APPLIED_READBACK_PASS').length,
    alreadyApplied:accepted.filter(x=>x.status==='ALREADY_APPLIED_READBACK_PASS').length,
    receiptWrites:accepted.filter(x=>x.status==='APPLIED_READBACK_PASS').length,
    portfolioWrites:accepted.filter(x=>x.status==='APPLIED_READBACK_PASS').length,
    cobroWrites:0,paymentWrites:0,failed,accepted};
}
module.exports={gateValid,applyOne,applyProtectedBatch};
