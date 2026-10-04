'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const S=require('./cotcomp-frontend-recovery-preview-s496b');
const S495=require('./cotcomp-premium-visual-preview-s495');

test('S4.96B restores S4.95 as visual parent',()=>{
  assert.equal(S.PARENT_FUNCTION,'cotcompPremiumVisualPreviewS495');
  assert.equal(S.PARENT_VERSION,S495.VERSION);
  const h=S.html();
  assert.match(h,/S496B_FRONTEND_RECOVERY_LOCKED/);
  assert.match(h,/data-s496b="true"/);
});

test('hero is bounded and preserves S4.95 editorial headline family',()=>{
  const h=S.html();
  assert.match(h,/hero-media\{[\s\S]*position:relative/);
  assert.match(h,/aspect-ratio:4\/3/);
  assert.match(h,/width:min\(580px,38vw\)/);
  assert.match(h,/hero h1\{[\s\S]*font-family:'Newsreader'/);
  assert.doesNotMatch(h,/body\[data-s496b="true"\] \.hero-media\{[^}]*bottom:22px/);
});

test('product visual cannot stretch with long intake',()=>{
  const h=S.html();
  assert.match(h,/\.product-visual\{[\s\S]*align-self:start/);
  assert.match(h,/aspect-ratio:4\/3/);
  assert.match(h,/position:sticky/);
});

test('intake is progressive and prevents blank review',()=>{
  const h=S.html();
  assert.match(h,/intakePage:0/);
  assert.match(h,/collectIntakePages/);
  assert.match(h,/validateCurrentIntake/);
  assert.match(h,/Datos '\+\(state\.intakePage\+1\)\+' de '/);
  assert.match(h,/Completa los datos de este bloque para continuar/);
});

test('public UI hides internal release-state labels',()=>{
  const h=S.html();
  assert.match(h,/Disponible con validación/);
  assert.match(h,/Con acompañamiento A&S/);
  assert.match(h,/Te orientamos/);
});

test('route visual resolver does not reuse consultative photo for all assisted routes',()=>{
  const h=S.html();
  assert.match(h,/const consult=state\.route==='other';/);
  assert.doesNotMatch(h,/state\.route==='other'\|\|state\.mode==='assisted'/);
});

test('comparison and lower actions have explicit hierarchy and actions',()=>{
  const h=S.html();
  for(const token of [
    'Ver las diferencias clave',
    'Entender la recomendación',
    'Continuar con un asesor',
    'Elegir esta alternativa',
    'Ver recomendación completa'
  ]) assert.ok(h.includes(token),token);
  assert.match(h,/compare-head h3\{font-size:22px/);
  assert.match(h,/body\[data-s496b-stage="3"\] \.utility\{display:grid\}/);
});

test('journey semantics and release gates remain fail-closed',()=>{
  const h=S.html();
  for(const token of ['Lo que necesitas','Tus datos','Revisar opciones','Comparar y continuar']) assert.ok(h.includes(token));
  const m=S.manifest();
  assert.equal(m.providerDeploymentAuthorized,false);
  assert.equal(m.cotcompRealTransportAuthorized,false);
  assert.equal(m.production,false);
});

test('non-GET remains blocked',()=>{
  const req={method:'POST'};
  const res={statusCode:200,headers:{},body:null,set(k,v){this.headers[k]=v;return this;},status(n){this.statusCode=n;return this;},send(v){this.body=v;return this;}};
  S.handler(req,res);
  assert.equal(res.statusCode,405);
});
