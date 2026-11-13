'use strict';
// Real signed product roles, permission assertions only; no Firestore writes.
const assert=require('node:assert/strict');
const admin=require('firebase-admin');
const {chromium}=require('playwright');
const TENANT='alianzas-soluciones',PREVIEW='https://ays-orbit-360-lab--gi-i66-rc-42868854629-abj14q6n.web.app';
const LIVE='https://app.aysseguros.com';
const ORIGIN=process.env.I66_SIGNED_MATRIX_ORIGIN||PREVIEW;
assert.ok(ORIGIN===PREVIEW||ORIGIN===LIVE,'I66_SIGNED_MATRIX_UNKNOWN_ORIGIN');
const credential=['SA_LAB','SA_ALT','SA_DEFAULT'].map(k=>{try{return JSON.parse(process.env[k]||'');}catch{return null;}})
  .find(x=>x?.type==='service_account'&&x.project_id==='ays-orbit-360-lab'&&x.private_key);
assert.ok(credential,'I66_SIGNED_PERMISSION_CONFIGURED_LAB_CREDENTIAL_MISSING');
admin.initializeApp({credential:admin.credential.cert(credential),projectId:'ays-orbit-360-lab'});
const db=admin.firestore(),auth=admin.auth();
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const modules=['cliente360','polizas','renovaciones','cobros','ops','leads','aseguradoras','siniestros','cancelaciones','comisiones'];
const essential=['cliente360','polizas','renovaciones','cobros','ops','leads','aseguradoras'];
async function actors(){
  const [members,advisors]=await Promise.all([
    db.collection('tenants').doc(TENANT).collection('members').limit(180).get(),
    db.collection('tenants').doc(TENANT).collection('data').doc('asesores').collection('items').limit(400).get()
  ]);
  assert.ok(members.size<180&&advisors.size<400,'I66_SIGNED_READONLY_MEMBER_SCAN_NOT_BOUNDED');
  const find=(selector,role)=>{
    const ids=new Set(),uids=new Set();
    for(const d of advisors.docs){const a=d.data()||{};
      if([a.nombre,a.displayName,a.name,a.nombreCompleto].some(x=>selector(norm(x)))){
        ids.add(d.id);for(const x of [a.authUid,a.uid,a.userId])if(x)uids.add(String(x));
      }
    }
    const matches=members.docs.filter(d=>{const m=d.data()||{};
      return ([m.nombre,m.displayName,m.name,m.nombreCompleto,m.fullName].some(x=>selector(norm(x)))||
        ids.has(String(m.advisorId||m.asesorId||''))||uids.has(d.id))&&
        norm(m.activeRole)===role&&m.active!==false&&m.activo!==false&&
        !['blocked','suspended','inactivo','inactive'].includes(norm(m.status||m.estado))&&
        [].concat(m.countries||m.paises||[]).includes('GT');
    });
    assert.equal(matches.length,1,'I66_SIGNED_PERMISSION_ACTOR_NOT_UNIQUE_'+role);
    return{uid:matches[0].id,role};
  };
  return[find(s=>s.startsWith('carlos castro'),'operativo'),find(s=>s.includes('paula')&&s.includes('osorio'),'direccion')];
}
async function checkActor(browser,actor){
  const user=await auth.getUser(actor.uid);
  assert.ok(!user.disabled&&user.emailVerified,'I66_SIGNED_PERMISSION_ACTOR_AUTH_UNREADY');
  const token=await auth.createCustomToken(actor.uid),context=await browser.newContext({viewport:{width:1280,height:850}});
  try{
    const page=await context.newPage();
    await page.goto(ORIGIN+'/#/ops',{waitUntil:'commit',timeout:30000});
    await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:30000});
    const rights=await page.evaluate(async({token,modules})=>{
      const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();
      await c.modules.auth.setPersistence(c.auth,c.modules.auth.browserSessionPersistence);
      await c.modules.auth.signInWithCustomToken(c.auth,token);
      const result=await Orbit.productAppP0.activate();
      // A signed client must resolve its protected tenant policy before the
      // authorization verdict; default local policy is NOT an acceptance.
      const access=await Orbit.domainConfig.ensure('access');
      const domain=(Orbit.domainConfig.status()?.domains||[]).find(x=>x.domain==='access');
      return{started:result?.started===true,preview:p.isI66PreviewHost(),role:String(Orbit.session?.rol?.()||''),
        policyProtected:access?.ok===true&&domain?.source==='protected'&&domain?.syncPending===false,
        policyBackendSource:String(access?.source||''),policyClientSource:String(domain?.source||''),
        rights:Object.fromEntries(modules.map(m=>[m,{view:Orbit.access?.can(m,'view')===true,
          create:Orbit.access?.can(m,'create')===true,
          edit:Orbit.access?.can(m,'edit')===true,scope:Orbit.access?.dataScope(m)||'none'}]))};
    },{token,modules});
    console.log('I66_SIGNED_'+actor.role.toUpperCase()+'_POLICY_HYDRATION '+JSON.stringify({backend: rights.policyBackendSource,client:rights.policyClientSource,protected:rights.policyProtected}));
    assert.ok(rights.started&&rights.policyProtected&&rights.preview===(ORIGIN===PREVIEW)&&norm(rights.role).includes(actor.role),'I66_SIGNED_PERMISSION_PROTECTED_POLICY_NOT_READY');
    console.log('I66_SIGNED_'+actor.role.toUpperCase()+'_ACTUAL_RIGHTS '+JSON.stringify(rights.rights));
    for(const [module,grant] of Object.entries(rights.rights)){
      if(essential.includes(module))assert.equal(grant.view,true,'I66_SIGNED_ROLE_ESSENTIAL_MODULE_INVISIBLE_'+actor.role+'_'+module);
      if(grant.view){
        assert.ok(grant.create&&grant.edit,'I66_SIGNED_ROLE_VISIBLE_MODULE_WRITE_DENIED_'+actor.role+'_'+module);
        if(module!=='renovaciones')assert.equal(grant.scope,'all','I66_SIGNED_ROLE_VISIBLE_PORTFOLIO_NOT_ALL_'+actor.role+'_'+module);
      }
      if(actor.role==='operativo'&&['cancelaciones','comisiones'].includes(module))
        assert.equal(grant.view,false,'I66_OPERATIVO_SIGNED_TENANT_HIDDEN_MODULE_EXPOSED_'+module);
    }
    const count=Object.values(rights.rights).filter(x=>x.view).length;
    assert.ok(count>=7,'I66_SIGNED_ROLE_MIN_SEVEN_VISIBLE_MODULES_REQUIRED');
    console.log('I66_SIGNED_'+actor.role.toUpperCase()+'_VISIBLE_MODULES_CREATE_EDIT_ALL_PASS count='+count+' origin='+(ORIGIN===PREVIEW?'preview':'live')+' writes=0');
  }finally{await context.close();}
}
(async()=>{const all=await actors(),browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{for(const actor of all)await checkActor(browser,actor);}
  finally{await browser.close();}
  console.log('I66_REAL_SIGNED_TENANT_UI_ROLE_MATRIX_2_ACTORS_VISIBLE_MODULES_READONLY_PASS origin='+(ORIGIN===PREVIEW?'preview':'live'));
})().catch(e=>{console.error(String(e.message||e).replace(/[^\w.:-]+/g,'_').slice(0,180));process.exitCode=1;}).finally(()=>admin.app().delete());
