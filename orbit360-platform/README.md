# Orbit 360 · Plataforma

Estado vivo: `docs/orbit360-live-state-v1.json` · checkpoint: `docs/CIERRE-R4S1-FRONTERA-FINAL-NX-CLONE-INICIO-CLIENTE360-20260815.md` · changelog: `CHANGELOG-R4S1-GOLIVE-20260815.md`.

R4S1 está publicado y verificado: `orbit360-fase-a-product-r4s1-df4c217c3472.zip`, SHA256 `49f5a5eee451665fcc420fc9acee88347b95aa832a8f6f524053cc4ccaa0d60d`, 194 archivos. Auth/runtime/tenant, 430 clientes, 30 aseguradoras y cero writes PASS. HostDime no es blocker.

La única matriz final autorizada (run `31916778155`) fue consumida y refrozenó. Dirección Inicio PASS; Cliente 360 timeout. No hay autorización para otro browser.

Causas raíz probadas source-only:

- Cliente 360: falta `q.clientesResumenIndex()` real; `get` 430→0, clone rows 185330→860, reducción 215.5×. `FUNCTIONAL_DEFECT / R4S1_CLIENTE360_MISSING_SUMMARY_INDEX_NX_CLONE`.
- Inicio: queries globales/leaderboard repiten lookup de cliente; `get` 3304→0, clone rows 1420720→1290, reducción 1101.33×. `FUNCTIONAL_DEFECT / R4S1_INICIO_GLOBAL_QUERY_NX_CLIENT_CLONE`.
- Fixture v19 superseded: `VALIDATOR_STALE / V19_CLIENTE360_SUMMARY_INDEX_ASSUMED_NOT_IMPLEMENTED`.

Rootfixes candidatos **NO aplicados** y sujetos a nueva autorización: `core/queries.js` y `modules/policy-receipts-v1199-detail-guard.js`.

Siguiente bloque autorizado solo si Paula lo aprueba: aplicar exactamente esos 2 cambios → gate + regresión combinada → R4S2 mínima desde R4S1 con 2 nuevos deltas y 192 archivos restantes byte-idénticos → certificar → backup/publicar → verificar identidad → una única nueva matriz final read-only si queda incluida en la autorización.

No rollback automático R4S1. No reimportación/Auth/datos/main/merge/Pólizas. Avance: **100% funcional / 75% técnico / 67% gates (2/3)**.
