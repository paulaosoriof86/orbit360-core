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


test('S5.06 visible advisor/decision modal contains synthetic registration and direct channels',()=>{
  const h=s.html();
  assert.match(h,/id="s506Contact"/);
  assert.match(h,/id="s506ContactTitle"/);
  assert.match(h,/data-s506-card="advisor"/);
  assert.match(h,/data-s506-register="advisor"/);
  assert.match(h,/id="s506WhatsApp"/);
  assert.match(h,/id="s506Email"/);
  assert.match(h,/window\.addEventListener\('click'/);
  assert.match(h,/label\.startsWith\('Continuar con A&S'\)/);
});

test('S5.06 suppresses inherited hidden continuity modals from the Owner surface',()=>{
  const h=s.html();
  assert.match(h,/#s499Handoff,#s501Contact\{display:none!important\}/);
});


test('S5.06 consent gate is explicit in rendered HTML',()=>{
  const h=s.html();
  assert.match(h,/data-s506-register="advisor" disabled="disabled" aria-disabled="true"/);
  assert.match(h,/data-s506-consent="advisor"/);
  assert.match(h,/data-s506-register="terminal" disabled="disabled" aria-disabled="true"/);
});

test('S5.06 visible modal and terminal expose success/error states and direct channels',()=>{
  const h=s.html();
  assert.match(h,/id="s506Contact"/);
  assert.match(h,/Persona de prueba A&S/);
  assert.match(h,/synthetic@example\.invalid/);
  assert.match(h,/Integración confirmada: A&S recibió internamente la solicitud sintética/);
  assert.match(h,/No se pudo confirmar el registro interno/);
  assert.match(h,/Continuar por WhatsApp/);
  assert.match(h,/Continuar por correo/);
  assert.match(h,/showTerminal/);
});


test('S5.06 renders a single advisor registration control set',()=>{
  const h=s.html();
  assert.equal((h.match(/data-s506-card="advisor"/g)||[]).length,1);
  assert.equal((h.match(/data-s506-consent="advisor"/g)||[]).length,1);
  assert.equal((h.match(/data-s506-register="advisor"/g)||[]).length,1);
});


test('S5.06 terminal success preserves context and hides repeated primary actions',()=>{
  const h=s.html();
  assert.match(h,/const x=ctx\(\);/);
  assert.match(h,/id='s500Country'|id="s500Country"/);
  assert.match(h,/countryEl\.textContent=x\.country/);
  assert.match(h,/needEl\.textContent=x\.need/);
  assert.match(h,/modeEl\.textContent='Con acompañamiento A&S'/);
  assert.match(h,/decision&&decision\.closest\('\.cc-actions'\)/);
  assert.match(h,/originalActions\.style\.display='none'/);
});
