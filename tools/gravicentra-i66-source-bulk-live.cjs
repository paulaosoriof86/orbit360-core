'use strict';
// Existing I6.6 GitHub protected insurer-source gate, batch driver.
// Preflight reads canonical Firestore; only the separate Environment-reviewed
// "apply" job can write. Source files stay immutable and insurer-pinned.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const {planSourceBatch,canonicalPolicyNumber,policyKeys,sameInsurerPolicyNumber,sourceAliases}=require('./gravicentra-i66-source-bulk-plan.cjs');
const {applyProtectedBatch}=require('./gravicentra-i66-source-bulk-apply.cjs');
const BASE=path.resolve(__dirname,'../artifacts/orbit360-recovery/source-batches');
const INTAKE=require('../artifacts/orbit360-recovery/release-control/I6_6_COBROS_CONCILIACION_SOURCE_INTAKE_20261110.json');
const TENANT='alianzas-soluciones',PROJECT='ays-orbit-360-lab';
const sha=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');
const str=value=>String(value==null?'':value).trim();
const internal=(name,db)=>db.collection('tenants').doc(TENANT).collection('data').doc(name).collection('items');
const output=(name,value)=>{const dest=process.env[name];assert.ok(dest&&path.isAbsolute(dest),'I66_REPORT_OUTPUT_REQUIRED_'+name);fs.writeFileSync(dest,JSON.stringify(value,null,2)+'\n',{mode:0o600});};
const listedSources=Object.values(INTAKE.sourceInventory).flatMap(group=>Array.isArray(group?.files)?group.files:[])
  .filter(row=>/^[a-f\d]{64}$/i.test(str(row.sha256))&&/VERIFIED/.test(str(row.hashStatus)));
const allowedDigests=new Set(listedSources.map(row=>row.sha256));
function sealedSource(){
  const relative=str(process.env.GI_I66_BULK_SOURCE_MANIFEST);
  assert.match(relative,/^artifacts\/orbit360-recovery\/source-batches\/I6_6_SOURCE_BULK_[0-9]{8}_[A-Za-z0-9_-]+\.json$/,'I66_SOURCE_MANIFEST_PATH_NOT_PINNED');
  const filename=path.resolve(__dirname,'..',relative);
  assert.ok(filename.startsWith(BASE+path.sep),'I66_SOURCE_MANIFEST_ESCAPED_BASE');
  const bytes=fs.readFileSync(filename),data=JSON.parse(bytes);
  assert.equal(data.schema,'GRAVICENTRA_I6_6_INSURER_SOURCE_BULK_V1');
  assert.equal(data.status,'OWNER_RULES_FROZEN_SOURCE_ROWS_VERIFIED');
  assert.equal(data.tenantId,TENANT);assert.equal(data.projectId,PROJECT);
  assert.ok(str(data.ownerRuleReference).includes('2026-11-18'),'I66_OWNER_RULE_NOT_LINKED');
  assert.ok(Array.isArray(data.rows)&&data.rows.length>0&&data.rows.length<=5000,'I66_SOURCE_ROWS_BOUNDS');
  assert.ok(data.rows.every(row=>allowedDigests.has(str(row.sourceSha256))),'I66_UNPINNED_INSURER_SOURCE_HASH');
  const validTypes=new Set(['PENDING','PAID']);
  assert.ok(data.rows.every(row=>validTypes.has(row.state)),'I66_SOURCE_TYPE_NOT_DECLARED');
  return {relative,bytesSha256:sha(bytes),data};
}
async function readGroups(db,rawRows){
  const policyNumbers=[...new Set(rawRows.map(row=>str(row.policy)).filter(Boolean))];
  const groups=[];
  // Six independent policy reads at a time: no enormous global collection
  // hydration, and no materialization or mutation of source rows.
  for(let offset=0;offset<policyNumbers.length;offset+=6){
    const sets=await Promise.all(policyNumbers.slice(offset,offset+6).map(async number=>{
      const insurerRows=rawRows.filter(r=>str(r.policy)===number);
      const names=[...new Set(insurerRows.flatMap(r=>policyKeys(number,r.insurer)))];
      // The issued-term crosswalk reads these same persisted policy-number
      // fields. Do not mistake an older field name for an absent edition.
      // Keep the original document unchanged: alias-only identities can be
      // diagnosed here, but the planner/writer still require canonical numero.
      const snaps=await Promise.all(names.flatMap(n=>
        ['numero','numeroPoliza','polizaNumero'].map(field=>
          internal('polizas',db).where(field,'==',n).limit(21).get())));
      const policies=new Map(snaps.flatMap(s=>s.docs).map(d=>[d.id,d]));
      assert.ok(policies.size<=20&&snaps.every(s=>s.size<=20),'I66_POLICY_EDITION_QUERY_UNBOUNDED');
      const current=[];
      for(const doc of policies.values()){
        const p={...doc.data(),id:doc.id};
        if(str(p.pais).toUpperCase()!=='GT')continue;
        const [client,insurer,receipts,portfolio,cobros]=await Promise.all([
          p.clienteId?internal('clientes',db).doc(str(p.clienteId)).get():Promise.resolve({exists:false}),
          p.aseguradoraId?internal('aseguradoras',db).doc(str(p.aseguradoraId)).get():Promise.resolve({exists:false}),
          internal('recibosEsperados',db).where('polizaId','==',p.id).limit(121).get(),
          internal('carteraPrimas',db).where('polizaId','==',p.id).limit(121).get(),
          internal('cobros',db).where('polizaId','==',p.id).limit(121).get()]);
        if([receipts,portfolio,cobros].some(x=>x.size>120))throw Error('I66_POLICY_FINANCIAL_QUERY_UNBOUNDED');
        current.push({policy:p,clientExists:client.exists,
          holderNames:client.exists?[client.get('nombre'),client.get('nombreCompleto'),client.get('razonSocial')].filter(Boolean):[],
          insurerVerified:insurer.exists&&String(p.aseguradoraId||'')!==''&&
            insurer.data()?.activo!==false,
          insurerName:insurer.exists?str(insurer.data().nombre||insurer.data().razonSocial):'',
          receipts:receipts.docs.map(d=>({...d.data(),id:d.id})),
          portfolio:portfolio.docs.map(d=>({...d.data(),id:d.id})),
          cobros:cobros.docs.map(d=>({...d.data(),id:d.id}))});
      }
      return current;
    }));
    sets.forEach(group=>groups.push(...group));
  }
  // The same policy can be returned by several source aliases and fields.
  // Count physical editions by document ID; distinct editions remain distinct.
  return [...new Map(groups.map(g=>[g.policy.id,g])).values()];
}
// Explain the exact existing payment/portfolio hold from the bounded snapshot.
// This is private read-only evidence, not a second matcher or a write plan.
function paymentPortfolioHoldDiagnostics(rows,groups,exceptions,requestedCaseIds=[]){
  const {paid,moneyCents}=require('./gravicentra-i66-source-bulk-plan.cjs');
  const codes=new Map(exceptions.filter(e=>e.code==='PAYMENT_OR_PORTFOLIO_EXCEPTION').map(e=>[e.caseId,e.code]));
  requestedCaseIds.forEach(id=>{if(!codes.has(id))codes.set(id,'REQUESTED_CASE_READBACK');});
  const status=r=>({paidByCanonicalPredicate:paid(r),estado:str(r.estado),
    paymentState:str(r.paymentState),applicationState:str(r.applicationState),
    pagado:r.pagado===true,conciliado:r.conciliado===true,conciliadoPago:r.conciliadoPago===true,
    paidDates:Object.fromEntries(['fechaPago','fechaPagoReportada','paidDate'].filter(k=>str(r[k])).map(k=>[k,str(r[k])]))});
  const money=r=>Object.fromEntries(['primaTotal','monto','montoTotal','importe','montoPagado']
    .filter(k=>r[k]!=null).map(k=>[k,moneyCents(r[k])]));
  const refs=r=>Object.fromEntries([...sourceAliases,'numeroRecibo','referenciaAseguradora']
    .filter(k=>str(r[k])).map(k=>[k,str(r[k])]));
  return rows.filter(r=>codes.has(r.caseId)).map(row=>({caseId:row.caseId,code:codes.get(row.caseId),
    sourceRequirement:row.requirement,sourceDue:row.due,sourceGrossCents:row.grossCents,
    editions:groups.filter(g=>sameInsurerPolicyNumber(g.policy.numero,row.policy,row.insurer)&&
      str(g.policy.vigenciaInicio)<=row.due&&str(g.policy.vigenciaFin)>row.due).map(g=>({
      policyId:g.policy.id,receipts:g.receipts.filter(r=>sourceAliases.some(k=>str(r[k])===row.requirement)||
        str(r.fechaVencimientoContractual||r.vence||r.fechaVencimiento)===row.due).map(r=>{
        const portfolio=g.portfolio.filter(c=>str(c.reciboId)===str(r.id));
        const cobros=g.cobros.filter(c=>[str(c.reciboId),str(c.reciboEsperadoId)].includes(str(r.id)));
        return {receiptId:r.id,status:status(r),amountsCents:money(r),sourceReferences:refs(r),
          activePortfolioCount:portfolio.filter(c=>c.carteraActiva!==false).length,
          portfolio:portfolio.map(c=>({id:c.id,carteraActiva:c.carteraActiva!==false,
            status:status(c),amountsCents:money(c)})),
          cobroLinksCountedByPlanner:cobros.filter(c=>str(c.reciboId)===str(r.id)).length,
          cobros:cobros.map(c=>({id:c.id,reciboId:str(c.reciboId),reciboEsperadoId:str(c.reciboEsperadoId),
            status:status(c),amountsCents:money(c),sourceReferences:refs(c),
            inferredPaid:c.inferredPaid===true,confirmado:c.confirmado===true,
            sourceType:str(c.sourceType||c.evidenceType),
            auditReferences:Object.fromEntries(['requestId','operationalRequestId','sourceCandidateId','sourceId','auditId']
              .filter(k=>str(c[k])).map(k=>[k,str(c[k])]))}))};
      })})),diagnosticOnly:true,writes:0}));
}

function selectReadbackCase(rows,caseId){
  assert.equal(caseId,'ROBLE_NOV20_0043','I66_CASE_READBACK_NOT_AUTHORIZED');
  const selected=rows.filter(row=>row.caseId===caseId);
  assert.equal(selected.length,1,'I66_CASE_READBACK_SOURCE_NOT_UNIQUE');
  const row=selected[0];
  assert.equal(row.insurer,'ROBLE');assert.equal(row.policy,'91-4143471');
  assert.equal(row.requirement,'5693797');assert.equal(row.due,'2026-11-21');
  assert.equal(row.grossCents,33437);assert.equal(row.state,'PENDING');
  return selected;
}

// Compare the issued term to the current Firestore editions without treating a
// similarly numbered, expired policy as the successor. Publish counts only.
function issuedTermReadback(groups) {
  const evidencePath=path.join(BASE,'I6_6_ROBLE_THREE_ISSUED_TERMS_DOCUMENTARY_CROSSCHECK_20261122.json');
  const terms=JSON.parse(fs.readFileSync(evidencePath,'utf8')).issuedExamples;
  return terms.map((term,index)=>{
    const matches=groups.filter(g=>canonicalPolicyNumber(g.policy.numero)===term.policy &&
      g.insurerVerified && /roble/i.test(g.insurerName) && g.clientExists);
    const exact=matches.filter(g=>g.policy.vigenciaInicio===term.vigenciaInicio &&
      g.policy.vigenciaFin===term.vigenciaFin);
    const references=new Set([term.issuedRequirement,term.issuedScheduleRequirements?.first,
      term.issuedScheduleRequirements?.second].filter(Boolean));
    if(term.issuedScheduleRequirements)
      for(let n=Number(term.issuedScheduleRequirements.remainingFrom);n<=Number(term.issuedScheduleRequirements.remainingTo);n++)references.add(String(n));
    const receiptMatches=exact.flatMap(g=>g.receipts.filter(r=>[
      r.numeroReciboFuente,r.numeroReciboAseguradora,r.numeroRequerimiento,r.requerimiento,
      r.numeroBoleta,r.sourceNumber,r.referenciaCobro,r.receiptNumber
    ].some(v=>references.has(str(v)))).map(r=>({r,g})));
    return {sourceOrdinal:index+1,verifiedEditions:matches.length,exactTerms:exact.length,
      priorTerms:matches.filter(g=>str(g.policy.vigenciaFin) && g.policy.vigenciaFin<=term.vigenciaInicio).length,
      exactTermReceiptCount:exact.reduce((n,g)=>n+g.receipts.length,0),
      exactTermIssuedReceiptRefMatches:receiptMatches.length,
      matchesWithOnePortfolio:receiptMatches.filter(({g,r})=>g.portfolio.filter(c=>c.reciboId===r.id&&c.carteraActiva!==false).length===1).length};
  });
}
// Cross-check separately issued terms on the same bounded snapshot used by the
// bulk planner. No private names or unapproved mutations leave this function.
function issuedMulticarrierReadback(groups, rows, outcome){
  const docs=require('../artifacts/orbit360-recovery/source-batches/I6_6_MULTICARRIER_ISSUED_IDENTITY_20261122.json').documents;
  const norm=v=>str(v).normalize('NFD').toUpperCase().replace(/[^A-Z0-9]/g,'');
  return docs.filter(d=>rows.some(r=>r.insurer===d.insurer&&r.policy===d.policy)).map(d=>{
    const aliases=groups.filter(g=>sameInsurerPolicyNumber(g.policy.numero,d.policy,d.insurer)&&
      g.clientExists&&g.insurerVerified&&(d.insurer==='G&T'?/G\s*(?:&|Y)\s*T/i.test(g.insurerName):norm(g.insurerName).includes(norm(d.insurer))));
    const holderMatches=g=>g.holderNames.some(n=>sha(d.pdfSha256+'|'+norm(n))===d.holderWitness);
    const exact=aliases.filter(g=>g.policy.vigenciaInicio===d.termStart&&g.policy.vigenciaFin===d.termEnd);
    const prior=aliases.filter(g=>g.policy.vigenciaFin===d.termStart&&holderMatches(g));
    const obligations=d.matchingStatementRequirements.map(req=>{
      const source=rows.filter(r=>r.insurer===d.insurer&&r.policy===d.policy&&
        r.requirement===req.number&&r.due===req.due&&r.grossCents===req.grossCents);
      assert.equal(source.length,1,'ISSUED_REQUIREMENT_STATEMENT_DRIFT');
      const matching=exact.filter(holderMatches).flatMap(g=>g.receipts.filter(r=>
        sourceAliases.concat('numeroRecibo').some(f=>str(r[f])===req.number)).map(r=>({
          sameDate:str(r.fechaVencimientoContractual||r.vence||r.fechaVencimiento)===req.due,
          sameGross:Math.round(Number(r.primaTotal)*100)===req.grossCents,
          portfolio:g.portfolio.filter(c=>c.reciboId===r.id&&c.carteraActiva!==false).length
        })));
      return {number:req.number,matchedReceiptCount:matching.length,matches:matching,
        bulkOutcome:outcome.exceptions.find(e=>e.caseId===source[0].caseId)?.code||
          (outcome.unchanged.some(e=>e.caseId===source[0].caseId)?'UNCHANGED':'CHECK_ELIGIBLE_PLAN')};
    });
    return {insurer:d.insurer,policy:d.policy,termStart:d.termStart,termEnd:d.termEnd,
      matchingNumberEditions:aliases.length,exactTermEditions:exact.length,
      exactTermVerifiedHolder:exact.filter(holderMatches).length,priorTermVerifiedHolder:prior.length,
      exactTermState:exact.map(g=>String(g.policy.estado||'').slice(0,32)),
      receiptsOnExactTerm:exact.map(g=>g.receipts.length),obligations,writes:0};
  });
}

// An edition may have been renewed to a different policy number. Follow both
// directions of the relationship and compare the insurer's risk before any CAS.
async function readIssuedSuccessorLinks(db,groups){
  const issued=require('../artifacts/orbit360-recovery/source-batches/I6_6_MULTICARRIER_ISSUED_IDENTITY_20261122.json').documents.filter(c=>c.issuedSchedule);
  const normalize=v=>str(v).normalize('NFD').toUpperCase().replace(/[^A-Z0-9]/g,'');
  const rows=[];
  for(const c of issued){
    const matches=(v,expected)=>Boolean(v)&&sha(c.pdfSha256+'|'+normalize(v))===expected;
    const candidates=groups.filter(g=>g.clientExists&&g.insurerVerified&&/G\s*(?:&|Y)\s*T/i.test(g.insurerName)&&
      sameInsurerPolicyNumber(g.policy.numero,c.policy,c.insurer)&&g.policy.vigenciaFin===c.termStart&&
      g.holderNames.some(n=>matches(n,c.holderWitness)));
    if(candidates.length!==1){rows.push({policy:c.policy,verifiedPriorCount:candidates.length});continue;}
    const p=candidates[0].policy,policies=internal('polizas',db);
    const [byLink,byClient,risks,pointer]=await Promise.all([
      policies.where('renuevaDe','==',p.id).limit(31).get(),
      policies.where('clienteId','==',p.clienteId).limit(161).get(),
      internal('vehiculos',db).where('polizaId','==',p.id).limit(51).get(),
      p.renovadaPor?policies.doc(str(p.renovadaPor)).get():Promise.resolve(null)]);
    if(byLink.size>30||byClient.size>160||risks.size>50){
      rows.push({policy:c.policy,hold:'SUCCESSOR_QUERY_BOUNDS'});continue;
    }
    const sameTerm=byClient.docs.filter(d=>d.get('aseguradoraId')===p.aseguradoraId&&
      d.get('vigenciaInicio')===c.termStart&&d.get('vigenciaFin')===c.termEnd);
    const insurerRefs=c.issuedSchedule.map(r=>r.number), alternate=new Set();
    for(const collection of ['recibosEsperados','carteraPrimas','cobros']){
      for(const field of [...new Set(sourceAliases.concat('numeroRecibo'))]){
        const refs=insurerRefs.flatMap(n=>[n,Number(n)]);
        const found=await internal(collection,db).where(field,'in',refs).select('polizaId').limit(45).get();
        for(const d of found.docs)alternate.add(collection+'/'+d.id);
        if(found.size===45)alternate.add('READ_BOUNDARY');
      }
    }
    const fields=(d,keys)=>keys.map(k=>d.get(k)).filter(Boolean);
    rows.push({policy:c.policy,verifiedPriorCount:1,priorState:str(p.estado),priorPointsToSuccessor:Boolean(p.renovadaPor),
      pointerTargetExists:pointer?pointer.exists:false,pointerTargetSameHolder:pointer?.exists&&pointer.get('clienteId')===p.clienteId||false,
      pointerTargetSameTerm:pointer?.exists&&pointer.get('vigenciaInicio')===c.termStart&&pointer.get('vigenciaFin')===c.termEnd||false,
      policiesWithPreviousLink:byLink.size,otherSameHolderInsurerExactTerm:sameTerm.length,
      advisorOnPrior:Boolean(p.asesorId),earlierLinkedRisks:risks.size,
      earlierVerifiedPlate:risks.docs.filter(d=>fields(d,['placa','placaFuente']).some(v=>matches(v,c.plateWitness))).length,
      earlierVerifiedChassis:risks.docs.filter(d=>fields(d,['vin','chasis','chasisFuente']).some(v=>matches(v,c.chassisWitness))).length,
      priorPlatePopulated:risks.docs.some(d=>fields(d,['placa','placaFuente']).length),
      priorChassisPopulated:risks.docs.some(d=>fields(d,['vin','chasis','chasisFuente']).length),
      priorEnginePopulated:risks.docs.some(d=>fields(d,['motor','numeroMotor','motorFuente']).length),
      priorEngineMatch:risks.docs.filter(d=>fields(d,['motor','numeroMotor','motorFuente']).some(v=>matches(v,c.engineWitness))).length,
      priorPlateWithoutClassMatch:risks.docs.filter(d=>fields(d,['placa','placaFuente']).some(v=>
        normalize(v).length===6&&matches(v,c.plateWithoutClassWitness))).length,
      priorChassisSuffixMatch:risks.docs.filter(d=>fields(d,['vin','chasis','chasisFuente']).some(v=>
        normalize(v).length>=c.issuerChassisLength&&matches(normalize(v).slice(-c.issuerChassisLength),c.chassisWitness))).length,
      existingDocsUsingIssuedNumbers:alternate.size,anyDuplicateQueryTruncated:alternate.has('READ_BOUNDARY'),writes:0});
  }
  return rows;
}

// Read only. An owner's payment attestation settles the business fact. These
// checks locate its canonical destination without rewriting an older receipt.
async function locateAttestedPayments(db,groups,rows){
  const disposition=require('../artifacts/orbit360-recovery/release-control/I6_6_DIRECTION_119_EXCEPTIONS_20261122.json').ownerFinalDisposition20261122;
  const results=[];
  for(const decision of disposition.cases.filter(c=>c.requirement)){
    const row=rows.find(r=>r.requirement===decision.requirement && r.policy===decision.policy);
    assert.ok(row,'ATTESTED_REQUIREMENT_MISSING_FROM_SOURCE');
    const editions=groups.filter(g=>sameInsurerPolicyNumber(g.policy.numero,row.policy,row.insurer)&&g.clientExists&&g.insurerVerified);
    const names=['recibosEsperados','carteraPrimas','cobros'];
    const lookup=await Promise.all(names.map(async k=>{
      const refs=[decision.requirement,Number(decision.requirement)];
      const snapshots=await Promise.all([...new Set(sourceAliases.concat('numeroRecibo','referenciaAseguradora'))]
        .map(f=>internal(k,db).where(f,'in',refs).select('polizaId','clienteId').limit(11).get()));
      assert.ok(snapshots.every(q=>q.size<11),'ATTESTED_ALIAS_RESULT_BOUNDS');
      return new Set(snapshots.flatMap(q=>q.docs.map(d=>d.id))).size;
    }));
    for(const g of editions){
      const p=g.policy, policies=internal('polizas',db);
      const [linked,holder,mgmt,pointer]=await Promise.all([policies.where('renuevaDe','==',p.id).limit(31).get(),
        policies.where('clienteId','==',p.clienteId).limit(161).get(),
        internal('gestiones',db).where('polizaId','==',p.id).limit(81).get(),
        p.renovadaPor?policies.doc(str(p.renovadaPor)).get():Promise.resolve(null)]);
      assert.ok(linked.size<31&&holder.size<161&&mgmt.size<81,'ATTESTED_RELATION_RESULT_BOUNDS');
      const refs=mgmt.docs.map(d=>({id:d.id,ref:str(d.get('referenciaAseguradora')),docRef:str(d.get('documentRef')),date:str(d.get('fechaEfectiva'))}))
        .filter(m=>m.ref||m.docRef);
      const cents=values=>values.filter(x=>x!=null&&x!==''&&Number.isFinite(+x)).map(v=>Math.round(+v*100));
      const cash=g.cobros.map(c=>({linkedReceipt:g.receipts.some(r=>[c.reciboId,c.reciboEsperadoId].includes(r.id)),
        documentedAmount:cents([c.monto,c.importe,c.primaTotal,c.montoPagado,c.total]).includes(row.grossCents),
        ownerAmount:decision.bankAmountCents!=null&&cents([c.monto,c.importe,c.primaTotal,c.montoPagado,c.total]).includes(decision.bankAmountCents),
        linkedEndorsement:refs.some(m=>[c.gestionId,c.endosoId,c.gestionEndosoId].includes(m.id)),
        matchingRef:[...sourceAliases,'numeroRecibo','referenciaAseguradora'].some(f=>str(c[f])===decision.requirement)}));
      const laterSameHolder=holder.docs.filter(d=>d.id!==p.id&&d.get('aseguradoraId')===p.aseguradoraId&&
        d.get('pais')==='GT'&&str(d.get('vigenciaInicio'))>=str(p.vigenciaInicio)&&str(d.get('vigenciaFin'))>str(p.vigenciaFin));
      results.push({policy:row.policy,requirement:row.requirement,canonicalTerm:[p.vigenciaInicio,p.vigenciaFin],existingReceipts:g.receipts.length,
        existingCobros:g.cobros.length,existingPortfolio:g.portfolio.length,numberMatchesByCollection:Object.fromEntries(names.map((k,i)=>[k,lookup[i]])),
        directSuccessors:linked.size,successorPointerExists:Boolean(pointer?.exists),laterSameHolderInsurer:laterSameHolder.length,
        laterTerms:laterSameHolder.map(d=>[d.get('vigenciaInicio'),d.get('vigenciaFin')]),
        otherSourceReceiptNumbers:g.receipts.map(r=>sourceAliases.map(f=>str(r[f])).filter(v=>/^\d{5,12}$/.test(v))[0]).filter(Boolean),
        observedCash:cash,endorsements:refs.map(m=>({date:m.date,referencesRequirement:m.ref===row.requirement,sourceRefIsDriveUrl:/^https:\/\/(?:drive|docs)\.google\.com\//.test(m.docRef),sourceRefIsDriveFileId:/^[A-Za-z0-9_-]{20,}$/.test(m.docRef)})),writes:0});
    }
    if(!editions.length)results.push({policy:row.policy,requirement:row.requirement,editions:0,numberMatchesByCollection:Object.fromEntries(names.map((k,i)=>[k,lookup[i]])),writes:0});
  }
  return results;
}

async function main(){
  const mode=str(process.env.GI_I66_BULK_MODE);
  assert.ok(['preflight','case-readback','apply'].includes(mode),'I66_BULK_MODE_MUST_BE_EXPLICIT');
  assert.equal(process.env.GCLOUD_PROJECT,PROJECT,'I66_PROJECT_NOT_EXISTING_FIREBASE');
  const source=sealedSource();
  const admin=require('firebase-admin');
  admin.initializeApp({credential:admin.credential.applicationDefault(),projectId:PROJECT});
  const db=admin.firestore();
  if(mode==='case-readback'){
    const rows=selectReadbackCase(source.data.rows,str(process.env.GI_I66_BULK_READBACK_CASE));
    const groups=await readGroups(db,rows),plan=planSourceBatch(rows,groups,{chunkSize:250});
    // This receipt deliberately cannot enter the protected writer: it has a
    // separate status, zero chunks, and a readOnly flag even if a delta exists.
    const receipt={status:'BULK_SOURCE_CASE_READBACK_ONLY_NO_WRITES',readOnly:true,
      caseId:rows[0].caseId,sourceManifestPath:source.relative,sourceManifestSha256:source.bytesSha256,
      sourceSha256:rows[0].sourceSha256,inputRows:1,readyCount:plan.readyCount,
      unchangedCount:plan.unchangedCount,exceptionCount:plan.exceptionCount,
      exceptions:plan.exceptions,chunks:[],writes:0,
      privatePaymentPortfolioHolds:paymentPortfolioHoldDiagnostics(rows,groups,plan.exceptions,[rows[0].caseId])};
    output('GI_I66_BULK_PLAN_OUT',receipt);output('GI_I66_BULK_REPORT_OUT',receipt);
    console.log('I66_SCOPED_CASE_READBACK case='+rows[0].caseId+' input=1 ready='+plan.readyCount+
      ' unchanged='+plan.unchangedCount+' exceptions='+plan.exceptionCount+' ZERO_WRITES NO_APPLY_PLAN');
    return;
  }
  if(mode==='preflight'){
    const groups=await readGroups(db,source.data.rows);
    console.log('I66_ISSUED_TERM_READBACK='+JSON.stringify(issuedTermReadback(groups)));
    if(process.env.GI_I66_ATTESTED_TARGETS==='true')console.log('I66_ATTESTED_PAYMENT_TARGET_READBACK='+JSON.stringify(await locateAttestedPayments(db,groups,source.data.rows)));
    const crosswalk=await require('./gravicentra-i66-issued-term-identities.cjs').crosswalk(name=>internal(name,db));
    console.log('I66_ISSUED_IDENTITY_WITNESSES='+JSON.stringify(crosswalk));
    const five=await require('./gravicentra-i66-roble-five-issuer-crosswalk-readonly.cjs').crosswalk(name=>internal(name,db));
    console.log('I66_ROBLE_FIVE_49_ISSUED_EDITION_CROSSWALK='+JSON.stringify(five));
    const plan=await require('./gravicentra-i66-universales-issued-editions.cjs').enrichPlan(db,source,
      planSourceBatch(source.data.rows,groups,{chunkSize:250}));
    console.log('I66_MULTICARRIER_ISSUED_FIRESTORE_READBACK='+JSON.stringify(issuedMulticarrierReadback(groups,source.data.rows,plan)));
    console.log('I66_ISSUED_PREDECESSOR_SUCCESSOR_LINKS='+JSON.stringify(await readIssuedSuccessorLinks(db,groups)));
    const exceptionCodes={};
    for(const row of plan.exceptions)exceptionCodes[row.code]=(exceptionCodes[row.code]||0)+1;
    const diagnostic={sourcePolicyNumbers:new Set(source.data.rows.map(r=>str(r.policy))).size,
      livePolicyEditions:groups.length,
      editionsWithReceipts:groups.filter(g=>g.receipts.length).length,
      editionsWithPortfolio:groups.filter(g=>g.portfolio.length).length,
      editionsWithCobros:groups.filter(g=>g.cobros.length).length};
    // Private, bounded per-policy evidence: distinguish an absent policy from
    // a valid policy whose source-backed receipts have not been materialized.
    const exceptionsByCase=new Set(plan.exceptions.map(e=>e.caseId));
    const affectedNumbers=new Set(source.data.rows.filter(r=>exceptionsByCase.has(r.caseId))
      .map(r=>str(r.policy)));
    const policyDiagnostics=[...affectedNumbers].map(number=>({
      policyNumber:number,
      sourceRows:source.data.rows.filter(r=>str(r.policy)===number).length,
      editions:groups.filter(g=>source.data.rows.some(r=>str(r.policy)===number&&
        sameInsurerPolicyNumber(g.policy.numero,number,r.insurer))).map(g=>({
        id:g.policy.id,pais:g.policy.pais,moneda:g.policy.moneda,
        insurer:g.insurerName,clientExists:g.clientExists,
        insurerVerified:g.insurerVerified,estado:g.policy.estado,
        frecuencia:g.policy.frecuencia,cuotas:g.policy.cuotas,
        vigenciaInicio:g.policy.vigenciaInicio,vigenciaFin:g.policy.vigenciaFin,
        receiptsCount:g.receipts.length,portfolioCount:g.portfolio.length,
        cobrosCount:g.cobros.length,
        receipts:g.receipts.slice(0,24).map(r=>({id:r.id,sourceRef:r.numeroReciboFuente,
          due:r.fechaVencimientoContractual||r.vence||r.fechaVencimiento,
          operationalLimit:r.fechaLimite,sequence:r.secuencia||r.numeroCuota,
          cuota:r.cuota,gross:r.primaTotal,
          grossAliases:{monto:r.monto,montoTotal:r.montoTotal,saldo:r.saldo}}))}))
    }));
    const bundle={...plan,sourceManifestSha256:source.bytesSha256,
      sourceManifestPath:source.relative};
    const planSha256=sha(Buffer.from(JSON.stringify(bundle)));
    output('GI_I66_BULK_PLAN_OUT',bundle);
    output('GI_I66_BULK_REPORT_OUT',{status:plan.readyCount?
        'BULK_SOURCE_PREFLIGHT_ONLY_NO_WRITES':'BULK_SOURCE_NO_ELIGIBLE_ROWS_DIAGNOSTIC_HOLD',
      sourceManifestSha256:source.bytesSha256,planSha256,inputRows:plan.inputRows,
      readyCount:plan.readyCount,unchangedCount:plan.unchangedCount,
      exceptionCount:plan.exceptionCount,exceptionCodes,diagnostic,
      documentaryDiagnostics:plan.documentaryDiagnostics||[],
      privatePolicyDiagnostics:policyDiagnostics,
      privatePaymentPortfolioHolds:paymentPortfolioHoldDiagnostics(source.data.rows,groups,plan.exceptions),
      exceptionSamples:plan.exceptions.slice(0,35),
      chunks:plan.chunks.map(c=>({sequence:c.sequence,count:c.count,sha:c.sourcePlanSha256})),writes:0});
    console.log('I66_BULK_SOURCE_PREFLIGHT_PASS input='+plan.inputRows+' eligible='+plan.readyCount+
      ' exceptions='+plan.exceptionCount+' chunks='+plan.chunks.length+
      ' codes='+JSON.stringify(exceptionCodes)+' diagnostic='+JSON.stringify(diagnostic)+' ZERO_WRITES');
    return;
  }
  assert.equal(process.env.GITHUB_REF,'refs/heads/recovery/fase-a-clean-20260831');
  assert.equal(process.env.GITHUB_REPOSITORY,'paulaosoriof86/orbit360-core');
  assert.equal(process.env.GI_I66_BULK_PROTECTED_ENV,'gravicentra-live-data-writes');
  const planPath=str(process.env.GI_I66_BULK_PLAN_IN);
  assert.ok(path.isAbsolute(planPath),'I66_BULK_PREFLIGHT_PLAN_REQUIRED');
  const plan=JSON.parse(fs.readFileSync(planPath));
  assert.equal(plan.sourceManifestSha256,source.bytesSha256,'I66_BULK_SOURCE_BYTES_CHANGED');
  assert.equal(plan.sourceManifestPath,source.relative,'I66_BULK_SOURCE_FILE_CHANGED');
  assert.equal(plan.status,'BULK_SOURCE_PREFLIGHT_ONLY_NO_WRITES');
  assert.equal(plan.writes,0);
  assert.ok(Array.isArray(plan.chunks)&&plan.chunks.length>0);
  const keys=new Set(source.data.rows.map(r=>[str(r.insurer).toUpperCase(),str(r.policy),str(r.requirement),
    str(r.sourceSha256).toLowerCase()].join('|')));
  for(const c of plan.chunks)for(const row of c.rows){
    assert.ok(keys.has([row.insurer,row.policy,row.requirement,row.sourceSha256].join('|')),
      'I66_BULK_PLAN_ROW_NOT_IN_PINNED_SOURCE');
  }
  const gate={environment:'gravicentra-live-data-writes',reviewerEvidence:true,
    repository:'paulaosoriof86/orbit360-core',
    ref:process.env.GITHUB_REF,project:PROJECT,sourceManifestSha256:source.bytesSha256};
  const result=await applyProtectedBatch(db,plan,gate);
  output('GI_I66_BULK_REPORT_OUT',result);
  assert.ok(result.applied+result.alreadyApplied>0,'I66_BULK_NO_WRITES_OR_READBACK');
  console.log('I66_BULK_PROTECTED_REAL_READBACK applied='+result.applied+' already='+result.alreadyApplied+
    ' exceptions='+result.sourceExceptions+' isolatedHolds='+result.failed.length+
    ' receiptWrites='+result.receiptWrites+' carteraWrites='+result.portfolioWrites+
    ' cobroWrites='+result.cobroWrites);
}
module.exports={readGroups,paymentPortfolioHoldDiagnostics,selectReadbackCase};
if(require.main===module)main().catch(error=>{console.error('I66_BULK_EXECUTION_HOLD '+str(error.message));process.exitCode=1;});
