'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const S504=require('./cotcomp-owner-review-s504');

test('S5.04 remains LAB-only, no writes or auto notification',()=>{
  assert.equal(S504.AUTH.production,false);
  assert.equal(S504.AUTH.writes,false);
  assert.equal(S504.AUTH.automaticInternalNotification,false);
  assert.equal(S504.AUTH.requestManagementConsentRequired,true);
});

test('S5.04 contact modal captures name, WhatsApp/email and consent',()=>{
  const h=S504.html();
  for(const id of ['s504Name','s504Wa','s504Email','s504Consent','s504Error'])assert.ok(h.includes(id),id);
  assert.match(h,/Autorizo a A&S a usar estos datos/);
  assert.match(h,/Indica tu WhatsApp o tu correo/);
});

test('S5.04 real channels remain country-aware and user-confirmed',()=>{
  const h=S504.html();
  assert.match(h,/573138340897/);
  assert.match(h,/50256149048/);
  assert.match(h,/mailto:info@aysseguros\.com/);
  assert.match(h,/window\.open\('https:\/\/wa\.me\//);
});

test('S5.04 context derives active country and selected need before stage 2',()=>{
  const h=S504.html();
  assert.match(h,/\[data-country\]\.is-active/);
  assert.match(h,/\.cc-family\.is-selected strong/);
});

test('S5.04 terminal channel buttons cannot bypass contact/consent gate',()=>{
  const h=S504.html();
  assert.match(h,/s501TerminalWa/);
  assert.match(h,/s501TerminalEmail/);
  assert.match(h,/Completa tus datos para continuar por WhatsApp/);
  assert.match(h,/Completa tus datos para continuar por correo/);
});

test('S5.04 removes hero benefit markup and corrects title',()=>{
  const h=S504.html();
  assert.ok(!h.includes('<div class="cc-hero__benefits">'));
  assert.match(h,/Owner Review S5\.04/);
});
