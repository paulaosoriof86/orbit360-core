'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const test=require('node:test'),assert=require('node:assert/strict');
// Exact excerpt read from GitHub blob 356d36e0679a5e499c05632a981b9ef3f1ffb9ec.
// This diagnoses projection only, not server persistence or deployed identity.
const text=fs.readFileSync(path.join(__dirname,'../evidence/scoped-directory-projection-original.js'),'utf8');
function projectFrom(src){const ctx=vm.createContext({Denied:Error});vm.runInContext(src+'\nthis.project=viewDirectory;',ctx);return (...a)=>JSON.parse(JSON.stringify(ctx.project(...a)));}
const original=projectFrom(text);
const fixed=projectFrom(text.replace("  facturacion:['razonSocial'", "  actividad:['fecha','cambio','responsable','motivo','camposCambiados'],\n  facturacion:['razonSocial'"));
const sample={id:'b4003qa_only',tenantId:'qa-tenant',pais:'GT',nombre:'QA',observaciones:'Restaurado',
 actividad:[{fecha:'2026-10-29T20:00:00Z',cambio:'Actualización de ficha (observaciones)',responsable:'QA · Dirección',motivo:'QA restore',camposCambiados:['observaciones']}],
 docs:[{id:'doc1'},{id:'doc2'}]};
test('current protected projection drops existing actividad',()=>{const row=original('aseguradoras',sample,sample.id,'GT','qa-tenant');assert.equal(Object.hasOwn(row,'actividad'),false);assert.equal(row.docs.length,2);assert.equal(row.observaciones,'Restaurado');});
test('proposed projection preserves only safe activity fields',()=>{const row=fixed('aseguradoras',sample,sample.id,'GT','qa-tenant');assert.deepEqual(row.actividad,sample.actividad);});
test('proposed projection excludes nested before/after, passwords and metadata',()=>{const row=structuredClone(sample);Object.assign(row.actividad[0],{antes:{password:'SYNTHETIC'},despues:{token:'SYNTHETIC'},password:'SYNTHETIC',privateKey:'SYNTHETIC',snapshot:{anything:1}});const out=fixed('aseguradoras',row,row.id,'GT','qa-tenant');assert.deepEqual(out.actividad,sample.actividad);});
test('advisor projection is unchanged and does not expose activity',()=>{assert.deepEqual(fixed('asesores',sample,sample.id,'GT','qa-tenant'),original('asesores',sample,sample.id,'GT','qa-tenant'));});
test('canonical tenant/country/id overwrite contradictory input aliases',()=>{const out=fixed('aseguradoras',{...sample,id:'other',pais:'CO',tenantId:'other'},sample.id,'GT','qa-tenant');assert.equal(out.id,sample.id);assert.equal(out.pais,'GT');assert.equal(out.tenantId,'qa-tenant');});
test('absence of activity remains absence rather than fabricated events',()=>{const row={...sample};delete row.actividad;assert.equal(Object.hasOwn(fixed('aseguradoras',row,row.id,'GT','qa-tenant'),'actividad'),false);});
test('current writer input built from projection can overwrite stored history with one event',()=>{const projected=original('aseguradoras',sample,sample.id,'GT','qa-tenant');const history=(projected.actividad||[]).slice();history.unshift({cambio:'New QA edit'});assert.equal(history.length,1);assert.equal(sample.actividad.length,1);assert.notDeepEqual(history,sample.actividad);});
