#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cp = require('child_process');

const root = path.resolve(process.argv[2] || path.join(process.cwd(), 'orbit360-platform'));
const failures = [];
const warnings = [];
const passes = [];

function rel(p) { return path.join(root, p); }
function exists(p) { return fs.existsSync(rel(p)); }
function read(p) { return exists(p) ? fs.readFileSync(rel(p), 'utf8') : ''; }
function sha256(p) { return crypto.createHash('sha256').update(fs.readFileSync(rel(p))).digest('hex'); }
function check(id, condition, message, file) {
  (condition ? passes : failures).push({ id, message, file: file || '' });
}
function warn(id, condition, message, file) {
  if (!condition) warnings.push({ id, message, file: file || '' });
}
function contains(src, patterns) {
  return patterns.every(pattern => typeof pattern === 'string' ? src.includes(pattern) : pattern.test(src));
}

const files = {
  contract: 'core/quote-comparison-contracts-v1203.js',
  refinements: 'core/quote-comparison-contracts-v1203-refinements.js',
  cotizador: 'modules/cotizador-v1203-source-gate.js',
  comparativo: 'modules/comparativo-v1203-operational-bridge.js',
  renewals: 'modules/renewals-v1200-operational-bridge.js',
  ops: 'modules/ops.js',
  leads: 'modules/leads.js',
  opsBridge: 'modules/ops-workflows-v1201-bridge.js'
};

Object.entries(files).forEach(([key, file]) => check('FILE_' + key.toUpperCase(), exists(file), 'Archivo requerido presente', file));

const ref = read(files.refinements);
const contract = read(files.contract);
const cot = read(files.cotizador);
const cmp = read(files.comparativo);
const ren = read(files.renewals);
const opsBridge = read(files.opsBridge);

check('BREAKDOWN_EPS', contains(ref, ['const EPS = 0.51', 'desglose_prima_no_cuadra']), 'Tolerancia absoluta 0.51 y bloqueo de descuadre', files.refinements);
check('BREAKDOWN_STRUCTURED', contains(ref, ['gastoEmision', 'gastoFinanciamiento', 'gastoOtros', 'impuestoOtros']), 'Desglose independiente de neta, gastos e impuestos', files.refinements);
check('BREAKDOWN_NO_TAUTOLOGY', !/total\s*-\s*(?:neta|primaNeta)\s*-\s*(?:iva|impuestos)/.test(ref), 'No reconstruye gastos desde el total', files.refinements);
check('INTERNAL_STATE', contains(ref, ['estimacion_interna', 'revisada_interna']), 'Estimación interna conserva estado no elegible', files.refinements);
check('INTERNAL_GATES', contains(ref, ['estimacion_interna_no_elegible', 'comparativo_contiene_estimaciones_internas', 'elegibleEmision: false']), 'Estimación interna bloqueada en comparación y emisión', files.refinements);
check('PERSIST_STORE', contains(ref, ["Orbit.store.get('cotizaciones'", "Orbit.store.update('cotizaciones'", "Orbit.store.insert('cotizaciones'"]), 'Persistencia exclusiva mediante Orbit.store', files.refinements);
check('CONTRACT_STRUCTURED', contains(contract, ['gastos:expenses', 'impuestos:taxes', 'primaNeta:net', 'primaTotal:total']), 'Contrato normalizado conserva desglose estructurado', files.contract);
check('RATE_DEFAULT_DENY', contains(contract, ['automaticAvailability', 'configuracion_tarifa_validada_no_disponible', 'fuentes_validadas_insuficientes']), 'Cálculo automático bloqueado sin fuente/tarifa validadas', files.contract);
check('COT_STORE_IDS', contains(cot, ['Q.persistQuote', "S().insert('quoteTransfers'", 'cotizacionIds']), 'Cotizador persiste y transfiere IDs canónicos', files.cotizador);
check('COT_PREPARED', contains(cot, ["tipo:'Cotización preparada'", "estadoComercial:'preparado'"]), 'Cotizador diferencia preparado de enviado', files.cotizador);
check('CMP_VALID_ONLY', contains(cmp, ['Q.validateQuote(q, { requireValidated:true }).ok', 'La propuesta seleccionada no está validada']), 'Comparativo solo opera con cotizaciones validadas', files.comparativo);
check('CMP_ISSUANCE', contains(cmp, ['acceptedOffer', 'Solicitud de emisión creada en Ops', 'Aún no existe una póliza emitida']), 'Aceptación crea solicitud de emisión y no póliza', files.comparativo);
check('RENEWAL_PREPARED', contains(ren, ['Preparar campaña de renovación', 'seguimiento(s) preparados; no enviados']), 'Renovaciones no simula envíos', files.renewals);
check('OPS_TYPED', contains(opsBridge, ["workflowType === 'issuance_request'", "def.nombre === 'Emisiones'"]), 'Ops integra solicitudes de emisión tipadas', files.opsBridge);

const selected = Object.values(files).filter(exists);
selected.forEach(file => {
  const src = read(file);
  check('NO_DIRECT_STORAGE_' + file.replace(/\W+/g, '_'), !/\b(?:localStorage|sessionStorage)\b/.test(src), 'Sin almacenamiento operativo directo', file);
});

const protectedExpected = {
  'data/store.js': '1ec42cf35458c607333a494c4fd7fa74e04101869185423d8cd71ae8098fd838',
  'core/auth.js': '756b7ec6ad4788b3d77fe09b5ac7f706c9deb62cd44459bd06a2ac5284c5d230',
  'core/importa.js': 'fbdc378d709aeb6816418d8c4d5dd0627675d6919caed887f45494fbf319e0df'
};
Object.entries(protectedExpected).forEach(([file, expected]) => {
  check('PROTECTED_' + file.replace(/\W+/g, '_'), exists(file) && sha256(file) === expected, 'Archivo protegido byte-identical', file);
});

selected.filter(file => /\.(?:js|mjs)$/.test(file)).forEach(file => {
  const run = cp.spawnSync(process.execPath, ['--check', rel(file)], { encoding: 'utf8' });
  check('SYNTAX_' + file.replace(/\W+/g, '_'), run.status === 0, run.status === 0 ? 'Sintaxis válida' : String(run.stderr || run.stdout).trim(), file);
});

warn('CACHE_BUST', /quote-comparison-contracts-v1203-refinements\.js\?v=(?:20260712|v1215|20260712-v1215)/.test(read('index.html')),
  'Actualizar cache-bust de refinamientos antes del smoke visual local', 'index.html');
warn('VISUAL_EVIDENCE', false, 'Adjuntar reporte visual del módulo probado en 1366, 768 y 390 px', 'docs');

const result = {
  validator: 'orbit360-validar-cierre-cotizador-comparativo-v1215',
  root,
  generatedAt: new Date().toISOString(),
  summary: { pass: passes.length, fail: failures.length, warn: warnings.length },
  passes,
  failures,
  warnings
};
console.log(JSON.stringify(result, null, 2));
process.exit(failures.length ? 1 : 0);
