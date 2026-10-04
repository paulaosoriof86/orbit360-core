'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const S=require('./cotcomp-premium-journey-preview-s496');
const S495=require('./cotcomp-premium-visual-preview-s495');

test('S4.96 is a governed continuation of S4.95, not a parallel frontend',()=>{
  assert.equal(S.PARENT_FUNCTION,'cotcompPremiumVisualPreviewS495');
  assert.equal(S.PARENT_VERSION,S495.VERSION);
  assert.equal(S.GOVERNANCE_CONTEXT,'A&S/COTCOMP_CANONICAL_CONTEXT_v1.0_2026-10-04');
  const h=S.html();
  assert.match(h,/data-s496="true"/);
  assert.match(h,/class="site-header"/);
  assert.match(h,/class="workspace"/);
  assert.match(h,/Cotiza y compara <em>con criterio<\/em>/);
  assert.doesNotMatch(h,/class="sidebar"/);
});

test('S4.96 restores canonical typography and a contained editorial hero',()=>{
  const h=S.html();
  assert.match(h,/\.hero\{min-height:354px\}/);
  assert.match(h,/\.hero-media\{left:56%;right:24px;top:22px;bottom:22px;border-radius:24px/);
  assert.match(h,/\.hero h1\{font-family:'Archivo'/);
  assert.match(h,/\.hero p\{font-family:'Instrument Sans'/);
  assert.match(h,/object-position:50% 44%/);
});

test('S4.96 restores the four-stage state machine and back semantics',()=>{
  const h=S.html();
  for(const label of ['Lo que necesitas','Tus datos','Revisar opciones','Comparar y continuar']) assert.ok(h.includes(label),label);
  for(const token of ['stage:1','maxStage:1','function setStage(n)','function advance()','function back()','state.stage--','if(n>state.maxStage)return']) assert.ok(h.includes(token),token);
  assert.match(h,/if\(state\.stage<3\)\{state\.stage\+\+/);
  assert.match(h,/if\(state\.stage>0\)\{state\.stage--/);
});

test('S4.96 details and recommendation never advance the journey',()=>{
  const src=fs.readFileSync(path.join(__dirname,'cotcomp-premium-journey-preview-s496.js'),'utf8');
  const toggleAlt=src.slice(src.indexOf('function toggleAlt'),src.indexOf('function toggleCompare'));
  const toggleCompare=src.slice(src.indexOf('function toggleCompare'),src.indexOf('function toggleRec'));
  const toggleRec=src.slice(src.indexOf('function toggleRec'),src.indexOf('function ensureModal'));
  for(const part of [toggleAlt,toggleCompare,toggleRec]){
    assert.equal(part.includes('state.stage++'),false);
    assert.equal(part.includes('setStage('),false);
  }
});

test('S4.96 restores country/product intake breadth without promoting maturity',()=>{
  const h=S.html();
  for(const token of [
    '¿Qué vehículo quieres proteger?',
    '¿Qué protección buscas?',
    'Tipo de vehículo',
    'Uso del vehículo',
    'Marca',
    'Línea / modelo',
    'Valor aproximado del vehículo',
    'Fecha de nacimiento del titular',
    'Hijos o dependientes a incluir',
    'Tipo de inmueble',
    'Ingreso mensual a proteger',
    'Sector / actividad',
    '¿Cuál es tu rol en la operación?',
    'Valor máximo por despacho',
    'Movimiento anual estimado',
    'RC Profesional',
    '¿Qué quieres proteger?',
    '¿Qué cambió?'
  ]) assert.ok(h.includes(token),token);
  assert.match(h,/HYBRID · NOT AUTO READY/);
  assert.match(h,/CONSULTATIVE REQUIRED · SOURCE BINDING NOT CERTIFIED/);
  assert.match(h,/CONSULTATIVE HYBRID · NO CURRENT A&S RATER · NOT AUTO READY/);
  assert.match(h,/HISTORICAL RATER NOT PROMOTED/);
});

test('S4.96 preserves Brand -> Model -> Year and explicit assisted fallback',()=>{
  const h=S.html();
  assert.match(h,/data-combo="brand"/);
  assert.match(h,/data-combo="model"/);
  assert.match(h,/No encuentro mi marca/);
  assert.match(h,/No encuentro mi línea \/ modelo/);
  assert.match(h,/modelYear/);
  assert.match(h,/No forzamos una selección incorrecta/);
});

test('S4.96 keeps a deterministic product visual and does not replace every assisted route with Priscila',()=>{
  const h=S.html();
  assert.match(h,/data-s496-route="other"/);
  assert.match(h,/s496-other-photo/);
  assert.match(h,/const p=q\('\.photo-scene',pv\);p\.style\.backgroundImage/);
  assert.doesNotMatch(h,/routeId\(\)==='other'\|\|state\.mode==='assisted'/);
  assert.match(h,/La imagen representa la familia de riesgo/);
});

test('S4.96 improves comparison hierarchy and keeps missing semantics',()=>{
  const h=S.html();
  assert.match(h,/s496-detail-grid/);
  assert.match(h,/s496-compare-detail/);
  assert.match(h,/Recomendación A&amp;S/);
  assert.match(h,/Missing no se interpreta/);
  assert.match(h,/Se muestran como faltantes; nunca como “no cubre”/);
  assert.match(h,/Sin ranking silencioso/);
});

test('S4.96 preserves fail-closed provider and release gates',()=>{
  const m=S.manifest();
  assert.equal(m.providerDeploymentAuthorized,false);
  assert.equal(m.cotcompRealTransportAuthorized,false);
  assert.equal(m.production,false);
  const src=fs.readFileSync(path.join(__dirname,'cotcomp-premium-journey-preview-s496.js'),'utf8').toUpperCase();
  for(const forbidden of ['GETFIRESTORE','FIREBASE-ADMIN','ONCALL','CALCULATEPREMIUM(','CALCULATETAX(','APPLYTARIFFRATE(']) assert.equal(src.includes(forbidden),false,forbidden);
});

test('S4.96 remains LAB-only and rejects write-like HTTP methods',()=>{
  const h=S.html();
  assert.match(h,/Vista previa visual LAB/);
  assert.match(h,/Datos de alternativas y precios son ilustrativos; no constituyen oferta/);
  assert.match(h,/Gravicentra sigue siendo la autoridad/);
  assert.match(h,/esta vista LAB no envía datos/i);
  const req={method:'POST'};
  const res={statusCode:200,headers:{},body:null,set(k,v){this.headers[k]=v;return this;},status(n){this.statusCode=n;return this;},send(v){this.body=v;return this;}};
  S.handler(req,res);
  assert.equal(res.statusCode,405);
});
