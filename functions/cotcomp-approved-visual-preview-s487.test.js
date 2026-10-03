'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const S=require('./cotcomp-approved-visual-preview-s487');
const C=require('./cotcomp-gravicentra-provider-contract-s484');

test('S4.87 descends visually from the promoted Personas/Familias baseline that contains the approved CotComp surface',()=>{
  assert.equal(S.PROMOTED_VISUAL_PARENT_SHA,'50aa4190ae22ad13760f893b9bf37415abe35fb7327e034f66dc565b9b2cbf1d');
});

test('S4.87 preserves the approved CotComp visual language signatures',()=>{
  const h=S.html();
  assert.match(h,/Compara con criterio, no solo por precio\./);
  assert.match(h,/COTIZAR Y COMPARAR/);
  assert.match(h,/SESIÓN DE COTIZACIÓN/);
  assert.match(h,/RECORRIDO/);
  assert.match(h,/Cotización en línea/);
  assert.match(h,/Con acompañamiento/);
  assert.match(h,/Comparamos solo alternativas normalizadas/);
  assert.match(h,/font-family:'Archivo'/);
  assert.match(h,/font-family:'IBM Plex Mono'/);
  assert.match(h,/#F4F1EA/);
  assert.match(h,/#E4002B/);
  assert.match(h,/#12110F/);
});

test('S4.87 presents the seven frozen product families inside the approved visual surface',()=>{
  const h=S.html();
  for(const label of [
    'Vehículo y movilidad',
    'Hogar',
    'Salud / gastos médicos',
    'Vida e ingreso',
    'Empresa',
    'Transporte / carga',
    'Otros / no sé cuál necesito'
  ]) assert.ok(h.includes(label),label);
  assert.equal(S.ROUTES.length,7);
});

test('S4.87 keeps S4.80A vehicle controls and explicit unknown-value fallback',()=>{
  const h=S.html();
  assert.match(h,/id="brandInput"/);
  assert.match(h,/role="combobox"/);
  assert.match(h,/id="modelInput"/);
  assert.match(h,/id="yearSelect"/);
  assert.match(h,/No encuentro mi marca/);
  assert.match(h,/No encuentro mi línea \/ modelo/);
  assert.doesNotMatch(h,/Validar selección/);
  assert.doesNotMatch(h,/Selección validada/);
  assert.doesNotMatch(h,/No se guardó ningún dato/);
});

test('S4.87 keeps provider contract and release boundary unchanged',()=>{
  const m=S.fixtureManifest();
  assert.equal(C.validateProviderManifest(m).ok,true);
  assert.equal(m.providerContractVersion,'gravicentra-quote-authority-v1');
  assert.equal(m.providerDeploymentAuthorized,false);
  assert.equal(m.cotcompRealTransportAuthorized,false);
  assert.equal(m.intakeSchemas.length,3);
});

test('S4.87 does not invent schemas for Home Health Life or Other',()=>{
  const m=S.fixtureManifest();
  for(const id of ['home','health','life','other']){
    const route=S.ROUTES.find(x=>x.id===id);
    assert.ok(route);
    assert.equal(route.mode,'ASSISTED_DISCOVERY');
    const matches=m.intakeSchemas.filter(s=>s.scope.lineOfBusiness===route.context.lineOfBusiness);
    assert.equal(matches.length,0,id);
  }
});

test('S4.87 removes the generic LAB-card visual treatment from S4.86',()=>{
  const h=S.html();
  assert.doesNotMatch(h,/Vista previa LAB/);
  assert.doesNotMatch(h,/font-family:Segoe UI,Arial,sans-serif/);
  assert.match(h,/class="workspace"/);
  assert.match(h,/class="rail"/);
  assert.match(h,/class="progress"/);
});

test('S4.87 remains preview-only with no PII capture, persistence or real transport',()=>{
  const h=S.html();
  assert.doesNotMatch(h,/<label[^>]*>[^<]*(Correo electrónico|Teléfono|DPI|NIT|Cédula|WhatsApp)/i);
  assert.doesNotMatch(h,/(id|name)="[^"]*(email|phone|telefono|dpi|nit|cedula|whatsapp)/i);
  assert.doesNotMatch(h,/requestManagement/i);
  const src=fs.readFileSync(path.join(__dirname,'cotcomp-approved-visual-preview-s487.js'),'utf8').toUpperCase();
  for(const forbidden of [
    'GETFIRESTORE','FIREBASE-ADMIN','ONCALL','CALCULATEPREMIUM(',
    'CALCULATETAX(','APPLYTARIFFRATE(','PROVIDER/RATER'
  ]) assert.equal(src.includes(forbidden),false,forbidden);
});

test('S4.87 rejects write-like HTTP methods',()=>{
  const req={method:'POST'};
  const res={statusCode:200,headers:{},body:null,set(k,v){this.headers[k]=v;return this;},status(n){this.statusCode=n;return this;},send(v){this.body=v;return this;}};
  S.handler(req,res);
  assert.equal(res.statusCode,405);
});
