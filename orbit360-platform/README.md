# Orbit 360 · Plataforma

Sistema 360 para intermediarios de seguros, white-label y multi-tenant. A&S es el primer tenant y se configura mediante `Orbit.tenant`; no existe fork A&S.

## Estado go-live canónico · 2026-08-15

Repo `paulaosoriof86/orbit360-core` · rama `ays/backend-tenant-lab-v99-20260703` · PR #5 draft/open · sin main/merge · sin reimportación ni cambios Auth/datos.

### R4S1 publicado · identidad PASS

`orbit360-fase-a-product-r4s1-df4c217c3472.zip` · SHA256 `49f5a5eee451665fcc420fc9acee88347b95aa832a8f6f524053cc4ccaa0d60d` · 194 archivos. Verificación pública run `31916602904` SUCCESS, artifact `9255064967`. HostDime/paquete no son blockers.

Auth/runtime/tenant/430 clientes/30 aseguradoras y cero Firestore/Auth/operational writes están PASS. No reabrir Auth/password/membership/tenant/datos.

### Única matriz R4S1 · CONSUMIDA / REFROZEN

Run `31916778155`, job `95089796794`, artifact `9255149181`. Dirección Inicio PASS; Cliente 360 no completó. Clasificación `FUNCTIONAL_DEFECT / R4_ROLE_ROUTE_STAGE_TIMEOUT`. Refreeze commit `6e41dca4973e8c47c7592ef914badebdff870c36`, control run `31916926740` SUCCESS. No existe autorización vigente para otro browser.

### Root cause Cliente 360 · PROBADO

El módulo espera `q.clientesResumenIndex()` pero el owner no lo implementa; el fallback multiplica `store.get('clientes')` sobre store clone-on-read. Run `31917185515`: clientGetCalls `430→0`, clientCloneRows `185330→860`, fallback `470→0`, reducción `215.5×`, semanticEqual true, writes 0.

`FUNCTIONAL_DEFECT / R4S1_CLIENTE360_MISSING_SUMMARY_INDEX_NX_CLONE`

La fixture v19 queda superseded: `VALIDATOR_STALE / V19_CLIENTE360_SUMMARY_INDEX_ASSUMED_NOT_IMPLEMENTED`.

### Root cause Inicio · PROBADO

Queries globales hacen lookup de cliente dentro de cobros/pólizas y leaderboard repite recorridos por asesor. Run `31917288758`: clientGetCalls `3304→0`, clientCloneRows `1420720→1290`, policy all `8→2`, commission all `7→1`, reducción `1101.33×`, semanticEqual true, writes 0.

`FUNCTIONAL_DEFECT / R4S1_INICIO_GLOBAL_QUERY_NX_CLIENT_CLONE`

### Rootfixes candidatos · NO APLICADOS

Nueva autorización requerida para:

1. `core/queries.js`
2. `modules/policy-receipts-v1199-detail-guard.js`

Con autorización: aplicar exactamente esos dos rootfixes → gate + regresión combinada → R4S2 mínima desde R4S1 con 2 nuevos deltas y 192 archivos byte-idénticos → certificar → backup/publicar → verificar identidad → una nueva matriz read-only solo si se autoriza expresamente.

No rollback automático de R4S1. No reimportación. No Auth/datos. No main/merge. No Pólizas.

Avance: **100% funcional / 75% técnico / 67% gates (2/3)**.

Fuentes vivas:
- `docs/orbit360-live-state-v1.json`
- `docs/CIERRE-R4S1-FRONTERA-FINAL-NX-CLONE-INICIO-CLIENTE360-20260815.md`
- `CHANGELOG-R4S1-GOLIVE-20260815.md`
- PR #5 + HEAD vivo.

Reglas: gate antes de secrets/browser/deploy; dos fallos misma familia → STOP_RETRY; producción no desarrolla validators; no tocar Auth/usuarios/memberships/datos por intuición; 0% manual salvo imposibilidad técnica real; no avanzar de módulo con gate final abierto.
