# Academia Orbit 360 — Continuidad antibucle y causa raíz F2

**StateVersion:** `F2-R12-CONSUMED-ROOTCAUSE-OPEN-20260820-01`

## Objetivo

Enseñar por qué un producto correcto puede quedar bloqueado por un validador o por documentación desincronizada, y cómo evitar que una conversación, owner o workflow vuelva a una frontera ya superada.

## Regla operativa

La continuidad no depende de memoria conversacional. Depende de una frontera canónica persistida y auditable. Para F2 la fuente es `orbit360-continuity-ledger-v20260820.json`; PR, live-state, índice, lifecycle, checkpoint, README y CHANGELOG deben coincidir con su `stateVersion`.

Si un owner diverge, la clasificación es `PIPELINE_MECHANISM_FAILURE:DOCUMENTATION_STATE_DRIFT`. No se reabre producto ni se crea otro request para compensar la divergencia.

## Diferencia entre defecto funcional y validador obsoleto

`FUNCTIONAL_DEFECT` significa que el comportamiento del producto incumple el contrato real. `VALIDATOR_STALE` significa que el instrumento, regla o expectativa ya no representa correctamente el contrato del producto.

Request12 mostró Dirección desktop → Pólizas con timeout del readiness y captura final visible después de `64680 ms`. Como el mismo patrón ya había ocurrido en Request10, no se permite concluir automáticamente que el validador es obsoleto. Debe medirse el event-loop y separar tiempo de navegación, mount/render, polling y captura.

Dos hipótesis siguen abiertas:

- `FUNCTIONAL_DEFECT:F2_ROUTE_MAIN_THREAD_BLOCKING_POLIZAS`.
- `VALIDATOR_STALE:F2_ROUTE_READINESS_WAITER_MISSED_VISIBLE_STATE`.

## Stop-retry

Después de dos fallos de la misma familia:

- no Request13;
- no replay Request11/12;
- no aumentar timeout;
- no modificar Pólizas;
- primero instrumentación source-only y prueba causal;
- el owner correcto se modifica solo después de la evidencia.

## Autorizaciones

Una autorización runtime se persiste, se liga al request exacto y se consume una vez. Request12 está consumido y congelado. Un estado documental viejo nunca puede convertir una autorización consumida en activa.

## Carriles

- **A:** producto y UX congelados mientras la causa no esté probada.
- **B:** gates, lifecycle, observabilidad y continuidad documental se corrigen juntos.
- **C:** datos reales no se modifican para resolver un problema de validador/pipeline.

## Patrón reusable

El patrón reusable para Claude/backend es: `canonical ledger → transactional sync → generic invariant → fail-closed audit → persisted evidence → exact next action`. No incluye datos reales, secretos ni backend protegido.
