'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const ciclo=()=>fs.readFileSync(path.join(__dirname,'..','orbit360-platform','core','ciclo.js'),'utf8');

test('S5.10 lead card preserves product, origin, risk, contact, stage, premium and advisor information',()=>{
  const src=ciclo();
  assert.match(src,/function leadRiskSummary/);
  assert.match(src,/function leadContactSummary/);
  assert.match(src,/function leadOrigin/);
  assert.match(src,/const product = U\.text\(n\.producto \|\| n\.ramo/);
  assert.match(src,/Origen y país/);
  assert.match(src,/Resumen del riesgo/);
  assert.match(src,/Datos de contacto disponibles/);
  assert.match(src,/Estado comercial/);
  assert.match(src,/Asesor responsable/);
  assert.match(src,/Prima por definir/);
});

test('S5.10 does not fabricate an insurer when no insurer was selected',()=>{
  const src=ciclo();
  assert.match(src,/— Sin aseguradora seleccionada —/);
  assert.match(src,/\[\['', '— Sin aseguradora seleccionada —'\]\]\.concat\(asgs\.map/);
});

test('S5.10 full lead editor still preserves catalog-backed product and ramo controls',()=>{
  const src=ciclo();
  assert.match(src,/fSelectCat\('Producto', 'ng-prod', 'productos'/);
  assert.match(src,/fSelectCat\('Ramo', 'ng-ramo', 'ramos'/);
});


test('S5.10a visual hierarchy prioritizes prospect -> product -> risk -> contact -> commercial state',()=>{
  const src=ciclo();
  const block=src.slice(src.indexOf('function cardNegocio'),src.indexOf('function cardGestion'));
  const prospect=block.indexOf('class="kcard-t"');
  const product=block.indexOf('class="kcard-cli"');
  const risk=block.indexOf('Resumen del riesgo');
  const contact=block.indexOf('Datos de contacto disponibles');
  const state=block.indexOf('Estado comercial');
  assert.ok(prospect>=0&&product>prospect&&risk>product&&contact>risk&&state>contact);
  assert.match(block,/Origen y país/);
  assert.match(block,/Sin próximo toque/);
  assert.doesNotMatch(block,/badge neutral" title="Producto \/ familia"/);
  assert.doesNotMatch(block,/badge info" title="Canal de ingreso"/);
});

test('S5.10a risk summary removes redundant vehicle prefix from the card',()=>{
  const src=ciclo();
  assert.match(src,/replace\(\/\^\(veh\[ií\]culo\|auto\|moto\)/);
});
