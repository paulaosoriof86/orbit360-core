'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const ciclo=()=>fs.readFileSync(path.join(__dirname,'..','orbit360-platform','core','ciclo.js'),'utf8');

test('S5.10 lead card exposes product, origin, risk, contact availability, stage and advisor summary',()=>{
  const src=ciclo();
  assert.match(src,/function leadRiskSummary/);
  assert.match(src,/function leadContactSummary/);
  assert.match(src,/function leadOrigin/);
  assert.match(src,/Producto \/ familia/);
  assert.match(src,/Canal de ingreso/);
  assert.match(src,/Resumen del riesgo/);
  assert.match(src,/Datos de contacto disponibles/);
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
