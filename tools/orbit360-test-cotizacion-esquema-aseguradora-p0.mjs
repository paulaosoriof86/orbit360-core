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
  aseguradoraId: 'asg-demo', pais: 'GT', ramo: 'Autos', producto: 'Vehículos', tipoVehiculo: 'Automóvil',
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
assert(profile.secciones[3].tituloFuente === 'Coberturas Adicionales Plus', 'Debe conservar nombres particulares');
assert(profile.secciones[3].campos[1].etiquetaFuente === 'Asistencia para mascotas', 'Debe conservar beneficios no canónicos');
assert(profile.dimensiones.tipoVehiculo === 'Automóvil', 'Debe conservar dimensión tipo de vehículo');

const excelWithOutput = api.inspectTrainingSource({
  tipoFuente: 'cotizador_excel_salida', contieneHojaSalida: true, contieneTarifas: true, contieneReglasCalculo: true
});
assert(excelWithOutput.sirveParaTarifas === true, 'El cotizador Excel debe servir para tarifas');
assert(excelWithOutput.sirveParaReglas === true, 'El cotizador Excel debe servir para inferir reglas');
assert(excelWithOutput.sirveParaPresentacion === true, 'La hoja de salida debe servir para presentación');
assert(excelWithOutput.usos.includes('tarifas') && excelWithOutput.usos.includes('presentacion_cotizacion'), 'Una fuente puede tener varios usos');

const ratesOnly = api.inspectTrainingSource({
  tipoFuente: 'tarifario_excel', contieneTarifas: true
});
assert(ratesOnly.sirveParaTarifas === true, 'El tarifario debe servir para tarifas');
assert(ratesOnly.sirveParaPresentacion === false, 'El tarifario solo no define presentación');
assert(ratesOnly.requiereEjemploCotizacion === true, 'Las tasas sin formato deben requerir ejemplo');

const inventory = api.createKnowledgeInventory({
  aseguradoraId: 'asg-demo', pais: 'GT',
  fuentes: [
    {
      id: 'src-auto-xls', nombre: 'Cotizador autos.xlsx', tipoFuente: 'cotizador_excel_salida',
      ramo: 'Autos', producto: 'Vehículos', tipoVehiculo: 'Automóvil',
      contieneTarifas: true, contieneReglasCalculo: true, contieneHojaSalida: true, contieneAreaImpresion: true
    },
    {
      id: 'src-auto-pol-1', nombre: 'Poliza auto 1.pdf', tipoFuente: 'poliza_ejemplo',
      ramo: 'Autos', producto: 'Vehículos', tipoVehiculo: 'Automóvil'
    },
    {
      id: 'src-auto-pol-2', nombre: 'Poliza auto 2.pdf', tipoFuente: 'poliza_ejemplo',
      ramo: 'Autos', producto: 'Vehículos', tipoVehiculo: 'Automóvil'
    },
    {
      id: 'src-moto-xls', nombre: 'Cotizador motos.xlsx', tipoFuente: 'cotizador_excel_salida',
      ramo: 'Autos', producto: 'Vehículos', tipoVehiculo: 'Motocicleta',
      contieneTarifas: true, contieneReglasCalculo: true, contieneHojaSalida: false
    },
    {
      id: 'src-gm-xls', nombre: 'Cotizador gastos medicos.xlsx', tipoFuente: 'cotizador_excel_salida',
      ramo: 'Gastos Médicos', producto: 'Individual', segmento: 'Adulto',
      contieneTarifas: true, contieneReglasCalculo: true, contieneHojaSalida: true
    },
    {
      id: 'src-gm-quote-1', nombre: 'Cotizacion GM individual.pdf', tipoFuente: 'cotizacion_pdf_oficial',
      ramo: 'Gastos Médicos', producto: 'Individual', segmento: 'Adulto'
    },
    {
      id: 'src-gm-quote-2', nombre: 'Cotizacion GM familiar.pdf', tipoFuente: 'cotizacion_pdf_oficial',
      ramo: 'Gastos Médicos', producto: 'Familiar', segmento: 'Familia'
    }
  ]
});

assert(inventory.cantidadFuentes === 7, 'Debe conservar muchas fuentes por aseguradora');
assert(inventory.cantidadGrupos >= 4, 'Debe separar grupos por producto/segmento/tipo de vehículo');

const autoSources = api.sourcesForCombination(inventory, { ramo: 'Autos', producto: 'Vehículos', tipoVehiculo: 'Automóvil' });
const motoSources = api.sourcesForCombination(inventory, { ramo: 'Autos', producto: 'Vehículos', tipoVehiculo: 'Motocicleta' });
assert(autoSources.length === 3, 'Autos debe conservar varias pólizas y su cotizador');
assert(motoSources.length === 1, 'Motos debe quedar en grupo separado');

const autoGroup = inventory.grupos.find(g => g.dimensiones.tipoVehiculo === 'Automóvil');
const motoGroup = inventory.grupos.find(g => g.dimensiones.tipoVehiculo === 'Motocicleta');
assert(autoGroup.cantidadPolizasEjemplo === 2, 'Debe contar múltiples pólizas ejemplo');
assert(autoGroup.tieneFuenteTarifa === true && autoGroup.tieneFuentePresentacion === true, 'Autos debe quedar cubierto por su cotizador con salida');
assert(motoGroup.requiereEjemploCotizacion === true, 'Una cotización de Autos no debe completar Motos');

const gmIndividual = inventory.grupos.find(g => g.dimensiones.producto === 'Individual');
const gmFamiliar = inventory.grupos.find(g => g.dimensiones.producto === 'Familiar');
assert(gmIndividual.tieneFuenteTarifa === true && gmIndividual.tieneFuentePresentacion === true, 'GM individual puede combinar cotizador y cotización ejemplo');
assert(gmFamiliar.tieneFuentePresentacion === true && gmFamiliar.tieneFuenteTarifa === false, 'Una cotización ejemplo no inventa tarifas del producto familiar');

const training = api.createTrainingProfile({
  aseguradoraId: 'asg-demo', pais: 'GT', ramo: 'Autos', producto: 'Vehículos', tipoVehiculo: 'Automóvil',
  fuentes: autoSources
});
assert(training.cantidadFuentes === 3, 'El perfil debe admitir múltiples fuentes para la misma combinación');
assert(training.cantidadesPorTipo.poliza_ejemplo === 2, 'Debe conservar cantidad por tipo de fuente');

const quote = api.attachPresentationToQuote({ id: 'cot-1', valores: { primaTotal: 1000 } }, profile);
assert(quote.presentacionAseguradora.secciones.length === 5, 'La cotización debe conservar toda la presentación');
const flat = api.flattenCanonicalFields(profile);
assert(flat.responsabilidad_civil === 'Q 500,000', 'Debe exponer valores canónicos sin perder estructura');

console.log('OK orbit360-test-cotizacion-esquema-aseguradora-p0');
