'use strict';
// I6.6: per-row CAS adapter for insurer-backed, pending gross receipt and
// cartera corrections. The caller must be the existing protected GitHub
// Environment gate; one approval covers all approved chunks, not each row.
const crypto=require('node:crypto');
const {MAX_CHUNK,moneyCents,preimageFingerprint,paid,internal,sourceAliases,
  monthlySequence,internalSequence,completeMonthlySchedule,canonicalPolicyNumber,sameInsurerPolicyNumber,
  grossAliasFields,comparableGrossAliases}
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
      !sameInsurerPolicyNumber(p.numero,row.policy,row.insurer)||
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
      due(r)!==row.due&&monthlyIndex!=null&&
      internalSequence(r.numeroReciboFuente)===monthlyIndex&&
      completeMonthlySchedule({receipts:policyReceipts.docs.map(s=>s.data())})&&
      (r.numeroCuota==null||Number(r.numeroCuota)===monthlyIndex)&&
      !str(r.referenciaCuotaInterna);
    // An exact external insurer requirement on this policy edition is stronger
    // evidence for its contractual due date than a stale imported date.
    // Cross-receipt source-reference uniqueness is checked below.
    const exactRequirementCorrection = row.matchMethod==='EXACT_INSURER_REQUIREMENT_DUE' &&
      sourceAliases.some(field=>str(r[field])===row.requirement);
    if(row.matchMethod==='EXACT_INSURER_REQUIREMENT_DUE'&&!exactRequirementCorrection)
      hold('SOURCE_REQUIREMENT_NOT_CORROBORATED');
    if(!monthlyMatch&&!exactRequirementCorrection&&due(r)!==row.due)
      hold('CONTRACTUAL_DUE_NOT_CORROBORATED');
    for(const field of sourceAliases){
      if(str(r[field])&&!internal(r[field])&&str(r[field])!==row.requirement)
        hold('EXTERNAL_SOURCE_ALREADY_DIFFERENT');
      // Requirement numbers may repeat in another insurer or policy. Their
      // identity is insurer + policy edition + external requirement, not a
      // global receipt-number namespace.
      if(policyReceipts.docs.some(s=>s.id!==row.receiptId&&
        str(s.data()[field])===row.requirement))hold('EXTERNAL_REFERENCE_NOT_UNIQUE');
    }
    const beforeReceipt=moneyCents(r.primaTotal),beforeCartera=moneyCents(c.primaTotal);
    const grossAliases=beforeReceipt==null||beforeCartera==null?null:
      comparableGrossAliases(r,c,beforeReceipt,beforeCartera);
    if(grossAliases==null||JSON.stringify(grossAliases)!==JSON.stringify(row.oldGrossAliases))
      hold('GROSS_ALIAS_PREIMAGE_CHANGED');
    if(beforeReceipt!==row.oldGrossCents||beforeCartera!==row.oldCarteraGrossCents||
      preimageFingerprint(row.receiptId,row.portfolioId,str(r.numeroReciboFuente),beforeReceipt,
        beforeCartera,grossAliases)!==row.beforeFingerprint)
      hold('CAS_PREIMAGE_CHANGED');
    const updateAliases=(side,record)=>Object.fromEntries(grossAliasFields
      .filter(field=>Object.hasOwn(grossAliases[side],field))
      .map(field=>[field,typeof record[field]==='string'?
        String(row.grossCents/100):row.grossCents/100]));
    tx.update(receiptRef,{numeroReciboFuente:row.requirement,primaTotal:row.grossCents/100,
      fechaVencimientoContractual:row.due,
      ...updateAliases('receipt',r),
      ...(monthlyMatch?{referenciaCuotaInterna:str(r.numeroReciboFuente),
        numeroCuota:monthlyIndex}: {})});
    tx.update(portfolioRef,{primaTotal:row.grossCents/100,...updateAliases('cartera',c)});
    tx.create(auditRef,{status:'APPLIED_PENDING_SOURCE_GROSS',sourceManifestSha256:gate.sourceManifestSha256,
      sourceSha256:row.sourceSha256,sourceKey:row.sourceKey,caseId:row.caseId,
      policyId:row.policyId,receiptId:row.receiptId,portfolioId:row.portfolioId,
      requirement:row.requirement,oldGrossCents:row.oldGrossCents,
      oldCarteraGrossCents:row.oldCarteraGrossCents,newGrossCents:row.grossCents,
      oldGrossAliases:row.oldGrossAliases,
      matchMethod:row.matchMethod,sourceContractualDue:row.due,
      preservedOperationalLimit:str(r.fechaLimite),
      beforeFingerprint:row.beforeFingerprint,rollback:{
        numeroReciboFuente:str(r.numeroReciboFuente),receiptGrossCents:beforeReceipt,
        portfolioGrossCents:beforeCartera,
        receiptGrossAliases:Object.fromEntries(Object.keys(grossAliases.receipt)
          .map(field=>[field,r[field]])),
        carteraGrossAliases:Object.fromEntries(Object.keys(grossAliases.cartera)
          .map(field=>[field,c[field]])),
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
    ['receipt','cartera'].some((side)=>Object.keys(row.oldGrossAliases?.[side]||{})
      .some(field=>moneyCents((side==='receipt'?postR:postC).data()[field])!==row.grossCents))||
    postA.data().sourceKey!==row.sourceKey)hold('POSTIMAGE_NOT_CERTIFIED');
  return {status:applied.status==='ALREADY_APPLIED'?'ALREADY_APPLIED_READBACK_PASS':'APPLIED_READBACK_PASS',
    caseId:row.caseId,receiptId:row.receiptId,portfolioId:row.portfolioId,auditId};
}
async function applyProtectedBatch(db,plan,gate){
  if(!gateValid(gate,plan))hold('ENVIRONMENT_OR_PLAN_NOT_APPROVED');
  const accepted=[],failed=[],documentaryResults=[],documentaryOperations=new Set();
  for(const chunk of plan.chunks){
    if(!chunk.operationKind){if(chunk.rows.some(r=>r.operationKind))hold('DOCUMENTARY_DISCRIMINATOR_MISSING');continue;}
    const medical=require('./gravicentra-i66-universales-issued-editions.cjs');
    if(![medical.KIND,medical.MISSING_KIND].includes(chunk.operationKind))hold('UNKNOWN_DOCUMENTARY_OPERATION');
    if(documentaryOperations.has(chunk.operation))hold('DUPLICATE_DOCUMENTARY_OPERATION');
    documentaryOperations.add(chunk.operation);
  }
  // Bounded chunks keep a large manifest under one reviewer gate. Per-row CAS
  // isolates real exceptions and can never mark an unverified row as applied.
  for(const chunk of plan.chunks){
    if(chunk.rows.length!==chunk.count||chunk.rows.length>MAX_CHUNK)hold('CHUNK_DRIFT');
    if(chunk.operationKind){
      const medical=require('./gravicentra-i66-universales-issued-editions.cjs');
      let result;
      try{result=await medical.applyChunk(db,chunk,gate);}
      catch(error){result={status:'HOLD',technicalWrites:0,
        reason:/^[A-Z0-9_]+$/.test(error.message)?error.message:'MEDICAL_PLAN_OR_DOCUMENT_HOLD'};}
      documentaryResults.push({policy:chunk.policy,operationKind:chunk.operationKind,...result});
      if(['APPLIED_READBACK_PASS','ALREADY_APPLIED_READBACK_PASS'].includes(result.status)){
        for(const row of chunk.rows)accepted.push({status:result.status,caseId:row.caseId,
          operationKind:chunk.operationKind,policy:chunk.policy,operation:chunk.operation,
          receiptId:'rec_'+chunk.operation+'_'+row.requirement,
          portfolioId:'car_rec_'+chunk.operation+'_'+row.requirement});
      }else for(const row of chunk.rows)failed.push({caseId:row.caseId,code:result.reason||'MEDICAL_READBACK_HOLD',
        operationKind:chunk.operationKind,committed:result.status==='COMMITTED_READBACK_HOLD',
        writeOutcomeIndeterminate:result.writeOutcomeIndeterminate===true});
      continue;
    }
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
  const normalApplied=accepted.filter(x=>x.status==='APPLIED_READBACK_PASS'&&!x.operationKind).length;
  const documentaryCommitted=documentaryResults.filter(x=>
    ['APPLIED_READBACK_PASS','COMMITTED_READBACK_HOLD'].includes(x.status));
  const documentaryRows=documentaryCommitted.reduce((n,r)=>n+
    plan.chunks.find(c=>c.policy===r.policy&&c.operationKind===r.operationKind).count,0);
  const indeterminate=documentaryResults.some(r=>r.writeOutcomeIndeterminate),
    indeterminateEdition=documentaryResults.some(r=>r.writeOutcomeIndeterminate&&r.operationKind==='ISSUED_MEDICAL_EDITION_CREATE');
  return {status:failed.length?'BULK_PARTIAL_HOLD':'BULK_PROTECTED_READBACK_PASS',
    approvedManifest:gate.sourceManifestSha256,
    inputRows:plan.inputRows,readyCount:plan.readyCount,sourceExceptions:plan.exceptionCount,
    applied:accepted.filter(x=>x.status==='APPLIED_READBACK_PASS').length,
    alreadyApplied:accepted.filter(x=>x.status==='ALREADY_APPLIED_READBACK_PASS').length,
    receiptWrites:indeterminate?null:normalApplied+documentaryRows,
    portfolioWrites:indeterminate?null:normalApplied+documentaryRows,
    policyCreates:indeterminateEdition?null:documentaryCommitted.reduce((n,r)=>n+(r.operationKind==='ISSUED_MEDICAL_EDITION_CREATE'?1:0),0),
    activityCreates:indeterminateEdition?null:documentaryCommitted.reduce((n,r)=>n+(r.operationKind==='ISSUED_MEDICAL_EDITION_CREATE'?1:0),0),
    priorPolicyUpdates:indeterminateEdition?null:documentaryCommitted.reduce((n,r)=>n+(r.priorUpdates||0),0),
    auditCreates:indeterminate?null:normalApplied+documentaryCommitted.length,
    technicalDocumentWrites:indeterminate?null:normalApplied*3+documentaryCommitted.reduce((n,r)=>n+r.technicalWrites,0),
    ...(indeterminate?{attemptedTechnicalDocumentWrites:normalApplied*3+documentaryResults.reduce((n,r)=>n+(r.attemptedTechnicalWrites||r.technicalWrites||0),0)}:{}),
    writeOutcomeIndeterminate:indeterminate,
    documentaryResults,cobroWrites:0,paymentWrites:0,failed,accepted};
}
// The two MAPFRE installments are existing unpaid obligations backed by paid
// insurer evidence. This adapter corrects their gross/due/source references;
// it never turns a paid source into PENDING and never creates a payment.
const mapfreStable=x=>Array.isArray(x)?x.map(mapfreStable):x&&typeof x==='object'?
  Object.fromEntries(Object.keys(x).sort().map(k=>[k,mapfreStable(x[k])])):x;
const mapfreHash=x=>sha(JSON.stringify(mapfreStable(x)));
const mapfreRecordKey=e=>e.collection+'/'+e.id;
const mapfreDataView=entries=>entries.map(e=>({collection:e.collection,id:e.id,data:e.data}))
  .sort((a,b)=>mapfreRecordKey(a).localeCompare(mapfreRecordKey(b)));
function mapfreCorrectionPlan(review,binding){
  const profile=require('./gravicentra-i66-financial-identity-readback.cjs').mapfreProfile(binding);
  if(review.schema!=='GI_I66_MAPFRE_FRESH_CONTROLLED_PREFLIGHT_V1'||review.writes!==0||
    review.paymentWriteEligibleCount!==0||review.correctionEligibleCount!==2||review.globalHolds.length||
    !/^[a-f\d]{64}$/.test(review.beforeHash)||review.targets.length!==2||
    review.targets.some(t=>!t.correctionEligible||t.localHolds.length)||
    review.originals.length!==profile.originals||review.originals.some(o=>o.status!=='ORIGINAL_BYTES_VERIFIED')||
    (profile.id==='MAPFRE_DOC04_2453'&&review.profileId!==profile.id))
    hold('MAPFRE_EXACT_FRESH_PLAN_REQUIRED');
  const patches=[];
  for(const target of binding.preflight.twoCases){
    const approved=review.targets.find(t=>t.sourceFactId===target.sourceFactId);
    if(!approved||approved.requirement!==target.requirement||approved.sourceGrossCents!==profile.grossCents)
      hold('MAPFRE_TARGET_PIN_CHANGED');
    for(const [collection,id] of [['recibosEsperados',target.receiptId],['carteraPrimas',target.portfolioId]]){
      const before=review.privatePreimages.find(e=>e.collection===collection&&e.id===id);
      if(!before?.exists||!before.updateTime)hold('MAPFRE_FULL_PREIMAGE_REQUIRED');
      const fields=['primaTotal',...grossAliasFields].filter(k=>Object.hasOwn(before.data,k));
      if(!fields.length||fields.some(k=>moneyCents(before.data[k])!==profile.beforeGrossCents&&moneyCents(before.data[k])!==profile.grossCents))
        hold('MAPFRE_EXPECTED_ONE_CENT_CORRECTION_REQUIRED');
      const patch=Object.fromEntries(fields.map(k=>[k,typeof before.data[k]==='string'?(profile.grossCents/100).toFixed(2):profile.grossCents/100]));
      if(collection==='recibosEsperados')Object.assign(patch,{numeroReciboFuente:target.requirement,
        fechaVencimientoContractual:target.documentedTarget.contractualDue});
      patches.push({collection,id,sourceFactId:target.sourceFactId,patch,
        beforeHash:mapfreHash(before.data),beforeUpdateTime:before.updateTime});
    }
  }
  const afterEntries=review.privatePreimages.map(e=>{
    const patch=patches.find(p=>mapfreRecordKey(p)===mapfreRecordKey(e));
    return patch?{...e,data:{...e.data,...patch.patch}}:e;
  });
  const body={schema:'GI_I66_MAPFRE_EXISTING_OBLIGATION_CAS_V1',
    ...(profile.id==='MAPFRE_DOC04_2453'?{profileId:profile.id,calendarDiagnostic:review.calendarDiagnostic}:{}),
    status:'MAPFRE_OBLIGATION_PREFLIGHT_ONLY_NO_PAYMENT_WRITES',writes:0,paymentWrites:0,
    inputRows:2,readyCount:2,policyId:binding.preflight.scope.policyId,
    sourcePins:review.sourcePins,sourceManifestSha256:review.sourcePins.source[1],
    authoritySha256:review.sourcePins.authority[1],beforeHash:review.beforeHash,
    originals:review.originals,patches,beforeDataHash:mapfreHash(mapfreDataView(review.privatePreimages)),
    expectedAfterDataHash:mapfreHash(mapfreDataView(afterEntries)),
    priorPayments:profile.previousPayments,annualVariancePreserved:profile.annualVariancePreserved,installment12Excluded:true};
  return JSON.parse(JSON.stringify({...body,planHash:mapfreHash(body)}));
}
function mapfreAuditId(plan){return 'gi_i66_mapfre_obligation_'+sha(plan.sourceManifestSha256+'|'+
  plan.authoritySha256+'|'+plan.policyId).slice(0,28);}
function mapfreGate(gate,plan){
  return gate?.environment==='gravicentra-live-data-writes'&&gate.reviewerEvidence===true&&
    gate.repository==='paulaosoriof86/orbit360-core'&&gate.ref==='refs/heads/recovery/fase-a-clean-20260831'&&
    gate.project===PROJECT&&gate.sourceManifestSha256===plan.sourceManifestSha256&&
    gate.authoritySha256===plan.authoritySha256&&plan.schema==='GI_I66_MAPFRE_EXISTING_OBLIGATION_CAS_V1'&&
    plan.status==='MAPFRE_OBLIGATION_PREFLIGHT_ONLY_NO_PAYMENT_WRITES'&&plan.writes===0&&
    plan.paymentWrites===0&&plan.inputRows===2&&plan.readyCount===2&&plan.patches?.length===4;
}
async function applyMapfreObligations(db,plan,gate,binding,originals){
  const reader=require('./gravicentra-i66-financial-identity-readback.cjs');
  if(!mapfreGate(gate,plan))hold('MAPFRE_PROTECTED_ENVIRONMENT_REQUIRED');
  binding=binding||reader.mapfreBinding(plan.profileId||'MAPFRE_R46');
  const profile=reader.mapfreProfile(binding);
  if((plan.profileId||'MAPFRE_R46')!==profile.id)hold('MAPFRE_PLAN_PROFILE_CHANGED');
  originals=originals||await reader.mapfreOriginals(binding);
  if(originals.length!==profile.originals||originals.some(o=>o.status!=='ORIGINAL_BYTES_VERIFIED')||
    originals.some(o=>!binding.preflight.originalDocumentPins.some(p=>p.driveFileId===o.fileId&&p.sha256===o.sha256))||
    mapfreHash(originals)!==mapfreHash(plan.originals))hold('MAPFRE_ORIGINAL_BYTES_CHANGED');
  const auditId=mapfreAuditId(plan),auditRef=audit(db,auditId),before=[],after=[];
  let attempted=false,committed=false,replayed=false,uncertain=false,transactionError='';
  const certify=(record,review)=>record?.schema==='GI_I66_MAPFRE_EXISTING_OBLIGATION_CORRECTION_V1'&&
    record.planHash===plan.planHash&&record.authoritySha256===plan.authoritySha256&&
    record.sourceManifestSha256===plan.sourceManifestSha256&&record.policyId===plan.policyId&&
    record.paymentWrites===0&&record.cobroWrites===0&&
    record.afterDataHash===plan.expectedAfterDataHash&&
    mapfreHash(mapfreDataView(review.privatePreimages))===plan.expectedAfterDataHash&&
    review.globalHolds.length===0&&review.correctionEligibleCount===2;
  try{
    const outcome=await db.runTransaction(async tx=>{
      const [snapshot,existing]=await Promise.all([reader.mapfreSnapshot(db,binding,tx),tx.get(auditRef)]);
      const review=reader.mapfreReview(binding,snapshot,originals);
      if(existing.exists){
        if(!certify(existing.data(),review))hold('MAPFRE_EXISTING_CORRECTION_POSTIMAGE_CHANGED');
        return {replayed:true};
      }
      const fresh=mapfreCorrectionPlan(review,binding);
      if(mapfreHash(fresh)!==mapfreHash(plan))hold('MAPFRE_FULL_PREIMAGE_CAS_CHANGED');
      before.splice(0,before.length,...review.privatePreimages);
      after.splice(0,after.length,...review.privatePreimages.map(e=>{
        const patch=plan.patches.find(p=>mapfreRecordKey(p)===mapfreRecordKey(e));
        return patch?{...e,data:{...e.data,...patch.patch}}:e;
      }));
      // Every transaction read finishes before any write. Firestore also
      // protects the bounded queries from newly inserted competing links.
      attempted=true;
      for(const patch of plan.patches)tx.update(items(db,patch.collection).doc(patch.id),patch.patch);
      tx.create(auditRef,{schema:'GI_I66_MAPFRE_EXISTING_OBLIGATION_CORRECTION_V1',
        ...(profile.id==='MAPFRE_DOC04_2453'?{profileId:profile.id,calendarDiagnostic:plan.calendarDiagnostic}:{}),
        status:'EXISTING_OBLIGATIONS_CORRECTED_NO_PAYMENTS',planHash:plan.planHash,
        authoritySha256:plan.authoritySha256,sourceManifestSha256:plan.sourceManifestSha256,
        sourcePins:plan.sourcePins,originals,policyId:plan.policyId,patches:plan.patches,
        beforeHash:plan.beforeHash,beforeDataHash:plan.beforeDataHash,afterDataHash:plan.expectedAfterDataHash,
        rollback:{records:before.filter(e=>plan.patches.some(p=>mapfreRecordKey(p)===mapfreRecordKey(e))),
          onlyIfWholeCurrentAfterDataHashMatches:true},
        preservedRecordHashes:before.filter(e=>!plan.patches.some(p=>mapfreRecordKey(p)===mapfreRecordKey(e)))
          .map(e=>({collection:e.collection,id:e.id,sha256:mapfreHash(e.data),updateTime:e.updateTime})),
        originalSourceStates:binding.preflight.twoCases.map(t=>({sourceFactId:t.sourceFactId,
          state:binding.source.facts.find(f=>f.sourceFactId===t.sourceFactId).state,
          sourceDocumentSha256:t.source.sha256,sourceRowSha256:t.source.sourceRowSha256})),
        receiptWrites:2,portfolioWrites:2,auditWrites:1,paymentWrites:0,cobroWrites:0,
        previousPaymentsPreserved:profile.previousPayments,annualVariancePreserved:profile.annualVariancePreserved,installment12Excluded:true,
        committedAt:new Date().toISOString()});
      return {replayed:false};
    });
    replayed=outcome.replayed;committed=!replayed;
  }catch(error){
    transactionError=/^I66_BULK_HOLD_[A-Z_]+$/.test(error.message)?error.message:'MAPFRE_PRIVATE_TRANSACTION_ERROR';
    uncertain=attempted;
    if(!attempted)return {status:'MAPFRE_OBLIGATION_CAS_HOLD',reason:transactionError,
      technicalWrites:0,paymentWrites:0,cobroWrites:0,newPayments:0,writeOutcomeIndeterminate:false};
  }
  let post,postAudit;
  try{
    const [snapshot,stored]=await Promise.all([reader.mapfreSnapshot(db,binding),auditRef.get()]);
    post=reader.mapfreReview(binding,snapshot,originals);postAudit=stored.exists?stored.data():null;
  }catch{return {status:committed?'MAPFRE_OBLIGATION_COMMITTED_READBACK_HOLD':'MAPFRE_OBLIGATION_READBACK_HOLD',
    auditId,knownCommitted:committed,writeOutcomeIndeterminate:uncertain,
    technicalWrites:committed?5:replayed?0:null,paymentWrites:0,cobroWrites:0,newPayments:0,
    reason:'MAPFRE_POSTCOMMIT_READ_UNAVAILABLE'};}
  if(!certify(postAudit,post))return {status:committed?'MAPFRE_OBLIGATION_COMMITTED_READBACK_HOLD':'MAPFRE_OBLIGATION_READBACK_HOLD',
    auditId,knownCommitted:committed,writeOutcomeIndeterminate:uncertain,
    technicalWrites:committed?5:replayed?0:null,paymentWrites:0,cobroWrites:0,newPayments:0,
    reason:'MAPFRE_POSTIMAGE_CHANGED_OR_AUDIT_ABSENT',privateAfter:post};
  return {status:replayed?'MAPFRE_OBLIGATION_ALREADY_APPLIED_READBACK_PASS':'MAPFRE_OBLIGATION_APPLIED_READBACK_PASS',
    auditId,planHash:plan.planHash,knownCommitted:!replayed,writeOutcomeIndeterminate:false,
    recoveredAmbiguousCommit:uncertain,technicalWrites:replayed?0:5,receiptWrites:replayed?0:2,
    portfolioWrites:replayed?0:2,auditWrites:replayed?0:1,paymentWrites:0,cobroWrites:0,newPayments:0,
    privateBefore:before,privateAfter:post,afterDataHash:plan.expectedAfterDataHash,
    next:'Authenticate the real authorized user and submit each exact pinned canonical payment request.'};
}
module.exports={gateValid,applyOne,applyProtectedBatch,mapfreCorrectionPlan,mapfreAuditId,applyMapfreObligations};
