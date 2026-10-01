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
function minimalPdfBuffer(){
  const stream='BT\n/F1 18 Tf\n72 720 Td\n(Gravicentra QA PDF) Tj\nET\n';
  const objects=[
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
    '4 0 obj\n<< /Length '+Buffer.byteLength(stream,'binary')+' >>\nstream\n'+stream+'endstream\nendobj\n',
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n'
  ];
  let pdf='%PDF-1.4\n',offsets=[0];
  for(const obj of objects){offsets.push(Buffer.byteLength(pdf,'binary'));pdf+=obj;}
  const xref=Buffer.byteLength(pdf,'binary');
  pdf+='xref\n0 '+(objects.length+1)+'\n0000000000 65535 f \n';
  for(let i=1;i<=objects.length;i++)pdf+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';
  pdf+='trailer\n<< /Size '+(objects.length+1)+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n';
  return Buffer.from(pdf,'binary');
}
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
const proof={schema:'GRAVICENTRA_B3_004_R12_BROWSER_UI_PROOF_V2',status:'RUNNING',tenantId,previewUrl:target,actor:{uidHash:hash(who.uid),activeRole:who.activeRole},ids,assertions:{},timing:{},errors:[],pageErrors:[],consoleErrors:[],httpErrors:[],requestFailures:[]};
let browser;
try{
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:412,height:915},isMobile:true,hasTouch:true});
  const page=await context.newPage();page.setDefaultTimeout(15000);
  proof.transportEvents=[];
  const qaFunctionName=url=>{
    const m=String(url||'').match(/(orbit360(?:DocumentDrive(?:Upload|Finalize|Quarantine|Read|Download)Preview|CobrosReconciliationCommandPreview))/i);
    return m?m[1]:'';
  };
  page.on('pageerror',e=>{const row={message:clean(e?.message||e)};proof.pageErrors.push(row);proof.errors.push('page:'+row.message);});
  page.on('console',m=>{if(m.type()==='error'){const loc=typeof m.location==='function'?(m.location()||{}):{};const row={text:clean(m.text()),url:clean(loc.url),lineNumber:Number(loc.lineNumber||0),columnNumber:Number(loc.columnNumber||0)};proof.consoleErrors.push(row);proof.errors.push('console:'+row.text);}});
  page.on('request',req=>{
    const fn=qaFunctionName(req.url());if(!fn||req.method()!=='POST')return;
    proof.transportEvents.push({kind:'request',fn,at:Date.now()});
  });
  page.on('requestfailed',req=>{
    const row={url:clean(req.url()),method:clean(req.method()),failure:clean(req.failure()?.errorText||'')};proof.requestFailures.push(row);
    const fn=qaFunctionName(req.url());if(!fn)return;
    proof.transportEvents.push({kind:'requestfailed',fn,at:Date.now(),failure:row.failure});
  });
  page.on('response',async resp=>{
    const responseUrl=clean(resp.url()),responseMethod=clean(resp.request().method());
    if(resp.status()>=400)proof.httpErrors.push({url:responseUrl,method:responseMethod,status:resp.status()});
    const fn=qaFunctionName(responseUrl);if(!fn||responseMethod!=='POST')return;
    let body={};try{body=JSON.parse(await resp.text()||'{}');}catch{}
    const result=body&&body.result||{},error=body&&body.error||{};
    proof.transportEvents.push({
      kind:'response',fn,at:Date.now(),httpStatus:resp.status(),
      ok:result&&result.ok===true,
      errorStatus:clean(error&&error.status||''),
      errorMessage:clean(error&&error.message||'').slice(0,300)
    });
  });
  const legalScope='user:'+clean(who.email||who.uid);
  await page.addInitScript(({scope})=>{
    try{
      localStorage.setItem('orbit360_confidencialidad','qa-existing-legal-acceptance');
      localStorage.setItem('orbit360_legal_aceptaciones',JSON.stringify({[scope]:{aceptado:true,version:'2.0',fecha:'2000-01-01T00:00:00.000Z',tipo:'interno',qaEphemeralPriorAcceptance:true}}));
    }catch{}
  },{scope:legalScope});
  proof.assertions.legalGatePreconditionSimulated=true;

  // Session/bootstrap is measured separately. Navigation threshold starts only
  // after a normal authenticated product session exists.
  const sessionBootstrapStartedAt=Date.now();
  await page.goto(target+'/#/inicio',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0&&!!window.Orbit?.modules?.cobros);
  const bootstrap=await page.evaluate(async token=>{
    const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();
    if(!c.auth.currentUser)await c.modules.auth.signInWithCustomToken(c.auth,token);
    const activated=await Promise.resolve(Orbit.productAppP0.status?.().started?Orbit.productAppP0.status():Orbit.productAppP0.activate());
    return{activated,uid:String(c.auth.currentUser?.uid||'')};
  },token);
  need(bootstrap?.activated?.started===true&&bootstrap?.uid,'B3_004_R12_PRODUCT_SESSION_NOT_STARTED');
  await page.waitForFunction(scope=>window.Orbit?.legal?.yaAcepto?.(scope)===true&&document.querySelectorAll('[data-legal-gate]').length===0,legalScope,{timeout:3000});
  proof.timing.sessionBootstrapMs=Date.now()-sessionBootstrapStartedAt;
  proof.assertions.authenticatedSessionEstablished=true;

  const directReceiptUrl=target+'/#/cliente360?c='+encodeURIComponent(ids.client)+'&t=recibos&r='+encodeURIComponent(ids.receipt);
  const directReceiptStartedAt=Date.now();
  await page.goto(directReceiptUrl,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0&&!!window.Orbit?.modules?.cobros);
  const restored=await page.evaluate(async()=>{
    const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize(),started=Date.now();
    while(!c.auth.currentUser&&Date.now()-started<3000)await new Promise(r=>setTimeout(r,25));
    if(!c.auth.currentUser)return{restored:false,activated:null};
    const activated=await Promise.resolve(Orbit.productAppP0.status?.().started?Orbit.productAppP0.status():Orbit.productAppP0.activate());
    return{restored:true,activated};
  });
  need(restored?.restored===true&&restored?.activated?.started===true,'B3_004_R12_AUTH_SESSION_NOT_RESTORED_ON_COLD_DEEPLINK');
  await page.waitForFunction(scope=>window.Orbit?.legal?.yaAcepto?.(scope)===true&&document.querySelectorAll('[data-legal-gate]').length===0,legalScope,{timeout:3000});
  const legalState=await page.evaluate(scope=>({accepted:window.Orbit?.legal?.yaAcepto?.(scope)===true,overlayCount:document.querySelectorAll('[data-legal-gate]').length}),legalScope);
  need(legalState.accepted===true,'B3_004_R12_QA_PRIOR_LEGAL_ACCEPTANCE_NOT_RECOGNIZED');
  need(legalState.overlayCount===0,'B3_004_R12_QA_LEGAL_OVERLAY_STILL_OPEN:'+legalState.overlayCount);
  proof.assertions.noLegalOverlay=true;
  await page.waitForFunction(id=>!!window.Orbit?.store?.get?.('recibosEsperados',id),ids.receipt);
  await page.waitForSelector('[data-rp-receipt-detail="1"]',{timeout:15000});
  proof.timing.directReceiptUsableMs=Date.now()-directReceiptStartedAt;
  need(proof.timing.directReceiptUsableMs<=3000,'B3_004_R12P12_DIRECT_RECEIPT_OVER_3000MS:'+proof.timing.directReceiptUsableMs);
  const directReceiptSurface=await page.evaluate(id=>{
    const detail=document.querySelector('[data-rp-receipt-detail="1"]'),hero=detail?.querySelector('[data-rp-receipt-hero="1"]');
    const actionRects=[...(hero?.querySelectorAll('.btn')||[])].map(x=>{const r=x.getBoundingClientRect();return{text:String(x.textContent||'').trim(),left:r.left,right:r.right,width:r.width};});
    return{
      receiptParam:String(window.Orbit?.route?.params?.r||''),
      hash:String(location.hash||''),
      viewportWidth:window.innerWidth,
      detailScrollWidth:detail?.scrollWidth||0,
      detailClientWidth:detail?.clientWidth||0,
      actionRects
    };
  },ids.receipt);
  need(directReceiptSurface.receiptParam===ids.receipt,'B3_004_R12P11_DIRECT_RECEIPT_PARAM_MISSING:'+JSON.stringify(directReceiptSurface));
  need(directReceiptSurface.detailScrollWidth<=directReceiptSurface.detailClientWidth+2,'B3_004_R12P11_RECEIPT_HORIZONTAL_OVERFLOW:'+JSON.stringify(directReceiptSurface));
  need(directReceiptSurface.actionRects.every(x=>x.left>=-1&&x.right<=directReceiptSurface.viewportWidth+1),'B3_004_R12P11_RECEIPT_ACTION_OVERFLOW:'+JSON.stringify(directReceiptSurface));
  proof.directReceiptSurface=directReceiptSurface;
  proof.assertions.directReceiptDeepLink=true;
  proof.assertions.mobileReceiptResponsive=true;

  await page.evaluate(()=>{location.hash='#/inicio';});
  await page.waitForSelector('.inicio-main-grid',{timeout:10000});
  const inicioMobile=await page.evaluate(()=>{
    const g=document.querySelector('.inicio-main-grid'),kids=[...(g?.children||[])],a=kids[0]?.getBoundingClientRect(),b=kids[1]?.getBoundingClientRect(),r=g?.getBoundingClientRect();
    return{viewport:innerWidth,docScroll:document.documentElement.scrollWidth,gridWidth:r?.width||0,first:{left:a?.left||0,top:a?.top||0,right:a?.right||0,bottom:a?.bottom||0},second:{left:b?.left||0,top:b?.top||0,right:b?.right||0,bottom:b?.bottom||0}};
  });
  need(inicioMobile.docScroll<=inicioMobile.viewport+2&&inicioMobile.gridWidth<=inicioMobile.viewport+1&&inicioMobile.second.left<=inicioMobile.first.left+2&&inicioMobile.second.top>=inicioMobile.first.bottom-2,'B3_004_R12P12_INICIO_MOBILE_RESPONSIVE_FAIL:'+JSON.stringify(inicioMobile));
  proof.inicioMobile=inicioMobile;proof.assertions.mobileInicioResponsive=true;

  await page.evaluate(id=>{location.hash='#/cliente360?c='+encodeURIComponent(id)+'&t=resumen';},ids.client);
  await page.waitForSelector('.c360-summary-grid',{timeout:10000});
  const c360Mobile=await page.evaluate(()=>{
    const g=document.querySelector('.c360-summary-grid'),kids=[...(g?.children||[])],a=kids[0]?.getBoundingClientRect(),b=kids[1]?.getBoundingClientRect(),r=g?.getBoundingClientRect();
    return{viewport:innerWidth,docScroll:document.documentElement.scrollWidth,gridWidth:r?.width||0,first:{left:a?.left||0,top:a?.top||0,right:a?.right||0,bottom:a?.bottom||0},second:{left:b?.left||0,top:b?.top||0,right:b?.right||0,bottom:b?.bottom||0}};
  });
  need(c360Mobile.docScroll<=c360Mobile.viewport+2&&c360Mobile.gridWidth<=c360Mobile.viewport+1&&c360Mobile.second.left<=c360Mobile.first.left+2&&c360Mobile.second.top>=c360Mobile.first.bottom-2,'B3_004_R12P12_CLIENTE360_MOBILE_RESPONSIVE_FAIL:'+JSON.stringify(c360Mobile));
  proof.c360Mobile=c360Mobile;proof.assertions.mobileCliente360Responsive=true;

  await page.evaluate(id=>{location.hash='#/cliente360?c='+encodeURIComponent(id)+'&t=recibos';},ids.client);
  await page.waitForSelector('[data-rp-receipts-table="1"]',{timeout:10000});
  const receiptListMobile=await page.evaluate(()=>{
    const cell=document.querySelector('[data-rp-receipts-table="1"] .rp-action-cell');
    return{position:cell?getComputedStyle(cell).position:'',docScroll:document.documentElement.scrollWidth,viewport:innerWidth};
  });
  need(receiptListMobile.position!=='sticky'&&receiptListMobile.docScroll<=receiptListMobile.viewport+2,'B3_004_R12P12_RECEIPT_LIST_MOBILE_ACTION_OVERLAY:'+JSON.stringify(receiptListMobile));
  proof.receiptListMobile=receiptListMobile;proof.assertions.mobileReceiptListResponsive=true;

  const normalStart=await page.evaluate(()=>{const t=performance.now();window.__b3004r12NormalNavStart=t;location.hash='#/cobros';return t;});
  await page.waitForSelector('[data-preview-safe-mode="1"]',{timeout:15000});
  await page.waitForSelector('table.tbl tbody',{timeout:15000});
  const normalMs=await page.evaluate(()=>performance.now()-window.__b3004r12NormalNavStart);
  proof.timing.client360ToCobrosUsableMs=Math.round(normalMs);
  need(normalMs<=3000,'B3_004_R12_COBROS_NAVIGATION_OVER_3000MS:'+Math.round(normalMs));
  const normalSurface=await page.evaluate(()=>({
    rowCount:document.querySelectorAll('table.tbl tbody tr[data-row-policy-id]').length,
    readonlyCount:document.querySelectorAll('[data-preview-readonly-row]').length,
    safeMode:!!document.querySelector('[data-preview-safe-mode="1"]'),
    emptyState:/Sin cobros\./i.test(String(document.querySelector('table.tbl tbody')?.textContent||'')),
    writeActions:[...document.querySelectorAll('button[data-cobros-action]')].map(button=>{
      const row=button.closest('tr');
      const receiptId=String(row?.getAttribute('data-portfolio-receipt')||row?.getAttribute('data-siga-direct-payment')||row?.getAttribute('data-paid-receipt-evidence')||row?.getAttribute('data-advisor-reported-payment')||row?.getAttribute('data-reported-payment-evidence')||'');
      return{action:button.getAttribute('data-cobros-action')||'',receiptId};
    }).filter(x=>!/^b3004(?:qa|human)_/i.test(x.receiptId))
  }));
  need(normalSurface.safeMode===true,'B3_004_R14_REAL_PREVIEW_SAFE_MODE_MISSING');
  need(normalSurface.rowCount===0?normalSurface.emptyState===true:normalSurface.readonlyCount>0,'B3_004_R14_REAL_PREVIEW_READONLY_OR_EMPTY_STATE_MISSING:'+JSON.stringify(normalSurface));
  need(normalSurface.writeActions.length===0,'B3_004_R12_REAL_PREVIEW_WRITE_ACTIONS_PRESENT:'+JSON.stringify(normalSurface.writeActions.slice(0,5)));
  proof.normalSurface=normalSurface;
  proof.assertions.realPreviewRowsReadOnly=true;
  proof.assertions.realPreviewEmptyStateAccepted=normalSurface.rowCount===0&&normalSurface.emptyState===true;
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
  await page.goto(directReceiptUrl,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('[data-rp-receipt-detail="1"]',{timeout:15000});
  await page.waitForSelector('[data-rp-detail-payment-action]',{timeout:15000});
  const applyOrigin=await page.evaluate(()=>({hash:String(location.hash||''),receiptParam:String(window.Orbit?.route?.params?.r||''),detail:!!document.querySelector('[data-rp-receipt-detail="1"]')}));
  need(applyOrigin.receiptParam===ids.receipt&&applyOrigin.detail===true,'B3_004_R14_APPLY_NOT_STARTED_FROM_RECEIPT_DETAIL:'+JSON.stringify(applyOrigin));
  const applyOpenStartedAt=Date.now();
  await page.locator('[data-rp-detail-payment-action]').click();
  await page.waitForTimeout(350);
  const modalState=await page.evaluate(()=>({
    open:!!document.getElementById('cob-pay'),
    routeQaReceipt:String(window.Orbit?.route?.params?.qaReceipt||''),
    toasts:[...document.querySelectorAll('.ciclo-toast,.toast,[role="alert"]')].map(x=>String(x.textContent||'').trim()).filter(Boolean).slice(-8)
  }));
  proof.applyModalState=modalState;
  if(!modalState.open)throw new Error('B3_004_R12_APPLY_MODAL_NOT_OPEN:'+JSON.stringify({actionContext,modalState}));
  await page.waitForSelector('#cob-pay');
  proof.timing.applyOpenMs=Date.now()-applyOpenStartedAt;
  const applyResponsive=await page.evaluate(()=>{
    const modal=document.getElementById('cob-pay'),card=modal?.querySelector('.card'),footer=modal?.querySelector('[data-cobros-modal-footer="apply"]');
    const mr=modal?.getBoundingClientRect(),cr=card?.getBoundingClientRect();
    return{viewportWidth:innerWidth,viewportHeight:innerHeight,modalWidth:mr?.width||0,cardWidth:cr?.width||0,cardMaxHeight:getComputedStyle(card).maxHeight,footerExists:!!footer};
  });
  need(applyResponsive.footerExists&&applyResponsive.cardWidth<=applyResponsive.viewportWidth+1,'B3_004_R12P11_APPLY_MODAL_NOT_MOBILE_RESPONSIVE:'+JSON.stringify(applyResponsive));
  proof.mobileApplyModal=applyResponsive;
  await page.fill('#pm-paid','2026-09-30');
  await page.selectOption('#pm-metodo',{label:'Transferencia bancaria'});
  const supportA={name:'B3-004-R12-soporte-A.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2t8QAAAAASUVORK5CYII=','base64')};
  const [supportChooser]=await Promise.all([page.waitForEvent('filechooser'),page.click('#pm-support-btn')]);
  await supportChooser.setFiles(supportA);
  await page.waitForFunction(()=>document.querySelector('#pm-support-name')?.textContent?.includes('B3-004-R12-soporte-A.png'));
  proof.assertions.browserPaymentSupportSelected=true;
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
  const applyStartedAt=Date.now();
  await page.locator('#pm-ok').scrollIntoViewIfNeeded();
  need(await page.locator('#pm-ok').isVisible(),'B3_004_R12P11_APPLY_SAVE_NOT_REACHABLE_MOBILE');
  await page.click('#pm-ok');
  await page.waitForFunction(()=>String(document.querySelector('#pm-ok')?.textContent||'').includes('Guardando')||!document.getElementById('cob-pay'),null,{timeout:2500});
  proof.assertions.applySavingFeedback=true;
  try{
    await page.waitForFunction(()=>!document.getElementById('cob-pay')||document.querySelector('#pm-ok')?.disabled===false,null,{timeout:25000});
  }catch{}
  await page.waitForTimeout(250);
  const applyEvents=proof.transportEvents.filter(e=>e.at>=applyStartedAt);
  const uploadEvent=applyEvents.find(e=>e.kind==='response'&&/DocumentDriveUploadPreview/i.test(e.fn))||null;
  const paymentEvent=applyEvents.find(e=>e.kind==='response'&&/CobrosReconciliationCommandPreview/i.test(e.fn))||null;
  const uiFailure=await page.evaluate(()=>({
    payModalOpen:!!document.getElementById('cob-pay'),
    payButtonDisabled:!!document.querySelector('#pm-ok')?.disabled,
    supportName:String(document.querySelector('#pm-support-name')?.textContent||''),
    toasts:[...document.querySelectorAll('.ciclo-toast,.toast,[role="alert"]')].map(x=>String(x.textContent||'').trim()).filter(Boolean).slice(-8)
  }));
  proof.applyTransport={uploadEvent,paymentEvent,events:applyEvents,uiState:uiFailure,errors:proof.errors.slice(-8)};
  console.log('B3_004_R12_APPLY_TRANSPORT='+JSON.stringify(proof.applyTransport));
  need(uploadEvent,'B3_004_R12_DOCUMENT_UPLOAD_NOT_OBSERVED:'+JSON.stringify(proof.applyTransport));
  need(uploadEvent.httpStatus<400&&uploadEvent.ok===true&&!uploadEvent.errorStatus,'B3_004_R12_DOCUMENT_UPLOAD_FAILED:'+JSON.stringify(proof.applyTransport));
  need(paymentEvent,'B3_004_R12_APPLY_CALLABLE_NOT_OBSERVED_AFTER_UPLOAD:'+JSON.stringify(proof.applyTransport));
  need(paymentEvent.httpStatus<400&&paymentEvent.ok===true&&!paymentEvent.errorStatus,'B3_004_R12_APPLY_CALLABLE_FAILED:'+JSON.stringify(proof.applyTransport));
  need(uiFailure.payModalOpen===false,'B3_004_R12_APPLY_MODAL_REMAINED_OPEN_AFTER_SUCCESS:'+JSON.stringify(proof.applyTransport));
  proof.timing.applySaveMs=Date.now()-applyStartedAt;
  const paid=await waitCobro(xs=>xs.length===1&&xs[0].estado==='Pagado');
  need(paid.length===1,'B3_004_R12_PAYMENT_NOT_SINGLE');
  need(clean(paid[0].paymentSupportDocumentRef),'B3_004_R12_PAYMENT_SUPPORT_REF_MISSING_AFTER_UI_UPLOAD');
  proof.assertions.browserApplyPayment=true;
  proof.assertions.browserPaymentSupportPersisted=true;
  proof.timing.applyPostWriteReadbackMs=Math.max(0,Date.now()-(paymentEvent?.at||applyStartedAt));
  proof.payment={cobroId:paid[0].id,paymentState:paid[0].paymentState||'',applicationState:paid[0].applicationState||'',paymentSupportDocumentRef:clean(paid[0].paymentSupportDocumentRef)};

  await page.waitForTimeout(700);
  const postApplyContext=await page.evaluate(()=>({hash:String(location.hash||''),receiptParam:String(window.Orbit?.route?.params?.r||''),detail:!!document.querySelector('[data-rp-receipt-detail="1"]'),cobrosPage:!!document.querySelector('[data-cobros-root]')}));
  need(postApplyContext.receiptParam===ids.receipt&&postApplyContext.detail===true&&postApplyContext.cobrosPage===false,'B3_004_R14_POST_APPLY_CONTEXT_LOST:'+JSON.stringify(postApplyContext));
  proof.postApplyContext=postApplyContext;proof.assertions.postApplyContextStable=true;
  await page.waitForSelector('[data-rp-receipt-detail="1"]',{timeout:12000});
  const preReconcileReceipt=await page.evaluate(()=>{
    const detail=document.querySelector('[data-rp-receipt-detail="1"]');
    return{text:String(detail?.textContent||''),hash:String(location.hash||'')};
  });
  need(/Pendiente de conciliaci[oó]n/i.test(preReconcileReceipt.text)&&!/Cobro conciliado/i.test(preReconcileReceipt.text),'B3_004_R12P12_PREMATURE_RECONCILED_UI_STATE:'+JSON.stringify(preReconcileReceipt));
  proof.preReconcileReceipt=preReconcileReceipt;proof.assertions.paymentNotPrematurelyReconciled=true;
  await page.waitForFunction(()=>/Conciliar/i.test(String(document.querySelector('[data-rp-detail-payment-action]')?.textContent||'')),null,{timeout:12000});
  const reconcileOpenStartedAt=Date.now();
  await page.locator('[data-rp-detail-payment-action]').click();
  await page.waitForSelector('#cob-conc');
  proof.timing.reconcileOpenMs=Date.now()-reconcileOpenStartedAt;
  const reconcileResponsive=await page.evaluate(()=>{
    const modal=document.getElementById('cob-conc'),card=modal?.querySelector('.card'),footer=modal?.querySelector('[data-cobros-modal-footer="reconcile"]');
    const cr=card?.getBoundingClientRect();
    return{viewportWidth:innerWidth,viewportHeight:innerHeight,cardWidth:cr?.width||0,cardHeight:cr?.height||0,cardScrollHeight:card?.scrollHeight||0,footerExists:!!footer};
  });
  need(reconcileResponsive.footerExists&&reconcileResponsive.cardWidth<=reconcileResponsive.viewportWidth+1&&reconcileResponsive.cardHeight<=reconcileResponsive.viewportHeight+1,'B3_004_R12P11_RECONCILE_MODAL_NOT_MOBILE_RESPONSIVE:'+JSON.stringify(reconcileResponsive));
  await page.locator('#cc-ok').scrollIntoViewIfNeeded();
  need(await page.locator('#cc-ok').isVisible(),'B3_004_R12P11_RECONCILE_SAVE_NOT_REACHABLE_MOBILE');
  proof.mobileReconcileModal=reconcileResponsive;
  proof.assertions.mobileReconcileResponsive=true;
  const reconcileTransportStart=proof.transportEvents.length;
  await page.fill('#cc-aplicacion','2026-09-30');
  await page.fill('#cc-numero','QA-R12-UI-001');
  const supportB={name:'B3-004-R12-soporte-B.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64')};
  const invoiceFile={name:'B3-004-R14-factura.pdf',mimeType:'application/pdf',buffer:minimalPdfBuffer()};
  const [supportBChooser]=await Promise.all([page.waitForEvent('filechooser'),page.click('#cc-pay-btn')]);
  await supportBChooser.setFiles(supportB);
  await page.waitForFunction(()=>document.querySelector('#cc-pay-name')?.textContent?.includes('B3-004-R12-soporte-B.png'));
  proof.assertions.browserReplacementSupportSelected=true;
  const [invoiceChooser]=await Promise.all([page.waitForEvent('filechooser'),page.click('#cc-btn')]);
  await invoiceChooser.setFiles(invoiceFile);
  await page.waitForFunction(()=>document.querySelector('#cc-name')?.textContent?.includes('B3-004-R14-factura.pdf'));
  proof.assertions.browserInvoiceSelected=true;
  const reconcileStartedAt=Date.now();
  await page.click('#cc-ok');
  await page.waitForFunction(()=>String(document.querySelector('#cc-ok')?.textContent||'').includes('Guardando')||!document.getElementById('cob-conc'),null,{timeout:2500});
  proof.assertions.reconcileSavingFeedback=true;
  const applied=await waitCobro(xs=>xs.length===1&&xs[0].applicationState==='APPLIED_DIRECT'&&xs[0].invoiceNumber==='QA-R12-UI-001'&&clean(xs[0].paymentSupportDocumentRef)&&clean(xs[0].invoiceDocumentRef),20000);
  need(applied[0].id===paid[0].id,'B3_004_R12_RECONCILE_CREATED_DIFFERENT_COBRO');
  need(clean(applied[0].paymentSupportDocumentRef)!==clean(paid[0].paymentSupportDocumentRef),'B3_004_R12_REPLACEMENT_SUPPORT_REF_DID_NOT_CHANGE');
  need(clean(applied[0].invoiceDocumentRef),'B3_004_R12_INVOICE_REF_MISSING_AFTER_UI_UPLOAD');
  await page.waitForSelector('#cob-conc',{state:'detached',timeout:20000});
  proof.timing.reconcileSaveMs=Date.now()-reconcileStartedAt;
  await page.waitForTimeout(250);
  const reconcileTransport=proof.transportEvents.slice(reconcileTransportStart);
  const reconcileUploads=reconcileTransport.filter(x=>x.kind==='response'&&/DocumentDriveUploadPreview/i.test(x.fn));
  const reconcileFinalizes=reconcileTransport.filter(x=>x.kind==='response'&&/DocumentDriveFinalizePreview/i.test(x.fn));
  proof.reconcileTransport={events:reconcileTransport,uploadSuccess:reconcileUploads.filter(x=>x.httpStatus<400&&x.ok===true&&!x.errorStatus).length,finalizeSuccess:reconcileFinalizes.filter(x=>x.httpStatus<400&&x.ok===true&&!x.errorStatus).length,durationMs:Date.now()-reconcileStartedAt};
  console.log('B3_004_R12_RECONCILE_DOCUMENT_LIFECYCLE='+JSON.stringify(proof.reconcileTransport));
  need(proof.reconcileTransport.uploadSuccess===2,'B3_004_R12_RECONCILE_EXPECTED_TWO_SUCCESSFUL_UPLOADS:'+JSON.stringify(proof.reconcileTransport));
  need(proof.reconcileTransport.finalizeSuccess===2,'B3_004_R12_RECONCILE_EXPECTED_TWO_SUCCESSFUL_FINALIZES:'+JSON.stringify(proof.reconcileTransport));
  proof.assertions.browserReconcileSamePayment=true;
  proof.assertions.browserSupportReplacedSameCobro=true;
  proof.assertions.browserInvoicePersisted=true;
  proof.assertions.singleCobroReadback=true;
  await page.waitForTimeout(700);
  const postReconcileContext=await page.evaluate(()=>({hash:String(location.hash||''),receiptParam:String(window.Orbit?.route?.params?.r||''),detail:!!document.querySelector('[data-rp-receipt-detail="1"]'),text:String(document.querySelector('[data-rp-receipt-detail="1"]')?.textContent||''),cobrosPage:!!document.querySelector('[data-cobros-root]')}));
  need(postReconcileContext.receiptParam===ids.receipt&&postReconcileContext.detail===true&&postReconcileContext.cobrosPage===false&&/Cobro conciliado/i.test(postReconcileContext.text),'B3_004_R14_POST_RECONCILE_CONTEXT_LOST:'+JSON.stringify(postReconcileContext));
  proof.postReconcileContext=postReconcileContext;proof.assertions.postReconcileContextStable=true;
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForSelector('[data-rp-receipt-detail="1"]',{timeout:15000});
  const reloaded=await waitCobro(xs=>xs.length===1&&xs[0].applicationState==='APPLIED_DIRECT',12000);
  need(reloaded.length===1&&reloaded[0].id===paid[0].id,'B3_004_R12_RELOAD_SINGLE_COBRO_MISMATCH');
  need(clean(reloaded[0].paymentSupportDocumentRef)===clean(applied[0].paymentSupportDocumentRef),'B3_004_R12_PAYMENT_SUPPORT_NOT_DURABLE_AFTER_RELOAD');
  need(clean(reloaded[0].invoiceDocumentRef)===clean(applied[0].invoiceDocumentRef),'B3_004_R12_INVOICE_NOT_DURABLE_AFTER_RELOAD');
  proof.assertions.browserReloadDurability=true;
  const readTransportStart=proof.transportEvents.length;
  const documentReadbackStartedAt=Date.now();
  const docReadback=await page.evaluate(async ({paymentRef,invoiceRef,ids})=>{
    const dp=window.Orbit?.productDriveDocumentProviderP0;
    const runtime=window.Orbit?.productRuntimeBrowserProvidersP0?.status?.()||{};
    const role=String(window.Orbit?.session?.rol?.()||'');
    if(!dp||typeof dp.resolve!=='function')return{payment:false,invoice:false,provider:false,runtime,role};
    const ctx={clienteId:ids.client,polizaId:ids.policy,receiptId:ids.receipt,sourceModule:'cobros'};
    const [p,i]=await Promise.all([dp.resolve(paymentRef,ctx),dp.resolve(invoiceRef,ctx)]);
    const safe=x=>({
      ok:x?.ok===true,
      status:String(x?.status||''),
      code:String(x?.code||''),
      message:String(x?.message||'').slice(0,500),
      backendPersistent:x?.backendPersistent===true,
      documentRef:String(x?.documentRef||x?.fileId||''),
      mimeType:String(x?.mimeType||'')
    });
    return{provider:true,payment:!!(p&&p.ok===true&&p.backendPersistent===true),invoice:!!(i&&i.ok===true&&i.backendPersistent===true),paymentResult:safe(p),invoiceResult:safe(i),runtime,role};
  },{paymentRef:clean(reloaded[0].paymentSupportDocumentRef),invoiceRef:clean(reloaded[0].invoiceDocumentRef),ids});
  proof.documentReadbackDiagnostic={...docReadback,transport:proof.transportEvents.slice(readTransportStart)};
  console.log('B3_004_R12_DOCUMENT_READBACK='+JSON.stringify(proof.documentReadbackDiagnostic));
  need(docReadback.provider&&docReadback.payment&&docReadback.invoice,'B3_004_R12_DRIVE_READBACK_AFTER_RELOAD_FAILED:'+JSON.stringify(proof.documentReadbackDiagnostic));
  proof.assertions.browserDriveReadbackAfterReload=true;
  proof.timing.documentReadbackMs=Date.now()-documentReadbackStartedAt;
  proof.documents={paymentSupportDocumentRef:clean(reloaded[0].paymentSupportDocumentRef),invoiceDocumentRef:clean(reloaded[0].invoiceDocumentRef)};

  const directUiStart=Date.now();
  await page.goto(directReceiptUrl,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('[data-rp-receipt-detail="1"]',{timeout:15000});
  await page.waitForSelector('[data-rp-document="payment_support"] [data-rp-document-view]',{timeout:15000});
  await page.waitForSelector('[data-rp-document="insurer_invoice"] [data-rp-document-view]',{timeout:15000});
  const documentUi=await page.evaluate(start=>({
    paymentView:!!document.querySelector('[data-rp-document="payment_support"] [data-rp-document-view]'),
    paymentDownload:!!document.querySelector('[data-rp-document="payment_support"] [data-rp-document-download]'),
    invoiceView:!!document.querySelector('[data-rp-document="insurer_invoice"] [data-rp-document-view]'),
    invoiceDownload:!!document.querySelector('[data-rp-document="insurer_invoice"] [data-rp-document-download]'),
    receiptParam:String(window.Orbit?.route?.params?.r||''),
    reconciledLabel:/Cobro conciliado/i.test(String(document.querySelector('[data-rp-receipt-detail="1"]')?.textContent||'')),
    elapsedMs:Date.now()-start
  }),directUiStart);
  need(documentUi.paymentView&&documentUi.paymentDownload&&documentUi.invoiceView&&documentUi.invoiceDownload&&documentUi.receiptParam===ids.receipt&&documentUi.reconciledLabel===true,'B3_004_R12P11_DOCUMENT_UI_CONTROLS_MISSING:'+JSON.stringify(documentUi));
  proof.documentUi=documentUi;
  proof.assertions.browserDocumentControlsVisible=true;

  const imageReadPromise=page.waitForResponse(resp=>resp.request().method()==='POST'&&/orbit360DocumentDriveReadPreview/i.test(resp.url()),{timeout:15000});
  await page.click('[data-rp-document="payment_support"] [data-rp-document-view]');
  const imageRead=await imageReadPromise;
  need(imageRead.status()<400,'B3_004_R14_IMAGE_VIEW_HTTP_FAILED:'+imageRead.status());
  await page.waitForSelector('#rp-document-viewer [data-rp-doc-body] img',{timeout:15000});
  proof.assertions.browserImageInlinePreview=true;
  await page.click('#rp-document-viewer [data-rp-doc-close]');

  const pdfReadPromise=page.waitForResponse(resp=>resp.request().method()==='POST'&&/orbit360DocumentDriveReadPreview/i.test(resp.url()),{timeout:15000});
  await page.click('[data-rp-document="insurer_invoice"] [data-rp-document-view]');
  const pdfRead=await pdfReadPromise;
  need(pdfRead.status()<400,'B3_004_R14_PDF_VIEW_HTTP_FAILED:'+pdfRead.status());
  await page.waitForSelector('#rp-document-viewer [data-rp-pdf-preview="1"] object[type="application/pdf"]',{timeout:15000});
  need(await page.locator('#rp-document-viewer [data-rp-pdf-open]').isVisible(),'B3_004_R14_PDF_FALLBACK_NOT_VISIBLE');
  proof.assertions.browserPdfInlinePreview=true;
  await page.click('#rp-document-viewer [data-rp-doc-close]');
  proof.assertions.browserDocumentViewWorks=true;

  const downloadPromise=page.waitForResponse(resp=>resp.request().method()==='POST'&&/orbit360DocumentDriveDownloadPreview/i.test(resp.url()),{timeout:15000});
  await page.click('[data-rp-document="payment_support"] [data-rp-document-download]');
  const downloadResponse=await downloadPromise;
  need(downloadResponse.status()<400,'B3_004_R12P11_DOCUMENT_UI_DOWNLOAD_HTTP_FAILED:'+downloadResponse.status());
  proof.assertions.browserDocumentDownloadWorks=true;

  const cleanupDocs=await page.evaluate(async ({paymentRef,invoiceRef,ids})=>{
    const dp=window.Orbit?.productDriveDocumentProviderP0;
    if(!dp||typeof dp.quarantine!=='function')return{payment:false,invoice:false,provider:false};
    const ctx={clienteId:ids.client,polizaId:ids.policy,receiptId:ids.receipt,sourceModule:'cobros'};
    const [p,i]=await Promise.all([dp.quarantine(paymentRef,ctx),dp.quarantine(invoiceRef,ctx)]);
    return{provider:true,payment:!!(p&&p.ok===true),invoice:!!(i&&i.ok===true)};
  },{paymentRef:clean(reloaded[0].paymentSupportDocumentRef),invoiceRef:clean(reloaded[0].invoiceDocumentRef),ids});
  need(cleanupDocs.provider&&cleanupDocs.payment&&cleanupDocs.invoice,'B3_004_R12_UI_DOCUMENT_CLEANUP_QUARANTINE_FAILED:'+JSON.stringify(cleanupDocs));
  proof.assertions.browserDocumentCleanupQuarantined=true;
  proof.assertions.noRealBusinessWrite=true;
  const criticalNetwork=x=>{
    try{
      const u=new URL(clean(x.url));
      const h=u.hostname.toLowerCase();
      return u.origin===new URL(target).origin||h.endsWith('.googleapis.com')||h.endsWith('.cloudfunctions.net')||h.endsWith('.firebaseio.com')||h.endsWith('.firebasedatabase.app');
    }catch{return true;}
  };
  const criticalHttpErrors=proof.httpErrors.filter(criticalNetwork);
  const benignFirestoreListenAbort=x=>{
    try{
      const u=new URL(clean(x.url));
      return u.hostname.toLowerCase()==='firestore.googleapis.com'
        && u.pathname==='/google.firestore.v1.Firestore/Listen/channel'
        && clean(x.method).toUpperCase()==='GET'
        && clean(x.failure)==='net::ERR_ABORTED';
    }catch{return false;}
  };
  const benignLifecycleAborts=proof.requestFailures.filter(benignFirestoreListenAbort);
  const criticalRequestFailures=proof.requestFailures.filter(x=>criticalNetwork(x)&&!benignFirestoreListenAbort(x));
  const relevantConsoleErrors=proof.consoleErrors.filter(x=>!/^failed to load resource/i.test(clean(x.text)));
  proof.errorAdjudication={criticalHttpErrors,criticalRequestFailures,benignLifecycleAborts,pageErrors:proof.pageErrors,relevantConsoleErrors,rawConsoleErrors:proof.consoleErrors};
  proof.timing.documentUploadFinalizeMs=proof.reconcileTransport?.durationMs||0;
  console.log('B3_004_R12_TIMINGS='+JSON.stringify(proof.timing));
  console.log('B3_004_R12_ERROR_ADJUDICATION='+JSON.stringify(proof.errorAdjudication));
  need(proof.pageErrors.length===0,'B3_004_R12P11P6_PAGE_ERRORS:'+JSON.stringify(proof.pageErrors));
  need(criticalHttpErrors.length===0,'B3_004_R12P11P6_CRITICAL_HTTP_ERRORS:'+JSON.stringify(criticalHttpErrors));
  need(criticalRequestFailures.length===0,'B3_004_R12P11P6_CRITICAL_REQUEST_FAILURES:'+JSON.stringify(criticalRequestFailures));
  need(relevantConsoleErrors.length===0,'B3_004_R12P11P6_RELEVANT_CONSOLE_ERRORS:'+JSON.stringify(relevantConsoleErrors));
  proof.assertions.noFunctionalPageConsoleHttpErrors=true;
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
