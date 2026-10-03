'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const s=require('./cotcomp-vehicle-dropdown-preview-s480');

test('S4.80 preview is LAB-only and points only to S4.79 catalog surface',()=>{
  assert.equal(s.PROJECT_ID,'ays-orbit-360-lab');
  assert.equal(s.CATALOG_PATH,'/cotcompVehicleCatalogS479');
  const h=s.html();
  assert.match(h,/Marca → Línea\/Modelo → Año/);
  assert.match(h,/cotcompVehicleCatalogS479/);
});

test('S4.80 renders dropdown controls and explicit no-persistence language',()=>{
  const h=s.html();
  assert.match(h,/id="brand"/);
  assert.match(h,/id="model"/);
  assert.match(h,/id="year"/);
  assert.match(h,/no guarda información/i);
  assert.match(h,/No se guardó ningún dato/i);
});

test('S4.80 contains no participant PII fields or quote submission action',()=>{
  const h=s.html();
  for(const forbidden of ['WhatsApp','Correo electrónico','requestManagement','Enviar solicitud de prueba']){
    assert.equal(h.includes(forbidden),false);
  }
  assert.doesNotMatch(h,/method:\s*['"]POST/i);
});

test('S4.80 preserves review fallback language for missing vehicle',()=>{
  const h=s.html();
  assert.match(h,/No encuentro mi vehículo/);
  assert.match(h,/revisión sin inventar una opción/i);
});

test('S4.80 rejects non-GET methods',()=>{
  const req={method:'POST'};
  const res={statusCode:200,headers:{},body:null,set(k,v){this.headers[k]=v;return this;},status(n){this.statusCode=n;return this;},send(v){this.body=v;return this;}};
  s.handler(req,res);
  assert.equal(res.statusCode,405);
});
