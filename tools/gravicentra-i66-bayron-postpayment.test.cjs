'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const script=process.env.GI_I66_BAYRON_POSTPAYMENT_SOURCE||path.join(__dirname,'gravicentra-i66-bayron-postpayment.cjs');
const {K,review,financeSnapshot,immutableSnapshot,commissionPatches,digest,verifyReviewGate,safeError}=require(script);

function facts(){
  const first={id:K.first,polizaId:K.policyId,clienteId:'cli_bayron',pais:'GT',moneda:'GTQ',monto:1557.92,
    vence:K.firstDue,estado:'Pagado',fechaPago:K.firstPaidAt,conciliadoPago:true,
    paymentState:'PAID_DIRECT',applicationState:'PENDING_APPLICATION'};
  const second={id:K.second,polizaId:K.policyId,clienteId:'cli_bayron',pais:'GT',moneda:'GTQ',monto:1557.92,
    vence:K.secondDue,estado:'Pendiente',conciliadoPago:false};
  const cb={id:'cob_signed_bayron',polizaId:K.policyId,reciboId:K.first,monto:1557.92,
    estado:'Pagado',paidDate:K.firstPaidAt,applicationState:'PENDING_APPLICATION',paymentState:'PAID_DIRECT',conciliado:false};
  return {policyMatches:1,policy:{id:K.policyId,numero:K.policy,clienteId:'cli_bayron',pais:'GT'},
    client:{id:'cli_bayron',pais:'GT'},first,second,
    receipts:[first,second,...Array.from({length:12},(_,i)=>({id:'old_'+i,polizaId:K.policyId}))],
    car:[{id:'car_'+K.first,reciboId:K.first,polizaId:K.policyId,monto:1557.92,estado:'Pagado',fechaPago:K.firstPaidAt,conciliadoPago:true}],
    cobros:[cb],secondCar:[{id:'car_'+K.second,reciboId:K.second,estado:'Pendiente',monto:1557.92}],
    secondCobros:[],policyCobros:[cb],
    requests:[{id:'real_signed_req',status:'committed',operation:'apply_payment',result:{receiptId:K.first}}],
    events:[{id:'payevt_signed',operation:'apply_payment',receiptId:K.first,actor:{uid:'signed_paula',activeRole:'direccion'}}],
    sourceMatches:[],maintenance:null};
}

test('signed LIVE payment shown as paid pending application, never counted unpaid',()=>{
  const x=review(facts());
  assert.equal(x.status,'PAID_PENDING_APPLICATION');
  assert.equal(x.applicationState,'PENDING_APPLICATION');
  assert.equal(x.linkedCobroCount,1);
  assert.equal(x.signedRequestCount,1);
  assert.equal(x.signedEventCount,1);
  assert.equal(x.numberMissing,true);
  assert.equal(x.secondCurrent,'SECOND_STILL_UNPAID');
  assert.equal(x.secondPaymentDateEvidence,null);
});

test('first paid application becomes reconciled only with corresponding signed state',()=>{
  const f=facts();f.cobros[0].conciliado=true;f.cobros[0].applicationState='APPLIED_DIRECT';
  assert.equal(review(f).status,'PAID_AND_RECONCILED');
});

test('one correctly linked insurer receipt number is a no-op metadata condition',()=>{
  const f=facts();f.first.numeroReciboFuente=K.firstSource;f.sourceMatches=[f.first];
  assert.equal(review(f).numberMissing,false);
  assert.equal(review(f).status,'PAID_PENDING_APPLICATION');
});

test('metadata-only change leaves complete finance snapshot hash unchanged',()=>{
  const f=facts(),before=digest(financeSnapshot(f));
  f.first.numeroReciboFuente=K.firstSource;f.sourceMatches=[f.first];
  assert.equal(digest(financeSnapshot(f)),before);
});

test('absent signed callable event is not accepted as payment certification',()=>{
  const f=facts();f.events=[];
  assert.equal(review(f).status,'HOLD_VERIFY_SIGNED_FINANCIAL_RECORD');
  assert.ok(review(f).problems.includes('SIGNED_PRIVILEGED_EVENT_MISSING_OR_DUPLICATE'));
});

test('real signed superadmin is authorized, advisor is not',()=>{
  const f=facts();f.events[0].actor.activeRole='superadmin';assert.equal(review(f).status,'PAID_PENDING_APPLICATION');
  f.events[0].actor.activeRole='asesor';assert.ok(review(f).problems.includes('SIGNED_PRIVILEGED_EVENT_MISSING_OR_DUPLICATE'));
});

test('absent idempotent signed request is not accepted',()=>{
  const f=facts();f.requests=[];
  assert.ok(review(f).problems.includes('SIGNED_PAYMENT_REQUEST_MISSING_OR_DUPLICATE'));
});

test('duplicate cobros and orphaned policy cobros hold',()=>{
  const f=facts();f.cobros.push({...f.cobros[0],id:'dup'});f.policyCobros.push({id:'orphan',polizaId:K.policyId,reciboId:'wrong'});
  const p=review(f).problems;
  assert.ok(p.includes('FIRST_COBRO_MISSING_DUPLICATE_OR_WRONG_AMOUNT'));
  assert.ok(p.includes('POLICY_COBROS_ORPHANS_OR_DUPLICATES'));
});

test('incorrect date or amount cannot be treated as certified first payment',()=>{
  const f=facts();f.first.fechaPago='2026-08-20';f.cobros[0].monto=100;
  const p=review(f).problems;
  assert.ok(p.includes('FIRST_PAID_RECEIPT_INCONSISTENT'));
  assert.ok(p.includes('FIRST_COBRO_MISSING_DUPLICATE_OR_WRONG_AMOUNT'));
});

test('second financial changes are flagged, never added to first mutation scope',()=>{
  const f=facts();f.second.fechaPago='2026-11-10';f.secondCobros=[{id:'cob_other',reciboId:K.second}];
  assert.equal(review(f).secondCurrent,'SECOND_HAS_FINANCIAL_ACTIVITY_REVIEW_SEPARATELY');
  assert.equal(review(f).secondPaymentDateEvidence,'2026-11-10');
  assert.equal(review(f).status,'PAID_PENDING_APPLICATION');
});

test('source number collision across policy/receipt holds',()=>{
  const f=facts();f.sourceMatches=[{id:'other',numeroReciboFuente:K.firstSource}];
  assert.ok(review(f).problems.includes('INSURER_SOURCE_NUMBER_DUPLICATE'));
});

test('source number metadata audit conflict must be reviewed',()=>{
  const f=facts();f.maintenance={status:'SOURCE_NUMBER_ROLLED_BACK'};
  assert.ok(review(f).problems.includes('MAINTENANCE_AUDIT_CONFLICT'));
});

test('protected commission CAS changes only existing receipt, cobro and cartera; never adds a second payment',()=>{
  const s=fs.readFileSync(script,'utf8');
  assert.ok(s.includes('tx.update(x.first,patches.receipt)'));
  assert.ok(s.includes('tx.update(x.cobroCol.doc(cobro.id),patches.cobro)'));
  assert.ok(s.includes('tx.update(x.carCol.doc(cartera.id),patches.cartera)'));
  assert.ok(s.includes('tx.create(x.maintenance'));
  assert.ok(!/tx\.(?:set|create)\(x\.(?:car|cobro|policy|second)/.test(s));
  assert.ok(!s.includes('tx.update(x.second'));
  assert.ok(!s.includes('tx.create(x.cobro'));
  assert.ok(!s.includes('applicationDate:'));
  assert.ok(!s.includes('.cloudfunctions.net/'));
  assert.ok(s.includes("GI_I66_POSTPAYMENT_WRITE_ENABLED!=='YES_APPROVED_BAYRON_FIRST_58876231'"));
});

test('commission patches contain no money, payment date, application date, role impersonation or second receipt',()=>{
  const p=commissionPatches('TECHNICAL_TIME_ONLY');
  assert.equal(p.receipt.numeroReciboFuente,'58876231');
  for(const block of Object.values(p)){
    assert.equal(block.applicationState,'APPLIED_DIRECT');
    assert.equal(block.applicationEvidenceRef,K.firstSourceUrl);
    for(const key of ['monto','amount','fechaPago','paidDate','paymentState','applicationDate','fechaAplicacion',
      'actor','updatedByUid','clienteId','polizaId','reciboId','estado','moneda'])assert.equal(Object.hasOwn(block,key),false,key);
  }
});

test('technical enrichment only excludes approved application fields from immutable financial fingerprint',()=>{
  const f=facts(),hash=digest(immutableSnapshot(f));
  f.first.numeroReciboFuente=K.firstSource;f.first.applicationState='APPLIED_DIRECT';f.first.conciliado=true;
  f.cobros[0].applicationState='APPLIED_DIRECT';f.cobros[0].conciliado=true;
  f.car[0].applicationState='APPLIED_DIRECT';f.car[0].conciliadoPago=true;
  assert.equal(digest(immutableSnapshot(f)),hash);
  f.cobros[0].paidDate='2026-11-01';assert.notEqual(digest(immutableSnapshot(f)),hash);
});

test('GitHub THIS-RUN Paula reviewer absence must block commission reconciliation',async()=>{
  const vars={GITHUB_REPOSITORY:K.repo,GITHUB_REF:'refs/heads/'+K.branch,GITHUB_EVENT_NAME:'push',
    GI_I66_ENVIRONMENT:K.environment,GI_I66_INTENT:K.intent,GITHUB_RUN_ID:'789',GITHUB_SHA:'a'.repeat(40),GI_I66_GITHUB_ACTIONS_READ_TOKEN:'mock'};
  const old=Object.fromEntries(Object.keys(vars).map(k=>[k,process.env[k]])),originalFetch=global.fetch;
  Object.assign(process.env,vars);
  global.fetch=async()=>({ok:true,json:async()=>[]});
  try{await assert.rejects(verifyReviewGate(),/THIS_RUN_HUMAN_REVIEW_NOT_CONFIRMED/)}
  finally{global.fetch=originalFetch;for(const k of Object.keys(vars))old[k]===undefined?delete process.env[k]:process.env[k]=old[k];}
});

test('actual listed Paula reviewer approval and SHA are verified without self-bypass invention',async()=>{
  const vars={GITHUB_REPOSITORY:K.repo,GITHUB_REF:'refs/heads/'+K.branch,GITHUB_EVENT_NAME:'push',
    GI_I66_ENVIRONMENT:K.environment,GI_I66_INTENT:K.intent,GITHUB_RUN_ID:'790',GITHUB_SHA:'b'.repeat(40),GI_I66_GITHUB_ACTIONS_READ_TOKEN:'mock',GITHUB_ACTOR:'paulaosoriof86'};
  const old=Object.fromEntries(Object.keys(vars).map(k=>[k,process.env[k]])),originalFetch=global.fetch;
  Object.assign(process.env,vars);
  global.fetch=async url=>({ok:true,json:async()=>url.includes('/approvals')?
    [{state:'approved',user:{login:'paulaosoriof86'},environments:[{name:K.environment}]}]:
    {object:{sha:'b'.repeat(40)}}});
  try{assert.equal((await verifyReviewGate()).reviewerApprovals,1)}
  finally{global.fetch=originalFetch;for(const k of Object.keys(vars))old[k]===undefined?delete process.env[k]:process.env[k]=old[k];}
});

test('logs never expose raw backend/customer errors',()=>{
  assert.equal(safeError(new Error('tenant/private/customer name/uid')),
    'GI_I66_BAYRON_POSTPAYMENT_EXTERNAL_FAILURE_PRIVATE_DETAILS_OMITTED');
});
