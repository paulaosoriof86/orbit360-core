'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const D=require('./cotcomp-s497-domain-schema');

const ids=sc=>(sc.groups||[]).flatMap(g=>(g.fields||[]).map(f=>f.id));

test('GT Auto preserves audited common intake and decision fields',()=>{
  const f=ids(D.schema('gt','auto'));
  for(const id of ['tipoVehiculo','usoVehiculo','marca','lineaModelo','anioModelo','valorAsegurado','conductorJoven','equipoEspecial','coberturaObjetivo','formaPago','prioridad']) assert.ok(f.includes(id),id);
});

test('CO Auto uses the same core identity pattern without inventing an AUTO-ready rater',()=>{
  const sc=D.schema('co','auto'),f=ids(sc);
  for(const id of ['tipoVehiculo','usoVehiculo','marca','lineaModelo','anioModelo','valorAsegurado']) assert.ok(f.includes(id),id);
  assert.equal(sc.eligibility,'CONSULTATIVE_REQUIRED');
  assert.equal(D.comparison('co','auto').comparable,false);
});

test('Health preserves composition, exact DOBs and plan options',()=>{
  const f=ids(D.schema('gt','salud',{hijos:2}));
  for(const id of ['modalidad','titularDob','generoTitular','conyuge','spouseDob','hijos','dependentDob1','dependentDob2','maternidad','dental','territorio','prioridad']) assert.ok(f.includes(id),id);
});

test('Home, life and business preserve their public grouped intake',()=>{
  for(const id of ['tipoInmueble','usoInmueble','valorEstructura','valorContenido','prioridad']) assert.ok(ids(D.schema('gt','hogar')).includes(id),'hogar:'+id);
  for(const id of ['momentoVida','dependientes','ingreso','horizonte','prioridad']) assert.ok(ids(D.schema('gt','vida')).includes(id),'vida:'+id);
  for(const id of ['sector','tamano','empleados','exposicion','valorActivos']) assert.ok(ids(D.schema('gt','empresa')).includes(id),'empresa:'+id);
});

test('CO transport preserves shipment/program, mode and modality-specific financial data',()=>{
  const f=ids(D.schema('co','transporte'));
  for(const id of ['rolCadena','unidades','carga','trayecto','coverageModeNeed','transportModePrimary','origin','destination','valueToProtect','maxValuePerShipment','annualMovementBudget','punto','valorCarga','prioridad']) assert.ok(f.includes(id),id);
  assert.equal(D.execution('co','transporte').journeyId,'CO_TRANSPORTE_CONSULTATIVE_HYBRID');
});

test('Other preserves orientation plus contract/project and policy-review deeper routes',()=>{
  for(const id of ['queProtege','queCambio']) assert.ok(ids(D.schema('gt','duda')).includes(id),'duda:'+id);
  for(const id of ['tipoContrato','monto','vigencia','prioridad']) assert.ok(ids(D.schema('gt','contrato')).includes(id),'contrato:'+id);
  for(const id of ['ramoActual','renovacion','primaActual','motivo','prioridad']) assert.ok(ids(D.schema('gt','revision')).includes(id),'revision:'+id);
});

test('comparison stays fail-closed when two validated alternatives do not exist',()=>{
  assert.equal(D.comparison('gt','auto').comparable,false);
  assert.equal(D.comparison('gt','auto').visualComparable,true);
  assert.equal(D.comparison('gt','salud').comparable,false);
  for(const [country,product] of [['co','auto'],['gt','hogar'],['gt','vida'],['gt','empresa'],['gt','transporte'],['co','transporte'],['gt','contrato'],['gt','revision'],['gt','duda']]){
    const c=D.comparison(country,product);
    assert.equal(c.comparable,false,country+':'+product);
    assert.equal(c.rankingPolicy,'NONE_BY_DEFAULT');
    assert.equal(c.noSilentWeighting,true);
  }
});

test('first-level family routing remains exactly seven families',()=>{
  assert.deepEqual(Object.keys(D.FAMILY_TO_PRODUCT),['vehicle','home','health','life','business','cargo','other']);
  assert.equal(D.FAMILY_TO_PRODUCT.other,'duda');
});

test('Home stays consultative until operational provider binding exists',()=>{
  for(const country of ['gt','co']){
    const sc=D.schema(country,'hogar');
    assert.equal(sc.eligibility,'CONSULTATIVE_REQUIRED');
    assert.equal(sc.bindingStatus,'OPERATIONAL_BINDING_PENDING');
  }
});

test('Source-only visual comparison fixture carries no invented monetary values',()=>{
  const c=D.comparison('gt','auto');
  assert.equal(c.visualFixture,true);
  assert.equal(c.visualComparable,true);
  assert.equal(c.comparable,false);
  assert.equal(c.validated.length,0);
  assert.equal(c.reason,'SOURCE_ONLY_VISUAL_FIXTURE_NOT_REAL_PROPOSALS');
  assert.equal(c.quotes.length,2);
  for(const q of c.quotes){
    assert.equal(q.status,'VISUAL_FIXTURE');
    assert.equal(q.total,'Según propuesta');
    assert.doesNotMatch(q.total,/Q\s*\d|\$\s*\d|COP|GTQ/i);
  }
});

test('identity-sensitive defaults remain explicit rather than fabricated',()=>{
  const auto=D.schema('gt','auto');
  const autoFields=auto.groups.flatMap(g=>g.fields);
  assert.equal(autoFields.find(x=>x.id==='anioModelo').default,'');
  assert.equal(autoFields.find(x=>x.id==='marca').default,'');
  assert.equal(autoFields.find(x=>x.id==='lineaModelo').default,'');
  const health=D.schema('gt','salud',{hijos:2});
  const healthFields=health.groups.flatMap(g=>g.fields);
  assert.equal(healthFields.find(x=>x.id==='conyuge').default,'No');
  assert.equal(healthFields.find(x=>x.id==='spouseDob').default,'');
  assert.equal(healthFields.find(x=>x.id==='dependentDob1').default,'');
  assert.equal(healthFields.find(x=>x.id==='dependentDob2').default,'');
});

