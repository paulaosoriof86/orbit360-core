#!/usr/bin/env node
// I6.6 same-artifact Preview UAT: signed existing roles, read-only global search
// plus renewal / Cobros / Ops / Leads / protected Conciliaciones reachability.
// Does not alter users, approvals, or business data.
import fs from 'node:fs';
import {chromium} from 'playwright';
import {initializeApp,applicationDefault,getApps} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {getAuth} from 'firebase-admin/auth';

const PROJECT='ays-orbit-360-lab',TENANT='alianzas-soluciones';
const SOURCE='c191b56461742f631c492e2ffd904278f1795fe2';
const ORIGIN='https://ays-orbit-360-lab--gi-i66-rc-43244954006-cdz2e4x6.web.app';
const expectedBuild='gi-i66-'+SOURCE.slice(0,12)+'-57f234755dc1';
const requirePass=(value,code)=>{if(!value)throw Error(code);};
const norm=x=>String(x??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const report={gate:'I6.6',status:'HOLD',origin:ORIGIN,sourceSha:SOURCE,readOnly:true,
  firebaseWrites:0,customerWrites:0,authWrites:0,roleImpersonationChanges:0,cases:[]};
const failedChecks=[];
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

async function inspectOperational(target){
  const token=await findRole(target);
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{
    const context=await browser.newContext({viewport:{width:1365,height:900}});
    const page=await context.newPage();
    let pageErrors=0;
    page.on('pageerror',()=>pageErrors++);
    await page.goto(ORIGIN+'/#/renovaciones',{waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:30000});
    const activated=await page.evaluate(async t=>{
      const p=Orbit.productRuntimeBrowserProvidersP0,s=await p.initialize();
      if(!s.auth.currentUser)await s.modules.auth.signInWithCustomToken(s.auth,t);
      const result=await Orbit.productAppP0.activate();
      return {ok:result?.started===true,role:String(Orbit.session?.rol?.()||'')};
    },token);
    requirePass(activated.ok&&norm(activated.role)===norm(target),'I66_OPERATIONAL_SIGNED_ROLE_DRIFT_'+target);
    const navigate=async route=>{
      await page.evaluate(r=>{location.hash='#/'+r;},route);
      await page.waitForFunction(r=>Orbit.route?.key===r&&!!document.querySelector('#host .page'),route,{timeout:30000});
    };
    const waitSourceState=async collections=>{
      await page.waitForFunction(names=>{
        const s=Orbit.store?._productStatus?.()||{};
        return names.every(n=>(s.serverConfirmedCollections||[]).includes(n)||
          (s.deniedCollections||[]).includes(n)||!!(s.snapshotErrors||{})[n]);
      },collections,{timeout:35000}).catch(()=>{});
    };
    await navigate('renovaciones');
    await waitSourceState(['polizas']);
    const renewals=await page.evaluate(()=>({
      edit:Orbit.access?.can?.('renovaciones','edit')===true,
      manage:Orbit.issuance?.canManage?.()===true,
      directHook:typeof Orbit.renewalDirect?.open==='function',
      entry:typeof Orbit.modules?.renovaciones?.registrarAceptacion==='function',
      decisionButtonsText:document.getElementById('host')?.innerText?.includes('Pedir renovar')===true
    }));
    await navigate('cobros');
    await waitSourceState(['cobros','recibosEsperados']);
    const cobros=await page.evaluate(()=>({
      view:Orbit.access?.can?.('cobros','view')===true,
      edit:Orbit.access?.can?.('cobros','edit')===true,
      operationPresent:typeof Orbit.modules?.cobros?.aplicarPago==='function',
      actionVisible:[...document.querySelectorAll('#host button')].some(x=>/Aplicar pago/i.test(x.textContent||'')),
      confirmedCollections:[].concat(Orbit.store?._productStatus?.()?.serverConfirmedCollections||[]).filter(x=>['cobros','recibosEsperados','carteraPrimas'].includes(x))
    }));
    await navigate('leads');
    await waitSourceState(['negocios']);
    const leads=await page.evaluate(()=>({
      view:Orbit.access?.can?.('leads','view')===true,
      edit:Orbit.access?.can?.('leads','edit')===true,
      createFormPresent:typeof Orbit.ciclo?.nuevoNegocio==='function',
      hasBoard:!!document.querySelector('#host .kanban'),
      serverConfirmed:Orbit.store?._productStatus?.()?.serverConfirmedCollections?.includes('negocios')===true
    }));
    await navigate('ops');
    await waitSourceState(['negocios','gestiones']);
    const ops=await page.evaluate(()=>({
      view:Orbit.access?.can?.('ops','view')===true,
      hasBoard:!!document.querySelector('#host .kanban'),
      sharedInboxButton:!!document.querySelector('#op-shared-inbox'),
      handoffCardCount:document.querySelectorAll('[aria-label="Solicitudes de Leads pendientes"] .kcard').length,
      serverConfirmed:['negocios','gestiones'].every(x=>Orbit.store?._productStatus?.()?.serverConfirmedCollections?.includes(x))
    }));
    await navigate('conciliaciones');
    await page.waitForFunction(()=>{
      const s=Orbit.cobrosConciliacionReadOnly?.proposalReadiness?.();
      return ['ready','denied','unavailable'].includes(s);
    },null,{timeout:45000});
    const reconciliation=await page.evaluate(()=>({
      permitted:Orbit.access?.can?.('conciliaciones','view')===true,
      readiness:Orbit.cobrosConciliacionReadOnly?.proposalReadiness?.()||'unknown',
      sourceConfirmed:[].concat(Orbit.store?._productStatus?.()?.serverConfirmedCollections||[]).filter(x=>['conciliaciones','conciliacionesPrimas'].includes(x)),
      readOnly:Orbit.cobrosConciliacionReadOnly?.operationalWrites===0&&Orbit.cobrosConciliacionReadOnly?.autoApply===false,
      serverErrorCollections:Object.keys(Orbit.store?._productStatus?.()?.snapshotErrors||{}).filter(x=>['conciliaciones','conciliacionesPrimas'].includes(x))
    }));
    report.cases.push({role:target,scope:'operational-cross-route',renewals,cobros,leads,ops,reconciliation,previewPageErrors:pageErrors});
    const check=(ok,code)=>{if(!ok)failedChecks.push(code+'_'+target);};
    check(pageErrors===0,'I66_OPERATIONAL_SIGNED_PAGE_ERRORS');
    check(renewals.edit&&renewals.manage&&renewals.directHook&&renewals.entry,'I66_DIRECT_RENEWAL_ENTRY_HOLD');
    check(cobros.view&&cobros.edit&&cobros.operationPresent&&cobros.confirmedCollections.includes('cobros'),
      'I66_PAYMENT_ENTRY_AND_DATA_HOLD');
    check(leads.view&&leads.edit&&leads.createFormPresent&&leads.hasBoard&&leads.serverConfirmed,
      'I66_SIGNED_LEADS_BOARD_HOLD');
    check(ops.view&&ops.hasBoard&&ops.sharedInboxButton&&ops.serverConfirmed,'I66_SIGNED_OPS_BRIDGE_HOLD');
    // Carlos applies payments in Cobros; Conciliaciones is separately scoped.
    // Only a signed authorized Dirección read certifies the protected queue.
    if(target==='Dirección')check(reconciliation.permitted&&reconciliation.readiness==='ready'&&
      reconciliation.sourceConfirmed.length===2&&reconciliation.readOnly,
      'I66_SIGNED_PROTECTED_CONCILIACIONES_HOLD');
    await context.close();
  }finally{await browser.close();}
}

try{
  const marker=await fetch(ORIGIN+'/__recovery__/build.json',{signal:AbortSignal.timeout(20000)}).then(r=>{
    requirePass(r.ok,'I66_PREVIEW_MARKER_UNREADABLE');return r.json();
  });
  requirePass(marker.sourceSha===SOURCE&&marker.buildId===expectedBuild&&marker.gate==='I6.6',
    'I66_PREVIEW_WRONG_PRODUCT_ARTIFACT');
  // The known signed Operativo identity is resolved using the same certified
  // advisor-member linkage as the previous performance UAT. Dirección stays
  // a separate LIVE canary, not a fabricated Preview PASS.
  await exercise('Operativo');
  for(const target of ['Operativo','Dirección'])await inspectOperational(target);
  requirePass(failedChecks.length===0,failedChecks.join('__'));
  report.status='SIGNED_OPERATIONAL_CROSS_ROUTE_READONLY_PASS';
  console.log('I66_SIGNED_OPERATIONAL_PREVIEW_PASS '+JSON.stringify(report.cases));
}catch(error){
  report.status='HOLD';report.blocker=String(error?.message||'UNKNOWN').replace(/[^A-Z0-9_-]/gi,'').slice(0,100);
  console.error('I66_SIGNED_COBROS_TOPBAR_PREVIEW_HOLD='+report.blocker);
  process.exitCode=1;
}finally{fs.writeFileSync(process.env.GI_I66_QA_REPORT,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});}
