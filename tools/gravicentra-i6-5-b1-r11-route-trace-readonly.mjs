import fs from 'node:fs';
import path from 'node:path';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { chromium } from 'playwright';

const PROJECT=process.env.PROJECT_ID,TENANT=process.env.TENANT_HINT,TARGET=String(process.env.TARGET_URL||'').replace(/\/$/,'');
const OUT=process.env.B1_R11_OUT||path.join(process.env.RUNNER_TEMP||process.cwd(),'b1-r11-route-trace.json');
const mark=(n,d={})=>console.log('B1_R11='+n+' '+JSON.stringify(d));
const clean=(v,n=800)=>String(v==null?'':v).trim().slice(0,n);
const uniq=a=>[...new Set([].concat(a||[]).map(x=>clean(x,180)).filter(Boolean))];
const rn=v=>clean(v,80).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const need=(v,c)=>{if(!v)throw new Error(c);};
function sa(){for(const k of ['SA_DEFAULT','SA_ORBIT360_LAB','SA_ORBIT_360_LAB']){try{const x=JSON.parse(process.env[k]||'');if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.private_key)return x;}catch{}}throw new Error('B1_R11_SA');}
function roles(m){return uniq([...(m?.roles||[]),...(m?.rolesAsignados||[]),m?.role,m?.rol]);}
async function actor(db,auth){
 const s=await db.collection('tenants').doc(TENANT).collection('members').get(),a=[];
 for(const d of s.docs){const m=d.data()||{},r=roles(m).map(rn).sort();if(r.length!==2||r[0]!=='asesor'||r[1]!=='operativo')continue;try{const u=await auth.getUser(m.uid||d.id);if(!u.disabled)a.push({uid:u.uid,advisorId:m.advisorId||m.asesorId});}catch{}}
 need(a.length===1,'B1_R11_ACTOR_CARDINALITY:'+a.length);return a[0];
}
const ev={status:'RUNNING',trace:[],errors:[],writes:0};let app,browser,context,page;
try{
 app=initializeApp({credential:cert(sa()),projectId:PROJECT},'b1-r11-'+Date.now());const db=getFirestore(app),auth=getAuth(app),a=await actor(db,auth);
 browser=await chromium.launch({headless:true});context=await browser.newContext({viewport:{width:1440,height:960}});page=await context.newPage();
 page.on('console',m=>{const t=m.text();if(t.startsWith('R11:')){console.log(t);ev.trace.push(t);}});
 page.on('pageerror',e=>{const t=clean(e?.message||e,1400);console.log('R11:PAGEERROR '+t);ev.errors.push(t);});
 await page.goto(TARGET+'/?r11='+Date.now()+'#/inicio',{waitUntil:'domcontentloaded',timeout:30000});
 const token=await auth.createCustomToken(a.uid,{b1R11ReadOnly:true});
 await page.waitForFunction(()=>!!Orbit?.productRuntimeBrowserProvidersP0&&!!Orbit?.productAppP0,null,{timeout:20000});
 await page.evaluate(async t=>{const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();if(!c.auth.currentUser)await c.modules.auth.signInWithCustomToken(c.auth,t);if(!Orbit.productAppP0.status?.().started)await Orbit.productAppP0.activate();},token);
 await page.waitForFunction(()=>Orbit.store?._productStatus?.().ready===true,null,{timeout:30000});
 await page.evaluate(()=>Orbit.session.set('Operativo'));
 await page.waitForFunction(()=>Orbit.session.rol()==='Operativo',null,{timeout:8000});
 await page.waitForTimeout(700);
 const prep=await page.evaluate(()=>{
   const log=(n,d={})=>console.log('R11:'+n+' '+JSON.stringify(d));
   const wrap=(obj,key,label)=>{
     const old=obj&&obj[key];if(typeof old!=='function')return;
     obj[key]=function(...args){const t=performance.now();log(label+':START',{arg0:String(args[0]??'')});try{const v=old.apply(this,args);log(label+':END',{ms:+(performance.now()-t).toFixed(2),n:Array.isArray(v)?v.length:undefined});return v;}catch(e){log(label+':THROW',{ms:+(performance.now()-t).toFixed(2),err:String(e&&e.message||e)});throw e;}};
   };
   wrap(Orbit.access,'can','ACCESS_CAN');
   wrap(Orbit.access,'withScope','WITH_SCOPE');
   wrap(Orbit.clientProjection,'withReadBatch','READ_BATCH');
   wrap(Orbit.kit,'bannerFor','BANNER');
   wrap(Orbit.modules.cliente360,'render','C360_RENDER');
   const store=Orbit.store, oldAll=store.all;store.all=function(c){const t=performance.now();log('STORE_ALL:START',{c});const v=oldAll.call(this,c);log('STORE_ALL:END',{c,ms:+(performance.now()-t).toFixed(2),n:v?.length});return v;};
   const host=document.getElementById('host'),desc=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');
   if(host&&desc?.set){Object.defineProperty(host,'innerHTML',{configurable:true,get(){return desc.get.call(this);},set(v){const t=performance.now();log('HOST_HTML:START',{len:String(v||'').length});desc.set.call(this,v);log('HOST_HTML:END',{ms:+(performance.now()-t).toFixed(2),children:this.childElementCount});}});}
   log('PREPARED',{role:Orbit.session.rol(),can:Orbit.access.can('cliente360','view'),scope:Orbit.access.dataScope('cliente360'),baseClients:Orbit.store.all('clientes').length,basePolicies:Orbit.store.all('polizas').length});
   return true;
 });
 need(prep===true,'B1_R11_PREP');
 mark('NAVIGATE');
 await page.evaluate(()=>{console.log('R11:HASH_SET_START {}');location.hash='#/cliente360';console.log('R11:HASH_SET_END {}');});
 try{await page.waitForFunction(()=>Orbit.route?.key==='cliente360'&&document.querySelector('#f-q'),null,{timeout:18000});ev.status='PASS';mark('ROUTE_PASS');}
 catch(e){ev.status='FAIL';ev.errors.push(clean(e?.message||e,1600));mark('ROUTE_FAIL',{error:clean(e?.message||e,900)});}
}catch(e){ev.status='FAIL';ev.errors.push(clean(e?.stack||e?.message||e,2500));mark('FATAL',{error:clean(e?.message||e,1000)});}
finally{
 try{fs.writeFileSync(OUT,JSON.stringify(ev,null,2)+'\n');}catch{}
 try{if(context)await context.close();}catch{}try{if(browser)await browser.close();}catch{}try{if(app)await deleteApp(app);}catch{}
}
console.log('B1_R11_STATUS='+ev.status);console.log('B1_R11_WRITES=0');
if(ev.status!=='PASS')process.exitCode=1;
