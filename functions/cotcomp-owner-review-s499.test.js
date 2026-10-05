'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const S497=require('./cotcomp-clean-parent-s497');
const S499=require('./cotcomp-owner-review-s499');

test('S4.99 remains a LAB-only owner-delta wrapper over clean S4.97',()=>{
  assert.equal(S497.DEPLOYMENT_EXPORT,false);
  assert.equal(S499.AUTH.sourceParent,S497.VERSION);
  assert.equal(S499.AUTH.ownerReviewUrlAuthorized,true);
  assert.equal(S499.AUTH.production,false);
  assert.equal(S499.AUTH.writes,false);
  assert.equal(S499.AUTH.realAdvisorTransport,false);
});

test('S4.99 preserves provider/transport deny gates',()=>{
  assert.equal(S499.AUTH.providerDeploymentAuthorized,false);
  assert.equal(S499.AUTH.cotcompRealTransportAuthorized,false);
});

test('S4.99 enriches stages 2-4 without changing the four-stage journey',()=>{
  const h=S499.html();
  for(const token of ['Lo que necesitas','Tus datos','Revisar opciones','Comparar y continuar']) assert.ok(h.includes(token),token);
  assert.match(h,/data-s499-visual="data"/);
  assert.match(h,/data-s499-visual="review"/);
  assert.match(h,/data-s499-visual="compare"/);
  assert.match(h,/🧾/);
  assert.match(h,/🔎/);
  assert.match(h,/⚖️/);
  assert.match(h,/Recomendación A&amp;S/);
});

test('S4.99 attaches observable LAB-safe continuity to advisor and decision CTAs',()=>{
  const h=S499.html();
  assert.match(h,/id="s499Handoff"/);
  assert.match(h,/openHandoff\('advisor'\)/);
  assert.match(h,/openHandoff\('decision'\)/);
  assert.match(h,/Continuar con acompañamiento A&amp;S/);
  assert.match(h,/no se enviaron datos/i);
  assert.match(h,/"writes":false/);
  assert.match(h,/"realAdvisorTransport":false/);
});

test('S4.99 keeps vehicle catalog and visual authority boundaries',()=>{
  const h=S499.html();
  assert.match(h,/cotcompVehicleCatalogS479/);
  assert.match(h,/data-vehicle-combo="brand"/);
  assert.match(h,/data-vehicle-combo="model"/);
  assert.match(h,/font-family:'Archivo';font-weight:900/);
  assert.match(h,/OWNER_DELTA_REVIEW_LAB_ONLY/);
});
