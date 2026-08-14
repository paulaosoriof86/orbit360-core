# CIERRE PARCIAL R3 · TENANT-CONTEXT PASS + BLOQUEO DE CONTENIDO ESTÁTICO ACADEMIA · 2026-08-14

## Resultado de la frontera

R3 permanece abierto, pero el bloqueo tenant-context queda definitivamente cerrado.

### Run source-only previo

- workflow: `Orbit360 Fase A Product Local Synthetic 20260814`
- run: `31830415411`
- HEAD: `1b2682ba28704ee09d898bd1fdfd8cfa36644dca`
- resultado: FAIL antes de secrets/browser por falso positivo del marcador textual `tenantHint`
- clasificación: `VALIDATOR_STALE / NEGATIVE_MARKER_FALSE_POSITIVE`
- browser: no
- producción: no

Se corrigió sin alterar lógica runtime retirando solo el marcador textual negativo. HEAD resultante: `40f184fa0b0758f271701a9d18c93e3d6843b3e2`.

### Run R3 real

- workflow: `Orbit360 Fase A Product Local Synthetic 20260814`
- run: `31830646641`
- job: `94865245675`
- HEAD: `40f184fa0b0758f271701a9d18c93e3d6843b3e2`
- gate/source before secrets: PASS
- identidad/config pública: PASS
- tenant-context: PASS
- router/render: PASS hasta observar pageerror
- package: SKIPPED correctamente por pageerror
- writes: 0
- deploy: 0
- producción: intacta

## Cierres certificados

### Tenant-context

`FUNCTIONAL_DEFECT / PRODUCT_TENANT_RUNTIME_CONTEXT_BRIDGE_MISSING` → **CERRADO**.

Evidencia:

- Product App started = true
- routerStarted = true
- tenantContextReady = true
- tenant source = authenticated-product-membership
- backend mode = product-readonly
- active tenant insurer config = ready
- config src = `data/tenant-alianzas-soluciones-insurers-p10.js`
- route = inicio
- hostChildCount = 1
- requiredMissing = []
- requiredFailed = []
- clientes = 430
- aseguradoras = 30
- local HTTP failures = 0
- writes = 0

No se ejecutará un tercer intento de tenant-context.

### Package safety source-only

El gate también certificó:

- product entrypoint source PASS;
- no forbidden runtime;
- no LAB entrypoint refs;
- dynamic assets PASS;
- forbiddenIncluded = [];
- noLabRuntime = true.

El arreglo de nombre/hash ZIP quedó preparado pero no runtime-certificado porque el paso ZIP fue `skipped` tras el pageerror.

## Nuevo bloqueo demostrado

`PIPELINE_MECHANISM_FAILURE / PRODUCT_BOOTSTRAP_INCLUDES_LAB_ONLY_ACADEMIA_STATIC_CONTENT`

Stack sanitizado:

1. `data/store-firestore-product-readonly-p0.js:73`
2. `data/academia-v1230-operational-directory-v20260722.js:30`
3. `data/academia-v1230-operational-directory-v20260722.js:32`
4. `data/academia-v1230-operational-directory-v20260722.js:33`
5. `core/product-app-p0.js:45`

La causa es inequívoca: `academia-v1230-operational-directory-v20260722.js` declara `staticContentPersistence:'transient_session_only_in_lab'` y su `apply()` ejecuta `S.insert/S.update` sobre `lecciones`, `evaluaciones` y `config`. El bootstrap productivo read-only lo está cargando. El store productivo bloquea esas escrituras por diseño; por eso el mensaje del Error es `lecciones`.

No es un fallo de Auth, membership, tenant-context, datos, Firestore rules, dynamic graph, router ni HostDime.

## Siguiente acción exacta

1. No tocar tenant-context, Auth, membership, store productivo ni router.
2. No habilitar escrituras para “resolver” Academia.
3. Modificar solo el bootstrap/composición productiva para no cargar el inyector estático LAB-only `data/academia-v1230-operational-directory-v20260722.js` en product read-only.
4. Source-gate que esa exclusión no rompe rutas críticas de Fase A.
5. Ejecutar una sola prueba de render para esta nueva familia.
6. Con PASS limpio, crear manifest + SHA256 + ZIP durable en el mismo run.
7. Si esta familia falla de nuevo, `STOP_RETRY`.

## Estado de avance

- funcional: 100%
- técnico global: 50%
- gates finales: 0/3
- R3: dynamic graph PASS / no-LAB PASS / tenant-context PASS / router inicio render PASS / pageerror FAIL / ZIP pendiente

R3 no cuenta como cerrado hasta obtener render sin pageerror y ZIP durable certificado.
