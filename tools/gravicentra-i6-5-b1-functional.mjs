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
const OUT=process.env.B1_PROOF_FILE||path.join(process.env.RUNNER_TEMP||process.cwd(),'b1-proof.json');
const RUN=String(process.env.GITHUB_RUN_ID||Date.now());
const clean=(v,m=500)=>String(v==null?'':v).trim().slice(0,m);
const norm=v=>clean(v,180).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const need=(v,c)=>{if(!v)throw new Error(c);};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const uniq=a=>[...new Set([].concat(a||[]).map(x=>clean(x,180)).filter(Boolean))];
const evidenceDir=path.dirname(OUT);
fs.mkdirSync(evidenceDir,{recursive:true});
need(TENANT,'B1_TENANT_HINT_REQUIRED');
need(/^https:\/\/.+\.web\.app$/.test(TARGET),'B1_TARGET_INVALID');

function sa(){
  for(const k of['SA_DEFAULT','SA_ORBIT360_LAB','SA_ORBIT_360_LAB']){
    try{
      const x=JSON.parse(process.env[k]||'');
      if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.private_key)return x;
    }catch{}
  }
  if(process.env.GOOGLE_APPLICATION_CREDENTIALS){
    const x=JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS,'utf8'));
    if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.private_key)return x;
  }
  throw new Error('B1_SERVICE_ACCOUNT');
}
function roles(m){return uniq([...(m?.roles||[]),...(m?.rolesAsignados||[]),...(m?.assignedRoles||[]),m?.role,m?.rol,m?.rolDefault,m?.defaultRole,m?.activeRole]);}
function slug(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'usuario';}
function semanticAdvisor(row){
  row=row||{};
  return {
    nombre:clean(row.nombre||row.name,180),
    email:clean(row.email||row.correo,320).toLowerCase(),
    telefono:clean(row.telefono||row.phone,120),
    roles:uniq(row.roles&&row.roles.length?row.roles:[row.rolDefault||row.rol]),
    rolDefault:clean(row.rolDefault||row.rol,100),
    scopeDatos:clean(row.scopeDatos||row.dataScope||'propios',40)||'propios',
    paises:uniq(row.paises&&row.paises.length?row.paises:[row.paisDefault||row.pais]).map(x=>x.toUpperCase()),
    paisDefault:clean(row.paisDefault||row.pais,20).toUpperCase(),
    modulosExtra:uniq(row.modulosExtra||row.modulesExtra),
    modulosRestringidos:uniq(row.modulosRestringidos||row.modulesRestricted),
    accessProvisioned:row.accessProvisioned===true,
    authUid:clean(row.authUid||row.uid||row.userId,180)
  };
}
function sameSet(a,b){return JSON.stringify(uniq(a).sort())===JSON.stringify(uniq(b).sort());}
async function waitFor(fn,label,timeout=20000,interval=250){
  const end=Date.now()+timeout;let last;
  while(Date.now()<end){
    try{const v=await fn();if(v)return v;last=v;}catch(e){last=e;}
    await sleep(interval);
  }
  throw new Error(label+':'+clean(last&&last.message||last||'timeout',500));
}

async function actor(db,auth){
  const snap=await db.collection('tenants').doc(TENANT).collection('members').get(),rows=[];
  for(const d of snap.docs){
    const m=d.data()||{},st=norm(m.status||m.estado||'active');
    if(m.active===false||m.activo===false||['inactive','inactivo','blocked','bloqueado','suspended','suspendido'].includes(st))continue;
    const candidates=uniq([d.id,m.uid]);
    for(const uid of candidates){
      try{
        const u=await auth.getUser(uid);if(u.disabled)continue;
        const rr=roles(m),manager=rr.some(r=>['direccion','superadmin','super_admin','admintenant','admin_tenant','admin'].includes(norm(r)));
        rows.push({uid,score:(manager?100:0)+(u.emailVerified?5:0),roles:rr,email:u.email||''});
        break;
      }catch{}
    }
  }
  rows.sort((a,b)=>b.score-a.score);
  need(rows.length,'B1_NO_ACTIVE_ACTOR');
  need(rows[0].score>=100,'B1_NO_MANAGER_ACTOR');
  return rows[0];
}
async function activate(page,auth,a){
  const tok=await auth.createCustomToken(a.uid,{b1Forensic:true});
  await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:20000});
  const st=await page.evaluate(async t=>{
    const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();
    if(!c.auth.currentUser)await c.modules.auth.signInWithCustomToken(c.auth,t);
    return Orbit.productAppP0.status?.().started?Orbit.productAppP0.status():Orbit.productAppP0.activate();
  },tok);
  need(st?.started,'B1_APP_START');
}
async function waitAdvisorHydration(page){
  await page.waitForFunction(()=>{
    const s=window.Orbit?.store?._productStatus?.();
    return !!s&&window.Orbit?.store?.__productOperationalWriteP0===true&&Array.isArray(s.serverConfirmedCollections)&&s.serverConfirmedCollections.includes('asesores');
  },null,{timeout:25000});
  return page.evaluate(()=>({
    status:Orbit.store._productStatus(),
    rows:(Orbit.store.all('asesores')||[]).map(r=>({
      id:String(r.id||''),canonicalDocumentId:String(r.canonicalDocumentId||''),
      projectionOnly:r.projectionOnly===true,nombre:String(r.nombre||''),email:String(r.email||'')
    }))
  }));
}
async function renderEquipo(page){
  await page.evaluate(()=>{
    const h=document.getElementById('host')||document.getElementById('mod-host');
    Orbit.modules.equipo.render(h);
  });
  await page.waitForSelector('#eq-add',{timeout:10000});
}
async function acceptLegalGate(page,timeout=7000){
  const gate=page.locator('[data-legal-gate]').last();
  const appeared=await gate.waitFor({state:'visible',timeout}).then(()=>true).catch(()=>false);
  if(!appeared) return false;
  await gate.locator('#lg-chk').check();
  await gate.locator('#lg-ok').click();
  await gate.waitFor({state:'detached',timeout:10000});
  return true;
}
async function reopen(page,id){
  await acceptLegalGate(page,3000);
  await renderEquipo(page);
  await page.evaluate(v=>Orbit.modules.equipo.editar(v),id);
  await page.waitForSelector('#eq-edit #eu-ok',{timeout:10000});
  await acceptLegalGate(page,3000);
  await page.waitForSelector('#eu-access-panel',{timeout:5000}).catch(()=>{});
}
async function reloadAuthenticated(page,auth,a){
  await page.reload({waitUntil:'domcontentloaded',timeout:30000});
  await activate(page,auth,a);
  await waitAdvisorHydration(page);
  await acceptLegalGate(page,8000);
}
async function submitCustomPrompt(page,reason,label){
  const input=page.locator('.drawer-back [data-in]').last();
  await input.waitFor({state:'visible',timeout:8000});
  const title=await input.locator('xpath=ancestor::div[contains(@class,"drawer-back")]').innerText().catch(()=> '');
  need(/Motivo/i.test(title),label+'_CUSTOM_PROMPT_TITLE');
  await input.fill(reason);
  const overlay=input.locator('xpath=ancestor::div[contains(@class,"drawer-back")]');
  await overlay.locator('[data-yes]').click();
}
async function canonical(db,id){
  const s=await db.collection('tenants').doc(TENANT).collection('data').doc('asesores').collection('items').doc(id).get();
  return s.exists?{id:s.id,...s.data()}:null;
}
async function authByEmail(auth,email){
  try{return await auth.getUserByEmail(email);}catch(e){if(e?.code==='auth/user-not-found')return null;throw e;}
}
async function cleanupSynthetic({db,auth,id,email,uid}){
  const receipt={advisorDeleted:false,memberDeleted:false,authDeleted:false,auditDeleted:0,onboardingDeleted:0,onboardingAuditDeleted:0};
  const tenant=db.collection('tenants').doc(TENANT);
  const advisor=tenant.collection('data').doc('asesores').collection('items').doc(id);
  if((await advisor.get()).exists){await advisor.delete();receipt.advisorDeleted=true;}
  let user=uid?await auth.getUser(uid).catch(()=>null):await authByEmail(auth,email);
  const memberUid=user?.uid||uid||'';
  if(memberUid){
    const mr=tenant.collection('members').doc(memberUid);
    if((await mr.get()).exists){await mr.delete();receipt.memberDeleted=true;}
  }
  if(user){await auth.deleteUser(user.uid);receipt.authDeleted=true;}

  const aud=await tenant.collection('data').doc('auditoria').collection('items').get();
  for(const d of aud.docs){
    const x=d.data()||{},be=String(x.before?.email||'').toLowerCase(),ae=String(x.after?.email||'').toLowerCase();
    if(be===email||ae===email){await d.ref.delete();receipt.auditDeleted++;}
  }
  const req=await tenant.collection('onboardingRequests').where('advisorId','==',id).get().catch(()=>null);
  for(const d of req?.docs||[]){await d.ref.delete();receipt.onboardingDeleted++;}
  const hash=crypto.createHash('sha256').update(id).digest('hex');
  const aev=await tenant.collection('auditEvents').get().catch(()=>null);
  for(const d of aev?.docs||[]){
    if(String(d.data()?.advisorIdHash||'')===hash){await d.ref.delete();receipt.onboardingAuditDeleted++;}
  }
  return receipt;
}

const sourceFiles=[
  'orbit360-platform/index.html',
  'orbit360-platform/core/public-tenant-branding.js',
  'orbit360-platform/core/tenant-access-policy-effective-p0.js',
  'orbit360-platform/data/store-firestore-product-readonly-p0.js',
  'orbit360-platform/modules/equipo.js',
  'orbit360-platform/modules/equipo-onboarding-v20260804-bridge.js',
  'functions/tenant-branding.js',
  'functions/product-operational-domain.js',
  'functions/user-onboarding.js'
];
const source=Object.fromEntries(sourceFiles.map(p=>[p,fs.readFileSync(p,'utf8')]));
const ev={
  schema:'GRAVICENTRA_I6_5_B1_PREVIEW_PROOF_V3',
  status:'FAIL',
  target:TARGET,
  writes:{advisorOperational:0,auditOperational:0,normalizationExcludedFromThisProof:true,syntheticCleanup:0,authSynthetic:0,membershipSynthetic:0},
  branding:{},
  team:{},
  auth:{},
  backend:{},
  nativeUi:{promptCalls:0,alertCalls:0,customReasonPrompts:0},
  cleanup:{},
  errors:[]
};

let app,browser,context,page,synthetic={id:'',email:'',uid:''},realRollback=null;
try{
  app=initializeApp({credential:cert(sa()),projectId:PROJECT},'b1-proof-v3');
  const db=getFirestore(app),auth=getAuth(app);
  const brandingSnap=await db.collection('tenants').doc(TENANT).collection('config').doc('branding').get();
  need(brandingSnap.exists,'B1_BRANDING_CONFIG_MISSING');
  const branding=brandingSnap.data()||{};
  ev.branding.firestore={
    displayName:clean(branding.displayName),legalName:clean(branding.legalName),
    logo:clean(branding.logo,350000),favicon:clean(branding.favicon,350000)
  };
  need(ev.branding.firestore.displayName&&ev.branding.firestore.logo&&ev.branding.firestore.favicon,'B1_BRANDING_CONFIG_INCOMPLETE');
  need(!source['orbit360-platform/index.html'].includes(ev.branding.firestore.displayName)&&!source['orbit360-platform/core/public-tenant-branding.js'].includes(ev.branding.firestore.displayName),'B1_TENANT_LITERAL_IN_SOURCE');
  need(/canonicalDocumentId/.test(source['orbit360-platform/data/store-firestore-product-readonly-p0.js']),'B1_CANONICAL_DOCUMENT_ID_NOT_EXPOSED');
  need(/asesores:\s*\{\s*module:\s*'equipo'/.test(source['orbit360-platform/core/tenant-access-policy-effective-p0.js']),'B1_ADVISOR_QUERY_POLICY_MISSING');
  need(!/window\.prompt\(/.test(source['orbit360-platform/modules/equipo.js'])&&!/window\.prompt\(/.test(source['orbit360-platform/modules/equipo-onboarding-v20260804-bridge.js']),'B1_NATIVE_PROMPT_SOURCE');
  need(!/\breturn\s+alert\s*\(/.test(source['orbit360-platform/modules/equipo.js'])&&!/\breturn\s+alert\s*\(/.test(source['orbit360-platform/modules/equipo-onboarding-v20260804-bridge.js']),'B1_NATIVE_ALERT_SOURCE');

  browser=await chromium.launch({headless:true});
  context=await browser.newContext({viewport:{width:1500,height:1000}});
  page=await context.newPage();
  const pageErrors=[],consoleEvents=[];
  page.on('pageerror',e=>pageErrors.push(clean(e?.message||e)));
  page.on('console',m=>consoleEvents.push({type:m.type(),text:clean(m.text(),1200)}));

  let brandingReleased=false;
  await page.route('**/orbit360TenantBranding',async route=>{
    if(!brandingReleased){await sleep(2200);brandingReleased=true;}
    await route.continue();
  });
  await page.goto(TARGET+'/?b1r3='+Date.now(),{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForSelector('[data-login-tenant-logo]',{timeout:1500});
  ev.branding.firstPaint=await page.evaluate(()=> {
    const img=document.querySelector('[data-login-tenant-logo]'),r=img?.getBoundingClientRect(),b=Orbit.publicTenantBranding?.current?.()||{};
    const card=document.querySelector('[data-login-company-brand]')?.getBoundingClientRect();
    return {
      source:String(b.source||''),displayName:String(b.displayName||''),
      rect:r?{x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height)}:null,
      card:card?{x:Math.round(card.x),y:Math.round(card.y),width:Math.round(card.width),height:Math.round(card.height)}:null,
      objectFit:img?getComputedStyle(img).objectFit:'',objectPosition:img?getComputedStyle(img).objectPosition:'',
      loginText:String(document.getElementById('login')?.innerText||'')
    };
  });
  await page.screenshot({path:path.join(evidenceDir,'b1-branding-first-paint.png'),fullPage:true});
  need(ev.branding.firstPaint.source==='build-snapshot','B1_FIRST_PAINT_NOT_BUILD_SNAPSHOT');
  need(ev.branding.firstPaint.rect?.width>0&&ev.branding.firstPaint.rect?.height>0,'B1_FIRST_PAINT_LOGO_MISSING');
  need(ev.branding.firstPaint.objectFit==='contain','B1_FIRST_PAINT_OBJECT_FIT');
  need(!ev.branding.firstPaint.loginText.includes(ev.branding.firestore.displayName),'B1_VISIBLE_TENANT_TEXT_DUPLICATION');

  await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-tenant-branding-loading'),null,{timeout:10000});
  await sleep(300);
  ev.branding.settled=await page.evaluate(()=> {
    const img=document.querySelector('[data-login-tenant-logo]'),r=img?.getBoundingClientRect(),b=Orbit.publicTenantBranding?.current?.()||{};
    return {source:String(b.source||''),rect:r?{x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height)}:null,objectFit:img?getComputedStyle(img).objectFit:'',objectPosition:img?getComputedStyle(img).objectPosition:''};
  });
  await page.screenshot({path:path.join(evidenceDir,'b1-branding-settled.png'),fullPage:true});
  need(JSON.stringify(ev.branding.firstPaint.rect)===JSON.stringify(ev.branding.settled.rect),'B1_BRANDING_LAYOUT_SHIFT');
  need(ev.branding.settled.objectFit==='contain','B1_SETTLED_OBJECT_FIT');

  await page.fill('#lg-user','b1.invalid@example.invalid');
  await page.fill('#lg-pass','InvalidPass123*');
  await page.click('#login-form button[type="submit"]');
  await page.waitForTimeout(700);
  need(await page.locator('#login-error').count()===1,'B1_DUP_LOGIN_ERROR');

  const a=await actor(db,auth);
  ev.auth.proofActor={roles:a.roles,emailHash:crypto.createHash('sha256').update(a.email||'').digest('hex')};
  await activate(page,auth,a);
  const hydrated=await waitAdvisorHydration(page);
  ev.auth.managerLegalGateAccepted=await acceptLegalGate(page,8000);
  ev.team.hydration={
    serverConfirmed:hydrated.status.serverConfirmedCollections?.includes('asesores')===true,
    count:hydrated.rows.length,
    projectionOnlyCount:hydrated.rows.filter(x=>x.projectionOnly).length,
    canonicalIdMissingCount:hydrated.rows.filter(x=>!x.canonicalDocumentId).length
  };
  need(ev.team.hydration.serverConfirmed,'B1_ADVISORS_NOT_SERVER_CONFIRMED');
  need(ev.team.hydration.projectionOnlyCount===0,'B1_ADVISOR_PROJECTION_STILL_ACTIVE');
  need(ev.team.hydration.canonicalIdMissingCount===0,'B1_CANONICAL_ID_MISSING');

  await page.evaluate(()=>{
    window.__b1NativeCalls=[];
    window.prompt=function(){window.__b1NativeCalls.push('prompt');throw new Error('B1_NATIVE_PROMPT_USED');};
    window.alert=function(){window.__b1NativeCalls.push('alert');throw new Error('B1_NATIVE_ALERT_USED');};
  });

  const advisorCollection=db.collection('tenants').doc(TENANT).collection('data').doc('asesores').collection('items');
  const canonicalSnap=await advisorCollection.get();
  const canonicalRows=canonicalSnap.docs.map(d=>({id:d.id,...d.data()}));
  ev.team.hydration.canonicalFirestoreCount=canonicalSnap.size;
  ev.team.hydration.runtimeIds=hydrated.rows.map(x=>x.id).sort();
  ev.team.hydration.canonicalFirestoreIds=canonicalSnap.docs.map(d=>d.id).sort();
  need(hydrated.rows.length===canonicalSnap.size,'B1_RUNTIME_CANONICAL_ADVISOR_COUNT_MISMATCH:'+JSON.stringify(ev.team.hydration));
  need(ev.team.hydration.canonicalFirestoreIds.every(id=>ev.team.hydration.runtimeIds.includes(id)),'B1_RUNTIME_CANONICAL_ADVISOR_IDS_MISMATCH:'+JSON.stringify(ev.team.hydration));
  const incomplete=canonicalRows.find(r=>{
    const q=semanticAdvisor(r);
    return !clean(r.authUid||r.uid||r.userId,180) && (!q.roles.length||!q.paises.length||!q.rolDefault||!q.paisDefault);
  });
  need(incomplete,'B1_NO_EXISTING_INCOMPLETE_USER');
  const beforeIncomplete=semanticAdvisor(incomplete),incompleteRef=advisorCollection.doc(incomplete.id);
  const incompleteBeforeSnap=await incompleteRef.get(),incompleteUpdateBefore=incompleteBeforeSnap.updateTime?.toMillis?.()||0;
  ev.team.incompleteExisting={advisorId:incomplete.id,incomplete:true,before:beforeIncomplete};

  await reopen(page,incomplete.id);
  ev.team.incompleteExisting.uiIdentity=await page.evaluate(id=>{
    const row=Orbit.store.get('asesores',id);
    const roles=[].concat(row?.roles&&row.roles.length?row.roles:(row?.rol?[row.rol]:[])).filter(Boolean);
    const countries=[].concat(row?.paises&&row.paises.length?row.paises:(row?.pais?[row.pais]:[])).filter(Boolean);
    return row?{
      id:String(row.id||''),canonicalDocumentId:String(row.canonicalDocumentId||''),
      legacyDataId:String(row.legacyDataId||''),projectionOnly:row.projectionOnly===true,
      nombre:String(row.nombre||''),roles,countries,
      roleDefault:String(row.rolDefault||row.rol||''),countryDefault:String(row.paisDefault||row.pais||'')
    }:null;
  },incomplete.id);
  need(ev.team.incompleteExisting.uiIdentity&&!ev.team.incompleteExisting.uiIdentity.projectionOnly,'B1_INCOMPLETE_USER_NOT_CANONICAL_UI');
  const missing=await page.evaluate(()=>({
    roles:[...document.querySelectorAll('.eu-role:checked')].map(x=>x.value),
    countries:[...document.querySelectorAll('.eu-pais:checked')].map(x=>x.value),
    roleDefault:String(document.querySelector('#eu-role-default')?.value||''),
    countryDefault:String(document.querySelector('#eu-pais-default')?.value||'')
  }));
  ev.team.incompleteExisting.form=missing;
  let expectedValidation='';
  if(!missing.roles.length) expectedValidation='Selecciona al menos un rol.';
  else if(!missing.countries.length) expectedValidation='Selecciona al menos un país autorizado.';
  else if(!missing.roles.includes(missing.roleDefault)) expectedValidation='El rol predeterminado debe estar entre los roles seleccionados.';
  else if(!missing.countries.includes(missing.countryDefault)) expectedValidation='El país predeterminado debe estar entre los países seleccionados.';
  need(expectedValidation,'B1_EXISTING_USER_NOT_INCOMPLETE_AS_EXPECTED');
  await page.click('#eu-ok');
  const validationModal=page.locator('.drawer-back').filter({hasText:expectedValidation}).last();
  await validationModal.waitFor({state:'visible',timeout:8000});
  need(await validationModal.locator('[data-ok]').count()===1,'B1_INCOMPLETE_VALIDATION_NOT_ORBIT_UI');
  ev.team.incompleteExisting.validation={message:expectedValidation,orbitUi:true,writeAttempted:false};
  await validationModal.locator('[data-ok]').click();
  await validationModal.waitFor({state:'detached',timeout:8000});
  const incompleteAfterSnap=await incompleteRef.get(),incompleteUpdateAfter=incompleteAfterSnap.updateTime?.toMillis?.()||0;
  need(incompleteUpdateAfter===incompleteUpdateBefore,'B1_INCOMPLETE_VALIDATION_MUTATED_RECORD');
  need(JSON.stringify(semanticAdvisor(incompleteAfterSnap.data()||{}))===JSON.stringify(beforeIncomplete),'B1_INCOMPLETE_VALIDATION_CHANGED_DATA');
  await page.click('#eu-cancel');
  await page.waitForSelector('#eq-edit',{state:'detached',timeout:8000});

  const syntheticName='B1 R3 Synthetic '+RUN;
  synthetic.id='ase-'+slug(syntheticName);
  synthetic.email=('b1.r3.'+RUN+'@example.com').toLowerCase();
  need(!(await canonical(db,synthetic.id)),'B1_SYNTHETIC_ID_PREEXISTS');
  need(!(await authByEmail(auth,synthetic.email)),'B1_SYNTHETIC_AUTH_PREEXISTS');

  await acceptLegalGate(page,3000);
  await renderEquipo(page);
  await acceptLegalGate(page,3000);
  await page.click('#eq-add');
  await page.waitForSelector('#eq-edit #eu-ok',{timeout:10000});
  await page.waitForSelector('#eu-access-panel',{timeout:5000}).catch(()=>{});
  await page.fill('#eu-nombre',syntheticName);
  await page.fill('#eu-email',synthetic.email);
  await page.locator('.eu-role').evaluateAll(es=>es.forEach(e=>{e.checked=false;e.dispatchEvent(new Event('change',{bubbles:true}));}));
  await page.locator('.eu-role[value="Asesor"]').check();
  await page.locator('.eu-pais').evaluateAll(es=>es.forEach(e=>{e.checked=false;e.dispatchEvent(new Event('change',{bubbles:true}));}));
  await page.locator('.eu-pais[value="GT"]').check();
  await page.selectOption('#eu-role-default','Asesor');
  await page.selectOption('#eu-pais-default','GT');
  await page.selectOption('#eu-scope','propios');
  if(await page.locator('#eu-sync-access').count())await page.locator('#eu-sync-access').uncheck();
  await page.click('#eu-ok');
  await page.waitForSelector('#eq-edit',{state:'detached',timeout:15000});
  const created=await waitFor(async()=>await canonical(db,synthetic.id),'B1_SYNTHETIC_CREATE_READBACK');
  ev.writes.advisorOperational++;ev.writes.auditOperational++;
  need(!(await authByEmail(auth,synthetic.email)),'B1_AUTH_CREATED_WITHOUT_EXPLICIT_ACCESS');
  ev.team.synthetic={advisorId:synthetic.id,created:true,authAbsentBeforeExplicitProvision:true};

  await reloadAuthenticated(page,auth,a);
  await reopen(page,synthetic.id);
  need((await page.inputValue('#eu-email')).toLowerCase()===synthetic.email,'B1_SYNTHETIC_CREATE_REFRESH_EMAIL');
  need(await page.locator('.eu-role[value="Asesor"]').isChecked(),'B1_SYNTHETIC_CREATE_REFRESH_ROLE');
  need(await page.locator('.eu-pais[value="GT"]').isChecked(),'B1_SYNTHETIC_CREATE_REFRESH_COUNTRY');

  const syntheticPhone='+502 5555 0101';
  await page.fill('#eu-tel',syntheticPhone);
  if(await page.locator('#eu-sync-access').count())await page.locator('#eu-sync-access').uncheck();
  await page.click('#eu-ok');
  await page.waitForSelector('#eq-edit',{state:'detached',timeout:15000});
  await waitFor(async()=>{const x=await canonical(db,synthetic.id);return x&&clean(x.telefono,120)===syntheticPhone?x:null;},'B1_SYNTHETIC_EDIT_READBACK');
  ev.writes.advisorOperational++;ev.writes.auditOperational++;
  await reloadAuthenticated(page,auth,a);
  await reopen(page,synthetic.id);
  need((await page.inputValue('#eu-tel'))===syntheticPhone,'B1_SYNTHETIC_EDIT_REFRESH_NOT_PERSISTED');

  await page.fill('#eu-tel','');
  if(await page.locator('#eu-sync-access').count())await page.locator('#eu-sync-access').uncheck();
  await page.click('#eu-ok');
  await page.waitForSelector('#eq-edit',{state:'detached',timeout:15000});
  await waitFor(async()=>{const x=await canonical(db,synthetic.id);return x&&clean(x.telefono,120)===''?x:null;},'B1_SYNTHETIC_RESTORE_READBACK');
  ev.writes.advisorOperational++;ev.writes.auditOperational++;
  await reloadAuthenticated(page,auth,a);
  await reopen(page,synthetic.id);
  need((await page.inputValue('#eu-tel'))==='','B1_SYNTHETIC_RESTORE_REFRESH_NOT_PERSISTED');
  ev.team.synthetic.harmlessEditRestore={editReadback:true,refresh:true,restoreReadback:true,restoreRefresh:true};

  await page.locator('.eu-role[value="Operativo"]').check();
  await page.locator('.eu-pais[value="CO"]').check();
  await page.selectOption('#eu-scope','equipo');
  if(await page.locator('#eu-sync-access').count())await page.locator('#eu-sync-access').uncheck();
  const moduleChoice=await page.evaluate(()=>{
    const nav=new Set();
    (Orbit.NAV||[]).forEach(b=>{if(b.route)nav.add(b.route);(b.items||[]).forEach(i=>nav.add(i.route));});
    const selectedRoles=[...document.querySelectorAll('.eu-role:checked')].map(c=>c.value);
    const base=new Set();
    selectedRoles.forEach(role=>(Orbit.ROLES?.[role]?.modulos||[]).forEach(m=>base.add(typeof m==='string'?m:(m?.route||m?.id))));
    const rows=[...document.querySelectorAll('.eu-mod')].map(c=>({id:c.value,checked:c.checked,inBase:base.has(c.value)})).filter(x=>nav.has(x.id)&&!['inicio','equipo'].includes(x.id));
    return {
      restrict:(rows.find(x=>x.checked&&x.inBase)||{}).id||'',
      extra:(rows.find(x=>!x.checked&&!x.inBase)||{}).id||''
    };
  });
  need(moduleChoice.restrict&&moduleChoice.extra&&moduleChoice.restrict!==moduleChoice.extra,'B1_MODULE_TEST_CHOICES_MISSING');
  const modulesDetails=page.locator('#eu-mod-details');
  if(!(await modulesDetails.evaluate(el=>el.open))) await modulesDetails.locator('summary').click();
  await page.locator('.eu-mod[value="'+moduleChoice.restrict+'"]').uncheck();
  await page.locator('.eu-mod[value="'+moduleChoice.extra+'"]').check();

  const savePromise=page.click('#eu-ok');
  await submitCustomPrompt(page,'Prueba B1 R3 reversible de rol país alcance y módulos','B1_SENSITIVE_REASON');
  ev.nativeUi.customReasonPrompts++;
  await savePromise;
  await page.waitForSelector('#eq-edit',{state:'detached',timeout:15000});
  const sensitive=await waitFor(async()=>{
    const x=await canonical(db,synthetic.id);if(!x)return null;
    const q=semanticAdvisor(x);
    return q.roles.includes('Asesor')&&q.roles.includes('Operativo')&&q.paises.includes('GT')&&q.paises.includes('CO')&&q.scopeDatos==='equipo'&&q.modulosExtra.includes(moduleChoice.extra)&&q.modulosRestringidos.includes(moduleChoice.restrict)?x:null;
  },'B1_SYNTHETIC_SENSITIVE_READBACK');
  ev.writes.advisorOperational++;ev.writes.auditOperational++;
  ev.team.synthetic.sensitive={
    roles:semanticAdvisor(sensitive).roles,paises:semanticAdvisor(sensitive).paises,scopeDatos:semanticAdvisor(sensitive).scopeDatos,
    extraModule:moduleChoice.extra,restrictedModule:moduleChoice.restrict,customReasonUi:true
  };
  need(!(await authByEmail(auth,synthetic.email)),'B1_AUTH_CREATED_DURING_CONFIG_ONLY_EDIT');

  await reloadAuthenticated(page,auth,a);
  await reopen(page,synthetic.id);
  need(await page.locator('.eu-role[value="Operativo"]').isChecked(),'B1_ROLE_REFRESH_NOT_PERSISTED');
  need(await page.locator('.eu-pais[value="CO"]').isChecked(),'B1_COUNTRY_REFRESH_NOT_PERSISTED');
  need((await page.inputValue('#eu-scope'))==='equipo','B1_SCOPE_REFRESH_NOT_PERSISTED');
  need(!(await page.locator('.eu-mod[value="'+moduleChoice.restrict+'"]').isChecked()),'B1_RESTRICTED_MODULE_REFRESH_NOT_PERSISTED');
  need(await page.locator('.eu-mod[value="'+moduleChoice.extra+'"]').isChecked(),'B1_EXTRA_MODULE_REFRESH_NOT_PERSISTED');

  const accessButton=page.locator('#eu-access-now');
  await accessButton.waitFor({state:'visible',timeout:8000});
  const accessClick=accessButton.click();
  await submitCustomPrompt(page,'Prueba B1 R3 de alta Auth sintética reversible','B1_ACCESS_REASON');
  ev.nativeUi.customReasonPrompts++;
  await accessClick;
  const authUser=await waitFor(async()=>await authByEmail(auth,synthetic.email),'B1_SYNTHETIC_AUTH_CREATE',20000,400);
  synthetic.uid=authUser.uid;
  ev.writes.authSynthetic++;
  const member=await waitFor(async()=>{
    const x=await db.collection('tenants').doc(TENANT).collection('members').doc(authUser.uid).get();
    return x.exists?x:null;
  },'B1_SYNTHETIC_MEMBERSHIP_CREATE',20000,400);
  ev.writes.membershipSynthetic++;
  const accessAdvisor=await waitFor(async()=>{
    const x=await canonical(db,synthetic.id);
    return x&&x.accessProvisioned===true&&clean(x.authUid,180)===authUser.uid?x:null;
  },'B1_SYNTHETIC_ADVISOR_ACCESS_READBACK',20000,400);
  need(clean(member.data().advisorId,180)===synthetic.id,'B1_SYNTHETIC_MEMBER_ADVISOR_ID');
  need(sameSet(member.data().roles,['Asesor','Operativo']),'B1_SYNTHETIC_MEMBER_ROLES');
  need(sameSet(member.data().countries,['GT','CO']),'B1_SYNTHETIC_MEMBER_COUNTRIES');
  ev.auth.provision={uidHash:crypto.createHash('sha256').update(authUser.uid).digest('hex'),advisorLinked:true,membershipLinked:true};

  const syntheticPassword='B1r3!'+crypto.randomBytes(12).toString('hex')+'Aa1';
  await auth.updateUser(authUser.uid,{emailVerified:true,password:syntheticPassword});
  ev.writes.authSynthetic++;
  ev.auth.activatedForLoginProof=true;

  const loginContext=await browser.newContext({viewport:{width:1500,height:1000}});
  const loginPage=await loginContext.newPage();
  const loginErrors=[];loginPage.on('pageerror',e=>loginErrors.push(clean(e?.message||e)));
  await loginPage.goto(TARGET+'/?b1login='+Date.now(),{waitUntil:'domcontentloaded',timeout:30000});
  await loginPage.fill('#lg-user',synthetic.email);
  await loginPage.fill('#lg-pass',syntheticPassword);
  await loginPage.click('#login-form button[type="submit"]');
  await loginPage.waitForFunction(()=>!!window.Orbit?.productAppP0?.status?.().started&&!!window.Orbit?.auth?.productUser?.uid,null,{timeout:25000});
  ev.auth.syntheticLegalGateAccepted=await acceptLegalGate(loginPage);
  await loginPage.waitForSelector('#sidebar [data-route]',{timeout:15000});
  const loginState=await loginPage.evaluate(({extra,restricted})=>({
    user:{advisorId:String(Orbit.auth.productUser?.advisorId||''),roles:Orbit.auth.productUser?.roles||[],countries:Orbit.auth.productUser?.countries||[]},
    routes:[...document.querySelectorAll('#sidebar [data-route]')].map(x=>x.getAttribute('data-route')),
    extraCan:Orbit.access?.can?Orbit.access.can(extra,'view'):null,
    restrictedCan:Orbit.access?.can?Orbit.access.can(restricted,'view'):null
  }),{extra:moduleChoice.extra,restricted:moduleChoice.restrict});
  need(loginState.user.advisorId===synthetic.id,'B1_SYNTHETIC_LOGIN_ADVISOR');
  need(loginState.routes.includes(moduleChoice.extra)&&loginState.extraCan===true,'B1_EXTRA_MODULE_NOT_VISIBLE_AFTER_LOGIN');
  need(!loginState.routes.includes(moduleChoice.restrict)&&loginState.restrictedCan===false,'B1_RESTRICTED_MODULE_VISIBLE_AFTER_LOGIN');
  need(loginErrors.length===0,'B1_SYNTHETIC_LOGIN_PAGE_ERRORS:'+JSON.stringify(loginErrors.slice(0,4)));
  ev.auth.login={pass:true,extraModuleVisible:true,restrictedModuleHidden:true,extraModule:moduleChoice.extra,restrictedModule:moduleChoice.restrict};
  await loginPage.screenshot({path:path.join(evidenceDir,'b1-synthetic-login-modules.png'),fullPage:true});
  await loginContext.close();

  const nativeCalls=await page.evaluate(()=>window.__b1NativeCalls||[]);
  ev.nativeUi.promptCalls=nativeCalls.filter(x=>x==='prompt').length;
  ev.nativeUi.alertCalls=nativeCalls.filter(x=>x==='alert').length;
  need(ev.nativeUi.promptCalls===0&&ev.nativeUi.alertCalls===0,'B1_NATIVE_UI_USED:'+JSON.stringify(nativeCalls));
  need(pageErrors.length===0,'B1_PAGE_ERRORS:'+JSON.stringify(pageErrors.slice(0,4)));

  ev.backend={
    operationalRealCommit:true,canonicalReadback:true,refreshReopen:true,realRestore:true,
    syntheticCreate:true,syntheticConfigEdit:true,syntheticAuthMembership:true,syntheticLogin:true
  };

  ev.cleanup=await cleanupSynthetic({db,auth,...synthetic});
  ev.writes.syntheticCleanup=(ev.cleanup.advisorDeleted?1:0)+(ev.cleanup.memberDeleted?1:0)+(ev.cleanup.authDeleted?1:0)+ev.cleanup.auditDeleted+ev.cleanup.onboardingDeleted+ev.cleanup.onboardingAuditDeleted;
  need(!(await canonical(db,synthetic.id)),'B1_SYNTHETIC_ADVISOR_REMAINS');
  need(!(await authByEmail(auth,synthetic.email)),'B1_SYNTHETIC_AUTH_REMAINS');
  if(synthetic.uid){
    const ms=await db.collection('tenants').doc(TENANT).collection('members').doc(synthetic.uid).get();
    need(!ms.exists,'B1_SYNTHETIC_MEMBERSHIP_REMAINS');
  }
  ev.team.synthetic.cleanupPass=true;
  synthetic={id:'',email:'',uid:''};
  realRollback=null;

  ev.status='PASS';
}catch(e){
  ev.errors.push(clean(e?.stack||e?.message||e,2600));
  process.exitCode=1;
}finally{
  try{
    if(app){
      const db=getFirestore(app),auth=getAuth(app);
      if(realRollback){
        const ref=db.collection('tenants').doc(TENANT).collection('data').doc('asesores').collection('items').doc(realRollback.id);
        const current=await ref.get();
        if(current.exists&&clean(current.data()?.telefono,120)!==clean(realRollback.before?.telefono,120)){
          await ref.set(realRollback.before,{merge:false});
          ev.errors.push('B1_EMERGENCY_REAL_ROLLBACK_USED');
          ev.emergencyRollback=true;
          process.exitCode=1;
        }
      }
      if(synthetic.id){
        try{
          ev.cleanup=await cleanupSynthetic({db,auth,...synthetic});
          ev.errors.push('B1_SYNTHETIC_CLEANUP_FROM_FINALLY');
          process.exitCode=1;
        }catch(cleanupError){
          ev.errors.push('B1_SYNTHETIC_CLEANUP_FAILED:'+clean(cleanupError?.message||cleanupError,1200));
          process.exitCode=1;
        }
      }
    }
  }catch(rollbackError){
    ev.errors.push('B1_ROLLBACK_FAILED:'+clean(rollbackError?.message||rollbackError,1200));
    process.exitCode=1;
  }
  if(context)await context.close().catch(()=>{});
  if(browser)await browser.close().catch(()=>{});
  if(app)await deleteApp(app).catch(()=>{});
  fs.writeFileSync(OUT,JSON.stringify(ev,null,2)+'\n');
  console.log('I65_B1_PREVIEW_PROOF='+ev.status);
  console.log('I65_B1_OPERATIONAL_WRITES='+(ev.writes.advisorOperational+ev.writes.auditOperational));
  console.log('I65_B1_AUTH_SYNTHETIC_WRITES='+ev.writes.authSynthetic);
  console.log('I65_B1_MEMBERSHIP_SYNTHETIC_WRITES='+ev.writes.membershipSynthetic);
  console.log('I65_B1_SYNTHETIC_CLEANUP_WRITES='+ev.writes.syntheticCleanup);
  console.log('I65_B1_SYNTHETIC_FINAL_ABSENT='+(ev.team.synthetic?.cleanupPass===true));
  if(ev.errors.length)console.log('I65_B1_ERRORS='+JSON.stringify(ev.errors));
}
