import fs from 'node:fs';
import path from 'node:path';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { chromium } from 'playwright';

const PROJECT='ays-orbit-360-lab',TENANT='alianzas-soluciones',LIVE='https://ays-orbit-360-lab.web.app';
const OUT=process.env.I65_OP_DIAG_DIR||path.join(process.env.RUNNER_TEMP||process.cwd(),'i65-op-diag');
const clean=(v,m=300)=>String(v==null?'':v).trim().slice(0,m);
const norm=v=>clean(v,180).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
function sa(){for(const k of ['SA_DEFAULT','SA_ORBIT360_LAB','SA_ORBIT_360_LAB']){try{const x=JSON.parse(process.env[k]||'');if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.client_email&&x?.private_key)return x;}catch{}}throw new Error('I65_OP_DIAG_SERVICE_ACCOUNT');}
async function advisorRows(db){
 const refs=[
  db.collection('tenants').doc(TENANT).collection('data').doc('asesores').collection('items'),
  db.collection('tenantId').doc(TENANT).collection('asesores')
 ];
 const out=[]; for(const ref of refs){try{const s=await ref.get();for(const d of s.docs)out.push({id:d.id,...(d.data()||{})});}catch{}}
 const map=new Map();for(const r of out){const key=r.id+'|'+norm(r.nombre||r.name||'');if(!map.has(key))map.set(key,r);}return [...map.values()];
}
async function targetStatus(rows,auth,db,label){
 const hit=rows.find(r=>norm(r.nombre||r.name||'').includes(label));
 const out={label,advisorFound:!!hit,authFound:false,membershipFound:false,membershipActive:false,emailVerified:false,hasEmail:false,uidLinked:false};
 if(!hit)return out;
 const email=clean(hit.email||hit.correo||'',320),uid=clean(hit.uid||hit.authUid||hit.firebaseUid||'',256);out.hasEmail=!!email;out.uidLinked=!!uid;
 let user=null;try{if(uid)user=await auth.getUser(uid);else if(email)user=await auth.getUserByEmail(email);}catch{}
 out.authFound=!!user;out.emailVerified=!!(user&&user.emailVerified);
 if(user){try{const ms=await db.collection('tenants').doc(TENANT).collection('members').doc(user.uid).get();out.membershipFound=ms.exists;if(ms.exists){const m=ms.data()||{},st=norm(m.status||m.estado||'active');out.membershipActive=m.active!==false&&m.activo!==false&&!['blocked','bloqueado','inactive','inactivo','suspended','suspendido'].includes(st);}}catch{}}
 return out;
}
fs.mkdirSync(OUT,{recursive:true});
const app=initializeApp({credential:cert(sa()),projectId:PROJECT},'i65-op-diag'),db=getFirestore(app),auth=getAuth(app);
let browser;
const ev={schema:'GRAVICENTRA_I6_5_OPERATIONAL_CLOSURE_DIAGNOSTIC_V1',status:'FAIL',writes:0,authWrites:0,firestoreWrites:0,users:{},publicUi:{},sourceContracts:{},errors:[]};
try{
 const rows=await advisorRows(db);
 ev.users.samuel=await targetStatus(rows,auth,db,'samuel');
 ev.users.carlos=await targetStatus(rows,auth,db,'carlos');
 browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});
 await page.goto(LIVE+'/?diag='+Date.now(),{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForSelector('#login',{timeout:15000});
 await page.waitForTimeout(1200);
 ev.publicUi=await page.evaluate(async()=>{
   let marker={};try{marker=await fetch('__recovery__/build.json?d='+Date.now(),{cache:'no-store'}).then(r=>r.json());}catch{}
   const slot=document.querySelector('.lf-logoslot .slot'),img=slot&&slot.querySelector('img'),icon=document.querySelector('link[rel="icon"]');
   return{
     loginVisible:!!document.querySelector('#login'),
     logoHasImage:!!img,
     logoPlaceholderText:slot?String(slot.textContent||'').trim():'',
     logoNameNodePresent:!!document.querySelector('.lf-logoslot .lf-cn'),
     faviconPresent:!!icon,
     faviconKind:icon?(String(icon.href||'').startsWith('data:image')?'data-image':String(icon.href||'').split('?')[0].split('/').pop()):'',
     serverBuild:String(marker&&marker.buildId||''),
     runtimeBuild:String(window.OrbitPwaBuildFreshness&&window.OrbitPwaBuildFreshness.runtimeBuild||''),
     freshnessStatus:String(window.OrbitPwaBuildFreshness&&window.OrbitPwaBuildFreshness.status||'')
   };
 });
 const src=fs.readFileSync('orbit360-platform/modules/cliente360.js','utf8'),cob=fs.readFileSync('orbit360-platform/modules/cobros.js','utf8');
 ev.sourceContracts={
   newPolicyWritesCobros:/function nuevaPoliza[\s\S]*?S\(\)\.insert\('cobros'/.test(src),
   renewalWritesCobros:/function renovar[\s\S]*?S\(\)\.insert\('cobros'/.test(src),
   globalCobrosRowsOnly:/function rows\(\)[\s\S]*?S\(\)\.all\('cobros'\)/.test(cob),
   globalPortfolioReferenced:/carteraPrimas/.test(cob)
 };
 ev.status='PASS';
}catch(e){ev.errors.push(clean(e?.message||e));process.exitCode=1;}
finally{if(browser)await browser.close().catch(()=>{});await deleteApp(app).catch(()=>{});fs.writeFileSync(path.join(OUT,'i65-operational-closure-diagnostic.json'),JSON.stringify(ev,null,2)+'\n');console.log('I65_OP_DIAG='+ev.status);console.log('I65_OP_USERS='+JSON.stringify(ev.users));console.log('I65_OP_PUBLIC_UI='+JSON.stringify(ev.publicUi));console.log('I65_OP_SOURCE='+JSON.stringify(ev.sourceContracts));console.log('I65_OP_WRITES=0');}
