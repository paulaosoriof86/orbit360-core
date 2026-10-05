'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const S=require('./cotcomp-owner-review-s505');

test('S5.05 is clean-parent based and LAB-only',()=>{
 assert.match(S.AUTH.cleanParent,/s497-clean-parent/);
 assert.equal(S.AUTH.production,false);
 assert.equal(S.AUTH.writes,false);
 assert.equal(S.AUTH.automaticInternalNotification,false);
});

test('S5.05 has one coherent contact modal with fields and real channels',()=>{
 const h=S.html();
 for(const id of ['s505Contact','s505Name','s505Wa','s505Email','s505Consent','s505WhatsApp','s505EmailBtn']) assert.ok(h.includes(id),id);
 assert.ok(!h.includes('s499Handoff'));
 assert.ok(!h.includes('s501Contact'));
 assert.match(h,/50256149048/);
 assert.match(h,/573138340897/);
 assert.match(h,/mailto:info@aysseguros\.com/);
});

test('S5.05 removes hero benefits and persistent fallback link',()=>{
 const h=S.html();
 assert.ok(!h.includes('<div class="cc-hero__benefits">'));
 assert.match(h,/\.cc-combo-fallback-link\{display:none!important\}/);
});

test('S5.05 preserves four stages and visual enrichment',()=>{
 const h=S.html();
 assert.equal((h.match(/data-step="/g)||[]).length,4);
 for(const token of ['Lo que necesitas','Tus datos','Revisar opciones','Comparar y continuar'])assert.ok(h.includes(token));
 for(const token of ['🧾','🔎','⚖️'])assert.ok(h.includes(token));
});

test('S5.05 fixes brand selection close and no visible technical LAB copy',()=>{
 const h=S.html();
 assert.ok(!h.includes('await loadModels();renderModels();modelInput.focus();'));
 assert.ok(h.includes('await loadModels();close(brandList,brandInput);close(modelList,modelInput);'));
 assert.ok(!h.includes('catálogo vehicular LAB'));
 assert.ok(!h.includes('plantilla visual source-only'));
 assert.ok(!h.includes('class="cc-lab"'));
});

test('S5.05 contact context derives active country and selected family',()=>{
 const h=S.html();
 assert.match(h,/\[data-country\]\.is-active/);
 assert.match(h,/\.cc-family\.is-selected strong/);
});

test('S5.05 decision CTA opens contact gate and completion copy does not claim receipt',()=>{
 const h=S.html();
 assert.match(h,/b\.id==='decisionBtn'/);
 assert.match(h,/Tu continuidad con A&S está preparada/);
 assert.match(h,/Para que A&S reciba tu mensaje debes confirmar el envío/);
 assert.ok(!h.includes('A&S fue notificado'));
});
