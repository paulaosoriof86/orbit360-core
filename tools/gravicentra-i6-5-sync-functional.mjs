import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const PROJECT='ays-orbit-360-lab',TENANT='alianzas-soluciones';
const TARGET=String(process.env.TARGET_URL||'').replace(/\/$/,'');
const STAGE=process.env.I65_PROOF_STAGE||'unknown';
const EXPECTED_SOURCE=process.env.EXPECTED_SOURCE_SHA||'';
const EXPECTED_BUILD=process.env.EXPECTED_BUILD_ID||'';
const OUT=process.env.I65_PROOF_FILE||path.join(process.env.RUNNER_TEMP||process.cwd(),'i65-sync-'+STAGE+'.json');
const clean=(v,m=1200)=>String(v==null?'':v).trim().slice(0,m);
const norm=v=>clean(v,180).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const need=(ok,code)=>{if(!ok)throw new Error(code);};
function sa(){for(const k of ['SA_DEFAULT','SA_ORBIT360_LAB','SA_ORBIT_360_LAB']){try{const x=JSON.parse(process.env[k]||'');if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.client_email&&x?.private_key)return x;}catch{}}throw new Error('I65_PROOF_SERVICE_ACCOUNT');}
function rolesOf(m){return[...new Set([].concat(m?.roles||[],m?.rolesAsignados||[],m?.assignedRoles||[],m?.rolesDisponibles||[],m?.role||[],m?.rol||[],m?.rolDefault||[],m?.defaultRole||[]).map(v=>clean(v)).filter(Boolean))];}
async function actor(db,auth){const snap=await db.collection('tenants').doc(TENANT).collection('members').get();for(const p of ['direccion','superadmin','super_admin','admintenant','admin_tenant','admin'])for(const d of snap.docs){const m=d.data()||{},uid=clean(m.uid||d.id,180),role=rolesOf(m).find(r=>norm(r)===p),state=norm(m.status||m.estado||'active');if(!uid||!role||m.active===false||m.activo===false||['inactive','inactivo','blocked','bloqueado','suspended','suspendido'].includes(state))continue;try{const u=await auth.getUser(uid);if(!u.disabled&&u.emailVerified===true)return{uid,role};}catch{}}throw new Error('I65_PROOF_NO_MANAGER');}
async function activate(page,auth,a){const token=await auth.createCustomToken(a.uid,{gravicentraI65Sync:true});await page.goto(TARGET,{waitUntil:'domcontentloaded',timeout:30000});await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:15000});const st=await page.evaluate(async tok=>{const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();if(!c.auth.currentUser)await c.modules.auth.signInWithCustomToken(c.auth,tok);return Orbit.productAppP0.status?.().started===true?Orbit.productAppP0.status():await Orbit.productAppP0.activate();},token);need(st?.started===true,'I65_PROOF_APP_START');await page.waitForFunction(()=>Orbit?.productAppP0?.status?.().started===true&&!document.body.classList.contains('pre-auth'),null,{timeout:18000});const gate=page.locator('[data-legal-gate].open');if(await gate.count()){const chk=gate.locator('#lg-chk'),ok=gate.locator('#lg-ok');if(await chk.count())await chk.check();if(await ok.count())await ok.click();await gate.waitFor({state:'detached',timeout:5000}).catch(()=>{});}const sess=await page.evaluate(()=>({active:Orbit.session?.rol?.()||'',assigned:Orbit.session?.allowedRoles?.()||[]}));if(sess.active!==a.role){need(sess.assigned.includes(a.role),'I65_PROOF_ROLE_NOT_ASSIGNED');need(await page.evaluate(r=>Orbit.session.set(r),a.role),'I65_PROOF_ROLE_SWITCH');await page.waitForFunction(r=>Orbit.session?.rol?.()===r,a.role,{timeout:6000});}}

const app=initializeApp({credential:cert(sa()),projectId:PROJECT},'i65-sync-'+STAGE),auth=getAuth(app),db=(await import('firebase-admin/firestore')).getFirestore(app);
let browser;
const ev={schema:'GRAVICENTRA_I6_5_SYNC_FUNCTIONAL_V1',stage:STAGE,status:'FAIL',release:{},owner:{},counts:{},sample:{},i64Sentinels:{},errors:[],writes:0,containsPII:false,containsSecrets:false};
try{
  need(/^https:\/\//.test(TARGET),'I65_PROOF_TARGET');
  const a=await actor(db,auth);
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),pageErrors=[],http404=[];
  page.on('pageerror',e=>pageErrors.push(clean(e?.stack||e?.message||e)));
  page.on('response',r=>{if(r.status()===404&&r.url().startsWith(TARGET))http404.push(new URL(r.url()).pathname);});
  await activate(page,auth,a);
  const marker=await page.evaluate(()=>({source:window.__ORBIT360_PRODUCT_PUBLIC_CONFIG__?.sourceSha||'',build:window.__ORBIT360_PRODUCT_PUBLIC_CONFIG__?.buildId||''}));
  need(marker.source===EXPECTED_SOURCE&&marker.build===EXPECTED_BUILD,'I65_RELEASE_MARKER');
  await page.waitForFunction(()=>!!window.Orbit?.pwa?.checkBuildFreshness,null,{timeout:6000});
  await page.evaluate(()=>Orbit.pwa.checkBuildFreshness('i65-qa'));
  await page.waitForFunction(expected=>window.OrbitPwaBuildFreshness?.status==='current'&&window.OrbitPwaBuildFreshness?.serverBuild===expected,EXPECTED_BUILD,{timeout:10000});
  ev.release={...marker,buildFreshnessPass:true};

  await page.waitForFunction(()=>window.Orbit?.receiptsPortfolioProjectionV920?.status?.().ready===true,null,{timeout:20000});
  const owner=await page.evaluate(()=>{
    const rp=Orbit.receiptsPortfolioProjectionV920,st=rp.status(),S=Orbit.store,ps=S._productStatus();
    const t=ps.tenantId,paths=Orbit.tenantCanonicalPathsP0;
    return{
      alias:Orbit.receiptsPortfolioProjection===rp,
      version:st.version,ready:st.ready,owners:st.owners,directFirestoreListeners:st.directFirestoreListeners,parallelCache:st.parallelCache,
      tenantId:t,readOnly:S.__productReadOnlyP0===true,
      receiptPath:paths.dataCollectionPath(t,'recibosEsperados'),portfolioPath:paths.dataCollectionPath(t,'carteraPrimas')
    };
  });
  need(owner.alias&&owner.ready&&owner.readOnly,'I65_CANONICAL_OWNER_NOT_READY');
  need(owner.directFirestoreListeners===0&&owner.parallelCache===false,'I65_PARALLEL_READ_OWNER');
  need(Object.values(owner.owners||{}).every(Boolean),'I65_OWNER_COMPONENT_NOT_READY:'+JSON.stringify(owner.owners));
  need(/\/recibosEsperados\/items$/.test(owner.receiptPath)&&/\/carteraPrimas\/items$/.test(owner.portfolioPath),'I65_CANONICAL_PATH_INVALID');
  ev.owner=owner;

  const baseline=await page.evaluate(()=>{
    const receipts=Orbit.store.all('recibosEsperados')||[],portfolio=Orbit.store.all('carteraPrimas')||[];
    const byClient=new Map();
    receipts.forEach(r=>{const cid=r.clienteId||(Orbit.store.get('polizas',r.polizaId)||{}).clienteId||'';if(cid)byClient.set(cid,(byClient.get(cid)||0)+1);});
    const sample=[...byClient.entries()].sort((a,b)=>b[1]-a[1])[0]||['',0];
    const cid=sample[0],rec=cid?receipts.find(r=>(r.clienteId||(Orbit.store.get('polizas',r.polizaId)||{}).clienteId||'')===cid):null;
    return{
      receiptCount:receipts.length,portfolioCount:portfolio.length,cid,receiptId:rec?.id||'',policyId:rec?.polizaId||'',
      qReceipts:cid?(Orbit.q.recibosEsperadosDe(cid)||[]).length:0,
      sReceipts:cid?Orbit.store.where('recibosEsperados',r=>(r.clienteId||(Orbit.store.get('polizas',r.polizaId)||{}).clienteId||'')===cid).length:0,
      qPortfolio:cid?(Orbit.q.carteraPrimasDe(cid)||[]).length:0,
      sPortfolio:cid?Orbit.store.where('carteraPrimas',r=>(r.clienteId||(Orbit.store.get('polizas',r.polizaId)||{}).clienteId||'')===cid).length:0
    };
  });
  need(baseline.qReceipts===baseline.sReceipts&&baseline.qPortfolio===baseline.sPortfolio,'I65_QUERY_STORE_COUNT_DRIFT');
  ev.counts={recibosEsperados:baseline.receiptCount,carteraPrimas:baseline.portfolioCount};
  ev.sample={hasReceipt:!!baseline.receiptId,queryReceipts:baseline.qReceipts,storeReceipts:baseline.sReceipts,queryPortfolio:baseline.qPortfolio,storePortfolio:baseline.sPortfolio};

  if(baseline.cid){
    await page.evaluate(cid=>{location.hash='#/cliente360?c='+encodeURIComponent(cid);},baseline.cid);
    await page.waitForFunction(()=>Orbit?.route?.key==='cliente360',null,{timeout:15000});
    const tab=page.locator('.ftab[data-tab="recibos"]');
    need(await tab.count()===1,'I65_CLIENT_RECEIPTS_TAB_MISSING');
    await tab.click();
    await page.waitForSelector('#c360-body[data-rp-native-owner="v920"]',{timeout:10000});
    const ui=await page.evaluate(()=>({owner:document.getElementById('c360-body')?.getAttribute('data-rp-native-owner')||'',receipts:Number(document.getElementById('c360-body')?.getAttribute('data-rp-receipt-count')||0),portfolio:Number(document.getElementById('c360-body')?.getAttribute('data-rp-portfolio-count')||0)}));
    need(ui.owner==='v920'&&ui.receipts===baseline.qReceipts&&ui.portfolio===baseline.qPortfolio,'I65_CLIENT_UI_COUNT_DRIFT:'+JSON.stringify(ui));
    ev.sample.clientUi=ui;
  }

  if(baseline.receiptId){
    need(await page.evaluate(({rid,cid})=>Orbit.receiptsPortfolioProjection.openReceiptDetail(rid,cid),{rid:baseline.receiptId,cid:baseline.cid}),'I65_RECEIPT_DETAIL_OPEN_FALSE');
    await page.waitForSelector('.orbit-receipt-fullpage[data-rp-owner="v920"]',{timeout:7000});
    ev.sample.receiptDetailOwner='v920';
  }

  await page.evaluate(()=>{location.hash='#/polizas';});
  await page.waitForFunction(()=>Orbit?.route?.key==='polizas'&&document.querySelectorAll('.kpi-row .kpi').length>=4,null,{timeout:15000});
  const sent=await page.evaluate(()=>{
    const all=Orbit.store.all('polizas')||[],m=Orbit.modules.polizas.policyMetrics,cards=[...document.querySelectorAll('.kpi-row .kpi')];
    const labels=cards.slice(0,4).map(k=>(k.querySelector('.k-label')?.textContent||'').trim());
    return{policies:all.length,renewals:all.filter(m.isRenewalWithin45Days).length,historical:all.filter(m.isHistoricalNoPortfolio).length,labels};
  });
  need(sent.policies===1414&&sent.renewals===11&&sent.historical===1191,'I65_I64_SENTINEL_REGRESSION:'+JSON.stringify(sent));
  need(sent.labels[0]==='Pólizas vigentes'&&sent.labels[1]==='Prima neta vigente'&&sent.labels[2]==='Por renovar ≤45 d'&&sent.labels[3]==='Histórico / sin cartera','I65_I64_KPI_OWNER_REGRESSION:'+JSON.stringify(sent.labels));
  ev.i64Sentinels=sent;

  await page.waitForTimeout(700);
  const stable=await page.evaluate(()=>({owner:Orbit.receiptsPortfolioProjection===Orbit.receiptsPortfolioProjectionV920,status:Orbit.receiptsPortfolioProjectionV920.status(),r:(Orbit.store.all('recibosEsperados')||[]).length,p:(Orbit.store.all('carteraPrimas')||[]).length}));
  need(stable.owner&&stable.status.ready&&stable.r===baseline.receiptCount&&stable.p===baseline.portfolioCount,'I65_OWNER_UNSTABLE_AFTER_RERENDER');
  need(pageErrors.length===0,'I65_PAGE_ERRORS:'+JSON.stringify(pageErrors.slice(0,3)));
  need(http404.length===0,'I65_HTTP404:'+JSON.stringify(http404.slice(0,3)));
  ev.status='PASS';
}catch(e){ev.errors.push(clean(e?.message||e,300));console.error('I65_PROOF_ERROR='+clean(e?.message||e,300));process.exitCode=1;}
finally{if(browser)await browser.close().catch(()=>{});await deleteApp(app).catch(()=>{});fs.writeFileSync(OUT,JSON.stringify(ev,null,2)+'\n');console.log('I65_SYNC_PROOF='+ev.status);console.log('I65_SYNC_STAGE='+STAGE);console.log('I65_OPERATIONAL_WRITES=0');}
