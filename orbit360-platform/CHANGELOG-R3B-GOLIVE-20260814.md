# CHANGELOG R3B GO-LIVE · 2026-08-14

## Run 31830415411

- source-gate se detuvo antes de secrets/browser;
- causa: marcador negativo `tenantHintAuthority:false` interpretado por un chequeo literal como autoridad tenant;
- clasificación: `VALIDATOR_STALE / NEGATIVE_MARKER_FALSE_POSITIVE`;
- corrección: retirar marcador textual negativo sin cambiar la lógica runtime del bridge;
- 0 browser, 0 writes, 0 deploy, 0 producción.

## Run 31830646641

- source/gate PASS;
- no LAB runtime PASS según gate vigente;
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

### Cierre tenant-context

`FUNCTIONAL_DEFECT / PRODUCT_TENANT_RUNTIME_CONTEXT_BRIDGE_MISSING` → CLOSED.

### Nueva familia aislada

`PIPELINE_MECHANISM_FAILURE / PRODUCT_BOOTSTRAP_INCLUDES_LAB_ONLY_ACADEMIA_STATIC_CONTENT`.

El owner `data/academia-v1230-operational-directory-v20260722.js` declara `transient_session_only_in_lab` y ejecuta `insert/update`; product read-only bloquea correctamente y genera el pageerror.

## Run 31834590862

HEAD runtime: `dc5822d2b6561460edbd36c29e58951666a1000a`.

- se retiró `operationalAcademy` del bootstrap productivo;
- source-gate PASS antes de secrets;
- identidad/config PASS;
- tenant-context continuó PASS;
- required 7/7 continuó PASS;
- clientes=430;
- aseguradoras=30;
- route `inicio` continuó renderizando;
- local HTTP failures=0;
- writes=0;
- deploy=0;
- producción intacta;
- FAIL final nuevamente por `pageError: lecciones`;
- package durable correctamente `skipped`.

### STOP_RETRY

Este es el segundo fallo de la misma familia. No hay tercer navegador automático.

### Causa raíz exacta

La exclusión directa del bootstrap sí funcionó, pero la clausura dinámica todavía incluyó `data/academia-v1230-operational-directory-v20260722.js`.

El padre transitivo identificado es `core/academia-static-content-write-policy-v20260729.js`:

- encabezado explícito `LAB only`;
- define `OPERATIONAL_OWNER_SRC='data/academia-v1230-operational-directory-v20260722.js?...'`;
- llama `ensureOperationalDirectoryOwner()` globalmente;
- sigue entrando al artefacto productivo porque el gate vigente detecta LAB principalmente por token en ruta/nombre y esta policy no contiene `lab` en el filename.

Por tanto, el source-gate anterior fue insuficiente para semántica LAB-only aunque sus checks sintácticos pasaran.

Clasificación vigente en ese punto:

- `VALIDATOR_STALE / PRODUCT_LAB_ONLY_STATIC_POLICY_NOT_REGISTERED`;
- causa raíz pipeline: `PIPELINE_MECHANISM_FAILURE / PRODUCT_TRANSITIVE_LAB_ONLY_STATIC_POLICY_INCLUDED`.

## Run 31835518503 · control negativo source-only

HEAD: `8c061f999263983145326f8d55c323b06160d9e9`.

Se congeló el workflow existente con `ORBIT360_R3_SOURCE_ONLY_ROOTFIX=true` y se agregaron assertions exactas para ambos archivos incompatibles.

Resultado:

- source gate: FAIL esperado;
- runtime tools: skipped;
- secrets/identity: skipped;
- browser: skipped;
- ZIP: skipped.

Este FAIL confirmó que el validador corregido ya no aceptaba el artefacto contaminado.

## Run 31835646012 · cierre source-only

HEAD: `fc281a6865f5b5ae75d01f9deb01b4da04baa305`.

Cambios de causa raíz:

- builder: registro `PRODUCT_INCOMPATIBLE_EXACT` para la policy LAB-only y su owner;
- composición: ambos archivos se eliminan/bloquean por nombre exacto además de la detección por token;
- dynamic closure: ambos archivos se registran como semánticamente prohibidos y el gate falla si aparecen en artefacto o dependency closure;
- workflow: permanece source-only, sin acceso a secretos ni navegador.

Evidencia:

- gate contractual source PASS;
- build PASS;
- entrypoint source PASS;
- dynamic closure PASS;
- staticRootCount=115;
- dependencyClosureCount=193;
- dynamicDependencyCount=78;
- missing=0;
- dynamicMissing=0;
- knownMissing=0;
- tenantRefsMissing=0;
- parityFailures=0;
- forbiddenIncluded=0;
- semanticForbiddenIncluded=0;
- discoveredSemanticForbidden=0;
- noLabRuntime=true;
- secretAccess=false;
- browserExecuted=false;
- deployExecuted=false;
- productionTouched=false.

### Cierre source-only

- `VALIDATOR_STALE / PRODUCT_LAB_ONLY_STATIC_POLICY_NOT_REGISTERED` → CLOSED.
- `PIPELINE_MECHANISM_FAILURE / PRODUCT_TRANSITIVE_LAB_ONLY_STATIC_POLICY_INCLUDED` → CLOSED_SOURCE_ONLY.

La próxima ejecución de navegador, si se autoriza, será una frontera nueva de aceptación post-causa-raíz y no un tercer retry automático. Solo con clean render PASS se podrá generar manifest + SHA256 + ZIP durable.
