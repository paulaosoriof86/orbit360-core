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


test('GT health treats geography preference as optional and does not invent it from broad territory', () => {
  const r = bridge.mapPublicToBackend({
    country:'gt', product:'salud',
    data:{
      modalidad:'Individual',
      titularDob:'1988-04-10',
      hijos:'0',
      maternidad:'No',
      territorio:'Guatemala',
      contactName:'Paula',
      contactWhatsapp:'+50255555555',
      contactEmail:'paula@example.com',
      requestManagementConsent:true
    }
  });
  assert.equal(r.journeyId, 'GT_GASTOS_MEDICOS_HYBRID');
  assert.equal(r.missing.includes('geographyPreference'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(r.mapped,'geographyPreference'), false);
  assert.ok(r.notes.some(x => x.includes('optional backend geographyPreference')));
});

test('CO specific shipment maps its conditional contract fields explicitly', () => {
  const r = bridge.mapPublicToBackend({
    country:'co', product:'transporte',
    data:{
      rolCadena:'Transportador',
      coverageModeNeed:'SPECIFIC_SHIPMENT',
      carga:'Mercancía general',
      trayecto:'Colombia',
      transportModes:['ROAD'],
      origin:'Bogotá',
      destination:'Medellín',
      valueToProtect:'180000000',
      contactName:'Paula',
      contactWhatsapp:'+573001112233',
      contactEmail:'paula@example.com',
      requestManagementConsent:true
    }
  });
  assert.equal(r.mapped.origin,'Bogotá');
  assert.equal(r.mapped.destination,'Medellín');
  assert.equal(r.mapped.valueToProtect,180000000);
  assert.equal(r.missing.length,0);
  assert.equal(r.readyForBackendValidation,true);
});

test('CO annual program requires max shipment value and annual movement budget', () => {
  const r = bridge.mapPublicToBackend({
    country:'co', product:'transporte',
    data:{
      rolCadena:'Transportador',
      coverageModeNeed:'ANNUAL_PROGRAM',
      carga:'Mercancía general',
      trayecto:'Colombia',
      transportModes:['ROAD']
    }
  });
  assert.ok(r.missing.includes('maxValuePerShipment'));
  assert.ok(r.missing.includes('annualMovementBudget'));
});
