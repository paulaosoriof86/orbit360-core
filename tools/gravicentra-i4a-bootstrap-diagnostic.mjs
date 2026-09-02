import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT='ays-orbit-360-lab',TENANT='alianzas-soluciones',PREVIEW=String(process.env.PREVIEW_URL||'').replace(/\/$/,'');
const SOURCE=String(process.env.SOURCE_SHA||''),BUILD=String(process.env.BUILD_ID||''),OUT=process.env.I4A_DIAG_EVIDENCE_DIR||process.env.RUNNER_TEMP||process.cwd();
const clean=v=>String(v==null?'':v).trim();
function canon(v){const k=clean(v).toLowerCase().replace(/\s+/g,' ');return ({'dirección':'Dirección','direccion':'Dirección','superadmin':'SuperAdmin','super admin':'SuperAdmin','admin':'AdminTenant','administrador':'AdminTenant','admintenant':'AdminTenant','operativo':'Operativo','operaciones':'Operativo','asesor':'Asesor'})[k]||clean(v);}
function roles(m){const x=Array.isArray(m?.roles)?m.roles:Array.isArray(m?.rolesAsignados)?m.rolesAsignados:(m?.role||m?.rol?[m.role||m.rol]:[]);return [...new Set(x.map(canon).filter(Boolean))];}
function active(m,rs){return canon(m?.activeRole||m?.rolActivo||m?.defaultRole||m?.rolDefault||m?.roleDefault||rs[0]);}
function scopeDefault(m){const s=m?.dataScopes||m?.scopes||m?.scopeDatos||{};return clean(s?.default||s?.['*']||'').toLowerCase();}
function countries(m){const x=Array.isArray(m?.countries)?m.countries:Array.isArray(m?.paises)?m.paises:[];return [...new Set(x.map(clean).filter(Boolean))];}
function sa(){for(const raw of [process.env.SA_DEFAULT,process.env.SA_ORBIT360_LAB,process.env.SA_ORBIT_360_LAB].filter(Boolean)){try{const x=JSON.parse(raw);if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.client_email&&x?.private_key)return x;}catch{}}throw new Error('SERVICE_ACCOUNT_UNAVAILABLE');}

const app=initializeApp({credential:cert(sa()),projectId:PROJECT},'gravicentra-i4a-diag-v2'),auth=getAuth(app),db=getFirestore(app);
const ms=await db.collection('tenants').doc(TENANT).collection('members').get(),ul=await auth.listUsers(1000),users=new Map(ul.users.map(u=>[u.uid,u])),pool=[];
let seq=0;const labels=new Map();function label(uid){if(!labels.has(uid))labels.set(uid,'M'+(++seq));return labels.get(uid);}
for(const d of ms.docs){const m=d.data()||{},storedUid=clean(m.uid),uid=clean(storedUid||d.id),u=users.get(uid),rs=roles(m);if(!u||u.disabled||u.emailVerified!==true||!['active','activo'].includes(clean(m.status||m.estado).toLowerCase()))continue;pool.push({uid,label:label(uid),roles:rs,active:active(m,rs),profile:{storedUidPresent:!!storedUid,storedUidMatchesDocumentId:!!storedUid&&storedUid===d.id,tenantMatches:clean(m.tenantId||m.tenant)===TENANT,statusExactActive:clean(m.status||m.estado).toLowerCase()==='active',countryCount:countries(m).length,roleCount:rs.length,defaultScope:scopeDefault(m)||'none',moduleScopeCount:Object.keys((m?.dataScopes||m?.scopes||m?.scopeDatos||{}).modules||{}).length}});}
function exact(role){return pool.find(x=>x.active===role&&x.roles.includes(role));}
const A=exact('Dirección')||exact('SuperAdmin')||pool[0];
const comparator=pool.find(x=>x.uid!==A?.uid&&['AdminTenant','Operativo','Asesor'].some(r=>x.roles.includes(r)))||pool.find(x=>x.uid!==A?.uid)||A;
const S=exact('SuperAdmin')||comparator;
const cases=[];if(A){cases.push(['A1-cold',A]);if(comparator)cases.push(['B1-comparator',comparator]);cases.push(['A2-repeat',A]);}if(S){cases.push(['S1-superadmin',S],['S2-superadmin-repeat',S]);}
fs.mkdirSync(OUT,{recursive:true});const ev={schemaVersion:'gravicentra-i4a-bootstrap-diagnostic-v2',gate:'I4A',purpose:'cold-start-vs-membership-and-install-latency',sourceSha:SOURCE,buildId:BUILD,previewUrl:PREVIEW,productionTouched:false,dataTouched:false,writesExecuted:0,userIdentitiesRecorded:false,tokensRecorded:false,cases:{},errors:[]};

async function runCase(browser,name,s){const token=await auth.createCustomToken(s.uid,{gravicentraI4AReadOnly:true}),ctx=await browser.newContext({viewport:{width:1440,height:1000}}),page=await ctx.newPage();const rec={membershipLabel:s.label,activeRole:s.active,assignedTargetRoles:s.roles.filter(r=>['Dirección','SuperAdmin','AdminTenant','Operativo','Asesor'].includes(r)),membershipProfile:s.profile};ev.cases[name]=rec;try{const t=Date.now();await page.goto(PREVIEW,{waitUntil:'domcontentloaded',timeout:20000});rec.domContentLoadedMs=Date.now()-t;await page.waitForFunction(()=>!!Orbit?.productAppP0&&!!Orbit?.productRuntimeBrowserProvidersP0&&!!Orbit?.createFirestoreProductReadOnlyStoreP0,null,{timeout:5000});const out=await page.evaluate(async tok=>{
  window.__i4aBootEvents=[];window.__i4aDispatch=[];window.__i4aSetter={calls:0,totalMs:0,maxMs:0};
  const round=n=>Math.round(Number(n||0)*10)/10;
  const nativeDispatch=EventTarget.prototype.dispatchEvent;
  EventTarget.prototype.dispatchEvent=function(ev){const tracked=ev&&['orbit:product-readonly-bootstrap','orbit:product-app','orbit:auth','orbit:store'].includes(ev.type),phase=ev?.detail?.phase||'',t0=performance.now();try{return nativeDispatch.call(this,ev);}finally{if(tracked)window.__i4aDispatch.push({type:ev.type,phase,ms:round(performance.now()-t0)});}};
  window.addEventListener('orbit:product-readonly-bootstrap',e=>{const d=e?.detail||{};window.__i4aBootEvents.push({at:Math.round(performance.now()),phase:d.phase||'',ready:d.ready===true,errors:Array.isArray(d.errors)?d.errors.slice():[]});});
  const desc=Object.getOwnPropertyDescriptor(Orbit,'store');const descriptorBefore={kind:desc?(typeof desc.set==='function'||typeof desc.get==='function'?'accessor':'data'):'none',configurable:!!desc?.configurable,enumerable:!!desc?.enumerable,writable:!!desc?.writable,hasGetter:typeof desc?.get==='function',hasSetter:typeof desc?.set==='function'};
  if(desc&&typeof desc.set==='function'&&desc.configurable){const originalSet=desc.set;Object.defineProperty(Orbit,'store',{...desc,set:function(v){const s=performance.now();try{return originalSet.call(this,v);}finally{const ms=performance.now()-s;window.__i4aSetter.calls++;window.__i4aSetter.totalMs+=ms;window.__i4aSetter.maxMs=Math.max(window.__i4aSetter.maxMs,ms);}}});}
  const native=Orbit.createFirestoreProductReadOnlyStoreP0;Orbit.createFirestoreProductReadOnlyStoreP0=function(){const st=native.apply(this,arguments);window.__i4aCapturedStore=st;return st;};
  const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();await c.modules.auth.signInWithCustomToken(c.auth,tok);const started=performance.now();let ok=true,error='';try{await Orbit.productAppP0.activate();}catch(e){ok=false;error=String(e?.message||e);}const st=window.__i4aCapturedStore?window.__i4aCapturedStore._productStatus():{};const postDesc=Object.getOwnPropertyDescriptor(Orbit,'store');
  return{ok,error,durationMs:Math.round(performance.now()-started),app:Orbit.productAppP0.status(),events:window.__i4aBootEvents,dispatch:window.__i4aDispatch,storeDescriptorBefore:descriptorBefore,storeDescriptorAfter:{kind:postDesc?(typeof postDesc.set==='function'||typeof postDesc.get==='function'?'accessor':'data'):'none',hasSetter:typeof postDesc?.set==='function',configurable:!!postDesc?.configurable},storeSetter:{calls:window.__i4aSetter.calls,totalMs:round(window.__i4aSetter.totalMs),maxMs:round(window.__i4aSetter.maxMs)},store:{status:st.status||'',ready:st.ready===true,serverConfirmedCollections:(st.serverConfirmedCollections||[]).slice(),requiredMissing:(st.requiredMissing||[]).slice(),requiredFailed:(st.requiredFailed||[]).slice(),optionalFailed:(st.optionalFailed||[]).slice(),snapshotErrorCollections:Object.keys(st.snapshotErrors||{})}};
},token);Object.assign(rec,out);}catch(e){rec.harnessError=String(e?.message||e);ev.errors.push(name+':'+rec.harnessError);}finally{await ctx.close();}}

let browser;try{browser=await chromium.launch({headless:true});for(const [name,s] of cases)await runCase(browser,name,s);}catch(e){ev.errors.push(String(e?.message||e));process.exitCode=1;}finally{if(browser)await browser.close().catch(()=>{});await deleteApp(app).catch(()=>{});fs.writeFileSync(path.join(OUT,'i4a-bootstrap-diagnostic.json'),JSON.stringify(ev,null,2)+'\n');console.log(JSON.stringify({schemaVersion:ev.schemaVersion,cases:Object.fromEntries(Object.entries(ev.cases).map(([k,v])=>[k,{membershipLabel:v.membershipLabel,activeRole:v.activeRole,ok:v.ok,error:v.error,durationMs:v.durationMs,profile:v.membershipProfile,events:v.events,storeSetter:v.storeSetter,dispatch:v.dispatch}]))},null,2));}
