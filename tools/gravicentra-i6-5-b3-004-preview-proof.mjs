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
const norm=v=>text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function recursiveFind(obj,key){
  if(!obj||typeof obj!=='object')return '';
  if(typeof obj[key]==='string'&&obj[key])return obj[key];
  for(const v of Object.values(obj)){const x=recursiveFind(v,key);if(x)return x;}
  return '';
}
function findFirebaseConfig(obj){
  if(!obj||typeof obj!=='object')return null;
  if(typeof obj.apiKey==='string'&&typeof obj.projectId==='string'&&(obj.appId||obj.authDomain))return obj;
  for(const v of Object.values(obj)){const x=findFirebaseConfig(v);if(x)return x;}
  return null;
}
function assignedRoles(m){
  const xs=[m.rol,m.role,m.activeRole,m.rolActivo,...(Array.isArray(m.roles)?m.roles:[]),...(Array.isArray(m.assignedRoles)?m.assignedRoles:[]),...(Array.isArray(m.rolesAsignados)?m.rolesAsignados:[])];
  return xs.map(norm).filter(Boolean);
}
function activeMember(m){
  const s=norm(m.status||m.estado);
  return m.active!==false&&m.activo!==false&&!['inactive','inactivo','blocked','bloqueado'].includes(s);
}
async function main(){
  need(sdkPath&&fs.existsSync(sdkPath),'B3_004_PUBLIC_CONFIG_MISSING');
  const sdk=JSON.parse(fs.readFileSync(sdkPath,'utf8'));
  const clientConfig=findFirebaseConfig(sdk);
  need(clientConfig&&clientConfig.apiKey,'B3_004_FIREBASE_CLIENT_CONFIG_MISSING');

  const app=getApps()[0]||initializeAdminApp({credential:applicationDefault(),projectId});
  const db=getFirestore(app), auth=getAdminAuth(app);
  const members=await db.collection('tenants').doc(tenantId).collection('members').get();
  let actor=null;
  const allowed=new Set(['superadmin','admintenant','direccion','admin','operativo','finanzas']);
  for(const doc of members.docs){
    const m=doc.data()||{};
    const activeRole=assignedRoles(m).find(r=>allowed.has(r))||'';
    if(!activeMember(m)||!activeRole)continue;
    try{await auth.getUser(doc.id);actor={uid:doc.id,member:m,activeRole};break;}catch{}
  }
  need(actor,'B3_004_AUTHORIZED_MEMBER_NOT_FOUND');

  const customToken=await auth.createCustomToken(actor.uid);
  const clientApp=initializeClientApp(clientConfig,'b3004-'+runId);
  const clientAuth=getClientAuth(clientApp);
  await signInWithCustomToken(clientAuth,customToken);
  const callable=httpsCallable(getFunctions(clientApp,'us-central1'),callableName);

  const suffix=crypto.createHash('sha256').update(runId).digest('hex').slice(0,10);
  const ids={
    client:'__b3004qa_client_'+suffix,
    policy:'__b3004qa_policy_'+suffix,
    receipt:'__b3004qa_receipt_'+suffix,
    portfolio:'__b3004qa_portfolio_'+suffix
  };
  const dataRoot=db.collection('tenants').doc(tenantId).collection('data');
  const refs={
    client:dataRoot.doc('clientes').collection('items').doc(ids.client),
    policy:dataRoot.doc('polizas').collection('items').doc(ids.policy),
    receipt:dataRoot.doc('recibosEsperados').collection('items').doc(ids.receipt),
    portfolio:dataRoot.doc('carteraPrimas').collection('items').doc(ids.portfolio)
  };
  const today='2026-09-30', paidDate='2026-09-29', applicationDate='2026-09-30';
  const amount=123.45;
  const audit={schema:'GRAVICENTRA_I6_5_B3_004_PREVIEW_PROOF_V3',status:'RUNNING',runId:Number(runId)||runId,tenantId,actorUid:actor.uid,actorActiveRole:actor.activeRole,ids,callableName,region:'us-central1',assertions:{},cleanup:{attempted:false,pass:false}};
  let cobroId='';
  try{
    const batch=db.batch();
    batch.set(refs.client,{id:ids.client,nombre:'B3-004 QA Synthetic',pais:'GT',__syntheticQa:true,__syntheticRun:runId});
    batch.set(refs.policy,{id:ids.policy,clienteId:ids.client,numero:'B3-004-QA-'+suffix,pais:'GT',moneda:'GTQ',asesorId:text(actor.member.advisorId||actor.member.asesorId),__syntheticQa:true,__syntheticRun:runId});
    batch.set(refs.receipt,{id:ids.receipt,polizaId:ids.policy,clienteId:ids.client,pais:'GT',moneda:'GTQ',cuota:'1/10',vence:'2026-09-30',monto:amount,estado:'Pendiente',asesorId:text(actor.member.advisorId||actor.member.asesorId),__syntheticQa:true,__syntheticRun:runId});
    batch.set(refs.portfolio,{id:ids.portfolio,reciboId:ids.receipt,polizaId:ids.policy,clienteId:ids.client,pais:'GT',moneda:'GTQ',monto:amount,estado:'Pendiente',estadoCartera:'Pendiente',carteraActiva:true,__syntheticQa:true,__syntheticRun:runId});
    await batch.commit();

    async function call(payload,reason){
      try{
        const out=await callable({tenantId,activeRole:actor.activeRole,operation:'apply_payment',reason,payload});
        return out.data;
      }catch(error){
        throw new Error('B3_004_CALL_FAILED:'+(error?.code||'')+':'+(error?.message||String(error)));
      }
    }
    const first=await call({receiptId:ids.receipt,sourceType:'client_reported',paidDate,evidenceAsOfDate:today,amount},'B3-004 synthetic client report');
    need(first?.ok===true&&first.receiptId===ids.receipt,'B3_004_FIRST_APPLY_FAILED');
    cobroId=first.cobroId;
    need(cobroId,'B3_004_COBRO_ID_MISSING');
    need(first.paymentState==='PAID_REPORTED','B3_004_CLIENT_REPORT_STATE_INVALID');
    need(first.applicationState==='PENDING_APPLICATION','B3_004_PREMATURE_APPLICATION_INVALID');

    const retry=await call({receiptId:ids.receipt,sourceType:'client_reported',paidDate,evidenceAsOfDate:today,amount},'B3-004 synthetic client report');
    need(retry?.cobroId===cobroId&&retry?.reused===true,'B3_004_IDEMPOTENT_RETRY_FAILED');

    const enriched=await call({receiptId:ids.receipt,sourceType:'insurer_invoice',applicationDate,invoiceNumber:'B3004-QA-'+suffix,invoiceDocumentRef:'qa://invoice/'+suffix,amount},'B3-004 synthetic insurer application');
    need(enriched?.cobroId===cobroId,'B3_004_ENRICH_CREATED_SECOND_COBRO');
    need(enriched?.paymentState==='PAID_REPORTED','B3_004_ENRICH_REWROTE_PAYMENT_STATE');
    need(enriched?.applicationState==='APPLIED_DIRECT','B3_004_APPLICATION_NOT_APPLIED');

    await sleep(500);
    const [receiptSnap,portfolioSnap,cobroSnap,cobroQuery]=await Promise.all([
      refs.receipt.get(),refs.portfolio.get(),dataRoot.doc('cobros').collection('items').doc(cobroId).get(),
      dataRoot.doc('cobros').collection('items').where('reciboId','==',ids.receipt).get()
    ]);
    need(receiptSnap.exists&&portfolioSnap.exists&&cobroSnap.exists,'B3_004_READBACK_MISSING');
    need(cobroQuery.size===1,'B3_004_DUPLICATE_COBRO:'+cobroQuery.size);
    const rr=receiptSnap.data()||{}, pp=portfolioSnap.data()||{}, cc=cobroSnap.data()||{};
    need(cc.paymentState==='PAID_REPORTED'&&cc.applicationState==='APPLIED_DIRECT','B3_004_COBRO_STATE_READBACK_INVALID');
    need(cc.paidDate===paidDate&&cc.applicationDate===applicationDate,'B3_004_DATE_SEPARATION_INVALID');
    need(cc.invoiceNumber==='B3004-QA-'+suffix,'B3_004_INVOICE_READBACK_INVALID');
    need(cc.paymentEvidenceType==='CLIENT_REPORTED','B3_004_PAYMENT_PROVENANCE_LOST');
    need(cc.applicationEvidenceType==='INSURER_INVOICE','B3_004_APPLICATION_PROVENANCE_MISSING');
    need(rr.estado==='Pagado'&&rr.applicationDate===applicationDate,'B3_004_RECEIPT_READBACK_INVALID');
    need(pp.estado==='Pagado'&&pp.applicationDate===applicationDate,'B3_004_PORTFOLIO_READBACK_INVALID');

    audit.assertions={
      previewCallable:true,clientReportAutoApplied:true,secondHumanApprovalRequired:false,
      idempotentRetry:true,singleCobro:true,applicationEnrichesSameCobro:true,
      paymentProvenancePreserved:true,paidDateSeparatedFromApplicationDate:true,
      invoiceNumberPersisted:true,receiptUpdated:true,portfolioUpdated:true
    };
    audit.status='PASS_PENDING_CLEANUP';
  } finally {
    audit.cleanup.attempted=true;
    const deletes=[];
    if(cobroId)deletes.push(dataRoot.doc('cobros').collection('items').doc(cobroId).delete().catch(()=>null));
    deletes.push(refs.portfolio.delete().catch(()=>null),refs.receipt.delete().catch(()=>null),refs.policy.delete().catch(()=>null),refs.client.delete().catch(()=>null));
    const reqs=await db.collection('tenants').doc(tenantId).collection('reconciliationRequests').get().catch(()=>null);
    if(reqs)for(const d of reqs.docs){const x=d.data()||{};if(x.result?.receiptId===ids.receipt)deletes.push(d.ref.delete().catch(()=>null));}
    const evts=await db.collection('tenants').doc(tenantId).collection('reconciliationEvents').where('receiptId','==',ids.receipt).get().catch(()=>null);
    if(evts)for(const d of evts.docs)deletes.push(d.ref.delete().catch(()=>null));
    await Promise.all(deletes);
    const [a,b,c,d]=await Promise.all([refs.client.get(),refs.policy.get(),refs.receipt.get(),refs.portfolio.get()]);
    let remainingCobro=0;
    if(cobroId)remainingCobro=(await dataRoot.doc('cobros').collection('items').doc(cobroId).get()).exists?1:0;
    audit.cleanup.pass=!a.exists&&!b.exists&&!c.exists&&!d.exists&&remainingCobro===0;
    if(audit.status==='PASS_PENDING_CLEANUP'&&audit.cleanup.pass)audit.status='PASS';
    fs.writeFileSync(outPath,JSON.stringify(audit,null,2)+'\n');
  }
  need(audit.status==='PASS','B3_004_SYNTHETIC_CLEANUP_FAILED');
  console.log(JSON.stringify(audit));
}
main().catch(error=>{console.error(error&&error.stack||error);process.exit(1);});
