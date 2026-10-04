'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const S=require('./cotcomp-premium-journey-preview-s496');
const S495=require('./cotcomp-premium-visual-preview-s495');

test('S4.96 extends S4.95 under the new governance lock',()=>{
  assert.equal(S.PARENT_FUNCTION,'cotcompPremiumVisualPreviewS495');
  assert.equal(S.PARENT_VERSION,S495.VERSION);
  const h=S.html();
  assert.match(h,/data-s496="true"/);
  assert.match(h,/S496_LOCKED/);
  assert.match(h,/class="workspace"/);
});

test('S4.96 restores canonical hero typography and layout',()=>{
  const h=S.html();
  assert.match(h,/hero h1\{font-family:'Archivo'/);
  assert.match(h,/hero-media\{left:auto;right:34px/);
  assert.match(h,/object-position:center 43%/);
});

test('S4.96 restores the canonical four-stage journey',()=>{
  const h=S.html();
  for(const token of ['Lo que necesitas','Tus datos','Revisar opciones','Comparar y continuar']) assert.ok(h.includes(token));
  assert.match(h,/function setStage/);
  assert.match(h,/s496-back/);
  assert.match(h,/s496-next/);
});

test('S4.96 restores deep intake requirements',()=>{
  const h=S.html();
  for(const token of [
    'Tipo de vehículo','Uso','Marca','Línea / modelo','Valor aproximado',
    'Conductor joven / condición aplicable','Equipo especial','Cómo prefieres pagar',
    'Fecha de nacimiento del titular','Cantidad de hijos / dependientes',
    'Tipo de inmueble','Ingreso mensual a proteger','Sector / actividad',
    'Rol en la cadena','Movimiento anual estimado','Un contrato / proyecto',
    'Revisar una póliza existente'
  ]) assert.ok(h.includes(token),token);
});

test('S4.96 preserves vehicle catalog search and fallbacks',()=>{
  const h=S.html();
  assert.match(h,/id="s496Brand"/);
  assert.match(h,/id="s496Model"/);
  assert.match(h,/No encuentro mi marca/);
  assert.match(h,/No encuentro mi línea \/ modelo/);
  assert.match(h,/getCatalog\('brands'/);
  assert.match(h,/getCatalog\('models'/);
});

test('S4.96 preserves fail-closed release gates',()=>{
  const m=S.manifest();
  assert.equal(m.providerDeploymentAuthorized,false);
  assert.equal(m.cotcompRealTransportAuthorized,false);
  assert.equal(m.production,false);
});

test('S4.96 rejects non-GET requests',()=>{
  const req={method:'POST'};
  const res={statusCode:200,headers:{},body:null,set(k,v){this.headers[k]=v;return this;},status(n){this.statusCode=n;return this;},send(v){this.body=v;return this;}};
  S.handler(req,res);
  assert.equal(res.statusCode,405);
});
