# Orbit 360 · Plataforma

Estado rector: `docs/orbit360-live-state-v1.json`. Checkpoint: `docs/CIERRE-R4S1-FRONTERA-FINAL-NX-CLONE-INICIO-CLIENTE360-20260815.md`. Changelog: `CHANGELOG-R4S1-GOLIVE-20260815.md`.

R4S1 está publicado y verificado: `orbit360-fase-a-product-r4s1-df4c217c3472.zip` · SHA256 `49f5a5eee451665fcc420fc9acee88347b95aa832a8f6f524053cc4ccaa0d60d` · 194 archivos. Auth/runtime/tenant, 430 clientes, 30 aseguradoras y cero writes PASS. HostDime no es blocker.

La única matriz final R4S1 (run `31916778155`) fue consumida/refrozen. Dirección Inicio PASS; Cliente 360 timeout. No existe autorización vigente para otro browser.

Causas raíz probadas: Cliente 360 missing summary index N×clone (run `31917185515`, reducción 215.5×) e Inicio global queries N×clone (run `31917288758`, reducción 1101.33×), ambos semanticEqual y writes 0. La fixture v19 queda `VALIDATOR_STALE`.

Rootfixes candidatos NO aplicados: `core/queries.js` y `modules/policy-receipts-v1199-detail-guard.js`.

Nueva autorización requerida para aplicar esos dos cambios, gate + regresión combinada, R4S2 mínima/certificada, backup/publicación y una nueva matriz final read-only. No rollback automático R4S1. No reimportación/Auth/datos/main/merge/Pólizas.

Avance: **100% funcional / 75% técnico / 67% gates (2/3)**.
