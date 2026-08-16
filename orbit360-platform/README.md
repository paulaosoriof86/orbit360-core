# Orbit 360 · Plataforma

**Estado rector:** `docs/orbit360-live-state-v1.json`.  
**Checkpoint:** `docs/CIERRE-R4S1-FRONTERA-FINAL-NX-CLONE-INICIO-CLIENTE360-20260815.md`.  
**Changelog:** `CHANGELOG-R4S1-GOLIVE-20260815.md`.

R4S1 está publicado y verificado: SHA256 `49f5a5eee451665fcc420fc9acee88347b95aa832a8f6f524053cc4ccaa0d60d`, 194 archivos. Auth/runtime/tenant, 430 clientes, 30 aseguradoras y cero writes PASS. HostDime no es blocker.

La única matriz final R4S1 (run `31916778155`) fue consumida y refrozenó. Dirección Inicio PASS; Cliente 360 timeout. No hay autorización para otro browser.

Causas raíz probadas source-only:

- `FUNCTIONAL_DEFECT / R4S1_CLIENTE360_MISSING_SUMMARY_INDEX_NX_CLONE`: run `31917185515`, client gets `430→0`, clone rows `185330→860`, reducción `215.5×`, semanticEqual, writes 0.
- `FUNCTIONAL_DEFECT / R4S1_INICIO_GLOBAL_QUERY_NX_CLIENT_CLONE`: run `31917288758`, client gets `3304→0`, clone rows `1420720→1290`, reducción `1101.33×`, semanticEqual, writes 0.
- `VALIDATOR_STALE / V19_CLIENTE360_SUMMARY_INDEX_ASSUMED_NOT_IMPLEMENTED`.

Rootfixes candidatos **NO aplicados**: `core/queries.js` y `modules/policy-receipts-v1199-detail-guard.js`.

Nueva autorización necesaria para aplicar exactamente esos dos cambios, ejecutar gate + regresión combinada, generar/certificar R4S2 mínima con esos dos deltas y 192 archivos restantes byte-idénticos a R4S1, publicar con backup/rollback y ejecutar una única nueva matriz read-only si se autoriza expresamente.

No rollback automático R4S1. No reimportación/Auth/datos/main/merge/Pólizas. Avance: **100% funcional / 75% técnico / 67% gates (2/3)**.
