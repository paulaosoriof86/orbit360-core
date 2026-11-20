'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('orbit360-platform/core/ciclo.js','utf8');
function implementation(name,next){
  const start=source.indexOf('  function '+name+'(');
  const end=source.indexOf(next,start);
  assert.ok(start>=0&&end>start);
  return source.slice(start,end);
}
const logic=implementation('collaborationDirection','  const COLLAB_TYPES')+
  implementation('collaborationOwner','  function collaborationState')+
  implementation('opsBoard','  function leadsBoard');
test('Directed comments control the active Ops queue across stages and neutral notes preserve ownership',()=>{
  const opportunity={id:'o1',etapa:'inspeccion',comentarios:[]};
  const management={id:'g1',lista:'Gestión',comentarios:[]};
  const ctx=vm.createContext({negocios:()=>[opportunity],gestiones:()=>[management],
    opsListas:()=>[{kind:'negocio',etapa:'inspeccion'},{kind:'gestion',nombre:'Gestión'}]});
  vm.runInContext(logic,ctx);
  const ids=()=>Array.from(ctx.opsBoard(),c=>Array.from(c.items,it=>it.rec.id));
  assert.deepEqual(ids(),[['o1'],['g1']]);
  for(const rec of [opportunity,management])rec.comentarios.push({tipo:'Devuelto a asesor'}, {tipo:'Nota interna'});
  assert.deepEqual(ids(),[[],[]]);
  for(const rec of [opportunity,management])rec.comentarios.push({direction:'operations',tipo:'Respuesta del asesor'});
  assert.deepEqual(ids(),[['o1'],['g1']]);
  assert.equal(opportunity.etapa,'inspeccion');
});
