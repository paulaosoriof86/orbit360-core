'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const S=require('./cotcomp-premium-visual-preview-s494');
const C=require('./cotcomp-gravicentra-provider-contract-s484');

test('S4.94 pins Owner visual, hero and high-resolution product-scene assets',()=>{
  assert.equal(S.OWNER_VISUAL_SHA,'3468546cb5d1c0cd7e2191980b306d462ea0b0304da0260167ec06c294aaa10e');
  assert.equal(S.HERO_SHA,'a80c5458137e2914a6e8d43f8212ea1997ea5d8ba8d4a44136c36ef28cb927bd');
  assert.equal(S.PRODUCT_SPRITE_SHA,'4209a06de9b030c0f81d5b004fbf995018f8b050418c22913daaf1f73ead4800');
  assert.ok(fs.statSync(path.join(__dirname,'cotcomp-s494-hero-authorized.b64')).size>90000);
  assert.ok(fs.statSync(path.join(__dirname,'cotcomp-s494-product-scenes.b64')).size>300000);
});

test('S4.94 restores the full photographic hero inside the A&S public shell',()=>{
  const h=S.html();
  assert.match(h,/class="site-header"/);
  assert.match(h,/class="hero"/);
  assert.match(h,/class="hero-media"/);
  assert.match(h,/Cotiza y compara/);
  assert.match(h,/con criterio/);
  assert.match(h,/Equipo A&amp;S en asesoría/);
  assert.match(h,/hero-media\{left:41%/);
  assert.doesNotMatch(h,/class="sidebar"/);
});

test('S4.94 uses product photography as the primary product visual',()=>{
  const h=S.html();
  assert.match(h,/const PRODUCT_SCENES=/);
  assert.match(h,/product-scene photo-scene/);
  assert.match(h,/background-size:400% 200%/);
  assert.match(h,/scene-copy/);
  assert.doesNotMatch(h,/generic-art/);
  assert.match(h,/visual-note,.handnote\{display:none!important\}/);
});

test('S4.94 preserves all seven product families and adds dimensional colored icon objects',()=>{
  const h=S.html();
  for(const label of ['Vehículo','Hogar','Salud','Vida','Empresa','Transporte','Otros']) assert.ok(h.includes(label),label);
  assert.match(h,/class="icon3d icon3d-/);
  for(const id of ['vehicle','home','health','life','business','cargo','other']) assert.match(h,new RegExp('icon3d-'+id));
  assert.match(h,/linear-gradient\(145deg,var\(--i1\),var\(--i2\)\)/);
  assert.match(h,/drop-shadow/);
});

test('S4.94 increases readability instead of compressing the approved composition',()=>{
  const h=S.html();
  assert.match(h,/\.hero p\{font-size:18px/);
  assert.match(h,/\.section-title\{font-size:18px/);
  assert.match(h,/\.family strong\{font-size:13px/);
  assert.match(h,/\.field input,\.field select\{font-size:14\.5px/);
  assert.match(h,/\.privacy\{font-size:12px/);
  assert.match(h,/\.checks\{font-size:11px/);
  assert.match(h,/\.rec p\{font-size:13px/);
});

test('S4.94 keeps the authorized vehicle data pattern and catalog-backed Toyota RAV4 example',()=>{
  const h=S.html();
  assert.match(h,/let brand='TOYOTA',model='RAV4 2WD',year='2023'/);
  assert.match(h,/id="brandInput"/);
  assert.match(h,/id="modelInput"/);
  assert.match(h,/id="yearSel"/);
  assert.match(h,/No encuentro mi marca/);
  assert.match(h,/No encuentro mi línea \/ modelo/);
});

test('S4.94 keeps comparison and A&S recommendation in the same approved workspace',()=>{
  const h=S.html();
  assert.match(h,/3\. Compara alternativas/);
  assert.match(h,/Aseguradora A/);
  assert.match(h,/Aseguradora B/);
  assert.match(h,/Aseguradora C/);
  assert.match(h,/Recomendación A&amp;S/);
  assert.match(h,/sin ranking silencioso/);
});

test('S4.94 keeps Gravicentra authority and transport fail-closed',()=>{
  const m=S.manifest();
  assert.equal(C.validateProviderManifest(m).ok,true);
  assert.equal(m.providerDeploymentAuthorized,false);
  assert.equal(m.cotcompRealTransportAuthorized,false);
  const src=fs.readFileSync(path.join(__dirname,'cotcomp-premium-visual-preview-s494.js'),'utf8').toUpperCase();
  for(const forbidden of ['GETFIRESTORE','FIREBASE-ADMIN','ONCALL','CALCULATEPREMIUM(','CALCULATETAX(','APPLYTARIFFRATE(','REQUESTMANAGEMENT']) assert.equal(src.includes(forbidden),false,forbidden);
});

test('S4.94 keeps preview asset truth explicit',()=>{
  const h=S.html();
  assert.match(h,/Vista previa visual LAB/);
  assert.match(h,/ilustrativos/);
  assert.match(h,/no constituyen oferta/);
  assert.match(h,/Gravicentra sigue siendo la autoridad/);
});

test('S4.94 is responsive and preserves the hero photograph on mobile',()=>{
  const h=S.html();
  assert.match(h,/@media\(max-width:1180px\)/);
  assert.match(h,/@media\(max-width:820px\)/);
  assert.match(h,/@media\(max-width:560px\)/);
  assert.match(h,/\.hero-media\{left:0;opacity:\.42\}/);
});

test('S4.94 rejects write-like methods',()=>{
  const req={method:'POST'};
  const res={statusCode:200,headers:{},body:null,set(k,v){this.headers[k]=v;return this;},status(n){this.statusCode=n;return this;},send(v){this.body=v;return this;}};
  S.handler(req,res);
  assert.equal(res.statusCode,405);
});
