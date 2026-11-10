'use strict';
/**
 * I6.6 Bayron: signed LIVE first-payment READ ONLY post-commit probe.
 * Payment 1/2 was posted in Paula's signed session (event role superadmin; HTTP 200 at
 * 2026-11-10 22:17:26Z). NEVER apply or reconcile any payment here.
 * This module has NO Firestore mutation, no admin Auth token minting and no
 * external payment calls. The prepayment script was superseded.
 */
const crypto=require('node:crypto');
const K=Object.freeze({
  project:'ays-orbit-360-lab',policyNumber:'VA125-00010478',
  policyId:'pol_cb085b8b5cd85a922c3b29164820',
  first:'cob_pol_cb085b8b5cd85a922c3b29164820_001',
  second:'cob_pol_cb085b8b5cd85a922c3b29164820_002',
  sourceNumber:'58876231',amountCents:155792,firstDue:'2026-08-20',
  secondDue:'2026-09-20',paidDate:'2026-10-29'
});
const txt=x=>String(x===null||x===undefined?'':x).trim();
const sha=x=>crypto.createHash('sha256').update(String(x)).digest('hex');
const stable=x=>x===null||typeof x!=='object'?x:typeof x.toJSON==='function'?stable(x.toJSON()):
  Array.isArray(x)?x.map(stable):Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])]));
const digest=x=>sha(JSON.stringify(stable(x)));
const cents=x=>x===null||x===undefined||txt(x)===''?null:
  Number.isFinite(Number(x))?Math.round((Number(x)+Number.EPSILON)*100):null;
const amount=r=>[r&&r.monto,r&&r.montoTotal,r&&r.primaTotal,r&&r.saldo].map(cents).find(v=>v!==null);
const due=r=>txt(r&&(r.vence||r.fechaVencimiento||r.fechaLimite)).slice(0,10);
const country=r=>txt(r&&(r.pais||r.country)).toUpperCase();
const paid=r=>!!r&&(r.pagado===true||r.conciliadoPago===true||
  !!txt(r.fechaPago||r.paidDate)||/^(Pagado|Paid)$/i.test(txt(r.estado))||/^PAID_/.test(txt(r.paymentState)));
const doc=d=>d&&d.exists?Object.assign({id:d.id},d.data()||{}):null;
const halt=code=>{throw Error('I66_BAYRON_POSTPAYMENT_READONLY_HOLD:'+code)};
const safeError=e=>{
  const s=txt(e&&e.message);
  return s.startsWith('I66_BAYRON_POSTPAYMENT_READONLY_HOLD:')?
    s.replace(/[^A-Za-z0-9_:,.-]/g,'').slice(0,170):
    'I66_BAYRON_POSTPAYMENT_READONLY_EXTERNAL_ERROR_PRIVATE_DETAILS_OMITTED';
};

function certify(s){
  const issues=[];
  if(s.policyMatches!==1||!s.policy||s.policy.id!==K.policyId||
    txt(s.policy.numero||s.policy.numeroPoliza)!==K.policyNumber||country(s.policy)!=='GT'||
    !txt(s.policy.clienteId)||!s.client||txt(s.client.id)!==txt(s.policy.clienteId)||
    s.policy.tenantId&&txt(s.policy.tenantId)!==txt(s.tenantId)||
    s.client&&s.client.tenantId&&txt(s.client.tenantId)!==txt(s.tenantId))issues.push('POLICY_CLIENT_TENANT_IDENTITY');
  if(s.receipts.length!==14||new Set(s.receipts.map(r=>r.id)).size!==14)issues.push('RECEIPTS_14_CARDINALITY');
  if(!s.first||s.first.id!==K.first||txt(s.first.polizaId)!==K.policyId||
    amount(s.first)!==K.amountCents||due(s.first)!==K.firstDue||!paid(s.first)||
    txt(s.first.fechaPago||s.first.paidDate)!==K.paidDate||
    s.first.tenantId&&txt(s.first.tenantId)!==txt(s.tenantId))issues.push('FIRST_RECEIPT_PAID_IDENTITY');
  if(!s.second||s.second.id!==K.second||txt(s.second.polizaId)!==K.policyId||
    amount(s.second)!==K.amountCents||due(s.second)!==K.secondDue)issues.push('SECOND_RECEIPT_IDENTITY');
  if(s.car.length!==1||txt(s.car[0]&&s.car[0].reciboId)!==K.first||
    amount(s.car[0])!==K.amountCents||!paid(s.car[0]))issues.push('FIRST_CAR_PERSISTENCE');
  if(s.cobros.length!==1||txt(s.cobros[0]&&s.cobros[0].reciboId)!==K.first||
    txt(s.cobros[0]&&s.cobros[0].polizaId)!==K.policyId||
    amount(s.cobros[0])!==K.amountCents||
    txt(s.cobros[0]&&(s.cobros[0].paidDate||s.cobros[0].fechaPago))!==K.paidDate)issues.push('FIRST_COBRO_PERSISTENCE');
  const linked=new Set(s.receipts.map(r=>r.id));
  if(s.policyCobros.length>=40||s.policyCobros.some(c=>!linked.has(txt(c.reciboId)))||
    s.policyCobros.filter(c=>txt(c.reciboId)===K.first).length!==1)issues.push('DUPLICATE_OR_ORPHAN_COBROS');
  if(s.requests.length!==1||txt(s.requests[0].status)!=='committed'||
    txt(s.requests[0].operation)!=='apply_payment'||
    txt(s.requests[0].result&&s.requests[0].result.receiptId)!==K.first)issues.push('SIGNED_REQUEST_NOT_VERIFIED');
  if(s.events.length!==1||txt(s.events[0].operation)!=='apply_payment'||
    txt(s.events[0].receiptId)!==K.first||
    !txt(s.events[0].actor&&s.events[0].actor.uid)||
    !['direccion','superadmin'].includes(txt(s.events[0].actor&&s.events[0].actor.activeRole).toLowerCase()))issues.push('SIGNED_PRIVILEGED_EVENT_NOT_VERIFIED');
  const source=txt(s.first&&s.first.numeroReciboFuente);
  if(source&&source!==K.sourceNumber||s.sourceMatches.length>1||
    s.sourceMatches.some(r=>r.id!==K.first)||
    source===K.sourceNumber&&s.sourceMatches.length!==1||
    !source&&s.sourceMatches.length!==0)issues.push('SOURCE_RECEIPT_CONFLICT');
  if(s.maintenance&&!['SOURCE_NUMBER_SPARSE_ATTACHED','SOURCE_NUMBER_ALREADY_PRESENT'].includes(txt(s.maintenance.status)))issues.push('SOURCE_AUDIT_CONFLICT');
  const cob=s.cobros[0]||{},state=txt(cob.applicationState||s.first&&s.first.applicationState),
    methodStatus=txt(cob.paymentMethod||cob.metodo)?'PRESENT':'UNVERIFIED',
    recon=cob.conciliado===true||/^APPLIED_/.test(state);
  const event=s.events[0]||{};
  const eventAudit={operation:txt(event.operation).slice(0,32),
    activeRole:txt(event.actor&&event.actor.activeRole).replace(/[^A-Za-z0-9_-]/g,'').slice(0,32)||'MISSING',
    signedUidPresent:!!txt(event.actor&&event.actor.uid),receiptMatches:txt(event.receiptId)===K.first,
    requestIdPresent:!!txt(event.requestId)};
  const status=issues.length?'HOLD_SIGNED_PAYMENT_OR_RELATIONS':recon?'PAID_RECONCILED':'PAID_PENDING_APPLICATION';
  const secondHasPayment=paid(s.second)||s.secondCobros.length>0;
  return {status,issues,sourceNumberPresent:source===K.sourceNumber,
    applicationState:state||'UNVERIFIED',paymentState:txt(cob.paymentState)||'UNVERIFIED',
    paymentMethodPresence:methodStatus,receiptCount:s.receipts.length,cobroCount:s.cobros.length,
    carteraCount:s.car.length,requestCount:s.requests.length,eventCount:s.events.length,eventAudit,
    secondState:secondHasPayment?'SECOND_HAS_FINANCIAL_ACTIVITY_REVIEW':'SECOND_NOT_PAID',
    secondPaidDate:txt(s.second&&(s.second.fechaPago||s.second.paidDate))||null,
    secondAction:'HOLD_NO_SOURCE_BACKED_REAL_PAYMENT_DATE'};
}

async function findTenant(db){
  const tenants=await db.collection('tenants').listDocuments(),matches=[];
  if(!tenants.length||tenants.length>300)halt('TENANT_BOUND');
  for(const t of tenants){const q=await t.collection('data').doc('polizas').collection('items').where('numero','==',K.policyNumber).limit(3).get();
    for(const d of q.docs)matches.push({tenantId:t.id,policyId:d.id});}
  if(matches.length!==1||matches[0].policyId!==K.policyId)halt('POLICY_NOT_UNIQUE');
  return matches[0].tenantId;
}

async function read(db,tenantId){
  const t=db.collection('tenants').doc(tenantId),col=n=>t.collection('data').doc(n).collection('items');
  const [p,r1,r2,rec,car,cob,car2,cob2,policyCobs,ev,req,src,maint]=await Promise.all([
    col('polizas').doc(K.policyId).get(),col('recibosEsperados').doc(K.first).get(),
    col('recibosEsperados').doc(K.second).get(),
    col('recibosEsperados').where('polizaId','==',K.policyId).limit(40).get(),
    col('carteraPrimas').where('reciboId','==',K.first).limit(4).get(),
    col('cobros').where('reciboId','==',K.first).limit(4).get(),
    col('carteraPrimas').where('reciboId','==',K.second).limit(4).get(),
    col('cobros').where('reciboId','==',K.second).limit(4).get(),
    col('cobros').where('polizaId','==',K.policyId).limit(40).get(),
    t.collection('reconciliationEvents').where('receiptId','==',K.first).limit(8).get(),
    t.collection('reconciliationRequests').where('result.receiptId','==',K.first).limit(8).get(),
    col('recibosEsperados').where('numeroReciboFuente','==',K.sourceNumber).limit(4).get(),
    t.collection('operationalRequests').doc('gi_i66_bayron_postpayment_58876231_source_v1').get()
  ]);
  const policy=doc(p),client=policy&&policy.clienteId?doc(await col('clientes').doc(txt(policy.clienteId)).get()):null;
  return {tenantId,policyMatches:1,policy,client,first:doc(r1),second:doc(r2),
    receipts:rec.docs.map(doc),car:car.docs.map(doc),cobros:cob.docs.map(doc),
    secondCar:car2.docs.map(doc),secondCobros:cob2.docs.map(doc),policyCobros:policyCobs.docs.map(doc),
    events:ev.docs.map(doc),requests:req.docs.map(doc),sourceMatches:src.docs.map(doc),maintenance:doc(maint)};
}

async function main(){
  if(process.env.GCLOUD_PROJECT!==K.project||process.env.FIRESTORE_EMULATOR_HOST)halt('PROJECT_OR_EMULATOR_BOUNDARY');
  const {getApps,initializeApp}=require('firebase-admin/app');
  const {getFirestore}=require('firebase-admin/firestore');
  const db=getFirestore(getApps()[0]||initializeApp({projectId:K.project}));
  const tenant=await findTenant(db),one=await read(db,tenant),two=await read(db,tenant),
    first=certify(one),second=certify(two);
  if(digest(one)!==digest(two))halt('CONCURRENT_LIVE_CHANGE_READBACK');
  const report={schema:'gi.i66.bayron.signed-payment-readonly.v1',projectId:K.project,
    policyNumber:K.policyNumber,receiptId:K.first,paidDateEvidence:K.paidDate,
    amountCents:K.amountCents,first,secondReadbackAgree:first.status===second.status,
    signedDataFingerprint:digest(one),liveWrites:0};
  console.log('I66_BAYRON_POSTPAYMENT_READONLY='+JSON.stringify(report));
  if(first.issues.length||second.issues.length||first.status!==second.status)process.exitCode=2;
}
if(require.main===module)main().catch(e=>{console.error(safeError(e));process.exitCode=1});
module.exports={K,certify,digest,safeError};
