'use strict';
/**
 * I6.6 Universales / Maria Gabriela: LIVE source-reference-only protected CAS.
 * Ten insurer numbers are fixed by archived insurer aging. Seven contractual
 * due dates differ because the current installment engine drifted at month
 * boundaries. This action NEVER patches dates or represents a payment.
 * GitHub Environment reviewer + HEAD lease are mandatory for any mutation.
 */
const fs=require('node:fs');
const crypto=require('node:crypto');

const K=Object.freeze({
  project:'ays-orbit-360-lab',repo:'paulaosoriof86/orbit360-core',
  branch:'recovery/fase-a-clean-20260831',environment:'gravicentra-live-data-writes',
  policy:'04-15-01-000603-0',policyId:'pol_mwajp407',clientId:'cli_mwafruvk',
  firstSeq:3,lastSeq:12,amountCents:95256,
  sourceArchive:'artifacts/orbit360-recovery/release-control/i6-6-p0-checkpoints/I66_UNIVERSALES_MARIA_10_PATCH_ONLY_NOT_APPLIED_20261110.tar.gz.b64.md',
  sourceArchiveGitBlob:'0938c08daa1238b77007eb785ab5bd955dfac3ab',
  requestId:'gi_i66_universales_maria_10_numbers_20261113_v1',
  eventId:'gi_i66_universales_maria_10_numbers_20261113_audit_v1',
  intent:'UNIVERSALES_MARIA_10_SOURCE_NUMBER_ONLY_NO_PAYMENT_NO_DATE'
});
const txt=x=>String(x===null||x===undefined?'':x).trim();
const sha=x=>crypto.createHash('sha256').update(String(x)).digest('hex');
const stable=x=>x===null||typeof x!=='object'?x:typeof x.toJSON==='function'?stable(x.toJSON()):
  Array.isArray(x)?x.map(stable):Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])]));
const digest=x=>sha(JSON.stringify(stable(x)));
const cents=x=>x===null||x===undefined||txt(x)===''?null:
  Number.isFinite(Number(x))?Math.round((Number(x)+Number.EPSILON)*100):null;
const rowAmount=r=>[r?.monto,r?.montoTotal,r?.primaTotal].map(cents).find(x=>x!==null);
const norm=x=>txt(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const paid=r=>!!r&&(r.pagado===true||r.conciliado===true||r.conciliadoPago===true||
  !!txt(r.fechaPago||r.paidDate)||/pagad|recaudad|cobrad|aplicad|conciliad/.test(norm(r.estadoPago||r.estado)));
const halt=code=>{throw Error('GI_I66_MARIA_PROTECTED_HOLD_'+code)};
const doc=d=>d&&d.exists?{id:d.id,...(d.data()||{})}:null;
const idFor=seq=>'cob_'+K.policyId+'_'+String(seq).padStart(3,'0');
const safeError=e=>/^GI_I66_MARIA_PROTECTED_HOLD_[A-Z0-9_]+$/.test(txt(e?.message))?
  txt(e.message):'GI_I66_MARIA_PROTECTED_EXTERNAL_HOLD_PRIVATE_DETAILS_OMITTED';

function fixtureRows(f){
  if(f?.projectId!==K.project||f.status!=='NOT_APPLIED'||f.policyNumber!==K.policy||
    f.clientId!==K.clientId||f.policyId!=='pol_mwajp407_fizii'||
    f?.source?.kind!=='UNIVERSALES_AGING_CUTOFF_2026_11_09'||
    !Array.isArray(f.rows)||f.rows.length!==10)halt('FIXTURE_OR_PROVENANCE');
  const numbers=new Set(),ids=new Set();
  for(let i=0;i<10;i++){
    const r=f.rows[i],seq=i+3;
    if(r.seq!==seq||r.receiptId!=='cob_pol_mwajp407_fizii_'+String(seq).padStart(3,'0')||
      !/^394603[23][0-9]$/.test(txt(r.numeroReciboFuente))||
      txt(r.numeroReciboFuente)!==String(39460328+i)||
      !/^202[67]-\d\d-01$/.test(txt(r.contractualDueDate))||
      cents(r.amountGTQ)!==K.amountCents)halt('FIXTURE_ROW_'+seq);
    numbers.add(r.numeroReciboFuente);ids.add(r.receiptId);
  }
  if(numbers.size!==10||ids.size!==10)halt('DUPLICATE_SOURCE_ROWS');
  return f.rows.map(r=>({seq:r.seq,id:idFor(r.seq),source:r.numeroReciboFuente,
    due:r.contractualDueDate}));
}

function inspect(s,source){
  const issues=[],dueMismatches=[],patch=[];
  if(s.policyMatches!==1||!s.policy||s.policy.id!==K.policyId||
    txt(s.policy.numero||s.policy.numeroPoliza)!==K.policy||
    txt(s.policy.clienteId)!==K.clientId||
    txt(s.policy.pais).toUpperCase()!=='GT'||
    s.policy.tenantId&&txt(s.policy.tenantId)!==txt(s.tenantId)||
    !s.client||s.client.id!==K.clientId||
    s.client.tenantId&&txt(s.client.tenantId)!==txt(s.tenantId))issues.push('POLICY_CLIENT_TENANT');
  if(s.receipts.length!==12||new Set(s.receipts.map(r=>r?.id)).size!==12)issues.push('RECEIPTS_12');
  if(s.portfolio.length!==12||new Set(s.portfolio.map(r=>txt(r?.reciboId))).size!==12)
    issues.push('PORTFOLIO_12_RELATIONS');
  if(s.payments.length>0)issues.push('POLICY_PAYMENTS_REQUIRE_REVIEW');
  for(const one of source){
    const r=s.receipts.find(d=>d?.id===one.id),links=s.portfolio.filter(c=>txt(c.reciboId)===one.id);
    if(!r||txt(r.polizaId)!==K.policyId||txt(r.clienteId)&&txt(r.clienteId)!==K.clientId||
      Number(r.secuencia)!==one.seq||txt(r.cuota)!==one.seq+'/12'||
      rowAmount(r)!==K.amountCents||paid(r)||links.length!==1||
      txt(links[0]?.polizaId)!==K.policyId||rowAmount(links[0])!==K.amountCents||
      paid(links[0])){issues.push('RECEIPT_RELATION_STATE_'+one.seq);continue;}
    const current=txt(r.numeroReciboFuente),matches=s.sourceMatches[one.source]||[];
    if(current&&current!==one.source||matches.length>1||
      matches.some(x=>x.id!==one.id)||current===one.source&&matches.length!==1||
      !current&&matches.length!==0){issues.push('SOURCE_CONFLICT_'+one.seq);continue;}
    if(txt(r.vence)!==one.due)dueMismatches.push(one.seq);
    if(!current)patch.push({id:one.id,source:one.source,seq:one.seq});
  }
  // The seven mismatches were separately observed in signed LIVE 42904276754;
  // do not accept a changed calendar without another independent review.
  if(dueMismatches.join(',')!=='4,5,6,7,9,11,12')issues.push('DATE_DRIFT_SET_CHANGED');
  if(s.marker||s.event){
    if(!s.marker||!s.event||txt(s.marker.status)!=='committed'||
      txt(s.marker.eventId)!==K.eventId||txt(s.event.requestId)!==K.requestId||
      patch.length!==0)issues.push('AUDIT_PARTIAL_OR_CONFLICT');
  }else if(patch.length!==10){
    // A partial previous write without our audit marker must be investigated.
    issues.push('UNAUDITED_PARTIAL_SOURCE_APPLICATION');
  }
  return {ok:issues.length===0,issues,patchCount:patch.length,patch,
    sourceExactCount:10-patch.length,dueMismatches,
    historicalDueDateHold:true,paymentsCreated:0,datesChanged:0};
}

function refs(db,tenant){
  const t=db.collection('tenants').doc(tenant),c=n=>t.collection('data').doc(n).collection('items');
  return {tenant,policy:c('polizas').doc(K.policyId),client:c('clientes').doc(K.clientId),
    receipts:c('recibosEsperados'),portfolio:c('carteraPrimas'),payments:c('cobros'),
    marker:t.collection('operationalRequests').doc(K.requestId),
    event:t.collection('operationalEvents').doc(K.eventId)};
}
async function findTenant(db){
  const tenants=await db.collection('tenants').listDocuments(),matches=[];
  if(tenants.length<1||tenants.length>300)halt('TENANT_BOUND');
  for(const t of tenants){
    const q=await t.collection('data').doc('polizas').collection('items').where('numero','==',K.policy).limit(3).get();
    for(const d of q.docs)matches.push({tenant:t.id,id:d.id});
  }
  if(matches.length!==1||matches[0].id!==K.policyId)halt('POLICY_NOT_UNIQUE');
  return matches[0].tenant;
}
async function read(x,source,tx){
  const get=r=>tx?tx.get(r):r.get(),query=q=>tx?tx.get(q):q.get();
  const receipts=await Promise.all(Array.from({length:12},(_,i)=>get(x.receipts.doc(idFor(i+1)))));
  const [policy,client,portfolio,payments,marker,event,...sourceQueries]=await Promise.all([
    get(x.policy),get(x.client),query(x.portfolio.where('polizaId','==',K.policyId).limit(40)),
    query(x.payments.where('polizaId','==',K.policyId).limit(40)),get(x.marker),get(x.event),
    ...source.map(r=>query(x.receipts.where('numeroReciboFuente','==',r.source).limit(3)))
  ]);
  return {tenantId:x.tenant,policyMatches:policy.exists?1:0,policy:doc(policy),client:doc(client),
    receipts:receipts.map(doc),portfolio:portfolio.docs.map(doc),payments:payments.docs.map(doc),
    marker:doc(marker),event:doc(event),sourceMatches:Object.fromEntries(source.map((r,i)=>
      [r.source,sourceQueries[i].docs.map(doc)]))};
}
function financialSnapshot(s){
  return {policy:s.policy,client:s.client,receipts:s.receipts.map(x=>{
    if(!x)return x;
    const copy={...x};delete copy.numeroReciboFuente;return copy;
  }),portfolio:s.portfolio,payments:s.payments};
}
async function githubJSON(route){
  const token=txt(process.env.GI_I66_GITHUB_ACTIONS_READ_TOKEN);
  if(!token)halt('GITHUB_READ_TOKEN');
  const r=await fetch('https://api.github.com/repos/'+K.repo+route,{headers:{
    Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
    'X-GitHub-Api-Version':'2022-11-28'}});
  if(!r.ok)halt('GITHUB_AUDIT_'+r.status);
  return r.json();
}
async function approval(){
  if(process.env.GITHUB_REPOSITORY!==K.repo||process.env.GITHUB_REF!=='refs/heads/'+K.branch||
    process.env.GITHUB_EVENT_NAME!=='push'||
    process.env.GI_I66_ENVIRONMENT!==K.environment||
    process.env.GI_I66_INTENT!==K.intent||
    !/^\d+$/.test(txt(process.env.GITHUB_RUN_ID)))halt('GITHUB_INTENT_SCOPE');
  const approvals=await githubJSON('/actions/runs/'+process.env.GITHUB_RUN_ID+'/approvals');
  if(!Array.isArray(approvals)||!approvals.some(a=>txt(a.state).toLowerCase()==='approved'&&
    txt(a.user?.login).toLowerCase()==='paulaosoriof86'&&
    Array.isArray(a.environments)&&a.environments.some(e=>e.name===K.environment)))
    halt('HUMAN_REVIEW_THIS_RUN_MISSING');
  const current=await githubJSON('/git/ref/heads/'+K.branch);
  if(txt(current?.object?.sha)!==txt(process.env.GITHUB_SHA))halt('HEAD_MOVED_AFTER_REVIEW');
  return {runId:process.env.GITHUB_RUN_ID,head:process.env.GITHUB_SHA,reviewer:'paulaosoriof86'};
}
async function main(){
  if(process.env.GCLOUD_PROJECT!==K.project||process.env.FIRESTORE_EMULATOR_HOST)halt('PROJECT_BOUND');
  const path=txt(process.env.GI_I66_MARIA_FIXTURE_PATH);
  if(!path||!fs.existsSync(path))halt('SOURCE_FIXTURE_MISSING');
  const source=fixtureRows(JSON.parse(fs.readFileSync(path,'utf8')));
  const {getApps,initializeApp}=require('firebase-admin/app');
  const {getFirestore,FieldValue}=require('firebase-admin/firestore');
  const db=getFirestore(getApps()[0]||initializeApp({projectId:K.project}));
  const tenant=await findTenant(db),x=refs(db,tenant);
  const pre=await read(x,source),check=inspect(pre,source);
  if(!check.ok||digest(financialSnapshot(pre))!==digest(financialSnapshot(await read(x,source))))
    halt('PREIMAGE_OR_CONCURRENT_'+check.issues.join('_').slice(0,85));
  const base={schema:'gi.i66.universales.maria.ten-source-references.protected.v1',
    policy:K.policy,sourceCaseCount:10,sourceNumbersExact:check.sourceExactCount,
    dataWriteCount:0,paymentWriteCount:0,dateWriteCount:0,dateDriftHoldSequences:check.dueMismatches};
  if(process.env.GI_I66_MARIA_MODE!=='apply'){
    console.log('GI_I66_MARIA_PROTECTED_READONLY='+JSON.stringify({...base,eligible:check.patchCount}));return;
  }
  if(process.env.GI_I66_MARIA_WRITE_ENABLED!=='YES_REVIEWED_TEN_REFERENCE_FIELDS_ONLY')halt('WRITE_NOT_ENABLED');
  const gate=await approval();
  if(check.patchCount===0){console.log('GI_I66_MARIA_PROTECTED_REPLAY='+JSON.stringify({...base,status:'ALREADY_EXACT_WITH_AUDIT'}));return;}
  const preHash=digest(financialSnapshot(pre));
  let written=0;
  await db.runTransaction(async tx=>{
    const now=await read(x,source,tx),current=inspect(now,source);
    if(!current.ok||current.patchCount!==10||digest(financialSnapshot(now))!==preHash||
      now.marker||now.event)halt('CAS_PREIMAGE_CHANGED');
    for(const change of current.patch){
      tx.update(x.receipts.doc(change.id),{numeroReciboFuente:change.source});written++;
    }
    const timestamp=FieldValue.serverTimestamp();
    tx.create(x.marker,{schema:'gi.i66.universales.maria.source-ref-only.v1',status:'committed',
      requestId:K.requestId,eventId:K.eventId,policyId:K.policyId,sourceArchive:K.sourceArchive,
      sourceArchiveBlob:K.sourceArchiveGitBlob,insurerNumbers:source.map(r=>r.source),
      beforeFinanceDigest:preHash,changedFields:['numeroReciboFuente'],count:written,
      dateFieldsChanged:0,paymentsCreated:0,reviewRun:gate.runId,reviewedHead:gate.head,
      reviewedBy:gate.reviewer,createdAt:timestamp});
    tx.create(x.event,{schema:'gi.i66.universales.maria.source-ref-only.v1',
      operation:'attach_insurer_source_reference',requestId:K.requestId,receiptIds:current.patch.map(p=>p.id),
      policyId:K.policyId,source:K.sourceArchive,sourceArchiveBlob:K.sourceArchiveGitBlob,
      mutationCount:written,changedFields:['numeroReciboFuente'],
      dueDatesHeldForSeparateCorrection:current.dueMismatches,
      reviewRun:gate.runId,reviewedHead:gate.head,createdAt:timestamp});
  });
  const post=await read(x,source),after=inspect(post,source);
  const untouched=digest(financialSnapshot(pre))===digest(financialSnapshot(post));
  if(!after.ok||after.patchCount!==0||!untouched||written!==10||!post.marker||!post.event)
    halt('AFTER_COMMIT_READBACK_REQUIRES_INVESTIGATION');
  console.log('GI_I66_MARIA_PROTECTED_LIVE_PASS='+JSON.stringify({...base,
    status:'APPLIED_EXACT_TEN_SOURCE_NUMBERS',sourceNumbersExact:10,dataWriteCount:10,
    auditDocumentWrites:2,financialFieldsIdentical:untouched,protectedGithubRun:gate.runId,
    marker:K.requestId,datesStillHeld:7}));
}
if(require.main===module)main().catch(e=>{console.error(safeError(e));process.exitCode=1});
module.exports={K,fixtureRows,inspect,financialSnapshot,digest,safeError};
