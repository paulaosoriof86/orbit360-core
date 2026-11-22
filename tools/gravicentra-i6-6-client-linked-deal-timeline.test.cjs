'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const source = fs.readFileSync('orbit360-platform/modules/cliente360.js','utf8');
const fragment = source.slice(source.indexOf('  function commercialHistorySurfaces'), source.indexOf('  function commercialEventLink'));
function fixture(surfaces, state='ready') {
  const calls = [];
  const first = {id:'deal-one', clienteId:'customer-one',
    comentarios:[{eventId:'comment', actorName:'Agent', ts:'2026-11-19T10:00:00Z', tipo:'Nota', texto:'Decision recorded'}],
    bitacora:[{eventId:'comment', campo:'Colaboración'}, {campo:'Creación', a:'Ingreso', ts:'2026-11-18'}]};
  const similarlyNamed = {...first,id:'unrelated',clienteId:'customer-two'};
  const orbit = {access:{can:(surface,action)=>action==='view' && surfaces.includes(surface)},
    ciclo:{negocios({surface}) { calls.push(surface); return [first,similarlyNamed]; }}};
  return {query:new Function('Orbit','dataReadiness',fragment+'\nreturn commercialHistory;')(orbit,()=>state), calls};
}
test('one record in both boards yields one event per canonical timeline entry',()=>{
  const f=fixture(['ops','leads']);
  const events=f.query('customer-one',[]);
  assert.equal(events.length,2);
  assert.ok(events.every(e=>e.negocioId==='deal-one'));
  assert.equal(events[0].actor,'Agent');
  assert.equal(events[0].detalle,'Decision recorded');
  assert.deepEqual(f.calls,['leads','ops']);
});
test('saved activity supersedes its matching event for that deal only',()=>{
  const f=fixture(['leads']);
  assert.equal(f.query('customer-one',[{negocioId:'deal-one',eventId:'comment'}]).length,1);
  assert.equal(f.query('customer-one',[{negocioId:'another',eventId:'comment'}]).length,2);
});
test('unauthorized surfaces and an unconfirmed snapshot never project business history',()=>{
  for(const f of [fixture([]),fixture(['ops'],'pending'),fixture(['leads'],'unavailable')]){
    assert.deepEqual(f.query('customer-one',[]),[]);
    assert.deepEqual(f.calls,[]);
  }
});
