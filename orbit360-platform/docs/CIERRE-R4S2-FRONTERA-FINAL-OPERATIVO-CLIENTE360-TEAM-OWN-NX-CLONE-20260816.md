# CIERRE R4S2 · FRONTERA FINAL · OPERATIVO / CLIENTE 360 · TEAM/OWN N×CLONE

Fecha: 2026-08-16  
Repo: `paulaosoriof86/orbit360-core`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open · sin merge

## 1. R4S2 publicada y verificada

R4S2 vigente:

- `orbit360-fase-a-product-r4s2-47249fd4d603.zip`
- SHA256 `580d7568d64deb0cf7b8eccdf91b99e5bdc005b6bd441c68f99ef0d36de305ca`
- 194 archivos
- source `47249fd4d6032a2f4c09f6fbd3460d3804c199da`

Verificación pública exacta:

- run `31957103570`
- job `95189286663`
- gate canónico antes y después PASS
- manifest R4S2 exacto
- index/Auth/access-scope/queries/policy owner con hashes exactos
- browser/secrets/writes = 0.

## 2. Única matriz R4S2 consumida

- run `31957494919`
- job `95190233553`
- artifact `9266380051`
- digest `sha256:00d6134821987229b7095c46fd0ec26a1508e5f167a6cdee86391424ff213cbf`

PASS reconfirmado:

- login HTTP 200;
- signedIn / emailVerified;
- membership activa;
- tenant correcto;
- roles requeridos;
- runtime/router/store `ready-read-only`;
- 430 clientes;
- 30 aseguradoras;
- Firestore/Auth/operational writes = 0;
- page/console/http/write errors = 0;
- copy técnico = 0.

### Dirección

PASS completo en las cinco rutas:

1. inicio;
2. cliente360;
3. aseguradoras;
4. ops;
5. leads.

### Operativo

- inicio PASS;
- `cliente360` START;
- no retornó antes del límite del grupo;
- primer fallo real: `R4_STAGE_TIMEOUT:role-Operativo-group:90000`.

Asesor no fue alcanzado por STOP fail-closed.

Clasificación inicial de la frontera: `FUNCTIONAL_DEFECT / R4_ROLE_ROUTE_STAGE_TIMEOUT`.

## 3. Refreeze inmediato

Antes de interpretar:

- commit `e6caa685270b2cd323162dca7e6f9731b56c26ee`;
- run control source-only `31957723568` SUCCESS;
- browser cerrado y congelado.

No existe autorización vigente para otra matriz productiva.

## 4. Causa raíz

Clasificación cerrada:

`FUNCTIONAL_DEFECT / ACCESS_SCOPED_RELATIONAL_NX_CLONE_TEAM_OWN`

Owner: `orbit360-platform/core/access-scope.js`.

El fast-path anterior eliminó el N×clone para `scope=all`, pero `team/own` seguía ejecutando `recordAdvisorId()` por registro. Cuando un registro no trae `asesorId` directo, la resolución consulta cliente/póliza mediante `store.get()`. En el store productivo `get()` se apoya en `all()`, que clona la colección completa.

Dentro de `Orbit.access.withScope('cliente360')`, las colecciones relacionales de Cliente 360 (`polizas`, `vehiculos`, `cobros`, `comisiones`) multiplicaban ese patrón para Operativo y Asesor.

## 5. Rootfix source-only probado

Se creó una regresión reutilizable:

`tools/orbit360-r4-team-scope-relational-index-regression-v20260816.mjs`

El candidato modifica únicamente la implementación interna de `filter()` para construir una vez por filtro:

- índice `cliente → asesor`;
- índice `póliza → asesor`;
- resolución directa del asesor desde esos índices.

Se conservan API pública, permisos, países, módulos, scopes y precedencia de resolución.

### Ejecución definitiva

- run `31958357674`
- job `95192417987`
- artifact `9266561371`
- digest `sha256:7db701960ed6f08bc78594fbdca6eab57556bf9ddb1a02a23ce9e1c6bc937f34`
- gate 13/13 PASS;
- regresión PASS;
- watchdog PASS;
- browser/secrets/identity = skipped;
- productionTouched=false;
- writes=0.

### Equivalencia semántica

Dirección, Operativo y Asesor: mismos IDs y mismos conteos current vs candidate.

Operativo:

- clientes 216;
- pólizas 686;
- vehículos 365;
- cobros 954;
- comisiones 454.

Asesor:

- clientes 108;
- pólizas 344;
- vehículos 191;
- cobros 479;
- comisiones 281.

### Reducción

Operativo facade:

- `get()` 45,631 → 25;
- filas clonadas 6,112,246 → 12,705;
- reducción clone ≈ 481.09×;
- reducción get ≈ 1,825.24×.

Asesor facade:

- `get()` 36,245 → 20;
- filas clonadas 5,790,400 → 12,645;
- reducción clone ≈ 457.92×;
- reducción get ≈ 1,812.25×.

## 6. Gap histórico de validación

`VALIDATOR_STALE / ACCESS_FASTPATH_REGRESSION_DID_NOT_EXERCISE_SCOPED_RELATIONAL_TEAM_OWN_PATH`.

La regresión anterior del fast-path probó `all/own/team` en un recorrido insuficiente, pero no reprodujo `scopedStore + colecciones relacionales + Cliente360`. La regresión v20260816 incorpora ese camino para evitar recurrencia.

## 7. Estado del producto

- R4S2 continúa publicada.
- No rollback recomendado: identidad/Auth/datos son correctos y hubo cero writes.
- Rootfix team/own NO aplicado todavía.
- Browser congelado.
- `POST_GO_LIVE_SMOKE_PASS` pendiente.

## 8. Siguiente acción exacta

Requiere nueva autorización macro porque la autorización R4S2 ya fue consumida.

Solo con autorización:

1. aplicar exclusivamente `core/access-scope.js` con el candidato ya probado;
2. gate + regresión versionada;
3. con PASS, crear R4S3 mínima desde R4S2 con exactamente un delta nuevo y 193 archivos byte-idénticos;
4. certificar;
5. backup/rollback + publicar R4S3;
6. verificar identidad pública;
7. ejecutar exactamente una nueva matriz final read-only;
8. refreeze inmediato.

Ante cualquier fallo: STOP sin segundo intento automático. Sin reimportación, cambios Auth/datos, main ni merge.

## Impacto Claude / Academia

- Clasificación Claude: `REPLICABLE_CLAUDE_ACUMULADO` para el patrón de acceso eficiente por scopes sin alterar semántica.
- Backend/seguridad: el detalle de store/product runtime queda `BACKEND_PROTEGIDO_NO_CLAUDE`.
- Academia: actualizar material de roles/scopes para incluir que rendimiento y visibilidad deben validarse en `all`, `team` y `own`, y diferenciar defecto funcional de validador incompleto.
