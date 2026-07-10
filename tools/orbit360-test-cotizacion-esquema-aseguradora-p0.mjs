import fs from 'node:fs';
import vm from 'node:vm';

const file = 'orbit360-platform/core/cotizacion-esquema-aseguradora-p0.js';
const code = fs.readFileSync(file, 'utf8');
const context = { window: {}, console, Date };
context.window.window = context.window;
vm.createContext(context);
vm.runInContext(code, context);
const api = context.window.Orbit.cotizacionEsquemaAseguradoraP0;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const profile = api.normalizePresentation({
  aseguradoraId: 'asg-demo', pais: 'GT', ramo: 'Autos', producto: 'Vehículos',
  cotizadorFuenteId: 'xls-demo', plantillaVersion: 'v3',
  secciones: [
    { tituloFuente: 'Sección I — Daños Propios al Vehículo Asegurado', orden: 1, campos: [
      { etiquetaFuente: 'Colisión y vuelco', claveCanonica: 'danos_propios', valorFuente: 'Incluido', orden: 1 }
    ] },
    { tituloFuente: 'Sección II — Responsabilidad Civil', orden: 2, campos: [
      { etiquetaFuente: 'Daños a terceros', claveCanonica: 'responsabilidad_civil', valorFuente: 'Q 500,000', orden: 1 }
    ] },
    { tituloFuente: 'Sección III — Lesiones a Ocupantes', orden: 3, campos: [
      { etiquetaFuente: 'Gastos médicos por persona', claveCanonica: 'gastos_medicos_ocupantes', valorFuente: 'Q 25,000', orden: 1 }
    ] },
    { tituloFuente: 'Coberturas Adicionales Plus', orden: 4, campos: [
      { etiquetaFuente: 'Llaves electrónicas', valorFuente: 'Hasta Q 3,000', orden: 1 },
      { etiquetaFuente: 'Asistencia para mascotas', valorFuente: 'Hasta Q 5,000', orden: 2 }
    ] },
    { tituloFuente: 'Exclusiones particulares', orden: 5, campos: [
      { etiquetaFuente: 'Uso no declarado', valorFuente: 'Excluido', orden: 1 }
    ] }
  ]
});

assert(api.validatePresentation(profile).valid === true, 'La presentación completa debe validar');
assert(profile.secciones[0].tituloFuente.includes('Sección I'), 'Debe conservar el título original de Sección I');
assert(profile.secciones[3].tituloFuente === 'Coberturas Adicionales Plus', 'Debe conservar nombres particulares de la aseguradora');
assert(profile.secciones[3].campos[1].etiquetaFuente === 'Asistencia para mascotas', 'Debe conservar beneficios no canónicos');
assert(profile.secciones.map(s => s.orden).join(',') === '1,2,3,4,5', 'Debe conservar el orden de las secciones');

const excelWithOutput = api.inspectTrainingSource({
  tipoFuente: 'cotizador_excel_salida', contieneHojaSalida: true, contieneTarifas: true
});
assert(excelWithOutput.sirveParaTarifas === true, 'El cotizador Excel debe servir para tarifas');
assert(excelWithOutput.sirveParaPresentacion === true, 'La hoja de salida del Excel debe servir para presentación');
assert(excelWithOutput.requiereEjemploCotizacion === false, 'No debe exigir PDF adicional si el Excel contiene la salida completa');

const ratesOnly = api.inspectTrainingSource({
  tipoFuente: 'tarifario_excel', contieneTarifas: true
});
assert(ratesOnly.sirveParaTarifas === true, 'El tarifario debe servir para tarifas');
assert(ratesOnly.sirveParaPresentacion === false, 'El tarifario solo no define la presentación completa');
assert(ratesOnly.requiereEjemploCotizacion === true, 'Las tasas sin formato deben requerir un ejemplo de cotización');

const training = api.createTrainingProfile({
  aseguradoraId: 'asg-demo', pais: 'GT', ramo: 'Autos', producto: 'Vehículos',
  fuentes: [
    { tipoFuente: 'tarifario_excel', contieneTarifas: true, documentoFuenteId: 'doc-rate' },
    { tipoFuente: 'cotizacion_pdf_oficial', documentoFuenteId: 'doc-quote' }
  ]
});
assert(training.tieneFuenteTarifa === true, 'El perfil debe reconocer la fuente tarifaria');
assert(training.tieneFuentePresentacion === true, 'El perfil debe reconocer el ejemplo oficial de presentación');
assert(training.requiereEjemploCotizacion === false, 'Con ejemplo oficial no debe quedar pendiente de presentación');

const quote = api.attachPresentationToQuote({ id: 'cot-1', valores: { primaTotal: 1000 } }, profile);
assert(quote.presentacionAseguradora.secciones.length === 5, 'La cotización debe conservar toda la presentación por aseguradora');
const flat = api.flattenCanonicalFields(profile);
assert(flat.responsabilidad_civil === 'Q 500,000', 'Debe exponer valores canónicos sin perder la estructura fuente');

console.log('OK orbit360-test-cotizacion-esquema-aseguradora-p0');