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


test('all approved built-in types are operational for GT/CO without catalog write access',async()=>{
  const catalogSource=fs.readFileSync('orbit360-platform/core/config.js','utf8');
  assert.ok(catalogSource.includes('"t":"Actualizar datos de cliente","lista":"Gestiones Admin"'));
  assert.ok(catalogSource.includes('"t":"Renovación de póliza","lista":"Renovaciones / Modif."'));
  const builtins=[
    {t:'Actualizar datos de cliente',lista:'Gestiones Admin'},
    {t:'Renovación de póliza',lista:'Renovaciones / Modif.'},
    {t:'Reclamo / Siniestro',lista:'Gestiones Admin'},
    {t:'Solicitud de cancelación',lista:'Gestiones Admin'}
  ];
  for(const role of ['Operativo','Direccion','AdminTenant','SuperAdmin']){
    let catalogWrites=0, catalogReads=0;
    const cat={
      DEF:{tiposGestion:builtins},
      ensure:async()=>{catalogReads++;throw Error('catalog-read-unavailable');},
      get:()=>[],all:()=>({}),
      saveDurable:async()=>{catalogWrites++;throw Error('permission-denied');}
    };
    const fn=cycle.match(/  async function persistGestionType\(tipo, lista\) \{[\s\S]*?\n  \}/);
    assert.ok(fn,'same shared catalog helper');
    const write=new Function('Orbit',fn[0]+'\nreturn persistGestionType;')({cat});
    for(const country of ['GT','CO']){
      for(const item of builtins)
        assert.deepEqual(await write(item.t,item.lista),{existing:true},role+' '+country+' '+item.t);
    }
    assert.equal(catalogWrites,0,role+' must not edit tenant config');
    assert.equal(catalogReads,0,role+' must not need an admin catalog lookup for a built-in');
    await assert.rejects(write('Actualizar datos de cliente','Otra cola'),/catalog-read-unavailable/);
    await assert.rejects(write('Seguimiento de renovación no registrado','Gestiones Admin'),/catalog-read-unavailable/);
    assert.equal(catalogWrites,0);
  }
});

test('Ops management modal may open built-in flows when protected catalog fetch is unavailable',async()=>{
  const start=cycle.indexOf('  async function managementCreateModal(opts) {');
  const end=cycle.indexOf('    opts = Object.assign(',start);
  assert.ok(start>=0&&end>start);
  const preamble=cycle.slice(start,end);
  const compile=new Function('Orbit','U',preamble+'    return "OPEN";\n  }\nreturn managementCreateModal;');
  const toasts=[];
  const allowed=compile({cat:{DEF:{tiposGestion:[{t:'Actualizar datos de cliente',lista:'Gestiones Admin'}]},get:()=>[],ensure:async()=>{throw Error('permission-denied');}}},{toast:message=>toasts.push(message)});
  assert.equal(await allowed({}), 'OPEN');
  assert.equal(toasts.length,0);
  const blocked=compile({cat:{DEF:{tiposGestion:[]},get:()=>[],ensure:async()=>{throw Error('catalog-missing');}}},{toast:message=>toasts.push(message)});
  assert.equal(await blocked({}),undefined);
  assert.match(toasts.at(-1),/catálogos/);
});

test('Management persists once before optional Drive and distinguishes postcommit failures from create failures',()=>{
  const start=cycle.indexOf("    el('mg-save').addEventListener('click', async () => {");
  const end=cycle.indexOf('    return back;',start);
  assert.ok(start>=0&&end>start);
  const block=cycle.slice(start,end);
  const create=block.indexOf('await crearGestionDurable(');
  const ack=block.indexOf('managementCommitted = true;');
  const upload=block.indexOf('await Orbit.secureResources.uploadDocument(');
  assert.ok(create>=0&&ack>create&&upload>ack,'canonical create must precede optional upload');
  assert.match(block,/catch \(uploadError\) \{[\s\S]*?failed\.push\(\{ nombre: file\.name, status: 'carga_no_confirmada' \}\);[\s\S]*?continue;/);
  assert.match(block,/if \(managementCommitted\) \{[\s\S]*?No repitas la gestión; verifica los documentos en su ficha/);
  assert.match(block,/documentoCargaPendiente: failed\.length > 0/);
  assert.match(block,/actividadCliente360Confirmada/);
  assert.equal((block.match(/await crearGestionDurable\(/g)||[]).length,1,'no duplicate create transport');
});
 
test('postcommit failure path retains the same committed management variable',()=>{
  const start=cycle.indexOf("    el('mg-save').addEventListener('click', async () => {");
  const end=cycle.indexOf('    return back;',start);
  const block=cycle.slice(start,end);
  assert.ok(block.includes('let managementCommitted = false, gestion = null;'));
  assert.ok(block.includes('gestion = await crearGestionDurable('));
  assert.ok(!block.includes('let gestion = await crearGestionDurable('));
  assert.ok(block.includes('opts.onCreated(savedGestion || gestion)'));
});
