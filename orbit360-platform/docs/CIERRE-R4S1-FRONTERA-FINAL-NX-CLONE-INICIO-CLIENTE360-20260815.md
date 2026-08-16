# CIERRE R4S1 · FRONTERA FINAL · N× CLONE EN INICIO + CLIENTE 360

Fecha: 2026-08-15  
Repo: `paulaosoriof86/orbit360-core`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR #5: draft/open · sin merge

## 1. Publicación R4S1 · IDENTIDAD PASS

R4S1 publicado:

- `orbit360-fase-a-product-r4s1-df4c217c3472.zip`
- SHA256 `49f5a5eee451665fcc420fc9acee88347b95aa832a8f6f524053cc4ccaa0d60d`
- 194 archivos de producto
- único delta frente a R3: `core/access-scope.js`

Verificación pública estática:

- run `31916602904`
- artifact `9255064967`
- resultado `SUCCESS`

Coincidieron exactamente:

- `index.html` SHA256 `125b24a3fc215a368a7183a107cd55eb5a6332fc8a7f8354ed94e3169340ec4e`
- manifest SHA256 `7d145264c8defaac0aa2928e4412e62a51826b8d0abac7cc44ff3195cb60dbbe`
- `core/access-scope.js` SHA256 `8976ab8032f210a0f93d79f4ace037ec3b3e8fe8c1ac9e1f5a0eadd8d134fb3f`
- `core/auth-product-runtime-p0.js` SHA256 `d0bb399fe0e1dd102a03950673044eda5bc8d181e4e98cf477d22d141aa7b3a8`

HostDime/paquete/publicación no son blocker de esta frontera.

## 2. Instrumento final

Source-only definitivo antes de browser:

- run `31916736116`
- PASS: gate + contrato R4S1 + auth hash + legal read-only + watchdog
- secretos/browser omitidos

Única frontera browser autorizada:

- run `31916778155`
- job `95089796794`
- artifact `9255149181`
- digest `sha256:3011cd5ba7b90d38c962de00d63ec90cb84ed69688b0c667e4816095b500e6b7`

Refreeze inmediato posterior:

- commit `6e41dca4973e8c47c7592ef914badebdff870c36`
- control run `31916926740`
- SUCCESS source-only

No existe autorización para una segunda frontera browser.

## 3. PASS obtenidos antes del fallo

La frontera final confirmó nuevamente:

- manifest R4S1 PASS;
- auth productivo HTTP 200 + SHA exacto;
- login HTTP 200;
- signedIn;
- emailVerified;
- membership available/active;
- tenant correcto;
- 5 roles y roles requeridos;
- runtime/router/tenant-context activos;
- store `ready-read-only`;
- required missing/failed = 0;
- legal gate observado sin persistir aceptación;
- 430 clientes;
- 30 aseguradoras;
- Dirección `inicio` PASS;
- page errors 0;
- console errors 0;
- HTTP failures 0;
- write signals 0;
- Firestore/Auth/operational writes 0.

Por tanto no reabrir Auth, membership, tenant, datos, HostDime ni identidad de paquete.

## 4. Primer fallo observable

Clasificación runtime:

`FUNCTIONAL_DEFECT / R4_ROLE_ROUTE_STAGE_TIMEOUT`

Checkpoints Dirección:

- group START: `14728 ms`
- `inicio` START: `45462 ms`
- retraso previo a primera ruta: `30734 ms`
- `inicio` PASS: `45915 ms`
- `cliente360` START: `45915 ms`
- group FAIL: `104729 ms`
- tiempo desde `cliente360 START` hasta el timeout del grupo: `58814 ms`
- no hubo checkpoint PASS de Cliente 360.

No se aumenta timeout: el hilo principal siguió consumiendo tiempo de manera anómala.

## 5. Causa raíz A · Cliente 360

El módulo `modules/cliente360.js` desde source v19 intenta usar:

`q.clientesResumenIndex ? q.clientesResumenIndex() : null`

Pero el owner real `modules/policy-receipts-v1199-detail-guard.js` no implementa `q.clientesResumenIndex`.

El fallback llama `q.clienteResumen(c.id)` por cliente. El store productivo implementa `get()` mediante `all().find()`, y `all()` clona cada fila con JSON serialization.

Regresión source-only:

- run `31917185515`
- artifact `9255246859`
- digest `sha256:c309f91f18b0e697d4b59fe51d75bc2a7ecd55d113338c567cb1af720e6c819f`
- 430 clientes / 1375 pólizas / first frame 40

Baseline real de source:

- summaryIndexCalls `0`
- fallbackSummaryCalls `470`
- clientGetCalls `430`
- clientCloneRows `185330`

Candidato:

- summaryIndexCalls `1`
- fallbackSummaryCalls `0`
- clientGetCalls `0`
- clientCloneRows `860`
- reducción `184470` filas / `215.5×`
- semanticEqual `true`
- writes `0`

Clasificación refinada:

`FUNCTIONAL_DEFECT / R4S1_CLIENTE360_MISSING_SUMMARY_INDEX_NX_CLONE`

## 6. VALIDATOR_STALE histórico v19

El archivo histórico `v19-cliente360-bounded-render-source-sanitized-v20260807.json` declaró:

- `summaryIndexCalls: 1`
- `fallbackSummaryCalls: 0`
- `fixtureUsesSummaryIndex: true`

Sin embargo el producto source actual tiene `actualIndexDefinitionCount: 0`; el commit v19 añadió el callsite condicional pero no implementó el índice.

Clasificación:

`VALIDATOR_STALE / V19_CLIENTE360_SUMMARY_INDEX_ASSUMED_NOT_IMPLEMENTED`

La evidencia v19 se conserva como histórica pero queda superseded para afirmar rendimiento real de Cliente 360.

## 7. Causa raíz B · Inicio al cambiar rol

El cambio de rol dispara reconstrucción del shell/hash y puede renderizar Inicio antes del checkpoint explícito. `core/queries.js` contiene lookup por cliente dentro de queries globales:

- `carteraGlobal()` → `cobPais()` → `S().get('clientes', c.clienteId)` por cobro;
- `primaVigenteGlobal()` → `polPais()` → `S().get('clientes', p.clienteId)` por póliza;
- `leaderboard()` repite filtros por asesor y vuelve a hacer lookup de cliente por póliza.

Regresión source-only:

- run `31917288758`
- artifact `9255279034`
- digest `sha256:c07892977d30953556d8031d78c087bdfc09acd32a44221d33da2e083518ef8a`
- fixture: 430 clientes / 1375 pólizas / 860 cobros / 7 asesores / país GT

Baseline:

- clientGetCalls `3304`
- clientCloneRows `1420720`
- policy all calls `8`
- commission all calls `7`

Candidato indexado:

- clientGetCalls `0`
- clientCloneRows `1290`
- policy all calls `2`
- commission all calls `1`
- reducción `1419430` filas / `1101.33×`
- semanticEqual `true`
- writes `0`

Clasificación refinada:

`FUNCTIONAL_DEFECT / R4S1_INICIO_GLOBAL_QUERY_NX_CLIENT_CLONE`

## 8. Alcance de los rootfix candidatos

Aún NO aplicados al producto source.

Candidato A:

- archivo: `orbit360-platform/modules/policy-receipts-v1199-detail-guard.js`
- añadir índice real `clientesById` al read-model;
- hacer `q.clienteResumen()` usar el índice en lugar de `store.get` por cliente;
- exponer `q.clientesResumenIndex()` para el callsite ya existente de Cliente 360;
- mantener invalidación existente en eventos store/session;
- API y resultados de negocio preservados.

Candidato B:

- archivo: `orbit360-platform/core/queries.js`
- construir lookup local de clientes una vez por query global;
- evitar `store.get(cliente)` dentro de filtros de cobros/pólizas;
- reutilizar arrays de pólizas/comisiones una vez en leaderboard;
- API pública y resultados de negocio preservados.

No se tocaron `data/store-*`, Auth, memberships, backend, datos ni paquetes productivos durante estas regresiones.

## 9. Rutas restantes

Se revisó el mismo antipatrón en `aseguradoras`, `ops` y `leads` de la matriz final.

- Aseguradoras: no muestra este lookup de cliente en render base.
- Ops: lookup de cliente aparece únicamente al aplicar búsqueda/filtros; la ruta base de la matriz no entra en ese bloque.
- Leads: no se detectó el patrón equivalente en la ruta base.

No se amplía alcance.

## 10. Estado / siguiente acción

R4S1 permanece publicado; browser final congelado. No rollback automático: paquete/Auth/datos/integridad permanecieron PASS y hubo cero writes.

Los dos rootfixes nuevos están probados solo como candidatos source-only. La autorización consumida de R4S1 permitía exclusivamente `core/access-scope.js`; no se reutiliza para mutar silenciosamente dos archivos nuevos.

Siguiente bloque, si se autoriza:

1. aplicar únicamente los dos rootfixes probados a source;
2. ejecutar regresión combinada source-only y gate;
3. generar R4S2 mínima desde R4S1 con exactamente dos deltas nuevos (`core/queries.js` y `modules/policy-receipts-v1199-detail-guard.js`), conservando byte-identidad de los otros 192 archivos;
4. certificar manifest/SHA;
5. backup/rollback y publicar R4S2;
6. verificación estática pública;
7. autorizar/ejecutar una sola nueva matriz final read-only;
8. cierre solo con `POST_GO_LIVE_SMOKE_PASS` y cero writes.

Avance permanece 100% funcional readiness / 75% técnico / 67% gates (2/3). No avanzar a Pólizas.
