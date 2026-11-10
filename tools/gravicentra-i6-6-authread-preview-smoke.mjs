import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
import {initializeApp,cert,deleteApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';

const PROJECT='ays-orbit-360-lab',TENANT='alianzas-soluciones';
const REQUEST='artifacts/orbit360-recovery/release-control/I6_6_AUTHENTICATED_READONLY_SMOKE_REQUEST_20261110.json';
const OUT=path.join(process.env.RUNNER_TEMP||process.cwd(),'i66-authenticated-readonly-smoke.json');
const need=(ok,code)=>{if(!ok)throw Error(code);};
const norm=v=>String(v==null?'':v).trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_');
const uniq=a=>[...new Set([].concat(a||[]).map(x=>String(x||'').trim()).filter(Boolean))];
const request=JSON.parse(fs.readFileSync(REQUEST,'utf8'));
need(request.schema==='I6_6_PREVIEW_AUTHENTICATED_READONLY_SMOKE_V1'&&request.status==='AUTHORIZED_READONLY_SMOKE_REQUESTED','QA_AUTHORIZATION_INVALID');
need(request.gate==='I6.6'&&request.historicalGateClosed==='B4-007'&&request.businessDataWritesAuthorized===false&&request.promotionAuthorized===false,'QA_WRITE_OR_PROMOTION_NOT_ALLOWED');
need(/^[0-9a-f]{40}$/.test(request.sourceSha||'')&&/^[0-9a-f]{64}$/.test(request.artifactZipSha256||'')&&/^gi-i66-[0-9a-f]{12}-[a-z0-9]+$/.test(request.buildId||'')&&Number.isInteger(request.artifactId)&&request.artifactId>0,'QA_ARTIFACT_PIN_INVALID');
const target=String(request.previewUrl||'').replace(/\/$/,'');
need(/^https:\/\/ays-orbit-360-lab--gi-i66-rc-[0-9]+-[a-z0-9-]+\.web\.app$/.test(target),'QA_ORIGIN_INVALID');
function serviceAccount(){
  for(const key of ['SA_LAB','SA_LAB_ALT','SA_DEFAULT']){
    try{const x=JSON.parse(process.env[key]||'');if(x.type==='service_account'&&x.project_id===PROJECT&&x.private_key)return x;}catch{}
  }
  throw Error('QA_AUTH_SERVICE_ACCOUNT_NOT_CONFIGURED');
}
async function existingActor(db,auth){
  const snap=await db.collection('tenants').doc(TENANT).collection('members').get();
  const found=[];
  for(const doc of snap.docs){
    const m=doc.data()||{},rr=uniq([...(m.roles||[]),...(m.rolesAsignados||[]),...(m.assignedRoles||[]),m.role,m.rol,m.defaultRole,m.activeRole]),rn=rr.map(norm),st=norm(m.status||m.estado||'active');
    if(m.active===false||m.activo===false||['inactive','inactivo','blocked','bloqueado','suspended','suspendido'].includes(st))continue;
    if(!rn.includes('operativo'))continue;
    const privileged=rn.some(x=>['direccion','superadmin','super_admin','admintenant','admin_tenant','admin'].includes(x));
    for(const uid of uniq([m.uid,doc.id])){
      try{const existing=await auth.getUser(uid);if(existing.disabled)continue;found.push({uid:existing.uid,role:'Operativo',privileged,score:(privileged?100:0)+(existing.emailVerified?10:0)});break;}catch{}
    }
  }
  found.sort((a,b)=>b.score-a.score);
  need(found.length>0,'QA_EXISTING_OPERATIVO_IDENTITY_UNAVAILABLE');
  return found[0];
}
const evidence={schema:'I6_6_AUTHENTICATED_READONLY_SMOKE_EVIDENCE_V1',gate:'I6.6',sourceSha:request.sourceSha,
  buildId:request.buildId,previewHostClass:'GI_I66_RC_EXACT',status:'HOLD',authenticated:false,role:'',route:'',fields:{},legalGate:false,
  backendWritesObserved:0,firestoreWritesObserved:0,saveClicked:false,userCreated:false,credentialPersisted:false,sessionSignedOut:false};
let adminApp=null,browser=null,context=null,page=null;
const violations=[];
try{
  adminApp=initializeApp({credential:cert(serviceAccount()),projectId:PROJECT});
  const auth=getAuth(adminApp),db=getFirestore(adminApp),actor=await existingActor(db,auth);
  const token=await auth.createCustomToken(actor.uid,{i66ReadonlyQa:true});
  browser=await chromium.launch({headless:true});
  context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'});
  page=await context.newPage();
  page.setDefaultTimeout(22000);
  const allowedReadCallables=new Set(['orbit360ScopedPolicyReadPreview','orbit360AssignableAdvisorRosterPreview','orbit360TenantDomainConfigPreview','orbit360ProductAssetReadPreview']);
  await page.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url());
    if(req.method()==='POST'&&/\.cloudfunctions\.net$/i.test(url.hostname)){
      const name=url.pathname.split('/').filter(Boolean).pop()||'';
      if(name==='orbit360TenantBranding'){
        let payload=null;try{payload=JSON.parse(req.postData()||'{}')?.data||null;}catch{}
        if(!payload||payload.action!=='get'||payload.tenantId!==TENANT||
           Object.keys(payload).some(k=>k!=='action'&&k!=='tenantId')){
          violations.push('WRITER_CALLABLE_REQUEST_DENIED');await route.abort();return;
        }
      }else if(!allowedReadCallables.has(name)){violations.push('WRITER_CALLABLE_REQUEST_DENIED');await route.abort();return;}
    }
    if(req.method()==='POST'&&/firestore\.googleapis\.com$/i.test(url.hostname)&&/:(commit|batchWrite)/i.test(url.pathname)){
      violations.push('DIRECT_FIRESTORE_WRITE_DENIED');await route.abort();return;
    }
    await route.continue();
  });
  await page.goto(target+'/#/inicio',{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0);
  const authenticated=await page.evaluate(async customToken=>{
    const p=window.Orbit.productRuntimeBrowserProvidersP0,ctx=await p.initialize();
    await ctx.modules.auth.signInWithCustomToken(ctx.auth,customToken);
    const st=window.Orbit.productAppP0.status?.().started?window.Orbit.productAppP0.status():await window.Orbit.productAppP0.activate();
    return {auth:!!ctx.auth.currentUser,started:st?.started===true,mode:p.protectedHostMode(),readonly:p.isI66PreviewHost()};
  },token);
  need(authenticated.auth&&authenticated.started&&authenticated.mode==='preview'&&authenticated.readonly,'QA_AUTHENTICATED_RUNTIME_NOT_READY');
  evidence.authenticated=true;
  evidence.stage='AUTHENTICATED';
  const roleSet=await page.evaluate(()=>window.Orbit.session?.set?.('Operativo')===true);
  need(roleSet,'QA_OPERATIVO_ROLE_NOT_ASSIGNED');
  await page.waitForFunction(()=>window.Orbit.session?.rol?.()==='Operativo');
  evidence.role='Operativo';
  evidence.stage='OPERATIVO_ROLE_READY';
  await page.evaluate(()=>{if(window.Orbit.router?.go)window.Orbit.router.go('cobros');else location.hash='#/cobros';});
  await page.waitForFunction(()=>location.hash.includes('cobros'));
  evidence.route='cobros';
  evidence.stage='COBROS_ROUTE_ACTIVE';
  await page.waitForFunction(()=>Array.isArray(window.Orbit?.store?.all?.('recibosEsperados'))&&window.Orbit.store.all('recibosEsperados').length>0,null,{timeout:25000});
  evidence.stage='RECEIPTS_LOADED';
  const inspected=await page.evaluate(()=>{
    const r=(window.Orbit.store.all('recibosEsperados')||[]).filter(Boolean),bridge=window.Orbit.receiptsPortfolioProjection;
    if(!bridge||typeof bridge.editReceipt!=='function')return{bridge:false,opened:false,internal:false,source:false,safe:false};
    let opened=false;
    for(const row of r){
      if(!row.id)continue;
      try{if(bridge.editReceipt(row.id,row.clienteId||'')){opened=true;break;}}catch{}
    }
    const drawer=document.querySelector('[data-rp-edit-receipt-card="1"]'),internal=drawer?.querySelector('[data-rp-serie]'),source=drawer?.querySelector('[data-rp-source-receipt]'),save=drawer?.querySelector('[data-rp-save]');
    return{bridge:true,opened,internal:!!internal,source:!!source,separate:!!internal&&!!source&&internal!==source,
      internalLabel:!!internal?.closest('label')?.textContent?.includes('Serie / cuota interna'),
      sourceLabel:!!source?.closest('label')?.textContent?.includes('Número de requerimiento de aseguradora'),
      saveExists:!!save,legalGate:!!document.querySelector('[data-legal-gate]')};
  });
  evidence.stage='RECEIPTS_FIELDS_INSPECTED';
  evidence.fields={receiptProjectionPresent:inspected.bridge,editPanelOpened:inspected.opened,internalFieldPresent:inspected.internal,insurerSourceFieldPresent:inspected.source,separateFields:inspected.separate,semanticLabels:inspected.internalLabel&&inspected.sourceLabel};
  evidence.legalGate=inspected.legalGate;
  need(inspected.bridge&&inspected.opened&&inspected.separate&&inspected.internalLabel&&inspected.sourceLabel&&inspected.saveExists,'QA_RECEIPT_TWO_FIELDS_NOT_VISIBLE');
  need(violations.length===0,'QA_UNEXPECTED_BACKEND_WRITE_ATTEMPT');
  evidence.status='AUTHENTICATED_READONLY_SMOKE_PASS_NOT_UAT';
}catch(error){
  evidence.status='HOLD';
  const message=String(error?.message||error);
  evidence.blocker=/^QA_[A-Z0-9_]+$/.test(message)?message:'QA_RUNTIME_OR_AUTH_UNAVAILABLE';
}finally{
  evidence.backendWritesObserved=violations.filter(x=>x==='WRITER_CALLABLE_REQUEST_DENIED').length;
  evidence.firestoreWritesObserved=violations.filter(x=>x==='DIRECT_FIRESTORE_WRITE_DENIED').length;
  try{if(page)await page.evaluate(async()=>{const p=window.Orbit?.productRuntimeBrowserProvidersP0;if(p?.signOut)await p.signOut();});evidence.sessionSignedOut=true;}catch{}
  try{if(context)await context.clearCookies();}catch{}
  try{if(browser)await browser.close();}catch{}
  try{if(adminApp)await deleteApp(adminApp);}catch{}
  fs.writeFileSync(OUT,JSON.stringify(evidence,null,2)+'\n',{mode:0o600});
}
console.log('I66_AUTH_QA_STATUS='+evidence.status);
console.log('I66_AUTH_QA_ROLE='+evidence.role);
console.log('I66_AUTH_QA_STAGE='+String(evidence.stage||'START')); 
console.log('I66_AUTH_QA_BLOCKER='+String(evidence.blocker||'none'));
console.log('I66_AUTH_QA_BUSINESS_WRITES='+evidence.backendWritesObserved+':'+evidence.firestoreWritesObserved);
console.log('I66_AUTH_QA_CREDENTIAL_CLEANUP='+evidence.sessionSignedOut);
if(evidence.status!=='AUTHENTICATED_READONLY_SMOKE_PASS_NOT_UAT'||!evidence.sessionSignedOut)process.exitCode=1;
