'use strict';

// Server-only assessment. The browser supplies IDs and a preview digest, never
// a financial payload. The active staging ledger remains immutable.
const crypto = require('node:crypto');
const {validateActiveLedgerContract} = require('./cobros-ledger-contract');
const {planEvidence,evidenceKind} = require('./payment-inference-engine');
const text = value => String(value == null ? '' : value).trim();
const stable = value => value == null ? value : Array.isArray(value) ? value.map(stable) :
  typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])])) : value;
const digest = value => crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{1,179}$/;
const SHA = /^[a-f0-9]{64}$/;
const first = (row, keys) => keys.map(k=>row&&row[k]).find(v=>v!=null&&v!=='');
const QUESTIONS = Object.freeze({
  SOURCE_EVIDENCE_NOT_UNIQUE:'No hay una única evidencia de origen vinculada a esta propuesta. Falta vincular el documento y la fila exactos.',
  SOURCE_EVIDENCE_TYPE_MISSING:'La evidencia no identifica si es pago bancario, factura, estado de cuenta o planilla de comisiones. Falta acreditar el tipo de fuente.',
  SOURCE_RECEIPT_IDENTITY_MISSING:'La propuesta identifica la póliza, pero no el recibo o requerimiento exacto. ¿A qué recibo corresponde esta fila?',
  SOURCE_POLICY_EDITION_AMBIGUOUS:'Hay más de una edición de la póliza. Falta la vigencia o el recibo exacto que identifica la edición.',
  SOURCE_POLICY_EDITION_NOT_FOUND:'La edición o vigencia acreditada por la fuente no coincide con una póliza disponible.',
  SOURCE_RECEIPT_NOT_UNIQUE:'No hay un único recibo que coincida con la referencia acreditada. Falta resolver ese recibo, no volver a aprobar la póliza.',
  SOURCE_BANK_PAYMENT_NOT_PROVEN:'La coincidencia bancaria no acredita todavía el pago. Falta la evidencia de pago confirmado de esa fila.',
  SOURCE_CURRENCY_REQUIRED:'La fuente no especifica la moneda; debe completarse desde el documento original.',
  SOURCE_RECEIPT_CURRENCY_MISMATCH:'La moneda de la evidencia no coincide con la del recibo y la póliza.',
  SOURCE_RECEIPT_AMOUNT_MISMATCH:'El importe de la evidencia no coincide con el recibo. Confirma si es abono parcial o una referencia diferente.',
  SOURCE_PARTIAL_PAYMENT_REQUIRES_ALLOCATION:'Es un abono parcial: debe usarse la asignación de abonos aprobada; no se liquidará todo el recibo como pagado.',
  SOURCE_LEDGER_INTEGRITY_MISMATCH:'La evidencia no supera la comprobación de integridad del libro activo. Se debe restaurar la referencia acreditada.',
  SOURCE_ACTIVE_RUN_CHANGED:'Cambió el libro activo. Actualiza la propuesta antes de aplicarla.',
  PROPOSAL_PLAN_CHANGED:'Los datos cambiaron desde la vista previa. Actualiza para aplicar el saldo y el recibo actuales.',
  PROPOSAL_RESOLUTION_STALE:'La vinculación guardada corresponde a datos anteriores. Revisa el recibo actual y confirma la vinculación nuevamente.',
  SOURCE_ATTESTATION_REQUIRED:'Confirma que revisaste la fuente y que corresponde al recibo seleccionado. Vincular no aplica todavía ningún pago.',
  SOURCE_DATE_INVALID:'Indica una fecha válida del documento de origen.',
  SOURCE_BANK_PAID_DATE_REQUIRED:'¿Qué fecha real de pago acredita el soporte bancario?',
  SOURCE_PAYMENT_AFTER_EVIDENCE_DATE:'La fecha de pago no puede ser posterior al corte de la evidencia.',
  SOURCE_PENDING_STATEMENT_IS_NOT_PAYMENT:'Un estado de cuenta de pendientes no acredita la fecha real de pago.',
  SOURCE_EVIDENCE_TYPE_CONFLICT:'El tipo seleccionado contradice el tipo ya acreditado por el documento. Se conserva la fuente original.',
  PROPOSAL_MANUAL_APPLICATION_DISABLED:'La configuración vigente deshabilita la aplicación manual de conciliaciones.',
  PROPOSAL_FINANCIAL_TARGET_NOT_UNIQUE:'El recibo no tiene una única obligación activa y un cobro compatible. Hay que corregir ese vínculo antes de aplicar.',
  PROPOSAL_FINANCIAL_TARGET_MISMATCH:'El cobro o la cartera vinculados contradicen el país, cliente, póliza, moneda o importe del recibo. No se aplicó dinero; debe corregirse esa relación.',
  TARGET_ALREADY_PAID:'El recibo ya tiene un pago. Debe vincularse la evidencia a ese pago, sin generar un segundo cobro.',
  EXPECTED_RECEIPT_COUNT_MISMATCH:'El calendario de cuotas no coincide con el plan acreditado; hay que corregir el calendario antes de inferir.',
  TENANT_CONFIG_REQUIRES_HUMAN_CONFIRMATION:'La configuración todavía exige una confirmación adicional para inferencias. Debe reconciliarse con la autorización vigente.',
  TENANT_HIGH_CONFIDENCE_AUTO_COMMIT_NOT_ENABLED:'La configuración del tenant aún no habilita la aplicación de coincidencias de alta confianza.'
});
function review(reason, extra) {
  return Object.assign({ok:true,status:'REVIEW_REQUIRED',eligible:false,reviewRequired:true,
    reason,question:QUESTIONS[reason]||'La fuente requiere un dato concreto antes de aplicar: '+reason,
    writes:0,serverOwned:true},extra||{});
}
function verifiedStage(row, documentId, tenantId, runId, manifest, kind) {
  if (!row || row.documentId!==documentId || row.tenantId!==tenantId || row.runId!==runId ||
      row.documentClass!==kind || !SHA.test(text(row.sourceRowIdSha256)) || !text(row.sourceRowId) ||
      row.sourceLedgerDigest!==manifest.sourceLedgerDigest || row.packageLogicalSha256!==manifest.packageLogicalSha256 ||
      !SHA.test(text(row.payloadDigest))) return false;
  const original = Object.assign({},row);
  for (const key of ['runId','documentClass','activationState','sourceLedgerDigest','packageLogicalSha256','payloadDigest']) delete original[key];
  return digest(original)===row.payloadDigest;
}
function paid(row) { return row&&(/^(?:PAID_|APPLIED_)/.test(text(row.paymentState)) || /^pagado$/i.test(text(row.estado))); }
function validDate(value) {
  const raw=text(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw)&&!Number.isNaN(Date.parse(raw+'T00:00:00Z'))&&
    new Date(raw+'T00:00:00Z').toISOString().slice(0,10)===raw;
}
function amount(row) {
  const raw=first(row,['monto','montoTotal','primaTotal','saldo']);
  return raw==null||raw===''?null:Number(raw);
}
function canonicalEvidence(proposal,evidence,policy,receipt,evidenceRef) {
  const kind=evidenceKind(first(evidence,['evidenceType','type','sourceType']));
  if(!kind)return review('SOURCE_EVIDENCE_TYPE_MISSING');
  if(evidence.partialPayment===true||evidence.pagoParcial===true)return review('SOURCE_PARTIAL_PAYMENT_REQUIRES_ALLOCATION');
  if(kind==='BANK_STATEMENT_MATCH'&&evidence.paymentConfirmed!==true&&evidence.paid!==true&&
      !/^PAID_(DIRECT|REPORTED)$/.test(text(evidence.paymentState)))return review('SOURCE_BANK_PAYMENT_NOT_PROVEN');
  const currency=text(first(evidence,['currency','moneda'])).toUpperCase();
  const receiptCurrency=text(receipt.moneda||receipt.currency||policy.moneda).toUpperCase();
  if(!currency)return review('SOURCE_CURRENCY_REQUIRED');
  if(currency!==receiptCurrency||(policy.moneda&&currency!==text(policy.moneda).toUpperCase()))return review('SOURCE_RECEIPT_CURRENCY_MISMATCH');
  const raw=first(evidence,['amount','monto']);
  const sourceAmount=raw==null||raw===''?null:Number(raw);
  const receiptAmount=amount(receipt);
  if(sourceAmount!=null&&!Number.isFinite(sourceAmount))return review('SOURCE_RECEIPT_AMOUNT_MISMATCH');
  if(['BANK_STATEMENT_MATCH','INVOICE_INSTALLMENT_N'].includes(kind)&&
      (!Number.isFinite(sourceAmount)||sourceAmount<=0||!Number.isFinite(receiptAmount)||receiptAmount<=0||
       Math.abs(sourceAmount*100-Math.round(sourceAmount*100))>1e-6||Math.round(sourceAmount*100)!==Math.round(receiptAmount*100)))
    return review('SOURCE_RECEIPT_AMOUNT_MISMATCH');
  const out={policyId:policy.id,receiptId:receipt.id,evidenceType:kind,evidenceId:evidenceRef,sourceRef:evidenceRef,
    currency,amount:kind==='COMMISSION_STATEMENT_INSTALLMENT_N'?null:sourceAmount,uniqueMatch:true,
    conflictingEvidence:evidence.conflictingEvidence===true,reversal:evidence.reversal===true,
    allowPriorContiguousInference:evidence.allowPriorContiguousInference===true,
    actualPaidDateEvidence:evidence.actualPaidDateEvidence===true,
    evidenceAsOfDate:text(evidence.evidenceAsOfDate||evidence.fechaCorteEvidencia||evidence.reportedDate),
    paidDate:text(evidence.paidDate||evidence.fechaPago),applicationDate:text(evidence.applicationDate||evidence.fechaAplicacion),
    invoiceDate:text(evidence.invoiceDate||evidence.fechaFactura),invoiceNumber:text(evidence.invoiceNumber||evidence.numeroFactura),
    totalInstallments:evidence.totalInstallments||evidence.totalCuotas||null,
    explicitInstallmentException:evidence.explicitInstallmentException===true,
    installmentExceptionReference:text(evidence.installmentExceptionReference),
    paymentMethod:text(evidence.paymentMethod||evidence.metodoPago),
    paymentSupportDocumentRef:text(evidence.paymentSupportDocumentRef),invoiceDocumentRef:text(evidence.invoiceDocumentRef)};
  // reportedDate is only the observation date, never the real payment date.
  if(kind!=='BANK_STATEMENT_MATCH'&&!out.actualPaidDateEvidence)out.paidDate='';
  return {ok:true,evidencePayload:out,sourceAmount};
}

function syntheticLedgerValid(pointer,manifest,tenantId,runId) {
  const sourceIntake=require('./cobros-source-intake-v2');
  if(pointer&&pointer.schemaVersion===sourceIntake.POINTER_SCHEMA||manifest&&manifest.schemaVersion===sourceIntake.MANIFEST_SCHEMA){
    if(!sourceIntake.QA_RUN.test(runId)||!pointer||!manifest||pointer.__syntheticQa!==true||manifest.__syntheticQa!==true||
       pointer.qaRunId!==runId||manifest.qaRunId!==runId||pointer.activeRunId!==runId||manifest.runId!==runId||
       !Array.isArray(manifest.retainedRuns)||manifest.retainedRuns.length!==0)return false;
    try{sourceIntake.validateSourceRunContract(pointer,manifest,tenantId);return true;}catch(_){return false;}
  }
  return /^cobledgerqa_[a-z0-9_]{12,80}$/.test(runId)&&pointer&&manifest&&
    pointer.__syntheticQa===true&&manifest.__syntheticQa===true&&pointer.qaRunId===runId&&manifest.qaRunId===runId&&
    pointer.activeRunId===runId&&manifest.id===runId&&manifest.runId===runId&&manifest.tenantId===tenantId&&
    pointer.schemaVersion==='gi-i66-synthetic-proposal-pointer-v1'&&manifest.schemaVersion==='gi-i66-synthetic-proposal-ledger-v1'&&
    pointer.status==='ACTIVE'&&manifest.status==='ACTIVE'&&manifest.sourceLedgerCount===1&&manifest.stageDocumentCount===2&&
    SHA.test(text(manifest.sourceLedgerDigest))&&SHA.test(text(manifest.packageLogicalSha256))&&
    pointer.sourceLedgerDigest===manifest.sourceLedgerDigest&&pointer.packageLogicalSha256===manifest.packageLogicalSha256;
}
async function assessProposalApplication({tenantId,payload,read,items,runRef,control,assertScope,config,syntheticQaRun=''}) {
  const proposalId=text(payload.proposalId),requestedRun=text(payload.sourceRunId);
  if(!ID.test(proposalId))return review('SOURCE_LEDGER_INTEGRITY_MISMATCH');
  const pointerSnap=await read(control?control():items('cobrosLedgerControl').doc('active'));
  const pointer=pointerSnap.exists?pointerSnap.data():null;
  const runId=text(pointer&&pointer.activeRunId);
  if(!ID.test(runId)||requestedRun&&requestedRun!==runId)return review('SOURCE_ACTIVE_RUN_CHANGED');
  const manifestSnap=await read(runRef(runId));
  const manifest=manifestSnap.exists?manifestSnap.data():null;
  if(syntheticQaRun){
    if(runId!==syntheticQaRun||!syntheticLedgerValid(pointer,manifest,tenantId,runId))return review('SOURCE_LEDGER_INTEGRITY_MISMATCH');
  }else{try{validateActiveLedgerContract(pointer,manifest,tenantId);}catch(_){return review('SOURCE_LEDGER_INTEGRITY_MISMATCH');}}
  const applicationId='propapp_'+digest({tenantId,runId,proposalId}).slice(0,28);
  const applicationRef=items('reconciliationApplications').doc(applicationId);
  const prior=await read(applicationRef);
  if(prior.exists&&prior.data().status==='APPLIED'){
    if(syntheticQaRun&&(prior.data().__syntheticQa!==true||prior.data().qaRunId!==syntheticQaRun))
      return review('PROPOSAL_QA_APPLICATION_NOT_SYNTHETIC');
    assertScope(prior.data().scopeAnchor||{pais:prior.data().pais});
    return {ok:true,status:'ALREADY_APPLIED',eligible:false,applicationId,applicationRef,
      sourceRunId:runId,proposalId,result:prior.data().result,record:prior.data(),writes:0,serverOwned:true};
  }
  const stage=runRef(runId);
  const pSnap=await read(stage.collection('propuestasConciliacion').doc(proposalId));
  const proposal=pSnap.exists?pSnap.data():null;
  if(!verifiedStage(proposal,proposalId,tenantId,runId,manifest,'propuestasConciliacion'))return review('SOURCE_LEDGER_INTEGRITY_MISMATCH');
  const evidenceSnap=await read(stage.collection('evidenciasCobro').where('sourceRowIdSha256','==',proposal.sourceRowIdSha256).limit(2));
  if(evidenceSnap.docs.length!==1)return review('SOURCE_EVIDENCE_NOT_UNIQUE');
  const eDoc=evidenceSnap.docs[0],sourceEvidence=eDoc.data();
  let evidence=sourceEvidence;
  if(!verifiedStage(evidence,eDoc.id,tenantId,runId,manifest,'evidenciasCobro')||
      evidence.sourceRowId!==proposal.sourceRowId||text(evidence.policyNumber)!==text(proposal.policyNumber))
    return review('SOURCE_LEDGER_INTEGRITY_MISMATCH');
  if(syntheticQaRun&&[proposal,evidence].some(row=>row.__syntheticQa!==true||row.qaRunId!==syntheticQaRun))
    return review('PROPOSAL_QA_SOURCE_NOT_SYNTHETIC');
  // Resolve a canonical edition using authoritative IDs or exact receipt +
  // validity. Never turn a unique policy-number match alone into a payment.
  const resolutionRef=items('reconciliationResolutions').doc(applicationId.replace(/^propapp_/,'propres_'));
  const resolutionSnap=await read(resolutionRef),resolution=resolutionSnap.exists?resolutionSnap.data():null;
  const resolutionCore=resolution&&Object.fromEntries(['schemaVersion','tenantId','sourceRunId','proposalId','sourceProposalDigest',
    'sourceEvidenceDigest','policyId','receiptId','evidenceType','currency','evidenceAsOfDate','paidDate','sourceAttestation','targetDigest','actor']
    .map(key=>[key,resolution[key]]));
  const wantsResolution=payload.resolutionDraft===true;
  const bindingValid=!wantsResolution&&resolution&&resolution.schemaVersion==='gi-proposal-resolution-v1'&&
    resolution.tenantId===tenantId&&resolution.sourceRunId===runId&&resolution.proposalId===proposalId&&
    resolution.sourceProposalDigest===proposal.payloadDigest&&resolution.sourceEvidenceDigest===sourceEvidence.payloadDigest&&
    resolution.sourceAttestation===true&&ID.test(text(resolution.policyId))&&ID.test(text(resolution.receiptId))&&
    !!evidenceKind(resolution.evidenceType)&&ID.test(text(resolution.actor&&resolution.actor.uid))&&
    resolution.resolutionDigest===digest(resolutionCore);
  if(bindingValid)evidence=Object.assign({},sourceEvidence,{
    evidenceType:resolution.evidenceType,policyId:resolution.policyId,receiptId:resolution.receiptId,
    currency:resolution.currency,evidenceAsOfDate:resolution.evidenceAsOfDate,paidDate:resolution.paidDate,
    actualPaidDateEvidence:!!resolution.paidDate,paymentConfirmed:resolution.evidenceType==='BANK_STATEMENT_MATCH',
    uniqueMatch:true,sourceAttestation:true
  });
  const policySnap=await read(items('polizas').where('numero','==',text(proposal.policyNumber)).limit(21));
  if(policySnap.docs.length>20)return review('SOURCE_POLICY_EDITION_AMBIGUOUS');
  let policies=policySnap.docs.map(d=>Object.assign({id:d.id},d.data()));
  const expectedPolicy=text(first(evidence,['policyId','polizaId'])||first(proposal,['policyId','polizaId']));
  if(expectedPolicy)policies=policies.filter(p=>p.id===expectedPolicy);
  const sourceStart=text(first(evidence,['vigenciaDesde','inicioVigencia','vigenciaInicio','policyStartDate']));
  const sourceEnd=text(first(evidence,['vigenciaHasta','finVigencia','vigenciaFin','policyEndDate']));
  if(sourceStart)policies=policies.filter(p=>text(first(p,['vigenciaDesde','inicioVigencia','fechaInicio','vigenciaInicio']))===sourceStart);
  if(sourceEnd)policies=policies.filter(p=>text(first(p,['vigenciaHasta','finVigencia','fechaFin','vigenciaFin']))===sourceEnd);
  const insurer=text(first(evidence,['aseguradoraId','insurerId']));
  if(insurer)policies=policies.filter(p=>text(p.aseguradoraId||p.insurerId)===insurer);
  if(!policies.length)return review('SOURCE_POLICY_EDITION_NOT_FOUND');
  const receiptId=text(first(evidence,['receiptId','reciboId'])||first(proposal,['receiptId','reciboId']));
  const receiptNumber=text(first(evidence,['receiptNumber','numeroRecibo','reciboNumero','numeroReciboFuente']));
  const candidates=[];
  // The selector is assembled from canonical, authorized records. It never
  // offers another tenant/country/adviser's receipt or accepts caller amounts.
  const matches=[];
  for(const policy of policies){
    // Do not return an out-of-scope policy's data or treat it as a candidate.
    try{assertScope(policy);}catch(_){continue;}
    if(policy.tenantId&&policy.tenantId!==tenantId)continue;
    if(syntheticQaRun&&(policy.__syntheticQa!==true||policy.qaRunId!==syntheticQaRun))continue;
    const rs=await read(items('recibosEsperados').where('polizaId','==',policy.id).limit(101));
    if(rs.docs.length>100)return review('SOURCE_RECEIPT_NOT_UNIQUE');
    const receipts=rs.docs.map(d=>Object.assign({id:d.id},d.data()));
    for(const receipt of receipts){
      if(receipt.tenantId&&receipt.tenantId!==tenantId)continue;
      if(syntheticQaRun&&(receipt.__syntheticQa!==true||receipt.qaRunId!==syntheticQaRun))continue;
      try{assertScope(policy,receipt);}catch(_){continue;}
      if(receipt.clienteId&&policy.clienteId&&receipt.clienteId!==policy.clienteId)continue;
      candidates.push({policy,receipt,receipts});
      if(!receiptId&&!receiptNumber)continue;
      if(receiptId?receipt.id!==receiptId:
          !['numeroReciboFuente','numeroRecibo','reciboNumero','numero','requerimiento'].some(k=>text(receipt[k])===receiptNumber))continue;
      matches.push({policy,receipt,receipts});
    }
  }
  const resolutionOptions=candidates.slice(0,100).map(({policy,receipt})=>({
    policyId:policy.id,receiptId:receipt.id,policyNumber:text(policy.numero),
    policyTerm:[text(first(policy,['vigenciaDesde','inicioVigencia','fechaInicio','vigenciaInicio'])),text(first(policy,['vigenciaHasta','finVigencia','fechaFin','vigenciaFin']))].filter(Boolean).join(' — '),
    installment:text(first(receipt,['cuota','numeroCuota','secuencia'])),
    receiptNumber:text(first(receipt,['numeroReciboFuente','numeroRecibo','reciboNumero','requerimiento','numero'])),
    dueDate:text(first(receipt,['vence','fechaVencimiento','fechaLimite'])),amount:amount(receipt),
    currency:text(receipt.moneda||receipt.currency||policy.moneda).toUpperCase(),alreadyPaid:paid(receipt)
  }));
  const resolutionView={resolutionOptions,resolutionOptionsTruncated:candidates.length>100,
    source:{policyNumber:text(proposal.policyNumber),amount:sourceEvidence.amount==null?null:sourceEvidence.amount,currency:text(sourceEvidence.currency||sourceEvidence.moneda),
      reportedDate:text(sourceEvidence.reportedDate),sourceRowId:text(sourceEvidence.sourceRowId),
      paidDate:text(sourceEvidence.paidDate||sourceEvidence.fechaPago),
      evidenceType:evidenceKind(first(sourceEvidence,['evidenceType','type','sourceType']))},
    sourceRunId:runId,proposalId};
  if(wantsResolution)return {ok:true,status:'RESOLUTION_DRAFT',sourceRunId:runId,proposalId,
    applicationId,applicationRef,resolutionRef,resolution,proposal,sourceEvidence,evidenceRef:eDoc.id,
    candidates,resolutionView,syntheticQaRun,writes:0,serverOwned:true};
  if(!receiptId&&!receiptNumber)return review('SOURCE_RECEIPT_IDENTITY_MISSING',resolutionView);
  if(matches.length!==1)return review(matches.length>1?'SOURCE_POLICY_EDITION_AMBIGUOUS':'SOURCE_RECEIPT_NOT_UNIQUE',resolutionView);
  const {policy,receipt,receipts}=matches[0];
  if(bindingValid&&resolution.targetDigest!==digest({policy,receipt}))return review('PROPOSAL_RESOLUTION_STALE',resolutionView);
  const canonical=canonicalEvidence(proposal,evidence,policy,receipt,
    stage.path+'/evidenciasCobro/'+eDoc.id);
  if(!canonical.evidencePayload)return Object.assign(canonical,resolutionView);
  // This command always requires a signed, authorized user's separate Apply
  // action. Preview evaluates that manual path without changing any records.
  const humanApproval={authorized:true,reference:bindingValid?resolutionRef.path:applicationRef.path};
  const plan=planEvidence({policy,receipts,evidence:canonical.evidencePayload,reconciliationConfig:config,humanApproval});
  if(plan.autoCommit!==true)return review(plan.reason,Object.assign({scheduleCorrectionRequired:plan.scheduleCorrectionRequired===true},resolutionView));
  if(!plan.targets.length)return {ok:true,status:'NOOP_ALREADY_SATISFIED',eligible:false,writes:0,serverOwned:true,
    question:'La evidencia no identifica cuotas pendientes que deban aplicarse.'};
  if(plan.targets.length>30)return review('PROPOSAL_TARGET_BOUND_EXCEEDED');
  if(plan.targets.some(t=>{const r=receipts.find(row=>row.id===t.receiptId),a=amount(r);return !r||!Number.isFinite(a)||a<=0;}))
    return review('SOURCE_RECEIPT_AMOUNT_MISMATCH');
  for(const target of plan.targets){
    const row=receipts.find(r=>r.id===target.receiptId);
    try{assertScope(policy,row);}catch(_){return review('TARGET_SCOPE_OR_RELATION_MISMATCH');}
    if(row.polizaId!==policy.id||row.tenantId&&row.tenantId!==tenantId||
        syntheticQaRun&&(row.__syntheticQa!==true||row.qaRunId!==syntheticQaRun)||
        row.clienteId&&policy.clienteId&&row.clienteId!==policy.clienteId||
        text(row.moneda||row.currency||policy.moneda).toUpperCase()!==canonical.evidencePayload.currency)
      return review('TARGET_SCOPE_OR_RELATION_MISMATCH');
  }
  // This entrypoint applies unpaid obligations. Existing paid receipts retain
  // the established enrichment owner; they never become another collection.
  if(plan.targets.some(t=>paid(receipts.find(r=>r.id===t.receiptId))))return review('TARGET_ALREADY_PAID');
  const planDigest=digest({tenantId,runId,proposalId,proposalDigest:proposal.payloadDigest,
    evidenceDigest:sourceEvidence.payloadDigest,resolutionDigest:bindingValid?resolution.resolutionDigest:null,policy,receipts,config,evidencePayload:canonical.evidencePayload,plan});
  return {ok:true,status:'READY_TO_APPLY',eligible:true,applicationId,applicationRef,
    sourceRunId:runId,proposalId,planDigest,policy,receipts,plan,config,
    evidencePayload:canonical.evidencePayload,sourceAmount:canonical.sourceAmount,
    sourceEvidenceDigest:sourceEvidence.payloadDigest,sourceProposalDigest:proposal.payloadDigest,
    resolutionId:bindingValid?resolutionRef.id:null,syntheticQaRun,
    writes:0,serverOwned:true};
}
function publicAssessment(context) {
  if(context.status==='ALREADY_APPLIED')return {ok:true,status:'ALREADY_APPLIED',eligible:false,
    applicationId:context.applicationId,sourceRunId:context.sourceRunId,proposalId:context.proposalId,
    result:context.result,writes:0,serverOwned:true};
  if(!context.eligible)return context;
  return {ok:true,status:'READY_TO_APPLY',eligible:true,sourceRunId:context.sourceRunId,
    proposalId:context.proposalId,planDigest:context.planDigest,policyNumber:text(context.policy.numero),
    currency:context.evidencePayload.currency,evidenceType:context.plan.evidenceType,
    targets:context.plan.targets.map(t=>({receiptId:t.receiptId,installment:t.installment,mode:t.mode,
      amount:amount(context.receipts.find(r=>r.id===t.receiptId)),paymentState:t.paymentState,applicationState:t.applicationState})),
    writes:0,serverOwned:true};
}
const applicationIdFor=(tenantId,runId,proposalId)=>'propapp_'+digest({tenantId,runId,proposalId}).slice(0,28);
function prepareResolution(context,payload,actor) {
  if(context.status!=='RESOLUTION_DRAFT')return context;
  const allowed=['proposalId','sourceRunId','policyId','receiptId','evidenceType','evidenceAsOfDate','paidDate','sourceAttestation'];
  if(Object.keys(payload).some(key=>!allowed.includes(key)))return review('PROPOSAL_CALLER_FINANCIAL_PAYLOAD_DENIED');
  const kind=evidenceKind(payload.evidenceType),asOf=text(payload.evidenceAsOfDate||context.sourceEvidence.reportedDate),paidDate=text(payload.paidDate);
  if(!kind)return review('SOURCE_EVIDENCE_TYPE_MISSING');
  const originalKind=evidenceKind(first(context.sourceEvidence,['evidenceType','type','sourceType']));
  if(originalKind&&originalKind!==kind)return review('SOURCE_EVIDENCE_TYPE_CONFLICT');
  if(payload.sourceAttestation!==true)return review('SOURCE_ATTESTATION_REQUIRED');
  if(!validDate(asOf)||paidDate&&!validDate(paidDate))return review('SOURCE_DATE_INVALID');
  if(paidDate&&paidDate>asOf)return review('SOURCE_PAYMENT_AFTER_EVIDENCE_DATE');
  const matches=context.candidates.filter(c=>c.policy.id===text(payload.policyId)&&c.receipt.id===text(payload.receiptId));
  if(matches.length!==1)return review('SOURCE_RECEIPT_NOT_UNIQUE');
  const {policy,receipt}=matches[0],currency=text(receipt.moneda||receipt.currency||policy.moneda).toUpperCase();
  if(paid(receipt))return review('TARGET_ALREADY_PAID');
  const fromSource=text(context.sourceEvidence.currency||context.sourceEvidence.moneda).toUpperCase();
  if(!fromSource||!currency||currency!==fromSource)return review('SOURCE_RECEIPT_CURRENCY_MISMATCH');
  const rawSource=first(context.sourceEvidence,['amount','monto']);
  const sourceAmount=rawSource==null?null:Number(rawSource),receiptAmount=amount(receipt);
  if(['BANK_STATEMENT_MATCH','INVOICE_INSTALLMENT_N'].includes(kind)&&
      (!Number.isFinite(sourceAmount)||sourceAmount<=0||!Number.isFinite(receiptAmount)||receiptAmount<=0||
       Math.abs(sourceAmount*100-Math.round(sourceAmount*100))>1e-6||Math.round(sourceAmount*100)!==Math.round(receiptAmount*100)))
    return review('SOURCE_RECEIPT_AMOUNT_MISMATCH');
  if(kind==='BANK_STATEMENT_MATCH'&&!paidDate)return review('SOURCE_BANK_PAID_DATE_REQUIRED');
  if(kind==='INSURER_STATEMENT_PENDING_FROM_N'&&paidDate)return review('SOURCE_PENDING_STATEMENT_IS_NOT_PAYMENT');
  const record={schemaVersion:'gi-proposal-resolution-v1',tenantId:context.proposal.tenantId,
    sourceRunId:context.sourceRunId,proposalId:context.proposalId,sourceProposalDigest:context.proposal.payloadDigest,
    sourceEvidenceDigest:context.sourceEvidence.payloadDigest,policyId:policy.id,receiptId:receipt.id,
    evidenceType:kind,currency,evidenceAsOfDate:asOf,paidDate,sourceAttestation:true,
    targetDigest:digest({policy,receipt}),actor};
  record.resolutionDigest=digest(record);
  return {ok:true,status:'RESOLUTION_READY',record,resolutionRef:context.resolutionRef,
    previous:context.resolution,writes:0,serverOwned:true};
}
module.exports={assessProposalApplication,publicAssessment,canonicalEvidence,verifiedStage,review,digest,amount,applicationIdFor,prepareResolution};
