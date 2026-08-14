# PRECHECKPOINT R3 · segunda frontera tenant-context + package safety · 2026-08-14

## Estado de partida

- Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`.
- PR #5: draft/open, sin merge.
- Baseline funcional preservado: `4ede3e785cb2cc889a7c11c2d9e2030c7af20b64`.
- R1 cerrado.
- R2 cerrado.
- R3 parcial: dynamic graph cerrado; render/ZIP pendientes.
- Última evidencia runtime: run `31823597463`.
- Producción/HostDime: no tocar en esta frontera.
- Escrituras de datos: no autorizadas.

## Clasificación principal

`FUNCTIONAL_DEFECT / PRODUCT_TENANT_RUNTIME_CONTEXT_BRIDGE_MISSING`

El tenant autenticado ya existe en `Orbit.auth.productUser.tenantId` y en `Orbit.store._productStatus().tenantId`, pero el router consulta su hook runtime sin recibir esa proyección y deja el contrato activo de configuración tenant en `src="" / no-source`.

## Hallazgos preventivos de paquete detectados antes del segundo navegador

### 1. Bootstrap genérico no apto para paquete productivo

El `index.html` canónico todavía referencia `core/router-tenant-config-bootstrap.js`. Ese bootstrap genérico usa tenant desde query string y referencia un proveedor `*-lab-*`. Aunque el proveedor está protegido para host/modo LAB y no fue la causa del fallo R3, no debe viajar en el paquete productivo read-only ni puede sustentar una certificación `noLabRuntime=true`.

Clasificación de ensamblaje: `PIPELINE_MECHANISM_FAILURE / PRODUCT_ARTIFACT_LAB_BOOTSTRAP_LEAK`.

Corrección preparada: reemplazo solo en el artifact productivo por un bootstrap reusable product-safe que carga contratos visuales/read-only, difiere la configuración tenant hasta después de autenticación, no usa tenant por URL, no contiene proveedor LAB y no hardcodea A&S.

### 2. Validador `noLabRuntime` incompleto

El filtro de R3 solo bloqueaba tres patrones históricos y no reconocía cualquier archivo con token `lab` en su nombre. Esto podía producir un PASS nominal aun si un provider `*-lab-*` quedaba dentro del artifact.

Clasificación: `VALIDATOR_STALE / NO_LAB_RUNTIME_PATH_MATCHER_INCOMPLETE`.

Corrección preparada: build determinista limpio + filtro por token LAB en path + entrypoint gate que rechaza referencias LAB + manifest que vuelve a validar los archivos reales del artifact.

### 3. Certificación ZIP con variables divergentes

El workflow calculaba `ZIP_NAME` y `ZIP_SHA` como variables de shell, pero el `node -e` de certificación leía valores de entorno distintos (`ZIP_SHA=placeholder` y un nombre de ZIP diferente). El paso podía producir metadata que no representara el archivo real.

Clasificación: `PIPELINE_MECHANISM_FAILURE / DURABLE_PACKAGE_HASH_ENV_MISMATCH`.

Corrección preparada: exportar el nombre/hash realmente calculados, comprobar SHA-256 de 64 caracteres, comparar JSON↔archivo↔sha256sum y permitir upload durable solo tras esas verificaciones.

## Observabilidad secundaria

El run anterior registró `pageError: "lecciones"` sin stack suficiente. No se modifica Academia por inferencia.

La segunda prueba capturará únicamente evidencia sanitizada de `message`, `name` y frames (`scope`, `host`, `path`, `line`, `column`), sin query strings, emails, tokens ni secretos.

## Contrato de la única segunda prueba R3

Antes de secrets/browser el workflow debe exigir:

1. `orbit360-validar-gate-contracts-v20260717.mjs` PASS;
2. sintaxis PASS de builder, bridge tenant, product bootstrap, entrypoint gate, dynamic package y render proof;
3. build limpio reproducible;
4. dynamic graph PASS;
5. cero archivos/referencias LAB en entrypoint/artifact;
6. product tenant bridge y product router bootstrap source-gated.

Solo después se permite identidad existente + navegador read-only.

El render PASS exige:

- Product App started;
- tenant-context ready desde membership/store y paridad entre ambas fuentes;
- `OrbitBackend` product-readonly con el mismo tenant autenticado;
- contrato `data-orbit-tenant-insurer-config-active-v20260717` en `ready` con `src` real;
- store `ready-read-only`;
- 7/7 required, missing=0, failed=0;
- clientes=430;
- aseguradoras=30;
- router/route/host render real;
- cero 404 local;
- cero page error bloqueante;
- cero escrituras/deploy/producción.

Solo con ese PASS el mismo run puede crear manifest + SHA256 + ZIP durable.

## STOP_RETRY

Esta será la segunda y última ejecución de la familia `PRODUCT_TENANT_RUNTIME_CONTEXT_BRIDGE_MISSING`.

Si esa misma familia vuelve a fallar: `STOP_RETRY`, sin tercer navegador ni parche. Si aparece una familia distinta, se clasifica desde la evidencia del mismo run antes de cualquier nueva acción.
