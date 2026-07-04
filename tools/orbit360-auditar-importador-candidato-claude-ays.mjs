#!/usr/bin/env node
/*
  Orbit 360 A&S — auditor estático de importador para candidatos Claude.
  Modo seguro: solo lee archivos de una carpeta candidata. No escribe repo, no toca backend,
  no Firebase, no Firestore, no datos reales.

  Uso:
    node tools/orbit360-auditar-importador-candidato-claude-ays.mjs --candidate /ruta/orbit360-platform
*/
import fs from 'node:fs';
import path from 'node:path';

function arg(name){
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i+1] : '';
}
function read(p){ return fs.existsSync(p) ? fs.readFileSync(p,'utf8') : ''; }
function count(re, txt){ return (txt.match(re) || []).length; }
function has(re, txt){ return re.test(txt); }
function add(list, level, code, msg, file, evidence){ list.push({ level, code, msg, file, evidence }); }

const root = arg('--candidate') || arg('-c');
if(!root){ console.error('Falta --candidate /ruta/orbit360-platform'); process.exit(2); }
const cand = path.resolve(root);
const importaPath = path.join(cand,'core','importa.js');
const configPath = path.join(cand,'modules','configuracion.js');
const panelPath = path.join(cand,'core','integraciones-panel.js');
const findings = [];

if(!fs.existsSync(cand) || !fs.existsSync(importaPath)){
  add(findings,'BLOQUEADO','CANDIDATO_INVALIDO','No existe core/importa.js en la carpeta candidata', importaPath, '');
} else {
  const txt = read(importaPath);

  const metaAssigned = has(/row\._origenHoja\s*=|row\._numeroFila\s*=/, txt);
  const copyMetaHelper = has(/function\s+copyRowMeta|const\s+copyRowMeta/, txt);
  const recFromIdx = count(/const\s+rec\s*=\s*\{\}\s*;\s*Object\.keys\(idx\)\.forEach/g, txt);
  if(metaAssigned && recFromIdx && !copyMetaHelper){
    add(findings,'BLOQUEADO','TRACE_NOT_COPIED','La traza hoja/fila se asigna a rows, pero no hay helper copyRowMeta para copiarla a rec antes de build/import/dryRun/conciliación.','core/importa.js','row._origenHoja + const rec = {}; Object.keys(idx)...');
  }

  if(has(/rec\.moneda\s*=\s*\([^\n]+\)\s*\|\|\s*monedaDe\(rec\.pais\)/, txt) || has(/const\s+cur\s*=\s*rec\.moneda\s*\|\|\s*monedaDe\(pais\)/, txt) || has(/detectaMoneda\(sn\)\s*\|\|\s*monedaDe\(paisHoja\)/, txt)){
    add(findings,'BLOQUEADO','CURRENCY_DEFAULT_WRITE','Se usa monedaDe(pais) como moneda autorizada. Debe ser monedaSugerida y requerir validación si no viene explícita.','core/importa.js','monedaDe(pais) en asignación de moneda');
  }

  const planBlock = txt.slice(txt.indexOf("'planillas-comision'"));
  if(txt.includes("'planillas-comision'") && !has(/comision_esperada|comisionEsperada|comision_pagada|comisionPagada/, planBlock)){
    add(findings,'BLOQUEADO','COMMISSION_SHEET_CONTRACT','planillas-comision no declara contrato completo de comisión esperada/pagada.','core/importa.js','faltan campos esperada/pagada');
  }
  if(txt.includes("'planillas-comision'") && !has(/pais\s*:\s*\[|moneda\s*:\s*\[|periodo\s*:\s*\[/, planBlock)){
    add(findings,'BLOQUEADO','COMMISSION_SHEET_COUNTRY_CURRENCY','planillas-comision no exige país/moneda/periodo.','core/importa.js','faltan pais/moneda/periodo');
  }
  if(has(/tarifasDetect\(\)/, txt) && has(/aplicarPlanilla\(/, txt) && !has(/diff|confirmaci[oó]n|parchesPendientes/, txt)){
    add(findings,'REVISION','COMMISSION_TARIFF_DIRECT','El flujo puede actualizar tarifarios desde planilla sin diff/confirmación fuerte.','core/importa.js','tarifasDetect + aplicarPlanilla');
  }

  if(has(/'documentos'\s*:\s*\{[^}]*coll\s*:\s*'clientes'/s, txt) || has(/scopedUpdate\s*:\s*true/, txt)){
    add(findings,'BLOQUEADO','DOCUMENTS_UPDATE_CLIENTS','documentos aún puede escribir clientes directo. Debe ir a documentos/parchesPendientes + diff confirmado.','core/importa.js','coll clientes / scopedUpdate');
  }

  if(has(/pago cliente|recibo|cuota|prima|recaudo/i, txt) && !has(/cobro|recaudo[^\n]+requiere_validacion|bloque/i, txt)){
    add(findings,'REVISION','FINMOVS_RECAUDO_SEMANTICS','No se observa bloqueo semántico fuerte para conceptos de recaudo/cobro en financiero histórico.','core/importa.js','conceptos financieros sin bloqueo semántico');
  }
}

const scanFiles = [
  'core/config.js','core/ia.js','core/integraciones.js','modules/finanzas.js','modules/siniestros.js','modules/portal.js'
];
for(const rel of scanFiles){
  const t = read(path.join(cand,rel));
  if(has(/2026-\d{2}(-\d{2})?/, t)) add(findings,'REVISION','FIXED_DATE','Fecha fija 2026 detectada; validar si es seed aislado o fecha operativa. Debe usar today/config si es operativa.',rel,(t.match(/2026-\d{2}(-\d{2})?/)||[''])[0]);
}

for(const rel of ['core/integraciones-panel.js','modules/configuracion.js','modules/correo.js']){
  const t = read(path.join(cand,rel));
  const m = t.match(/Pendiente de backend|backend del tenant|\bLAB\b|Simular|modo demo|Firebase|Firestore|localStorage|smoke|mock/i);
  if(m) add(findings,'REVISION','TECH_TEXT_VISIBLE','Texto técnico potencialmente visible en UI cliente; condicionar a rol interno o reemplazar.',rel,m[0]);
}

const blocked = findings.filter(f=>f.level==='BLOQUEADO').length;
const review = findings.filter(f=>f.level==='REVISION').length;
const status = blocked ? 'BLOQUEADO' : review ? 'REQUIERE_REVISION' : 'LISTO_IMPORTADOR_STATIC';
const report = { status, blocked, review, candidate: cand, findings };
console.log(JSON.stringify(report,null,2));
process.exit(blocked ? 1 : 0);
