import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium } from 'playwright';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT='ays-orbit-360-lab';
const TENANT=String(process.env.TENANT_HINT||'').trim();
const TARGET=String(process.env.TARGET_URL||'').replace(/\/$/,'');
const OUT=process.env.B2_AUTH_PROOF_FILE||path.join(process.env.RUNNER_TEMP||process.cwd(),'b2-authenticated-preview.json');
const VISUAL_DIR=process.env.B2_VISUAL_DIR||path.join(process.env.RUNNER_TEMP||process.cwd(),'b2-visual');
const RUN=String(process.env.GITHUB_RUN_ID||Date.now());
const clean=(v,m=500)=>String(v==null?'':v).trim().slice(0,m);
const norm=v=>clean(v,180).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const need=(v,c)=>{if(!v)throw new Error(c);};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const milestone=(name,data={})=>console.log('B2_MILESTONE='+name+' '+JSON.stringify(data));
async function bounded(p,label,ms=45000){let t;try{return await Promise.race([p,new Promise((_,rej)=>{t=setTimeout(()=>rej(new Error(label)),ms);})]);}finally{clearTimeout(t);}}
const uniq=a=>[...new Set([].concat(a||[]).map(x=>clean(x,180)).filter(Boolean))];
const hash=v=>crypto.createHash('sha256').update(String(v||'')).digest('hex');
const evidence={status:'RUNNING',target:TARGET,runId:RUN,scope:{},crud:{},renewal:{},cleanup:{},errors:[],writes:{synthetic:0,cleanup:0}};
fs.mkdirSync(path.dirname(OUT),{recursive:true});
fs.mkdirSync(VISUAL_DIR,{recursive:true});
need(TENANT,'B2_AUTH_TENANT_REQUIRED');
need(/^https:\/\/.+\.web\.app$/.test(TARGET),'B2_AUTH_TARGET_INVALID');

function sa(){
  for(const k of ['SA_DEFAULT','SA_ORBIT360_LAB','SA_ORBIT_360_LAB']){
    try{const x=JSON.parse(process.env[k]||'');if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.private_key)return x;}catch{}
  }
  if(process.env.GOOGLE_APPLICATION_CREDENTIALS){
    const x=JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS,'utf8'));
    if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.private_key)return x;
  }
  throw new Error('B2_AUTH_SERVICE_ACCOUNT');
}
function roles(m){return uniq([...(m?.roles||[]),...(m?.rolesAsignados||[]),...(m?.assignedRoles||[]),m?.role,m?.rol,m?.rolDefault,m?.defaultRole,m?.activeRole]);}
async function waitFor(fn,label,timeout=25000,interval=300){
  const end=Date.now()+timeout;let last;
  while(Date.now()<end){
    try{const v=await fn();if(v)return v;last=v;}catch(e){last=e;}
    await sleep(interval);
  }
  throw new Error(label+':'+clean(last&&last.message||last||'timeout',800));
}
async function captureVisualAudit(page){
  const out={files:[],desktop:{},mobile:{},readOnly:true};
  const shot=async(name)=>{
    const file=path.join(VISUAL_DIR,name+'.png');
    await page.screenshot({path:file,fullPage:true});
    out.files.push(path.basename(file));
  };
  const go=async(key)=>{
    await page.evaluate(k=>{if(window.Orbit?.router?.go)Orbit.router.go(k);else location.hash='#/'+k;},key);
    await sleep(900);
    return page.evaluate(()=>({hash:String(location.hash||''),routeKey:String(Orbit.route?.key||''),body:String(document.body?.innerText||'').slice(0,4000)}));
  };
  await page.setViewportSize({width:1500,height:1000});
  out.desktop.inicio=await go('inicio'); await shot('01-inicio-desktop');
  out.desktop.academia=await go('academia'); await shot('02-academia-desktop');
  out.desktop.aseguradoras=await go('aseguradoras'); await shot('03-aseguradoras-desktop');
  out.desktop.cliente360=await go('cliente360'); await shot('04-cliente360-desktop');

  const sample=await page.evaluate(()=>{
    const polizas=(Orbit.store?.all?.('polizas')||[]).filter(Boolean);
    const vehiculos=(Orbit.store?.all?.('vehiculos')||[]).filter(Boolean);
    const cobros=(Orbit.store?.all?.('cobros')||[]).filter(Boolean);
    let policy=polizas.find(p=>vehiculos.some(v=>String(v.polizaId||'')===String(p.id||'')))||polizas[0]||null;
    let vehicle=policy?vehiculos.find(v=>String(v.polizaId||'')===String(policy.id||'')):vehiculos[0]||null;
    let client=policy?Orbit.store.get('clientes',policy.clienteId):null;
    let receipt=(policy?cobros.find(c=>String(c.polizaId||'')===String(policy.id||'')):null)||cobros[0]||null;
    return{clientId:String(client?.id||''),policyId:String(policy?.id||''),vehicleId:String(vehicle?.id||''),receiptId:String(receipt?.id||'')};
  });
  out.sample=sample;

  if(sample.clientId){
    await page.evaluate(id=>{location.hash='#/cliente360?c='+encodeURIComponent(id);},sample.clientId);
    await sleep(900); await shot('05-cliente360-detail-desktop');
  }
  if(sample.policyId){
    await page.evaluate(id=>Orbit.modules?.cliente360?.verPoliza?.(id),sample.policyId);
    await page.waitForSelector('[data-policy-fullpage="1"]',{timeout:10000});
    await shot('06-policy-detail-desktop');
  }
  if(sample.vehicleId){
    await page.evaluate(id=>Orbit.modules?.cliente360?.verVehiculo?.(id),sample.vehicleId);
    await page.waitForSelector('[data-vehicle-fullpage="1"]',{timeout:10000});
    await shot('07-vehicle-detail-desktop');
  }
  if(sample.receiptId){
    await page.evaluate(id=>Orbit.modules?.cobros?.detalle?.(id),sample.receiptId);
    await page.waitForSelector('#cob-det',{timeout:10000});
    await shot('08-receipt-detail-desktop');
    await page.evaluate(()=>document.getElementById('cob-det')?.remove());
  }

  await page.setViewportSize({width:390,height:844});
  out.mobile.academia=await go('academia'); await shot('09-academia-mobile');
  if(sample.policyId){
    await page.evaluate(id=>Orbit.modules?.cliente360?.verPoliza?.(id),sample.policyId);
    await page.waitForSelector('[data-policy-fullpage="1"]',{timeout:10000});
    await shot('10-policy-detail-mobile');
  }
  await page.setViewportSize({width:1500,height:1000});

  const visibleOrbit=await page.evaluate(()=>/\bOrbit 360\b/.test(String(document.body?.innerText||'')));
  out.visibleOrbit360=visibleOrbit;
  out.gravicentraVisible=await page.evaluate(()=>String(document.body?.innerText||'').includes('Gravicentra'));
  return out;
}

async function acceptLegalGate(page,timeout=2500){
  const gate=page.locator('[data-legal-gate]').last();
  const visible=await gate.waitFor({state:'visible',timeout}).then(()=>true).catch(()=>false);
  if(!visible)return false;
  await gate.locator('#lg-chk').check();
  await gate.locator('#lg-ok').click();
  await gate.waitFor({state:'detached',timeout:10000});
  return true;
}
async function pickMultiRoleActor(db,auth){
  const snap=await db.collection('tenants').doc(TENANT).collection('members').get();
  const out=[];
  for(const d of snap.docs){
    const m=d.data()||{}, rr=roles(m), rn=rr.map(norm), st=norm(m.status||m.estado||'active');
    if(m.active===false||m.activo===false||['inactive','inactivo','blocked','bloqueado','suspended','suspendido'].includes(st))continue;
    if(!rn.includes('operativo')||!rn.some(x=>x==='asesor'||x.startsWith('asesor_')))continue;
    const advisorId=clean(m.advisorId||m.asesorId,180); if(!advisorId)continue;
    for(const uid of uniq([m.uid,d.id])){
      try{
        const u=await auth.getUser(uid);if(u.disabled)continue;
        out.push({uid:u.uid,advisorId,roles:rr,emailVerified:u.emailVerified===true,score:(u.emailVerified?10:0)+rr.length});
        break;
      }catch{}
    }
  }
  out.sort((a,b)=>b.score-a.score);
  need(out.length,'B2_AUTH_NO_OPERATIVO_ASESOR_ACTOR');
  return out[0];
}
async function activate(page,auth,a){
  const token=await auth.createCustomToken(a.uid,{b2PreviewQa:true});
  await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:20000});
  const st=await page.evaluate(async t=>{
    const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();
    if(!c.auth.currentUser)await c.modules.auth.signInWithCustomToken(c.auth,t);
    return Orbit.productAppP0.status?.().started?Orbit.productAppP0.status():Orbit.productAppP0.activate();
  },token);
  need(st?.started,'B2_AUTH_APP_START_FAILED');
  await page.waitForFunction(()=>{
    const s=window.Orbit?.store?._productStatus?.();
    return !!s&&s.ready===true&&window.Orbit?.store?.__productOperationalWriteP0===true;
  },null,{timeout:30000});
  await acceptLegalGate(page,5000);
}
async function setRole(page,role){
  const ok=await page.evaluate(r=>Orbit.session&&Orbit.session.set&&Orbit.session.set(r),role);
  need(ok===true,'B2_AUTH_ROLE_SET_FAILED:'+role);
  await sleep(500);
  await page.waitForFunction(r=>window.Orbit?.session?.rol?.()===r,role,{timeout:7000});
}
async function academiaSnapshot(page,role){
  await setRole(page,role);
  const access=await page.evaluate(()=>{
    const tenant=Orbit.tenant&&Orbit.tenant.get?Orbit.tenant.get():{};
    const def=Orbit.ROLES&&Orbit.ROLES[Orbit.session?.rol?.()]||{};
    return{
      role:String(Orbit.session?.rol?.()||''),
      assignedRoles:[].concat(Orbit.session?.rolesAsignados?.()||Orbit.auth?.productUser?.roles||[]),
      roleModules:[].concat(def.modulos||def.modules||[]),
      tenantActive:!!(Orbit.tenant&&Orbit.tenant.isActive&&Orbit.tenant.isActive('academia')),
      tenantModules:[].concat(tenant.modulosActivos||[]),
      tenantDisabled:[].concat(tenant.modulosDesactivados||[]),
      matrixView:Orbit.access?.matrixPermission?.('academia','ver'),
      sessionCanSee:Orbit.session&&Orbit.session.canSee?!!Orbit.session.canSee('academia'):null,
      moduleVisible:Orbit.access&&Orbit.access.puedeVerModulo?!!Orbit.access.puedeVerModulo('academia'):null,
      canView:Orbit.access&&Orbit.access.can?!!Orbit.access.can('academia','view'):null,
      dataScope:Orbit.access&&Orbit.access.dataScope?String(Orbit.access.dataScope('academia')||''):null,
      moduleLoaded:!!(Orbit.modules?.academia&&typeof Orbit.modules.academia.render==='function'),
      catalogReady:!!Orbit.academiaProductCatalogP0?.status?.().ready,
      catalogCount:(Orbit.store?.all?.('cursos')||[]).length,
      hash:String(location.hash||''),
      routeKey:String(Orbit.route?.key||'')
    };
  });
  evidence.academiaDiagnostics=evidence.academiaDiagnostics||{};
  evidence.academiaDiagnostics[role]={access};
  milestone('ACADEMIA_ACCESS_'+norm(role),access);
  need(access.catalogReady&&access.catalogCount>=2,'B2_AUTH_ACADEMIA_CATALOG_NOT_READY:'+JSON.stringify(access));
  need(access.moduleLoaded,'B2_AUTH_ACADEMIA_MODULE_NOT_LOADED:'+JSON.stringify(access));
  need(access.tenantActive,'B2_AUTH_ACADEMIA_TENANT_INACTIVE:'+JSON.stringify(access));
  need(access.canView===true,'B2_AUTH_ACADEMIA_ACCESS_DENIED:'+JSON.stringify(access));
  await page.evaluate(()=>{if(Orbit.router&&typeof Orbit.router.go==='function')Orbit.router.go('academia');else location.hash='#/academia';});
  await sleep(600);
  const rendered=await page.evaluate(()=>({
    hash:String(location.hash||''),routeKey:String(Orbit.route?.key||''),
    hostText:String(document.getElementById('host')?.innerText||'').slice(0,1600),
    brand: String(document.getElementById('host')?.innerText||'').includes('Academia de Gravicentra'),
    locked:String(document.getElementById('host')?.innerText||'').includes('No tienes acceso con el rol activo')
  }));
  evidence.academiaDiagnostics[role].rendered=rendered;
  milestone('ACADEMIA_RENDER_'+norm(role),rendered);
  need(rendered.brand===true&&!rendered.locked,'B2_AUTH_ACADEMIA_RENDER_BLOCKED:'+JSON.stringify({access,rendered}));
  await page.locator('[data-vista="ruta"]').click();
  await page.waitForSelector('#ruta-rol',{timeout:8000});
  return page.evaluate(()=>{
    const st=Orbit.academiaProductCatalogP0.status(),rows=Orbit.store.all('cursos')||[],host=String(document.getElementById('host')?.innerText||'');
    const ids=rows.map(x=>String(x.id||''));
    return{
      role:String(Orbit.session?.rol?.()||''),catalogCount:rows.length,
      hasClient360:ids.includes('cur_p_clientes'),hasInsurerDirectory:ids.includes('cur_p_aseg_cotiz'),
      brandOk:host.includes('Academia de Gravicentra')&&!host.includes('Orbit Academia')&&!host.includes('Academia Orbit 360'),
      routeSelector:!!document.getElementById('ruta-rol'),
      forbiddenVisible:/\bLAB\b|\bSHA\b|validator|release gate|release mechanics|bridge owner|seed writer|hardcod/i.test(host),
      automaticWrites:st.automaticWrites,catalogManagementDurable:st.catalogManagementDurable,
      staticCourseCount:st.staticCourseCount,realCourseCount:st.realCourseCount,progressRowsRead:st.progressRowsRead
    };
  });
}
async function scopeSnapshot(page){
  return page.evaluate(()=>{
    const S=Orbit.access.scopedStore('inicio'),own=String(Orbit.session.asesorId()||'');
    const clients=S.all('clientes'),policies=S.all('polizas'),receipts=S.all('recibosEsperados'),portfolio=S.all('carteraPrimas'),advisors=S.all('asesores'),metas=S.all('metas');
    const clientAdvisor=new Map(clients.map(x=>[String(x.id),String(x.asesorId||'')]));
    const policyAdvisor=new Map(policies.map(x=>[String(x.id),String(x.asesorId||clientAdvisor.get(String(x.clienteId))||'')]));
    const advisorOf=(collection,row)=>{
      if(collection==='clientes')return String(row.asesorId||'');
      if(collection==='polizas')return String(row.asesorId||clientAdvisor.get(String(row.clienteId))||'');
      if(collection==='asesores')return String(row.id||row.asesorId||'');
      if(row.asesorId)return String(row.asesorId);
      if(row.clienteId)return String(clientAdvisor.get(String(row.clienteId))||'');
      if(row.polizaId)return String(policyAdvisor.get(String(row.polizaId))||'');
      return '';
    };
    const leaks=[];
    for(const [c,arr] of [['clientes',clients],['polizas',policies],['recibosEsperados',receipts],['carteraPrimas',portfolio],['asesores',advisors],['metas',metas]]){
      for(const row of arr){const a=advisorOf(c,row);if(a&&a!==own)leaks.push(c+':'+String(row.id||'')+':'+a);}
    }
    return{
      role:String(Orbit.session.rol()||''),advisorId:own,scope:String(Orbit.access.dataScope('inicio')||''),
      counts:{clientes:clients.length,polizas:policies.length,recibosEsperados:receipts.length,carteraPrimas:portfolio.length,asesores:advisors.length,metas:metas.length},
      advisorIds:advisors.map(x=>String(x.id||x.asesorId||'')).sort(),leakCount:leaks.length,leaks:leaks.slice(0,10),
      inicioText:String(document.getElementById('host')?.innerText||'').slice(0,3000)
    };
  });
}
function dataCol(db,name){return db.collection('tenants').doc(TENANT).collection('data').doc(name).collection('items');}
async function oneBy(db,col,field,value){
  const s=await dataCol(db,col).where(field,'==',value).limit(2).get();
  return s.empty?null:{id:s.docs[0].id,...s.docs[0].data()};
}
async function rowsBy(db,col,field,value){
  const s=await dataCol(db,col).where(field,'==',value).get();
  return s.docs.map(d=>({id:d.id,...d.data()}));
}
async function deleteRowsBy(db,col,field,value){
  const s=await dataCol(db,col).where(field,'==',value).get();let n=0;
  for(const d of s.docs){await d.ref.delete();n++;}
  return n;
}
async function cleanupSynthetic(db,state){
  let n=0;
  const clientId=state.clientId||'',policyIds=uniq([state.policyId,state.renewedPolicyId].filter(Boolean));
  if(clientId){
    for(const col of ['actividades','gestiones','cobros','carteraPrimas','recibosEsperados','vehiculos','polizas'])n+=await deleteRowsBy(db,col,'clienteId',clientId).catch(()=>0);
    const cr=dataCol(db,'clientes').doc(clientId);const cs=await cr.get();if(cs.exists){await cr.delete();n++;}
  }
  if(state.insurerId){
    const ir=dataCol(db,'aseguradoras').doc(state.insurerId),is=await ir.get();
    if(is.exists){await ir.delete();n++;}
  }
  for(const id of uniq([clientId,...policyIds,state.requestId,state.insurerId].filter(Boolean))){
    n+=await deleteRowsBy(db,'auditLog','registroId',id).catch(()=>0);
  }
  return n;
}

let app,browser,context,page,state={};
try{
  app=initializeApp({credential:cert(sa()),projectId:PROJECT},'b2-auth-preview-'+RUN);
  const db=getFirestore(app),auth=getAuth(app),actor=await bounded(pickMultiRoleActor(db,auth),'B2_AUTH_ACTOR_TIMEOUT',30000);
  milestone('ACTOR_READY',{roles:actor.roles});
  evidence.actor={uidHash:hash(actor.uid),advisorIdHash:hash(actor.advisorId),roles:actor.roles,emailVerified:actor.emailVerified};

  browser=await chromium.launch({headless:true});
  context=await browser.newContext({viewport:{width:1500,height:1000}});
  page=await context.newPage();
  page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);
  const pageErrors=[],consoleErrors=[];
  page.on('pageerror',e=>pageErrors.push(clean(e?.message||e,1000)));
  page.on('console',msg=>{if(msg.type()==='error')consoleErrors.push(clean(msg.text(),1200));});
  milestone('PREVIEW_NAV_START');
  await page.goto(TARGET+'/?b2auth='+Date.now()+'#/inicio',{waitUntil:'domcontentloaded',timeout:30000});
  await bounded(activate(page,auth,actor),'B2_AUTH_ACTIVATE_TIMEOUT',45000);
  milestone('PREVIEW_AUTHENTICATED');

  await setRole(page,'Operativo');
  await page.evaluate(()=>{location.hash='#/inicio';});
  await sleep(500);
  const oper=await bounded(scopeSnapshot(page),'B2_AUTH_SCOPE_OPERATIVO_TIMEOUT',20000);
  milestone('SCOPE_OPERATIVO',{counts:oper.counts});
  await setRole(page,'Asesor');
  await sleep(500);
  const asesor=await bounded(scopeSnapshot(page),'B2_AUTH_SCOPE_ASESOR_TIMEOUT',20000);
  milestone('SCOPE_ASESOR',{counts:asesor.counts,leaks:asesor.leakCount});
  need(oper.scope==='all','B2_AUTH_OPERATIVO_SCOPE_NOT_ALL:'+JSON.stringify(oper));
  need(asesor.scope==='own','B2_AUTH_ASESOR_SCOPE_NOT_OWN:'+JSON.stringify(asesor));
  need(asesor.leakCount===0,'B2_AUTH_ASESOR_SCOPE_LEAK:'+JSON.stringify(asesor));
  need(asesor.advisorIds.length<=1&&(!asesor.advisorIds.length||asesor.advisorIds[0]===asesor.advisorId),'B2_AUTH_ASESOR_ADVISOR_AGGREGATE_LEAK');
  need(oper.counts.polizas>=asesor.counts.polizas&&oper.counts.recibosEsperados>=asesor.counts.recibosEsperados&&oper.counts.carteraPrimas>=asesor.counts.carteraPrimas,'B2_AUTH_ROLE_SCOPE_COUNTS_INVALID');
  evidence.scope={operativo:oper,asesor};
  const academiaOper=await bounded(academiaSnapshot(page,'Operativo'),'B2_AUTH_ACADEMIA_OPERATIVO_TIMEOUT',25000);
  need(academiaOper.hasClient360&&academiaOper.hasInsurerDirectory&&academiaOper.brandOk&&academiaOper.routeSelector&&!academiaOper.forbiddenVisible,'B2_AUTH_ACADEMIA_OPERATIVO_INVALID:'+JSON.stringify(academiaOper));
  need(academiaOper.automaticWrites===false&&academiaOper.catalogManagementDurable===false,'B2_AUTH_ACADEMIA_AUTOMATIC_WRITER_PRESENT');
  const academiaAsesor=await bounded(academiaSnapshot(page,'Asesor'),'B2_AUTH_ACADEMIA_ASESOR_TIMEOUT',25000);
  need(academiaAsesor.hasClient360&&academiaAsesor.hasInsurerDirectory&&academiaAsesor.brandOk&&academiaAsesor.routeSelector&&!academiaAsesor.forbiddenVisible,'B2_AUTH_ACADEMIA_ASESOR_INVALID:'+JSON.stringify(academiaAsesor));
  evidence.academia={operativo:academiaOper,asesor:academiaAsesor,automaticWrites:false,pass:true};
  milestone('ACADEMIA_ROLE_ROUTES',{operativo:academiaOper.catalogCount,asesor:academiaAsesor.catalogCount});
  await setRole(page,'Operativo');
  const visualAudit=await bounded(captureVisualAudit(page),'B2_AUTH_VISUAL_AUDIT_TIMEOUT',90000);
  evidence.visualAudit=visualAudit;
  milestone('VISUAL_AUDIT_CAPTURED',{files:visualAudit.files,visibleOrbit360:visualAudit.visibleOrbit360,gravicentraVisible:visualAudit.gravicentraVisible,sample:visualAudit.sample});
  need(visualAudit.gravicentraVisible===true,'B2_AUTH_VISUAL_GRAVICENTRA_BRAND_MISSING');
  need(visualAudit.visibleOrbit360===false,'B2_AUTH_VISUAL_ORBIT360_BRAND_REMAINS');

  const stamp=RUN.replace(/[^0-9A-Za-z]/g,'').slice(-12);
  const clientName='B2 QA '+stamp,ident='B2QA-'+stamp,policyNo='B2-POL-'+stamp,renewNo='B2-REN-'+stamp;
  state={clientName,policyNo,renewNo};

  await page.evaluate(()=>{location.hash='#/cliente360';});
  await sleep(500);
  const clientOpenBefore=await page.evaluate(()=>{
    const fn=Orbit.modules?.cliente360?.nuevoCliente;
    const src=String(fn||'');
    return{
      role:String(Orbit.session?.rol?.()||''),
      hash:String(location.hash||''),
      routeKey:String(Orbit.route?.key||''),
      moduleVisible:Orbit.access?.puedeVerModulo?!!Orbit.access.puedeVerModulo('cliente360'):null,
      canCreate:Orbit.access?.can?!!Orbit.access.can('cliente360','create'):null,
      canEdit:Orbit.access?.can?!!Orbit.access.can('cliente360','edit'):null,
      dataScope:Orbit.access?.dataScope?String(Orbit.access.dataScope('cliente360')||''):null,
      ownerIsV1198:src.includes('crm-new-client-v1198')||src.includes('openNewClient'),
      ownerHasBackdropGuard:src.includes('Usa Crear cliente o Cancelar'),
      crmFlag:Orbit.__crmV1198===true,
      actionsFlag:!!Orbit.modules?.cliente360?.__actionsV1198,
      actionKeys:Object.keys(Orbit.modules?.cliente360?.__actionsV1198||{}),
      crmGuardDiagnostics:[].concat(Orbit.__crmV1198GuardDiagnostics||[]).slice(-20),
      renderWrapped:!!Orbit.modules?.cliente360?.__scopeV1198,
      ownerPrefix:src.slice(0,260)
    };
  });
  milestone('CLIENT_CREATE_OWNER',clientOpenBefore);
  await bounded(page.evaluate(()=>Orbit.modules.cliente360.nuevoCliente()),'B2_AUTH_CLIENT_OPEN_TIMEOUT',15000);
  await sleep(350);
  const clientOpenAfter=await page.evaluate(()=>({
    canonicalModal:!!document.getElementById('crm-new-client-v1198'),
    legacyModal:!!document.getElementById('cli-nuevo'),
    canonicalSave:!!document.getElementById('v1198-save'),
    legacySave:!!document.getElementById('nc-save'),
    visibleDialogs:Array.from(document.querySelectorAll('.drawer-back.open,[role="dialog"]')).map(x=>String(x.id||x.className||'')).slice(0,12),
    bodyText:String(document.body?.innerText||'').slice(-1000)
  }));
  milestone('CLIENT_CREATE_DOM',clientOpenAfter);
  evidence.clientOpenDiagnostics={before:clientOpenBefore,after:clientOpenAfter};
  need(clientOpenBefore.canCreate===true,'B2_AUTH_CLIENT_CREATE_PERMISSION_DENIED:'+JSON.stringify(clientOpenBefore));
  need(clientOpenBefore.ownerIsV1198===true,'B2_AUTH_CLIENT_OWNER_NOT_V1198:'+JSON.stringify(clientOpenBefore));
  need(clientOpenAfter.canonicalModal===true&&clientOpenAfter.canonicalSave===true,'B2_AUTH_CLIENT_CANONICAL_MODAL_NOT_OPEN:'+JSON.stringify(clientOpenAfter));
  await page.waitForSelector('#crm-new-client-v1198 #v1198-save',{timeout:8000});
  await page.fill('#v1198-nombre',clientName);
  await page.fill('#v1198-id',ident);
  await page.fill('#v1198-tel','+502 5555 0202');
  await page.selectOption('#v1198-pais','GT');
  await page.selectOption('#v1198-ase',actor.advisorId);
  await page.evaluate(()=>document.getElementById('crm-new-client-v1198').dispatchEvent(new MouseEvent('click',{bubbles:true})));
  need(await page.locator('#crm-new-client-v1198').count()===1,'B2_AUTH_CLIENT_CREATE_BACKDROP_CLOSED');
  await page.evaluate(()=>{
    window.__b2OperationalWriteFailures=[];
    document.addEventListener('orbit:operational-write:failed',function h(e){
      try{window.__b2OperationalWriteFailures.push(e&&e.detail?JSON.parse(JSON.stringify(e.detail)):{});}catch(_e){}
    });
  });
  await page.click('#v1198-save');
  const clientSaveOutcome=await Promise.race([
    page.waitForSelector('#crm-new-client-v1198',{state:'detached',timeout:24000}).then(()=>({closed:true})).catch(()=>null),
    page.waitForFunction(()=>{
      const b=document.getElementById('v1198-save'),m=document.getElementById('crm-new-client-v1198');
      return !!(m&&b&&!b.disabled&&String(b.textContent||'').includes('Crear cliente'));
    },null,{timeout:24000}).then(()=>({closed:false,failedVisible:true})).catch(()=>null)
  ]);
  const clientSaveDiag=await page.evaluate(()=>({
    modalPresent:!!document.getElementById('crm-new-client-v1198'),
    savePresent:!!document.getElementById('v1198-save'),
    saveDisabled:!!document.getElementById('v1198-save')?.disabled,
    saveText:String(document.getElementById('v1198-save')?.textContent||''),
    writeStatus:Orbit.store?._operationalWriteStatus?.()||null,
    failures:[].concat(window.__b2OperationalWriteFailures||[]).slice(-10),
    visibleText:String(document.body?.innerText||'').slice(-1800)
  }));
  evidence.clientSaveDiagnostics={outcome:clientSaveOutcome,diag:clientSaveDiag,pageErrors:pageErrors.slice(-10),consoleErrors:consoleErrors.slice(-10)};
  milestone('CLIENT_CREATE_SAVE',evidence.clientSaveDiagnostics);
  need(clientSaveOutcome&&clientSaveOutcome.closed===true,'B2_AUTH_CLIENT_CREATE_SAVE_FAILED:'+JSON.stringify(evidence.clientSaveDiagnostics));
  const client=await waitFor(()=>oneBy(db,'clientes','nombre',clientName),'B2_AUTH_CLIENT_CREATE_READBACK');
  milestone('CLIENT_CREATE_READBACK',{id:hash(client.id)});
  state.clientId=client.id;evidence.writes.synthetic+=2;
  need(client.asesorId===actor.advisorId,'B2_AUTH_CLIENT_ADVISOR_MISMATCH');

  await page.waitForFunction(id=>!!Orbit.store.get('clientes',id),client.id,{timeout:15000});
  await page.evaluate(id=>Orbit.modules.cliente360.edit(id),client.id);
  await page.waitForSelector('#c360-edit #ce-save',{timeout:8000});
  await page.fill('#ce-notas','B2 QA edit '+stamp);
  await page.evaluate(()=>document.getElementById('c360-edit').dispatchEvent(new MouseEvent('click',{bubbles:true})));
  need(await page.locator('#c360-edit').count()===1,'B2_AUTH_CLIENT_EDIT_BACKDROP_CLOSED');
  let editReasonDialogSeen=false;
  page.once('dialog',async dialog=>{
    editReasonDialogSeen=true;
    need(dialog.type()==='prompt','B2_AUTH_CLIENT_EDIT_UNEXPECTED_DIALOG:'+dialog.type());
    await dialog.accept('B2 QA edición controlada '+stamp);
  });
  await page.click('#ce-save');
  await page.waitForSelector('#c360-edit',{state:'detached',timeout:25000});
  need(editReasonDialogSeen===true,'B2_AUTH_CLIENT_EDIT_REASON_DIALOG_NOT_SEEN');
  const edited=await waitFor(async()=>{const x=await dataCol(db,'clientes').doc(client.id).get();const d=x.data()||{};return d.notas==='B2 QA edit '+stamp?d:null;},'B2_AUTH_CLIENT_EDIT_READBACK');
  need(!!edited,'B2_AUTH_CLIENT_EDIT_NOT_DURABLE');evidence.writes.synthetic+=2;
  milestone('CLIENT_EDIT_READBACK');

  await page.waitForFunction(id=>!!Orbit.store.get('clientes',id),client.id,{timeout:15000});
  milestone('POLICY_CREATE_OPEN');
  await bounded(page.evaluate(id=>Orbit.modules.cliente360.nuevaPoliza(id),client.id),'B2_AUTH_POLICY_OPEN_TIMEOUT',15000);
  await page.waitForSelector('#policy-v1199 [data-save]',{timeout:10000});
  await page.evaluate(()=>document.getElementById('policy-v1199').dispatchEvent(new MouseEvent('click',{bubbles:true})));
  need(await page.locator('#policy-v1199').count()===1,'B2_AUTH_POLICY_BACKDROP_CLOSED');
  await page.selectOption('#policy-v1199 [data-advisor]',actor.advisorId);
  const insurerValue=await page.locator('#policy-v1199 [data-insurer] option').first().getAttribute('value');
  need(insurerValue,'B2_AUTH_NO_LINKED_INSURER');
  const autoRamo=await page.evaluate(()=>{
    const s=document.querySelector('#policy-v1199 [data-ramo]');if(!s)return'';
    const o=[...s.options].find(x=>/auto|veh/i.test(x.textContent||x.value||''));if(!o)return'';
    s.value=o.value;s.dispatchEvent(new Event('change',{bubbles:true}));return o.value;
  });
  need(autoRamo,'B2_AUTH_NO_AUTO_RAMO_FOR_VEHICLE_PROOF');
  await sleep(250);
  need(await page.locator('#policy-v1199 [data-product] option').count()>0,'B2_AUTH_AUTO_PRODUCT_EMPTY');
  await page.fill('#policy-v1199 [data-number]',policyNo);
  const freqOptions=await page.locator('#policy-v1199 [data-frequency] option').allTextContents();
  if(freqOptions.includes('Semestral')){
    await page.selectOption('#policy-v1199 [data-frequency]',{label:'Semestral'});
    const installmentContract=await page.locator('#policy-v1199 [data-installments]').evaluate(el=>({value:String(el.value||''),readOnly:!!el.readOnly}));
    need(installmentContract.value==='2'&&installmentContract.readOnly===true,'B2_AUTH_SEMESTRAL_INSTALLMENTS_CONTRACT_INVALID:'+JSON.stringify(installmentContract));
  }else{
    await page.fill('#policy-v1199 [data-installments]','2');
  }
  await page.fill('#policy-v1199 [data-net]','1000');
  await page.fill('#policy-v1199 [data-issue]','50');
  await page.fill('#policy-v1199 [data-sum]','100000');
  await page.fill('#policy-v1199 [data-vbrand]','Toyota');
  await page.fill('#policy-v1199 [data-vline]','Corolla');
  await page.fill('#policy-v1199 [data-vplate]','B2'+stamp.slice(-5));
  await page.fill('#policy-v1199 [data-vyear]','2026');
  await page.fill('#policy-v1199 [data-vcolor]','Blanco');
  await page.fill('#policy-v1199 [data-vvin]','VIN'+stamp);
  await page.fill('#policy-v1199 [data-vchasis]','CH'+stamp);
  await page.fill('#policy-v1199 [data-vmotor]','MO'+stamp);
  await page.click('#policy-v1199 [data-save]');
  await page.waitForSelector('#policy-v1199',{state:'detached',timeout:30000});
  const policy=await waitFor(()=>oneBy(db,'polizas','numero',policyNo),'B2_AUTH_POLICY_CREATE_READBACK',30000);
  milestone('POLICY_CREATE_READBACK',{id:hash(policy.id)});
  state.policyId=policy.id;
  need(policy.asesorId===actor.advisorId,'B2_AUTH_POLICY_SELLER_MISMATCH');
  const vehicleRows=await waitFor(async()=>{const x=await rowsBy(db,'vehiculos','polizaId',policy.id);return x.length===1?x:null;},'B2_AUTH_VEHICLE_CREATE_READBACK');
  const vehicle=vehicleRows[0];state.vehicleId=vehicle.id;
  need(vehicle.linea==='Corolla'&&vehicle.color==='Blanco'&&vehicle.vin==='VIN'+stamp&&vehicle.chasis==='CH'+stamp&&vehicle.motor==='MO'+stamp,'B2_AUTH_VEHICLE_COMPLETE_FIELDS_MISMATCH');
  const receipts=await rowsBy(db,'recibosEsperados','polizaId',policy.id),portfolio=await rowsBy(db,'carteraPrimas','polizaId',policy.id),cobros=await rowsBy(db,'cobros','polizaId',policy.id);
  need(receipts.length>0&&portfolio.filter(x=>x.carteraActiva!==false).length>0,'B2_AUTH_POLICY_RECEIPTS_PORTFOLIO_MISSING');
  need(cobros.length===0,'B2_AUTH_POLICY_CREATED_CONFIRMED_COBRO');
  evidence.writes.synthetic+=2+receipts.length+portfolio.length+1;

  await page.waitForFunction(id=>!!Orbit.store.get('polizas',id),policy.id,{timeout:15000});
  await page.evaluate(()=>{
    window.__b2PolicyUpdateTrace=[];
    const engine=Orbit.policyReceipts;
    if(!engine||typeof engine.updatePolicy!=='function')throw new Error('B2_AUTH_POLICY_ENGINE_UPDATE_MISSING');
    if(!engine.__b2OriginalUpdatePolicy)engine.__b2OriginalUpdatePolicy=engine.updatePolicy;
    engine.updatePolicy=async function(id,patch,options){
      const trace={id:String(id||''),patchKeys:Object.keys(patch||{}),payloadVehicle:patch&&patch.vehiculo?JSON.parse(JSON.stringify(patch.vehiculo)):null,sumaAsegurada:patch&&patch.sumaAsegurada,options:options?JSON.parse(JSON.stringify(options)):null};
      const out=await engine.__b2OriginalUpdatePolicy.call(engine,id,patch,options);
      trace.result={ok:!!out?.ok,errors:[].concat(out?.errors||[]),vehicle:out?.vehicle?JSON.parse(JSON.stringify(out.vehicle)):null,operationId:String(out?.operationId||'')};
      window.__b2PolicyUpdateTrace.push(trace);
      return out;
    };
  });

  milestone('POLICY_EDIT_VALIDATION_START');
  await page.evaluate(id=>Orbit.modules.cliente360.editarPoliza(id),policy.id);
  await page.waitForSelector('#policy-v1199 [data-save]',{timeout:10000});
  need(Number(await page.inputValue('#policy-v1199 [data-sum]'))===100000,'B2_AUTH_POLICY_EDIT_PREFILL_MISSING');
  await page.fill('#policy-v1199 [data-sum]','115000');
  await page.fill('#policy-v1199 [data-reason]','');
  await page.click('#policy-v1199 [data-save]');
  await sleep(300);
  need(await page.locator('#policy-v1199').count()===1,'B2_AUTH_POLICY_EMPTY_REASON_MODAL_CLOSED');
  const reasonError=clean(await page.locator('#policy-v1199 [data-error]').innerText(),400);
  need(/motivo/i.test(reasonError),'B2_AUTH_POLICY_EMPTY_REASON_NO_CLEAR_VALIDATION:'+reasonError);
  const unchangedSnap=await dataCol(db,'polizas').doc(policy.id).get(),unchanged=unchangedSnap.data()||{};
  need(Number(unchanged.sumaAsegurada||0)===100000,'B2_AUTH_POLICY_EMPTY_REASON_WROTE_DATA');
  await page.fill('#policy-v1199 [data-reason]','B2 QA edición de póliza existente');
  await page.click('#policy-v1199 [data-save]');
  await page.waitForSelector('#policy-v1199',{state:'detached',timeout:30000});
  const policyEdited=await waitFor(async()=>{const s=await dataCol(db,'polizas').doc(policy.id).get(),d=s.data()||{};return Number(d.sumaAsegurada)===115000?d:null;},'B2_AUTH_POLICY_EDIT_READBACK',30000);
  need(!!policyEdited,'B2_AUTH_POLICY_EDIT_NOT_DURABLE');
  evidence.writes.synthetic+=1;
  milestone('POLICY_EDIT_READBACK',{sameId:true,sumaAsegurada:policyEdited.sumaAsegurada});
  await page.reload({waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(id=>window.Orbit&&Orbit.store&&Orbit.store.get('polizas',id)&&Number(Orbit.store.get('polizas',id).sumaAsegurada)===115000,policy.id,{timeout:30000});
  evidence.policyEdit={sameId:true,emptyReasonBlocked:true,readback:true,reload:true,field:'sumaAsegurada'};
  milestone('POLICY_EDIT_RELOAD_PASS');

  await page.waitForFunction(id=>!!Orbit.store.get('vehiculos',id),vehicle.id,{timeout:15000});
  milestone('VEHICLE_DEDICATED_EDIT_START');
  await page.evaluate(id=>Orbit.modules.cliente360.editarVehiculo(id),vehicle.id);
  await page.waitForSelector('#vehicle-v1199 [data-vsave]',{timeout:10000});
  need(await page.inputValue('#vehicle-v1199 [data-vcolor]')==='Blanco','B2_AUTH_VEHICLE_EDIT_PREFILL_MISSING');
  await page.fill('#vehicle-v1199 [data-vcolor]','Azul');
  await page.fill('#vehicle-v1199 [data-vreason]','B2 QA actualización controlada de vehículo');
  await page.click('#vehicle-v1199 [data-vsave]');
  await page.waitForSelector('#vehicle-v1199',{state:'detached',timeout:30000});
  const vehicleEdited=await waitFor(async()=>{const s=await dataCol(db,'vehiculos').doc(vehicle.id).get();const d=s.data()||{};return d.color==='Azul'?d:null;},'B2_AUTH_VEHICLE_EDIT_READBACK',30000);
  need(!!vehicleEdited,'B2_AUTH_VEHICLE_EDIT_NOT_DURABLE');
  const vehicleCount=(await rowsBy(db,'vehiculos','polizaId',policy.id)).length;
  need(vehicleCount===1,'B2_AUTH_VEHICLE_EDIT_DUPLICATED:'+vehicleCount);
  need(vehicleEdited.polizaId===policy.id&&vehicleEdited.clienteId===client.id,'B2_AUTH_VEHICLE_RELATION_CHANGED');
  await page.reload({waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(({vid,pid})=>{const v=Orbit.store&&Orbit.store.get('vehiculos',vid);return !!v&&v.color==='Azul'&&v.polizaId===pid;},{vid:vehicle.id,pid:policy.id},{timeout:30000});
  evidence.vehicleEdit={sameId:true,noDuplicate:true,readback:true,reload:true,policyLinkPreserved:true};
  milestone('VEHICLE_EDIT_RELOAD_PASS',{vehicleCount});


  milestone('INSURER_SECURE_EDIT_START');
  const insurerId='b2-asg-'+stamp.toLowerCase(),portalId='portal-b2-'+stamp.toLowerCase(),syntheticSecret='B2-Preview-'+stamp+'-Secure',logoUrl=TARGET+'/assets/tenant/alianzas-soluciones/logo-oficial-360.png';
  state.insurerId=insurerId;
  await bounded(page.evaluate(async ({insurerId,portalId,stamp})=>{
    const tenantId=Orbit.access&&Orbit.access.tenantId?Orbit.access.tenantId():(Orbit.auth&&Orbit.auth.productUser&&Orbit.auth.productUser.tenantId)||'';
    const payload={id:insurerId,tenantId,nombre:'B2 QA Aseguradora '+stamp,pais:'GT',paises:['GT'],color:'#C5162E',vinculada:true,ramos:['Auto'],contactos:[],cuentas:[],docs:[],portales:[{id:portalId,nombre:'Portal B2 QA',tipo:'Portal',url:'https://example.com',usuario:'b2qa-'+stamp,credentialRef:'backend_required',estadoAcceso:'Requiere actualización'}]};
    return Orbit.store.batchDurable([{action:'insert',collection:'aseguradoras',id:insurerId,payload}],{requestId:'b2_asg_'+stamp,timeoutMs:20000});
  },{insurerId,portalId,stamp}),'B2_AUTH_INSURER_CREATE_TIMEOUT',30000);
  const insurerCreated=await waitFor(async()=>{const s=await dataCol(db,'aseguradoras').doc(insurerId).get();return s.exists?s.data():null;},'B2_AUTH_INSURER_CREATE_READBACK',30000);
  need(!!insurerCreated,'B2_AUTH_INSURER_CREATE_NOT_DURABLE');evidence.writes.synthetic+=1;
  await page.waitForFunction(id=>!!(Orbit.store&&Orbit.store.get('aseguradoras',id)),insurerId,{timeout:15000});
  await page.evaluate(id=>Orbit.modules.aseguradoras.ficha(id),insurerId);
  await page.waitForSelector('#asg-ficha #af-editar',{timeout:10000});
  await page.click('#asg-ficha #af-editar');
  await page.waitForSelector('#asg-ficha #af-logo',{timeout:10000});
  await page.fill('#asg-ficha #af-logo',logoUrl);
  await page.click('#asg-ficha [data-tab="plataformas"]');
  await page.waitForSelector('#asg-ficha [data-portal] [data-ppass]',{timeout:10000});
  await page.fill('#asg-ficha [data-portal] [data-ppass]',syntheticSecret);
  let insurerReasonDialog=false;
  page.once('dialog',async dialog=>{insurerReasonDialog=true;need(dialog.type()==='prompt','B2_AUTH_INSURER_REASON_UNEXPECTED_DIALOG:'+dialog.type());await dialog.accept('B2 QA aseguradora: logo y credencial segura');});
  await page.click('#asg-ficha #af-guardar');
  const insurerUpdated=await waitFor(async()=>{
    const s=await dataCol(db,'aseguradoras').doc(insurerId).get();if(!s.exists)return null;
    const d=s.data()||{},portal=[].concat(d.portales||[]).find(x=>String(x.id||'')===portalId);
    return d.logo===logoUrl&&portal&&/^cred_[a-f0-9]{32}$/.test(String(portal.credentialRef||''))?{...d,_portal:portal}:null;
  },'B2_AUTH_INSURER_EDIT_READBACK',45000);
  need(insurerReasonDialog===true,'B2_AUTH_INSURER_REASON_DIALOG_NOT_SEEN');
  need(!!insurerUpdated,'B2_AUTH_INSURER_EDIT_NOT_DURABLE');
  state.insurerCredentialRef=String(insurerUpdated._portal.credentialRef||'');
  evidence.writes.synthetic+=1;
  await page.reload({waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(({id,logo,ref})=>{
    const a=window.Orbit&&Orbit.store&&Orbit.store.get('aseguradoras',id),p=a&&[].concat(a.portales||[]).find(x=>String(x.credentialRef||'')===ref);
    return !!a&&a.logo===logo&&!!p;
  },{id:insurerId,logo:logoUrl,ref:state.insurerCredentialRef},{timeout:30000});
  await page.evaluate(id=>Orbit.modules.aseguradoras.ficha(id),insurerId);
  await page.waitForSelector('#asg-ficha .asg-logo img',{timeout:10000});
  need((await page.locator('#asg-ficha .asg-logo img').getAttribute('src'))===logoUrl,'B2_AUTH_INSURER_LOGO_REFRESH_MISMATCH');
  const revealProof=await bounded(page.evaluate(async ({ref,insurerId,expectedHash})=>{
    const out=await Orbit.secureResources.revealCredential(ref,{insurerId});
    const bytes=new TextEncoder().encode(String(out&&out.value||'')),digest=await crypto.subtle.digest('SHA-256',bytes),hashValue=Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join('');
    return{ok:!!(out&&out.ok),matches:hashValue===expectedHash,length:String(out&&out.value||'').length,preview:!!(Orbit.productInsurerCredentialProviderP0&&Orbit.productInsurerCredentialProviderP0.status().preview)};
  },{ref:state.insurerCredentialRef,insurerId,expectedHash:hash(syntheticSecret)}),'B2_AUTH_INSURER_CREDENTIAL_REVEAL_TIMEOUT',30000);
  need(revealProof.ok&&revealProof.matches&&revealProof.preview,'B2_AUTH_INSURER_CREDENTIAL_REVEAL_FAILED:'+JSON.stringify(revealProof));
  const secureCleanup=await bounded(page.evaluate(async ({ref,insurerId})=>Orbit.productInsurerCredentialProviderP0.previewCleanup(ref,{insurerId}),{ref:state.insurerCredentialRef,insurerId}),'B2_AUTH_INSURER_CREDENTIAL_CLEANUP_TIMEOUT',30000);
  need(secureCleanup&&secureCleanup.ok===true&&secureCleanup.removed===true,'B2_AUTH_INSURER_CREDENTIAL_CLEANUP_FAILED:'+JSON.stringify(secureCleanup));
  state.insurerCredentialCleaned=true;
  evidence.insurer={logoReadback:true,logoReload:true,credentialStoredPreviewIsolated:true,credentialRevealHashMatch:true,operativoWriteAuthorized:true,secureCleanup:true};
  milestone('INSURER_SECURE_EDIT_PASS',{logo:true,credential:true,cleanup:true});

  milestone('RENEWAL_RUNTIME_START');
  const renewal=await bounded(page.evaluate(async ({policyId,stamp,renewNo})=>{
    window.__b2RenewalDurableTrace=[];
    const originalUpdateDurable=Orbit.store.updateDurable.bind(Orbit.store);
    Orbit.store.updateDurable=async function(collection,id,patch){
      const before=Orbit.store.get(collection,id);
      const row={collection:String(collection||''),id:String(id||''),beforeExists:!!before,patchKeys:Object.keys(patch||{})};
      window.__b2RenewalDurableTrace.push(row);
      try{
        const out=await originalUpdateDurable(collection,id,patch);
        row.ok=true;row.afterExists=!!Orbit.store.get(collection,id);return out;
      }catch(e){
        row.ok=false;row.error=String(e&&e.message||e);throw e;
      }
    };
    try{
    const p=Orbit.store.get('polizas',policyId),c=Orbit.store.get('clientes',p.clienteId);
    const total=(+p.primaTotal||+p.primaNeta||1000)*1.05;
    const req=await Orbit.issuance.createRequest({
      tenantId:p.tenantId,clienteId:p.clienteId,asesorId:p.asesorId,aseguradoraId:p.aseguradoraId,
      pais:p.pais||c.pais,moneda:p.moneda||c.moneda,ramo:p.ramo,producto:p.producto||p.subramo,
      sourcePolicyId:p.id,acceptedConfirmed:true,primaNeta:1100,primaTotal:total,cuotas:2,frecuencia:'Semestral',
      formaPago:p.formaPago||'Transferencia',acceptedOffer:{aseguradoraId:p.aseguradoraId,pais:p.pais||c.pais,moneda:p.moneda||c.moneda,ramo:p.ramo,producto:p.producto||p.subramo,primaNeta:1100,primaTotal:total,cuotas:2,frecuencia:'Semestral',formaPago:p.formaPago||'Transferencia',conducto:p.conducto||'Cobro directo del intermediario',sourceRef:'b2qa-'+stamp,documentRef:'quote-b2qa-'+stamp}
    },{operationId:'b2qa_req_'+stamp,motivo:'B2 QA renovación controlada'});
    if(!req.ok)return{ok:false,phase:'request',errors:req.errors||[]};
    const ready=await Orbit.issuance.advanceRequest(req.request.id,'PENDIENTE_EMISION',{
      documentosCompletos:true,
      inspeccionAprobada:true,
      proximaAccion:'Recibir número real y póliza emitida'
    },{motivo:'B2 QA requisitos de emisión completados'});
    if(!ready.ok)return{ok:false,phase:'advance',errors:ready.errors||[]};
    const issued=await Orbit.issuance.issueRequest(req.request.id,{
      numero:renewNo,documentRef:'policy-b2qa-'+stamp,vigenciaInicio:p.vigenciaFin||'2027-09-20',vigenciaFin:'2028-09-20',
      frecuencia:'Semestral',cuotas:2,formaPago:p.formaPago||'Transferencia',conducto:p.conducto||'Cobro directo del intermediario',
      primaNeta:1100,gastosEmision:55,sourceRef:'b2qa-'+stamp
    },{operationId:'b2qa_emit_'+stamp,motivo:'B2 QA emisión real de renovación'});
    return{ok:!!issued.ok,phase:'issue',errors:issued.errors||[],requestId:req.request.id,policyId:issued.policy&&issued.policy.id,durableTrace:window.__b2RenewalDurableTrace};
    }catch(e){
      return{ok:false,phase:'exception',errors:[String(e&&e.message||e)],durableTrace:window.__b2RenewalDurableTrace};
    }finally{
      Orbit.store.updateDurable=originalUpdateDurable;
    }
  },{policyId:policy.id,stamp,renewNo}),'B2_AUTH_RENEWAL_EVALUATE_TIMEOUT',60000);
  milestone('RENEWAL_RUNTIME_RETURN',{ok:renewal&&renewal.ok,phase:renewal&&renewal.phase,errors:renewal&&renewal.errors||[],durableTrace:renewal&&renewal.durableTrace||[]});
  need(renewal.ok,'B2_AUTH_RENEWAL_RUNTIME_FAILED:'+JSON.stringify(renewal));
  state.requestId=renewal.requestId;state.renewedPolicyId=renewal.policyId;
  const renewed=await waitFor(()=>oneBy(db,'polizas','numero',renewNo),'B2_AUTH_RENEWED_POLICY_READBACK',30000);
  need(renewed.renuevaDe===policy.id,'B2_AUTH_RENEWED_POLICY_SOURCE_LINK_MISSING');
  const sourceAfter=await waitFor(async()=>{
    const snap=await dataCol(db,'polizas').doc(policy.id).get();
    return snap.exists&&snap.data()?.renovadaPor===renewed.id?snap.data():null;
  },'B2_AUTH_SOURCE_RENOVADA_POR_READBACK',30000);
  need(sourceAfter.renovadaPor===renewed.id,'B2_AUTH_SOURCE_RENOVADA_POR_MISSING');
  const renewalReceipts=await rowsBy(db,'recibosEsperados','polizaId',renewed.id),renewalPortfolio=await rowsBy(db,'carteraPrimas','polizaId',renewed.id),renewalCobros=await rowsBy(db,'cobros','polizaId',renewed.id);
  need(renewalReceipts.length>0&&renewalPortfolio.filter(x=>x.carteraActiva!==false).length>0,'B2_AUTH_RENEWAL_RECEIPTS_PORTFOLIO_MISSING');
  need(renewalCobros.length===0,'B2_AUTH_RENEWAL_CREATED_CONFIRMED_COBRO');
  evidence.crud={clientIdHash:hash(client.id),policyIdHash:hash(policy.id),vehicleIdHash:hash(vehicle.id),clientCreateReadback:true,clientEditReadback:true,policyCreateReadback:true,policyEditReadback:true,policyEditReload:true,advisorSellerReadback:true,vehicleCreateReadback:true,vehicleEditSameId:true,vehicleEditReload:true,receipts:receipts.length,portfolio:portfolio.length,cobros:0,dirtyBackdropProtected:true};
  evidence.renewal={requestIdHash:hash(renewal.requestId),newPolicyIdHash:hash(renewed.id),sourceLink:true,receipts:renewalReceipts.length,portfolio:renewalPortfolio.length,cobros:0,awaitedRuntime:true};
  milestone('RENEWAL_READBACK',{receipts:renewalReceipts.length,portfolio:renewalPortfolio.length});
  need(pageErrors.length===0,'B2_AUTH_PAGE_ERRORS:'+JSON.stringify(pageErrors.slice(0,5)));
  evidence.pageErrors=[];evidence.status='PASS';
}catch(error){
  evidence.status='FAIL';evidence.errors.push(clean(error?.stack||error?.message||error,6000));throw error;
}finally{
  try{
    if(page&&state.insurerCredentialRef&&!state.insurerCredentialCleaned){
      const out=await bounded(page.evaluate(async ({ref,insurerId})=>Orbit.productInsurerCredentialProviderP0.previewCleanup(ref,{insurerId}),{ref:state.insurerCredentialRef,insurerId:state.insurerId}),'B2_AUTH_INSURER_CREDENTIAL_FINAL_CLEANUP_TIMEOUT',30000);
      state.insurerCredentialCleaned=!!(out&&out.ok);
      evidence.cleanup.previewCredentialRemoved=state.insurerCredentialCleaned;
    }
  }catch(e){evidence.cleanup.previewCredentialError=clean(e?.message||e,1200);}
  try{
    if(app){
      const db=getFirestore(app);
      milestone('CLEANUP_START',{client:!!state.clientId,policy:!!state.policyId,renewed:!!state.renewedPolicyId,insurer:!!state.insurerId});
      evidence.cleanup.deleted=await bounded(cleanupSynthetic(db,state),'B2_AUTH_CLEANUP_TIMEOUT',60000);
      milestone('CLEANUP_DELETED',{deleted:evidence.cleanup.deleted});
      evidence.writes.cleanup=evidence.cleanup.deleted;
      if(state.clientId){
        const still=await dataCol(db,'clientes').doc(state.clientId).get();
        evidence.cleanup.clientAbsent=!still.exists;
      }
      if(state.insurerId){
        const stillInsurer=await dataCol(db,'aseguradoras').doc(state.insurerId).get();
        evidence.cleanup.insurerAbsent=!stillInsurer.exists;
      }
    }
  }catch(e){evidence.cleanup.error=clean(e?.message||e,1200);}
  try{if(context)await context.close();}catch{}
  try{if(browser)await browser.close();}catch{}
  try{if(app)await deleteApp(app);}catch{}
  fs.writeFileSync(OUT,JSON.stringify(evidence,null,2)+'\n');
}
need(evidence.status==='PASS','B2_AUTH_NOT_PASS');
need(evidence.cleanup.clientAbsent===true,'B2_AUTH_CLEANUP_CLIENT_REMAINS');
need(evidence.cleanup.insurerAbsent===true,'B2_AUTH_CLEANUP_INSURER_REMAINS');
need(state.insurerCredentialCleaned===true,'B2_AUTH_CLEANUP_PREVIEW_CREDENTIAL_REMAINS');
console.log('I65_B2_AUTHENTICATED_PREVIEW=PASS');
console.log('I65_B2_ACTIVE_ROLE_SCOPE=PASS');
console.log('I65_B2_CLIENT_CREATE_EDIT=PASS');
console.log('I65_B2_POLICY_SELLER=PASS');
console.log('I65_B2_VEHICLE_CREATE_EDIT=PASS');
console.log('I65_B2_INSURER_LOGO_CREDENTIAL=PASS');
console.log('I65_B2_RENEWAL_REAL_POLICY=PASS');
console.log('I65_B2_CONFIRMED_COBRO_CREATED=0');
console.log('I65_B2_SYNTHETIC_CLEANUP=PASS');
