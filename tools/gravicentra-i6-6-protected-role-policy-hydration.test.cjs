'use strict';
// Synthetic VM/backend-contract regression only. No network, Firebase session,
// acceptance, data mutation, workflow dispatch or change to backend permission.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {resolve,Denied}=require('../functions/b4-003-scoped-access-boundary');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const bootstrap=read('orbit360-platform/core/backend-product-readonly-bootstrap-p0.js');
const storeSource=read('orbit360-platform/data/store-firestore-product-readonly-p0.js');
const tenant='qa-i66-policy',uid='qa-operator';
const member=()=>({uid,email:'qa@example.invalid',tenantId:tenant,status:'active',
  activeRole:'Operativo',defaultRole:'Operativo',roles:['Operativo','Dirección'],countries:['GT','CO'],
  advisorId:'qa-advisor',teamId:'qa-team',dataScopes:{default:'all',modules:{}},
  modulesVisible:[],modulesExtra:[],modulesRestricted:[]});
const policy=()=>({schemaVersion:'gravicentra-access-policy-v1',roleScopes:{Operativo:'all','Dirección':'all'},
  rolePermissions:{Operativo:{cancelaciones:{ver:false,editar:false},comisiones:{ver:false,editar:false}},
    'Dirección':{cancelaciones:{ver:true,editar:true},comisiones:{ver:true,editar:true}}}});
const plain=v=>JSON.parse(JSON.stringify(v));
function harness(){
  const events=[],h={member:member(),config:policy(),role:'Operativo',requests:[],reads:0,writes:0,
    status:{tenantId:tenant,domains:[{domain:'access',source:'protected',syncPending:false}]},
    result:{ok:true,domain:'access',source:'protected',syncPending:false}};
  const Orbit={session:{rol:()=>h.role}},window={Orbit,dispatchEvent:e=>events.push(e),localStorage:{getItem:()=>null}};
  const context={window,Orbit,console,Promise,Map,Set,Date,setTimeout,clearTimeout,structuredClone,
    CustomEvent:function(type,options){this.type=type;this.detail=options?.detail;}};
  for(const p of ['core/product-role-taxonomy-p0.js','core/membership-multirol-contract-p0.js',
    'core/membership-multirol-effective-p0.js','core/tenant-access-policy-contract-p0.js',
    'core/tenant-access-policy-effective-p0.js','core/tenant-access-policy-product-p0.js',
    'core/product-query-planner-contract-p0.js'])vm.runInNewContext(read('orbit360-platform/'+p),context);
  Orbit.domainConfig={ensure:async name=>{events.push('ensure:'+name);return h.result;},
    status:()=>h.status,peekReadOnly:name=>{assert.equal(name,'access');return h.config;}};
  vm.runInNewContext(bootstrap,context);
  const start=bootstrap.indexOf('  function protectedReadRolePlan('),end=bootstrap.indexOf('  function unique(',start);
  assert.ok(start>0&&end>start);
  vm.runInNewContext('function text(value){return String(value==null?"":value).trim();}\n'+
    bootstrap.slice(start,end)+'\nthis.probe={plan:protectedReadRolePlan,member:protectedRoleMembership,policy:protectedAccessPolicy,ensure:ensureProtectedAccessPolicy};',context);
  h.Orbit=Orbit;h.context=context;h.probe=context.probe;h.events=events;
  h.compiled=(collection,selected=h.role)=>Orbit.productQueryPlannerP0.compile(collection,
    h.probe.member(h.member,selected),{accessPolicy:Orbit.tenantAccessPolicyProductP0});
  h.fixed=(collection,selected=h.role)=>h.probe.plan(collection,h.member,selected,h.compiled(collection,selected),h.probe.policy(h.member));
  return h;
}

test('actual membership catalog/planner disagrees with the unchanged backend explicit cancellation denial',()=>{
  const h=harness(),before=h.compiled('cancelaciones');
  assert.equal(before.ok,true);assert.equal(before.module,'cancelaciones');
  assert.equal(before.constraints.some(x=>x.field==='__deny__'),false);
  for(const country of ['GT','CO'])assert.throws(()=>resolve({auth:{uid},member:h.member,
    config:h.config,tenantId:tenant,activeRole:'Operativo',collection:'cancelaciones',country}),
    e=>e instanceof Denied&&e.code==='MODULE_DENIED');
  const after=h.fixed('cancelaciones');assert.equal(after.ok,false);assert.equal(after.denied,true);
  assert.equal(after.scope,'none');assert.equal(after.writeAuthorized,false);
  assert.ok(after.constraints.some(x=>x.field==='__deny__'&&x.value===true));
  assert.equal(after.constraints.filter(x=>x.field==='tenantId'&&x.value===tenant).length,1);
  assert.equal(before.ok,true,'input plan remains unchanged');
});

for(const selected of ['Operativo','OPERATIVO','operativo'])test('explicit negative matrix uses normalized selected role '+selected,()=>{
  const h=harness(),plan=h.compiled('cancelaciones');
  assert.equal(h.probe.plan('cancelaciones',h.member,selected,plan,h.config).denied,true);
});
test('accented Dirección and unrelated role denial never inherit Operativo decision',()=>{
  const h=harness(),direction=h.compiled('cancelaciones','Dirección');
  assert.equal(direction.ok,true);
  assert.strictEqual(h.probe.plan('cancelaciones',h.member,'direccion',direction,h.config),direction);
  h.config.rolePermissions['DIRECCION']={cancelaciones:{ver:false}};
  assert.equal(h.probe.plan('cancelaciones',h.member,'Dirección',direction,h.config).denied,true);
});
for(const collection of ['clientes','polizas','cobros','recibosEsperados','carteraPrimas','negocios','gestiones','aseguradoras'])
  test('unchanged approved Operativo read '+collection,()=>{
    const h=harness(),before=h.compiled(collection);
    assert.equal(before.ok,true);
    assert.strictEqual(h.probe.plan(collection,h.member,h.role,before,h.config),before);
  });
for(const value of [true,undefined,null,'false',0])test('only explicit boolean false vetoes; never raises an invalid plan '+String(value),()=>{
  const h=harness();h.config.rolePermissions.Operativo.cancelaciones.ver=value;
  const before=h.compiled('cancelaciones');
  assert.strictEqual(h.probe.plan('cancelaciones',h.member,h.role,before,h.config),before);
  const invalid={...before,ok:false,errors:['tenant_constraint_invalido']};
  assert.strictEqual(h.probe.plan('cancelaciones',h.member,h.role,invalid,h.config),invalid);
});
test('explicit deny precedes historical Ops/Leads stale-module repair',()=>{
  const h=harness();h.Orbit.access={can:()=>true};h.config.rolePermissions.Operativo.ops={ver:false};
  const before={ok:false,module:'ops',scope:'all',errors:['modulo_no_visible'],
    constraints:[{field:'tenantId',op:'==',value:tenant}]};
  const after=h.probe.plan('gestiones',h.member,'Operativo',before,h.config);
  assert.equal(after.ok,false);assert.equal(after.denied,true);
  assert.ok(after.errors.includes('modulo_no_visible'));
});
test('positive matrix never overrides a denied scope or restricted module',()=>{
  const h=harness();h.config.rolePermissions.Operativo.cancelaciones.ver=true;
  for(const change of [m=>m.dataScopes.modules.cancelaciones='none',m=>m.modulesRestricted=['cancelaciones']]){
    h.member=member();change(h.member);const before=h.compiled('cancelaciones');
    assert.ok(!before.ok||before.denied);
    assert.strictEqual(h.probe.plan('cancelaciones',h.member,'Operativo',before,h.config),before);
  }
});
test('fresh protected policy read reflects a new denial without changing assigned roles',()=>{
  const h=harness();h.config.rolePermissions.Operativo.cancelaciones.ver=true;
  const before=plain(h.member);assert.equal(h.fixed('cancelaciones').ok,true);
  h.config={...h.config,rolePermissions:{...h.config.rolePermissions,Operativo:{cancelaciones:{ver:false}}}};
  assert.equal(h.fixed('cancelaciones').denied,true);assert.deepEqual(plain(h.member),before);
});

const invalidSnapshots={
  'owner missing':h=>delete h.Orbit.domainConfig,
  'ensure missing':h=>delete h.Orbit.domainConfig.ensure,
  'status missing':h=>delete h.Orbit.domainConfig.status,
  'immutable reader missing':h=>delete h.Orbit.domainConfig.peekReadOnly,
  'foreign tenant':h=>h.status.tenantId='foreign-tenant',
  'missing tenant':h=>delete h.status.tenantId,
  'unhydrated':h=>h.status.domains[0].source='local-unhydrated',
  'fallback':h=>h.status.domains[0].source='local-fallback',
  'pending sync':h=>h.status.domains[0].syncPending=true,
  'missing sync status':h=>delete h.status.domains[0].syncPending,
  'missing domain':h=>h.status.domains=[],
  'other domain':h=>h.status.domains[0].domain='catalogs',
  'schema drift':h=>h.config.schemaVersion='unknown',
  'missing permissions':h=>delete h.config.rolePermissions,
  'array permissions':h=>h.config.rolePermissions=[],
  'null config':h=>h.config=null
};
for(const [name,mutate]of Object.entries(invalidSnapshots))test('protected snapshot fails closed: '+name,async()=>{
  const h=harness();mutate(h);
  assert.throws(()=>h.probe.policy(h.member),/PROTECTED_ACCESS_POLICY_/);
  await assert.rejects(h.probe.ensure(h.member),/PROTECTED_ACCESS_POLICY_/);
});
for(const result of [null,{ok:false,source:'protected'},{ok:true,source:'local-fallback'},
  {ok:true,source:'protected',syncPending:true},{ok:true,source:'empty_baseline'},
  {ok:true,source:'empty'},{ok:true,source:'canonical_default'},
  {ok:true,source:'canonical_readonly_baseline',exists:false},
  {ok:true,source:'unknown'}])test('ensure non-authoritative result fails closed '+JSON.stringify(result),async()=>{
  const h=harness();h.result=result;await assert.rejects(h.probe.ensure(h.member),/PROTECTED_ACCESS_POLICY_NOT_CONFIRMED/);
});
for(const source of ['protected','canonical','canonical_readonly_baseline','preview_uat'])
  test('exact existing-owner fresh/cached source still requires protected metadata: '+source,async()=>{
    const h=harness();h.result={ok:true,source,exists:true};
    assert.equal((await h.probe.ensure(h.member)).schemaVersion,'gravicentra-access-policy-v1');
    h.status.domains[0].source='local-fallback';
    await assert.rejects(h.probe.ensure(h.member),/PROTECTED_ACCESS_POLICY_NOT_CONFIRMED/);
  });
test('ensure propagates error, never accepts local data after failed read',async()=>{
  const h=harness();h.Orbit.domainConfig.ensure=async()=>{throw Error('QA_READ_UNAVAILABLE');};
  await assert.rejects(h.probe.ensure(h.member),/QA_READ_UNAVAILABLE/);
});

function bootstrapHarness(){
  const h=harness(),O=h.Orbit;
  O.tenantCanonicalPathsP0={VERSION:'qa',validateTenantId:id=>({ok:id===tenant,tenantId:id})};
  O.backendProductReadinessP0={readiness:()=>({ok:true})};
  O.createFirestoreProductReadOnlyStoreP0=(deps,options)=>{
    h.events.push('store:create');h.planner=options.queryPlanner;
    assert.deepEqual(Object.keys(deps),['protectedReadPage']);
    return {_attachSnapshots:()=>{h.events.push('store:attach');return true;},
      _productStatus:()=>({ready:true,status:'ready-read-only'}),_detachSnapshots(){}};
  };
  h.deps={environmentProvider:{describePublicConfig:async()=>({})},
    firebaseAdapter:{initializeFromEnvironment:async()=>({}),storeDependencies:()=>{throw Error('DIRECT_STORE_FORBIDDEN');}},
    authProvider:{waitForAuthenticatedUser:async()=>({uid,email:h.member.email,emailVerified:true})},
    membershipProvider:{getByUid:async()=>{h.events.push('membership:validated-input');return h.member;}},
    protectedReadPage:async()=>{h.reads++;throw Error('UNEXPECTED_DIRECT_READ');}};
  h.options={mode:'product',authorizedProductReadOnly:true,runtimeAuthorized:true,
    protectedReadCandidate:true,collections:['clientes']};
  h.start=()=>O.backendProductReadOnlyBootstrapP0.start(h.deps,h.options);
  return h;
}
test('actual bootstrap awaits protected matrix after membership and before store create/attach',async()=>{
  const h=bootstrapHarness();let resolveEnsure;
  h.Orbit.domainConfig.ensure=name=>{h.events.push('ensure:'+name);return new Promise(resolve=>{resolveEnsure=resolve;});};
  const pending=h.start();
  for(let i=0;i<20&&!resolveEnsure;i++)await Promise.resolve();
  assert.equal(typeof resolveEnsure,'function');assert.equal(h.events.includes('store:create'),false);
  assert.equal(h.events.includes('store:attach'),false);assert.equal(h.reads,0);
  resolveEnsure(h.result);const out=await pending;assert.equal(out.ok,true);
  const names=h.events.filter(x=>typeof x==='string');
  assert.deepEqual(names,['membership:validated-input','ensure:access','store:create','store:attach']);
  assert.equal(h.planner('cancelaciones').denied,true);
  h.role='Dirección';assert.equal(h.planner('cancelaciones').ok,true);
  h.role='Unassigned';assert.equal(h.planner('cancelaciones').hardError,true);
  assert.equal(h.reads,0);
});
for(const [name,mutate]of Object.entries(invalidSnapshots))test('actual bootstrap never creates store for invalid authority '+name,async()=>{
  const h=bootstrapHarness();mutate(h);const out=await h.start();
  assert.equal(out.ok,false);assert.equal(out.status.failurePhase,'planning');
  assert.equal(out.status.failureCode,'PLANNING_FAILED');
  assert.equal(h.events.includes('store:create'),false);assert.equal(h.reads,0);
});
test('actual bootstrap never attaches after rejected matrix fetch and sanitizes thrown details',async()=>{
  const h=bootstrapHarness();h.Orbit.domainConfig.ensure=async()=>{throw Error('private@example.invalid TOKEN_SECRET');};
  const out=await h.start();assert.equal(out.ok,false);assert.equal(h.events.includes('store:attach'),false);
  assert.equal(out.status.failureCode,'PLANNING_FAILED');
  assert.doesNotMatch(JSON.stringify(out.status),/private@|TOKEN_SECRET/);
});

function realDomainOwnerHarness({rejectAccess=false,missingAccess=false,emptyAccess=false,backendSource='canonical_readonly_baseline'}={}){
  const h=bootstrapHarness(),w=h.context.window;
  if(emptyAccess)h.config.rolePermissions={};
  w.location={hostname:'ays-orbit-360-lab--gi-i66-rc-synthetic.web.app'};
  h.context.location=w.location;
  w.__ORBIT360_PRODUCT_PUBLIC_CONFIG__={enabled:true,scopedReadPreviewCandidate:true,
    tenantHint:tenant,projectId:'qa-project',authDomain:'qa.invalid',appId:'qa-app',apiKey:'qa-not-a-key'};
  const source=read('orbit360-platform/core/product-runtime-browser-providers-p0.js');
  const needle='window.Orbit.productRuntimeBrowserProvidersP0=Object.freeze(';
  // Exercise the actual provider/owner code. Only the initialized Firebase SDK
  // context is synthetic, so neither imports nor network/auth/storage occurs.
  assert.equal(source.split(needle).length,2);
  vm.runInNewContext(source.replace(needle,
    'window.__qaProviderContext=function(value){contextPromise=Promise.resolve(value);};'+needle),h.context);
  const currentUser={uid,email:h.member.email,emailVerified:true};
  h.sdkRequests=[];
  w.__qaProviderContext({app:{name:'qa'},auth:{currentUser},db:{},functionsByRegion:{},modules:{
    store:{},functions:{getFunctions:(_app,region)=>({region}),httpsCallable:(fx,name)=>async payload=>{
      assert.equal(fx.region,'us-east1');
      assert.equal(payload.tenantId,tenant);
      assert.equal(h.Orbit.auth?.productUser,undefined,'callable auth must not wait for the later product projection');
      h.sdkRequests.push({name,payload:plain(payload),signedUid:currentUser.uid});
      if(name==='orbit360ScopedPolicyReadPreview'){
        assert.equal(payload.mode,'bootstrap-membership');assert.equal(payload.uid,uid);
        h.events.push('sdk:membership');
        return {data:{ok:true,serverScoped:true,mode:payload.mode,tenantId:tenant,uid,membership:h.member}};
      }
      assert.equal(name,'orbit360TenantDomainConfigPreview');
      assert.deepEqual(plain(payload),{tenantId:tenant,action:'get',domain:'access'});
      h.events.push('sdk:access');
      if(rejectAccess)throw Error('private@example.invalid SDK_DENIED');
      return {data:{ok:true,domain:'access',config:missingAccess?null:h.config,exists:!missingAccess,
        previewIsolated:true,source:missingAccess?'empty_baseline':backendSource}};
    }}}});
  delete w.__qaProviderContext;
  vm.runInNewContext(read('orbit360-platform/core/tenant-domain-config-client.js'),h.context);
  h.deps=h.Orbit.productRuntimeBrowserProvidersP0.dependencies();
  return h;
}
for(const backendSource of ['canonical_readonly_baseline','preview_uat'])
test('real domain owner and provider load protected tenant policy before auth projection: '+backendSource,async()=>{
  const h=realDomainOwnerHarness({backendSource});assert.equal(h.Orbit.auth?.productUser,undefined);
  const out=await h.start();assert.equal(out.ok,true);
  assert.deepEqual(h.events.filter(x=>typeof x==='string'),
    ['sdk:membership','sdk:access','store:create','store:attach']);
  assert.equal(h.sdkRequests.length,2);assert.ok(h.sdkRequests.every(r=>r.signedUid===uid));
  assert.equal(h.Orbit.auth.productUser.uid,uid);
  assert.equal(h.Orbit.domainConfig.status().tenantId,tenant);
  assert.equal(h.Orbit.domainConfig.status().domains.find(x=>x.domain==='access').source,'protected');
  assert.ok(Object.isFrozen(h.Orbit.domainConfig.peekReadOnly('access')));
  assert.equal(h.planner('cancelaciones').denied,true);
  assert.equal(h.planner('clientes').ok,true);
  assert.equal(h.reads,0);
});
test('real domain owner cached protected result is accepted without another request or syncPending response field',async()=>{
  const h=realDomainOwnerHarness();await h.probe.ensure(h.member);
  const before=h.sdkRequests.length;
  const cached=await h.Orbit.domainConfig.ensure('access');
  assert.equal(cached.cached,true);assert.equal(cached.source,'protected');
  assert.equal(Object.hasOwn(cached,'syncPending'),false);
  const confirmed=await h.probe.ensure(h.member);
  assert.equal(confirmed.schemaVersion,'gravicentra-access-policy-v1');
  assert.equal(h.sdkRequests.length,before);assert.equal(h.sdkRequests.length,1);
  assert.equal(h.Orbit.auth?.productUser,undefined);
});
test('real owner failed callable fallback never becomes protected/default authority or attaches the store',async()=>{
  const h=realDomainOwnerHarness({rejectAccess:true}),out=await h.start();
  assert.equal(out.ok,false);assert.equal(out.status.failureCode,'PLANNING_FAILED');
  assert.equal(h.events.includes('store:create'),false);
  assert.equal(h.Orbit.auth?.productUser,undefined);
  const meta=h.Orbit.domainConfig.status().domains.find(x=>x.domain==='access');
  assert.equal(meta.source,'local-fallback');assert.equal(meta.syncPending,true);
  assert.equal(h.sdkRequests.length,2);
  assert.doesNotMatch(JSON.stringify(out.status),/private@|SDK_DENIED/);
});
test('real owner missing config cannot turn published defaults into authority on a cached retry',async()=>{
  const h=realDomainOwnerHarness({missingAccess:true}),first=await h.start();
  assert.equal(first.ok,false);assert.equal(h.events.includes('store:create'),false);
  const cached=await h.Orbit.domainConfig.ensure('access');
  assert.equal(cached.cached,true);assert.equal(cached.source,'protected');
  assert.deepEqual(plain(cached.config.rolePermissions),{});
  const second=await h.start();
  assert.equal(second.ok,false);assert.equal(second.status.failurePhase,'planning');
  assert.equal(h.events.includes('store:create'),false);
});
test('real owner defaults cached before bootstrap never count as an authenticated configured matrix',async()=>{
  const h=realDomainOwnerHarness({missingAccess:true});
  const raw=await h.Orbit.domainConfig.get('access');
  assert.equal(raw.exists,false);assert.equal(raw.source,'empty_baseline');
  const out=await h.start();
  assert.equal(out.ok,false);assert.equal(h.events.includes('store:attach'),false);
  assert.equal(h.Orbit.auth?.productUser,undefined);
});
test('real explicitly empty config remains allowed after cached existence revalidation, never grants a denied plan',async()=>{
  const h=realDomainOwnerHarness({emptyAccess:true});
  const raw=await h.Orbit.domainConfig.get('access');
  assert.equal(raw.exists,true);assert.deepEqual(plain(raw.config.rolePermissions),{});
  const out=await h.start();assert.equal(out.ok,true);
  assert.equal(h.sdkRequests.filter(x=>x.name==='orbit360TenantDomainConfigPreview').length,2);
  assert.deepEqual(h.events.filter(x=>typeof x==='string'),
    ['sdk:access','sdk:membership','sdk:access','store:create','store:attach']);
  const before={ok:false,module:'cancelaciones',scope:'none',errors:['scope_denied'],constraints:[]};
  assert.strictEqual(h.probe.plan('cancelaciones',h.member,'Operativo',before,
    h.Orbit.domainConfig.peekReadOnly('access')),before);
});
test('empty cached policy without existing get owner fails closed instead of accepting defaults',async()=>{
  const h=harness();h.config.rolePermissions={};h.result={ok:true,source:'protected',cached:true};
  await assert.rejects(h.probe.ensure(h.member),/PROTECTED_ACCESS_POLICY_OWNER_REQUIRED/);
});
for(const result of [null,{ok:false,exists:true,source:'canonical',config:{}},
  {ok:true,exists:false,source:'empty_baseline',config:{}},
  {ok:true,exists:true,source:'canonical',config:null},
  {ok:true,exists:true,source:'canonical',config:[]},
  {ok:true,exists:true,source:'local-fallback',config:{}},
  {ok:true,exists:true,source:'canonical',syncPending:true,config:{}},
  {ok:true,source:'canonical',config:{}}])
  test('cached empty authority revalidation rejects malformed/non-authoritative read '+JSON.stringify(result),async()=>{
    const h=harness();h.config.rolePermissions={};h.result={ok:true,source:'protected',cached:true};
    let count=0;h.Orbit.domainConfig.get=async name=>{assert.equal(name,'access');count++;return result;};
    await assert.rejects(h.probe.ensure(h.member),/PROTECTED_ACCESS_POLICY_NOT_CONFIRMED/);
    assert.equal(count,1);
  });
test('cached empty revalidation still enforces tenant and protected metadata after get',async()=>{
  for(const mutate of [h=>h.status.tenantId='foreign-tenant',h=>h.status.domains[0].source='local-fallback']){
    const h=harness();h.config.rolePermissions={};h.result={ok:true,source:'protected',cached:true};
    h.Orbit.domainConfig.get=async()=>{mutate(h);return {ok:true,exists:true,source:'canonical',config:h.config};};
    await assert.rejects(h.probe.ensure(h.member),/PROTECTED_ACCESS_POLICY_/);
  }
});

test('real protected store skips denied GT/CO calls, keeps denial unconfirmed, and still reads approved collections',async()=>{
  const h=harness(),requests=[],baselineRequests=[],auth={uid};
  vm.runInNewContext(storeSource,h.context);
  const options={tenantId:tenant,membership:h.member,collections:['clientes','cancelaciones','polizas'],
    requiredCollections:['clientes'],protectedReadCandidate:true,
    paths:{validateTenantId:id=>({ok:id===tenant,tenantId:id})},queryPlanner:collection=>h.fixed(collection)};
  const reader=async q=>{
    requests.push({collection:q.collection,country:q.country,role:q.activeRole});
    resolve({auth,member:h.member,config:h.config,tenantId:tenant,activeRole:q.activeRole,collection:q.collection,country:q.country});
    return {ok:true,serverScoped:true,collection:q.collection,country:q.country,rows:[],nextCursor:null};
  };
  // Reproduce the stale catalog's two unauthorized reads against the real
  // unchanged server policy, without network or records.
  for(const country of h.member.countries){
    const q={collection:'cancelaciones',country,activeRole:'Operativo'};baselineRequests.push(q);
    assert.throws(()=>resolve({auth,member:h.member,config:h.config,tenantId:tenant,...q}),
      e=>e instanceof Denied&&e.code==='MODULE_DENIED');
  }
  assert.equal(baselineRequests.length,2);
  const store=h.Orbit.createFirestoreProductReadOnlyStoreP0({protectedReadPage:reader},options);
  try{
    assert.equal(store._attachSnapshots(),true);store._ensureCollections(['cancelaciones','polizas']);
    await new Promise(resolve=>setTimeout(resolve,20));
    const status=store._productStatus();
    assert.equal(requests.filter(q=>q.collection==='cancelaciones').length,0);
    assert.equal(requests.filter(q=>q.collection==='clientes').length,2);
    assert.equal(requests.filter(q=>q.collection==='polizas').length,2);
    assert.ok(status.deniedCollections.includes('cancelaciones'));
    assert.equal(status.serverConfirmedCollections.includes('cancelaciones'),false);
    assert.equal(status.snapshotErrors.cancelaciones,undefined,'intentional policy denial is not a swallowed server failure');
    assert.equal(store.all('cancelaciones').length,0);assert.equal(store.get('cancelaciones','unknown'),null);
    assert.throws(()=>store.update('cancelaciones','unknown',{}),
      error=>error.code==='WRITE_BLOCKED_PRODUCT_READ_ONLY_P0');
  }finally{store._detachSnapshots();}
});
