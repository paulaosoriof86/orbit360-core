# CHANGELOG · R4S3 Go-Live · 2026-08-16

## Cambio funcional R4S3

`core/access-scope.js` elimina el patrón relacional N×clone para scopes `team/own` mediante índices locales de relación cliente/póliza construidos una vez por filtro. No cambia la API pública, permisos, países ni la semántica de visibilidad.

Causa raíz cerrada del rootfix: `FUNCTIONAL_DEFECT / ACCESS_SCOPED_RELATIONAL_NX_CLONE_TEAM_OWN`.

Gap histórico: `VALIDATOR_STALE / ACCESS_FASTPATH_REGRESSION_DID_NOT_EXERCISE_SCOPED_RELATIONAL_TEAM_OWN_PATH`.

## Paquete R4S3 certificado y publicado

- certificación run `31959607956`, job `95195458503`
- `orbit360-fase-a-product-r4s3-294ed22bdb56.zip`
- SHA256 `1ab5f3ea7f59cd0c2eb2bb1f5c0596a4bf3ca241f42016f74bf095ccbaf0f78e`
- source `294ed22bdb564585b71fc59cefa1d04cdfa6b120`
- 194 archivos
- 1 delta: `core/access-scope.js`
- SHA256 R4S3 `core/access-scope.js`: `624f7538809dbea59294a2c94a4acce58f326b0812625754891fb7b0fa4d3e1f`
- 193 archivos byte-idénticos a R4S2
- durable artifact `9266877667`
- evidence artifact `9266877528`.

Publicación HostDime confirmada y verificada por identidad pública exacta:
- run `31960492114`
- job `95197609260`
- artifact `9267096364`
- manifest/source/fileCount/hashes exactos PASS.

## Regresión current-state-aware

El validador `tools/orbit360-r4-team-scope-relational-index-regression-v20260816.mjs` se hizo idempotente/current-state-aware en commit `3a19147c5015a468ffd17c43a25bb7867f3e3f4a`.

Run `31961008159`, job `95198880917`, artifact `9267237461` → PASS.

Confirmó que el rootfix ya estaba aplicado con SHA exacto y preservó equivalencia semántica Dirección/Operativo/Asesor. Operativo redujo facade de 45,631 a 25 `getCalls`; Asesor de 36,245 a 20. Cero browser, datos, secretos y writes.

## Matriz productiva final read-only

Activación atómica R4S3: `69aca5ba0acfe865a01d2918e2f2fc7e18a31984`.

Run `31961220051`, job `95199386898`, artifact `9267316246`, digest `sha256:e94f1605d6d8c7a75785aae174e11f8c3019383d7c846e5a82c2593ded9236df`.

PASS antes del fallo:
- gate canónico;
- manifest R4S3 exacto;
- auth runtime asset HTTP 200 + SHA exacto;
- login HTTP 200;
- usuario autenticado y email verificado;
- membership activa y tenant correcto;
- roles requeridos presentes;
- runtime/router/store read-only ready;
- 430 clientes y 30 aseguradoras;
- Dirección `inicio` PASS;
- Dirección `cliente360` PASS;
- cero page errors, console errors, HTTP failures, write signals y copy técnico;
- Firestore/Auth/operational writes = 0.

Fallo terminal:

`FUNCTIONAL_DEFECT / R4_ROLE_ROUTE_STAGE_TIMEOUT`

El grupo Dirección agotó su presupuesto externo de 90 s. Dentro del grupo se observaron 22.298 s antes del primer route, `inicio` 0.359 s, `cliente360` 57.804 s y solo 9.540 s de observación de `aseguradoras` antes de expirar el timeout. No existe PASS/FAIL propio de Aseguradoras y no se atribuye el defecto a ese módulo.

La autorización de la matriz quedó consumida.

## STOP_RETRY y refreeze

La familia `R4_ROLE_ROUTE_STAGE_TIMEOUT` vuelve a aparecer, por lo que STOP_RETRY queda activo.

Refreeze: `e955ba1d9a867f95f0630685e0f384e09617d1fe`.

- workflow `SOURCE_ONLY=true`;
- contrato R4S3 preservado;
- refreeze no disparó workflow;
- sin segunda matriz;
- sin nuevo patch de producto;
- sin reimportación, Auth/data changes, deploy, main ni merge.

## Próxima frontera

Requiere autorización explícita para diagnóstico exclusivamente source-only/static de causa raíz del tiempo acumulado del grupo Dirección. Debe separar costo de activación de rol, render/main-thread de Cliente 360, entrada a Aseguradoras y presupuesto del harness, y decidir con evidencia si el owner es producto o validador antes de autorizar cualquier nuevo browser.
