'use strict';

const VERSION = 'ays-cotcomp-public-bridge-s410-v0.2';
const AUTO_READY = false;
const RUNTIME_SIDE_EFFECTS_ALLOWED = false;

const EXECUTABLE = Object.freeze({
  'gt:auto': 'GT_AUTO_MOTO_HYBRID',
  'gt:salud': 'GT_GASTOS_MEDICOS_HYBRID',
  'co:transporte': 'CO_TRANSPORTE_CONSULTATIVE_HYBRID',
  'co:rc_profesional': 'CO_RC_PROFESIONAL_CONSULTATIVE_HYBRID'
});

function nonEmpty(v) { return typeof v === 'string' && v.trim().length > 0; }
function num(v) { const n = Number(v); return Number.isFinite(n) ? n : undefined; }

function base(country, product) {
  const key = String(country || '').toLowerCase() + ':' + String(product || '').toLowerCase();
  return {
    version: VERSION,
    key,
    journeyId: EXECUTABLE[key] || null,
    mapped: {},
    missing: [],
    unsupported: [],
    notes: [],
    readyForBackendValidation: false,
    autoReady: AUTO_READY,
    runtimeSideEffectsAllowed: RUNTIME_SIDE_EFFECTS_ALLOWED
  };
}

function contact(src, out) {
  const fields = [
    ['contact.name', src.contactName || src['contact.name']],
    ['contact.whatsapp', src.contactWhatsapp || src['contact.whatsapp']],
    ['contact.email', src.contactEmail || src['contact.email']]
  ];
  for (const [key, value] of fields) nonEmpty(value) ? out.mapped[key] = value.trim() : out.missing.push(key);
  const consent = src.requestManagementConsent ?? src['consents.requestManagement'];
  consent === true ? out.mapped['consents.requestManagement'] = true : out.missing.push('consents.requestManagement');
}

function finish(out) {
  out.missing = [...new Set(out.missing)];
  out.unsupported = [...new Set(out.unsupported)];
  out.readyForBackendValidation = !!out.journeyId && out.missing.length === 0 && out.unsupported.length === 0;
  return out;
}

function gtAuto(src) {
  const out = base('gt', 'auto');
  if (src.tipoVehiculo === 'Automóvil') out.mapped.route = 'AUTO';
  else if (src.tipoVehiculo === 'Motocicleta') out.mapped.route = 'MOTO';
  else if (nonEmpty(src.tipoVehiculo)) out.unsupported.push('tipoVehiculo requires explicit AUTO/MOTO contract decision');
  else out.missing.push('route');

  const goal = {'Cobertura amplia':'FULL','Daños a terceros / RC':'RC','Revisar opciones disponibles':'NEED_GUIDANCE'}[src.coberturaObjetivo];
  if (goal) out.mapped.protectionGoal = goal;
  else if (src.coberturaObjetivo === 'Robo' && out.mapped.route === 'MOTO') out.mapped.protectionGoal = 'THEFT_ONLY';
  else out.missing.push('protectionGoal');

  nonEmpty(src.tipoVehiculo) ? out.mapped.vehicleType = src.tipoVehiculo : out.missing.push('vehicleType');
  nonEmpty(src.usoVehiculo) ? out.mapped.vehicleUse = src.usoVehiculo : out.missing.push('vehicleUse');
  const year = num(src.anioModelo);
  Number.isInteger(year) ? out.mapped.modelYear = year : out.missing.push('modelYear');
  const insured = num(src.valorAsegurado);
  if (insured !== undefined) out.mapped.insuredValue = insured;
  else if (['FULL','THEFT_ONLY'].includes(out.mapped.protectionGoal)) out.missing.push('insuredValue');
  nonEmpty(src.marca) ? out.mapped.brand = src.marca.trim() : out.missing.push('brand');
  nonEmpty(src.lineaModelo) ? out.mapped.lineModel = src.lineaModelo.trim() : out.missing.push('lineModel');
  contact(src, out);
  return finish(out);
}

function gtHealth(src) {
  const out = base('gt', 'salud');
  const group = {'Individual':'INDIVIDUAL','Familiar':'FAMILY'}[src.modalidad];
  group ? out.mapped.coverageGroup = group : out.missing.push('coverageGroup');
  if (nonEmpty(src.titularDob)) out.mapped.titularDob = src.titularDob;
  else { out.missing.push('titularDob'); if (src.edadTitular) out.notes.push('edadTitular cannot be converted to titularDob without inventing a date'); }

  if (src.conyuge === 'Sí') out.mapped.spouseIncluded = true;
  if (src.conyuge === 'No') out.mapped.spouseIncluded = false;
  if (out.mapped.spouseIncluded === true) {
    if (nonEmpty(src.spouseDob)) out.mapped.spouseDob = src.spouseDob;
    else { out.missing.push('spouseDob'); if (src.edadConyuge) out.notes.push('edadConyuge cannot be converted to spouseDob without inventing a date'); }
  }

  const count = num(src.hijos);
  if (Number.isInteger(count) && count >= 0) out.mapped.childrenCount = count;
  if (out.mapped.childrenCount > 0) {
    Array.isArray(src.dependentDobs) && src.dependentDobs.length === count
      ? out.mapped.dependentDobs = src.dependentDobs.slice()
      : out.missing.push('dependentDobs');
  }

  const maternity = {'Sí / revisar aplicabilidad':'YES','No':'NO'}[src.maternidad];
  if (maternity) out.mapped.maternityPreference = maternity;
  if (nonEmpty(src.geographyPreference)) out.mapped.geographyPreference = src.geographyPreference;
  else if (src.territorio) out.notes.push('territorio is not silently converted to optional backend geographyPreference');
  contact(src, out);
  return finish(out);
}

function coTransport(src) {
  const out = base('co', 'transporte');
  const role = {
    'Transportador':'TRANSPORTER',
    'Generador / propietario de carga':'CARGO_GENERATOR',
    'Operador logístico':'LOGISTICS_OPERATOR',
    'Importador / exportador':'IMPORTER_EXPORTER'
  }[src.rolCadena];
  role ? out.mapped.operationRole = role : out.missing.push('operationRole');
  nonEmpty(src.coverageModeNeed) ? out.mapped.coverageModeNeed = src.coverageModeNeed : out.missing.push('coverageModeNeed');
  nonEmpty(src.carga) ? out.mapped.cargoTypeGeneral = src.carga : out.missing.push('cargoTypeGeneral');
  if (src.trayecto === 'Colombia') out.mapped.transitScope = 'NATIONAL';
  else if (nonEmpty(src.transitScope)) out.mapped.transitScope = src.transitScope;
  else out.missing.push('transitScope');
  Array.isArray(src.transportModes) && src.transportModes.length ? out.mapped.transportModes = src.transportModes.slice() : out.missing.push('transportModes');

  if (out.mapped.coverageModeNeed === 'SPECIFIC_SHIPMENT') {
    nonEmpty(src.origin) ? out.mapped.origin = src.origin.trim() : out.missing.push('origin');
    nonEmpty(src.destination) ? out.mapped.destination = src.destination.trim() : out.missing.push('destination');
    const value = num(src.valueToProtect);
    value !== undefined ? out.mapped.valueToProtect = value : out.missing.push('valueToProtect');
  }

  if (out.mapped.coverageModeNeed === 'ANNUAL_PROGRAM') {
    const maxValue = num(src.maxValuePerShipment);
    const annual = num(src.annualMovementBudget);
    maxValue !== undefined ? out.mapped.maxValuePerShipment = maxValue : out.missing.push('maxValuePerShipment');
    annual !== undefined ? out.mapped.annualMovementBudget = annual : out.missing.push('annualMovementBudget');
  }

  contact(src, out);
  return finish(out);
}

function coRcProfesional(src) {
  const out = base('co', 'rc_profesional');
  for (const key of ['needTrigger','applicantType','professionalActivity']) nonEmpty(src[key]) ? out.mapped[key] = src[key].trim() : out.missing.push(key);
  if (out.mapped.applicantType === 'LEGAL_ENTITY') nonEmpty(src.businessName) ? out.mapped.businessName = src.businessName.trim() : out.missing.push('businessName');
  if (nonEmpty(src.contractRequirementSummary)) out.mapped.contractRequirementSummary = src.contractRequirementSummary.trim();
  contact(src, out);
  return finish(out);
}

function mapPublicToBackend({country, product, data = {}} = {}) {
  const key = String(country || '').toLowerCase() + ':' + String(product || '').toLowerCase();
  if (key === 'gt:auto') return gtAuto(data);
  if (key === 'gt:salud') return gtHealth(data);
  if (key === 'co:transporte') return coTransport(data);
  if (key === 'co:rc_profesional') return coRcProfesional(data);
  const out = base(country, product);
  out.notes.push('No executable public-to-backend contract is certified for this route. Keep it consultative.');
  return out;
}

module.exports = Object.freeze({
  VERSION,
  AUTO_READY,
  RUNTIME_SIDE_EFFECTS_ALLOWED,
  EXECUTABLE,
  mapPublicToBackend
});
