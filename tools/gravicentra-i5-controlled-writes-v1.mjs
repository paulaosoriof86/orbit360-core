import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT='ays-orbit-360-lab',TENANT='alianzas-soluciones',BRANCH='recovery/fase-a-clean-20260831';
const CONTROL='artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json';
const INTENT='artifacts/orbit360-recovery/release-control/I5_EXECUTION_INTENT.json';
const PROD=String(process.env.PRODUCTION_URL||'https://ays-orbit-360-lab.web.app').replace(/\/$/,'');
const OUT=process.env.I5_EVIDENCE_DIR||process.env.RUNNER_TEMP||process.cwd();
const EXECUTE=process.argv.includes('--execute');
const ALLOWED=new Set(['direccion','superadmin','super_admin','admintenant','admin_tenant','admin','operativo']);
const RELATED=['polizas','cobros','comisiones','reclamos','gestiones','negocios','recibosEsperados','carteraPrimas'];
const WATCH_TOP=['notificationOutbox','workflowRequests','workflowEvents'];
const WATCH_DATA=['actividades','eventosIntegracion','cobros','comisiones','recibosEsperados','carteraPrimas','reclamos','gestiones','negocios','polizas'];
const clean=v=>String(v==null?'':v).trim();
const norm=v=>clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function need(ok,code){if(!ok)throw new Error(code);}
function readJson(f){return JSON.parse(fs.readFileSync(f,'utf8'));}
function serviceAccount(){for(const raw of [process.env.SA_DEFAULT,process.env.SA_ORBIT360_LAB,process.env.SA_ORBIT_360_LAB].filter(Boolean)){try{const x=JSON.parse(raw);if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.client_email&&x?.private_key)return x;}catch{}}throw new Error('I5_EXISTING_SERVICE_ACCOUNT_NOT_AVAILABLE');}
async function waitFor(check,timeout,code){const start=Date.now();while(Date.now()-start<timeout){if(await check())return true;await sleep(200);}throw new Error(code);}
function rolesOf(m){const x=Array.isArray(m?.roles)?m.roles:Array.isArray(m?.rolesAsignados)?m.rolesAsignados:(m?.role||m?.rol?[m.role||m.rol]:[]);return [...new Set(x.map(clean).filter(Boolean))];}
function roleOf(m,rs){const p=clean(m?.activeRole||m?.rolActivo||m?.defaultRole||m?.rolDefault||'');if(p&&rs.includes(p)&&ALLOWED.has(norm(p)))return p;return rs.find(r=>ALLOWED.has(norm(r)))||'';}
function dataItems(db,c){return db.collection('tenants').doc(TENANT).collection('data').doc(c).collection('items');}
function tenantCollection(db,c){return db.collection('tenants').doc(TENANT).collection(c);}
async function selectActor(db,auth){const snap=await tenantCollection(db,'members').get();for(const d of snap.docs){const m=d.data()||{},uid=clean(m.uid||d.id),rs=rolesOf(m),role=roleOf(m,rs),state=norm(m.status||m.estado||'active');if(!uid||!role||m.active===false||m.activo===false||['inactive','inactivo','blocked','bloqueado','suspended','suspendido'].includes(state))continue;try{const u=await auth.getUser(uid);if(!u.disabled&&u.emailVerified===true)return{uid,role,roles:rs};}catch{}}throw new Error('I5_NO_PRIVILEGED_ACTIVE_VERIFIED_MEMBER');}
async function snapshotIds(ref){const s=await ref.get();return new Map(s.docs.map(d=>[d.id,d.data()||{}]));}
async function watchSnapshot(db){const out={top:{},data:{}};for(const c of WATCH_TOP)out.top[c]=await snapshotIds(tenantCollection(db,c));for(const c of WATCH_DATA)out.data[c]=await snapshotIds(dataItems(db,c));return out;}
function newDocs(a,b){const r=[];for(const [id,data] of b)if(!a.has(id))r.push({id,data});return r;}
function containsSynthetic(rows,id){return rows.filter(r=>JSON.stringify(r).includes(id));}
async function relationRefs(db,id){const out={};for(const c of RELATED){const s=await dataItems(db,c).where('aseguradoraId','==',id).limit(5).get();out[c]=s.docs.map(d=>d.id);}return out;}
function relationTotal(x){return Object.values(x).reduce((n,r)=>n+r.length,0);}
async function activate(page,auth,actor){const token=await auth.createCustomToken(actor.uid,{gravicentraI5ControlledWrite:true});await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:8000});const s=await page.evaluate(async tok=>{const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();if(!c.auth.currentUser)await c.modules.auth.signInWithCustomToken(c.auth,tok);return Orbit.productAppP0.status?.().started===true?Orbit.productAppP0.status():await Orbit.productAppP0.activate();},token);need(s?.started===true,'I5_PRODUCT_APP_DID_NOT_START');await page.waitForFunction(()=>Orbit?.productAppP0?.status?.().started===true&&!document.body.classList.contains('pre-auth'),null,{timeout:12000});const gate=page.locator('[data-legal-gate].open');if(await gate.count()){const chk=gate.locator('#lg-chk'),ok=gate.locator('#lg-ok');if(await chk.count())await chk.check();if(await ok.count())await ok.click();await gate.waitFor({state:'detached',timeout:5000}).catch(()=>{});}const session=await page.evaluate(()=>({active:Orbit.session?.rol?.()||'',assigned:Orbit.session?.allowedRoles?.()||[]}));if(session.active!==actor.role){need(session.assigned.includes(actor.role),'I5_ACTOR_ROLE_NOT_ASSIGNED');need(await page.evaluate(r=>Orbit.session.set(r),actor.role),'I5_ACTOR_ROLE_SWITCH_REJECTED');}await page.waitForFunction(r=>Orbit.session?.rol?.()===r,actor.role,{timeout:5000});}
async function gotoInsurers(page,id=''){const hash=id?`#/aseguradoras?ficha=${encodeURIComponent(id)}`:'#/aseguradoras';await page.evaluate(h=>{location.hash=h;},hash);await page.waitForFunction(x=>Orbit?.route?.key==='aseguradoras'&&(x?!!Orbit.store?.get?.('aseguradoras',x)&&!!document.querySelector(`#asg-ficha[data-id="${CSS.escape(x)}"]`):!!document.querySelector('#asg-new')),id,{timeout:12000});}
async function reloadReadback(page,auth,actor,id,mustExist){await page.reload({waitUntil:'domcontentloaded',timeout:20000});await activate(page,auth,actor);if(mustExist){await gotoInsurers(page,id);const row=await page.evaluate(x=>Orbit.store.get('aseguradoras',x),id);need(row&&row.id===id,'I5_SYNTHETIC_INSURER_RELOAD_READBACK_MISSING');return row;}await gotoInsurers(page);await page.waitForFunction(x=>!Orbit.store?.get?.('aseguradoras',x),id,{timeout:12000});return null;}

const cp=readJson(CONTROL),intent=readJson(INTENT),candidate=cp.certifiedCandidate||{};
if(process.env.GITHUB_REF_NAME)need(process.env.GITHUB_REF_NAME===BRANCH,'I5_BRANCH_AUTHORITY_INVALID');
need(cp.status==='I5_IN_PROGRESS','I5_CONTROL_STATUS_INVALID');
need(intent.schemaVersion==='gravicentra-i5-execution-intent-v1'&&intent.gate==='I5','I5_INTENT_INVALID');
need(intent.releaseBinding?.sourceSha===candidate.sourceSha&&intent.releaseBinding?.buildId===candidate.buildId,'I5_INTENT_RELEASE_MISMATCH');
need(Number(intent.releaseBinding?.artifactId)===Number(candidate.artifactId),'I5_INTENT_ARTIFACT_MISMATCH');
need(intent.controlledWrite?.collection==='aseguradoras','I5_INTENT_COLLECTION_INVALID');
if(!EXECUTE){console.log('I5_CONTROLLED_WRITE_HARNESS=READY_NO_EXECUTION');console.log('I5_WRITES_EXECUTED=0');process.exit(0);}
const gate=cp.i5Execution||{};need(gate.productionDeployAuthorized===true&&gate.controlledWritesAuthorized===true&&gate.rollbackPrepared===true,'I5_EXECUTION_NOT_AUTHORIZED');need(process.env.I5_EXECUTION_NONCE===intent.executionNonce,'I5_EXECUTION_NONCE_MISMATCH');
fs.mkdirSync(OUT,{recursive:true});
const evidence={schemaVersion:'gravicentra-i5-controlled-write-evidence-v2',gate:'I5',status:'FAIL',productionUrl:PROD,releaseBinding:intent.releaseBinding,syntheticInsurerId:'',actor:{},writes:[],productionTouched:true,dataTouched:false,writesExecuted:0,readbackReload:false,finalAbsenceReload:false,expectedPersistentAudit:{},sideEffects:{},errors:[]};
const app=initializeApp({credential:cert(serviceAccount()),projectId:PROJECT},'gravicentra-i5-controlled-write');const auth=getAuth(app),db=getFirestore(app);let browser;
try{
  const actor=await selectActor(db,auth);evidence.actor={uidRecorded:false,emailRecorded:false,role:actor.role};const beforeWatch=await watchSnapshot(db);
  browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage();page.setDefaultTimeout(12000);const pageErrors=[];page.on('pageerror',e=>pageErrors.push(clean(e?.message||e)));
  await page.goto(PROD,{waitUntil:'domcontentloaded',timeout:20000});await activate(page,auth,actor);await gotoInsurers(page);
  await page.evaluate(()=>{window.__giI5Writes=[];window.addEventListener('orbit:operational-write:committed',e=>window.__giI5Writes.push(e.detail||{}));window.addEventListener('orbit:operational-write:failed',e=>window.__giI5Writes.push({failed:true,...(e.detail||{})}));});
  await page.locator('#asg-new').click();const insurerId=clean(await page.locator('#asg-ficha').getAttribute('data-id'));need(/^asg[0-9]+$/.test(insurerId),'I5_SYNTHETIC_INSURER_ID_INVALID');evidence.syntheticInsurerId=insurerId;const insurerRef=dataItems(db,'aseguradoras').doc(insurerId);
  await page.waitForFunction(id=>(window.__giI5Writes||[]).some(x=>x.collection==='aseguradoras'&&x.id===id&&x.action==='insert'&&x.serverOwned===true&&x.failed!==true),insurerId,{timeout:20000});
  await waitFor(async()=>(await insurerRef.get()).exists,20000,'I5_SYNTHETIC_INSURER_SERVER_READBACK_MISSING');
  evidence.writes.push({action:'insert',collection:'aseguradoras',via:'approved_ui_to_product_store_to_server_owner'});evidence.writesExecuted=1;evidence.dataTouched=true;
  const reloaded=await reloadReadback(page,auth,actor,insurerId,true);evidence.readbackReload=true;need(!/(password|contrasena|secret|token|credentialValue)/i.test(JSON.stringify(reloaded)),'I5_SYNTHETIC_INSURER_SECRET_MATERIAL_DETECTED');
  const refs=await relationRefs(db,insurerId);need(relationTotal(refs)===0,'I5_SYNTHETIC_INSURER_UNEXPECTED_RELATION:'+JSON.stringify(refs));
  const auditId=`audasg_i5_${Date.now().toString(36)}`,requestId=`i5_cleanup_${Date.now().toString(36)}_${insurerId}`;
  const cleanup=await page.evaluate(async x=>{const p=Orbit.productRuntimeBrowserProvidersP0,m=Orbit.auth?.productUser||{};if(!p||typeof p.callFunction!=='function')throw new Error('I5_PRODUCT_PROVIDER_UNAVAILABLE');return p.callFunction('orbit360ProductOperationalCommand',{tenantId:m.tenantId,activeRole:Orbit.session?.rol?.()||m.activeRole,requestId:x.requestId,mutations:[{action:'remove',collection:'aseguradoras',id:x.insurerId},{action:'insert',collection:'auditoriaAsegExterna',id:x.auditId,payload:{id:x.auditId,aseguradoraId:x.insurerId,cambio:'I5 controlled synthetic cleanup',motivo:'Validación LIVE Fase A I5',i5Synthetic:true,containsSecrets:false}}]},'us-central1');},{insurerId,auditId,requestId});
  need(cleanup?.ok===true&&cleanup?.serverOwned===true&&Number(cleanup?.mutationCount)===2,'I5_ATOMIC_CLEANUP_OWNER_REJECTED');evidence.writes.push({action:'atomic_remove_plus_audit',collections:['aseguradoras','auditoriaAsegExterna'],via:'same_server_owner',requestIdRecorded:false});evidence.writesExecuted+=2;
  await waitFor(async()=>!(await insurerRef.get()).exists,10000,'I5_SYNTHETIC_INSURER_FINAL_SERVER_ABSENCE_FAILED');need((await dataItems(db,'auditoriaAsegExterna').doc(auditId).get()).exists,'I5_EXTERNAL_AUDIT_NOT_PERSISTED');const requestSnap=await tenantCollection(db,'operationalRequests').doc(requestId).get();need(requestSnap.exists&&requestSnap.data()?.status==='committed','I5_CLEANUP_OPERATIONAL_REQUEST_MISSING');const eventId=clean(cleanup.eventId);need(eventId,'I5_CLEANUP_OPERATIONAL_EVENT_ID_MISSING');const eventSnap=await tenantCollection(db,'operationalEvents').doc(eventId).get();need(eventSnap.exists&&eventSnap.data()?.containsSecrets===false,'I5_CLEANUP_OPERATIONAL_EVENT_MISSING_OR_UNSAFE');evidence.expectedPersistentAudit={externalAudit:true,operationalRequest:true,operationalEvent:true};
  await reloadReadback(page,auth,actor,insurerId,false);evidence.finalAbsenceReload=true;
  const afterWatch=await watchSnapshot(db),unexpected={};for(const c of WATCH_TOP){const x=containsSynthetic(newDocs(beforeWatch.top[c],afterWatch.top[c]),insurerId);if(x.length)unexpected[`top:${c}`]=x.map(r=>r.id);}for(const c of WATCH_DATA){const x=containsSynthetic(newDocs(beforeWatch.data[c],afterWatch.data[c]),insurerId);if(x.length)unexpected[`data:${c}`]=x.map(r=>r.id);}const finalRelations=await relationRefs(db,insurerId);need(relationTotal(finalRelations)===0,'I5_SYNTHETIC_RELATIONS_RESIDUAL:'+JSON.stringify(finalRelations));need(Object.keys(unexpected).length===0,'I5_UNEXPECTED_SIDE_EFFECTS:'+JSON.stringify(unexpected));need(pageErrors.length===0,'I5_PAGE_ERRORS:'+JSON.stringify(pageErrors));
  evidence.sideEffects={notifications:'none_linked_to_synthetic_id',externalSync:'none_linked_to_synthetic_id',financial:'none_linked_to_synthetic_id',relationships:finalRelations,secretMaterial:false,pageErrors:0};evidence.status='PASS';
}catch(e){evidence.errors.push(clean(e?.stack||e?.message||e));process.exitCode=1;}finally{if(browser)await browser.close().catch(()=>{});await deleteApp(app).catch(()=>{});fs.writeFileSync(path.join(OUT,'i5-controlled-writes.json'),JSON.stringify(evidence,null,2)+'\n');console.log('I5_CONTROLLED_WRITE_STATUS='+evidence.status);console.log('I5_WRITES_EXECUTED='+evidence.writesExecuted);console.log('I5_SYNTHETIC_FINAL_ABSENCE_RELOAD='+evidence.finalAbsenceReload);}
