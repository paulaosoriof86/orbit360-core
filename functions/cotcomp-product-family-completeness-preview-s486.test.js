'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const S=require('./cotcomp-product-family-completeness-preview-s486');
const C=require('./cotcomp-gravicentra-provider-contract-s484');

test('S4.86 exposes the seven frozen public product-family entry paths',()=>{
  assert.equal(S.ROUTES.length,7);
  assert.deepEqual(
    S.ROUTES.map(x=>x.family),
    [
      'Vehículo / movilidad',
      'Hogar',
      'Salud / gastos médicos',
      'Vida / ingreso',
      'Empresa',
      'Transporte / carga',
      'Otros / no sé cuál necesito'
    ]
  );
});

test('S4.86 adds Home Health Life and Other without pretending provider schemas exist',()=>{
  const assisted=S.ROUTES.filter(x=>x.mode==='ASSISTED_DISCOVERY');
  assert.deepEqual(assisted.map(x=>x.id),['home','health','life','other']);
  const m=S.fixtureManifest();
  for(const id of ['home','health','life','other']){
    const route=S.ROUTES.find(x=>x.id===id);
    const matches=m.intakeSchemas.filter(s=>
      s.scope.lineOfBusiness===route.context.lineOfBusiness &&
      s.scope.productId===route.context.productId
    );
    assert.equal(matches.length,0,id);
  }
});

test('S4.86 keeps provider-backed fixture schemas only for already-demonstrated paths',()=>{
  const m=S.fixtureManifest();
  assert.equal(C.validateProviderManifest(m).ok,true);
  assert.equal(m.providerContractVersion,'gravicentra-quote-authority-v1');
  assert.equal(m.providerDeploymentAuthorized,false);
  assert.equal(m.cotcompRealTransportAuthorized,false);
  assert.equal(m.intakeSchemas.length,3);
  assert.deepEqual(m.intakeSchemas.map(x=>x.schemaId),[
    'fixture-gt-vehicle-v1','fixture-gt-business-v1','fixture-co-cargo-v1'
  ]);
});

test('S4.86 renders all public family labels and need-oriented descriptions',()=>{
  const h=S.html();
  for(const label of [
    'Vehículo y movilidad',
    'Hogar',
    'Salud / gastos médicos',
    'Vida e ingreso',
    'Empresa',
    'Transporte / carga',
    'Otros / no sé cuál necesito'
  ]){
    assert.ok(h.includes(label),label);
  }
  assert.match(h,/¿Qué quieres proteger\?/);
  assert.match(h,/Las preguntas cambian según el país, producto y riesgo/);
});

test('S4.86 unsupported families fail open to assisted discovery but fail closed on invented insurance logic',()=>{
  const h=S.html();
  assert.match(h,/Esta vista previa todavía no carga un schema autoritativo para esta familia/);
  assert.match(h,/no inventar preguntas, coberturas ni tarifas/);
  assert.match(h,/Continuar con orientación/);
  assert.match(h,/No se inventó ningún requisito de producto/);
});

test('S4.86 preserves S4.80A Owner-approved vehicle interaction',()=>{
  const h=S.html();
  assert.match(h,/id="brandInput"[^>]*role="combobox"/);
  assert.match(h,/id="modelInput"[^>]*role="combobox"/);
  assert.match(h,/id="yearSelect"/);
  assert.match(h,/No encuentro mi marca/);
  assert.match(h,/No encuentro mi línea \/ modelo/);
  assert.doesNotMatch(h,/Validar selección/);
  assert.doesNotMatch(h,/Selección validada/);
  assert.doesNotMatch(h,/No se guardó ningún dato/);
});

test('S4.86 preserves schema-driven non-Auto examples for business and cargo',()=>{
  const m=S.fixtureManifest();
  const business=m.intakeSchemas.find(x=>x.schemaId==='fixture-gt-business-v1');
  const cargo=m.intakeSchemas.find(x=>x.schemaId==='fixture-co-cargo-v1');
  assert.ok(business.fields.some(x=>x.key==='activity'));
  assert.ok(business.fields.some(x=>x.conditions&&x.conditions.length));
  assert.ok(cargo.fields.some(x=>x.key==='cargoType'));
  assert.ok(cargo.fields.some(x=>x.key==='routeType'));
});

test('S4.86 remains fixture-only, no PII/request persistence or real Gravicentra transport',()=>{
  const h=S.html();
  assert.match(h,/Preview fixture-only/);
  assert.match(h,/No hay conexión real con Gravicentra, aseguradoras ni proveedores/);
  assert.doesNotMatch(h,/<label[^>]*>[^<]*(Correo electrónico|Teléfono|DPI|NIT|Cédula|WhatsApp)/i);
  assert.doesNotMatch(h,/(id|name)="[^"]*(email|phone|telefono|dpi|nit|cedula|whatsapp)/i);
  assert.doesNotMatch(h,/requestManagement/i);
  const src=fs.readFileSync(path.join(__dirname,'cotcomp-product-family-completeness-preview-s486.js'),'utf8').toUpperCase();
  for(const forbidden of [
    'GETFIRESTORE','FIREBASE-ADMIN','ONCALL','CALCULATEPREMIUM(',
    'CALCULATETAX(','APPLYTARIFFRATE(','HTTPS://API.','PROVIDER/RATER'
  ]){
    assert.equal(src.includes(forbidden),false,forbidden);
  }
});

test('S4.86 keeps vehicle catalog as UX reference only',()=>{
  assert.equal(S.CATALOG_PATH,'/cotcompVehicleCatalogS479');
  const m=S.fixtureManifest();
  const vehicle=m.intakeSchemas.find(x=>x.schemaId==='fixture-gt-vehicle-v1');
  assert.equal(vehicle.fields[0].ui.control,'VEHICLE_BRAND_COMBOBOX');
  assert.equal(vehicle.fields[1].ui.control,'VEHICLE_MODEL_COMBOBOX');
  assert.equal(vehicle.fields[2].ui.control,'VEHICLE_YEAR_SELECT');
});

test('S4.86 does not imply quote purchase issuance or ranking in the entry surface',()=>{
  const h=S.html();
  assert.doesNotMatch(h,/Comprar ahora|Emitir póliza|Póliza emitida|Mejor opción|Recomendado #1|Más barato/i);
  assert.match(h,/orientación asistida/i);
});

test('S4.86 rejects write-like HTTP methods',()=>{
  const req={method:'POST'};
  const res={statusCode:200,headers:{},body:null,set(k,v){this.headers[k]=v;return this;},status(n){this.statusCode=n;return this;},send(v){this.body=v;return this;}};
  S.handler(req,res);
  assert.equal(res.statusCode,405);
});
