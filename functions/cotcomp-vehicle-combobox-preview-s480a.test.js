'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const s=require('./cotcomp-vehicle-combobox-preview-s480a');

test('S4.80A is a LAB-only zero-persistence preview',()=>{
  assert.equal(s.PROJECT_ID,'ays-orbit-360-lab');
  assert.equal(s.CATALOG_PATH,'/cotcompVehicleCatalogS479');
  const h=s.html();
  assert.match(h,/no guarda información/i);
  assert.doesNotMatch(h,/WhatsApp|Correo electrónico|requestManagement|Enviar solicitud/i);
});

test('S4.80A uses one combobox control per brand and model task',()=>{
  const h=s.html();
  assert.match(h,/id="brandInput"[^>]*role="combobox"/);
  assert.match(h,/id="brandList"[^>]*role="listbox"/);
  assert.match(h,/id="modelInput"[^>]*role="combobox"/);
  assert.match(h,/id="modelList"[^>]*role="listbox"/);
  assert.doesNotMatch(h,/Buscar marca<\/label>/);
  assert.doesNotMatch(h,/Buscar línea \/ modelo<\/label>/);
});

test('S4.80A supports keyboard combobox behavior and review fallback',()=>{
  const h=s.html();
  assert.match(h,/ArrowDown/);
  assert.match(h,/ArrowUp/);
  assert.match(h,/Enter/);
  assert.match(h,/Escape/);
  assert.match(h,/No encuentro mi marca/);
  assert.match(h,/No encuentro mi línea \/ modelo/);
  assert.match(h,/revisión asistida/);
});

test('S4.80A keeps year separate',()=>{
  const h=s.html();
  assert.match(h,/id="year"/);
  assert.match(h,/El año se mantiene separado/);
});

test('S4.80A rejects write-like HTTP methods',()=>{
  const req={method:'POST'};
  const res={statusCode:200,headers:{},body:null,set(k,v){this.headers[k]=v;return this;},status(n){this.statusCode=n;return this;},send(v){this.body=v;return this;}};
  s.handler(req,res);
  assert.equal(res.statusCode,405);
});
