# CHANGELOG R4S2 GO-LIVE · 2026-08-16

## R4S2 publicada

- ZIP `orbit360-fase-a-product-r4s2-47249fd4d603.zip`
- SHA256 `580d7568d64deb0cf7b8eccdf91b99e5bdc005b6bd441c68f99ef0d36de305ca`
- 194 archivos
- public identity run `31957103570` PASS
- gate antes/después PASS
- Auth/runtime/430 clientes/30 aseguradoras/cero writes PASS.

## Matriz productiva final R4S2

Única ejecución autorizada:

- run `31957494919`
- job `95190233553`
- artifact `9266380051`
- status FAIL fail-closed
- Dirección: cinco rutas PASS
- Operativo: `inicio` PASS; primer fallo en `cliente360`
- Asesor: no alcanzado
- writes Auth/Firestore/operativos: 0/0/0
- errores page/console/http/write: 0.

Clasificación de frontera: `FUNCTIONAL_DEFECT / R4_ROLE_ROUTE_STAGE_TIMEOUT`.

Refreeze inmediato:

- commit `e6caa685270b2cd323162dca7e6f9731b56c26ee`
- control run `31957723568` SUCCESS.

## Causa raíz Operativo / Cliente 360

`FUNCTIONAL_DEFECT / ACCESS_SCOPED_RELATIONAL_NX_CLONE_TEAM_OWN`

Owner: `core/access-scope.js`.

`scope=all` ya tenía fast-path, pero `team/own` resolvía asesor relacional fila por fila mediante `store.get()`. Como el store productivo usa `all()` clone-on-read, el `scopedStore` multiplicaba clonados sobre clientes/pólizas durante Cliente 360.

## Regresión source-only v20260816

- run `31958357674`
- job `95192417987`
- artifact `9266561371`
- digest `sha256:7db701960ed6f08bc78594fbdca6eab57556bf9ddb1a02a23ce9e1c6bc937f34`
- gate PASS
- semantic equivalence PASS Dirección/Operativo/Asesor
- browser/secrets/data/producción=false
- writes=0.

Operativo facade: 45,631 → 25 `get()`; 6,112,246 → 12,705 filas clonadas.  
Asesor facade: 36,245 → 20 `get()`; 5,790,400 → 12,645 filas clonadas.

Candidato `core/access-scope.js`: probado pero NO aplicado.

## Validator gap

`VALIDATOR_STALE / ACCESS_FASTPATH_REGRESSION_DID_NOT_EXERCISE_SCOPED_RELATIONAL_TEAM_OWN_PATH`.

Se incorporó la regresión específica `scopedStore + team/own + relaciones` al workflow R4 congelado.

## Estado

- R4S2 permanece publicada.
- rollback no requerido.
- browser congelado.
- autorización R4S2/final matrix consumida.
- nueva autorización requerida para aplicar un único rootfix, construir R4S3 mínima y abrir una nueva matriz.
- no reimportación, Auth/datos, main ni merge.

Avance: 100% funcional / 75% técnico / 67% gates hasta `POST_GO_LIVE_SMOKE_PASS`.
