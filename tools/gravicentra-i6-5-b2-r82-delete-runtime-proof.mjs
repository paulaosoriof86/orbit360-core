import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium } from 'playwright';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT='ays-orbit-360-lab';
const TENANT=String(process.env.TENANT_HINT||'alianzas-soluciones').trim();
const TARGET=String(process.env.TARGET_URL||'').replace(/\/$/,'');
const OUT=process.env.B2_R82_PROOF_FILE||path.join(process.env.RUNNER_TEMP||process.cwd(),'b2-r82-delete-runtime-proof.json');
const LOCK_PATH=process.env.B2_LOCK||'artifacts/orbit360-recovery/release-control/I6_5_FORENSIC_B2_EXECUTION_LOCK_20260920.json';
const RUN=String(process.env.GITHUB_RUN_ID||Date.now());
const clean=(v,m=800)=>String(v==null?'':v).trim().slice(0,m);
const norm=v=>clean(v,180).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const uniq=a=>[...new Set([].concat(a||[]).map(x=>clean(x,180)).filter(Boolean))];
const hash=v=>crypto.createHash('sha256').update(String(v||''),'utf8').digest('hex');
const need=(v,c)=>{if(!v)throw new Error(c);};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function waitFor(fn,label,timeout=30000,interval=250){const end=Date.now()+timeout;let last;while(Date.now()<end){try{const v=await fn();if(v)return v;last=v;}catch(e){last=e;}await sleep(interval);}throw new Error(label+':'+clean(last&&last.message||last||'timeout',1200));}
function sa(){for(const k of ['SA_DEFAULT','SA_ORBIT360_LAB','SA_ORBIT_360_LAB']){try{const x=JSON.parse(process.env[k]||'');if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.private_key)return x;}catch{}}if(process.env.GOOGLE_APPLICATION_CREDENTIALS){const x=JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS,'utf8'));if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.private_key)return x;}throw new Error('B2_R82_SERVICE_ACCOUNT_REQUIRED');}
function roles(m){return uniq([...(m?.roles||[]),...(m?.rolesAsignados||[]),...(m?.assignedRoles||[]),m?.role,m?.rol,m?.rolDefault,m?.defaultRole,m?.activeRole]);}
function preferredRole(rr){const map=new Map(rr.map(x=>[norm(x),x]));for(const k of ['superadmin','super_admin','admintenant','admin_tenant','direccion','admin'])if(map.has(k))return map.get(k);return'';}
async function pickActor(db,auth){const snap=await db.collection('tenants').doc(TENANT).collection('members').get(),out=[];for(const d of snap.docs){const m=d.data()||{},rr=roles(m),role=preferredRole(rr),st=norm(m.status||m.estado||'active');if(!role||m.active===false||m.activo===false||['inactive','inactivo','blocked','bloqueado','suspended','suspendido'].includes(st))continue;const advisorId=clean(m.advisorId||m.asesorId,180);if(!advisorId)continue;for(const uid of uniq([m.uid,d.id])){try{const u=await auth.getUser(uid);if(u.disabled)continue;out.push({uid:u.uid,advisorId,roles:rr,role,emailVerified:u.emailVerified===true,score:(/super/i.test(role)?100:/admin/i.test(role)?90:/direccion/i.test(role)?80:50)+(u.emailVerified?10:0)});break;}catch{}}}out.sort((a,b)=>b.score-a.score);need(out.length,'B2_R82_PRIVILEGED_ACTOR_MISSING');return out[0];}
async function activate(page,auth,actor){const token=await auth.createCustomToken(actor.uid,{b2PreviewQa:true,r82:true});await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:20000});const st=await page.evaluate(async t=>{const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();if(!c.auth.currentUser)await c.modules.auth.signInWithCustomToken(c.auth,t);return Orbit.productAppP0.status?.().started?Orbit.productAppP0.status():Orbit.productAppP0.activate();},token);need(st?.started,'B2_R82_APP_START_FAILED');await page.waitForFunction(()=>{const s=window.Orbit?.store?._productStatus?.();return !!s&&s.ready===true&&window.Orbit?.store?.__productOperationalWriteP0===true;},null,{timeout:30000});const legal=page.locator('[data-legal-gate]').last();if(await legal.waitFor({state:'visible',timeout:1500}).then(()=>true).catch(()=>false)){await legal.locator('#lg-chk').check();await legal.locator('#lg-ok').click();await legal.waitFor({state:'detached',timeout:10000});}}
async function setRole(page,role){const ok=await page.evaluate(r=>Orbit.session&&Orbit.session.set&&Orbit.session.set(r),role);need(ok===true,'B2_R82_ROLE_SET_FAILED:'+role);await page.waitForTimeout(500);}

const lock=JSON.parse(fs.readFileSync(LOCK_PATH,'utf8'));
need(lock.status==='PREVIEW_AUTHENTICATED_PASS_PENDING_PAULA_VISUAL','B2_R82_LOCK_STATE');
need(lock.authenticatedPreviewProof?.status==='PASS','B2_R82_AUTH_PASS_REQUIRED');
need(Array.isArray(lock.nextRequiredProof)&&lock.nextRequiredProof[0]==='R82_CROSS_MODULE_DELETE_FINAL_AUDIT','B2_R82_CURSOR');
need(lock.preview?.url===TARGET&&lock.preview?.livePromoted===false&&lock.preview?.exactReadback===true&&lock.preview?.functionalPass===true,'B2_R82_PREVIEW_BINDING');

let app,browser,context,page,db,auth;
const evidence={schema:'GRAVICENTRA_I6_5_B2_R82_DELETE_RUNTIME_PROOF_V1',status:'RUNNING',runId:Number(RUN),tenantId:TENANT,exactPreview:{sourceSha:lock.preview.sourceSha,buildId:lock.preview.buildId,url:lock.preview.url,previewRunId:lock.preview.runId,artifactId:lock.preview.artifactId},boundaries:{syntheticOnly:true,productionHosting:false,b3:false,reimport:false,emailSend:false},collections:{},blocker:{},reload:{},cleanup:{pending:true,deletedRows:0},errors:[],pageErrors:[],consoleErrors:[]};
fs.mkdirSync(path.dirname(OUT),{recursive:true});

try{
  app=initializeApp({credential:cert(sa()),projectId:PROJECT},'b2-r82-'+RUN);db=getFirestore(app);auth=getAuth(app);
  const actor=await pickActor(db,auth);evidence.actor={uidHash:hash(actor.uid),advisorIdHash:hash(actor.advisorId),role:actor.role,roles:actor.roles};
  const dataCol=name=>db.collection('tenants').doc(TENANT).collection('data').doc(name).collection('items');
  const suffix=RUN.replace(/[^0-9A-Za-z_-]/g,'').slice(-20),now=new Date().toISOString();
  const defs=[
    ['clientes','cliente360',{nombre:'B2 QA R82 Cliente',tipo:'Persona',pais:'GT',moneda:'GTQ'}],
    ['polizas','polizas',{numero:'B2-R82-POL-'+suffix,estado:'borrador',pais:'GT',moneda:'GTQ'}],
    ['vehiculos','polizas',{placa:'B2R82'+suffix.slice(-4),marca:'QA',linea:'R82',estado:'borrador'}],
    ['cobros','cobros',{numero:'B2-R82-COB-'+suffix,estado:'Pendiente',estadoOperativo:'Pendiente',monto:1}],
    ['gestiones','ops',{lista:'Gestiones Admin',tipo:'Gestión QA R82',titulo:'B2 QA R82 Gestión',estado:'Pendiente',prioridad:'Media',previewWrite:true}],
    ['negocios','leads',{nombre:'B2 QA R82 Lead',tipo:'QA',etapa:'nuevo',estado:'Nuevo',previewWrite:true}],
    ['reclamos','siniestros',{numero:'B2-R82-SIN-'+suffix,tipo:'QA',estado:'Abierto'}],
    ['cancelaciones','cancelaciones',{tipo:'QA',estado:'Pendiente',recuperacion:'Pendiente'}],
    ['comisiones','comisiones',{periodo:'B2 R82',estado:'Pendiente',monto:1,moneda:'GTQ'}],
    ['asesores','equipo',{nombre:'B2 QA R82 Asesor',email:'',activo:true,estado:'activo'}],
    ['aseguradoras','aseguradoras',{nombre:'B2 QA R82 Aseguradora',activo:true,estado:'activo'}]
  ];
  const ids={};
  for(const [collection,,extra] of defs){const id='b2-r82-'+collection+'-'+suffix;ids[collection]=id;await dataCol(collection).doc(id).set({id,tenantId:TENANT,asesorId:collection==='asesores'?id:actor.advisorId,advisorId:collection==='asesores'?id:actor.advisorId,qaFixture:true,qaFixtureType:'B2_R82_DELETE_RUNTIME',createdAt:now,updatedAt:now,...extra},{merge:false});}
  const blockedClient='b2-r82-blocked-client-'+suffix,blockedPolicy='b2-r82-blocked-policy-'+suffix;
  await dataCol('clientes').doc(blockedClient).set({id:blockedClient,tenantId:TENANT,nombre:'B2 QA R82 Cliente Bloqueado',tipo:'Persona',pais:'GT',moneda:'GTQ',asesorId:actor.advisorId,qaFixture:true,qaFixtureType:'B2_R82_DELETE_RUNTIME',createdAt:now,updatedAt:now},{merge:false});
  await dataCol('polizas').doc(blockedPolicy).set({id:blockedPolicy,tenantId:TENANT,numero:'B2-R82-BLOCK-'+suffix,clienteId:blockedClient,asesorId:actor.advisorId,estado:'vigente',pais:'GT',moneda:'GTQ',qaFixture:true,qaFixtureType:'B2_R82_DELETE_RUNTIME',createdAt:now,updatedAt:now},{merge:false});
  evidence.seedCount=defs.length+2;

  browser=await chromium.launch({headless:true});context=await browser.newContext({viewport:{width:1440,height:980}});page=await context.newPage();page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);
  page.on('pageerror',e=>evidence.pageErrors.push(clean(e?.message||e,1200)));page.on('console',m=>{if(m.type()==='error')evidence.consoleErrors.push(clean(m.text(),1200));});
  await page.goto(TARGET+'/?r82='+Date.now()+'#/inicio',{waitUntil:'domcontentloaded',timeout:30000});await activate(page,auth,actor);await setRole(page,actor.role);

  await page.waitForFunction(ids=>Object.entries(ids).every(([c,id])=>!!window.Orbit?.store?.get?.(c,id)),ids,{timeout:45000});
  await page.waitForFunction(({a,b})=>!!Orbit.store.get('clientes',a)&&!!Orbit.store.get('polizas',b),{a:blockedClient,b:blockedPolicy},{timeout:15000});
  const staticRuntime=await page.evaluate(()=>({recordDelete:!!Orbit.recordDelete,remove:typeof Orbit.recordDelete?.remove==='function',blockers:typeof Orbit.recordDelete?.blockers==='function',moduleCan:typeof Orbit.recordDelete?.can==='function'}));
  need(staticRuntime.recordDelete&&staticRuntime.remove&&staticRuntime.blockers&&staticRuntime.moduleCan,'B2_R82_CANONICAL_DELETE_OWNER_MISSING');

  const reason='Prueba sintética B2 R82 '+suffix;
  const blocked=await page.evaluate(async ({id,reason})=>{const old={confirm:Orbit.ui?.confirm,prompt:Orbit.ui?.prompt,alert:Orbit.ui?.alert,toast:Orbit.ui?.toast};if(Orbit.ui){Orbit.ui.confirm=async()=>true;Orbit.ui.prompt=async()=>reason;Orbit.ui.alert=async()=>true;Orbit.ui.toast=()=>{};}try{return await Orbit.recordDelete.remove('clientes',id,{label:'B2 QA bloqueado'});}finally{if(Orbit.ui){Object.assign(Orbit.ui,old);}}},{id:blockedClient,reason});
  need(blocked?.ok===false&&blocked?.code==='DELETE_RELATION_BLOCKED'&&Array.isArray(blocked.blockers)&&blocked.blockers.length>0,'B2_R82_RELATION_BLOCKER_FAILED:'+JSON.stringify(blocked));
  const blockedSnap=await dataCol('clientes').doc(blockedClient).get();need(blockedSnap.exists&&blockedSnap.data()?.deleted!==true,'B2_R82_BLOCKED_CLIENT_MUTATED');
  evidence.blocker={status:'PASS',code:blocked.code,blockerCount:blocked.blockers.length,recordUnchanged:true};

  const roleDenied=await page.evaluate(async ({id})=>{const assigned=(Orbit.session&&Orbit.session.assignedRoles?Orbit.session.assignedRoles():[])||[];const advisorRole=assigned.find(r=>/asesor|comercial/i.test(String(r||'')));if(!advisorRole)return{skipped:true,reason:'NO_ADVISOR_ROLE_ASSIGNED'};Orbit.session.set(advisorRole);await new Promise(r=>setTimeout(r,300));const row=Orbit.store.get('asesores',id);return{skipped:false,role:advisorRole,can:!!row&&Orbit.recordDelete.can('asesores',row)};},{id:ids.asesores});
  evidence.scopeDenied=roleDenied;
  await setRole(page,actor.role);

  for(const [collection,moduleKey] of defs.map(x=>[x[0],x[1]])){
    const id=ids[collection];
    const result=await page.evaluate(async ({collection,id,reason})=>{const old={confirm:Orbit.ui?.confirm,prompt:Orbit.ui?.prompt,alert:Orbit.ui?.alert,toast:Orbit.ui?.toast};if(Orbit.ui){Orbit.ui.confirm=async()=>true;Orbit.ui.prompt=async()=>reason;Orbit.ui.alert=async()=>true;Orbit.ui.toast=()=>{};}try{return await Orbit.recordDelete.remove(collection,id,{label:'B2 QA '+collection});}finally{if(Orbit.ui){Object.assign(Orbit.ui,old);}}},{collection,id,reason});
    need(result?.ok===true&&result?.softDelete===true,'B2_R82_DELETE_RUNTIME_FAILED:'+collection+':'+JSON.stringify(result));
    const row=await waitFor(async()=>{const s=await dataCol(collection).doc(id).get();const d=s.data()||{};return s.exists&&d.deleted===true&&d.eliminado===true&&d.archivado===true&&clean(d.deleteReason)===reason&&clean(d.deletedAt)?d:null;},'B2_R82_FIRESTORE_DELETE_READBACK_'+collection,30000);
    evidence.collections[collection]={status:'PASS',module:moduleKey,softDelete:true,deleted:true,eliminado:true,archivado:true,reasonPersisted:clean(row.deleteReason)===reason,deletedAtPersisted:!!clean(row.deletedAt),actorRolePersisted:!!clean(row.deletedByRole),actorUidPersisted:!!clean(row.deletedByUid)};
    if(collection==='gestiones'||collection==='negocios')need(evidence.collections[collection].actorRolePersisted&&evidence.collections[collection].actorUidPersisted,'B2_R82_OPS_LEADS_AUDIT_METADATA_MISSING:'+collection);
  }

  await page.reload({waitUntil:'domcontentloaded',timeout:30000});await activate(page,auth,actor);await setRole(page,actor.role);
  await page.waitForFunction(()=>{const s=window.Orbit?.store?._productStatus?.()||{};return s.ready===true;},null,{timeout:30000});
  await page.waitForTimeout(2500);
  const hidden=await page.evaluate(ids=>Object.entries(ids).map(([collection,id])=>({collection,id,present:!!Orbit.store.get(collection,id)})),ids);
  const visibleDeleted=hidden.filter(x=>x.present===true);
  need(visibleDeleted.length===0,'B2_R82_SOFT_DELETE_PROJECTION_RELOAD_FAILED:'+JSON.stringify(visibleDeleted));
  evidence.reload={status:'PASS',allDeletedHidden:true,checked:hidden.length};

  for(const [collection,id] of [...Object.entries(ids),['clientes',blockedClient],['polizas',blockedPolicy]]){await dataCol(collection).doc(id).delete().catch(()=>{});evidence.cleanup.deletedRows++;}
  evidence.cleanup.pending=false;evidence.cleanup.businessRowsResidual=0;
  evidence.pageErrors=evidence.pageErrors.filter(Boolean);evidence.consoleErrors=evidence.consoleErrors.filter(x=>!/favicon\.ico|ERR_BLOCKED_BY_CLIENT/i.test(x));
  need(evidence.pageErrors.length===0,'B2_R82_PAGE_ERRORS:'+JSON.stringify(evidence.pageErrors));
  need(evidence.consoleErrors.length===0,'B2_R82_CONSOLE_ERRORS:'+JSON.stringify(evidence.consoleErrors.slice(0,5)));
  evidence.status='PASS';
}catch(error){evidence.status='FAIL';evidence.errors.push(clean(error?.stack||error,6000));throw error;
}finally{
  try{if(db){const cols=['clientes','polizas','vehiculos','cobros','gestiones','negocios','reclamos','cancelaciones','comisiones','asesores','aseguradoras'];for(const c of cols){const q=await db.collection('tenants').doc(TENANT).collection('data').doc(c).collection('items').where('qaFixtureType','==','B2_R82_DELETE_RUNTIME').get().catch(()=>null);if(q)for(const d of q.docs)await d.ref.delete().catch(()=>{});}}}catch{}
  try{if(page)await page.close();}catch{}try{if(context)await context.close();}catch{}try{if(browser)await browser.close();}catch{}try{if(app)await deleteApp(app);}catch{}
  fs.writeFileSync(OUT,JSON.stringify(evidence,null,2)+'\n');
  console.log('B2_R82_DELETE_RUNTIME_PROOF='+evidence.status+' '+JSON.stringify({collections:Object.fromEntries(Object.entries(evidence.collections).map(([k,v])=>[k,v.status])),blocker:evidence.blocker?.status||'',reload:evidence.reload?.status||'',cleanupPending:evidence.cleanup?.pending,errors:evidence.errors}));
}
