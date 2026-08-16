# Orbit 360 · Plataforma

Sistema 360 para intermediarios de seguros, comercializable, white-label y multi-tenant. A&S es el primer tenant y se configura mediante `Orbit.tenant`; no existe un fork de código para Alianzas.

> Nota de marca vigente: existe una decisión estratégica provisional para cambiar la marca visible futura a **GRAVICENTRA**, pero es NO bloqueante. Hasta el bloque formal de rebranding se conserva `Orbit 360` como nombre técnico/operativo y no se cambian backend, contratos, colecciones, tenant IDs, Firebase, rutas, repositorio ni identificadores técnicos.

## Corte go-live vigente · 2026-08-15

```txt
Repositorio: paulaosoriof86/orbit360-core
Rama obligatoria: ays/backend-tenant-lab-v99-20260703
PR: #5 draft/open
main / merge: NO autorizados
Reimportación / cambios Auth / cambios de datos: NO autorizados
```

### R4S1 publicado · identidad PASS

- ZIP `orbit360-fase-a-product-r4s1-df4c217c3472.zip`
- SHA256 `49f5a5eee451665fcc420fc9acee88347b95aa832a8f6f524053cc4ccaa0d60d`
- 194 archivos
- único delta desde R3: `core/access-scope.js`
- verificación pública run `31916602904` · SUCCESS
- artifact `9255064967`.

Los hashes públicos de `index.html`, manifest, `core/access-scope.js` y `core/auth-product-runtime-p0.js` coinciden con la sucesora certificada. HostDime y la identidad del paquete no son blockers vigentes.

### Auth/runtime/datos · PASS

La frontera productiva confirmó:

- login HTTP 200;
- signedIn + emailVerified;
- membership active;
- tenant correcto;
- roles requeridos;
- runtime/router/tenant-context;
- store `ready-read-only`;
- required missing/failed 0;
- 430 clientes;
- 30 aseguradoras;
- cero page/console/http/write errors antes del bloqueo;
- cero Firestore/Auth/operational writes.

No reabrir Auth, password, membership, tenant, datos ni HostDime.

### Única matriz R4S1 · CONSUMIDA / REFROZEN

- run `31916778155`
- job `95089796794`
- artifact `9255149181`
- clasificación `FUNCTIONAL_DEFECT / R4_ROLE_ROUTE_STAGE_TIMEOUT`
- Dirección Inicio PASS
- Cliente 360 no completó antes del timeout
- refreeze commit `6e41dca4973e8c47c7592ef914badebdff870c36`
- refreeze run `31916926740` · SUCCESS.

No existe autorización vigente para un segundo browser.

### Causa raíz 1 · Cliente 360

El módulo espera `q.clientesResumenIndex()`, pero el owner real no implementa esa función; el fallback hace `store.get('clientes')` repetidamente y el store clone-on-read multiplica el trabajo.

Regresión source-only run `31917185515`:

- clientGetCalls `430 → 0`
- clientCloneRows `185330 → 860`
- fallbackSummaryCalls `470 → 0`
- summaryIndexCalls `0 → 1`
- reducción `215.5×`
- semanticEqual `true`
- writes `0`.

`FUNCTIONAL_DEFECT / R4S1_CLIENTE360_MISSING_SUMMARY_INDEX_NX_CLONE`

### VALIDATOR_STALE v19

La evidencia histórica v19 afirmó que el índice ya existía, pero el producto real tiene `0` definiciones de `q.clientesResumenIndex`.

`VALIDATOR_STALE / V19_CLIENTE360_SUMMARY_INDEX_ASSUMED_NOT_IMPLEMENTED`

### Causa raíz 2 · Inicio

Las queries globales hacen lookup de cliente dentro de filtros de cobros/pólizas y leaderboard repite recorridos por asesor.

Regresión source-only run `31917288758`:

- clientGetCalls `3304 → 0`
- clientCloneRows `1420720 → 1290`
- policy all calls `8 → 2`
- commission all calls `7 → 1`
- reducción `1101.33×`
- semanticEqual `true`
- writes `0`.

`FUNCTIONAL_DEFECT / R4S1_INICIO_GLOBAL_QUERY_NX_CLIENT_CLONE`

### Rootfixes candidatos · PROBADOS / NO APLICADOS

La autorización R4S1 ya fue consumida y solo cubría `core/access-scope.js`. Los siguientes cambios requieren nueva autorización:

1. `core/queries.js`: índices locales y precarga para queries globales.
2. `modules/policy-receipts-v1199-detail-guard.js`: `clientsById` + `q.clientesResumenIndex()` real.

Aseguradoras/Ops/Leads no presentan este mismo antipatrón en su render base; no se expande alcance.

### Siguiente acción exacta

Con nueva autorización:

1. aplicar exclusivamente esos dos rootfixes probados;
2. gate + regresión combinada source-only;
3. generar R4S2 mínima desde R4S1 con esos 2 deltas y 192 archivos restantes byte-idénticos;
4. certificar manifest/SHA;
5. backup/publicar R4S2;
6. verificar identidad pública;
7. una única nueva matriz final read-only solo si se autoriza expresamente.

No rollback automático de R4S1. No reimportación. No Auth/datos. No main/merge. No avanzar a Pólizas.

Avance: **100% funcional / 75% técnico / 67% gates (2/3)**.

Checkpoint: `docs/CIERRE-R4S1-FRONTERA-FINAL-NX-CLONE-INICIO-CLIENTE360-20260815.md`  
Estado: `docs/orbit360-live-state-v1.json`  
Changelog: `CHANGELOG-R4S1-GOLIVE-20260815.md`

## Fuentes rectoras

1. Documento Maestro Consolidado 20260704.
2. Addendum Academia Profunda 20260704.
3. Addendum Patrones Reutilizables Claude/Backend 20260707.
4. Addendum Continuidad Clientes/Multirol/Importadores 20260709.
5. Plan Maestro de Ejecución Productiva 20260716.
6. Addendum Control de Causa Raíz, Validadores y Gates 20260717.
7. Addendum Aceleración Productiva 20260730.
8. Nota Rectora Rebranding GRAVICENTRA 20260730.
9. Addendum Continuidad/Sincronización/Antibucle Go-live 20260814.
10. Live-state + checkpoint + PR #5 + HEAD vivo.

Precedencia: reglas maestras/addenda → PR/HEAD/estado vivo → Plan Maestro → evidencia reciente.

## Reglas permanentes

- gate canónico antes de secrets/browser/deploy;
- misma etapa/familia dos veces → `STOP_RETRY`;
- producción no se usa para desarrollar validators;
- no modificar Auth/usuarios/memberships/datos por intuición;
- 0% manual salvo imposibilidad técnica real;
- no reimportar Clientes/Aseguradoras para resolver acceso/visualización/cache/proyección/gates;
- no avanzar a otro módulo mientras el gate final siga abierto.

## Arquitectura

```txt
orbit360-platform/
├── index.html
├── styles/
├── data/
├── core/
├── modules/
├── docs/
└── tools/
```

Los módulos consumen `Orbit.store`; el backend se adapta al store y no al revés. A&S continúa configurado como tenant, sin fork ni hardcode de datos/credenciales en módulos genéricos.
