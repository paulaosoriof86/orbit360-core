import fs from 'node:fs';
import vm from 'node:vm';
const Orbit = {};
const context = { window:{Orbit}, Orbit, console, Date, Math, Set, Array, String, Object, JSON, Number, Promise };
context.window.window=context.window;
vm.createContext(context);
for (const file of [
  'orbit360-platform/core/document-provider-registry-p09.js',
  'orbit360-platform/core/aseguradoras-knowledge-runtime-p09.js',
  'orbit360-platform/modules/aseguradoras-knowledge-p09.js'
]) {
  vm.runInContext(fs.readFileSync(file,'utf8'), context, {filename:file});
}
function assert(c,m){if(!c)throw new Error(m)}
function fakeStore(seed={}){
  const db=JSON.parse(JSON.stringify(seed));
  return {
    all(c){return (db[c]||[]).slice()}, get(c,id){return (db[c]||[]).find(r=>r.id===id)||null},
    insert(c,row){(db[c]=db[c]||[]).push(JSON.parse(JSON.stringify(row)));return row},
    update(c,id,patch){const r=(db[c]||[]).find(x=>x.id===id);if(!r)return null;Object.assign(r,JSON.parse(JSON.stringify(patch)));return r},
    remove(c,id){db[c]=(db[c]||[]).filter(r=>r.id!==id)}, raw(){return db}
  };
}
const registry=Orbit.documentProviderRegistryP09;
assert(registry.resolve('excel_manifest',{}).code==='BACKEND_REQUIRED','missing provider honest');
registry.register('deterministic-excel',{extractExcelManifest:async req=>({schemaVersion:'orbit360_excel_rule_facts_p06b_v1',document:{id:req.documentId,tenantId:req.tenantId,aseguradoraId:req.aseguradoraId},facts:[{id:'f1'}],routeKey:'safe-route',key:'functional-key',apiKey:'drop-me'})},{tasks:['excel_manifest'],status:'connected',deterministic:true,version:'1'});
const exec=await registry.execute('excel_manifest',{tenantId:'tenant-a',aseguradoraId:'ins-a',documentId:'doc-a',fileRef:'drive://doc-a',purpose:'training'},{tenantConfig:{documentIntelligence:{tasks:{excel_manifest:{primary:'deterministic-excel'}}}}});
assert(exec.ok,'provider executes');
assert(exec.result.routeKey==='safe-route','functional key kept');
assert(exec.result.key==='functional-key','generic functional key kept');
assert(!('apiKey' in exec.result),'secret removed');
assert(exec.writeAllowed===false,'registry never writes');

const rt=Orbit.aseguradorasKnowledgeRuntimeP09;
const admin={id:'admin-a',tenantId:'tenant-a',activeRole:'AdminTenant',roles:['AdminTenant','Asesor']};
const advisor={id:'admin-a',tenantId:'tenant-a',activeRole:'Asesor',roles:['AdminTenant','Asesor']};
const ctx={tenantId:'tenant-a',aseguradoraId:'ins-a',insurer:{id:'ins-a',pais:'GT'},source:{id:'doc-a',nombre:'Cotizador.xlsx',archivoRef:'drive://doc-a',version:'v1',pais:'GT',producto:'Autos',tipoVehiculo:'Automóvil'}};
assert(rt.buildIngestionRequest(ctx,admin).ok,'admin ingestion allowed');
assert(!rt.buildIngestionRequest(ctx,advisor).ok,'active advisor blocked');
const store=fakeStore({aseguradoras:[{id:'ins-a',tenantId:'tenant-a',nombre:'Insurer A',docs:[]},{id:'ins-b',tenantId:'tenant-b',nombre:'Insurer B',docs:[]}],actividades:[]});
const fp=rt.currentFingerprint(store,'tenant-a','ins-a');
const plan=rt.buildPersistencePlan({context:ctx,actor:admin,reason:'Validación de fuente',confirmed:true,expectedFingerprint:fp,manifest:{id:'manifest-a',estado:'requiere_validacion',parser:'demo',facts:[{factType:'rate',formula:'A1*B1'}],outputRoutes:[{printAreas:['A1:D20']}]},proposals:[{id:'proposal-a',estado:'requiere_validacion',secret:'drop'}],tariffRules:[{id:'rule-a',estado:'validated_pending_enablement',enabledCotizador:true}],presentations:[{id:'profile-a',estado:'requiere_validacion'}],bindings:[{id:'binding-a',status:'incomplete_requires_validation',enabledCotizadorAutomatico:false}]});
assert(plan.ok && plan.enablesCotizador===false,'plan metadata only');
assert(!rt.applyPlan(store,plan,advisor).ok,'advisor cannot apply');
const applied=rt.applyPlan(store,plan,admin);
assert(applied.ok && !applied.enablesCotizador,'metadata persisted without enablement');
const insurer=store.get('aseguradoras','ins-a');
assert(insurer.docs.length===1 && insurer.docs[0].id==='doc-a','source linked to insurer');
assert(insurer.docs[0].contieneTarifas && insurer.docs[0].contieneReglasCalculo && insurer.docs[0].contieneAreaImpresion,'capabilities derive from manifest');
assert(store.all('aseguradora_manifiestos').length===1,'manifest persisted');
assert(store.all('aseguradora_reglas_tarifarias')[0].enabledCotizador===false,'persist cannot enable cotizador');
assert(store.all('aseguradora_propuestas')[0].secret===undefined,'secret stripped');
const model=rt.readModel(store,'tenant-a','ins-a');
assert(model.ok && model.summary.sources===1 && model.summary.tariffRules===1,'read model aggregates');
assert(rt.readModel(store,'tenant-b','ins-b').summary.sources===0,'tenant isolation');
assert(rt.applyPlan(store,{...plan,expectedFingerprint:''},admin).ok,'idempotent reapply');
assert(store.all('aseguradora_manifiestos').length===1,'upsert avoids duplicate');
const tenantBPlan=rt.buildPersistencePlan({context:{...ctx,tenantId:'tenant-b',aseguradoraId:'ins-b',source:{...ctx.source,id:'doc-a'}},actor:{...admin,id:'admin-b',tenantId:'tenant-b'},reason:'tenant b',confirmed:true,manifest:{id:'manifest-a'}});
assert(rt.applyPlan(store,tenantBPlan,{...admin,id:'admin-b',tenantId:'tenant-b'}).ok,'tenant B applies');
assert(store.all('aseguradora_manifiestos').length===2,'same source ids are namespaced by tenant');
const failingStore=fakeStore({aseguradoras:[{id:'ins-f',tenantId:'tenant-a',docs:[]}],actividades:[]});
const originalInsert=failingStore.insert;failingStore.insert=(c,row)=>{if(c==='aseguradora_propuestas')throw new Error('synthetic failure');return originalInsert(c,row)};
const failCtx={...ctx,aseguradoraId:'ins-f',source:{...ctx.source,id:'doc-f'}};
const failPlan=rt.buildPersistencePlan({context:failCtx,actor:admin,reason:'rollback',confirmed:true,manifest:{id:'m'},proposals:[{id:'p'}]});
const failed=rt.applyPlan(failingStore,failPlan,admin);
assert(!failed.ok && failingStore.all('aseguradora_manifiestos').length===0 && failingStore.get('aseguradoras','ins-f').docs.length===0,'failed block rolls back');
const stalePlan=rt.buildPersistencePlan({context:ctx,actor:admin,reason:'stale',confirmed:true,expectedFingerprint:'old',manifest:{id:'manifest-a'}});
assert(!rt.applyPlan(store,stalePlan,admin).ok,'stale plan blocked');
console.log('OK orbit360-test-aseguradoras-knowledge-p09');