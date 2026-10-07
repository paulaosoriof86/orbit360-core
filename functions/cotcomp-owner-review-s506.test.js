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

test('S5.06 visible modal contains one synthetic registration control set',()=>{
  const h=s.html();
  assert.match(h,/id="s506Contact"/);
  assert.match(h,/Persona de prueba A&S/);
  assert.match(h,/synthetic@example\.invalid/);
  assert.match(h,/Autorizo a A&S a gestionar esta solicitud de prueba/);
  assert.equal((h.match(/<div class="s506-register-card" data-s506-card="advisor">/g)||[]).length,1);
  assert.equal((h.match(/<input id="s506Consent-advisor"[^>]*data-s506-consent="advisor"/g)||[]).length,1);
  assert.equal((h.match(/<button id="s506Register-advisor"[^>]*data-s506-register="advisor"/g)||[]).length,1);
});

test('S5.06 consent gate is explicit and initially disabled',()=>{
  const h=s.html();
  assert.match(h,/id="s506Register-advisor"[^>]*disabled="disabled"[^>]*aria-disabled="true"/);
  assert.match(h,/button:disabled\{opacity:\.48;cursor:not-allowed;pointer-events:none\}/);
});

test('S5.06 preserves WhatsApp and email fallbacks',()=>{
  const h=s.html();
  assert.match(h,/Continuar por WhatsApp/);
  assert.match(h,/Continuar por correo/);
  assert.match(h,/info@aysseguros\.com/);
  assert.match(h,/50256149048/);
  assert.match(h,/573138340897/);
});

test('S5.06 only accepts explicit country and need families',()=>{
  assert.equal(s.country('gt'),'GT');
  assert.equal(s.country('CO'),'CO');
  assert.equal(s.country('US'),'');
  assert.equal(s.family('vehicle'),'vehicle');
  assert.equal(s.family('other'),'other');
  assert.equal(s.family('unknown'),'');
});

test('S5.06 success copy remains conditional on integration confirmation',()=>{
  const h=s.html();
  assert.match(h,/integrationConfirmed!==true/);
  assert.match(h,/Integración confirmada: A&S recibió internamente la solicitud sintética/);
  assert.match(h,/No se pudo confirmar el registro interno/);
});

test('S5.06 routes Advisor and Continue-with-A&S through the same visible modal',()=>{
  const h=s.html();
  assert.match(h,/window\.addEventListener\('click'/);
  assert.match(h,/b\.classList\.contains\('cc-advisor'\)/);
  assert.match(h,/label\.startsWith\('Continuar con A&S'\)/);
  assert.match(h,/open\('advisor'\)/);
  assert.match(h,/open\('decision'\)/);
});

test('S5.06 keeps registration state once per session and skips duplicate consent on Continue',()=>{
  const h=s.html();
  assert.match(h,/let registrationConfirmed=false/);
  assert.match(h,/if\(handoffKind==='decision'&&registrationConfirmed\)\{showTerminal\(\);return;\}/);
  assert.match(h,/registrationConfirmed=true/);
  assert.match(h,/resetAdvisorRegistration\(\)/);
  assert.match(h,/showAdvisorRegistered\(\)/);
});

test('S5.06 terminal state uses acknowledgement instead of a second consent form',()=>{
  const h=s.html();
  assert.ok(!h.includes('<div class="s506-register-card" data-s506-card="terminal">'));
  assert.ok(!h.includes('<input id="s506Consent-terminal"'));
  assert.ok(!h.includes('<button id="s506Register-terminal"'));
  assert.match(h,/ensureTerminalAck\(\)/);
  assert.match(h,/Integración confirmada: A&S recibió internamente la solicitud sintética durante esta sesión/);
});

test('S5.06 terminal success preserves context and hides repeated primary actions',()=>{
  const h=s.html();
  assert.match(h,/countryEl\.textContent=x\.country/);
  assert.match(h,/needEl\.textContent=x\.need/);
  assert.match(h,/modeEl\.textContent='Con acompañamiento A&S'/);
  assert.match(h,/decision&&decision\.closest\('\.cc-actions'\)/);
  assert.match(h,/originalActions\.style\.display='none'/);
});
