'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ciclo=fs.readFileSync('orbit360-platform/core/ciclo.js','utf8');
const client=fs.readFileSync('orbit360-platform/modules/cliente360.js','utf8');
const backend=fs.readFileSync('functions/product-ops-leads-domain.js','utf8');
function typeWriter(cat){
  const match=ciclo.match(/  async function persistGestionType\(tipo, lista\) \{[\s\S]*?\n  \}/);
  assert.ok(match,'canonical management type writer must exist');
  return new Function('Orbit',match[0]+'\nreturn persistGestionType;')({cat});
}
function fixture({denied=false,invalidReadback=false}={}){
  let types=[{t:'Solicitud de cancelación',lista:'Gestiones Admin'}],writes=0;
  const cat={
    ensure:async(force)=>{assert.equal(force,true);return{};},
    get:key=>{assert.equal(key,'tiposGestion');return JSON.parse(JSON.stringify(types));},
    all:()=>({tiposGestion:JSON.parse(JSON.stringify(types)),canales:['Referido']}),
    saveDurable:async(next,reason)=>{
      assert.match(reason,/tipo de gestion operativa compartido/);
      assert.deepEqual(next.canales,['Referido']);
      if(denied)throw Error('permission-denied');
      writes++;
      types=invalidReadback?types:JSON.parse(JSON.stringify(next.tiposGestion));
      return {tiposGestion:JSON.parse(JSON.stringify(types))};
    }
  };
  return{write:typeWriter(cat),types:()=>types,writes:()=>writes};
}
test('new management type is committed via existing canonical catalog writer and reused',async()=>{
  const f=fixture();
  const first=await f.write('Documentos pendientes para renovación','Renovaciones / Modif.');
  assert.deepEqual(first,{existing:false,saved:true});
  assert.equal(f.writes(),1);
  const other=await f.write('DOCUMENTOS PENDIENTES PARA RENOVACION','Renovaciones / Modif.');
  assert.deepEqual(other,{existing:true});
  assert.equal(f.writes(),1);
  assert.equal(f.types().length,2);
});
test('catalog denial or missing readback never advertises success',async()=>{
  await assert.rejects(fixture({denied:true}).write('Seguimiento a cobros','Gestiones Admin'),/permission-denied/);
  await assert.rejects(fixture({invalidReadback:true}).write('Seguimiento a cobros','Gestiones Admin'),/DURABLE_READBACK_REQUIRED/);
});
test('new type must be saved before management insert; no silent session-only type',()=>{
  const save=ciclo.indexOf('await persistGestionType(tipo, lista);');
  const insert=ciclo.indexOf('gestion = await crearGestionDurable');
  assert.ok(save>0&&save<insert);
  assert.match(ciclo,/await persistGestionType\(v\('gs-tipo'\), v\('gs-lista'\)\);/);
  assert.match(ciclo,/const saved=await Orbit\.cat\.saveDurable\(next,/);
});
test('internal management UI never uses customer phone or email for WhatsApp action',()=>{
  assert.match(ciclo,/const internal=o\.tipo==='gestion'/);
  assert.match(ciclo,/const tel=internal\?'':String\(o\.tel\|\|''\)/);
  assert.match(ciclo,/const email=internal\?'':String\(o\.email\|\|''\)/);
  assert.doesNotMatch(ciclo,/para: ase \? ase\.nombre : '', tel: cli\.telefono/);
  assert.doesNotMatch(ciclo,/tel: resp\.telefono \|\| \(cl \? cl\.telefono : ''\)/);
  assert.match(ciclo,/portal del cliente/);
});
test('server routes internal management to authorized Ops and never to client; portal retains opt-in',()=>{
  assert.match(backend,/const portalManagement=entityType==='gestiones'/);
  assert.match(backend,/!\s*portalManagement&&operation!=='hide_management_card'/);
  assert.match(backend,/targets\.push\(\{type:'role',id:'operations'\}\)/);
  assert.match(backend,/cfg\.portalResponseEnabled&&portalManagement&&after\.clienteId/);
  assert.doesNotMatch(backend,/cfg\.portalResponseEnabled&&after\.clienteId&&\['resolve_management'/);
});
test('client panel and history reuse canonical Ops management with role/country scope',()=>{
  assert.match(client,/const DETAIL_DATA_DEPS = \[[^\n]*'gestiones'/);
  assert.match(client,/const TABS = \[[^\n]*'gestiones'/);
  assert.match(client,/gestionesCliente\(cid\)/);
  assert.match(client,/Orbit\.ciclo\.gestiones\(\{surface:'ops',includeBoardHidden:true\}\)/);
  assert.match(client,/String\(g\.clienteId\|\|''\)===String\(cid\|\|''\)/);
  assert.match(client,/data-c360-management/);
  assert.match(client,/const acts = actividadesCliente\(cid\)\.slice\(0, 4\)/);
  assert.match(client,/const acts = actividadesCliente\(cid\);/);
  assert.match(client,/dataReadiness\(\['gestiones'\]\)!=='ready'/);
});
