#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';

const ROOT=process.cwd();
const TARGET=String(process.env.ORBIT360_R4_URL||'https://app.aysseguros.com').trim();
const TENANT=String(process.env.ORBIT360_PRODUCT_TENANT_ID||'alianzas-soluciones').trim();
const SOURCE=String(process.env.ORBIT360_R4_PACKAGE_SOURCE_HEAD||'4f70f0dd6e870e8c7443a7638a9dc6e954eace1b').trim();
const FILES=Number(process.env.ORBIT360_R4_PACKAGE_FILE_COUNT||194);
const EMAIL=String(process.env.ORBIT360_PRODUCT_SMOKE_EMAIL||'').trim();
const PASSWORD=String(process.env.ORBIT360_PRODUCT_SMOKE_PASSWORD||'');
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/r4-production-readonly-smoke-v20260815.json');
const TECH=/\b(firebase|firestore|localstorage|mock|smoke|backend_required|credentialref|service account|api key)\b|\bLAB\b/ig;
const txt=v=>String(v==null?'':v).trim();
const uniq=v=>[...new Set([].concat(v||[]).map(txt).filter(Boolean))];
const safe=v=>txt(v).replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig,'[email-redacted]').replace(/AIza[0-9A-Za-z_-]{20,}/g,'[api-key-redacted]').replace(/Bearer\s+\S+/ig,'Bearer [redacted]').replace(/[A-Za-z0-9_-]{80,}/g,'[token-redacted]').slice(0,500);
function write(p){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify({...p,containsPII:false,containsSecrets:false,secretValuesLogged:false,writesAuthorized:false,deployExecuted:false,packageRebuilt:false,productionTouched:true},null,2)+'\n');}
function failure(d){
 if(d.writeSignals.length)return['SECURITY_FAILURE','R4_UNEXPECTED_WRITE_SIGNAL'];
 if(!d.manifest.pass)return['ENVIRONMENT_FAILURE','R4_PUBLISHED_PACKAGE_IDENTITY_MISMATCH'];
 if(d.authHttp.status>=400)return['DATA_CONTRACT_FAILURE','R4_SMOKE_IDENTITY_CREDENTIAL_REJECTED'];
 if(d.auth.signedIn&&!d.auth.emailVerified)return['DATA_CONTRACT_FAILURE','R4_SMOKE_IDENTITY_EMAIL_NOT_VERIFIED'];
 if(d.auth.signedIn&&!d.auth.membershipAvailable)return['DATA_CONTRACT_FAILURE','R4_SMOKE_IDENTITY_MEMBERSHIP_MISSING'];
 if(d.auth.membershipAvailable&&!d.auth.membershipActive)return['DATA_CONTRACT_FAILURE','R4_SMOKE_IDENTITY_MEMBERSHIP_INACTIVE'];
 if(d.auth.membershipAvailable&&!d.auth.tenantMatches)return['SECURITY_FAILURE','R4_SMOKE_IDENTITY_TENANT_MISMATCH'];
 if(!d.runtime.started)return['FUNCTIONAL_DEFECT','R4_PRODUCT_ACTIVATION_FAILED_AFTER_AUTH'];
 if(d.pageErrors.length||d.consoleErrors.length||d.httpFailures.length)return['FUNCTIONAL_DEFECT','R4_BROWSER_RUNTIME_ERRORS'];
 if(d.technicalCopy.length)return['FUNCTIONAL_DEFECT','R4_TECHNICAL_COPY_VISIBLE'];
 if(d.roles.some(r=>!r.pass))return['FUNCTIONAL_DEFECT','R4_ROLE_ROUTE_OR_SCOPE_MISMATCH'];
 return['PIPELINE_MECHANISM_FAILURE','R4_SMOKE_UNCLASSIFIED_FAILURE'];
}
if(!TARGET.startsWith('https://')||!EMAIL||PASSWORD.length<12){write({schemaVersion:'orbit360-r4-production-readonly-smoke-v1',ok:false,status:'R4_PRODUCTION_READONLY_SMOKE_FAIL',classification:'PIPELINE_MECHANISM_FAILURE',failureFamily:'R4_SMOKE_PRECONDITION_NOT_BOUND'});process.exit(41);}

let browser;
const d={manifest:{pass:false},authHttp:{seen:false,status:0,errorCode:''},auth:{signedIn:false,emailVerified:false,membershipAvailable:false,membershipActive:false,tenantMatches:false,roleCount:0,requiredRolesPresent:false},runtime:{started:false},roles:[],pageErrors:[],consoleErrors:[],httpFailures:[],writeSignals:[],technicalCopy:[],legalGateHandledLocally:false};
try{
 browser=await chromium.launch({headless:true});
 const ctx=await browser.newContext({viewport:{width:1440,height:900},ignoreHTTPSErrors:false,serviceWorkers:'block'});
 const page=await ctx.newPage(),host=new URL(TARGET).host;
 page.on('pageerror',e=>d.pageErrors.push(safe(e&&e.message||e)));
 page.on('console',m=>{if(m.type()==='error')d.consoleErrors.push(safe(m.text()));});
 page.on('request',r=>{const u=r.url();if(/firestore\.googleapis\.com\/.+(documents:commit|documents:batchWrite|Firestore\/Write\/channel)/i.test(u)||/identitytoolkit\.googleapis\.com\/.+accounts:(signUp|update|delete)/i.test(u)){try{d.writeSignals.push(safe(r.method()+' '+new URL(u).pathname));}catch{}}});
 page.on('requestfailed',r=>{try{const u=new URL(r.url());if(u.host===host)d.httpFailures.push(safe(r.method()+' '+u.pathname+' '+txt(r.failure()&&r.failure().errorText)));}catch{}});
 page.on('response',async r=>{try{const u=new URL(r.url());if(u.host===host&&r.status()>=400)d.httpFailures.push(safe(r.status()+' '+u.pathname));if(/identitytoolkit\.googleapis\.com/i.test(u.host)&&/accounts:signInWithPassword/i.test(u.pathname)){d.authHttp.seen=true;d.authHttp.status=r.status();if(r.status()>=400){const b=await r.json().catch(()=>({}));d.authHttp.errorCode=txt(b&&b.error&&(b.error.message||b.error.status)||'').split(/[:\s]/)[0].replace(/[^A-Z0-9_-]/gi,'').toUpperCase().slice(0,80);}}}catch{}});
 const first=await page.goto(TARGET,{waitUntil:'domcontentloaded',timeout:45000});
 if(!first||first.status()>=400||new URL(page.url()).protocol!=='https:')throw new Error('TARGET_HTTP_OR_TLS_FAILED');
 await page.waitForSelector('#login-form',{state:'visible',timeout:30000});
 const m=await page.evaluate(async()=>{const r=await fetch('/orbit360-package-manifest.json',{cache:'no-store'});return r.ok?r.json():{httpStatus:r.status};});
 d.manifest={pass:m&&m.status==='FASE_A_PRODUCT_R3_DURABLE_PACKAGE_CERTIFIED'&&m.sourceHead===SOURCE&&Number(m.fileCount)===FILES&&m.requiredHydrationCertified===true&&m.dynamicRuntimeClosureCertified===true&&m.productTenantContextCertified===true&&m.routerRenderCertified===true&&m.noLabRuntime===true&&m.noPrivateSecretMaterial===true&&m.writeAuthorized===false,status:txt(m&&m.status),sourceHeadMatches:txt(m&&m.sourceHead)===SOURCE,fileCount:Number(m&&m.fileCount||0),noLabRuntime:m&&m.noLabRuntime===true,noPrivateSecretMaterial:m&&m.noPrivateSecretMaterial===true};
 if(!d.manifest.pass)throw new Error('PUBLISHED_MANIFEST_MISMATCH');
 await page.fill('#lg-user',EMAIL);await page.fill('#lg-pass',PASSWORD);await page.click('#login-form button[type="submit"]');
 await page.waitForFunction(()=>{const a=window.Orbit&&Orbit.productAppP0&&Orbit.productAppP0.status?Orbit.productAppP0.status():null,e=document.getElementById('login-error');return!!(a&&a.started)||!!(e&&String(e.textContent||'').trim());},undefined,{timeout:55000}).catch(()=>{});
 d.auth=await page.evaluate(async expected=>{const o={signedIn:false,emailVerified:false,membershipAvailable:false,membershipActive:false,tenantMatches:false,roleCount:0,requiredRolesPresent:false};try{const p=Orbit.productRuntimeBrowserProvidersP0,deps=p.dependencies(),u=await Promise.race([deps.authProvider.waitForAuthenticatedUser(),new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),3500))]);o.signedIn=!!(u&&u.uid);o.emailVerified=!!(u&&u.emailVerified);if(!o.signedIn)return o;try{const m=await deps.membershipProvider.getByUid(u.uid);o.membershipAvailable=!!m;o.membershipActive=String(m&&(m.status||m.estado)||'').toLowerCase()==='active'||m&&m.active===true;o.tenantMatches=String(m&&(m.tenantId||m.tenant)||'')===expected;const roles=[...new Set([].concat(m&&(m.roles||m.rolesAsignados)||[],m&&(m.role||m.rol)||[]).map(x=>String(x||'').trim()).filter(Boolean))];o.roleCount=roles.length;o.requiredRolesPresent=['Dirección','Operativo','Asesor'].every(r=>roles.includes(r));}catch{}}catch{}return o;},TENANT);
 d.runtime=await page.evaluate(()=>{const a=Orbit.productAppP0&&Orbit.productAppP0.status?Orbit.productAppP0.status():{},t=Orbit.productTenantRuntimeContextP0&&Orbit.productTenantRuntimeContextP0.status?Orbit.productTenantRuntimeContextP0.status():{},s=Orbit.store&&Orbit.store._productStatus?Orbit.store._productStatus():{},b=window.OrbitBackend||{};return{started:a.started===true,routerStarted:a.routerStarted===true,tenantContextReady:a.tenantContextReady===true,appLastError:String(a.lastError||'').slice(0,160),tenantReady:t.ready===true,tenantId:String(t.tenantId||''),backendMode:String(b.mode||''),backendWriteAuthorized:b.writeAuthorized===true,storeReady:s.ready===true,storeStatus:String(s.status||''),storeWriteEnabled:s.writeEnabled===true,requiredMissingCount:[].concat(s.requiredMissing||[]).length,requiredFailedCount:[].concat(s.requiredFailed||[]).length};});
 if(d.runtime.started){
   const legal=page.locator('[data-legal-gate]');if(await legal.count()&&await page.locator('#lg-chk').count()&&await page.locator('#lg-ok').count()){await page.locator('#lg-chk').check();await page.locator('#lg-ok').click();d.legalGateHandledLocally=true;await page.waitForTimeout(200);}
   d.privileged=await page.evaluate(expected=>{const s=Orbit.store._productStatus(),t=Orbit.productTenantRuntimeContextP0.status(),a=Orbit.auth.productUser||{};return{tenantMatches:String(t.tenantId||'')===expected,tenantReady:t.ready===true,storeReady:s.ready===true&&s.status==='ready-read-only'&&s.writeEnabled===false,requiredMissingCount:[].concat(s.requiredMissing||[]).length,requiredFailedCount:[].concat(s.requiredFailed||[]).length,clientes:Orbit.store.all('clientes').length,aseguradoras:Orbit.store.all('aseguradoras').length,assignedRoleCount:[].concat(a.roles||[]).length,advisorBound:!!String(a.advisorId||''),productReadOnly:a.productReadOnly===true};},TENANT);
   const specs=[['Dirección',1440,900],['Operativo',1024,768],['Asesor',390,844]],routes=['inicio','cliente360','aseguradoras','ops','leads'];
   for(const [role,width,height] of specs){
     await page.setViewportSize({width,height});const set=await page.evaluate(r=>!!(Orbit.session&&Orbit.session.set&&Orbit.session.set(r)),role);await page.waitForTimeout(200);const rr={role,viewport:{width,height},roleSet:set,activeRoleMatches:false,scopeCliente360:'',rawClientCount:-1,scopedClientCount:-1,routes:[],pass:true};
     const scope=await page.evaluate(()=>{const raw=Orbit.store.all('clientes'),scoped=Orbit.access.filter('clientes',raw,'cliente360');return{active:Orbit.session.rol(),scope:Orbit.access.scopeCanon('cliente360'),raw:raw.length,scoped:scoped.length};});rr.activeRoleMatches=scope.active===role;rr.scopeCliente360=scope.scope;rr.rawClientCount=scope.raw;rr.scopedClientCount=scope.scoped;
     for(const route of routes){const allowed=await page.evaluate(r=>r==='inicio'?true:!!Orbit.access.can(r,'view'),route);await page.evaluate(r=>{location.hash='#/'+r;},route);await page.waitForFunction(r=>window.Orbit&&Orbit.route&&Orbit.route.key===r,route,{timeout:8000}).catch(()=>{});await page.waitForTimeout(200);const st=await page.evaluate(()=>{const h=document.getElementById('host'),body=String(document.body&&document.body.innerText||'');return{key:Orbit.route&&Orbit.route.key||'',children:h&&h.children?h.children.length:0,blocked:String(h&&h.innerText||'').includes('No tienes acceso con el rol activo'),body:body.slice(0,200000)};});const matches=uniq((st.body.match(TECH)||[]).map(x=>String(x).toLowerCase()));d.technicalCopy.push(...matches.map(x=>role+':'+route+':'+x));const pass=st.key===route&&st.children>0&&(allowed?!st.blocked:st.blocked);rr.routes.push({route,policyAllowed:allowed,accessBlocked:st.blocked,hostRendered:st.children>0,pass});if(!pass)rr.pass=false;}
     if(!rr.roleSet||!rr.activeRoleMatches)rr.pass=false;if(role==='Dirección'&&rr.scopeCliente360!=='all')rr.pass=false;if(role==='Operativo'&&rr.scopeCliente360!=='team')rr.pass=false;if(role==='Asesor'&&rr.scopeCliente360!=='own')rr.pass=false;d.roles.push(rr);
   }
   d.runtime=await page.evaluate(()=>{const a=Orbit.productAppP0.status(),s=Orbit.store._productStatus();return{started:a.started===true,routerStarted:a.routerStarted===true,tenantContextReady:a.tenantContextReady===true,storeReady:s.ready===true,storeStatus:String(s.status||''),storeWriteEnabled:s.writeEnabled===true,requiredMissingCount:[].concat(s.requiredMissing||[]).length,requiredFailedCount:[].concat(s.requiredFailed||[]).length};});
 }
 d.pageErrors=uniq(d.pageErrors);d.consoleErrors=uniq(d.consoleErrors);d.httpFailures=uniq(d.httpFailures);d.writeSignals=uniq(d.writeSignals);d.technicalCopy=uniq(d.technicalCopy);
 const ok=d.manifest.pass&&d.authHttp.seen&&d.authHttp.status>=200&&d.authHttp.status<300&&d.auth.signedIn&&d.auth.emailVerified&&d.auth.membershipAvailable&&d.auth.membershipActive&&d.auth.tenantMatches&&d.auth.requiredRolesPresent&&d.runtime.started&&d.runtime.routerStarted&&d.runtime.tenantContextReady&&d.runtime.storeReady&&d.runtime.storeStatus==='ready-read-only'&&!d.runtime.storeWriteEnabled&&d.runtime.requiredMissingCount===0&&d.runtime.requiredFailedCount===0&&d.privileged&&d.privileged.tenantMatches&&d.privileged.tenantReady&&d.privileged.storeReady&&d.privileged.requiredMissingCount===0&&d.privileged.requiredFailedCount===0&&d.privileged.clientes===430&&d.privileged.aseguradoras===30&&d.privileged.productReadOnly&&d.roles.length===3&&d.roles.every(r=>r.pass)&&!d.pageErrors.length&&!d.consoleErrors.length&&!d.httpFailures.length&&!d.writeSignals.length&&!d.technicalCopy.length;
 if(ok)write({schemaVersion:'orbit360-r4-production-readonly-smoke-v1',ok:true,status:'POST_GO_LIVE_SMOKE_PASS',classification:'PASS',failureFamily:'',targetHttps:true,...d,firestoreWrites:0,authWrites:0,operationalWrites:0});
 else{const [classification,failureFamily]=failure(d);write({schemaVersion:'orbit360-r4-production-readonly-smoke-v1',ok:false,status:'R4_PRODUCTION_READONLY_SMOKE_FAIL',classification,failureFamily,targetHttps:true,...d,firestoreWrites:0,authWrites:0,operationalWrites:0});process.exitCode=41;}
 await ctx.close();
}catch(e){d.pageErrors=uniq(d.pageErrors);d.consoleErrors=uniq(d.consoleErrors);d.httpFailures=uniq(d.httpFailures);d.writeSignals=uniq(d.writeSignals);d.technicalCopy=uniq(d.technicalCopy);const [classification,failureFamily]=failure(d);write({schemaVersion:'orbit360-r4-production-readonly-smoke-v1',ok:false,status:'R4_PRODUCTION_READONLY_SMOKE_FAIL',classification:e&&e.message==='PUBLISHED_MANIFEST_MISMATCH'?'ENVIRONMENT_FAILURE':classification,failureFamily:e&&e.message==='PUBLISHED_MANIFEST_MISMATCH'?'R4_PUBLISHED_PACKAGE_IDENTITY_MISMATCH':failureFamily,error:safe(e&&e.message||e),targetHttps:TARGET.startsWith('https://'),...d,firestoreWrites:0,authWrites:0,operationalWrites:0});process.exitCode=41;
}finally{if(browser)await browser.close().catch(()=>{});}
