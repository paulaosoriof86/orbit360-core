'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const bridge = require('./cotcomp-public-bridge');

test('bridge is default-deny and source-only', () => {
  assert.equal(bridge.AUTO_READY, false);
  assert.equal(bridge.RUNTIME_SIDE_EFFECTS_ALLOWED, false);
});

test('GT auto maps explicit fields but remains partial without submit requirements', () => {
  const r = bridge.mapPublicToBackend({
    country:'gt', product:'auto',
    data:{tipoVehiculo:'Automóvil',usoVehiculo:'Particular',anioModelo:'2024',valorAsegurado:'185000',coberturaObjetivo:'Cobertura amplia'}
  });
  assert.equal(r.journeyId, 'GT_AUTO_MOTO_HYBRID');
  assert.equal(r.mapped.route, 'AUTO');
  assert.equal(r.mapped.protectionGoal, 'FULL');
  assert.equal(r.readyForBackendValidation, false);
  assert.ok(r.missing.includes('brand'));
  assert.ok(r.missing.includes('contact.email'));
});

test('GT health never invents DOB from age', () => {
  const r = bridge.mapPublicToBackend({
    country:'gt', product:'salud',
    data:{modalidad:'Familiar',edadTitular:'38',conyuge:'Sí',edadConyuge:'40',hijos:'1',maternidad:'No',territorio:'Guatemala'}
  });
  assert.equal(r.journeyId, 'GT_GASTOS_MEDICOS_HYBRID');
  assert.ok(r.missing.includes('titularDob'));
  assert.ok(r.missing.includes('spouseDob'));
  assert.ok(r.notes.some(x => x.includes('cannot be converted')));
});

test('CO transport does not infer missing coverage mode or transport modes', () => {
  const r = bridge.mapPublicToBackend({
    country:'co', product:'transporte',
    data:{rolCadena:'Transportador',carga:'Mercancía general',trayecto:'Colombia'}
  });
  assert.equal(r.journeyId, 'CO_TRANSPORTE_CONSULTATIVE_HYBRID');
  assert.equal(r.mapped.operationRole, 'TRANSPORTER');
  assert.equal(r.mapped.transitScope, 'NATIONAL');
  assert.ok(r.missing.includes('coverageModeNeed'));
  assert.ok(r.missing.includes('transportModes'));
});

test('unsupported route remains consultative', () => {
  const r = bridge.mapPublicToBackend({country:'gt',product:'hogar',data:{}});
  assert.equal(r.journeyId, null);
  assert.equal(r.readyForBackendValidation, false);
  assert.ok(r.notes[0].includes('consultative'));
});
