'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const S501=require('./cotcomp-owner-review-s501');

test('S5.01 remains production-blocked and does not auto-notify',()=>{
  assert.equal(S501.AUTH.production,false);
  assert.equal(S501.AUTH.writes,false);
  assert.equal(S501.AUTH.providerDeploymentAuthorized,false);
  assert.equal(S501.AUTH.cotcompRealTransportAuthorized,false);
  assert.equal(S501.AUTH.automaticInternalNotification,false);
});

test('S5.01 uses verified country-aware public contact channels',()=>{
  assert.equal(S501.AUTH.publicContactChannels.gt.whatsapp,'50256149048');
  assert.equal(S501.AUTH.publicContactChannels.co.whatsapp,'573138340897');
  assert.equal(S501.AUTH.publicContactChannels.gt.email,'info@aysseguros.com');
  assert.equal(S501.AUTH.publicContactChannels.co.email,'info@aysseguros.com');
});

test('S5.01 simplifies hero and removes persistent fallback warning',()=>{
  const h=S501.html();
  assert.match(h,/\.cc-hero__benefits\{display:none!important\}/);
  assert.match(h,/\.cc-hero\{[\s\S]*height:360px/);
  assert.match(h,/\.cc-combo-fallback-link\{display:none!important\}/);
});

test('S5.01 advisor CTAs open real channel chooser',()=>{
  const h=S501.html();
  assert.match(h,/id="s501Contact"/);
  assert.match(h,/Continuar por WhatsApp/);
  assert.match(h,/Continuar por correo/);
  assert.match(h,/wa\.me/);
  assert.match(h,/mailto:/);
  assert.match(h,/Hablar con A&S sin empezar de cero/);
});

test('S5.01 terminal state offers WhatsApp and email actions',()=>{
  const h=S501.html();
  assert.match(h,/s501TerminalWa/);
  assert.match(h,/s501TerminalEmail/);
  assert.match(h,/Elige WhatsApp o correo para continuar con A&S/);
});

test('S5.01 preserves four-stage journey and no real writes',()=>{
  const h=S501.html();
  for(const token of ['Lo que necesitas','Tus datos','Revisar opciones','Comparar y continuar']) assert.ok(h.includes(token),token);
  assert.equal((h.match(/data-step="/g)||[]).length,4);
  assert.match(h,/"writes":false/);
});
