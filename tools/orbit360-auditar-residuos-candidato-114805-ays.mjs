#!/usr/bin/env node
/*
  Orbit 360 A&S — auditor residual específico post candidata Claude 114805.
  Seguro: solo lee carpeta candidata. No escribe repo, no Firestore, no secretos.

  Uso:
    node tools/orbit360-auditar-residuos-candidato-114805-ays.mjs --candidate /ruta/orbit360-platform
*/
import fs from 'node:fs';
import path from 'node:path';

function arg(name){ const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i+1] : ''; }
function read(p){ return fs.existsSync(p) ? fs.readFileSync(p,'utf8') : ''; }
function add(findings, level, code, file, message, evidence){ findings.push({ level, code, file, message, evidence }); }

const root = path.resolve(arg('--candidate') || arg('-c') || '.');
const findings = [];
const importa = read(path.join(root,'core','importa.js'));
const marketingValidator = read(path.join(root,'tools','orbit360-validate-marketing-integraciones.mjs'));

if(!importa){
  add(findings,'BLOQUEADO','SIN_IMPORTA','core/importa.js','No se encontró core/importa.js','');
} else {
  if(/detectaMoneda\(sn\)\s*\|\|\s*monedaDe\(paisHoja\)/.test(importa)){
    add(findings,'BLOQUEADO','MONEDA_HOJA_INFERIDA_POR_PAIS','core/importa.js','La moneda de hoja todavía se autoriza por país. Debe ser sugerencia, no valor escrito.','detectaMoneda(sn) || monedaDe(paisHoja)');
  }
  if(/rec\.pais\s*=\s*normPais\(rec\.pais\);\s*rec\.moneda\s*=\s*rec\.pais\s*===\s*['"]CO['"]\s*\?\s*['"]COP['"]\s*:\s*['"]GTQ['"]/.test(importa)){
    add(findings,'BLOQUEADO','CLIENTE_DEFAULT_GUATE_GTQ','core/importa.js','Clientes todavía pueden quedar GTQ si falta país.','rec.pais = normPais(rec.pais); rec.moneda = rec.pais === CO ? COP : GTQ');
  }
  if(/['"]documentos['"]\s*:\s*\{\s*crea\s*:\s*\[\s*['"]clientes['"]\s*\]/.test(importa)){
    add(findings,'BLOQUEADO','SCOPE_DOCUMENTOS_CLIENTES','core/importa.js','SCOPE.documentos sigue declarando que crea clientes. Debe declarar parchesPendientes/documentos.','documentos: { crea: [clientes] }');
  }
}

if(marketingValidator && /contiene Simular/.test(marketingValidator)){
  add(findings,'REVISION','VALIDADOR_SIMULAR_OBSOLETO','tools/orbit360-validate-marketing-integraciones.mjs','El validador aún exige el literal técnico Simular. Debe validar data-lab-cycle o copy comercial Probar.','contiene Simular');
}

const fixedDateRe = /2026-\d{2}(?:-\d{2})?/g;
for(const rel of ['core/integraciones.js','core/ui.js','modules/portal.js','modules/siniestros.js','core/importa.js']){
  const txt = read(path.join(root,rel));
  const m = txt.match(fixedDateRe);
  if(m && m.length) add(findings,'REVISION','FECHAS_FIJAS_REVISAR',rel,'Fechas 2026 detectadas. Confirmar si son seed demo o flujo operativo.',[...new Set(m)].slice(0,5).join(', '));
}

const blocked = findings.filter(f => f.level === 'BLOQUEADO').length;
const review = findings.filter(f => f.level === 'REVISION').length;
const status = blocked ? 'BLOQUEADO' : review ? 'REQUIERE_REVISION' : 'LISTO';
console.log(JSON.stringify({ status, blocked, review, candidate: root, findings }, null, 2));
process.exit(blocked ? 1 : 0);
