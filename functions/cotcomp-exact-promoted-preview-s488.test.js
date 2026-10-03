'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const S=require('./cotcomp-exact-promoted-preview-s488');

test('S4.88 pins exact promoted visual authority hashes',()=>{
  assert.equal(S.PROMOTED_VISUAL_PARENT_SHA,'50aa4190ae22ad13760f893b9bf37415abe35fb7327e034f66dc565b9b2cbf1d');
  assert.equal(S.PROMOTED_COTCOMP_SECTION_SHA,'b97c01a27ac1ee6c16236b6582f0a411287ba3f88f960fca7278b37c35fbf8ed');
  assert.equal(S.PROMOTED_COTCOMP_CSS_SHA,'bc0fe9e165c9a2007b6970e9d79157239fb252457895d2957e96b7ae53780dbf');
});

test('S4.88 restores the exact approved CotComp chrome and wording signatures',()=>{
  const h=S.html();
  assert.match(h,/COTIZAR Y COMPARAR · GUATEMALA/);
  assert.match(h,/Compara con criterio, no solo por precio\./);
  assert.match(h,/cotizador\.aysseguros\.com · espacio de trabajo/);
  assert.match(h,/SESIÓN DE COTIZACIÓN/);
  assert.match(h,/Comparamos solo alternativas normalizadas\. Lo que no se puede normalizar sale del comparador y pasa a un asesor\./);
});

test('S4.88 restores 4 rail phases and the original 8-stage auto flow',()=>{
  const h=S.html();
  for(const x of ['Producto y contexto','Datos mínimos','Alternativas normalizadas','Decisión acompañada']) assert.ok(h.includes(x),x);
  for(const x of ['Necesidad','Elegibilidad','Datos','Consultando mercado','Propuestas','Validación','Comparar','Recomendación']) assert.ok(h.includes(x),x);
  assert.doesNotMatch(h,/Necesidad[\s\S]*Elegibilidad[\s\S]*Datos[\s\S]*Alternativas[\s\S]*Comparar[\s\S]*Elegir[\s\S]*Continuar/);
});

test('S4.88 restores approved white/beige online tabs instead of S4.87 black active-tab reinterpretation',()=>{
  const h=S.html();
  assert.match(h,/id="autoTab"[^>]*background:#fff;color:#12110F/);
  assert.match(h,/id="hibTab"[^>]*background:#EDE8DE;color:#5E594F/);
  assert.doesNotMatch(h,/class="tab active"/);
});

test('S4.88 restores approved inline product controls, not large cards',()=>{
  const h=S.html();
  assert.match(h,/display:inline-flex;align-items:center;gap:8px;min-height:46px;padding:0 18px;border-radius:12px/);
  assert.doesNotMatch(h,/class="route"/);
  assert.doesNotMatch(h,/route-grid/);
});

test('S4.88 preserves original common products and extends completeness inside the same approved control',()=>{
  const h=S.html();
  for(const x of ['Auto','Hogar','Vida','Salud / gastos médicos','Empresa','Transporte / carga','Otros / no sé cuál necesito']) assert.ok(h.includes(x),x);
});

test('S4.88 preserves Marca -> Línea/modelo -> Año and explicit unknown fallback',()=>{
  const h=S.html();
  assert.match(h,/id="brandInput"/);
  assert.match(h,/id="modelInput"/);
  assert.match(h,/id="yearSelect"/);
  assert.match(h,/No encuentro mi marca/);
  assert.match(h,/No encuentro mi línea \/ modelo/);
});

test('S4.88 keeps real transport and production out of the recovery preview',()=>{
  const m=S.fixtureManifest();
  assert.equal(m.providerDeploymentAuthorized,false);
  assert.equal(m.cotcompRealTransportAuthorized,false);
  const src=fs.readFileSync(path.join(__dirname,'cotcomp-exact-promoted-preview-s488.js'),'utf8').toUpperCase();
  for(const forbidden of ['GETFIRESTORE','FIREBASE-ADMIN','ONCALL','CALCULATEPREMIUM(','CALCULATETAX(','APPLYTARIFFRATE(']) assert.equal(src.includes(forbidden),false,forbidden);
});

test('S4.88 HTML is structurally renderable',()=>{
  const h=S.html();
  assert.ok(h.indexOf('</style>')<h.indexOf('<body>'));
  assert.ok(h.indexOf('<body>')<h.indexOf('Compara con criterio, no solo por precio.'));
  assert.equal((h.match(/<style>/g)||[]).length,1);
  assert.equal((h.match(/<\/style>/g)||[]).length,1);
});

test('S4.88 rejects write-like methods',()=>{
  const req={method:'POST',query:{}};
  const res={statusCode:200,headers:{},body:null,set(k,v){this.headers[k]=v;return this;},status(n){this.statusCode=n;return this;},send(v){this.body=v;return this;}};
  S.handler(req,res);
  assert.equal(res.statusCode,405);
});
