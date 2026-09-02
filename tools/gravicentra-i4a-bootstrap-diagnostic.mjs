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
function sa(){for(const raw of [process.env.SA_DEFAULT,process.env.SA_ORBIT360_LAB,process.env.SA_ORBIT_360_LAB].filter(Boolean)){try{const x=JSON.parse(raw);if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.client_email&&x?.private_key)return x;}catch{}}throw new Error('SERVICE_ACCOUNT_UNAVAILABLE');}
const app=initializeApp({credential:cert(sa()),projectId:PROJECT},'gravicentra-i4a-diag-v4'),auth=getAuth(app),db=getFirestore(app);
const ms=await db.collection('tenants').doc(TENANT).collection('members').get(),ul=await auth.listUsers(1000),users=new Map(ul.users.map(u=>[u.uid,u])),pool=[];
for(const d of ms.docs){const m=d.data()||{},uid=clean(m.uid||d.id),u=users.get(uid),rs=roles(m);if(!u||u.disabled||u.emailVerified!==true||clean(m.status||m.estado).toLowerCase()!=='active')continue;pool.push({uid,roles:rs,active:active(m,rs)});}
const target=pool.find(x=>x.active==='Dirección'&&x.roles.includes('Dirección'))||pool.find(x=>x.active==='SuperAdmin')||pool[0];
fs.mkdirSync(OUT,{recursive:true});const ev={schemaVersion:'gravicentra-i4a-bootstrap-diagnostic-v4',gate:'I4A',purpose:'observe-client360-and-insurer-structure-after-startup-fix',sourceSha:SOURCE,buildId:BUILD,previewUrl:PREVIEW,productionTouched:false,dataTouched:false,writesExecuted:0,userIdentitiesRecorded:false,tokensRecorded:false,cases:{},errors:[]};

async function one(browser,name){
  const token=await auth.createCustomToken(target.uid,{gravicentraI4AReadOnly:true}),ctx=await browser.newContext({viewport:{width:1440,height:1000}}),page=await ctx.newPage(),rec={activeRole:target.active,roleCount:target.roles.length};ev.cases[name]=rec;
  try{
    await page.goto(PREVIEW,{waitUntil:'domcontentloaded',timeout:20000});
    await page.waitForFunction(()=>!!Orbit?.productAppP0&&!!Orbit?.productRuntimeBrowserProvidersP0&&!!Orbit?.session?.syncFromAuth,null,{timeout:5000});
    const out=await page.evaluate(async tok=>{
      const round=n=>Math.round(Number(n||0)*10)/10,delay=ms=>new Promise(r=>setTimeout(r,ms));
      window.__timing={dispatch:[],sync:[]};
      const nativeDispatch=EventTarget.prototype.dispatchEvent;EventTarget.prototype.dispatchEvent=function(ev){const tracked=ev&&['orbit:product-readonly-bootstrap','orbit:product-app','orbit:session','orbit:auth','orbit:store','hashchange'].includes(ev.type),phase=ev?.detail?.phase||'',t0=performance.now();try{return nativeDispatch.call(this,ev);}finally{if(tracked)window.__timing.dispatch.push({type:ev.type,phase,ms:round(performance.now()-t0)});}};
      const old=Orbit.session,nativeSync=old.syncFromAuth;Orbit.session=Object.freeze(Object.assign({},old,{syncFromAuth:function(){const t=performance.now();try{return nativeSync.apply(old,arguments);}finally{window.__timing.sync.push({ms:round(performance.now()-t)});}}}));
      const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();await c.modules.auth.signInWithCustomToken(c.auth,tok);
      const started=performance.now();let ok=true,error='';try{await Orbit.productAppP0.activate();}catch(e){ok=false;error=String(e?.message||e);}
      const activation={ok,error,durationMs:Math.round(performance.now()-started),timing:window.__timing,app:Orbit.productAppP0.status()};
      if(!ok)return {activation};

      location.hash='#/cliente360';
      const clientDeadline=Date.now()+10000;while(Date.now()<clientDeadline){if(Orbit?.route?.key==='cliente360'&&document.querySelector('#host .c360-pagination'))break;await delay(25);}
      await delay(100);
      const batch=Orbit.clientProjection?.withReadBatch?.(['clientes'],x=>x)||{clientes:[]};
      const kpis=[...document.querySelectorAll('#host .kpi')].map((node,i)=>({index:i,label:(node.querySelector('.k-label')?.textContent||'').replace(/\s+/g,' ').trim(),value:(node.querySelector('.k-val')?.textContent||'').replace(/\s+/g,' ').trim()}));
      const client={routeKey:Orbit?.route?.key||'',rawTotal:Orbit.store.all('clientes').length,projectionTotal:Array.isArray(batch.clientes)?batch.clientes.length:0,visibleRows:document.querySelectorAll('#host table.tbl tbody tr.clickable').length,paginationText:(document.querySelector('#host .c360-pagination')?.textContent||'').replace(/\s+/g,' ').trim(),kpis,hasPage:!!document.querySelector('#host .page'),hasTable:!!document.querySelector('#host table.tbl')};
      const hb0=performance.now();await delay(20);client.heartbeatMs=round(performance.now()-hb0);

      location.hash='#/aseguradoras';const listDeadline=Date.now()+10000;while(Date.now()<listDeadline){if(Orbit?.route?.key==='aseguradoras'&&document.querySelector('#host .page'))break;await delay(25);}await delay(100);
      const rows=Orbit.store.all('aseguradoras')||[];const chosen=rows.find(x=>x&&((Array.isArray(x.portales)&&x.portales.length)||(Array.isArray(x.cuentas)&&x.cuentas.length)))||rows[0]||null;
      let insurer={candidate:chosen?{idPresent:!!chosen.id,portalCount:Array.isArray(chosen.portales)?chosen.portales.length:0,accountCount:Array.isArray(chosen.cuentas)?chosen.cuentas.length:0,credentialBearing:Array.isArray(chosen.portales)&&chosen.portales.some(p=>p&&(p.password||p.pass||p.contrasena||p.clave||p.credentialRef))}:null};
      if(chosen&&chosen.id){location.hash='#/aseguradoras?ficha='+encodeURIComponent(chosen.id);const detailDeadline=Date.now()+10000;while(Date.now()<detailDeadline){if(String(Orbit?.route?.params?.ficha||'')===String(chosen.id)&&document.querySelector('#asg-ficha'))break;await delay(25);}await delay(200);
        const snap=()=>({routeFichaMatches:String(Orbit?.route?.params?.ficha||'')===String(chosen.id),ownerVersion:Orbit?.clientInsurerOperationalDirectoryOwnerV20260722?.version||'',rootExists:!!document.querySelector('#asg-ficha'),portalsContainer:!!document.querySelector('#af-portales'),accountsContainer:!!document.querySelector('#af-cuentas'),basePortalRows:document.querySelectorAll('#af-portales .asg-row[data-portal]').length,baseBankRows:document.querySelectorAll('#af-cuentas .asg-row[data-cta]').length,portalCards:document.querySelectorAll('#asg-ficha .od-operational-portal-card').length,bankCards:document.querySelectorAll('#asg-ficha .od-operational-bank-card').length,reveals:document.querySelectorAll('#asg-ficha [data-od-credential-reveal]').length,bankVisible:[...document.querySelectorAll('#asg-ficha [data-od-bank-number]')].filter(x=>{const t=(x.textContent||'').trim();return t&&!/pendiente/i.test(t);}).length});
        insurer.before=snap();try{insurer.directRenderResult=Orbit?.clientInsurerOperationalDirectoryOwnerV20260722?.render?.()===true;}catch(e){insurer.directRenderError=String(e?.message||e);}await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));insurer.afterDirect=snap();
        const buttons=[...document.querySelectorAll('#asg-ficha button,#asg-ficha [role="tab"],#asg-ficha .tab')];const click=rx=>{const el=buttons.find(x=>rx.test((x.textContent||'').trim()));if(el){el.click();return true;}return false;};insurer.clickedOperational=click(/plataform|portal|acceso|cuenta|banc/i);await delay(150);try{Orbit?.clientInsurerOperationalDirectoryOwnerV20260722?.render?.();}catch(e){}await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));insurer.final=snap();
      }
      return {activation,client,insurer};
    },token);
    Object.assign(rec,out);
  }catch(e){rec.harnessError=String(e?.message||e);ev.errors.push(name+':'+rec.harnessError);}finally{await ctx.close();}
}
let browser;try{if(!target)throw new Error('NO_ACTIVE_TARGET');browser=await chromium.launch({headless:true});await one(browser,'structure-observation');}catch(e){ev.errors.push(String(e?.message||e));process.exitCode=1;}finally{if(browser)await browser.close().catch(()=>{});await deleteApp(app).catch(()=>{});fs.writeFileSync(path.join(OUT,'i4a-bootstrap-diagnostic.json'),JSON.stringify(ev,null,2)+'\n');console.log(JSON.stringify(ev,null,2));}
