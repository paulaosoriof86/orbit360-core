'use strict';
// Existing I6.6 gate: Cliente360 Edit/New advisor source parity, no data writes.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('orbit360-platform/modules/cliente360.js','utf8');
const policy=fs.readFileSync('orbit360-platform/modules/policy-receipts-v1199-bridge.js','utf8');

test('Editar Cliente uses the same signed Equipos roster as policy capture',()=>{
  assert.match(source,/function bindAssignableClientAdvisors\(/);
  assert.match(source,/Orbit\.assignableAdvisorRoster/);
  assert.match(source,/\.list\(country,\{force:true\}\)/);
  assert.match(source,/bindAssignableClientAdvisors\(back,'ce-ase',selPais,'ce-save'/);
  assert.match(policy,/const rows = await service\.list\(country2, \{ force: true \}\)/);
  const edit=source.slice(source.indexOf('function edit(cid)'),source.indexOf('function field(label'));
  assert.doesNotMatch(edit,/const asesores = S\(\)\.all\('asesores'\)/);
  assert.match(edit,/if\(!advisorRoster\.allowed\(\)\)return c360toast/);
});

test('Nuevo Cliente uses same role+country signed service, not partial local collection',()=>{
  const create=source.slice(source.indexOf('function nuevoCliente()'),source.indexOf('function nuevoReclamo('));
  assert.match(create,/bindAssignableClientAdvisors\(back,'nc-ase',paisSel,'nc-ok',null\)/);
  assert.doesNotMatch(create,/const asesores = S\(\)\.all\('asesores'\)/);
  assert.match(create,/if\(!advisorRoster\.allowed\(\)\)return c360toast/);
});

test('C360 change-country and stale async results fail closed; preserve historical ID without reassigning',()=>{
  assert.match(source,/sequence!==id/);
  assert.match(source,/field\.dataset\.rosterState='blocked'/);
  assert.match(source,/save\.disabled=true/);
  assert.match(source,/countryEl\.addEventListener\('change'/);
  assert.match(source,/historical&&field\.value===priorId&&countryEl\.value===priorCountry/);
  assert.match(source,/!\[\]\.concat\(a\.paises\|\|\[\]\)\.includes\(country\)/);
  assert.match(source,/a\.roleEligible!==true/);
  assert.match(source,/a\.activo===false/);
  assert.doesNotMatch(source,/Germ[aá]n Reyes|Priscila L[oó]pez/);
});

test('Cliente360 source parses without syntax errors (no rendering PASS assertion)',()=>{
  new vm.Script(source,{filename:'orbit360-platform/modules/cliente360.js'});
});
