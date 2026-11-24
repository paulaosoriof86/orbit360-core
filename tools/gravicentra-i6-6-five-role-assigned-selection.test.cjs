'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const repo=process.env.I66_ROLE_TEST_REPO||path.resolve(__dirname,'..');
const driverPath='tools/gravicentra-i6-6-current-live-five-role-route-readonly.cjs';
const current=fs.readFileSync(path.join(__dirname,path.basename(driverPath)),'utf8');
const old=execFileSync('git',['show','e58c9989b0d0be18868e1ae8b4d2c4fd7b06ce62'],{cwd:repo,encoding:'utf8'});
const roleOwner=require(path.join(repo,'functions/product-active-role-contract.js'));
const boundary=require(path.join(repo,'functions/b4-003-scoped-access-boundary.js'));
const PIN='a'.repeat(40),TENANT='alianzas-soluciones';
const member=(extra={})=>({uid:'fixture-real-member',tenantId:TENANT,status:'active',
  roles:['Dirección','Asesor'],activeRole:'Dirección',countries:['GT'],advisorId:'fixture-advisor',
  dataScopes:{default:'all'},...extra});
function load(source,rows,{users={},authError=null,role='asesor',country='GT',env={},sourceDrift=false,matchName=''}={}){
  const authReads=[],tokenCreates=[];
  const docs=rows.map(m=>({id:m.documentUid||m.uid,data:()=>m}));
  const snap={docs,size:docs.length},empty={docs:[],size:0};
  const tenant={collection(name){
    if(name==='members')return{limit:()=>({get:async()=>snap})};
    if(name==='data')return{doc:()=>({collection:()=>({limit:()=>({get:async()=>empty})})})};
    throw Error('UNEXPECTED_COLLECTION_'+name);
  }};
  const auth={
    async getUser(uid){authReads.push(uid);if(authError)throw authError;
      const value=Object.hasOwn(users,uid)?users[uid]:{uid,disabled:false,emailVerified:true};
      if(value instanceof Error)throw value;return value;},
    async createCustomToken(uid){tokenCreates.push(uid);return 'fixture-ephemeral-token';}
  };
  const owner={P:{cp:'cp.json',state:'state.json',transport:'transport.json'},
    physicalGuard:()=>({sourceSha:PIN,buildId:'fixture-build',artifactId:123,
      artifactDigest:'sha256:'+'b'.repeat(64),buildRunId:456,receiptPath:'fixture-receipt'}),
    resolveReadonlyObserver(profile){assert.equal(profile,'fiveRoles');
      if(sourceDrift)throw Error('READONLY_OBSERVER_SOURCE_BYTES_DRIFT');
      return {profile,physical:owner.physicalGuard()};}};
  const fakeFs={readFileSync(p,encoding){
    if(/\.json$/.test(p))return '{}';
    const bytes=Buffer.from(p===driverPath?source:fs.readFileSync(path.join(repo,p)));
    return encoding?bytes.toString(encoding):bytes;
  }};
  const context=vm.createContext({console:{log(){},error(){}},Buffer,URL,URLSearchParams,
    process:{env:{I66_LIVE_ORIGIN:'https://app.aysseguros.com',I66_APPROVED_LIVE_SOURCE_SHA:PIN,
      I66_FIVE_ROLE_REPORT:'/tmp/role-fixture/report.json',RUNNER_TEMP:'/tmp/role-fixture',
      SA_LAB:JSON.stringify({type:'service_account',project_id:'ays-orbit-360-lab',private_key:'fixture'}),...env}},
    require(name){
      if(name==='node:fs')return fakeFs;
      if(name==='node:child_process')return{execFileSync:(_command,args)=>
        sourceDrift?Buffer.from('changed after build'):fakeFs.readFileSync(args[1].slice(41))};
      if(name==='firebase-admin')return{initializeApp(){},credential:{cert:x=>x},
        firestore:()=>({collection:()=>({doc:()=>tenant})}),auth:()=>auth};
      if(name==='playwright')return{chromium:{launch(){throw Error('NETWORK_FORBIDDEN_IN_UNIT_TEST');}}};
      if(name.includes('product-active-role-contract'))return roleOwner;
      if(name.includes('frontend-control'))return owner;
      return require(name);
    }});
  const start=source.indexOf('\n(async()=>{');assert.ok(start>0,'DRIVER_MAIN_BOUNDARY_MISSING');
  vm.runInContext(source.slice(0,start),context);
  context.fixtureRole={role,matchName,country};
  vm.runInContext('matrix.splice(0,matrix.length,fixtureRole);globalThis.subject={getActors,report,sessionReadback:typeof sessionReadback===\'function\'?sessionReadback:null,createReadOnlyErrorAudit:typeof createReadOnlyErrorAudit===\'function\'?createReadOnlyErrorAudit:null,attachReadOnlyErrorAudit:typeof attachReadOnlyErrorAudit===\'function\'?attachReadOnlyErrorAudit:null};',context);
  return{...context.subject,context,authReads,tokenCreates};
}
const diagnostic=x=>x.report.actorSelection[0];

test('actual old selector excludes assigned Asesor while actual new selector admits existing verified multi-role actor',async()=>{
  const row=member(),before=load(old,[row]),after=load(current,[row]);
  assert.equal((await before.getActors()).length,0);
  assert.ok(before.report.holds.includes('NO_VERIFIED_ACTIVE_GT_ROLE_asesor'));
  const actors=await after.getActors();
  assert.equal(actors.length,1);assert.equal(actors[0].uid,row.uid);assert.equal(actors[0].requestedRole,'asesor');
  assert.equal(diagnostic(after).selectedFromInactiveRole,true);
  assert.equal(row.activeRole,'Dirección');assert.deepEqual(row.roles,['Dirección','Asesor']);
});
test('all four explicit assignment fields use the real server contract; activeRole alone does not confer a grant',async()=>{
  for(const field of ['roles','rolesAsignados','assignedRoles','rolesDisponibles']){
    const row=member({roles:[],[field]:['Dirección','Asesor']});
    assert.equal(roleOwner.resolveProductActiveRole(row,'Asesor').activeRole,'asesor');
    const x=load(current,[row]);assert.equal((await x.getActors()).length,1,field);
  }
  const x=load(current,[member({roles:['Dirección'],activeRole:'Asesor'})]);
  assert.equal((await x.getActors()).length,0);
  assert.ok(x.report.holds.includes('ASSIGNED_ROLE_ABSENT_GT_asesor'));
  assert.equal(x.authReads.length,0);
});
test('country is diagnosed independently and CO/TODOS cannot fill the GT cell',async()=>{
  for(const countries of [['CO'],['TODOS']]){
    const x=load(current,[member({countries})]);assert.equal((await x.getActors()).length,0);
    assert.ok(x.report.holds.includes('COUNTRY_NOT_ASSIGNED_GT_asesor'));
    assert.equal(diagnostic(x).activeAssigned,1);assert.equal(diagnostic(x).countryMatched,0);
    assert.equal(diagnostic(x).assignedCountries.CO,countries.includes('CO')?1:0);
    assert.equal(x.authReads.length,0);
  }
});
test('membership must be affirmatively active and its canonical document UID/tenant must agree',async()=>{
  for(const extra of [{status:''},{status:'pending'},{estado:'inactive'},{inactivo:true},{active:false}]){
    const x=load(current,[member(extra)]);assert.equal((await x.getActors()).length,0);
    assert.ok(x.report.holds.includes('MEMBERSHIP_NOT_ACTIVE_GT_asesor'));
  }
  for(const extra of [{documentUid:'a-different-document'},{tenantId:'a-different-tenant'}]){
    const x=load(current,[member(extra)]);assert.equal((await x.getActors()).length,0);
    assert.ok(x.report.holds.includes('MEMBERSHIP_IDENTITY_MISMATCH_GT_asesor'));
    assert.equal(x.tokenCreates.length,0);
  }
});
test('disabled, unverified, nonexistent Auth and an Auth API error remain different diagnostics',async()=>{
  const row=member();
  for(const [field,user] of [['authDisabled',{uid:row.uid,disabled:true,emailVerified:true}],
    ['authUnverified',{uid:row.uid,disabled:false,emailVerified:false}]]){
    const x=load(current,[row],{users:{[row.uid]:user}});assert.equal((await x.getActors()).length,0);
    assert.equal(diagnostic(x)[field],1);assert.equal(x.tokenCreates.length,0);
    assert.ok(x.report.holds.includes('AUTH_NOT_ENABLED_AND_VERIFIED_GT_asesor'));
  }
  const missing=load(current,[row],{authError:Object.assign(new Error('private message'),{code:'auth/user-not-found'})});
  await missing.getActors();assert.equal(diagnostic(missing).authNotFound,1);
  assert.ok(missing.report.holds.includes('AUTH_USER_ABSENT_GT_asesor'));
  const failure=load(current,[row],{authError:Object.assign(new Error('private message'),{code:'auth/insufficient-permission'})});
  await failure.getActors();assert.equal(diagnostic(failure).authReadErrors,1);
  assert.ok(failure.report.holds.includes('AUTH_LOOKUP_ERROR_asesor'));
  assert.ok(!JSON.stringify(failure.report).includes('private message'));
});
test('an existing restrictive signed role claim is preserved and prevents the unproven cell',async()=>{
  const row=member(),user={uid:row.uid,disabled:false,emailVerified:true,customClaims:{giActiveRole:'Dirección'}};
  const x=load(current,[row],{users:{[row.uid]:user}});
  assert.equal((await x.getActors()).length,0);
  assert.ok(x.report.holds.includes('AUTH_SIGNED_ROLE_RESTRICTED_GT_asesor'));
  assert.equal(user.customClaims.giActiveRole,'Dirección');assert.equal(x.tokenCreates.length,0);
});
test('prefer an existing active Asesor over switching another actor; named ambiguity still fails closed',async()=>{
  const x=load(current,[member(),member({uid:'second-member',roles:['Asesor'],activeRole:'Asesor'})]);
  assert.equal((await x.getActors())[0].uid,'second-member');
  assert.equal(diagnostic(x).selectedFromInactiveRole,false);
  const ambiguous=load(current,[member({nombre:'Paula Osorio'}),member({uid:'second-member',nombre:'Paula Osorio'})],
    {role:'direccion',matchName:'paula osorio'});
  assert.equal((await ambiguous.getActors()).length,0);
  assert.ok(ambiguous.report.holds.includes('SIGNED_ACTOR_NOT_UNIQUE_direccion_COUNT_2'));
});
test('source environment or post-build driver drift cannot authenticate an actor',()=>{
  assert.throws(()=>load(current,[member()],{env:{I66_APPROVED_LIVE_SOURCE_SHA:'c'.repeat(40)}}),/SOURCE_ENV_DRIFT/);
  assert.throws(()=>load(current,[member()],{sourceDrift:true}),/SOURCE_BYTES_DRIFT/);
});

function browserFixture({forceScope='',negativeError='',wrongUid=false}={}){
  const m=member(),storage=new Map(),listeners={};
  const browser=vm.createContext({console,URLSearchParams,CustomEvent:class{constructor(type,options={}){this.type=type;this.detail=options.detail;}},
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
    document:{documentElement:{dataset:{orbitProductMode:'product'}},dispatchEvent(e){for(const f of listeners[e.type]||[])f(e);return true;},
      addEventListener(type,f){(listeners[type]||(listeners[type]=[])).push(f);}},
    location:{search:''},Orbit:{auth:{productUser:{...m,productReadOnly:true}},pais:'GT',access:{can:(mod,op)=>op==='view'},ROLES:{}}});
  browser.window=browser;browser.window.addEventListener=()=>{};
  const install=()=>vm.runInContext(fs.readFileSync(path.join(repo,'orbit360-platform/core/access-role-session-owner-v20260728.js'),'utf8'),browser);
  install();
  browser.Orbit.productRuntimeBrowserProvidersP0={
    initialize:async()=>({auth:{currentUser:{uid:wrongUid?'other-user':m.uid}}}),isI66PreviewHost:()=>false,
    async protectedReadPage(request){
      try{
        if(request.collection==='aseguradoras'&&negativeError)throw Object.assign(new Error(negativeError),{code:'functions/unavailable'});
        const ctx=boundary.resolve({auth:{uid:m.uid,token:{}},member:m,
          config:{roleScopes:{direccion:'all',asesor:'own'}},tenantId:TENANT,...request});
        return{ok:true,serverScoped:true,country:request.country,scope:forceScope||ctx.scope,collection:request.collection,
          rows:[{id:'fixture-own-policy',pais:'GT',asesorId:m.advisorId}]};
      }catch(e){if(e instanceof boundary.Denied)throw Object.assign(new Error(e.code),{code:'functions/permission-denied'});throw e;}
    }
  };
  const page={async evaluate(fn,value){browser.argument=value;return vm.runInContext('('+fn.toString()+')(argument)',browser);}};
  // These tests isolate the real role/session/server owners. HTTP attribution
  // is covered separately below against the actual request audit implementation.
  const errorAudit={startProbe:stage=>({stage}),finishProbe:async(p,denied)=>({stage:p.stage,verified:denied})};
  return{browser,page,install,errorAudit,actor:{uid:m.uid,role:'asesor',country:'GT'}};
}
test('real session owner selects only assigned Asesor, real server owner limits reads, and reload retains selected role',async()=>{
  const x=load(current,[]),b=browserFixture();
  assert.equal(b.browser.Orbit.session.set('Asesor'),true);
  assert.equal(b.browser.Orbit.session.set('SuperAdmin'),false);
  let proof=await x.sessionReadback(b.page,b.actor,b.errorAudit,'before-reload');
  assert.equal(proof.role,'Asesor');assert.equal(proof.started,true);
  assert.equal(proof.backendReadBoundary.ownPortfolio,true);
  assert.equal(proof.backendReadBoundary.insurerDirectoryDenied,true);
  b.install();proof=await x.sessionReadback(b.page,b.actor,b.errorAudit,'after-reload');
  assert.equal(proof.role,'Asesor');assert.equal(proof.backendReadBoundary.ownPortfolio,true);
});
test('presentation-only role, generic network denial or different authenticated UID cannot prove the advisor boundary',async()=>{
  const x=load(current,[]);
  const privileged=browserFixture({forceScope:'all'});privileged.browser.Orbit.session.set('Asesor');
  assert.equal((await x.sessionReadback(privileged.page,privileged.actor,privileged.errorAudit,'test')).backendReadBoundary.ownPortfolio,false);
  const network=browserFixture({negativeError:'network unavailable'});network.browser.Orbit.session.set('Asesor');
  assert.equal((await x.sessionReadback(network.page,network.actor,network.errorAudit,'test')).backendReadBoundary.insurerDirectoryDenied,false);
  const wrong=browserFixture({wrongUid:true});wrong.browser.Orbit.session.set('Asesor');
  assert.equal((await x.sessionReadback(wrong.page,wrong.actor,wrong.errorAudit,'test')).started,false);
});
test('normal role/country controls and reload readback are exercised; no auth or membership write path exists',()=>{
  assert.match(current,/page\.locator\('#rol-sel'\)\.selectOption\(options\.role\)/);
  assert.match(current,/page\.locator\('#pais-sel'\)\.selectOption\(options\.country\)/);
  assert.match(current,/reloadBackendReadBoundary/);
  for(const pattern of [/\.setCustomUserClaims\s*\(/,/\.updateUser\s*\(/,/\.createUser\s*\(/,
    /\.runTransaction\s*\(/,/\.batch\s*\(/,/\.collection\([^)]*\)\.doc\([^)]*\)\.set\s*\(/])
    assert.doesNotMatch(current,pattern);
  assert.match(current,/fullA04Accepted:false/);
});

const endpoint='https://us-east1-ays-orbit-360-lab.cloudfunctions.net/orbit360ScopedPolicyRead';
function networkAudit(){return load(current,[]).createReadOnlyErrorAudit({role:'asesor',country:'GT'});}
function request(a,id,overrides={}){
  const data={tenantId:TENANT,activeRole:'Asesor',country:'GT',collection:'aseguradoras',mode:'list',pageSize:1,...overrides.data};
  a.request({requestId:id,request:{url:overrides.url||endpoint,method:'POST',postData:JSON.stringify({data})}});
}
function denied(a,id,{status=403,message='DIRECTORY_DENIED',url=endpoint,log=true}={}){
  a.response({requestId:id,response:{url,status}});
  a.body(id,JSON.stringify({error:{message,status:'PERMISSION_DENIED'}}));
  if(log)a.log({level:'error',source:'network',networkRequestId:id,url});
}
test('only the exact current advisor probe request and its request-ID-linked browser log are accepted',()=>{
  const a=networkAudit(),p=a.startProbe('after-role-selection');request(a,'probe-1');denied(a,'probe-1');
  assert.equal(a.finishProbe(p,true).verified,true);
  const s=a.summary();assert.equal(s.expectedDirectoryHttp,1);assert.equal(s.expectedDirectoryBrowserLogs,1);
  assert.equal(s.unexpectedHttp,0);assert.equal(s.unexpectedBrowserLogs,0);assert.equal(s.runtimeConsoleErrors,0);
});
test('a previous unrelated 403 or browser log never becomes expected after a successful new denial',()=>{
  const a=networkAudit();request(a,'previous');denied(a,'previous');
  const p=a.startProbe('after-reload');request(a,'new');denied(a,'new');assert.equal(a.finishProbe(p,true).verified,true);
  const s=a.summary();assert.equal(s.expectedDirectoryHttp,1);assert.equal(s.unexpectedHttp,1);
  assert.equal(s.expectedDirectoryBrowserLogs,1);assert.equal(s.unexpectedBrowserLogs,1);
});
test('404, wrong endpoint, tenant, role, country, collection or ambiguous probe requests remain errors',()=>{
  const variants=[{status:404},{url:endpoint+'Preview'},{data:{tenantId:'foreign'}},
    {data:{activeRole:'Dirección'}},{data:{country:'CO'}},{data:{collection:'polizas'}},{data:{pageSize:50}}];
  for(const v of variants){
    const a=networkAudit(),p=a.startProbe('negative');request(a,'probe',v);denied(a,'probe',v);
    assert.equal(a.finishProbe(p,true).verified,false,JSON.stringify(v));assert.equal(a.summary().unexpectedHttp,1);
  }
  const a=networkAudit(),p=a.startProbe('ambiguous');for(const id of ['first','second']){request(a,id);denied(a,id);}
  assert.equal(a.finishProbe(p,true).verified,false);assert.equal(a.summary().unexpectedHttp,2);
});
test('SDK rejection alone, another backend permission error or a console error cannot certify expected denial',()=>{
  const a=networkAudit(),p=a.startProbe('wrong-server-error');request(a,'probe');denied(a,'probe',{message:'ROLE_DENIED'});
  assert.equal(a.finishProbe(p,true).verified,false);assert.equal(a.summary().unexpectedHttp,1);
  const b=networkAudit(),q=b.startProbe('no-request');assert.equal(b.finishProbe(q,true).verified,false);
  const c=networkAudit(),r=c.startProbe('console-error');request(c,'probe');denied(c,'probe');
  c.console({type:'error'});c.log({level:'error',source:'network',url:endpoint});
  assert.equal(c.finishProbe(r,true).verified,true);
  assert.equal(c.summary().runtimeConsoleErrors,1);assert.equal(c.summary().unexpectedBrowserLogs,1);
});
test('missing network attribution or an unverified attributed request cannot pass session readback',async()=>{
  const x=load(current,[]),b=browserFixture();b.browser.Orbit.session.set('Asesor');
  await assert.rejects(x.sessionReadback(b.page,b.actor),/NETWORK_AUDIT_REQUIRED/);
  b.errorAudit.finishProbe=async()=>({verified:false});
  const proof=await x.sessionReadback(b.page,b.actor,b.errorAudit,'test');
  assert.equal(proof.backendReadBoundary.insurerDirectoryDenied,false);
  assert.equal(proof.backendReadBoundary.directoryRequestProof.verified,false);
});
test('the actual visit finally converts unexpected HTTP or console observations into HOLD reasons',()=>{
  assert.match(current,/unexpectedHttp\)actorReport\.routeFailures\.push\('UNEXPECTED_HTTP_ERRORS'\)/);
  assert.match(current,/runtimeConsoleErrors\)[\s\S]{0,100}routeFailures\.push\('UNEXPECTED_CONSOLE_ERRORS'\)/);
  assert.match(current,/BROWSER_ERROR_ATTRIBUTION_UNPROVEN/);
  assert.match(current,/Network\.requestWillBeSent/);assert.match(current,/Network\.getResponseBody/);
  assert.match(current,/Runtime\.consoleAPICalled/);assert.match(current,/Log\.entryAdded/);
});
test('actual CDP wiring reads only the current probe error body and fails closed when that attribution is unavailable',async()=>{
  for(const bodyUnavailable of [false,true]){
    const x=load(current,[]),handlers={},commands=[];
    const cdp={on:(event,fn)=>{handlers[event]=fn;},async send(method,args){commands.push({method,args});
      if(method==='Network.getResponseBody'){
        if(bodyUnavailable)throw Error('BODY_NO_LONGER_AVAILABLE');
        return{body:JSON.stringify({error:{message:'DIRECTORY_DENIED',status:'PERMISSION_DENIED'}}),base64Encoded:false};
      }
      return{};
    }};
    const a=await x.attachReadOnlyErrorAudit({newCDPSession:async()=>cdp},null,{role:'asesor',country:'GT'});
    handlers['Network.loadingFinished']({requestId:'old-unrelated-request'});
    const p=a.startProbe('real-wiring');
    const data={tenantId:TENANT,activeRole:'Asesor',country:'GT',collection:'aseguradoras',mode:'list',pageSize:1};
    handlers['Network.requestWillBeSent']({requestId:'exact',request:{url:endpoint,method:'POST',postData:JSON.stringify({data})}});
    handlers['Network.responseReceived']({requestId:'exact',response:{url:endpoint,status:403}});
    handlers['Network.loadingFinished']({requestId:'exact'});
    handlers['Log.entryAdded']({entry:{level:'error',source:'network',networkRequestId:'exact',url:endpoint}});
    const proof=await a.finishProbe(p,true),summary=await a.summary();
    assert.equal(proof.verified,!bodyUnavailable);assert.equal(summary.unexpectedHttp,bodyUnavailable?1:0);
    assert.equal(summary.unexpectedBrowserLogs,bodyUnavailable?1:0);
    const reads=commands.filter(c=>c.method==='Network.getResponseBody');
    assert.equal(reads.length,1);assert.equal(reads[0].args.requestId,'exact');
  }
});
