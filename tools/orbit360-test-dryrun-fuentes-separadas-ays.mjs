#!/usr/bin/env node
/* Orbit 360 · Regression tests for A&S separated source dry-run validator
   Safe mode: creates only synthetic manifests in _orbit360_tmp and local reports.
   No network, no Firebase, no Firestore, no secrets, no real payload.
*/
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const script = path.join(root, 'tools', 'orbit360-dryrun-fuente-separada-ays.mjs');
const tmpDir = path.join(root, '_orbit360_tmp', 'dryrun-fuentes-separadas');
const reportDir = path.join(root, '_orbit360_reports');
const errors = [];
const results = [];

function writeJson(name, payload) {
  fs.mkdirSync(tmpDir, { recursive: true });
  const p = path.join(tmpDir, name);
  fs.writeFileSync(p, JSON.stringify(payload, null, 2), 'utf8');
  return p;
}

function runCase(testCase) {
  const manifestPath = writeJson(`${testCase.id}.json`, testCase.manifest);
  const res = spawnSync(process.execPath, [script, '--manifest', manifestPath], {
    cwd: root,
    encoding: 'utf8'
  });
  const out = `${res.stdout || ''}\n${res.stderr || ''}`;
  const hasDecision = out.includes(`Decision: ${testCase.expectedDecision}`);
  const exitOk = typeof testCase.expectedExitCode === 'number' ? res.status === testCase.expectedExitCode : true;
  const contains = (testCase.expectedContains || []).every((needle) => out.includes(needle));
  const passed = Boolean(hasDecision && exitOk && contains);

  results.push({
    id: testCase.id,
    expectedDecision: testCase.expectedDecision,
    expectedExitCode: testCase.expectedExitCode,
    actualExitCode: res.status,
    passed
  });

  if (!passed) {
    errors.push([
      `FAIL ${testCase.id}`,
      `Expected decision: ${testCase.expectedDecision}`,
      `Expected exit: ${testCase.expectedExitCode}`,
      `Actual exit: ${res.status}`,
      '--- output ---',
      out
    ].join('\n'));
  }
}

if (!fs.existsSync(script)) {
  console.error(`No existe validador: ${path.relative(root, script)}`);
  process.exit(1);
}

const cases = [
  {
    id: 'clientes-listo',
    expectedDecision: 'listo_dryrun',
    expectedExitCode: 0,
    manifest: {
      source_type: 'clientes',
      file_name: 'clientes_sintetico.xlsx',
      declared_country: 'GT',
      declared_currency: 'NO_APLICA',
      contains_real_data: false,
      contains_real_payload: false,
      requested_targets: ['clientes'],
      sheets: [
        {
          name: 'Clientes',
          country: 'GT',
          currency: 'NO_APLICA',
          rows_detected: 12,
          columns: ['nombre_cliente', 'documento_numero', 'pais', 'telefono', 'correo']
        }
      ]
    }
  },
  {
    id: 'financiero-bloquea-crm',
    expectedDecision: 'bloqueado',
    expectedExitCode: 1,
    expectedContains: ['Destino bloqueado para esta fuente: clientes'],
    manifest: {
      source_type: 'financiero_historico',
      file_name: 'movimientos_sintetico.xlsx',
      declared_country: 'GT',
      declared_currency: 'GTQ',
      contains_real_data: false,
      contains_real_payload: false,
      requested_targets: ['finmovs', 'clientes'],
      sheets: [
        {
          name: 'Nov 2024 GT',
          country: 'GT',
          currency: 'GTQ',
          rows_detected: 20,
          columns: ['periodo', 'pais', 'moneda', 'concepto', 'monto']
        }
      ]
    }
  },
  {
    id: 'estado-cuenta-moneda-incoherente',
    expectedDecision: 'bloqueado',
    expectedExitCode: 1,
    expectedContains: ['Moneda incoherente para GT'],
    manifest: {
      source_type: 'estado_cuenta',
      file_name: 'banco_sintetico.xlsx',
      declared_country: 'GT',
      declared_currency: 'COP',
      contains_real_data: false,
      contains_real_payload: false,
      requested_targets: ['finmovs'],
      sheets: [
        {
          name: 'Cuenta GT',
          country: 'GT',
          currency: 'COP',
          rows_detected: 10,
          columns: ['banco', 'cuenta', 'pais', 'moneda', 'fecha', 'descripcion', 'debito', 'credito', 'saldo']
        }
      ]
    }
  },
  {
    id: 'manifest-con-rows-bloqueado',
    expectedDecision: 'bloqueado',
    expectedExitCode: 1,
    expectedContains: ['No incluir payload real'],
    manifest: {
      source_type: 'clientes',
      file_name: 'clientes_payload_bloqueado.xlsx',
      declared_country: 'GT',
      declared_currency: 'NO_APLICA',
      contains_real_data: true,
      contains_real_payload: false,
      requested_targets: ['clientes'],
      rows: [{ ejemplo: 'NO_USAR_FILAS' }],
      sheets: [
        {
          name: 'Clientes',
          country: 'GT',
          currency: 'NO_APLICA',
          rows_detected: 1,
          columns: ['nombre_cliente', 'documento_numero', 'pais']
        }
      ]
    }
  },
  {
    id: 'polizas-requiere-validacion-columnas',
    expectedDecision: 'requiere_validacion',
    expectedExitCode: 0,
    expectedContains: ['Campo requerido no detectado'],
    manifest: {
      source_type: 'polizas',
      file_name: 'polizas_incompleto_sintetico.xlsx',
      declared_country: 'GT',
      declared_currency: 'GTQ',
      contains_real_data: false,
      contains_real_payload: false,
      requested_targets: ['polizas'],
      sheets: [
        {
          name: 'Polizas',
          country: 'GT',
          currency: 'GTQ',
          rows_detected: 5,
          columns: ['numero_poliza', 'cliente', 'aseguradora', 'pais', 'moneda']
        }
      ]
    }
  }
];

for (const testCase of cases) runCase(testCase);

const output = [
  '============================================================',
  'ORBIT 360 - TEST DRYRUN FUENTES SEPARADAS A&S',
  `Fecha: ${new Date().toISOString()}`,
  `Root: ${root}`,
  'Restricciones: tests sintéticos, sin datos reales, sin Firebase, sin Firestore.',
  '============================================================',
  '',
  `Casos: ${results.length}`,
  `OK: ${results.filter((r) => r.passed).length}`,
  `FAIL: ${errors.length}`,
  '',
  ...results.map((r) => `${r.passed ? 'OK' : 'FAIL'} ${r.id} decision=${r.expectedDecision} exit=${r.actualExitCode}`),
  '',
  ...errors,
  '',
  errors.length ? 'RESULTADO: FAIL' : 'RESULTADO: OK'
].join('\n');

fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(path.join(reportDir, 'TEST-DRYRUN-FUENTES-SEPARADAS-AYS.txt'), output, 'utf8');
console.log(output);
process.exit(errors.length ? 1 : 0);
