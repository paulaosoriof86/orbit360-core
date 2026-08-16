# CHANGELOG R4S1 GO-LIVE · 2026-08-15

Este archivo continúa `CHANGELOG-R4-GOLIVE-20260814.md`. La evidencia histórica se conserva; los estados superados quedan marcados como tales.

## 1. Autorización macro R4S1 · CONSUMIDA

Se autorizó una sucesora mínima del R3 usando exclusivamente `core/access-scope.js` del commit `df4c217c34722c03215f88b62f6865ab41c2a9f3`, con certificación, backup/rollback, publicación en `app.aysseguros.com` y una única matriz productiva final read-only. Sin reimportación, cambios Auth/datos, main ni merge.

## 2. Generación y certificación R4S1 · PASS

- run `31915191809`
- job `95085878427`
- ZIP `orbit360-fase-a-product-r4s1-df4c217c3472.zip`
- SHA256 `49f5a5eee451665fcc420fc9acee88347b95aa832a8f6f524053cc4ccaa0d60d`
- fileCount `194`
- `193` archivos de producto byte-idénticos a R3
- `1` único delta: `core/access-scope.js`
- SHA256 delta `8976ab8032f210a0f93d79f4ace037ec3b3e8fe8c1ac9e1f5a0eadd8d134fb3f`
- durable artifact `9254713380`
- evidence artifact `9254713130`
- gate `13/13 PASS`, failed `0`, writes autorizados `0`.

## 3. Publicación R4S1 · EJECUTADA Y VERIFICADA

Paula extrajo el ZIP R4S1 en `/home/ayssegur/public_html/app.aysseguros.com`, sin carpeta intermedia. Los archivos de hosting preexistentes `.htaccess`, `.user.ini`, `php.ini` y `cgi-bin` no se tocaron.

Verificación pública estática:

- run `31916602904` · SUCCESS
- artifact `9255064967`
- `index.html` SHA256 `125b24a3fc215a368a7183a107cd55eb5a6332fc8a7f8354ed94e3169340ec4e`
- manifest SHA256 `7d145264c8defaac0aa2928e4412e62a51826b8d0abac7cc44ff3195cb60dbbe`
- `core/access-scope.js` SHA256 `8976ab8032f210a0f93d79f4ace037ec3b3e8fe8c1ac9e1f5a0eadd8d134fb3f`
- `core/auth-product-runtime-p0.js` SHA256 `d0bb399fe0e1dd102a03950673044eda5bc8d181e4e98cf477d22d141aa7b3a8`

Conclusión: R4S1 está publicado y su identidad es exacta. HostDime/paquete no son blocker vigente.

## 4. Instrumento final R4S1

La envoltura final quedó validada source-only antes del browser:

- run `31916736116` · SUCCESS
- gate + contrato R4S1 + auth hash + legal read-only + watchdog PASS
- secretos/identidad/browser skipped.

La única frontera productiva autorizada se ejecutó:

- run `31916778155`
- job `95089796794`
- artifact `9255149181`
- digest `sha256:3011cd5ba7b90d38c962de00d63ec90cb84ed69688b0c667e4816095b500e6b7`

Refreeze inmediato posterior:

- commit `6e41dca4973e8c47c7592ef914badebdff870c36`
- control run `31916926740` · SUCCESS source-only.

No existe autorización vigente para una segunda frontera browser.

## 5. PASS antes del fallo final

R4S1 volvió a confirmar:

- manifest exacto;
- auth productivo HTTP 200 + SHA exacto;
- login HTTP 200;
- signedIn + emailVerified;
- membership available/active;
- tenant correcto;
- 5 roles, roles requeridos presentes;
- runtime/router/tenant-context activos;
- store `ready-read-only`, write disabled;
- required missing/failed `0`;
- legal observado sin persistir aceptación;
- **430 clientes**;
- **30 aseguradoras**;
- Dirección `inicio` PASS;
- page/console/HTTP/write errors `0`;
- Firestore/Auth/operational writes `0`.

No reabrir Auth, membership, tenant, datos, HostDime ni identidad de paquete.

## 6. Fallo final observado

Clasificación runtime:

`FUNCTIONAL_DEFECT / R4_ROLE_ROUTE_STAGE_TIMEOUT`

Checkpoints Dirección:

- group START `14728 ms`
- `inicio` START `45462 ms` → `30734 ms` previos a primera ruta
- `inicio` PASS `45915 ms`
- `cliente360` START `45915 ms`
- group FAIL `104729 ms`
- `58814 ms` desde Cliente 360 START hasta timeout, sin PASS.

No se aumenta timeout: el defecto es trabajo síncrono/clonado excesivo.

## 7. Causa raíz A · Cliente 360

`modules/cliente360.js` intenta usar `q.clientesResumenIndex()`, pero el owner real `modules/policy-receipts-v1199-detail-guard.js` no implementa esa función. El fallback ejecuta `q.clienteResumen(c.id)` por cliente y termina en `store.get('clientes', id)`. En el store productivo, `get()` usa `all()`, y `all()` clona toda la colección.

Regresión source-only:

- run `31917185515` · SUCCESS
- artifact `9255246859`
- digest `sha256:c309f91f18b0e697d4b59fe51d75bc2a7ecd55d113338c567cb1af720e6c819f`

Baseline 430 clientes / 1375 pólizas:

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
- writes `0`.

Clasificación:

`FUNCTIONAL_DEFECT / R4S1_CLIENTE360_MISSING_SUMMARY_INDEX_NX_CLONE`

## 8. VALIDATOR_STALE histórico v19

La evidencia histórica `v19-cliente360-bounded-render-source-sanitized-v20260807.json` afirmaba `summaryIndexCalls:1` y `fallbackSummaryCalls:0`, pero el source real tiene definición del índice `0`.

Clasificación:

`VALIDATOR_STALE / V19_CLIENTE360_SUMMARY_INDEX_ASSUMED_NOT_IMPLEMENTED`

La evidencia v19 queda superseded para rendimiento real de Cliente 360.

## 9. Causa raíz B · Inicio

Las queries globales de Inicio hacen `store.get('clientes', ...)` dentro de filtros de cobros/pólizas y el `leaderboard()` repite esas búsquedas por asesor. Eso dispara clonados N× al reconstruirse Inicio tras cambio de rol.

Regresión source-only:

- run `31917288758` · SUCCESS
- artifact `9255279034`
- digest `sha256:c07892977d30953556d8031d78c087bdfc09acd32a44221d33da2e083518ef8a`

Baseline 430 clientes / 1375 pólizas / 860 cobros / 7 asesores:

- clientGetCalls `3304`
- clientCloneRows `1420720`
- policy all calls `8`
- commission all calls `7`

Candidato:

- clientGetCalls `0`
- clientCloneRows `1290`
- policy all calls `2`
- commission all calls `1`
- reducción `1419430` filas / `1101.33×`
- semanticEqual `true`
- writes `0`.

Clasificación:

`FUNCTIONAL_DEFECT / R4S1_INICIO_GLOBAL_QUERY_NX_CLIENT_CLONE`

## 10. Estado y siguiente acción

R4S1 permanece publicado y estáticamente verificado. No rollback automático: paquete, Auth, tenant, 430/30 y cero writes permanecen PASS.

Los dos nuevos rootfixes están **probados source-only pero NO aplicados** porque la autorización R4S1 permitía únicamente `core/access-scope.js` y ya fue consumida.

Si se autoriza un nuevo bloque:

1. aplicar exclusivamente `core/queries.js` y `modules/policy-receipts-v1199-detail-guard.js` según los candidatos probados;
2. gate + regresión combinada source-only;
3. generar R4S2 desde R4S1 con exactamente esos dos nuevos deltas y los otros 192 archivos byte-idénticos;
4. certificar manifest/SHA antes de publicación;
5. backup/rollback y publicación exclusiva de R4S2;
6. verificación estática pública;
7. una nueva matriz final read-only únicamente con autorización explícita;
8. cierre solo con `POST_GO_LIVE_SMOKE_PASS` y cero writes.

No reimportación. No Auth/datos. No main/merge. No avanzar a Pólizas.

Avance permanece **100% funcional / 75% técnico / 67% gates (2/3)**.
