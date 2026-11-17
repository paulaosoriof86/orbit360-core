'use strict';

// The existing reconciliation callable owns source admission. This helper has
// no SDK, credentials, transport, or payment writer. All hashes/IDs below are
// server-derived; financial application remains a separate approved command.
const crypto=require('node:crypto');
const INPUT_SCHEMA='gi-cobros-source-intake-v2';
const POINTER_SCHEMA='gi-cobros-ledger-active-pointer-v2';
const MANIFEST_SCHEMA='gi-cobros-ledger-run-manifest-v2';
const CONTRACT_VERSION='I6.6-source-intake-v2';
const OWNER='cobros-reconciliation-domain/intake_source_run';
const MAX_ROWS=100,MAX_RETAINED_RUNS=512;
const SHA=/^[a-f0-9]{64}(?![\s\S])/;
const ID=/^[A-Za-z0-9][A-Za-z0-9._:-]{1,179}(?![\s\S])/;
const RUN=/^cobledger_v2_[a-f0-9]{28}(?![\s\S])/;
const QA_SOURCE=/^b3005qa_i66_intake_[a-z0-9_]{12,80}(?![\s\S])/;
const QA_RUN=/^cobledgerqa_[a-f0-9]{28}(?![\s\S])/;
const TYPES=new Set(['INSURER_STATEMENT_PENDING_FROM_N','COMMISSION_STATEMENT_INSTALLMENT_N','INVOICE_INSTALLMENT_N','BANK_STATEMENT_MATCH']);
const CLASSES=['pagosReportados','evidenciasCobro','propuestasConciliacion','conciliacionHolds'];
const stable=v=>v==null?v:Array.isArray(v)?v.map(stable):typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
const digest=v=>crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
function fail(code){const e=new Error(code);e.code=code;throw e;}
function exact(value,max,code,optional=false){
 if(optional&&(value==null||value===''))return '';
 if(typeof value!=='string'||!value||value.length>max||value!==value.trim()||/[\u0000-\u001f\u007f]/.test(value))fail(code);
 return value;
}
function identifier(value,code,optional=false){const s=exact(value,180,code,optional);if(s&&!ID.test(s))fail(code);return s;}
function plain(value,code){if(!value||typeof value!=='object'||Array.isArray(value))fail(code);return value;}
function fields(value,allowed,code){plain(value,code);if(Object.keys(value).some(k=>!allowed.includes(k)))fail(code);}
function iso(value,code,optional=false){
 const s=exact(value,10,code,optional);if(!s)return '';
 if(!/^\d{4}-\d{2}-\d{2}(?![\s\S])/.test(s)||Number.isNaN(Date.parse(s+'T00:00:00Z'))||new Date(s+'T00:00:00Z').toISOString().slice(0,10)!==s)fail(code);
 return s;
}
function bool(value,code){if(value!=null&&typeof value!=='boolean')fail(code);return value===true;}
function nullableAmount(value){
 if(value==null||value==='')return null;
 if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>1000000000||Math.abs(value*100-Math.round(value*100))>1e-6)fail('SOURCE_AMOUNT_INVALID');
 return Math.round(value*100)/100;
}
function driveReference(value){
 const s=exact(value,500,'SOURCE_DOCUMENT_REFERENCE_REQUIRED');
 if(/^(?:(?:drive|gdrive):)?[A-Za-z0-9_-]{10,180}(?![\s\S])/.test(s))return s;
 if(/^https:\/\/drive\.google\.com\/file\/d\/[A-Za-z0-9_-]{10,180}\/view(?![\s\S])/.test(s)||
    /^https:\/\/drive\.google\.com\/open\?id=[A-Za-z0-9_-]{10,180}(?![\s\S])/.test(s))return s;
 fail('SOURCE_DOCUMENT_REFERENCE_INVALID');
}
function numberPair(row){
 const raw=row.installment==null?'':String(row.installment);
 const m=/^(\d{1,3})(?:\/(\d{1,3}))?(?![\s\S])/.exec(raw);
 if(raw&&!m)fail('SOURCE_INSTALLMENT_INVALID');
 const n=m?Number(m[1]):null;
 const t=row.totalInstallments==null||row.totalInstallments===''?(m&&m[2]?Number(m[2]):null):row.totalInstallments;
 if(t!=null&&(!Number.isInteger(t)||t<1||t>100))fail('SOURCE_INSTALLMENT_TOTAL_INVALID');
 if(m&&m[2]&&Number(m[2])!==t||n!=null&&(!Number.isInteger(n)||n<1||n>100||t&&n>t))fail('SOURCE_INSTALLMENT_INVALID');
 return {installment:n==null?'':String(n)+(t?'/'+t:''),installmentIndex:n,totalInstallments:t};
}
function canonicalPolicyDate(policy,edge){
 const names=edge==='start'?['vigenciaInicio','vigenciaDesde','inicioVigencia','fechaInicio']:['vigenciaFin','vigenciaHasta','finVigencia','fechaFin'];
 const values=names.map(key=>policy&&policy[key]).filter(value=>value!=null&&value!=='').map(value=>String(value).trim());
 return values.length&&new Set(values).size===1?values[0]:'';
}
function matchesCanonicalInstallment(sourceRow,policy,receipt){
 const declared=/^(\d+)(?:\/(\d+))?(?![\s\S])/.exec(String(sourceRow&&sourceRow.installment||''));
 if(!declared)return false;
 const indices=[],totals=[];
 for(const value of [receipt&&receipt.secuencia,receipt&&receipt.cuota,receipt&&receipt.numeroCuota]){
  if(value==null||value==='')continue;
  const pair=/^(\d+)(?:\s*(?:\/|de)\s*(\d+))?(?![\s\S])/i.exec(String(value));
  if(!pair)return false;indices.push(Number(pair[1]));if(pair[2])totals.push(Number(pair[2]));
 }
 for(const value of [policy&&policy.cuotas,receipt&&receipt.totalInstallments,receipt&&receipt.totalCuotas]){
  if(value==null||value==='')continue;
  if(!/^\d{1,3}(?![\s\S])/.test(String(value)))return false;totals.push(Number(value));
 }
 if(!indices.length||indices.some(n=>n<1||n>100||n!==Number(declared[1]))||totals.some(t=>t<1||t>100)||new Set(totals).size>1)return false;
 return !declared[2]||totals.length>0&&totals.every(total=>total===Number(declared[2]));
}
function prepareInput(tenantId,payload){
 fields(payload,['schemaVersion','source','sourceAttestation','rows'],'SOURCE_INTAKE_PAYLOAD_INVALID');
 if(payload.schemaVersion!==INPUT_SCHEMA||payload.sourceAttestation!==true)fail('SOURCE_ATTESTATION_REQUIRED');
 fields(payload.source,['sourceId','documentRef','fileName','sha256','evidenceAsOfDate','country','currency','evidenceType','insurerId','completePolicyGroups','extractionFile'],'SOURCE_METADATA_INVALID');
 const s=payload.source;
 const source={sourceId:identifier(s.sourceId,'SOURCE_ID_REQUIRED'),documentRef:driveReference(s.documentRef),
  fileName:exact(s.fileName,180,'SOURCE_FILE_NAME_REQUIRED'),sha256:exact(s.sha256,64,'SOURCE_SHA256_REQUIRED'),
  evidenceAsOfDate:iso(s.evidenceAsOfDate,'SOURCE_CUT_DATE_INVALID'),country:exact(s.country,2,'SOURCE_COUNTRY_REQUIRED'),
  currency:exact(s.currency,3,'SOURCE_CURRENCY_REQUIRED'),evidenceType:exact(s.evidenceType,80,'SOURCE_EVIDENCE_TYPE_REQUIRED'),
  insurerId:identifier(s.insurerId,'SOURCE_INSURER_ID_REQUIRED'),completePolicyGroups:bool(s.completePolicyGroups,'SOURCE_GROUP_ATTESTATION_INVALID')};
 if(s.extractionFile!=null){
  fields(s.extractionFile,['fileName','sha256'],'SOURCE_EXTRACTION_METADATA_INVALID');
  source.extractionFile={fileName:exact(s.extractionFile.fileName,180,'SOURCE_EXTRACTION_FILE_NAME_INVALID'),sha256:exact(s.extractionFile.sha256,64,'SOURCE_EXTRACTION_SHA256_INVALID')};
  if(!SHA.test(source.extractionFile.sha256))fail('SOURCE_EXTRACTION_SHA256_INVALID');
 }
 if(!SHA.test(source.sha256))fail('SOURCE_SHA256_INVALID');
 if(!['GT','CO'].includes(source.country)||!['GTQ','COP','USD'].includes(source.currency)||source.country==='GT'&&source.currency==='COP'||source.country==='CO'&&source.currency==='GTQ')fail('SOURCE_COUNTRY_CURRENCY_MISMATCH');
 if(!TYPES.has(source.evidenceType))fail('SOURCE_EVIDENCE_TYPE_UNSUPPORTED');
 if(!Array.isArray(payload.rows)||!payload.rows.length||payload.rows.length>MAX_ROWS)fail('SOURCE_ROW_BOUND_EXCEEDED');
 const sourceKey='source_'+digest({tenantId,sha256:source.sha256,country:source.country,insurerId:source.insurerId}).slice(0,40);
 // A filename is presentation only, never identity or permission.
 const metadata=Object.assign({},source);delete metadata.fileName;
 const sourceDigest=digest({tenantId,source:metadata});
 const seen=new Set(),rows=payload.rows.map(input=>{
  fields(input,['rowId','sheet','rowNumber','policyNumber','policyId','receiptId','receiptNumber','installment','totalInstallments',
   'policyStartDate','policyEndDate','amount','paidDate','actualPaidDateEvidence','paymentConfirmed','invoiceNumber','invoiceDate',
   'applicationDate','paymentMethod','partialPayment','reversal','conflictingEvidence','explicitInstallmentException','installmentExceptionReference'],'SOURCE_ROW_FIELDS_INVALID');
  const row={rowId:identifier(input.rowId,'SOURCE_ROW_ID_REQUIRED'),sheet:exact(input.sheet,120,'SOURCE_SHEET_INVALID'),
   rowNumber:input.rowNumber==null?null:input.rowNumber,policyNumber:exact(input.policyNumber,180,'SOURCE_POLICY_NUMBER_REQUIRED'),
   policyId:identifier(input.policyId,'SOURCE_POLICY_ID_INVALID',true),receiptId:identifier(input.receiptId,'SOURCE_RECEIPT_ID_INVALID',true),
   receiptNumber:exact(input.receiptNumber,180,'SOURCE_RECEIPT_NUMBER_INVALID',true),...numberPair(input),
   policyStartDate:iso(input.policyStartDate,'SOURCE_POLICY_START_INVALID',true),policyEndDate:iso(input.policyEndDate,'SOURCE_POLICY_END_INVALID',true),
   amount:nullableAmount(input.amount),paidDate:iso(input.paidDate,'SOURCE_PAID_DATE_INVALID',true),
   actualPaidDateEvidence:bool(input.actualPaidDateEvidence,'SOURCE_PAID_DATE_ATTESTATION_INVALID'),paymentConfirmed:bool(input.paymentConfirmed,'SOURCE_PAYMENT_ATTESTATION_INVALID'),
   invoiceNumber:exact(input.invoiceNumber,180,'SOURCE_INVOICE_NUMBER_INVALID',true),invoiceDate:iso(input.invoiceDate,'SOURCE_INVOICE_DATE_INVALID',true),
   applicationDate:iso(input.applicationDate,'SOURCE_APPLICATION_DATE_INVALID',true),paymentMethod:exact(input.paymentMethod,120,'SOURCE_PAYMENT_METHOD_INVALID',true),
   partialPayment:bool(input.partialPayment,'SOURCE_PARTIAL_FLAG_INVALID'),reversal:bool(input.reversal,'SOURCE_REVERSAL_FLAG_INVALID'),
   conflictingEvidence:bool(input.conflictingEvidence,'SOURCE_CONFLICT_FLAG_INVALID'),
   explicitInstallmentException:bool(input.explicitInstallmentException,'SOURCE_INSTALLMENT_EXCEPTION_INVALID'),
   installmentExceptionReference:exact(input.installmentExceptionReference,500,'SOURCE_INSTALLMENT_EXCEPTION_INVALID',true)};
  if(!Number.isInteger(row.rowNumber)||row.rowNumber<1||row.rowNumber>1000000)fail('SOURCE_ROW_NUMBER_INVALID');
  if(row.policyStartDate&&row.policyEndDate&&row.policyStartDate>=row.policyEndDate)fail('SOURCE_POLICY_TERM_INVALID');
  if(row.paidDate&&(!row.actualPaidDateEvidence||row.paidDate>source.evidenceAsOfDate))fail('SOURCE_PAID_DATE_NOT_PROVEN');
  if(!row.paidDate&&row.actualPaidDateEvidence)fail('SOURCE_PAID_DATE_REQUIRED');
  if(source.evidenceType==='INSURER_STATEMENT_PENDING_FROM_N'&&(row.paidDate||row.actualPaidDateEvidence||row.paymentConfirmed))fail('SOURCE_PENDING_STATEMENT_IS_NOT_PAYMENT');
  if(row.explicitInstallmentException){
   try{driveReference(row.installmentExceptionReference);}catch(_){fail('SOURCE_INSTALLMENT_EXCEPTION_REFERENCE_REQUIRED');}
  }else if(row.installmentExceptionReference)fail('SOURCE_INSTALLMENT_EXCEPTION_INVALID');
  // A caller's label cannot manufacture a second physical source row.
  const locator=[row.sheet,row.rowNumber];
  row.key=digest({tenantId,sourceKey,locator});
  if(seen.has(row.key))fail('SOURCE_ROW_ID_DUPLICATE');seen.add(row.key);
  row.rowDigest=digest({tenantId,sourceDigest,row});
  row.isAnchor=true;
  return row;
 }).sort((a,b)=>a.key.localeCompare(b.key));
 const pendingGroups=[];
 if(source.evidenceType==='INSURER_STATEMENT_PENDING_FROM_N'){
  if(!source.completePolicyGroups)fail('SOURCE_COMPLETE_POLICY_GROUPS_REQUIRED');
  const groups=new Map();
  for(const row of rows){
   if(!row.installmentIndex||!row.totalInstallments)fail('SOURCE_PENDING_SEQUENCE_REQUIRED');
   const key=digest([row.policyNumber,row.policyId,row.policyStartDate,row.policyEndDate]);
   if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);
  }
  for(const group of groups.values()){
   group.sort((a,b)=>a.installmentIndex-b.installmentIndex);
   const total=group[0].totalInstallments,first=group[0].installmentIndex;
   if(group.some((r,i)=>r.totalInstallments!==total||r.installmentIndex!==first+i)||group.length!==total-first+1)fail('SOURCE_PENDING_SEQUENCE_INCOMPLETE_OR_DUPLICATE');
   group.forEach((r,i)=>{r.isAnchor=i===0;r.pendingFrom=first;});
   pendingGroups.push({id:digest({sourceKey,policy:[group[0].policyNumber,group[0].policyId,group[0].policyStartDate,group[0].policyEndDate]}),
    digest:digest(group.map(row=>({key:row.key,rowDigest:row.rowDigest}))),first,total});
  }
 }
 const batchDigest=digest({tenantId,sourceDigest,rows:rows.map(row=>({key:row.key,rowDigest:row.rowDigest,isAnchor:row.isAnchor}))});
 return {tenantId,source,sourceKey,sourceDigest,rows,pendingGroups,batchDigest,runId:'cobledger_v2_'+batchDigest.slice(0,28)};
}
function manifestDigest(manifest){
 const core=Object.assign({},manifest);
 for(const field of ['manifestContentDigest','activatedAt','createdAt'])delete core[field];
 return digest(core);
}
function pointerFor(manifest){const pointer={id:'active',schemaVersion:POINTER_SCHEMA,status:'ACTIVE',tenantId:manifest.tenantId,
 activeRunId:manifest.runId,contractVersion:CONTRACT_VERSION,owner:OWNER,sourceLedgerCount:manifest.sourceLedgerCount,
 sourceLedgerDigest:manifest.sourceLedgerDigest,packageLogicalSha256:manifest.packageLogicalSha256,
 aggregateDigest:manifest.expectedAggregateDigest,manifestContentDigest:manifest.manifestContentDigest,activatedAt:manifest.activatedAt};
 if(manifest.__syntheticQa===true)Object.assign(pointer,{__syntheticQa:true,qaRunId:manifest.qaRunId});return pointer;}
function validateSourceRunContract(pointer,manifest,tenantId){
 const bad=()=>fail('COBROS_LEDGER_V2_CONTRACT_INVALID');
 if(!pointer||!manifest||pointer.schemaVersion!==POINTER_SCHEMA||manifest.schemaVersion!==MANIFEST_SCHEMA||
    pointer.id!=='active'||pointer.status!=='ACTIVE'||manifest.status!=='ACTIVE'||manifest.activationState!=='ACTIVE'||
    !(RUN.test(manifest.runId)||QA_RUN.test(manifest.runId)&&manifest.__syntheticQa===true&&manifest.qaRunId===manifest.runId&&pointer.__syntheticQa===true&&pointer.qaRunId===manifest.runId)||manifest.id!==manifest.runId||pointer.activeRunId!==manifest.runId||
    manifest.tenantId!==tenantId||pointer.tenantId!==tenantId||manifest.owner!==OWNER||pointer.owner!==OWNER||
    manifest.contractVersion!==CONTRACT_VERSION||pointer.contractVersion!==CONTRACT_VERSION||
    !manifest.activatedAt||!pointer.activatedAt||!SHA.test(manifest.manifestContentDigest)||
    manifestDigest(manifest)!==manifest.manifestContentDigest||pointer.manifestContentDigest!==manifest.manifestContentDigest)bad();
 for(const key of ['sourceLedgerDigest','packageLogicalSha256'])if(!SHA.test(manifest[key])||pointer[key]!==manifest[key])bad();
 if(!SHA.test(manifest.expectedAggregateDigest)||pointer.aggregateDigest!==manifest.expectedAggregateDigest||
    !Number.isInteger(manifest.sourceLedgerCount)||manifest.sourceLedgerCount<1||manifest.sourceLedgerCount>MAX_ROWS||
    pointer.sourceLedgerCount!==manifest.sourceLedgerCount)bad();
 const counts=manifest.expectedCounts||{};
 if(Object.keys(counts).sort().join('|')!==CLASSES.slice().sort().join('|')||
    counts.pagosReportados!==0||counts.evidenciasCobro!==manifest.sourceLedgerCount||
    !Number.isInteger(counts.propuestasConciliacion)||counts.propuestasConciliacion<0||counts.propuestasConciliacion>counts.evidenciasCobro||
    !Number.isInteger(counts.conciliacionHolds)||counts.conciliacionHolds<0||counts.conciliacionHolds>counts.propuestasConciliacion||
    !Number.isInteger(manifest.holdProposalCount)||manifest.holdProposalCount<0||manifest.holdProposalCount>counts.propuestasConciliacion||
    manifest.stageDocumentCount!==CLASSES.reduce((sum,k)=>sum+counts[k],0))bad();
 if(['newCobros','receiptWrites','policyWrites','finmovWrites'].some(k=>manifest[k]!==0)||
    !manifest.actor||!ID.test(manifest.actor.uid)||!manifest.source||!SHA.test(manifest.source.sha256)||
    !Array.isArray(manifest.retainedRuns)||manifest.retainedRuns.length>MAX_RETAINED_RUNS)bad();
 const seen=new Set([manifest.runId]);
 for(const entry of manifest.retainedRuns){
  if(!entry||!ID.test(entry.runId)||seen.has(entry.runId)||!SHA.test(entry.manifestDigest)||
     !entry.pointer||entry.pointer.activeRunId!==entry.runId||entry.pointer.id!=='active'||entry.pointer.status!=='ACTIVE')bad();
  seen.add(entry.runId);
 }
 return Object.freeze({activeRunId:manifest.runId,aggregateDigest:manifest.expectedAggregateDigest});
}
function retentionOf(pointer,manifest){
 const retained=manifest.schemaVersion===MANIFEST_SCHEMA?manifest.retainedRuns.slice():[];
 if(retained.length>=MAX_RETAINED_RUNS)fail('SOURCE_RETAINED_RUN_BOUND_EXCEEDED');
 // Strip timestamp class objects from descriptor arrays. Real commit times
 // stay on each immutable manifest; no FieldValue transform enters an array.
 const previousPointer=Object.assign({},pointer,{activatedAt:'IMMUTABLE_MANIFEST_ACTIVATION'});
 retained.push({runId:manifest.runId,manifestDigest:manifestDigest(manifest),pointer:previousPointer});
 return retained;
}
async function ledgerCatalog({tenantId,read,controlRef,runRef,validate}){
 const p=await read(controlRef);if(!p.exists)fail('SOURCE_ACTIVE_LEDGER_MISSING');
 const pointer=p.data(),m=await read(runRef(pointer.activeRunId));if(!m.exists)fail('SOURCE_ACTIVE_LEDGER_MISSING');
 const manifest=m.data();validate(pointer,manifest,tenantId);
 const retained=manifest.schemaVersion===MANIFEST_SCHEMA?manifest.retainedRuns:[];
 return {pointer,manifest,entries:[{runId:manifest.runId,manifestDigest:manifestDigest(manifest),pointer},...retained.slice().reverse()]};
}
async function selectedLedger({tenantId,requestedRun,read,controlRef,runRef,validate}){
 const catalog=await ledgerCatalog({tenantId,read,controlRef,runRef,validate});
 const id=requestedRun||catalog.pointer.activeRunId;
 const entry=catalog.entries.find(item=>item.runId===id);
 if(!entry)fail('SOURCE_ACTIVE_RUN_CHANGED');
 const selected=id===catalog.manifest.runId?null:await read(runRef(id));
 const manifest=selected?(selected.exists?selected.data():null):catalog.manifest;
 if(!manifest||manifestDigest(manifest)!==entry.manifestDigest)fail('SOURCE_RETAINED_LEDGER_INTEGRITY_MISMATCH');
 validate(entry.pointer,manifest,tenantId);
 return {pointer:entry.pointer,manifest,catalog};
}
function stageRecord(kind,documentId,original,runId,ledgerDigest,packageDigest){
 const core=Object.assign({},original,{documentId});
 return Object.assign({},core,{runId,documentClass:kind,activationState:'STAGED',sourceLedgerDigest:ledgerDigest,
  packageLogicalSha256:packageDigest,payloadDigest:digest(core)});
}
function buildRun(input,newRows,bindings,actor,retainedRuns){
 const ledgerDigest=digest(newRows.map(row=>({key:row.key,rowDigest:row.rowDigest}))),classes=Object.fromEntries(CLASSES.map(k=>[k,[]]));
 const rowResults=[];
 for(const row of newRows){
  const binding=bindings.get(row.key)||{reason:'SOURCE_POLICY_EDITION_NOT_FOUND'};
  const hold=binding.reason||(row.partialPayment?'SOURCE_PARTIAL_PAYMENT_REQUIRES_ALLOCATION':row.reversal||row.conflictingEvidence?'SOURCE_EVIDENCE_CONTRADICTION':
   input.source.evidenceType==='BANK_STATEMENT_MATCH'&&!row.paymentConfirmed?'SOURCE_BANK_PAYMENT_NOT_PROVEN':
   input.source.evidenceType==='BANK_STATEMENT_MATCH'&&!row.paidDate?'SOURCE_BANK_PAID_DATE_REQUIRED':'');
  const original={tenantId:input.tenantId,sourceRowId:row.rowId,sourceRowIdSha256:row.key,
   sourceId:input.source.sourceId,sourceFileHash:input.source.sha256,sourceDocumentRef:input.source.documentRef,
   sheet:row.sheet,rowNumber:row.rowNumber,policyNumber:row.policyNumber,policyId:binding.policyId||row.policyId,
   receiptId:binding.receiptId||row.receiptId,receiptNumber:row.receiptNumber,country:input.source.country,pais:input.source.country,
   insurerId:input.source.insurerId,currency:input.source.currency,evidenceType:input.source.evidenceType,
   reportedDate:input.source.evidenceAsOfDate,evidenceAsOfDate:input.source.evidenceAsOfDate,
   sourceAttestation:true,amount:row.amount,installment:row.installment,totalInstallments:row.totalInstallments,
   policyStartDate:row.policyStartDate,policyEndDate:row.policyEndDate,paidDate:row.paidDate,actualPaidDateEvidence:row.actualPaidDateEvidence,
   paymentConfirmed:row.paymentConfirmed,invoiceNumber:row.invoiceNumber,invoiceDate:row.invoiceDate,applicationDate:row.applicationDate,
   paymentMethod:row.paymentMethod,partialPayment:row.partialPayment,reversal:row.reversal,conflictingEvidence:row.conflictingEvidence,
   explicitInstallmentException:row.explicitInstallmentException,installmentExceptionReference:row.installmentExceptionReference,
   pendingFrom:row.pendingFrom||null,status:hold?'HOLD':'PROPOSED',intakeHoldCode:hold};
  if(input.qaRunId)Object.assign(original,{__syntheticQa:true,qaRunId:input.qaRunId});
  const evId='srcev_'+row.key.slice(0,40),proposalId=(input.qaRunId?'b3005qa_i66_proposal_':'srcprop_')+row.key.slice(0,40);
  classes.evidenciasCobro.push(stageRecord('evidenciasCobro',evId,original,input.runId,ledgerDigest,input.batchDigest));
  if(row.isAnchor){
   classes.propuestasConciliacion.push(stageRecord('propuestasConciliacion',proposalId,original,input.runId,ledgerDigest,input.batchDigest));
   // HOLD is stored on the immutable proposal itself. Do not duplicate the
   // financial/source row into another independently editable queue.
  }
  rowResults.push({rowId:row.rowId,proposalId:row.isAnchor?proposalId:null,status:row.isAnchor?(hold?'HOLD':'PROPOSAL_STORED'):'SUPPORTING_ROW',reason:row.isAnchor?hold:''});
 }
 const expectedCounts=Object.fromEntries(CLASSES.map(k=>[k,classes[k].length]));
 const collectionDigests=Object.fromEntries(CLASSES.map(k=>[k,digest(classes[k].map(row=>({id:row.documentId,payloadDigest:row.payloadDigest})).sort((a,b)=>a.id.localeCompare(b.id)))]));
 const aggregate=digest(CLASSES.map(name=>({name,count:expectedCounts[name],digest:collectionDigests[name]})));
 const manifest={id:input.runId,runId:input.runId,tenantId:input.tenantId,schemaVersion:MANIFEST_SCHEMA,contractVersion:CONTRACT_VERSION,
  owner:OWNER,status:'ACTIVE',activationState:'ACTIVE',source:input.source,sourceKey:input.sourceKey,sourceDigest:input.sourceDigest,
  sourceLedgerCount:newRows.length,sourceLedgerDigest:ledgerDigest,packageLogicalSha256:input.batchDigest,expectedCounts,
  collectionDigests,expectedAggregateDigest:aggregate,stageDocumentCount:CLASSES.reduce((sum,k)=>sum+expectedCounts[k],0),
  newCobros:0,receiptWrites:0,policyWrites:0,finmovWrites:0,actor,retainedRuns,
  holdProposalCount:rowResults.filter(row=>row.status==='HOLD').length};
 if(input.qaRunId)Object.assign(manifest,{__syntheticQa:true,qaRunId:input.qaRunId});
 manifest.manifestContentDigest=manifestDigest(manifest);
 return {manifest,classes,rowResults};
}

async function commitIntake({input,db,items,runRef,controlRef,requestRef,eventRef,registryRef,actor,reason,now,validate,bindRows,qaPermission}){
 const reqRef=requestRef('srcintake_'+input.batchDigest.slice(0,40));
 const outcome=await db.runTransaction(async tx=>{
  const read=ref=>tx.get(ref);
  const prior=await read(reqRef);
  const sourceRef=registryRef('sources',input.sourceKey),sourceSnap=await read(sourceRef);
  if(sourceSnap.exists&&sourceSnap.data().sourceDigest!==input.sourceDigest)fail('SOURCE_METADATA_IMMUTABLE');
  const pointerSnap=await read(controlRef),pointer=pointerSnap.exists?pointerSnap.data():null;
  if(input.qaRunId){
   const permit=pointer&&pointer.intakePermission;
   if(!pointer||pointer.__syntheticQa!==true||pointer.qaRunId!==input.qaRunId||!permit||
      permit.schemaVersion!=='gi-cobros-source-intake-qa-permission-v1'||permit.tenantId!==input.tenantId||
      permit.qaRunId!==input.qaRunId||permit.actorUid!==actor.uid||permit.sourceId!==input.source.sourceId||
      permit.sourceSha256!==input.source.sha256||permit.batchDigest!==input.batchDigest||permit.authorized!==true)
    fail('SOURCE_QA_INTAKE_PERMISSION_REQUIRED');
   if(!qaPermission)fail('SOURCE_QA_INTAKE_PERMISSION_REQUIRED');
  }
  // Authorization and canonical scope are reevaluated on every retry/replay.
  const bindings=await bindRows(read,input);
  if(prior.exists){
   const record=prior.data();
   if(record.batchDigest!==input.batchDigest||record.sourceDigest!==input.sourceDigest||record.tenantId!==input.tenantId||record.status!=='COMMITTED')fail('SOURCE_REQUEST_INTEGRITY_MISMATCH');
   return Object.assign({},record.result,{status:'SOURCE_RUN_REUSED',reused:true,intakeWrites:0});
  }
  const existingRun=await read(runRef(input.runId));
  if(existingRun.exists)fail('SOURCE_RUN_ALREADY_EXISTS_WITHOUT_RECEIPT');
  const registry=[];
  for(const row of input.rows){const ref=registryRef('rows',row.key),snap=await read(ref);registry.push({row,ref,snap});
   if(snap.exists&&(snap.data().rowDigest!==row.rowDigest||snap.data().sourceDigest!==input.sourceDigest||snap.data().tenantId!==input.tenantId))fail('SOURCE_ROW_IMMUTABLE');}
  const groupRecords=[];
  for(const group of input.pendingGroups){const ref=registryRef('groups',group.id),snap=await read(ref);groupRecords.push({group,ref,snap});
   if(snap.exists&&(snap.data().digest!==group.digest||snap.data().tenantId!==input.tenantId))fail('SOURCE_POLICY_GROUP_IMMUTABLE');}
  const newRows=registry.filter(x=>!x.snap.exists).map(x=>x.row),duplicates=registry.length-newRows.length;
  if(!newRows.length){
   return {ok:true,status:'SOURCE_RUN_REUSED',reused:true,sourceRunId:null,
    reusedRunIds:[...new Set(registry.map(x=>x.snap.data().runId))].sort(),sourceDigest:input.sourceDigest,
    sourceSha256:input.source.sha256,submittedRows:input.rows.length,counts:{sourceRows:0,proposals:0,holds:0,supportingRows:0,duplicates},
    proposalIds:[],rowResults:[],financialWrites:0,intakeWrites:0};
  }
  let retainedRuns=[];
  if(pointer&&!input.qaRunId){
   const previous=await read(runRef(pointer.activeRunId));if(!previous.exists)fail('SOURCE_ACTIVE_LEDGER_MISSING');
   const manifest=previous.data();validate(pointer,manifest,input.tenantId);retainedRuns=retentionOf(pointer,manifest);
  }
  const built=buildRun(input,newRows,bindings,actor,retainedRuns);
  const manifest=Object.assign({},built.manifest,{createdAt:now(),activatedAt:now()});
  const afterPointer=pointerFor(manifest);
  if(input.qaRunId)afterPointer.intakePermission=pointer.intakePermission;
  const counts={sourceRows:newRows.length,proposals:built.classes.propuestasConciliacion.length,
   holds:built.rowResults.filter(row=>row.status==='HOLD').length,supportingRows:built.rowResults.filter(row=>row.status==='SUPPORTING_ROW').length,duplicates};
  const writeCount=built.manifest.stageDocumentCount+newRows.length+groupRecords.filter(x=>!x.snap.exists).length+4+(sourceSnap.exists?0:1);
  if(writeCount>450)fail('SOURCE_TRANSACTION_WRITE_BOUND_EXCEEDED');
  const result={ok:true,status:'SOURCE_RUN_STORED',sourceRunId:input.runId,sourceDigest:input.sourceDigest,sourceSha256:input.source.sha256,
   submittedRows:input.rows.length,counts,proposalIds:built.classes.propuestasConciliacion.map(row=>row.documentId),rowResults:built.rowResults,
   financialWrites:0,intakeWrites:writeCount};
  // Every read above completes before the first write; one transaction admits
  // sources, run, dedupe keys and pointer, or none of them becomes visible.
  if(!sourceSnap.exists)tx.set(sourceRef,{schemaVersion:INPUT_SCHEMA,tenantId:input.tenantId,sourceDigest:input.sourceDigest,
   source:input.source,actor,createdAt:now(),...(input.qaRunId?{__syntheticQa:true,qaRunId:input.qaRunId}:{})});
  for(const entry of registry.filter(x=>!x.snap.exists))tx.set(entry.ref,{tenantId:input.tenantId,sourceKey:input.sourceKey,
   sourceDigest:input.sourceDigest,rowDigest:entry.row.rowDigest,runId:input.runId,
   ...(input.qaRunId?{__syntheticQa:true,qaRunId:input.qaRunId}:{})});
  for(const item of groupRecords.filter(x=>!x.snap.exists))tx.set(item.ref,{tenantId:input.tenantId,...item.group,runId:input.runId,
   ...(input.qaRunId?{__syntheticQa:true,qaRunId:input.qaRunId}:{})});
  for(const name of CLASSES)for(const row of built.classes[name])tx.set(runRef(input.runId).collection(name).doc(row.documentId),row);
  tx.set(runRef(input.runId),manifest);
  tx.set(controlRef,afterPointer);
  tx.set(reqRef,{schemaVersion:INPUT_SCHEMA,status:'COMMITTED',tenantId:input.tenantId,batchDigest:input.batchDigest,sourceDigest:input.sourceDigest,
   actor,result,createdAt:now(),...(input.qaRunId?{__syntheticQa:true,qaRunId:input.qaRunId}:{})});
  tx.set(eventRef('srcintake_'+input.batchDigest.slice(0,40)),{schemaVersion:INPUT_SCHEMA,operation:'intake_source_run',tenantId:input.tenantId,
   actor,reason,sourceRunId:input.runId,sourceDigest:input.sourceDigest,sourceSha256:input.source.sha256,
   beforeActiveRunId:pointer&&pointer.activeRunId||null,afterActiveRunId:input.runId,counts,financialWrites:0,createdAt:now(),
   ...(input.qaRunId?{__syntheticQa:true,qaRunId:input.qaRunId}:{})});
  return result;
 });
 // A transport success alone never certifies intake. Verify immutable source,
 // dedupe rows, each stored proposal/evidence digest and retained run linkage.
 const sourceSnap=await registryRef('sources',input.sourceKey).get();
 if(!sourceSnap.exists||sourceSnap.data().sourceDigest!==input.sourceDigest)fail('SOURCE_INTAKE_READBACK_MISMATCH');
 const rows=[];
 for(const row of input.rows){const snap=await registryRef('rows',row.key).get();if(!snap.exists||snap.data().rowDigest!==row.rowDigest||snap.data().sourceDigest!==input.sourceDigest)fail('SOURCE_INTAKE_READBACK_MISMATCH');rows.push(snap.data());}
 const runs=[...new Set(rows.map(row=>row.runId))];
 for(const runId of runs){
  const m=await runRef(runId).get();if(!m.exists)fail('SOURCE_INTAKE_READBACK_MISMATCH');
  const manifest=m.data();validate(pointerFor(manifest),manifest,input.tenantId);
  for(const name of ['evidenciasCobro','propuestasConciliacion']){
   const docs=await runRef(runId).collection(name).get();
   const entries=docs.docs.map(doc=>({id:doc.id,payloadDigest:doc.data().payloadDigest})).sort((a,b)=>a.id.localeCompare(b.id));
   if(entries.length!==manifest.expectedCounts[name]||digest(entries)!==manifest.collectionDigests[name])fail('SOURCE_INTAKE_READBACK_MISMATCH');
   for(const doc of docs.docs){const original=Object.assign({},doc.data());for(const k of ['runId','documentClass','activationState','sourceLedgerDigest','packageLogicalSha256','payloadDigest'])delete original[k];
    if(digest(original)!==doc.data().payloadDigest)fail('SOURCE_INTAKE_READBACK_MISMATCH');}
  }
 }
 if(!input.qaRunId){
  const catalog=await ledgerCatalog({tenantId:input.tenantId,read:ref=>ref.get(),controlRef,runRef,validate});
  if(runs.some(run=>!catalog.entries.some(entry=>entry.runId===run)))fail('SOURCE_INTAKE_NOT_RETAINED');
 }
 return Object.assign({},outcome,{readbackConfirmed:true});
}

module.exports=Object.freeze({INPUT_SCHEMA,POINTER_SCHEMA,MANIFEST_SCHEMA,CONTRACT_VERSION,OWNER,MAX_ROWS,MAX_RETAINED_RUNS,
 CLASSES,ID,SHA,TYPES,QA_SOURCE,QA_RUN,stable,digest,fail,prepareInput,manifestDigest,pointerFor,validateSourceRunContract,retentionOf,
 canonicalPolicyDate,matchesCanonicalInstallment,ledgerCatalog,selectedLedger,stageRecord,buildRun,commitIntake});
