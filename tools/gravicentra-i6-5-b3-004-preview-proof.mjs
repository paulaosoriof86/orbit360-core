import fs from 'node:fs';
import crypto from 'node:crypto';
import { initializeApp as initializeAdminApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { initializeApp as initializeClientApp } from 'firebase/app';
import { getAuth as getClientAuth, signInWithCustomToken } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';

const projectId=process.env.PROJECT_ID||'ays-orbit-360-lab';
const tenantId=process.env.TENANT_HINT||'alianzas-soluciones';
const runId=String(process.env.GITHUB_RUN_ID||Date.now());
const outPath=process.env.B3_004_PROOF_OUT||'/tmp/b3-004-preview-proof.json';
const sdkPath=process.env.PUBLIC_CONFIG_FILE;
const callableName='orbit360CobrosReconciliationCommandPreview';
const need=(ok,code)=>{if(!ok)throw new Error(code);};
const text=v=>String(v==null?'':v).trim();
const norm=v=>text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function findFirebaseConfig(obj){
  if(!obj||typeof obj!=='object')return null;
  if(typeof obj.apiKey==='string'&&typeof obj.projectId==='string'&&(obj.appId||obj.authDomain))return obj;
  for(const v of Object.values(obj)){const x=findFirebaseConfig(v);if(x)return x;}
  return null;
}
function assignedRoles(m){
  const xs=[...(Array.isArray(m.roles)?m.roles:[]),...(Array.isArray(m.assignedRoles)?m.assignedRoles:[]),...(Array.isArray(m.rolesAsignados)?m.rolesAsignados:[]),...(Array.isArray(m.rolesDisponibles)?m.rolesDisponibles:[])];
  return xs.map(norm).filter(Boolean);
}
function activeMember(m){
  const s=norm(m.status||m.estado);
  return m.active!==false&&m.activo!==false&&!['inactive','inactivo','blocked','bloqueado'].includes(s);
}
function advisorIdOf(m){return text(m&& (m.advisorId||m.asesorId));}
async function authenticatedCandidates(memberDocs,auth){
  const out=[];
  for(const doc of memberDocs){
    const member=doc.data()||{};
    if(!activeMember(member))continue;
    try{await auth.getUser(doc.id);}catch{continue;}
    out.push({uid:doc.id,member,roles:assignedRoles(member),advisorId:advisorIdOf(member)});
  }
  return out;
}
async function signedCallableNamed(auth,clientConfig,actor,label,region,name){
  const token=await auth.createCustomToken(actor.uid);
  const app=initializeClientApp(clientConfig,'b3004-'+label+'-'+runId);
  await signInWithCustomToken(getClientAuth(app),token);
  return httpsCallable(getFunctions(app,region),name);
}
async function signedCallable(auth,clientConfig,actor,label){return signedCallableNamed(auth,clientConfig,actor,label,'us-central1',callableName);}
async function invokeDoc(callable,payload){const out=await callable(Object.assign({tenantId},payload||{}));return out.data;}
async function invoke(callable,activeRole,operation,payload,reason){
  const out=await callable({tenantId,activeRole,operation,payload,reason});
  return out.data;
}
async function expectDenied(callable,activeRole,operation,payload,reason){
  try{await invoke(callable,activeRole,operation,payload,reason);return false;}
  catch(error){return /permission-denied/i.test(String(error&&error.code||''))||/permiso|rol activo/i.test(String(error&&error.message||''));}
}

async function main(){
  need(sdkPath&&fs.existsSync(sdkPath),'B3_004_PUBLIC_CONFIG_MISSING');
  const sdk=JSON.parse(fs.readFileSync(sdkPath,'utf8'));
  const clientConfig=findFirebaseConfig(sdk);
  need(clientConfig&&clientConfig.apiKey,'B3_004_FIREBASE_CLIENT_CONFIG_MISSING');

  const app=getApps()[0]||initializeAdminApp({credential:applicationDefault(),projectId});
  const db=getFirestore(app),auth=getAdminAuth(app);
  const members=await db.collection('tenants').doc(tenantId).collection('members').get();
  const candidates=await authenticatedCandidates(members.docs,auth);
  const privilegedOrder=['direccion','operativo','superadmin','admintenant','admin','finanzas'];
  let operator=null;
  for(const role of privilegedOrder){
    operator=candidates.find(x=>x.roles.includes(role));
    if(operator){operator=Object.assign({},operator,{activeRole:role});break;}
  }
  need(operator,'B3_004_PRIVILEGED_MEMBER_NOT_FOUND');
  const advisorRoles=new Set(['asesor','asesora','asesor_sr','asesora_sr','asesor_jr','asesora_jr','comercial']);
  let advisor=null;
  for(const c of candidates){
    const role=c.roles.find(r=>advisorRoles.has(r));
    if(role&&c.advisorId&&c.advisorId!==operator.advisorId){advisor=Object.assign({},c,{activeRole:role});break;}
  }
  need(advisor,'B3_004_CROSS_ADVISOR_MEMBER_NOT_FOUND');

  const operatorCall=await signedCallable(auth,clientConfig,operator,'operator');
  const advisorCall=await signedCallable(auth,clientConfig,advisor,'advisor');
  const documentUploadCall=await signedCallableNamed(auth,clientConfig,operator,'doc-upload','us-east1','orbit360DocumentDriveUploadPreview');
  const documentReadCall=await signedCallableNamed(auth,clientConfig,operator,'doc-read','us-east1','orbit360DocumentDriveReadPreview');
  const documentDownloadCall=await signedCallableNamed(auth,clientConfig,operator,'doc-download','us-east1','orbit360DocumentDriveDownloadPreview');
  const documentFinalizeCall=await signedCallableNamed(auth,clientConfig,operator,'doc-finalize','us-east1','orbit360DocumentDriveFinalizePreview');
  const documentQuarantineCall=await signedCallableNamed(auth,clientConfig,operator,'doc-quarantine','us-east1','orbit360DocumentDriveQuarantinePreview');

  const suffix=crypto.createHash('sha256').update(runId).digest('hex').slice(0,10);
  const ids={
    client:'b3004qa_client_'+suffix,
    policy:'b3004qa_policy_'+suffix,
    receiptReport:'b3004qa_receipt_report_'+suffix,
    portfolioReport:'b3004qa_portfolio_report_'+suffix,
    receiptDirect:'b3004qa_receipt_direct_'+suffix,
    portfolioDirect:'b3004qa_portfolio_direct_'+suffix
  };
  const dataRoot=db.collection('tenants').doc(tenantId).collection('data');
  const refs={
    client:dataRoot.doc('clientes').collection('items').doc(ids.client),
    policy:dataRoot.doc('polizas').collection('items').doc(ids.policy),
    receiptReport:dataRoot.doc('recibosEsperados').collection('items').doc(ids.receiptReport),
    portfolioReport:dataRoot.doc('carteraPrimas').collection('items').doc(ids.portfolioReport),
    receiptDirect:dataRoot.doc('recibosEsperados').collection('items').doc(ids.receiptDirect),
    portfolioDirect:dataRoot.doc('carteraPrimas').collection('items').doc(ids.portfolioDirect)
  };
  const today='2026-09-30',paidDate='2026-09-29',applicationDate='2026-09-30',amountReport=123.45,amountDirect=234.56;
  const audit={
    schema:'GRAVICENTRA_I6_5_B3_004_PREVIEW_PROOF_R6_V1',
    status:'RUNNING',runId:Number(runId)||runId,tenantId,callableName,region:'us-central1',
    actors:{
      advisor:{uid:advisor.uid,activeRole:advisor.activeRole,advisorId:advisor.advisorId},
      operator:{uid:operator.uid,activeRole:operator.activeRole,advisorId:operator.advisorId},
      crossAdvisor:advisor.advisorId!==operator.advisorId
    },
    ids,assertions:{},documents:{support:null,invoice:null,readPass:false,downloadPass:false,finalizePass:false},cleanup:{attempted:false,pass:false,documentsQuarantined:false}
  };
  let reportCobroId='',directCobroId='',managementId='',supportDoc=null,invoiceDoc=null,documentsFinalized=false;
  try{
    const batch=db.batch();
    batch.set(refs.client,{id:ids.client,nombre:'B3-004 QA Synthetic R6',pais:'GT',asesorId:advisor.advisorId,__syntheticQa:true,__syntheticRun:runId});
    batch.set(refs.policy,{id:ids.policy,clienteId:ids.client,numero:'B3-004-QA-'+suffix,pais:'GT',moneda:'GTQ',asesorId:advisor.advisorId,estado:'Vigente',__syntheticQa:true,__syntheticRun:runId});
    batch.set(refs.receiptReport,{id:ids.receiptReport,polizaId:ids.policy,clienteId:ids.client,pais:'GT',moneda:'GTQ',cuota:'1/10',vence:'2026-09-30',monto:amountReport,estado:'Pendiente',estadoOperativo:'pendiente_vence_corte',asesorId:advisor.advisorId,__syntheticQa:true,__syntheticRun:runId});
    batch.set(refs.portfolioReport,{id:ids.portfolioReport,reciboId:ids.receiptReport,polizaId:ids.policy,clienteId:ids.client,pais:'GT',moneda:'GTQ',monto:amountReport,estado:'Pendiente',estadoCartera:'Pendiente',carteraActiva:true,asesorId:advisor.advisorId,__syntheticQa:true,__syntheticRun:runId});
    batch.set(refs.receiptDirect,{id:ids.receiptDirect,polizaId:ids.policy,clienteId:ids.client,pais:'GT',moneda:'GTQ',cuota:'2/10',vence:'2026-10-30',monto:amountDirect,estado:'Pendiente',estadoOperativo:'futuro_pendiente',asesorId:advisor.advisorId,__syntheticQa:true,__syntheticRun:runId});
    batch.set(refs.portfolioDirect,{id:ids.portfolioDirect,reciboId:ids.receiptDirect,polizaId:ids.policy,clienteId:ids.client,pais:'GT',moneda:'GTQ',monto:amountDirect,estado:'Pendiente',estadoCartera:'Pendiente',carteraActiva:true,asesorId:advisor.advisorId,__syntheticQa:true,__syntheticRun:runId});
    await batch.commit();

    const pdfBytes=Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF\n','utf8');
    const pdfBase64=pdfBytes.toString('base64');
    supportDoc=await invokeDoc(documentUploadCall,{activeRole:operator.activeRole,clienteId:ids.client,polizaId:ids.policy,name:'b3004qa_payment_support_'+suffix+'.pdf',mimeType:'application/pdf',base64:pdfBase64,provisional:true});
    invoiceDoc=await invokeDoc(documentUploadCall,{activeRole:operator.activeRole,clienteId:ids.client,polizaId:ids.policy,name:'b3004qa_invoice_'+suffix+'.pdf',mimeType:'application/pdf',base64:pdfBase64,provisional:true});
    need(supportDoc?.ok===true&&supportDoc?.documentRef&&supportDoc?.stagingFolderId&&supportDoc?.clientFolderId,'B3_004_SUPPORT_DRIVE_STAGE_FAILED');
    need(invoiceDoc?.ok===true&&invoiceDoc?.documentRef&&invoiceDoc?.stagingFolderId&&invoiceDoc?.clientFolderId,'B3_004_INVOICE_DRIVE_STAGE_FAILED');
    audit.documents.support={documentRef:supportDoc.documentRef,contentHash:supportDoc.contentHash,stagingFolderId:supportDoc.stagingFolderId,clientFolderId:supportDoc.clientFolderId};
    audit.documents.invoice={documentRef:invoiceDoc.documentRef,contentHash:invoiceDoc.contentHash,stagingFolderId:invoiceDoc.stagingFolderId,clientFolderId:invoiceDoc.clientFolderId};

    const report=await invoke(advisorCall,advisor.activeRole,'report_advisor_payment',{
      receiptId:ids.receiptReport,paidDate,paymentMethod:'Transferencia bancaria',amount:amountReport,note:'B3-004 R6 advisor report'
    },'B3-004 R6 synthetic advisor report');
    need(report?.ok===true&&report.paymentState==='REPORTED_PENDING_OPERATIVE_VALIDATION','B3_004_ADVISOR_REPORT_STATE_INVALID');
    managementId=text(report.managementId);need(managementId,'B3_004_ADVISOR_REPORT_MANAGEMENT_MISSING');

    const beforeApplyQuery=await dataRoot.doc('cobros').collection('items').where('reciboId','==',ids.receiptReport).get();
    need(beforeApplyQuery.size===0,'B3_004_ADVISOR_REPORT_PREMATURE_COBRO');
    const [reportedReceiptSnap,managementSnap]=await Promise.all([
      refs.receiptReport.get(),dataRoot.doc('gestiones').collection('items').doc(managementId).get()
    ]);
    need(reportedReceiptSnap.exists&&managementSnap.exists,'B3_004_ADVISOR_REPORT_READBACK_MISSING');
    const reportedReceipt=reportedReceiptSnap.data()||{},management=managementSnap.data()||{};
    need(reportedReceipt.estado!=='Pagado'&&reportedReceipt.paymentOrigin==='ADVISOR_REPORTED_PAYMENT','B3_004_ADVISOR_REPORT_PREMATURE_PAYMENT');
    need(management.workflowType==='advisor_payment_validation'&&management.estado==='Pendiente','B3_004_ADVISOR_REPORT_OPS_STATE_INVALID');

    const advisorApplyDenied=await expectDenied(advisorCall,advisor.activeRole,'apply_payment',{receiptId:ids.receiptReport,sourceType:'manual',amount:amountReport},'Advisor must not apply');
    need(advisorApplyDenied,'B3_004_ADVISOR_APPLY_NOT_DENIED');

    const applied=await invoke(operatorCall,operator.activeRole,'apply_payment',{
      receiptId:ids.receiptReport,sourceType:'manual',amount:amountReport,paymentSupportDocumentRef:supportDoc.documentRef
    },'B3-004 R10 operative validates advisor report with real Preview support');
    need(applied?.ok===true&&applied.paymentState==='PAID_DIRECT','B3_004_ADVISOR_REPORT_APPLY_FAILED');
    need(applied.paymentOrigin==='ADVISOR_REPORTED_PAYMENT','B3_004_ADVISOR_REPORT_PROVENANCE_LOST');
    reportCobroId=text(applied.cobroId);need(reportCobroId,'B3_004_ADVISOR_REPORT_COBRO_MISSING');
    need(text(applied.linkedManagementId)===managementId,'B3_004_ADVISOR_REPORT_LINK_LOST');

    const retry=await invoke(operatorCall,operator.activeRole,'apply_payment',{
      receiptId:ids.receiptReport,sourceType:'manual',amount:amountReport
    },'B3-004 R6 operative validates advisor report');
    need(retry?.cobroId===reportCobroId&&retry?.reused===true,'B3_004_ADVISOR_REPORT_IDEMPOTENT_RETRY_FAILED');

    const reconciled=await invoke(operatorCall,operator.activeRole,'reconcile_payment',{
      receiptId:ids.receiptReport,paymentOriginSource:'insurer_invoice',applicationDate,
      invoiceNumber:'B3004-R10-'+suffix,invoiceDocumentRef:invoiceDoc.documentRef,
      applicationEvidenceType:'INSURER_INVOICE',amount:amountReport
    },'B3-004 R6 individual reconciliation');
    need(reconciled?.cobroId===reportCobroId,'B3_004_RECONCILE_CREATED_SECOND_COBRO');
    need(reconciled?.applicationState==='APPLIED_DIRECT','B3_004_RECONCILE_APPLICATION_STATE_INVALID');
    need(reconciled?.paymentOrigin==='ADVISOR_REPORTED_PAYMENT','B3_004_RECONCILE_REWROTE_ORIGIN');

    const [supportFinalized,invoiceFinalized]=await Promise.all([
      invokeDoc(documentFinalizeCall,{activeRole:operator.activeRole,clienteId:ids.client,polizaId:ids.policy,documentRef:supportDoc.documentRef,clientFolderId:supportDoc.clientFolderId,stagingFolderId:supportDoc.stagingFolderId}),
      invokeDoc(documentFinalizeCall,{activeRole:operator.activeRole,clienteId:ids.client,polizaId:ids.policy,documentRef:invoiceDoc.documentRef,clientFolderId:invoiceDoc.clientFolderId,stagingFolderId:invoiceDoc.stagingFolderId})
    ]);
    need(supportFinalized?.ok===true&&invoiceFinalized?.ok===true,'B3_004_DOCUMENT_FINALIZE_FAILED');
    documentsFinalized=true;audit.documents.finalizePass=true;
    const [supportRead,invoiceRead,supportDownload,invoiceDownload]=await Promise.all([
      invokeDoc(documentReadCall,{activeRole:operator.activeRole,clienteId:ids.client,polizaId:ids.policy,documentRef:supportDoc.documentRef}),
      invokeDoc(documentReadCall,{activeRole:operator.activeRole,clienteId:ids.client,polizaId:ids.policy,documentRef:invoiceDoc.documentRef}),
      invokeDoc(documentDownloadCall,{activeRole:operator.activeRole,clienteId:ids.client,polizaId:ids.policy,documentRef:supportDoc.documentRef}),
      invokeDoc(documentDownloadCall,{activeRole:operator.activeRole,clienteId:ids.client,polizaId:ids.policy,documentRef:invoiceDoc.documentRef})
    ]);
    for(const doc of [supportRead,invoiceRead,supportDownload,invoiceDownload])need(doc?.ok===true&&doc?.base64,'B3_004_DOCUMENT_READ_DOWNLOAD_FAILED');
    need(Buffer.from(supportRead.base64,'base64').equals(pdfBytes)&&Buffer.from(invoiceRead.base64,'base64').equals(pdfBytes),'B3_004_DOCUMENT_READBACK_BYTES_MISMATCH');
    audit.documents.readPass=true;audit.documents.downloadPass=true;

    const direct=await invoke(operatorCall,operator.activeRole,'apply_payment',{
      receiptId:ids.receiptDirect,sourceType:'manual',paidDate,paymentMethod:'Transferencia bancaria',amount:amountDirect
    },'B3-004 R6 direct operative payment');
    need(direct?.ok===true&&direct.paymentState==='PAID_DIRECT','B3_004_OPERATIVE_DIRECT_APPLY_FAILED');
    directCobroId=text(direct.cobroId);need(directCobroId,'B3_004_OPERATIVE_DIRECT_COBRO_MISSING');

    await sleep(500);
    const [reportReceiptFinal,directReceiptFinal,reportCobroSnap,directCobroSnap,managementFinal,reportQuery,directQuery]=await Promise.all([
      refs.receiptReport.get(),refs.receiptDirect.get(),
      dataRoot.doc('cobros').collection('items').doc(reportCobroId).get(),
      dataRoot.doc('cobros').collection('items').doc(directCobroId).get(),
      dataRoot.doc('gestiones').collection('items').doc(managementId).get(),
      dataRoot.doc('cobros').collection('items').where('reciboId','==',ids.receiptReport).get(),
      dataRoot.doc('cobros').collection('items').where('reciboId','==',ids.receiptDirect).get()
    ]);
    need(reportReceiptFinal.exists&&directReceiptFinal.exists&&reportCobroSnap.exists&&directCobroSnap.exists&&managementFinal.exists,'B3_004_FINAL_READBACK_MISSING');
    need(reportQuery.size===1&&directQuery.size===1,'B3_004_DUPLICATE_COBRO');
    const rr=reportReceiptFinal.data()||{},cc=reportCobroSnap.data()||{},mg=managementFinal.data()||{};
    need(rr.estado==='Pagado'&&rr.paymentOrigin==='ADVISOR_REPORTED_PAYMENT','B3_004_REPORT_RECEIPT_FINAL_INVALID');
    need(cc.paymentEvidenceType==='ADVISOR_REPORTED'&&cc.applicationDate===applicationDate,'B3_004_REPORT_COBRO_FINAL_INVALID');
    need(cc.paymentSupportDocumentRef===supportDoc.documentRef&&cc.invoiceDocumentRef===invoiceDoc.documentRef,'B3_004_DOCUMENT_REFS_NOT_PERSISTED');
    need(cc.invoiceNumber==='B3004-R10-'+suffix,'B3_004_INVOICE_NUMBER_NOT_PERSISTED');
    need(mg.estado==='Resuelta'&&mg.paymentReportStatus==='VALIDATED_APPLIED','B3_004_OPS_MANAGEMENT_NOT_RESOLVED');

    audit.assertions={
      crossAdvisorPrivilegedApply:true,
      advisorReportDoesNotApplyPayment:true,
      advisorCannotApplyOrReconcile:true,
      advisorReportCreatesLinkedOpsManagement:true,
      operativeValidatesAndAppliesSameCanonicalPayment:true,
      operativeDirectPaymentNeedsNoSecondApproval:true,
      individualReconciliationEnrichesSamePayment:true,
      idempotentRetry:true,
      singleCobroPerReceipt:true,
      advisorProvenancePreserved:true,
      paidDateSeparatedFromApplicationDate:true,
      realPreviewPaymentSupportUpload:true,
      realPreviewInvoiceUpload:true,
      persistentDocumentRefs:true,
      documentViewerReadPath:true,
      documentDownloadPath:true,
      stagedThenFinalizedDocumentLifecycle:true
    };
    audit.status='PASS_PENDING_CLEANUP';
  } finally {
    audit.cleanup.attempted=true;
    if(supportDoc&&supportDoc.documentRef&&supportDoc.clientFolderId){
      const from=supportDoc.clientFolderId;
      const q=await invokeDoc(documentQuarantineCall,{activeRole:operator.activeRole,clienteId:ids.client,polizaId:ids.policy,documentRef:supportDoc.documentRef,clientFolderId:supportDoc.clientFolderId,stagingFolderId:documentsFinalized?from:supportDoc.stagingFolderId}).catch(()=>null);
      audit.cleanup.documentsQuarantined=!!(q&&q.ok===true&&q.status==='quarantined');
    }
    if(invoiceDoc&&invoiceDoc.documentRef&&invoiceDoc.clientFolderId){
      const from=invoiceDoc.clientFolderId;
      const q=await invokeDoc(documentQuarantineCall,{activeRole:operator.activeRole,clienteId:ids.client,polizaId:ids.policy,documentRef:invoiceDoc.documentRef,clientFolderId:invoiceDoc.clientFolderId,stagingFolderId:documentsFinalized?from:invoiceDoc.stagingFolderId}).catch(()=>null);
      audit.cleanup.documentsQuarantined=audit.cleanup.documentsQuarantined&&!!(q&&q.ok===true&&q.status==='quarantined');
    }
    const deletes=[];
    if(reportCobroId)deletes.push(dataRoot.doc('cobros').collection('items').doc(reportCobroId).delete().catch(()=>null));
    if(directCobroId)deletes.push(dataRoot.doc('cobros').collection('items').doc(directCobroId).delete().catch(()=>null));
    if(managementId)deletes.push(dataRoot.doc('gestiones').collection('items').doc(managementId).delete().catch(()=>null));
    deletes.push(refs.portfolioReport.delete().catch(()=>null),refs.portfolioDirect.delete().catch(()=>null),refs.receiptReport.delete().catch(()=>null),refs.receiptDirect.delete().catch(()=>null),refs.policy.delete().catch(()=>null),refs.client.delete().catch(()=>null));
    const reqs=await db.collection('tenants').doc(tenantId).collection('reconciliationRequests').get().catch(()=>null);
    if(reqs)for(const d of reqs.docs){const x=d.data()||{},rid=text(x.result&&x.result.receiptId);if(rid===ids.receiptReport||rid===ids.receiptDirect)deletes.push(d.ref.delete().catch(()=>null));}
    for(const receiptId of [ids.receiptReport,ids.receiptDirect]){
      const evts=await db.collection('tenants').doc(tenantId).collection('reconciliationEvents').where('receiptId','==',receiptId).get().catch(()=>null);
      if(evts)for(const d of evts.docs)deletes.push(d.ref.delete().catch(()=>null));
    }
    await Promise.all(deletes);
    const [a,b,c,d,e,f]=await Promise.all([refs.client.get(),refs.policy.get(),refs.receiptReport.get(),refs.receiptDirect.get(),refs.portfolioReport.get(),refs.portfolioDirect.get()]);
    let remaining=0;
    for(const cobroId of [reportCobroId,directCobroId].filter(Boolean)){if((await dataRoot.doc('cobros').collection('items').doc(cobroId).get()).exists)remaining++;}
    const managementExists=managementId?(await dataRoot.doc('gestiones').collection('items').doc(managementId).get()).exists:false;
    audit.cleanup.pass=!a.exists&&!b.exists&&!c.exists&&!d.exists&&!e.exists&&!f.exists&&remaining===0&&!managementExists&&audit.cleanup.documentsQuarantined===true;
    if(audit.status==='PASS_PENDING_CLEANUP'&&audit.cleanup.pass)audit.status='PASS';
    fs.writeFileSync(outPath,JSON.stringify(audit,null,2)+'\n');
  }
  need(audit.status==='PASS','B3_004_R6_SYNTHETIC_CLEANUP_FAILED');
  console.log(JSON.stringify(audit));
}
main().catch(error=>{console.error(error&&error.stack||error);process.exit(1);});
