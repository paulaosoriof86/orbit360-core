'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const S=require('./cotcomp-authorized-fidelity-preview-s493');
const C=require('./cotcomp-gravicentra-provider-contract-s484');

test('S4.93 pins the exact Owner-authorized visual reference',()=>{
  assert.equal(S.OWNER_VISUAL_SHA,'3468546cb5d1c0cd7e2191980b306d462ea0b0304da0260167ec06c294aaa10e');
});

test('S4.93 stays inside the current A&S public-site shell',()=>{
  const h=S.html();
  assert.match(h,/class="site-header"/);
  assert.match(h,/Alianzas &amp; Soluciones · Broker de Seguros/);
  for(const item of ['Empresas','Personas y familias','Cotizar y comparar','Siniestros y asistencia','Recursos','Sobre A&amp;S']){
    assert.ok(h.includes(item),item);
  }
  assert.match(h,/Guatemala/);
  assert.match(h,/Colombia/);
  assert.match(h,/Hablar con un asesor/);
  assert.doesNotMatch(h,/class="sidebar"/);
});

test('S4.93 restores the authorized dark human advisory hero and headline',()=>{
  const h=S.html();
  assert.match(h,/class="hero"/);
  assert.match(h,/class="hero-photo" src="data:image\/webp;base64,/);
  assert.match(h,/alt="Equipo A&amp;S en asesoría"/);
  assert.match(h,/Cotiza y compara <em>con criterio<\/em>/);
  assert.match(h,/Compara coberturas, beneficios y condiciones/);
  assert.match(h,/Compara<br>opciones reales/);
  assert.match(h,/Evalúa beneficios<br>con claridad/);
  assert.match(h,/Decide con<br>asesoría experta/);
});

test('S4.93 reproduces the authorized floating CotComp workspace composition',()=>{
  const h=S.html();
  assert.match(h,/class="workspace"/);
  assert.match(h,/Cotización en línea/);
  assert.match(h,/Con acompañamiento/);
  for(const stage of ['Información','Coberturas','Comparar','Decidir']) assert.ok(h.includes(stage),stage);
  assert.match(h,/1\. Selecciona el tipo de seguro/);
  assert.match(h,/3\. Compara alternativas/);
  assert.match(h,/Recomendación A&amp;S/);
});

test('S4.93 contains the seven frozen public product families',()=>{
  const h=S.html();
  for(const label of ['Vehículo','Hogar','Salud','Gastos médicos','Vida','Ingreso','Empresa','Transporte','Carga','Otros','No sé cuál necesito']){
    assert.ok(h.includes(label),label);
  }
  assert.equal(S.routes().length,7);
});

test('S4.93 makes the quote-area visual product-aware',()=>{
  const h=S.html();
  assert.match(h,/function renderVisual\(\)/);
  for(const id of ['vehicle','home','health','life','business','cargo','other']){
    assert.match(h,new RegExp(id+":\\{"));
  }
  assert.match(h,/product-scene photo-scene/);
  assert.match(h,/data:image\/webp;base64/);
});

test('S4.93 initializes the visual example to the catalog-backed Toyota RAV4 reference',()=>{
  const h=S.html();
  assert.match(h,/let brand='TOYOTA',model='RAV4 2WD',year='2023'/);
  assert.match(h,/norm\(x\.label\)===norm\(brand\)/);
  assert.match(h,/startsWith\(norm\('RAV4'\)\)/);
});

test('S4.93 preserves searchable Marca -> dependent Línea/modelo -> separate Año plus assisted fallback',()=>{
  const h=S.html();
  assert.match(h,/Marca/);
  assert.match(h,/Línea \/ modelo/);
  assert.match(h,/Año/);
  assert.match(h,/id="brandInput" role="combobox"/);
  assert.match(h,/id="modelInput" role="combobox"/);
  assert.match(h,/id="yearSel"/);
  assert.match(h,/No encuentro mi marca/);
  assert.match(h,/No encuentro mi línea \/ modelo/);
  assert.match(h,/cotcompVehicleCatalogS479/);
  assert.match(h,/getCatalog\('brands'/);
  assert.match(h,/getCatalog\('models'/);
  assert.match(h,/getCatalog\('years'/);
});

test('S4.93 comparison and recommendation are visibly present but truthfully illustrative',()=>{
  const h=S.html();
  assert.match(h,/Aseguradora A/);
  assert.match(h,/Aseguradora B/);
  assert.match(h,/Aseguradora C/);
  assert.match(h,/Alternativa B/);
  assert.match(h,/ilustrativo/);
  assert.match(h,/no constituyen oferta/);
  assert.match(h,/Gravicentra sigue siendo la autoridad/);
});

test('S4.93 keeps Gravicentra provider contract and transport gates unchanged',()=>{
  const m=S.manifest();
  assert.equal(C.validateProviderManifest(m).ok,true);
  assert.equal(m.providerContractVersion,'gravicentra-quote-authority-v1');
  assert.equal(m.providerDeploymentAuthorized,false);
  assert.equal(m.cotcompRealTransportAuthorized,false);
});

test('S4.93 contains no local rating engine, persistence or direct provider runtime',()=>{
  const src=fs.readFileSync(path.join(__dirname,'cotcomp-owner-authorized-comparative-preview-s492.js'),'utf8').toUpperCase();
  for(const forbidden of [
    'GETFIRESTORE','FIREBASE-ADMIN','ONCALL',
    'CALCULATEPREMIUM(','CALCULATETAX(','APPLYTARIFFRATE(',
    'REQUESTMANAGEMENT','PROVIDER/RATER'
  ]) assert.equal(src.includes(forbidden),false,forbidden);
});

test('S4.93 HTML is structurally renderable and responsive',()=>{
  const h=S.html();
  assert.ok(h.indexOf('</style>')<h.indexOf('<body>'));
  assert.ok(h.indexOf('<body>')<h.indexOf('<section class="hero">'));
  assert.equal((h.match(/<style>/g)||[]).length,1);
  assert.equal((h.match(/<\/style>/g)||[]).length,1);
  assert.match(h,/@media\(max-width:1180px\)/);
  assert.match(h,/@media\(max-width:560px\)/);
});

test('S4.93 rejects write-like HTTP methods',()=>{
  const req={method:'POST'};
  const res={statusCode:200,headers:{},body:null,set(k,v){this.headers[k]=v;return this;},status(n){this.statusCode=n;return this;},send(v){this.body=v;return this;}};
  S.handler(req,res);
  assert.equal(res.statusCode,405);
});


test('S4.93 preserves visible editorial hero and forces top review state',()=>{
  const h=S.html();
  assert.match(h,/<section class="hero">/);
  assert.match(h,/hero-photo/);
  assert.match(h,/Cotiza y compara <em>con criterio<\/em>/);
  assert.match(h,/scrollRestoration/);
  assert.match(h,/window\.scrollTo\(\{top:0,left:0,behavior:'auto'\}\)/);
});

test('S4.93 uses photographic product-specific scenes for all seven families',()=>{
  const h=S.html();
  assert.match(h,/const PRODUCT_SCENES=/);
  for(const id of ['vehicle','home','health','life','business','cargo','other']) {
    assert.match(h,new RegExp(id+":\\{x:"));
  }
  assert.match(h,/photo-scene/);
  assert.match(h,/PRODUCT_SPRITE_SRC/);
  assert.doesNotMatch(h,/genericIcon\(route\.id\)/);
  assert.doesNotMatch(h,/class="generic-art"/);
});

test('S4.93 preserves A&S typography and raises microcopy readability',()=>{
  const h=S.html();
  for(const font of ['Archivo','IBM Plex Mono','Newsreader','Instrument Sans']) assert.ok(h.includes(font),font);
  assert.match(h,/\.family\{font-size:11\.5px/);
  assert.match(h,/\.field label\{font-size:10\.5px/);
  assert.match(h,/\.privacy\{font-size:11\.5px/);
  assert.match(h,/\.rec p\{font-size:12\.5px/);
  assert.doesNotMatch(h,/font-size:8px;color:#888/);
});

test('S4.93 product sprite chunks resolve to a WebP data URI',()=>{
  assert.equal(S.PRODUCT_SPRITE_SHA,'b199c128f08a54899805c61e7d126a56c11a75537b056cdb5b17faf2e3657e1a');
  const h=S.html();
  assert.match(h,/data:image\/webp;base64,UklGR/);
});
