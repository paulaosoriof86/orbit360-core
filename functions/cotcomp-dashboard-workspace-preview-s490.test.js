'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const S=require('./cotcomp-dashboard-workspace-preview-s490');
const C=require('./cotcomp-gravicentra-provider-contract-s484');

test('S4.90 pins Owner visual reference hashes and rejected prior screenshot',()=>{
  assert.equal(S.VISUAL_REFERENCE_LOCK.ref1Sha256,'b854a5a8c2bc6fd9f50339a31b98914bfa25a3dcdbb9c95a76905442f1cf36b0');
  assert.equal(S.VISUAL_REFERENCE_LOCK.ref2Sha256,'bad94a30d5c2f209c3efa9cedfccfa5e57c52deb270d5150cfac5e7f9cbcb735');
  assert.equal(S.VISUAL_REFERENCE_LOCK.rejectedS488ScreenshotSha256,'bb8e43ed25de8b89c5e1ec6d05c18230084f604ccf9d071f2fca50687bfa3e65');
});

test('S4.90 is a dashboard/workspace, not a hero landing',()=>{
  const h=S.html();
  assert.match(h,/class="app"/);
  assert.match(h,/class="sidebar"/);
  assert.match(h,/class="topbar"/);
  assert.match(h,/class="metrics"/);
  assert.match(h,/class="workspace"/);
  assert.match(h,/class="card"/);
  assert.match(h,/Alternativas y comparación/);
  assert.doesNotMatch(h,/Compara con criterio, no solo por precio/);
  assert.doesNotMatch(h,/class="page-title"/);
});

test('S4.90 uses A&S red graphite white neutral visual translation',()=>{
  const h=S.html();
  assert.match(h,/--red:#c1121f/);
  assert.match(h,/--nav:#10141e/);
  assert.match(h,/--white:#fff/);
  assert.match(h,/background:#eef0f3/);
  assert.match(h,/background:linear-gradient\(180deg,var\(--nav\),#0b0e15\)/);
});

test('S4.90 retains all seven product families',()=>{
  const h=S.html();
  for(const label of [
    'Vehículo y movilidad','Hogar','Salud / gastos médicos','Vida e ingreso',
    'Empresa','Transporte / carga','Otros / no sé cuál necesito'
  ]) assert.ok(h.includes(label),label);
  assert.equal(S.routes().length,7);
});

test('S4.90 preserves vehicle searchable Marca Modelo and separate Año',()=>{
  const h=S.html();
  assert.match(h,/id="brandInput"/);
  assert.match(h,/id="modelInput"/);
  assert.match(h,/id="yearSelect"/);
  assert.match(h,/No encuentro mi marca/);
  assert.match(h,/No encuentro mi línea \/ modelo/);
});

test('S4.90 preserves schema-driven truth and Gravicentra authority',()=>{
  const m=S.manifest();
  assert.equal(C.validateProviderManifest(m).ok,true);
  assert.equal(m.providerContractVersion,'gravicentra-quote-authority-v1');
  assert.equal(m.providerDeploymentAuthorized,false);
  assert.equal(m.cotcompRealTransportAuthorized,false);
  assert.match(S.html(),/Autoridad<\/span><strong>Gravicentra/);
});

test('S4.90 does not invent product schemas for unsupported family combinations',()=>{
  const h=S.html();
  assert.match(h,/no exista un schema autoritativo disponible/);
  assert.match(h,/no se inventarán preguntas ni tarifas/);
  assert.match(h,/Continuar con acompañamiento/);
});

test('S4.90 comparison surface preserves missing semantics and normalized-only rule',()=>{
  const h=S.html();
  assert.match(h,/MISSING/);
  assert.match(h,/No equivale a no cubierto/);
  assert.match(h,/Esta zona se activa cuando existen propuestas validadas y comparables/);
});

test('S4.90 remains LAB-only with no PII capture persistence pricing engine or real transport',()=>{
  const h=S.html();
  assert.doesNotMatch(h,/<label[^>]*>[^<]*(Correo electrónico|Teléfono|DPI|NIT|Cédula|WhatsApp)/i);
  const src=fs.readFileSync(path.join(__dirname,'cotcomp-dashboard-workspace-preview-s490.js'),'utf8').toUpperCase();
  for(const forbidden of ['GETFIRESTORE','FIREBASE-ADMIN','ONCALL','CALCULATEPREMIUM(','CALCULATETAX(','APPLYTARIFFRATE(','REQUESTMANAGEMENT']) {
    assert.equal(src.includes(forbidden),false,forbidden);
  }
});

test('S4.90 HTML is structurally renderable and responsive styles exist',()=>{
  const h=S.html();
  assert.ok(h.indexOf('</style>')<h.indexOf('<body>'));
  assert.match(h,/@media\(max-width:1180px\)/);
  assert.match(h,/@media\(max-width:620px\)/);
});

test('S4.90 rejects write-like methods',()=>{
  const req={method:'POST'};
  const res={statusCode:200,headers:{},body:null,set(k,v){this.headers[k]=v;return this;},status(n){this.statusCode=n;return this;},send(v){this.body=v;return this;}};
  S.handler(req,res);
  assert.equal(res.statusCode,405);
});
