# Orbit 360 · Plataforma

Estado rector: `docs/orbit360-live-state-v1.json`. Checkpoint: `docs/CIERRE-R4S2-FRONTERA-FINAL-OPERATIVO-CLIENTE360-TEAM-OWN-NX-CLONE-20260816.md`. Changelog: `CHANGELOG-R4S2-GOLIVE-20260816.md`.

R4S2 está **publicada y verificada byte a byte** en `app.aysseguros.com`. Auth/runtime/tenant/430 clientes/30 aseguradoras y cero writes siguen PASS.

La única matriz final R4S2 autorizada fue consumida y refrozenada. Dirección completó PASS en `inicio`, `cliente360`, `aseguradoras`, `ops` y `leads`. El primer fallo real quedó en `Operativo → cliente360`, clasificado como `FUNCTIONAL_DEFECT / ACCESS_SCOPED_RELATIONAL_NX_CLONE_TEAM_OWN`.

La causa fue reproducida fuera de producción: bajo scopes `team/own`, `core/access-scope.js` todavía resolvía relaciones cliente/póliza fila por fila mediante `store.get()`, cuyo store productivo clona colecciones a través de `all()`. La regresión versionada PASS conserva exactamente los mismos registros visibles para Dirección/Operativo/Asesor y reduce el trabajo del facade de Operativo de 45,631 a 25 `get()` y de 6,112,246 a 12,705 filas clonadas; Asesor baja de 36,245 a 20 `get()` y de 5,790,400 a 12,645 filas clonadas.

El candidato de `core/access-scope.js` está **probado source-only pero NO aplicado**. Browser permanece congelado. No hay autorización vigente para R4S3 ni para otra matriz productiva.

No rollback automático de R4S2: identidad pública, Auth, datos y cero writes son correctos; el bloqueo actual es de rendimiento scoped `team/own`.

No reimportación, cambios Auth/datos, main ni merge. Avance: **100% funcional / 75% técnico / 67% gates (2/3)** hasta `POST_GO_LIVE_SMOKE_PASS`.
