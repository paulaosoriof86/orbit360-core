#!/usr/bin/env node
/*
  Orbit 360 A&S — P0 safe patch importador de polizas
  Fecha: 2026-07-09

  Objetivo:
  - Ajustar core/importa.js de forma aditiva para reglas P0 de polizas.
  - No tocar backend protegido.
  - No insertar datos reales.
  - Crear backup local y reporte.

  Uso local desde raiz del repo:
    node tools/orbit360-p0-polizas-importador-safe-patch-20260709.mjs
*/

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const RUN_ID = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
const TARGET = 'orbit360-platform/core/importa.js';
const BACKUP_DIR = path.join(ROOT, '_backups', `p0_polizas_importador_${RUN_ID}`);
const REPORT_DIR = path.join(ROOT, '_orbit360_reports');
const PROTECTED = [
  'orbit360-platform/data/store.js',
  'orbit360-platform/data/store-firestore-lab.local.js',
  'orbit360-platform/core/backend-lab-loader.js',
  'orbit360-platform/core/backend-lab-init.js',
  'orbit360-platform/core/backend-lab-security-guard.js',
  'firestore.rules'
];

function rel(p) { return p.replace(/\\/g, '/'); }
function mustExist(file) {
  const abs = path.join(ROOT, file);
  if (!fs.existsSync(abs)) throw new Error(`No existe ${file}`);
  return abs;
}
function assertNotProtected(file) {
  if (PROTECTED.includes(rel(file))) throw new Error(`Archivo protegido bloqueado: ${file}`);
}
function backup(file) {
  const src = path.join(ROOT, file);
  const dst = path.join(BACKUP_DIR, file);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}
function replaceOnce(src, needle, replacement, label, report) {
  const count = src.split(needle).length - 1;
  if (count !== 1) throw new Error(`No se pudo aplicar ${label}: ocurrencias=${count}`);
  report.steps.push({ label, count });
  return src.replace(needle, replacement);
}
function replaceRegex(src, rx, replacement, label, report) {
  const m = src.match(rx);
  if (!m || m.length !== 1) throw new Error(`No se pudo aplicar ${label}: ocurrencias=${m ? m.length : 0}`);
  report.steps.push({ label, count: 1 });
  return src.replace(rx, replacement);
}

function main() {
  assertNotProtected(TARGET);
  const abs = mustExist(TARGET);
  let src = fs.readFileSync(abs, 'utf8');
  const original = src;
  const report = {
    runId: RUN_ID,
    target: TARGET,
    purpose: 'P0 policy importer: composite key, operational status, expected receipts separation',
    protectedUntouched: PROTECTED,
    steps: []
  };

  if (src.includes('ORBIT360_P0_POLIZAS_SAFE_PATCH_20260709')) {
    report.alreadyApplied = true;
  } else {
    const marker = `\n  /* ORBIT360_P0_POLIZAS_SAFE_PATCH_20260709 */\n`;
    const helperNeedle = `function parseNum(v) { if (v == null) return 0; let s = String(v).replace(/[^0-9,.\\-]/g, ''); s = s.replace(/\\.(?=\\d{3}(\\D|$))/g, '').replace(',', '.'); const n = parseFloat(s); return isNaN(n) ? 0 : n; }`;
    const helperInsert = `${helperNeedle}${marker}  function fechaYMD(v) {\n    if (!v) return '';\n    const s = String(v).trim();\n    let m = s.match(/^(\\d{4})[-\\/](\\d{1,2})[-\\/](\\d{1,2})/);\n    if (m) return m[1] + '-' + String(m[2]).padStart(2, '0') + '-' + String(m[3]).padStart(2, '0');\n    m = s.match(/^(\\d{1,2})[-\\/](\\d{1,2})[-\\/](\\d{4})/);\n    if (m) return m[3] + '-' + String(m[2]).padStart(2, '0') + '-' + String(m[1]).padStart(2, '0');\n    return s.slice(0, 10);\n  }\n  function todayYMD() { return Orbit.ui && Orbit.ui.today ? Orbit.ui.today() : new Date().toISOString().slice(0, 10); }\n  function vigenciaActiva(rec) {\n    const h = todayYMD();\n    const ini = fechaYMD(rec.vigenciaIni);\n    const fin = fechaYMD(rec.vigenciaFin);\n    if (ini && h < ini) return false;\n    if (fin && h > fin) return false;\n    return !!(ini || fin);\n  }\n  function estadoOperativoPoliza(rec) {\n    const fuente = norm(rec.estadoFuenteOriginal || rec.estadoPol || rec.estado || '');\n    const activa = vigenciaActiva(rec);\n    if (/cancel|anulad|rescind/.test(fuente)) return { estadoOperativoOrbit: 'cancelada_terminal', estadoCartera: 'no_exigible', label: 'Cancelada', requiereValidacion: false };\n    if (/no renov/.test(fuente)) return { estadoOperativoOrbit: 'no_renovada_historica', estadoCartera: 'no_exigible', label: 'No renovada', requiereValidacion: false };\n    if (/renov/.test(fuente) && activa) return { estadoOperativoOrbit: 'vigente_renovada', estadoCartera: 'genera_recibos_esperados', label: 'Renovada vigente', requiereValidacion: false };\n    if (/vig/.test(fuente) && activa) return { estadoOperativoOrbit: 'vigente_operativa', estadoCartera: 'genera_recibos_esperados', label: 'Vigente', requiereValidacion: false };\n    if (/venc|termin/.test(fuente)) return { estadoOperativoOrbit: 'historica_vencida', estadoCartera: 'recibo_analitico_no_cartera_viva', label: 'Histórica vencida', requiereValidacion: false };\n    if (activa) return { estadoOperativoOrbit: 'vigente_por_vigencia_requiere_validacion', estadoCartera: 'requiere_validacion', label: 'Requiere validación', requiereValidacion: true };\n    return { estadoOperativoOrbit: 'requiere_validacion_estado', estadoCartera: 'requiere_validacion', label: 'Requiere validación', requiereValidacion: true };\n  }\n  function policyDedupKey(rec) {\n    const asg = norm(rec.aseguradoraId || rec.aseguradoraNombre || '');\n    const num = norm(rec.numero || '');\n    const cli = norm(rec.clienteId || rec.clienteNombre || rec.aseguradoNombre || rec.contratanteNombre || rec.tomadorNombre || '');\n    const ini = fechaYMD(rec.vigenciaIni || '');\n    const fin = fechaYMD(rec.vigenciaFin || '');\n    if (!asg || !num || !cli || !ini || !fin) return '';\n    return [asg, num, cli, ini, fin].join('|');\n  }`;
    src = replaceOnce(src, helperNeedle, helperInsert, 'insert helpers P0 polizas', report);

    src = replaceOnce(src, `coll: 'polizas', label: 'Pólizas', dedup: ['numero'],`, `coll: 'polizas', label: 'Pólizas', dedup: ['_dedupKey'],`, 'dedup llave compuesta', report);

    src = replaceOnce(src,
      `clienteNombre: ['cliente', 'asegurado', 'contratante', 'tomador', 'nombre'],`,
      `clienteNombre: ['cliente', 'asegurado', 'contratante', 'tomador', 'nombre'],\n        aseguradoNombre: ['asegurado nombre', 'nombre asegurado'],\n        contratanteNombre: ['contratante nombre', 'nombre contratante'],\n        tomadorNombre: ['tomador nombre', 'nombre tomador'],`,
      'campos nombres complementarios', report);

    src = replaceRegex(src,
      /        \/\/ P0-04: estado explícito; si no viene, requiere_validacion \(NO asumir Vigente\)\.\n        const ne = norm\(rec\.estadoPol\);\n        if \(!ne\) \{ rec\.estado = 'Requiere validación'; rec\._estadoAmbiguo = true; \}\n        else rec\.estado = ne\.indexOf\('cancel'\) >= 0 \? 'Cancelada' : ne\.indexOf\('venc'\) >= 0 \? 'Vencida' : ne\.indexOf\('renov'\) >= 0 \? 'Por renovar' : ne\.indexOf\('vig'\) >= 0 \? 'Vigente' : 'Requiere validación';\n        delete rec\.estadoPol;/,
      `        // P0: conservar estado de fuente y calcular estado operativo Orbit sin asumir vigencia/renovacion.\n        rec.estadoFuenteOriginal = rec.estadoFuenteOriginal || rec.estadoPol || rec.estado || '';\n        const estOp = estadoOperativoPoliza(rec);\n        rec.estadoOperativoOrbit = estOp.estadoOperativoOrbit;\n        rec.estadoCartera = estOp.estadoCartera;\n        rec.estadoConciliacion = rec.estadoConciliacion || 'pendiente';\n        rec.estado = estOp.label;\n        if (estOp.requiereValidacion) rec._estadoAmbiguo = true;\n        delete rec.estadoPol;`,
      'estado fuente/orbit', report);

    src = replaceOnce(src,
      `rec.frecuencia = rec.frecuencia || 'Contado'; rec.forma = rec.frecuencia; rec.formaPago = rec.formaPago || '';`,
      `rec.frecuencia = rec.frecuencia || rec.formaPago || ''; rec.forma = rec.frecuencia || ''; rec.formaPago = rec.formaPago || rec.frecuencia || ''; if (!rec.frecuencia && !rec.formaPago) rec._formaPagoAmbigua = true;`,
      'forma de pago sin asumir contado', report);

    src = replaceOnce(src,
      `rec.comVendedorPct = rec.comVendedorPct || 50;\n        // Sin país o moneda confiables → requiere validación (P0-04).\n        if (!rec.pais || !rec.moneda || rec._estadoAmbiguo || rec._primaAmbigua) {\n          rec.requiereValidacion = true;\n          rec._motivoValidacion = [!rec.pais && 'país', !rec.moneda && 'moneda', rec._estadoAmbiguo && 'estado', rec._primaAmbigua && 'prima neta'].filter(Boolean).join(', ') + ' no confiables';\n        }\n        delete rec.clienteNombre; delete rec.aseguradoraNombre; return rec;`,
      `rec.comVendedorPct = rec.comVendedorPct || 50;\n        rec._dedupKey = policyDedupKey(rec);\n        // Sin país, moneda, estado, prima, forma de pago o llave confiables → requiere validación (P0).\n        if (!rec.pais || !rec.moneda || rec._estadoAmbiguo || rec._primaAmbigua || rec._formaPagoAmbigua || !rec._dedupKey) {\n          rec.requiereValidacion = true;\n          rec._motivoValidacion = [!rec.pais && 'país', !rec.moneda && 'moneda', rec._estadoAmbiguo && 'estado', rec._primaAmbigua && 'prima neta', rec._formaPagoAmbigua && 'forma de pago', !rec._dedupKey && 'llave de póliza'].filter(Boolean).join(', ') + ' no confiables';\n        }\n        delete rec.clienteNombre; delete rec.aseguradoraNombre; delete rec.aseguradoNombre; delete rec.contratanteNombre; delete rec.tomadorNombre; return rec;`,
      'validacion P0 poliza', report);

    src = replaceOnce(src,
      `const confiable = (rec.estado === 'Vigente' || rec.estado === 'Por renovar') && rec.pais && rec.moneda && rec.formaPago && !rec.requiereValidacion && rec.primaNeta > 0;`,
      `const estadoOK = rec.estadoOperativoOrbit === 'vigente_operativa' || rec.estadoOperativoOrbit === 'vigente_renovada';\n        const confiable = estadoOK && rec.pais && rec.moneda && (rec.formaPago || rec.frecuencia) && !rec.requiereValidacion && rec.primaNeta > 0;`,
      'afterInsert estado confiable', report);

    src = replaceOnce(src,
      `Orbit.store.insert('cobros', { id: 'cob_imp_' + rec.id + '_' + i, polizaId: rec.id, clienteId: rec.clienteId, asesorId: rec.asesorId, cuota: r.n, monto: r.total, moneda: rec.moneda, neta: r.neta, gastosEmision: r.gastosEmision, gastosFinan: r.gastosFinan, otros: r.otros, iva: r.iva, comAseguradora: r.comAseguradora, comVendedor: r.comVendedor, vence: r.vence, fechaLimite: r.fechaLimite, fechaPago: null, estado: 'Pendiente', metodo: null, conducto: rec.formaPago, conciliado: false, importado: true });`,
      `Orbit.store.insert('recibosEsperados', { id: 'rec_esp_imp_' + rec.id + '_' + i, polizaId: rec.id, clienteId: rec.clienteId, asesorId: rec.asesorId, cuota: r.n, monto: r.total, moneda: rec.moneda, neta: r.neta, gastosEmision: r.gastosEmision, gastosFinan: r.gastosFinan, otros: r.otros, iva: r.iva, comAseguradora: r.comAseguradora, comVendedor: r.comVendedor, vence: r.vence, fechaLimite: r.fechaLimite, fechaPago: null, estado: 'esperado', estadoCartera: 'recibo_esperado', estadoConciliacion: 'pendiente', metodo: null, conducto: rec.formaPago || rec.frecuencia || null, confirmadoPago: false, carteraOperativa: false, conciliado: false, origen: 'poliza_importada', importado: true });`,
      'recibos esperados separados', report);
  }

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  if (src !== original) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    backup(TARGET);
    fs.writeFileSync(abs, src, 'utf8');
  }
  report.changed = src !== original;
  report.ok = true;
  const reportPath = path.join(REPORT_DIR, `p0-polizas-importador-${RUN_ID}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

  console.log('Orbit 360 P0 polizas importador safe patch');
  console.log('Target:', TARGET);
  console.log('Changed:', report.changed);
  console.log('Report:', reportPath);
  for (const s of report.steps) console.log(`- ${s.label}: ${s.count}`);
}

main();
