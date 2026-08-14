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

Clasificación vigente:

- `VALIDATOR_STALE / PRODUCT_LAB_ONLY_STATIC_POLICY_NOT_REGISTERED`;
- causa raíz pipeline: `PIPELINE_MECHANISM_FAILURE / PRODUCT_TRANSITIVE_LAB_ONLY_STATIC_POLICY_INCLUDED`.

### Acción siguiente

Solo source-only. Congelar runtime y corregir composición + registro/validador para prohibir tanto la policy LAB-only como su owner transitivo. Exigir ausencia de ambos en artefacto y clausura dinámica manteniendo Fase A crítica. Detener después de esa evidencia y sincronizar. Cualquier navegador posterior requiere una nueva frontera explícitamente autorizada post-causa-raíz; no tercer retry automático.
