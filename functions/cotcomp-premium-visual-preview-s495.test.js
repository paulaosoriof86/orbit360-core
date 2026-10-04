'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const S=require('./cotcomp-premium-visual-preview-s495');
const S494=require('./cotcomp-premium-visual-preview-s494');

test('S4.95 is an additive refinement of S4.94, not a parallel frontend',()=>{
  assert.equal(S.PARENT_FUNCTION,'cotcompPremiumVisualPreviewS494');
  assert.equal(S.PARENT_VERSION,S494.VERSION);
  const h=S.html();
  assert.match(h,/data-s495-refinement="true"/);
  assert.match(h,/class="site-header"/);
  assert.match(h,/class="workspace"/);
  assert.match(h,/Cotiza y compara <em>con criterio<\/em>/);
  assert.match(h,/icon3d-vehicle/);
  assert.match(h,/Recomendación A&amp;S/);
  assert.doesNotMatch(h,/class="sidebar"/);
});

test('S4.95 pins the approved Priscila consultive source and exact derivative bytes',()=>{
  assert.equal(S.PRISCILA_SCENE_SOURCE_SHA,'5a5ea22a1da84f97e123b5a1142951867bcd65729babfef9425dccdf4a14b717');
  assert.equal(S.PRISCILA_SCENE_DERIVATIVE_SHA,'7fa88afd9031c66cca3e532bba2d9142eac8d3d4c22a445857156915dcc7afc9');
  const b64=[
    fs.readFileSync(path.join(__dirname,'cotcomp-s495-priscila-480x300.b64.00'),'utf8').trim(),
    fs.readFileSync(path.join(__dirname,'cotcomp-s495-priscila-480x300.b64.01'),'utf8').trim()
  ].join('');
  const bytes=Buffer.from(b64,'base64');
  assert.equal(bytes.length,20608);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),S.PRISCILA_SCENE_DERIVATIVE_SHA);
});

test('S4.95 corrects hero proportions and crop without replacing the S4.94 hero asset',()=>{
  const h=S.html();
  assert.match(h,/body\[data-s495-refinement="true"\] \.hero\{min-height:392px\}/);
  assert.match(h,/\.hero-media\{left:50%;right:0\}/);
  assert.match(h,/object-position:center 40%/);
  assert.match(h,/grid-template-columns:minmax\(0,620px\) 1fr/);
  assert.equal(S494.HERO_SHA,'a80c5458137e2914a6e8d43f8212ea1997ea5d8ba8d4a44136c36ef28cb927bd');
});

test('S4.95 uses the Priscila scene selectively for Other and assisted journeys',()=>{
  const h=S.html();
  assert.match(h,/routeId\(\)==='other'\|\|state\.mode==='assisted'/);
  assert.match(h,/s495-consultative-photo/);
  assert.match(h,/Orientación A&amp;S/);
  assert.match(h,/Descubre qué necesitas proteger/);
  assert.match(h,/Con acompañamiento/);
  assert.match(h,/Contexto preservado/);
});

test('S4.95 removes truncation pressure from route labels and important controls',()=>{
  const h=S.html();
  assert.match(h,/grid-template-columns:minmax\(0,1fr\) minmax\(0,1\.35fr\) minmax\(175px,\.95fr\) minmax\(150px,\.95fr\)/);
  assert.match(h,/Ruta con acompañamiento/);
  assert.match(h,/text-overflow:clip/);
  assert.match(h,/white-space:normal/);
  assert.match(h,/@media\(max-width:900px\)/);
  assert.match(h,/@media\(max-width:560px\)/);
});

test('S4.95 makes all required preview controls stateful instead of dead',()=>{
  const h=S.html();
  for(const token of [
    "e.target.closest('#onlineTab')",
    "e.target.closest('#assistTab')",
    "e.target.closest('.cta')",
    "e.target.closest('.scene-edit')",
    "e.target.closest('.details')",
    "e.target.closest('.compare-link')",
    "e.target.closest('.rec-btn')",
    "e.target.closest('.advisor,.wa')",
    "toggleAltDetail",
    "toggleComparison",
    "toggleRecommendation",
    "openAdvisorModal",
    "primaryAction"
  ]) assert.ok(h.includes(token),token);
  assert.match(h,/aria-expanded/);
  assert.match(h,/role="dialog"/);
  assert.match(h,/Esta candidata LAB no envía datos ni crea una solicitud real/);
});

test('S4.95 preserves typography minimums, seven families and vehicle Brand-Model-Year flow',()=>{
  const h=S.html();
  for(const label of ['Vehículo','Hogar','Salud','Vida','Empresa','Transporte','Otros']) assert.ok(h.includes(label),label);
  assert.match(h,/font-size:14\.5px/);
  assert.match(h,/font-size:11\.5px/);
  assert.match(h,/id="brandInput"/);
  assert.match(h,/id="modelInput"/);
  assert.match(h,/id="yearSel"/);
});

test('S4.95 preserves fail-closed provider and real-transport gates',()=>{
  const m=S.manifest();
  assert.equal(m.providerDeploymentAuthorized,false);
  assert.equal(m.cotcompRealTransportAuthorized,false);
  assert.equal(m.production,false);
  const src=fs.readFileSync(path.join(__dirname,'cotcomp-premium-visual-preview-s495.js'),'utf8').toUpperCase();
  for(const forbidden of ['GETFIRESTORE','FIREBASE-ADMIN','ONCALL','CALCULATEPREMIUM(','CALCULATETAX(','APPLYTARIFFRATE(','REQUESTMANAGEMENT']) assert.equal(src.includes(forbidden),false,forbidden);
});

test('S4.95 retains explicit LAB truth and rejects write-like methods',()=>{
  const h=S.html();
  assert.match(h,/Vista previa visual LAB/);
  assert.match(h,/Datos de alternativas y precios son ilustrativos; no constituyen oferta/);
  assert.match(h,/Gravicentra sigue siendo la autoridad/);
  const req={method:'POST'};
  const res={statusCode:200,headers:{},body:null,set(k,v){this.headers[k]=v;return this;},status(n){this.statusCode=n;return this;},send(v){this.body=v;return this;}};
  S.handler(req,res);
  assert.equal(res.statusCode,405);
});
