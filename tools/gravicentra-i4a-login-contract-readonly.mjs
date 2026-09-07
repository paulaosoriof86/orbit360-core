import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT='ays-orbit-360-lab',TENANT='alianzas-soluciones';
const PREVIEW=String(process.env.PREVIEW_URL||'').replace(/\/$/,'');
const SOURCE=String(process.env.SOURCE_SHA||''),BUILD=String(process.env.BUILD_ID||'');
const OUT=process.env.I4A_LOGIN_EVIDENCE_DIR||process.env.RUNNER_TEMP||process.cwd();
if(!PREVIEW||!SOURCE||!BUILD)throw new Error('I4A_LOGIN_ENV_MISSING');
const clean=v=>String(v==null?'':v).trim();
function serviceAccount(){for(const raw of [process.env.SA_DEFAULT,process.env.SA_ORBIT360_LAB,process.env.SA_ORBIT_360_LAB].filter(Boolean)){try{const x=JSON.parse(raw);if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.client_email&&x?.private_key)return x;}catch{}}throw new Error('I4A_LOGIN_SERVICE_ACCOUNT_UNAVAILABLE');}
function need(ok,code){if(!ok)throw new Error(code);}
const evidence={schemaVersion:'gravicentra-i4a-login-contract-v1',gate:'I4A',module:'Login',status:'RUNNING',sourceSha:SOURCE,buildId:BUILD,previewUrl:PREVIEW,productionTouched:false,dataTouched:false,writesExecuted:0,userIdentitiesRecorded:false,tokensRecorded:false,secretsRecorded:false,checks:{},errors:[]};
fs.mkdirSync(OUT,{recursive:true});
const app=initializeApp({credential:cert(serviceAccount()),projectId:PROJECT},'gravicentra-i4a-login-contract');
const adminAuth=getAuth(app),db=getFirestore(app);
let browser;
try{
  const members=await db.collection('tenants').doc(TENANT).collection('members').get();
  const listed=await adminAuth.listUsers(1000), users=new Map(listed.users.map(u=>[u.uid,u]));
  let target=null;
  for(const d of members.docs){const m=d.data()||{},uid=clean(m.uid||d.id),u=users.get(uid),status=clean(m.status||m.estado).toLowerCase(),roles=[].concat(m.roles||m.rolesAsignados||m.role||m.rol||[]).map(clean);if(u&&!u.disabled&&u.emailVerified===true&&status==='active'&&roles.some(r=>/Direcci[oó]n|SuperAdmin/i.test(r))){target={uid};break;}}
  need(target,'I4A_LOGIN_ACTIVE_VERIFIED_TARGET_UNAVAILABLE');
  const token=await adminAuth.createCustomToken(target.uid,{gravicentraI4AReadOnly:true});
  browser=await chromium.launch({headless:true});

  const responsive=[];
  for(const vp of [{name:'desktop',width:1440,height:1000},{name:'tablet',width:768,height:1024},{name:'mobile',width:390,height:844}]){
    const ctx=await browser.newContext({viewport:{width:vp.width,height:vp.height},serviceWorkers:'block'}),page=await ctx.newPage();
    const errs=[];page.on('pageerror',e=>errs.push(String(e?.message||e).slice(0,180)));page.on('console',m=>{if(m.type()==='error')errs.push(String(m.text()).slice(0,180));});
    await page.goto(PREVIEW,{waitUntil:'domcontentloaded',timeout:20000});await page.waitForSelector('#login-form',{state:'visible',timeout:5000});
    const r=await page.evaluate(()=>{const form=document.querySelector('#login-form'),btn=form?.querySelector('button[type="submit"]'),fr=form?.getBoundingClientRect(),br=btn?.getBoundingClientRect();return{innerWidth,innerHeight,form:fr?{left:fr.left,right:fr.right,top:fr.top,bottom:fr.bottom,width:fr.width}:null,button:br?{left:br.left,right:br.right,top:br.top,bottom:br.bottom,width:br.width}:null,loginVisible:!!form&&getComputedStyle(form).display!=='none',horizontalOverflow:document.documentElement.scrollWidth>innerWidth+2};});
    const pass=r.loginVisible&&r.form&&r.form.left>=-1&&r.form.right<=r.innerWidth+1&&r.button&&r.button.left>=-1&&r.button.right<=r.innerWidth+1&&!r.horizontalOverflow&&errs.length===0;
    responsive.push({...vp,...r,errorCount:errs.length,pass});await ctx.close();
  }
  need(responsive.every(x=>x.pass),'LOGIN_RESPONSIVE_CONTRACT_FAIL');
  evidence.checks.responsive=responsive;

  const ctx=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'}),page=await ctx.newPage();
  await page.goto(PREVIEW,{waitUntil:'domcontentloaded',timeout:20000});await page.waitForFunction(()=>!!Orbit?.productRuntimeBrowserProvidersP0&&!!Orbit?.productAppP0&&!!Orbit?.auth,null,{timeout:5000});
  const activated=await page.evaluate(async tok=>{const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();await c.modules.auth.signInWithCustomToken(c.auth,tok);const out=await Orbit.productAppP0.activate();return{started:out?.started===true,currentUser:!!c.auth.currentUser,loginHidden:getComputedStyle(document.getElementById('login')).display==='none'||document.getElementById('login').classList.contains('hidden'),shellVisible:getComputedStyle(document.getElementById('shell')).display!=='none',route:Orbit?.route?.key||''};},token);
  need(activated.started&&activated.currentUser&&activated.loginHidden&&activated.shellVisible,'LOGIN_AUTHENTICATED_ACTIVATION_FAIL');
  evidence.checks.activation=activated;

  await page.reload({waitUntil:'domcontentloaded',timeout:20000});
  await page.waitForFunction(()=>!!Orbit?.productRuntimeBrowserProvidersP0&&!!Orbit?.productAppP0&&!!Orbit?.auth,null,{timeout:5000});
  await page.waitForTimeout(1800);
  const reload=await page.evaluate(async()=>{const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();return{firebaseCurrentUser:!!c.auth.currentUser,productStarted:Orbit.productAppP0.status().started===true,preAuth:document.body.classList.contains('pre-auth'),loginVisible:getComputedStyle(document.getElementById('login')).display!=='none'&&!document.getElementById('login').classList.contains('hidden'),shellVisible:getComputedStyle(document.getElementById('shell')).display!=='none',route:Orbit?.route?.key||''};});
  evidence.checks.reload=reload;
  need(reload.firebaseCurrentUser===true,'LOGIN_FIREBASE_SESSION_NOT_PERSISTED');
  need(reload.productStarted===true&&reload.preAuth===false&&reload.loginVisible===false&&reload.shellVisible===true,'LOGIN_PERSISTED_SESSION_NOT_REHYDRATED');

  await page.evaluate(()=>Orbit.auth.logout());
  await page.waitForLoadState('domcontentloaded',{timeout:20000});await page.waitForSelector('#login-form',{state:'visible',timeout:5000});await page.waitForTimeout(250);
  const logout=await page.evaluate(async()=>{const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();return{firebaseCurrentUser:!!c.auth.currentUser,preAuth:document.body.classList.contains('pre-auth'),loginVisible:getComputedStyle(document.getElementById('login')).display!=='none'&&!document.getElementById('login').classList.contains('hidden')};});
  evidence.checks.logout=logout;need(logout.firebaseCurrentUser===false&&logout.preAuth&&logout.loginVisible,'LOGIN_LOGOUT_FAIL_CLOSED_CONTRACT_FAIL');
  await ctx.close();
  evidence.status='LOGIN_TECHNICAL_CONTRACT_PASS';
}catch(e){evidence.status='LOGIN_TECHNICAL_CONTRACT_FAIL';evidence.errors.push(String(e?.message||e).slice(0,500));process.exitCode=1;}
finally{if(browser)await browser.close().catch(()=>{});await deleteApp(app).catch(()=>{});evidence.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(OUT,'i4a-login-contract.json'),JSON.stringify(evidence,null,2)+'\n');console.log('I4A_LOGIN_CONTRACT='+evidence.status);}
