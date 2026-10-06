'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const s=require('./cotcomp-owner-review-s506');

test('S5.06 is LAB-only and uses S5.05 inbound adapter',()=>{
  assert.equal(s.PROJECT_ID,'ays-orbit-360-lab');
  assert.equal(s.TENANT_ID,'alianzas-soluciones');
  assert.equal(s.FUNCTION_NAME,'cotcompOwnerReviewS506');
  assert.match(s.INBOUND_URL,/cotcompPublicInboundS505$/);
});

test('S5.06 UI includes minimum consent and synthetic-safe contact preview',()=>{
  const h=s.html();
  assert.match(h,/Registrar solicitud de prueba en A&S/);
  assert.match(h,/synthetic@example\.invalid/);
  assert.match(h,/Autorizo a A&S a gestionar esta solicitud de prueba/);
  assert.match(h,/data-s506-register="advisor"/);
  assert.match(h,/data-s506-register="terminal"/);
});

test('S5.06 preserves WhatsApp and email fallbacks',()=>{
  const h=s.html();
  assert.match(h,/Continuar por WhatsApp/);
  assert.match(h,/Continuar por correo/);
  assert.match(h,/info@aysseguros\.com/);
});

test('S5.06 only accepts explicit country and need families',()=>{
  assert.equal(s.country('gt'),'GT');
  assert.equal(s.country('CO'),'CO');
  assert.equal(s.country('US'),'');
  assert.equal(s.family('vehicle'),'vehicle');
  assert.equal(s.family('other'),'other');
  assert.equal(s.family('unknown'),'');
});

test('S5.06 user success copy is conditional on integration confirmation',()=>{
  const h=s.html();
  assert.match(h,/integrationConfirmed!==true/);
  assert.match(h,/Integración confirmada: A&S recibió internamente la solicitud sintética/);
  assert.match(h,/No se pudo confirmar el registro interno/);
});
