# CHANGELOG R4S1 GO-LIVE · 2026-08-15

## Estado canónico actual

R4S1 está **publicado y verificado estáticamente**. Auth/runtime/tenant/430 clientes/30 aseguradoras y cero writes están PASS. La única matriz final autorizada fue consumida y refrozenó. El gate final continúa abierto por dos defectos de rendimiento N×clone ya demostrados source-only en Inicio y Cliente 360.

Checkpoint: `docs/CIERRE-R4S1-FRONTERA-FINAL-NX-CLONE-INICIO-CLIENTE360-20260815.md`  
Live-state: `docs/orbit360-live-state-v1.json`  
README: `README.md`

## R4S1 certificación y publicación · PASS

- certification run `31915191809`, job `95085878427`
- ZIP `orbit360-fase-a-product-r4s1-df4c217c3472.zip`
- SHA256 `49f5a5eee451665fcc420fc9acee88347b95aa832a8f6f524053cc4ccaa0d60d`
- fileCount `194`
- R3→R4S1: 193 archivos byte-idénticos + 1 delta `core/access-scope.js`
- public identity run `31916602904` · SUCCESS
- public evidence artifact `9255064967`.

HostDime/paquete no son blockers.

## Única frontera final R4S1

- source-only previo `31916736116` · SUCCESS
- browser final `31916778155`
- job `95089796794`
- artifact `9255149181`
- refreeze commit `6e41dca4973e8c47c7592ef914badebdff870c36`
- refreeze run `31916926740` · SUCCESS.

PASS antes del fallo: manifest/auth/login/membership/tenant/runtime/store read-only, 430 clientes, 30 aseguradoras, Dirección Inicio, y cero page/console/http/write errors y cero Firestore/Auth/operational writes.

Fallo:

`FUNCTIONAL_DEFECT / R4_ROLE_ROUTE_STAGE_TIMEOUT`

- `30734 ms` antes de la primera ruta Dirección
- Inicio PASS
- `58814 ms` desde Cliente360 START hasta timeout.

No aumentar timeout. No segunda matriz autorizada.

## Causa raíz Cliente 360 · PROBADA

`q.clientesResumenIndex()` es esperado por `cliente360.js` pero no está implementado en el owner actual; el fallback hace `store.get('clientes')` por cliente sobre store clone-on-read.

Run `31917185515` · artifact `9255246859`:

- clientGetCalls `430 → 0`
- clientCloneRows `185330 → 860`
- fallbackSummaryCalls `470 → 0`
- summaryIndexCalls `0 → 1`
- reducción `215.5×`
- semanticEqual true
- writes 0.

`FUNCTIONAL_DEFECT / R4S1_CLIENTE360_MISSING_SUMMARY_INDEX_NX_CLONE`

## VALIDATOR_STALE v19

La fixture histórica v19 afirmó que el summary index existía, pero el source real no lo implementó.

`VALIDATOR_STALE / V19_CLIENTE360_SUMMARY_INDEX_ASSUMED_NOT_IMPLEMENTED`

## Causa raíz Inicio · PROBADA

Queries globales hacen lookup de cliente dentro de filtros de cobros/pólizas y leaderboard repite recorridos por asesor.

Run `31917288758` · artifact `9255279034`:

- clientGetCalls `3304 → 0`
- clientCloneRows `1420720 → 1290`
- policy all `8 → 2`
- commission all `7 → 1`
- reducción `1101.33×`
- semanticEqual true
- writes 0.

`FUNCTIONAL_DEFECT / R4S1_INICIO_GLOBAL_QUERY_NX_CLIENT_CLONE`

## Rootfixes candidatos · NO APLICADOS

La autorización R4S1 fue consumida. Nuevos cambios requieren autorización expresa:

1. `core/queries.js`
2. `modules/policy-receipts-v1199-detail-guard.js`

Aseguradoras/Ops/Leads no presentan este mismo antipatrón en el render base; alcance no se expande.

## Siguiente bloque

Con nueva autorización macro:

1. aplicar exactamente esos 2 rootfixes;
2. gate + regresión combinada source-only;
3. R4S2 mínima desde R4S1 con 2 nuevos deltas y 192 archivos byte-idénticos;
4. certificar;
5. backup/publicar R4S2;
6. verificar identidad pública;
7. una nueva matriz read-only únicamente si la autorización la incluye.

No rollback automático de R4S1. No reimportación. No Auth/datos. No main/merge. No Pólizas.

Avance: **100% funcional / 75% técnico / 67% gates (2/3)**.
