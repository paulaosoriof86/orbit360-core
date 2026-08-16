# CHANGELOG · R4S3 Go-Live · 2026-08-16

## Cambio funcional R4S3

`core/access-scope.js` elimina el patrón relacional N×clone para scopes `team/own` mediante índices locales de relación cliente/póliza construidos una vez por filtro. No cambia la API pública, permisos, países ni la semántica de visibilidad.

Causa raíz cerrada del rootfix: `FUNCTIONAL_DEFECT / ACCESS_SCOPED_RELATIONAL_NX_CLONE_TEAM_OWN`.

## Paquete R4S3 certificado y publicado

- certificación run `31959607956`, job `95195458503`
- ZIP `orbit360-fase-a-product-r4s3-294ed22bdb56.zip`
- SHA256 `1ab5f3ea7f59cd0c2eb2bb1f5c0596a4bf3ca241f42016f74bf095ccbaf0f78e`
- source `294ed22bdb564585b71fc59cefa1d04cdfa6b120`
- 194 archivos; 1 delta `core/access-scope.js`; 193 byte-idénticos a R4S2
- identidad pública exacta PASS run `31960492114`.

## Matriz productiva final read-only consumida

Run `31961220051`, job `95199386898`, artifact `9267316246`.

Antes del STOP pasaron: manifest/Auth/login/membership/tenant/runtime/store read-only, 430 clientes, 30 aseguradoras, Dirección Inicio y Dirección Cliente 360, con cero errores de página/consola/HTTP y cero writes.

Fallo terminal: `FUNCTIONAL_DEFECT / R4_ROLE_ROUTE_STAGE_TIMEOUT`.

Cronología Dirección: setup previo 22.298 s + Inicio 0.359 s + Cliente 360 57.804 s + Aseguradoras observada 9.540 s = 90.001 s contra presupuesto externo de 90 s. Aseguradoras no produjo PASS/FAIL propio.

STOP_RETRY y refreeze `e955ba1d9a867f95f0630685e0f384e09617d1fe`; workflow productivo permanece `SOURCE_ONLY=true`.

## Causa raíz source-only cerrada

Autorización de diagnóstico consumida en run `31962262791`, job `95201876769`, artifact `9267541412`, digest `sha256:b7da1787074a948958f7d687fb8c0943c54b3375a36081d9aad2e565c8333740` → SUCCESS.

Clasificación definitiva:

- `FUNCTIONAL_DEFECT`
- failure family `CLIENTE360_BATCH_SUMMARY_CONTRACT_MISSING_NX_CLONE`
- owner único `orbit360-platform/core/queries.js`
- owner type `PRODUCT`.

Cliente 360 ya intenta usar `q.clientesResumenIndex()`, pero `core/queries.js` no lo implementa/exporta. El fallback ejecuta `q.clienteResumen(c.id)` al menos 470 veces en la carga inicial (430 clientes del agregado + 40 filas visibles). Cada resumen usa `get(clientes)` y `where(polizas/cobros/comisiones)`, mientras el store productivo implementa get/where mediante `all()`, que clona toda la colección.

En el fixture versionado 430 clientes / 1,375 pólizas / 1,900 cobros / 900 comisiones:

- 4,605 filas clonadas por fallback de resumen;
- lower bound Cliente 360: **2,164,350 filas clonadas**;
- una pasada batched equivalente: 4,605 filas;
- amplificación estructural: **470×**.

El presupuesto acumulativo de 90 s queda clasificado como `VALIDATOR_STALE_SECONDARY / CUMULATIVE_ROLE_GROUP_BUDGET_AND_ROUTE_ATTRIBUTION`: explica la truncación de Aseguradoras y la atribución al grupo, pero no genera los 57.804 s de trabajo de Cliente 360. No es el root owner.

Aseguradoras presenta una ineficiencia secundaria de 30 scans de pólizas (~41,250 filas en el fixture), equivalente a ~1.91% del lower bound de Cliente 360, y no es el owner terminal probado.

## Gate correctivo único

Creado: `tools/orbit360-r4-cliente360-summary-boundedness-gate-v20260816.mjs`.

R4S3 actual produce el FAIL esperado:

- `CLIENTE360_SUMMARY_BOUNDEDNESS_GATE_FAIL`
- `FUNCTIONAL_DEFECT`
- `CLIENTE360_BATCH_SUMMARY_CONTRACT_MISSING`
- owner `core/queries.js`.

Para cerrar el gate, `Orbit.q.clientesResumenIndex` debe existir/exportarse como `Map` de 430 resúmenes, preservar semántica y cumplir en el fixture versionado: `allCalls<=8`, `getCalls<=10`, `cloneRows<=20000`.

No se aplicó todavía ningún fix de producto. No browser, secretos, datos, deploy, reimportación, Auth changes, main ni merge.

## Próxima frontera

Solo con nueva autorización explícita: aplicar exclusivamente el rootfix batched en `core/queries.js`, ejecutar gate canónico + gate de boundedness + regresión semántica. Empaquetado/publicación/browser permanecen fuera de autorización hasta un gate posterior.
