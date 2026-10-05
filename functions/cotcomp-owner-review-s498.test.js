'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const S497=require('./cotcomp-clean-parent-s497');
const S498=require('./cotcomp-owner-review-s498');

test('S4.98 is an Owner-review wrapper around the clean source-only parent',()=>{
  assert.equal(S497.DEPLOYMENT_EXPORT,false);
  assert.equal(S498.AUTH.sourceParent,S497.VERSION);
  assert.equal(S498.AUTH.ownerReviewUrlAuthorized,true);
  assert.equal(S498.AUTH.internalManualVisualAuditPassed,true);
});

test('S4.98 preserves all production and real-transport denies',()=>{
  assert.equal(S498.AUTH.providerDeploymentAuthorized,false);
  assert.equal(S498.AUTH.cotcompRealTransportAuthorized,false);
  assert.equal(S498.AUTH.production,false);
  assert.equal(S498.AUTH.writes,false);
});

test('S4.98 owner review HTML is explicitly LAB-only and keeps governed vehicle catalog boundary',()=>{
  const h=S498.html();
  assert.match(h,/OWNER_REVIEW_LAB_ONLY/);
  assert.match(h,/ays-owner-review-authorized" content="true"/);
  assert.match(h,/cotcompVehicleCatalogS479/);
  assert.match(h,/Vista de revisión Owner en LAB/);
  assert.doesNotMatch(h,/Este artefacto no está autorizado para URL de Owner Review/);
  assert.match(h,/"providerDeploymentAuthorized":false/);
  assert.match(h,/"cotcompRealTransportAuthorized":false/);
  assert.match(h,/"production":false/);
});

test('S4.98 keeps the exact S4.97 product hierarchy and visual locks',()=>{
  const h=S498.html();
  for(const token of [
    'Cotiza y compara','con criterio','Lo que necesitas','Tus datos','Revisar opciones','Comparar y continuar',
    'Vehículo / Movilidad','Hogar','Salud / Gastos médicos','Vida / Ingreso','Empresa','Transporte / Carga','Otros / No sé cuál necesito',
    'Recomendación A&amp;S','data-vehicle-combo="brand"','data-vehicle-combo="model"'
  ]) assert.ok(h.includes(token),token);
  assert.match(h,/\.cc-hero\{height:390px;min-height:390px/);
  assert.match(h,/font-family:'Archivo';font-weight:900/);
});
