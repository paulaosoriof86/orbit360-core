import fs from 'node:fs';
import vm from 'node:vm';

const file = 'orbit360-platform/modules/aseguradoras.js';
const code = fs.readFileSync(file, 'utf8');
const Orbit = {
  ui: { esc: value => String(value == null ? '' : value), today: () => '2026-07-10' },
  kit: {},
  store: {},
  modules: {}
};
const context = { window: { Orbit }, Orbit, console, Date, Math, Set, Array, String, Object, document: {} };
context.window.window = context.window;
vm.createContext(context);
vm.runInContext(code, context);
const api = context.Orbit.modules.aseguradoras._fuentes;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const legacyRate = api.normalizarFuente({ nombre: 'Tarifas autos.xlsx', cat: 'Tarifas' }, { pais: 'GT' });
assert(legacyRate.tipoFuente === 'tarifario_excel', 'Tarifa XLSX legacy debe normalizarse como tarifario_excel');
assert(legacyRate.pais === 'GT' && legacyRate.moneda === 'GTQ', 'Debe heredar país y moneda de aseguradora');
const rateEval = api.evaluarFuente(legacyRate);
assert(rateEval.sirveParaTarifas === true, 'Tarifario debe servir para tarifas');
assert(rateEval.sirveParaPresentacion === false, 'Tarifario sin salida no debe servir para presentación');
assert(rateEval.requiereEjemploCotizacion === true, 'Tarifario debe requerir cotización ejemplo');

const excelOutput = api.normalizarFuente({
  nombre: 'Cotizador autos.xlsx', tipoFuente: 'cotizador_excel_salida', pais: 'GT',
  contieneTarifas: true, contieneReglasCalculo: true, contieneHojaSalida: true,
  contieneFormatoCotizacion: true, contieneAreaImpresion: true
});
const excelEval = api.evaluarFuente(excelOutput);
assert(excelEval.sirveParaTarifas === true && excelEval.sirveParaReglas === true, 'Cotizador Excel debe servir para tarifas y reglas');
assert(excelEval.sirveParaPresentacion === true, 'Cotizador Excel con salida debe servir para presentación');
assert(excelEval.usos.includes('tarifas') && excelEval.usos.includes('presentacion_cotizacion'), 'Una fuente debe poder tener varios usos');

const pdfQuote = api.normalizarFuente({ nombre: 'Cotizacion oficial.pdf', cat: 'Cotización ejemplo', pais: 'GT' });
assert(pdfQuote.tipoFuente === 'cotizacion_pdf_oficial', 'Cotización PDF debe conservar tipo correcto');
assert(api.evaluarFuente(pdfQuote).sirveParaPresentacion === true, 'Cotización PDF debe servir para presentación');

const incomplete = api.resumenFuentes([legacyRate], { pais: 'GT' });
assert(incomplete.tieneTarifa === true && incomplete.tienePresentacion === false && incomplete.requiereEjemplo === true, 'Solo tarifa debe quedar fuentes_incompletas');
assert(incomplete.estado === 'fuentes_incompletas', 'Estado de fuente incompleta incorrecto');

const complete = api.resumenFuentes([legacyRate, pdfQuote], { pais: 'GT' });
assert(complete.tieneTarifa === true && complete.tienePresentacion === true && complete.requiereEjemplo === false, 'Tarifa + cotización oficial debe completar inventario general');

const manualUnchecked = api.normalizarFuente({
  nombre: 'Libro sin salida.xlsx', tipoFuente: 'cotizador_excel_salida',
  contieneTarifas: false, contieneReglasCalculo: false, contieneHojaSalida: false,
  contieneFormatoCotizacion: false, contieneAreaImpresion: false
});
assert(manualUnchecked.contieneTarifas === false && manualUnchecked.contieneHojaSalida === false, 'Los flags explícitos false no deben reactivarse por defecto');
assert(api.evaluarFuente(manualUnchecked).sirveParaPresentacion === false, 'Cotizador sin salida confirmada no debe completar presentación');

const commercial = api.normalizarFuente({ nombre: 'Brochure.pdf', cat: 'Comercial', pais: 'CO' });
assert(commercial.tipoFuente === 'documento_comercial', 'Documento comercial no debe clasificarse como cotización');
assert(api.evaluarFuente(commercial).sirveParaTarifas === false, 'Documento comercial no debe activar tarifas');

const docs = [
  {
    nombre: 'Cotizador autos.xlsx', tipoFuente: 'cotizador_excel_salida', pais: 'GT', ramo: 'Autos', producto: 'Vehículos', tipoVehiculo: 'Automóvil',
    contieneTarifas: true, contieneReglasCalculo: true, contieneHojaSalida: true, contieneFormatoCotizacion: true, contieneAreaImpresion: true
  },
  { nombre: 'Póliza auto 1.pdf', tipoFuente: 'poliza_ejemplo', pais: 'GT', ramo: 'Autos', producto: 'Vehículos', tipoVehiculo: 'Automóvil' },
  { nombre: 'Póliza auto 2.pdf', tipoFuente: 'poliza_ejemplo', pais: 'GT', ramo: 'Autos', producto: 'Vehículos', tipoVehiculo: 'Automóvil' },
  {
    nombre: 'Cotizador motos.xlsx', tipoFuente: 'cotizador_excel_salida', pais: 'GT', ramo: 'Autos', producto: 'Vehículos', tipoVehiculo: 'Motocicleta',
    contieneTarifas: true, contieneReglasCalculo: true, contieneHojaSalida: false, contieneFormatoCotizacion: false, contieneAreaImpresion: false
  },
  {
    nombre: 'Cotizador gastos médicos.xlsx', tipoFuente: 'cotizador_excel_salida', pais: 'GT', ramo: 'Gastos Médicos', producto: 'Individual', segmento: 'Adulto',
    contieneTarifas: true, contieneReglasCalculo: true, contieneHojaSalida: true, contieneFormatoCotizacion: true, contieneAreaImpresion: true
  },
  { nombre: 'Cotización GM individual.pdf', tipoFuente: 'cotizacion_pdf_oficial', pais: 'GT', ramo: 'Gastos Médicos', producto: 'Individual', segmento: 'Adulto' },
  { nombre: 'Cotización GM familiar.pdf', tipoFuente: 'cotizacion_pdf_oficial', pais: 'GT', ramo: 'Gastos Médicos', producto: 'Familiar', segmento: 'Familia' }
];

const groups = api.resumenGrupos(docs, { pais: 'GT', ramos: ['Autos', 'Gastos Médicos'] });
assert(groups.total === 4, 'Debe separar Autos, Motos, GM individual y GM familiar');
const autoGroup = groups.grupos.find(group => group.dimensiones.tipoVehiculo === 'Automóvil');
const motoGroup = groups.grupos.find(group => group.dimensiones.tipoVehiculo === 'Motocicleta');
const gmIndividual = groups.grupos.find(group => group.dimensiones.producto === 'Individual');
const gmFamiliar = groups.grupos.find(group => group.dimensiones.producto === 'Familiar');
assert(autoGroup.total === 3 && autoGroup.polizasEjemplo === 2, 'Autos debe conservar varias pólizas y su cotizador');
assert(autoGroup.tieneTarifa && autoGroup.tienePresentacion, 'Autos debe quedar cubierto por su propia salida');
assert(motoGroup.requiereEjemplo === true, 'Una cotización de Autos no debe completar Motos');
assert(gmIndividual.tieneTarifa && gmIndividual.tienePresentacion, 'GM individual puede combinar cotizador y cotización ejemplo');
assert(gmFamiliar.tienePresentacion && !gmFamiliar.tieneTarifa, 'Una cotización familiar no debe inventar tarifas');

const advanced = api.normalizarFuente({
  nombre: 'Motos.xlsx', tipoFuente: 'cotizador_excel_salida', pais: 'GT', moneda: 'GTQ', ramo: 'Autos', producto: 'Vehículos',
  familiaProducto: 'Vehículos terrestres', subtipoProducto: 'Motos', segmento: 'Particular', tipoRiesgo: 'Daños',
  tipoVehiculo: 'Motocicleta', usoVehiculo: 'Particular', plan: 'Completo'
}, { pais: 'GT' });
assert(advanced.familiaProducto === 'Vehículos terrestres' && advanced.usoVehiculo === 'Particular', 'Debe conservar dimensiones avanzadas');
assert(api.sourceCombinationKey(advanced).includes('motocicleta'), 'La clave de combinación debe incluir el tipo de vehículo');

console.log('OK orbit360-test-aseguradoras-fuentes-runtime-p0');
