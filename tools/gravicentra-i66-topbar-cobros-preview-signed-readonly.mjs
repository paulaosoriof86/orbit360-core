#!/usr/bin/env node
// I6.6 same-artifact Preview UAT: signed existing roles, read-only global search
// from Cobros BEFORE visiting Aseguradoras. Does not alter users or business data.
import fs from 'node:fs';
import {chromium} from 'playwright';
import {initializeApp,applicationDefault,getApps} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {getAuth} from 'firebase-admin/auth';

const PROJECT='ays-orbit-360-lab',TENANT='alianzas-soluciones';
const SOURCE='59c2781b14f53030b0163fa0a833b12116d5475d';
const ORIGIN='https://ays-orbit-360-lab--gi-i66-rc-43131776926-z7owc7v2.web.app';
const expectedBuild='gi-i66-'+SOURCE.slice(0,12)+'-57f234755dc1';
const requirePass=(value,code)=>{if(!value)throw Error(code);};
const norm=x=>String(x??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const report={gate:'I6.6',status:'HOLD',origin:ORIGIN,sourceSha:SOURCE,readOnly:true,
  firebaseWrites:0,customerWrites:0,authWrites:0,roleImpersonationChanges:0,cases:[]};
requirePass(process.env.GI_I66_TARGET_PROJECT===PROJECT&&process.env.GI_I66_TARGET_TENANT===TENANT,'I66_TARGET_PROJECT_TENANT_DRIFT');
requirePass(process.env.GI_I66_QA_REPORT?.startsWith(process.env.RUNNER_TEMP+'/'),'I66_REPORT_PATH_DENIED');
const app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId:PROJECT});
const db=getFirestore(app),auth=getAuth(app);

async function findRole(target){
  const tenant=db.collection('tenants').doc(TENANT);
  const [docs,advisors]=await Promise.all([
    tenant.collection('members').limit(150).get(),
    tenant.collection('data').doc('asesores').collection('items').limit(400).get()
  ]);
  requirePass(docs.size<150&&advisors.size<400,'I66_MEMBER_READ_BOUND');
  const knownAdvisors=new Set(),knownUids=new Set();
  for(const doc of advisors.docs){
    const a=doc.data()||{};
    if([a.nombre,a.nombreCompleto,a.displayName,a.name].some(x=>norm(x)==='carlos castro'||norm(x).startsWith('carlos castro '))){
      knownAdvisors.add(doc.id);
      for(const uid of [a.authUid,a.uid,a.userId])if(uid)knownUids.add(String(uid));
    }
  }
  const who=docs.docs.filter(doc=>{
    const m=doc.data()||{},names=[m.nombre,m.displayName,m.name,m.nombreCompleto,m.fullName];
    const matches=target==='Operativo'
      ? names.some(x=>norm(x)==='carlos castro'||norm(x).startsWith('carlos castro '))||
        knownAdvisors.has(String(m.advisorId||m.asesorId||''))||knownUids.has(doc.id)
      : names.some(x=>norm(x).includes('paula')&&norm(x).includes('osorio'));
    const roles=[m.activeRole,m.rol,m.rolDefault,...[].concat(m.roles||[])].map(norm);
    return matches&&m.active!==false&&m.activo!==false&&
      !['inactivo','inactive','bloqueado','blocked'].includes(norm(m.status||m.estado))&&
      roles.includes(norm(target));
  });
  requirePass(who.length===1,'I66_SIGNED_'+target.toUpperCase()+'_MEMBER_NOT_UNIQUE');
  const user=await auth.getUser(who[0].id);
  requirePass(!user.disabled,'I66_SIGNED_MEMBER_DISABLED');
  return auth.createCustomToken(user.uid);
}

async function exercise(target){
  const token=await findRole(target);
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{
    const context=await browser.newContext({viewport:{width:1365,height:900}});
    const page=await context.newPage();
    let pageErrors=0;
    page.on('pageerror',()=>pageErrors++);
    await page.goto(ORIGIN+'/#/cobros',{waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:15000});
    const signed=await page.evaluate(async token=>{
      const provider=Orbit.productRuntimeBrowserProvidersP0,state=await provider.initialize();
      if(!state.auth.currentUser)await state.modules.auth.signInWithCustomToken(state.auth,token);
      const activated=await Orbit.productAppP0.activate();
      location.hash='#/cobros';
      return {ok:activated?.started===true,role:String(Orbit.session?.rol?.()||'')};
    },token);
    requirePass(signed.ok&&norm(signed.role)===norm(target),'I66_'+target.toUpperCase()+'_SIGNED_ROLE_DRIFT');
    await page.waitForFunction(()=>Orbit.route?.key==='cobros'&&!!document.querySelector('.tb-search input'),null,{timeout:16000});
    // Search before opening any module that could hydrate insurer snapshots.
    const result=await page.evaluate(async()=>{
      const input=document.querySelector('.tb-search input'),dd=document.getElementById('tb-search-dd');
      const st=()=>Orbit.store?._productStatus?.()||{};
      const before=[].concat(st().serverConfirmedCollections||[]);
      input.value='MAPFRE';input.dispatchEvent(new Event('input',{bubbles:true}));
      let firstText='',prematureEmpty=false;
      const start=performance.now();
      while(performance.now()-start<14500){
        await new Promise(r=>setTimeout(r,100));
        const text=dd.innerText||'';
        if(!firstText&&text)firstText=text.slice(0,120);
        const loaded=new Set(st().serverConfirmedCollections||[]);
        const denied=new Set(st().deniedCollections||[]);
        const errors=st().snapshotErrors||{};
        const ready=loaded.has('aseguradoras')||denied.has('aseguradoras')||!!errors.aseguradoras;
        if(/Sin resultados para/.test(text)&&!ready)prematureEmpty=true;
        if(dd.querySelectorAll('.tb-sr').length>0&&ready)break;
        if(ready&&/Sin resultados para/.test(text))break;
      }
      const after=[].concat(st().serverConfirmedCollections||[]),suggestions=dd.querySelectorAll('.tb-sr').length;
      const pending=/Buscando resultados autorizados/.test(dd.innerText||'');
      const authorized=Orbit.access?.can?.('aseguradoras','view')===true;
      const fullyReady=after.includes('aseguradoras');
      const hasMapfre=[...dd.querySelectorAll('.tb-sr')].some(el=>(el.innerText||'').toLowerCase().includes('mapfre'));
      const firstRoute=dd.querySelector('[data-go]')?.dataset?.go||'';
      let entered=false;
      if(firstRoute){
        const old=location.hash;
        input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
        entered=location.hash===firstRoute&&location.hash!==old&&input.value===''&&!dd.classList.contains('open');
      }
      return {route:'cobros',beforeInsurerReady:before.includes('aseguradoras'),afterInsurerReady:fullyReady,
        authorized,suggestions,hasMapfre,prematureEmpty,pending,entered,
        firstStatus:firstText.startsWith('Buscando resultados autorizados')?'WAIT_AUTHORIZED':firstText?'RESULTS':'NONE',
        snapshotErrorNames:Object.keys(st().snapshotErrors||{}).filter(x=>/^[a-z0-9]+$/i.test(x)).slice(0,9)};
    });
    requirePass(pageErrors===0,'I66_SIGNED_PREVIEW_PAGE_ERRORS');
    requirePass(!result.prematureEmpty,'I66_TOPBAR_FALSE_EMPTY_DURING_PROTECTED_HYDRATION');
    requirePass(result.authorized&&result.afterInsurerReady,'I66_SIGNED_INSURER_SOURCE_NOT_READY');
    // For Dirección GT, MAPFRE is an authorized existing insurer. Operativo
    // can see its own-country results only; zero matches need not mean leakage.
    if(target==='Dirección')requirePass(result.hasMapfre&&result.suggestions>0&&result.entered,
      'I66_DIRECCION_COBROS_TOPBAR_MAPFRE_ENTER_HOLD');
    report.cases.push({role:target,previewPageErrors:pageErrors,...result});
    await context.close();
  }finally{await browser.close();}
}

try{
  const marker=await fetch(ORIGIN+'/__recovery__/build.json',{signal:AbortSignal.timeout(20000)}).then(r=>{
    requirePass(r.ok,'I66_PREVIEW_MARKER_UNREADABLE');return r.json();
  });
  requirePass(marker.sourceSha===SOURCE&&marker.buildId===expectedBuild&&marker.gate==='I6.6',
    'I66_PREVIEW_WRONG_PRODUCT_ARTIFACT');
  for(const target of ['Dirección','Operativo'])await exercise(target);
  report.status='SIGNED_COBROS_TOPBAR_READONLY_PASS';
  console.log('I66_SIGNED_COBROS_TOPBAR_PREVIEW_PASS '+JSON.stringify(report.cases));
}catch(error){
  report.status='HOLD';report.blocker=String(error?.message||'UNKNOWN').replace(/[^A-Z0-9_-]/gi,'').slice(0,100);
  console.error('I66_SIGNED_COBROS_TOPBAR_PREVIEW_HOLD='+report.blocker);
  process.exitCode=1;
}finally{fs.writeFileSync(process.env.GI_I66_QA_REPORT,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});}
