'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const S=require('./cotcomp-schema-driven-intake-preview-s485');
const C=require('./cotcomp-gravicentra-provider-contract-s484');

test('S4.85 fixture manifest is valid, multiproduct and transport-disabled',()=>{
  const m=S.fixtureManifest();
  assert.equal(C.validateProviderManifest(m).ok,true);
  assert.equal(m.providerContractVersion,'gravicentra-quote-authority-v1');
  assert.equal(m.providerDeploymentAuthorized,false);
  assert.equal(m.cotcompRealTransportAuthorized,false);
  assert.equal(m.intakeSchemas.length,3);
  assert.deepEqual(new Set(m.intakeSchemas.map(x=>x.scope.country)),new Set(['GT','CO']));
  assert.deepEqual(new Set(m.intakeSchemas.map(x=>x.scope.lineOfBusiness)),new Set(['MOBILITY','PROPERTY','TRANSPORT']));
});

test('S4.85 presents need-oriented multiproduct entry choices',()=>{
  const h=S.html();
  assert.match(h,/Cotizar mi vehículo/);
  assert.match(h,/Proteger mi empresa o local/);
  assert.match(h,/Proteger una operación de carga/);
  assert.match(h,/Los datos solicitados cambian según el tipo de protección/);
});

test('S4.85 preserves the Owner-approved vehicle combobox pattern without LAB validation scaffolding',()=>{
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

test('S4.85 fixture schemas demonstrate generic and conditional fields outside Auto',()=>{
  const m=S.fixtureManifest();
  const business=m.intakeSchemas.find(x=>x.schemaId==='fixture-gt-business-v1');
  const cargo=m.intakeSchemas.find(x=>x.schemaId==='fixture-co-cargo-v1');
  assert.ok(business);
  assert.ok(cargo);
  assert.equal(business.fields.some(x=>x.conditions&&x.conditions.length),true);
  assert.equal(cargo.fields.some(x=>x.key==='cargoType'),true);
  assert.equal(cargo.fields.some(x=>x.key==='routeType'),true);
});

test('S4.85 uses generic renderer hooks for provider schema field types',()=>{
  const h=S.html();
  assert.match(h,/function genericField/);
  assert.match(h,/f\.type==='SELECT'/);
  assert.match(h,/f\.type==='BOOLEAN'/);
  assert.match(h,/f\.type==='MONEY'/);
  assert.match(h,/conditions/);
});

test('S4.85 has actionable assisted-review fallback and a single continuation CTA',()=>{
  const h=S.html();
  assert.match(h,/Continuar con revisión asistida/);
  assert.match(h,/No te obligaremos a escoger una opción incorrecta/);
  assert.match(h,/id="continueBtn"/);
  assert.doesNotMatch(h,/Enviar cotización|Emitir póliza|Comprar ahora/i);
});

test('S4.85 is preview-only with no PII collection, QuoteCase persistence or real provider transport',()=>{
  const h=S.html();
  assert.match(h,/no pide información personal ni envía una solicitud/i);
  assert.match(h,/No hay conexión real con Gravicentra, aseguradoras ni proveedores/);
  assert.doesNotMatch(h,/Correo electrónico|Teléfono|DPI|NIT|Cédula|WhatsApp|requestManagement/i);
  const src=fs.readFileSync(path.join(__dirname,'cotcomp-schema-driven-intake-preview-s485.js'),'utf8').toUpperCase();
  for(const forbidden of ['GETFIRESTORE','FIREBASE-ADMIN','ONCALL','CALCULATEPREMIUM(','CALCULATETAX(','APPLYTARIFFRATE(','HTTPS://API.','PROVIDER/RATER']){
    assert.equal(src.includes(forbidden),false,forbidden);
  }
});

test('S4.85 keeps vehicle catalog as reference UX only',()=>{
  assert.equal(S.CATALOG_PATH,'/cotcompVehicleCatalogS479');
  const m=S.fixtureManifest();
  const vehicle=m.intakeSchemas.find(x=>x.schemaId==='fixture-gt-vehicle-v1');
  assert.equal(vehicle.fields[0].ui.control,'VEHICLE_BRAND_COMBOBOX');
  assert.equal(vehicle.fields[1].ui.control,'VEHICLE_MODEL_COMBOBOX');
  assert.equal(vehicle.fields[2].ui.control,'VEHICLE_YEAR_SELECT');
});

test('S4.85 rejects write-like HTTP methods',()=>{
  const req={method:'POST'};
  const res={statusCode:200,headers:{},body:null,set(k,v){this.headers[k]=v;return this;},status(n){this.statusCode=n;return this;},send(v){this.body=v;return this;}};
  S.handler(req,res);
  assert.equal(res.statusCode,405);
});
