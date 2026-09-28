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
const OUT=process.env.B2_R77_R81_PROOF_FILE||path.join(process.env.RUNNER_TEMP||process.cwd(),'b2-r77-r81-drive-durable-proof.json');
const LOCK_PATH=process.env.B2_LOCK||'artifacts/orbit360-recovery/release-control/I6_5_FORENSIC_B2_EXECUTION_LOCK_20260920.json';
const RUN=String(process.env.GITHUB_RUN_ID||Date.now());
const clean=(v,m=800)=>String(v==null?'':v).trim().slice(0,m);
const norm=v=>clean(v,180).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const uniq=a=>[...new Set([].concat(a||[]).map(x=>clean(x,180)).filter(Boolean))];
const hash=v=>crypto.createHash('sha256').update(String(v||''),'utf8').digest('hex');
const need=(v,c)=>{if(!v)throw new Error(c);};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function waitFor(fn,label,timeout=30000,interval=300){
  const end=Date.now()+timeout;let last;
  while(Date.now()<end){try{const v=await fn();if(v)return v;last=v;}catch(e){last=e;}await sleep(interval);}
  throw new Error(label+':'+clean(last&&last.message||last||'timeout',1000));
}
function sa(){
  for(const k of ['SA_DEFAULT','SA_ORBIT360_LAB','SA_ORBIT_360_LAB']){
    try{const x=JSON.parse(process.env[k]||'');if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.private_key)return x;}catch{}
  }
  if(process.env.GOOGLE_APPLICATION_CREDENTIALS){
    const x=JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS,'utf8'));
    if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.private_key)return x;
  }
  throw new Error('B2_R77_R81_SERVICE_ACCOUNT_REQUIRED');
}
function roles(m){return uniq([...(m?.roles||[]),...(m?.rolesAsignados||[]),...(m?.assignedRoles||[]),m?.role,m?.rol,m?.rolDefault,m?.defaultRole,m?.activeRole]);}
async function pickActor(db,auth){
  const snap=await db.collection('tenants').doc(TENANT).collection('members').get(),out=[];
  for(const d of snap.docs){
    const m=d.data()||{},rr=roles(m),rn=rr.map(norm),st=norm(m.status||m.estado||'active');
    if(m.active===false||m.activo===false||['inactive','inactivo','blocked','bloqueado','suspended','suspendido'].includes(st))continue;
    if(!rn.includes('operativo'))continue;
    const advisorId=clean(m.advisorId||m.asesorId,180);if(!advisorId)continue;
    const privileged=rn.some(x=>['direccion','superadmin','super_admin','admintenant','admin_tenant','admin'].includes(x));
    for(const uid of uniq([m.uid,d.id])){
      try{const u=await auth.getUser(uid);if(u.disabled)continue;out.push({uid:u.uid,advisorId,roles:rr,emailVerified:u.emailVerified===true,privileged,score:(privileged?100:0)+(u.emailVerified?10:0)+rr.length});break;}catch{}
    }
  }
  out.sort((a,b)=>b.score-a.score);
  need(out.length,'B2_R77_R81_NO_OPERATIVO_ACTOR');
  return out[0];
}
async function activate(page,auth,actor){
  const token=await auth.createCustomToken(actor.uid,{b2PreviewQa:true,r77r81:true});
  await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:20000});
  const st=await page.evaluate(async t=>{
    const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();
    if(!c.auth.currentUser)await c.modules.auth.signInWithCustomToken(c.auth,t);
    return Orbit.productAppP0.status?.().started?Orbit.productAppP0.status():Orbit.productAppP0.activate();
  },token);
  need(st?.started,'B2_R77_R81_APP_START_FAILED');
  await page.waitForFunction(()=>{
    const s=window.Orbit?.store?._productStatus?.();
    return !!s&&s.ready===true&&window.Orbit?.store?.__productOperationalWriteP0===true;
  },null,{timeout:30000});
  const legal=page.locator('[data-legal-gate]').last();
  if(await legal.waitFor({state:'visible',timeout:1800}).then(()=>true).catch(()=>false)){
    await legal.locator('#lg-chk').check();await legal.locator('#lg-ok').click();await legal.waitFor({state:'detached',timeout:10000});
  }
}
async function setRole(page,role){
  const ok=await page.evaluate(r=>Orbit.session&&Orbit.session.set&&Orbit.session.set(r),role);
  need(ok===true,'B2_R77_R81_ROLE_SET_FAILED:'+role);
  await page.waitForTimeout(500);
}
const lock=JSON.parse(fs.readFileSync(LOCK_PATH,'utf8'));
need(lock.status==='PREVIEW_AUTHENTICATED_PASS_PENDING_PAULA_VISUAL','B2_R77_R81_LOCK_STATE');
need(lock.authenticatedPreviewProof?.status==='PASS','B2_R77_R81_AUTH_PASS_REQUIRED');
need(Array.isArray(lock.nextRequiredProof)&&lock.nextRequiredProof[0]==='R77_R81_SYNTHETIC_B2_DRIVE_UPLOAD_AND_DURABLE_READBACK','B2_R77_R81_CURSOR');
need(lock.preview?.url===TARGET&&lock.preview?.livePromoted===false&&lock.preview?.exactReadback===true&&lock.preview?.functionalPass===true,'B2_R77_R81_PREVIEW_BINDING');
const bounds=lock.authenticatedPreviewProof?.boundaries||{};
need(bounds.syntheticQaWritesAuthorized===true&&bounds.cleanupMandatory===true&&bounds.businessDataMutationAuthorized===false&&bounds.reimportAuthorized===false&&bounds.emailSendAuthorized===false&&bounds.liveHostingPromotionAuthorized===false,'B2_R77_R81_BOUNDARY');

let app,browser,context,page;
const evidence={
  schema:'GRAVICENTRA_I6_5_B2_R77_R81_DRIVE_DURABLE_RUNTIME_PROOF_V1',
  status:'RUNNING',runId:Number(RUN),tenantId:TENANT,
  exactPreview:{sourceSha:lock.preview.sourceSha,buildId:lock.preview.buildId,url:lock.preview.url,previewRunId:lock.preview.runId,artifactId:lock.preview.artifactId},
  boundaries:{syntheticOnly:true,realClientMutation:false,productionHosting:false,b3:false,reimport:false,emailSend:false,cleanupMandatory:true},
  writes:{syntheticFixture:0,clientDocumentLink:0,managementCreate:0,managementDocumentLink:0},
  r77:{},r81:{},reload:{},errors:[],pageErrors:[],consoleErrors:[],cleanup:{pending:true,targets:{}}
};
fs.mkdirSync(path.dirname(OUT),{recursive:true});

try{
  app=initializeApp({credential:cert(sa()),projectId:PROJECT},'b2-r77-r81-'+RUN);
  const db=getFirestore(app),auth=getAuth(app);
  const dataCol=name=>db.collection('tenants').doc(TENANT).collection('data').doc(name).collection('items');
  let preRunDeleted=0;
  for(const colName of ['gestiones','clientes']){
    const stale=await dataCol(colName).where('qaFixtureType','==','B2_R77_R81_DRIVE_DURABLE').get();
    for(const d of stale.docs){
      const row=d.data()||{};
      const refs=[...(Array.isArray(row.documentos)?row.documentos:[]),...(Array.isArray(row.adjuntos)?row.adjuntos:[])].filter(x=>x&&(x.documentRef||x.fileId||x.driveUrl||x.externalUrl));
      if(refs.length||row.driveFolderId)throw new Error('B2_R77_R81_STALE_DRIVE_FIXTURE_REQUIRES_ORDERED_CLEANUP:'+colName+':'+d.id);
      await d.ref.delete();preRunDeleted++;
    }
  }
  evidence.cleanup.preRunOrphanRowsDeleted=preRunDeleted;
  const actor=await pickActor(db,auth);
  evidence.actor={uidHash:hash(actor.uid),advisorIdHash:hash(actor.advisorId),roles:actor.roles};
  const suffix=RUN.replace(/[^0-9A-Za-z_-]/g,'').slice(-24);
  const clientId='b2-r7781-client-'+suffix;
  const managementId='b2-r7781-gestion-'+suffix;
  const clientRef=dataCol('clientes').doc(clientId);
  const managementRef=dataCol('gestiones').doc(managementId);
  need(!(await clientRef.get()).exists,'B2_R77_R81_CLIENT_ID_CONFLICT');
  need(!(await managementRef.get()).exists,'B2_R77_R81_MANAGEMENT_ID_CONFLICT');
  const now=new Date().toISOString();
  await clientRef.set({
    id:clientId,tenantId:TENANT,nombre:'B2 QA · R77 R81 DRIVE · NO USAR',tipo:'Persona',pais:'GT',moneda:'GTQ',
    asesorId:actor.advisorId,identificacion:'B2R7781-'+suffix,estado:'Nuevo',estadoOperativo:'Nuevo',segmento:'Nuevo',canal:'B2 QA',
    telefono:'',correo:'',documentos:[],previewWrite:true,qaFixture:true,qaFixtureType:'B2_R77_R81_DRIVE_DURABLE',
    exactPreviewSourceSha:lock.preview.sourceSha,exactPreviewBuildId:lock.preview.buildId,exactPreviewRunId:lock.preview.runId,
    creado:now,actualizado:now
  },{merge:false});
  evidence.writes.syntheticFixture++;
  const clientSeed=await clientRef.get();
  need(clientSeed.exists&&clientSeed.data()?.qaFixtureType==='B2_R77_R81_DRIVE_DURABLE','B2_R77_R81_CLIENT_SEED_READBACK');

  browser=await chromium.launch({headless:true});
  context=await browser.newContext({viewport:{width:1440,height:980}});
  page=await context.newPage();
  page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);
  page.on('pageerror',e=>evidence.pageErrors.push(clean(e?.message||e,1200)));
  page.on('console',m=>{if(m.type()==='error')evidence.consoleErrors.push(clean(m.text(),1200));});
  await page.goto(TARGET+'/?r7781='+Date.now()+'#/inicio',{waitUntil:'domcontentloaded',timeout:30000});
  await activate(page,auth,actor);
  await setRole(page,'Operativo');

  const providerStatus=await page.evaluate(async()=>{
    const p=Orbit.productDriveDocumentProviderP0;
    const s=p&&p.probe?await p.probe(true):null;
    return{present:!!p,status:s,secureUpload:typeof Orbit.secureResources?.uploadDocument==='function'};
  });
  need(providerStatus.present&&providerStatus.secureUpload&&providerStatus.status?.available===true&&providerStatus.status?.configured===true&&providerStatus.status?.uploadAvailable===true,'B2_R77_R81_DRIVE_PROVIDER_UNAVAILABLE:'+JSON.stringify(providerStatus));

  const clientText='GRAVICENTRA B2 R81 durable client document '+suffix;
  const managementText='GRAVICENTRA B2 R77 durable management attachment '+suffix;

  const r81=await page.evaluate(async ({clientId,text,suffix})=>{
    const f=new File([text], 'b2-r81-'+suffix+'.txt', {type:'text/plain'});
    const out=await Orbit.secureResources.uploadDocument(f,{entidad:'cliente',entidadId:clientId,clienteId:clientId,categoria:'expediente_cliente',nombre:f.name});
    if(!out||out.ok!==true||!out.documentRef) return {ok:false,phase:'upload',out};
    const cli=Orbit.store.get('clientes',clientId);
    if(!cli)return{ok:false,phase:'client_missing'};
    const previous=Array.isArray(cli.documentos)?cli.documentos.slice():[];
    const doc={id:out.documentRef,nombre:out.nombre||f.name,documentRef:out.documentRef,driveUrl:out.driveUrl||out.externalUrl||'',externalUrl:out.externalUrl||out.driveUrl||'',mimeType:out.mimeType||f.type,size:f.size,origen:out.repository||'Drive',clienteId:clientId,categoria:'expediente_cliente',clientFolderId:out.clientFolderId||'',clientFolderUrl:out.clientFolderUrl||'',contentHash:out.contentHash||'',provenance:{source:'usuario',repository:'Drive',confirmed:true}};
    const merged=previous.filter(x=>String(x?.documentRef||'')!==String(out.documentRef));merged.push(doc);
    const patch={documentos:merged,actualizado:new Date().toISOString().slice(0,10)};
    if(out.clientFolderId)patch.driveFolderId=out.clientFolderId;
    if(out.clientFolderUrl){patch.driveLink=out.clientFolderUrl;patch.driveUrl=out.clientFolderUrl;}
    await Orbit.store.updateDurable('clientes',clientId,patch);
    const local=Orbit.store.get('clientes',clientId);
    return{ok:true,documentRef:out.documentRef,clientFolderId:out.clientFolderId||'',clientFolderUrl:out.clientFolderUrl||'',contentHash:out.contentHash||'',canonicalReadback:out.canonicalReadback===true,backendPersistent:out.backendPersistent===true,localLinked:Array.isArray(local?.documentos)&&local.documentos.some(x=>x?.documentRef===out.documentRef)};
  },{clientId,text:clientText,suffix});
  need(r81?.ok===true&&r81.documentRef&&r81.localLinked===true&&r81.canonicalReadback===true&&r81.backendPersistent===true,'B2_R81_UPLOAD_LINK_FAILED:'+JSON.stringify(r81));
  evidence.writes.clientDocumentLink++;

  const management=await page.evaluate(async ({managementId,clientId,advisorId})=>{
    return Orbit.ciclo.crearGestionDurable({
      id:managementId,lista:'Gestiones Admin',tipo:'Gestión QA documental',titulo:'B2 QA R77 adjunto Drive',
      clienteId:clientId,polizaId:'',asesorId,prioridad:'Media',estado:'Pendiente',vence:new Date().toISOString().slice(0,10),
      proximaAccion:'Validar soporte documental QA',nota:'Fixture sintético B2 R77/R81',origen:'B2 QA',
      adjuntos:[],checklist:[{t:'Documentación adjunta',done:false}],qaFixture:true,qaFixtureType:'B2_R77_R81_DRIVE_DURABLE'
    });
  },{managementId,clientId,advisorId:actor.advisorId});
  need(management&&management.id===managementId,'B2_R77_MANAGEMENT_CREATE_FAILED');
  evidence.writes.managementCreate++;

  const r77=await page.evaluate(async ({managementId,clientId,text,suffix})=>{
    const f=new File([text], 'b2-r77-'+suffix+'.txt', {type:'text/plain'});
    const out=await Orbit.secureResources.uploadDocument(f,{entidad:'gestion',entidadId:managementId,clienteId:clientId,categoria:'soporte_gestion',nombre:f.name});
    if(!out||out.ok!==true||!out.documentRef)return{ok:false,phase:'upload',out};
    const doc={nombre:out.nombre||f.name,documentRef:out.documentRef,driveUrl:out.driveUrl||out.externalUrl||'',externalUrl:out.externalUrl||out.driveUrl||'',mimeType:out.mimeType||f.type,size:f.size,origen:out.repository||'Drive',clienteId:clientId,entidad:'gestion',entidadId:managementId,contentHash:out.contentHash||''};
    await Orbit.store.updateDurable('gestiones',managementId,{adjuntos:[doc],documentoCargaPendiente:false,documentoCargaFallida:[],actualizado:new Date().toISOString().slice(0,10)});
    const g=Orbit.store.get('gestiones',managementId);
    return{ok:true,documentRef:out.documentRef,clientFolderId:out.clientFolderId||'',contentHash:out.contentHash||'',canonicalReadback:out.canonicalReadback===true,backendPersistent:out.backendPersistent===true,localLinked:Array.isArray(g?.adjuntos)&&g.adjuntos.some(x=>x?.documentRef===out.documentRef)};
  },{managementId,clientId,text:managementText,suffix});
  need(r77?.ok===true&&r77.documentRef&&r77.localLinked===true&&r77.canonicalReadback===true&&r77.backendPersistent===true,'B2_R77_UPLOAD_LINK_FAILED:'+JSON.stringify(r77));
  evidence.writes.managementDocumentLink++;

  const clientDb=await waitFor(async()=>{const s=await clientRef.get(),d=s.data()||{};return s.exists&&Array.isArray(d.documentos)&&d.documentos.some(x=>x?.documentRef===r81.documentRef)?d:null;},'B2_R81_FIRESTORE_DOCUMENT_LINK_READBACK');
  const managementDb=await waitFor(async()=>{const s=await managementRef.get(),d=s.data()||{};return s.exists&&Array.isArray(d.adjuntos)&&d.adjuntos.some(x=>x?.documentRef===r77.documentRef)?d:null;},'B2_R77_FIRESTORE_ATTACHMENT_READBACK');
  need(clean(clientDb.driveFolderId,180)===clean(r81.clientFolderId,180),'B2_R81_FOLDER_BINDING_READBACK');
  evidence.r81={status:'PASS',rawFileStored:true,canonicalDocumentRef:true,durableClientLink:true,firestoreReadback:true,clientFolderBound:true,providerCanonicalReadback:true,documentRefHash:hash(r81.documentRef),folderIdHash:hash(r81.clientFolderId),contentHash:r81.contentHash};
  evidence.r77={status:'PASS',rawFileStored:true,canonicalDocumentRef:true,durableManagementLink:true,firestoreReadback:true,providerCanonicalReadback:true,documentRefHash:hash(r77.documentRef),folderIdHash:hash(r77.clientFolderId),contentHash:r77.contentHash};

  await page.reload({waitUntil:'domcontentloaded',timeout:30000});
  await activate(page,auth,actor);
  await setRole(page,'Operativo');
  const reload=await page.evaluate(async ({clientId,managementId,clientRef,managementRef,clientText,managementText})=>{
    const c=Orbit.store.get('clientes',clientId),g=Orbit.store.get('gestiones',managementId),p=Orbit.productDriveDocumentProviderP0;
    const cdoc=(Array.isArray(c?.documentos)?c.documentos:[]).find(x=>String(x?.documentRef||'')===clientRef);
    const gdoc=(Array.isArray(g?.adjuntos)?g.adjuntos:[]).find(x=>String(x?.documentRef||'')===managementRef);
    if(!cdoc||!gdoc||!p)return{ok:false,clientLinked:!!cdoc,managementLinked:!!gdoc,provider:!!p};
    const cr=await p.resolve(clientRef,{entidad:'cliente',entidadId:clientId,clienteId:clientId});
    const gr=await p.resolve(managementRef,{entidad:'gestion',entidadId:managementId,clienteId:clientId});
    let ct='',gt='';
    if(cr?.ok&&cr.previewUrl)ct=await fetch(cr.previewUrl).then(r=>r.text());
    if(gr?.ok&&gr.previewUrl)gt=await fetch(gr.previewUrl).then(r=>r.text());
    return{ok:true,clientLinked:true,managementLinked:true,clientDriveRead:cr?.ok===true,managementDriveRead:gr?.ok===true,clientContentMatch:ct===clientText,managementContentMatch:gt===managementText,clientDownloadAvailable:cr?.downloadAvailable===true,managementDownloadAvailable:gr?.downloadAvailable===true};
  },{clientId,managementId,clientRef:r81.documentRef,managementRef:r77.documentRef,clientText,managementText});
  need(reload?.ok===true&&reload.clientLinked===true&&reload.managementLinked===true&&reload.clientDriveRead===true&&reload.managementDriveRead===true&&reload.clientContentMatch===true&&reload.managementContentMatch===true,'B2_R77_R81_RELOAD_DRIVE_READBACK_FAILED:'+JSON.stringify(reload));
  evidence.reload=reload;

  const finalClient=await clientRef.get(),finalManagement=await managementRef.get();
  need(finalClient.exists&&finalManagement.exists,'B2_R77_R81_FINAL_PERSISTENCE_MISSING');
  evidence.cleanup.targets={clientId,managementId,clientDocumentRef:r81.documentRef,managementDocumentRef:r77.documentRef,clientFolderId:r81.clientFolderId||r77.clientFolderId||''};
  evidence.cleanup.pending=true;
  evidence.cleanup.noOperationalRowsTouched=true;
  evidence.pageErrors=evidence.pageErrors.filter(Boolean);
  evidence.consoleErrors=evidence.consoleErrors.filter(x=>!/favicon\.ico|ERR_BLOCKED_BY_CLIENT/i.test(x));
  need(evidence.pageErrors.length===0,'B2_R77_R81_PAGE_ERRORS:'+JSON.stringify(evidence.pageErrors));
  need(evidence.consoleErrors.length===0,'B2_R77_R81_CONSOLE_ERRORS:'+JSON.stringify(evidence.consoleErrors.slice(0,5)));
  evidence.status='PASS';
}catch(error){
  evidence.status='FAIL';evidence.errors.push(clean(error?.stack||error,5000));
  throw error;
}finally{
  try{if(page)await page.close();}catch{}
  try{if(context)await context.close();}catch{}
  try{if(browser)await browser.close();}catch{}
  try{if(app)await deleteApp(app);}catch{}
  fs.writeFileSync(OUT,JSON.stringify(evidence,null,2)+'\n');
  console.log('B2_R77_R81_DRIVE_DURABLE_PROOF='+evidence.status+' '+JSON.stringify({r77:evidence.r77?.status||'',r81:evidence.r81?.status||'',reload:evidence.reload?.ok===true,cleanupPending:evidence.cleanup?.pending===true,writes:evidence.writes,errors:evidence.errors}));
}
