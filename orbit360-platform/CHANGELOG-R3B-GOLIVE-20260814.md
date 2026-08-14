# CHANGELOG R3B GO-LIVE · 2026-08-14

## Run 31830415411

- source-gate se detuvo antes de secrets/browser;
- causa: marcador negativo `tenantHintAuthority:false` interpretado por un chequeo literal como autoridad tenant;
- clasificación: `VALIDATOR_STALE / NEGATIVE_MARKER_FALSE_POSITIVE`;
- corrección: retirar marcador textual negativo sin cambiar la lógica runtime del bridge;
- 0 browser, 0 writes, 0 deploy, 0 producción.

## Run 31830646641

- source/gate PASS;
- no LAB runtime PASS;
- dynamic closure PASS;
- identidad/config PASS;
- Product App PASS;
- required hydration 7/7 PASS;
- tenant-context PASS desde membership/store;
- backend context PASS `product-readonly`;
- active tenant insurer config PASS con src real;
- route `inicio` y host renderizados;
- counts 430 clientes / 30 aseguradoras;
- local HTTP failures 0;
- writes 0;
- deploy 0;
- producción intacta;
- FAIL final por `pageError: lecciones`.

### Cierre

`FUNCTIONAL_DEFECT / PRODUCT_TENANT_RUNTIME_CONTEXT_BRIDGE_MISSING` → CLOSED.

### Nueva causa

`PIPELINE_MECHANISM_FAILURE / PRODUCT_BOOTSTRAP_INCLUDES_LAB_ONLY_ACADEMIA_STATIC_CONTENT`

El bootstrap productivo está cargando `data/academia-v1230-operational-directory-v20260722.js`, un inyector de contenido estático cuyo propio contrato declara `transient_session_only_in_lab`; al llamar `insert/update` contra el store productivo read-only, el store bloquea correctamente y genera el pageerror.

### Acción siguiente

Excluir ese inyector LAB-only de la composición productiva read-only, source-gate, ejecutar una prueba de esta nueva familia y, solo con PASS limpio, materializar ZIP durable + manifest + hash.
