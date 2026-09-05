/* Gravicentra Insurance · Product runtime public configuration placeholder.
   Production build materializes environment values in the isolated runner workspace.
   No secret or authoritative tenant identity is stored here. */
window.__ORBIT360_PRODUCT_PUBLIC_CONFIG__ = Object.freeze({
  enabled: false,
  environmentRef: 'unconfigured',
  tenantHint: '',
  hydrationContractVersion: 'fase-a-i2-20260905.3-ledger-server-owned',
  hydrationContractSource: 'recovery/fase-a-clean-20260831',
  requiredCollections: Object.freeze(['clientes','polizas','cobros','aseguradoras']),
  optionalCollections: Object.freeze([
    'vehiculos',
    'recibosEsperados',
    'carteraPrimas',
    'estadosCuentaAseguradora',
    'recibosAseguradora',
    'conciliacionesPrimas',
    'conciliaciones',
    'asesores',
    'metas',
    'negocios',
    'gestiones',
    'comisiones',
    'cancelaciones'
  ])
});
