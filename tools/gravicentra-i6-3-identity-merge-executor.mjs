import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium } from 'playwright';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT='ays-orbit-360-lab',TENANT='alianzas-soluciones',PROD='https://ays-orbit-360-lab.web.app';
const OUT=process.env.I63_IDENTITY_MERGE_EVIDENCE_FILE||path.join(process.env.RUNNER_TEMP||process.cwd(),'i63-identity-merge.json');
const clean=(v,m=1000)=>String(v==null?'':v).trim().slice(0,m);
const norm=v=>clean(v,300).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const need=(x,c)=>{if(!x)throw new Error(c);};
const stable=v=>{if(v===undefined)return null;if(v===null||typeof v!=='object')return v;if(typeof v.toDate==='function'){try{return v.toDate().toISOString();}catch{}}if(Array.isArray(v))return v.map(stable);return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));};

const GROUPS=[
  {
    key:'jose_josue',
    canonicalId:'cli_pol_708e0722dd105a47b1e6c668e1b6',
    duplicateId:'cli_siga_0590abeade9fe33a171a',
    canonicalName:'JOSUÉ HUMBERTO AGUILAR LUNA',
    expectedCanonicalPhone:'50232114013',
    expectedDuplicatePhone:'50232114013',
    finalFechaAlta:'12 Ene. 2022'
  },
  {
    key:'helen_hellen',
    canonicalId:'cli_pol_2dafec0234c5f197e5d6ea1c915f',
    duplicateId:'cli_siga_aaec96ed37bc520a19bc',
    canonicalName:'HELEN GURLY GRIFFITHS GODOY',
    expectedCanonicalPhone:'50234857507',
    expectedDuplicatePhone:'50234857507',
    finalFechaAlta:'12 Ene. 2022'
  },
  {
    key:'william_wiliam',
    canonicalId:'cli_pol_5c9ec2fdb3804280cf60297eb6c0',
    duplicateId:'cli_siga_8874655e33581f7fa24d',
    canonicalName:'WILLIAM REYNOSO IXCOY',
    expectedCanonicalPhone:'50256225302',
    expectedDuplicatePhone:'50256225302',
    finalFechaAlta:'18 Ago. 2021'
  }
];
const SUPPORTED_RELATIONS=new Set(['polizas','vehiculos','recibosEsperados','carteraPrimas','cobros','reclamos','cancelaciones','comisiones','actividades']);
const KNOWN_COLLECTIONS=['clientes','polizas','vehiculos','recibosEsperados','carteraPrimas','cobros','reclamos','siniestros','cancelaciones','comisiones','actividades','renovaciones','gestiones','negocios','leads','recibosAseguradora','estadosCuentaAseguradora','conciliaciones','conciliacionesPrimas'];

function serviceAccount(){for(const k of ['SA_DEFAULT','SA_ORBIT360_LAB','SA_ORBIT_360_LAB']){try{const x=JSON.parse(process.env[k]||'');if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.client_email&&x?.private_key)return x;}catch{}}throw new Error('I63_MERGE_SERVICE_ACCOUNT');}
function rolesOf(m){return [...new Set([].concat(m?.roles||[],m?.rolesAsignados||[],m?.assignedRoles||[],m?.rolesDisponibles||[],m?.role||[],m?.rol||[],m?.rolDefault||[],m?.defaultRole||[]).map(v=>clean(v)).filter(Boolean))];}
async function selectManager(db){const snap=await db.collection('tenants').doc(TENANT).collection('members').get();for(const p of ['direccion','superadmin','super_admin','admintenant','admin_tenant','admin','operativo'])for(const d of snap.docs){const m=d.data()||{},uid=clean(m.uid||d.id,180),role=rolesOf(m).find(r=>norm(r)===p),state=norm(m.status||m.estado||'active');if(!uid||!role||m.active===false||m.activo===false||['inactive','inactivo','blocked','bloqueado','suspended','suspendido'].includes(state))continue;return{uid,role};}throw new Error('I63_MERGE_NO_MANAGER');}
async function activate(page,auth,actor){const token=await auth.createCustomToken(actor.uid,{gravicentraI63IdentityMerge:true});await page.goto(PROD,{waitUntil:'domcontentloaded',timeout:30000});await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:15000});const s=await page.evaluate(async tok=>{const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();if(!c.auth.currentUser)await c.modules.auth.signInWithCustomToken(c.auth,tok);return Orbit.productAppP0.status?.().started===true?Orbit.productAppP0.status():await Orbit.productAppP0.activate();},token);need(s?.started===true,'I63_MERGE_APP_START');await page.waitForFunction(()=>Orbit?.productAppP0?.status?.().started===true&&!document.body.classList.contains('pre-auth'),null,{timeout:18000});const sess=await page.evaluate(()=>({active:Orbit.session?.rol?.()||'',assigned:Orbit.session?.allowedRoles?.()||[]}));if(sess.active!==actor.role){need(sess.assigned.includes(actor.role),'I63_MERGE_ROLE_NOT_ASSIGNED');need(await page.evaluate(r=>Orbit.session.set(r),actor.role),'I63_MERGE_ROLE_SWITCH');await page.waitForFunction(r=>Orbit.session?.rol?.()===r,actor.role,{timeout:6000});}}
const digits=v=>clean(v,100).replace(/\D/g,'');
const blank=v=>v==null||String(v).trim()==='';
const combineObs=(...vals)=>[...new Set(vals.map(v=>clean(v,1200)).filter(Boolean))].join(' | ');
function mergeContact(c,d,name){
  const a=c&&typeof c==='object'?c:{},b=d&&typeof d==='object'?d:{};
  return {
    ...b,...a,
    nombre:name,
    telefono:clean(a.telefono||b.telefono||'')||null,
    correo:clean(a.correo||b.correo||'')||null,
    comentarios:combineObs(a.comentarios,b.comentarios)||null
  };
}
function canonicalPatch(group,c,d){
  const patch={nombre:group.canonicalName,nombreCompleto:group.canonicalName,identityMergeStatus:'CANONICAL',mergedSourceClientIds:[...new Set([].concat(c.mergedSourceClientIds||[],group.duplicateId))]};
  for(const k of ['telefono','whatsapp','telefonoAlterno','email','correo','fechaNacimiento','tipoPersona','pais','moneda','ciudadMunicipio','departamentoProvincia','zonaSectorBarrio','asesorId','asesorNombre']){
    if(blank(c[k])&&!blank(d[k]))patch[k]=d[k];
  }
  patch.fechaAltaOrigen=group.finalFechaAlta;
  patch.contactoPrincipal=mergeContact(c.contactoPrincipal,d.contactoPrincipal,group.canonicalName);
  const conflicts=[];
  for(const k of ['nombre','direccion','fechaAltaOrigen','sexo']){
    const cv=clean(c[k],300),dv=clean(d[k],300);
    if(cv&&dv&&norm(cv)!==norm(dv))conflicts.push(k+': '+dv);
  }
  const note='FUSIÓN IDENTIDAD I6.3 2026-09-18; alias absorbido '+clean(d.nombre||d.nombreCompleto,220)+'; origen '+group.duplicateId+(conflicts.length?'; valores alternos fuente ['+conflicts.join('; ')+']':'');
  patch.observacionesMigracion=combineObs(c.observacionesMigracion,d.observacionesMigracion,note);
  return patch;
}
function tombstonePatch(group,d){
  return {
    fusionado:true,visible:false,mergedIntoClientId:group.canonicalId,estadoOperativo:'fusionado',
    identityMergeStatus:'MERGED_TOMBSTONE',
    observacionesMigracion:combineObs(d.observacionesMigracion,'FUSIONADO I6.3 2026-09-18 EN '+group.canonicalName+' ('+group.canonicalId+')')
  };
}

const sa=serviceAccount(),app=initializeApp({credential:cert(sa),projectId:PROJECT},'i63-identity-merge'),db=getFirestore(app),auth=getAuth(app);
let browser=null,applied=false,actor=null;
const evidence={schema:'GRAVICENTRA_I6_3_IDENTITY_MERGE_V1',status:'FAIL',writes:0,groups:[],relationsMoved:0,backendBefore:0,backendAfter:0,activeCanonicalAfter:0,tombstonesAfter:0,uiVisibleAfter:null,rollback:{executed:false,status:'NOT_NEEDED'},errors:[],containsPII:true,containsSecrets:false};
const beforeRows=new Map(),beforeRelations=[];
async function callMutations(mutations,requestSuffix){
  if(!mutations.length)return{ok:true,mutationCount:0};
  if(!browser)browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await activate(page,auth,actor);
  const requestId='i63_merge_'+clean(process.env.GITHUB_RUN_ID||'run',32)+'_'+requestSuffix;
  const result=await page.evaluate(async input=>{const p=Orbit.productRuntimeBrowserProvidersP0;const r=await p.callFunction('orbit360ProductOperationalCommand',input,'us-central1');return r&&r.data?r.data:r;},{tenantId:TENANT,activeRole:actor.role,requestId,mutations});
  await page.close();
  need(result?.ok===true&&result?.serverOwned===true&&Number(result?.mutationCount)===mutations.length,'I63_MERGE_WRITE_REJECTED');
  return result;
}
async function allDataCollections(){
  const root=db.collection('tenants').doc(TENANT).collection('data');
  const refs=await root.listDocuments();
  return [...new Set([...KNOWN_COLLECTIONS,...refs.map(r=>r.id)])].sort();
}
try{
  const clients=db.collection('tenants').doc(TENANT).collection('data').doc('clientes').collection('items');
  const snap=await clients.get();evidence.backendBefore=snap.size;need(snap.size===442,'I63_MERGE_BACKEND_BEFORE');
  actor=await selectManager(db);
  const collections=await allDataCollections();
  const mutations=[];
  for(const group of GROUPS){
    const [cs,ds]=await Promise.all([clients.doc(group.canonicalId).get(),clients.doc(group.duplicateId).get()]);
    need(cs.exists&&ds.exists,'I63_MERGE_PAIR_MISSING:'+group.key);
    const c=cs.data()||{},d=ds.data()||{};
    need(digits(c.whatsapp||c.telefono||c.telefonoAlterno)===group.expectedCanonicalPhone,'I63_MERGE_CANONICAL_IDENTITY_DRIFT:'+group.key);
    need(digits(d.whatsapp||d.telefono||d.telefonoAlterno)===group.expectedDuplicatePhone,'I63_MERGE_DUPLICATE_IDENTITY_DRIFT:'+group.key);
    need(!(d.fusionado===true||clean(d.mergedIntoClientId)),'I63_MERGE_ALREADY_MERGED:'+group.key);
    beforeRows.set(group.canonicalId,stable(c));beforeRows.set(group.duplicateId,stable(d));
    const relationHits=[];
    for(const collection of collections){
      if(collection==='clientes')continue;
      let rs;
      try{rs=await db.collection('tenants').doc(TENANT).collection('data').doc(collection).collection('items').where('clienteId','==',group.duplicateId).get();}catch{continue;}
      if(rs.empty)continue;
      if(!SUPPORTED_RELATIONS.has(collection))throw new Error('I63_MERGE_UNSUPPORTED_RELATION:'+group.key+':'+collection+':'+rs.size);
      for(const doc of rs.docs){const row=doc.data()||{};beforeRelations.push({collection,id:doc.id,clienteId:row.clienteId});mutations.push({collection,action:'update',id:doc.id,payload:{clienteId:group.canonicalId}});relationHits.push({collection,id:doc.id});}
    }
    mutations.push({collection:'clientes',action:'update',id:group.canonicalId,payload:canonicalPatch(group,c,d)});
    mutations.push({collection:'clientes',action:'update',id:group.duplicateId,payload:tombstonePatch(group,d)});
    evidence.groups.push({key:group.key,canonicalId:group.canonicalId,duplicateId:group.duplicateId,canonicalName:group.canonicalName,relationsMoved:relationHits});
  }
  need(mutations.length<=80,'I63_MERGE_MUTATION_LIMIT');
  await callMutations(mutations,'apply');
  evidence.writes=mutations.length;evidence.relationsMoved=beforeRelations.length;applied=true;

  const after=await clients.get();evidence.backendAfter=after.size;need(after.size===442,'I63_MERGE_BACKEND_AFTER');
  let tomb=0,active=0;
  for(const doc of after.docs){const x=doc.data()||{};if(x.fusionado===true&&clean(x.mergedIntoClientId))tomb++;else active++;}
  evidence.tombstonesAfter=tomb;evidence.activeCanonicalAfter=active;
  need(tomb===3&&active===439,'I63_MERGE_ACTIVE_COUNTS');
  for(const group of GROUPS){
    const [cs,ds]=await Promise.all([clients.doc(group.canonicalId).get(),clients.doc(group.duplicateId).get()]);
    const c=cs.data()||{},d=ds.data()||{};
    need(clean(c.nombre)===group.canonicalName,'I63_MERGE_CANONICAL_NAME:'+group.key);
    need(d.fusionado===true&&clean(d.mergedIntoClientId)===group.canonicalId,'I63_MERGE_TOMBSTONE:'+group.key);
    for(const collection of collections){if(collection==='clientes')continue;try{const rs=await db.collection('tenants').doc(TENANT).collection('data').doc(collection).collection('items').where('clienteId','==',group.duplicateId).limit(1).get();need(rs.empty,'I63_MERGE_DANGLING_RELATION:'+group.key+':'+collection);}catch(e){if(String(e.message||e).startsWith('I63_MERGE_DANGLING'))throw e;}}
  }

  if(!browser)browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await activate(page,auth,actor);
  await page.evaluate(()=>{location.hash='#/cliente360';});
  await page.waitForFunction(()=>Orbit?.route?.key==='cliente360'&&window.OrbitRuntimeDiagnostics?.cliente360?.list?.renderSeq>0,null,{timeout:20000});
  const ui=await page.evaluate(()=>({total:window.OrbitRuntimeDiagnostics?.cliente360?.list?.totalRows||0,kpi:(document.querySelector('.kpi-row .kpi .k-val')?.textContent||'').trim()}));
  evidence.uiVisibleAfter=ui.total;need(ui.total===439,'I63_MERGE_UI_ACTIVE_COUNT');
  for(const group of GROUPS){
    await page.evaluate(id=>{location.hash='#/cliente360?c='+encodeURIComponent(id);},group.duplicateId);
    await page.waitForFunction(id=>location.hash.includes(encodeURIComponent(id)),group.canonicalId,{timeout:8000});
    const redirected=await page.evaluate(id=>location.hash.includes(encodeURIComponent(id)),group.canonicalId);
    need(redirected,'I63_MERGE_REDIRECT_FAIL:'+group.key);
  }
  await page.close();
  evidence.status='PASS';
}catch(e){
  evidence.errors.push(clean(e?.message||e,300));
  if(applied){
    evidence.rollback.executed=true;
    try{
      const restore=[];
      for(const group of GROUPS){
        const c=beforeRows.get(group.canonicalId),d=beforeRows.get(group.duplicateId);
        if(c)restore.push({collection:'clientes',action:'update',id:group.canonicalId,payload:{...c,identityMergeStatus:null,mergedSourceClientIds:c.mergedSourceClientIds||[]}});
        if(d)restore.push({collection:'clientes',action:'update',id:group.duplicateId,payload:{...d,fusionado:false,visible:true,mergedIntoClientId:'',identityMergeStatus:null}});
      }
      for(const r of beforeRelations)restore.push({collection:r.collection,action:'update',id:r.id,payload:{clienteId:r.clienteId}});
      await callMutations(restore,'rollback');
      evidence.rollback.status='PASS';
    }catch(rb){evidence.rollback.status='FAIL';evidence.errors.push('ROLLBACK:'+clean(rb?.message||rb,240));}
  }
  process.exitCode=1;
}finally{
  if(browser)await browser.close().catch(()=>{});
  await deleteApp(app).catch(()=>{});
  fs.writeFileSync(OUT,JSON.stringify(evidence,null,2)+'\n');
  console.log('I63_IDENTITY_MERGE='+evidence.status);
  console.log('I63_IDENTITY_MERGE_WRITES='+evidence.writes);
  console.log('I63_IDENTITY_ACTIVE='+evidence.activeCanonicalAfter);
  console.log('I63_IDENTITY_TOMBSTONES='+evidence.tombstonesAfter);
  console.log('I63_IDENTITY_UI='+String(evidence.uiVisibleAfter??0));
  if(evidence.errors.length)console.error('I63_IDENTITY_MERGE_ERROR='+evidence.errors.join('|'));
}
