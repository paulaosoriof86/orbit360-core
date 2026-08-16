# Orbit 360 · Plataforma

Estado vivo rector: `docs/orbit360-live-state-v1.json`  
Checkpoint: `docs/CIERRE-R4S1-FRONTERA-FINAL-NX-CLONE-INICIO-CLIENTE360-20260815.md`  
Changelog: `CHANGELOG-R4S1-GOLIVE-20260815.md`

## Go-live · 2026-08-15

Repo `paulaosoriof86/orbit360-core` · rama `ays/backend-tenant-lab-v99-20260703` · PR #5 draft/open · sin main/merge · sin reimportación ni cambios Auth/datos.

R4S1 está publicado y verificado: `orbit360-fase-a-product-r4s1-df4c217c3472.zip`, SHA256 `49f5a5eee451665fcc420fc9acee88347b95aa832a8f6f524053cc4ccaa0d60d`, 194 archivos. Public identity run `31916602904` SUCCESS. Auth/runtime/tenant, 430 clientes, 30 aseguradoras y cero writes PASS. HostDime no es blocker.

La única matriz R4S1 fue consumida: run `31916778155`, artifact `9255149181`. Dirección Inicio PASS; Cliente 360 timeout. Refreeze `6e41dca4973e8c47c7592ef914badebdff870c36`, control `31916926740` SUCCESS. No hay autorización para otro browser.

### Causas raíz probadas

Cliente 360: falta implementación real de `q.clientesResumenIndex()`; fallback N×clone. Run `31917185515`: `get` 430→0, clone rows 185330→860, reducción 215.5×, semanticEqual, writes 0.

`FUNCTIONAL_DEFECT / R4S1_CLIENTE360_MISSING_SUMMARY_INDEX_NX_CLONE`

Fixture v19 superseded: `VALIDATOR_STALE / V19_CLIENTE360_SUMMARY_INDEX_ASSUMED_NOT_IMPLEMENTED`.

Inicio: queries globales y leaderboard repiten lookup de cliente. Run `31917288758`: `get` 3304→0, clone rows 1420720→1290, reducción 1101.33×, semanticEqual, writes 0.

`FUNCTIONAL_DEFECT / R4S1_INICIO_GLOBAL_QUERY_NX_CLIENT_CLONE`

### Rootfixes candidatos · NO APLICADOS

Nueva autorización requerida para exactamente:

1. `core/queries.js`
2. `modules/policy-receipts-v1199-detail-guard.js`

Siguiente secuencia con autorización: aplicar los 2 cambios → gate + regresión combinada → R4S2 mínima con esos 2 deltas y 192 archivos byte-idénticos a R4S1 → certificar → backup/publicar → verificar → una matriz read-only solo si se autoriza.

No rollback automático R4S1. No Auth/datos/reimportación/main/merge/Pólizas.

Avance: **100% funcional / 75% técnico / 67% gates (2/3)**.
