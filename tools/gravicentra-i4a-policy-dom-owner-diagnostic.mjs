import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT='ays-orbit-360-lab';
const TENANT='alianzas-soluciones';
const PREVIEW=String(process.env.PREVIEW_URL||'').replace(/\/$/,'');
const SOURCE=String(process.env.SOURCE_SHA||'');
const BUILD=String(process.env.BUILD_ID||'');
const OUT=process.env.I4A_POLICY_OWNER_EVIDENCE_DIR||process.env.RUNNER_TEMP||process.cwd();
const PRIVILEGED=['Dirección','SuperAdmin','AdminTenant','Operativo'];
const clean=v=>String(v==null?'':v).trim();
const need=(ok,code)=>{if(!ok)throw new Error(code);};
const role=v=>{const k=clean(v).toLowerCase().replace(/\s+/g,' ');return ({'dirección':'Dirección','direccion':'Dirección','director':'Dirección','superadmin':'SuperAdmin','super admin':'SuperAdmin','super_admin':'SuperAdmin','super-admin':'SuperAdmin','admin':'AdminTenant','administrador':'AdminTenant','admin tenant':'AdminTenant','admin_tenant':'AdminTenant','admintenant':'AdminTenant','operativo':'Operativo','operaciones':'Operativo','asesor':'Asesor'})[k]||clean(v);};
const roles=m=>{const x=Array.isArray(m?.roles)?m.roles:Array.isArray(m?.rolesAsignados)?m.rolesAsignados:(m?.role||m?.rol?[m.role||m.rol]:[]);return [...new Set(x.map(role).filter(Boolean))];};
const activeRole=(m,rs)=>role(m?.activeRole||m?.rolActivo||m?.defaultRole||m?.rolDefault||m?.roleDefault||rs[0]);
function serviceAccount(){for(const raw of [process.env.SA_DEFAULT,process.env.SA_ORBIT360_LAB,process.env.SA_ORBIT_360_LAB].filter(Boolean)){try{const x=JSON.parse(raw);if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.client_email&&x?.private_key)return x;}catch{}}throw new Error('I4A_EXISTING_SERVICE_ACCOUNT_NOT_AVAILABLE');}
async function activate(page,token){const x=await page.evaluate(async tok=>{const p=Orbit?.productRuntimeBrowserProvidersP0,c=await p.initialize();await c.modules.auth.signInWithCustomToken(c.auth,tok);return await Orbit.productAppP0.activate();},token);need(x?.started===true,'PRODUCT_APP_DID_NOT_START');await page.waitForFunction(()=>Orbit?.productAppP0?.status?.().started===true&&!document.body.classList.contains('pre-auth'),null,{timeout:12000});}
async function setRole(page,target){const before=await page.evaluate(()=>({active:Orbit?.session?.rol?.()||'',assigned:Orbit?.session?.allowedRoles?.()||[]}));if(before.active===target)return;need(before.assigned.includes(target),'ROLE_NOT_ASSIGNED:'+target);need(await page.evaluate(r=>Orbit.session.set(r),target),'ROLE_SWITCH_REJECTED:'+target);await page.waitForTimeout(180);need(await page.evaluate(()=>Orbit?.session?.rol?.()||'')===target,'ROLE_SWITCH_NOT_EFFECTIVE:'+target);}
async function go(page,hash,key){await page.evaluate(h=>{location.hash=h;},hash);await page.waitForFunction(k=>Orbit?.route?.key===k,key,{timeout:12000});await page.waitForTimeout(450);}

async function captureOwner(page){
  await go(page,'#/polizas','polizas');
  return await page.evaluate(async()=>{
    const re=/entorno de validaci[oó]n/i;
    const rowSnapshot=stage=>{
      const rows=[...document.querySelectorAll('#host tbody tr')];
      return {stage,rowCount:rows.length,synthetic:rows.map((tr,index)=>({index,text:String(tr.textContent||'').replace(/\s+/g,' ').trim()})).filter(x=>re.test(x.text)).slice(0,10)};
    };
    const traces=[];
    const trace=(op,target,value)=>{
      if(!re.test(String(value||'')))return;
      traces.push({op,tag:target?.tagName||target?.nodeName||'',id:target?.id||'',className:String(target?.className||'').slice(0,180),value:String(value||'').replace(/\s+/g,' ').trim().slice(0,360),stack:String(new Error('GI_I4A_POLICY_DOM_WRITE').stack||'').split('\n').slice(0,16)});
    };
    const restores=[];
    const hookSetter=(proto,key)=>{
      const d=Object.getOwnPropertyDescriptor(proto,key);if(!d||typeof d.set!=='function'||typeof d.get!=='function')return;
      Object.defineProperty(proto,key,{configurable:d.configurable,enumerable:d.enumerable,get:d.get,set:function(v){trace(key,this,v);return d.set.call(this,v);}});
      restores.push(()=>Object.defineProperty(proto,key,d));
    };
    hookSetter(Node.prototype,'textContent');
    hookSetter(Node.prototype,'nodeValue');
    hookSetter(Element.prototype,'innerHTML');
    hookSetter(HTMLElement.prototype,'innerText');
    hookSetter(CharacterData.prototype,'data');
    const hookMethod=(proto,key,valueIndex=0)=>{
      const original=proto?.[key];if(typeof original!=='function')return;
      proto[key]=function(...args){trace(key,this,args[valueIndex]);return original.apply(this,args);};
      restores.push(()=>{proto[key]=original;});
    };
    hookMethod(Element.prototype,'insertAdjacentHTML',1);
    hookMethod(Element.prototype,'replaceChildren',0);
    hookMethod(CharacterData.prototype,'replaceData',2);
    hookMethod(CharacterData.prototype,'appendData',0);
    hookMethod(CharacterData.prototype,'insertData',1);
    const observer=new MutationObserver(list=>{
      for(const m of list){
        if(m.type==='characterData'&&re.test(String(m.target?.data||''))) trace('MutationObserver:characterData',m.target,m.target.data);
        if(m.type==='childList'){
          for(const n of m.addedNodes||[]){const t=String(n?.textContent||'');if(re.test(t))trace('MutationObserver:childList',n,t);}
        }
      }
    });
    observer.observe(document.getElementById('host'),{subtree:true,childList:true,characterData:true,characterDataOldValue:true});
    restores.push(()=>observer.disconnect());
    const before=rowSnapshot('before');
    let renderError='';
    try{const host=document.getElementById('host'),out=Orbit?.modules?.polizas?.render?.(host);if(out&&typeof out.then==='function')await out;}catch(e){renderError=String(e?.message||e).slice(0,240);}
    const immediate=rowSnapshot('immediate');
    await new Promise(r=>setTimeout(r,160));
    const after160=rowSnapshot('after160');
    await new Promise(r=>setTimeout(r,500));
    const after660=rowSnapshot('after660');
    restores.reverse().forEach(fn=>{try{fn();}catch{}});
    return {before,immediate,after160,after660,renderError,traces:traces.slice(0,60),scripts:[...document.scripts].map(s=>s.src||'').filter(Boolean).map(src=>src.replace(location.origin,'')).filter(src=>/poliz|policy-receipts|crm-v1198|detail-guard|projection|reference|validation/i.test(src)).slice(0,120)};
  });
}

const sa=serviceAccount();
const app=initializeApp({credential:cert(sa),projectId:PROJECT},'gravicentra-i4a-policy-dom-owner');
const auth=getAuth(app),db=getFirestore(app);
const evidence={schemaVersion:'gravicentra-i4a-policy-dom-owner-v2',gate:'I4A',status:'OWNER_DIAGNOSTIC_FAIL',sourceSha:SOURCE,buildId:BUILD,previewUrl:PREVIEW,productionTouched:false,dataTouched:false,writesExecuted:0,secretsRecorded:false,privilegedRole:'',capture:null,classification:null,errors:[]};
let browser,context;
try{
  need(PREVIEW&&SOURCE&&BUILD,'I4A_POLICY_OWNER_ENV_INCOMPLETE');
  const memberships=await db.collection('tenants').doc(TENANT).collection('members').get(),listed=await auth.listUsers(1000),users=new Map(listed.users.map(u=>[u.uid,u])),pool=[];
  for(const doc of memberships.docs){const m=doc.data()||{},uid=clean(m.uid||doc.id),u=users.get(uid);if(!u||u.disabled||u.emailVerified!==true||!['active','activo'].includes(clean(m.status||m.estado).toLowerCase()))continue;const rs=roles(m);pool.push({uid,roles:rs,active:activeRole(m,rs)});}
  let selected=null,targetRole='';for(const r of PRIVILEGED){const exact=pool.find(x=>x.active===r&&x.roles.includes(r)),fallback=exact||pool.find(x=>x.roles.includes(r));if(fallback){selected=fallback;targetRole=r;break;}}
  need(selected&&targetRole,'I4A_NO_PRIVILEGED_ACTIVE_MEMBERSHIP');evidence.privilegedRole=targetRole;
  const token=await auth.createCustomToken(selected.uid,{gravicentraI4APolicyDomOwnerReadOnly:true});
  browser=await chromium.launch({headless:true});context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage();page.setDefaultTimeout(12000);
  await page.goto(PREVIEW,{waitUntil:'domcontentloaded',timeout:20000});await page.waitForFunction(()=>!!Orbit?.productAppP0&&!!Orbit?.productRuntimeBrowserProvidersP0,null,{timeout:6000});await activate(page,token);await setRole(page,targetRole);
  evidence.capture=await captureOwner(page);
  const stacks=(evidence.capture?.traces||[]).flatMap(t=>t.stack||[]);
  evidence.classification={initialSyntheticRows:evidence.capture?.before?.synthetic?.length||0,immediateSyntheticRows:evidence.capture?.immediate?.synthetic?.length||0,delayedSyntheticRows:evidence.capture?.after160?.synthetic?.length||0,writeTraceCount:evidence.capture?.traces?.length||0,sourceFrames:[...new Set(stacks.filter(x=>/https?:\/\//.test(x)).map(x=>x.trim()))].slice(0,30)};
  evidence.status='OWNER_DIAGNOSTIC_COMPLETE';
}catch(e){evidence.errors.push(String(e?.message||e).slice(0,500));process.exitCode=1;}
finally{
  if(context)await context.close().catch(()=>{});if(browser)await browser.close().catch(()=>{});await deleteApp(app).catch(()=>{});
  fs.mkdirSync(OUT,{recursive:true});fs.writeFileSync(path.join(OUT,'i4a-policy-dom-owner.json'),JSON.stringify(evidence,null,2)+'\n');
  console.log('I4A_POLICY_OWNER_STATUS='+evidence.status);
  console.log('I4A_POLICY_OWNER_TRACE_COUNT='+(evidence.classification?.writeTraceCount??'NA'));
  console.log('I4A_POLICY_OWNER_SOURCE_FRAMES='+JSON.stringify(evidence.classification?.sourceFrames||[]));
  console.log('I4A_POLICY_OWNER_WRITES=0');
}
