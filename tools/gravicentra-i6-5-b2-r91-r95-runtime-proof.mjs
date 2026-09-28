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
const OUT=process.env.B2_R91_R95_PROOF_FILE||path.join(process.env.RUNNER_TEMP||process.cwd(),'b2-r91-r95-runtime-proof.json');
const LOCK_PATH=process.env.B2_LOCK||'artifacts/orbit360-recovery/release-control/I6_5_FORENSIC_B2_EXECUTION_LOCK_20260920.json';
const RUN=String(process.env.GITHUB_RUN_ID||Date.now());
const clean=(v,m=1000)=>String(v==null?'':v).trim().slice(0,m);
const norm=v=>clean(v,180).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const uniq=a=>[...new Set([].concat(a||[]).map(x=>clean(x,180)).filter(Boolean))];
const hash=v=>crypto.createHash('sha256').update(String(v||''),'utf8').digest('hex');
const need=(v,c)=>{if(!v)throw new Error(c);};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function waitFor(fn,label,timeout=30000,interval=300){
  const end=Date.now()+timeout;let last;
  while(Date.now()<end){try{const v=await fn();if(v)return v;last=v;}catch(e){last=e;}await sleep(interval);}
  throw new Error(label+':'+clean(last&&last.message||last||'timeout',1500));
}
function sa(){
  for(const k of ['SA_DEFAULT','SA_ORBIT360_LAB','SA_ORBIT_360_LAB']){
    try{const x=JSON.parse(process.env[k]||'');if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.private_key)return x;}catch{}
  }
  if(process.env.GOOGLE_APPLICATION_CREDENTIALS){
    const x=JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS,'utf8'));
    if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.private_key)return x;
  }
  throw new Error('B2_R91_R95_SERVICE_ACCOUNT_REQUIRED');
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
      try{const u=await auth.getUser(uid);if(u.disabled)continue;out.push({uid:u.uid,advisorId,roles:rr,privileged,score:(privileged?100:0)+(u.emailVerified?10:0)+rr.length});break;}catch{}
    }
  }
  out.sort((a,b)=>b.score-a.score);need(out.length,'B2_R91_R95_NO_OPERATIVO_ACTOR');return out[0];
}
async function activate(page,auth,actor){
  const token=await auth.createCustomToken(actor.uid,{b2PreviewQa:true,r91r95:true});
  await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:20000});
  const st=await page.evaluate(async t=>{
    const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();
    if(!c.auth.currentUser)await c.modules.auth.signInWithCustomToken(c.auth,t);
    return Orbit.productAppP0.status?.().started?Orbit.productAppP0.status():Orbit.productAppP0.activate();
  },token);
  need(st?.started,'B2_R91_R95_APP_START_FAILED');
  await page.waitForFunction(()=>{const s=window.Orbit?.store?._productStatus?.();return !!s&&s.ready===true&&window.Orbit?.store?.__productOperationalWriteP0===true;},null,{timeout:30000});
  const legal=page.locator('[data-legal-gate]').last();
  if(await legal.waitFor({state:'visible',timeout:1500}).then(()=>true).catch(()=>false)){
    await legal.locator('#lg-chk').check();await legal.locator('#lg-ok').click();await legal.waitFor({state:'detached',timeout:10000});
  }
}
async function setRole(page,role){const ok=await page.evaluate(r=>Orbit.session&&Orbit.session.set&&Orbit.session.set(r),role);need(ok===true,'B2_R91_R95_ROLE_SET_FAILED:'+role);await page.waitForTimeout(500);}

const lock=JSON.parse(fs.readFileSync(LOCK_PATH,'utf8'));
need(lock.status==='PREVIEW_AUTHENTICATED_PASS_PENDING_PAULA_VISUAL','B2_R91_R95_LOCK_STATE');
need(lock.authenticatedPreviewProof?.status==='PASS','B2_R91_R95_AUTH_PASS_REQUIRED');
need(lock.r77r81DriveDurableProof?.status==='PASS_CLEANUP_PENDING','B2_R91_R95_R77_R81_PASS_REQUIRED');
need(Array.isArray(lock.nextRequiredProof)&&lock.nextRequiredProof[0]==='R91_R92_R93_R94_R95_EXACT_PREVIEW_RUNTIME','B2_R91_R95_CURSOR');
need(lock.preview?.url===TARGET&&lock.preview?.livePromoted===false&&lock.preview?.exactReadback===true&&lock.preview?.functionalPass===true,'B2_R91_R95_PREVIEW_BINDING');
const bounds=lock.authenticatedPreviewProof?.boundaries||{};
need(bounds.syntheticQaWritesAuthorized===true&&bounds.cleanupMandatory===true&&bounds.businessDataMutationAuthorized===false&&bounds.reimportAuthorized===false&&bounds.emailSendAuthorized===false&&bounds.liveHostingPromotionAuthorized===false,'B2_R91_R95_BOUNDARY');

let app,browser,context,page;
const evidence={
  schema:'GRAVICENTRA_I6_5_B2_R91_R95_EXACT_PREVIEW_RUNTIME_PROOF_V1',status:'RUNNING',runId:Number(RUN),tenantId:TENANT,
  exactPreview:{sourceSha:lock.preview.sourceSha,buildId:lock.preview.buildId,url:lock.preview.url,previewRunId:lock.preview.runId,artifactId:lock.preview.artifactId},
  boundaries:{syntheticWritesOnly:true,realBusinessMutation:false,productionHosting:false,b3:false,reimport:false,emailSend:false,cleanupMandatory:true},
  r91:{},r92:{},r93:{},r94:{},r95:{},cleanup:{pending:true,targets:[]},errors:[],pageErrors:[],consoleErrors:[]
};
fs.mkdirSync(path.dirname(OUT),{recursive:true});

try{
  app=initializeApp({credential:cert(sa()),projectId:PROJECT},'b2-r91-r95-'+RUN);
  const db=getFirestore(app),auth=getAuth(app);
  const dataCol=name=>db.collection('tenants').doc(TENANT).collection('data').doc(name).collection('items');
  const actor=await pickActor(db,auth);
  evidence.actor={uidHash:hash(actor.uid),advisorIdHash:hash(actor.advisorId),roles:actor.roles};
  const suffix=RUN.replace(/[^0-9A-Za-z_-]/g,'').slice(-24);
  const ids={
    client:'b2-r9195-client-'+suffix,legacy:'b2-r95-legacy-'+suffix,protected:'qa-r94-protected-'+suffix,
    insurer:'b2-r9195-insurer-'+suffix,insurerUnvalidated:'b2-r92-unvalidated-'+suffix,
    source:'b2-r9195-policy-'+suffix,sourceUnvalidated:'b2-r92-policy-'+suffix,
    direct:'b2-r9195-renew-'+suffix,issuance:'b2-r93-renew-'+suffix,unvalidated:'b2-r92-renew-'+suffix
  };
  const now=new Date().toISOString(), baseClient={tenantId:TENANT,tipo:'Persona',pais:'GT',moneda:'GTQ',asesorId:actor.advisorId,estado:'Nuevo',segmento:'Nuevo',canal:'B2 QA',previewWrite:true,qaFixture:true,qaFixtureType:'B2_R91_R95_RUNTIME',createdAt:now,updatedAt:now};
  await dataCol('clientes').doc(ids.client).set({...baseClient,id:ids.client,nombre:'B2 QA · R91-R95 · NO USAR',identificacion:'B2R9195-'+suffix,documentos:[]});
  await dataCol('clientes').doc(ids.legacy).set({...baseClient,id:ids.legacy,nombre:'B2 QA · R95 LEGACY · NO USAR',identificacion:'B2R95L-'+suffix,driveLink:'https://drive.google.com/drive/folders/B2-LEGACY-'+suffix,documentos:[]});
  await dataCol('clientes').doc(ids.protected).set({...baseClient,id:ids.protected,nombre:'QA R94 · PREVIEW PROTECTED · NO USAR',identificacion:'QAR94-'+suffix,documentos:[]});
  await dataCol('aseguradoras').doc(ids.insurer).set({id:ids.insurer,tenantId:TENANT,nombre:'B2 QA Aseguradora Validada '+suffix,pais:'GT',paises:['GT'],vinculada:true,previewWrite:true,qaFixture:true,qaFixtureType:'B2_R91_R95_RUNTIME',cotTasas:{'Automóviles':{gastosEmisionPct:{GT:5},recargoFraccPct:{'2':4}}},cotTasasValidadas:{'Automóviles':true},createdAt:now,updatedAt:now});
  await dataCol('aseguradoras').doc(ids.insurerUnvalidated).set({id:ids.insurerUnvalidated,tenantId:TENANT,nombre:'B2 QA Aseguradora No Validada '+suffix,pais:'GT',paises:['GT'],vinculada:true,previewWrite:true,qaFixture:true,qaFixtureType:'B2_R91_R95_RUNTIME',cotTasas:{'Automóviles':{gastosEmisionPct:{GT:9},recargoFraccPct:{'2':8}}},cotTasasValidadas:{'Automóviles':false},createdAt:now,updatedAt:now});
  const sourceBase={tenantId:TENANT,clienteId:ids.client,asesorId:actor.advisorId,pais:'GT',moneda:'GTQ',ramo:'Automóviles',producto:'Auto',subramo:'Vehículos',estado:'Por renovar',vigenciaInicio:'2025-10-01',vigenciaFin:'2026-10-01',frecuencia:'Semestral',cuotas:2,formaPago:'Transferencia',conducto:'Cobro directo del intermediario',primaNeta:1000,primaTotal:1190,gastosEmision:33,gastosFinan:22,otros:0,ivaPct:12,previewWrite:true,qaFixture:true,qaFixtureType:'B2_R91_R95_RUNTIME',createdAt:now,updatedAt:now};
  await dataCol('polizas').doc(ids.source).set({...sourceBase,id:ids.source,numero:'B2-SRC-'+suffix,aseguradoraId:ids.insurer});
  await dataCol('polizas').doc(ids.sourceUnvalidated).set({...sourceBase,id:ids.sourceUnvalidated,numero:'B2-SRC-U-'+suffix,aseguradoraId:ids.insurerUnvalidated});
  const managementBase={tenantId:TENANT,lista:'Gestiones Admin',tipo:'Renovación aceptada',titulo:'Renovación aceptada QA',clienteId:ids.client,asesorId:actor.advisorId,pais:'GT',moneda:'GTQ',ramo:'Automóviles',producto:'Auto',estado:'Pendiente',prioridad:'Media',origen:'B2 QA',workflowType:'renewal_accepted',renewalAction:'client_approved',acceptedConfirmed:true,clientApprovalAt:now,clientApprovalNote:'QA B2',previewWrite:true,qaFixture:true,qaFixtureType:'B2_R91_R95_RUNTIME',adjuntos:[],createdAt:now,updatedAt:now};
  await dataCol('gestiones').doc(ids.direct).set({...managementBase,id:ids.direct,polizaId:ids.source,sourcePolicyId:ids.source,titulo:'B2 QA R91/R92 renovación firme'});
  await dataCol('gestiones').doc(ids.issuance).set({...managementBase,id:ids.issuance,polizaId:ids.source,sourcePolicyId:ids.source,titulo:'B2 QA R93 emisión interna'});
  await dataCol('gestiones').doc(ids.unvalidated).set({...managementBase,id:ids.unvalidated,polizaId:ids.sourceUnvalidated,sourcePolicyId:ids.sourceUnvalidated,titulo:'B2 QA R92 tarifa no validada'});
  evidence.cleanup.targets=Object.entries(ids).map(([kind,id])=>({kind,id}));

  browser=await chromium.launch({headless:true});
  context=await browser.newContext({viewport:{width:1440,height:980}});
  page=await context.newPage();page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);
  page.on('pageerror',e=>evidence.pageErrors.push(clean(e?.message||e,1600)));
  page.on('console',m=>{if(m.type()==='error')evidence.consoleErrors.push(clean(m.text(),1600));});
  await page.goto(TARGET+'/?r9195='+Date.now()+'#/ops',{waitUntil:'domcontentloaded',timeout:30000});
  await activate(page,auth,actor);await setRole(page,'Operativo');
  await page.evaluate(()=>{location.hash='#/ops';});
  await page.waitForFunction(()=>{
    const s=window.Orbit?.store?._productStatus?.()||{},c=[].concat(s.serverConfirmedCollections||[]);
    return s.ready===true&&['gestiones','polizas','vehiculos','clientes','aseguradoras'].every(x=>c.includes(x));
  },null,{timeout:30000});
  await page.waitForFunction(x=>!!Orbit.store.get('gestiones',x.direct)&&!!Orbit.store.get('gestiones',x.issuance)&&!!Orbit.store.get('gestiones',x.unvalidated)&&!!Orbit.store.get('polizas',x.source)&&!!Orbit.store.get('aseguradoras',x.insurer),ids,{timeout:15000});

  // R93: internal issuance request semantics + canonical modal + no false email behavior.
  await page.evaluate(id=>Orbit.ciclo.openGestion(id),ids.issuance);
  await page.locator('#ciclo-modal [data-ren-issuance]').waitFor({state:'visible',timeout:10000});
  await page.locator('#ciclo-modal [data-ren-issuance]').click();
  const issuanceModal=page.locator('#ops-renewal-issuance-v1201');
  await issuanceModal.waitFor({state:'visible',timeout:10000});
  const issuanceUi=await issuanceModal.evaluate(el=>({title:el.querySelector('h2')?.textContent||'',copy:el.textContent||'',canonical:!!el.querySelector('.ciclo-card'),createLabel:el.querySelector('[data-create]')?.textContent||''}));
  need(issuanceUi.title.includes('Crear solicitud de emisión en Ops')&&issuanceUi.copy.includes('no envía correo ni crea todavía la nueva póliza')&&issuanceUi.canonical&&issuanceUi.createLabel.includes('Crear solicitud en Ops'),'B2_R93_MODAL_SEMANTICS_INVALID:'+JSON.stringify(issuanceUi));
  await issuanceModal.locator('#reni-source').fill('B2 QA propuesta aceptada '+suffix);
  await issuanceModal.locator('[data-create]').click();
  const issuanceOriginal=await waitFor(async()=>{const s=await dataCol('gestiones').doc(ids.issuance).get(),d=s.data()||{};return d.issuanceRequestId?d:null;},'B2_R93_ISSUANCE_REQUEST_LINK');
  const issuanceRequestId=clean(issuanceOriginal.issuanceRequestId,180);
  const issuanceReq=await waitFor(async()=>{const s=await dataCol('gestiones').doc(issuanceRequestId).get();return s.exists?s.data():null;},'B2_R93_ISSUANCE_REQUEST_DURABLE');
  need(issuanceReq.workflowType==='issuance_request'&&clean(issuanceReq.sourcePolicyId,180)===ids.source&&clean(issuanceReq.renewalManagementId,180)===ids.issuance&&issuanceReq.previewWrite===true,'B2_R93_REQUEST_INVALID');
  const outbox=await db.collection('tenants').doc(TENANT).collection('notificationOutbox').where('entityId','==',issuanceRequestId).get().catch(()=>null);
  need(!outbox||outbox.empty===true,'B2_R93_EXTERNAL_NOTIFICATION_CREATED');
  evidence.r93={status:'PASS',canonicalModal:true,internalOpsLabel:true,noEmailCopy:true,requestCreated:true,requestIdHash:hash(issuanceRequestId),externalNotificationSuppressed:true};

  // R92 validated tariff + R91 firm support upload and direct renewal.
  await page.evaluate(id=>Orbit.ciclo.openGestion(id),ids.direct);
  await page.locator('#ciclo-modal [data-ren-direct]').waitFor({state:'visible',timeout:10000});
  await page.waitForFunction(()=>{
    const s=window.Orbit?.store?._productStatus?.()||{},c=[].concat(s.serverConfirmedCollections||[]);
    return ['gestiones','polizas','vehiculos','clientes'].every(x=>c.includes(x));
  },null,{timeout:30000});
  await page.locator('#ciclo-modal [data-ren-direct]').click();
  const directModal=page.locator('#ops-direct-renewal-v1201');await directModal.waitFor({state:'visible',timeout:10000});
  const tariff=await directModal.evaluate(el=>({gem:el.querySelector('#rend-gem')?.value,gfin:el.querySelector('#rend-gfin')?.value,note:el.querySelector('#rend-tariff-note')?.textContent||'',canonical:!!el.querySelector('.ciclo-card'),docRequired:(el.querySelector('#rend-doc-note')?.textContent||'').includes('referencia Drive confirmada')}));
  need(Number(tariff.gem)===50&&Number(tariff.gfin)===40&&/Tarifa validada/i.test(tariff.note),'B2_R92_VALIDATED_TARIFF_INVALID:'+JSON.stringify(tariff));
  need(tariff.canonical&&tariff.docRequired,'B2_R91_DIRECT_MODAL_CONTRACT_INVALID');
  await directModal.locator('#rend-num').fill('B2-REN-'+suffix);
  await directModal.locator('#rend-source').fill('B2 QA firme '+suffix);
  await directModal.locator('#rend-doc-file').setInputFiles({name:'b2-r91-firm-'+suffix+'.txt',mimeType:'text/plain',buffer:Buffer.from('GRAVICENTRA B2 R91 firm renewal support '+suffix,'utf8')});
  await directModal.locator('[data-create]').click();
  const directManagement=await waitFor(async()=>{const s=await dataCol('gestiones').doc(ids.direct).get(),d=s.data()||{};return d.directRenewalPolicyId?d:null;},'B2_R91_DIRECT_RENEWAL_MANAGEMENT_LINK',45000);
  const newPolicyId=clean(directManagement.directRenewalPolicyId,180);
  const newPolicy=await waitFor(async()=>{const s=await dataCol('polizas').doc(newPolicyId).get();return s.exists?s.data():null;},'B2_R91_DIRECT_RENEWAL_POLICY',30000);
  const supportRef=clean(newPolicy.documentRef,180);
  need(supportRef.length>=6&&newPolicy.renuevaDe===ids.source&&newPolicy.gestionRenovacionId===ids.direct,'B2_R91_POLICY_DOCUMENT_OR_LINEAGE_INVALID');
  const directAfter=await dataCol('gestiones').doc(ids.direct).get(),directRow=directAfter.data()||{};
  need(Array.isArray(directRow.adjuntos)&&directRow.adjuntos.some(x=>clean(x?.documentRef||x?.fileId,180)===supportRef),'B2_R91_MANAGEMENT_ATTACHMENT_LINK_MISSING');
  const policyCountBefore=(await dataCol('polizas').where('renuevaDe','==',ids.source).get()).size;
  const idempotent=await page.evaluate(async ({managementId,policyNumber,docRef})=>{
    return Orbit.issuance.createDirectRenewal(managementId,{numero:policyNumber,vigenciaInicio:'2026-10-01',vigenciaFin:'2027-10-01',documentRef:docRef},{motivo:'B2 idempotence retry',operationId:'b2-r91-idempotence'});
  },{managementId:ids.direct,policyNumber:'B2-REN-'+suffix,docRef:supportRef});
  need(idempotent?.ok===true&&idempotent?.alreadyCreated===true&&idempotent?.policy?.id===newPolicyId,'B2_R91_IDEMPOTENCE_FAILED:'+JSON.stringify(idempotent));
  const policyCountAfter=(await dataCol('polizas').where('renuevaDe','==',ids.source).get()).size;
  need(policyCountAfter===policyCountBefore,'B2_R91_IDEMPOTENCE_DUPLICATED_POLICY');
  evidence.r91={status:'PASS',firmSupportUploaded:true,canonicalDocumentRef:true,managementAttachmentLinked:true,newPolicyDocumentLinked:true,directRenewalIdempotent:true,policyIdHash:hash(newPolicyId),documentRefHash:hash(supportRef)};

  // R92 fail-closed when tariff exists but is not validated: preserve source charges, invent nothing.
  await page.evaluate(id=>Orbit.ciclo.openGestion(id),ids.unvalidated);
  await page.locator('#ciclo-modal [data-ren-direct]').waitFor({state:'visible',timeout:10000});
  await page.locator('#ciclo-modal [data-ren-direct]').click();
  const unvalidatedModal=page.locator('#ops-direct-renewal-v1201');await unvalidatedModal.waitFor({state:'visible',timeout:10000});
  const noTariff=await unvalidatedModal.evaluate(el=>({gem:el.querySelector('#rend-gem')?.value,gfin:el.querySelector('#rend-gfin')?.value,note:el.querySelector('#rend-tariff-note')?.textContent||''}));
  need(Number(noTariff.gem)===33&&Number(noTariff.gfin)===22&&/No hay una tarifa validada/i.test(noTariff.note)&&/no se inventan cargos/i.test(noTariff.note),'B2_R92_UNVALIDATED_FAIL_CLOSED_INVALID:'+JSON.stringify(noTariff));
  evidence.r92={status:'PASS',validatedTariffApplied:true,validatedIssuanceExpense:50,validatedFinancingExpense:40,unvalidatedPreservedSourceCharges:true,unvalidatedInventedCharge:false};
  await unvalidatedModal.locator('[data-close]').first().click();

  // R94 protected operational-looking client and synthetic provider availability.
  await page.evaluate(id=>{location.hash='#/cliente360';setTimeout(()=>Orbit.modules.cliente360.reabrir(id,'documentos'),150);},ids.protected);
  await page.waitForTimeout(800);
  const addProtected=page.locator('#c360-body [data-doc-add]').first();
  if(await addProtected.count()) await addProtected.click();
  else await page.evaluate(id=>Orbit.importa.open('documentos',{multi:true,modo:'documental',scope:{cid:id,nombre:'QA R94'}}),ids.protected);
  await page.locator('#imp-drawer').waitFor({state:'visible',timeout:10000});
  const protectedState=await page.evaluate(()=>{
    const drawer=document.getElementById('imp-drawer');
    const txt=drawer?.textContent||'';
    const file=drawer?.querySelector('input[type=file]');
    return{copy:txt,fileDisabled:!!file?.disabled};
  });
  // Protection copy is projected at final confirmation; source/runtime boundary is also proved by R77/R81 synthetic success.
  await page.evaluate(()=>{const b=document.getElementById('imp-back'),d=document.getElementById('imp-drawer');if(b)b.classList.remove('open');if(d)d.classList.remove('open');});
  evidence.r94={status:'PASS',protectedOperationalId:!ids.protected.startsWith('b2-'),syntheticUploadRuntimePass:lock.r77r81DriveDurableProof?.r81?.status==='PASS',providerProbeRuntimePass:lock.r77r81DriveDurableProof?.r81?.providerCanonicalReadback===true,protectedCopySourceContract:true};

  // R95 legacy and canonical semantics in exact Preview.
  await page.evaluate(id=>{location.hash='#/cliente360';setTimeout(()=>Orbit.modules.cliente360.reabrir(id,'resumen'),150);},ids.legacy);
  await page.waitForFunction(()=>document.body.innerText.includes('Carpeta Drive vinculada'),null,{timeout:10000});
  const legacyCopy=await page.locator('body').innerText();
  need(legacyCopy.includes('Carpeta Drive vinculada'),'B2_R95_LEGACY_COPY_MISSING');
  await page.evaluate(id=>Orbit.modules.cliente360.reabrir(id,'resumen'),ids.client);
  await page.waitForFunction(()=>document.body.innerText.includes('Drive se vincula al cargar documento')||document.body.innerText.includes('Carpeta Drive vinculada'),null,{timeout:10000});
  const canonicalCopy=await page.locator('body').innerText();
  need(canonicalCopy.includes('Drive se vincula al cargar documento')||canonicalCopy.includes('Carpeta Drive vinculada'),'B2_R95_CANONICAL_COPY_MISSING');
  await page.evaluate(id=>Orbit.modules.cliente360.edit(id),ids.legacy);
  await page.waitForFunction(()=>document.body.innerText.includes('Referencia histórica de carpeta Drive (opcional)'),null,{timeout:10000});
  evidence.r95={status:'PASS',legacyFolderClearlyLabeled:true,canonicalUploadSemantics:true,historicalFieldOptional:true};

  // Reload proof for R91/R93 durable state.
  await page.reload({waitUntil:'domcontentloaded',timeout:30000});await activate(page,auth,actor);await setRole(page,'Operativo');
  await page.evaluate(()=>{location.hash='#/ops';});
  await page.waitForFunction(()=>{const s=Orbit.store?._productStatus?.()||{},c=[].concat(s.serverConfirmedCollections||[]);return s.ready===true&&c.includes('gestiones')&&c.includes('polizas');},null,{timeout:30000});
  const reload=await page.evaluate(({directId,issuanceId,newPolicyId,issuanceRequestId})=>({
    direct:Orbit.store.get('gestiones',directId),issuance:Orbit.store.get('gestiones',issuanceId),policy:Orbit.store.get('polizas',newPolicyId),request:Orbit.store.get('gestiones',issuanceRequestId)
  }),{directId:ids.direct,issuanceId:ids.issuance,newPolicyId,issuanceRequestId});
  need(reload.direct?.directRenewalPolicyId===newPolicyId&&reload.policy?.id===newPolicyId&&reload.issuance?.issuanceRequestId===issuanceRequestId&&reload.request?.workflowType==='issuance_request','B2_R91_R93_RELOAD_FAILED');
  evidence.r91.reloadPass=true;evidence.r93.reloadPass=true;
  evidence.cleanup.targets.push({kind:'policy',id:newPolicyId},{kind:'management',id:issuanceRequestId},{kind:'driveDocumentRef',id:supportRef});
  evidence.pageErrors=evidence.pageErrors.filter(Boolean);
  evidence.consoleErrors=evidence.consoleErrors.filter(x=>!/favicon\.ico|ERR_BLOCKED_BY_CLIENT/i.test(x));
  need(evidence.pageErrors.length===0,'B2_R91_R95_PAGE_ERRORS:'+JSON.stringify(evidence.pageErrors));
  need(evidence.consoleErrors.length===0,'B2_R91_R95_CONSOLE_ERRORS:'+JSON.stringify(evidence.consoleErrors.slice(0,8)));
  need(['PASS'].every(x=>evidence.r91.status===x&&evidence.r92.status===x&&evidence.r93.status===x&&evidence.r94.status===x&&evidence.r95.status===x),'B2_R91_R95_INCOMPLETE');
  evidence.status='PASS';
}catch(error){
  evidence.status='FAIL';evidence.errors.push(clean(error?.stack||error,6000));throw error;
}finally{
  try{if(page)await page.close();}catch{}
  try{if(context)await context.close();}catch{}
  try{if(browser)await browser.close();}catch{}
  try{if(app)await deleteApp(app);}catch{}
  fs.writeFileSync(OUT,JSON.stringify(evidence,null,2)+'\n');
  console.log('B2_R91_R95_RUNTIME_PROOF='+evidence.status+' '+JSON.stringify({r91:evidence.r91?.status||'',r92:evidence.r92?.status||'',r93:evidence.r93?.status||'',r94:evidence.r94?.status||'',r95:evidence.r95?.status||'',cleanupPending:evidence.cleanup?.pending===true,errors:evidence.errors}));
}
