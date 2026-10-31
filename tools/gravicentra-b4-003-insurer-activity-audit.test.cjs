'use strict';
// Exact source integration: existing operational facade -> callable transaction
// -> protected directory -> fresh facade. All records/auth are in-memory mocks.
// This is source evidence, not authenticated Chrome or Firestore UAT.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const repo=path.resolve(process.argv[2]||'.'),output=process.argv[3],copy=value=>JSON.parse(JSON.stringify(value));
const harness=fs.readFileSync(path.join(repo,'tools/gravicentra-b4-003-operational-write-security-regression.test.cjs'),'utf8').split('const cases=')[0];
const sandbox=vm.createContext({require,console,Buffer,process:{argv:['node','qa',path.join(repo,'functions')]}});
vm.runInContext(harness,sandbox,{filename:'canonical-security-harness.cjs'});
const {projectInsurerActivity,readProtectedDirectory}=require(path.join(repo,'functions/b4-003-scoped-bootstrap-reader'));
const fixture='b4003qa_insurer_activity_test',source=fs.readFileSync(path.join(repo,'orbit360-platform/data/store-firestore-product-operational-p0.js'),'utf8');
const rowPath=e=>`tenants/${e.tenant}/data/aseguradoras/items/${fixture}`;
function env(history=[{fecha:'2026-10-01T08:00:00.000Z',responsable:'Registro histórico',cambio:'Dato previo',motivo:'No alterar'}]){
 const e=vm.runInContext('env({role:"Operativo",scope:"todos",countries:["GT"]})',sandbox);
 const mp=`tenants/${e.tenant}/members/${e.uid}`;
 e.rows.set(mp,{...e.rows.get(mp),nombre:'Actor canónico',email:'private-actor@example.invalid'});
 e.rows.set(rowPath(e),{id:fixture,tenantId:e.tenant,pais:'GT',nombre:'QA aseguradora',observaciones:'Original',web:'https://example.invalid/original',__syntheticQa:true,actividad:copy(history)});
 return e;
}
const mutation=(payload,extra={})=>({collection:'aseguradoras',action:'update',id:fixture,payload:{__syntheticQa:true,...payload},auditReason:'Prueba controlada',...extra});
const call=(e,m=mutation({observaciones:'Cambio'}),id='insurer_request_1')=>e.mod.orbit360ProductOperationalCommandPreview(e.request([m],id));
const stored=e=>e.rows.get(rowPath(e));
const denied=async(e,fn,code)=>{const before=e.writes.length;await assert.rejects(fn,error=>error.code===code);assert.equal(e.writes.length,before);};
function directory(e,role='Operativo',country='GT'){
 class Ref{
  constructor(p,query=false,limit=301){this.p=p;this.query=query;this.cap=limit;}
  collection(k){return new Ref(this.p+'/'+k,true,this.cap);}doc(k){return new Ref(this.p+'/'+k,false,this.cap);}
  orderBy(k){assert.equal(k,'__name__');return this;}limit(n){return new Ref(this.p,this.query,n);}
  async get(){const snap=p=>({id:p.split('/').pop(),exists:e.rows.has(p),data:()=>copy(e.rows.get(p)||{})});
   if(!this.query)return snap(this.p);
   return {docs:[...e.rows.keys()].filter(p=>p.startsWith(this.p+'/')&&!p.slice(this.p.length+1).includes('/')).sort().slice(0,this.cap).map(snap)};
  }
 }
 return readProtectedDirectory({db:{collection:k=>new Ref(k,true)},auth:{uid:e.uid,token:{}},request:{tenantId:e.tenant,collection:'aseguradoras',activeRole:role,country,mode:'list'}});
}
async function browser(e,{changeResult}={}){
 let cache=copy((await directory(e)).rows),listener;
 const calls=[],member=copy(e.rows.get(`tenants/${e.tenant}/members/${e.uid}`));member.productReadOnly=true;
 const base={__productReadOnlyP0:true,_productStatus:()=>({ready:true,status:'ready-read-only',noFallback:true,writeEnabled:false}),all:c=>c==='aseguradoras'?copy(cache):[],get:(c,id)=>c==='aseguradoras'?copy(cache.find(row=>row.id===id)||null):null,on:(_name,fn)=>{listener=fn;return()=>{};}};
 const Orbit={auth:{productUser:member},session:{rol:()=>member.activeRole},access:{can:()=>true,canAccessRecord:()=>true},productRuntimeBrowserProvidersP0:{browserFirestoreWriteAuthorized:false,serverWriteTransport:'firebase-functions',noFallback:true,
  initialize:async()=>({auth:{currentUser:{uid:e.uid}}}),callFunction:async(name,data,region)=>{calls.push({name,data:copy(data),region});const result=await e.mod[name](e.request(copy(data.mutations),data.requestId));return changeResult?changeResult(copy(result)):result;}}};
 vm.runInNewContext(source,{window:{Orbit,dispatchEvent:()=>{}},Orbit,document:{dispatchEvent:()=>{}},CustomEvent:class{},location:{hostname:'ays-orbit-360-lab--gi-i65-b4-sr-test.web.app'},console,setTimeout,clearTimeout,Date},{filename:'store-firestore-product-operational-p0.js'});
 Orbit.productOperationalWriteP0.install(base);
 return {Orbit,calls,edit:(patch,id='browser_request_1',reason='Motivo UI')=>Orbit.store.batchDurable([{collection:'aseguradoras',action:'update',id:fixture,payload:patch,auditReason:reason}],{requestId:id}),
  refresh:async()=>{cache=copy((await directory(e)).rows);if(listener)listener('aseguradoras');},get:()=>copy(Orbit.store.get('aseguradoras',fixture))};
}
const cases=[
 ['canonical_actor_date_and_real_changed_fields',async()=>{
  const e=env(),start=Date.now(),r=await call(e),a=stored(e).actividad[0];
  assert.equal(a.responsable,'Actor canónico · operativo');assert.equal(a.actorUid,e.uid);assert.equal(a.activeRole,'operativo');assert.equal(a.serverOwned,true);
  assert.ok(Date.parse(a.fecha)>=start&&Date.parse(a.fecha)<=Date.now());assert.deepEqual(copy(a.camposCambiados),['observaciones']);assert.match(a.cambio,/observaciones/);
  assert.equal(r.canonicalReadback,true);assert.equal(r.readback[0].insurerActivity.eventId,a.eventId);assert.equal(r.readback[0].insurerActivity.rows[0].actorUid,undefined);
  assert.equal(JSON.stringify(r.readback).includes('private-actor'),false);
 }],
 ['canonical_linked_advisor_supplies_missing_membership_name',async()=>{
  const e=env(),p=`tenants/${e.tenant}/members/${e.uid}`,member={...e.rows.get(p)};delete member.nombre;e.rows.set(p,member);
  e.rows.set(`tenants/${e.tenant}/data/asesores/items/${e.own}`,{id:e.own,tenantId:e.tenant,authUid:e.uid,nombre:'Persona canónica de prueba'});
  await call(e);const a=stored(e).actividad[0];assert.equal(a.responsable,'Persona canónica de prueba · operativo');assert.equal(a.actorNameSource,'canonical-advisor');
  assert.equal(e.writes.some(w=>w.p.includes('/data/asesores/')||w.p.includes('/members/')),false);
 }],
 ['trusted_membership_name_precedes_advisor_and_token',async()=>{
  const e=env();e.rows.set(`tenants/${e.tenant}/data/asesores/items/${e.own}`,{id:e.own,tenantId:e.tenant,nombre:'Otro nombre canónico'});
  const r=e.request([mutation({observaciones:'Cambio'})],'actor_order');r.auth.token.name='Nombre autenticado';await e.mod.orbit360ProductOperationalCommandPreview(r);
  assert.equal(stored(e).actividad[0].responsable,'Actor canónico · operativo');assert.equal(stored(e).actividad[0].actorNameSource,'membership');
 }],
 ['verified_token_name_fallback_excludes_client_actor_label',async()=>{
  const e=env(),p=`tenants/${e.tenant}/members/${e.uid}`,member={...e.rows.get(p)};delete member.nombre;e.rows.set(p,member);
  const r=e.request([mutation({observaciones:'Cambio'})],'token_name');r.auth.token.name='Persona autenticada';r.data.actorName='Client impersonation';
  await e.mod.orbit360ProductOperationalCommandPreview(r);assert.equal(stored(e).actividad[0].responsable,'Persona autenticada · operativo');assert.equal(stored(e).actividad[0].actorNameSource,'authenticated-token');
 }],
 ['foreign_or_mislinked_advisor_cannot_supply_actor_name',async()=>{
  for(const bad of [{tenantId:'another-tenant'},{id:'different-advisor'},{authUid:'different-user'}]){
   const e=env(),p=`tenants/${e.tenant}/members/${e.uid}`,member={...e.rows.get(p)};delete member.nombre;e.rows.set(p,member);
   e.rows.set(`tenants/${e.tenant}/data/asesores/items/${e.own}`,{id:e.own,tenantId:e.tenant,nombre:'Foreign actor',...bad});
   const r=e.request([mutation({observaciones:'Cambio'})],'bad_advisor');r.auth.token.name='Persona autenticada';await e.mod.orbit360ProductOperationalCommandPreview(r);
   assert.equal(stored(e).actividad[0].responsable,'Persona autenticada · operativo');assert.equal(stored(e).actividad[0].actorNameSource,'authenticated-token');
  }
 }],
 ['emails_roles_and_uid_never_used_as_human_actor_fallback',async()=>{
  const e=env(),p=`tenants/${e.tenant}/members/${e.uid}`;e.rows.set(p,{...e.rows.get(p),nombre:'private@example.invalid',displayName:'Operativo',name:e.uid});
  e.rows.set(`tenants/${e.tenant}/data/asesores/items/${e.own}`,{id:e.own,tenantId:e.tenant,nombre:'uid:sensitive',displayName:e.own});
  const r=e.request([mutation({observaciones:'Cambio'})],'unknown_actor');r.auth.token.name='private-token@example.invalid';await e.mod.orbit360ProductOperationalCommandPreview(r);
  assert.equal(stored(e).actividad[0].responsable,'Usuario autorizado · operativo');assert.equal(stored(e).actividad[0].actorNameSource,'unresolved');
 }],
 ['missing_empty_or_truncated_client_history_preserves_all_75',async()=>{
  for(const sent of [undefined,[],[{fecha:'1900-01-01',responsable:'Forged',cambio:'Forged',eventId:'forged',serverOwned:true}]]){
   const old=Array.from({length:75},(_,i)=>({fecha:'2026-09-01T00:00:00.000Z',cambio:'Historical '+i,id:'old-'+i})),e=env(old);
   await call(e,mutation({observaciones:'Changed',...(sent===undefined?{}:{actividad:sent})}));
   assert.equal(stored(e).actividad.length,76);assert.deepEqual(copy(stored(e).actividad.slice(1)),old);assert.equal(stored(e).actividad.some(x=>x.eventId==='forged'),false);
  }
 }],
 ['forged_history_actor_date_and_before_after_are_not_written',async()=>{
  const e=env();await call(e,mutation({observaciones:'Changed',actividad:[{responsable:'Pretend admin',actorUid:'fake',fecha:'1900-01-01',eventId:'forged',camposCambiados:['password'],before:{password:'secret-injected'},motivo:'Legacy reason'}]},{auditReason:undefined}));
  const a=stored(e).actividad[0];assert.equal(a.responsable,'Actor canónico · operativo');assert.equal(a.motivo,'Legacy reason');assert.equal(a.before,undefined);assert.equal(JSON.stringify(stored(e)).includes('secret-injected'),false);assert.notEqual(a.fecha,'1900-01-01');
 }],
 ['edit_reload_restore_preserves_both_events_and_original_value',async()=>{
  const e=env(),first=await browser(e);await first.edit({observaciones:'Temporal'},'edit_1','Edición temporal');
  const reloaded=await browser(e);assert.equal(reloaded.get().observaciones,'Temporal');assert.equal(reloaded.get().actividad.length,2);
  await reloaded.edit({observaciones:'Original'},'restore_1','Restauración');const final=await browser(e);
  assert.equal(final.get().observaciones,'Original');assert.equal(final.get().actividad.length,3);assert.deepEqual(final.get().actividad.slice(0,2).map(x=>x.motivo),['Restauración','Edición temporal']);
 }],
 ['stale_tabs_preserve_each_others_field_edits_and_history',async()=>{
  const e=env(),one=await browser(e),stale=await browser(e);
  await one.edit({observaciones:'First tab'},'tab_one','Primera');await stale.edit({web:'https://example.invalid/second'},'tab_two','Segunda');
  assert.equal(stored(e).observaciones,'First tab');assert.equal(stored(e).web,'https://example.invalid/second');assert.equal(stored(e).actividad.length,3);
  assert.deepEqual(Object.keys(stale.calls[0].data.mutations[0].payload).sort(),['__syntheticQa','web']);
  assert.equal(stale.calls[0].data.mutations[0].auditReason,'Segunda');assert.equal(stored(e).auditReason,undefined);
 }],
 ['idempotent_retry_does_not_append_another_event',async()=>{
  const e=env(),m=mutation({observaciones:'Once'});const first=await call(e,m,'same_event'),n=e.writes.length,second=await call(e,m,'same_event');
  assert.equal(second.reused,true);assert.equal(e.writes.length,n);assert.equal(stored(e).actividad.length,2);assert.equal(first.readback[0].insurerActivity.eventId,second.readback[0].insurerActivity.eventId);
 }],
 ['same_request_changed_reason_rejected',async()=>{const e=env();await call(e);await denied(e,()=>call(e,mutation({observaciones:'Cambio'},{auditReason:'Otro motivo'})),'already-exists');}],
 ['same_request_other_actor_rejected',async()=>{
  const e=env(),m=mutation({observaciones:'Cambio'});await call(e,m);const uid='other-synthetic';e.rows.set(`tenants/${e.tenant}/members/${uid}`,{...e.rows.get(`tenants/${e.tenant}/members/${e.uid}`),uid});
  const request=e.request([m],'insurer_request_1');request.auth.uid=uid;await denied(e,()=>e.mod.orbit360ProductOperationalCommandPreview(request),'permission-denied');
 }],
 ['same_request_other_assigned_role_rejected',async()=>{
  const e=env(),m=mutation({observaciones:'Cambio'});await call(e,m);const p=`tenants/${e.tenant}/members/${e.uid}`;e.rows.set(p,{...e.rows.get(p),roles:['Operativo','Dirección']});
  const request=e.request([m],'insurer_request_1');request.data.activeRole='Dirección';await denied(e,()=>e.mod.orbit360ProductOperationalCommandPreview(request),'permission-denied');
 }],
 ['unchanged_business_fields_create_no_activity',async()=>{
  const e=env(),before=copy(stored(e).actividad),r=await call(e,mutation({observaciones:'Original',actividadTotal:900,actividad:[]}));
  assert.deepEqual(copy(stored(e).actividad),before);assert.equal(stored(e).actividadTotal,undefined);assert.equal(r.readback[0].insurerActivity.eventId,null);
 }],
 ['invalid_canonical_history_fails_without_replacing_it',async()=>{const e=env();stored(e).actividad={unmigrated:true};await denied(e,()=>call(e),'failed-precondition');assert.deepEqual(stored(e).actividad,{unmigrated:true});}],
 ['duplicate_insurer_target_rejected_before_writes',async()=>{const e=env();await denied(e,()=>e.mod.orbit360ProductOperationalCommandPreview(e.request([mutation({observaciones:'One'}),mutation({web:'Two'})],'double_target')),'invalid-argument');}],
 ['unauthorized_country_rejected_with_history_unchanged',async()=>{const e=env();stored(e).pais='CO';const original=copy(stored(e));await denied(e,()=>call(e),'permission-denied');assert.deepEqual(stored(e),original);}],
 ['real_insurer_still_denied_in_preview',async()=>{const e=env(),m=mutation({observaciones:'Changed'},{id:'real_insurer'});await denied(e,()=>call(e,m),'permission-denied');}],
 ['ordinary_document_linking_without_reason_is_preserved',async()=>{
  const e=env(),x=await browser(e);await x.Orbit.store.updateDurable('aseguradoras',fixture,{docs:[{id:'doc-synthetic',nombre:'Document QA',version:1}],conocimientoActualizadoAt:'2026-10-30T12:00:00Z',__syntheticQa:true});
  assert.equal(stored(e).docs.length,1);assert.equal(stored(e).actividad[0].motivo,'');assert.deepEqual(copy(stored(e).actividad[0].camposCambiados),['conocimientoActualizadoAt','docs']);assert.equal(x.get().actividad[0].serverOwned,true);
 }],
 ['legacy_activation_reason_accepted_without_client_history_replacement',async()=>{
  const e=env(),x=await browser(e),old=x.get().actividad;await x.Orbit.store.updateDurable('aseguradoras',fixture,{vinculada:false,__syntheticQa:true,actividad:[{fecha:'1900-01-01',responsable:'Pretend',cambio:'Pretend',motivo:'Desactivar prueba'},...old]});
  assert.equal(stored(e).actividad.length,2);assert.equal(stored(e).actividad[0].motivo,'Desactivar prueba');assert.equal(stored(e).actividad[0].responsable,'Actor canónico · operativo');assert.equal(x.get().actividad[0].responsable,'Actor canónico · operativo');
 }],
 ['projected_display_count_never_written_back',async()=>{
  const e=env(),x=await browser(e);const patch={...x.get(),observaciones:'Changed'};await x.edit(patch);
  assert.equal(x.calls[0].data.mutations[0].payload.actividad,undefined);assert.equal(x.calls[0].data.mutations[0].payload.actividadTotal,undefined);assert.equal(stored(e).actividadTotal,undefined);assert.equal(stored(e).actividad.length,2);
 }],
 ['directory_returns_bounded_safe_history_while_storage_keeps_310',async()=>{
  const history=Array.from({length:310},(_,i)=>({fecha:'2026-09-01T00:00:00Z',cambio:'Historic '+i,responsable:'Persona',actorUid:'SECRET_UID',email:'SECRET_EMAIL',antes:{password:'SECRET_PASSWORD'},after:{token:'SECRET_TOKEN'},camposCambiados:['web']})),e=env(history);
  await call(e);const r=await directory(e);assert.equal(r.rows[0].actividad.length,60);assert.equal(r.rows[0].actividadTotal,311);assert.equal(stored(e).actividad.length,311);assert.equal(JSON.stringify(r).includes('SECRET_'),false);assert.equal(r.rows[0].actividad[0].serverOwned,true);
 }],
 ['legacy_timestamp_normalized_missing_date_not_invented',async()=>{
  const p=projectInsurerActivity([{fecha:{_seconds:1793361600,_nanoseconds:0},cambio:'Timestamp'},{fecha:{seconds:1793361600,nanoseconds:0}},{cambio:'Undated'},{fecha:'invalid'},{fecha:{password:'secret'}}]);
  assert.equal(p.rows[0].fecha,new Date(1793361600000).toISOString());assert.equal(p.rows[1].fecha,p.rows[0].fecha);assert.equal(p.rows[2].fecha,'');assert.equal(p.rows[3].fecha,'');assert.equal(p.rows[4].fecha,'');assert.equal(JSON.stringify(p).includes('secret'),false);
 }],
 ['reader_role_country_limits_remain_enforced',async()=>{
  const e=env();await assert.rejects(()=>directory(e,'Asesor'),error=>!!error.code);await assert.rejects(()=>directory(e,'Operativo','CO'),error=>!!error.code);assert.equal(e.writes.length,0);
 }],
 ['pending_overlay_reconciles_by_canonical_event_not_client_array',async()=>{
  const e=env(),x=await browser(e);await x.edit({observaciones:'Changed'});const event=x.get().actividad[0].eventId;await x.refresh();
  stored(e).web='https://example.invalid/later';await x.refresh();assert.equal(x.get().web,'https://example.invalid/later');assert.equal(x.get().actividad[0].eventId,event);
 }],
 ['missing_audit_proof_cannot_claim_success',async()=>{
  const e=env(),x=await browser(e,{changeResult:r=>{delete r.readback[0].insurerActivity;return r;}});await assert.rejects(()=>x.edit({observaciones:'Changed'}),/PRODUCT_INSURER_ACTIVITY_READBACK_REQUIRED/);assert.equal(x.Orbit.productOperationalWriteP0.status().committed,0);
 }],
 ['wrong_event_in_audit_proof_cannot_claim_success',async()=>{
  const e=env(),x=await browser(e,{changeResult:r=>{r.readback[0].insurerActivity.eventId='insact_unconfirmed';return r;}});await assert.rejects(()=>x.edit({observaciones:'Changed'}),/PRODUCT_INSURER_ACTIVITY_READBACK_REQUIRED/);assert.equal(x.Orbit.productOperationalWriteP0.status().committed,0);
 }],
 ['committed_request_and_append_only_operational_event_bound_to_audit',async()=>{
  const e=env(),r=await call(e),event=e.rows.get(`tenants/${e.tenant}/operationalEvents/${r.eventId}`),receipt=e.rows.get(`tenants/${e.tenant}/operationalRequests/${r.requestId}`);
  assert.equal(event.insurerActivities.length,1);assert.equal(event.insurerActivities[0].entry.eventId,stored(e).actividad[0].eventId);assert.equal(receipt.insurerActor.uid,e.uid);assert.equal(receipt.insurerActor.activeRole,'operativo');assert.equal(event.containsSecrets,false);
 }]
];
(async()=>{const tests=[];for(const [id,fn] of cases){try{await fn();tests.push({id,pass:true});}catch(error){tests.push({id,pass:false,error:error.message,code:error.code});}}
 const paths=['functions/product-operational-domain.js','functions/b4-003-scoped-bootstrap-reader.js','orbit360-platform/data/store-firestore-product-operational-p0.js','orbit360-platform/modules/aseguradoras.js'];
 const blobs=Object.fromEntries(paths.map(file=>{const b=fs.readFileSync(path.join(repo,file));return[file,crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex')];}));
 const result={schema:'gravicentra-insurer-activity-audit-regression-v1',syntheticOnly:true,externalRequests:0,sourceBlobs:blobs,total:tests.length,passed:tests.filter(t=>t.pass).length,failed:tests.filter(t=>!t.pass).length,tests,authenticatedBrowserUat:false,fullSourceLifecycleFindingClosed:false};
 if(output)fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));process.exitCode=result.failed?1:0;
})().catch(error=>{console.error(error);process.exitCode=2;});
