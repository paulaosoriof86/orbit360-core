# CHECKPOINT F1 — SOURCE-ONLY BOOTSTRAP ATTRIBUTION

Fecha: 2026-08-18
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open
Estado: `F1_IN_PROGRESS_OBSERVER_SELFTEST_PASS_RUNTIME_OBSERVATION_PENDING`

## Clasificación vigente

Bloqueo técnico: `FUNCTIONAL_DEFECT / R4_RUNTIME_ACTIVATION_TRIGGER_FAILED`.

STOP_RETRY permanece activo. No se autoriza por este checkpoint un nuevo runtime/browser/deploy/candidata.

## Evidencia runtime previa conservada

Run existente `32155605314`, job `95771954009`:

- manifest PASS;
- auth asset PASS;
- custom-token submit/http PASS;
- auth projection PASS;
- membership read PASS;
- `runtime-activation-trigger` falló 109 ms después del membership PASS;
- error exterior `PRODUCT_READONLY_BOOTSTRAP_NOT_READY`;
- Firestore/Auth/operational writes = 0;
- deploy/rebuild = 0.

Ese run ocurrió antes del observer actual y no contiene el error interno del bootstrap. Queda prohibido inferirlo o reejecutar el request consumido.

## Atribución source-only confirmada

### Owner exterior

`orbit360-platform/core/product-app-p0.js`

`productAppP0.activate()` llama a `backendProductReadOnlyBootstrapP0.start(...)` y convierte un resultado no ready en `PRODUCT_READONLY_BOOTSTRAP_NOT_READY`.

### Owner del estado interno

`orbit360-platform/core/backend-product-readonly-bootstrap-p0.js`

El bootstrap conserva internamente `status.phase` / `status.errors`, pasa fail-closed a `blocked` y devuelve el resultado sin relanzar la causa. La causa específica interna sigue `UNKNOWN_PENDING_SANITIZED_OBSERVATION`.

### Paridad con paquete publicado

El bootstrap del source head certificado R4S9C `861326906558f03d9c8c2e7f34adfb4979a17d73` y el owner inspeccionado mantienen la paridad previamente certificada. No se diagnostica sobre una variante imaginaria.

## F1.2A — self-test canónico ejecutado y PASS

Se materializaron en aislamiento local los tres blobs exactos del HEAD operativo previo `2a8490e1ca9c720bc2e603e1244faee3a8e4da98` mediante el conector GitHub y se comprobó su identidad con `git hash-object` antes de ejecutar:

- base harness blob `07a002b43f6b4778891f0afdf86d9f3222dd3141`;
- certified wrapper blob `c4cc63d561361b9e7967b344b9032834e6b71d53`;
- observer blob `8190abf0ca77a5e63f228e55a7cbd7bcb0a03786`.

Comando ejecutado en aislamiento:

`ORBIT360_EXPECTED_RESULT_REVISION=paula-postauth-custom-token-readonly-v1 node tools/orbit360-r4-role-route-attribution-wrapper-v20260816.mjs --self-test-only`

Resultado:

- `ok=true`;
- `status=R4_ROLE_ROUTE_ATTRIBUTION_SELFTEST_PASS`;
- `targetBound=true`;
- `patchedHarnessSyntaxPass=true`;
- `certifiedProbeSyntaxPass=true`;
- `bootstrapObserverBound=true`;
- `bootstrapSingleInvocationPreserved=true`;
- `noStandaloneSecondBootstrapStart=true`;
- `bootstrapObserverAllowlistOnly=true`;
- `bootstrapObserverRestoresOwner=true`;
- `activationFailureObservedWithoutSecondRun=true`;
- browser = 0;
- secret access = 0;
- data access = 0;
- production touched = false;
- deploy/rebuild = 0;
- Firestore/Auth/operational writes = 0.

Evidencia persistida:

`orbit360-platform/runtime-gate-crm-v20260716/r4-role-route-attribution-selftest-v20260818.json`

La primera tentativa de materialización por red directa falló por DNS del entorno aislado y no ejecutó la prueba; se clasificó como `ENVIRONMENT_FAILURE` del carril local, sin impacto de producto. La ejecución válida posterior utilizó blobs obtenidos por el conector y verificados por hash.

## Hallazgo causal actualizado

El mecanismo de observación ya está source-only y sintácticamente certificado. Esto cierra la duda de si el observer podía introducir un segundo bootstrap, filtrar campos no permitidos o dejar el owner reemplazado.

Todavía NO demuestra cuál transición interna (`environment`, `authentication`, `membership`, `planning`, `attaching`, `waiting-snapshots`, `installing`, etc.) produjo el `blocked` real. Esa información requiere una única observación runtime nueva y explícitamente autorizada; no puede recuperarse del run viejo.

## Progreso F1

- F1.1 límite/owner + observer source: 25% — **CERRADO**;
- F1.2A self-test canónico del observer: 12.5% — **CERRADO**;
- F1.2B fase/error interno sanitizado en una única observación runtime: 12.5% — **PENDIENTE**;
- F1.3 rootfix únicamente en owner demostrado + source/static/synthetic: 25% — pendiente;
- F1.4 cierre de atribución y única frontera real posterior: 25% — pendiente.

F1 interno: **37.5%**.
Ruta inmediata a producción: **20% cerrado**; F1 no suma al global hasta 100%.
Programa integral: **10% cerrado**; F1 no suma al global hasta 100%.

## Contrato congelado de la próxima observación runtime

La siguiente frontera, cuando exista autorización explícita, deberá:

1. ejecutar primero el gate-contract validator correspondiente;
2. utilizar el observer ya certificado, sin cambiarlo por otro patch;
3. crear un request nuevo, único, inmutable y single-use; nunca reusar `32155605314`;
4. no realizar deploy, rebuild, cambio de contraseña, reset, alta/baja de usuarios, memberships writes, Firestore writes, Rules, Storage ni datos operativos;
5. no lanzar un segundo bootstrap standalone;
6. capturar solo `bootstrapObservation.phase`, `errors`, `assignedRoleCount`, `countryCount`, `collectionCount`, `ready`, `writeAuthorized` y el error exterior sanitizado;
7. detener inmediatamente después de obtener esa observación;
8. clasificar owner/causa una sola vez y sincronizar documentación antes de cualquier rootfix;
9. si la misma familia falla sin producir observación nueva, mantener STOP_RETRY y no abrir tercer intento.

Este diseño no constituye autorización para ejecutar runtime/browser.

## Seguridad / impacto acumulado de esta iteración

- browser/runtime nuevos: 0;
- secretos: 0;
- data reads productivos nuevos: 0;
- Firestore writes: 0;
- Auth writes: 0;
- operational writes: 0;
- deploy: 0;
- rebuild/candidata: 0;
- main/merge: 0.

## Siguiente acción exacta

`F1_2B_SINGLE_RUNTIME_BOOTSTRAP_OBSERVATION` — solo con autorización explícita de runtime/browser: validar primero el gate contract, materializar un request nuevo e inmutable conforme al contrato anterior, ejecutar una sola frontera read-only y capturar `bootstrapObservation.phase/errors`. Detener y sincronizar inmediatamente después. No reusar `32155605314`, no deploy, no candidata y no rootfix antes de esa evidencia.