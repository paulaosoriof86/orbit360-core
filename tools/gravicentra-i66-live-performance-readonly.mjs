#!/usr/bin/env node
// I6.6 LIVE/PREVIEW P0. Browser-origin timings only; never write business data.
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
const require=createRequire(import.meta.url);
import {chromium} from 'playwright';
import {initializeApp,applicationDefault,getApps} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {getAuth} from 'firebase-admin/auth';

const PROJECT='ays-orbit-360-lab';
const TENANT='alianzas-soluciones';
const LIVE='https://app.aysseguros.com';
const OUTPUT=process.env.GI_I66_PERF_REPORT;
const norm=x=>String(x??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const need=(ok,code)=>{if(!ok)throw Error(code);};
need(process.env.GI_I66_PERF_PROJECT===PROJECT&&process.env.GI_I66_PERF_TENANT===TENANT,'I66_PERF_PROJECT_TENANT_HOLD');
need(!process.env.FIRESTORE_EMULATOR_HOST,'I66_PERF_EMULATOR_HOLD');
need(OUTPUT&&OUTPUT.startsWith(process.env.RUNNER_TEMP+'/'),'I66_PERF_OUTPUT_SCOPE_HOLD');
// Keep Preview bound to its immutable source. LIVE observers may use only an
// explicitly pinned, source-tested read-only QA revision for the accepted head.
const phase=process.env.GI_I66_PERF_PHASE||'live';
const readMode=process.env.GI_I66_READONLY_MODE||'performance';
need(['performance','six-existing-receipts'].includes(readMode),'I66_READONLY_MODE_HOLD');
need(readMode==='performance'||phase==='live','I66_SIX_REAL_DATA_LIVE_ONLY');
need(['preview','live'].includes(phase),'I66_PERF_PHASE_HOLD');
const release=require('./gravicentra-i6-6-operational-release-candidate.cjs');
const controlOwner=require('./gravicentra-i66-frontend-control.cjs');
const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const transport=readJson(release.CONTROL);
const pending=transport.scopedBackendPreviewI66?.candidate||transport.operationalReleaseCandidate;
const observer=phase==='live'?controlOwner.resolveReadonlyObserver('performance',readJson(controlOwner.P.cp),
  readJson(controlOwner.P.state),transport,fs,(...args)=>execFileSync('git',args),process.env.GITHUB_SHA):null;
const pin=observer?observer.physical:phase==='preview'&&pending
  ?release.candidateForPhase(transport,transport.status==='OPERATIONAL_EXACT_LIVE_PROMOTION_AUTHORIZED'?'live':'preview')
  :controlOwner.physicalGuard(readJson(controlOwner.P.cp),readJson(controlOwner.P.state),transport,fs);
const APPROVED_PREVIEW=pin.previewUrl;
const CURRENT_LIVE_SOURCE=pin.sourceSha;
const ORIGIN=process.env.GI_I66_PERF_ORIGIN||(phase==='preview'?APPROVED_PREVIEW:LIVE);
need(ORIGIN===(phase==='preview'?APPROVED_PREVIEW:LIVE),'I66_PERF_ORIGIN_NOT_APPROVED');
if(process.env.I66_APPROVED_LIVE_SOURCE_SHA)
  need(process.env.I66_APPROVED_LIVE_SOURCE_SHA===pin.sourceSha,'I66_PERF_SOURCE_ENV_DRIFT');
const DRIVER='tools/gravicentra-i66-live-performance-readonly.mjs';
if(phase==='preview')need(fs.readFileSync(DRIVER).equals(execFileSync('git',['show',pin.sourceSha+':'+DRIVER])),
  'I66_PERF_DRIVER_SOURCE_BYTES_DRIFT');
const app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId:PROJECT});
const db=getFirestore(app),auth=getAuth(app);
const report={
  schema:'GI_I66_BROWSER_PERFORMANCE_READONLY_V2',project:PROJECT,tenant:TENANT,
  origin:ORIGIN,gate:'I6.6',
  sourceSha:pin.sourceSha,buildId:pin.buildId,releaseArtifactId:pin.artifactId,
  releaseArtifactDigest:pin.artifactDigest,releaseBuildRunId:pin.buildRunId,phase,
  workflowHeadSha:process.env.GITHUB_SHA||'',
  readOnly:true,firestoreWrites:0,businessActions:0,paymentActions:0,
  syntheticFixtures:0,pushNotifications:0,roleChanged:false,
  auth:{},routes:[],mobile:{},errors:[],notes:[]
};
async function findCarlos(){
  const tenant=db.collection('tenants').doc(TENANT);
  const [members,advisors]=await Promise.all([
    tenant.collection('members').limit(150).get(),
    tenant.collection('data').doc('asesores').collection('items').limit(400).get()
  ]);
  need(members.size<150,'I66_PERF_MEMBERSHIP_BOUND_HOLD');
  need(advisors.size<400,'I66_PERF_ADVISOR_BOUND_HOLD');
  const knownAdvisors=new Set(),knownUids=new Set();
  for(const doc of advisors.docs){
    const a=doc.data()||{};
    if([a.nombre,a.nombreCompleto,a.displayName,a.name].some(x=>norm(x)==='carlos castro'||norm(x).startsWith('carlos castro '))){
      knownAdvisors.add(doc.id);
      for(const id of [a.authUid,a.uid,a.userId])if(id)knownUids.add(String(id));
    }
  }
  const candidates=members.docs.filter(d=>{
    const m=d.data()||{},v=[m.nombre,m.displayName,m.name,m.nombreCompleto,m.fullName];
    const isName=v.some(x=>norm(x)==='carlos castro'||norm(x).startsWith('carlos castro '))||
      knownAdvisors.has(String(m.advisorId||m.asesorId||''))||knownUids.has(d.id);
    const roles=[m.activeRole,m.rol,m.rolDefault,...[].concat(m.roles||[])].map(norm);
    const active=m.active!==false&&m.activo!==false&&!['inactivo','inactive','bloqueado','blocked'].includes(norm(m.status||m.estado));
    return isName&&active&&roles.includes('operativo');
  });
  need(candidates.length===1,'I66_PERF_CARLOS_IDENTITY_NOT_UNIQUE');
  const who=await auth.getUser(candidates[0].id);
  need(!who.disabled&&who.emailVerified===true,'I66_PERF_CARLOS_AUTH_HOLD');
  return {uid:who.uid,allowedRole:'operativo'};
}
// Existing bootstrap events only: no request, polling or altered timing mark.
function installBootstrapObservation(){
  const timeline=[];window.__GI_I66_BOOTSTRAP_TIMELINE__=timeline;
  const text=value=>/^[A-Z0-9_.:-]{0,80}$/i.test(String(value||''))?String(value||''):'';
  const record=(name,detail)=>{
    if(timeline.length>=80)return;
    const d=detail||{};
    timeline.push({event:name,timeMs:Math.round(performance.now()),phase:text(d.phase),ready:d.ready===true,
      initialized:d.initialized===true,activating:d.activating===true,started:d.started===true,routerStarted:d.routerStarted===true,
      tenantContextReady:d.tenantContextReady===true,failurePhase:text(d.failurePhase),failureCode:text(d.failureCode)});
  };
  window.addEventListener('orbit:product-readonly-bootstrap',event=>record('bootstrap',event.detail));
  document.addEventListener('orbit:product-app',event=>record('application',event.detail));
}
// A12 is a bounded readback of six existing obligations, not a payment/reapply.
const SIX_RECEIPT_AUTHORITY='artifacts/orbit360-recovery/release-control/I6_6_FINANCIAL_SIX_EXISTING_RECEIPTS_READBACK_20261123_RUN45272554046.json';
const SIX_RECEIPT_AUTHORITY_SHA='57fea2606809ddae2a5141f40af196348138b78d2a1d5ae340d42f3481b720ec';
// Inputs consumed by the current balance/open/payment owners. Compare the
// actual browser values to a fresh server snapshot before trusting the owner.
const SIX_FINANCIAL_FIELDS=Object.freeze(['monto','saldo','primaTotal','montoTotal','carteraActiva','conciliadoPago',
  'estadoCartera','estado','estadoOperativo','paymentState','applicationState','pagado','conciliado','inferredPaid',
  'paidInferred','pagoReportado','archivado','fechaPago','paidDate','fechaLimite','fechaVencimiento','vence','cobroId',
  'reciboId','receiptId','polizaId','policyId','pais','country','moneda','divisa','directOrInferred','paymentOrigin',
  'paymentOriginKind','evidenceType','sourceType','fuenteAutoridad','origenAutoridad','fuenteConciliacion','authority']);
function sixFinancialInputs(row){return Object.fromEntries(SIX_FINANCIAL_FIELDS.filter(k=>row[k]!==undefined).map(k=>[k,row[k]]));}
function visibleCivilDate(text){
  const m=/^(\d{1,2})\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|sept|oct|nov|dic)\.?\s+(\d{4})$/i.exec(String(text||'').trim().replace(/\u00a0/g,' '));
  if(!m)return '';
  const month={ene:1,feb:2,mar:3,abr:4,may:5,jun:6,jul:7,ago:8,sep:9,sept:9,oct:10,nov:11,dic:12}[m[2].toLowerCase()];
  const d=Number(m[1]),y=Number(m[3]),verified=new Date(Date.UTC(y,month-1,d));
  if(verified.getUTCFullYear()!==y||verified.getUTCMonth()!==month-1||verified.getUTCDate()!==d)return '';
  return m[3]+'-'+String(month).padStart(2,'0')+'-'+String(d).padStart(2,'0');
}
function isSixReceiptBusinessWrite(method,url){
  const verb=String(method||'').toUpperCase();if(verb==='OPTIONS')return false;
  const parsed=new URL(url),host=parsed.hostname,path=parsed.pathname;
  if(/(?:cloudfunctions\.net$|\.run\.app$)/i.test(host)&&/Command|Ingest|Upload|Submit|Send|Delete|Create|Update|Accept/i.test(host+path))return true;
  if(/\/functions\/[^/?]*(?:Command|Ingest|Upload|Submit|Send|Delete|Create|Update|Accept)/i.test(path))return true;
  if(!/^firestore(?:\.[a-z0-9-]+)*\.googleapis\.com$/i.test(host))return false;
  if(/Firestore\/Write(?:\/|$)|documents:(?:commit|batchWrite)/i.test(path))return true;
  if(['PATCH','PUT','DELETE'].includes(verb))return true;
  if(verb==='POST')return !(/:(?:runQuery|runAggregationQuery|batchGet|listCollectionIds)$/.test(path)||/Firestore\/Listen(?:\/|$)/.test(path));
  return false;
}
function stableFocal(value){
  if(Array.isArray(value))return value.map(stableFocal);
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,stableFocal(value[k])]));
  return value;
}
function focalHash(value){return require('node:crypto').hash('sha256',JSON.stringify(stableFocal(value)));}
function focalState(row){return Object.fromEntries(['estado','estadoOperativo','estadoCartera','paymentState','applicationState','pagado','conciliado','carteraActiva','inferredPaid','archivado','fechaPago','paidDate'].filter(k=>row[k]!==undefined).map(k=>[k,row[k]]));}
function focalGross(row){
  const raw=row.primaTotal??row.montoTotal??row.monto;
  need(raw!==null&&raw!==undefined&&String(raw).trim()!==''&&Number.isFinite(Number(raw)),'I66_SIX_SOURCE_AMOUNT_UNVERIFIED');
  return Math.round(Number(raw)*100);
}
function sixReceiptAuthority(){
  const bytes=fs.readFileSync(SIX_RECEIPT_AUTHORITY);
  need(require('node:crypto').hash('sha256',bytes)===SIX_RECEIPT_AUTHORITY_SHA,'I66_SIX_AUTHORITY_DIGEST_DRIFT');
  need(bytes.equals(execFileSync('git',['show',pin.sourceSha+':'+SIX_RECEIPT_AUTHORITY])),'I66_SIX_AUTHORITY_SOURCE_PIN_DRIFT');
  const authority=JSON.parse(bytes);
  need(authority.execution.runId===45272554046&&authority.scope.policyId==='pol_08ef784b45dab5a2acbfa556442c'&&
    authority.result.committedExistingObligationUpdates===6&&authority.result.newFinancialObligations===0&&authority.result.paymentWrites===0,
    'I66_SIX_AUTHORITY_SCOPE_DRIFT');
  need(authority.rows.length===6&&new Set(authority.rows.map(r=>r.receiptId)).size===6&&
    authority.rows.every((r,i)=>r.sourceRequirement===String(5228533+i)&&r.receiptGrossCentsAfter===27826),
    'I66_SIX_AUTHORITY_ROWS_DRIFT');
  return authority;
}
function validateSixSourceRow(expected,actual){
  need(actual.receiptId===expected.receiptId&&actual.portfolioId===expected.portfolioId&&
    actual.policyId==='pol_08ef784b45dab5a2acbfa556442c'&&actual.portfolioPolicyId===actual.policyId&&
    actual.portfolioReceiptId===actual.receiptId&&actual.clientCoherent===true,'I66_SIX_SOURCE_ID_RELATION_DRIFT');
  need(actual.requirement===expected.sourceRequirement&&actual.contractualDue===expected.contractualDueAfter&&
    actual.operationalLimit===expected.operationalLimitBeforeAndAfter,'I66_SIX_SOURCE_REQUIREMENT_DUE_DRIFT');
  need(actual.currency==='GTQ'&&actual.portfolioCurrency==='GTQ'&&actual.grossCents===27826&&actual.portfolioGrossCents===27826,
    'I66_SIX_SOURCE_AMOUNT_CURRENCY_DRIFT');
  need(actual.portfolioMatches===1&&actual.cobrosTruncated===false&&actual.rollbackPresent===true&&actual.auditIdentity===true,
    'I66_SIX_SOURCE_DUPLICATE_OR_AUDIT_HOLD');
}
async function sixServerSnapshot(authority){
  const tenant=db.collection('tenants').doc(TENANT),col=name=>tenant.collection('data').doc(name).collection('items');
  const policy=await col('polizas').doc(authority.scope.policyId).get();
  need(policy.exists&&policy.get('clienteId')&&policy.get('pais')==='GT','I66_SIX_POLICY_CLIENT_SCOPE_HOLD');
  const clientId=String(policy.get('clienteId'));
  const rows=await Promise.all(authority.rows.map(async expected=>{
    const [receipt,portfolio,linked,cobros,audit]=await Promise.all([
      col('recibosEsperados').doc(expected.receiptId).get(),col('carteraPrimas').doc(expected.portfolioId).get(),
      col('carteraPrimas').where('reciboId','==',expected.receiptId).limit(3).get(),
      col('cobros').where('reciboId','==',expected.receiptId).limit(3).get(),tenant.collection('operationalRequests').doc(expected.auditId).get()
    ]);
    need(receipt.exists&&portfolio.exists&&audit.exists,'I66_SIX_SOURCE_DOCUMENT_MISSING');
    const r=receipt.data(),p=portfolio.data(),a=audit.data();
    const row={receiptId:receipt.id,portfolioId:portfolio.id,policyId:r.polizaId,portfolioPolicyId:p.polizaId,
      portfolioReceiptId:p.reciboId,clientCoherent:r.clienteId===clientId&&p.clienteId===clientId,
      requirement:String(r.numeroReciboFuente||''),contractualDue:r.fechaVencimientoContractual||'',operationalLimit:r.fechaLimite||'',
      currency:r.moneda,portfolioCurrency:p.moneda,grossCents:focalGross(r),portfolioGrossCents:focalGross(p),
      receiptState:focalState(r),portfolioState:focalState(p),portfolioMatches:linked.size,cobrosTruncated:cobros.size>=3,
      cobrosCount:cobros.size,cobrosFingerprints:cobros.docs.map(d=>focalHash({id:d.id,data:d.data()})).sort(),
      financialInputsFingerprint:focalHash({receipt:sixFinancialInputs(r),portfolio:sixFinancialInputs(p),policy:sixFinancialInputs(policy.data()),
        cobros:cobros.docs.map(d=>({id:d.id,fields:sixFinancialInputs(d.data())})).sort((a,b)=>a.id.localeCompare(b.id))}),
      rollbackPresent:!!a.rollback&&typeof a.rollback==='object',
      auditIdentity:a.receiptId===r.id&&a.portfolioId===p.id&&a.policyId===r.polizaId&&a.requirement===expected.sourceRequirement&&
        a.sourceContractualDue===expected.contractualDueAfter&&a.paymentWrites===0&&a.cobroWrites===0,
      receiptFingerprint:focalHash(r),portfolioFingerprint:focalHash(p),auditFingerprint:focalHash(a)};
    validateSixSourceRow(expected,row);return row;
  }));
  return {clientId,policyFingerprint:focalHash(policy.data()),rows};
}
function inspectSixReceiptBrowser(input){
  const {expected,clientId,actorUid,financialFields}=input,store=Orbit.store;
  const root=document.querySelector('[data-rp-receipt-detail-id="'+CSS.escape(expected.receiptId)+'"]');
  const receipt=store.get('recibosEsperados',expected.receiptId),portfolio=store.get('carteraPrimas',expected.portfolioId);
  if(!root||!receipt||!portfolio)return {ready:false};
  const cells=Array.from(root.querySelector('[data-rp-detail-values]')?.children||[]);
  const value=label=>cells.find(e=>String(e.children[0]?.textContent||'').trim()===label)?.children[1]?.textContent?.trim()||'';
  const moneyCents=text=>{const value=String(text||'').trim().replace(/^Saldo pendiente:\s*/,'').replace(/\u00a0/g,' ');
    const m=/^Q\s+(-?(?:\d{1,3}(?:,\d{3})*|\d+)\.\d{2})$/.exec(value);if(!m)return null;
    const amount=Number(m[1].replace(/,/g,''));return Number.isFinite(amount)?Math.round(amount*100):null;};
  const state=row=>Object.fromEntries(['estado','estadoOperativo','estadoCartera','paymentState','applicationState','pagado','conciliado','carteraActiva','inferredPaid','archivado','fechaPago','paidDate'].filter(k=>row[k]!==undefined).map(k=>[k,row[k]]));
  const status=store._productStatus(),member=Orbit.auth?.productUser;
  const payment=(store.all('cobros')||[]).find(r=>String(r.reciboId||r.receiptId||'')===expected.receiptId)||{};
  const fields=row=>Object.fromEntries(financialFields.filter(k=>row[k]!==undefined).map(k=>[k,row[k]]));
  const financialInputs={receipt:fields(receipt),portfolio:fields(portfolio),policy:fields(store.get('polizas',receipt.polizaId)||{}),
    cobros:(store.all('cobros')||[]).filter(r=>String(r.reciboId||r.receiptId||'')===expected.receiptId)
      .map(r=>({id:r.id,fields:fields(r)})).sort((a,b)=>String(a.id).localeCompare(String(b.id)))};
  const context=Orbit.q.portfolioAmountContext(),proof=Orbit.q.portfolioAmountProof(portfolio,context),open=Orbit.q.portfolioOpen(portfolio);
  const balanceCents=open?(proof.value==null?null:Math.round(Number(proof.value)*100)):0;
  const canonicalState=Orbit.receiptsPortfolioProjection.stateLabel(receipt,payment)?.t||'';
  return {ready:true,receiptId:root.getAttribute('data-rp-receipt-detail-id'),detailCount:document.querySelectorAll('[data-rp-receipt-detail-id="'+CSS.escape(expected.receiptId)+'"]').length,
    actorMatches:member?.uid===actorUid&&member?.tenantId==='alianzas-soluciones',role:String(Orbit.session.rol()),country:Orbit.pais,
    protectedCandidate:store._protectedCandidate===true,
    confirmed:['clientes','polizas','recibosEsperados','carteraPrimas','cobros'].every(k=>(status.serverConfirmedCollections||[]).includes(k)),
    relevantErrors:['clientes','polizas','recibosEsperados','carteraPrimas','cobros'].filter(k=>status.snapshotErrors?.[k]||(status.deniedCollections||[]).includes(k)),
    source:{receiptId:receipt.id,portfolioId:portfolio.id,policyId:receipt.polizaId,portfolioPolicyId:portfolio.polizaId,
      portfolioReceiptId:portfolio.reciboId,clientCoherent:receipt.clienteId===clientId&&portfolio.clienteId===clientId,
      requirement:String(receipt.numeroReciboFuente||''),contractualDue:receipt.fechaVencimientoContractual||'',operationalLimit:receipt.fechaLimite||'',
      currency:receipt.moneda,portfolioCurrency:portfolio.moneda,grossCents:Math.round(Number(receipt.primaTotal??receipt.montoTotal??receipt.monto)*100),
      portfolioGrossCents:Math.round(Number(portfolio.primaTotal??portfolio.montoTotal??portfolio.monto)*100),
      receiptState:state(receipt),portfolioState:state(portfolio)},
    financialInputs,
    displayedGrossCents:moneyCents(value('Prima total')),displayedContractualDue:value('Vencimiento contractual documentado'),
    displayedOperationalLimit:value('Fecha límite operativa'),
    displayedStatus:root.querySelector('[data-rp-hero-status]')?.textContent?.trim()||'',canonicalStatus:canonicalState,
    displayedBalanceCents:moneyCents(root.querySelector('[data-rp-current-balance]')?.textContent),balanceCents,
    balanceState:root.querySelector('[data-rp-current-balance]')?.getAttribute('data-rp-current-balance'),open,amountProofSource:proof.source||''};
}
function certifySixReceiptUi(expected,source,observed){
  need(observed.ready&&observed.detailCount===1&&observed.receiptId===expected.receiptId&&observed.actorMatches&&
    norm(observed.role)==='operativo'&&observed.country==='GT'&&observed.protectedCandidate&&observed.confirmed&&observed.relevantErrors.length===0,
    'I66_SIX_SIGNED_UI_SCOPE_OR_READINESS_HOLD');
  validateSixSourceRow(expected,{...observed.source,portfolioMatches:source.portfolioMatches,cobrosTruncated:source.cobrosTruncated,
    rollbackPresent:source.rollbackPresent,auditIdentity:source.auditIdentity});
  for(const key of ['receiptState','portfolioState'])need(focalHash(observed.source[key])===focalHash(source[key]),'I66_SIX_UI_STATE_DIFFERS_FROM_SERVER');
  const inputsFingerprint=focalHash(observed.financialInputs);delete observed.financialInputs;
  observed.financialInputsFingerprint=inputsFingerprint;
  need(inputsFingerprint===source.financialInputsFingerprint,'I66_SIX_UI_FINANCIAL_INPUTS_DIFFER_FROM_SERVER');
  need(observed.displayedGrossCents===27826&&visibleCivilDate(observed.displayedContractualDue)===expected.contractualDueAfter&&
    visibleCivilDate(observed.displayedOperationalLimit)===expected.operationalLimitBeforeAndAfter&&observed.displayedStatus&&observed.displayedStatus===observed.canonicalStatus&&
    observed.balanceCents!==null&&observed.displayedBalanceCents===observed.balanceCents&&
    observed.balanceState===(observed.open?'open':'closed'),'I66_SIX_VISIBLE_VALUES_OR_BALANCE_HOLD');
}
async function runSixReceiptUi(page,actor,errors){
  need(phase==='live','I66_SIX_REAL_DATA_LIVE_ONLY');
  const authority=sixReceiptAuthority(),before=await sixServerSnapshot(authority);
  const country=page.locator('#pais-sel');
  need(await country.count()===1,'I66_SIX_COUNTRY_SELECTOR_MISSING');
  if(await country.inputValue()!=='GT')await country.selectOption('GT');
  const observations=[];
  for(let i=0;i<authority.rows.length;i++){
    const expected=authority.rows[i],source=before.rows[i],input={expected,clientId:before.clientId,actorUid:actor.uid,financialFields:SIX_FINANCIAL_FIELDS};
    await page.evaluate(hash=>{location.hash=hash;},'#/cliente360?c='+encodeURIComponent(before.clientId)+'&t=recibos&r='+encodeURIComponent(expected.receiptId));
    const wait=()=>page.waitForFunction(id=>!!document.querySelector('[data-rp-receipt-detail-id="'+CSS.escape(id)+'"]')&&
      ['clientes','polizas','recibosEsperados','carteraPrimas','cobros'].every(k=>(Orbit.store?._productStatus?.().serverConfirmedCollections||[]).includes(k)),expected.receiptId,{timeout:60000});
    await wait();const first=await page.evaluate(inspectSixReceiptBrowser,input);certifySixReceiptUi(expected,source,first);
    await page.reload({waitUntil:'domcontentloaded',timeout:60000});await wait();
    const reloaded=await page.evaluate(inspectSixReceiptBrowser,input);certifySixReceiptUi(expected,source,reloaded);
    need(focalHash(first)===focalHash(reloaded),'I66_SIX_UI_RELOAD_CHANGED_VALUES');
    observations.push({sourceRequirement:expected.sourceRequirement,receiptId:expected.receiptId,portfolioId:expected.portfolioId,beforeReload:first,afterReload:reloaded,reloadPass:true});
  }
  const cobrosRead=async()=>{
    await page.evaluate(()=>{location.hash='#/cobros';});
    await page.waitForFunction(()=>!!document.querySelector('[data-cobros-financial-readiness="ready"]'),null,{timeout:60000});
    return page.evaluate(expected=>{
      const all=Orbit.modules.cobros.reportableRows();if(!Array.isArray(all))return {ready:false};
      const rows=expected.map(e=>{const found=all.filter(r=>String(r.receiptId||r.reciboId||r.id||'')===e.receiptId);
        return {receiptId:e.receiptId,count:found.length,rows:found.map(r=>({policyId:r.polizaId,currency:r.moneda,grossCents:Math.round(Number(r.monto)*100),due:r.vence,state:r.estado}))};});
      return {ready:true,rows,totalGrossCents:rows.reduce((n,r)=>n+r.rows.reduce((a,x)=>a+x.grossCents,0),0)};
    },authority.rows);
  };
  const cobrosBefore=await cobrosRead();await page.reload({waitUntil:'domcontentloaded',timeout:60000});const cobrosAfter=await cobrosRead();
  need(cobrosBefore.ready&&cobrosBefore.totalGrossCents===166956&&cobrosBefore.rows.every((r,i)=>r.count===1&&r.rows[0].grossCents===27826&&
    r.rows[0].currency==='GTQ'&&r.rows[0].policyId===authority.scope.policyId&&r.rows[0].due===authority.rows[i].operationalLimitBeforeAndAfter)&&
    focalHash(cobrosBefore)===focalHash(cobrosAfter),'I66_SIX_COBROS_CALCULATION_OR_RELOAD_HOLD');
  const after=await sixServerSnapshot(authority);
  need(focalHash(before)===focalHash(after),'I66_SIX_SERVER_CHANGED_DURING_READONLY_UI');
  const errorCounts=errors();need(errorCounts.pageErrors===0&&errorCounts.consoleErrors===0&&Object.keys(errorCounts.httpClasses).length===0&&errorCounts.blockedWrites===0,
    'I66_SIX_UI_HTTP_CONSOLE_OR_WRITE_ATTEMPT_HOLD');
  report.financialFocal={authorityPath:SIX_RECEIPT_AUTHORITY,authoritySha256:SIX_RECEIPT_AUTHORITY_SHA,writeRunId:45272554046,
    sixExistingObligations:true,newObligations:0,additionalWrites:0,sourceSnapshotBefore:before.rows,sourceSnapshotAfter:after.rows,
    policyUnchanged:before.policyFingerprint===after.policyFingerprint,observations,cobrosEngineBeforeReload:cobrosBefore,cobrosEngineAfterReload:cobrosAfter,
    cobrosEvidenceScope:'Canonical reportableRows calculation after real Cobros readiness and reload; individual Cobros DOM rows are not certified',
    currentOutstandingCents:observations.reduce((sum,x)=>sum+x.afterReload.balanceCents,0),sourceGrossCents:166956,distinctObligationCount:6,
    errors:errorCounts,scope:'Exact six-row UI/reload/calculation only;112 exceptions and other source universes remain separate; mini-freeze adjudication external'};
}

async function run(){
  if(observer)report.observerBefore=await controlOwner.verifyReadonlyObserver(observer);
  const response=await fetch(ORIGIN+'/__recovery__/build.json',{headers:{'cache-control':'no-cache'}});
  need(response.status===200,'I66_PERF_BUILD_MARKER_HTTP_HOLD');
  const marker=await response.json();
  need(marker.sourceSha===pin.sourceSha&&marker.buildId===pin.buildId&&marker.gate==='I6.6'&&
    marker.product==='Gravicentra Insurance','I66_PERF_SERVED_OR_CONTROL_DRIFT_HOLD');
  report.liveBuildId=phase==='live'?marker.buildId:null;
  report.liveReleaseArtifactId=phase==='live'?pin.artifactId:null;
  const actor=await findCarlos();
  const token=await auth.createCustomToken(actor.uid);
  let browser;
  try{
    browser=await chromium.launch({headless:true,args:['--no-sandbox']});
    const context=await browser.newContext({viewport:{width:1365,height:900},ignoreHTTPSErrors:false});
    await context.addInitScript(installBootstrapObservation);
    let blockedWrites=0;
    if(readMode==='six-existing-receipts')await context.route('**/*',route=>{
      const request=route.request();
      if(isSixReceiptBusinessWrite(request.method(),request.url())){blockedWrites++;return route.abort('blockedbyclient');}
      return route.continue();
    });
    const page=await context.newPage();
    let pageErrors=0,consoleErrors=0;
    const consoleClasses={},httpClasses={};
    const classifyError=message=>{
      const s=String(message||'').toLowerCase();
      if(/permission.denied|missing or insufficient permissions|403|unauthorized/.test(s))return 'PERMISSION';
      if(/functions\/internal|internal error|\binternal\b/.test(s))return 'FUNCTION_INTERNAL';
      if(/404|not found/.test(s))return 'NOT_FOUND';
      if(/network|failed to fetch|net::/.test(s))return 'NETWORK';
      if(/csp|content security policy/.test(s))return 'CSP';
      return 'OTHER';
    };
    page.on('pageerror',()=>{pageErrors++;});
    page.on('console',m=>{if(m.type()==='error'){
      consoleErrors++;const code=classifyError(m.text());consoleClasses[code]=(consoleClasses[code]||0)+1;
    }});
    page.on('response',response=>{
      const status=response.status();if(status<400)return;
      const url=response.url();const kind=/cloudfunctions\.net|\/functions\//.test(url)?'FUNCTION':
        /firestore|googleapis/.test(url)?'GOOGLE_API':'OTHER';
      const key=kind+'_'+String(status);httpClasses[key]=(httpClasses[key]||0)+1;
    });
    const wallStart=Date.now();
    await page.goto(ORIGIN+'/#/inicio',{waitUntil:'domcontentloaded',timeout:60000});
    report.auth.documentReadyWallMs=Date.now()-wallStart;
    report.auth.navigation=await page.evaluate(()=>{
      const n=performance.getEntriesByType('navigation')[0];
      return n?{domContentLoadedMs:Math.round(n.domContentLoadedEventEnd),loadMs:Math.round(n.loadEventEnd),
        transferBytes:n.transferSize||0,resourceCount:performance.getEntriesByType('resource').length}:null;
    });
    await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:15000});
    const activation=await page.evaluate(async(token)=>{
      const provider=Orbit.productRuntimeBrowserProvidersP0;
      const state=await provider.initialize();
      const authStart=performance.now();
      if(!state.auth.currentUser)await state.modules.auth.signInWithCustomToken(state.auth,token);
      const signedInMs=Math.round(performance.now()-authStart);
      const start=performance.now();
      try{
        const result=await Orbit.productAppP0.activate();
        return {ok:result?.started===true,signedInMs,activateMs:Math.round(performance.now()-start),
          role:String(Orbit.session?.rol?.()||''),storeStatus:String(Orbit.store?._productStatus?.().status||''),
          readyCollection:String(Orbit.store?._productStatus?.().startupCollection||''),
          hasRouter:!!Orbit.router?.render};
      }catch(error){
        return {ok:false,signedInMs,activateMs:Math.round(performance.now()-start),
          safeErrorCode:String(error?.code||error?.message||'ACTIVATION_FAILED').replace(/[^A-Z0-9_-]/gi,'').slice(0,90)};
      }
    },token);
    report.auth.activation=activation;
    need(activation.ok,'I66_PERF_AUTHENTICATED_BOOTSTRAP_HOLD');
    need(norm(activation.role)==='operativo','I66_PERF_ACTIVE_ROLE_NOT_CARLOS_OPERATIVO');
    report.auth.bootstrapTimeline=await page.evaluate(()=>window.__GI_I66_BOOTSTRAP_TIMELINE__||[]);
    report.auth.bootstrapTimelineScope='Existing events only; bounded80; no extra request or polling';
    if(readMode==='six-existing-receipts'){
      await runSixReceiptUi(page,actor,()=>({pageErrors,consoleErrors,httpClasses,blockedWrites}));
      const final=await fetch(ORIGIN+'/__recovery__/build.json',{headers:{'cache-control':'no-cache'}}).then(r=>r.json());
      need(final.sourceSha===pin.sourceSha&&final.buildId===pin.buildId,'I66_PERF_BUILD_CHANGED_DURING_RUN');
      report.status='LIVE_SIX_EXISTING_RECEIPTS_SIGNED_UI_RELOAD_CALCULATION_PASS';
      report.auth.pageErrors=pageErrors;report.auth.consoleErrors=consoleErrors;report.auth.httpErrorClasses=httpClasses;
      await context.close();return;
    }
    report.auth.storeReadContext=await page.evaluate(()=>({
      protectedCandidate:Orbit.store?._protectedCandidate===true,
      nativeStructuredClone:typeof structuredClone==='function',
      readAccessors:['all','get','where','find','_productStatus','raw','pref'].filter(x=>typeof Orbit.store?.[x]==='function')
    }));
    const cdp=await context.newCDPSession(page);
    await cdp.send('Profiler.enable');
    const profileTop=profile=>{
      const nodes=new Map((profile.nodes||[]).map(n=>[n.id,n]));
      const parents=Object.create(null);
      for(const n of profile.nodes||[])for(const child of n.children||[])parents[child]=n.id;
      const totals=Object.create(null);
      const cloneCallers=Object.create(null);
      (profile.samples||[]).forEach((id,i)=>{
        const n=nodes.get(id),name=String(n?.callFrame?.functionName||'(anonymous)').slice(0,75);
        const key=/^[\w$ ()-]{1,75}$/.test(name)?name:'(other)';
        const ms=Number(profile.timeDeltas?.[i]||0)/1000;
        totals[key]=(totals[key]||0)+ms;
        if(name==='clone'){
          const parent=nodes.get(parents[id]);
          const caller=String(parent?.callFrame?.functionName||'(unknown)').slice(0,75);
          cloneCallers[caller]=(cloneCallers[caller]||0)+ms;
        }
      });
      const top=Object.entries(totals).sort((a,b)=>b[1]-a[1]).slice(0,12)
        .map(([functionName,sampledMs])=>({functionName,sampledMs:Math.round(sampledMs)}));
      const callerSummary=Object.entries(cloneCallers).sort((a,b)=>b[1]-a[1]).slice(0,10)
        .map(([caller,sampledMs])=>({caller,sampledMs:Math.round(sampledMs)}));
      return {top,cloneCallers:callerSummary};
    };
    report.cpuProfiles={};
    await page.evaluate(()=>{
      const stats=window.__GI_I66_RENDER_STATS__={};
      const store=Orbit.store;
      const readStats=window.__GI_I66_STORE_READ_STATS__={};
      for(const name of ['all','get','where','find','_productStatus','raw','pref']){
        if(typeof store?.[name]!=='function')continue;
        const original=store[name];readStats[name]={calls:0,totalMs:0,maxMs:0};
        store[name]=function(...args){const start=performance.now();try{return original.apply(this,args);}finally{
          const ms=performance.now()-start,record=readStats[name];
          record.calls++;record.totalMs=Math.round((record.totalMs+ms)*10)/10;
          record.maxMs=Math.max(record.maxMs,Math.round(ms*10)/10);
        }};
      }
      for(const name of ['cliente360','polizas','cobros','aseguradoras','renovaciones','cronograma','ops','leads','siniestros','calidad','historial','inicio']){
        const mod=Orbit.modules?.[name];if(!mod||typeof mod.render!=='function')continue;
        const original=mod.render;stats[name]={calls:0,totalMs:0,maxMs:0};
        mod.render=function(...args){const start=performance.now();try{return original.apply(this,args);}finally{
          const ms=Math.round((performance.now()-start)*10)/10,record=stats[name];
          record.calls++;record.totalMs=Math.round((record.totalMs+ms)*10)/10;
          record.maxMs=Math.max(record.maxMs,ms);
        }};
      }
    });
    const routeTargets=[
      ['cliente360','[data-c360-list-ready="1"]'],
      ['polizas','[data-polizas-kpi-ready]'],
      ['cobros','[data-cobros-table], [data-cobros-kpi], .tbl'],
      ['aseguradoras','.page'],
      ['renovaciones','.page'],
      ['cronograma','.page'],
      ['ops','.page'],
      ['leads','.page'],
      ['siniestros','.page'],
      ['calidad','.page'],
      ['historial','.page'],
      ['conciliaciones','.page'],
      ['inicio','.page']
    ];
    // Measure inside Chromium (performance.now), never across Playwright calls.
    for(const [route,readySelector] of routeTargets){
      const withCpuProfile=['polizas','aseguradoras','renovaciones','inicio'].includes(route);
      if(withCpuProfile)await cdp.send('Profiler.start');
      const measurement=await page.evaluate(async({route,readySelector})=>{
        const targetHash='#/'+route,host=document.getElementById('host');
        const begin=performance.now();
        let routeMs=null,lastRouteRenderMs=null,contentMs=null,readyMs=null,complete=false,denied=false;
        let cobrosCoreReadyMs=null,cobrosFinancialReadyMs=null;
        // Observe the existing source state at store events, not at a faster
        // polling cadence. Never fetch rows, alter readiness or suppress errors.
        const sourceNames=['clientes','polizas','cobros','recibosEsperados','carteraPrimas','aseguradoras',
          'estadosCuentaAseguradora','recibosAseguradora','reclamos'];
        const financialSources=['clientes','polizas','cobros','recibosEsperados','carteraPrimas'];
        const sourceTimeline=[],sourceStates={};let diagnosticStatusReads=0,cobrosSourcesConfirmedMs=null;
        const safeCode=value=>{
          const code=String(value||'');
          if(/^functions\/[a-z-]{1,40}$/.test(code)||
            /^PROTECTED_READ_[A-Z0-9_]{1,90}$/.test(code)||
            sourceNames.some(name=>code==='PROTECTED_READ_COLLECTION_UNSUPPORTED_'+name))return code;
          return code?'UNCLASSIFIED_ERROR':'';
        };
        const planCode=value=>['politica_no_autoriza_consulta','modulo_no_visible','scope_none',
          'tenant_constraint_faltante','tenant_constraint_unico_requerido','query_planner_faltante',
          'membresia_inactiva','scope_own_sin_constraint_asesor','scope_team_sin_constraint_equipo',
          'scope_none_sin_deny','PROTECTED_TENANT_MODULE_EXPLICIT_DENIAL'].includes(value)?value:'UNCLASSIFIED_PLAN_ERROR';
        const observeSources=initial=>{
          if(route!=='cobros')return;
          diagnosticStatusReads++;
          const status=Orbit.store?._productStatus?.()||{},confirmed=status.serverConfirmedCollections||[],
            deniedSources=status.deniedCollections||[],errors=status.snapshotErrors||{},plans=status.queryPlans||{};
          const atMs=Math.round(performance.now()-begin);
          if(cobrosSourcesConfirmedMs===null&&financialSources.every(name=>confirmed.includes(name)&&
            !deniedSources.includes(name)&&!errors[name]))cobrosSourcesConfirmedMs=atMs;
          for(const collection of sourceNames){
            const plan=plans[collection],errorCode=safeCode(errors[collection]);
            const state=errorCode?'failed':deniedSources.includes(collection)?'denied':
              confirmed.includes(collection)?'confirmed':'pending';
            const summary={state,errorCode,queryPlan:plan?{ok:plan.ok===true,hardError:plan.hardError===true,
              denied:plan.denied===true,errors:[...new Set((plan.errors||[]).map(planCode))].slice(0,8)}:null};
            const key=JSON.stringify(summary);if(sourceStates[collection]===key)continue;
            sourceStates[collection]=key;
            if(sourceTimeline.length<90)sourceTimeline.push({collection,atMs,initial:initial===true,...summary});
          }
        };
        const sourceHandler=e=>{
          if(!e?.detail?.collection||e.detail.collection==='*'||sourceNames.includes(e.detail.collection))observeSources(false);
        };
        if(route==='cobros'){observeSources(true);window.addEventListener('orbit:store:emit',sourceHandler);}
        const check=()=>{
          if(Orbit.route?.key!==route)return;
          const text=(host?.innerText||'').slice(0,700);
          if(routeMs===null&&Orbit.route?.key===route)routeMs=Math.round(performance.now()-begin);
          if(contentMs===null&&host?.querySelector('.page'))contentMs=Math.round(performance.now()-begin);
          if(route==='cobros'){
            const financial=host?.querySelector('[data-cobros-core-ready="1"]');
            if(cobrosCoreReadyMs===null&&financial)
              cobrosCoreReadyMs=Math.round(performance.now()-begin);
            if(cobrosFinancialReadyMs===null&&financial?.getAttribute('data-cobros-financial-readiness')==='ready')
              cobrosFinancialReadyMs=Math.round(performance.now()-begin);
          }
          denied=/No tienes acceso con el rol activo/.test(text);
          if(!denied&&readyMs===null&&host?.querySelector(readySelector)){
            if(route!=='cliente360'||!!host?.querySelector('[data-c360-list-ready="1"]'))
              readyMs=Math.round(performance.now()-begin);
          }
          if(denied||readyMs!==null)complete=true;
        };
        const observer=new MutationObserver(check);
        observer.observe(host,{childList:true,subtree:true,attributes:true});
        const handler=e=>{if(e?.detail?.route===route){
          lastRouteRenderMs=Math.round(performance.now()-begin);
          if(routeMs===null)routeMs=lastRouteRenderMs;
          check();
        }};
        document.addEventListener('orbit:route-ready',handler);
        location.hash=targetHash;
        check();
        await new Promise(resolve=>{
          const startPoll=performance.now();
          const timer=setInterval(()=>{
            check();
            if(complete||performance.now()-startPoll>10000){clearInterval(timer);resolve();}
          },100);
        });
        // Cold Cobros financial KPIs can remain unavailable after its table
        // first paints. Measure that separate, user-visible latency explicitly
        // without treating an early shell/list render as a complete PASS.
        if(route==='cobros'&&!denied&&cobrosFinancialReadyMs===null){
          await new Promise(resolve=>{
            const since=performance.now();
            const poll=setInterval(()=>{
              check();
              if(cobrosFinancialReadyMs!==null||performance.now()-since>55000){clearInterval(poll);resolve();}
            },150);
          });
        }
        observer.disconnect();document.removeEventListener('orbit:route-ready',handler);
        if(route==='cobros'){observeSources(false);window.removeEventListener('orbit:store:emit',sourceHandler);}
        const status=Orbit.store?._productStatus?.()||{};
        const renderStats=window.__GI_I66_RENDER_STATS__?.[route]||null;
        const readStats=Object.fromEntries(Object.entries(window.__GI_I66_STORE_READ_STATS__||{}).map(([name,r])=>[name,{...r}]));
        for(const r of Object.values(window.__GI_I66_STORE_READ_STATS__||{})){r.calls=0;r.totalMs=0;r.maxMs=0;}
        return {route,routeMs,lastRouteRenderMs,contentMs,readyMs,cobrosCoreReadyMs,cobrosFinancialReadyMs,
          ...(route==='cobros'?{sourceTimeline,diagnosticStatusReads,cobrosSourcesConfirmedMs,
            cobrosFinancialDomAfterSourcesMs:cobrosFinancialReadyMs!==null&&cobrosSourcesConfirmedMs!==null?
              cobrosFinancialReadyMs-cobrosSourcesConfirmedMs:null}:{}),
          cobrosFinancialReady:route==='cobros'?!!host?.querySelector('[data-cobros-financial-readiness="ready"]'):null,
          denied,complete,visibleRows:host?.querySelectorAll('tbody tr').length||0,
          hostChars:host?.innerHTML.length||0,
          loadedSources:[].concat(status.serverConfirmedCollections||[]).length,
          pendingSources:[].concat(status.optionalMissing||[]).length,
          snapshotErrorCount:Object.keys(status.snapshotErrors||{}).length,
          snapshotErrorSources:Object.keys(status.snapshotErrors||{}).filter(k=>/^[a-zA-Z0-9_-]{1,35}$/.test(k)).sort(),
          renderStats,readStats,
          client360RenderMs:route==='cliente360'?Math.round(window.OrbitRuntimeDiagnostics?.cliente360?.renderMs||0):null};
      },{route,readySelector});
      if(withCpuProfile){const prof=await cdp.send('Profiler.stop');report.cpuProfiles[route]=profileTop(prof.profile);}
      report.routes.push(measurement);
    }
    // Search the GLOBAL topbar, not a module's local filter. Profile precisely
    // which already-authorized snapshot/projection consumes the FIRST keypress;
    // aggregate only collection names and durations, never client data.
    await page.evaluate(()=>{
      const metrics=window.__GI_I66_TOPBAR_TIMING__={collections:{},projection:{calls:0,totalMs:0,maxMs:0}};
      const access=Orbit.access,originalScoped=access?.scopedStore;
      if(typeof originalScoped==='function')access.scopedStore=function(...args){
        const scoped=originalScoped.apply(this,args),originalAll=scoped?.all;
        if(typeof originalAll==='function')scoped.all=function(name,...rest){
          const start=performance.now();
          try{return originalAll.call(this,name,...rest);}finally{
            const allowed=['clientes','polizas','vehiculos','cobros','aseguradoras'];
            const key=allowed.includes(name)?name:'other';
            const item=metrics.collections[key]||(metrics.collections[key]={calls:0,totalMs:0,maxMs:0});
            const ms=performance.now()-start;item.calls++;item.totalMs=Math.round((item.totalMs+ms)*10)/10;
            item.maxMs=Math.max(item.maxMs,Math.round(ms*10)/10);
          }
        };
        return scoped;
      };
      const projection=Orbit.clientProjection,originalProject=projection?.project;
      if(typeof originalProject==='function')projection.project=function(...args){
        const start=performance.now();try{return originalProject.apply(this,args);}finally{
          const ms=performance.now()-start,item=metrics.projection;
          item.calls++;item.totalMs=Math.round((item.totalMs+ms)*10)/10;
          item.maxMs=Math.max(item.maxMs,Math.round(ms*10)/10);
        }
      };
    });
    await cdp.send('Profiler.start');
    report.globalTopbarSearch=await page.evaluate(async()=>{
      const input=document.querySelector('.tb-search input'),dd=document.getElementById('tb-search-dd');
      if(!input||!dd)return {ready:false,reason:'TOPBAR_INPUT_MISSING'};
      const probe=async(term)=>{
        dd.classList.remove('open');dd.innerHTML='';
        const begin=performance.now();input.value=term;
        input.dispatchEvent(new Event('input',{bubbles:true}));
        const got=await new Promise(resolve=>{
          const timer=setInterval(()=>{
            const hasResults=dd.classList.contains('open')&&
              (!!dd.querySelector('.tb-sr')||!!dd.querySelector('.tb-sr-empty'));
            if(hasResults||performance.now()-begin>7500){clearInterval(timer);resolve(hasResults);}
          },25);
        });
        return {termType:term==='MAPFRE'?'basic':'accent',ready:got,
          timeMs:Math.round(performance.now()-begin),resultCount:dd.querySelectorAll('.tb-sr').length};
      };
      const first=await probe('MAPFRE');
      const second=await probe('MAPFRÉ');
      input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));
      return {ready:first.ready&&second.ready&&first.resultCount>0&&second.resultCount===first.resultCount,
        first,second,createdFinancialWrites:0};
    });
    report.cpuProfiles.globalTopbarSearch=profileTop((await cdp.send('Profiler.stop')).profile);
    report.globalTopbarTiming=await page.evaluate(()=>({
      ...(window.__GI_I66_TOPBAR_TIMING__||{}),
      storeReads:Object.fromEntries(Object.entries(window.__GI_I66_STORE_READ_STATS__||{})
        .map(([name,r])=>[name,{...r}]))
    }));
    need(report.globalTopbarSearch.ready,'I66_TOPBAR_LIVE_BROWSER_RESULT_HOLD');
    // The old LIVE run is a documented BAD baseline; do not pretend it is fast.
    // The new Preview has the strict target. Both must still show real results.
    const coldBudgetMs=ORIGIN===APPROVED_PREVIEW?2200:15000;
    need(report.globalTopbarSearch.first.timeMs<coldBudgetMs&&report.globalTopbarSearch.second.timeMs<1000,
      'I66_TOPBAR_REAL_SEARCH_LATENCY_HOLD');
    // A visible suggestion is not enough: signed Chrome must prove keyboard
    // activation navigates. This was missing on the formerly fast LIVE source.
    report.globalTopbarKeyboard=await page.evaluate(async()=>{
      const input=document.querySelector('.tb-search input'),dd=document.getElementById('tb-search-dd');
      if(!input||!dd)return {ready:false,reason:'TOPBAR_KEYBOARD_INPUT_MISSING'};
      input.value='MAPFRE';
      input.dispatchEvent(new Event('input',{bubbles:true}));
      const ready=await new Promise(resolve=>{
        const started=performance.now(),timer=setInterval(()=>{
          const matched=dd.classList.contains('open')&&dd.querySelector('[data-go]');
          if(matched||performance.now()-started>3000){clearInterval(timer);resolve(!!matched);}
        },30);
      });
      const first=dd.querySelector('[data-go]'),route=first&&first.dataset.go||'';
      const event=new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true});
      const original=location.hash;
      input.dispatchEvent(event);
      return {ready,activated:!!route&&location.hash===route&&location.hash!==original,
        fieldCleared:input.value==='',dropdownClosed:!dd.classList.contains('open'),
        defaultPrevented:event.defaultPrevented,options:dd.querySelectorAll('[data-go]').length};
    });
    if(ORIGIN===APPROVED_PREVIEW)
      need(report.globalTopbarKeyboard.ready&&report.globalTopbarKeyboard.activated&&
        report.globalTopbarKeyboard.fieldCleared&&report.globalTopbarKeyboard.dropdownClosed&&
        report.globalTopbarKeyboard.defaultPrevented,'I66_TOPBAR_KEYBOARD_PREVIEW_HOLD');
    // Measure a real, already-authorized client detail without printing its identity.
    await cdp.send('Profiler.start');
    report.cliente360Detail=await page.evaluate(async()=>{
      const clients=Orbit.store?.all('clientes')||[],policies=Orbit.store?.all('polizas')||[];
      const ids=new Set(clients.map(c=>String(c?.id||'')).filter(Boolean));
      const count=Object.create(null);
      for(const p of policies){const id=String(p?.clienteId||'');if(ids.has(id))count[id]=(count[id]||0)+1;}
      const best=Object.entries(count).sort((a,b)=>b[1]-a[1])[0]?.[0]||String(clients[0]?.id||'');
      if(!best)return {available:false,reason:'NO_AUTHORIZED_CLIENT'};
      const start=performance.now(),host=document.getElementById('host');
      location.hash='#/cliente360?c='+encodeURIComponent(best);
      const ready=await new Promise(resolve=>{
        const timer=setInterval(()=>{
          const hasHeader=!!host.querySelector('.fichahdr'),hasBody=!!host.querySelector('#c360-body');
          if(hasHeader&&hasBody){clearInterval(timer);resolve(true);}
          else if(performance.now()-start>12000){clearInterval(timer);resolve(false);}
        },40);
      });
      const states=[...host.querySelectorAll('[data-readiness]')].map(e=>String(e.getAttribute('data-readiness')||''));
      const readies=states.reduce((m,k)=>(m[k]=(m[k]||0)+1,m),{});
      return {available:true,detailMs:Math.round(performance.now()-start),ready,
        detailChars:host.innerHTML.length,policyCountForSelected:count[best]||0,
        readinessCounts:readies,renderStats:window.__GI_I66_RENDER_STATS__?.cliente360||null};
    });
    report.cpuProfiles.cliente360Detail=profileTop((await cdp.send('Profiler.stop')).profile);
    await page.setViewportSize({width:390,height:844});
    // The menu is a local UI operation; it must not wait for a network request.
    report.mobile=await page.evaluate(async()=>{
      const burger=document.getElementById('burger'),sidebar=document.getElementById('sidebar');
      const start=performance.now();burger.click();
      const eventMs=performance.now()-start;
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      const paintedMs=performance.now()-start;
      return {viewportWidth:innerWidth,eventMs:Math.round(eventMs*10)/10,
        twoFramesMs:Math.round(paintedMs*10)/10,menuOpen:sidebar.classList.contains('open'),
        navItems:sidebar.querySelectorAll('[data-route]').length};
    });
    report.auth.pageErrors=pageErrors;report.auth.consoleErrors=consoleErrors;
    report.auth.consoleErrorClasses=consoleClasses;report.auth.httpErrorClasses=httpClasses;
    need(pageErrors===0&&consoleErrors===0&&Object.keys(httpClasses).length===0,'I66_PERF_UI_HTTP_CONSOLE_ERRORS_HOLD');
    await context.close();
    const finalMarker=await fetch(ORIGIN+'/__recovery__/build.json',{headers:{'cache-control':'no-cache'}}).then(r=>r.json());
    need(finalMarker.sourceSha===pin.sourceSha&&finalMarker.buildId===pin.buildId,'I66_PERF_BUILD_CHANGED_DURING_RUN');
    report.status=phase==='preview'?'PREVIEW_READONLY_MEASURED':'LIVE_READONLY_MEASURED';
  }finally{if(browser)await browser.close();}
}
try{
  await run();
  if(observer)report.observerAfter=await controlOwner.verifyReadonlyObserver(observer,{stage:'after'});
  console.log(JSON.stringify({schema:report.schema,status:report.status,
    startupMs:report.auth.activation?.activateMs,routeCount:report.routes.length,
    loadedRoutes:report.routes.filter(x=>x.readyMs!==null).length,mobileEventMs:report.mobile.eventMs,
    errors:report.auth.pageErrors}));
}catch(error){
  report.status='HOLD';
  report.errors.push(String(error?.message||'PERF_UNKNOWN').replace(/[^A-Z0-9_:-]/gi,'').slice(0,100));
  console.error('I66_PERF_HOLD:'+report.errors[0]);
  process.exitCode=1;
}finally{
  fs.writeFileSync(OUTPUT,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
}
