import fs from 'node:fs';
import path from 'node:path';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { chromium } from 'playwright';

const PROJECT=String(process.env.PROJECT_ID||'').trim(),TENANT=String(process.env.TENANT_HINT||'').trim(),TARGET=String(process.env.TARGET_URL||'').replace(/\/$/,'');
const OUT=process.env.B1_R14_OUT||path.join(process.env.RUNNER_TEMP||process.cwd(),'b1-r14-mobile-shell.json');
const need=(v,c)=>{if(!v)throw new Error(c);}, clean=(v,n=900)=>String(v==null?'':v).trim().slice(0,n);
const uniq=a=>[...new Set([].concat(a||[]).map(x=>clean(x,180)).filter(Boolean))], rn=v=>clean(v,80).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function sa(){for(const k of ['SA_DEFAULT','SA_ORBIT360_LAB','SA_ORBIT_360_LAB']){try{const x=JSON.parse(process.env[k]||'');if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.private_key)return x;}catch{}}throw Error('B1_R14_SA');}
function roles(m){return uniq([...(m?.roles||[]),...(m?.rolesAsignados||[]),m?.role,m?.rol]);}
async function actor(db,auth){const s=await db.collection('tenants').doc(TENANT).collection('members').get(),a=[];for(const d of s.docs){const m=d.data()||{},r=roles(m).map(rn).sort(),active=!(m.active===false||m.activo===false);if(!active||r.length!==2||r[0]!=='asesor'||r[1]!=='operativo')continue;try{const u=await auth.getUser(m.uid||d.id);if(!u.disabled)a.push({uid:u.uid});}catch{}}need(a.length===1,'B1_R14_ACTOR_CARDINALITY:'+a.length);return a[0];}
async function activate(page,auth,uid){const t=await auth.createCustomToken(uid,{b1R14ReadOnly:true});await page.waitForFunction(()=>!!Orbit?.productRuntimeBrowserProvidersP0&&!!Orbit?.productAppP0,null,{timeout:20000});await page.evaluate(async x=>{const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();if(!c.auth.currentUser)await c.modules.auth.signInWithCustomToken(c.auth,x);if(!Orbit.productAppP0.status?.().started)await Orbit.productAppP0.activate();},t);await page.waitForFunction(()=>Orbit.store?._productStatus?.().ready===true,null,{timeout:30000});}
async function tapReal(page,selector){
  const hit=await page.evaluate(sel=>{const e=document.querySelector(sel);if(!e)return{ok:false,reason:'MISSING'};const r=e.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,t=document.elementFromPoint(x,y);return{ok:!!t&&(t===e||e.contains(t)),x,y,top:t?{id:t.id||'',cls:String(t.className||''),tag:t.tagName}:null,rect:{x:r.x,y:r.y,width:r.width,height:r.height}};},selector);
  need(hit.ok,'B1_R14_HIT_TARGET:'+selector+':'+JSON.stringify(hit));
  await page.touchscreen.tap(hit.x,hit.y);
  return hit;
}
async function neutralizeFreshSessionLegalGate(page){
  return page.evaluate(()=>{
    const gates=[...document.querySelectorAll('[data-legal-gate]')];
    const count=gates.length;
    gates.forEach(e=>e.remove());
    document.body.style.overflow='';
    document.documentElement.style.overflow='';
    return count;
  });
}
async function chooseRole(page,label){await page.locator('#rol-sel').selectOption({label});await page.waitForFunction(x=>Orbit.session?.rol?.()===x,label,{timeout:8000});await page.waitForTimeout(250);}
async function route(page,r){await page.evaluate(x=>{location.hash='#/'+x;},r);await page.waitForFunction(x=>Orbit.route?.key===x&&document.querySelector('#host .page')&&!document.querySelector('#host .modstate'),r,{timeout:10000});}
const ev={status:'RUNNING',writes:0,viewports:[],errors:[]};let app,browser;
try{
 need(PROJECT&&TENANT&&TARGET,'B1_R14_ENV');
 const sw=fs.readFileSync('orbit360-platform/sw.js','utf8');need(sw.includes('orbit360-v20260921-b1r14-mobile-shell-1'),'B1_R14_SW_GENERATION');
 app=initializeApp({credential:cert(sa()),projectId:PROJECT},'b1-r14-'+Date.now());const db=getFirestore(app),auth=getAuth(app),a=await actor(db,auth);
 browser=await chromium.launch({headless:true});
 for(const vp of [{width:390,height:844},{width:430,height:932}]){
   const context=await browser.newContext({viewport:vp,isMobile:true,hasTouch:true});const page=await context.newPage();const pageErrors=[];page.on('pageerror',e=>pageErrors.push(clean(e?.message||e,1600)));
   await page.goto(TARGET+'/?b1r14='+Date.now()+'#/inicio',{waitUntil:'domcontentloaded',timeout:30000});await activate(page,auth,a.uid);await page.waitForTimeout(700);const legalGateRemoved=await neutralizeFreshSessionLegalGate(page);
   const layout=await page.evaluate(()=>{const one=s=>{const e=document.querySelector(s);if(!e)return{exists:false};const c=getComputedStyle(e),r=e.getBoundingClientRect();return{exists:true,display:c.display,visibility:c.visibility,position:c.position,rect:{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom},visible:c.display!=='none'&&c.visibility!=='hidden'&&r.width>0&&r.height>0};};return{topbar:one('.topbar'),burger:one('#burger'),brand:one('.brand'),tenant:one('.tb-logo'),country:one('#sw-pais'),role:one('#tb-rol'),searchToggle:one('#tb-search-toggle'),search:one('.tb-search'),theme:one('#sw-theme'),mail:one('#tb-mail'),bell:one('#nov-bell'),user:one('#tb-user')};});
   for(const k of ['burger','brand','country','role','searchToggle','theme','mail','bell','user'])need(layout[k]?.visible,'B1_R14_MOBILE_CONTROL_HIDDEN:'+k+':'+vp.width);
   need(layout.tenant?.display==='none','B1_R14_TENANT_LOGO_COLLISION:'+vp.width);
   need(layout.search?.display==='none','B1_R14_SEARCH_PERSISTENT:'+vp.width);
   need(layout.topbar.rect.height<=108,'B1_R14_TOPBAR_TOO_TALL:'+layout.topbar.rect.height);
   for(const k of ['burger','brand','country','role','searchToggle','theme','mail','bell','user'])need(layout[k].rect.right<=vp.width+1&&layout[k].rect.x>=-1&&layout[k].rect.bottom<=layout.topbar.rect.bottom+1,'B1_R14_CONTROL_OUTSIDE:'+k+':'+vp.width);

   const burgerHit=await tapReal(page,'#burger');await page.waitForFunction(()=>document.querySelector('#sidebar')?.classList.contains('open')&&document.querySelector('.sb-overlay')?.classList.contains('show'),null,{timeout:3000});await tapReal(page,'.sb-overlay');await page.waitForFunction(()=>!document.querySelector('#sidebar')?.classList.contains('open'),null,{timeout:3000});

   const options=await page.locator('#rol-sel option').allTextContents();need(options.some(x=>x.trim()==='Asesor')&&options.some(x=>x.trim()==='Operativo'),'B1_R14_ROLE_OPTIONS:'+options.join('|'));
   await chooseRole(page,'Asesor');await chooseRole(page,'Operativo');

   const searchHit=await tapReal(page,'#tb-search-toggle');await page.waitForFunction(()=>getComputedStyle(document.querySelector('.tb-search')).display!=='none'&&document.querySelector('.tb-search').classList.contains('mobile-open'),null,{timeout:3000});need(await page.locator('.tb-search input').evaluate(e=>document.activeElement===e),'B1_R14_SEARCH_FOCUS');await tapReal(page,'#tb-search-toggle');await page.waitForFunction(()=>getComputedStyle(document.querySelector('.tb-search')).display==='none',null,{timeout:3000});

   await page.waitForFunction(()=>!!Orbit?.pwa?.install,null,{timeout:10000});await page.evaluate(()=>Orbit.pwa.install('instalar'));await page.waitForSelector('#pwa-install',{timeout:3000});
   const install=await page.locator('#pwa-install').evaluate(e=>{const r=e.getBoundingClientRect(),h=document.querySelector('#host')?.getBoundingClientRect(),c=getComputedStyle(e);return{parent:e.parentElement?.id||'',position:c.position,bottom:r.bottom,hostTop:h?.top||0};});
   need(install.parent==='pwa-mobile-slot'&&install.position==='static','B1_R14_PWA_NOT_IN_FLOW:'+JSON.stringify(install));need(install.bottom<=install.hostTop+2,'B1_R14_PWA_OVERLAP:'+JSON.stringify(install));await page.locator('#pwa-install').evaluate(e=>e.remove());

   for(const r of ['inicio','cliente360','polizas','cobros'])await route(page,r);
   const table=await page.evaluate(()=>{const t=document.querySelector('#host .tbl'),td=t&&t.querySelector('td');if(!t||!td)return null;const c=getComputedStyle(td);return{whiteSpace:c.whiteSpace,wordBreak:c.wordBreak,clientWidth:t.clientWidth,scrollWidth:t.scrollWidth};});
   if(table)need(table.whiteSpace==='nowrap'&&table.wordBreak!=='break-all','B1_R14_TABLE_FRAGMENT:'+JSON.stringify(table));

   await chooseRole(page,'Asesor');await page.reload({waitUntil:'domcontentloaded',timeout:30000});await page.waitForFunction(()=>Orbit.store?._productStatus?.().ready===true,null,{timeout:30000});await neutralizeFreshSessionLegalGate(page);need(await page.evaluate(()=>Orbit.session?.rol?.())==='Asesor','B1_R14_F5_ROLE_LOST');await chooseRole(page,'Operativo');
   need(pageErrors.length===0,'B1_R14_PAGEERROR:'+pageErrors.join('|'));
   ev.viewports.push({vp,layout,install,table,pageErrors,roleAfterF5:'Asesor',freshSessionLegalGateRemoved:legalGateRemoved,burgerHit,searchHit});await context.close();
 }
 ev.status='PASS';
}catch(e){ev.status='FAIL';ev.errors.push(clean(e?.stack||e?.message||e,5000));}
finally{try{fs.writeFileSync(OUT,JSON.stringify(ev,null,2)+'\n');}catch{}try{if(browser)await browser.close();}catch{}try{if(app)await deleteApp(app);}catch{}}
console.log('B1_R14_STATUS='+ev.status);console.log('B1_R14_WRITES=0');console.log('B1_R14_SUMMARY='+JSON.stringify({viewports:ev.viewports.map(x=>({vp:x.vp,topbar:x.layout.topbar.rect,table:x.table,install:x.install,pageErrors:x.pageErrors})),errors:ev.errors}));
if(ev.status!=='PASS')process.exitCode=1;
