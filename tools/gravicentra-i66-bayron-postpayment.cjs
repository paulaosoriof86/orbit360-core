'use strict';
/**
 * I6.6 Bayron post-PAYMENT 1/2: protected commission reconciliation.
 * FIRST PAYMENT ALREADY POSTED VIA PAULA SIGNED UI on 2026-11-10 22:17:26Z.
 * NEVER register a second payment, impersonate the signed actor, or infer
 * an insurer application date. Protected technical enrichment only.
 * Default mode read-only. NOT_APPLIED until source and GH environment review.
 */
const crypto = require('node:crypto');
const K = Object.freeze({
  project: 'ays-orbit-360-lab', repo: 'paulaosoriof86/orbit360-core', branch: 'recovery/fase-a-clean-20260831',
  environment: 'gravicentra-live-data-writes',
  policy: 'VA125-00010478', policyId: 'pol_cb085b8b5cd85a922c3b29164820',
  first: 'cob_pol_cb085b8b5cd85a922c3b29164820_001',
  second: 'cob_pol_cb085b8b5cd85a922c3b29164820_002',
  firstSource: '58876231', secondSource: '62444671', amountCents: 155792,
  firstDue: '2026-08-20', secondDue: '2026-09-20', firstPaidAt: '2026-10-29',
  firstSourceUrl: 'https://docs.google.com/spreadsheets/d/1wz6gJIymDdKrXC9SvYhftFt_rgFmY67s/edit',
  maintenanceId: 'gi_i66_bayron_first_commission_application_58876231_v1',
  intent: 'BAYRON_FIRST_ONLY_COMMISSION_58876231_TECHNICAL_RECONCILIATION'
});
const str = x => String(x === null || x === undefined ? '' : x).trim();
const sha = x => crypto.createHash('sha256').update(String(x)).digest('hex');
const stable = x => x === null || typeof x !== 'object' ? x : typeof x.toJSON === 'function' ? stable(x.toJSON()) :
  Array.isArray(x) ? x.map(stable) : Object.fromEntries(Object.keys(x).sort().map(k => [k, stable(x[k])]));
const digest = x => sha(JSON.stringify(stable(x)));
const cents = x => x === null || x === undefined || str(x) === '' ? null :
  Number.isFinite(Number(x)) ? Math.round((Number(x) + Number.EPSILON) * 100) : null;
const amt = r => [r && r.monto, r && r.montoTotal, r && r.primaTotal, r && r.saldo].map(cents).find(x => x !== null);
const date = r => str(r && (r.vence || r.fechaVencimiento || r.fechaLimite)).slice(0,10);
const country = r => str(r && (r.pais || r.country)).toUpperCase();
const norm = x => str(x).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const paid = r => !!r && (r.pagado === true || r.conciliadoPago === true || !!str(r.fechaPago || r.paidDate) ||
  /^(pagado|paid)$/.test(norm(r.estado)) || str(r.paymentState).startsWith('PAID_'));
const fail = x => { throw Error('GI_I66_BAYRON_POSTPAYMENT_HOLD:' + x); };
const safeError = e => {
  const m=str(e&&e.message);
  return m.startsWith('GI_I66_BAYRON_POSTPAYMENT_HOLD:') ? m.replace(/[^A-Za-z0-9_:,.-]/g,'').slice(0,170) :
    'GI_I66_BAYRON_POSTPAYMENT_EXTERNAL_FAILURE_PRIVATE_DETAILS_OMITTED';
};
const doc = snap => snap && snap.exists ? Object.assign({ id: snap.id }, snap.data() || {}) : null;

/**
 * Check that first payment DID happen. A PENDING_APPLICATION result is a
 * financial reconciliation task; it is NOT permission to call apply_payment
 * again. Source number metadata may be safely attached separately.
 */
function review(s) {
  const problems=[];
  if (s.policyMatches !== 1 || !s.policy || s.policy.id !== K.policyId ||
      str(s.policy.numero || s.policy.numeroPoliza) !== K.policy || country(s.policy) !== 'GT' ||
      !str(s.policy.clienteId) || !s.client || s.client.id !== str(s.policy.clienteId) ||
      s.policy.tenantId && str(s.policy.tenantId)!==str(s.tenantId) ||
      s.client && s.client.tenantId && str(s.client.tenantId)!==str(s.tenantId)) problems.push('POLICY_CLIENT_TENANT_IDENTITY');
  if (s.receipts.length !== 14 || new Set(s.receipts.map(r=>r.id)).size !== 14) problems.push('EXPECTED_14_RECEIPTS_DRIFT');
  if (!s.first || s.first.id !== K.first || str(s.first.polizaId) !== K.policyId ||
      amt(s.first) !== K.amountCents || date(s.first) !== K.firstDue ||
      str(s.first.fechaPago || s.first.paidDate) !== K.firstPaidAt || !paid(s.first) ||
      s.first.tenantId && str(s.first.tenantId)!==str(s.tenantId) ||
      (s.first.clienteId && str(s.first.clienteId) !== str(s.policy && s.policy.clienteId))) problems.push('FIRST_PAID_RECEIPT_INCONSISTENT');
  if (!s.second || s.second.id !== K.second || str(s.second.polizaId) !== K.policyId ||
      amt(s.second) !== K.amountCents || date(s.second) !== K.secondDue) problems.push('SECOND_RECEIPT_IDENTITY_DRIFT');
  if (s.car.length !== 1 || str(s.car[0] && s.car[0].reciboId) !== K.first ||
      amt(s.car[0]) !== K.amountCents || !paid(s.car[0])) problems.push('FIRST_CAR_NOT_PAID_OR_DUPLICATE');
  if (s.cobros.length !== 1 || str(s.cobros[0] && s.cobros[0].reciboId) !== K.first ||
      str(s.cobros[0] && s.cobros[0].polizaId) !== K.policyId ||
      amt(s.cobros[0]) !== K.amountCents ||
      str(s.cobros[0] && (s.cobros[0].paidDate || s.cobros[0].fechaPago)) !== K.firstPaidAt) problems.push('FIRST_COBRO_MISSING_DUPLICATE_OR_WRONG_AMOUNT');
  const ids = new Set(s.receipts.map(r=>r.id));
  if (s.policyCobros.length >= 40 || s.policyCobros.some(c=>!ids.has(str(c.reciboId))) ||
      s.policyCobros.filter(c=>str(c.reciboId)===K.first).length!==1) problems.push('POLICY_COBROS_ORPHANS_OR_DUPLICATES');
  if (s.requests.length!==1 || str(s.requests[0].status)!=='committed' ||
      str(s.requests[0].operation)!=='apply_payment' ||
      str(s.requests[0].result && s.requests[0].result.receiptId)!==K.first) problems.push('SIGNED_PAYMENT_REQUEST_MISSING_OR_DUPLICATE');
  if (s.events.length!==1 || str(s.events[0].operation)!=='apply_payment' ||
      str(s.events[0].receiptId)!==K.first || !str(s.events[0].actor && s.events[0].actor.uid) ||
      !['direccion','superadmin'].includes(norm(s.events[0].actor && s.events[0].actor.activeRole))) problems.push('SIGNED_PRIVILEGED_EVENT_MISSING_OR_DUPLICATE');
  if (s.sourceMatches.length > 1 || s.sourceMatches.some(r=>r.id!==K.first)) problems.push('INSURER_SOURCE_NUMBER_DUPLICATE');
  const num = str(s.first && s.first.numeroReciboFuente);
  if (num && num!==K.firstSource || num===K.firstSource && s.sourceMatches.length!==1 ||
      !num && s.sourceMatches.length!==0) problems.push('INSURER_SOURCE_NUMBER_LINK_CONFLICT');
  if (s.maintenance && !['FIRST_COMMISSION_RECONCILED','ALREADY_RECONCILED_NO_WRITE'].includes(str(s.maintenance.status)))
    problems.push('MAINTENANCE_AUDIT_CONFLICT');
  const a = str(s.cobros[0] && s.cobros[0].applicationState || s.first && s.first.applicationState);
  const reconciled = !!(s.cobros[0] && (s.cobros[0].conciliado===true || /^APPLIED_/.test(a)));
  const paymentState = str(s.cobros[0] && s.cobros[0].paymentState);
  if (paymentState && paymentState!=='PAID_DIRECT') problems.push('PAYMENT_STATE_NOT_DIRECT');
  const paymentStatus = problems.length ? 'HOLD_VERIFY_SIGNED_FINANCIAL_RECORD' :
    reconciled ? 'PAID_AND_RECONCILED' : 'PAID_PENDING_APPLICATION';
  const secondCurrent = paid(s.second) || s.secondCobros.length
    ? 'SECOND_HAS_FINANCIAL_ACTIVITY_REVIEW_SEPARATELY' : 'SECOND_STILL_UNPAID';
  return { status: paymentStatus, problems, numberMissing: !num, applicationState: a || 'UNKNOWN',
    paidAt: K.firstPaidAt, amountCents: K.amountCents, firstReceiptId: K.first,
    linkedCobroCount: s.cobros.length, linkedPortfolioCount: s.car.length,
    signedEventCount: s.events.length, signedRequestCount: s.requests.length,
    secondPaymentDateEvidence: str(s.second && (s.second.fechaPago || s.second.paidDate)) || null,
    secondCurrent, secondPaymentAction: 'HOLD_NO_WRITE' };
}

function financeSnapshot(s) {
  const receipt = s.first ? { ...s.first } : null;
  if (receipt) delete receipt.numeroReciboFuente;
  return { policy: s.policy, client: s.client, firstReceiptWithoutSourceNumber: receipt,
    secondReceipt: s.second, secondCartera: s.secondCar, secondCobros: s.secondCobros,
    cartera: s.car, cobros: s.cobros,
    policyCobros: s.policyCobros, events: s.events, requests: s.requests };
}

function immutableSnapshot(s) {
  // Remove ONLY technical enrichment fields; amounts, paid dates, sources,
  // account ownership, actor-signed original event and second stay immutable.
  const scrub = item => {
    if (!item) return item;
    const row={...item};
    for(const key of ['numeroReciboFuente','applicationState','conciliado','conciliadoPago',
      'applicationEvidenceType','applicationEvidenceRef','reconciledAt','updatedAt','updatedBySystem'])delete row[key];
    return row;
  };
  return {first:scrub(s.first),cobro:scrub(s.cobros[0]),cartera:scrub(s.car[0]),
    second:s.second,secondCar:s.secondCar,secondCobros:s.secondCobros,
    policy:s.policy,client:s.client,events:s.events,requests:s.requests,
    policyCobros:s.policyCobros.map(scrub)};
}

function commissionPatches(technicalNow) {
  const common={applicationState:'APPLIED_DIRECT',conciliado:true,
    applicationEvidenceType:'COMMISSION_STATEMENT',applicationEvidenceRef:K.firstSourceUrl,
    reconciledAt:technicalNow,updatedAt:technicalNow,
    updatedBySystem:'GITHUB_PROTECTED_I66_BAYRON_RECONCILIATION'};
  return {receipt:{...common,numeroReciboFuente:K.firstSource},cobro:{...common},
    cartera:{applicationState:'APPLIED_DIRECT',conciliadoPago:true,
      applicationEvidenceType:'COMMISSION_STATEMENT',applicationEvidenceRef:K.firstSourceUrl,
      reconciledAt:technicalNow,updatedAt:technicalNow,
      updatedBySystem:'GITHUB_PROTECTED_I66_BAYRON_RECONCILIATION'}};
}

async function findTenant(db) {
  const ts = await db.collection('tenants').listDocuments(), matches=[];
  if (ts.length<1||ts.length>300) fail('TENANT_SCOPE');
  for (const t of ts) {
    const q = await t.collection('data').doc('polizas').collection('items').where('numero','==',K.policy).limit(3).get();
    for (const d of q.docs) matches.push({ tenantId:t.id, policyId:d.id });
  }
  if (matches.length!==1||matches[0].policyId!==K.policyId) fail('POLICY_NOT_UNIQUE');
  return matches[0].tenantId;
}

function refs(db, tenantId) {
  const t = db.collection('tenants').doc(tenantId), data = name => t.collection('data').doc(name).collection('items');
  return { t, tenantId, policy:data('polizas').doc(K.policyId), first:data('recibosEsperados').doc(K.first),
    second:data('recibosEsperados').doc(K.second), clients:data('clientes'),
    receiptCol:data('recibosEsperados'), cobroCol:data('cobros'), carCol:data('carteraPrimas'),
    events:t.collection('reconciliationEvents'), requests:t.collection('reconciliationRequests'),
    maintenance:t.collection('operationalRequests').doc(K.maintenanceId) };
}

async function readCurrent(x, tx=null) {
  const get = ref=>tx?tx.get(ref):ref.get(), query = q=>tx?tx.get(q):q.get();
  const [p,one,two,all,car,cob,car2,cob2,pc,ev,req,src,maint] = await Promise.all([
    get(x.policy),get(x.first),get(x.second),
    query(x.receiptCol.where('polizaId','==',K.policyId).limit(40)),
    query(x.carCol.where('reciboId','==',K.first).limit(4)),
    query(x.cobroCol.where('reciboId','==',K.first).limit(4)),
    query(x.carCol.where('reciboId','==',K.second).limit(4)),
    query(x.cobroCol.where('reciboId','==',K.second).limit(4)),
    query(x.cobroCol.where('polizaId','==',K.policyId).limit(40)),
    query(x.events.where('receiptId','==',K.first).limit(8)),
    query(x.requests.where('result.receiptId','==',K.first).limit(8)),
    query(x.receiptCol.where('numeroReciboFuente','==',K.firstSource).limit(4)),get(x.maintenance)
  ]);
  const policy=doc(p),client=policy && policy.clienteId ? doc(await get(x.clients.doc(str(policy.clienteId)))) : null;
  return { policy,client,tenantId:x.tenantId,first:doc(one),second:doc(two),receipts:all.docs.map(doc),car:car.docs.map(doc),
    secondCar:car2.docs.map(doc),secondCobros:cob2.docs.map(doc),
    cobros:cob.docs.map(doc),policyCobros:pc.docs.map(doc),events:ev.docs.map(doc),requests:req.docs.map(doc),
    sourceMatches:src.docs.map(doc),maintenance:doc(maint),policyMatches:1 };
}

async function githubJSON(suffix) {
  const pat=str(process.env.GI_I66_GITHUB_ACTIONS_READ_TOKEN);
  if (!pat) fail('ACTIONS_READ_TOKEN_MISSING');
  const response=await fetch('https://api.github.com/repos/'+K.repo+suffix,{headers:{
    Authorization:'Bearer '+pat, Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'
  }});
  if (!response.ok) fail('GITHUB_ENV_EVIDENCE_UNAVAILABLE_'+response.status);
  return response.json();
}

async function verifyReviewGate() {
  if (process.env.GITHUB_REPOSITORY!==K.repo || process.env.GITHUB_REF!=='refs/heads/'+K.branch ||
      process.env.GITHUB_EVENT_NAME!=='push' || process.env.GI_I66_ENVIRONMENT!==K.environment ||
      process.env.GI_I66_INTENT!==K.intent || !/^\d+$/.test(str(process.env.GITHUB_RUN_ID))) fail('GITHUB_EXACT_SCOPE');
  // Protected GitHub Environment blocks job until its required reviewer
  // approves; independently verify this exact run in Actions audit API.
  const approvals=await githubJSON('/actions/runs/'+process.env.GITHUB_RUN_ID+'/approvals');
  if (!Array.isArray(approvals)||!approvals.some(a=>str(a.state).toLowerCase()==='approved'&&
      str(a.user&&a.user.login).toLowerCase()==='paulaosoriof86'&&
      Array.isArray(a.environments)&&a.environments.some(e=>e.name===K.environment))) fail('THIS_RUN_HUMAN_REVIEW_NOT_CONFIRMED');
  const head=await githubJSON('/git/ref/heads/'+K.branch);
  if (str(head.object&&head.object.sha)!==str(process.env.GITHUB_SHA)) fail('REVIEWED_SOURCE_SHA_MOVED');
  return {runId:process.env.GITHUB_RUN_ID,reviewer:'paulaosoriof86',reviewerApprovals:1,headSha:process.env.GITHUB_SHA};
}

async function protectedCommissionReconcile(db,x,gate,preimageFingerprint) {
  const { FieldValue } = require('firebase-admin/firestore');
  return db.runTransaction(async tx=>{
    const s=await readCurrent(x,tx), check=review(s);
    if (check.problems.length || !['PAID_AND_RECONCILED','PAID_PENDING_APPLICATION'].includes(check.status))
      fail('POSTPAYMENT_PREIMAGE_NOT_VERIFIED_'+check.problems.length);
    if (digest(immutableSnapshot(s))!==preimageFingerprint)fail('FINANCIAL_PREIMAGE_CONCURRENT_CHANGE');
    if (check.status==='PAID_AND_RECONCILED')return {status:'ALREADY_RECONCILED_NO_WRITE',writes:0};
    if (s.maintenance)fail('COMMISSION_RECONCILIATION_AUDIT_ALREADY_EXISTS');
    if (s.secondCobros.length || paid(s.second))fail('SECOND_RECEIPT_CHANGED_HOLD');
    const cobro=s.cobros[0],cartera=s.car[0];
    if (!cobro||!cartera||!str(cobro.id)||!str(cartera.id))fail('RECONCILIATION_TARGET_ID_MISSING');
    const beforeFinanceDigest=digest(financeSnapshot(s));
    const now=FieldValue.serverTimestamp();
    const patches=commissionPatches(now);
    // Three EXISTING documents updated, never a cobro insert; paidDate,
    // amount and applicationDate are not in the patch.
    tx.update(x.first,patches.receipt);
    tx.update(x.cobroCol.doc(cobro.id),patches.cobro);
    tx.update(x.carCol.doc(cartera.id),patches.cartera);
    tx.create(x.maintenance,{schema:'gi.i66.bayron.postpayment.commission-reconciliation.v1',status:'FIRST_COMMISSION_RECONCILED',
      policyId:K.policyId,receiptId:K.first,insurerReceiptNumber:K.firstSource,
      oldFieldPresent:Object.prototype.hasOwnProperty.call(s.first,'numeroReciboFuente'),
      oldFieldValue:s.first.numeroReciboFuente===undefined?null:s.first.numeroReciboFuente,
      beforeReceiptDigest:digest(s.first),beforeCobroDigest:digest(cobro),beforeCarteraDigest:digest(cartera),
      beforeFinanceDigest,source:K.firstSourceUrl,sourcePaidDate:K.firstPaidAt,
      applicationDateAsserted:false,commissionAmountCents:19500,
      actorType:'PROTECTED_GITHUB_TECHNICAL_INSURER_APPLICATION_NO_NEW_PAYMENT',reviewer:gate.reviewer,
      githubReviewedRunId:gate.runId,githubReviewedHeadSha:gate.headSha,
      changedFields:['numeroReciboFuente','applicationState','conciliado','conciliadoPago',
        'applicationEvidenceType','applicationEvidenceRef','reconciledAt','updatedAt','updatedBySystem'],
      createdAt:now});
    return {status:'FIRST_COMMISSION_RECONCILED',writes:4,beforeFinanceDigest};
  });
}

async function main(){
  const mode=str(process.env.GI_I66_POSTPAYMENT_MODE||'readonly');
  if (process.env.GCLOUD_PROJECT!==K.project || process.env.FIRESTORE_EMULATOR_HOST) fail('PROJECT_OR_EMULATOR_SCOPE');
  const { getApps,initializeApp }=require('firebase-admin/app');
  const {getFirestore}=require('firebase-admin/firestore');
  const db=getFirestore(getApps()[0]||initializeApp({projectId:K.project}));
  const t=await findTenant(db),x=refs(db,t),before=await readCurrent(x),first=review(before);
  const second=review(await readCurrent(x));
  if (digest(financeSnapshot(before))!==digest(financeSnapshot(await readCurrent(x)))) fail('CONCURRENT_FINANCIAL_ACTIVITY_READONLY_HOLD');
  if (first.status!==second.status || first.problems.length||second.problems.length) fail('READBACK_NOT_SIGNED_OR_STABLE_'+first.problems.join('_'));
  const safe={schema:'gi.i66.bayron.postpayment.readback.v1',status:first.status,
    policyNumber:K.policy,receiptId:K.first,firstSourceNumberPresent:!first.numberMissing,
    signedEventCount:first.signedEventCount,signedRequestCount:first.signedRequestCount,
    linkedCobroCount:first.linkedCobroCount,applicationState:first.applicationState,
    signedHumanPaymentDate:K.firstPaidAt,amountCents:K.amountCents,
    secondPayment:first.secondCurrent,secondPaymentDate:first.secondPaymentDateEvidence,
    secondAction:'HOLD_NO_EFFECTIVE_DATE_SOURCE',writes:0,
    financialFingerprint:digest(financeSnapshot(before))};
  if (mode==='readonly') { console.log('I66_BAYRON_POSTPAYMENT_READONLY='+JSON.stringify(safe)); return; }
  if (mode!=='apply_commission_reconciliation' || process.env.GI_I66_POSTPAYMENT_WRITE_ENABLED!=='YES_APPROVED_BAYRON_FIRST_58876231')
    fail('PROTECTED_COMMISSION_RECONCILIATION_NOT_ENABLED');
  const gate=await verifyReviewGate();
  const applied=await protectedCommissionReconcile(db,x,gate,digest(immutableSnapshot(before)));
  const after=await readCurrent(x),verified=review(after);
  if (verified.problems.length || verified.status!=='PAID_AND_RECONCILED' ||
      digest(immutableSnapshot(before))!==digest(immutableSnapshot(after)))
    fail('RECONCILIATION_READBACK_DRIFT_MANUAL_REVIEW');
  console.log('I66_BAYRON_PROTECTED_RECONCILIATION='+JSON.stringify({status:applied.status,writes:applied.writes,
    amountCents:K.amountCents,newPayments:0,receiptNumber:K.firstSource,
    applicationState:verified.applicationState,applicationDateAsserted:false,
    secondPaymentWrites:0,readback:'PASS'}));
}

if(require.main===module) main().catch(e=>{console.error(safeError(e));process.exitCode=1});
module.exports={K,cents,amt,paid,digest,review,financeSnapshot,immutableSnapshot,commissionPatches,verifyReviewGate,safeError};
