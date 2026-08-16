# STOP R4S3 — matriz final consumida · role-route timeout

Fecha: 2026-08-16

## Estado

R4S3 permanece publicada y con identidad pública exacta PASS en `https://app.aysseguros.com`.

Paquete certificado e inmutable:
- `orbit360-fase-a-product-r4s3-294ed22bdb56.zip`
- SHA256 `1ab5f3ea7f59cd0c2eb2bb1f5c0596a4bf3ca241f42016f74bf095ccbaf0f78e`
- source `294ed22bdb564585b71fc59cefa1d04cdfa6b120`
- 194 archivos
- delta único `core/access-scope.js`

## Regresión current-state-aware

La corrección autorizada se limitó a `tools/orbit360-r4-team-scope-relational-index-regression-v20260816.mjs`.

Commit: `3a19147c5015a468ffd17c43a25bb7867f3e3f4a`.

Run source-only `31961008159`, job `95198880917`, artifact `9267237461` → PASS.

La regresión reconoció `rootfixAlreadyApplied=true`, comparó el baseline exacto R4S2 contra el source R4S3 ya aplicado y confirmó equivalencia semántica Dirección/Operativo/Asesor. No ejecutó browser, secretos, datos ni writes.

## Activación única de matriz R4S3

Contrato R4S3 + activación se ligaron atómicamente en commit `69aca5ba0acfe865a01d2918e2f2fc7e18a31984`.

Run final `31961220051`, job `95199386898`, artifact `9267316246`, digest `sha256:e94f1605d6d8c7a75785aae174e11f8c3019383d7c846e5a82c2593ded9236df`.

La autorización de esta matriz quedó consumida.

## Evidencia que sí pasó

- gate canónico PASS;
- contrato/self-test exacto R4S3 PASS;
- manifest R4S3 PASS, 194 archivos y source exacto;
- auth runtime asset HTTP 200 y SHA exacto;
- login HTTP 200;
- signed-in y email verified;
- membership disponible/activa;
- tenant correcto;
- roles requeridos presentes;
- runtime iniciado;
- router iniciado;
- tenant context ready;
- store `ready-read-only` y escritura deshabilitada;
- 430 clientes;
- 30 aseguradoras;
- legal observado sin interacción;
- cero page errors, console errors, HTTP failures, write signals y copy técnico hasta el STOP;
- Firestore writes 0, Auth writes 0, operational writes 0;
- browser cerrado correctamente.

## Fallo exacto

Clasificación terminal:

`FUNCTIONAL_DEFECT / R4_ROLE_ROUTE_STAGE_TIMEOUT`

Stage terminal:

`role-Dirección-group`

Error:

`R4_STAGE_TIMEOUT:role-Dirección-group:90000`

El grupo Dirección inició a 20.628 s y agotó exactamente su presupuesto externo de 90 s a 110.629 s.

Cronología observable dentro del grupo:
- preparación previa al primer route: 22.298 s;
- `inicio`: PASS en 0.359 s;
- `cliente360`: PASS en 57.804 s;
- `aseguradoras`: START; solo transcurrieron 9.540 s antes de que venciera el timeout externo del grupo.

Por tanto, **no existe evidencia de que Aseguradoras haya fallado funcionalmente**. El timeout externo interrumpió la observación antes de obtener PASS/FAIL propio de esa ruta. El cuello de botella observable es acumulativo y está dominado por la preparación del rol y el tiempo de Cliente 360.

## Causa raíz y STOP_RETRY

La familia `R4_ROLE_ROUTE_STAGE_TIMEOUT` ya había aparecido en la frontera R4S2. Esta nueva ocurrencia activa STOP_RETRY: no se permite otro browser, otro ajuste de timeout ni otro parche de producto por intuición.

Estado de causa raíz:

`STOP_RETRY_ROOT_CAUSE_NOT_YET_ISOLATED`

Todavía debe distinguirse, sin navegador, qué proporción corresponde a:
1. activación/switch del rol y efectos síncronos asociados;
2. render/main-thread de Cliente 360;
3. entrada a Aseguradoras;
4. presupuesto externo del harness y si este está desactualizado respecto del comportamiento esperado.

No se asigna owner funcional definitivo todavía.

## Refreeze

Refreeze inmediato: `e955ba1d9a867f95f0630685e0f384e09617d1fe`.

- `SOURCE_ONLY=true`;
- contrato continúa ligado al R4S3 exacto;
- no hubo workflow disparado por el refreeze;
- no hay segunda matriz autorizada;
- no hay nuevo patch autorizado.

## Siguiente acción exacta

Esperar autorización explícita para **diagnóstico de causa raíz exclusivamente source-only/static**, sin browser ni producto mutable. Debe aislar el costo del cambio de rol, Cliente 360 y entrada a Aseguradoras, y decidir con evidencia si el owner es producto o validador/harness. Solo después puede definirse un único fix y un único gate correctivo.

Sin reimportación, cambios Auth/datos, deploy, main ni merge.
