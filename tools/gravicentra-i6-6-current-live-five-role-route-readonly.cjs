'use strict';
// I6.6 live physical browser route audit. No production data, memberships,
// Auth claims, authorization grants, release, or user's browser session changes.
// All actors are existing active, verified tenant members. Read-only synthetic auth
// and selection of an already-assigned role are ephemeral headless contexts only.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {explicitAssignedRoles,resolveProductActiveRole}=require('../functions/product-active-role-contract.js');
const controlOwner=require('./gravicentra-i66-frontend-control.cjs');
const admin=require('firebase-admin');
const {chromium}=require('playwright');
const ORIGIN='https://app.aysseguros.com',TENANT='alianzas-soluciones';
const PROJECT='ays-orbit-360-lab',OUT=process.env.I66_FIVE_ROLE_REPORT;
const readJson=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const observer=controlOwner.resolveReadonlyObserver('fiveRoles',readJson(controlOwner.P.cp),readJson(controlOwner.P.state),
  readJson(controlOwner.P.transport),fs,(...args)=>execFileSync('git',args),process.env.GITHUB_SHA);
const pin=observer.physical;
const PIN=pin.sourceSha;
assert.equal(process.env.I66_LIVE_ORIGIN,ORIGIN,'I66_ROLE_MATRIX_WRONG_ORIGIN');
assert.match(PIN||'',/^[a-f0-9]{40}$/,'I66_ROLE_MATRIX_SOURCE_MISSING');
if(process.env.I66_APPROVED_LIVE_SOURCE_SHA)
  assert.equal(process.env.I66_APPROVED_LIVE_SOURCE_SHA,PIN,'I66_ROLE_MATRIX_SOURCE_ENV_DRIFT');
assert.ok(OUT&&OUT.startsWith(process.env.RUNNER_TEMP+'/'),'I66_ROLE_MATRIX_REPORT_SCOPE_DENIED');
assert.ok(!process.env.FIRESTORE_EMULATOR_HOST,'I66_ROLE_MATRIX_EMULATOR_DENIED');
const sa=['SA_LAB','SA_ALT','SA_DEFAULT'].map(k=>{try{return JSON.parse(process.env[k]||'')}catch{return null}})
  .find(x=>x?.type==='service_account'&&x.project_id===PROJECT&&x.private_key);
assert.ok(sa,'I66_ROLE_MATRIX_SIGNED_SERVICE_ACCOUNT_MISSING');
admin.initializeApp({credential:admin.credential.cert(sa),projectId:PROJECT});
const db=admin.firestore(),auth=admin.auth(),tenant=db.collection('tenants').doc(TENANT);
const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const hash=x=>crypto.createHash('sha256').update(String(x||'')).digest('hex');
const matrix=[
  {role:'operativo',matchName:'carlos castro',country:'GT'},
  {role:'direccion',matchName:'paula osorio',country:'GT'},
  {role:'admintenant',matchName:'',country:'GT'},
  {role:'superadmin',matchName:'',country:'GT'},
  {role:'asesor',matchName:'',country:'GT'}
];
const core=['inicio','cliente360','polizas','renovaciones','cobros','ops','leads','aseguradoras'];
const routes=['inicio','cliente360','polizas','renovaciones','cobros','ops','leads','aseguradoras',
  'cronograma','siniestros','historial','calidad','cotizador','comparativo'];
const report={schema:'I66_FIVE_ROLE_CURRENT_LIVE_BROWSER_MATRIX_V2',gate:'I6.6',
  sourceSha:PIN,buildId:pin.buildId,artifactId:pin.artifactId,artifactDigest:pin.artifactDigest,
  buildRunId:pin.buildRunId,physicalReceiptPath:pin.receiptPath,createdAt:new Date().toISOString(),
  authMode:'existing verified member read-only custom token',writes:0,collectionsMutated:0,
  membershipWrites:0,authWrites:0,assignedRoleSelectionOnly:true,
  coverageScope:'five assigned roles, GT, desktop/mobile, routes and advisor server read boundary',
  fullA04Accepted:false,backendWriteNegativeProven:false,
  activeRoles:matrix.map(x=>x.role),views:[1280,390],routeKeys:routes,
  actorSelection:[],results:[],holds:[],status:'RUNNING'};
function roleMatches(value,role){
  const r=norm(value);
  return r===role||(role==='admintenant'&&['admin','administrador'].includes(r));
}
async function getActors(){
  const [memberSnap,advisorSnap]=await Promise.all([
    tenant.collection('members').limit(180).get(),
    tenant.collection('data').doc('asesores').collection('items').limit(450).get()
  ]);
  assert.ok(memberSnap.size<180&&advisorSnap.size<450,'I66_ROLE_MATRIX_UNBOUNDED_STAFF');
  const members=memberSnap.docs.map(d=>({...(d.data()||{}),documentUid:d.id}));
  function active(m){
    const states=[m.status,m.estado].filter(x=>String(x??'').trim()).map(norm);
    return m.active!==false&&m.activo!==false&&m.inactivo!==true&&states.length>0&&
      states.every(x=>['active','activo'].includes(x));
  }
  function countries(m){
    // Match authenticated bootstrap. ALL/TODOS does not confer a country grant.
    return (Array.isArray(m.countries)?m.countries:[]).map(v=>String(v).trim().toUpperCase());
  }
  function assignedRole(m,wanted){
    const assigned=explicitAssignedRoles(m).find(role=>roleMatches(role,wanted));
    return assigned?resolveProductActiveRole(m,assigned).activeRole:'';
  }
  const out=[],authCache=new Map();
  for(const wanted of matrix){
    let identityMembers=members;
    if(wanted.matchName){
      // Reuse the same canonical advisor/UID linkage proven by the signed
      // LIVE Carlos/Dirección renewal, insurer and Client 360 UAT owners.
      // Names alone are not a unique operational identity.
      const verifiedName= wanted.role==='operativo'
        ? v=>norm(v).startsWith('carlos castro')
        : v=>norm(v).includes('paula')&&norm(v).includes('osorio');
      const linked=advisorSnap.docs.filter(d=>{
        const row=d.data()||{};
        return [row.nombre,row.nombreCompleto,row.displayName,row.name].some(verifiedName);
      });
      const advisorIds=new Set(linked.map(d=>d.id));
      const linkedUids=new Set(linked.flatMap(d=>{
        const row=d.data()||{};
        return [row.authUid,row.uid,row.userId].filter(Boolean).map(String);
      }));
      identityMembers=identityMembers.filter(m=>
        [m.nombre,m.displayName,m.name,m.nombreCompleto,m.fullName].some(verifiedName)||
        advisorIds.has(String(m.advisorId||m.asesorId||''))||linkedUids.has(m.documentUid));
    }
    const assigned=identityMembers.filter(m=>assignedRole(m,wanted.role));
    const activeAssigned=assigned.filter(active);
    const scoped=activeAssigned.filter(m=>countries(m).includes(wanted.country)&&
      countries(m).every(c=>['GT','CO'].includes(c)));
    const candidates=scoped.filter(m=>m.uid===m.documentUid&&m.tenantId===TENANT);
    const diagnostics={role:wanted.role,country:wanted.country,members:identityMembers.length,
      assigned:assigned.length,activeAssigned:activeAssigned.length,countryMatched:scoped.length,
      identityMatched:candidates.length,
      assignedCountries:{GT:activeAssigned.filter(m=>countries(m).includes('GT')).length,
        CO:activeAssigned.filter(m=>countries(m).includes('CO')).length},
      authChecked:0,authDisabled:0,authUnverified:0,authNotFound:0,authReadErrors:0,authRoleRestricted:0,
      valid:0,selectedFromInactiveRole:false};
    report.actorSelection.push(diagnostics);
    const valid=[];
    for(const m of candidates){
      diagnostics.authChecked++;
      try{
        if(!authCache.has(m.documentUid))authCache.set(m.documentUid,auth.getUser(m.documentUid));
        const u=await authCache.get(m.documentUid);
        if(u.disabled){diagnostics.authDisabled++;continue;}
        if(u.emailVerified!==true){diagnostics.authUnverified++;continue;}
        if(u.uid!==m.documentUid)throw new Error('AUTH_IDENTITY_MISMATCH');
        if(String(u.customClaims?.giActiveRole||'').trim()&&
          !roleMatches(u.customClaims.giActiveRole,wanted.role)){
          diagnostics.authRoleRestricted++;continue;
        }
        valid.push({uid:m.documentUid,requestedRole:assignedRole(m,wanted.role),
          activeMatch:roleMatches(m.activeRole||m.rolActivo,wanted.role),
          assignedCount:explicitAssignedRoles(m).length});
      }catch(e){
        if(e?.code==='auth/user-not-found')diagnostics.authNotFound++;
        else diagnostics.authReadErrors++;
      }
    }
    diagnostics.valid=valid.length;
    if(diagnostics.authReadErrors){report.holds.push('AUTH_LOOKUP_ERROR_'+wanted.role);continue;}
    if(!valid.length){
      const reason=!assigned.length?'ASSIGNED_ROLE_ABSENT':!activeAssigned.length?'MEMBERSHIP_NOT_ACTIVE':
        !scoped.length?'COUNTRY_NOT_ASSIGNED':!candidates.length?'MEMBERSHIP_IDENTITY_MISMATCH':
        diagnostics.authNotFound===candidates.length?'AUTH_USER_ABSENT':
        diagnostics.authRoleRestricted===candidates.length?'AUTH_SIGNED_ROLE_RESTRICTED':'AUTH_NOT_ENABLED_AND_VERIFIED';
      report.holds.push(reason+'_'+wanted.country+'_'+wanted.role);continue;
    }
    if(wanted.matchName&&valid.length!==1){report.holds.push('SIGNED_ACTOR_NOT_UNIQUE_'+wanted.role+'_COUNT_'+valid.length);continue;}
    // Preserve a previously active actor when possible; never manufacture a
    // grant to fill a matrix cell. Otherwise select an explicitly assigned role.
    valid.sort((a,b)=>Number(b.activeMatch)-Number(a.activeMatch)||
      a.assignedCount-b.assignedCount||a.uid.localeCompare(b.uid));
    const selected=valid[0];
    diagnostics.selectedFromInactiveRole=!selected.activeMatch;
    out.push({...wanted,uid:selected.uid,requestedRole:selected.requestedRole,
      uidHash:hash(selected.uid).slice(0,12),token:await auth.createCustomToken(selected.uid)});
  }
  return out;
}
function classify(error){
  const s=String(error?.message||error||'UNKNOWN');
  return s.replace(/[^\w .:-]/g,'_').slice(0,100);
}
function createReadOnlyErrorAudit(actor){
  const endpoint='https://us-east1-'+PROJECT+'.cloudfunctions.net/orbit360ScopedPolicyRead';
  const requests=new Map(),http=[],logs=[],probes=[];let activeProbe=null,runtimeConsoleErrors=0;
  function expectedRequest(request){
    if(actor.role!=='asesor'||request.url!==endpoint||request.method!=='POST')return false;
    let data;try{data=JSON.parse(request.postData||'').data;}catch(_){return false;}
    return data&&Object.keys(data).sort().join(',')==='activeRole,collection,country,mode,pageSize,tenantId'&&
      norm(data.activeRole)==='asesor'&&data.tenantId===TENANT&&data.country===actor.country&&
      data.collection==='aseguradoras'&&data.mode==='list'&&data.pageSize===1;
  }
  return{
    request(event){
      if(requests.has(event.requestId)){requests.get(event.requestId).redirected=true;return;}
      const row={id:event.requestId,url:event.request.url,status:0,probe:null};requests.set(row.id,row);
      if(activeProbe&&expectedRequest(event.request)){row.probe=activeProbe;activeProbe.ids.push(row.id);}
    },
    response(event){
      const row=requests.get(event.requestId);if(row)row.status=event.response.status;
      if(event.response.status>=400)http.push({id:event.requestId,url:event.response.url,status:event.response.status});
    },
    needsBody(id){const row=requests.get(id);return !!(row?.probe&&row.status===403);},
    body(id,value){
      const row=requests.get(id);if(!row)return;
      try{const e=JSON.parse(value).error;row.directoryDenied=e?.message==='DIRECTORY_DENIED'&&e?.status==='PERMISSION_DENIED';}
      catch(_){row.directoryDenied=false;}
    },
    log(entry){if(entry.level==='error')logs.push({kind:entry.source==='network'?'network':'browser',
      id:entry.networkRequestId||'',url:entry.url||''});},
    console(event){if(event.type==='error'||event.type==='assert')runtimeConsoleErrors++;},
    startProbe(stage){
      assert.equal(actor.role,'asesor','I66_EXPECTED_DENIAL_ROLE_REQUIRED');
      assert.equal(activeProbe,null,'I66_EXPECTED_DENIAL_OVERLAP');
      const probe={stage,ids:[],finished:false,verified:false};probes.push(probe);activeProbe=probe;return probe;
    },
    finishProbe(probe,sdkDenied){
      assert.equal(activeProbe,probe,'I66_EXPECTED_DENIAL_CONTEXT_CHANGED');activeProbe=null;
      const row=probe.ids.length===1?requests.get(probe.ids[0]):null;
      probe.finished=true;probe.verified=!!(sdkDenied&&row&&!row.redirected&&row.status===403&&row.directoryDenied);
      return{stage:probe.stage,verified:probe.verified,requests:probe.ids.length,
        requestSha12:row?hash(row.id).slice(0,12):null,status:row?.status||null,
        code:row?.directoryDenied?'DIRECTORY_DENIED':null};
    },
    summary(){
      const expected=id=>{const row=requests.get(id);return !!(row?.probe?.verified&&row.probe.finished&&
        row.url===endpoint&&row.status===403&&row.directoryDenied&&!row.redirected);};
      return{unexpectedHttp:http.filter(e=>!(e.status===403&&e.url===endpoint&&expected(e.id))).length,
        expectedDirectoryHttp:http.filter(e=>e.status===403&&e.url===endpoint&&expected(e.id)).length,
        unexpectedBrowserLogs:logs.filter(e=>!(e.kind==='network'&&e.url===endpoint&&e.id&&expected(e.id))).length,
        expectedDirectoryBrowserLogs:logs.filter(e=>e.kind==='network'&&e.url===endpoint&&e.id&&expected(e.id)).length,
        runtimeConsoleErrors,completedProbes:probes.filter(p=>p.finished).length,
        verifiedProbes:probes.filter(p=>p.verified).length};
    }
  };
}
async function attachReadOnlyErrorAudit(context,page,actor){
  const cdp=await context.newCDPSession(page),audit=createReadOnlyErrorAudit(actor),pending=new Set();
  cdp.on('Network.requestWillBeSent',event=>audit.request(event));
  cdp.on('Network.responseReceived',event=>audit.response(event));
  cdp.on('Log.entryAdded',event=>audit.log(event.entry));
  cdp.on('Runtime.consoleAPICalled',event=>audit.console(event));
  cdp.on('Network.loadingFinished',event=>{
    if(!audit.needsBody(event.requestId))return;
    const task=cdp.send('Network.getResponseBody',{requestId:event.requestId}).then(body=>{
      audit.body(event.requestId,body.base64Encoded?Buffer.from(body.body,'base64').toString('utf8'):body.body);
    }).catch(()=>audit.body(event.requestId,''));
    pending.add(task);task.finally(()=>pending.delete(task));
  });
  await cdp.send('Network.enable');await cdp.send('Log.enable');await cdp.send('Runtime.enable');
  const drain=async()=>{
    // Drain browser protocol events before disposition; this performs no
    // application call, fetch, user action or datastore operation.
    await cdp.send('Runtime.evaluate',{expression:'0',returnByValue:true});
    await Promise.all([...pending]);
  };
  return{startProbe:stage=>audit.startProbe(stage),async finishProbe(probe,sdkDenied){
    await drain();return audit.finishProbe(probe,sdkDenied);
  },async summary(){await drain();return audit.summary();}};
}
async function sessionReadback(page,actor,errorAudit,stage){
  const probe=actor.role==='asesor'?errorAudit?.startProbe(stage):null;
  if(actor.role==='asesor')assert.ok(probe,'I66_ADVISOR_NETWORK_AUDIT_REQUIRED');
  const state=await page.evaluate(async expected=>{
    const n=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
    const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize(),member=Orbit.auth?.productUser;
    const role=Orbit.session?.rol?.()||'',country=String(Orbit.pais||'').toUpperCase();
    const identity=!!member&&c.auth.currentUser?.uid===expected.uid&&member.uid===expected.uid&&
      member.tenantId===expected.tenant&&Array.isArray(member.countries)&&member.countries.includes(expected.country);
    const assigned=Array.isArray(member?.roles)&&member.roles.some(x=>n(x)===n(role));
    const state={started:identity&&assigned,role,preview:p.isI66PreviewHost(),country,
      accessibleModules:Object.fromEntries(['inicio','cliente360','polizas','cobros','renovaciones','ops',
        'leads','aseguradoras'].map(k=>[k,Orbit.access?.can?.(k,'view')===true])),
      canInsurerEdit:Orbit.access?.can?.('aseguradoras','edit')===true,
      canPay:Orbit.access?.can?.('cobros','edit')===true};
    if(expected.role!=='asesor')return state;
    // A server-owned scoped read distinguishes a real assigned role from a
    // presentation-only toggle. No writer, membership or claim is modified.
    const args={tenantId:expected.tenant,activeRole:role,country:expected.country,mode:'list',pageSize:1};
    state.backendReadBoundary={ownPortfolio:false,insurerDirectoryDenied:false};
    try{
      const r=await p.protectedReadPage({...args,collection:'polizas'});
      state.backendReadBoundary.ownPortfolio=r.ok===true&&r.serverScoped===true&&r.scope==='own'&&
        r.country===expected.country&&Array.isArray(r.rows)&&r.rows.length<=1&&
        r.rows.every(x=>String(x.asesorId||x.advisorId||x.ownerAdvisorId||'')===member.advisorId&&
          String(x.pais||x.country||'').toUpperCase()===expected.country);
      state.backendReadBoundary.policyRows=Array.isArray(r.rows)?r.rows.length:0;
      state.backendReadBoundary.scope=String(r.scope||'');
    }catch(e){state.backendReadBoundary.positiveError=String(e?.code||'READ_FAILED').slice(0,80);}
    try{
      await p.protectedReadPage({...args,collection:'aseguradoras'});
    }catch(e){
      state.backendReadBoundary.insurerDirectoryDenied=e?.code==='functions/permission-denied'&&
        String(e.message||'')==='DIRECTORY_DENIED';
      state.backendReadBoundary.negativeCode=String(e?.code||'READ_FAILED').slice(0,80);
    }
    return state;
  },{uid:actor.uid,tenant:TENANT,role:actor.role,country:actor.country});
  if(probe){
    const proof=await errorAudit.finishProbe(probe,state.backendReadBoundary?.insurerDirectoryDenied===true);
    state.backendReadBoundary.directoryRequestProof=proof;
    state.backendReadBoundary.insurerDirectoryDenied=state.backendReadBoundary.insurerDirectoryDenied===true&&proof.verified;
  }
  return state;
}
async function visit(browser,actor,width){
  const context=await browser.newContext({viewport:{width,height:width===390?844:900},
    ignoreHTTPSErrors:false}),page=await context.newPage();
  const errors=[],http={};
  page.on('pageerror',e=>errors.push(classify(e)));
  page.on('response',r=>{if(r.status()>=400){
    const u=r.url(),category=/\/functions|cloudfunctions/.test(u)?'FUNCTION':
      /firestore|googleapis/.test(u)?'GOOGLE_API':'WEB';
    const key=category+'_'+r.status();http[key]=(http[key]||0)+1;
  }});
  const actorReport={role:actor.role,uidSha12:actor.uidHash,width,ready:false,
    sessionRole:'',country:actor.country,visited:[],routeFailures:[],errors:[],http:{},reload:false,superuserCore:null};
  let errorAudit=null;
  try{
    errorAudit=await attachReadOnlyErrorAudit(context,page,actor);
    await page.goto(ORIGIN+'/#/inicio',{waitUntil:'commit',timeout:30000});
    await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&
      !!window.Orbit?.productAppP0,null,{timeout:30000});
    const activated=await page.evaluate(async token=>{
      const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();
      await c.modules.auth.setPersistence(c.auth,c.modules.auth.browserSessionPersistence);
      await c.modules.auth.signInWithCustomToken(c.auth,token);
      const app=await Orbit.productAppP0.activate();
      return app?.started===true;
    },actor.token);
    if(!activated){actorReport.routeFailures.push('SIGNIN_ACTIVATION_FAILED');return actorReport;}
    const options=await page.evaluate(({requested,country})=>{
      const n=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
      const roles=[...(document.querySelector('#rol-sel')?.options||[])];
      return{role:roles.find(x=>n(x.value)===n(requested))?.value||'',
        country:[...(document.querySelector('#pais-sel')?.options||[])]
          .find(x=>String(x.value).toUpperCase()===country)?.value||''};
    },{requested:actor.requestedRole,country:actor.country});
    if(!options.role||!options.country){actorReport.routeFailures.push('ASSIGNED_ROLE_OR_COUNTRY_UI_OPTION_MISSING');return actorReport;}
    // Normal product controls own role selection, scope invalidation and country.
    await page.locator('#rol-sel').selectOption(options.role);
    await page.locator('#pais-sel').selectOption(options.country);
    const state=await sessionReadback(page,actor,errorAudit,'after-role-selection');
    actorReport.ready=state.started&&!state.preview&&state.country===actor.country&&roleMatches(state.role,actor.role);
    actorReport.sessionRole=norm(state.role);
    actorReport.viewPermissions=state.accessibleModules;
    actorReport.canInsurerEdit=state.canInsurerEdit;
    actorReport.canPay=state.canPay;
    actorReport.backendReadBoundary=state.backendReadBoundary||null;
    if(!actorReport.ready){actorReport.routeFailures.push('SIGNIN_OR_ROLE_MISMATCH');return actorReport;}
    if(['direccion','superadmin','admintenant','operativo'].includes(actor.role)){
      const missing=core.filter(k=>state.accessibleModules[k]!==true);
      actorReport.superuserCore={expected:core.length,missing};
      if(missing.length)actorReport.routeFailures.push('APPROVED_ROLE_CORE_VIEW_DENIED_'+missing.join(','));
      if(!state.canInsurerEdit)actorReport.routeFailures.push('INSURER_EDIT_DENIED_FOR_'+actor.role);
    }
    if(actor.role==='asesor'&&(state.canInsurerEdit||state.canPay))
      actorReport.routeFailures.push('ADVISOR_PRIVILEGED_WRITE_LEAK');
    if(actor.role==='asesor'&&(!state.backendReadBoundary?.ownPortfolio||!state.backendReadBoundary?.insurerDirectoryDenied))
      actorReport.routeFailures.push('ADVISOR_SERVER_READ_BOUNDARY_UNPROVEN');
    for(const route of routes){
      const result=await page.evaluate(async route=>{
        const target='#/'+route;
        if(location.hash===target)window.dispatchEvent(new HashChangeEvent('hashchange'));
        else location.hash=target;
        const start=performance.now(),host=document.getElementById('host');
        let ready=false;
        while(performance.now()-start<9500){
          if(Orbit.route?.key===route&&host?.querySelector('.page')){
            await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
            ready=true;break;
          }
          await new Promise(resolve=>setTimeout(resolve,90));
        }
        const txt=(host?.innerText||'').slice(0,1100);
        const denied=txt.includes('No tienes acceso con el rol activo');
        const missing=txt.includes('Módulo no encontrado')||
          txt.includes('Módulo en construcción según el plan');
        const access=Orbit.access?.can?.(route,'view')===true;
        return{route,ready,denied,missing,access,
          renderMs:Math.round(performance.now()-start),
          pageCount:host?.querySelectorAll('.page').length||0,
          width:window.innerWidth,
          viewportOverflowPx:Math.max(0,document.documentElement.scrollWidth-innerWidth)};
      },route).catch(e=>({route,error:classify(e)}));
      actorReport.visited.push(result);
      if(!result.ready||result.missing||result.error)actorReport.routeFailures.push('MODULE_ROUTE_'+route);
      if(result.access&&result.denied)actorReport.routeFailures.push('AUTHORIZED_ROUTE_DENIED_'+route);
      if(!result.access&&!result.denied)actorReport.routeFailures.push('NONASSIGNED_ROUTE_NOT_DENIED_'+route);
    }
    await page.reload({waitUntil:'commit',timeout:30000});
    await page.waitForFunction(()=>!!window.Orbit?.productAppP0,null,{timeout:30000});
    await page.evaluate(async()=>{
      await Orbit.productRuntimeBrowserProvidersP0.initialize();
      await Orbit.productRuntimeBrowserProvidersP0.waitForUser();
      await Orbit.productAppP0.activate();
    });
    const refresh=await sessionReadback(page,actor,errorAudit,'after-reload');
    actorReport.reload=refresh.started===true&&roleMatches(refresh.role,actor.role)&&refresh.country===actor.country;
    actorReport.reloadBackendReadBoundary=refresh.backendReadBoundary||null;
    if(!actorReport.reload)actorReport.routeFailures.push('SESSION_RELOAD_NOT_RESTORED');
    if(actor.role==='asesor'&&(!refresh.backendReadBoundary?.ownPortfolio||!refresh.backendReadBoundary?.insurerDirectoryDenied))
      actorReport.routeFailures.push('ADVISOR_RELOAD_SERVER_READ_BOUNDARY_UNPROVEN');
  }finally{
    actorReport.errors=errors;
    actorReport.http=http;
    try{
      assert.ok(errorAudit,'I66_ROLE_ERROR_AUDIT_MISSING');actorReport.browserErrorAudit=await errorAudit.summary();
      if(actorReport.browserErrorAudit.unexpectedHttp)actorReport.routeFailures.push('UNEXPECTED_HTTP_ERRORS');
      if(actorReport.browserErrorAudit.unexpectedBrowserLogs||actorReport.browserErrorAudit.runtimeConsoleErrors)
        actorReport.routeFailures.push('UNEXPECTED_CONSOLE_ERRORS');
    }catch(_){actorReport.routeFailures.push('BROWSER_ERROR_ATTRIBUTION_UNPROVEN');}
    await context.close();
  }
  return actorReport;
}
(async()=>{
  report.observerBefore=await controlOwner.verifyReadonlyObserver(observer);
  const marker=await fetch(ORIGIN+'/__recovery__/build.json',{headers:{'Cache-Control':'no-cache'}})
    .then(x=>{assert.equal(x.status,200,'I66_MATRIX_MARKER_HTTP');return x.json()});
  assert.equal(marker.sourceSha,PIN,'I66_MATRIX_CURRENT_LIVE_SOURCE_DRIFT');
  assert.equal(marker.buildId,pin.buildId,'I66_MATRIX_CURRENT_LIVE_BUILD_DRIFT');
  const actors=await getActors();
  let browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{
    for(const actor of actors){
      for(const width of report.views){
        try{report.results.push(await visit(browser,actor,width));}
        catch(e){report.holds.push('BROWSER_'+actor.role+'_'+width+'_'+classify(e));}
      }
    }
  }finally{await browser.close();}
  const after=await fetch(ORIGIN+'/__recovery__/build.json',{headers:{'Cache-Control':'no-cache'}})
    .then(x=>{assert.equal(x.status,200,'I66_MATRIX_FINAL_MARKER_HTTP');return x.json()});
  assert.equal(after.sourceSha,PIN,'I66_MATRIX_LIVE_SOURCE_CHANGED_DURING_MATRIX');
  assert.equal(after.buildId,pin.buildId,'I66_MATRIX_LIVE_BUILD_CHANGED_DURING_MATRIX');
  report.observerAfter=await controlOwner.verifyReadonlyObserver(observer,{stage:'after'});
  if(report.results.length!==matrix.length*report.views.length)
    report.holds.push('ACTUAL_ROLE_VIEWPORT_COVERAGE_INCOMPLETE');
  for(const z of report.results){
    if(z.errors.length)report.holds.push('PAGE_ERRORS_'+z.role+'_'+z.width+'_'+z.errors.length);
    if(z.routeFailures.length)report.holds.push('ROUTES_'+z.role+'_'+z.width+'_'+z.routeFailures.join('_').slice(0,120));
  }
  report.status=report.holds.length?'HOLD':'PASS';
  report.resultsCount=report.results.length;
  report.routeChecks=report.results.reduce((n,z)=>n+z.visited.length,0);
  report.rolesAuthenticated=[...new Set(report.results.filter(z=>z.ready).map(z=>z.role))];
  report.writes=0;
  console.log('I66_LIVE_FIVE_ROLE_ROUTE_MATRIX_SUMMARY '+JSON.stringify({
    status:report.status,roles:report.rolesAuthenticated,roleViewports:report.results.length,
    routeChecks:report.routeChecks,holds:report.holds.slice(0,28),readOnly:true}));
  if(report.status!=='PASS')process.exitCode=1;
})().catch(e=>{report.status='HOLD';report.holds.push('FATAL_'+classify(e));
  console.error('I66_LIVE_FIVE_ROLE_ROUTE_MATRIX_HOLD '+classify(e));process.exitCode=1;
}).finally(async()=>{
  fs.writeFileSync(OUT,JSON.stringify(report,null,2)+'\n',{mode:0o600,flag:'wx'});
  await admin.app().delete();
});
