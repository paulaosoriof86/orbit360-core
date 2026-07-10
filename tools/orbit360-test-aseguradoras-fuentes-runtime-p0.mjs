import fs from 'node:fs';
import vm from 'node:vm';

const file = 'orbit360-platform/modules/aseguradoras.js';
const code = fs.readFileSync(file, 'utf8');
const Orbit = { ui: {}, kit: {}, store: {}, modules: {} };
const context = { window: { Orbit }, Orbit, console, Date, Math, Set };
context.window.window = context.window;
vm.createContext(context);
vm.runInContext(code, context);
const api = context.Orbit.modules.aseguradoras._fuentes;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const legacyRate = api.normalizarFuente({ nombre: 'Tarifas autos.xlsx', cat: 'Tarifas' }, { pais: 'GT' });
assert(legacyRate.tipoFuente === 'tarifario_excel', 'Tarifa XLSX legacy debe normalizarse como tarifario_excel');
assert(legacyRate.pais === 'GT', 'Debe heredar país de aseguradora');
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
assert(excelEval.sirveParaTarifas === true && excelEval.sirveParaPresentacion === true, 'Cotizador Excel con salida debe servir para tarifa y presentación');

const pdfQuote = api.normalizarFuente({ nombre: 'Cotizacion oficial.pdf', cat: 'Cotización ejemplo', pais: 'GT' });
assert(pdfQuote.tipoFuente === 'cotizacion_pdf_oficial', 'Cotización PDF debe conservar tipo correcto');
assert(api.evaluarFuente(pdfQuote).sirveParaPresentacion === true, 'Cotización PDF debe servir para presentación');

const incomplete = api.resumenFuentes([legacyRate], { pais: 'GT' });
assert(incomplete.tieneTarifa === true && incomplete.tienePresentacion === false && incomplete.requiereEjemplo === true, 'Solo tarifa debe quedar fuentes_incompletas');
assert(incomplete.estado === 'fuentes_incompletas', 'Estado de fuente incompleta incorrecto');

const complete = api.resumenFuentes([legacyRate, pdfQuote], { pais: 'GT' });
assert(complete.tieneTarifa === true && complete.tienePresentacion === true && complete.requiereEjemplo === false, 'Tarifa + cotización oficial debe completar inventario');

const manualUnchecked = api.normalizarFuente({
  nombre: 'Libro sin salida.xlsx', tipoFuente: 'cotizador_excel_salida',
  contieneTarifas: false, contieneReglasCalculo: false, contieneHojaSalida: false,
  contieneFormatoCotizacion: false, contieneAreaImpresion: false
});
assert(manualUnchecked.contieneTarifas === false && manualUnchecked.contieneHojaSalida === false, 'Los flags explícitos false no deben reactivarse por defecto');

const commercial = api.normalizarFuente({ nombre: 'Brochure.pdf', cat: 'Comercial', pais: 'CO' });
assert(commercial.tipoFuente === 'documento_comercial', 'Documento comercial no debe clasificarse como cotización');
assert(api.evaluarFuente(commercial).sirveParaTarifas === false, 'Documento comercial no debe activar tarifas');

console.log('OK orbit360-test-aseguradoras-fuentes-runtime-p0');
