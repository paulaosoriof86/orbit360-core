# Orbit 360 · Plataforma

Estado rector: `docs/orbit360-live-state-v1.json`. Checkpoint vigente: `docs/STOP-R4S3-FINAL-MATRIX-ROLE-ROUTE-TIMEOUT-20260816.md`. Changelog: `CHANGELOG-R4S3-GOLIVE-20260816.md`.

R4S3 está **certificada, publicada y verificada byte a byte** en `app.aysseguros.com`:

- ZIP `orbit360-fase-a-product-r4s3-294ed22bdb56.zip`
- SHA256 `1ab5f3ea7f59cd0c2eb2bb1f5c0596a4bf3ca241f42016f74bf095ccbaf0f78e`
- source `294ed22bdb564585b71fc59cefa1d04cdfa6b120`
- 194 archivos
- delta único `core/access-scope.js`
- SHA256 público del delta `624f7538809dbea59294a2c94a4acce58f326b0812625754891fb7b0fa4d3e1f`
- identidad pública run `31960492114` PASS.

La causa previa de scope relacional `team/own` quedó corregida en R4S3. El validador versionado se hizo current-state-aware/idempotente en commit `3a19147c5015a468ffd17c43a25bb7867f3e3f4a`; run source-only `31961008159` PASS confirmó equivalencia semántica Dirección/Operativo/Asesor y el rootfix exacto ya aplicado, sin browser, datos ni writes.

La única matriz productiva final read-only autorizada fue consumida en run `31961220051`, job `95199386898`, artifact `9267316246`. Antes del STOP pasaron manifest R4S3, auth asset, login HTTP 200, usuario/email, membership, tenant, roles, runtime/router/store read-only, 430 clientes, 30 aseguradoras y Dirección `inicio` + `cliente360`. Se observaron cero page errors, console errors, HTTP failures, write signals y cero Firestore/Auth/operational writes.

El resultado terminal fue:

`FUNCTIONAL_DEFECT / R4_ROLE_ROUTE_STAGE_TIMEOUT`

El grupo Dirección agotó su presupuesto externo de 90 s: 22.298 s previos al primer route, `inicio` 0.359 s, `cliente360` 57.804 s y 9.540 s de `aseguradoras` antes del timeout externo. Aseguradoras no obtuvo PASS/FAIL propio, por lo que no se atribuye allí el defecto.

Refreeze inmediato: `e955ba1d9a867f95f0630685e0f384e09617d1fe`; `SOURCE_ONLY=true`, contrato R4S3 preservado y cero workflows disparados por el refreeze.

**STOP_RETRY activo.** No hay segunda matriz autorizada ni nuevo patch permitido antes de aislar causa raíz. La siguiente frontera, solo con autorización explícita, es diagnóstico source-only/static para separar costo de activación de rol, render/main-thread de Cliente 360, entrada a Aseguradoras y presupuesto del harness, y determinar un único owner antes de cualquier nuevo browser.

Sin reimportación, cambios Auth/datos, deploy, main ni merge. Avance: **100% funcional / 75% técnico / 67% gates (2/3)** hasta `POST_GO_LIVE_SMOKE_PASS`.
