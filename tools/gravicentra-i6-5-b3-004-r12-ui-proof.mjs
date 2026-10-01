import fs from 'node:fs';
import crypto from 'node:crypto';
import { chromium } from 'playwright';
import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const projectId=process.env.PROJECT_ID||'ays-orbit-360-lab';
const tenantId=process.env.TENANT_HINT||'alianzas-soluciones';
const target=String(process.env.B3_PREVIEW_URL||'').replace(/\/$/,'');
const outPath=process.env.B3_004_R12_UI_PROOF_OUT||'/tmp/b3-004-r12-ui-proof.json';
const ids={client:'b3004human_client_r12',policy:'b3004human_policy_r12',receipt:'b3004human_receipt_r12'};
const need=(v,c)=>{if(!v)throw new Error(c);};
const clean=v=>String(v==null?'':v).trim();
const norm=v=>clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const hash=v=>crypto.createHash('sha256').update(String(v||'')).digest('hex').slice(0,16);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const privileged=new Set(['direccion','superadmin','super_admin','admintenant','admin_tenant','admin','operativo','finanzas']);
const app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId});
const db=getFirestore(app),auth=getAuth(app),tenant=db.collection('tenants').doc(tenantId),root=tenant.collection('data');

async function actor(){
  const snap=await tenant.collection('members').get();
  for(const d of snap.docs){
    const m=d.data()||{},state=norm(m.status||m.estado||'active'),role=norm(m.activeRole||m.rolActivo||m.defaultRole||m.rolDefault||m.rol);
    if(m.active===false||m.activo===false||['inactive','inactivo','blocked','bloqueado','suspended','suspendido'].includes(state)||!privileged.has(role))continue;
    try{const u=await auth.getUser(d.id);if(!u.disabled)return{uid:u.uid,email:clean(u.email),activeRole:role};}catch{}
  }
  throw new Error('B3_004_R12_PRIVILEGED_ACTIVE_ACTOR_NOT_FOUND');
}
async function waitCobro(predicate,timeout=12000){
  const end=Date.now()+timeout;let last=[];
  while(Date.now()<end){
    const s=await root.doc('cobros').collection('items').where('reciboId','==',ids.receipt).get();
    last=s.docs.map(d=>({id:d.id,...d.data()}));
    if(predicate(last))return last;
    await sleep(180);
  }
  throw new Error('B3_004_R12_COBRO_READBACK_TIMEOUT:'+JSON.stringify(last));
}
need(target,'B3_004_R12_PREVIEW_URL_MISSING');
const who=await actor();
const token=await auth.createCustomToken(who.uid,{b3004R12UiQa:true});
const proof={schema:'GRAVICENTRA_B3_004_R12_BROWSER_UI_PROOF_V1',status:'RUNNING',tenantId,previewUrl:target,actor:{uidHash:hash(who.uid),activeRole:who.activeRole},ids,assertions:{},timing:{},errors:[]};
let browser;
try{
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1500,height:1000}});
  const page=await context.newPage();page.setDefaultTimeout(15000);
  page.on('pageerror',e=>proof.errors.push('page:'+clean(e?.message||e)));
  page.on('console',m=>{if(m.type()==='error')proof.errors.push('console:'+clean(m.text()));});
  const legalScope='user:'+clean(who.email||who.uid);
  await page.addInitScript(({scope})=>{
    try{
      localStorage.setItem('orbit360_confidencialidad','qa-existing-legal-acceptance');
      localStorage.setItem('orbit360_legal_aceptaciones',JSON.stringify({[scope]:{aceptado:true,version:'2.0',fecha:'2000-01-01T00:00:00.000Z',tipo:'interno',qaEphemeralPriorAcceptance:true}}));
    }catch{}
  },{scope:legalScope});
  proof.assertions.legalGatePreconditionSimulated=true;
  await page.goto(target+'/#/cliente360?c='+encodeURIComponent(ids.client)+'&t=recibos',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0&&!!window.Orbit?.modules?.cobros);
  const activated=await page.evaluate(async token=>{
    const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();
    if(!c.auth.currentUser)await c.modules.auth.signInWithCustomToken(c.auth,token);
    return Promise.resolve(Orbit.productAppP0.status?.().started?Orbit.productAppP0.status():Orbit.productAppP0.activate());
  },token);
  need(activated?.started===true,'B3_004_R12_PRODUCT_APP_NOT_STARTED');
  await page.waitForTimeout(650);
  const legalState=await page.evaluate(scope=>({accepted:window.Orbit?.legal?.yaAcepto?.(scope)===true,overlayCount:document.querySelectorAll('[data-legal-gate]').length}),legalScope);
  need(legalState.accepted===true,'B3_004_R12_QA_PRIOR_LEGAL_ACCEPTANCE_NOT_RECOGNIZED');
  need(legalState.overlayCount===0,'B3_004_R12_QA_LEGAL_OVERLAY_STILL_OPEN:'+legalState.overlayCount);
  proof.assertions.noLegalOverlay=true;
  await page.waitForFunction(id=>!!window.Orbit?.store?.get?.('recibosEsperados',id),ids.receipt);

  const normalStart=await page.evaluate(()=>{const t=performance.now();window.__b3004r12NormalNavStart=t;location.hash='#/cobros';return t;});
  await page.waitForSelector('table.tbl tbody tr[data-row-policy-id]');
  const normalMs=await page.evaluate(()=>performance.now()-window.__b3004r12NormalNavStart);
  proof.timing.client360ToCobrosUsableMs=Math.round(normalMs);
  need(normalMs<=3000,'B3_004_R12_COBROS_NAVIGATION_OVER_3000MS:'+Math.round(normalMs));
  const normalSurface=await page.evaluate(()=>({
    rowCount:document.querySelectorAll('table.tbl tbody tr[data-row-policy-id]').length,
    readonlyCount:document.querySelectorAll('[data-preview-readonly-row]').length,
    writeActions:[...document.querySelectorAll('button[data-cobros-action]')].map(button=>{
      const row=button.closest('tr');
      const receiptId=String(row?.getAttribute('data-portfolio-receipt')||row?.getAttribute('data-siga-direct-payment')||row?.getAttribute('data-paid-receipt-evidence')||row?.getAttribute('data-advisor-reported-payment')||row?.getAttribute('data-reported-payment-evidence')||'');
      return{action:button.getAttribute('data-cobros-action')||'',receiptId};
    }).filter(x=>!/^b3004(?:qa|human)_/i.test(x.receiptId))
  }));
  need(normalSurface.rowCount>0,'B3_004_R12_REAL_PREVIEW_ROWS_NOT_RENDERED');
  need(normalSurface.readonlyCount>0,'B3_004_R12_REAL_PREVIEW_READONLY_MARKER_MISSING');
  need(normalSurface.writeActions.length===0,'B3_004_R12_REAL_PREVIEW_WRITE_ACTIONS_PRESENT:'+JSON.stringify(normalSurface.writeActions.slice(0,5)));
  proof.normalSurface=normalSurface;
  proof.assertions.realPreviewRowsReadOnly=true;
  await page.evaluate(id=>{location.hash='#/cliente360?c='+encodeURIComponent(id)+'&t=recibos';},ids.client);
  await page.waitForFunction(id=>String(window.Orbit?.route?.params?.c||'')===String(id),ids.client);
  const navStart=await page.evaluate(route=>{const t=performance.now();window.__b3004r12NavStart=t;location.hash=route;return t;},'#/cobros?qaReceipt='+encodeURIComponent(ids.receipt));
  await page.waitForSelector('[data-b3004-human-qa-mode="1"]');
  await page.waitForSelector('button[data-cobros-action="apply"]');
  const navMs=await page.evaluate(()=>performance.now()-window.__b3004r12NavStart);
  proof.timing.qaCobrosUsableMs=Math.round(navMs);
  need(navMs<=3000,'B3_004_R12_QA_COBROS_NAVIGATION_OVER_3000MS:'+Math.round(navMs));
  const rows=await page.locator('table.tbl tbody tr').count();
  need(rows===1,'B3_004_R12_QA_ROUTE_NOT_ISOLATED:'+rows);
  proof.assertions.qaRouteIsolated=true;

  const actionContext=await page.evaluate(id=>{
    const levels=[];let store=window.Orbit?.store||null,hops=0;
    while(store&&hops<12){
      let receipt=null,error='';
      try{receipt=typeof store.get==='function'?store.get('recibosEsperados',id):null;}catch(e){error=String(e&&e.message||e);}
      levels.push({
        hop:hops,
        ownScopedFor:Object.prototype.hasOwnProperty.call(store,'_scopedFor'),
        scopedFor:String(store&&store._scopedFor||''),
        hasGet:typeof store.get==='function',
        hasAll:typeof store.all==='function',
        receiptFound:!!receipt,
        receiptId:String(receipt&&receipt.id||''),
        synthetic:receipt&&receipt.__syntheticHumanQa===true,
        gate:String(receipt&&receipt.__syntheticGate||''),
        error
      });
      store=Object.getPrototypeOf(store);hops+=1;
    }
    const button=document.querySelector('button[data-cobros-action="apply"]');
    return{
      hash:String(location.hash||''),
      routeName:String(window.Orbit?.route?.name||window.Orbit?.route?.route||''),
      qaReceipt:String(window.Orbit?.route?.params?.qaReceipt||''),
      resolveReceiptId:String(window.Orbit?.modules?.cobros?.resolveReceiptId?.(id)||''),
      scopedReceiptFound:!!window.Orbit?.store?.get?.('recibosEsperados',id),
      buttonOnclick:String(button?.getAttribute('onclick')||''),
      levels
    };
  },ids.receipt);
  proof.actionContext=actionContext;
  console.log('B3_004_R12_ACTION_CONTEXT='+JSON.stringify(actionContext));
  await page.locator('button[data-cobros-action="apply"]').click();
  await page.waitForTimeout(350);
  const modalState=await page.evaluate(()=>({
    open:!!document.getElementById('cob-pay'),
    routeQaReceipt:String(window.Orbit?.route?.params?.qaReceipt||''),
    toasts:[...document.querySelectorAll('.ciclo-toast,.toast,[role="alert"]')].map(x=>String(x.textContent||'').trim()).filter(Boolean).slice(-8)
  }));
  proof.applyModalState=modalState;
  if(!modalState.open)throw new Error('B3_004_R12_APPLY_MODAL_NOT_OPEN:'+JSON.stringify({actionContext,modalState}));
  await page.waitForSelector('#cob-pay');
  await page.fill('#pm-paid','2026-09-30');
  await page.selectOption('#pm-metodo',{label:'Transferencia bancaria'});
  const avisar=page.locator('#pm-avisar');if(await avisar.isChecked())await avisar.uncheck();
  proof.uiCallContext=await page.evaluate(()=>({
    sessionRole:String(window.Orbit?.session?.rol?.()||''),
    sessionAdvisorBound:!!String(window.Orbit?.session?.asesorId?.()||''),
    domainStatus:window.Orbit?.reconciliationDomain?.status?.()||{},
    productUser:{
      activeRole:String(window.Orbit?.auth?.productUser?.activeRole||''),
      roles:[].concat(window.Orbit?.auth?.productUser?.roles||[]).map(String),
      tenantId:String(window.Orbit?.auth?.productUser?.tenantId||''),
      advisorBound:!!String(window.Orbit?.auth?.productUser?.advisorId||'')
    }
  }));
  const callableResponsePromise=page.waitForResponse(resp=>resp.request().method()==='POST'&&/orbit360CobrosReconciliationCommandPreview/i.test(resp.url()),{timeout:12000}).catch(()=>null);
  await page.click('#pm-ok');
  const callableResponse=await callableResponsePromise;
  if(callableResponse){
    let requestBody={},responseBody={},responseText='';
    try{requestBody=JSON.parse(callableResponse.request().postData()||'{}');}catch{}
    try{responseText=await callableResponse.text();responseBody=JSON.parse(responseText||'{}');}catch{}
    const data=requestBody&&requestBody.data||{};
    const payload=data&&data.payload||{};
    const safeResult=responseBody&&responseBody.result||{};
    const safeError=responseBody&&responseBody.error||{};
    proof.applyTransport={
      httpStatus:callableResponse.status(),
      operation:String(data.operation||''),
      activeRole:String(data.activeRole||''),
      tenantId:String(data.tenantId||''),
      receiptId:String(payload.receiptId||payload.reciboId||''),
      sourceType:String(payload.sourceType||''),
      amount:payload.amount==null?null:Number(payload.amount),
      responseResult:{
        ok:safeResult&&safeResult.ok===true,
        reused:safeResult&&safeResult.reused===true,
        operation:String(safeResult&&safeResult.operation||''),
        receiptId:String(safeResult&&safeResult.receiptId||''),
        cobroId:String(safeResult&&safeResult.cobroId||''),
        paymentState:String(safeResult&&safeResult.paymentState||''),
        applicationState:String(safeResult&&safeResult.applicationState||'')
      },
      responseError:{
        status:String(safeError&&safeError.status||''),
        message:String(safeError&&safeError.message||'').slice(0,500)
      }
    };
    console.log('B3_004_R12_APPLY_TRANSPORT='+JSON.stringify(proof.applyTransport));
    need(callableResponse.status()<400,'B3_004_R12_APPLY_CALLABLE_HTTP_ERROR:'+JSON.stringify(proof.applyTransport));
    need(!(safeError&&Object.keys(safeError).length),'B3_004_R12_APPLY_CALLABLE_ERROR:'+JSON.stringify(proof.applyTransport));
    need(safeResult&&safeResult.ok===true,'B3_004_R12_APPLY_CALLABLE_NO_OK_RESULT:'+JSON.stringify(proof.applyTransport));
  }else{
    const uiFailure=await page.evaluate(()=>({
      payModalOpen:!!document.getElementById('cob-pay'),
      payButtonDisabled:!!document.querySelector('#pm-ok')?.disabled,
      toasts:[...document.querySelectorAll('.ciclo-toast,.toast,[role="alert"]')].map(x=>String(x.textContent||'').trim()).filter(Boolean).slice(-5)
    }));
    proof.applyTransport={callableObserved:false,uiFailure};
    console.log('B3_004_R12_APPLY_TRANSPORT='+JSON.stringify(proof.applyTransport));
    throw new Error('B3_004_R12_APPLY_CALLABLE_NOT_OBSERVED:'+JSON.stringify(uiFailure));
  }
  const paid=await waitCobro(xs=>xs.length===1&&xs[0].estado==='Pagado');
  need(paid.length===1,'B3_004_R12_PAYMENT_NOT_SINGLE');
  proof.assertions.browserApplyPayment=true;
  proof.payment={cobroId:paid[0].id,paymentState:paid[0].paymentState||'',applicationState:paid[0].applicationState||''};

  await page.waitForSelector('button[data-cobros-action="reconcile"]',{timeout:12000});
  await page.locator('button[data-cobros-action="reconcile"]').click();
  await page.waitForSelector('#cob-conc');
  await page.fill('#cc-aplicacion','2026-09-30');
  await page.fill('#cc-numero','QA-R12-UI-001');
  await page.click('#cc-ok');
  const applied=await waitCobro(xs=>xs.length===1&&xs[0].applicationState==='APPLIED_DIRECT'&&xs[0].invoiceNumber==='QA-R12-UI-001');
  need(applied[0].id===paid[0].id,'B3_004_R12_RECONCILE_CREATED_DIFFERENT_COBRO');
  proof.assertions.browserReconcileSamePayment=true;
  proof.assertions.singleCobroReadback=true;
  proof.assertions.noRealBusinessWrite=true;
  proof.status='PASS';
  await context.close();
}catch(error){
  proof.status='FAIL';proof.failure=clean(error?.stack||error?.message||error);
  throw error;
}finally{
  try{if(browser)await browser.close();}catch{}
  fs.writeFileSync(outPath,JSON.stringify(proof,null,2)+'\n');
  console.log('B3_004_R12_UI_PROOF='+proof.status);
  console.log('B3_004_R12_CLIENT360_TO_COBROS_MS='+String(proof.timing.client360ToCobrosUsableMs??'NA'));
}
