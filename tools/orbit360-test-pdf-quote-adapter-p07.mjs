import fs from 'node:fs';
import vm from 'node:vm';

const orbit = {};
const context = {
  window: { Orbit: orbit }, Orbit: orbit, console, Date, Math, Set, Array,
  String, Object, JSON, Number, Promise
};
context.window.window = context.window;
vm.createContext(context);
for (const file of [
  'orbit360-platform/core/document-source-contract-p04.js',
  'orbit360-platform/core/cotizacion-esquema-aseguradora-p0.js',
  'orbit360-platform/core/pdf-quote-adapter-p07.js'
]) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
}

const api = orbit.pdfQuoteAdapterP07;
function assert(condition, message) { if (!condition) throw new Error(message); }
const insurerA = [{ id: 'insurer-a', name: 'Compañía Alfa', confidence: 97, source: 'directory_match' }];
const insurerB = [{ id: 'insurer-b', name: 'Compañía Beta', confidence: 96, source: 'directory_match' }];
const loc = (page, block) => ({ page, block, bbox: { x: 10, y: 10, width: 100, height: 20 } });

const auto = api.buildQuoteProfile({
  tenantId: 'tenant-demo', documentId: 'doc-auto', fileRef: 'file-ref-auto', sourceHash: 'hash-auto',
  purpose: 'training', insurerCandidates: insurerA, pais: 'GT', moneda: 'GTQ', ramo: 'Vehículos',
  producto: 'Seguro de automóvil', tipoVehiculo: 'Automóvil', usoVehiculo: 'Particular', plan: 'Plan Premium',
  confidence: 94,
  pages: [
    { number: 1, width: 596, height: 843, blocks: [{ kind: 'heading', title: 'FORMAS DE PAGO', order: 1 }, { kind: 'table', order: 2, rows: [['Pago de contado', 'Q 0.00'], ['10 pagos', 'Q 0.00']] }] },
    { number: 2, width: 596, height: 843, blocks: [{ kind: 'heading', title: 'COBERTURAS', order: 1 }, { kind: 'heading', title: 'Sección I', order: 2 }, { kind: 'table', order: 3, rows: [['Daños', '3% / mínimo']] }] }
  ],
  sections: [
    { title: 'Datos del vehículo', page: 1, order: 1, fields: [
      { label: 'Cliente', value: 'Persona de ejemplo', sourceLocation: loc(1, 'cliente') },
      { label: 'Teléfono', value: '00000000', sourceLocation: loc(1, 'telefono') },
      { label: 'Tipo', value: 'Automóvil', sourceLocation: loc(1, 'tipo') },
      { label: 'Suma Asegurada', value: 'Q 35,000.00', sourceLocation: loc(1, 'suma') }
    ] },
    { title: 'FORMAS DE PAGO', page: 1, order: 2, fields: [
      { label: 'Pago de contado', value: 'Q 3,000.00', sourceLocation: loc(1, 'contado') },
      { label: 'Visa Cuotas', value: '3 / 6 / 10', sourceLocation: loc(1, 'visa') }
    ] },
    { title: 'Sección I', page: 2, order: 3, fields: [
      { label: 'Daños propios', value: '3% / mínimo', sourceLocation: loc(2, 'sec1') }
    ] },
    { title: 'Sección II', page: 2, order: 4, fields: [
      { label: 'Responsabilidad Civil', value: 'Límite A', sourceLocation: loc(2, 'sec2') }
    ] },
    { title: 'Sección III', page: 2, order: 5, fields: [
      { label: 'Gastos médicos', value: 'Límite B', sourceLocation: loc(2, 'sec3') }
    ] },
    { title: 'COBERTURAS ADICIONALES', page: 2, order: 6, fields: [
      { label: 'Deducible cero', value: 'Amparado', sourceLocation: loc(2, 'deducible') }
    ] },
    { title: 'BENEFICIOS ADICIONALES DE ASISTENCIA VIAL', page: 2, order: 7, fields: [
      { label: 'Grúa', value: 'Eventos limitados', sourceLocation: loc(2, 'grua') }
    ] }
  ]
});

const microbus = api.buildQuoteProfile({
  tenantId: 'tenant-demo', documentId: 'doc-microbus', fileRef: 'file-ref-microbus', sourceHash: 'hash-microbus',
  purpose: 'training', insurerCandidates: insurerA, pais: 'GT', moneda: 'GTQ', ramo: 'Vehículos',
  producto: 'Seguro de automóvil', tipoVehiculo: 'Microbús hasta 9 pasajeros', usoVehiculo: 'Particular', plan: 'Plan Premium',
  confidence: 93,
  pages: [{ number: 1, blocks: [{ kind: 'heading', title: 'FORMAS DE PAGO' }] }, { number: 2, blocks: [{ kind: 'heading', title: 'COBERTURAS' }] }],
  sections: [
    { title: 'Datos del vehículo', page: 1, order: 1, fields: [{ label: 'Tipo', value: 'Microbús', sourceLocation: loc(1, 'tipo') }] },
    { title: 'FORMAS DE PAGO', page: 1, order: 2, fields: [{ label: 'Pago de contado', value: 'Q 2,000.00', sourceLocation: loc(1, 'contado') }] },
    { title: 'Sección I', page: 2, order: 3, fields: [{ label: 'Daños propios', value: '3% / mínimo diferente', sourceLocation: loc(2, 'sec1') }] },
    { title: 'Sección II', page: 2, order: 4, fields: [{ label: 'Responsabilidad Civil', value: 'Límite superior', sourceLocation: loc(2, 'sec2') }] },
    { title: 'Sección III', page: 2, order: 5, fields: [{ label: 'Gastos médicos', value: 'Límite superior', sourceLocation: loc(2, 'sec3') }] },
    { title: 'COBERTURAS ADICIONALES', page: 2, order: 6, fields: [{ label: 'Daño de chapas', value: 'Amparado con deducible', sourceLocation: loc(2, 'chapas') }] },
    { title: 'BENEFICIOS ADICIONALES DE ASISTENCIA VIAL', page: 2, order: 7, fields: [{ label: 'Grúa', value: 'Eventos ampliados', sourceLocation: loc(2, 'grua') }] }
  ]
});

const otherInsurer = api.buildQuoteProfile({
  tenantId: 'tenant-demo', documentId: 'doc-other', fileRef: 'file-ref-other', sourceHash: 'hash-other',
  purpose: 'training', insurerCandidates: insurerB, pais: 'GT', moneda: 'GTQ', ramo: 'Vehículos',
  producto: 'Todo riesgo de vehículo', tipoVehiculo: 'Camioneta agrícola', usoVehiculo: 'Particular', plan: 'Riesgo Plus',
  confidence: 92,
  pages: [
    { number: 1, width: 612, height: 792, blocks: [{ kind: 'heading', title: 'OPCIONES DE PAGO' }, { kind: 'heading', title: 'COBERTURAS PRINCIPALES' }] },
    { number: 2, width: 612, height: 792, blocks: [], blank: true },
    { number: 3, width: 612, height: 792, blocks: [{ kind: 'heading', title: 'PASOS PARA CONTRATAR EL SEGURO' }, { kind: 'heading', title: 'IMPORTANTE' }] },
    { number: 4, width: 612, height: 792, blocks: [], blank: true }
  ],
  sections: [
    { title: 'OPCIONES DE PAGO', page: 1, order: 1, fields: [{ label: 'Prima neta', value: 'Q 0.00', sourceLocation: loc(1, 'prima') }] },
    { title: 'COBERTURAS PRINCIPALES', page: 1, order: 2, fields: [{ label: 'Daños propios', value: 'Todo riesgo', sourceLocation: loc(1, 'danos') }] },
    { title: 'COBERTURAS ADICIONALES PLUS', page: 1, order: 3, fields: [{ label: 'Cobertura de llantas', value: 'Beneficio', sourceLocation: loc(1, 'llantas') }] },
    { title: 'PASOS PARA CONTRATAR EL SEGURO', page: 3, order: 4, fields: [{ label: 'Paso 1', value: 'Cotización aceptada', sourceLocation: loc(3, 'paso1') }] },
    { title: 'COBERTURAS ADICIONALES INCLUIDAS', page: 3, order: 5, fields: [{ label: 'Asistencia vial', value: 'Incluida', sourceLocation: loc(3, 'asistencia') }] },
    { title: 'IMPORTANTE', page: 3, order: 6, fields: [{ label: 'Territorio cubierto', value: 'Región definida', sourceLocation: loc(3, 'territorio') }] },
    { title: 'COTIZACIÓN VÁLIDA HASTA', page: 3, order: 7, fields: [{ label: 'Vigencia', value: 'Fecha de ejemplo', sourceLocation: loc(3, 'vigencia') }] }
  ]
});

assert(api.validateQuoteProfile(auto).valid, 'Perfil de automóvil debe validar');
assert(api.validateQuoteProfile(microbus).valid, 'Perfil de microbús debe validar');
const otherValidation = api.validateQuoteProfile(otherInsurer);
assert(otherValidation.valid && otherValidation.warnings.includes('PAGINAS_VACIAS_DETECTADAS'), 'Debe conservar advertencia de páginas vacías sin invalidar el documento');

const autoClient = auto.presentation.secciones[0].campos.find(field => field.etiquetaFuente === 'Cliente');
const autoPhone = auto.presentation.secciones[0].campos.find(field => field.etiquetaFuente === 'Teléfono');
const insuredValue = auto.presentation.secciones[0].campos.find(field => field.etiquetaFuente === 'Suma Asegurada');
assert(autoClient.valorFuente === '[valor_sensible_omitido]' && autoPhone.valorFuente === '[valor_sensible_omitido]', 'Modo training debe omitir PII');
assert(insuredValue.valorFuente === 'Q 35,000.00', 'Valores técnicos no sensibles deben conservarse');

const families = api.buildTemplateFamily([auto, microbus, otherInsurer]);
assert(families.length === 2, 'Dos aseguradoras deben formar familias separadas');
const familyA = families.find(family => family.profiles.includes(auto.id));
assert(familyA.profiles.length === 2 && familyA.requiresVariantRouting, 'Automóvil y microbús de la misma aseguradora deben ser variantes separadas');
assert(familyA.mergeProfiles === false, 'No debe fusionar variantes en una plantilla plana');
assert(familyA.commonSections.includes('seccion_1') && familyA.commonSections.includes('formas_pago'), 'Debe detectar secciones comunes');
assert(api.variantKey(auto) !== api.variantKey(microbus), 'Tipo de vehículo debe cambiar la variante');

const insurerResolution = api.resolveInsurer([
  { id: 'insurer-a', name: 'Compañía Alfa', confidence: 82 },
  { id: 'insurer-b', name: 'Compañía Beta', confidence: 80 }
]);
assert(insurerResolution.requiresHumanValidation && !insurerResolution.candidate, 'Coincidencia ambigua debe requerir validación');

const request = api.buildProviderRequest({ tenantId: 'tenant-demo', documentId: 'doc-x', fileRef: 'ref-x', purpose: 'training', includeSensitiveValues: true });
assert(request.includeLayout && request.includeTables && request.includeImages && request.detectLogos, 'Provider debe solicitar texto, layout, tablas e imágenes');
assert(request.includeSensitiveValues === false && request.returnRawBytes === false && request.returnBase64 === false && request.executeEmbeddedContent === false, 'Training no debe devolver PII, bytes, base64 ni ejecutar contenido');

const diff = api.buildProfileDiff(auto, microbus);
assert(Array.isArray(diff) && diff.length > 0, 'Variantes diferentes deben producir diff');
const serialized = JSON.stringify({ auto, microbus, otherInsurer, families });
assert(!/Persona de ejemplo|00000000/.test(serialized), 'No debe quedar PII de entrenamiento en el perfil');
assert(!/"password"\s*:|"token"\s*:|"rawPayload"\s*:|"binaryPayload"\s*:/.test(serialized), 'No debe incorporar valores de secretos ni payloads binarios');
console.log('OK orbit360-test-pdf-quote-adapter-p07');