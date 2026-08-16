# CHANGELOG R4S1 GO-LIVE · 2026-08-15

Este archivo continúa `CHANGELOG-R4-GOLIVE-20260814.md`. La evidencia histórica se conserva; los estados superados quedan marcados como tales.

## Estado canónico actual

R4S1 está **publicado y verificado estáticamente**. Auth/runtime/tenant/430 clientes/30 aseguradoras y cero writes están PASS. La única matriz final autorizada fue consumida y refrozenó. El gate final continúa abierto exclusivamente por dos defectos de rendimiento N×clone ya demostrados source-only en Inicio y Cliente 360.

Checkpoint rector: `docs/CIERRE-R4S1-FRONTERA-FINAL-NX-CLONE-INICIO-CLIENTE360-20260815.md`.

Live-state rector: `docs/orbit360-live-state-v1.json`.

## 1. R4S1 certificación · PASS

- run `31915191809`
- job `95085878427`
- ZIP `orbit360-fase-a-product-r4s1-df4c217c3472.zip`
- SHA256 `49f5a5eee451665fcc420fc9acee88347b95aa832a8f6f524053cc4ccaa0d60d`
- fileCount `194`
- `193` archivos byte-idénticos a R3
- `1` delta: `core/access-scope.js`
- delta SHA256 `8976ab8032f210a0f93d79f4ace037ec3b3e8fe8c1ac9e1f5a0eadd8d134fb3f`
- durable artifact `9254713380`
- evidence artifact `9254713130`
- gate `13/13 PASS`, failed `0`, writes autorizados `0`.

## 2. R4S1 publicación · PASS

Paula extrajo el ZIP en `/home/ayssegur/public_html/app.aysseguros.com` sin carpeta intermedia. Archivos propios del hosting (`.htaccess`, `.user.ini`, `php.ini`, `cgi-bin`) no fueron modificados.

Verificación pública:

- run `31916602904` · SUCCESS
- artifact `9255064967`
- index SHA `125b24a3fc215a368a7183a107cd55eb5a6332fc8a7f8354ed94e3169340ec4e`
- manifest SHA `7d145264c8defaac0aa2928e4412e62a51826b8d0abac7cc44ff3195cb60dbbe`
- access-scope SHA `8976ab8032f210a0f93d79f4ace037ec3b3e8fe8c1ac9e1f5a0eadd8d134fb3f`
- auth-product SHA `d0bb399fe0e1dd102a03950673044eda5bc8d181e4e98cf477d22d141aa7b3a8`.

HostDime/paquete no son blocker.

## 3. Única frontera final R4S1

Source-only previo:

- run `31916736116` · SUCCESS
- gate + contrato + auth hash + legal read-only + watchdog PASS.

Browser final autorizado:

- run `31916778155`
- job `95089796794`
- artifact `9255149181`
- digest `sha256:3011cd5ba7b90d38c962de00d63ec90cb84ed69688b0c667e4816095b500e6b7`

Refreeze:

- commit `6e41dca4973e8c47c7592ef914badebdff870c36`
- run `31916926740` · SUCCESS source-only.

PASS antes del fallo:

- manifest exacto;
- auth HTTP 200 + SHA;
- login HTTP 200;
- signedIn/emailVerified;
- membership active;
- tenant correcto;
- roles requeridos;
- runtime/router/tenant-context;
- store read-only;
- required missing/failed `0`;
- legal observado sin escribir;
- 430 clientes / 30 aseguradoras;
- Dirección `inicio` PASS;
- page/console/http/write errors `0`;
- Firestore/Auth/operational writes `0`.

Fallo runtime:

`FUNCTIONAL_DEFECT / R4_ROLE_ROUTE_STAGE_TIMEOUT`

- `30734 ms` antes de primera ruta Dirección;
- Inicio PASS;
- `58814 ms` desde `cliente360 START` hasta timeout del grupo.

No aumentar timeout.

## 4. Root cause Cliente 360 · PROBADO

`modules/cliente360.js` espera `q.clientesResumenIndex()` pero el owner real no lo implementa. El fallback hace resumen por cliente y termina en `store.get('clientes', id)`; el store productivo implementa `get()` sobre `all()` clone-on-read.

Regresión:

- run `31917185515` · SUCCESS
- artifact `9255246859`
- digest `sha256:c309f91f18b0e697d4b59fe51d75bc2a7ecd55d113338c567cb1af720e6c819f`

Baseline → candidato:

- clientGetCalls `430 → 0`
- clientCloneRows `185330 → 860`
- summaryIndexCalls `0 → 1`
- fallbackSummaryCalls `470 → 0`
- reducción `215.5×`
- semanticEqual true
- writes 0.

`FUNCTIONAL_DEFECT / R4S1_CLIENTE360_MISSING_SUMMARY_INDEX_NX_CLONE`

## 5. VALIDATOR_STALE v19

La fixture histórica v19 afirmaba `summaryIndexCalls:1` / `fallbackSummaryCalls:0`, pero el producto no tiene implementación real del índice.

`VALIDATOR_STALE / V19_CLIENTE360_SUMMARY_INDEX_ASSUMED_NOT_IMPLEMENTED`

## 6. Root cause Inicio · PROBADO

Queries globales de Inicio hacen lookup de cliente dentro de filtros de cobros/pólizas y leaderboard repite recorridos por asesor.

Regresión:

- run `31917288758` · SUCCESS
- artifact `9255279034`
- digest `sha256:c07892977d30953556d8031d78c087bdfc09acd32a44221d33da2e083518ef8a`

Baseline → candidato:

- clientGetCalls `3304 → 0`
- clientCloneRows `1420720 → 1290`
- policy all calls `8 → 2`
- commission all calls `7 → 1`
- reducción `1101.33×`
- semanticEqual true
- writes 0.

`FUNCTIONAL_DEFECT / R4S1_INICIO_GLOBAL_QUERY_NX_CLIENT_CLONE`

## 7. Rootfixes candidatos · NO APLICADOS

La autorización R4S1 fue consumida y solo permitía `core/access-scope.js`. Los nuevos candidatos permanecen source-only:

1. `core/queries.js`: índices locales de clientes y arrays precargados para queries globales.
2. `modules/policy-receipts-v1199-detail-guard.js`: `clientsById` + `q.clientesResumenIndex()` real.

Aseguradoras/Ops/Leads no muestran este mismo antipatrón en su render base; no se expande alcance.

## 8. Siguiente bloque

Solo con nueva autorización:

1. aplicar exactamente esos dos archivos;
2. gate + regresión combinada source-only;
3. generar/certificar R4S2 mínima desde R4S1 con 2 nuevos deltas y 192 archivos restantes byte-idénticos;
4. backup/publicar R4S2;
5. verificar identidad pública;
6. una nueva matriz final read-only solo si se autoriza expresamente.

No rollback automático de R4S1. No reimportación. No Auth/datos. No main/merge. No Pólizas.

Avance: **100% funcional / 75% técnico / 67% gates (2/3)**.
