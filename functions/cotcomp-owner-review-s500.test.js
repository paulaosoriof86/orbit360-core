'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const S500=require('./cotcomp-owner-review-s500');

test('S5.00 remains LAB-safe and production blocked',()=>{
  assert.equal(S500.AUTH.ownerReviewUrlAuthorized,true);
  assert.equal(S500.AUTH.production,false);
  assert.equal(S500.AUTH.writes,false);
  assert.equal(S500.AUTH.providerDeploymentAuthorized,false);
  assert.equal(S500.AUTH.cotcompRealTransportAuthorized,false);
  assert.equal(S500.AUTH.realAdvisorTransport,false);
  assert.equal(S500.AUTH.realQuoteTransport,false);
});

test('S5.00 keeps exactly four journey stages',()=>{
  const h=S500.html();
  for(const token of ['Lo que necesitas','Tus datos','Revisar opciones','Comparar y continuar']) assert.ok(h.includes(token),token);
  assert.equal((h.match(/data-step="/g)||[]).length,4);
});

test('S5.00 removes owner-visible technical LAB/source-only copy called out by Owner',()=>{
  const h=S500.html();
  assert.ok(!h.includes('catálogo vehicular LAB'));
  assert.ok(!h.includes('plantilla visual source-only'));
  assert.ok(!h.includes('SOURCE-ONLY LAB · No constituye'));
  assert.ok(h.includes('En uso real, aquí aparecerán únicamente las alternativas validadas para tu caso.'));
});

test('S5.00 redesigns mode selector and hero without changing journey semantics',()=>{
  const h=S500.html();
  assert.match(h,/S5\.00 owner consolidated UX delta/);
  assert.match(h,/cc-mode\[data-mode="online"\]::before/);
  assert.match(h,/cc-mode\[data-mode="assisted"\]::before/);
  assert.match(h,/\.cc-hero\{\s*height:330px/);
});

test('S5.00 fixes vehicle combobox close behavior',()=>{
  const h=S500.html();
  assert.match(h,/Robust close after a vehicle brand\/model option is selected/);
  assert.match(h,/querySelectorAll\('\.cc-combo-list'\)/);
  assert.match(h,/aria-expanded','false'/);
});

test('S5.00 final continuity produces a terminal state instead of looping to same CTA',()=>{
  const h=S500.html();
  assert.match(h,/id='\+?'?s500Completion|s500Completion/);
  assert.match(h,/Tu continuidad con A&S está preparada/);
  assert.match(h,/¿Qué sigue en la versión conectada\?/);
  assert.match(h,/showCompletion\(\)/);
  assert.match(h,/Continuar con A&S sin perder el contexto/);
});
