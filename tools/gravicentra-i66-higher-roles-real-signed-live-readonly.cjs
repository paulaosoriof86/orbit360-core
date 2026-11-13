'use strict';
// Current canonical R7 LIVE: real active tenant admins signed into product UI.
// This is authorization readback ONLY; no customer, permission or Auth writes.
const assert=require('node:assert/strict');
const admin=require('firebase-admin');
const {chromium}=require('playwright');
const TENANT='alianzas-soluciones',LIVE='https://app.aysseguros.com';
const MODULES=['cliente360','polizas','renovaciones','cobros','ops','leads','aseguradoras','siniestros','cancelaciones','comisiones'];
const ESSENTIAL=['cliente360','polizas','renovaciones','cobros','ops','leads','aseguradoras'];
const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'').trim();
const credential=['SA_LAB','SA_ALT','SA_DEFAULT'].map(k=>{try{return JSON.parse(process.env[k]||'');}catch{return null;}})
  .find(x=>x?.type==='service_account'&&x.project_id==='ays-orbit-360-lab'&&x.private_key);
assert.ok(credential,'I66_ADMIN_ROLE_READONLY_EXPECTED_SERVICE_ACCOUNT_MISSING');
admin.initializeApp({credential:admin.credential.cert(credential),projectId:'ays-orbit-360-lab'});
const db=admin.firestore(),auth=admin.auth();
async function actorInventory(){
  const snap=await db.collection('tenants').doc(TENANT).collection('members').limit(180).get();
  assert.ok(snap.size<180,'I66_ADMIN_ROLE_MEMBER_LIST_READONLY_LIMIT_EXCEEDED');
  const candidates=snap.docs.map(d=>({uid:d.id,m:d.data()||{}})).filter(({m})=>{
    const role=norm(m.activeRole||m.role||m.rol);
    return ['admintenant','superadmin'].includes(role)&&m.active!==false&&m.activo!==false&&
      !['blocked','suspended','inactivo','inactive'].includes(norm(m.status||m.estado));
  });
  const groups={admintenant:[],superadmin:[]};
  for(const x of candidates){const role=norm(x.m.activeRole||x.m.role||x.m.rol);groups[role].push(x.uid);}
  console.log('I66_HIGHER_ROLE_ACTIVE_TENANT_MEMBER_COUNTS '+JSON.stringify(Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,v.length]))));
  assert.ok(groups.admintenant.length>0&&groups.superadmin.length>0,'I66_HIGHER_ROLE_REAL_TENANT_MEMBERS_NOT_PRESENT');
  return groups;
}
async function checkOne(browser,uid,requiredRole){
  const user=await auth.getUser(uid);
  if(user.disabled||!user.emailVerified){
    console.log('I66_HIGHER_ROLE_MEMBER_AUTH_NOT_READY_HOLD role='+requiredRole+' disabled='+Boolean(user.disabled)+' emailVerified='+Boolean(user.emailVerified)+' rightsNotRead=true');
    return null;
  }
  const token=await auth.createCustomToken(uid);
  const context=await browser.newContext({viewport:{width:1280,height:850}});
  try{
    const page=await context.newPage();
    await page.goto(LIVE+'/#/ops',{waitUntil:'commit',timeout:30000});
    await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:30000});
    const data=await page.evaluate(async({token,modules})=>{
      const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();
      await c.modules.auth.setPersistence(c.auth,c.modules.auth.browserSessionPersistence);
      await c.modules.auth.signInWithCustomToken(c.auth,token);
      const result=await Orbit.productAppP0.activate();
      const access=await Orbit.domainConfig.ensure('access');
      const domain=(Orbit.domainConfig.status()?.domains||[]).find(x=>x.domain==='access');
      return{started:result?.started===true,preview:p.isI66PreviewHost(),role:String(Orbit.session?.rol?.()||''),
        protectedPolicy:access?.ok===true&&domain?.source==='protected'&&domain?.syncPending===false,
        rights:Object.fromEntries(modules.map(m=>[m,{view:Orbit.access?.can(m,'view')===true,
          create:Orbit.access?.can(m,'create')===true,edit:Orbit.access?.can(m,'edit')===true,
          scope:Orbit.access?.dataScope(m)||'none'}]))};
    },{token,modules:MODULES});
    assert.ok(data.started&&!data.preview&&data.protectedPolicy,'I66_HIGHER_ROLE_LIVE_POLICY_NOT_PROTECTED_'+requiredRole);
    assert.equal(norm(data.role),requiredRole,'I66_HIGHER_ROLE_AUTHENTICATED_IDENTITY_ROLE_MISMATCH');
    let visible=0;
    for(const [module,v] of Object.entries(data.rights)){
      if(ESSENTIAL.includes(module))assert.ok(v.view,'I66_HIGHER_ROLE_ESSENTIAL_MODULE_HIDDEN_'+requiredRole+'_'+module);
      if(!v.view)continue;
      visible++;
      assert.ok(v.create&&v.edit,'I66_HIGHER_ROLE_VISIBLE_MODULE_WRITE_DENIED_'+requiredRole+'_'+module);
      if(module!=='renovaciones')assert.equal(v.scope,'all','I66_HIGHER_ROLE_VISIBLE_MODULE_SCOPE_NOT_ALL_'+requiredRole+'_'+module);
    }
    assert.ok(visible>=7,'I66_HIGHER_ROLE_VISIBLE_MODULES_BELOW_SEVEN_'+requiredRole);
    console.log('I66_SIGNED_LIVE_HIGHER_ROLE_VISIBLE_WRITE_MATRIX_PASS role='+requiredRole+' visible='+visible+' total='+MODULES.length+' protected=true writes=0');
    return visible;
  }finally{await context.close();}
}
(async()=>{
  const groups=await actorInventory(),browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const ok={admintenant:0,superadmin:0},hold={admintenant:0,superadmin:0};
  try{
    for(const role of ['admintenant','superadmin']){
      for(const uid of groups[role]){
        if(await checkOne(browser,uid,role)!==null)ok[role]++;
        else hold[role]++;
      }
    }
  }finally{await browser.close();}
  console.log('I66_REAL_SIGNED_LIVE_HIGHER_ROLES_READBACK_RESULTS '+JSON.stringify({signedPass:ok,authNotReadyHold:hold}));
  assert.ok(ok.admintenant>0&&ok.superadmin>0,'I66_HIGHER_ROLE_NO_ACTIVE_SIGNABLE_PERSON_FOR_ONE_ROLE');
  assert.equal(hold.admintenant+hold.superadmin,0,'I66_HIGHER_ROLE_MEMBER_AUTH_HOLD_NO_FULL_SIGNED_CERTIFICATION');
})().catch(e=>{console.error(String(e.message||e).replace(/[^\w.:-]+/g,'_').slice(0,210));process.exitCode=1;})
  .finally(()=>admin.app().delete());
