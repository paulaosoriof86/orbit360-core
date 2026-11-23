'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const client = fs.readFileSync('orbit360-platform/modules/cliente360.js', 'utf8');
const cycle = fs.readFileSync('orbit360-platform/core/ciclo.js', 'utf8');
test('standard client management stays operational without a configuration grant',async()=>{
  const fn=cycle.match(/  async function persistGestionType\(tipo, lista\) \{[\s\S]*?\n  \}/);
  assert.ok(fn);
  let catalogWrites = 0;
  const cat = {
    ensure: async () => {}, get: () => [], all: () => ({}),
    saveDurable: async () => { catalogWrites++; throw Error('permission-denied'); }
  };
  const write = new Function('Orbit',fn[0]+'\nreturn persistGestionType;')({cat});
  assert.deepEqual(await write('Gestión de póliza','Gestiones Admin'),{existing:true});
  assert.equal(catalogWrites,0);
  await assert.rejects(write('Gestión de póliza','Otra cola'),/permission-denied/);
  assert.equal(catalogWrites,1);
});

test('detail country changes close the previous client before any detail reads',()=>{
  const fn=client.match(/  function clientInCurrentCountry\(client\) \{[\s\S]*?\n  \}/);
  assert.ok(fn);
  const orbit={pais:'GT'};
  const allow=new Function('Orbit',fn[0]+'\nreturn clientInCurrentCountry;')(orbit);
  const record={pais:'GT'};
  assert.equal(allow(record),true);
  orbit.pais='CO';
  assert.equal(allow(record),false);
  assert.equal(allow({}),false);
  orbit.pais='TODOS';
  assert.equal(allow(record),true);
  const render=client.slice(client.indexOf('  function render(h)'),client.indexOf('  function clientInCurrentCountry'));
  assert.ok(render.indexOf('!clientInCurrentCountry(requested)')>0);
  assert.ok(render.indexOf('!clientInCurrentCountry(requested)')<render.indexOf('ensureDataCollections(DETAIL_DATA_DEPS)'));
});

