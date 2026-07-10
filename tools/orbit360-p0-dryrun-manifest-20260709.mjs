#!/usr/bin/env node
/* ============================================================
   Orbit 360 A&S · P0 dry-run manifest
   Fecha: 2026-07-09

   Define fuentes reales esperadas, capas destino y validaciones
   bloqueantes para dry-run sanitizado. No lee archivos reales,
   no escribe datos y no contiene payload sensible.
   ============================================================ */

export const DRYRUN_SOURCES = [
  {
    id: 'clientes',
    priority: 1,
    sourceType: 'clientes',
    expectedExamples: ['Contratantes Datos de Contacto 2026-07-08.xlsx'],
    targets: ['clientes', 'contactos', 'calidadDatos', 'gestionesValidacion'],
    neverCreates: ['polizas', 'recibosEsperados', 'cobros', 'carteraPrimas', 'finmovs', 'cxcComisiones', 'cxpAsesores'],
    blockers: ['documento_identificacion_si_existe_no_normaliza', 'asesor_no_resuelto', 'duplicado_exactamente_igual', 'pais_moneda_si_aplica'],
    dryRunOutputs: ['crear', 'actualizar', 'omitir', 'requiere_validacion', 'alertas_calidad', 'duplicados_exactos', 'duplicados_probables']
  },
  {
    id: 'polizas',
    priority: 2,
    sourceType: 'polizas',
    expectedExamples: ['Polizas (11).xlsx', 'Renovaciones.xlsx', 'Polizas Canceladas.xlsx'],
    targets: ['polizas', 'vigenciasPoliza', 'recibosEsperados', 'gestionesValidacion'],
    neverCreates: ['cobros', 'carteraPrimas', 'finmovs', 'cxcComisiones', 'cxpAsesores'],
    blockers: ['llave_compuesta_faltante', 'pais_moneda_faltante', 'forma_pago_faltante', 'prima_neta_faltante', 'estado_operativo_ambiguo'],
    dryRunOutputs: ['crear_poliza', 'actualizar_vigencia', 'omitir_exacta', 'requiere_validacion', 'recibos_esperados_propuestos']
  },
  {
    id: 'vehiculos',
    priority: 3,
    sourceType: 'vehiculos',
    expectedExamples: ['Auto (2).xlsx'],
    targets: ['bienesAsegurados', 'vinculosPolizaBien', 'gestionesValidacion'],
    neverCreates: ['clientes', 'polizas', 'recibosEsperados', 'cobros', 'finmovs'],
    blockers: ['placa_o_identificador_faltante', 'poliza_no_resuelta', 'cliente_no_resuelto'],
    dryRunOutputs: ['crear_bien', 'actualizar_bien', 'vincular_poliza', 'requiere_validacion']
  },
  {
    id: 'recibos_fuente_externa',
    priority: 4,
    sourceType: 'recibos_cobros',
    expectedExamples: ['Total recibos desde 2025.xlsx', 'Cobranza efectuada x fecha de pago.xlsx', 'Cobranza vencida.xlsx'],
    targets: ['recibosFuenteExterna', 'cobrosFuenteExterna', 'conciliacionesPrimas', 'brechasHistoricas'],
    neverCreates: ['clientes', 'polizas', 'finmovs', 'cxcComisiones', 'cxpAsesores'],
    blockers: ['poliza_no_resuelta', 'monto_faltante', 'moneda_faltante', 'fecha_no_resuelta'],
    dryRunOutputs: ['recibo_fuente', 'cobro_fuente', 'pago_reportado_no_confirmado', 'brecha_historica', 'requiere_validacion']
  },
  {
    id: 'estados_cuenta_aseguradora',
    priority: 5,
    sourceType: 'estado_cuenta_aseguradora',
    expectedExamples: ['Balance de Antiguedad Universales al 29 de Junio.pdf', 'Cartera de Cobro La Ceiba al 06-07-2026.pdf', 'Estado de cuenta AseGuate a 23 de junio.PDF'],
    targets: ['estadosCuentaAseguradora', 'recibosAseguradora', 'carteraPrimas', 'conciliacionesPrimas'],
    neverCreates: ['cobros', 'finmovs', 'cxcComisiones', 'cxpAsesores'],
    blockers: ['aseguradora_faltante', 'poliza_o_recibo_faltante', 'monto_faltante', 'moneda_faltante'],
    dryRunOutputs: ['pendiente_aseguradora', 'cartera_operativa', 'conflicto_fuente_vs_aseguradora', 'requiere_validacion']
  },
  {
    id: 'planillas_comisiones',
    priority: 6,
    sourceType: 'planilla_comision',
    expectedExamples: ['Planilla AseGuate.pdf', 'Planilla Universales.pdf', 'Planilla Mapfre.xls', 'Planilla Ficohsa.xlsx'],
    targets: ['planillasComisiones', 'comisionesDevengadas', 'conciliacionesComisiones'],
    neverCreates: ['carteraPrimas', 'finmovs', 'cxcComisiones', 'cxpAsesores'],
    blockers: ['aseguradora_faltante', 'periodo_faltante', 'moneda_faltante', 'monto_comision_faltante'],
    dryRunOutputs: ['comision_devengada', 'comision_acumulada_no_facturada', 'diferencia_comision', 'requiere_validacion']
  },
  {
    id: 'facturas_comisiones',
    priority: 7,
    sourceType: 'factura_comision',
    expectedExamples: ['FV AseGuate.pdf', 'FV Universales.pdf', 'FV Mapfre.pdf', 'FV Bantrab.pdf'],
    targets: ['facturasComisiones', 'cxcComisiones', 'conciliacionesComisiones'],
    neverCreates: ['carteraPrimas', 'cobros', 'finmovs', 'cxpAsesores'],
    blockers: ['numero_factura_faltante', 'monto_faltante', 'moneda_faltante', 'tipo_factura_no_identificado'],
    dryRunOutputs: ['factura_comision', 'cxc_comision_pendiente', 'factura_no_comision_omitida', 'requiere_validacion']
  },
  {
    id: 'estado_cuenta_bancario',
    priority: 8,
    sourceType: 'estado_cuenta_bancario',
    expectedExamples: ['Movimientos Ing y Eg Alianzas Guate y Col 2026.xlsx'],
    targets: ['movimientosBanco', 'conciliacionBancaria'],
    neverCreates: ['clientes', 'polizas', 'cobros', 'carteraPrimas', 'finmovs'],
    blockers: ['fecha_faltante', 'monto_faltante', 'moneda_faltante'],
    dryRunOutputs: ['movimiento_banco_pendiente', 'match_cxc_probable', 'match_cxp_probable', 'sin_match', 'requiere_confirmacion_humana']
  }
];

export function validateManifest(sources = DRYRUN_SOURCES) {
  const errors = [];
  const ids = new Set();
  sources.forEach(src => {
    if (!src.id) errors.push('source without id');
    if (ids.has(src.id)) errors.push('duplicated source id: ' + src.id);
    ids.add(src.id);
    ['sourceType', 'targets', 'neverCreates', 'blockers', 'dryRunOutputs'].forEach(k => {
      if (!src[k] || (Array.isArray(src[k]) && !src[k].length)) errors.push(`${src.id}: missing ${k}`);
    });
    if ((src.targets || []).some(t => (src.neverCreates || []).includes(t))) errors.push(`${src.id}: target also in neverCreates`);
  });
  return { ok: errors.length === 0, errors, totalSources: sources.length };
}

export function dryRunGateSummary(src) {
  return {
    id: src.id,
    sourceType: src.sourceType,
    targets: src.targets,
    blockedIf: src.blockers,
    neverCreates: src.neverCreates,
    output: src.dryRunOutputs,
    requiresHumanConfirmation: true,
    writesRealData: false
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = validateManifest();
  if (!result.ok) {
    console.error(JSON.stringify(result, null, 2));
    process.exit(1);
  }
  const mode = process.argv.includes('--json') ? 'json' : 'summary';
  if (mode === 'json') console.log(JSON.stringify(DRYRUN_SOURCES.map(dryRunGateSummary), null, 2));
  else {
    console.log('OK P0 dry-run manifest');
    DRYRUN_SOURCES.forEach(src => console.log(`${src.priority}. ${src.id} -> ${src.targets.join(', ')}`));
  }
}
