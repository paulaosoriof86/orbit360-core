# Orbit 360 · Plataforma

Sistema 360 para intermediarios de seguros, comercializable, white-label y multi-tenant. A&S es el primer tenant y se configura mediante `Orbit.tenant`; no existe fork de código para Alianzas.

## Estado go-live canónico · 2026-08-15

- Repo `paulaosoriof86/orbit360-core`
- Rama obligatoria `ays/backend-tenant-lab-v99-20260703`
- PR #5 draft/open
- main/merge no autorizados
- no reimportación ni cambios Auth/datos.

### Producción R4S1 · PUBLICADA / IDENTIDAD PASS

- ZIP `orbit360-fase-a-product-r4s1-df4c217c3472.zip`
- SHA256 `49f5a5eee451665fcc420fc9acee88347b95aa832a8f6f524053cc4ccaa0d60d`
- 194 archivos
- public identity run `31916602904` · SUCCESS
- artifact `9255064967`.

Auth/runtime/tenant/430 clientes/30 aseguradoras y cero Firestore/Auth/operational writes están PASS. HostDime no es blocker vigente.

### Única matriz R4S1 · CONSUMIDA / REFROZEN

- run `31916778155`
- job `95089796794`
- artifact `9255149181`
- Dirección Inicio PASS
- Cliente 360 no completó antes del timeout
- clasificación `FUNCTIONAL_DEFECT / R4_ROLE_ROUTE_STAGE_TIMEOUT`
- refreeze commit `6e41dca4973e8c47c7592ef914badebdff870c36`
- refreeze run `31916926740` SUCCESS.

No existe autorización vigente para otro browser.

### Root cause Cliente 360 · PROBADO

El módulo espera `q.clientesResumenIndex()` pero el owner no lo implementa. El fallback multiplica `store.get('clientes')` sobre un store clone-on-read.

Run `31917185515`:

- clientGetCalls `430 → 0`
- clientCloneRows `185330 → 860`
- fallbackSummaryCalls `470 → 0`
- reducción `215.5×`
- semanticEqual true
- writes 0.

`FUNCTIONAL_DEFECT / R4S1_CLIENTE360_MISSING_SUMMARY_INDEX_NX_CLONE`

La fixture histórica v19 que afirmaba que el índice existía queda superseded:

`VALIDATOR_STALE / V19_CLIENTE360_SUMMARY_INDEX_ASSUMED_NOT_IMPLEMENTED`

### Root cause Inicio · PROBADO

Queries globales hacen lookup de cliente dentro de cobros/pólizas y leaderboard repite recorridos por asesor.

Run `31917288758`:

- clientGetCalls `3304 → 0`
- clientCloneRows `1420720 → 1290`
- policy all `8 → 2`
- commission all `7 → 1`
- reducción `1101.33×`
- semanticEqual true
- writes 0.

`FUNCTIONAL_DEFECT / R4S1_INICIO_GLOBAL_QUERY_NX_CLIENT_CLONE`

### Rootfixes candidatos · NO APLICADOS

La autorización R4S1 fue consumida. Nuevos cambios requieren nueva autorización:

1. `core/queries.js`
2. `modules/policy-receipts-v1199-detail-guard.js`

No se amplía a Aseguradoras/Ops/Leads porque su render base no presenta este mismo patrón.

### Siguiente bloque

Con nueva autorización macro:

1. aplicar exactamente esos 2 rootfixes;
2. gate + regresión combinada source-only;
3. generar R4S2 mínima desde R4S1 con 2 nuevos deltas y 192 archivos byte-idénticos;
4. certificar;
5. backup/publicar R4S2;
6. verificar identidad pública;
7. una nueva matriz final read-only solo si se autoriza expresamente.

No rollback automático de R4S1. No reimportación. No Auth/datos. No main/merge. No avanzar a Pólizas.

Avance: **100% funcional / 75% técnico / 67% gates (2/3)**.

Fuentes vivas:

- `docs/orbit360-live-state-v1.json`
- `docs/CIERRE-R4S1-FRONTERA-FINAL-NX-CLONE-INICIO-CLIENTE360-20260815.md`
- `CHANGELOG-R4S1-GOLIVE-20260815.md`
- PR #5 + HEAD vivo.

Precedencia: reglas maestras/addenda → PR/HEAD/estado vivo → Plan Maestro → evidencia reciente.

Reglas permanentes: gate antes de secrets/browser/deploy; misma etapa/familia dos veces → STOP_RETRY; producción no se usa para desarrollar validators; no tocar Auth/usuarios/memberships/datos por intuición; 0% manual salvo imposibilidad técnica real; no avanzar de módulo con gate final abierto.

Arquitectura: `index.html`, `styles/`, `data/`, `core/`, `modules/`, `docs/`, `tools/`. Los módulos consumen `Orbit.store`; el backend se adapta al store y A&S sigue siendo configuración de tenant, no fork.
