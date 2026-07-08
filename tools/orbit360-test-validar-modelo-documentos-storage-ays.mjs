#!/usr/bin/env node
/**
 * Tests sintéticos metadata-only para documentos + Storage futuro + adjuntos.
 * Sin datos reales, sin red, sin Firestore, sin archivos privados.
 */
import { validarModeloDocumentosStorage } from './orbit360-validar-modelo-documentos-storage-ays.mjs';

const cases = [
  {
    name: 'documento-soporte-listo-plan-only',
    expect: 'listo_plan_only',
    plan: {
      tenantId: 'tenant-demo',
      source_type: 'documentos_soporte',
      pais: 'GT',
      moneda: 'GTQ',
      document_state: 'recibido',
      target_collections: ['documentos', 'adjuntos', 'parchesPendientes', 'auditLog'],
      storage: { contract_only: true, connected: false, storageRef: 'tenants/{tenantId}/documents/{documentId}/{safeFileName}' },
      relations: [{ tipo: 'cliente', apply_without_diff: false }]
    }
  },
  {
    name: 'recibo-pago-no-aplica-pago',
    expect: 'bloqueado',
    plan: {
      tenantId: 'tenant-demo',
      source_type: 'recibo_pago',
      pais: 'GT',
      moneda: 'GTQ',
      target_collections: ['documentos', 'adjuntos', 'cobros'],
      pagoAplicado: true,
      relations: [{ tipo: 'cobro', aplicarPago: true }]
    }
  },
  {
    name: 'estado-cuenta-moneda-incoherente',
    expect: 'bloqueado',
    plan: {
      tenantId: 'tenant-demo',
      source_type: 'estado_cuenta_bancario',
      pais: 'CO',
      moneda: 'GTQ',
      target_collections: ['documentos', 'conciliaciones']
    }
  },
  {
    name: 'dpi-cliente-requiere-diff',
    expect: 'bloqueado',
    plan: {
      tenantId: 'tenant-demo',
      source_type: 'dpi_nit_cliente',
      target_collections: ['documentos', 'parchesPendientes'],
      relations: [{ tipo: 'cliente', apply_without_diff: true }]
    }
  },
  {
    name: 'payload-base64-bloqueado',
    expect: 'bloqueado',
    plan: {
      tenantId: 'tenant-demo',
      source_type: 'documentos_soporte',
      target_collections: ['documentos'],
      storage: { base64: 'NO-USAR-PAYLOAD-REAL' }
    }
  },
  {
    name: 'pago-reportado-sin-moneda-requiere-validacion',
    expect: 'requiere_validacion',
    plan: {
      tenantId: 'tenant-demo',
      source_type: 'pago_reportado',
      pais: 'GT',
      target_collections: ['documentos', 'adjuntos', 'gestiones']
    }
  }
];

let failed = 0;
for (const c of cases) {
  const res = validarModeloDocumentosStorage(c.plan);
  const pass = res.status === c.expect;
  console.log(`${pass ? 'OK' : 'FAIL'} ${c.name}: esperado=${c.expect} recibido=${res.status}`);
  if (!pass) {
    failed++;
    console.log(JSON.stringify(res, null, 2));
  }
}

if (failed) {
  console.error(`\nRESULTADO: FAIL (${failed})`);
  process.exit(1);
}
console.log('\nRESULTADO: OK — tests documentos/storage metadata-only');
