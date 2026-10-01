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
const outPath=process.env.B3_005_PROOF_OUT||'/tmp/b3-005-preview-proof.json';
const sdkPath=process.env.PUBLIC_CONFIG_FILE;
const previewUrl=String(process.env.B3_PREVIEW_URL||'').replace(/\/$/,'');
const need=(ok,code)=>{if(!ok)throw new Error(code);};
const text=v=>String(v==null?'':v).trim();
const norm=v=>text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const sha=v=>crypto.createHash('sha256').update(String(v),'utf8').digest('hex');

function findFirebaseConfig(obj){
  if(!obj||typeof obj!=='object')return null;
  if(typeof obj.apiKey==='string'&&typeof obj.projectId==='string'&&(obj.appId||obj.authDomain))return obj;
  for(const v of Object.values(obj)){const x=findFirebaseConfig(v);if(x)return x;}
  return null;
}
function rolesOf(m){
  return [...(Array.isArray(m.roles)?m.roles:[]),...(Array.isArray(m.assignedRoles)?m.assignedRoles:[]),...(Array.isArray(m.rolesAsignados)?m.rolesAsignados:[]),...(Array.isArray(m.rolesDisponibles)?m.rolesDisponibles:[])].map(norm).filter(Boolean);
}
function active(m){const s=norm(m.status||m.estado);return m.active!==false&&m.activo!==false&&!['inactive','inactivo','blocked','bloqueado'].includes(s);}
async function operatorCandidate(db,auth){
  const snap=await db.collection('tenants').doc(tenantId).collection('members').get();
  const order=['direccion','superadmin','admintenant','admin'];
  for(const role of order){
    for(const doc of snap.docs){
      const m=doc.data()||{};if(!active(m)||!rolesOf(m).includes(role))continue;
      try{await auth.getUser(doc.id);return{uid:doc.id,member:m,activeRole:role,advisorId:text(m.advisorId||m.asesorId)};}catch{}
    }
  }
  return null;
}
async function signedCallable(auth,clientConfig,actor,label,region,name){
  const token=await auth.createCustomToken(actor.uid);
  const app=initializeClientApp(clientConfig,'b3005-'+label+'-'+runId);
  await signInWithCustomToken(getClientAuth(app),token);
  return httpsCallable(getFunctions(app,region),name);
}
async function invoke(callable,activeRole,operation,payload,reason,requestId){
  const out=await callable({tenantId,activeRole,operation,payload,reason,requestId});return out.data;
}
async function saveConfig(callable,activeRole,config,reason){
  const out=await callable({tenantId,action:'save',domain:'reconciliation',config,reason,activeRole});return out.data;
}
async function deleteQuery(q){
  const snap=await q.get();if(snap.empty)return 0;
  let count=0;for(let i=0;i<snap.docs.length;i+=400){const b=q.firestore.batch();for(const d of snap.docs.slice(i,i+400)){b.delete(d.ref);count++;}await b.commit();}return count;
}
function config(){
  return{
    inferenceEnabled:true,
    autoCommitHighConfidence:true,
    humanConfirmationRequiredForHighConfidence:false,
    humanConfirmationRequired:false,
    requireSameCurrency:true,
    requireSameTerm:true,
    holdOnNegative:true,
    holdOnReversal:true,
    holdOnDuplicate:true,
    insurerPaymentPlans:[
      {insurer:'ASEGURADORA LA CEIBA',aliases:['LA CEIBA'],maxInstallments:10,scope:'fraccionado'},
      {insurer:'ASEGURADORA GENERAL',aliases:['GENERAL'],maxInstallments:10,scope:'fraccionado'},
      {insurer:'G&T SEGUROS',aliases:['G&T','GT SEGUROS'],maxInstallments:10,scope:'fraccionado'},
      {insurer:'ASEGURADORA GUATEMALTECA',aliases:['ASEGUATE','ASEGURADORA GUATEMALTECA'],maxInstallments:10,scope:'fraccionado'}
    ]
  };
}
function receiptId(policyId,n){return policyId+'_receipt_'+String(n).padStart(2,'0');}
function portfolioId(policyId,n){return policyId+'_portfolio_'+String(n).padStart(2,'0');}
async function createPolicyFixture(db,dataRoot,{clientId,policyId,total=10,insurer='Aseguradora Guatemalteca',advisorId='',human=false}){
  const batch=db.batch();
  batch.set(dataRoot.doc('polizas').collection('items').doc(policyId),{id:policyId,clienteId:clientId,numero:policyId.toUpperCase(),pais:'GT',moneda:'GTQ',aseguradoraNombre:insurer,formaPago:'Fraccionado',cuotas:total,estado:'Vigente',asesorId:advisorId,__syntheticQa:true,__syntheticRun:runId,__humanFixture:human});
  for(let n=1;n<=total;n++){
    const rid=receiptId(policyId,n),pid=portfolioId(policyId,n),due='2026-'+String(((n-1)%10)+1).padStart(2,'0')+'-15';
    batch.set(dataRoot.doc('recibosEsperados').collection('items').doc(rid),{id:rid,polizaId:policyId,clienteId:clientId,pais:'GT',moneda:'GTQ',secuencia:n,cuota:String(n)+'/'+String(total),vence:due,fechaLimite:due,monto:100,estado:'Pendiente',estadoOperativo:'pendiente_vence_corte',asesorId:advisorId,__syntheticQa:true,__syntheticRun:runId,__humanFixture:human});
    batch.set(dataRoot.doc('carteraPrimas').collection('items').doc(pid),{id:pid,reciboId:rid,polizaId:policyId,clienteId:clientId,pais:'GT',moneda:'GTQ',secuencia:n,cuota:String(n)+'/'+String(total),vence:due,monto:100,estado:'Pendiente',estadoCartera:'Pendiente',carteraActiva:true,asesorId:advisorId,__syntheticQa:true,__syntheticRun:runId,__humanFixture:human});
  }
  await batch.commit();
}
async function cleanupPolicy(dataRoot,policyId,total){
  const cobros=await dataRoot.doc('cobros').collection('items').where('polizaId','==',policyId).get();
  const batch=dataRoot.firestore.batch();
  for(const d of cobros.docs)batch.delete(d.ref);
  for(let n=1;n<=total;n++){
    batch.delete(dataRoot.doc('recibosEsperados').collection('items').doc(receiptId(policyId,n)));
    batch.delete(dataRoot.doc('carteraPrimas').collection('items').doc(portfolioId(policyId,n)));
  }
  batch.delete(dataRoot.doc('polizas').collection('items').doc(policyId));
  await batch.commit();
}
async function cleanupRequests(db,ids){
  for(const id of ids)await db.collection('tenants').doc(tenantId).collection('reconciliationRequests').doc(id).delete().catch(()=>null);
  for(const id of ids)await deleteQuery(db.collection('tenants').doc(tenantId).collection('reconciliationEvents').where('requestId','==',id)).catch(()=>0);
}

async function main(){
  need(sdkPath&&fs.existsSync(sdkPath),'B3_005_PUBLIC_CONFIG_MISSING');
  need(previewUrl,'B3_005_PREVIEW_URL_MISSING');
  const sdk=JSON.parse(fs.readFileSync(sdkPath,'utf8')),clientConfig=findFirebaseConfig(sdk);
  need(clientConfig&&clientConfig.apiKey,'B3_005_FIREBASE_CLIENT_CONFIG_MISSING');
  const app=getApps()[0]||initializeAdminApp({credential:applicationDefault(),projectId});
  const db=getFirestore(app),auth=getAdminAuth(app),operator=await operatorCandidate(db,auth);
  need(operator,'B3_005_CONFIG_ADMIN_OPERATOR_NOT_FOUND');
  const cobrosCall=await signedCallable(auth,clientConfig,operator,'cobros','us-central1','orbit360CobrosReconciliationCommandPreview');
  const configCall=await signedCallable(auth,clientConfig,operator,'config','us-east1','orbit360TenantDomainConfigPreview');
  const tenant=db.collection('tenants').doc(tenantId),dataRoot=tenant.collection('data');
  const previewConfigRef=tenant.collection('previewUatConfig').doc('reconciliation');
  const configBeforeSnap=await previewConfigRef.get(),configBefore=configBeforeSnap.exists?configBeforeSnap.data():null;
  const suffix=sha(runId).slice(0,8),clientId='b3005qa_client_'+suffix;
  const policies={
    invoice:'b3005qa_policy_invoice_'+suffix,
    cap:'b3005qa_policy_cap_'+suffix,
    statement:'b3005qa_policy_statement_'+suffix,
    commission:'b3005qa_policy_commission_'+suffix,
    human:'b3005human_policy_r1'
  };
  const humanClient='b3005human_client_r1';
  const machineRequests=[
    'b3005qa_invoice_'+suffix,'b3005qa_direct_'+suffix,'b3005qa_cap_'+suffix,'b3005qa_statement_'+suffix,'b3005qa_commission_'+suffix
  ];
  const humanRequest='b3005human_invoice_r1';
  const audit={schema:'GRAVICENTRA_I6_5_B3_005_PREVIEW_MACHINE_PROOF_V1',status:'RUNNING',runId:Number(runId)||runId,tenantId,operator:{uid:operator.uid,activeRole:operator.activeRole},assertions:{},humanFixture:null,cleanup:{machine:false,configRestored:false,humanRetained:false}};
  let configEventId='',humanReady=false;
  try{
    const saved=await saveConfig(configCall,operator.activeRole,config(),'B3-005 isolated Preview high-confidence inference config');
    need(saved?.ok===true&&saved?.previewIsolated===true,'B3_005_PREVIEW_CONFIG_SAVE_FAILED');
    configEventId=text(saved.eventId);
    need(Array.isArray(saved.config?.insurerPaymentPlans)&&saved.config.insurerPaymentPlans.length===4,'B3_005_PREVIEW_CONFIG_PAYMENT_PLANS_MISSING');
    need(saved.config.humanConfirmationRequiredForHighConfidence===false&&saved.config.autoCommitHighConfidence===true,'B3_005_PREVIEW_CONFIG_AUTOCOMMIT_INVALID');

    await dataRoot.doc('clientes').collection('items').doc(clientId).set({id:clientId,nombre:'B3-005 QA Synthetic',pais:'GT',asesorId:operator.advisorId,__syntheticQa:true,__syntheticRun:runId});
    await createPolicyFixture(db,dataRoot,{clientId,policyId:policies.invoice,total:10,advisorId:operator.advisorId});
    await createPolicyFixture(db,dataRoot,{clientId,policyId:policies.cap,total:12,advisorId:operator.advisorId});
    await createPolicyFixture(db,dataRoot,{clientId,policyId:policies.statement,total:10,advisorId:operator.advisorId});
    await createPolicyFixture(db,dataRoot,{clientId,policyId:policies.commission,total:10,advisorId:operator.advisorId});

    const invoice=await invoke(cobrosCall,operator.activeRole,'reconcile_evidence',{
      policyId:policies.invoice,evidenceType:'INVOICE_INSTALLMENT_N',evidenceId:'invoice:'+suffix,
      receiptId:receiptId(policies.invoice,5),totalInstallments:10,currency:'GTQ',applicationDate:'2026-05-20',invoiceNumber:'B3005-'+suffix
    },'B3-005 exact Preview invoice installment 5',machineRequests[0]);
    need(invoice?.status==='AUTO_COMMITTED_HIGH_CONFIDENCE'&&invoice?.results?.length===5,'B3_005_INVOICE_AUTOCOMMIT_FAILED');
    const invoiceCobros=await dataRoot.doc('cobros').collection('items').where('polizaId','==',policies.invoice).get();
    need(invoiceCobros.size===5,'B3_005_INVOICE_COBRO_COUNT');
    const byReceipt=new Map(invoiceCobros.docs.map(d=>[text(d.data().reciboId),{id:d.id,...d.data()}]));
    for(let n=1;n<=4;n++){
      const row=byReceipt.get(receiptId(policies.invoice,n));need(row,'B3_005_INFERRED_COBRO_MISSING_'+n);
      need(row.paymentState==='PAID_INFERRED'&&row.applicationState==='APPLIED_INFERRED'&&row.directOrInferred==='INFERRED','B3_005_INFERRED_STATE_'+n);
      need(!text(row.paidDate||row.fechaPago),'B3_005_INFERRED_PAID_DATE_INVENTED_'+n);
      need(text(row.inferredEffectiveDate)===('2026-'+String(n).padStart(2,'0')+'-15'),'B3_005_INFERRED_EFFECTIVE_DATE_'+n);
    }
    const anchor=byReceipt.get(receiptId(policies.invoice,5));need(anchor?.paymentState==='PAID_DIRECT'&&anchor?.applicationState==='APPLIED_DIRECT','B3_005_INVOICE_ANCHOR_STATE');

    const retry=await invoke(cobrosCall,operator.activeRole,'reconcile_evidence',{
      policyId:policies.invoice,evidenceType:'INVOICE_INSTALLMENT_N',evidenceId:'invoice:'+suffix,
      receiptId:receiptId(policies.invoice,5),totalInstallments:10,currency:'GTQ',applicationDate:'2026-05-20',invoiceNumber:'B3005-'+suffix
    },'B3-005 exact Preview invoice installment 5',machineRequests[0]);
    need(retry?.reused===true,'B3_005_INFERENCE_RETRY_NOT_IDEMPOTENT');
    const retryCobros=await dataRoot.doc('cobros').collection('items').where('polizaId','==',policies.invoice).get();
    need(retryCobros.size===5,'B3_005_INFERENCE_RETRY_DUPLICATED_COBROS');

    const beforeDirect=byReceipt.get(receiptId(policies.invoice,2));
    const direct=await invoke(cobrosCall,operator.activeRole,'apply_payment',{
      receiptId:receiptId(policies.invoice,2),sourceType:'manual',paidDate:'2026-02-10',actualPaidDateEvidence:true,
      evidenceId:'bank:'+suffix,evidenceType:'BANK_STATEMENT_MATCH',amount:100
    },'B3-005 later direct evidence enriches inferred payment',machineRequests[1]);
    need(direct?.ok===true&&direct.cobroId===beforeDirect.id,'B3_005_LATER_DIRECT_CREATED_DUPLICATE');
    const directSnap=await dataRoot.doc('cobros').collection('items').doc(beforeDirect.id).get(),directRow=directSnap.data()||{};
    need(directRow.paymentState==='PAID_DIRECT'&&text(directRow.paidDate)==='2026-02-10','B3_005_LATER_DIRECT_NOT_ENRICHED');
    need(directRow.inferenceProvenance?.inferenceRuleId==='INVOICE_CONTIGUOUS_PRIOR','B3_005_PRIOR_INFERENCE_PROVENANCE_LOST');

    const cap=await invoke(cobrosCall,operator.activeRole,'reconcile_evidence',{
      policyId:policies.cap,evidenceType:'INVOICE_INSTALLMENT_N',evidenceId:'cap:'+suffix,
      receiptId:receiptId(policies.cap,12),totalInstallments:12,currency:'GTQ'
    },'B3-005 AseGuate max 10 fail closed',machineRequests[2]);
    need(cap?.status==='REVIEW_REQUIRED'&&cap?.reason==='INSTALLMENT_TOTAL_EXCEEDS_TENANT_CONFIG'&&Number(cap?.maxInstallments)===10,'B3_005_ASEGUATE_12_NOT_BLOCKED');
    const capCobros=await dataRoot.doc('cobros').collection('items').where('polizaId','==',policies.cap).get();
    need(capCobros.empty,'B3_005_ASEGUATE_12_WROTE_COBROS');

    const statement=await invoke(cobrosCall,operator.activeRole,'reconcile_evidence',{
      policyId:policies.statement,evidenceType:'INSURER_STATEMENT_PENDING_FROM_N',evidenceId:'statement:'+suffix,
      receiptId:receiptId(policies.statement,3),totalInstallments:10,evidenceAsOfDate:'2026-03-31',currency:'GTQ'
    },'B3-005 insurer statement pending from installment 3',machineRequests[3]);
    need(statement?.status==='AUTO_COMMITTED_HIGH_CONFIDENCE'&&statement?.results?.length===2&&statement.results.every(x=>x.directOrInferred==='INFERRED'),'B3_005_STATEMENT_INFERENCE_FAILED');

    const commission=await invoke(cobrosCall,operator.activeRole,'reconcile_evidence',{
      policyId:policies.commission,evidenceType:'COMMISSION_STATEMENT_INSTALLMENT_N',evidenceId:'commission:'+suffix,
      receiptId:receiptId(policies.commission,4),totalInstallments:10,evidenceAsOfDate:'2026-04-30',currency:'GTQ'
    },'B3-005 commission statement installment 4',machineRequests[4]);
    need(commission?.status==='AUTO_COMMITTED_HIGH_CONFIDENCE'&&commission?.results?.length===4,'B3_005_COMMISSION_INFERENCE_FAILED');

    // Recreate one deterministic synthetic case for Paula visual validation.
    await cleanupRequests(db,[humanRequest]);
    await cleanupPolicy(dataRoot,policies.human,10).catch(()=>null);
    await dataRoot.doc('clientes').collection('items').doc(humanClient).delete().catch(()=>null);
    await dataRoot.doc('clientes').collection('items').doc(humanClient).set({id:humanClient,nombre:'B3-005 Validación humana · AseGuate',pais:'GT',asesorId:operator.advisorId,__syntheticQa:true,__humanFixture:true});
    await createPolicyFixture(db,dataRoot,{clientId:humanClient,policyId:policies.human,total:10,advisorId:operator.advisorId,human:true});
    const human=await invoke(cobrosCall,operator.activeRole,'reconcile_evidence',{
      policyId:policies.human,evidenceType:'INVOICE_INSTALLMENT_N',evidenceId:'b3005human_invoice_r1',
      receiptId:receiptId(policies.human,5),totalInstallments:10,currency:'GTQ',applicationDate:'2026-05-20',invoiceNumber:'B3005-HUMAN-001'
    },'B3-005 human fixture invoice installment 5',humanRequest);
    need(human?.status==='AUTO_COMMITTED_HIGH_CONFIDENCE'&&human?.results?.length===5,'B3_005_HUMAN_FIXTURE_INFERENCE_FAILED');
    humanReady=true;
    audit.humanFixture={
      clientId:humanClient,policyId:policies.human,
      inferredReceiptId:receiptId(policies.human,2),directReceiptId:receiptId(policies.human,5),
      clientUrl:previewUrl+'/#/cliente360?c='+encodeURIComponent(humanClient)+'&t=recibos&r='+encodeURIComponent(receiptId(policies.human,2)),
      directUrl:previewUrl+'/#/cliente360?c='+encodeURIComponent(humanClient)+'&t=recibos&r='+encodeURIComponent(receiptId(policies.human,5)),
      cobrosUrl:previewUrl+'/#/cobros?qaPolicy='+encodeURIComponent(policies.human)
    };

    audit.assertions={
      invoiceHighConfidenceAutoCommit:true,
      priorContiguousInstallmentsInferred:true,
      inferredEffectiveDateUsesScheduledDueDate:true,
      inferredPaidDateRemainsUnknown:true,
      directAnchorApplied:true,
      retryIdempotent:true,
      singleCobroPerReceipt:true,
      laterDirectEvidenceEnrichesSameCobro:true,
      inferenceProvenancePreserved:true,
      aseguateMax10Enforced:true,
      twelveInstallmentsFailClosedWithoutWrites:true,
      insurerStatementInference:true,
      commissionStatementInference:true,
      previewTenantConfigIsolated:true,
      humanFixtureReady:true
    };
    audit.status='PASS';
  }catch(error){
    audit.status='FAIL';audit.failure=text(error?.stack||error?.message||error);throw error;
  }finally{
    for(const [key,total] of [['invoice',10],['cap',12],['statement',10],['commission',10]])await cleanupPolicy(dataRoot,policies[key],total).catch(()=>null);
    await dataRoot.doc('clientes').collection('items').doc(clientId).delete().catch(()=>null);
    await cleanupRequests(db,machineRequests).catch(()=>null);
    if(configEventId)await tenant.collection('previewUatConfigEvents').doc(configEventId).delete().catch(()=>null);
    if(configBefore)await previewConfigRef.set(configBefore,{merge:false}).catch(()=>null);else await previewConfigRef.delete().catch(()=>null);
    audit.cleanup.machine=true;audit.cleanup.configRestored=true;audit.cleanup.humanRetained=humanReady&&audit.status==='PASS';
    if(audit.status!=='PASS'){
      await cleanupPolicy(dataRoot,policies.human,10).catch(()=>null);
      await dataRoot.doc('clientes').collection('items').doc(humanClient).delete().catch(()=>null);
      await cleanupRequests(db,[humanRequest]).catch(()=>null);
      audit.cleanup.humanRetained=false;
    }
    fs.writeFileSync(outPath,JSON.stringify(audit,null,2)+'\n');
    console.log('B3_005_PREVIEW_MACHINE_PROOF='+audit.status);
    console.log('B3_005_HUMAN_FIXTURE='+JSON.stringify(audit.humanFixture||{}));
  }
}
await main();
